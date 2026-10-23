import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z, type ZodType } from 'zod';
import type { PilotConfig } from '../config.js';
import type { Database } from '../db.js';
import { ApiError, requireMutation, requireUser } from '../security.js';
import { AIGateway, type AIProviders } from './gateway.js';
import { createAIProviders, modelIdSchema, providerIdSchema, taskSchema } from './providers.js';
import {
  approveTerms,
  createModel,
  dashboard,
  getModel,
  getSettings,
  pendingDrafts,
  requireAIAdmin,
  reviewReusable,
  setProviderLimits,
  setRoute,
  setSettings,
  toggleModel,
} from './store.js';

const uuid = z.string().uuid();
const safeNumber = (max: number) => z.number().int().nonnegative().max(max);
const createModelBody = z
  .object({
    provider: providerIdSchema,
    modelId: modelIdSchema,
    allowedTasks: z.array(taskSchema).min(1).max(7),
    maxContextTokens: z.number().int().min(1024).max(1_000_000),
    maxOutputTokens: z.number().int().min(64).max(32_768),
    inputPriceMicrousdPerMillion: safeNumber(100_000_000_000),
    outputPriceMicrousdPerMillion: safeNumber(100_000_000_000),
    evidenceUrl: z.string().url().max(500),
  })
  .strict();
const modelParams = z.object({ id: uuid });
const settingsBody = z
  .object({
    dailyBudgetMicrousd: safeNumber(1_000_000_000),
    userDailyRequests: safeNumber(1000),
    userDailyTokens: safeNumber(1_000_000),
    maxOutputTokens: z.number().int().min(64).max(1024),
  })
  .strict();
const providerLimitsBody = z
  .object({
    dailyRequests: safeNumber(100_000),
    dailyTokens: safeNumber(100_000_000),
    dailyBudgetMicrousd: safeNumber(1_000_000_000),
  })
  .strict();
const routeBody = z.object({ primaryModel: uuid, fallbackModel: uuid.nullable() }).strict();
const draftBody = z
  .object({
    task: taskSchema,
    input: z.string().min(12).max(2400),
    requestId: uuid,
    source: z.literal('synthetic-reviewer-material'),
  })
  .strict();
function parse<T>(schema: ZodType<T>, input: unknown): T {
  const validated = schema.safeParse(input);
  if (!validated.success)
    throw new ApiError(422, 'AI_INVALID_INPUT', 'The AI request contains invalid fields.');
  return validated.data;
}
async function safe<T>(call: () => Promise<T>) {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Postgres or vendor errors can contain data. Never forward or log their raw messages.
    throw new ApiError(
      503,
      'AI_UNAVAILABLE',
      'The private AI operation could not be confirmed. Check its status before retrying.',
    );
  }
}

