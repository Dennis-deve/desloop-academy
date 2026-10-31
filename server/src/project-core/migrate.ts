import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Database } from '../db.js';
import { verifyRelease } from '../db.js';
import type { PilotCatalog } from '../catalog.js';
import { verifyGuardianHold } from '../guardian/readiness.js';

const VERSION = 'project-core-1';
const migrationPath = () => resolve(process.cwd(), 'server/migrations/005_project_core.sql');
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Opt-in only. Not part of Railway's automatic pre-deploy migration. */
export async function migrateProjectCore(db: Database, catalog: PilotCatalog) {
  await verifyRelease(db, catalog);
  await verifyGuardianHold(db);
  const sql = await readFile(migrationPath(), 'utf8');
  const hash = sha256(sql);
  const exists = await db.query<{ reg: string | null }>(
    "SELECT to_regclass('project_core.schema_versions') AS reg",
  );
  if (exists.rows[0].reg) {
    const prior = await db.query<{ source_sha256: string }>(
      'SELECT source_sha256 FROM project_core.schema_versions WHERE version=$1',
      [VERSION],
    );
    if (prior.rows[0] && prior.rows[0].source_sha256 !== hash)
      throw new Error('Project core migration changed without an approved new schema version');
  }
  await db.query(sql);
  await db.query(
    'INSERT INTO project_core.schema_versions(version,source_sha256) VALUES($1,$2) ON CONFLICT(version) DO NOTHING',
    [VERSION, hash],
  );
  await verifyProjectCore(db);
}

/** Fail closed on an absent/changed migration or disabled immutability trigger. */
export async function verifyProjectCore(db: Database) {
  const hash = sha256(await readFile(migrationPath(), 'utf8'));
  const found = await db.query<{ source_sha256: string }>(
    'SELECT source_sha256 FROM project_core.schema_versions WHERE version=$1',
    [VERSION],
  );
  if (found.rows[0]?.source_sha256 !== hash)
    throw new Error('Project core schema is missing or has changed without review');
  const protections = await db.query<{ triggers: string; latest_fk: string }>(
    `SELECT
      (SELECT count(*) FROM pg_trigger WHERE tgenabled='O' AND NOT tgisinternal AND
        (tgrelid='project_core.projects'::regclass AND tgname='guarded_project_state' OR
         tgrelid='project_core.revisions'::regclass AND tgname='immutable_revisions' OR
         tgrelid='project_core.assets'::regclass AND tgname='immutable_assets' OR
         tgrelid='project_core.revision_assets'::regclass AND tgname='immutable_revision_assets')) AS triggers,
      (SELECT count(*) FROM pg_constraint WHERE conrelid='project_core.projects'::regclass
        AND conname='project_core_latest_revision_fk' AND convalidated) AS latest_fk`,
  );
  if (Number(protections.rows[0]?.triggers) !== 4 || Number(protections.rows[0]?.latest_fk) !== 1)
    throw new Error('Project core immutable evidence or revision reference was disabled');
  return { version: VERSION, migrationSha256: hash };
}
