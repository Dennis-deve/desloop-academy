// Release gate: reject old browser-only workspaces and draft assessment keys.
// Runs after the Vite build using only Node, including on Railway's Node image.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const source = JSON.parse(await readFile('src/curriculum/master.json', 'utf8'));
const publicCatalog = JSON.parse(await readFile('src/curriculum/public-catalog.json', 'utf8'));
const expectedCourseKeys = ['id', 'number', 'slug', 'title', 'purpose', 'stage', 'guidedHours', 'ageAdaptation', 'modules'];
const stageKeys = ['number', 'title', 'subtitle', 'first', 'last'];
const sorted = (value) => [...value].sort().join('|');
const fail = (message) => { throw new Error(`Unsafe release: ${message}`); };
const matchesKeys = (object, keys) => sorted(Object.keys(object)) === sorted(keys);

if (source.version !== publicCatalog.version || publicCatalog.reviewStatus !== 'unreviewed-draft' || source.courses.length !== 44 || publicCatalog.courses.length !== 44 || publicCatalog.stages.length !== 9) fail('stale or invalid draft projection');
for (let i = 0; i < 9; i++) {
  const published = publicCatalog.stages[i];
  const original = source.stages[i];
  if (!matchesKeys(published, stageKeys) || stageKeys.some((key) => published[key] !== original[key])) fail(`stage ${i + 1} differs from source`);
}
for (let i = 0; i < 44; i++) {
  const published = publicCatalog.courses[i];
  const original = source.courses[i];
  if (!matchesKeys(published, expectedCourseKeys) || original.id !== `course-${String(i + 1).padStart(2, '0')}` || published.number !== i + 1) fail(`course ${i + 1} is out of order`);
  for (const key of ['id', 'number', 'slug', 'title', 'purpose', 'stage', 'guidedHours']) if (published[key] !== original[key]) fail(`course ${i + 1} has stale metadata`);
  if (JSON.stringify(published.ageAdaptation) !== JSON.stringify({ early: original.ageAdaptation.early, junior: original.ageAdaptation.junior, teen: original.ageAdaptation.teen, adult: original.ageAdaptation.adult })) fail(`course ${i + 1} has stale teaching metadata`);
  if (published.modules.length !== 4 || published.modules.some((module, index) => !matchesKeys(module, ['title']) || module.title !== original.modules[index].title)) fail(`course ${i + 1} has stale or unsafe modules`);
}
// A static host must not rewrite unknown fake routes to a successful SPA shell.
// The Fastify server uses the same course-slug allowlist independently.
const publicPaths = ['/', '/courses', '/how-it-works', '/availability', ...publicCatalog.courses.map((course) => `/courses/${course.slug}`)];
const safeRedirects = '# Exact public guide routes only. No wildcard fake workspace or private pilot fallback.\n'
  + publicPaths.map((path) => `${path} /index.html 200`).join('\n') + '\n';
if (await readFile('public/_redirects', 'utf8') !== safeRedirects) fail('static host redirects are stale or include unsafe wildcard routes');
const jsFiles = (await readdir('dist/assets')).filter((file) => file.endsWith('.js'));
if (!jsFiles.length) fail('no JavaScript build artifacts');
const bundle = (await Promise.all(jsFiles.map((file) => readFile(join('dist/assets', file), 'utf8')))).join('\n');
for (const signature of ['Demo Learning School', 'desloop-academy-session-v1', 'demoAuthService', 'sample-courses', 'Select a demo role']) {
  if (bundle.includes(signature)) fail(`browser-only workspace leaked (${signature})`);
}
for (const course of source.courses) for (const module of course.modules) for (const lesson of module.lessons) {
  for (const sensitive of [lesson.check.question, lesson.check.explanation, ...lesson.check.options]) {
    if (sensitive.length >= 30 && bundle.includes(sensitive)) fail(`draft assessment material leaked (${course.id}/${lesson.id})`);
  }
}
console.log(`Release bundle verified: ${publicCatalog.courses.length} metadata-only course outlines; ${jsFiles.length} chunks; no known simulated workspaces or draft assessment questions.`);
