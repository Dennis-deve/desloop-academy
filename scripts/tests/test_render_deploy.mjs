import test from 'node:test';
import assert from 'node:assert/strict';
import { pinnedHook, requestPublicDeploy } from '../trigger_render_public.mjs';
import { publicOrigin, waitForRelease, checkHostedBoundary } from '../smoke_render_public.mjs';

const sha = 'a'.repeat(40);
const site = 'https://desloop-readonly-guide.onrender.com';
const hook = 'https://api.render.com/deploy/srv-cireview?key=synthetic-do-not-use';

await test('only an exact owner-approved static site origin and matching pinned hook may be used', () => {
  assert.equal(publicOrigin(site), site);
  for (const invalid of [
    '',
    'http://desloop-readonly-guide.onrender.com',
    'https://evil.onrender.com.attacker.invalid',
    'https://user:pass@desloop-readonly-guide.onrender.com',
    'https://desloop-readonly-guide.onrender.com/anything',
    'https://127.0.0.1',
  ])
    assert.throws(() => publicOrigin(invalid));
  const pinned = new URL(pinnedHook(hook, 'srv-cireview', sha));
  assert.equal(pinned.searchParams.get('ref'), sha);
  for (const invalid of [
    'https://render.com/deploy/srv-cireview?key=synthetic',
    'https://api.render.com/deploy/srv-other?key=synthetic',
    'https://api.render.com/deploy/srv-cireview?key=synthetic&ref=main',
    'https://api.render.com/deploy/srv-cireview?key=one&key=two',
    'https://api.render.com/deploy/srv-cireview',
  ])
    assert.throws(() => pinnedHook(invalid, 'srv-cireview', sha));
});

await test('a hook response is a request, not proof of a hosted release', async () => {
  let requested;
  const fakeFetch = async (url, options) => {
    requested = [url, options.method, options.redirect];
    return new Response('{}', { status: 202 });
  };
  await requestPublicDeploy(hook, 'srv-cireview', sha, fakeFetch);
  assert.equal(new URL(requested[0]).searchParams.get('ref'), sha);
  assert.deepEqual(requested.slice(1), ['POST', 'error']);
  await assert.rejects(
    () =>
      requestPublicDeploy(hook, 'srv-cireview', sha, async () => new Response('', { status: 401 })),
    /HTTP 401/,
  );
});

await test('hosted checks wait for an actual matching receipt and deny private routes', async () => {
  let attempts = 0;
  const delayed = async () => {
    attempts += 1;
    return new Response(
      attempts === 1 ? '{}' : JSON.stringify({ kind: 'read-only-course-site', sha }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  };
  await waitForRelease(site, sha, {
    fetcher: delayed,
    intervalMs: 1,
    waitMs: 1000,
    sleep: async () => {},
  });
  assert.equal(attempts, 2);
  const ok = async (url) => {
    const path = new URL(url).pathname;
    if (path === '/release.json') return Response.json({ kind: 'read-only-course-site', sha });
    if (
      [
        '/pilot',
        '/pilot/ai/admin',
        '/api/pilot/status',
        '/api/health',
        '/register',
        '/checkout',
        '/demo',
        '/school/classes',
        '/courses/not-a-real-course',
      ].includes(path)
    )
      return new Response('not found', { status: 404 });
    return new Response('<title>Read-only information</title>', {
      status: 200,
      headers: {
        'content-type': 'text/html',
        'content-security-policy': "connect-src 'none'; frame-ancestors 'none'",
      },
    });
  };
  await checkHostedBoundary(site, sha, ok);
  await assert.rejects(
    () =>
      checkHostedBoundary(site, sha, async (url) => {
        if (new URL(url).pathname === '/pilot') return new Response('fake page', { status: 200 });
        return ok(url);
      }),
    /Forbidden/,
  );
  await assert.rejects(
    () =>
      waitForRelease(site, sha, {
        fetcher: async () => Response.json({ kind: 'read-only-course-site', sha: 'b'.repeat(40) }),
        waitMs: 0,
      }),
    /did not appear/,
  );
});
