-- Safeguarding design hold. This migration contains NO child identity, contact or consent evidence.
-- A future reviewed migration and privacy/safeguarding sign-off are required before collecting
-- any child information. The CHECK constraints deliberately make minor activation impossible.
BEGIN;
CREATE SCHEMA IF NOT EXISTS safeguarding;
REVOKE ALL ON SCHEMA safeguarding FROM PUBLIC;

CREATE TABLE IF NOT EXISTS safeguarding.release_gate (
  id text PRIMARY KEY DEFAULT 'minor_access' CHECK (id = 'minor_access'),
  policy_version text NOT NULL DEFAULT 'prelaunch-hold-1'
    CHECK (policy_version = 'prelaunch-hold-1'),
  child_accounts_enabled boolean NOT NULL DEFAULT false CHECK (child_accounts_enabled = false),
  child_data_collection_enabled boolean NOT NULL DEFAULT false
    CHECK (child_data_collection_enabled = false),
  minor_learning_enabled boolean NOT NULL DEFAULT false CHECK (minor_learning_enabled = false),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO safeguarding.release_gate (id) VALUES ('minor_access') ON CONFLICT DO NOTHING;

-- These are planning controls, not proof that a guardian has been verified or consent obtained.
-- Only a subsequent reviewed migration may change their allowed state or permit new tables.
CREATE TABLE IF NOT EXISTS safeguarding.required_controls (
  code text PRIMARY KEY CHECK (code IN (
    'legal_basis_and_ghana_review',
    'age_assurance',
    'guardian_authority_verification',
    'purpose_scoped_consent_and_withdrawal',
    'child_identity_minimisation',
    'safeguarding_response',
    'retention_access_and_erasure',
    'independent_security_review'
  )),
  state text NOT NULL DEFAULT 'not_ready' CHECK (state = 'not_ready'),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO safeguarding.required_controls (code) VALUES
  ('legal_basis_and_ghana_review'),
  ('age_assurance'),
  ('guardian_authority_verification'),
  ('purpose_scoped_consent_and_withdrawal'),
  ('child_identity_minimisation'),
  ('safeguarding_response'),
  ('retention_access_and_erasure'),
  ('independent_security_review')
ON CONFLICT DO NOTHING;
COMMIT;
