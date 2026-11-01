import { defineRailway, github, postgres, preserve, project, service } from 'railway/iac';

// HISTORICAL ONLY: owner reports both Railway app and Postgres deleted with no known backup.
// Do NOT apply to recreate or call this a rollback. The new synthetic stage is Render +
// empty Neon; a future Railway return needs its own data/cost/identity/backup approval.
// This old plan was private/domainless, adult/internal; no minor access or public DB proxy.
// Adult/internal API is enabled only inside Railway's private network; browser sign-in
// remains closed because APP_ORIGIN has no public HTTPS host.
export default defineRailway(() => {
  const db = postgres('Postgres', { region: 'ams' });
  const app = service('desloop-academy', {
    source: github('Dennis-deve/desloop-academy', { branch: 'main', checkSuites: false }),
    build: {
      builder: 'RAILPACK',
      buildEnvironment: 'V3',
      buildCommand: 'npm run build:all',
    },
    deploy: {
      // Old automatic command now fails closed on an unapproved remote DB.
      preDeployCommand: ['npm run engine:migrate'],
      preDeployTimeoutSeconds: 600,
      startCommand: 'npm start',
      healthcheckPath: '/api/health',
      healthcheckTimeout: 120,
    },
    replicas: { ams: 1 },
    domains: [],
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      NODE_ENV: 'production',
      RAILPACK_NODE_VERSION: '22',
      APP_ORIGIN: 'https://no-public-origin.invalid',
      PILOT_OPERATOR: preserve(), // set privately in Railway before applying this plan
      PILOT_ENABLED: 'true',
      PILOT_DRAFT_ACKNOWLEDGED: 'true',
      ENGINE_V2_ENABLED: 'true',
      ENGINE_DRAFT_ACKNOWLEDGED: 'true',
      // Railway remains off; the separate synthetic Render/Neon stage needs extra config gates.
      PROJECT_CORE_ENABLED: 'false',
      CHILD_ACCOUNTS_ENABLED: 'false',
      GUARDIAN_EVIDENCE_COLLECTION_ENABLED: 'false',
      MINOR_LEARNING_ENABLED: 'false',
      // AI-01 is source-only until reviewed schema, terms, credentials, budgets and real provider tests.
      AI_GATEWAY_ENABLED: 'false',
      AI_ADMIN_UI_ENABLED: 'false',
      AI_LIVE_TESTS_APPROVED: 'false',
    },
  });
  return project('glorious-inspiration', { resources: [db, app] });
});
