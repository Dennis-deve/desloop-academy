import type { Database } from './db.js';

/**
 * Count persisted, idempotent learner actions. UTC dates are explicit; these are
 * actions, never inferred minutes, attendance, credit, or a count of sessions.
 * No public or reviewer route exposes a learner's activity.
 */
export async function readWeeklyActivity(db: Database, learnerId: string, includeEngine: boolean) {
  const engineActions = includeEngine
    ? `UNION ALL SELECT (created_at AT TIME ZONE 'UTC')::date AS day
         FROM learning.lesson_attempts WHERE learner_id=$1 AND created_at >= now() - interval '7 days'
       UNION ALL SELECT (created_at AT TIME ZONE 'UTC')::date AS day
         FROM learning.quiz_attempts WHERE learner_id=$1 AND created_at >= now() - interval '7 days'
       UNION ALL SELECT (submitted_at AT TIME ZONE 'UTC')::date AS day
         FROM learning.project_submissions WHERE learner_id=$1 AND submitted_at >= now() - interval '7 days'`
    : '';
  const result = await db.query<{ date: string; actions: number }>(
    `WITH actions AS (
       SELECT (created_at AT TIME ZONE 'UTC')::date AS day
         FROM pilot.lesson_attempts WHERE learner_id=$1 AND created_at >= now() - interval '7 days'
       UNION ALL SELECT (created_at AT TIME ZONE 'UTC')::date AS day
         FROM pilot.quiz_attempts WHERE learner_id=$1 AND created_at >= now() - interval '7 days'
       UNION ALL SELECT (submitted_at AT TIME ZONE 'UTC')::date AS day
         FROM pilot.project_submissions WHERE learner_id=$1 AND submitted_at >= now() - interval '7 days'
       ${engineActions}
     ), days AS (
       SELECT generate_series(
         (now() AT TIME ZONE 'UTC')::date - 6,
         (now() AT TIME ZONE 'UTC')::date,
         interval '1 day'
       )::date AS day
     )
     SELECT to_char(days.day,'YYYY-MM-DD') AS date, count(actions.day)::integer AS actions
       FROM days LEFT JOIN actions USING(day)
       GROUP BY days.day ORDER BY days.day`,
    [learnerId],
  );
  return {
    timezone: 'UTC' as const,
    measure: 'persisted-learner-actions' as const,
    sources: includeEngine ? ['draft-1', 'draft-2'] : ['draft-1'],
    days: result.rows,
  };
}
