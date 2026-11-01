-- D22 synthetic-only Neon app role. Apply as the RESTORE/MIGRATION OWNER only
-- AFTER 001–003, 005, a verified synthetic copy and an SQL-created limited
-- LOGIN role named desloop_stage_runtime with a privately set random password.
-- No credentials, DROP, TRUNCATE, role creation or ALTER DEFAULT PRIVILEGES here.
-- This script rejects the original Railway DB and every other database name.
BEGIN;
DO $$ BEGIN
  IF current_database() NOT IN
     ('desloop_synthetic_stage', 'desloop_project_core_disposable_stage_browser') THEN
    RAISE EXCEPTION 'Stage grants refuse a non-stage or shared database';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='desloop_stage_runtime' AND rolcanlogin
                 AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolbypassrls) OR
     coalesce(pg_has_role('desloop_stage_runtime', (SELECT oid FROM pg_roles WHERE rolname='neon_superuser'), 'member'), false) THEN
    RAISE EXCEPTION 'Create a distinct limited SQL role; never run the app with the restore/admin role';
  END IF;
END $$;
DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO desloop_stage_runtime', current_database());
END $$;
GRANT USAGE ON SCHEMA pilot, learning, safeguarding, project_core TO desloop_stage_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA pilot, learning, project_core TO desloop_stage_runtime;
GRANT SELECT ON safeguarding.release_gate, safeguarding.required_controls TO desloop_stage_runtime;

-- Only the mutations used by the adult HTTP service. Operator-only invite,
-- reviewer assignment, disable, enrol and migrations use a DIFFERENT privileged
-- connection on the trusted owner machine, never Render's DATABASE_URL.
GRANT INSERT ON
  pilot.users, pilot.sessions, pilot.audit_events, pilot.lesson_attempts,
  pilot.lesson_completions, pilot.quiz_attempts, pilot.project_submissions,
  pilot.review_decisions, pilot.course_completions, pilot.unlock_events,
  learning.progress_events, learning.course_completions, learning.lesson_attempts,
  learning.lesson_passes, learning.quiz_attempts, learning.project_submissions,
  learning.review_decisions, learning.sandbox_projects, learning.sandbox_revisions,
  learning.sandbox_runs,
  project_core.projects, project_core.revisions, project_core.assets,
  project_core.revision_assets
  TO desloop_stage_runtime;
GRANT UPDATE ON
  pilot.invitations, pilot.sessions, pilot.project_submissions,
  learning.course_progress, learning.module_progress, learning.project_submissions,
  project_core.projects
  TO desloop_stage_runtime;
-- PostgreSQL SELECT ... FOR UPDATE on pilot.users requires some UPDATE privilege.
-- Limit it to non-authoritative display_name, never role/status/adult_attested_at.
GRANT UPDATE(display_name) ON pilot.users TO desloop_stage_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA pilot, learning, project_core TO desloop_stage_runtime;
-- Never grant CREATE, DELETE, TRUNCATE, DDL, safeguarding writes, admin role,
-- AI access or migration rights. A new migration requires a new privilege review.
COMMIT;
