// Manual GitHub Actions promotion only. The deploy hook is a secret kept in a
// reviewed GitHub environment, never in source or a shell transcript.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { publicOrigin } from './smoke_render_public.mjs';

export function pinnedHook(rawHook, serviceId, sha) {
  if (!/^srv-[a-z0-9]+$/.test(serviceId ?? '') || !/^[a-f0-9]{40}$/.test(sha ?? ''))
    throw new Error('The approved Render static-service ID and full Git commit SHA are required');
  let hook;
  try {
    hook = new URL(rawHook);
  } catch {
    throw new Error('Render deploy hook secret is missing or invalid');
  }
  if (
    hook.protocol !== 'https:' ||
    hook.hostname !== 'api.render.com' ||
    hook.port ||
    hook.username ||
    hook.password ||
    hook.hash ||
    hook.pathname !== `/deploy/${serviceId}` ||
    !hook.searchParams.get('key') ||
    [...hook.searchParams.keys()].join(',') !== 'key'
  )
    throw new Error('Deploy hook does not belong to the approved Render service');
  hook.searchParams.set('ref', sha); // A branch tip may move; pin the checked SHA.
  return hook.toString();
}

export async function requestPublicDeploy(hookUrl, serviceId, sha, fetcher = fetch) {
  const pinned = pinnedHook(hookUrl, serviceId, sha);
  let response;
  try {
    response = await fetcher(pinned, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(
      'Render deploy-hook request failed; check the owner account without logging its secret URL',
    );
  }
  if (response.status !== 200 && response.status !== 202)
    throw new Error(
      `Render refused the deploy request (HTTP ${response.status}); do not claim success`,
    );
  // A 200 or 202 only means accepted/queued, NOT that it built or went live.
  console.log(
    `Render accepted a manual, pinned public-site deploy request for ${sha.slice(0, 12)} (HTTP ${response.status}); waiting for independent hosted receipt.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sha = process.env.EXPECTED_PUBLIC_SHA;
  const checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (sha !== checkoutSha) throw new Error('Workflow checkout is not the approved full Git commit');
  publicOrigin(process.env.RENDER_PUBLIC_SITE_URL);
  await requestPublicDeploy(
    process.env.RENDER_DEPLOY_HOOK_URL,
    process.env.RENDER_PUBLIC_SERVICE_ID,
    sha,
  );
}
