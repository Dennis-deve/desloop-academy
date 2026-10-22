-- Invite-only ADULT INTERNAL rehearsal. This schema is not a child enrolment or an accredited transcript.
-- Run with npm run pilot:migrate against a dedicated Railway PostgreSQL database before enabling the API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS pilot;
REVOKE ALL ON SCHEMA pilot FROM PUBLIC;

CREATE TABLE IF NOT EXISTS pilot.content_versions (
  version text PRIMARY KEY,
  sha256 char(64) NOT NULL,
  policy_version text NOT NULL,
  status text NOT NULL DEFAULT 'internal_draft' CHECK (status = 'internal_draft'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pilot.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 120),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('learner', 'reviewer')),
  adult_attested_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pilot.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(email)),
  role text NOT NULL CHECK (role IN ('learner', 'reviewer')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pilot_invitations_email_idx ON pilot.invitations(email);
CREATE TABLE IF NOT EXISTS pilot.sessions (
  token_hash char(64) PRIMARY KEY,
  csrf_hash char(64) NOT NULL,
  user_id uuid NOT NULL REFERENCES pilot.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pilot_sessions_user_idx ON pilot.sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS pilot.lesson_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  course_id text NOT NULL,
  version text NOT NULL REFERENCES pilot.content_versions(version),
  lesson_id text NOT NULL,
  practice text NOT NULL CHECK (length(practice) <= 5000),
  response_mode text NOT NULL CHECK (response_mode IN ('typed','dictated-or-described')),
  answer_index integer NOT NULL,
  correct boolean NOT NULL,
  safety_passed boolean NOT NULL,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, request_id)
);
CREATE INDEX IF NOT EXISTS pilot_lesson_attempts_lookup ON pilot.lesson_attempts(learner_id, course_id, version, lesson_id);
CREATE TABLE IF NOT EXISTS pilot.lesson_completions (
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  course_id text NOT NULL,
  version text NOT NULL REFERENCES pilot.content_versions(version),
  lesson_id text NOT NULL,
  attempt_id bigint NOT NULL UNIQUE REFERENCES pilot.lesson_attempts(id),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, course_id, version, lesson_id)
);
CREATE TABLE IF NOT EXISTS pilot.quiz_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  course_id text NOT NULL,
  version text NOT NULL REFERENCES pilot.content_versions(version),
  answers jsonb NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  critical_passed boolean NOT NULL,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, request_id)
);
CREATE INDEX IF NOT EXISTS pilot_quiz_attempts_lookup ON pilot.quiz_attempts(learner_id, course_id, version, id DESC);

CREATE TABLE IF NOT EXISTS pilot.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  course_id text NOT NULL,
  version text NOT NULL REFERENCES pilot.content_versions(version),
  iteration integer NOT NULL CHECK (iteration > 0),
  artefact text NOT NULL CHECK (length(artefact) BETWEEN 40 AND 5000),
  reflection text NOT NULL CHECK (length(reflection) BETWEEN 20 AND 5000),
  response_mode text NOT NULL CHECK (response_mode IN ('typed','dictated-or-described')),
  safety_attested boolean NOT NULL CHECK (safety_attested),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','revision_requested','approved')),
  request_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, course_id, version, iteration),
  UNIQUE (learner_id, request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS pilot_one_submitted_per_course ON pilot.project_submissions(learner_id, course_id, version) WHERE status = 'submitted';
CREATE INDEX IF NOT EXISTS pilot_submissions_history ON pilot.project_submissions(learner_id, course_id, version, iteration DESC);
CREATE TABLE IF NOT EXISTS pilot.review_assignments (
  submission_id uuid PRIMARY KEY REFERENCES pilot.project_submissions(id),
  reviewer_id uuid NOT NULL REFERENCES pilot.users(id),
  assigned_by text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pilot_review_queue ON pilot.review_assignments(reviewer_id, assigned_at DESC);
CREATE TABLE IF NOT EXISTS pilot.review_decisions (
  submission_id uuid PRIMARY KEY REFERENCES pilot.project_submissions(id),
  reviewer_id uuid NOT NULL REFERENCES pilot.users(id),
  decision text NOT NULL CHECK (decision IN ('approved','revision_requested')),
  rubric jsonb NOT NULL,
  project_score integer NOT NULL CHECK (project_score BETWEEN 0 AND 100),
  overall_score integer NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  safety_approved boolean NOT NULL,
  feedback text NOT NULL CHECK (length(feedback) BETWEEN 10 AND 3000),
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pilot.course_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  course_id text NOT NULL,
  version text NOT NULL REFERENCES pilot.content_versions(version),
  policy_version text NOT NULL,
  sequence_number integer NOT NULL CHECK (sequence_number BETWEEN 1 AND 44),
  quiz_attempt_id bigint NOT NULL UNIQUE REFERENCES pilot.quiz_attempts(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES pilot.project_submissions(id),
  reviewer_id uuid NOT NULL REFERENCES pilot.users(id),
  quiz_score integer NOT NULL CHECK (quiz_score >= 80),
  project_score integer NOT NULL CHECK (project_score >= 70),
  overall_score integer NOT NULL CHECK (overall_score >= 70),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, course_id, version)
);
CREATE INDEX IF NOT EXISTS pilot_completions_prefix ON pilot.course_completions(learner_id, sequence_number);
CREATE TABLE IF NOT EXISTS pilot.unlock_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES pilot.users(id),
  unlocked_course_id text NOT NULL,
  version text NOT NULL REFERENCES pilot.content_versions(version),
  from_completion_id uuid NOT NULL UNIQUE REFERENCES pilot.course_completions(id),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pilot.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES pilot.users(id),
  action text NOT NULL CHECK (length(action) <= 100),
  subject_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
-- The app does not expose audit modification endpoints; also reject casual SQL UPDATE/DELETE.
CREATE OR REPLACE FUNCTION pilot.block_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append only'; END; $$;
DROP TRIGGER IF EXISTS pilot_audit_append_only ON pilot.audit_events;
CREATE TRIGGER pilot_audit_append_only BEFORE UPDATE OR DELETE ON pilot.audit_events
  FOR EACH ROW EXECUTE FUNCTION pilot.block_audit_mutation();
COMMIT;
