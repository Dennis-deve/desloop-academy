import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Database } from '../db.js';
import { inTransaction } from '../db.js';
import {
  ENGINE_POLICY_VERSION,
  GUIDED_LESSON,
  VISUAL_CRITERIA,
  VISUAL_EVALUATOR_VERSION,
  type EngineCatalog,
} from './catalog.js';

const descriptions: Record<string, [string, string]> = {
  GES_CCP: ['EXTERNAL_HINT', 'GES/NaCCA Common Core (strategy proposal)'],
  CAMBRIDGE_0860: ['EXTERNAL_HINT', 'Cambridge 0860 (strategy proposal)'],
  OXFORD_INTL: ['EXTERNAL_HINT', 'Oxford International Computing (strategy proposal)'],
  VOCATIONAL_PRO: ['INTERNAL_FOCUS', 'Desloop vocational/career focus'],
};

export async function migrateEngine(db: Database, catalog: EngineCatalog) {
  const sql = await readFile(
    resolve(process.cwd(), 'server/migrations/002_learning_engine.sql'),
    'utf8',
  );
  await db.query(sql);
  await inTransaction(db, async (client) => {
    const prior = await client.query<{ content_sha256: string; policy_version: string }>(
      'SELECT content_sha256,policy_version FROM learning.catalog_releases WHERE version=$1 FOR UPDATE',
      [catalog.version],
    );
    if (
      prior.rows[0] &&
      (prior.rows[0].content_sha256 !== catalog.hash ||
        prior.rows[0].policy_version !== ENGINE_POLICY_VERSION)
    )
      throw new Error(
        'Learning release changed without an explicit new version; migration refused',
      );
    await client.query(
      `INSERT INTO learning.catalog_releases(version,policy_version,content_sha256)
       VALUES ($1,$2,$3) ON CONFLICT(version) DO NOTHING`,
      [catalog.version, ENGINE_POLICY_VERSION, catalog.hash],
    );
    const release = await client.query<{ id: string }>(
      'SELECT id FROM learning.catalog_releases WHERE version=$1',
      [catalog.version],
    );
    const releaseId = release.rows[0].id;
    for (const [code, [kind, label]] of Object.entries(descriptions))
      await client.query(
        'INSERT INTO learning.strategy_tags(code,kind,label) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [code, kind, label],
      );
    for (const course of catalog.courses) {
      await client.query(
        'INSERT INTO learning.courses(id,sequence_no) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',
        [course.id, course.number],
      );
      const stageNo =
        course.number <= 6
          ? 1
          : course.number <= 11
            ? 2
            : course.number <= 15
              ? 3
              : course.number <= 21
                ? 4
                : course.number <= 27
                  ? 5
                  : course.number <= 32
                    ? 6
                    : course.number <= 37
                      ? 7
                      : course.number <= 40
                        ? 8
                        : 9;
      await client.query(
        `INSERT INTO learning.course_content
         (release_id,course_id,stage_no,title,purpose,guided_hours,project)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [
          releaseId,
          course.id,
          stageNo,
          course.title,
          course.purpose,
          course.guidedHours,
          JSON.stringify(course.project),
        ],
      );
      for (const [moduleNo, module] of course.modules.entries()) {
        await client.query(
          `INSERT INTO learning.modules(release_id,course_id,id,ordinal,title)
           VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [releaseId, course.id, module.id, moduleNo + 1, module.title],
        );
        for (const [lessonNo, lesson] of module.lessons.entries()) {
          const isVisual =
            course.id === GUIDED_LESSON.courseId &&
            module.id === GUIDED_LESSON.moduleId &&
            lesson.id === GUIDED_LESSON.lessonId;
          await client.query(
            `INSERT INTO learning.lessons
             (release_id,course_id,module_id,id,ordinal,tool_kind,content)
             VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [
              releaseId,
              course.id,
              module.id,
              lesson.id,
              lessonNo + 1,
              isVisual ? 'VISUAL' : null,
              JSON.stringify(lesson),
            ],
          );
          if (isVisual)
            await client.query(
              `INSERT INTO learning.assessment_specs
               (release_id,course_id,module_id,lesson_id,evaluator_version,criteria)
               VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
              [
                releaseId,
                course.id,
                module.id,
                lesson.id,
                VISUAL_EVALUATOR_VERSION,
                JSON.stringify(VISUAL_CRITERIA),
              ],
            );
        }
      }
      for (const tag of catalog.strategyTags.get(course.id) ?? []) {
        await client.query(
          `INSERT INTO learning.strategy_course_tags
           (release_id,course_id,tag_code,source_sha256,source_page)
           VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [releaseId, course.id, tag.code, catalog.strategySha256, tag.source.page],
        );
      }
    }
    // Imported hints never populate official standard outcomes or verified mappings.
  });
  await verifyEngineRelease(db, catalog);
}

export async function verifyEngineRelease(db: Database, catalog: EngineCatalog) {
  const found = await db.query<{
    id: string;
    content_sha256: string;
    policy_version: string;
    status: string;
  }>(
    'SELECT id,content_sha256,policy_version,status FROM learning.catalog_releases WHERE version=$1',
    [catalog.version],
  );
  const release = found.rows[0];
  if (
    !release ||
    release.content_sha256 !== catalog.hash ||
    release.policy_version !== ENGINE_POLICY_VERSION ||
    release.status !== 'internal_draft'
  )
    throw new Error('Unreviewed engine release changed; do not enable the service');
  const totals = await db.query<{
    courses: string;
    modules: string;
    lessons: string;
    hints: string;
    specs: string;
  }>(
    `SELECT
     (SELECT count(*) FROM learning.course_content WHERE release_id=$1) AS courses,
     (SELECT count(*) FROM learning.modules WHERE release_id=$1) AS modules,
     (SELECT count(*) FROM learning.lessons WHERE release_id=$1) AS lessons,
     (SELECT count(*) FROM learning.strategy_course_tags WHERE release_id=$1) AS hints,
     (SELECT count(*) FROM learning.assessment_specs WHERE release_id=$1) AS specs`,
    [release.id],
  );
  const total = totals.rows[0];
  if (
    !total ||
    Number(total.courses) !== 44 ||
    Number(total.modules) !== 176 ||
    Number(total.lessons) !== 176 ||
    Number(total.hints) !== 34 ||
    Number(total.specs) !== 1
  )
    throw new Error('Learning-engine release is incomplete; run the reviewed migration');
  return release.id;
}
