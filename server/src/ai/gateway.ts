import { setTimeout as wait } from 'node:timers/promises';
import { randomInt } from 'node:crypto';
import type { Database } from '../db.js';
import { ApiError } from '../security.js';
import { cacheKey, privateText, promptFor, validateDraftOutput } from './guard.js';
import type { AIModel } from './store.js';
import {
  consumeCacheQuota,
  failRequest,
  finishAttempt,
  getDraft,
  getModel,
  getReusable,
  getRoute,
  getSettings,
  inputDigest,
  markModelVerified,
  recordVerificationRequest,
  reserveAttempt,
  saveCacheHit,
  saveDraft,
  startRequest,
} from './store.js';
import { AIProviderError, type AIProvider, type AITask, type ProviderId } from './providers.js';

export interface GatewayOptions {
  timeoutMs: number;
  retries: number;
  cacheSecret?: string;
  liveTestsApproved: boolean;
}
export type AIProviders = Record<ProviderId, AIProvider>;

export class AIGateway {
  constructor(
    private db: Database,
    private providers: AIProviders,
    private options: GatewayOptions,
  ) {}

  private eligible(model: AIModel, task: AITask) {
    const provider = this.providers[model.provider];
    return (
      model.provider !== 'gemini' &&
      provider?.configured &&
      provider.real &&
      model.enabled &&
      !!provider.fingerprint &&
      model.verification_fingerprint === provider.fingerprint &&
      model.terms_approved_at &&
      model.verified_at &&
      Date.now() - new Date(model.verified_at).getTime() < 30 * 86_400_000 &&
      model.allowed_tasks.includes(task)
    );
  }
  private budget(model: AIModel, system: string, prompt: string, maxConfigured: number) {
    const maxOutput = Math.min(maxConfigured, model.max_output_tokens, 1024);
    // Byte count + overhead conservatively reserves tokens; exact billing requires provider reconciliation.
    const inputTokens = Buffer.byteLength(system + prompt, 'utf8') + 1024;
    if (inputTokens + maxOutput > model.max_context_tokens)
      throw new ApiError(
        422,
        'AI_CONTEXT_LIMIT',
        'Request exceeds the reviewed model context estimate.',
      );
    return { inputTokens, maxOutput };
  }

  async generateDraft(actor: string, clientId: string, task: AITask, rawInput: string) {
    const input = privateText(rawInput);
    const started = await startRequest(this.db, actor, clientId, task, inputDigest(task, input));
    if (started.repeated) {
      const prior = await getDraft(this.db, started.id, actor);
      if (!prior)
        throw new ApiError(409, 'AI_RESULT_EXPIRED', 'The earlier draft is no longer available.');
      return {
        draftId: prior.id,
        task,
        text: prior.content,
        provider: prior.provider,
        model: prior.model_id,
        state: 'draft' as const,
        cached: false,
        repeated: true,
      };
    }
    try {
      const route = await getRoute(this.db, task);
      if (!route)
        throw new ApiError(
          503,
          'AI_UNAVAILABLE',
          'No reviewed model route is available. No draft was created.',
        );
      const { system, prompt } = promptFor(task, input);
      for (const modelId of [route.primary_model, route.fallback_model].filter(
        (value): value is string => !!value,
      )) {
        const model = await getModel(this.db, modelId);
        if (!this.eligible(model, task)) continue;
        // A reviewed generic explanation can be reused without contacting any provider.
        const key = cacheKey(
          this.options.cacheSecret,
          task,
          `${model.provider}:${model.model_id}:${model.verification_fingerprint}`,
          input,
        );
        if (key) {
          const cached = await getReusable(this.db, key);
          if (cached) {
            await consumeCacheQuota(this.db, actor);
            const id = await saveCacheHit(this.db, started.id, actor, task, input, cached, model);
            return {
              draftId: id,
              task,
              text: cached.content,
              provider: cached.provider,
              model: cached.model_id,
              state: 'draft' as const,
              cached: true,
              repeated: false,
            };
          }
        }
        if (model.cooldown_until && new Date(model.cooldown_until).getTime() > Date.now()) continue;
        const settings = await getSettings(this.db);
        const { inputTokens, maxOutput } = this.budget(
          model,
          system,
          prompt,
          settings.max_output_tokens,
        );
        const adapter = this.providers[model.provider];
        for (let index = 0; index <= this.options.retries; index++) {
          let reserved;
          try {
            reserved = await reserveAttempt(
              this.db,
              actor,
              started.id,
              model,
              inputTokens,
              maxOutput,
            );
          } catch (error) {
            if (
              error instanceof ApiError &&
              ['AI_QUOTA_EXCEEDED', 'AI_BUDGET_CLOSED'].includes(error.code)
            ) {
              // No provider call was made; another route may have its own provider capacity,
              // but the shared budget and per-user budget are still enforced by the DB lock.
              break;
            }
            throw error;
          }
          let result;
          try {
            result = await adapter.generate({
              model: model.model_id,
              system,
              prompt,
              maxOutputTokens: maxOutput,
              signal: AbortSignal.timeout(this.options.timeoutMs),
            });
            if (result.returnedModel !== model.model_id || typeof result.text !== 'string')
              throw new AIProviderError('invalid_output');
            validateDraftOutput(result.text); // Never persist or return unsafe/unvalidated output.
          } catch (error) {
            const failure =
              error instanceof AIProviderError
                ? error
                : error instanceof ApiError && error.code === 'AI_OUTPUT_REJECTED'
                  ? new AIProviderError('safety_blocked')
                  : new AIProviderError('transient');
            await finishAttempt(
              this.db,
              model,
              reserved.id,
              failure.kind,
              null,
              null,
              failure.kind === 'rate_limited' ? Math.max(1500, failure.retryAfterMs) : 0,
            );
            if (failure.kind === 'safety_blocked')
              throw new ApiError(
                503,
                'AI_SAFETY_HOLD',
                'Generated material was rejected. No draft was saved.',
              );
            const retryable = ['rate_limited', 'transient', 'timeout'].includes(failure.kind);
            if (retryable && index < this.options.retries) {
              const backoff =
                failure.retryAfterMs || Math.min(1500, 150 * 2 ** index + randomInt(0, 100));
              if (backoff <= 1500) {
                await wait(backoff); // Next attempt consumes a NEW quota/cost reservation.
                continue;
              }
            }
            break; // Try the separately approved fallback route, if any.
          }
          await finishAttempt(
            this.db,
            model,
            reserved.id,
            'validated',
            result.inputTokens,
            result.outputTokens,
          );
          const id = await saveDraft(this.db, started.id, actor, task, input, result.text, model);
          return {
            draftId: id,
            task,
            text: result.text,
            provider: model.provider,
            model: model.model_id,
            state: 'draft' as const,
            cached: false,
            repeated: false,
          };
        }
      }
      throw new ApiError(
        503,
        'AI_UNAVAILABLE',
        'Approved AI providers are unavailable or at quota. No draft was saved.',
      );
    } catch (error) {
      await failRequest(this.db, started.id).catch(() => {});
      throw error;
    }
  }

