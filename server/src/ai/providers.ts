import { createHash } from 'node:crypto';
import { z } from 'zod';

export const providerIds = [
  'gemini',
  'groq',
  'openrouter',
  'cloudflare',
  'nvidia',
  'ollama',
] as const;
export type ProviderId = (typeof providerIds)[number];
export const providerIdSchema = z.enum(providerIds);
export const taskIds = [
  'explanation',
  'lesson_draft',
  'coding_help',
  'quiz_draft',
  'feedback_draft',
  'learning_plan_draft',
  'translation_draft',
] as const;
export type AITask = (typeof taskIds)[number];
export const taskSchema = z.enum(taskIds);
export const modelIdSchema = z
  .string()
  .min(2)
  .max(150)
  .regex(/^[A-Za-z0-9@][A-Za-z0-9_./:@-]*$/)
  .refine((value) => !value.includes('..') && !value.includes('://') && !value.includes('//'));

export interface AIRequest {
  model: string;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  signal: AbortSignal;
}
export interface AIResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  returnedModel: string;
}
export interface AIProvider {
  id: ProviderId;
  /** Only a configured network adapter with a server-side key can verify a model. */
  real: boolean;
  configured: boolean;
  /** Server-private hash of the credential, endpoint and pinned upstream; never return it to clients. */
  fingerprint: string | null;
  generate(request: AIRequest): Promise<AIResult>;
}
export type ProviderFailure =
  | 'rate_limited'
  | 'transient'
  | 'timeout'
  | 'access_denied'
  | 'invalid_output'
  | 'safety_blocked'
  | 'not_configured';
export class AIProviderError extends Error {
  constructor(
    public kind: ProviderFailure,
    public retryAfterMs = 0,
  ) {
    super(kind); // Never include provider response bodies, prompts or credentials in logs/errors.
  }
}

const tokenCount = z.number().int().nonnegative().finite();
const completion = z.object({
  model: z.string().min(1).max(160),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({
          content: z.string().nullable(),
          refusal: z.string().nullable().optional(),
          tool_calls: z.unknown().optional(),
          reasoning_content: z.unknown().optional(),
        }),
      }),
    )
    .min(1)
    .max(1),
  usage: z.object({ prompt_tokens: tokenCount, completion_tokens: tokenCount }).optional(),
});
const geminiResult = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string(),
        content: z.object({
          parts: z
            .array(z.object({ text: z.string(), thought: z.boolean().optional() }))
            .min(1)
            .max(8),
        }),
      }),
    )
    .min(1)
    .max(1),
  usageMetadata: z
    .object({
      promptTokenCount: tokenCount.optional(),
      candidatesTokenCount: tokenCount.optional(),
    })
    .optional(),
});
const ollamaResult = z.object({
  model: z.string().min(1),
  done: z.literal(true),
  done_reason: z.literal('stop'),
  message: z.object({
    role: z.literal('assistant'),
    content: z.string(),
    tool_calls: z.unknown().optional(),
    thinking: z.unknown().optional(),
  }),
  prompt_eval_count: tokenCount.optional(),
  eval_count: tokenCount.optional(),
});

