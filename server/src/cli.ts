import { randomToken, hexHash } from './security.js';
import { loadCatalog } from './catalog.js';
import { loadConfig } from './config.js';
import { appendAudit, createDatabase, inTransaction, migrate, verifyRelease } from './db.js';

const [command, ...args] = process.argv.slice(2);
const usage =
  'Commands: migrate | invite <email> learner|reviewer | submissions | assign <submission-uuid> <reviewer-email> | disable <email>';
if (command === 'help') {
  console.log(usage);
  process.exit(0);
}
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL must be set in the server environment');
const config = loadConfig({ ...process.env, PILOT_ENABLED: 'false' });
const db = createDatabase(config);
const catalog = loadCatalog();
const operator = process.env.PILOT_OPERATOR?.trim();
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
  } else {
    throw new Error(usage);
  }
} finally {
  await db.end();
}
