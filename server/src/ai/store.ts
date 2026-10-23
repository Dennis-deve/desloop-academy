import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Database, Transaction } from '../db.js';
import { appendAudit, inTransaction } from '../db.js';
import { ApiError } from '../security.js';
import {
  type AITask,
  type ProviderId,
  modelIdSchema,
  providerIdSchema,
  taskSchema,
} from './providers.js';

export interface AIModel {
  id: string;
  provider: ProviderId;
  model_id: string;
  allowed_tasks: AITask[];
  max_context_tokens: number;
  max_output_tokens: number;
  input_price_microusd_per_million: string;
  output_price_microusd_per_million: string;
  evidence_url: string;
  terms_approved_at: string | null;
  verified_at: string | null;
  verification_fingerprint: string | null;
  enabled: boolean;
  last_status: string;
  last_checked_at: string | null;
  last_error_code: string | null;
  cooldown_until: string | null;
}
export interface AISettings {
  daily_budget_microusd: string;
  user_daily_requests: number;
  user_daily_tokens: number;
  max_output_tokens: number;
}
export interface AIProviderLimits {
  provider: ProviderId;
  daily_requests: number;
  daily_tokens: number;
  daily_budget_microusd: string;
}
const officialDocs: Record<ProviderId, string[]> = {
  gemini: ['ai.google.dev'],
  groq: ['console.groq.com'],
  openrouter: ['openrouter.ai'],
  cloudflare: ['developers.cloudflare.com'],
  nvidia: ['build.nvidia.com', 'docs.api.nvidia.com'],
  ollama: ['docs.ollama.com'],
};

