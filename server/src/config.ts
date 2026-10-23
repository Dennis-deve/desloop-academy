export interface PilotConfig {
  enabled: boolean;
  engineV2Enabled: boolean;
  databaseUrl: string | null;
  appOrigin: string;
  cookieSecure: boolean;
  isProduction: boolean;
  port: number;
  host: string;
  staticDir: string;
  /** Railway's private PostgreSQL connection is internal; external DB TLS needs a verified CA. */
  databaseTls: boolean;
  /** Raised only for opt-in E2E on a loopback API and loopback disposable PostgreSQL. */
  localE2eAuthLimit: boolean;
  aiGatewayEnabled: boolean;
  aiAdminUiEnabled: boolean;
  aiLiveTestsApproved: boolean;
  aiTimeoutMs: number;
  aiRetries: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PilotConfig {
  // No runtime switch may activate a child account, collect guardian evidence or grant minor
  // learning access. These require a new reviewed policy, migration and safety implementation.
  for (const key of [
    'CHILD_ACCOUNTS_ENABLED',
    'GUARDIAN_EVIDENCE_COLLECTION_ENABLED',
    'MINOR_LEARNING_ENABLED',
  ]) {
    if (env[key] !== undefined && env[key] !== 'false')
      throw new Error(`${key} is not supported; minor accounts and evidence capture are disabled`);
  }
  const enabled = env.PILOT_ENABLED === 'true';
  const engineV2Enabled = env.ENGINE_V2_ENABLED === 'true';
  const aiGatewayEnabled = env.AI_GATEWAY_ENABLED === 'true';
  const aiAdminUiEnabled = env.AI_ADMIN_UI_ENABLED === 'true';
  const aiLiveTestsApproved = env.AI_LIVE_TESTS_APPROVED === 'true';
  if (aiGatewayEnabled && !enabled) throw new Error('AI gateway requires the private adult pilot');
  if ((aiAdminUiEnabled || aiLiveTestsApproved) && !aiGatewayEnabled)
    throw new Error('AI administration and live verification require AI_GATEWAY_ENABLED=true');
  const aiTimeoutMs = Number(env.AI_TIMEOUT_MS ?? '8000');
  const aiRetries = Number(env.AI_RETRIES ?? '1');
  if (!Number.isInteger(aiTimeoutMs) || aiTimeoutMs < 1000 || aiTimeoutMs > 30000 ||
      !Number.isInteger(aiRetries) || aiRetries < 0 || aiRetries > 2)
    throw new Error('AI_TIMEOUT_MS must be 1000–30000 and AI_RETRIES must be 0–2');
  if (engineV2Enabled && (!enabled || env.ENGINE_DRAFT_ACKNOWLEDGED !== 'true'))
    throw new Error(
      'Engine v2 requires the enabled adult pilot and explicit ENGINE_DRAFT_ACKNOWLEDGED=true',
    );
  const origin = env.APP_ORIGIN ?? 'http://127.0.0.1:5173';
  const url = new URL(origin);
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
    throw new Error('APP_ORIGIN must be one exact HTTP(S) origin');
  if (enabled && (!env.DATABASE_URL || env.PILOT_DRAFT_ACKNOWLEDGED !== 'true'))
    throw new Error('Adult pilot requires DATABASE_URL and explicit PILOT_DRAFT_ACKNOWLEDGED=true');
  if (enabled && env.NODE_ENV === 'production' && url.protocol !== 'https:')
    throw new Error('A production adult pilot requires an HTTPS APP_ORIGIN');
  const localE2eAuthLimit =
    env.NODE_ENV === 'test' &&
    env.PILOT_LOCAL_E2E_AUTH_LIMIT === 'true' &&
    url.hostname === '127.0.0.1' &&
    !!env.DATABASE_URL &&
    new URL(env.DATABASE_URL).hostname === '127.0.0.1';
  if (env.PILOT_LOCAL_E2E_AUTH_LIMIT === 'true' && !localE2eAuthLimit)
    throw new Error(
      'E2E auth limit requires NODE_ENV=test and both origin and database on 127.0.0.1',
    );
  return {
    enabled,
    engineV2Enabled,
    databaseUrl: env.DATABASE_URL ?? null,
    appOrigin: origin,
    cookieSecure: url.protocol === 'https:',
    isProduction: env.NODE_ENV === 'production',
    port: Number(env.PORT || 4000),
    host: env.HOST || '0.0.0.0',
    staticDir: env.STATIC_DIR || 'dist',
    databaseTls: env.DATABASE_TLS === 'verify',
    localE2eAuthLimit,
    aiGatewayEnabled,
    aiAdminUiEnabled,
    aiLiveTestsApproved,
    aiTimeoutMs,
    aiRetries,
  };
}
