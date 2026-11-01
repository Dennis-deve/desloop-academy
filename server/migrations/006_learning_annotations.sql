-- Additive, account-owned lesson notes and bookmarks for the existing adult learning API.
-- Never run against an uninspected remote database; operators must separately review
-- access grants, backups, controller approval and the target's actual migration state.
-- Notes do not count as practice, assessment, course credit or public publication.
BEGIN;
CREATE TABLE IF NOT EXISTS pilot.lesson_annotations (
  learner_id uuid NOT NULL REFERENCES pilot.users(id) ON DELETE CASCADE,
  course_id text NOT NULL CHECK (course_id ~ '^course-[0-9]{2}$'),
  lesson_id text NOT NULL CHECK (lesson_id ~ '^c[0-9]{2}-l[0-9]+$'),
  content_version text NOT NULL REFERENCES pilot.content_versions(version),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 4000),
  bookmarked boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, course_id, lesson_id, content_version)
);
CREATE INDEX IF NOT EXISTS pilot_lesson_annotations_course_idx
  ON pilot.lesson_annotations (learner_id, course_id, content_version);
COMMIT;
