import { pilotRequest } from '../api';

export const aiTasks = [
  'explanation',
  'lesson_draft',
  'coding_help',
  'quiz_draft',
  'feedback_draft',
  'learning_plan_draft',
  'translation_draft',
] as const;
export type AITask = (typeof aiTasks)[number];
export const aiProviders = [
  'gemini',
  'groq',
  'openrouter',
  'cloudflare',
  'nvidia',
  'ollama',
] as const;
export type AIProviderId = (typeof aiProviders)[number];
export interface AIModelView {
  id: string;
  provider: AIProviderId;
  model_id: string;
  allowed_tasks: AITask[];
  max_context_tokens: number;
  max_output_tokens: number;
  input_price_microusd_per_million: string;
  output_price_microusd_per_million: string;
  evidence_url: string;
  terms_approved_at: string | null;
  verified_at: string | null;
  verifiedForCurrentConfig: boolean;
  enabled: boolean;
  last_status: string;
  last_checked_at: string | null;
  cooldown_until: string | null;
}
export interface AIAdminBoard {
  settings: {
    daily_budget_microusd: string;
    user_daily_requests: number;
    user_daily_tokens: number;
    max_output_tokens: number;
  };
  models: AIModelView[];
  routes: { task: AITask; primary_model: string; fallback_model: string | null }[];
  limits: {
    provider: AIProviderId;
    daily_requests: number;
    daily_tokens: number;
    daily_budget_microusd: string;
  }[];
  usage: {
    provider: AIProviderId;
    attempts: number;
    reserved_tokens: string;
    estimated_cost_microusd: string;
  }[];
  platform: { attempts: number; estimated_cost_microusd: string };
  userPeak: { peak_requests: number; peak_tokens: string };
  recent: { provider: AIProviderId; model_id: string; state: string; created_at: string }[];
  credentialPresence: Record<AIProviderId, boolean>;
  scope: 'synthetic_dev_only';
  productionReady: false;
}
export interface AIDraft {
  draftId: string;
  task: AITask;
  text: string;
  provider: AIProviderId;
  model: string;
  state: 'draft';
  cached: boolean;
  repeated: boolean;
}
export interface AIPendingDraft {
  id: string;
  created_by: string;
  task: AITask;
  input_text: string;
  content: string;
  provider: AIProviderId;
  model_id: string;
  created_at: string;
}
export const aiAdminApi = {
  board: () => pilotRequest<AIAdminBoard>('/ai/admin'),
  drafts: () => pilotRequest<{ drafts: AIPendingDraft[] }>('/ai/admin/drafts'),
  settings: (body: {
    dailyBudgetMicrousd: number;
    userDailyRequests: number;
    userDailyTokens: number;
    maxOutputTokens: number;
  }) => pilotRequest<{ saved: boolean }>('/ai/admin/settings', body),
  providerLimits: (
    provider: AIProviderId,
    body: { dailyRequests: number; dailyTokens: number; dailyBudgetMicrousd: number },
  ) => pilotRequest<{ saved: boolean }>(`/ai/admin/providers/${provider}/limits`, body),
  addModel: (body: {
    provider: AIProviderId;
    modelId: string;
    allowedTasks: AITask[];
    maxContextTokens: number;
    maxOutputTokens: number;
    inputPriceMicrousdPerMillion: number;
    outputPriceMicrousdPerMillion: number;
    evidenceUrl: string;
  }) => pilotRequest<{ id: string; enabled: false; verified: false }>('/ai/admin/models', body),
  terms: (id: string, reference: string) =>
    pilotRequest<{ recorded: boolean }>(`/ai/admin/models/${encodeURIComponent(id)}/terms`, {
      acknowledged: true,
      decisionReference: reference,
    }),
  verify: (id: string) =>
    pilotRequest<{ verified: boolean; scope: string }>(
      `/ai/admin/models/${encodeURIComponent(id)}/verify`,
      { acknowledgeLiveCharge: true },
    ),
  toggle: (id: string, enabled: boolean) =>
    pilotRequest<{ enabled: boolean }>(`/ai/admin/models/${encodeURIComponent(id)}/toggle`, {
      enabled,
    }),
  route: (task: AITask, primaryModel: string, fallbackModel: string | null) =>
    pilotRequest<{ saved: boolean }>(`/ai/admin/routes/${task}`, { primaryModel, fallbackModel }),
  reviewForReuse: (id: string) =>
    pilotRequest<{ reviewedForReuse: boolean; published: false }>(
      `/ai/admin/drafts/${encodeURIComponent(id)}/reuse`,
      { acknowledged: true },
    ),
  generate: (task: AITask, input: string, requestId: string) =>
    pilotRequest<AIDraft>('/ai/drafts', {
      task,
      input,
      requestId,
      source: 'synthetic-reviewer-material',
    }),
};
