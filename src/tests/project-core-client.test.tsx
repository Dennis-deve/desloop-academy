import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReleaseRouter } from '@/app/ReleaseRouter';
import { parseDocument } from '@/features/pilot/project-core/document';
import { createProjectDraftVault } from '@/features/pilot/project-core/draft-vault';
import type { ProjectDetail } from '@/features/pilot/project-core/api';

const id = '87a07fb1-963f-4a34-8ef2-89044a82217e';
const learner = { id: 'd9c4a339-8d60-45a1-819a-31d708931cb3', displayName: 'Local Learner', email: 'learner@example.invalid', role: 'learner' };
const reviewer = { ...learner, role: 'reviewer' };
const listPath = '/api/pilot/project-core/v1/projects';
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><ReleaseRouter /></MemoryRouter>);
}
function baseFetch(role: 'learner' | 'reviewer' = 'learner') {
  return (url: string) => {
    if (url.endsWith('/status')) return json({ enabled: true, engineV2Enabled: false, audience: 'adult-internal', curriculum: 'draft', contentVersion: 'draft-1' });
    if (url.endsWith('/me')) return json({ user: role === 'learner' ? learner : reviewer });
    if (url.endsWith('/ai/admin/access')) return json({ error: 'AI_ADMIN_DENIED' }, 403);
    return null;
  };
}
function statefulApi(options: { rejectOnce?: boolean; conflictOnce?: boolean } = {}) {
  const documents: Record<number, Record<string, unknown>> = {};
  const attempts: { baseRevisionNo: number; requestId: string; document: Record<string, unknown>; assetIds: string[] }[] = [];
  let latest = 0;
  let rejectOnce = options.rejectOnce ?? false;
  let conflictOnce = options.conflictOnce ?? false;
  let denyNextOpen = false;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const base = baseFetch()(url);
    if (base) return base;
    if (url === listPath && (!init || init.method === 'GET'))
      return json({ projects: latest ? [{ id, title: 'Synthetic notebook', format: 'JSON_V1', visibility: 'private', latestRevisionNo: latest }] : [] });
    if (url === listPath && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { title: string; document: Record<string, unknown> };
      documents[1] = body.document;
      latest = 1;
      return json({ id, latestRevisionNo: 1, contentSha256: 'initial-hash', repeated: false }, 201);
    }
    const detail = (revisionNo: number) => json({
      project: { id, title: 'Synthetic notebook', format: 'JSON_V1', visibility: 'private', latestRevisionNo: latest },
      revision: { revisionNo, parentRevisionNo: revisionNo - 1, document: documents[revisionNo], contentSha256: `hash-${revisionNo}`, assets: [], createdAt: '2026-10-31T20:00:00Z' },
      authority: 'storage-only; never course completion or assessed credit',
    });
    if (url === `${listPath}/${id}` && (!init || init.method === 'GET')) {
      if (denyNextOpen) { denyNextOpen = false; return json({ error: 'NOT_FOUND' }, 404); }
      return detail(latest);
    }
    const history = url.match(new RegExp(`^${listPath}/${id}/revisions/([0-9]+)$`));
    if (history && (!init || init.method === 'GET')) return detail(Number(history[1]));
    if (url === `${listPath}/${id}/revisions` && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { baseRevisionNo: number; requestId: string; document: Record<string, unknown>; assetIds: string[] };
      attempts.push(body);
      if (rejectOnce) {
        rejectOnce = false;
        documents[++latest] = body.document; // Server committed, but the browser lost the response.
        throw new TypeError('connection lost');
      }
      if (options.rejectOnce && attempts.length > 1 && body.requestId === attempts[0].requestId)
        return json({ projectId: id, revisionNo: latest, contentSha256: `hash-${latest}`, repeated: true });
      if (conflictOnce) {
        conflictOnce = false;
        documents[++latest] = { notes: 'A second tab changed this' };
        return json({ error: 'REVISION_CONFLICT', message: 'Reload and compare the latest saved revision.' }, 409);
      }
      documents[++latest] = body.document;
      return json({ projectId: id, revisionNo: latest, contentSha256: `hash-${latest}`, repeated: false }, 201);
    }
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal('fetch', fetcher);
  document.cookie = 'desloop_pilot_csrf=synthetic-test-token; SameSite=Lax';
  return {
    fetcher, attempts, documents,
    advance(document: Record<string, unknown>) { documents[++latest] = document; },
    denyNextOpen() { denyNextOpen = true; },
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'desloop_pilot_csrf=; Max-Age=0';
});

