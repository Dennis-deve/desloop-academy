import { defineRailway, github, postgres, preserve, project, service } from 'railway/iac';

// Private, domainless adult/internal draft. No minor access and no public database proxy.
// Apply with railway config plan / apply after linking to the owner-approved project.
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
      // Local-only project persistence research; even an accidental remote toggle is rejected by config.
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
