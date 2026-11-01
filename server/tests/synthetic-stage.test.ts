import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { buildApi } from '../src/api.js';
import { isApprovedEngineStageBootstrap, isApprovedNeonStageUrl, isApprovedProjectCoreStageMigration, loadConfig } from '../src/config.js';
import { isAvailableClientPath } from '../src/public-routes.js';
import { isSyntheticStageProtectedPath } from '../src/synthetic-stage.js';
import { verifyEmptySyntheticStageDatabase, verifySyntheticStageDatabase } from '../src/synthetic-stage-db.js';
import type { Database } from '../src/db.js';

const key = 'a'.repeat(64); // Synthetic fixture; never a real stage key.
const origin = 'http://127.0.0.1:5173';
const neonUrl = 'postgresql://synthetic:test@ep-example.eu-central-1.aws.neon.tech/desloop_synthetic_stage?sslmode=verify-full&channel_binding=require';
const renderOrigin = 'https://desloop-closed-dev.onrender.com';

void test('remote adult stage fails closed without an operator gate and reviewed Neon TLS', () => {
  const base = {
    NODE_ENV: 'production', RENDER: 'true', RENDER_SERVICE_TYPE: 'web', RENDER_EXTERNAL_URL: renderOrigin,
    APP_ORIGIN: renderOrigin, HOST: '0.0.0.0',
    PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
    SYNTHETIC_STAGE_ACKNOWLEDGED: 'true',
    DATABASE_URL: neonUrl, DATABASE_TLS: 'verify',
  };
  assert.throws(() => loadConfig(base), /external adult origin requires/);
  assert.throws(() => loadConfig({ ...base, APP_ORIGIN: 'https://no-public-origin.invalid' }),
    /external adult origin requires/); // Render must not enable the adult DB behind the old closed-origin placeholder.
  assert.throws(() => loadConfig({ ...base, SYNTHETIC_STAGE_GATE_ENABLED: 'true' }), /256-bit/);
  assert.throws(() => loadConfig({ ...base, SYNTHETIC_STAGE_GATE_ENABLED: 'true', SYNTHETIC_STAGE_GATE_HEX_KEY: 'too-short' }), /256-bit/);
  const gated = { ...base, SYNTHETIC_STAGE_GATE_ENABLED: 'true', SYNTHETIC_STAGE_GATE_HEX_KEY: key };
  assert.equal(loadConfig(gated).syntheticStageGateEnabled, true);
  assert.throws(() => loadConfig({ ...gated, AI_GATEWAY_ENABLED: 'true' }), /does not approve the live AI gateway/);
  assert.throws(() => loadConfig({ ...gated, RENDER_EXTERNAL_URL: 'https://another.onrender.com' }), /synthetic access gate/);
  assert.throws(() => loadConfig({ ...gated, HOST: '127.0.0.1' }), /synthetic access gate/);
  assert.throws(() => loadConfig({ ...gated, RENDER_SERVICE_TYPE: 'static' }), /synthetic access gate/);
  assert.throws(() => loadConfig({ ...gated, SYNTHETIC_STAGE_ACKNOWLEDGED: 'false' }), /synthetic access gate/);
  assert.throws(() => loadConfig({ ...gated, APP_ORIGIN: 'https://private.example.invalid', RENDER_EXTERNAL_URL: 'https://private.example.invalid' }), /synthetic access gate/);
  assert.throws(() => loadConfig({ ...gated, PROJECT_CORE_ENABLED: 'true' }), /explicitly gated synthetic/);
  const core = { ...gated, PROJECT_CORE_ENABLED: 'true', PROJECT_CORE_STAGE_APPROVED: 'true' };
  assert.equal(loadConfig(core).projectCoreEnabled, true);
  assert.throws(() => loadConfig({ ...core, DATABASE_TLS: 'false' }), /verified TLS/);
  assert.throws(() => loadConfig({ ...core, DATABASE_URL: neonUrl.replace('verify-full', 'require') }), /verified TLS/);
  assert.throws(() => loadConfig({ ...core, DATABASE_URL: neonUrl.replace('neon.tech', 'other.example') }), /verified TLS/);
  assert.throws(() => loadConfig({ ...core, NODE_ENV: 'development' }), /synthetic access gate/);
});