function editJson(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Data-only JSON document' }), { target: { value: text } });
}
async function createProject(user: ReturnType<typeof userEvent.setup>) {
  open('/pilot/projects');
  expect(await screen.findByRole('heading', { name: 'Private project documents' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Pilot navigation' })).toHaveTextContent('Private project documents');
  await user.type(await screen.findByRole('textbox', { name: 'Project title' }), 'Synthetic notebook');
  await user.click(screen.getByRole('button', { name: 'Create and save revision 1' }));
  expect(await screen.findByRole('heading', { name: 'Edit your document' })).toBeInTheDocument();
}

describe('adult project client: server evidence, not browser-made progress', () => {
  it('rejects invalid/non-object/oversized data locally while the server remains authoritative', () => {
    expect(parseDocument('{bad').error).toMatch(/valid JSON/);
    expect(parseDocument('[]').error).toMatch(/JSON object/);
    expect(parseDocument(JSON.stringify({ note: 'a'.repeat(17_000) })).error).toMatch(/16 KiB/);
    expect(parseDocument('{"notes":"safe"}').document).toEqual({ notes: 'safe' });
  });
  it('hides a closed route and never offers create or save if the server returns 404', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      baseFetch()(String(input)) ?? json({ error: 'NOT_FOUND', message: 'Not available' }, 404));
    vi.stubGlobal('fetch', fetcher);
    open('/pilot/projects');
    expect(await screen.findByText('Private project storage is not available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create and save revision 1' })).toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'Pilot navigation' })).queryByRole('link', { name: 'Private project documents' })).toBeNull();
  });
  it('denies a direct URL to reviewers without fetching any project details', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const result = baseFetch('reviewer')(String(input));
      if (!result) throw new Error('An unauthorised project request was made');
      return result;
    });
    vi.stubGlobal('fetch', fetcher);
    open(`/pilot/projects/${id}`);
    expect(await screen.findByText('Private learner projects only')).toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => String(url).startsWith(listPath))).toBe(false);
  });
  it('creates, saves, reopens and reads history through authenticated same-origin requests', async () => {
    const user = userEvent.setup();
    const { fetcher, attempts } = statefulApi();
    await createProject(user);
    editJson('{"notes":"I revised my fictional work"}');
    expect(screen.getByText('Unsaved changes in this tab')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save new server revision' }));
    expect(await screen.findByText('Revision 2 was saved and reopened from the server.')).toBeInTheDocument();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].baseRevisionNo).toBe(1);
    expect(attempts[0].document).toEqual({ notes: 'I revised my fictional work' });
    expect(attempts[0].assetIds).toEqual([]);
    expect(fetcher).toHaveBeenCalledWith(`${listPath}/${id}/revisions`, expect.objectContaining({
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'synthetic-test-token' }),
    }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Revision number' }), '1');
    await user.click(screen.getByRole('button', { name: 'Open read-only revision' }));
    expect(await screen.findByRole('heading', { name: 'Historical revision 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Historical revision 1 JSON document' })).toHaveValue('{\n  "notes": ""\n}');
    expect(screen.getAllByText(/No official course credit/i).length).toBeGreaterThan(0);
  });
  it('keeps a stale draft, compares the latest, and requires an explicit acknowledgement before saving', async () => {
    const user = userEvent.setup();
    const { attempts } = statefulApi({ conflictOnce: true });
    await createProject(user);
    editJson('{"notes":"My local edits"}');
    await user.click(screen.getByRole('button', { name: 'Save new server revision' }));
    expect(await screen.findByRole('heading', { name: 'Compare before resolving' })).toBeInTheDocument();
    expect(screen.getByText('Not saved: revision 2 is now latest. Compare it with your unsaved document; your earlier version remains in history.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Latest server JSON document for comparison' })).toHaveValue('{\n  "notes": "A second tab changed this"\n}');
    expect(screen.getByRole('textbox', { name: 'Your unsaved JSON document for comparison' })).toHaveValue('{"notes":"My local edits"}');
    expect(attempts).toHaveLength(1);
    const resolve = screen.getByRole('button', { name: 'Save my text as a new revision' });
    expect(resolve).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /I compared both documents/ }));
    await user.click(resolve);
    expect(await screen.findByText('Revision 3 was saved and reopened from the server.')).toBeInTheDocument();
    expect(attempts).toHaveLength(2);
    expect(attempts[1].baseRevisionNo).toBe(2);
  });
  it('does not say saved on an uncertain network outcome; retry uses exactly the same request ID and bytes', async () => {
    const user = userEvent.setup();
    const { attempts } = statefulApi({ rejectOnce: true });
    await createProject(user);
    editJson('{"notes":"Unsure if this was committed"}');
    await user.click(screen.getByRole('button', { name: 'Save new server revision' }));
    expect(await screen.findByText(/Save outcome is unknown/)).toBeInTheDocument();
    expect(screen.queryByText(/saved and reopened/)).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Data-only JSON document' })).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Retry identical save request' }));
    expect(await screen.findByText(/Revision 2 was saved and reopened from the server \(identical request replay\)/)).toBeInTheDocument();
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(attempts[1]);
  });
  it('restores an unsaved edit only after another authenticated GET within the same pilot tab', async () => {
    const user = userEvent.setup();
    const { attempts, documents } = statefulApi();
    await createProject(user);
    editJson('{"notes":"Unsaved edit survives an internal route"}');
    await user.click(screen.getByRole('link', { name: 'Your private projects' }));
    expect(await screen.findByRole('heading', { name: 'Private project documents' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open saved document' }));
    expect(await screen.findByText(/Unsaved text was restored from this tab, not the server/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Data-only JSON document' })).toHaveValue('{"notes":"Unsaved edit survives an internal route"}');
    expect(screen.getByText('Unsaved changes in this tab')).toBeInTheDocument();
    expect(documents[1]).toEqual({ notes: '' });
    expect(attempts).toHaveLength(0);
  });
  it('requires comparison if the server changes while an in-tab unsaved edit is held', async () => {
    const user = userEvent.setup();
    const { advance, attempts } = statefulApi();
    await createProject(user);
    editJson('{"notes":"Keep this unsent text"}');
    await user.click(screen.getByRole('link', { name: 'Your private projects' }));
    expect(await screen.findByRole('heading', { name: 'Private project documents' })).toBeInTheDocument();
    advance({ notes: 'Server updated in another tab' });
    await user.click(screen.getByRole('link', { name: 'Open saved document' }));
    expect(await screen.findByRole('heading', { name: 'Compare before resolving' })).toBeInTheDocument();
    expect(screen.getByText(/Unsaved text was restored from this tab, but the server has a different revision/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your unsaved JSON document for comparison' })).toHaveValue('{"notes":"Keep this unsent text"}');
    expect(screen.getByText(/Server updated in another tab/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save new server revision' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save my text as a new revision' })).toBeDisabled();
    expect(attempts).toHaveLength(0);
  });
  it('does not disclose an in-memory draft if the server refuses the return GET', async () => {
    const user = userEvent.setup();
    const { denyNextOpen } = statefulApi();
    await createProject(user);
    editJson('{"notes":"Private unsent text"}');
    await user.click(screen.getByRole('link', { name: 'Your private projects' }));
    expect(await screen.findByRole('heading', { name: 'Private project documents' })).toBeInTheDocument();
    denyNextOpen();
    await user.click(screen.getByRole('link', { name: 'Open saved document' }));
    expect(await screen.findByText('This private document is unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Data-only JSON document' })).toBeNull();
    expect(screen.queryByText('Private unsent text')).toBeNull();
  });
  it('keeps the identical unknown-outcome save intent after in-pilot navigation', async () => {
    const user = userEvent.setup();
    const { attempts } = statefulApi({ rejectOnce: true });
    await createProject(user);
    editJson('{"notes":"The reply was lost"}');
    await user.click(screen.getByRole('button', { name: 'Save new server revision' }));
    expect(await screen.findByText(/Save outcome is unknown/)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Your private projects' }));
    expect(await screen.findByRole('heading', { name: 'Private project documents' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open saved document' }));
    expect(await screen.findByText(/last save outcome is unknown/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Data-only JSON document' })).toHaveAttribute('readonly');
    expect(screen.queryByText(/saved and reopened/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retry identical save request' }));
    expect(await screen.findByText(/Revision 2 was saved and reopened from the server \(identical request replay\)/)).toBeInTheDocument();
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(attempts[1]);
  });
  it('keeps in-memory drafts owner-bound and clears them on sign-out or account switch', () => {
    const vault = createProjectDraftVault();
    const base: ProjectDetail = {
      project: { id, title: 'Synthetic notebook', format: 'JSON_V1', visibility: 'private', latestRevisionNo: 1, createdAt: '', updatedAt: '' },
      revision: { revisionNo: 1, parentRevisionNo: 0, document: { notes: '' }, contentSha256: 'hash-1', assets: [], createdAt: '' },
      authority: 'storage-only; never course completion or assessed credit',
    };
    const saved = { base, text: '{"notes":"not saved"}', uncertainSave: null, needsReopen: false };
    vault.setOwner(learner.id);
    vault.write(learner.id, id, saved);
    expect(vault.hasUnsaved(learner.id)).toBe(true);
    expect(vault.read('another-adult', id)).toBeNull();
    vault.setOwner('another-adult');
    expect(vault.read(learner.id, id)).toBeNull();
    vault.setOwner(learner.id);
    expect(vault.read(learner.id, id)).toBeNull();
    vault.write(learner.id, id, saved);
    vault.setOwner(null);
    expect(vault.hasUnsaved(learner.id)).toBe(false);
  });
});
