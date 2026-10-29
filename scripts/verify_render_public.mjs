// Fail the public Render build if a private chunk, an assessment key, or an API call leaks.
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const dir = 'dist/render-public';
const catalog = JSON.parse(await readFile('src/curriculum/public-catalog.json', 'utf8'));
const source = JSON.parse(await readFile('src/curriculum/master.json', 'utf8'));
const fail = (message) => {
  throw new Error(`Unsafe Render public artifact: ${message}`);
};
if (
  catalog.reviewStatus !== 'unreviewed-draft' ||
  catalog.courses.length !== 44 ||
  source.courses.length !== 44
)
  fail('draft catalogue changed');
const files = (await readdir(dir, { recursive: true })).map((file) => file.replaceAll('\\', '/'));
const standalone = new Set([
  'index.html',
  'favicon.png',
  'apple-touch-icon.png',
  'sw.js',
  'release.json',
]);
const brand = new Set([
  'brand/app-icon.webp',
  'brand/brandmark-dark.webp',
  'brand/wordmark-dark.webp',
  'brand/wordmark-light.webp',
  'brand/wordmark-mono.webp',
]);
const assets = files.filter(
  (file) => file.startsWith('assets/') && /\.(?:js|css|woff2?)$/.test(file),
);
if (!assets.some((file) => file.endsWith('.js')) || !assets.some((file) => file.endsWith('.css')))
  fail('missing JavaScript or stylesheet');
for (const file of files) {
  if (file === 'assets' || file === 'brand') continue;
  if (!standalone.has(file) && !brand.has(file) && !assets.includes(file))
    fail(`unexpected file ${file}`);
}
if ([...standalone, ...brand].some((file) => !files.includes(file)))
  fail('a reviewed static asset is missing');
const receipt = JSON.parse(await readFile(join(dir, 'release.json'), 'utf8'));
const currentSha = (
  process.env.RENDER_GIT_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
).trim();
if (
  Object.keys(receipt).sort().join(',') !== 'kind,sha' ||
  receipt.kind !== 'read-only-course-site' ||
  receipt.sha !== currentSha ||
  !/^[a-f0-9]{40}$/.test(receipt.sha)
)
  fail('public commit receipt does not match this build');
const html = await readFile(join(dir, 'index.html'), 'utf8');
if (!html.includes('id="root"') || !html.includes('Read-only information'))
  fail('missing truthful static entry');
const bundle = (
  await Promise.all(
    assets.filter((file) => file.endsWith('.js')).map((file) => readFile(join(dir, file), 'utf8')),
  )
).join('\n');
for (const forbidden of [
  /\/api\//,
  /\/pilot(?:\/|["'`])/,
  /\/auth\//,
  /AI provider operations/i,
  /AI_GATEWAY_ENABLED|NVIDIA_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY/,
  /desloop-academy-session-v1|demoAuthService|Select a demo role|Demo Learning School/,
]) {
  if (forbidden.test(bundle + html)) fail(`private route/secret/demo signature ${forbidden}`);
}
for (const course of source.courses) {
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      for (const text of [
        lesson.check.question,
        lesson.check.explanation,
        ...lesson.check.options,
      ]) {
        if (text.length >= 30 && bundle.includes(text))
          fail(`assessment answer leaked from ${course.id}`);
      }
    }
  }
}
console.log(
  `Render public artifact verified: 44 draft outlines, ${assets.length} style/script/font files; no private API, pilot/AI chunk or known assessment question text.`,
);
