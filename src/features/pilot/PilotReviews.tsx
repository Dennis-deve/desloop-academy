import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Eyebrow, InfoBox, buttonStyles } from '@/components/ui';
import { pilotApi, type PilotQueueItem } from './api';
import { usePilotContext } from './PilotPortal';

function AssignedReview({
  submission,
  onDone,
}: {
  submission: PilotQueueItem;
  onDone: () => void;
}) {
  const [rubric, setRubric] = useState<Record<string, number | undefined>>({});
  const [feedback, setFeedback] = useState('');
  const [safetyApproved, setSafetyApproved] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'revision_requested'>('revision_requested');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    if (submission.rubricDimensions.some((dimension) => rubric[dimension] === undefined)) {
      setError('Score every rubric dimension before making a decision.');
      setPending(false);
      return;
    }
    try {
      const scores = Object.fromEntries(
        submission.rubricDimensions.map((dimension) => [dimension, rubric[dimension]!]),
      ) as Record<string, number>;
      const response = await pilotApi.review(submission.id, {
        decision,
        rubric: scores,
        safetyApproved,
        feedback,
      });
      setResult(
        response.completed
          ? `Course passed in internal rehearsal: ${response.projectScore}% project, ${response.overallScore}% overall. ${response.nextCourseId ?? 'Final course completed.'}`
          : 'Revision recorded. The learner remains in the current course.',
      );
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record this review.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Eyebrow>Assigned human review · iteration {submission.iteration}</Eyebrow>
          <h3 className="mt-2 font-display text-2xl text-heading">{submission.courseTitle}</h3>
          <p className="mt-2 text-sm text-body">
            Learner: {submission.learner_name} · {submission.course_id} · draft {submission.version}
          </p>
        </div>
        <Badge tone="amber">Private submission</Badge>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-raised p-5">
          <h4 className="text-sm font-extrabold text-heading">Project evidence</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-body">
            {submission.artefact}
          </p>
        </div>
        <div className="rounded-2xl bg-raised p-5">
          <h4 className="text-sm font-extrabold text-heading">Learner reflection</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-body">
            {submission.reflection}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <fieldset>
          <legend className="text-sm font-extrabold text-heading">
            Score each dimension (0–100)
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {submission.rubricDimensions.map((dimension) => (
              <label key={dimension} className="text-xs font-bold capitalize text-heading">
                {dimension}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  className="field mt-2"
                  value={rubric[dimension] ?? ''}
                  onChange={(event) =>
                    setRubric((old) => ({
                      ...old,
                      [dimension]:
                        event.target.value === '' ? undefined : Number(event.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-sm leading-6 text-body">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-600"
            checked={safetyApproved}
            onChange={(event) => setSafetyApproved(event.target.checked)}
          />
          I have checked safety and privacy. An unchecked safety decision cannot award a pass.
        </label>
        <label className="block text-xs font-bold text-heading">
          Review decision
          <select
            className="field mt-2"
            value={decision}
            onChange={(event) => setDecision(event.target.value as typeof decision)}
          >
            <option value="revision_requested">Request revision within the same course</option>
            <option value="approved">Approve only if every gate passes</option>
          </select>
        </label>
        <label className="block text-xs font-bold text-heading">
          Specific learner feedback
          <textarea
            required
            minLength={10}
            maxLength={3000}
            className="field mt-2 min-h-28"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Explain what the learner can keep, change or test next…"
          />
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {result && (
          <div role="status">
            <InfoBox tone="green">{result}</InfoBox>
          </div>
        )}
        <Button type="submit" loading={pending}>
          Record server-side review <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-xs leading-6 text-body">
          The server independently checks the active version, four lessons, quiz ≥80%, critical
          safety answers, rubric project and overall ≥70%, safety ≥70%, and your assigned reviewer
          identity before it writes a completion.
        </p>
      </form>
    </Card>
  );
}

export function PilotReviewsPage() {
  const { user } = usePilotContext();
  const [queue, setQueue] = useState<PilotQueueItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (user.role !== 'reviewer') return;
    let active = true;
    setLoading(true);
    setError('');
    pilotApi
      .reviews()
      .then((result) => {
        if (active) setQueue(result.queue);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : 'Could not load your assigned reviews.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.role, revision]);
  if (user.role !== 'reviewer')
    return (
      <EmptyState
        title="Assigned reviewers only"
        description="Only an assigned reviewer account can open this server-owned queue."
        action={
          <Link to="/pilot" className={buttonStyles('primary')}>
            Back to your pathway
          </Link>
        }
      />
    );
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
        <div>
          <Eyebrow>Human decisions are required</Eyebrow>
          <h2 className="mt-2 font-display text-3xl text-heading">Your assigned projects</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-body">
            Only submissions explicitly assigned by a pilot operator appear here. No reviewer can
            award their own work, use a client role picker or approve an unsafe or below-threshold
            project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>
          Refresh queue
        </Button>
      </Card>
      {loading ? (
        <Card className="p-7" role="status">
          Loading your server-assigned review queue…
        </Card>
      ) : error ? (
        <div role="alert">
          <InfoBox tone="amber">{error}</InfoBox>
        </div>
      ) : queue.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing assigned to review"
            description="An operator must securely assign a submitted adult pilot project to this account. No work is self-assigned from the browser."
          />
        </Card>
      ) : (
        queue.map((submission) => (
          <AssignedReview
            key={submission.id}
            submission={submission}
            onDone={() => setRevision((value) => value + 1)}
          />
        ))
      )}
      <div className="flex items-start gap-2 text-xs text-body">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Reviews are saved to PostgreSQL with your account identity, scores, feedback and an audit
          event. Draft content remains an internal rehearsal until reviewed and formally published.
        </p>
      </div>
    </div>
  );
}
