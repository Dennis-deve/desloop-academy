-- Research-to-build slice STU-CORE-01: private adult project persistence only.
-- Additive and idempotent. NOT in Railway's automatic engine:migrate command.
-- Apply only to a disposable loopback DB until owner-approved private-stage/legal/security gates.
-- No child, school, public gallery, editor, assessment or arbitrary-code tables/permissions.
BEGIN;
CREATE SCHEMA IF NOT EXISTS project_core;
REVOKE ALL ON SCHEMA project_core FROM PUBLIC;

CREATE TABLE IF NOT EXISTS project_core.schema_versions (
  version text PRIMARY KEY CHECK (version = 'project-core-1'),
  source_sha256 char(64) NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  installed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS project_core.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES pilot.users(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120 AND octet_length(title) <= 360),
  format text NOT NULL DEFAULT 'JSON_V1' CHECK (format = 'JSON_V1'),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility = 'private'),
  latest_revision_no integer NOT NULL DEFAULT 1 CHECK (latest_revision_no BETWEEN 1 AND 50),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  UNIQUE (owner_id, request_id)
);
CREATE INDEX IF NOT EXISTS project_core_projects_owner_idx
  ON project_core.projects(owner_id, created_at DESC, id);

CREATE TABLE IF NOT EXISTS project_core.revisions (
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  revision_no integer NOT NULL CHECK (revision_no BETWEEN 1 AND 50),
  parent_revision_no integer NOT NULL CHECK (parent_revision_no BETWEEN 0 AND 49),
  format text NOT NULL DEFAULT 'JSON_V1' CHECK (format = 'JSON_V1'),
  document jsonb NOT NULL CHECK (
    jsonb_typeof(document) = 'object' AND octet_length(document::text) <= 24576
  ),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, revision_no),
  UNIQUE (project_id, owner_id, revision_no),
  UNIQUE (owner_id, request_id),
  CHECK (revision_no = parent_revision_no + 1),
  FOREIGN KEY (project_id, owner_id) REFERENCES project_core.projects(id, owner_id)
);
-- Every project has a real first revision, including during project creation.
-- Deferral is required because a new project and its initial revision are inserted together.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'project_core.projects'::regclass
      AND conname = 'project_core_latest_revision_fk'
  ) THEN
    ALTER TABLE project_core.projects
      ADD CONSTRAINT project_core_latest_revision_fk
      FOREIGN KEY (id, latest_revision_no)
      REFERENCES project_core.revisions(project_id, revision_no)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- PNG-only, fully decoded and re-encoded by the server before insertion. No HTML/SVG,
-- executable, metadata-bearing original, hosted URL or user-chosen media type is served.
CREATE TABLE IF NOT EXISTS project_core.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  media_type text NOT NULL DEFAULT 'image/png' CHECK (media_type = 'image/png'),
  content bytea NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 131072),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  source_sha256 char(64) NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 1024),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 1024),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id, owner_id),
  UNIQUE (owner_id, request_id),
  CHECK ((width::bigint * height::bigint) <= 1048576),
  FOREIGN KEY (project_id, owner_id) REFERENCES project_core.projects(id, owner_id)
);
CREATE INDEX IF NOT EXISTS project_core_assets_owner_idx
  ON project_core.assets(project_id, owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_core.revision_assets (
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  revision_no integer NOT NULL,
  asset_id uuid NOT NULL,
  PRIMARY KEY (project_id, revision_no, asset_id),
  FOREIGN KEY (project_id, owner_id, revision_no)
    REFERENCES project_core.revisions(project_id, owner_id, revision_no),
  FOREIGN KEY (asset_id, project_id, owner_id)
    REFERENCES project_core.assets(id, project_id, owner_id)
);

-- API routes never change ownership or immutable evidence. Only advancing the
-- latest revision pointer and its timestamp is allowed on the project row.
-- The DB owner can still disable a trigger: a restricted runtime role and a
-- separately controlled migration role are future deployment gates.
CREATE OR REPLACE FUNCTION project_core.guard_project_state()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Private project ownership/state cannot be deleted';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.title IS DISTINCT FROM OLD.title OR NEW.format IS DISTINCT FROM OLD.format
      OR NEW.visibility IS DISTINCT FROM OLD.visibility
      OR NEW.request_id IS DISTINCT FROM OLD.request_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.latest_revision_no <> OLD.latest_revision_no + 1
      OR NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'Private project ownership/state cannot be reassigned or rewound';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guarded_project_state ON project_core.projects;
CREATE TRIGGER guarded_project_state BEFORE UPDATE OR DELETE ON project_core.projects
  FOR EACH ROW EXECUTE FUNCTION project_core.guard_project_state();

CREATE OR REPLACE FUNCTION project_core.reject_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable project evidence cannot be updated or deleted'; END $$;
DO $$ DECLARE tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['revisions','assets','revision_assets'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS immutable_%I ON project_core.%I', tab, tab);
    EXECUTE format(
      'CREATE TRIGGER immutable_%I BEFORE UPDATE OR DELETE ON project_core.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION project_core.reject_evidence_mutation()',
      tab, tab
    );
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA project_core FROM PUBLIC;
COMMIT;
