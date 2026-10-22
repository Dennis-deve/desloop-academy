import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildApi } from '../src/api.js';
import { loadConfig } from '../src/config.js';
import { isAvailableClientPath } from '../src/public-routes.js';

void test('only read-only discovery and the real adult pilot have known client routes', () => {
  for (const path of ['/', '/courses', '/courses?stage=1', '/courses/getting-started-with-learning-and-digital-confidence', '/how-it-works', '/availability', '/pilot', '/pilot/engine/studio']) {
    assert.equal(isAvailableClientPath(path), true, path);
  }
  for (const path of ['/demo', '/app', '/school/classes', '/apply/school', '/pricing', '/checkout', '/register', '/parent/safety', '/community', '/courses/not-a-real-course', '/courses/../app', '/pilot/engine/not-a-real-page']) {
    assert.equal(isAvailableClientPath(path), false, path);
  }
});

void test('inactive API never calls itself a demo; simulated routes return HTTP 404 without fake success', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'desloop-static-'));
  await writeFile(join(dir, 'index.html'), '<!doctype html><title>Release boundary</title>');
  const app = await buildApi(loadConfig({ PILOT_ENABLED: 'false', STATIC_DIR: dir }));
  try {
    const health = await app.inject('/api/health');
    assert.deepEqual(health.json(), { ok: true, mode: 'inactive' });
    const active = await app.inject({ url: '/courses/getting-started-with-learning-and-digital-confidence', headers: { accept: 'text/html' } });
    assert.equal(active.statusCode, 200);
    assert.match(active.body, /Release boundary/);
    const fake = await app.inject({ url: '/demo', headers: { accept: 'text/html' } });
    assert.equal(fake.statusCode, 404);
    assert.match(fake.body, /Release boundary/);
    const school = await app.inject({ url: '/school/classes', headers: { accept: 'text/html' } });
    assert.equal(school.statusCode, 404);
    const unknownCourse = await app.inject({ url: '/courses/not-a-real-course', headers: { accept: 'text/html' } });
    assert.equal(unknownCourse.statusCode, 404);
    const api = await app.inject({ url: '/api/not-here', headers: { accept: 'text/html' } });
    assert.equal(api.statusCode, 404);
    assert.match(api.headers['content-type'] ?? '', /application\/json/);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
