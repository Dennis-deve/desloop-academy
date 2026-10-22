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
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PilotConfig {
  const enabled = env.PILOT_ENABLED === 'true';
  const engineV2Enabled = env.ENGINE_V2_ENABLED === 'true';
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
  };
}
