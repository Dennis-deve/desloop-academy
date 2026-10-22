import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Field,
  PageHeader,
  buttonStyles,
} from '@/components/ui';
import { useAuth, useDemo, useToast } from '@/app/providers';
import { lessonsFor, masterCourses, type MasterCourse } from '@/curriculum/model';
import {
  COURSE_POLICY,
  courseState,
  latestQuiz,
  lessonComplete,
  requestRevision,
  reviewProject,
  rubricScore,
} from '@/curriculum/progression';
import type { ReviewScores } from '@/curriculum/state';
import { DraftNotice } from './shared';

const normalFields: { id: keyof ReviewScores; label: string; weight: string }[] = [
  { id: 'practice', label: 'Guided practice quality', weight: '20% overall' },
  { id: 'project', label: 'Project / artefact rubric', weight: '40% overall · ≥70 required' },
  { id: 'reflection', label: 'Explanation and reflection', weight: '10% overall' },
  { id: 'safety', label: 'Safety and privacy', weight: '10% overall · critical pass required' },
];
const capstoneFields: { id: keyof ReviewScores; label: string; weight: string }[] = [
  { id: 'scope', label: 'Problem and scope', weight: '10%' },
  { id: 'project', label: 'Functionality', weight: '25%' },
  { id: 'design', label: 'Accessibility and design', weight: '15%' },
  { id: 'technical', label: 'Technical reasoning', weight: '15%' },
  { id: 'testing', label: 'Testing and revision', weight: '15%' },
  { id: 'safety', label: 'Safety and privacy', weight: '10% · critical pass required' },
  { id: 'presentation', label: 'Presentation and reflection', weight: '10%' },
];

