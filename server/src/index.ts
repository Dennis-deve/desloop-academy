import { buildApi } from './api.js';
import { loadCatalog } from './catalog.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';

const config = loadConfig();
const catalog = loadCatalog();
const database = config.enabled ? createDatabase(config) : undefined;
const app = await buildApi(config, database, catalog, true);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await app.close();
  await database?.end();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ err: error }, 'Pilot API could not start');
  await shutdown();
  process.exitCode = 1;
}