function checkedText(text: string) {
  const trimmed = text.trim();
  if (
    !trimmed ||
    trimmed.length > 12_000 ||
    /<\/?think\b|<script\b|\[INST\]|data:image\//i.test(trimmed)
  )
    throw new AIProviderError('invalid_output');
  // A model can still produce harmful or incorrect text. This check is NOT a content-safety review.
  return trimmed;
}
function retryAfter(value: string | null) {
  if (!value) return 0;
  const seconds = Number(value);
  const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(milliseconds) ? Math.min(60_000, Math.max(0, Math.ceil(milliseconds))) : 0;
}
async function readLimited(response: Response, limit = 80_000) {
  if (Number(response.headers.get('content-length')) > limit)
    throw new AIProviderError('invalid_output');
  const reader = response.body?.getReader();
  if (!reader) throw new AIProviderError('invalid_output');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new AIProviderError('invalid_output');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function postJson(
  fetcher: typeof fetch,
  url: string,
  headers: Record<string, string>,
  payload: object,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
      body: JSON.stringify(payload),
      signal,
      redirect: 'error', // Prevent forwarding bearer keys to redirect destinations.
      cache: 'no-store',
    });
  } catch {
    if (signal.aborted) throw new AIProviderError('timeout');
    throw new AIProviderError('transient');
  }
  if (!response.ok) {
    if (response.status === 429)
      throw new AIProviderError('rate_limited', retryAfter(response.headers.get('retry-after')));
    if ([408, 500, 502, 503, 504].includes(response.status)) throw new AIProviderError('transient');
    throw new AIProviderError('access_denied'); // Includes insufficient credits: never silently try a paid tier.
  }
  if (!(response.headers.get('content-type') || '').includes('application/json'))
    throw new AIProviderError('invalid_output');
  try {
    return JSON.parse(await readLimited(response)) as unknown;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    throw new AIProviderError('invalid_output');
  }
}
function parseCompletion(body: unknown, selected: string): AIResult {
  const parsed = completion.safeParse(body);
  if (!parsed.success) throw new AIProviderError('invalid_output');
  const { model, choices, usage } = parsed.data;
  const first = choices[0];
  // OpenRouter/free and implicit cross-model routing are not eligible: account for the actual model.
  if (
    model !== selected ||
    first.finish_reason !== 'stop' ||
    first.message.refusal ||
    first.message.tool_calls ||
    first.message.reasoning_content
  )
    throw new AIProviderError('invalid_output');
  return {
    text: checkedText(first.message.content ?? ''),
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    returnedModel: model,
  };
}
function validateEndpoint(base: string, provider: ProviderId, env: NodeJS.ProcessEnv) {
  // Only NVIDIA has an operator-configurable host. Other adapter bases are source-pinned.
  if (provider !== 'nvidia') return base;
  const url = new URL(base);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/v1' ||
    url.protocol !== 'https:'
  )
    throw new Error('NVIDIA_BASE_URL must be an approved HTTPS /v1 endpoint without credentials');
  const extraHosts = (env.NVIDIA_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // No IP literals, localhost, wildcards, ports or user info in the server-only allowlist.
  if (
    extraHosts.some(
      (host) => !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(host),
    )
  )
    throw new Error('NVIDIA_ALLOWED_HOSTS must contain explicit DNS hostnames only');
  const allowed = ['integrate.api.nvidia.com', ...extraHosts];
  if (!allowed.includes(url.hostname) || url.port)
    throw new Error('NVIDIA_BASE_URL host is not on the server-side allowlist');
  return url.origin + url.pathname;
}
function privateFingerprint(...parts: string[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
function openAIAdapter(
  id: Exclude<ProviderId, 'gemini' | 'ollama'>,
  key: string | undefined,
  base: string,
  fetcher: typeof fetch,
  env: NodeJS.ProcessEnv,
): AIProvider {
  const endpoint = validateEndpoint(base, id, env) + '/chat/completions';
  // OpenRouter otherwise silently load-balances among third-party processors with
  // different retention, regions and terms. Pin one individually reviewed endpoint.
  const upstream = id === 'openrouter' ? env.OPENROUTER_UPSTREAM_SLUG?.trim() : undefined;
  if (
    upstream &&
    (!/^[a-z0-9][a-z0-9._-]{0,63}\/[a-z0-9][a-z0-9._-]{0,63}$/.test(upstream) ||
      /^(google|google-vertex)(\/|$)/i.test(upstream))
  )
    throw new Error('OPENROUTER_UPSTREAM_SLUG must be one reviewed, non-Google endpoint slug');
  return {
    id,
    real: true,
    configured: !!key && (id !== 'openrouter' || !!upstream),
    fingerprint:
      key && (id !== 'openrouter' || upstream)
        ? privateFingerprint(id, endpoint, key, upstream ?? '')
        : null,
    async generate(request) {
      if (!key || (id === 'openrouter' && !upstream)) throw new AIProviderError('not_configured');
      const model = modelIdSchema.parse(request.model);
      // No random/free router variants or Gemini behind an aggregator to evade age terms.
      if (
        id === 'openrouter' &&
        /gemini|^google[-/]|^openrouter\/|:(?:free|nitro|floor)$/i.test(model)
      )
        throw new AIProviderError('access_denied');
      const body = await postJson(
        fetcher,
        endpoint,
        { Authorization: `Bearer ${key}` },
        {
          model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
          stream: false,
          max_tokens: request.maxOutputTokens,
          ...(id === 'openrouter'
            ? {
                provider: {
                  order: [upstream!],
                  only: [upstream!],
                  allow_fallbacks: false,
                  data_collection: 'deny',
                  zdr: true,
                  require_parameters: true,
                },
              }
            : {}),
          // No tools, plugins, user identifiers, file uploads or server-side web browsing.
        },
        request.signal,
      );
      return parseCompletion(body, model);
    },
  };
}
export function createAIProviders(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Record<ProviderId, AIProvider> {
  const makeGemini: AIProvider = {
    id: 'gemini',
    real: true,
    configured: !!env.GEMINI_API_KEY,
    fingerprint: env.GEMINI_API_KEY
      ? privateFingerprint(
          'gemini',
          'https://generativelanguage.googleapis.com/v1beta',
          env.GEMINI_API_KEY,
        )
      : null,
    async generate(request) {
      if (!env.GEMINI_API_KEY) throw new AIProviderError('not_configured');
      const model = modelIdSchema.parse(request.model);
      if (!/^[a-zA-Z0-9_.-]+$/.test(model)) throw new AIProviderError('access_denied');
      const body = await postJson(
        fetcher,
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { 'x-goog-api-key': env.GEMINI_API_KEY },
        {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: { maxOutputTokens: request.maxOutputTokens },
        },
        request.signal,
      );
      const result = geminiResult.safeParse(body);
      if (!result.success) throw new AIProviderError('invalid_output');
      const first = result.data.candidates[0];
      if (first.content.parts.some((part) => part.thought))
        throw new AIProviderError('invalid_output');
      if (first.finishReason !== 'STOP')
        throw new AIProviderError(
          first.finishReason === 'SAFETY' ? 'safety_blocked' : 'invalid_output',
        );
      return {
        text: checkedText(first.content.parts.map((part) => part.text).join('\n')),
        inputTokens: result.data.usageMetadata?.promptTokenCount ?? null,
        outputTokens: result.data.usageMetadata?.candidatesTokenCount ?? null,
        returnedModel: model,
      };
    },
  };
  const local = env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
  const localUrl = new URL(local);
  if (
    localUrl.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(localUrl.hostname) ||
    localUrl.username ||
    localUrl.password ||
    localUrl.search ||
    localUrl.hash ||
    localUrl.pathname !== '/' ||
    localUrl.port !== '11434'
  )
    throw new Error(
      'OLLAMA_BASE_URL must be local loopback HTTP port 11434 only; do not expose unauthenticated Ollama over a network',
    );
  const makeOllama: AIProvider = {
    id: 'ollama',
    real: true,
    configured: env.OLLAMA_ENABLED === 'true',
    fingerprint:
      env.OLLAMA_ENABLED === 'true' ? privateFingerprint('ollama', localUrl.origin) : null,
    async generate(request) {
      if (env.OLLAMA_ENABLED !== 'true') throw new AIProviderError('not_configured');
      const model = modelIdSchema.parse(request.model);
      if (/:cloud\b/i.test(model)) throw new AIProviderError('access_denied'); // Local service must not proxy to Ollama Cloud.
      const body = await postJson(
        fetcher,
        `${localUrl.origin}/api/chat`,
        {},
        {
          model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
          options: { num_predict: request.maxOutputTokens },
          stream: false,
        },
        request.signal,
      );
      const result = ollamaResult.safeParse(body);
      if (
        !result.success ||
        result.data.model !== model ||
        result.data.message.tool_calls ||
        result.data.message.thinking
      )
        throw new AIProviderError('invalid_output');
      return {
        text: checkedText(result.data.message.content),
        inputTokens: result.data.prompt_eval_count ?? null,
        outputTokens: result.data.eval_count ?? null,
        returnedModel: model,
      };
    },
  };
  const cloudflareAccount = env.CLOUDFLARE_ACCOUNT_ID;
  if (cloudflareAccount && !/^[a-f0-9]{32}$/i.test(cloudflareAccount))
    throw new Error('CLOUDFLARE_ACCOUNT_ID must be an account identifier (not a URL)');
  const cloudflareBase = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccount ?? 'unconfigured'}/ai/v1`;
  // Cloudflare has a fixed official URL with an account ID in its path, not a configurable remote host.
  const cfAdapter: AIProvider = {
    id: 'cloudflare',
    real: true,
    configured: !!cloudflareAccount && !!env.CLOUDFLARE_API_TOKEN,
    fingerprint:
      cloudflareAccount && env.CLOUDFLARE_API_TOKEN
        ? privateFingerprint('cloudflare', cloudflareBase, env.CLOUDFLARE_API_TOKEN)
        : null,
    async generate(request) {
      if (!cloudflareAccount || !env.CLOUDFLARE_API_TOKEN)
        throw new AIProviderError('not_configured');
      const model = modelIdSchema.parse(request.model);
      if (!model.startsWith('@cf/')) throw new AIProviderError('access_denied');
      const body = await postJson(
        fetcher,
        cloudflareBase + '/chat/completions',
        { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
        {
          model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
          stream: false,
          max_tokens: request.maxOutputTokens,
        },
        request.signal,
      );
      return parseCompletion(body, model);
    },
  };
  return {
    gemini: makeGemini,
    groq: openAIAdapter('groq', env.GROQ_API_KEY, 'https://api.groq.com/openai/v1', fetcher, env),
    openrouter: openAIAdapter(
      'openrouter',
      env.OPENROUTER_API_KEY,
      'https://openrouter.ai/api/v1',
      fetcher,
      env,
    ),
    cloudflare: cfAdapter,
    nvidia: openAIAdapter(
      'nvidia',
      env.NVIDIA_API_KEY,
      env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
      fetcher,
      env,
    ),
    ollama: makeOllama,
  };
}
