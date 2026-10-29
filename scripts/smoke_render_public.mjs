// Read-only *hosted* acceptance: prove the requested SHA really reached Render's
// public static site and that no private/unknown route responds successfully.
// Do not mistake a deploy-hook acceptance response for a completed deployment.
import { setTimeout as pause } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const pages = [
  '/',
  '/courses',
  '/how-it-works',
  '/availability',
  '/courses/getting-started-with-learning-and-digital-confidence',
];
const denied = [
  '/pilot',
  '/pilot/ai/admin',
  '/api/pilot/status',
  '/api/health',
  '/register',
  '/checkout',
  '/demo',
  '/school/classes',
  '/courses/not-a-real-course',
];

export function publicOrigin(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('A real HTTPS onrender.com public site URL is required');
  }
  if (
    url.protocol !== 'https:' ||
    !/^[a-z0-9-]+\.onrender\.com$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Only the exact owner-reviewed HTTPS Render static-site origin is allowed');
  return url.origin;
}

export async function hasExpectedReceipt(origin, sha, fetcher = fetch, nonce = Date.now()) {
  const response = await fetcher(
    `${origin}/release.json?receipt=${encodeURIComponent(sha)}-${nonce}`,
    {
      redirect: 'manual',
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (response.status !== 200 || Number(response.headers.get('content-length') ?? 0) > 1024)
    return false;
  try {
    const receipt = await response.json();
    return (
      Object.keys(receipt).sort().join(',') === 'kind,sha' &&
      receipt.kind === 'read-only-course-site' &&
      receipt.sha === sha
    );
  } catch {
    return false;
  }
}

export async function waitForRelease(
  origin,
  sha,
  { fetcher = fetch, waitMs = 720_000, intervalMs = 12_000, sleep = pause } = {},
) {
  if (!/^[a-f0-9]{40}$/.test(sha))
    throw new Error('Expected source SHA must be a full 40-character Git commit');
  const deadline = Date.now() + waitMs;
  let attempts = 0;
  do {
    attempts += 1;
    try {
      if (await hasExpectedReceipt(origin, sha, fetcher, `${Date.now()}-${attempts}`)) {
        console.log(
          `Render public receipt matches requested commit ${sha.slice(0, 12)} after ${attempts} check(s)`,
        );
        return;
      }
    } catch {
      /* A deploy may not be live yet; do not log response bodies or secrets. */
    }
    if (Date.now() >= deadline) break;
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  } while (Date.now() < deadline);
  throw new Error(
    'Requested commit did not appear at the public site within the deadline; check Render deploy logs and do not claim release success',
  );
}

export async function checkHostedBoundary(origin, sha, fetcher = fetch) {
  if (!(await hasExpectedReceipt(origin, sha, fetcher)))
    throw new Error('Public release receipt differs from the verified commit');
  for (const path of pages) {
    const response = await fetcher(origin + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (
      response.status !== 200 ||
      !(response.headers.get('content-type') ?? '').includes('text/html')
    )
      throw new Error(`Public guide ${path} did not return HTML 200 (got ${response.status})`);
    if (path === '/') {
      const csp = response.headers.get('content-security-policy') ?? '';
      if (!csp.includes("connect-src 'none'") || !csp.includes("frame-ancestors 'none'"))
        throw new Error('Hosted security headers differ from the reviewed static Blueprint');
      if (!(await response.text()).includes('Read-only information'))
        throw new Error('Hosted root does not have the reviewed public-only HTML entry');
    }
  }
  for (const path of denied) {
    const response = await fetcher(origin + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status !== 404)
      throw new Error(`Forbidden or unknown path ${path} returned ${response.status}, not 404`);
  }
  console.log(
    `Hosted public HTTP boundary passed: ${pages.length} real paths, ${denied.length} private/unknown denials, reviewed headers and commit ${sha.slice(0, 12)}. Manual accessibility review remains open.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const origin = publicOrigin(process.env.RENDER_PUBLIC_SITE_URL);
  const sha = process.env.EXPECTED_PUBLIC_SHA;
  await waitForRelease(origin, sha);
  await checkHostedBoundary(origin, sha);
}
