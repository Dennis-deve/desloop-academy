-- ADDITIVE adult/internal v2 rehearsal. No child accounts, accredited outcomes, live code execution,
-- or automatic migration of pilot draft-1 completions. Apply only with an explicit operator gate.
BEGIN;
CREATE SCHEMA IF NOT EXISTS learning;
REVOKE ALL ON SCHEMA learning FROM PUBLIC;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='progress_state' AND typnamespace='learning'::regnamespace) THEN
    CREATE TYPE learning.progress_state AS ENUM ('LOCKED','AVAILABLE','IN_PROGRESS','SUBMITTED_FOR_REVIEW','NEEDS_REVISION','FAILED_REMEDIATION','COMPLETED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='project_scope' AND typnamespace='learning'::regnamespace) THEN
    CREATE TYPE learning.project_scope AS ENUM ('GUIDED','PLAYGROUND');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='tool_kind' AND typnamespace='learning'::regnamespace) THEN
    CREATE TYPE learning.tool_kind AS ENUM ('VISUAL','WEB','JAVASCRIPT','PYTHON','SQL','GAME_2D','ROBOTICS','WIREFRAME','SPREADSHEET','DESIGN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS learning.catalog_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  policy_version text NOT NULL,
  content_sha256 char(64) NOT NULL,
  status text NOT NULL DEFAULT 'internal_draft' CHECK (status IN ('internal_draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,policy_version)
);
CREATE TABLE IF NOT EXISTS learning.courses (
  id text PRIMARY KEY CHECK (id ~ '^course-[0-9]{2}$'),
  sequence_no integer NOT NULL UNIQUE CHECK (sequence_no BETWEEN 1 AND 44)
);
CREATE TABLE IF NOT EXISTS learning.course_content (
  release_id uuid NOT NULL REFERENCES learning.catalog_releases(id),
  course_id text NOT NULL REFERENCES learning.courses(id),
  stage_no integer NOT NULL CHECK (stage_no BETWEEN 1 AND 9),
  title text NOT NULL,
  purpose text NOT NULL,
  guided_hours integer NOT NULL CHECK (guided_hours > 0),
  project jsonb NOT NULL,
  PRIMARY KEY(release_id,course_id)
);
CREATE TABLE IF NOT EXISTS learning.modules (
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  id text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  title text NOT NULL,
  PRIMARY KEY(release_id,course_id,id),
  UNIQUE(release_id,course_id,ordinal),
  FOREIGN KEY(release_id,course_id) REFERENCES learning.course_content(release_id,course_id)
);
CREATE TABLE IF NOT EXISTS learning.lessons (
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  module_id text NOT NULL,
  id text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  tool_kind learning.tool_kind,
  content jsonb NOT NULL,
  PRIMARY KEY(release_id,course_id,module_id,id),
  UNIQUE(release_id,course_id,module_id,ordinal),
  UNIQUE(release_id,course_id,module_id,id,tool_kind),
  FOREIGN KEY(release_id,course_id,module_id) REFERENCES learning.modules(release_id,course_id,id)
);
CREATE TABLE IF NOT EXISTS learning.assessment_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  module_id text NOT NULL,
  lesson_id text NOT NULL,
  evaluator_version text NOT NULL,
  criteria jsonb NOT NULL,
  requires_human_review boolean NOT NULL DEFAULT false,
  UNIQUE(release_id,course_id,module_id,lesson_id),
  UNIQUE(release_id,course_id,module_id,lesson_id,evaluator_version),
  FOREIGN KEY(release_id,course_id,module_id,lesson_id)
    REFERENCES learning.lessons(release_id,course_id,module_id,id)
);

-- A course-number strategy hint is NOT a verified, outcome-level standards mapping.
CREATE TABLE IF NOT EXISTS learning.strategy_tags (
  code text PRIMARY KEY CHECK (code IN ('GES_CCP','CAMBRIDGE_0860','OXFORD_INTL','VOCATIONAL_PRO')),
  kind text NOT NULL CHECK (kind IN ('EXTERNAL_HINT','INTERNAL_FOCUS')),
  label text NOT NULL,
  CHECK ((code='VOCATIONAL_PRO')=(kind='INTERNAL_FOCUS'))
);
CREATE TABLE IF NOT EXISTS learning.strategy_course_tags (
  release_id uuid NOT NULL,
  course_id text NOT NULL,
  tag_code text NOT NULL REFERENCES learning.strategy_tags(code),
  source_sha256 char(64) NOT NULL,
  source_page integer NOT NULL CHECK (source_page > 0),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','reviewed','rejected')),
  reviewed_by uuid REFERENCES pilot.users(id),
  reviewed_at timestamptz,
  PRIMARY KEY(release_id,course_id,tag_code,source_sha256),
  FOREIGN KEY(release_id,course_id) REFERENCES learning.course_content(release_id,course_id),
  CHECK ((status='proposed' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('reviewed','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS learning.standard_frameworks (
  code text NOT NULL CHECK (code IN ('GES_CCP','CAMBRIDGE_0860','OXFORD_INTL')),
  edition text NOT NULL, source_reference text NOT NULL,
  PRIMARY KEY(code,edition)
);
CREATE TABLE IF NOT EXISTS learning.standard_outcomes (
  framework_code text NOT NULL, edition text NOT NULL, outcome_code text NOT NULL,
  title text NOT NULL, source_reference text NOT NULL,
  PRIMARY KEY(framework_code,edition,outcome_code),
  FOREIGN KEY(framework_code,edition) REFERENCES learning.standard_frameworks(code,edition)
);
CREATE TABLE IF NOT EXISTS learning.alignment_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL, course_id text NOT NULL, module_id text,
  framework_code text NOT NULL, edition text NOT NULL, outcome_code text NOT NULL,
  evidence text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','verified','rejected')),
  reviewed_by uuid REFERENCES pilot.users(id), reviewed_at timestamptz,
  FOREIGN KEY(release_id,course_id) REFERENCES learning.course_content(release_id,course_id),
  FOREIGN KEY(release_id,course_id,module_id) REFERENCES learning.modules(release_id,course_id,id),
  FOREIGN KEY(framework_code,edition,outcome_code)
    REFERENCES learning.standard_outcomes(framework_code,edition,outcome_code),
  CHECK ((status='draft' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('verified','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS learning.enrollments (
  learner_id uuid PRIMARY KEY REFERENCES pilot.users(id),
  active_release_id uuid NOT NULL,
  pinned_policy_version text NOT NULL,
  assigned_by text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  FOREIGN KEY(active_release_id,pinned_policy_version)
    REFERENCES learning.catalog_releases(id,policy_version)
);
CREATE TABLE IF NOT EXISTS learning.course_progress (
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  release_id uuid NOT NULL, course_id text NOT NULL, policy_version text NOT NULL,
  state learning.progress_state NOT NULL DEFAULT 'LOCKED',
  revision bigint NOT NULL DEFAULT 0 CHECK(revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(learner_id,release_id,course_id),
  FOREIGN KEY(release_id,course_id) REFERENCES learning.course_content(release_id,course_id),
  FOREIGN KEY(release_id,policy_version) REFERENCES learning.catalog_releases(id,policy_version)
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_one_open_course_per_release
  ON learning.course_progress(learner_id,release_id)
  WHERE state IN ('AVAILABLE','IN_PROGRESS','SUBMITTED_FOR_REVIEW','NEEDS_REVISION','FAILED_REMEDIATION');
CREATE TABLE IF NOT EXISTS learning.module_progress (
  learner_id uuid NOT NULL, release_id uuid NOT NULL, course_id text NOT NULL, module_id text NOT NULL,
  state learning.progress_state NOT NULL DEFAULT 'LOCKED',
  revision bigint NOT NULL DEFAULT 0 CHECK(revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(learner_id,release_id,course_id,module_id),
  FOREIGN KEY(learner_id,release_id,course_id)
    REFERENCES learning.course_progress(learner_id,release_id,course_id),
  FOREIGN KEY(release_id,course_id,module_id) REFERENCES learning.modules(release_id,course_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_one_open_module_per_course
  ON learning.module_progress(learner_id,release_id,course_id)
  WHERE state IN ('AVAILABLE','IN_PROGRESS','SUBMITTED_FOR_REVIEW','NEEDS_REVISION','FAILED_REMEDIATION');

CREATE TABLE IF NOT EXISTS learning.sandbox_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES pilot.users(id),
  scope learning.project_scope NOT NULL,
  tool_kind learning.tool_kind NOT NULL,
  release_id uuid, course_id text, module_id text, lesson_id text,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility='private'),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,owner_id), UNIQUE(id,owner_id,scope), UNIQUE(owner_id,request_id),
  CHECK ((scope='GUIDED' AND release_id IS NOT NULL AND course_id IS NOT NULL AND module_id IS NOT NULL AND lesson_id IS NOT NULL)
    OR (scope='PLAYGROUND' AND release_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL)),
  FOREIGN KEY(release_id,course_id,module_id,lesson_id,tool_kind)
    REFERENCES learning.lessons(release_id,course_id,module_id,id,tool_kind)
);
CREATE INDEX IF NOT EXISTS learning_project_owner_list ON learning.sandbox_projects(owner_id,scope,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS learning_one_guided_project_per_lesson
  ON learning.sandbox_projects(owner_id,release_id,course_id,module_id,lesson_id)
  WHERE scope='GUIDED';
CREATE TABLE IF NOT EXISTS learning.sandbox_revisions (
  project_id uuid NOT NULL, owner_id uuid NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no BETWEEN 1 AND 100),
  content jsonb NOT NULL CHECK(octet_length(content::text) <= 16384),
  content_sha256 char(64) NOT NULL,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id,revision_no), UNIQUE(project_id,revision_no,content_sha256),
  UNIQUE(owner_id,request_id),
  FOREIGN KEY(project_id,owner_id) REFERENCES learning.sandbox_projects(id,owner_id)
);
CREATE TABLE IF NOT EXISTS learning.sandbox_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL, owner_id uuid NOT NULL,
  scope learning.project_scope NOT NULL DEFAULT 'GUIDED' CHECK (scope='GUIDED'),
  release_id uuid NOT NULL, course_id text NOT NULL, module_id text NOT NULL, lesson_id text NOT NULL,
  revision_no integer NOT NULL, revision_sha256 char(64) NOT NULL,
  evaluator_version text NOT NULL,
  source text NOT NULL DEFAULT 'SERVER_VERIFIED' CHECK (source='SERVER_VERIFIED'),
  passed boolean NOT NULL,
  checks jsonb NOT NULL,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,request_id),
  UNIQUE(id,owner_id,release_id,course_id,module_id,lesson_id),
  FOREIGN KEY(project_id,owner_id,scope) REFERENCES learning.sandbox_projects(id,owner_id,scope),
  FOREIGN KEY(project_id,revision_no,revision_sha256)
    REFERENCES learning.sandbox_revisions(project_id,revision_no,content_sha256),
  FOREIGN KEY(release_id,course_id,module_id,lesson_id,evaluator_version)
    REFERENCES learning.assessment_specs(release_id,course_id,module_id,lesson_id,evaluator_version)
);
CREATE TABLE IF NOT EXISTS learning.lesson_passes (
  learner_id uuid NOT NULL, release_id uuid NOT NULL, course_id text NOT NULL,
  module_id text NOT NULL, lesson_id text NOT NULL,
  practice text NOT NULL CHECK(length(practice) BETWEEN 15 AND 5000),
  answer_index integer NOT NULL CHECK(answer_index >= 0),
  guided_run_id uuid,
  request_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(learner_id,release_id,course_id,module_id,lesson_id),
  UNIQUE(learner_id,request_id),
  FOREIGN KEY(learner_id,release_id,course_id,module_id)
    REFERENCES learning.module_progress(learner_id,release_id,course_id,module_id),
  FOREIGN KEY(release_id,course_id,module_id,lesson_id)
    REFERENCES learning.lessons(release_id,course_id,module_id,id),
  FOREIGN KEY(guided_run_id,learner_id,release_id,course_id,module_id,lesson_id)
    REFERENCES learning.sandbox_runs(id,owner_id,release_id,course_id,module_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS learning.lesson_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES pilot.users(id), release_id uuid NOT NULL,
  course_id text NOT NULL, module_id text NOT NULL, lesson_id text NOT NULL,
  answer_index integer NOT NULL, correct boolean NOT NULL,
  request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id,request_id),
  FOREIGN KEY(release_id,course_id,module_id,lesson_id)
    REFERENCES learning.lessons(release_id,course_id,module_id,id)
);
CREATE TABLE IF NOT EXISTS learning.quiz_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id uuid NOT NULL, release_id uuid NOT NULL, course_id text NOT NULL,
  answers jsonb NOT NULL, score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
  critical_passed boolean NOT NULL, request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id,request_id),
  FOREIGN KEY(learner_id,release_id,course_id)
    REFERENCES learning.course_progress(learner_id,release_id,course_id)
);
CREATE INDEX IF NOT EXISTS learning_quiz_latest ON learning.quiz_attempts(learner_id,release_id,course_id,id DESC);
CREATE TABLE IF NOT EXISTS learning.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL, release_id uuid NOT NULL, course_id text NOT NULL,
  iteration integer NOT NULL CHECK(iteration > 0),
  artefact text NOT NULL CHECK(length(artefact) BETWEEN 40 AND 5000),
  reflection text NOT NULL CHECK(length(reflection) BETWEEN 20 AND 5000),
  safety_attested boolean NOT NULL CHECK(safety_attested),
  status text NOT NULL DEFAULT 'submitted'
    CHECK(status IN ('submitted','revision_requested','approved')),
  request_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id,release_id,course_id,iteration), UNIQUE(learner_id,request_id),
  FOREIGN KEY(learner_id,release_id,course_id)
    REFERENCES learning.course_progress(learner_id,release_id,course_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_one_pending_review
  ON learning.project_submissions(learner_id,release_id,course_id) WHERE status='submitted';
CREATE TABLE IF NOT EXISTS learning.review_assignments (
  submission_id uuid PRIMARY KEY REFERENCES learning.project_submissions(id),
  reviewer_id uuid NOT NULL REFERENCES pilot.users(id),
  assigned_by text NOT NULL, assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning.review_decisions (
  submission_id uuid PRIMARY KEY REFERENCES learning.project_submissions(id),
  reviewer_id uuid NOT NULL REFERENCES pilot.users(id),
  decision text NOT NULL CHECK(decision IN ('approved','revision_requested')),
  rubric jsonb NOT NULL,
  quiz_score integer NOT NULL CHECK(quiz_score BETWEEN 0 AND 100),
  project_score integer NOT NULL CHECK(project_score BETWEEN 0 AND 100),
  overall_score integer NOT NULL CHECK(overall_score BETWEEN 0 AND 100),
  safety_score integer NOT NULL CHECK(safety_score BETWEEN 0 AND 100),
  safety_approved boolean NOT NULL, feedback text NOT NULL CHECK(length(feedback) BETWEEN 10 AND 3000),
  request_id uuid NOT NULL, decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id,request_id)
);
CREATE TABLE IF NOT EXISTS learning.course_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL, release_id uuid NOT NULL,
  course_id text NOT NULL, policy_version text NOT NULL,
  sequence_no integer NOT NULL CHECK(sequence_no BETWEEN 1 AND 44),
  quiz_attempt_id bigint NOT NULL UNIQUE REFERENCES learning.quiz_attempts(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES learning.review_decisions(submission_id),
  reviewer_id uuid NOT NULL REFERENCES pilot.users(id),
  quiz_score integer NOT NULL CHECK(quiz_score >= 80),
  project_score integer NOT NULL CHECK(project_score >= 70),
  overall_score integer NOT NULL CHECK(overall_score >= 70),
  safety_score integer NOT NULL CHECK(safety_score >= 70),
  request_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id,release_id,course_id),
  UNIQUE(learner_id,release_id,sequence_no), UNIQUE(learner_id,request_id),
  FOREIGN KEY(learner_id,release_id,course_id)
    REFERENCES learning.course_progress(learner_id,release_id,course_id),
  FOREIGN KEY(release_id,policy_version) REFERENCES learning.catalog_releases(id,policy_version)
);
CREATE TABLE IF NOT EXISTS learning.progress_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES pilot.users(id), release_id uuid NOT NULL,
  course_id text NOT NULL, module_id text,
  from_state learning.progress_state, to_state learning.progress_state NOT NULL,
  actor_id uuid REFERENCES pilot.users(id),
  reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 120),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(release_id,course_id) REFERENCES learning.course_content(release_id,course_id)
);
CREATE INDEX IF NOT EXISTS learning_progress_history
  ON learning.progress_events(learner_id,release_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION learning.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable learning evidence cannot be modified'; END $$;
DO $$ DECLARE name text; tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['catalog_releases','courses','course_content','modules','lessons','assessment_specs','sandbox_revisions','sandbox_runs','lesson_passes','lesson_attempts','quiz_attempts','review_decisions','course_completions','progress_events'] LOOP
    name := 'immutable_' || tab;
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON learning.%I',name,tab);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON learning.%I FOR EACH ROW EXECUTE FUNCTION learning.reject_mutation()',name,tab);
  END LOOP;
END $$;
COMMIT;
