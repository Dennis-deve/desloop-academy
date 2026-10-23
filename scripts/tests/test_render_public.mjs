import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPublicServer } from '../serve_render_public.mjs';

await test('Render artifact inspection server serves only reviewed guide paths', async () => {
  const server = createPublicServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/courses', '/how-it-works', '/availability', '/courses/getting-started-with-learning-and-digital-confidence']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /Read-only information/);
      assert.match(response.headers.get('content-security-policy') ?? '', /connect-src 'none'/);
    }
    for (const path of ['/pilot', '/pilot/ai/admin', '/api/pilot/status', '/api/health', '/register', '/checkout', '/demo', '/courses/not-a-real-course', '/assets/%2e%2e/index.html']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    assert.equal((await fetch(base + '/favicon.png')).status, 200);
    assert.equal((await fetch(base + '/courses', { method: 'POST' })).status, 405);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
