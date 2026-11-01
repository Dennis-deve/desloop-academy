import { loadCatalog } from '../server/src/catalog.js';
import { loadConfig } from '../server/src/config.js';
import { createDatabase, migrate, migrateAnnotations } from '../server/src/db.js';

const url = process.env.PILOT_E2E_DATABASE_URL;
if (!url) throw new Error('PILOT_E2E_DATABASE_URL is required for disposable browser QA.');
const target = new URL(url);
if (
  target.protocol !== 'postgres:' ||
  target.hostname !== '127.0.0.1' ||
  !/^\/desloop_pilot_disposable_[a-z0-9_]+_browser$/.test(target.pathname)
)
  throw new Error('Refusing a non-disposable or non-loopback pilot browser database.');
const db = createDatabase(
  loadConfig({
    NODE_ENV: 'test',
    PILOT_ENABLED: 'true',
    PILOT_DRAFT_ACKNOWLEDGED: 'true',
    APP_ORIGIN: 'http://127.0.0.1:5173',
    DATABASE_URL: url,
  }),
);
try {
  const inspection = await db.query<{ name: string; existing: string | null }>(
    "SELECT current_database() AS name, to_regclass('pilot.users')::text AS existing",
  );
  if (inspection.rows[0].name !== target.pathname.slice(1) || inspection.rows[0].existing !== null)
    throw new Error(
      'This browser QA requires a NEW, empty, named disposable database. Refusing any pre-existing pilot schema.',
    );
  await migrate(db, loadCatalog());
  await migrateAnnotations(db);
  console.log(
    'Prepared a newly created local adult-browser schema and separate notes table; no user data was restored or seeded.',
  );
} finally {
  await db.end();
}
