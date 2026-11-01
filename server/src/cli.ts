import { randomToken, hexHash } from './security.js';
import { loadCatalog } from './catalog.js';
import { isApprovedEngineStageBootstrap, isApprovedProjectCoreStageMigration, loadConfig } from './config.js';
import { appendAudit, createDatabase, inTransaction, migrate, migrateAnnotations, verifyRelease } from './db.js';
import { verifyEmptySyntheticStageDatabase } from './synthetic-stage-db.js';
import { loadEngineCatalog } from './engine/catalog.js';
import { migrateEngine, verifyEngineRelease } from './engine/migrate.js';
import { LearningEngine } from './engine/service.js';
import { migrateGuardianGroundwork, verifyGuardianHold } from './guardian/readiness.js';
import { grantAIAdmin, migrateAI } from './ai/store.js';
import { migrateProjectCore } from './project-core/migrate.js';

const [command, ...args] = process.argv.slice(2);
const usage =
  'Commands: migrate | invite <email> learner|reviewer | submissions | assign <submission-uuid> <reviewer-email> | disable <email> | engine-migrate | engine-enrol <adult-learner-email> | engine-submissions | engine-assign <submission-uuid> <reviewer-email> | project-core-migrate (disposable local or explicitly approved synthetic Neon stage only) | annotations-migrate (approved disposable loopback only) | ai-migrate | ai-admin-grant <active-reviewer-email>';
if (command === 'help') {
  console.log(usage);
  process.exit(0);
}
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL must be set in the server environment');
const config = loadConfig({ ...process.env, PILOT_ENABLED: 'false', ENGINE_V2_ENABLED: 'false',
  AI_GATEWAY_ENABLED: 'false', AI_ADMIN_UI_ENABLED: 'false', AI_LIVE_TESTS_APPROVED: 'false',
  PROJECT_CORE_ENABLED: 'false', LEARNING_ANNOTATIONS_ENABLED: 'false' });
