-- AI-01: private adult/internal synthetic-only gateway. No AI data is a learning credit.
-- Apply only by an approved operator to a backed-up PRIVATE database after reviewing this file.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ai;
REVOKE ALL ON SCHEMA ai FROM PUBLIC;

CREATE TABLE IF NOT EXISTS ai.admin_members (
  user_id uuid PRIMARY KEY REFERENCES pilot.users(id) ON DELETE CASCADE,
  granted_by text NOT NULL CHECK (length(granted_by) BETWEEN 3 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ai.settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  daily_budget_microusd bigint NOT NULL DEFAULT 0 CHECK (daily_budget_microusd BETWEEN 0 AND 1000000000),
  user_daily_requests integer NOT NULL DEFAULT 0 CHECK (user_daily_requests BETWEEN 0 AND 1000),
  user_daily_tokens integer NOT NULL DEFAULT 0 CHECK (user_daily_tokens BETWEEN 0 AND 1000000),
  max_output_tokens integer NOT NULL DEFAULT 512 CHECK (max_output_tokens BETWEEN 64 AND 1024),
  updated_by uuid REFERENCES pilot.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ai.settings(id) VALUES(true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ai.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('gemini','groq','openrouter','cloudflare','nvidia','ollama')),
  model_id text NOT NULL CHECK (length(model_id) BETWEEN 2 AND 150),
  allowed_tasks text[] NOT NULL CHECK (cardinality(allowed_tasks) BETWEEN 1 AND 7),
  input_modality text NOT NULL DEFAULT 'text' CHECK (input_modality='text'),
  output_modality text NOT NULL DEFAULT 'text' CHECK (output_modality='text'),
  max_context_tokens integer NOT NULL CHECK (max_context_tokens BETWEEN 1024 AND 1000000),
  max_output_tokens integer NOT NULL CHECK (max_output_tokens BETWEEN 64 AND 32768),
  input_price_microusd_per_million bigint NOT NULL CHECK (input_price_microusd_per_million BETWEEN 0 AND 100000000000),
  output_price_microusd_per_million bigint NOT NULL CHECK (output_price_microusd_per_million BETWEEN 0 AND 100000000000),
  evidence_url text NOT NULL CHECK (evidence_url LIKE 'https://%' AND length(evidence_url) <= 500),
  terms_approved_at timestamptz,
  terms_approved_by uuid REFERENCES pilot.users(id),
  terms_decision_reference text CHECK (length(terms_decision_reference) BETWEEN 8 AND 250),
  verified_at timestamptz,
  verified_by uuid REFERENCES pilot.users(id),
  verification_fingerprint char(64), -- private binding to the tested credential + endpoint/upstream
  enabled boolean NOT NULL DEFAULT false,
  last_status text NOT NULL DEFAULT 'not_tested' CHECK (last_status IN ('not_tested','ok','rate_limited','transient','timeout','access_denied','invalid_output','safety_blocked','not_configured')),
  last_checked_at timestamptz,
  last_error_code text,
  cooldown_until timestamptz,
  created_by uuid NOT NULL REFERENCES pilot.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,model_id),
  CHECK (NOT enabled OR (terms_approved_at IS NOT NULL AND verified_at IS NOT NULL AND verification_fingerprint IS NOT NULL))
);
-- Supports re-running this pre-release migration on a reviewed earlier test schema;
-- existing model enablement must still be revalidated by the server and operator.
ALTER TABLE ai.models ADD COLUMN IF NOT EXISTS verification_fingerprint char(64);
CREATE TABLE IF NOT EXISTS ai.task_routes (
  task text PRIMARY KEY CHECK (task IN ('explanation','lesson_draft','coding_help','quiz_draft','feedback_draft','learning_plan_draft','translation_draft')),
  primary_model uuid NOT NULL REFERENCES ai.models(id),
  fallback_model uuid REFERENCES ai.models(id),
  updated_by uuid NOT NULL REFERENCES pilot.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fallback_model IS NULL OR fallback_model <> primary_model)
);
CREATE TABLE IF NOT EXISTS ai.provider_limits (
  provider text PRIMARY KEY CHECK (provider IN ('gemini','groq','openrouter','cloudflare','nvidia','ollama')),
  daily_requests integer NOT NULL DEFAULT 0 CHECK (daily_requests BETWEEN 0 AND 100000),
  daily_tokens integer NOT NULL DEFAULT 0 CHECK (daily_tokens BETWEEN 0 AND 100000000),
  daily_budget_microusd bigint NOT NULL DEFAULT 0 CHECK (daily_budget_microusd BETWEEN 0 AND 1000000000),
  updated_by uuid REFERENCES pilot.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ai.provider_limits(provider) VALUES
  ('gemini'),('groq'),('openrouter'),('cloudflare'),('nvidia'),('ollama')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ai.user_usage_daily (
  day date NOT NULL,
  actor_id uuid NOT NULL REFERENCES pilot.users(id),
  requests integer NOT NULL DEFAULT 0 CHECK(requests >= 0),
  reserved_tokens bigint NOT NULL DEFAULT 0 CHECK(reserved_tokens >= 0),
  PRIMARY KEY(day,actor_id)
);
CREATE TABLE IF NOT EXISTS ai.platform_usage_daily (
  day date PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  estimated_cost_microusd bigint NOT NULL DEFAULT 0 CHECK(estimated_cost_microusd >= 0)
);
CREATE TABLE IF NOT EXISTS ai.provider_usage_daily (
  day date NOT NULL,
  provider text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  reserved_tokens bigint NOT NULL DEFAULT 0 CHECK(reserved_tokens >= 0),
  estimated_cost_microusd bigint NOT NULL DEFAULT 0 CHECK(estimated_cost_microusd >= 0),
  PRIMARY KEY(day,provider)
);
CREATE TABLE IF NOT EXISTS ai.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES pilot.users(id),
  client_request_id uuid NOT NULL,
  task text NOT NULL,
  input_digest char(64) NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','draft','unavailable','verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(actor_id,client_request_id)
);
CREATE TABLE IF NOT EXISTS ai.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES ai.requests(id),
  provider text NOT NULL,
  model_id text NOT NULL,
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','validated','rate_limited','transient','timeout','access_denied','invalid_output','safety_blocked','not_configured')),
  reserved_input_tokens integer NOT NULL,
  reserved_output_tokens integer NOT NULL,
  estimated_cost_microusd bigint NOT NULL,
  measured_input_tokens integer,
  measured_output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ai_attempts_time_idx ON ai.attempts(created_at DESC);
CREATE TABLE IF NOT EXISTS ai.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE NOT NULL REFERENCES ai.requests(id),
  created_by uuid NOT NULL REFERENCES pilot.users(id),
  task text NOT NULL,
  input_text text NOT NULL CHECK (length(input_text) BETWEEN 1 AND 2500),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  provider text NOT NULL,
  model_id text NOT NULL,
  verification_fingerprint char(64) NOT NULL, -- bind reusable content to tested credential + endpoint/upstream
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','reviewed_reusable')),
  reviewed_by uuid REFERENCES pilot.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CHECK ((state='draft' AND reviewed_at IS NULL) OR (state='reviewed_reusable' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
-- Previously stored drafts remain available for review but have no tested configuration binding;
-- they cannot enter or be served from the reusable cache after this migration is reapplied.
ALTER TABLE ai.drafts ADD COLUMN IF NOT EXISTS verification_fingerprint char(64);
CREATE TABLE IF NOT EXISTS ai.reusable_cache (
  cache_key char(64) PRIMARY KEY,
  draft_id uuid NOT NULL REFERENCES ai.drafts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
COMMIT;