void test('only a direct/pooled Frankfurt Neon URL requiring verified TLS is an approved synthetic stage target', () => {
  assert.equal(isApprovedNeonStageUrl(neonUrl), true);
  assert.equal(isApprovedNeonStageUrl(neonUrl.replace('ep-example.', 'ep-example-pooler.')), true);
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  // pg's URL parser overwrites the provided ssl object. verify-full must yield
  // a truthy TLS config with no rejectUnauthorized:false override.
  assert.deepEqual(client.connectionParameters.ssl, {});
  for (const denied of [
    neonUrl.replace('verify-full', 'require'),
    neonUrl.replace('eu-central-1', 'us-east-2'),
    neonUrl.replace('neon.tech', 'attacker.example'),
    neonUrl.replace('postgresql:', 'http:'),
    neonUrl.replace('sslmode=verify-full', 'sslmode=disable'),
    neonUrl.replace('sslmode=verify-full', 'sslmode=verify-full&sslmode=disable'),
    neonUrl.replace('desloop_synthetic_stage', 'neondb'),
    'postgresql://synthetic:test@127.0.0.1:55439/desloop_synthetic_stage?sslmode=verify-full',
    'bad-url',
  ]) assert.equal(isApprovedNeonStageUrl(denied), false, denied.replace(/:[^@]+@/, ':***@'));
});

void test('005 migration only accepts a separately acknowledged direct Neon target, never pooled or Railway', () => {
  const stage = {
    NODE_ENV: 'production', APP_ORIGIN: renderOrigin, DATABASE_URL: neonUrl,
    PROJECT_CORE_STAGE_MIGRATION_APPROVED: 'true', SYNTHETIC_STAGE_ACKNOWLEDGED: 'true',
    DATABASE_TLS: 'verify',
  };
  assert.equal(isApprovedProjectCoreStageMigration(stage), true);
  for (const bad of [
    { DATABASE_URL: neonUrl.replace('ep-example.', 'ep-example-pooler.') },
    { DATABASE_URL: neonUrl.replace('verify-full', 'require') },
    { DATABASE_URL: neonUrl.replace('eu-central-1', 'us-east-2') },
    { DATABASE_URL: 'postgresql://user@127.0.0.1:55439/railway' },
    { PROJECT_CORE_STAGE_MIGRATION_APPROVED: 'false' },
    { SYNTHETIC_STAGE_ACKNOWLEDGED: 'false' },
    { NODE_ENV: 'test' },
    { APP_ORIGIN: 'http://127.0.0.1:5173' },
  ]) assert.equal(isApprovedProjectCoreStageMigration({ ...stage, ...bad }), false);
});

void test('a fresh empty synthetic stage has its own manual direct-only 001–003 bootstrap approval', () => {
  const stage = { NODE_ENV: 'production', APP_ORIGIN: renderOrigin, DATABASE_URL: neonUrl,
    ENGINE_STAGE_BOOTSTRAP_APPROVED: 'true', SYNTHETIC_STAGE_ACKNOWLEDGED: 'true',
    DATABASE_TLS: 'verify' };
  assert.equal(isApprovedEngineStageBootstrap(stage), true);
  assert.equal(isApprovedProjectCoreStageMigration(stage), false); // 005 needs a separate approval.
  for (const bad of [
    { ENGINE_STAGE_BOOTSTRAP_APPROVED: 'false' },
    { DATABASE_URL: neonUrl.replace('ep-example.', 'ep-example-pooler.') },
    { DATABASE_URL: neonUrl.replace('desloop_synthetic_stage', 'railway') },
    { DATABASE_URL: neonUrl.replace('verify-full', 'require') },
    { DATABASE_TLS: 'false' },
    { NODE_ENV: 'test' },
    { APP_ORIGIN: 'http://127.0.0.1:5173' },
  ]) assert.equal(isApprovedEngineStageBootstrap({ ...stage, ...bad }), false);
});

