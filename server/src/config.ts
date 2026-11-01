export interface PilotConfig {
  enabled: boolean;
  engineV2Enabled: boolean;
  /** Private adult storage. Remote activation requires the separate synthetic-stage gate. */
  projectCoreEnabled: boolean;
  syntheticStageGateEnabled: boolean;
  syntheticStageGateSecret: string | null;
  databaseUrl: string | null;
  appOrigin: string;
  cookieSecure: boolean;
  isProduction: boolean;
  port: number;
  host: string;
  staticDir: string;
  /** External Postgres must use TLS with verified CA and hostname (Neon: sslmode=verify-full). */
  databaseTls: boolean;
  /** Raised only for opt-in E2E on a loopback API and loopback disposable PostgreSQL. */
  localE2eAuthLimit: boolean;
  aiGatewayEnabled: boolean;
  aiAdminUiEnabled: boolean;
  aiLiveTestsApproved: boolean;
  aiTimeoutMs: number;
  aiRetries: number;
}

/** The synthetic stage targets one reviewed EU Neon region; an arbitrary remote DB is not a test DB. */
export function isApprovedNeonStageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) &&
      /^[a-z0-9-]+\.eu-central-1\.aws\.neon\.tech$/.test(url.hostname) &&
      !!url.username && !!url.password && url.pathname === '/desloop_synthetic_stage' &&
      (url.port === '' || url.port === '5432') && !url.hash &&
      url.searchParams.getAll('sslmode').length === 1 &&
      url.searchParams.get('sslmode') === 'verify-full' &&
      !url.searchParams.has('ssl') && !url.searchParams.has('sslrootcert') &&
      !url.searchParams.has('uselibpqcompat');
  } catch {
    return false;
  }
}

/** Separate, operator-invoked migration gate: never a Render build/start or local E2E reset. */
export function isApprovedProjectCoreStageMigration(env: NodeJS.ProcessEnv): boolean {
  try {
    const origin = new URL(env.APP_ORIGIN ?? '');
    const db = new URL(env.DATABASE_URL ?? '');
    return env.PROJECT_CORE_STAGE_MIGRATION_APPROVED === 'true' &&
      env.SYNTHETIC_STAGE_ACKNOWLEDGED === 'true' &&
      env.NODE_ENV === 'production' && env.DATABASE_TLS === 'verify' &&
      origin.protocol === 'https:' && origin.origin === env.APP_ORIGIN &&
      /^[a-z0-9-]+\.onrender\.com$/.test(origin.hostname) &&
      isApprovedNeonStageUrl(db.href) && !db.hostname.split('.')[0].endsWith('-pooler');
  } catch {
    return false;
  }
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
  if (env.PROJECT_CORE_ENABLED !== undefined &&
      !['true', 'false'].includes(env.PROJECT_CORE_ENABLED))
    throw new Error('PROJECT_CORE_ENABLED must be exactly true or false');
  const enabled = env.PILOT_ENABLED === 'true';
  const engineV2Enabled = env.ENGINE_V2_ENABLED === 'true';
  const projectCoreEnabled = env.PROJECT_CORE_ENABLED === 'true';
  if (env.SYNTHETIC_STAGE_GATE_ENABLED !== undefined &&
      !['true', 'false'].includes(env.SYNTHETIC_STAGE_GATE_ENABLED))
    throw new Error('SYNTHETIC_STAGE_GATE_ENABLED must be exactly true or false');
  const syntheticStageGateEnabled = env.SYNTHETIC_STAGE_GATE_ENABLED === 'true';
  const syntheticStageGateSecret = env.SYNTHETIC_STAGE_GATE_HEX_KEY ?? null;
  if (syntheticStageGateEnabled && !/^[a-f0-9]{64}$/.test(syntheticStageGateSecret ?? ''))
    throw new Error('Synthetic stage requires a new 256-bit lowercase hex key in the server environment');
  const aiGatewayEnabled = env.AI_GATEWAY_ENABLED === 'true';
  if (syntheticStageGateEnabled && aiGatewayEnabled)
    throw new Error('Synthetic Render adult staging does not approve the live AI gateway');
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
  // Railway's original adult engine remains domainless. Any *browser-reachable*
  // production adult service needs a separately enforced gate before it can start.
  if (enabled && env.NODE_ENV === 'production' &&
      (url.hostname !== 'no-public-origin.invalid' || env.RENDER === 'true') &&
      !syntheticStageGateEnabled)
    throw new Error('An external adult origin requires the reviewed synthetic access gate');
  if (syntheticStageGateEnabled) {
    const localGateTest = env.NODE_ENV === 'test' && url.hostname === '127.0.0.1';
    const renderStage = env.NODE_ENV === 'production' && env.RENDER === 'true' &&
      env.RENDER_SERVICE_TYPE === 'web' && env.RENDER_EXTERNAL_URL === origin && url.protocol === 'https:' &&
      /^[a-z0-9-]+\.onrender\.com$/.test(url.hostname) && env.HOST === '0.0.0.0' &&
      env.SYNTHETIC_STAGE_ACKNOWLEDGED === 'true';
    if (!localGateTest && !renderStage)
      throw new Error('The synthetic access gate is only for loopback tests or acknowledged Render HTTPS staging');
    if (enabled && renderStage &&
        (env.DATABASE_TLS !== 'verify' || !env.DATABASE_URL ||
          !isApprovedNeonStageUrl(env.DATABASE_URL)))
      throw new Error('An enabled synthetic adult stage requires verified TLS to the reviewed Frankfurt Neon database');
  }
  if (projectCoreEnabled) {
    if (!enabled) throw new Error('Project core requires an enabled adult pilot');
    const localProjectCore = env.PROJECT_CORE_LOCAL_ACKNOWLEDGED === 'true' &&
      ['test', 'development'].includes(env.NODE_ENV ?? '') &&
      url.hostname === '127.0.0.1' && env.HOST === '127.0.0.1' &&
      !!env.DATABASE_URL && new URL(env.DATABASE_URL).hostname === '127.0.0.1' &&
      new URL(env.DATABASE_URL).pathname.startsWith('/desloop_project_core_disposable_');
    const syntheticRenderProjectCore = syntheticStageGateEnabled &&
      env.PROJECT_CORE_STAGE_APPROVED === 'true' && env.RENDER === 'true' &&
      env.NODE_ENV === 'production' && env.DATABASE_TLS === 'verify' &&
      !!env.DATABASE_URL && isApprovedNeonStageUrl(env.DATABASE_URL);
    if (!localProjectCore && !syntheticRenderProjectCore)
      throw new Error('Project core needs a disposable loopback DB or an explicitly gated synthetic Render/Neon stage');
  }
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
    projectCoreEnabled,
    syntheticStageGateEnabled,
    syntheticStageGateSecret,
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
