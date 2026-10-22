import { readFileSync } from 'node:fs';

// Read the same reviewed-for-release metadata projection the browser bundles.
// Fail startup closed if this source is absent; never import assessment answers.
const metadata = JSON.parse(readFileSync(new URL('../../src/curriculum/public-catalog.json', import.meta.url), 'utf8')) as { courses: { slug: string }[] };
if (!Array.isArray(metadata.courses) || metadata.courses.length !== 44) throw new Error('Public route metadata is invalid');
const courseSlugs = new Set(metadata.courses.map((course) => course.slug));
if (courseSlugs.size !== 44) throw new Error('Public course slugs must be unique');

// Only these client-side routes receive an HTTP 200 SPA shell. Protected API
// endpoints are registered separately and never fall through to this list.
const exact = new Set(['/', '/courses', '/how-it-works', '/availability', '/pilot']);
const pilotPath = /^\/pilot\/(?:courses\/course-\d{2}|reviews|engine(?:\/(?:courses\/course-\d{2}|reviews|studio(?:\/projects\/[0-9a-f-]{36})?|guided\/course-\d{2}\/c\d{2}-l\d+))?)$/;

export function isAvailableClientPath(rawUrl: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(rawUrl, 'http://internal.invalid').pathname;
  } catch {
    return false;
  }
  if (pathname.startsWith('/courses/')) return courseSlugs.has(pathname.slice('/courses/'.length));
  return exact.has(pathname) || pilotPath.test(pathname);
}