/** API routes are registered only when the private adult gateway is explicitly enabled. */
export async function registerAIRoutes(
  app: FastifyInstance,
  db: Database,
  config: PilotConfig,
  options: { providers?: AIProviders; cacheSecret?: string } = {},
) {
  await getSettings(db); // Fail startup closed if an operator has not reviewed/applied migration 004.
  const providers = options.providers ?? createAIProviders();
  const cacheSecret = options.cacheSecret ?? process.env.AI_CACHE_HMAC_KEY;
  const gateway = new AIGateway(db, providers, {
    timeoutMs: config.aiTimeoutMs,
    retries: config.aiRetries,
    liveTestsApproved: config.aiLiveTestsApproved,
    cacheSecret,
  });
  async function administrator(request: FastifyRequest, mutation: boolean) {
    if (!config.aiAdminUiEnabled)
      throw new ApiError(404, 'NOT_FOUND', 'AI provider administration is unavailable.');
    const auth = mutation
      ? await requireMutation(request, db, config, 'reviewer')
      : await requireUser(request, db, config, 'reviewer');
    await requireAIAdmin(db, auth.user.id);
    return auth.user.id;
  }
  app.get('/api/pilot/ai/admin/access', async (request) =>
    safe(async () => {
      await administrator(request, false);
      return { allowed: true, audience: 'private_adult_reviewer', productionReady: false };
    }),
  );
  app.get('/api/pilot/ai/admin', async (request) =>
    safe(async () => {
      await administrator(request, false);
      const board = await dashboard(db);
      return {
        ...board,
        models: board.models.map(({ verification_fingerprint, ...model }) => ({
          ...model,
          verifiedForCurrentConfig: Boolean(
            verification_fingerprint &&
            verification_fingerprint === providers[model.provider].fingerprint &&
            model.verified_at &&
            Date.now() - new Date(model.verified_at).getTime() < 30 * 86_400_000,
          ),
        })),
        credentialPresence: Object.fromEntries(
          Object.entries(providers).map(([id, adapter]) => [id, adapter.configured]),
        ),
        scope: 'synthetic_dev_only',
        productionReady: false,
      };
    }),
  );
  app.get('/api/pilot/ai/admin/drafts', async (request) =>
    safe(async () => {
      await administrator(request, false);
      return { drafts: await pendingDrafts(db) };
    }),
  );
  app.post('/api/pilot/ai/admin/settings', async (request) =>
    safe(async () => {
      const actor = await administrator(request, true);
      await setSettings(db, actor, parse(settingsBody, request.body));
      return { saved: true, scope: 'private_synthetic_only' };
    }),
  );
  app.post('/api/pilot/ai/admin/providers/:provider/limits', async (request) =>
    safe(async () => {
      const actor = await administrator(request, true);
      const { provider } = parse(z.object({ provider: providerIdSchema }), request.params);
      await setProviderLimits(db, actor, provider, parse(providerLimitsBody, request.body));
      return { saved: true, provider };
    }),
  );
  app.post('/api/pilot/ai/admin/models', async (request, reply) =>
    safe(async () => {
      const actor = await administrator(request, true);
      const id = await createModel(db, actor, parse(createModelBody, request.body));
      return reply.code(201).send({ id, enabled: false, verified: false });
    }),
  );
  app.post('/api/pilot/ai/admin/models/:id/terms', async (request) =>
    safe(async () => {
      const actor = await administrator(request, true);
      const { id } = parse(modelParams, request.params);
      const body = parse(
        z
          .object({
            acknowledged: z.literal(true),
            decisionReference: z.string().trim().min(8).max(250),
          })
          .strict(),
        request.body,
      );
      await approveTerms(db, actor, id, body.decisionReference);
      return { recorded: true, verified: false, enabled: false, productionReady: false };
    }),
  );
  app.post(
    '/api/pilot/ai/admin/models/:id/verify',
    {
      config: { rateLimit: { max: 2, timeWindow: '1 minute' } },
    },
    async (request) =>
      safe(async () => {
        const actor = await administrator(request, true);
        const { id } = parse(modelParams, request.params);
        parse(z.object({ acknowledgeLiveCharge: z.literal(true) }).strict(), request.body);
        return gateway.verifyRealModel(actor, id);
      }),
  );
  app.post('/api/pilot/ai/admin/models/:id/toggle', async (request) =>
    safe(async () => {
      const actor = await administrator(request, true);
      const { id } = parse(modelParams, request.params);
      const { enabled } = parse(z.object({ enabled: z.boolean() }).strict(), request.body);
      const model = await getModel(db, id);
      await toggleModel(db, actor, id, enabled, providers[model.provider].fingerprint);
      return { enabled, productionReady: false };
    }),
  );
  app.post('/api/pilot/ai/admin/routes/:task', async (request) =>
    safe(async () => {
      const actor = await administrator(request, true);
      const { task } = parse(z.object({ task: taskSchema }), request.params);
      const body = parse(routeBody, request.body);
      await setRoute(db, actor, task, body.primaryModel, body.fallbackModel);
      return { saved: true, task };
    }),
  );
  app.post('/api/pilot/ai/admin/drafts/:id/reuse', async (request) =>
    safe(async () => {
      const actor = await administrator(request, true);
      const { id } = parse(modelParams, request.params);
      parse(z.object({ acknowledged: z.literal(true) }).strict(), request.body);
      await reviewReusable(db, actor, id, cacheSecret ?? '');
      return { reviewedForReuse: true, published: false, officialCredit: false };
    }),
  );
  app.post(
    '/api/pilot/ai/drafts',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request) =>
      safe(async () => {
        const auth = await requireMutation(request, db, config, 'reviewer');
        await requireAIAdmin(db, auth.user.id); // No ungranted reviewer may consume credits or contact a vendor.
        const body = parse(draftBody, request.body);
        return gateway.generateDraft(auth.user.id, body.requestId, body.task, body.input);
      }),
  );
}