  async verifyRealModel(actor: string, modelId: string) {
    if (!this.options.liveTestsApproved)
      throw new ApiError(
        409,
        'AI_LIVE_TEST_NOT_APPROVED',
        'A named owner must approve an actual provider request and charge first.',
      );
    const model = await getModel(this.db, modelId);
    const adapter = this.providers[model.provider];
    if (
      model.provider === 'gemini' ||
      !adapter?.real ||
      !adapter.configured ||
      !adapter.fingerprint ||
      !model.terms_approved_at
    )
      throw new ApiError(
        409,
        'AI_MODEL_NOT_READY',
        'Provider terms, permitted use and a real server-side credential are required.',
      );
    const requestId = await recordVerificationRequest(this.db, actor, model);
    try {
      const { system, prompt } = promptFor(
        'explanation',
        'A fictional exercise: explain why saving a text file helps a beginner.',
      );
      const settings = await getSettings(this.db);
      const { inputTokens, maxOutput } = this.budget(
        model,
        system,
        prompt,
        Math.min(128, settings.max_output_tokens),
      );
      const reserved = await reserveAttempt(
        this.db,
        actor,
        requestId,
        model,
        inputTokens,
        maxOutput,
      );
      let result;
      try {
        result = await adapter.generate({
          model: model.model_id,
          system,
          prompt,
          maxOutputTokens: maxOutput,
          signal: AbortSignal.timeout(this.options.timeoutMs),
        });
        if (result.returnedModel !== model.model_id || typeof result.text !== 'string')
          throw new AIProviderError('invalid_output');
        validateDraftOutput(result.text);
      } catch (error) {
        const failure =
          error instanceof AIProviderError
            ? error
            : error instanceof ApiError && error.code === 'AI_OUTPUT_REJECTED'
              ? new AIProviderError('safety_blocked')
              : new AIProviderError('transient');
        await finishAttempt(
          this.db,
          model,
          reserved.id,
          failure.kind,
          null,
          null,
          failure.retryAfterMs,
        );
        throw new ApiError(
          503,
          'AI_VERIFICATION_FAILED',
          `Provider verification failed (${failure.kind}); no operational status was granted.`,
        );
      }
      await finishAttempt(
        this.db,
        model,
        reserved.id,
        'validated',
        result.inputTokens,
        result.outputTokens,
      );
      await markModelVerified(
        this.db,
        actor,
        model.id,
        adapter.fingerprint,
        model.terms_approved_at,
      );
      await this.db.query(
        "UPDATE ai.requests SET state='verified',completed_at=now() WHERE id=$1",
        [requestId],
      );
      return {
        verified: true,
        modelId: model.id,
        checkedAt: new Date().toISOString(),
        scope: 'synthetic_dev_only' as const,
      };
    } catch (error) {
      await failRequest(this.db, requestId).catch(() => {});
      throw error;
    }
  }
}