void test('fresh stage bootstrap refuses an existing schema/table, wrong DB, local non-TLS or app role', async () => {
  const good = { database: 'desloop_synthetic_stage', role: 'neondb_owner', tls: true,
    existing_schema: false, public_relations: false };
  const fake = (row: typeof good) => ({ query: async () => ({ rowCount: 1, rows: [row] }) }) as unknown as Database;
  await assert.doesNotReject(verifyEmptySyntheticStageDatabase(fake(good)));
  for (const unsafe of [
    { database: 'railway' }, { role: 'desloop_stage_runtime' }, { tls: false },
    { existing_schema: true }, { public_relations: true },
  ]) await assert.rejects(verifyEmptySyntheticStageDatabase(fake({ ...good, ...unsafe })), /requires an empty/);
});

void test('startup rejects a Neon admin, wrong DB, unencrypted transport or authority to edit child/account roles', async () => {
  const good = { database: 'desloop_synthetic_stage', role: 'desloop_stage_runtime', tls: true,
    superuser: false, create_role: false, create_db: false, bypass_rls: false,
    neon_admin: false, schema_create: false, child_write: false, account_role_write: false };
  const fake = (row: typeof good) => ({ query: async () => ({ rowCount: 1, rows: [row] }) }) as unknown as Database;
  await assert.doesNotReject(verifySyntheticStageDatabase(fake(good)));
  for (const unsafe of [
    { database: 'neondb' }, { role: 'neondb_owner' }, { tls: false },
    { superuser: true }, { create_role: true }, { create_db: true },
    { bypass_rls: true }, { neon_admin: true }, { schema_create: true },
    { child_write: true }, { account_role_write: true },
  ]) await assert.rejects(verifySyntheticStageDatabase(fake({ ...good, ...unsafe })), /least-privilege/);
  const stageConfig = loadConfig({ NODE_ENV: 'production', RENDER: 'true',
    RENDER_SERVICE_TYPE: 'web', RENDER_EXTERNAL_URL: renderOrigin, APP_ORIGIN: renderOrigin,
    HOST: '0.0.0.0', PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
    SYNTHETIC_STAGE_GATE_ENABLED: 'true', SYNTHETIC_STAGE_GATE_HEX_KEY: key,
    SYNTHETIC_STAGE_ACKNOWLEDGED: 'true', DATABASE_URL: neonUrl, DATABASE_TLS: 'verify' });
  await assert.rejects(buildApi(stageConfig, fake({ ...good, tls: false })), /least-privilege/);
});

void test('private paths, including encoded ones, require the stage gate before routing', () => {
  for (const url of ['/pilot', '/pilot/projects', '/pilot/engine', '/pilot%2Fprojects', '/%2561pi/pilot/status', '/api/pilot/status', '/api/ai/admin', '/api/not-here', '/api%2fpilot%2fstatus'])
    assert.equal(isSyntheticStageProtectedPath(url), true, url);
  for (const url of ['/', '/courses', '/api/health', '/api/health?readiness=1', '/availability'])
    assert.equal(isSyntheticStageProtectedPath(url), false, url);
  assert.equal(isAvailableClientPath('/pilot/projects'), false); // Not a fake 200 while feature is off.
  assert.equal(isAvailableClientPath('/pilot/projects', true), true);
  assert.equal(isAvailableClientPath('/pilot/projects/00000000-0000-0000-0000-000000000001', true), true);
  assert.equal(isAvailableClientPath('/pilot/projects/not-an-id', true), false);
});

