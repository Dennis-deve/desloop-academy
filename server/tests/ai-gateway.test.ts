import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApi } from '../src/api.js';
import { loadCatalog } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';
import { createDatabase, migrate } from '../src/db.js';
import { migrateGuardianGroundwork } from '../src/guardian/readiness.js';
import { loadEngineCatalog } from '../src/engine/catalog.js';
import { migrateEngine } from '../src/engine/migrate.js';
import { grantAIAdmin, migrateAI } from '../src/ai/store.js';
import { AIProviderError, type AIProvider } from '../src/ai/providers.js';
import type { AIProviders } from '../src/ai/gateway.js';
import { hexHash } from '../src/security.js';

const url = process.env.AI_TEST_DATABASE_URL;
const origin = 'http://127.0.0.1:5173';
if (url) {
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1' || !parsed.pathname.startsWith('/desloop_ai_disposable_'))
    throw new Error(
      'AI_TEST_DATABASE_URL must be a SEPARATE disposable loopback-only database named desloop_ai_disposable_*; never point a test at Railway',
    );
}
interface Actor {
  id: string;
  email: string;
  cookies: string;
  csrf: string;
}

test(
  'PostgreSQL-backed AI-01: permission, closed defaults, real-call gate, routing, quotas, fallback and reviewed cache',
  { skip: !url, timeout: 150_000 },
  async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      PILOT_ENABLED: 'true',
      PILOT_DRAFT_ACKNOWLEDGED: 'true',
      DATABASE_URL: url,
      APP_ORIGIN: origin,
      AI_GATEWAY_ENABLED: 'true',
      AI_ADMIN_UI_ENABLED: 'true',
      AI_LIVE_TESTS_APPROVED: 'false',
      AI_TIMEOUT_MS: '2000',
      AI_RETRIES: '1',
    });
    const db = createDatabase(config);
    const catalog = loadCatalog();
    await migrate(db, catalog);
    await migrateEngine(db, loadEngineCatalog());
    await migrateGuardianGroundwork(db);
    await migrateAI(db);
    // Guarded, opt-in disposable local DB only. Never run this reset against Railway/shared data.
    await db.query(
      'TRUNCATE pilot.users,pilot.invitations,pilot.audit_events RESTART IDENTITY CASCADE',
    );
    await db.query('TRUNCATE ai.provider_usage_daily,ai.platform_usage_daily,ai.user_usage_daily');
    await migrateAI(db); // re-seed zero caps after cascading FKs to disabled synthetic users
    const providerCalls: { id: string; model: string; system: string; prompt: string }[] = [];
    let nvidiaFailure: 'none' | 'rate' | 'unsafe' | 'bad' | 'transient_once' | 'revoked' = 'none';
    let transientFailures = 0;
    let groqFailure = false;
    const provider = (id: AIProvider['id']): AIProvider => ({
      id,
      real: true,
      configured: true,
      fingerprint: hexHash(`synthetic-test-only-${id}`),
      async generate(request) {
        providerCalls.push({
          id,
          model: request.model,
          system: request.system,
          prompt: request.prompt,
        });
        if (id === 'nvidia') {
          if (nvidiaFailure === 'rate') throw new AIProviderError('rate_limited', 2000);
          if (nvidiaFailure === 'transient_once' && transientFailures++ === 0)
            throw new AIProviderError('transient');
          if (nvidiaFailure === 'bad') throw new AIProviderError('invalid_output');
          if (nvidiaFailure === 'revoked')
            await db.query(
              "UPDATE ai.models SET enabled=false WHERE provider='nvidia' AND model_id=$1",
              [request.model],
            );
          if (nvidiaFailure === 'unsafe')
            return {
              text: 'Payment confirmed; course unlocked.',
              inputTokens: 40,
              outputTokens: 10,
              returnedModel: request.model,
            };
        }
        if (id === 'groq' && groqFailure) throw new AIProviderError('transient');
        return {
          text: 'A fictional text file can be saved to preserve work for a later review.',
          inputTokens: 40,
          outputTokens: 20,
          returnedModel: request.model,
        };
      },
    });
    const providers = Object.fromEntries(
      ['gemini', 'groq', 'openrouter', 'cloudflare', 'nvidia', 'ollama'].map((id) => [
        id,
        provider(id as AIProvider['id']),
      ]),
    ) as AIProviders;
    let app = await buildApi(config, db, catalog, false, {
      providers,
      cacheSecret: 'test-only-key-not-a-real-secret'.repeat(2),
    });
    async function freshApp() {
      await app.close();
      app = await buildApi(config, db, catalog, false, {
        providers,
        cacheSecret: 'test-only-key-not-a-real-secret'.repeat(2),
      });
    }
    const sessionPassword = 'test-only-long-synthetic-reviewer-passphrase';
    async function actor(role: 'learner' | 'reviewer', label: string): Promise<Actor> {
      const email = `${label.toLowerCase().replaceAll(' ', '-')}-${randomUUID().slice(0, 8)}@example.invalid`;
      const invitation = randomUUID() + randomUUID();
      await db.query(
        "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES($1,$2,$3,now()+interval '1 day','test')",
        [email, role, hexHash(invitation)],
      );
      const result = await app.inject({
        method: 'POST',
        url: '/api/pilot/auth/register',
        headers: { origin, 'content-type': 'application/json' },
        payload: { invitation, name: label, password: sessionPassword, adultAttested: true },
      });
      assert.equal(result.statusCode, 201, result.body);
      const raw = result.headers['set-cookie'];
      const cookies = (Array.isArray(raw) ? raw : [raw!]).map((line) => line.split(';')[0]);
      const csrf = cookies.find((line) => line.startsWith('desloop_pilot_csrf='))?.split('=')[1];
      assert.ok(csrf);
      return {
        id: result.json().user.id,
        email,
        cookies: cookies.join('; '),
        csrf: decodeURIComponent(csrf),
      };
    }
    function get(path: string, user?: Actor) {
      return app.inject({
        method: 'GET',
        url: path,
        headers: user ? { cookie: user.cookies } : {},
      });
    }
    function post(
      path: string,
      user: Actor | undefined,
      body: object,
      headers: Record<string, string> = {},
    ) {
      return app.inject({
        method: 'POST',
        url: path,
        headers: {
          origin,
          'content-type': 'application/json',
          ...(user ? { cookie: user.cookies, 'x-csrf-token': user.csrf } : {}),
          ...headers,
        },
        payload: body,
      });
    }
    let admin: Actor;
    let second: Actor;
    let ordinary: Actor;
    let learner: Actor;
    try {
      admin = await actor('reviewer', 'Admin Reviewer');
      second = await actor('reviewer', 'Second Reviewer');
      ordinary = await actor('reviewer', 'Ordinary Reviewer');
      learner = await actor('learner', 'Adult Learner');
      assert.equal((await get('/api/pilot/ai/admin')).statusCode, 401);
      assert.equal((await get('/api/pilot/ai/admin', learner)).statusCode, 403);
      assert.equal((await get('/api/pilot/ai/admin', ordinary)).statusCode, 403);
      assert.equal((await post('/api/pilot/ai/admin/settings', ordinary, {})).statusCode, 403);
      await grantAIAdmin(db, admin.email, 'Disposable Test Operator');
      await grantAIAdmin(db, second.email, 'Disposable Test Operator');
      assert.equal((await get('/api/pilot/ai/admin', admin)).statusCode, 200);
      assert.equal(
        (await post('/api/pilot/ai/admin/settings', admin, {}, { 'x-csrf-token': 'wrong' }))
          .statusCode,
        403,
      );
      assert.equal(
        (
          await post(
            '/api/pilot/ai/admin/settings',
            admin,
            {},
            { origin: 'https://attacker.invalid' },
          )
        ).statusCode,
        403,
      );
      const closed = await get('/api/pilot/ai/admin', admin);
      assert.equal(closed.json().settings.user_daily_requests, 0);
      assert.deepEqual(closed.json().models, []);
      assert.equal(JSON.stringify(closed.json()).includes('dummy-api-key'), false);
      const noRoute = await post('/api/pilot/ai/drafts', admin, {
        task: 'explanation',
        input: 'Explain saving a fictional file.',
        requestId: randomUUID(),
        source: 'synthetic-reviewer-material',
      });
      assert.equal(noRoute.statusCode, 503, noRoute.body);
      assert.equal(providerCalls.length, 0);
      const settings = await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: 1_000_000,
        userDailyRequests: 10,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      assert.equal(settings.statusCode, 200, settings.body);
      for (const id of ['nvidia', 'groq'] as const) {
        const limit = await post(`/api/pilot/ai/admin/providers/${id}/limits`, admin, {
          dailyRequests: 20,
          dailyTokens: 100_000,
          dailyBudgetMicrousd: 500_000,
        });
        assert.equal(limit.statusCode, 200, limit.body);
      }
      const add = async (providerId: 'nvidia' | 'groq', modelId: string, evidenceUrl: string) => {
        const reply = await post('/api/pilot/ai/admin/models', admin, {
          provider: providerId,
          modelId,
          allowedTasks: ['explanation', 'coding_help'],
          maxContextTokens: 8192,
          maxOutputTokens: 512,
          inputPriceMicrousdPerMillion: 70_000,
          outputPriceMicrousdPerMillion: 200_000,
          evidenceUrl,
        });
        assert.equal(reply.statusCode, 201, reply.body);
        return reply.json().id as string;
      };
      const nvidiaId = await add(
        'nvidia',
        'nvidia/nemotron-3.5-lightning-30b-a3b',
        'https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-5-lightning-30b-a3b',
      );
      const groqId = await add(
        'groq',
        'openai/gpt-oss-20b',
        'https://console.groq.com/docs/models',
      );
      const unsupported = await post('/api/pilot/ai/admin/models', admin, {
        provider: 'openrouter',
        modelId: 'google/gemini-2.5-flash',
        allowedTasks: ['explanation'],
        maxContextTokens: 8192,
        maxOutputTokens: 128,
        inputPriceMicrousdPerMillion: 0,
        outputPriceMicrousdPerMillion: 0,
        evidenceUrl: 'https://openrouter.ai/docs',
      });
      assert.equal(unsupported.statusCode, 422);
      const untrustedDocs = await post('/api/pilot/ai/admin/models', admin, {
        provider: 'nvidia',
        modelId: 'nvidia/example',
        allowedTasks: ['explanation'],
        maxContextTokens: 8192,
        maxOutputTokens: 128,
        inputPriceMicrousdPerMillion: 0,
        outputPriceMicrousdPerMillion: 0,
        evidenceUrl: 'https://not-official.example/docs',
      });
      assert.equal(untrustedDocs.statusCode, 422);
      const geminiReply = await post('/api/pilot/ai/admin/models', admin, {
        provider: 'gemini',
        modelId: 'gemini-2.5-flash',
        allowedTasks: ['explanation'],
        maxContextTokens: 8192,
        maxOutputTokens: 128,
        inputPriceMicrousdPerMillion: 0,
        outputPriceMicrousdPerMillion: 0,
        evidenceUrl: 'https://ai.google.dev/gemini-api/docs/models',
      });
      assert.equal(geminiReply.statusCode, 201, geminiReply.body);
      const geminiId = geminiReply.json().id as string;
      assert.equal(
        (
          await post(`/api/pilot/ai/admin/models/${geminiId}/terms`, admin, {
            acknowledged: true,
            decisionReference: 'synthetic-terms-test',
          })
        ).statusCode,
        409,
      );
      assert.equal(
        (await post(`/api/pilot/ai/admin/models/${nvidiaId}/toggle`, admin, { enabled: true }))
          .statusCode,
        409,
      );
      assert.equal(
        (
          await post(`/api/pilot/ai/admin/models/${nvidiaId}/terms`, admin, {
            acknowledged: true,
            decisionReference: 'test-only-terms-ticket',
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (
          await post(`/api/pilot/ai/admin/models/${groqId}/terms`, admin, {
            acknowledged: true,
            decisionReference: 'test-only-groq-ticket',
          })
        ).statusCode,
        200,
      );
      const verification = await post(`/api/pilot/ai/admin/models/${nvidiaId}/verify`, admin, {
        acknowledgeLiveCharge: true,
      });
      assert.equal(verification.statusCode, 409, verification.body);
      assert.equal(
        providerCalls.length,
        0,
        'no provider call without the named live-test approval',
      );
      const planning = await post('/api/pilot/ai/admin/routes/explanation', admin, {
        primaryModel: nvidiaId,
        fallbackModel: groqId,
      });
      assert.equal(planning.statusCode, 200, planning.body);
      assert.equal(
        (
          await post('/api/pilot/ai/drafts', admin, {
            task: 'explanation',
            input: 'Explain saving a fictional file.',
            requestId: randomUUID(),
            source: 'synthetic-reviewer-material',
          })
        ).statusCode,
        503,
      );
      assert.equal(providerCalls.length, 0);
      // Disposable DB fixtures exercise routing. They are NOT real-provider verification evidence.
      await db.query(
        `UPDATE ai.models SET verified_at=now(),verified_by=$1,
        verification_fingerprint=CASE WHEN id=$2 THEN $4 ELSE $5 END WHERE id IN ($2,$3)`,
        [admin.id, nvidiaId, groqId, providers.nvidia.fingerprint, providers.groq.fingerprint],
      );
      assert.equal(
        (await post(`/api/pilot/ai/admin/models/${nvidiaId}/toggle`, admin, { enabled: true }))
          .statusCode,
        200,
      );
      assert.equal(
        (await post(`/api/pilot/ai/admin/models/${groqId}/toggle`, admin, { enabled: true }))
          .statusCode,
        200,
      );
      const unsafe = await post('/api/pilot/ai/drafts', admin, {
        task: 'explanation',
        input: 'Call jane@example.com about her child.',
        requestId: randomUUID(),
        source: 'synthetic-reviewer-material',
      });
      assert.equal(unsafe.statusCode, 422);
      assert.equal(providerCalls.length, 0);
      assert.equal(
        (
          await post('/api/pilot/ai/drafts', learner, {
            task: 'explanation',
            input: 'Explain saving a fictional file.',
            requestId: randomUUID(),
            source: 'synthetic-reviewer-material',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await post('/api/pilot/ai/drafts', ordinary, {
            task: 'explanation',
            input: 'Explain saving a fictional file.',
            requestId: randomUUID(),
            source: 'synthetic-reviewer-material',
          })
        ).statusCode,
        403,
      );
      await freshApp(); // reset the independent in-memory HTTP rate window for this test phase
      const requestId = randomUUID();
      const body = {
        task: 'explanation',
        input: 'Explain why saving a fictional text file matters.',
        requestId,
        source: 'synthetic-reviewer-material',
      };
      const generated = await post('/api/pilot/ai/drafts', admin, body);
      assert.equal(generated.statusCode, 200, generated.body);
      assert.equal(generated.json().state, 'draft');
      assert.equal(generated.json().provider, 'nvidia');
      assert.equal(providerCalls.length, 1);
      assert.equal(providerCalls[0].model, 'nvidia/nemotron-3.5-lightning-30b-a3b');
      assert.equal(providerCalls[0].prompt.includes(admin.id), false);
      assert.equal(providerCalls[0].prompt.includes(admin.email), false);
      const duplicate = await post('/api/pilot/ai/drafts', admin, body);
      assert.equal(duplicate.statusCode, 200, duplicate.body);
      assert.equal(duplicate.json().repeated, true);
      assert.equal(providerCalls.length, 1, 'idempotent recheck must not bill or call again');
      const collision = await post('/api/pilot/ai/drafts', admin, {
        ...body,
        input: 'Change the prompt while keeping the same request ID.',
      });
      assert.equal(collision.statusCode, 409);
      const counts = await db.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM learning.course_completions',
      );
      assert.equal(counts.rows[0].count, 0, 'AI drafts cannot grant progress');
      nvidiaFailure = 'rate';
      const fallback = await post('/api/pilot/ai/drafts', admin, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a second fictional text file backup.',
      });
      assert.equal(fallback.statusCode, 200, fallback.body);
      assert.equal(fallback.json().provider, 'groq');
      assert.equal(
        providerCalls.length,
        3,
        '429 on primary should only route to approved fallback',
      );
      const board = await get('/api/pilot/ai/admin', admin);
      assert.ok(board.json().userPeak.peak_requests >= 2);
      assert.equal(JSON.stringify(board.json()).includes(admin.email), false);
      assert.equal(
        board.json().usage.find((row: { provider: string }) => row.provider === 'nvidia').attempts,
        2,
      );
      assert.equal(
        board.json().usage.find((row: { provider: string }) => row.provider === 'groq').attempts,
        1,
      );
      assert.equal(
        board.json().models.find((row: { id: string }) => row.id === nvidiaId).last_status,
        'rate_limited',
      );
      assert.equal(
        board.json().models.find((row: { id: string }) => row.id === nvidiaId)
          .verifiedForCurrentConfig,
        true,
      );
      assert.equal(
        JSON.stringify(board.json()).includes(providers.nvidia.fingerprint!),
        false,
        'a credential-derived fingerprint must not be returned to the browser',
      );
      // Review is independent; learner and ordinary reviewer cannot authorise cache reuse.
      const restricted = `/api/pilot/ai/admin/drafts/${generated.json().draftId}/reuse`;
      assert.equal((await post(restricted, learner, { acknowledged: true })).statusCode, 403);
      assert.equal((await post(restricted, ordinary, { acknowledged: true })).statusCode, 403);
      const denySelf = await post(
        `/api/pilot/ai/admin/drafts/${generated.json().draftId}/reuse`,
        admin,
        { acknowledged: true },
      );
      assert.equal(denySelf.statusCode, 409);
      const approved = await post(
        `/api/pilot/ai/admin/drafts/${generated.json().draftId}/reuse`,
        second,
        { acknowledged: true },
      );
      assert.equal(approved.statusCode, 200, approved.body);
      await freshApp();
      assert.equal(approved.json().published, false);
      nvidiaFailure = 'none';
      await db.query('UPDATE ai.models SET cooldown_until=NULL WHERE id=$1', [nvidiaId]);
      const cached = await post('/api/pilot/ai/drafts', admin, {
        ...body,
        requestId: randomUUID(),
      });
      assert.equal(cached.statusCode, 200, cached.body);
      assert.equal(cached.json().cached, true);
      assert.equal(providerCalls.length, 3, 'approved generic explanation should use cache');
      await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: 0,
        userDailyRequests: 10,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      const closedCache = await post('/api/pilot/ai/drafts', admin, {
        ...body,
        requestId: randomUUID(),
      });
      assert.equal(
        closedCache.statusCode,
        429,
        'zero global budget must close even previously reviewed cache',
      );
      assert.equal(providerCalls.length, 3);
      await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: 1_000_000,
        userDailyRequests: 10,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      nvidiaFailure = 'unsafe';
      const unsafeOutput = await post('/api/pilot/ai/drafts', admin, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a third fictional text file backup.',
      });
      assert.equal(unsafeOutput.statusCode, 503, unsafeOutput.body);
      assert.equal(unsafeOutput.json().error, 'AI_SAFETY_HOLD');
      assert.equal(providerCalls.length, 4, 'safety hold must NOT fall back');
      groqFailure = true;
      nvidiaFailure = 'bad';
      const allFail = await post('/api/pilot/ai/drafts', admin, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a fourth fictional text file backup.',
      });
      assert.equal(allFail.statusCode, 503, allFail.body);
      assert.equal(allFail.json().error, 'AI_UNAVAILABLE');
      const rows = await db.query<{ state: string }>(
        'SELECT state FROM ai.requests ORDER BY created_at DESC LIMIT 1',
      );
      assert.equal(rows.rows[0].state, 'unavailable');
      // Provider quotas and global budget are enforced before ANY provider call,
      // even if a separately approved fallback exists.
      groqFailure = false;
      nvidiaFailure = 'transient_once';
      await db.query('UPDATE ai.models SET cooldown_until=NULL WHERE id=$1', [nvidiaId]);
      await freshApp();
      const beforeRetry = providerCalls.length;
      const retried = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a new fictional file after a transient connection error.',
      });
      assert.equal(retried.statusCode, 200, retried.body);
      assert.equal(retried.json().provider, 'nvidia');
      assert.equal(
        providerCalls.length,
        beforeRetry + 2,
        'one bounded retry consumes another reservation',
      );
      nvidiaFailure = 'none';
      const nvidiaUsed = (
        await db.query<{ attempts: number }>(
          "SELECT attempts FROM ai.provider_usage_daily WHERE provider='nvidia' AND day=(now() AT TIME ZONE 'UTC')::date",
        )
      ).rows[0].attempts;
      assert.equal(
        (
          await post('/api/pilot/ai/admin/providers/nvidia/limits', admin, {
            dailyRequests: nvidiaUsed,
            dailyTokens: 100_000,
            dailyBudgetMicrousd: 500_000,
          })
        ).statusCode,
        200,
      );
      const earlier = providerCalls.length;
      const cappedPrimary = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a unique synthetic file under the NVIDIA daily cap.',
      });
      assert.equal(cappedPrimary.statusCode, 200, cappedPrimary.body);
      assert.equal(cappedPrimary.json().provider, 'groq');
      assert.equal(providerCalls.length, earlier + 1);
      const groqUsed = (
        await db.query<{ attempts: number }>(
          "SELECT attempts FROM ai.provider_usage_daily WHERE provider='groq' AND day=(now() AT TIME ZONE 'UTC')::date",
        )
      ).rows[0].attempts;
      await post('/api/pilot/ai/admin/providers/groq/limits', admin, {
        dailyRequests: groqUsed,
        dailyTokens: 100_000,
        dailyBudgetMicrousd: 500_000,
      });
      const allCapped = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain another synthetic file when all provider caps are full.',
      });
      assert.equal(allCapped.statusCode, 503, allCapped.body);
      assert.equal(providerCalls.length, earlier + 1);
      await post('/api/pilot/ai/admin/providers/nvidia/limits', admin, {
        dailyRequests: 20,
        dailyTokens: 100_000,
        dailyBudgetMicrousd: 500_000,
      });
      await post('/api/pilot/ai/admin/providers/groq/limits', admin, {
        dailyRequests: 20,
        dailyTokens: 100_000,
        dailyBudgetMicrousd: 500_000,
      });
      const spent = (
        await db.query<{ estimated_cost_microusd: string }>(
          "SELECT estimated_cost_microusd FROM ai.platform_usage_daily WHERE day=(now() AT TIME ZONE 'UTC')::date",
        )
      ).rows[0].estimated_cost_microusd;
      await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: Number(spent),
        userDailyRequests: 10,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      const globalCapped = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a distinct fictional example when the global cap is reached.',
      });
      assert.equal(globalCapped.statusCode, 503, globalCapped.body);
      assert.equal(providerCalls.length, earlier + 1);
      await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: 1_000_000,
        userDailyRequests: 10,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      // Per-user quota is atomic and bounded across concurrent attempts, including fallbacks.
      const adminUsed = await db.query<{ requests: number }>(
        "SELECT requests FROM ai.user_usage_daily WHERE actor_id=$1 AND day=(now() AT TIME ZONE 'UTC')::date",
        [admin.id],
      );
      await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: 1_000_000,
        userDailyRequests: adminUsed.rows[0].requests + 1,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      await freshApp();
      const before = providerCalls.length;
      const requests = await Promise.all(
        [1, 2].map((num) =>
          post('/api/pilot/ai/drafts', admin, {
            ...body,
            requestId: randomUUID(),
            input: `Explain unique fictional file exercise number ${num}.`,
          }),
        ),
      );
      assert.deepEqual(requests.map((r) => r.statusCode).sort(), [200, 503]);
      assert.equal(
        providerCalls.length,
        before + 1,
        'atomic per-user cap must stop second provider call',
      );
      const after = await db.query<{ requests: number }>(
        "SELECT requests FROM ai.user_usage_daily WHERE actor_id=$1 AND day=(now() AT TIME ZONE 'UTC')::date",
        [admin.id],
      );
      assert.equal(after.rows[0].requests, adminUsed.rows[0].requests + 1);
      const priorNvidia = providerCalls.filter((call) => call.id === 'nvidia').length;
      providers.nvidia.fingerprint = hexHash('synthetic-rotated-key-or-changed-endpoint');
      const driftBoard = await get('/api/pilot/ai/admin', admin);
      assert.equal(
        driftBoard.json().models.find((row: { id: string }) => row.id === nvidiaId)
          .verifiedForCurrentConfig,
        false,
      );
      assert.equal(
        (await post(`/api/pilot/ai/admin/models/${nvidiaId}/toggle`, admin, { enabled: true }))
          .statusCode,
        409,
      );
      const afterRotation = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: randomUUID(),
        input: 'Explain a fictional file after a provider credential rotation.',
      });
      assert.equal(afterRotation.statusCode, 200, afterRotation.body);
      assert.equal(
        afterRotation.json().provider,
        'groq',
        'stale fingerprint cannot spend or route to prior vendor config',
      );
      assert.equal(providerCalls.filter((call) => call.id === 'nvidia').length, priorNvidia);
      // Fixture-only stand-in for a NEW successful verification; no live vendor call is implied.
      await db.query(
        'UPDATE ai.models SET verification_fingerprint=$1,verified_at=now() WHERE id=$2',
        [providers.nvidia.fingerprint, nvidiaId],
      );
      await post('/api/pilot/ai/admin/settings', admin, {
        dailyBudgetMicrousd: 1_000_000,
        userDailyRequests: 20,
        userDailyTokens: 50_000,
        maxOutputTokens: 128,
      });
      const newConfiguration = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: randomUUID(),
      });
      assert.equal(newConfiguration.statusCode, 200, newConfiguration.body);
      assert.equal(newConfiguration.json().cached, false);
      assert.equal(
        providerCalls.filter((call) => call.id === 'nvidia').length,
        priorNvidia + 1,
        'approved cache from the old credential/endpoint must not be served under a newly verified configuration',
      );
      nvidiaFailure = 'revoked';
      const revokedRequestId = randomUUID();
      const revokedDuringCall = await post('/api/pilot/ai/drafts', second, {
        ...body,
        requestId: revokedRequestId,
        input: 'Explain a fictional file after the operator disables a provider mid-call.',
      });
      assert.equal(revokedDuringCall.statusCode, 503, revokedDuringCall.body);
      assert.equal(revokedDuringCall.json().error, 'AI_CONFIG_CHANGED');
      const revokedRecord = await db.query<{ state: string; draft_id: string | null }>(
        `SELECT r.state,d.id AS draft_id FROM ai.requests r
         LEFT JOIN ai.drafts d ON d.request_id=r.id
         WHERE r.client_request_id=$1 AND r.actor_id=$2`,
        [revokedRequestId, second.id],
      );
      assert.equal(revokedRecord.rows[0].state, 'unavailable');
      assert.equal(
        revokedRecord.rows[0].draft_id,
        null,
        'a result returned after a committed disablement must never be saved as a draft',
      );
      await db.query("UPDATE pilot.users SET status='disabled' WHERE id=$1", [admin.id]);
      assert.equal(
        (await get('/api/pilot/ai/admin', admin)).statusCode,
        401,
        'disabled admin session must lose access',
      );
    } finally {
      await app.close();
      await db.end();
    }
  },
);
