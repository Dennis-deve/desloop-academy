import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileJson2, FolderLock, Save } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Eyebrow, Field, InfoBox, Input, buttonStyles } from '@/components/ui';
import { PilotApiError } from '../api';
import { usePilotContext } from '../PilotPortal';
import { projectCoreApi, type ProjectDetail, type ProjectSummary } from './api';
import type { ProjectSaveIntent as SaveIntent } from './draft-vault';
import { parseDocument, prettyDocument } from './document';

const initialDocument = '{\n  "notes": ""\n}';
type CreateIntent = { title: string; document: Record<string, unknown>; requestId: string };
function message(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
function unavailable(reason: unknown) {
  return reason instanceof PilotApiError && reason.status === 404;
}
function ownerOnly() {
  return <EmptyState
    icon={FolderLock}
    title="Private learner projects only"
    description="A server-authorised adult learner account is required. Reviewers cannot open or edit this storage."
  />;
}

/** This deliberately does not pretend to be a code/block editor or award course credit. */
export function ProjectListPage() {
  const { user } = usePilotContext();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState(initialDocument);
  const [validationError, setValidationError] = useState('');
  const [pending, setPending] = useState(false);
  const [uncertainCreate, setUncertainCreate] = useState<CreateIntent | null>(null);
  const sending = useRef(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    setError('');
    projectCoreApi.projects()
      .then((result) => {
        if (active) {
          setProjects(result.projects);
          setClosed(false);
        }
      })
      .catch((reason) => {
        if (active) {
          setClosed(unavailable(reason));
          setError(message(reason, 'Could not load your private projects.'));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.role, refresh]);

  async function sendCreate(intent: CreateIntent) {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError('');
    try {
      const result = await projectCoreApi.create(intent.title, intent.document, intent.requestId);
      setUncertainCreate(null);
      // Navigation will GET the actual server record; no local object becomes authoritative.
      navigate(`/pilot/projects/${result.id}`);
    } catch (reason) {
      if (reason instanceof PilotApiError && reason.status === 0) {
        setUncertainCreate(intent); // Freeze exactly the same bytes and request ID for a safe retry.
        setError('The connection was lost. Creation may have succeeded; retry the identical request to avoid a duplicate. Your draft is still in this tab.');
      } else {
        setUncertainCreate(null);
        setError(message(reason, 'The private project was not confirmed by the server.'));
      }
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    if (uncertainCreate || sending.current) return;
    const parsed = parseDocument(draft);
    if (parsed.document === null) { setValidationError(parsed.error); return; }
    if (!title.trim()) { setValidationError('Give this project a title first.'); return; }
    setValidationError('');
    void sendCreate({ title: title.trim(), document: parsed.document, requestId: crypto.randomUUID() });
  }
  if (user.role !== 'learner') return ownerOnly();
  return <div className="space-y-6">
    <Link to="/pilot" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200">
      <ArrowLeft className="h-4 w-4" /> Adult pilot
    </Link>
    <Card className="p-6 sm:p-8">
      <Eyebrow>Adult-only · operator-enabled private storage</Eyebrow>
      <h2 className="mt-2 font-display text-3xl text-heading">Private project documents</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-body">
        Create and revise a data-only JSON document in your account. Each confirmed save creates an
        immutable server revision. This is not a code runner, block editor, published portfolio,
        course assessment or backup service. Do not include real personal or confidential information.
      </p>
      <InfoBox tone="amber" className="mt-4">
        Synthetic adult/internal testing only. There is no approved retention/erasure or real-user
        access. Unsaved edits to an existing document can be recovered while this pilot stays open
        in the same tab, after a server check. Creating a new document is different: leaving this
        form discards its unsent title/text. Sign-out, reload or leaving the pilot discards all
        in-memory drafts; this is not offline or durable backup.
      </InfoBox>
    </Card>
    {loading ? <Card className="p-6" role="status">Checking private project storage…</Card>
      : closed ? <EmptyState
        icon={FolderLock}
        title="Private project storage is not available"
        description="The server has not enabled this private feature. Nothing here can be saved."
      />
        : error && !uncertainCreate ? <Card className="p-6">
          <InfoBox tone="amber" role="alert">{error}</InfoBox>
          <Button className="mt-4" variant="outline" onClick={() => setRefresh((value) => value + 1)}>Retry loading projects</Button>
        </Card>
          : <>
            <Card className="p-6 sm:p-8">
              <h3 className="font-display text-2xl text-heading">Create a private project</h3>
              <p className="mt-2 text-sm text-body">The first document is saved as revision 1 only when the server confirms it. Maximum 10 projects per account.</p>
              <form onSubmit={create} className="mt-5 space-y-4">
                <Field label="Project title" id="private-project-title">
                  <Input id="private-project-title" required minLength={1} maxLength={120}
                    value={title} readOnly={!!uncertainCreate || pending}
                    onChange={(event) => setTitle(event.target.value)} />
                </Field>
                <Field label="Data-only JSON document" id="private-project-initial-document"
                  hint="One JSON object, up to 16 KiB after parsing. No scripts are executed." error={validationError}>
                  <textarea id="private-project-initial-document" className="field min-h-40 w-full font-mono text-sm"
                    value={draft} readOnly={!!uncertainCreate || pending} maxLength={32768}
                    aria-invalid={!!validationError} aria-describedby={validationError ? 'private-project-initial-document-error' : undefined}
                    onChange={(event) => { setDraft(event.target.value); setValidationError(''); }} />
                </Field>
                {error && uncertainCreate && <InfoBox tone="amber" role="alert">{error}</InfoBox>}
                {uncertainCreate ? <Button type="button" onClick={() => void sendCreate(uncertainCreate)} loading={pending}>
                  Retry identical create request
                </Button> : <Button type="submit" loading={pending}>
                  Create and save revision 1 <ArrowRight className="h-4 w-4" />
                </Button>}
              </form>
            </Card>
            {projects.length === 0 ? <EmptyState icon={FileJson2} title="No private documents yet"
              description="Your account has no saved project documents. Use the form above to create one." />
              : <div className="grid gap-3 md:grid-cols-2">
                {projects.map((project) => <Card key={project.id} className="p-5">
                  <Badge tone="blue">Private · data only</Badge>
                  <h3 className="mt-3 text-lg font-bold text-heading">{project.title}</h3>
                  <p className="mt-2 text-xs text-body">Latest server revision {project.latestRevisionNo}</p>
                  <Link to={`/pilot/projects/${project.id}`}
                    className={buttonStyles('outline', 'md', 'mt-4')}>Open saved document <ArrowRight className="h-4 w-4" /></Link>
                </Card>)}
              </div>}
          </>}
  </div>;
}

export function ProjectDocumentPage() {
  const { user, projectDrafts } = usePilotContext();
  const { projectId = '' } = useParams();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState('');
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [uncertainSave, setUncertainSave] = useState<SaveIntent | null>(null);
  const [needsReopen, setNeedsReopen] = useState(false);
  const [conflict, setConflict] = useState<ProjectDetail | null>(null);
  const [compared, setCompared] = useState(false);
  const [revisionChoice, setRevisionChoice] = useState(1);
  const [historical, setHistorical] = useState<ProjectDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const sending = useRef(false);
  const inFlightSave = useRef<SaveIntent | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setDetail(null);
    setDraft('');
    setUncertainSave(null);
    setNeedsReopen(false);
    setConflict(null);
    setCompared(false);
    setHistorical(null);
    setError('');
    setNotice('');
    setLoading(true);
    setLoadError('');
    setClosed(false);
    const remembered = projectDrafts.read(user.id, projectId);
    // Never surface an in-memory copy before the real server authorises this GET.
    projectCoreApi.project(projectId)
      .then((latest) => {
        if (!active) return;
        setRevisionChoice(latest.revision.revisionNo);
        if (!remembered) {
          setDetail(latest);
          setDraft(prettyDocument(latest.revision.document));
          return;
        }
        const changed = remembered.base.revision.revisionNo !== latest.revision.revisionNo ||
          remembered.base.revision.contentSha256 !== latest.revision.contentSha256;
        const sameText = remembered.text === prettyDocument(latest.revision.document);
        if (remembered.uncertainSave) {
          setDetail(remembered.base);
          setDraft(remembered.text);
          setUncertainSave(remembered.uncertainSave);
          setNotice(`Unsaved text was restored from this tab. The server reports revision ${latest.revision.revisionNo}, but the last save outcome is unknown. Retry the identical request or check latest.`);
        } else if (changed && !sameText) {
          setDetail(remembered.base);
          setDraft(remembered.text);
          setConflict(latest);
          setNotice('Unsaved text was restored from this tab, but the server has a different revision. Compare before saving; nothing was merged.');
        } else if (!sameText) {
          setDetail(latest);
          setDraft(remembered.text);
          setNeedsReopen(remembered.needsReopen);
          setNotice('Unsaved text was restored from this tab, not the server. Sign-out, reload or leaving the pilot discards it.');
        } else {
          setDetail(latest);
          setDraft(prettyDocument(latest.revision.document));
          setNotice(`Reopened server revision ${latest.revision.revisionNo}; its text matches the in-tab copy. This does not prove which tab saved it.`);
          projectDrafts.forget(user.id, projectId);
        }
      })
      .catch((reason) => { if (active) {
        setClosed(unavailable(reason));
        setLoadError(message(reason, 'Could not open this private document.'));
      } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, user.id, user.role, refresh, projectDrafts]);

  const dirty = !!detail && draft !== prettyDocument(detail.revision.document);
  useEffect(() => {
    if (!detail || user.role !== 'learner' || detail.project.id !== projectId) return;
    const unresolved = uncertainSave ?? (pending ? inFlightSave.current : null);
    if (dirty || unresolved || needsReopen || conflict)
      projectDrafts.write(user.id, projectId, {
        base: detail, text: draft, uncertainSave: unresolved, needsReopen,
      });
    else projectDrafts.forget(user.id, projectId);
  }, [detail, draft, dirty, uncertainSave, pending, needsReopen, conflict, projectId, user.id, user.role, projectDrafts]);

  useEffect(() => {
    if (!dirty && !uncertainSave && !needsReopen) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uncertainSave, needsReopen]);
  useEffect(() => {
    if (!dirty && !uncertainSave && !needsReopen) return;
    // React Router links do not fire beforeunload. Guard ordinary links out of the
    // adult pilot, but don't claim to block all programmatic/history navigation.
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
          !(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (!link || (link instanceof HTMLAnchorElement && link.target === '_blank')) return;
      const destination = new URL(link.getAttribute('href')!, window.location.href);
      if ((destination.origin !== window.location.origin ||
           !(destination.pathname === '/pilot' || destination.pathname.startsWith('/pilot/'))) &&
          !window.confirm('Leave the adult pilot? Unsaved text in this tab will be discarded; it has not been saved to the server.')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('click', guard, true);
    return () => document.removeEventListener('click', guard, true);
  }, [dirty, uncertainSave, needsReopen]);

  async function sendSave(intent: SaveIntent) {
    if (sending.current) return;
    sending.current = true;
    inFlightSave.current = intent;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await projectCoreApi.save(projectId, intent.baseRevisionNo,
        intent.document, intent.assetIds, intent.requestId);
      setUncertainSave(null);
      setConflict(null);
      setCompared(false);
      setNotice(`Revision ${result.revisionNo} was accepted by the server. Checking the saved copy…`);
      try {
        const latest = await projectCoreApi.project(projectId);
        if (latest.revision.revisionNo === result.revisionNo &&
            latest.revision.contentSha256 === result.contentSha256) {
          setDetail(latest);
          setDraft(prettyDocument(latest.revision.document));
          setRevisionChoice(latest.revision.revisionNo);
          setHistorical(null);
          setNeedsReopen(false);
          setNotice(`Revision ${result.revisionNo} was saved and reopened from the server${result.repeated ? ' (identical request replay)' : ''}.`);
        } else {
          setConflict(latest);
          setNeedsReopen(false);
          setNotice(`Revision ${result.revisionNo} was accepted, but another revision is now latest. Compare before saving again.`);
        }
      } catch (reason) {
        setNeedsReopen(true);
        setError(`The server accepted revision ${result.revisionNo}, but reopening failed: ${message(reason, 'Connection unavailable.')}. Keep your text and check the latest before another save.`);
      }
    } catch (reason) {
      if (reason instanceof PilotApiError && reason.code === 'REVISION_CONFLICT') {
        setUncertainSave(null);
        setCompared(false);
        try {
          const latest = await projectCoreApi.project(projectId);
          setConflict(latest);
          setError(`Not saved: revision ${latest.revision.revisionNo} is now latest. Compare it with your unsaved document; your earlier version remains in history.`);
        } catch (refreshError) {
          setNeedsReopen(true);
          setError(`Not saved: another revision exists, and fetching it failed: ${message(refreshError, 'Connection unavailable.')}. Your draft is still here.`);
        }
      } else if (reason instanceof PilotApiError && reason.status === 0) {
        setUncertainSave(intent);
        setError('Save outcome is unknown. Retry the identical request, or check the latest saved revision before you make another save. Your draft is still in this tab.');
      } else {
        setUncertainSave(null);
        setError(`Not saved: ${message(reason, 'The private server rejected the revision.')}`);
      }
    } finally {
      inFlightSave.current = null;
      sending.current = false;
      setPending(false);
    }
  }
  function save(event?: FormEvent) {
    event?.preventDefault();
    if (!detail || sending.current || uncertainSave || needsReopen || conflict) return;
    const parsed = parseDocument(draft);
    if (parsed.document === null) { setError(`Not saved: ${parsed.error}`); return; }
    if (!dirty) { setNotice('Nothing changed since the server revision.'); return; }
    void sendSave({
      baseRevisionNo: detail.revision.revisionNo, document: parsed.document,
      assetIds: detail.revision.assets.map((asset) => asset.id), requestId: crypto.randomUUID(),
    });
  }
  async function checkLatest() {
    if (sending.current) return;
    setPending(true);
    setError('');
    try {
      const latest = await projectCoreApi.project(projectId);
      setUncertainSave(null);
      setNeedsReopen(false);
      if (detail && (draft !== prettyDocument(latest.revision.document) ||
          detail.revision.revisionNo !== latest.revision.revisionNo)) {
        setConflict(latest); // Never silently replace an unsaved or uncertain local draft.
        setCompared(false);
        setNotice(`Latest server revision is ${latest.revision.revisionNo}. Compare before you choose what to keep.`);
      } else {
        setDetail(latest);
        setDraft(prettyDocument(latest.revision.document));
        setConflict(null);
        setNotice(`Reopened server revision ${latest.revision.revisionNo}.`);
      }
    } catch (reason) {
      setError(`Could not check the latest server revision: ${message(reason, 'Connection unavailable.')}. Your draft is still here.`);
    } finally { setPending(false); }
  }
  function useLatest() {
    if (!conflict || !window.confirm('Discard the unsaved document in this tab and load the latest server revision?')) return;
    setDetail(conflict);
    setDraft(prettyDocument(conflict.revision.document));
    setRevisionChoice(conflict.revision.revisionNo);
    setConflict(null);
    setUncertainSave(null);
    setCompared(false);
    setError('');
    setNotice(`Loaded server revision ${conflict.revision.revisionNo}; local unsaved text was discarded.`);
  }
  function preserveDraft() {
    if (!conflict || !compared || sending.current) return;
    const parsed = parseDocument(draft);
    if (parsed.document === null) { setError(`Not saved: ${parsed.error}`); return; }
    setConflict(null);
    void sendSave({
      baseRevisionNo: conflict.revision.revisionNo, document: parsed.document,
      // Preserve the latest manifest; never silently detach another revision's images.
      assetIds: conflict.revision.assets.map((asset) => asset.id), requestId: crypto.randomUUID(),
    });
  }
  async function openHistory() {
    if (!detail || historyLoading) return;
    setHistoryLoading(true);
    setError('');
    try {
      setHistorical(await projectCoreApi.project(projectId, revisionChoice));
    } catch (reason) {
      setError(`Could not load historical revision: ${message(reason, 'Connection unavailable.')}`);
    } finally { setHistoryLoading(false); }
  }
  if (user.role !== 'learner') return ownerOnly();
  return <div className="space-y-6">
    <Link to="/pilot/projects"
      className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200">
      <ArrowLeft className="h-4 w-4" /> Your private projects
    </Link>
    {loading ? <Card className="p-7" role="status">Opening the server-owned document…</Card>
      : loadError || !detail ? <Card className="p-7">
        <EmptyState icon={FolderLock} title="This private document is unavailable"
          description={closed ? 'This private feature is disabled, or this account does not own the requested document. Nothing was opened.'
            : loadError || 'The server did not return a document owned by this account.'}
          action={closed ? <Link to="/pilot" className={buttonStyles('outline')}>Return to adult pilot</Link>
            : <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>Retry opening document</Button>} />
      </Card> : <>
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>Adult-only private document</Eyebrow>
            <Badge tone="blue">Revision {detail.revision.revisionNo} · server-owned</Badge>
          </div>
          <h2 className="mt-3 font-display text-3xl text-heading">{detail.project.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-body">
            JSON_V1 stores data, not executable code. Saved documents are private immutable revisions;
            no project action awards course credit. Do not include real personal data while this is a local synthetic-only pilot.
          </p>
          <p className="mt-3 break-all font-mono text-xs text-body">Server content SHA-256: {detail.revision.contentSha256}</p>
        </Card>
        <Card className="p-6 sm:p-8">
          <h3 className="font-display text-2xl text-heading">Edit your document</h3>
          <p className="mt-2 text-sm text-body">Unsaved edits stay only in this adult pilot tab and can be recovered when you return to this document, after checking the server. Sign-out, reload or leaving the pilot discards them. A lost connection is not a saved project.</p>
          <form onSubmit={save} className="mt-5 space-y-4">
            <Field label="Data-only JSON document" id="private-project-document"
              hint="One JSON object, up to 16 KiB after parsing; invalid input remains here for correction.">
              <textarea id="private-project-document" className="field min-h-64 w-full font-mono text-sm"
                value={draft} maxLength={32768} readOnly={pending || !!uncertainSave}
                onChange={(event) => { setDraft(event.target.value); setError(''); setNotice(''); }} />
            </Field>
            <p className="text-xs text-body" role="status">{dirty ? 'Unsaved changes in this tab' : 'Document matches the reopened server copy'}</p>
            {detail.revision.assets.length > 0 && <InfoBox tone="amber">
              {detail.revision.assets.length} image(s) in this saved revision are preserved in the next save.
              Image upload/management is not available in this client; do not treat image IDs as public URLs.
            </InfoBox>}
            {notice && <InfoBox tone="green" role="status" aria-live="polite">{notice}</InfoBox>}
            {error && <InfoBox tone="amber" role="alert">{error}</InfoBox>}
            <div className="flex flex-wrap gap-3">
              {uncertainSave ? <Button type="button" loading={pending}
                onClick={() => void sendSave(uncertainSave)}>Retry identical save request</Button>
                : <Button type="submit" loading={pending} disabled={!dirty || !!conflict || needsReopen}>
                  <Save className="h-4 w-4" /> Save new server revision
                </Button>}
              {(uncertainSave || needsReopen) && <Button variant="outline" type="button" disabled={pending}
                onClick={() => void checkLatest()}>Check latest saved revision</Button>}
            </div>
          </form>
        </Card>
        {conflict && <Card className="p-6 sm:p-8">
          <h3 className="font-display text-2xl text-heading">Compare before resolving</h3>
          <p className="mt-2 text-sm leading-7 text-body">
            The server's latest revision is {conflict.revision.revisionNo}; your tab began at
            revision {detail.revision.revisionNo}. No automatic merge or overwrite happened.
            Compare both documents and image counts before making a new revision.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <h4 className="font-bold text-heading">Your unsaved document</h4>
              <textarea readOnly rows={10} wrap="off" aria-label="Your unsaved JSON document for comparison"
                value={draft} className="mt-2 w-full min-w-0 resize-y overflow-auto rounded-xl bg-raised p-3 font-mono text-xs text-body focus-visible:outline-2 focus-visible:outline-brand-500" />
              <p className="mt-2 text-xs text-body">Base image count: {detail.revision.assets.length}</p>
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-heading">Latest server document</h4>
              <textarea readOnly rows={10} wrap="off" aria-label="Latest server JSON document for comparison"
                value={prettyDocument(conflict.revision.document)} className="mt-2 w-full min-w-0 resize-y overflow-auto rounded-xl bg-raised p-3 font-mono text-xs text-body focus-visible:outline-2 focus-visible:outline-brand-500" />
              <p className="mt-2 text-xs text-body">Latest image count: {conflict.revision.assets.length}</p>
            </div>
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-body">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600"
              checked={compared} onChange={(event) => setCompared(event.target.checked)} />
            I compared both documents. Saving my text will make a new revision from the latest one;
            it will not merge the other edits. The older revision stays in history.
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button disabled={!compared || pending} loading={pending} onClick={preserveDraft}>
              Save my text as a new revision
            </Button>
            <Button variant="outline" disabled={pending} onClick={useLatest}>
              Discard my text and load latest
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => void checkLatest()}>
              Refresh latest before deciding
            </Button>
          </div>
        </Card>}
        <Card className="p-6 sm:p-8">
          <h3 className="font-display text-2xl text-heading">Reopen an immutable revision</h3>
          <p className="mt-2 text-sm text-body">Historical documents are read-only. Opening one does not change your unsaved editor text.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Revision number" id="private-project-revision">
              <select id="private-project-revision" className="field" value={revisionChoice}
                onChange={(event) => setRevisionChoice(Number(event.target.value))}>
                {Array.from({ length: detail.project.latestRevisionNo }, (_, i) => i + 1).map((number) =>
                  <option key={number} value={number}>{number}</option>)}
              </select>
            </Field>
            <Button variant="outline" onClick={() => void openHistory()} loading={historyLoading}>Open read-only revision</Button>
          </div>
          {historical && <div className="mt-5 min-w-0 border-t border-line pt-5">
            <h4 className="font-bold text-heading">Historical revision {historical.revision.revisionNo}</h4>
            <p className="mt-2 break-all font-mono text-xs text-body">Server SHA-256: {historical.revision.contentSha256}</p>
            <textarea readOnly rows={10} wrap="off" aria-label={`Historical revision ${historical.revision.revisionNo} JSON document`}
              value={prettyDocument(historical.revision.document)} className="mt-3 w-full min-w-0 resize-y overflow-auto rounded-xl bg-raised p-3 font-mono text-xs text-body focus-visible:outline-2 focus-visible:outline-brand-500" />
            <Button variant="outline" className="mt-3" onClick={() => setHistorical(null)}>Close historical view</Button>
          </div>}
        </Card>
      </>}
  </div>;
}
