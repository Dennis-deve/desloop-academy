// Copy only reviewed static owner-provided brand assets into the isolated Render artifact.
// Never copy the whole public/ directory (which may gain private files in future).
import { copyFile, lstat, mkdir } from 'node:fs/promises';
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
console.log(`Copied ${allowed.length} reviewed brand and retirement assets into ${out}`);