const db = createDatabase(config);
const catalog = loadCatalog();
const operator = process.env.PILOT_OPERATOR?.trim();
/** A local test migration is restricted to an explicitly opted-in loopback disposable DB. */
function isApprovedLocalMigration(approval: string, prefix: string): boolean {
  try {
    return process.env[approval] === 'true' &&
      ['test', 'development'].includes(process.env.NODE_ENV ?? '') &&
      process.env.HOST === '127.0.0.1' &&
      new URL(process.env.APP_ORIGIN ?? '').hostname === '127.0.0.1' &&
      new URL(process.env.DATABASE_URL ?? '').hostname === '127.0.0.1' &&
      new URL(process.env.DATABASE_URL ?? '').pathname.startsWith(prefix);
  } catch {
    return false;
  }
}
function operatorRequired() {
  if (!operator || operator.length < 3 || operator.length > 120)
    throw new Error(
      'Set PILOT_OPERATOR to an identifiable internal operator for administrative commands.',
    );
  return operator;
}
try {
  if (command === 'migrate') {
    await migrate(db, catalog);
    console.log(
      `Migrated private adult pilot schema; content ${catalog.version} with hash ${catalog.hash.slice(0, 10)}…`,
    );
  } else if (command === 'annotations-migrate') {
    if (!isApprovedLocalMigration(
      'LEARNING_ANNOTATIONS_LOCAL_MIGRATION_APPROVED', '/desloop_learning_annotations_disposable_'))
      throw new Error('Learning annotations migration is limited to a separately approved disposable loopback database; remote deployment requires a new reviewed path.');
    const actor = operatorRequired();
    await verifyRelease(db, catalog);
    await migrateAnnotations(db);
    await inTransaction(db, async (client) => {
      await appendAudit(client, null, 'pilot.annotation.schema_migrated', '006', { operator: actor });
    });
    console.log('Installed private notes table in a disposable local database. No remote or public activation occurred.');
  } else if (command === 'invite') {
    await verifyRelease(db, catalog);
    const [address, role] = args;
    const email = address?.trim().toLowerCase();
    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !['learner', 'reviewer'].includes(role) ||
      !email ||
      email.length > 254
    )
      throw new Error(
        'Usage: PILOT_OPERATOR="Full Name" npm run pilot:admin -- invite adult@example.com learner|reviewer',
      );
    const token = randomToken();
    const invited = await inTransaction(db, async (client) => {
      const existing = await client.query('SELECT 1 FROM pilot.users WHERE email=$1', [email]);
      if (existing.rowCount) throw new Error('This email already has an account.');
      const created = await client.query<{ id: string }>(
        `INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by)
        VALUES ($1,$2,$3,now()+interval '48 hours',$4) RETURNING id`,
        [email, role, hexHash(token), operatorRequired()],
      );
      await appendAudit(client, null, 'pilot.invitation.created', created.rows[0].id, {
        role,
        operator: operatorRequired(),
      });
      return created.rows[0].id;
    });
    console.log(
      `Invitation ${invited} for ${email} (${role}). One-time code (shown once; never paste it in chat or commit it):`,
    );
    console.log(token);
  } else if (command === 'submissions') {
    await verifyRelease(db, catalog);
    const actor = operatorRequired();
    const rows = await inTransaction(db, async (client) => {
      const found = await client.query(
        `SELECT s.id,s.course_id,s.iteration,s.submitted_at,u.email AS learner_email,
          reviewer.email AS reviewer_email
         FROM pilot.project_submissions s
         JOIN pilot.users u ON u.id=s.learner_id
         LEFT JOIN pilot.review_assignments a ON a.submission_id=s.id
         LEFT JOIN pilot.users reviewer ON reviewer.id=a.reviewer_id
         WHERE s.status='submitted' ORDER BY s.submitted_at DESC LIMIT 50`,
      );
      await appendAudit(client, null, 'pilot.submissions.listed', 'operator', {
        operator: actor,
        count: found.rowCount,
      });
      return found.rows;
    });
    console.log(JSON.stringify(rows, null, 2));
  } else if (command === 'assign') {
    await verifyRelease(db, catalog);
    const [submissionId, address] = args;
    const email = address?.trim().toLowerCase();
    if (!submissionId || !/^[0-9a-f-]{36}$/.test(submissionId) || !email)
      throw new Error(
        'Usage: PILOT_OPERATOR="Full Name" npm run pilot:admin -- assign <submission-uuid> reviewer@example.com',
      );
    await inTransaction(db, async (client) => {
      const sub = await client.query<{ learner_id: string; status: string }>(
        'SELECT learner_id,status FROM pilot.project_submissions WHERE id=$1 FOR UPDATE',
        [submissionId],
      );
      const reviewer = await client.query<{ id: string }>(
        "SELECT id FROM pilot.users WHERE email=$1 AND role='reviewer' AND status='active'",
        [email],
      );
      if (
        !sub.rows[0] ||
        sub.rows[0].status !== 'submitted' ||
        !reviewer.rows[0] ||
        sub.rows[0].learner_id === reviewer.rows[0].id
      )
        throw new Error('An unreviewed submission and a different active reviewer are required.');
      await client.query(
        `INSERT INTO pilot.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,$3)`,
        [submissionId, reviewer.rows[0].id, operatorRequired()],
      );
      await appendAudit(client, null, 'pilot.review.assigned', submissionId, {
        reviewerId: reviewer.rows[0].id,
        operator: operatorRequired(),
      });
    });
    console.log(`Submission ${submissionId} assigned. Reviewer sees it after signing in.`);
  } else if (command === 'disable') {
    await verifyRelease(db, catalog);
    const email = args[0]?.trim().toLowerCase();
    if (!email)
      throw new Error(
        'Usage: PILOT_OPERATOR="Full Name" npm run pilot:admin -- disable user@example.com',
      );
    await inTransaction(db, async (client) => {
      const found = await client.query<{ id: string }>(
        "UPDATE pilot.users SET status='disabled' WHERE email=$1 RETURNING id",
        [email],
      );
      if (!found.rows[0]) throw new Error('Account not found.');
      await client.query(
        'UPDATE pilot.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
        [found.rows[0].id],
      );
      await appendAudit(client, null, 'pilot.account.disabled', found.rows[0].id, {
        operator: operatorRequired(),
      });
    });
    console.log('Account disabled and all sessions revoked.');
  } else if (command === 'project-core-migrate') {
    const localApproved = isApprovedLocalMigration(
      'PROJECT_CORE_LOCAL_MIGRATION_APPROVED', '/desloop_project_core_disposable_');
    const syntheticStageApproved = isApprovedProjectCoreStageMigration(process.env);
    if (!localApproved && !syntheticStageApproved)
      throw new Error('Project core migration needs explicit approval for a disposable loopback DB or direct Frankfurt Neon synthetic stage');
    const actor = operatorRequired();
    await migrateProjectCore(db, catalog);
    await inTransaction(db, async (client) => {
      await appendAudit(client, null,
        syntheticStageApproved ? 'project_core.schema.migrated_synthetic_stage' : 'project_core.schema.migrated_local',
        '005', { operator: actor, syntheticStage: syntheticStageApproved, localOnly: localApproved });
    });
    console.log(syntheticStageApproved
      ? 'Synthetic-only project schema verified in the approved Neon stage. This did not open the app to users.'
      : 'Local private project schema verified. No remote migration, editor or studio was enabled.');
  } else if (command === 'ai-migrate') {
    if (process.env.AI_SCHEMA_MIGRATION_APPROVED !== 'true')
      throw new Error('AI schema migration requires an operator-reviewed private database and AI_SCHEMA_MIGRATION_APPROVED=true');
    const actor = operatorRequired();
    await verifyGuardianHold(db); // This cannot create child records or bypass the existing hold.
    await migrateAI(db);
    await inTransaction(db, async (client) => {
      await appendAudit(client,null,'ai.schema.migrated_closed','004',{operator:actor});
    });
    console.log('Installed private AI schema with every provider/model and quota closed. No remote API call or public ingress was made.');
  } else if (command === 'ai-admin-grant') {
    if (process.env.AI_ADMIN_GRANT_APPROVED !== 'true')
      throw new Error('Explicit AI_ADMIN_GRANT_APPROVED=true is required; reviewer MFA remains a release blocker.');
    const address = args[0]?.trim().toLowerCase();
    if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
      throw new Error('Usage: ai-admin-grant active-reviewer@example.invalid');
    await verifyGuardianHold(db);
    await grantAIAdmin(db,address,operatorRequired());
    console.log('Restricted AI admin membership recorded for this existing active adult reviewer; still synthetic/private only.');
  } else if (command === 'engine-migrate') {
    if (process.env.ENGINE_DRAFT_ACKNOWLEDGED !== 'true')
      throw new Error(
        'Set ENGINE_DRAFT_ACKNOWLEDGED=true for the unpublished adult learning engine.',
      );
    const localApproved = isApprovedLocalMigration(
      'PROJECT_CORE_LOCAL_MIGRATION_APPROVED', '/desloop_project_core_disposable_') ||
      isApprovedLocalMigration('ENGINE_LOCAL_MIGRATION_APPROVED', '/desloop_engine_disposable_');
    const stageApproved = isApprovedEngineStageBootstrap(process.env);
    if (!localApproved && !stageApproved)
      throw new Error('Engine migration requires an explicitly approved disposable loopback DB or direct Frankfurt Neon synthetic bootstrap');
    const actor = operatorRequired();
    if (stageApproved) await verifyEmptySyntheticStageDatabase(db); // Reject partial or pre-existing data before 001.
    await migrate(db, catalog);
    const candidate = loadEngineCatalog();
    await migrateEngine(db, candidate);
    await migrateGuardianGroundwork(db);
    await inTransaction(db, async (client) => {
      await appendAudit(client, null, 'learning.release.migrated', candidate.version, {
        operator: actor,
        sha256: candidate.hash,
        noPilotCompletionTransfer: true,
      });
    });
    console.log(
      `Installed unpublished adult-only release ${candidate.version}; no learner is enrolled automatically.`,
    );
  } else if (['engine-enrol', 'engine-submissions', 'engine-assign'].includes(command ?? '')) {
    if (process.env.ENGINE_DRAFT_ACKNOWLEDGED !== 'true')
      throw new Error('Set ENGINE_DRAFT_ACKNOWLEDGED=true for draft-2 operator actions.');
    const actor = operatorRequired();
    await verifyGuardianHold(db);
    const candidate = loadEngineCatalog();
    const releaseId = await verifyEngineRelease(db, candidate);
    const engine = new LearningEngine(db, candidate, releaseId);
    if (command === 'engine-enrol') {
      const address = args[0]?.trim().toLowerCase();
      if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        throw new Error('Usage: engine-enrol adult-learner@example.com');
      const found = await db.query<{ id: string }>(
        "SELECT id FROM pilot.users WHERE email=$1 AND role='learner' AND status='active'",
        [address],
      );
      if (!found.rows[0]) throw new Error('Invite and register an active adult learner first.');
      const result = await engine.enroll(found.rows[0].id, actor);
      console.log(
        `${result.repeated ? 'Already enrolled' : 'Enrolled'} in a SEPARATE ${result.releaseVersion} sequence, starting at Course 01. No draft-1 completions were transferred.`,
      );
    } else if (command === 'engine-submissions') {
      const found = await inTransaction(db, async (client) => {
        const rows = await client.query(
          `SELECT s.id,s.course_id,s.iteration,s.submitted_at,u.email AS learner_email,
           reviewer.email AS reviewer_email FROM learning.project_submissions s
           JOIN pilot.users u ON u.id=s.learner_id
           LEFT JOIN learning.review_assignments a ON a.submission_id=s.id
           LEFT JOIN pilot.users reviewer ON reviewer.id=a.reviewer_id
           WHERE s.status='submitted' AND s.release_id=$1 ORDER BY s.submitted_at DESC LIMIT 50`,
          [releaseId],
        );
        await appendAudit(client, null, 'learning.submissions.listed', 'operator', {
          operator: actor,
          count: rows.rowCount,
        });
        return rows.rows;
      });
      console.log(JSON.stringify(found, null, 2));
    } else {
      const [submissionId, address] = args;
      const email = address?.trim().toLowerCase();
      if (!submissionId || !/^[0-9a-f-]{36}$/.test(submissionId) || !email)
        throw new Error('Usage: engine-assign <submission-uuid> reviewer@example.com');
      await inTransaction(db, async (client) => {
        const sub = await client.query<{ learner_id: string; status: string; release_id: string }>(
          'SELECT learner_id,status,release_id FROM learning.project_submissions WHERE id=$1 FOR UPDATE',
          [submissionId],
        );
        const reviewer = await client.query<{ id: string }>(
          "SELECT id FROM pilot.users WHERE email=$1 AND role='reviewer' AND status='active'",
          [email],
        );
        if (
          !sub.rows[0] ||
          sub.rows[0].status !== 'submitted' ||
          sub.rows[0].release_id !== releaseId ||
          !reviewer.rows[0] ||
          sub.rows[0].learner_id === reviewer.rows[0].id
        )
          throw new Error(
            'A pending release-matched project and a distinct active reviewer are required.',
          );
        await client.query(
          'INSERT INTO learning.review_assignments(submission_id,reviewer_id,assigned_by) VALUES($1,$2,$3)',
          [submissionId, reviewer.rows[0].id, actor],
        );
        await appendAudit(client, null, 'learning.review.assigned', submissionId, {
          operator: actor,
          reviewerId: reviewer.rows[0].id,
        });
      });
      console.log(
        'Draft-2 submission assigned. The reviewer can now decide it in /pilot/engine/reviews.',
      );
    }
  } else {
    throw new Error(usage);
  }
} finally {
  await db.end();
}
