import { readFile } from 'node:fs/promises';
import { loadCatalog } from '../server/src/catalog.js';
import { loadConfig } from '../server/src/config.js';
import { createDatabase, migrate } from '../server/src/db.js';
import { loadEngineCatalog } from '../server/src/engine/catalog.js';
import { migrateEngine } from '../server/src/engine/migrate.js';
import { migrateGuardianGroundwork } from '../server/src/guardian/readiness.js';
import { migrateProjectCore } from '../server/src/project-core/migrate.js';

const raw = process.env.SYNTHETIC_STAGE_E2E_DATABASE_URL;
const url = new URL(raw ?? '');
if (process.env.NODE_ENV !== 'test' || url.hostname !== '127.0.0.1' ||
    url.pathname !== '/desloop_project_core_disposable_stage_browser')
  throw new Error('Refusing to prepare anything except the named disposable loopback browser database');
const catalog = loadCatalog();
const config = loadConfig({ ...process.env, PILOT_ENABLED: 'false', PROJECT_CORE_ENABLED: 'false',
  ENGINE_V2_ENABLED: 'false', SYNTHETIC_STAGE_GATE_ENABLED: 'false', DATABASE_URL: raw });
const db = createDatabase(config);
try {
  await migrate(db, catalog);
  await migrateEngine(db, loadEngineCatalog());
  await migrateGuardianGroundwork(db);
  await migrateProjectCore(db, catalog);
  await db.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='desloop_stage_runtime') THEN
      CREATE ROLE desloop_stage_runtime LOGIN PASSWORD 'stage-browser-only-password';
    ELSE
      ALTER ROLE desloop_stage_runtime LOGIN PASSWORD 'stage-browser-only-password';
    END IF;
  END $$`); // Fixed fixture only on the exact disposable loopback DB.
  await db.query(await readFile('server/stage/grant_runtime.sql', 'utf8'));
  console.log('Verified additive 001–003 and 005 plus limited runtime grants on the disposable browser DB only.');
} finally { await db.end(); }
