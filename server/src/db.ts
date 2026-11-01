import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import type { PilotCatalog } from './catalog.js';
import { POLICY_VERSION } from './catalog.js';
import type { PilotConfig } from './config.js';

export type Database = pg.Pool;
export type Transaction = pg.PoolClient;

export function createDatabase(config: PilotConfig) {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    // node-postgres parses URL TLS options after this object. The Render stage
    // rejects every Neon URL except sslmode=verify-full before reaching here.
    ssl: config.databaseTls ? { rejectUnauthorized: true } : false,
    max: 10,
    connectionTimeoutMillis: config.syntheticStageGateEnabled ? 20000 : 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 8000,
  });
  // A pooled idle connection can close while a free Neon compute sleeps.
  // Handle it without logging connection strings, queries or credentials.
  pool.on('error', () => { console.warn('An idle database connection ended; the pool will reconnect on demand.'); });
  return pool;
}
export async function inTransaction<T>(
  db: Database,
  callback: (client: Transaction) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const value = await callback(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function migrate(db: Database, catalog: PilotCatalog) {
  const sql = await readFile(
    resolve(process.cwd(), 'server/migrations/001_adult_pilot.sql'),
    'utf8',
  );
  await db.query(sql);
  await db.query(
    `INSERT INTO pilot.content_versions (version, sha256, policy_version)
    VALUES ($1, $2, $3) ON CONFLICT (version) DO NOTHING`,
    [catalog.version, catalog.hash, POLICY_VERSION],
  );
  await verifyRelease(db, catalog);
}
/** A separately reviewed, additive feature migration; never part of legacy bootstrap. */
export async function migrateAnnotations(db: Database) {
  await db.query(await readFile(resolve(process.cwd(), 'server/migrations/006_learning_annotations.sql'), 'utf8'));
}
export async function verifyRelease(db: Database, catalog: PilotCatalog) {
  const result = await db.query<{ sha256: string; policy_version: string; status: string }>(
    'SELECT sha256, policy_version, status FROM pilot.content_versions WHERE version=$1',
    [catalog.version],
  );
  const row = result.rows[0];
  if (
    !row ||
    row.sha256 !== catalog.hash ||
    row.policy_version !== POLICY_VERSION ||
    row.status !== 'internal_draft'
  )
    throw new Error('Pilot content has changed without a new reviewed version and migration');
}
export async function appendAudit(
  client: Transaction,
  actorId: string | null,
  action: string,
  subjectId: string,
  detail: object = {},
) {
  await client.query(
    'INSERT INTO pilot.audit_events (actor_id,action,subject_id,detail) VALUES($1,$2,$3,$4)',
    [actorId, action, subjectId, JSON.stringify(detail)],
  );
}
