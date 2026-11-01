import type { Database } from '../db.js';
import { appendAudit, inTransaction } from '../db.js';
import type { PilotCatalog } from '../catalog.js';
import { PilotProgression } from '../progression.js';
import { ApiError } from '../security.js';

export interface AnnotationInput {
  note: string;
  bookmarked: boolean;
  expectedRevision: number;
}

interface StoredAnnotation {
  lesson_id: string;
  note: string;
  bookmarked: boolean;
  revision: number;
  updated_at: Date;
}

/** Fail startup closed if migration 006 or runtime SELECT privileges are missing. */
export async function verifyLearningAnnotations(db: Database) {
  try {
    await db.query('SELECT 1 FROM pilot.lesson_annotations LIMIT 0');
  } catch {
    throw new Error('Learning annotations need reviewed migration 006 and least-privilege runtime access.');
  }
}

function visibleAnnotation(row: StoredAnnotation) {
  return {
    lessonId: row.lesson_id,
    note: row.note,
    bookmarked: row.bookmarked,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

/** Private, version-bound annotations. This service never changes mastery or course credit. */
export class LearningAnnotations {
  private progression: PilotProgression;

  constructor(
    private db: Database,
    private catalog: PilotCatalog,
  ) {
    this.progression = new PilotProgression(db, catalog);
  }

  async course(learnerId: string, courseId: string) {
    const detail = await this.progression.courseDetail(learnerId, courseId);
    const rows = await this.db.query<StoredAnnotation>(
      `SELECT lesson_id, note, bookmarked, revision, updated_at
       FROM pilot.lesson_annotations
       WHERE learner_id=$1 AND course_id=$2 AND content_version=$3
       ORDER BY lesson_id`,
      [learnerId, courseId, detail.course.version],
    );
    return {
      courseId,
      contentVersion: detail.course.version,
      items: rows.rows.map(visibleAnnotation),
    };
  }

  async save(learnerId: string, courseId: string, lessonId: string, input: AnnotationInput) {
    // The same server-side ordered-course check used by actual learning routes;
    // never trust a course, lesson or user ID supplied by the browser.
    const detail = await this.progression.courseDetail(learnerId, courseId);
    if (!detail.course.modules.some((module) => module.lessons.some((lesson) => lesson.id === lessonId)))
      throw new ApiError(404, 'LESSON_UNKNOWN', 'Lesson not found in this course.');
    const course = this.catalog.course(courseId);
    if (!course || course.version !== detail.course.version)
      throw new Error('The server course version changed during this request.');

    return inTransaction(this.db, async (client) => {
      // A first write may only insert; later writes update only the exact revision.
      // PostgreSQL checks these atomically, so two devices cannot silently overwrite.
      const values = [learnerId, courseId, lessonId, course.version, input.note, input.bookmarked];
      const result = input.expectedRevision === 0
        ? await client.query<StoredAnnotation>(
            `INSERT INTO pilot.lesson_annotations
              (learner_id,course_id,lesson_id,content_version,note,bookmarked)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (learner_id,course_id,lesson_id,content_version) DO NOTHING
             RETURNING lesson_id,note,bookmarked,revision,updated_at`, values)
        : await client.query<StoredAnnotation>(
            `UPDATE pilot.lesson_annotations
             SET note=$5, bookmarked=$6, revision=revision+1, updated_at=now()
             WHERE learner_id=$1 AND course_id=$2 AND lesson_id=$3 AND content_version=$4
               AND revision=$7
             RETURNING lesson_id,note,bookmarked,revision,updated_at`,
            [...values, input.expectedRevision]);
      if (!result.rows[0])
        throw new ApiError(
          409,
          'ANNOTATION_CONFLICT',
          'This lesson note changed or was removed elsewhere. Keep your draft, reload the server version and choose what to save.',
        );
      const row = result.rows[0];
      await appendAudit(client, learnerId, 'pilot.annotation.saved', courseId, {
        lessonId,
        contentVersion: course.version,
        revision: row.revision,
        bookmarked: row.bookmarked,
        // No learner-written text in audit or application logs.
      });
      return visibleAnnotation(row);
    });
  }
}
