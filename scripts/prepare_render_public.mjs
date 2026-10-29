// Copy only reviewed static owner-provided brand assets into the isolated Render artifact.
// Never copy the whole public/ directory (which may gain private files in future).
import { copyFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const out = 'dist/render-public';
const allowed = [
  'favicon.png',
  'apple-touch-icon.png',
  'sw.js', // retirement-only worker for users arriving from an earlier static shell
  'brand/app-icon.webp',
  'brand/brandmark-dark.webp',
  'brand/wordmark-dark.webp',
  'brand/wordmark-light.webp',
  'brand/wordmark-mono.webp',
];
for (const name of allowed) {
  const source = join('public', name);
  if (!(await lstat(source)).isFile()) throw new Error(`Unexpected non-file static asset: ${name}`);
  await mkdir(join(out, name.split('/').slice(0, -1).join('/')), { recursive: true });
  await copyFile(source, join(out, name));
}
// A public, non-sensitive receipt lets an independent smoke test prove which
// source commit Render has *actually* published. It grants no access or progress.
const sha = (
  process.env.RENDER_GIT_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
).trim();
if (!/^[a-f0-9]{40}$/.test(sha) || (process.env.RENDER && !process.env.RENDER_GIT_COMMIT))
  throw new Error('Render build lacks a valid checked-out commit SHA');
await writeFile(
  join(out, 'release.json'),
  JSON.stringify({ kind: 'read-only-course-site', sha }) + '\n',
);
console.log(
  `Copied ${allowed.length} reviewed brand and retirement assets into ${out}; public source receipt ${sha.slice(0, 12)}`,
);
