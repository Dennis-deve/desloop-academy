import catalog from './public-catalog.json';

/** Metadata-only draft projection. Never import master.json into the public release graph. */
export type PublicAgeBand = 'early' | 'junior' | 'teen' | 'adult';
export type PublicCourse = (typeof catalog.courses)[number];
export type PublicStage = (typeof catalog.stages)[number];
export const publicCatalog = catalog;
export const publicCourses: PublicCourse[] = catalog.courses;
export const publicStages: PublicStage[] = catalog.stages;
export const publicCourseBySlug = (slug: string): PublicCourse | undefined =>
  publicCourses.find((course) => course.slug === slug);