export async function migrateAI(db: Database) {
  await db.query(
    await readFile(resolve(process.cwd(), 'server/migrations/004_ai_gateway.sql'), 'utf8'),
  );
  const { rows } = await db.query<{ id: boolean }>('SELECT id FROM ai.settings WHERE id=true');
  if (rows.length !== 1) throw new Error('AI settings migration did not create the closed default');
}
export async function requireAIAdmin(db: Database, userId: string) {
  const { rows } = await db.query<{ user_id: string }>(
    `SELECT a.user_id FROM ai.admin_members a JOIN pilot.users u ON u.id=a.user_id
     WHERE a.user_id=$1 AND u.role='reviewer' AND u.status='active'`,
    [userId],
  );
  if (!rows[0])
    throw new ApiError(
      403,
      'AI_ADMIN_DENIED',
      'An authorised private AI administrator is required.',
    );
}
export async function grantAIAdmin(db: Database, reviewerEmail: string, operator: string) {
  await inTransaction(db, async (client) => {
    const reviewer = await client.query<{ id: string }>(
      "SELECT id FROM pilot.users WHERE email=$1 AND role='reviewer' AND status='active'",
      [reviewerEmail],
    );
    if (!reviewer.rows[0]) throw new Error('Active adult reviewer account required.');
    await client.query(
      'INSERT INTO ai.admin_members(user_id,granted_by) VALUES($1,$2) ON CONFLICT (user_id) DO NOTHING',
      [reviewer.rows[0].id, operator],
    );
    await appendAudit(client, null, 'ai.admin.granted', reviewer.rows[0].id, { operator });
  });
}
export async function getSettings(db: Database) {
  const { rows } = await db.query<AISettings>(
    'SELECT daily_budget_microusd,user_daily_requests,user_daily_tokens,max_output_tokens FROM ai.settings WHERE id=true',
  );
  if (!rows[0]) throw new ApiError(503, 'AI_CLOSED', 'AI settings are missing.');
  return rows[0];
}
export async function listModels(db: Database) {
  return (
    await db.query<AIModel>(
      `SELECT id,provider,model_id,allowed_tasks,max_context_tokens,max_output_tokens,
      input_price_microusd_per_million,output_price_microusd_per_million,evidence_url,
      terms_approved_at,verified_at,verification_fingerprint,enabled,last_status,last_checked_at,last_error_code,cooldown_until
     FROM ai.models ORDER BY provider,model_id`,
    )
  ).rows;
}
export async function getModel(db: Database, id: string) {
  const { rows } = await db.query<AIModel>(
    `SELECT id,provider,model_id,allowed_tasks,max_context_tokens,max_output_tokens,
      input_price_microusd_per_million,output_price_microusd_per_million,evidence_url,
      terms_approved_at,verified_at,verification_fingerprint,enabled,last_status,last_checked_at,last_error_code,cooldown_until
     FROM ai.models WHERE id=$1`,
    [id],
  );
  if (!rows[0]) throw new ApiError(404, 'AI_MODEL_NOT_FOUND', 'Model not found.');
  return rows[0];
}
export async function createModel(
  db: Database,
  actor: string,
  input: {
    provider: ProviderId;
    modelId: string;
    allowedTasks: AITask[];
    maxContextTokens: number;
    maxOutputTokens: number;
    inputPriceMicrousdPerMillion: number;
    outputPriceMicrousdPerMillion: number;
    evidenceUrl: string;
  },
) {
  const provider = providerIdSchema.parse(input.provider);
  const model = modelIdSchema.parse(input.modelId);
  if (
    provider === 'openrouter' &&
    /gemini|^google[-/]|^openrouter\/|:(?:free|nitro|floor)$/i.test(model)
  )
    throw new ApiError(
      422,
      'AI_PROVIDER_POLICY_DENIED',
      'A documented fixed non-Gemini model is required; no random/free/nitro router variants.',
    );
  if (provider === 'ollama' && /:cloud\b/i.test(model))
    throw new ApiError(422, 'AI_PROVIDER_POLICY_DENIED', 'Only local Ollama models are allowed.');
  if (provider === 'cloudflare' && !model.startsWith('@cf/'))
    throw new ApiError(422, 'AI_MODEL_UNSUPPORTED', 'Use a documented Workers AI model ID.');
  if (
    new Set(input.allowedTasks).size !== input.allowedTasks.length ||
    !input.allowedTasks.length ||
    input.allowedTasks.some((t) => !taskSchema.safeParse(t).success)
  )
    throw new ApiError(422, 'AI_MODEL_UNSUPPORTED', 'Use unique, approved text tasks only.');
  const url = new URL(input.evidenceUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !officialDocs[provider].includes(url.hostname)
  )
    throw new ApiError(
      422,
      'AI_DOCS_REQUIRED',
      'Link the official model capability documentation.',
    );
  return inTransaction(db, async (client) => {
    const created = await client.query<{ id: string }>(
      `INSERT INTO ai.models(provider,model_id,allowed_tasks,max_context_tokens,max_output_tokens,
        input_price_microusd_per_million,output_price_microusd_per_million,evidence_url,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        provider,
        model,
        input.allowedTasks,
        input.maxContextTokens,
        input.maxOutputTokens,
        input.inputPriceMicrousdPerMillion,
        input.outputPriceMicrousdPerMillion,
        url.href,
        actor,
      ],
    );
    await appendAudit(client, actor, 'ai.model.created_disabled', created.rows[0].id, {
      provider,
      model,
    });
    return created.rows[0].id;
  });
}
export async function approveTerms(
  db: Database,
  actor: string,
  id: string,
  decisionReference: string,
) {
  const model = await getModel(db, id);
  if (model.provider === 'gemini')
    throw new ApiError(
      409,
      'AI_PROVIDER_POLICY_DENIED',
      'Gemini API client age restrictions require a separately reviewed platform decision and code change.',
    );
  await inTransaction(db, async (client) => {
    await client.query(
      `UPDATE ai.models SET terms_approved_at=now(),terms_approved_by=$1,
      terms_decision_reference=$2,verified_at=NULL,verification_fingerprint=NULL,
      enabled=false,last_status='not_tested' WHERE id=$3`,
      [actor, decisionReference.trim(), id],
    );
    await appendAudit(client, actor, 'ai.model.terms_recorded_reset', id, {
      decisionReference: decisionReference.trim(),
    });
  });
}
export async function markModelVerified(
  db: Database,
  actor: string,
  id: string,
  fingerprint: string,
  termsApprovedAt: string,
) {
  if (!/^[0-9a-f]{64}$/.test(fingerprint))
    throw new Error('Provider verification fingerprint unavailable');
  await inTransaction(db, async (client) => {
    const changed = await client.query(
      `UPDATE ai.models SET verified_at=now(),verified_by=$1,verification_fingerprint=$3,
      last_status='ok',last_checked_at=now(),last_error_code=NULL,cooldown_until=NULL
      WHERE id=$2 AND terms_approved_at=$4::timestamptz`,
      [actor, id, fingerprint, termsApprovedAt],
    );
    if (changed.rowCount !== 1)
      throw new ApiError(
        409,
        'AI_MODEL_NOT_READY',
        'Terms changed during verification; no verified status was recorded.',
      );
    await appendAudit(client, actor, 'ai.model.real_api_verified', id, {
      scope: 'synthetic_dev_only',
    });
  });
}
export async function toggleModel(
  db: Database,
  actor: string,
  id: string,
  enabled: boolean,
  fingerprint: string | null,
) {
  const model = await getModel(db, id);
  if (
    enabled &&
    (model.provider === 'gemini' ||
      !fingerprint ||
      model.verification_fingerprint !== fingerprint ||
      !model.terms_approved_at ||
      !model.verified_at ||
      Date.now() - new Date(model.verified_at).getTime() > 30 * 86_400_000)
  )
    throw new ApiError(
      409,
      'AI_MODEL_NOT_READY',
      'Current provider credential/endpoint, terms review and recent real API verification are required.',
    );
  await inTransaction(db, async (client) => {
    const changed = enabled
      ? await client.query(
          `UPDATE ai.models SET enabled=true WHERE id=$1 AND provider<>'gemini'
           AND terms_approved_at IS NOT NULL AND verified_at>now()-interval '30 days'
           AND verification_fingerprint=$2`,
          [id, fingerprint],
        )
      : await client.query('UPDATE ai.models SET enabled=false WHERE id=$1', [id]);
    if (changed.rowCount !== 1)
      throw new ApiError(409, 'AI_MODEL_NOT_READY', 'The verified configuration changed.');
    await appendAudit(
      client,
      actor,
      enabled ? 'ai.model.enabled_private' : 'ai.model.disabled',
      id,
    );
  });
}
export async function setRoute(
  db: Database,
  actor: string,
  task: AITask,
  primary: string,
  fallback: string | null,
) {
  if (primary === fallback)
    throw new ApiError(422, 'AI_INVALID_ROUTE', 'Choose a different fallback.');
  const first = await getModel(db, primary);
  const second = fallback ? await getModel(db, fallback) : null;
  if (!first.allowed_tasks.includes(task) || (second && !second.allowed_tasks.includes(task)))
    throw new ApiError(
      422,
      'AI_TASK_UNSUPPORTED',
      'Both models must have documented support for the selected text task.',
    );
  await inTransaction(db, async (client) => {
    await client.query(
      `INSERT INTO ai.task_routes(task,primary_model,fallback_model,updated_by) VALUES($1,$2,$3,$4)
      ON CONFLICT(task) DO UPDATE SET primary_model=EXCLUDED.primary_model,fallback_model=EXCLUDED.fallback_model,
      updated_by=EXCLUDED.updated_by,updated_at=now()`,
      [task, primary, fallback, actor],
    );
    await appendAudit(client, actor, 'ai.route.updated', task, { primary, fallback });
  });
}
export async function getRoute(db: Database, task: AITask) {
  const { rows } = await db.query<{ primary_model: string; fallback_model: string | null }>(
    'SELECT primary_model,fallback_model FROM ai.task_routes WHERE task=$1',
    [task],
  );
  return rows[0] ?? null;
}
export async function dashboard(db: Database) {
  const [settings, models, routes, limits, usage, platform, recent, userPeak] = await Promise.all([
    getSettings(db),
    listModels(db),
    db.query('SELECT task,primary_model,fallback_model FROM ai.task_routes ORDER BY task'),
    db.query<AIProviderLimits>(
      'SELECT provider,daily_requests,daily_tokens,daily_budget_microusd FROM ai.provider_limits ORDER BY provider',
    ),
    db.query(`SELECT provider,attempts,reserved_tokens,estimated_cost_microusd FROM ai.provider_usage_daily
      WHERE day=(now() AT TIME ZONE 'UTC')::date ORDER BY provider`),
    db.query(`SELECT attempts,estimated_cost_microusd FROM ai.platform_usage_daily
      WHERE day=(now() AT TIME ZONE 'UTC')::date`),
    db.query(
      `SELECT provider,model_id,state,created_at FROM ai.attempts ORDER BY created_at DESC LIMIT 12`,
    ),
    db.query<{ peak_requests: number; peak_tokens: string }>(
      `SELECT COALESCE(MAX(requests),0)::int AS peak_requests,
        COALESCE(MAX(reserved_tokens),0)::text AS peak_tokens
       FROM ai.user_usage_daily WHERE day=(now() AT TIME ZONE 'UTC')::date`,
    ),
  ]);
  return {
    settings,
    models,
    routes: routes.rows,
    limits: limits.rows,
    usage: usage.rows,
    platform: platform.rows[0] ?? { attempts: 0, estimated_cost_microusd: '0' },
    userPeak: userPeak.rows[0] ?? { peak_requests: 0, peak_tokens: '0' },
    recent: recent.rows,
  };
}
export async function setSettings(
  db: Database,
  actor: string,
  input: {
    dailyBudgetMicrousd: number;
    userDailyRequests: number;
    userDailyTokens: number;
    maxOutputTokens: number;
  },
) {
  await inTransaction(db, async (client) => {
    await client.query(
      `UPDATE ai.settings SET daily_budget_microusd=$1,user_daily_requests=$2,
      user_daily_tokens=$3,max_output_tokens=$4,updated_by=$5,updated_at=now() WHERE id=true`,
      [
        input.dailyBudgetMicrousd,
        input.userDailyRequests,
        input.userDailyTokens,
        input.maxOutputTokens,
        actor,
      ],
    );
    await appendAudit(client, actor, 'ai.settings.updated', 'gateway', { ...input });
  });
}
export async function setProviderLimits(
  db: Database,
  actor: string,
  provider: ProviderId,
  input: {
    dailyRequests: number;
    dailyTokens: number;
    dailyBudgetMicrousd: number;
  },
) {
  await inTransaction(db, async (client) => {
    await client.query(
      `UPDATE ai.provider_limits SET daily_requests=$1,daily_tokens=$2,
      daily_budget_microusd=$3,updated_by=$4,updated_at=now() WHERE provider=$5`,
      [input.dailyRequests, input.dailyTokens, input.dailyBudgetMicrousd, actor, provider],
    );
    await appendAudit(client, actor, 'ai.provider.limit_updated', provider, { ...input });
  });
}
export function inputDigest(task: AITask, input: string) {
  return createHash('sha256')
    .update(JSON.stringify([task, input]))
    .digest('hex');
}
export async function startRequest(
  db: Database,
  actor: string,
  clientId: string,
  task: AITask,
  digest: string,
) {
  const created = await db.query<{ id: string }>(
    `INSERT INTO ai.requests(actor_id,client_request_id,task,input_digest)
     VALUES($1,$2,$3,$4) ON CONFLICT(actor_id,client_request_id) DO NOTHING RETURNING id`,
    [actor, clientId, task, digest],
  );
  if (created.rows[0]) return { id: created.rows[0].id, repeated: false as const };
  const prior = await db.query<{ id: string; task: string; input_digest: string; state: string }>(
    'SELECT id,task,input_digest,state FROM ai.requests WHERE actor_id=$1 AND client_request_id=$2',
    [actor, clientId],
  );
  const row = prior.rows[0];
  if (!row || row.input_digest !== digest || row.task !== task)
    throw new ApiError(409, 'AI_REQUEST_CONFLICT', 'That request ID belongs to a different input.');
  if (row.state !== 'draft')
    throw new ApiError(
      409,
      'AI_REQUEST_PENDING',
      'The previous attempt is pending or unavailable. Use a new request ID only after checking the result.',
    );
  return { id: row.id, repeated: true as const };
}
export async function reserveAttempt(
  db: Database,
  actor: string,
  requestId: string,
  model: AIModel,
  inputTokens: number,
  outputTokens: number,
) {
  const tokens = inputTokens + outputTokens;
  const cost = Math.max(
    1,
    Math.ceil(
      (inputTokens * Number(model.input_price_microusd_per_million) +
        outputTokens * Number(model.output_price_microusd_per_million)) /
        1_000_000,
    ),
  );
  if (!Number.isSafeInteger(cost))
    throw new ApiError(409, 'AI_BUDGET_DENIED', 'Model price is not usable.');
  return inTransaction(db, async (client) => {
    const locked = await client.query<AISettings>(
      'SELECT daily_budget_microusd,user_daily_requests,user_daily_tokens,max_output_tokens FROM ai.settings WHERE id=true FOR UPDATE',
    );
    const settings = locked.rows[0];
    if (!settings) throw new ApiError(503, 'AI_CLOSED', 'AI settings are missing.');
    const day = (
      await client.query<{ day: string }>("SELECT (now() AT TIME ZONE 'UTC')::date::text AS day")
    ).rows[0].day;
    // One PostgreSQL transaction client cannot execute concurrent queries. Keep the reads
    // serial under the settings row lock so quota checks remain ordered and deterministic.
    const user = await client.query<{ requests: number; reserved_tokens: string }>(
      'SELECT requests,reserved_tokens FROM ai.user_usage_daily WHERE day=$1 AND actor_id=$2',
      [day, actor],
    );
    const global = await client.query<{ estimated_cost_microusd: string }>(
      'SELECT estimated_cost_microusd FROM ai.platform_usage_daily WHERE day=$1',
      [day],
    );
    const provider = await client.query<{
      attempts: number;
      reserved_tokens: string;
      estimated_cost_microusd: string;
    }>(
      'SELECT attempts,reserved_tokens,estimated_cost_microusd FROM ai.provider_usage_daily WHERE day=$1 AND provider=$2',
      [day, model.provider],
    );
    const limits = (
      await client.query<AIProviderLimits>(
        'SELECT provider,daily_requests,daily_tokens,daily_budget_microusd FROM ai.provider_limits WHERE provider=$1',
        [model.provider],
      )
    ).rows[0];
    if (
      !limits ||
      !settings.user_daily_requests ||
      !settings.user_daily_tokens ||
      !Number(settings.daily_budget_microusd) ||
      !limits.daily_requests ||
      !limits.daily_tokens ||
      !Number(limits.daily_budget_microusd)
    )
      throw new ApiError(
        429,
        'AI_BUDGET_CLOSED',
        'AI budgets and provider caps are closed; ask an authorised administrator.',
      );
    if (
      (user.rows[0]?.requests ?? 0) + 1 > settings.user_daily_requests ||
      Number(user.rows[0]?.reserved_tokens ?? 0) + tokens > settings.user_daily_tokens ||
      Number(global.rows[0]?.estimated_cost_microusd ?? 0) + cost >
        Number(settings.daily_budget_microusd) ||
      (provider.rows[0]?.attempts ?? 0) + 1 > limits.daily_requests ||
      Number(provider.rows[0]?.reserved_tokens ?? 0) + tokens > limits.daily_tokens ||
      Number(provider.rows[0]?.estimated_cost_microusd ?? 0) + cost >
        Number(limits.daily_budget_microusd)
    )
      throw new ApiError(
        429,
        'AI_QUOTA_EXCEEDED',
        'Daily AI request, token or estimated-cost cap reached. No provider call was made.',
      );
    await client.query(
      `INSERT INTO ai.user_usage_daily(day,actor_id,requests,reserved_tokens) VALUES($1,$2,1,$3)
      ON CONFLICT(day,actor_id) DO UPDATE SET requests=ai.user_usage_daily.requests+1,
      reserved_tokens=ai.user_usage_daily.reserved_tokens+EXCLUDED.reserved_tokens`,
      [day, actor, tokens],
    );
    await client.query(
      `INSERT INTO ai.platform_usage_daily(day,attempts,estimated_cost_microusd) VALUES($1,1,$2)
      ON CONFLICT(day) DO UPDATE SET attempts=ai.platform_usage_daily.attempts+1,
      estimated_cost_microusd=ai.platform_usage_daily.estimated_cost_microusd+EXCLUDED.estimated_cost_microusd`,
      [day, cost],
    );
    await client.query(
      `INSERT INTO ai.provider_usage_daily(day,provider,attempts,reserved_tokens,estimated_cost_microusd)
      VALUES($1,$2,1,$3,$4) ON CONFLICT(day,provider) DO UPDATE SET
      attempts=ai.provider_usage_daily.attempts+1,
      reserved_tokens=ai.provider_usage_daily.reserved_tokens+EXCLUDED.reserved_tokens,
      estimated_cost_microusd=ai.provider_usage_daily.estimated_cost_microusd+EXCLUDED.estimated_cost_microusd`,
      [day, model.provider, tokens, cost],
    );
    const attempt = await client.query<{ id: string }>(
      `INSERT INTO ai.attempts(request_id,provider,model_id,reserved_input_tokens,reserved_output_tokens,estimated_cost_microusd)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [requestId, model.provider, model.model_id, inputTokens, outputTokens, cost],
    );
    return { id: attempt.rows[0].id, estimatedCostMicrousd: cost };
  });
}
export async function finishAttempt(
  db: Database,
  model: AIModel,
  id: string,
  state: string,
  input: number | null,
  output: number | null,
  cooldown = 0,
) {
  await inTransaction(db, async (client) => {
    await client.query(
      `UPDATE ai.attempts SET state=$1,measured_input_tokens=$2,measured_output_tokens=$3,
       completed_at=now() WHERE id=$4`,
      [state, input, output, id],
    );
    await client.query(
      `UPDATE ai.models SET last_status=$1,last_error_code=$2,last_checked_at=now(),
      cooldown_until=CASE WHEN $3::int > 0 THEN now()+($3::int * interval '1 millisecond') ELSE NULL END
      WHERE id=$4`,
      [
        state === 'validated' ? 'ok' : state,
        state === 'validated' ? null : state,
        cooldown,
        model.id,
      ],
    );
  });
}
async function assertStillRouted(client: Transaction, model: AIModel, task: AITask, actor: string) {
  // Linearise draft persistence against permission revocation, operator disablement,
  // terms revocation and route changes. The locks hold until the draft commits.
  const membership = await client.query(
    `SELECT 1 FROM ai.admin_members a JOIN pilot.users u ON u.id=a.user_id
     WHERE u.id=$1 AND u.role='reviewer' AND u.status='active' FOR SHARE OF a,u`,
    [actor],
  );
  if (!membership.rowCount)
    throw new ApiError(403, 'AI_ADMIN_DENIED', 'AI permission was revoked. No draft was saved.');
  const state = await client.query<{
    enabled: boolean;
    terms_approved_at: string | null;
    verified_at: string | null;
    verification_fingerprint: string | null;
    allowed_tasks: AITask[];
  }>(
    `SELECT enabled,terms_approved_at,verified_at,verification_fingerprint,allowed_tasks
     FROM ai.models WHERE id=$1 FOR SHARE`,
    [model.id],
  );
  const current = state.rows[0];
  const route = await client.query<{ primary_model: string; fallback_model: string | null }>(
    'SELECT primary_model,fallback_model FROM ai.task_routes WHERE task=$1 FOR SHARE',
    [task],
  );
  if (
    !current?.enabled ||
    !current.terms_approved_at ||
    !current.verified_at ||
    Date.now() - new Date(current.verified_at).getTime() >= 30 * 86_400_000 ||
    !current.verification_fingerprint ||
    current.verification_fingerprint !== model.verification_fingerprint ||
    !current.allowed_tasks.includes(task) ||
    !route.rows[0] ||
    ![route.rows[0].primary_model, route.rows[0].fallback_model].includes(model.id)
  )
    throw new ApiError(
      503,
      'AI_CONFIG_CHANGED',
      'The approved model route changed. No draft was saved.',
    );
}

