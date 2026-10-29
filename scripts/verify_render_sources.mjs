// Node-only prebuild gate: Render's static Node runtime need not provide Python.
// Independently compare the committed allowlist with the original draft and exact rules.
import { readFile } from 'node:fs/promises';

const fail = (reason) => {
  throw new Error(`Render source gate: ${reason}`);
};
const source = JSON.parse(await readFile('src/curriculum/master.json', 'utf8'));
const catalog = JSON.parse(await readFile('src/curriculum/public-catalog.json', 'utf8'));
const redirects = await readFile('public/_redirects', 'utf8');
const blueprint = await readFile('render.yaml', 'utf8');
if (
  !source.version.startsWith('draft-') ||
  source.courses.length !== 44 ||
  source.stages.length !== 9
)
  fail('missing ordered draft source');
const selectedStages = source.stages.map((stage, index) => {
  if (stage.number !== index + 1) fail(`stage ${index + 1} changed order`);
  return Object.fromEntries(
    ['number', 'title', 'subtitle', 'first', 'last'].map((key) => [key, stage[key]]),
  );
});
let previousLast = 0;
for (const stage of selectedStages) {
  if (stage.first !== previousLast + 1 || stage.last < stage.first) fail('stage ranges changed');
  previousLast = stage.last;
}
if (previousLast !== 44) fail('stage ranges do not cover 44 courses');
const slugs = new Set();
const selectedCourses = source.courses.map((course, index) => {
  const number = index + 1;
  if (
    course.number !== number ||
    course.id !== `course-${String(number).padStart(2, '0')}` ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course.slug) ||
    slugs.has(course.slug)
  )
    fail(`course ${number} order/slug changed`);
  slugs.add(course.slug);
  if (
    course.modules.length !== 4 ||
    course.stage !==
      selectedStages.find((stage) => stage.first <= number && stage.last >= number)?.title
  )
    fail(`course ${number} modules/stage changed`);
  if (
    !course.ageAdaptation ||
    Object.keys(course.ageAdaptation).sort().join(',') !== 'adult,early,junior,teen'
  )
    fail(`course ${number} age labels changed`);
  return {
    id: course.id,
    number,
    slug: course.slug,
    title: course.title,
    purpose: course.purpose,
    stage: course.stage,
    guidedHours: course.guidedHours,
    ageAdaptation: Object.fromEntries(
      ['early', 'junior', 'teen', 'adult'].map((band) => [band, course.ageAdaptation[band]]),
    ),
    modules: course.modules.map((module) => ({ title: module.title })),
  };
});
const expected = {
  version: source.version,
  reviewStatus: 'unreviewed-draft',
  stages: selectedStages,
  courses: selectedCourses,
};
if (JSON.stringify(catalog) !== JSON.stringify(expected))
  fail('public metadata differs from safe projection');
const pages = [
  '/',
  '/courses',
  '/how-it-works',
  '/availability',
  ...selectedCourses.map((course) => `/courses/${course.slug}`),
];
const expectedRedirects =
  '# Exact public guide routes only. No wildcard fake workspace or private pilot fallback.\n' +
  pages.map((page) => `${page} /index.html 200`).join('\n') +
  '\n';
if (redirects !== expectedRedirects) fail('the existing static-host rewrites changed');
const blueprintSources = [
  ...blueprint.matchAll(/^        source: (\/[a-z0-9/-]+)\n        destination: \/index\.html$/gm),
].map((match) => match[1]);
if (
  blueprintSources.length !== 47 ||
  new Set(blueprintSources).size !== 47 ||
  blueprintSources.join('|') !== pages.slice(1).join('|') ||
  blueprint.includes('source: /*') ||
  blueprint.includes('type: pserv') ||
  /^databases:/m.test(blueprint) ||
  !blueprint.includes(
    '      - path: /release.json\n        name: Cache-Control\n        value: no-store',
  ) ||
  !blueprint.includes('runtime: static') ||
  !blueprint.includes('staticPublishPath: ./dist/render-public') ||
  !blueprint.includes("autoDeployTrigger: 'off'")
)
  fail('Render Blueprint is not the static-only 47-route manual plan');
console.log(
  'Render sources verified: 44 projected draft courses; 47 exact Render routes; static-only manual Blueprint.',
);
