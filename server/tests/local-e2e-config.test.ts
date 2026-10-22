import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

const local = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://127.0.0.1:5173',
  DATABASE_URL: 'postgresql://user@127.0.0.1:5434/disposable_e2e',
};

test('local E2E auth rate limit requires explicit test-only opt-in and loopback resources', () => {
  assert.equal(loadConfig(local).localE2eAuthLimit, false);
  assert.equal(
    loadConfig({ ...local, PILOT_LOCAL_E2E_AUTH_LIMIT: 'true' }).localE2eAuthLimit,
    true,
  );
  assert.throws(
    () => loadConfig({ ...local, NODE_ENV: 'production', PILOT_LOCAL_E2E_AUTH_LIMIT: 'true' }),
    /E2E auth limit requires/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...local,
        APP_ORIGIN: 'https://public.example.org',
        PILOT_LOCAL_E2E_AUTH_LIMIT: 'true',
      }),
    /E2E auth limit requires/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...local,
        DATABASE_URL: 'postgresql://user@private.railway.internal/production',
        PILOT_LOCAL_E2E_AUTH_LIMIT: 'true',
      }),
    /E2E auth limit requires/,
  );
});
