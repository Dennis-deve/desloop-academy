import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReleaseRouter } from '@/app/ReleaseRouter';

const reviewer = {
  id: '73a045a9-b329-4303-96c7-ff7f407a907e',
  email: 'reviewer@example.invalid',
  displayName: 'Adult Reviewer',
  role: 'reviewer',
};
const board = {
  settings: {
    daily_budget_microusd: '100',
    user_daily_requests: 2,
    user_daily_tokens: 1000,
    max_output_tokens: 128,
  },
  models: [],
  routes: [],
  limits: ['gemini', 'groq', 'openrouter', 'cloudflare', 'nvidia', 'ollama'].map((provider) => ({
    provider,
    daily_requests: 10,
    daily_tokens: 100,
    daily_budget_microusd: '100',
  })),
  usage: [
    { provider: 'nvidia', attempts: 8, reserved_tokens: '81', estimated_cost_microusd: '82' },
  ],
  platform: { attempts: 8, estimated_cost_microusd: '90' },
  userPeak: { peak_requests: 2, peak_tokens: '801' },
  recent: [],
  credentialPresence: {
    gemini: false,
    groq: false,
    openrouter: false,
    cloudflare: false,
    nvidia: false,
    ollama: false,
  },
  scope: 'synthetic_dev_only',
  productionReady: false,
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
function stub(approved: boolean, formStatus = 200, boardContent: object = board) {
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = String(url);
    if (path.endsWith('/status'))
      return json({
        enabled: true,
        engineV2Enabled: false,
        audience: 'internal',
        curriculum: 'draft',
        contentVersion: 'draft-1',
      });
    if (path.endsWith('/me')) return json({ user: reviewer });
    if (path.endsWith('/ai/admin/access'))
      return approved
        ? json({ allowed: true })
        : json(
            {
              error: 'AI_ADMIN_DENIED',
              message: 'An authorised private AI administrator is required.',
            },
            403,
          );
    if (path.endsWith('/ai/admin') && !init?.body)
      return approved
        ? json(boardContent)
        : json(
            {
              error: 'AI_ADMIN_DENIED',
              message: 'An authorised private AI administrator is required.',
            },
            403,
          );
    if (path.endsWith('/ai/admin/drafts'))
      return approved
        ? json({ drafts: [] })
        : json(
            {
              error: 'AI_ADMIN_DENIED',
              message: 'An authorised private AI administrator is required.',
            },
            403,
          );
    if (path.endsWith('/ai/admin/settings') && init?.method === 'POST')
      return formStatus === 200
        ? json({ saved: true })
        : json({ error: 'AI_BUDGET_CLOSED', message: 'No settings change was saved.' }, formStatus);
    throw new Error(`Unexpected request ${path}`);
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReleaseRouter />
    </MemoryRouter>,
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'desloop_pilot_csrf=; Max-Age=0';
});

describe('private AI administration: UI cannot invent provider availability', () => {
  it('denies a direct URL to an ordinary reviewer and hides privileged navigation and controls', async () => {
    stub(false);
    open('/pilot/ai/admin');
    expect(await screen.findByText('Administration unavailable')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/authorised private AI administrator/i);
    const navigation = screen.getByRole('navigation', { name: 'Pilot navigation' });
    expect(within(navigation).queryByRole('link', { name: 'AI provider operations' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save caps' })).toBeNull();
  });
  it('shows only observed cost and threshold alerts, no fake enabled model or live result', async () => {
    const fetcher = stub(true);
    open('/pilot/ai/admin');
    expect(
      await screen.findByRole('heading', { name: 'AI provider operations' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No models configured. Every route is closed/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Global daily estimated-cost cap ≥80% used/)).toBeInTheDocument();
    expect(screen.getByText(/At least one reviewer has used ≥80%/)).toBeInTheDocument();
    expect(
      screen.getByText(/Quota alert: requests, tokens, estimated cost ≥80%/),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pilot navigation' })).toHaveTextContent(
      'AI provider operations',
    );
    expect(screen.getByText(/not invoices/i)).toBeInTheDocument();
    expect(screen.queryByText('Verified production AI')).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      '/api/pilot/ai/admin',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });
  it('does not call a changed credential/endpoint verified when a model record is enabled', async () => {
    const stale = {
      ...board,
      credentialPresence: { ...board.credentialPresence, nvidia: true },
      models: [
        {
          id: '8ae28ecc-73c8-4242-994d-6b898d44ff38',
          provider: 'nvidia',
          model_id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
          allowed_tasks: ['explanation'],
          max_context_tokens: 8192,
          max_output_tokens: 128,
          input_price_microusd_per_million: '100',
          output_price_microusd_per_million: '200',
          evidence_url: 'https://build.nvidia.com/models',
          terms_approved_at: '2026-10-22T10:00:00Z',
          verified_at: '2026-10-22T10:01:00Z',
          verifiedForCurrentConfig: false,
          enabled: true,
          last_status: 'ok',
          last_checked_at: null,
          cooldown_until: null,
        },
      ],
    };
    stub(true, 200, stale);
    open('/pilot/ai/admin');
    expect(await screen.findByText('blocked · retest required')).toBeInTheDocument();
    expect(
      screen.getByText(/retest required: server key\/endpoint changed or verification expired/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('private-enabled')).toBeNull();
  });
  it('does not confirm a rejected settings write and offers truthful error recovery', async () => {
    const user = userEvent.setup();
    const fetcher = stub(true, 409);
    document.cookie = 'desloop_pilot_csrf=synthetic-test-token; SameSite=Lax';
    open('/pilot/ai/admin');
    expect(
      await screen.findByRole('heading', { name: 'Global and per-user caps' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save caps' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No settings change was saved.');
    expect(screen.queryByText(/Private budget caps saved/)).toBeNull();
    expect(fetcher.mock.calls.some(([path]) => String(path).endsWith('/ai/admin/settings'))).toBe(
      true,
    );
  });
});
