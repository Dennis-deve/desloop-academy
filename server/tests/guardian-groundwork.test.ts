import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApi } from '../src/api.js';
import { loadConfig } from '../src/config.js';
import { REQUIRED_GUARDIAN_CONTROLS } from '../src/guardian/readiness.js';

const origin = 'http://127.0.0.1:5173';

test('no environment flag can activate child accounts, identity collection or minor learning', () => {
  for (const key of [
    'CHILD_ACCOUNTS_ENABLED',
    'GUARDIAN_EVIDENCE_COLLECTION_ENABLED',
    'MINOR_LEARNING_ENABLED',
  ]) {
    for (const value of ['true', '1', 'TRUE']) {
      assert.throws(
        () => loadConfig({ NODE_ENV: 'test', APP_ORIGIN: origin, [key]: value }),
        /minor accounts and evidence capture are disabled/,
      );
    }
  }
  const disabled = loadConfig({
    NODE_ENV: 'test',
    APP_ORIGIN: origin,
    CHILD_ACCOUNTS_ENABLED: 'false',
    GUARDIAN_EVIDENCE_COLLECTION_ENABLED: 'false',
    MINOR_LEARNING_ENABLED: 'false',
  });
  assert.equal(disabled.enabled, false);
  assert.equal(REQUIRED_GUARDIAN_CONTROLS.length, 8);
});

test('disabled adult service has no guardian-evidence collection or readiness endpoints', async () => {
  const app = await buildApi(loadConfig({ NODE_ENV: 'test', APP_ORIGIN: origin }));
  try {
    for (const path of ['/api/pilot/guardian-readiness', '/api/pilot/guardian-consent']) {
      assert.equal((await app.inject({ method: 'GET', url: path })).statusCode, 404);
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: path,
            headers: { origin, 'content-type': 'application/json' },
            payload: { childName: 'do-not-collect' },
          })
        ).statusCode,
        404,
      );
    }
  } finally {
    await app.close();
  }
});
