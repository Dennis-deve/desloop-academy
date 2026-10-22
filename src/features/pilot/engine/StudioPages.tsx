import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Blocks, FolderLock, Play, Save } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Field,
  InfoBox,
  buttonStyles,
} from '@/components/ui';
import { usePilotContext } from '../PilotPortal';
import {
  engineApi,
  type StudioDetail,
  type StudioProject,
  type VisualDocument,
  type VisualFeedback,
  type VisualStep,
} from './api';

const initial: VisualDocument = { format: 'desloop-visual-v1', steps: [{ kind: 'START' }] };
const fresh = (kind: VisualStep['kind']): VisualStep =>
  kind === 'START'
    ? { kind: 'START' }
    : kind === 'SAY'
      ? { kind: 'SAY', text: '' }
      : kind === 'REPEAT'
        ? { kind: 'REPEAT', count: 2, text: '' }
        : { kind: 'CHOICE', prompt: '', yes: '', no: '' };

export function EngineStudioList() {
  const { user } = usePilotContext();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    engineApi
      .projects()
      .then((result) => {
        if (active) setProjects(result.projects);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Cannot load your private projects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.role]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await engineApi.create({
        scope: 'PLAYGROUND',
        title: title.trim(),
        requestId: crypto.randomUUID(),
      });
      navigate(`/pilot/engine/studio/projects/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the project.');
    } finally {
      setPending(false);
    }
  };
  if (user.role !== 'learner')
    return (
      <EmptyState
        title="Private learner projects only"
        description="Reviewers have only their assigned review queue."
      />
    );
  return (
    <div className="space-y-6">
      <Link
        to="/pilot/engine"
        className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" /> Draft-2 pathway
      </Link>
      <Card className="p-6 sm:p-8">
        <Eyebrow>Two different contexts</Eyebrow>
        <h2 className="mt-2 font-display text-3xl text-heading">Private visual playground</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-body">
          Create up to 20 private block stories and save up to 100 revisions per project. This
          portfolio is visible only to your adult-pilot account. It is
          <strong> free practice</strong>: no playground action awards a course pass or bypasses a
          lesson. The separate guided activity opens only at its required Course 08 lesson.
        </p>
        <form onSubmit={create} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Fictional project title" id="playground-title" className="flex-1">
            <input
              required
              id="playground-title"
              className="field"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="For example: A pretend train journey"
            />
          </Field>
          <Button type="submit" loading={pending}>
            Create private project <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
        {error && (
          <p role="alert" className="field-error mt-4">
            {error}
          </p>
        )}
      </Card>
      {loading ? (
        <Card className="p-6" role="status">
          Loading private projects…
        </Card>
      ) : projects.length === 0 ? (
        <Card className="p-7">
          <EmptyState
            icon={FolderLock}
            title="Your private portfolio is empty"
            description="Create a free-practice project above; guided projects appear here only after their course unlocks."
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <Badge tone={project.scope === 'GUIDED' ? 'blue' : 'neutral'}>
                  {project.scope === 'GUIDED' ? 'Guided lesson' : 'Free practice'}
                </Badge>
                <span className="text-xs text-body">
                  {project.latestRevision ? `Revision ${project.latestRevision}` : 'Not saved yet'}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-heading">{project.title}</h3>
              {project.scope === 'GUIDED' && (
                <p className="mt-1 text-xs text-body">
                  {project.courseId} · {project.lessonId}
                </p>
              )}
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
                to={`/pilot/engine/studio/projects/${project.id}`}
              >
                Open private work <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function EngineGuidedGateway() {
  const { courseId = '', lessonId = '' } = useParams();
  const { user } = usePilotContext();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Awaited<ReturnType<typeof engineApi.brief>> | null>(null);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([engineApi.brief(courseId, lessonId), engineApi.projects()])
      .then(([info, list]) => {
        if (active) {
          setBrief(info);
          setProject(
            list.projects.find(
              (p) => p.scope === 'GUIDED' && p.courseId === courseId && p.lessonId === lessonId,
            ) ?? null,
          );
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'This guided lesson is not open.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, lessonId, user.role]);
  const create = async () => {
    setPending(true);
    setError('');
    try {
      const result = await engineApi.create({
        scope: 'GUIDED',
        courseId,
        lessonId,
        title: 'Fictional story · required visual sequence',
        requestId: crypto.randomUUID(),
      });
      navigate(`/pilot/engine/studio/projects/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open the guided studio.');
    } finally {
      setPending(false);
    }
  };
  if (user.role !== 'learner')
    return (
      <EmptyState
        title="Learner-only guided work"
        description="An enrolled adult learner is required."
      />
    );
  return (
    <div className="space-y-6">
      <Link
        to={`/pilot/engine/courses/${courseId}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" /> Return to required course
      </Link>
      {loading ? (
        <Card className="p-7" role="status">
          Checking the previous lesson and course gate…
        </Card>
      ) : error || !brief ? (
        <Card className="p-7">
          <EmptyState
            title="Guided lesson is not open"
            description={error || 'Complete earlier work first.'}
          />
        </Card>
      ) : (
        <Card className="p-7 sm:p-9">
          <Eyebrow>Required guided coding · Course 08</Eyebrow>
          <h2 className="mt-2 font-display text-3xl text-heading">{brief.criteria.title}</h2>
          <p className="mt-3 text-sm text-body">{brief.criteria.prompt}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-body">
            {brief.criteria.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          <InfoBox tone="amber" className="mt-5">
            Your saved blocks are evaluated by a bounded server interpreter. Only this guided
            project can count toward this lesson; playground projects cannot. This is an{' '}
            <strong>unpublished adult/internal draft</strong>, not official credit.
          </InfoBox>
          {project ? (
            <Link
              to={`/pilot/engine/studio/projects/${project.id}`}
              className={buttonStyles('primary', 'md', 'mt-5')}
            >
              Continue guided project <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Button className="mt-5" onClick={create} loading={pending}>
              Start guided visual project <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {error && (
            <p role="alert" className="field-error mt-3">
              {error}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

export function BlocksEditor({
  document,
  onChange,
  readOnly,
}: {
  document: VisualDocument;
  onChange: (next: VisualDocument) => void;
  readOnly: boolean;
}) {
  const replace = (index: number, step: VisualStep) =>
    onChange({ ...document, steps: document.steps.map((old, i) => (i === index ? step : old)) });
  const remove = (index: number) =>
    onChange({ ...document, steps: document.steps.filter((_, i) => i !== index) });
  const move = (index: number, target: number) => {
    if (target < 0 || target >= document.steps.length) return;
    const steps = [...document.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    onChange({ ...document, steps });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Block palette">
        {(['START', 'SAY', 'REPEAT', 'CHOICE'] as const).map((kind) => (
          <Button
            key={kind}
            variant="outline"
            size="sm"
            disabled={readOnly || document.steps.length >= 24}
            onClick={() => onChange({ ...document, steps: [...document.steps, fresh(kind)] })}
          >
            Add {kind.toLowerCase()} block
          </Button>
        ))}
      </div>
      <p className="text-xs leading-6 text-body">
        Keyboard-accessible block composer: add, edit, move or remove up to 24 declarative steps. It
        never executes user-written JavaScript. Saved revisions belong to your private adult pilot
        account.
      </p>
      <ol className="space-y-3">
        {document.steps.map((step, index) => (
          <li key={index} className="rounded-2xl border border-line bg-raised p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-extrabold text-heading">
                <Blocks className="h-4 w-4" /> {index + 1}. {step.kind.toLowerCase()} block
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={readOnly || index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label={`Move block ${index + 1} up`}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={readOnly || index === document.steps.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={`Move block ${index + 1} down`}
                >
                  ↓
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={readOnly || document.steps.length === 1}
                  onClick={() => remove(index)}
                  aria-label={`Remove block ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            </div>
            {step.kind === 'START' && (
              <p className="mt-2 text-xs text-body">An event begins the story.</p>
            )}
            {step.kind === 'SAY' && (
              <Field
                label={`Block ${index + 1}: spoken text (fictional)`}
                id={`block-${index}-say`}
                className="mt-3"
              >
                <input
                  id={`block-${index}-say`}
                  className="field"
                  required
                  maxLength={100}
                  disabled={readOnly}
                  value={step.text}
                  onChange={(e) => replace(index, { kind: 'SAY', text: e.target.value })}
                />
              </Field>
            )}
            {step.kind === 'REPEAT' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr]">
                <Field label={`Block ${index + 1}: repeats`} id={`block-${index}-count`}>
                  <select
                    className="field"
                    id={`block-${index}-count`}
                    disabled={readOnly}
                    value={step.count}
                    onChange={(e) => replace(index, { ...step, count: Number(e.target.value) })}
                  >
                    {[2, 3, 4].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Block ${index + 1}: repeat text`} id={`block-${index}-text`}>
                  <input
                    className="field"
                    id={`block-${index}-text`}
                    disabled={readOnly}
                    maxLength={100}
                    value={step.text}
                    onChange={(e) => replace(index, { ...step, text: e.target.value })}
                  />
                </Field>
              </div>
            )}
            {step.kind === 'CHOICE' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(['prompt', 'yes', 'no'] as const).map((key) => (
                  <Field
                    key={key}
                    label={`Block ${index + 1}: ${key === 'prompt' ? 'fictional question' : key === 'yes' ? 'yes message' : 'no message'}`}
                    id={`block-${index}-${key}`}
                  >
                    <input
                      className="field"
                      id={`block-${index}-${key}`}
                      disabled={readOnly}
                      maxLength={100}
                      value={step[key]}
                      onChange={(e) => replace(index, { ...step, [key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
function preview(document: VisualDocument) {
  return document.steps
    .flatMap((step) =>
      step.kind === 'START'
        ? ['Start event']
        : step.kind === 'SAY'
          ? [`Say: ${step.text}`]
          : step.kind === 'REPEAT'
            ? Array.from({ length: step.count }, () => `Say: ${step.text}`)
            : [`If ${step.prompt}: ${step.yes} / otherwise: ${step.no}`],
    )
    .slice(0, 100);
}

export function EngineStudioProjectPage() {
  const { projectId = '' } = useParams();
  const { user } = usePilotContext();
  const [record, setRecord] = useState<StudioDetail | null>(null);
  const [document, setDocument] = useState<VisualDocument>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [revisionNo, setRevisionNo] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<VisualFeedback | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    setError('');
    engineApi
      .studioProject(projectId)
      .then(async (value) => {
        if (!active) return;
        setRecord(value);
        const loaded = value.latest?.document ?? initial;
        setDocument(loaded);
        setSavedSnapshot(value.latest ? JSON.stringify(loaded) : '');
        setRevisionNo(value.latest?.revisionNo ?? null);
        if (value.project.scope === 'GUIDED') {
          try {
            await engineApi.brief(value.project.courseId ?? '', value.project.lessonId ?? '');
          } catch {
            if (active) setReadOnly(true);
          }
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Cannot load this private project.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, user.role]);
  const dirty = JSON.stringify(document) !== savedSnapshot;
  const save = async () => {
    if (readOnly) return;
    setPending(true);
    setError('');
    setMessage('');
    setFeedback(null);
    try {
      const result = await engineApi.save(projectId, document, crypto.randomUUID());
      setRevisionNo(result.revisionNo);
      setSavedSnapshot(JSON.stringify(document));
      setMessage(`Private revision ${result.revisionNo} saved on the server.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the revision.');
    } finally {
      setPending(false);
    }
  };
  const run = async () => {
    if (!revisionNo || dirty) {
      setError('Save your latest blocks before requesting a server check.');
      return;
    }
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await engineApi.run(projectId, revisionNo, crypto.randomUUID());
      setFeedback(result);
      setMessage(
        result.passed
          ? 'Guided criteria passed on the server. Return to the lesson check.'
          : 'Guided criteria need revision. Try again inside this same course.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not check this revision.');
    } finally {
      setPending(false);
    }
  };
  if (user.role !== 'learner')
    return (
      <EmptyState
        title="Learner-only studio"
        description="Only the project owner may see or edit private revisions."
      />
    );
  if (loading)
    return (
      <Card className="p-7" role="status">
        Opening your private saved blocks…
      </Card>
    );
  if (!record)
    return (
      <Card className="p-7">
        <EmptyState
          title="Private project unavailable"
          description={error || 'The server could not find a project belonging to this account.'}
        />
      </Card>
    );
  const guided = record.project.scope === 'GUIDED';
  const prior = record.lastRun?.revision_no === revisionNo ? record.lastRun : null;
  return (
    <div className="space-y-6">
      <Link
        to={guided ? `/pilot/engine/courses/${record.project.courseId}` : '/pilot/engine/studio'}
        className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" /> {guided ? 'Required course' : 'Private playground'}
      </Link>
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={guided ? 'blue' : 'neutral'}>
            {guided ? 'Guided, server-checked' : 'Free practice, not graded'}
          </Badge>
          <span className="text-xs text-body">
            Visibility: private ·{' '}
            {revisionNo ? `Saved revision ${revisionNo}` : 'No saved revision'}
          </span>
        </div>
        <h2 className="mt-3 font-display text-3xl text-heading">{record.project.title}</h2>
        <p className="mt-2 text-sm leading-7 text-body">
          {guided
            ? 'Put an event first, then two different fictional spoken steps. Save and check the latest revision; an approved run is needed before the lesson check.'
            : 'Explore safe stories without a score or prerequisite. Your saved work stays in your private adult-pilot portfolio.'}
        </p>
        {readOnly && (
          <InfoBox tone="amber" className="mt-4">
            This guided lesson is no longer open for changes. You can inspect the saved evidence but
            should use the playground for new practice.
          </InfoBox>
        )}
      </Card>
      <Card className="p-6 sm:p-8">
        <h3 className="font-display text-2xl text-heading">Build a block story</h3>
        <div className="mt-5">
          <BlocksEditor document={document} onChange={setDocument} readOnly={readOnly} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={save} disabled={!dirty || readOnly} loading={pending}>
            <Save className="h-4 w-4" /> Save private revision
          </Button>
          {guided && (
            <Button
              variant="outline"
              onClick={run}
              disabled={!revisionNo || dirty || readOnly}
              loading={pending}
            >
              <Play className="h-4 w-4" /> Check saved revision on server
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs leading-6 text-body">
          {dirty
            ? 'You have unsaved changes.'
            : 'Your current blocks match the latest saved revision.'}{' '}
          No blocks execute as JavaScript. Do not enter real names, links, phone numbers or emails.
        </p>
        {error && (
          <p role="alert" className="field-error mt-3">
            {error}
          </p>
        )}
        {message && (
          <InfoBox tone={feedback?.passed ? 'green' : 'blue'} role="status" className="mt-4">
            {message}
          </InfoBox>
        )}
        {guided && prior && !feedback && (
          <InfoBox tone={prior.passed ? 'green' : 'amber'} className="mt-4">
            Last saved-revision check: {prior.passed ? 'passed' : 'not yet passed'}.
          </InfoBox>
        )}
        {feedback && (
          <div className="mt-4 rounded-2xl border border-line bg-raised p-4" aria-live="polite">
            <h4 className="font-bold text-heading">Server-owned criteria feedback</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-body">
              {feedback.checks.map((check) => (
                <li key={check.id}>
                  {check.passed ? 'Passed' : 'Revise'}: {check.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      <Card className="p-6 sm:p-8">
        <h3 className="font-display text-2xl text-heading">Story trace</h3>
        <p className="mt-2 text-xs leading-6 text-body">
          Local read-only preview of your blocks, not a trusted grade. A guided pass comes only from
          the saved server-checked revision.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm text-body" aria-live="polite">
          {preview(document).map((line, index) => (
            <li key={index} className="break-words">
              {line}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