void test('production-mode Render hostname enforces the gate even without a pilot database', async () => {
  const config = loadConfig({
    NODE_ENV: 'production', RENDER: 'true', RENDER_SERVICE_TYPE: 'web', RENDER_EXTERNAL_URL: renderOrigin,
    APP_ORIGIN: renderOrigin, HOST: '0.0.0.0', PILOT_ENABLED: 'false',
    SYNTHETIC_STAGE_ACKNOWLEDGED: 'true', SYNTHETIC_STAGE_GATE_ENABLED: 'true',
    SYNTHETIC_STAGE_GATE_HEX_KEY: key,
  });
  const app = await buildApi(config);
  try {
    assert.equal((await app.inject({ url: '/api/pilot/status', headers: { host: 'desloop-closed-dev.onrender.com' } })).statusCode, 401);
    assert.equal((await app.inject({ url: '/pilot/projects', headers: { host: 'attacker.onrender.com' } })).statusCode, 421);
    const auth = `Basic ${Buffer.from(`desloop-review:${key}`).toString('base64')}`;
    const status = await app.inject({ url: '/api/pilot/status', headers: { host: 'desloop-closed-dev.onrender.com', authorization: auth } });
    assert.equal(status.statusCode, 200);
    assert.equal(status.headers['cache-control'], 'no-store');
    assert.equal(status.json().enabled, false);
  } finally { await app.close(); }
});

void test('real Fastify gate denies anonymous/wrong Host/wrong key before every private API and SPA route', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'desloop-stage-gate-'));
  await writeFile(join(dir, 'index.html'), '<!doctype html><title>Real release boundary</title>');
  const config = loadConfig({
    NODE_ENV: 'test', APP_ORIGIN: origin, HOST: '127.0.0.1', PILOT_ENABLED: 'false',
    SYNTHETIC_STAGE_GATE_ENABLED: 'true', SYNTHETIC_STAGE_GATE_HEX_KEY: key,
    STATIC_DIR: dir,
  });
  const app = await buildApi(config);
  const host = '127.0.0.1:5173';
  const good = `Basic ${Buffer.from(`desloop-review:${key}`).toString('base64')}`;
  try {
    assert.equal((await app.inject('/api/health')).statusCode, 200);
    for (const url of ['/pilot', '/pilot/projects', '/api/pilot/status', '/api/pilot/auth/register', '/api/ai/admin', '/api/not-here']) {
      const denied = await app.inject({ url, headers: { host, accept: 'text/html' } });
      assert.equal(denied.statusCode, 401, url);
      assert.match(String(denied.headers['www-authenticate']), /^Basic realm=/);
      assert.equal(denied.headers['cache-control'], 'no-store');
      assert.doesNotMatch(denied.body, /Real release boundary/);
      assert.equal((await app.inject({ url, headers: { host, authorization: `Basic ${Buffer.from('desloop-review:wrong').toString('base64')}` } })).statusCode, 401);
      assert.equal((await app.inject({ url, headers: { host: 'other.onrender.com', authorization: good } })).statusCode, 421);
    }
    const status = await app.inject({ url: '/api/pilot/status', headers: { host, authorization: good } });
    assert.equal(status.statusCode, 200);
    assert.equal(status.json().enabled, false);
    const shell = await app.inject({ url: '/pilot', headers: { host, authorization: good, accept: 'text/html' } });
    assert.equal(shell.statusCode, 200);
    assert.match(shell.body, /Real release boundary/);
    const unavailable = await app.inject({ url: '/pilot/projects', headers: { host, authorization: good, accept: 'text/html' } });
    assert.equal(unavailable.statusCode, 404); // No fake feature when server is off.
    const missingApi = await app.inject({ url: '/api/not-here', headers: { host, authorization: good } });
    assert.equal(missingApi.statusCode, 404);
    assert.equal((await app.inject({ url: '/', headers: { accept: 'text/html' } })).statusCode, 200);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