export function CurriculumReviewPage() {
  const { session } = useAuth();
  const { state, actions } = useDemo();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pending = masterCourses.filter(
    (course) => courseState(course, state.curriculum) === 'review',
  );
  const selected = pending.find((course) => course.id === selectedId) ?? pending[0];
  return (
    <>
      <PageHeader
        eyebrow="Facilitator / classroom teacher · local demo"
        title="Required pathway reviews"
        description="Inspect the learner's project evidence, score the rubric and give actionable feedback. An unreviewed or unsafe submission never unlocks the next course."
        action={<Badge tone="purple">{pending.length} pending locally</Badge>}
      />
      <DraftNotice />
      <div className="mb-6 rounded-2xl border border-line bg-panel p-5 text-xs leading-6 text-body">
        <strong className="text-heading">Demonstration boundary:</strong> switching to this reviewer
        role is not authentication or authorisation. This preview shares one browser-local sample
        state; no real child work is routed to an adult. In production, reviewers need
        server-verified roles, assignment to the learner/school, scoped evidence access, a
        safeguarding policy and an audit trail.
      </div>
      {!selected ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No projects waiting in this browser"
          description="To exercise the preview, switch to Learner, complete Course 01's four lessons, score at least 80% on its quiz and submit a fictional project description. Then switch back to Facilitator or Classroom teacher."
          action={
            <Link to="/courses" className={buttonStyles('outline')}>
              View required pathway <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(200px,0.5fr)_minmax(0,1.5fr)]">
          <Card className="h-fit p-5">
            <Eyebrow>Waiting for review</Eyebrow>
            <ul className="mt-4 space-y-2">
              {pending.map((course) => (
                <li key={course.id}>
                  <button
                    type="button"
                    aria-current={selected.id === course.id ? 'true' : undefined}
                    onClick={() => setSelectedId(course.id)}
                    className={`w-full rounded-xl border p-3 text-left text-xs font-bold leading-5 ${selected.id === course.id ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100' : 'border-line text-body hover:bg-raised'}`}
                  >
                    Course {String(course.number).padStart(2, '0')}
                    <span className="mt-1 block font-normal">{course.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <ReviewForm
            key={selected.id}
            course={selected}
            reviewerRole={
              session?.role === 'classroom_teacher' ? 'classroom_teacher' : 'facilitator'
            }
            progress={state.curriculum}
            update={actions.updateCurriculum}
            onDone={() => setSelectedId(null)}
            toast={toast}
          />
        </div>
      )}
    </>
  );
}

function ReviewForm({
  course,
  reviewerRole,
  progress,
  update,
  onDone,
  toast,
}: {
  course: MasterCourse;
  reviewerRole: 'facilitator' | 'classroom_teacher';
  progress: ReturnType<typeof useDemo>['state']['curriculum'];
  update: ReturnType<typeof useDemo>['actions']['updateCurriculum'];
  onDone: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [scores, setScores] = useState<ReviewScores>({
    project: 80,
    practice: 80,
    reflection: 80,
    safety: 80,
    scope: 80,
    design: 80,
    technical: 80,
    testing: 80,
    presentation: 80,
  });
  const [safetyApproved, setSafetyApproved] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const evidence = progress.evidence[course.id];
  const quiz = latestQuiz(course, progress);
  const fields = course.number === 44 ? capstoneFields : normalFields;
  const result = rubricScore(course, quiz?.score ?? 0, scores);
  const returnForRevision = () => {
    if (feedback.trim().length < 10) {
      setError('Give specific, constructive feedback (at least 10 characters).');
      return;
    }
    update((current) => requestRevision(current, course.id, feedback));
    toast('Revision requested in this browser only. The next course stays locked.');
    onDone();
  };
  const approve = () => {
    if (feedback.trim().length < 10) {
      setError('Give specific, constructive feedback (at least 10 characters).');
      return;
    }
    if (
      !fields.every(
        (field) =>
          Number.isFinite(scores[field.id]) &&
          (scores[field.id] ?? -1) >= 0 &&
          (scores[field.id] ?? 101) <= 100,
      )
    ) {
      setError('Give each rubric criterion a valid number from 0 to 100.');
      return;
    }
    if (!safetyApproved || scores.safety < COURSE_POLICY.projectMinimum) {
      setError('Safety must be explicitly passed and score at least 70. Unsafe work cannot pass.');
      return;
    }
    if (
      result.project < COURSE_POLICY.projectMinimum ||
      result.overall < COURSE_POLICY.projectMinimum
    ) {
      setError(
        'Project rubric and overall score must each be at least 70%. Request revision instead.',
      );
      return;
    }
    setError('');
    update((current) =>
      reviewProject(current, course.id, scores, safetyApproved, feedback, reviewerRole),
    );
    toast('Demo reviewer decision recorded locally. No official completion was granted.');
    onDone();
  };
  return (
    <div className="space-y-5">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Eyebrow>Submission · Course {String(course.number).padStart(2, '0')}</Eyebrow>
            <h2 className="mt-2 font-display text-2xl text-heading">{course.title}</h2>
          </div>
          <Badge tone="purple">In review · demo</Badge>
        </div>
        <p className="mt-4 text-sm leading-7 text-body">{course.project.brief}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ['Quiz average', `${quiz?.score ?? 0}%`],
            [
              'Practice',
              `${lessonsFor(course).filter((lesson) => lessonComplete(course, lesson.id, progress)).length} / ${lessonsFor(course).length}`,
            ],
            ['Critical checks', quiz?.criticalPassed ? 'Passed' : 'Not passed'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-raised p-3">
              <dt className="text-xs font-bold text-body">{label}</dt>
              <dd className="mt-1 font-display text-lg text-heading">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-subdued">
              Project evidence ·{' '}
              {evidence.mode === 'typed' ? 'typed' : 'facilitator-recorded description'}
            </h3>
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-raised p-4 text-sm leading-7 text-body">
              {evidence.artefact}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-subdued">
              Reflection and testing
            </h3>
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-raised p-4 text-sm leading-7 text-body">
              {evidence.reflection}
            </p>
          </div>
          <p className="text-xs text-subdued">
            Privacy self-check:{' '}
            {evidence.safetyChecked ? 'learner checked · reviewer must still verify' : 'missing'} ·
            Browser-local only, not a real submission or message.
          </p>
        </div>
      </Card>
      <Card className="p-6 sm:p-8">
        <Eyebrow>Rubric · human judgement required</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-heading">Score, safeguard and respond.</h2>
        <p className="mt-2 text-xs leading-6 text-body">
          Enter 0–100 for each criterion.{' '}
          {course.number === 44
            ? 'The capstone uses its published seven-part weighted rubric.'
            : 'The overall preview score combines quiz 20%, practice 20%, project 40%, reflection 10% and safety 10%.'}{' '}
          Rubric thresholds are separate from the quiz and critical safety gates.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <Field
              key={field.id}
              id={`score-${field.id}`}
              label={`${field.label} · ${field.weight}`}
            >
              <input
                id={`score-${field.id}`}
                type="number"
                min={0}
                max={100}
                step={1}
                className="field"
                value={scores[field.id] ?? ''}
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [field.id]: event.target.value === '' ? NaN : Number(event.target.value),
                  }))
                }
              />
            </Field>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Badge tone={result.project >= COURSE_POLICY.projectMinimum ? 'green' : 'amber'}>
            Project rubric: {Number.isFinite(result.project) ? result.project : '—'}%
          </Badge>
          <Badge tone={result.overall >= COURSE_POLICY.projectMinimum ? 'blue' : 'amber'}>
            Overall preview: {Number.isFinite(result.overall) ? result.overall : '—'}%
          </Badge>
        </div>
        <label className="mt-5 flex items-start gap-3 text-xs leading-6 text-body">
          <input
            type="checkbox"
            checked={safetyApproved}
            onChange={(event) => setSafetyApproved(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
          />
          <span>
            <strong className="text-heading">Safety-critical checks passed.</strong> I inspected the
            fictional artefact for privacy, consent and unsafe instructions. A numerical safety
            score alone does not clear this gate.
          </span>
        </label>
        <div className="mt-5">
          <Field
            id="review-feedback"
            label="Specific feedback for the learner"
            error={error && feedback.trim().length < 10 ? error : undefined}
            hint="Describe one strength and one actionable next step; do not include private details."
          >
            <textarea
              className="field min-h-28"
              id="review-feedback"
              maxLength={3000}
              value={feedback}
              onChange={(event) => {
                setFeedback(event.target.value);
                setError('');
              }}
              placeholder="Your project shows... A useful next revision would be..."
            />
          </Field>
        </div>
        {error && feedback.trim().length >= 10 && (
          <p role="alert" className="mt-3 text-xs font-bold text-red-600 dark:text-red-200">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={approve}>
            <ShieldCheck className="h-4 w-4" /> Approve demo review
          </Button>
          <Button variant="outline" onClick={returnForRevision}>
            Request revision instead
          </Button>
        </div>
      </Card>
    </div>
  );
}