export async function saveDraft(
  db: Database,
  requestId: string,
  actor: string,
  task: AITask,
  input: string,
  text: string,
  model: AIModel,
) {
  return inTransaction(db, async (client) => {
    await assertStillRouted(client, model, task, actor);
    const draft = await client.query<{ id: string }>(
      `INSERT INTO ai.drafts(request_id,created_by,task,input_text,content,provider,model_id,verification_fingerprint)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        requestId,
        actor,
        task,
        input,
        text,
        model.provider,
        model.model_id,
        model.verification_fingerprint,
      ],
    );
    await client.query("UPDATE ai.requests SET state='draft',completed_at=now() WHERE id=$1", [
      requestId,
    ]);
    return draft.rows[0].id;
  });
}
export async function failRequest(db: Database, requestId: string) {
  await db.query(
    "UPDATE ai.requests SET state='unavailable',completed_at=now() WHERE id=$1 AND state='pending'",
    [requestId],
  );
}
export async function getDraft(db: Database, requestId: string, actor: string) {
  const { rows } = await db.query<{
    id: string;
    content: string;
    provider: string;
    model_id: string;
    task: AITask;
    state: string;
  }>(
    `SELECT d.id,d.content,d.provider,d.model_id,d.task,d.state FROM ai.drafts d
     JOIN ai.requests r ON r.id=d.request_id WHERE r.id=$1 AND d.created_by=$2 AND d.expires_at>now()`,
    [requestId, actor],
  );
  return rows[0] ?? null;
}
export async function pendingDrafts(db: Database) {
  return (
    await db.query(`SELECT id,created_by,task,input_text,content,provider,model_id,created_at
    FROM ai.drafts WHERE state='draft' AND expires_at>now() ORDER BY created_at DESC LIMIT 25`)
  ).rows;
}
export async function reviewReusable(
  db: Database,
  reviewer: string,
  draftId: string,
  secret: string,
) {
  // A reviewed explanation is reusable internally; this never publishes it to the 44-course release.
  const { cacheKey } = await import('./guard.js');
  return inTransaction(db, async (client) => {
    const found = await client.query<{
      id: string;
      task: AITask;
      provider: ProviderId;
      model_id: string;
      verification_fingerprint: string | null;
      input_text: string;
      created_by: string;
    }>(
      "SELECT id,task,provider,model_id,verification_fingerprint,input_text,created_by FROM ai.drafts WHERE id=$1 AND state='draft' AND expires_at>now() FOR UPDATE",
      [draftId],
    );
    const row = found.rows[0];
    if (!row || row.task !== 'explanation' || row.created_by === reviewer)
      throw new ApiError(
        409,
        'AI_REVIEW_DENIED',
        'A different authorised reviewer must approve an explanation for reuse.',
      );
    // Never make pre-migration content reusable: it lacks a tested endpoint/credential binding.
    if (!row.verification_fingerprint)
      throw new ApiError(409, 'AI_CACHE_CLOSED', 'This draft predates configuration binding.');
    // Exact reviewed credential, endpoint and upstream are part of the cache scope.
    const key = cacheKey(
      secret,
      'explanation',
      `${row.provider}:${row.model_id}:${row.verification_fingerprint}`,
      row.input_text,
    );
    if (!key) throw new ApiError(409, 'AI_CACHE_CLOSED', 'Server-side cache key is missing.');
    await client.query(
      `UPDATE ai.drafts SET state='reviewed_reusable',reviewed_by=$1,reviewed_at=now() WHERE id=$2`,
      [reviewer, draftId],
    );
    await client.query(
      `INSERT INTO ai.reusable_cache(cache_key,draft_id) VALUES($1,$2)
      ON CONFLICT(cache_key) DO UPDATE SET draft_id=EXCLUDED.draft_id,created_at=now(),expires_at=now()+interval '7 days'`,
      [key, draftId],
    );
    await appendAudit(client, reviewer, 'ai.explanation.reviewed_for_reuse', draftId, {
      notCurriculumPublication: true,
    });
  });
}
export async function getReusable(db: Database, cacheKeyValue: string) {
  const { rows } = await db.query<{
    id: string;
    content: string;
    provider: string;
    model_id: string;
    verification_fingerprint: string;
  }>(
    `SELECT d.id,d.content,d.provider,d.model_id,d.verification_fingerprint FROM ai.reusable_cache c JOIN ai.drafts d ON d.id=c.draft_id
     WHERE c.cache_key=$1 AND c.expires_at>now() AND d.expires_at>now() AND d.state='reviewed_reusable'`,
    [cacheKeyValue],
  );
  return rows[0] ?? null;
}
export async function consumeCacheQuota(db: Database, actor: string) {
  await inTransaction(db, async (client) => {
    const settings = (
      await client.query<AISettings>(
        'SELECT daily_budget_microusd,user_daily_requests,user_daily_tokens,max_output_tokens FROM ai.settings WHERE id=true FOR UPDATE',
      )
    ).rows[0];
    if (
      !settings ||
      !settings.user_daily_requests ||
      !settings.user_daily_tokens ||
      !Number(settings.daily_budget_microusd)
    )
      throw new ApiError(429, 'AI_BUDGET_CLOSED', 'AI is unavailable until budgets are approved.');
    const day = (
      await client.query<{ day: string }>("SELECT (now() AT TIME ZONE 'UTC')::date::text AS day")
    ).rows[0].day;
    const current = (
      await client.query<{ requests: number }>(
        'SELECT requests FROM ai.user_usage_daily WHERE day=$1 AND actor_id=$2',
        [day, actor],
      )
    ).rows[0];
    if ((current?.requests ?? 0) + 1 > settings.user_daily_requests)
      throw new ApiError(429, 'AI_QUOTA_EXCEEDED', 'Daily AI request cap reached.');
    await client.query(
      `INSERT INTO ai.user_usage_daily(day,actor_id,requests) VALUES($1,$2,1)
      ON CONFLICT(day,actor_id) DO UPDATE SET requests=ai.user_usage_daily.requests+1`,
      [day, actor],
    );
  });
}
export async function saveCacheHit(
  db: Database,
  requestId: string,
  actor: string,
  task: AITask,
  input: string,
  reusable: {
    content: string;
    provider: string;
    model_id: string;
    verification_fingerprint: string;
  },
  model: AIModel,
) {
  return inTransaction(db, async (client) => {
    await assertStillRouted(client, model, task, actor);
    const created = await client.query<{ id: string }>(
      `INSERT INTO ai.drafts(request_id,created_by,task,input_text,content,provider,model_id,verification_fingerprint)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        requestId,
        actor,
        task,
        input,
        reusable.content,
        reusable.provider,
        reusable.model_id,
        reusable.verification_fingerprint,
      ],
    );
    await client.query("UPDATE ai.requests SET state='draft',completed_at=now() WHERE id=$1", [
      requestId,
    ]);
    return created.rows[0].id;
  });
}
export async function recordVerificationRequest(db: Database, actor: string, model: AIModel) {
  const id = randomUUID();
  const started = await startRequest(
    db,
    actor,
    id,
    'explanation',
    inputDigest('explanation', `verification:${model.id}:${id}`),
  );
  return started.id;
}
