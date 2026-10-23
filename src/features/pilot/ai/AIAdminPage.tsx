import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Field, InfoBox, Input, buttonStyles } from '@/components/ui';
import { usePilotContext } from '../PilotPortal';
import {
  aiAdminApi,
  aiProviders,
  aiTasks,
  type AIAdminBoard,
  type AIDraft,
  type AIModelView,
  type AIPendingDraft,
  type AITask,
  type AIProviderId,
} from './api';

// Do not round a non-zero micro-USD cap to zero in editable fields or usage displays.
const dollars = (micros: string | number) => (Number(micros) / 1_000_000).toFixed(6);
const micro = (value: string) => Math.round(Number(value) * 1_000_000);
const nice = (value: string) => value.replaceAll('_', ' ');
const nearCap = (used: string | number, limit: string | number) =>
  Number(limit) > 0 && Number(used) / Number(limit) >= 0.8;
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The operation was not confirmed. Check the server state before retrying.';
}

export function AIAdminPage() {
  const { user } = usePilotContext();
  const [board, setBoard] = useState<AIAdminBoard | null>(null);
  const [drafts, setDrafts] = useState<AIPendingDraft[]>([]);
  const [latest, setLatest] = useState<AIDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(async () => {
    const [current, pending] = await Promise.all([aiAdminApi.board(), aiAdminApi.drafts()]);
    setBoard(current);
    setDrafts(pending.drafts);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([aiAdminApi.board(), aiAdminApi.drafts()])
      .then(([current, pending]) => {
        if (active) {
          setBoard(current);
          setDrafts(pending.drafts);
          setError('');
        }
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  async function execute(name: string, action: () => Promise<unknown>, message: string) {
    setBusy(name);
    setError('');
    setNotice('');
    try {
      await action(); // A confirmation is shown only after the server returns success.
      await refresh();
      setNotice(message);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy('');
    }
  }
  if (user.role !== 'reviewer')
    return (
      <Card className="p-7">
        <p>AI provider administration requires an authorised adult reviewer.</p>
      </Card>
    );
  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="amber">Private adult/internal · synthetic data only</Badge>
          <h2 className="mt-3 font-display text-3xl text-heading">AI provider operations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-body">
            Server-authorised configuration; no provider is live by default. This screen does not
            accept keys. A configured key is not a successful API test or permission for real
            learners.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setRevision((value) => value + 1)}
          disabled={!!busy}
        >
          Refresh observed state
        </Button>
      </div>
      {error && (
        <InfoBox tone="amber" role="alert">
          {error}
        </InfoBox>
      )}
      {notice && (
        <InfoBox tone="green" role="status">
          {notice}
        </InfoBox>
      )}
      {loading && (
        <Card className="p-6" role="status">
          Checking private AI configuration…
        </Card>
      )}
      {!loading && !board && (
        <Card className="p-7">
          <h3 className="font-display text-xl text-heading">Administration unavailable</h3>
          <p className="mt-2 text-body">
            No configuration or provider status was returned. The gateway remains closed.
          </p>
          <Link to="/pilot" className={buttonStyles('outline', 'sm', 'mt-4')}>
            Return to pilot
          </Link>
        </Card>
      )}
      {board && (
        <>
          <InfoBox tone="amber">
            <strong>Not production-ready.</strong> Only synthetic prompts from adult reviewers are
            allowed. Gemini needs a separate terms decision for a platform that may serve under-18s.
            NVIDIA developer endpoints are for prototyping; their hosted trial may retain
            prompt/output data. Manual privacy, legal, MFA, accessibility, security and
            real-provider checks still block release.
          </InfoBox>
          <div className="grid gap-5 lg:grid-cols-2">
            <BudgetCard board={board} busy={busy} execute={execute} />
            <Card className="p-6">
              <h3 className="font-display text-2xl text-heading">Today’s observed usage (UTC)</h3>
              <p className="mt-2 text-sm text-body">
                {board.platform.attempts} provider attempts · $
                {dollars(board.platform.estimated_cost_microusd)} reserved estimate.
              </p>
              {nearCap(
                board.platform.estimated_cost_microusd,
                board.settings.daily_budget_microusd,
              ) && (
                <p className="mt-2 font-bold text-amber-700" role="status">
                  Global daily estimated-cost cap ≥80% used.
                </p>
              )}
              <p className="mt-2 text-xs text-body">
                Highest private reviewer use today: {board.userPeak.peak_requests} requests and{' '}
                {board.userPeak.peak_tokens} reserved tokens. No identities are shown here.
              </p>
              {(nearCap(board.userPeak.peak_requests, board.settings.user_daily_requests) ||
                nearCap(board.userPeak.peak_tokens, board.settings.user_daily_tokens)) && (
                <p className="mt-2 font-bold text-amber-700" role="status">
                  At least one reviewer has used ≥80% of a per-user daily quota.
                </p>
              )}
              <p className="mt-2 text-xs text-subdued">
                Amounts are budget reservations, not invoices. Timeout costs can be unknown;
                reconcile with each provider.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-body">
                {aiProviders.map((provider) => {
                  const limit = board.limits.find((value) => value.provider === provider);
                  const used = board.usage.find((value) => value.provider === provider);
                  const alerts = [
                    nearCap(used?.attempts ?? 0, limit?.daily_requests ?? 0) && 'requests',
                    nearCap(used?.reserved_tokens ?? 0, limit?.daily_tokens ?? 0) && 'tokens',
                    nearCap(
                      used?.estimated_cost_microusd ?? 0,
                      limit?.daily_budget_microusd ?? 0,
                    ) && 'estimated cost',
                  ].filter(Boolean);
                  return (
                    <li key={provider} className="rounded-lg bg-raised p-3">
                      <strong className="capitalize text-heading">{provider}</strong> ·{' '}
                      {used?.attempts ?? 0}/{limit?.daily_requests ?? 0} daily attempts
                      {alerts.length > 0 && (
                        <span className="ml-2 font-bold text-amber-700" role="status">
                          Quota alert: {alerts.join(', ')} ≥80%
                        </span>
                      )}
                      <span className="block text-xs">
                        Reserved {used?.reserved_tokens ?? '0'} tokens · $
                        {dollars(used?.estimated_cost_microusd ?? 0)} estimate · server adapter{' '}
                        {board.credentialPresence[provider] ? 'configured' : 'incomplete'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
          <section aria-labelledby="ai-provider-limits" className="space-y-4">
            <h3 id="ai-provider-limits" className="font-display text-2xl text-heading">
              Provider-specific caps
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {board.limits.map((limit) => (
                <ProviderLimit key={limit.provider} limit={limit} busy={busy} execute={execute} />
              ))}
            </div>
          </section>
          <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]" aria-labelledby="ai-models">
            <div className="space-y-4">
              <h3 id="ai-models" className="font-display text-2xl text-heading">
                Models and health
              </h3>
              {!board.models.length && (
                <Card className="p-6">
                  <p>No models configured. Every route is closed.</p>
                </Card>
              )}
              {board.models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  credential={board.credentialPresence[model.provider]}
                  busy={busy}
                  execute={execute}
                />
              ))}
            </div>
            <AddModel busy={busy} execute={execute} />
          </section>
          <RoutesCard board={board} busy={busy} execute={execute} />
          <section className="grid gap-5 lg:grid-cols-2" aria-labelledby="ai-drafts-heading">
            <div>
              <h3 id="ai-drafts-heading" className="font-display text-2xl text-heading">
                Reviewer draft request
              </h3>
              <DraftRequest busy={busy} execute={execute} latest={latest} setLatest={setLatest} />
            </div>
            <Card className="p-6">
              <h3 className="font-display text-2xl text-heading">Independent reuse review</h3>
              <p className="mt-2 text-sm text-body">
                A different AI administrator may review a generic explanation for temporary internal
                caching. This never publishes a lesson or awards credit.
              </p>
              {!drafts.length && (
                <p className="mt-4 text-sm text-subdued">No unreviewed drafts observed.</p>
              )}
              <ul className="mt-4 space-y-4">
                {drafts.map((draft) => (
                  <li className="rounded-lg border border-line p-4" key={draft.id}>
                    <strong className="text-heading">
                      {nice(draft.task)} · {draft.provider}
                    </strong>
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs text-body">
                      Synthetic input: {draft.input_text}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-body">
                      Draft: {draft.content}
                    </p>
                    {draft.task === 'explanation' && draft.created_by !== user.id && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        loading={busy === `reuse-${draft.id}`}
                        disabled={!!busy}
                        onClick={() =>
                          void execute(
                            `reuse-${draft.id}`,
                            () => aiAdminApi.reviewForReuse(draft.id),
                            'Explanation approved for short-lived internal reuse; not published.',
                          )
                        }
                      >
                        Review for internal reuse
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
          <Card className="p-6">
            <h3 className="font-display text-xl text-heading">Recent provider attempts</h3>
            <ul className="mt-3 space-y-1 text-sm text-body">
              {board.recent.length ? (
                board.recent.map((row, i) => (
                  <li key={`${row.created_at}-${i}`}>
                    {new Date(row.created_at).toLocaleString()} · {row.provider} / {row.model_id} ·{' '}
                    {nice(row.state)}
                  </li>
                ))
              ) : (
                <li>No provider call has been recorded.</li>
              )}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

type Execute = (name: string, action: () => Promise<unknown>, message: string) => Promise<void>;
function BudgetCard({
  board,
  busy,
  execute,
}: {
  board: AIAdminBoard;
  busy: string;
  execute: Execute;
}) {
  const settings = board.settings;
  const [budget, setBudget] = useState(dollars(settings.daily_budget_microusd));
  const [requests, setRequests] = useState(String(settings.user_daily_requests));
  const [tokens, setTokens] = useState(String(settings.user_daily_tokens));
  const [maximum, setMaximum] = useState(String(settings.max_output_tokens));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void execute(
      'budget',
      () =>
        aiAdminApi.settings({
          dailyBudgetMicrousd: micro(budget),
          userDailyRequests: Number(requests),
          userDailyTokens: Number(tokens),
          maxOutputTokens: Number(maximum),
        }),
      'Private budget caps saved. No provider was activated.',
    );
  };
  return (
    <Card className="p-6">
      <h3 className="font-display text-2xl text-heading">Global and per-user caps</h3>
      <p className="mt-2 text-xs text-subdued">
        All zero by default; cost is a pessimistic USD estimate, not a provider-side billing cap.
      </p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Daily USD estimate cap" id="ai-global-budget">
          <Input
            id="ai-global-budget"
            type="number"
            min="0"
            max="1000"
            step="0.000001"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </Field>
        <Field label="Per-user attempts per day" id="ai-user-requests">
          <Input
            id="ai-user-requests"
            type="number"
            min="0"
            max="1000"
            required
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
          />
        </Field>
        <Field label="Per-user reserved tokens per day" id="ai-user-tokens">
          <Input
            id="ai-user-tokens"
            type="number"
            min="0"
            max="1000000"
            required
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
          />
        </Field>
        <Field label="Maximum output tokens per request" id="ai-max-output">
          <Input
            id="ai-max-output"
            type="number"
            min="64"
            max="1024"
            required
            value={maximum}
            onChange={(e) => setMaximum(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={busy === 'budget'} disabled={!!busy}>
          Save caps
        </Button>
      </form>
    </Card>
  );
}
function ProviderLimit({
  limit,
  busy,
  execute,
}: {
  limit: AIAdminBoard['limits'][number];
  busy: string;
  execute: Execute;
}) {
  const [requests, setRequests] = useState(String(limit.daily_requests));
  const [tokens, setTokens] = useState(String(limit.daily_tokens));
  const [usd, setUsd] = useState(dollars(limit.daily_budget_microusd));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void execute(
      `limit-${limit.provider}`,
      () =>
        aiAdminApi.providerLimits(limit.provider, {
          dailyRequests: Number(requests),
          dailyTokens: Number(tokens),
          dailyBudgetMicrousd: micro(usd),
        }),
      `${limit.provider} caps saved; provider remains subject to key, terms and live verification.`,
    );
  };
  return (
    <Card className="p-5">
      <h4 className="font-bold capitalize text-heading">{limit.provider}</h4>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <Field label="Daily request attempts" id={`limit-r-${limit.provider}`}>
          <Input
            id={`limit-r-${limit.provider}`}
            type="number"
            min="0"
            max="100000"
            required
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
          />
        </Field>
        <Field label="Daily reserved tokens" id={`limit-t-${limit.provider}`}>
          <Input
            id={`limit-t-${limit.provider}`}
            type="number"
            min="0"
            max="100000000"
            required
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
          />
        </Field>
        <Field label="Daily USD estimate cap" id={`limit-usd-${limit.provider}`}>
          <Input
            id={`limit-usd-${limit.provider}`}
            type="number"
            min="0"
            max="1000"
            step="0.000001"
            required
            value={usd}
            onChange={(e) => setUsd(e.target.value)}
          />
        </Field>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={busy === `limit-${limit.provider}`}
          disabled={!!busy}
        >
          Save {limit.provider} caps
        </Button>
      </form>
    </Card>
  );
}
function AddModel({ busy, execute }: { busy: string; execute: Execute }) {
  const [provider, setProvider] = useState<AIProviderId>('nvidia');
  const [modelId, setModelId] = useState('');
  const [evidence, setEvidence] = useState('');
  const [context, setContext] = useState('');
  const [output, setOutput] = useState('');
  const [inputUsd, setInputUsd] = useState('');
  const [outputUsd, setOutputUsd] = useState('');
  const [tasks, setTasks] = useState<AITask[]>([]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void execute(
      'model',
      () =>
        aiAdminApi.addModel({
          provider,
          modelId,
          allowedTasks: tasks,
          maxContextTokens: Number(context),
          maxOutputTokens: Number(output),
          inputPriceMicrousdPerMillion: micro(inputUsd),
          outputPriceMicrousdPerMillion: micro(outputUsd),
          evidenceUrl: evidence,
        }),
      'Documented model saved DISABLED. Record a terms decision and verify a real API call before enablement.',
    );
  };
  return (
    <Card className="p-6">
      <h3 className="font-display text-2xl text-heading">Add documented text model</h3>
      <p className="mt-2 text-xs text-subdued">
        Do not enter API keys. Confirm exact ID, text input/output, context, price, licence, quota
        and supported tasks on its official model page. Vision, tools and file uploads remain
        disabled.
      </p>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Field label="Provider" id="ai-provider">
          <select
            className="field"
            id="ai-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProviderId)}
          >
            {aiProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Exact model ID" id="ai-model-id">
          <Input
            id="ai-model-id"
            required
            maxLength={150}
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="Copy the exact ID from official docs"
          />
        </Field>
        <Field label="Official model-capability page (HTTPS)" id="ai-evidence">
          <Input
            id="ai-evidence"
            type="url"
            required
            maxLength={500}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reviewed context tokens" id="ai-context">
            <Input
              id="ai-context"
              required
              type="number"
              min="1024"
              max="1000000"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </Field>
          <Field label="Reviewed max output tokens" id="ai-output">
            <Input
              id="ai-output"
              required
              type="number"
              min="64"
              max="32768"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
          </Field>
          <Field label="Input USD per 1M tokens" id="ai-input-usd">
            <Input
              id="ai-input-usd"
              required
              type="number"
              min="0"
              step="0.000001"
              value={inputUsd}
              onChange={(e) => setInputUsd(e.target.value)}
            />
          </Field>
          <Field label="Output USD per 1M tokens" id="ai-output-usd">
            <Input
              id="ai-output-usd"
              required
              type="number"
              min="0"
              step="0.000001"
              value={outputUsd}
              onChange={(e) => setOutputUsd(e.target.value)}
            />
          </Field>
        </div>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="font-bold text-heading">Reviewed text task capabilities</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {aiTasks.map((task) => (
              <label key={task} className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={tasks.includes(task)}
                  onChange={(e) =>
                    setTasks((prior) =>
                      e.target.checked ? [...prior, task] : prior.filter((t) => t !== task),
                    )
                  }
                />
                {nice(task)}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={!!busy || tasks.length === 0} loading={busy === 'model'}>
          Save disabled model
        </Button>
      </form>
    </Card>
  );
}
function ModelCard({
  model,
  credential,
  busy,
  execute,
}: {
  model: AIModelView;
  credential: boolean;
  busy: string;
  execute: Execute;
}) {
  const [decision, setDecision] = useState('');
  const terms = !!model.terms_approved_at;
  const verified = model.verifiedForCurrentConfig;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="break-all text-heading">
          {model.provider} / {model.model_id}
        </strong>
        <Badge tone={model.enabled && verified ? 'green' : 'amber'}>
          {model.enabled
            ? verified
              ? 'private-enabled'
              : 'blocked · retest required'
            : 'disabled'}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-body">
        {model.allowed_tasks.map(nice).join(' · ')} · context {model.max_context_tokens} · output{' '}
        {model.max_output_tokens}
      </p>
      <p className="mt-2 text-xs text-body">
        Input ${dollars(model.input_price_microusd_per_million)} / output $
        {dollars(model.output_price_microusd_per_million)} per 1M tokens (reviewed estimate)
      </p>
      <p className="mt-2 text-xs text-body">
        Server adapter {credential ? 'configured' : 'incomplete'} · terms{' '}
        {terms ? 'recorded' : 'not recorded'} · real API{' '}
        {verified
          ? `verified for current server configuration ${new Date(model.verified_at!).toLocaleDateString()}`
          : model.verified_at
            ? 'retest required: server key/endpoint changed or verification expired'
            : 'not tested'}{' '}
        · last health {nice(model.last_status)}
        {model.last_checked_at ? ` (${new Date(model.last_checked_at).toLocaleString()})` : ''}
      </p>
      <a
        className="mt-2 inline-block break-all text-xs font-bold text-brand-600 underline"
        href={model.evidence_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Official capability source
      </a>
      {!terms && (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(
              `terms-${model.id}`,
              () => aiAdminApi.terms(model.id, decision),
              'Operator terms reference recorded; no live test or launch approved.',
            );
          }}
        >
          <Field id={`terms-ref-${model.id}`} label="Restricted legal/terms decision reference">
            <Input
              id={`terms-ref-${model.id}`}
              required
              minLength={8}
              maxLength={250}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Internal approval ticket, not a secret"
            />
          </Field>
          <Button type="submit" size="sm" variant="outline" disabled={!!busy}>
            Record reviewed terms
          </Button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy || !terms || !credential || model.provider === 'gemini'}
          loading={busy === `verify-${model.id}`}
          onClick={() => {
            if (
              window.confirm(
                'This makes a real, possibly billable request with synthetic text. Is the owner-approved live-test flag on?',
              )
            )
              void execute(
                `verify-${model.id}`,
                () => aiAdminApi.verify(model.id),
                'A real provider response was validated for synthetic development only; model is still disabled.',
              );
          }}
        >
          Test live (may incur cost)
        </Button>
        <Button
          size="sm"
          variant={model.enabled ? 'danger' : 'outline'}
          disabled={
            !!busy ||
            (!model.enabled && (!terms || !verified || !credential || model.provider === 'gemini'))
          }
          loading={busy === `toggle-${model.id}`}
          onClick={() =>
            void execute(
              `toggle-${model.id}`,
              () => aiAdminApi.toggle(model.id, !model.enabled),
              model.enabled
                ? 'Model disabled.'
                : 'Model enabled for private synthetic reviewer drafts only.',
            )
          }
        >
          {model.enabled ? 'Disable model' : 'Enable private model'}
        </Button>
      </div>
    </Card>
  );
}
function RoutesCard({
  board,
  busy,
  execute,
}: {
  board: AIAdminBoard;
  busy: string;
  execute: Execute;
}) {
  const [task, setTask] = useState<AITask>('explanation');
  const [primary, setPrimary] = useState('');
  const [fallback, setFallback] = useState('');
  const choices = board.models.filter((model) => model.allowed_tasks.includes(task));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void execute(
      'route',
      () => aiAdminApi.route(task, primary, fallback || null),
      `Route for ${nice(task)} saved. Only enabled, recently verified models can execute.`,
    );
  };
  return (
    <Card className="p-6">
      <h3 className="font-display text-2xl text-heading">Task-specific primary and fallback</h3>
      <p className="mt-2 text-sm text-body">
        Routing changes do not bypass disabled models or the database budgets; no credentials or
        arbitrary URLs are accepted here.
      </p>
      <ul className="mt-3 text-xs text-body">
        {board.routes.length ? (
          board.routes.map((route) => (
            <li key={route.task}>
              <strong>{nice(route.task)}</strong>:{' '}
              {board.models.find((m) => m.id === route.primary_model)?.model_id ?? 'missing'} →{' '}
              {board.models.find((m) => m.id === route.fallback_model)?.model_id ?? 'none'}
            </li>
          ))
        ) : (
          <li>No task route configured. Generation is unavailable.</li>
        )}
      </ul>
      <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={submit}>
        <Field label="Task" id="ai-route-task">
          <select
            id="ai-route-task"
            className="field"
            value={task}
            onChange={(e) => {
              setTask(e.target.value as AITask);
              setPrimary('');
              setFallback('');
            }}
          >
            {aiTasks.map((t) => (
              <option key={t} value={t}>
                {nice(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary reviewed model" id="ai-route-primary">
          <select
            id="ai-route-primary"
            className="field"
            required
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          >
            <option value="">Select a model</option>
            {choices.map((m) => (
              <option value={m.id} key={m.id}>
                {m.provider} · {m.model_id}
                {m.enabled && m.verifiedForCurrentConfig
                  ? ''
                  : ' (inactive until enabled and verified)'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fallback reviewed model" id="ai-route-fallback">
          <select
            id="ai-route-fallback"
            className="field"
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
          >
            <option value="">No fallback</option>
            {choices
              .filter((m) => m.id !== primary)
              .map((m) => (
                <option value={m.id} key={m.id}>
                  {m.provider} · {m.model_id}
                  {m.enabled && m.verifiedForCurrentConfig
                    ? ''
                    : ' (inactive until enabled and verified)'}
                </option>
              ))}
          </select>
        </Field>
        <Button type="submit" disabled={!!busy || !primary} loading={busy === 'route'}>
          Save route
        </Button>
      </form>
    </Card>
  );
}
function DraftRequest({
  busy,
  execute,
  latest,
  setLatest,
}: {
  busy: string;
  execute: Execute;
  latest: AIDraft | null;
  setLatest: (draft: AIDraft | null) => void;
}) {
  const [task, setTask] = useState<AITask>('explanation');
  const [input, setInput] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void execute(
      'draft',
      async () => {
        const draft = await aiAdminApi.generate(task, input, requestId);
        setLatest(draft);
        setRequestId(crypto.randomUUID());
      },
      'Validated output saved as an unreviewed internal draft, not course credit.',
    );
  };
  return (
    <Card className="mt-4 p-6">
      <p className="text-sm text-body">
        No personal records, student submissions or assessment answers. The model cannot run code or
        change the curriculum. An unavailable provider returns an error, never fabricated output.
      </p>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Field label="Draft task" id="ai-draft-task">
          <select
            id="ai-draft-task"
            className="field"
            value={task}
            onChange={(e) => setTask(e.target.value as AITask)}
          >
            {aiTasks.map((t) => (
              <option value={t} key={t}>
                {nice(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Synthetic teaching request"
          id="ai-draft-input"
          hint="12–2400 characters; no names, emails, phone numbers, credentials or child records."
        >
          <textarea
            id="ai-draft-input"
            className="field min-h-32"
            minLength={12}
            maxLength={2400}
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={!!busy} loading={busy === 'draft'}>
          Request provider draft
        </Button>
        <p className="text-xs text-subdued">
          If the connection fails, retry uses the same request ID to check for a previously saved
          result; it never quietly makes a second paid request.
        </p>
      </form>
      {latest && (
        <div className="mt-5 rounded-xl bg-raised p-4" role="status">
          <Badge tone="amber">
            Unreviewed draft · {latest.cached ? 'reviewed cache copy' : latest.provider}
          </Badge>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-body">{latest.text}</p>
          <p className="mt-2 text-xs text-subdued">
            Model: {latest.model} · no learning credit or publication.
          </p>
        </div>
      )}
    </Card>
  );
}
