import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Field,
  InfoBox,
  ProgressBar,
  buttonStyles,
} from '@/components/ui';
import { usePilotContext } from '../PilotPortal';
import { engineApi, type EngineDetail, type EnginePathway, type EngineReview } from './api';

const note =
  'Unpublished source-informed curriculum · invited adults only · internal progress, not an accredited qualification.';
const tone = (state: string) =>
  state === 'COMPLETED'
    ? ('green' as const)
    : state === 'NEEDS_REVISION' || state === 'FAILED_REMEDIATION'
      ? ('amber' as const)
      : state === 'LOCKED'
        ? ('neutral' as const)
        : ('blue' as const);
const label = (state: string) => state.replaceAll('_', ' ').toLowerCase();

export function EngineHome() {
  const { user } = usePilotContext();
  const [pathway, setPathway] = useState<EnginePathway | null>(null);
  const [tagFilter, setTagFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    setError('');
    engineApi
      .pathway()
      .then((value) => {
        if (active) setPathway(value);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Cannot load the new pathway.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.role, refresh]);
  if (user.role !== 'learner')
    return (
      <Card className="p-8">
        <EmptyState
          title="Learner pathway only"
          description="Assigned reviewers use the separate draft-2 review queue."
          action={
            <Link to="/pilot/engine/reviews" className={buttonStyles('primary')}>
              Go to reviews
            </Link>
          }
        />
      </Card>
    );
  return (
    <div className="space-y-7">
      <Link
        to="/pilot"
        className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" /> Original pilot overview
      </Link>
      <Card className="p-6 sm:p-8">
        <Eyebrow>Optional draft-2 adult/internal trial</Eyebrow>
        <h2 className="mt-2 font-display text-3xl text-heading">
          A new seven-state learning engine
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-body">
          {note} This is a separately operator-enrolled 44-course sequence. Earlier draft-1 pilot
          passes do not transfer automatically or unlock a later course.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/pilot/engine/studio" className={buttonStyles('outline')}>
            Private free-practice playground <ArrowRight className="h-4 w-4" />
          </Link>
          <Button variant="outline" onClick={() => setRefresh((n) => n + 1)}>
            <RefreshCw className="h-4 w-4" /> Refresh server progress
          </Button>
        </div>
      </Card>
      {loading ? (
        <Card className="p-7" role="status">
          Checking your version-pinned progress…
        </Card>
      ) : error ? (
        <InfoBox tone="amber" role="alert">
          {error} An operator must enrol invited adult testers using the <code>engine-enrol</code>{' '}
          CLI before this pathway opens.
        </InfoBox>
      ) : pathway ? (
        <>
          <Card className="p-6 sm:p-8">
            <Badge tone="blue">
              {pathway.contentVersion} · {pathway.policyVersion}
            </Badge>
            <h3 className="mt-3 font-display text-2xl text-heading">
              {pathway.completedCount} of 44 courses passed
            </h3>
            <ProgressBar
              className="mt-4 max-w-xl"
              value={Math.round((pathway.completedCount / 44) * 100)}
              label={`Draft-2 courses passed on server: ${pathway.completedCount} of 44`}
            />
            {pathway.currentCourseId && (
              <Link
                className={buttonStyles('primary', 'md', 'mt-5')}
                to={`/pilot/engine/courses/${pathway.currentCourseId}`}
              >
                Continue {pathway.currentCourseId} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </Card>
          <Card className="p-5">
            <Field
              label="Browse proposed strategy tags (not accreditation)"
              id="v2-tag-filter"
              hint="Display filter only. It never changes the required 01–44 order or unlocks a course."
            >
              <select
                id="v2-tag-filter"
                className="field max-w-md"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
              >
                <option value="ALL">Show all 44 required courses</option>
                <option value="GES_CCP">GES_CCP · proposed hints</option>
                <option value="CAMBRIDGE_0860">CAMBRIDGE_0860 · proposed hints</option>
                <option value="OXFORD_INTL">OXFORD_INTL · proposed hints</option>
                <option value="VOCATIONAL_PRO">VOCATIONAL_PRO · internal Desloop focus</option>
              </select>
            </Field>
          </Card>
          <ol className="grid gap-3 md:grid-cols-2">
            {pathway.courses
              .filter(
                (course) =>
                  tagFilter === 'ALL' ||
                  course.strategyHints.some((hint) => hint.code === tagFilter),
              )
              .map((course) => (
                <li key={course.id}>
                  <Card className="h-full p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-subdued">
                        {String(course.number).padStart(2, '0')} · {course.stage}
                      </span>
                      <Badge tone={tone(course.state)}>{label(course.state)}</Badge>
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-heading">{course.title}</h3>
                    {course.strategyHints.length > 0 && (
                      <p className="mt-2 text-xs leading-5 text-body">
                        Internal strategy suggestions:{' '}
                        {course.strategyHints.map((t) => t.code).join(', ')}. Not verified standards
                        alignment.
                      </p>
                    )}
                    {course.state === 'LOCKED' ? (
                      <p className="mt-3 text-xs text-body">
                        Only Course {String(course.number - 1).padStart(2, '0')} passing can unlock
                        this course.
                      </p>
                    ) : (
                      <Link
                        to={`/pilot/engine/courses/${course.id}`}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
                      >
                        {course.state === 'COMPLETED'
                          ? 'Review prior work'
                          : 'Open required lessons'}{' '}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </Card>
                </li>
              ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}

type Lesson = EngineDetail['course']['modules'][number]['lessons'][number];
function EngineLesson({
  courseId,
  lesson,
  onDone,
  guidedRequired,
}: {
  courseId: string;
  lesson: Lesson;
  onDone: () => void;
  guidedRequired: boolean;
}) {
  const [practice, setPractice] = useState('');
  const [answer, setAnswer] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (answer === null) {
      setError('Choose an answer first.');
      return;
    }
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await engineApi.lesson(
        courseId,
        lesson.id,
        practice,
        answer,
        requestId.current,
      );
      requestId.current = crypto.randomUUID();
      setMessage(
        result.completed
          ? 'The server recorded this lesson pass.'
          : `Not yet; try the targeted practice again. ${result.explanation ?? ''}`,
      );
      if (result.completed) onDone();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'The server could not check your answer.',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Next required lesson · {lesson.id}</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">{lesson.title}</h3>
      <p className="mt-3 text-sm leading-7 text-body">{lesson.objective}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-raised p-5">
          <h4 className="text-sm font-extrabold text-heading">Idea and example</h4>
          <p className="mt-2 text-sm leading-7 text-body">{lesson.explanation}</p>
          <p className="mt-3 text-sm leading-7 text-body">{lesson.workedExample}</p>
        </div>
        <div className="rounded-2xl bg-raised p-5">
          <h4 className="text-sm font-extrabold text-heading">Try and explain</h4>
          <p className="mt-2 text-sm leading-7 text-body">{lesson.guidedPractice}</p>
          <p className="mt-3 text-sm leading-7 text-body">{lesson.independentPractice}</p>
        </div>
      </div>
      {guidedRequired && (
        <InfoBox tone="blue" className="mt-5">
          This lesson also needs a server-checked visual activity. Save a guided revision, pass its
          criteria, then return to complete this lesson check. Free-practice projects never count.
          <Link
            className={buttonStyles('outline', 'sm', 'mt-3')}
            to={`/pilot/engine/guided/${courseId}/${lesson.id}`}
          >
            Open guided visual activity <ArrowRight className="h-4 w-4" />
          </Link>
        </InfoBox>
      )}
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field
          label="Describe your safe, fictional practice"
          id={`v2-practice-${lesson.id}`}
          hint="At least 15 characters. No real child names, records or contact details."
        >
          <textarea
            id={`v2-practice-${lesson.id}`}
            className="field min-h-24"
            required
            minLength={15}
            maxLength={5000}
            value={practice}
            onChange={(e) => setPractice(e.target.value)}
          />
        </Field>
        <fieldset className="space-y-3">
          <legend className="text-sm font-extrabold text-heading">
            Knowledge and safety check
          </legend>
          <p className="text-sm text-body">{lesson.check.question}</p>
          {lesson.check.options.map((option, i) => (
            <label
              key={i}
              className="flex items-start gap-3 rounded-xl border border-line bg-panel p-3 text-sm text-body"
            >
              <input
                type="radio"
                name={`v2-check-${lesson.id}`}
                className="mt-1 h-4 w-4 accent-brand-600"
                checked={answer === i}
                onChange={() => setAnswer(i)}
              />
              {option}
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {message && (
          <InfoBox role="status" tone={message.startsWith('The server') ? 'green' : 'amber'}>
            {message}
          </InfoBox>
        )}
        <Button type="submit" loading={pending}>
          Check required lesson on server <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

function EngineQuiz({ detail, onDone }: { detail: EngineDetail; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (detail.course.quiz.some((_, index) => answers[index] === undefined)) {
      setError('Answer all five questions.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const grade = await engineApi.quiz(
        detail.course.id,
        detail.course.quiz.map((_, index) => answers[index]),
        requestId.current,
      );
      requestId.current = crypto.randomUUID();
      setResult(
        `Server score: ${grade.score}%. ${grade.passed ? 'Passed.' : 'Remediation remains inside this course.'}` +
          (grade.criticalPassed ? '' : ' A safety-critical answer must also be corrected.') +
          grade.missed.map((item) => ` Question ${item.index + 1}: ${item.explanation}`).join(' '),
      );
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The server could not score this quiz.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Versioned server-scored check</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">
        Five questions, all critical safety checks
      </h3>
      <p className="mt-2 text-sm text-body">
        Pass with at least four of five correct (≥80%) and every safety-critical answer correct.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-6">
        {detail.course.quiz.map((check, index) => (
          <fieldset key={index} className="space-y-2 border-t border-line pt-5">
            <legend className="text-sm font-bold text-heading">
              {index + 1}. {check.question}
            </legend>
            {check.options.map((option, value) => (
              <label
                key={value}
                className="flex items-start gap-3 rounded-xl border border-line bg-panel p-3 text-sm text-body"
              >
                <input
                  type="radio"
                  className="mt-1 h-4 w-4 accent-brand-600"
                  name={`v2-quiz-${index}`}
                  checked={answers[index] === value}
                  onChange={() => setAnswers((old) => ({ ...old, [index]: value }))}
                />
                {option}
              </label>
            ))}
          </fieldset>
        ))}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {result && (
          <InfoBox tone={result.includes('Passed.') ? 'green' : 'amber'} role="status">
            {result}
          </InfoBox>
        )}
        <Button type="submit" loading={pending}>
          Check quiz on server <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
function EngineProject({ detail, onDone }: { detail: EngineDetail; onDone: () => void }) {
  const [artefact, setArtefact] = useState('');
  const [reflection, setReflection] = useState('');
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await engineApi.project(detail.course.id, {
        artefact,
        reflection,
        safetyAttested: safe as true,
        requestId: requestId.current,
      });
      requestId.current = crypto.randomUUID();
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your project.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Required project · operator-assigned human review</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">Submit private evidence</h3>
      <p className="mt-2 text-sm leading-7 text-body">{detail.course.project.brief}</p>
      {detail.project?.feedback && (
        <InfoBox tone="amber" className="mt-4" role="status">
          Reviewer feedback: {detail.project.feedback}
        </InfoBox>
      )}
      <form onSubmit={submit} className="mt-5 space-y-5">
        <Field label="Fictional project description" id="v2-artefact">
          <textarea
            id="v2-artefact"
            className="field min-h-28"
            required
            minLength={40}
            maxLength={5000}
            value={artefact}
            onChange={(e) => setArtefact(e.target.value)}
          />
        </Field>
        <Field label="What did you test and improve?" id="v2-reflection">
          <textarea
            id="v2-reflection"
            className="field min-h-24"
            required
            minLength={20}
            maxLength={5000}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </Field>
        <label className="flex items-start gap-3 text-sm text-body">
          <input
            type="checkbox"
            required
            className="mt-1 h-4 w-4 accent-brand-600"
            checked={safe}
            onChange={(e) => setSafe(e.target.checked)}
          />
          I used only fictional or permitted data; no private learner details are included.
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <Button type="submit" loading={pending}>
          Submit for assigned review <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

export function EngineCoursePage() {
  const { courseId = '' } = useParams();
  const { user } = usePilotContext();
  const [detail, setDetail] = useState<EngineDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    setError('');
    engineApi
      .course(courseId)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'This course is unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, user.role, refresh]);
  if (user.role !== 'learner')
    return (
      <EmptyState title="Learners only" description="This course requires a server enrolment." />
    );
  if (loading)
    return (
      <Card className="p-7" role="status">
        Checking the ordered release and course access…
      </Card>
    );
  if (error || !detail)
    return (
      <Card className="p-7">
        <EmptyState
          icon={LockKeyhole}
          title="Course is not open"
          description={error || 'Complete the preceding course to unlock this one.'}
          action={
            <Link to="/pilot/engine" className={buttonStyles('primary')}>
              View pathway
            </Link>
          }
        />
      </Card>
    );
  const all = detail.course.modules.flatMap((m) => m.lessons);
  const next = all.find((lesson) => !detail.completedLessons.includes(lesson.id));
  const quizPass = Boolean(detail.quiz && detail.quiz.score >= 80 && detail.quiz.criticalPassed);
  const lockedAction = detail.state === 'SUBMITTED_FOR_REVIEW' || detail.state === 'COMPLETED';
  const onDone = () => setRefresh((v) => v + 1);
  return (
    <div className="space-y-6">
      <Link
        to="/pilot/engine"
        className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" /> Draft-2 sequence
      </Link>
      <Card className="p-6 sm:p-8">
        <Badge tone={tone(detail.state)}>{detail.state.replaceAll('_', ' ')}</Badge>
        <h2 className="mt-3 font-display text-3xl text-heading">{detail.course.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-body">{detail.course.purpose}</p>
        <p className="mt-3 text-xs text-body">{note}</p>
        <ProgressBar
          className="mt-5 max-w-lg"
          value={Math.round((detail.completedLessons.length / 4) * 100)}
          label={`${detail.completedLessons.length} of 4 lesson checks passed`}
        />
        {detail.strategyHints.length > 0 && (
          <p className="mt-3 text-xs text-body">
            Strategy-suggested tags: {detail.strategyHints.map((hint) => hint.code).join(', ')}. Not
            verified standards alignment.
          </p>
        )}
      </Card>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {detail.course.modules.map((module, i) => (
          <li key={module.id}>
            <Card className="h-full p-4">
              <span className="text-xs font-bold text-subdued">Module {i + 1}</span>
              <h3 className="mt-1 text-sm font-bold text-heading">{module.title}</h3>
              <Badge tone={tone(detail.moduleStates[i]?.state ?? 'LOCKED')}>
                {label(detail.moduleStates[i]?.state ?? 'LOCKED')}
              </Badge>
            </Card>
          </li>
        ))}
      </ol>
      {detail.state === 'SUBMITTED_FOR_REVIEW' && (
        <InfoBox tone="blue" role="status">
          This project awaits an operator-assigned reviewer. Only that reviewer can approve it or
          request a revision.
        </InfoBox>
      )}
      {detail.state === 'COMPLETED' && (
        <InfoBox tone="green" role="status">
          Internal draft course passed. Only the server has unlocked the next required course.
        </InfoBox>
      )}
      {!lockedAction && next && (
        <EngineLesson
          key={next.id}
          courseId={courseId}
          lesson={next}
          guidedRequired={next.id === detail.guidedLessonId}
          onDone={onDone}
        />
      )}
      {!lockedAction && !next && (
        <>
          {detail.state !== 'NEEDS_REVISION' && <EngineQuiz detail={detail} onDone={onDone} />}
          {quizPass && <EngineProject detail={detail} onDone={onDone} />}
        </>
      )}
      <Link to="/pilot/engine/studio" className={buttonStyles('outline', 'sm')}>
        Private free-practice playground (not graded) <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EngineAssignedReview({
  submission,
  onDone,
}: {
  submission: EngineReview;
  onDone: () => void;
}) {
  const [rubric, setRubric] = useState<Record<string, number | undefined>>({});
  const [feedback, setFeedback] = useState('');
  const [safety, setSafety] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'revision_requested'>('revision_requested');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    if (submission.rubricDimensions.some((dim) => rubric[dim] === undefined)) {
      setError('Score every rubric dimension.');
      setPending(false);
      return;
    }
    try {
      const scores = Object.fromEntries(
        submission.rubricDimensions.map((dim) => [dim, rubric[dim]!]),
      );
      const result = await engineApi.review(submission.id, {
        decision,
        rubric: scores,
        safetyApproved: safety,
        feedback,
        requestId: requestId.current,
      });
      requestId.current = crypto.randomUUID();
      setMessage(
        result.completed
          ? `Internal pass recorded; ${result.nextCourseId ?? 'the final course is complete'}.`
          : 'Revision requested within the same course. No later course has unlocked.',
      );
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record the review.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Assigned internal draft review · iteration {submission.iteration}</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">{submission.courseTitle}</h3>
      <p className="mt-2 text-xs text-body">
        Learner: {submission.learner_name} · {submission.course_id}
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-raised p-4">
          <h4 className="font-bold text-heading">Private evidence</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-body">
            {submission.artefact}
          </p>
        </div>
        <div className="rounded-2xl bg-raised p-4">
          <h4 className="font-bold text-heading">Reflection</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-body">
            {submission.reflection}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <fieldset>
          <legend className="text-sm font-bold text-heading">Rubric dimensions (0–100)</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {submission.rubricDimensions.map((dim) => (
              <label key={dim} className="text-xs font-bold capitalize text-heading">
                {dim}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  className="field mt-1"
                  value={rubric[dim] ?? ''}
                  onChange={(e) =>
                    setRubric((old) => ({
                      ...old,
                      [dim]: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-2 text-sm text-body">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-600"
            checked={safety}
            onChange={(e) => setSafety(e.target.checked)}
          />
          I explicitly approve the safety and privacy evidence.
        </label>
        <label className="block text-xs font-bold text-heading">
          Decision
          <select
            className="field mt-1"
            value={decision}
            onChange={(e) => setDecision(e.target.value as typeof decision)}
          >
            <option value="revision_requested">Request a revision</option>
            <option value="approved">Approve only when every gate passes</option>
          </select>
        </label>
        <Field label="Specific feedback for the learner" id={`engine-review-${submission.id}`}>
          <textarea
            id={`engine-review-${submission.id}`}
            required
            minLength={10}
            maxLength={3000}
            className="field min-h-24"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {message && (
          <InfoBox tone="green" role="status">
            {message}
          </InfoBox>
        )}
        <Button type="submit" loading={pending}>
          Record assigned review <ShieldCheck className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
export function EngineReviewsPage() {
  const { user } = usePilotContext();
  const [queue, setQueue] = useState<EngineReview[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (user.role !== 'reviewer') return;
    let active = true;
    setLoading(true);
    setError('');
    engineApi
      .reviews()
      .then((v) => {
        if (active) setQueue(v.queue);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Could not load assigned reviews.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, user.role]);
  if (user.role !== 'reviewer')
    return (
      <EmptyState
        title="Assigned reviewers only"
        description="Learners cannot approve their own work."
      />
    );
  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <Eyebrow>Optional draft-2 trial · assigned review only</Eyebrow>
        <h2 className="mt-2 font-display text-3xl text-heading">Private review queue</h2>
        <p className="mt-2 text-sm text-body">
          The operator assigns a particular submission to your verified adult-pilot account. You
          cannot self-assign. An approval rechecks server-owned practice, quiz, safety and rubric
          gates.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setRefresh((n) => n + 1)}>
          Refresh assigned work
        </Button>
      </Card>
      {loading ? (
        <Card className="p-6" role="status">
          Loading assigned projects…
        </Card>
      ) : error ? (
        <InfoBox role="alert" tone="amber">
          {error}
        </InfoBox>
      ) : queue.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No projects assigned yet"
            description="An operator must use the restricted CLI to assign submitted adult work."
          />
        </Card>
      ) : (
        queue.map((sub) => (
          <EngineAssignedReview
            key={sub.id}
            submission={sub}
            onDone={() => setRefresh((n) => n + 1)}
          />
        ))
      )}
      <p className="text-xs leading-6 text-body">{note}</p>
    </div>
  );
}
