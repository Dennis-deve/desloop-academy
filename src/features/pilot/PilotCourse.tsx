import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from 'lucide-react';
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
import { pilotApi, type PilotCourseDetail } from './api';
import { LessonNotebook } from './LessonNotebook';
import { usePilotContext } from './PilotPortal';

type Lesson = PilotCourseDetail['course']['modules'][number]['lessons'][number];
function LessonForm({
  courseId,
  lesson,
  onDone,
}: {
  courseId: string;
  lesson: Lesson;
  onDone: () => void;
}) {
  const [practice, setPractice] = useState('');
  const [answer, setAnswer] = useState<number | null>(null);
  const [mode, setMode] = useState<'typed' | 'dictated-or-described'>('typed');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{
    completed: boolean;
    explanation: string | null;
  } | null>(null);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (answer === null) {
      setError('Select an answer to the knowledge check.');
      return;
    }
    setPending(true);
    setError('');
    setFeedback(null);
    try {
      const result = await pilotApi.lesson(courseId, lesson.id, {
        practice,
        answerIndex: answer,
        responseMode: mode,
        requestId: requestId.current,
      });
      setFeedback(result);
      requestId.current = crypto.randomUUID();
      if (result.completed) onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not check this practice.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Required lesson · {lesson.id}</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">{lesson.title}</h3>
      <p className="mt-3 text-sm leading-7 text-body">{lesson.objective}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-raised p-5">
          <h4 className="text-sm font-extrabold text-heading">Idea and worked example</h4>
          <p className="mt-2 text-sm leading-7 text-body">{lesson.explanation}</p>
          <p className="mt-3 text-sm leading-7 text-body">{lesson.workedExample}</p>
        </div>
        <div className="rounded-2xl bg-raised p-5">
          <h4 className="text-sm font-extrabold text-heading">Practise safely</h4>
          <p className="mt-2 text-sm leading-7 text-body">{lesson.guidedPractice}</p>
          <p className="mt-3 text-sm leading-7 text-body">{lesson.independentPractice}</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field
          label="Describe your own practice with a fictional example"
          id={`pilot-practice-${lesson.id}`}
          hint="At least 15 characters. Do not include real names, account details or private records."
        >
          <textarea
            required
            id={`pilot-practice-${lesson.id}`}
            className="field min-h-28"
            minLength={15}
            maxLength={5000}
            value={practice}
            onChange={(event) => setPractice(event.target.value)}
          />
        </Field>
        <Field label="Response format" id={`pilot-mode-${lesson.id}`}>
          <select
            className="field"
            id={`pilot-mode-${lesson.id}`}
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="typed">Typed explanation</option>
            <option value="dictated-or-described">Dictated / assisted description</option>
          </select>
        </Field>
        <fieldset className="space-y-3">
          <legend className="text-sm font-extrabold text-heading">
            Knowledge and safety check
          </legend>
          <p className="text-sm leading-6 text-body">{lesson.check.question}</p>
          {lesson.check.options.map((option, index) => (
            <label
              key={index}
              className="flex items-start gap-3 rounded-xl border border-line bg-panel p-3 text-sm text-body"
            >
              <input
                type="radio"
                name={`pilot-check-${lesson.id}`}
                className="mt-1 h-4 w-4 accent-brand-600"
                checked={answer === index}
                onChange={() => setAnswer(index)}
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
        {feedback && (
          <div role="status">
            <InfoBox tone={feedback.completed ? 'green' : 'amber'}>
              {feedback.completed
                ? 'The server recorded this lesson as practised.'
                : 'Not yet. Review the example and try again.'}{' '}
              {feedback.explanation}
            </InfoBox>
          </div>
        )}
        <Button type="submit" loading={pending}>
          Check practice on server <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

function QuizForm({ detail, onDone }: { detail: PilotCourseDetail; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    criticalPassed: boolean;
    missed: { index: number; explanation: string; safetyCritical: boolean }[];
  } | null>(null);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (detail.course.quiz.some((_, index) => answers[index] === undefined)) {
      setError('Answer all five questions before submitting.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const checked = await pilotApi.quiz(
        detail.course.id,
        detail.course.quiz.map((_, index) => answers[index]),
        requestId.current,
      );
      setResult(checked);
      requestId.current = crypto.randomUUID();
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The server could not assess this quiz.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Server-scored assessment</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">
        Five-item knowledge and safety check
      </h3>
      <p className="mt-2 text-sm text-body">
        At least four of five correct and every safety-critical item must pass. A miss leads to
        targeted practice here, never a later-course shortcut.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-6">
        {detail.course.quiz.map((check, index) => (
          <fieldset key={index} className="space-y-2 border-t border-line pt-5">
            <legend className="text-sm font-extrabold text-heading">
              {index + 1}. {check.question}
            </legend>
            {check.options.map((option, value) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel p-3 text-sm text-body"
              >
                <input
                  type="radio"
                  className="mt-1 h-4 w-4 accent-brand-600"
                  name={`pilot-quiz-${index}`}
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
          <div role="status">
            <InfoBox tone={result.passed ? 'green' : 'amber'}>
              Server score: <strong>{result.score}%</strong>.{' '}
              {result.passed
                ? 'Quiz passed; now submit a project for assigned human review.'
                : 'Not passed. Retry this course quiz after reviewing the items below.'}
              {!result.criticalPassed ? ' A safety-critical check also needs correction.' : ''}
            </InfoBox>
            {result.missed.length > 0 && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-body">
                {result.missed.map((miss) => (
                  <li key={miss.index}>
                    Question {miss.index + 1}: {miss.explanation}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Button type="submit" loading={pending}>
          Score quiz on server <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

function ProjectForm({ detail, onDone }: { detail: PilotCourseDetail; onDone: () => void }) {
  const [artefact, setArtefact] = useState('');
  const [reflection, setReflection] = useState('');
  const [mode, setMode] = useState<'typed' | 'dictated-or-described'>('typed');
  const [safety, setSafety] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await pilotApi.project(detail.course.id, {
        artefact,
        reflection,
        responseMode: mode,
        safetyAttested: safety,
        requestId: requestId.current,
      });
      requestId.current = crypto.randomUUID();
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the project.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="p-6 sm:p-8">
      <Eyebrow>Required project · human-reviewed</Eyebrow>
      <h3 className="mt-2 font-display text-2xl text-heading">Explain something you made</h3>
      <p className="mt-3 text-sm leading-7 text-body">{detail.course.project.brief}</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-6 text-body">
        {detail.course.project.requiredEvidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Field
          label="Fictional project or accessible artefact description"
          id="pilot-project-art"
          hint="At least 40 characters. No real people, private files, contact details or live links."
        >
          <textarea
            id="pilot-project-art"
            className="field min-h-32"
            required
            minLength={40}
            maxLength={5000}
            value={artefact}
            onChange={(event) => setArtefact(event.target.value)}
          />
        </Field>
        <Field label="What did you test and learn?" id="pilot-project-reflection">
          <textarea
            id="pilot-project-reflection"
            className="field min-h-24"
            required
            minLength={20}
            maxLength={5000}
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
          />
        </Field>
        <Field label="Response format" id="pilot-project-mode">
          <select
            id="pilot-project-mode"
            className="field"
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="typed">Typed explanation</option>
            <option value="dictated-or-described">Dictated / assisted description</option>
          </select>
        </Field>
        <label className="flex items-start gap-3 text-sm leading-6 text-body">
          <input
            type="checkbox"
            required
            className="mt-1 h-4 w-4 accent-brand-600"
            checked={safety}
            onChange={(event) => setSafety(event.target.checked)}
          />
          I used fictional or permitted information and removed all private details.
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <Button type="submit" loading={pending}>
          Submit for assigned human review <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

export function PilotCoursePage() {
  const { courseId = '' } = useParams();
  const { user, learningAnnotationsEnabled } = usePilotContext();
  const [detail, setDetail] = useState<PilotCourseDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    setError('');
    pilotApi
      .course(courseId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Could not load this course.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, revision, user.role]);
  if (user.role !== 'learner')
    return (
      <EmptyState
        title="Learner route only"
        description="Reviewer accounts can open only their assigned queue."
        action={
          <Link to="/pilot/reviews" className={buttonStyles('primary')}>
            Assigned reviews
          </Link>
        }
      />
    );
  if (loading)
    return (
      <Card className="p-7" role="status">
        Checking course access with the server…
      </Card>
    );
  if (error || !detail)
    return (
      <Card className="p-7">
        <EmptyState
          icon={LockKeyhole}
          title="Course unavailable"
          description={
            error ||
            'The server did not return this course. Course N+1 stays locked until Course N is passed.'
          }
          action={
            <Link to="/pilot" className={buttonStyles('primary')}>
              Back to your pathway
            </Link>
          }
        />
      </Card>
    );
  const lessons = detail.course.modules.flatMap((module) => module.lessons);
  const nextLesson = lessons.find((lesson) => !detail.completedLessons.includes(lesson.id));
  const quizPassed = Boolean(detail.quiz && detail.quiz.score >= 80 && detail.quiz.criticalPassed);
  const waiting = detail.state === 'review';
  const complete = detail.state === 'completed';
  const refresh = () => setRevision((value) => value + 1);
  return (
    <div className="space-y-6">
      <Link
        to="/pilot"
        className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to the pathway
      </Link>
      <Card className="p-6 sm:p-8">
        <Badge
          tone={
            complete ? 'green' : waiting ? 'amber' : detail.state === 'revision' ? 'amber' : 'blue'
          }
        >
          Course {String(detail.course.number).padStart(2, '0')} · {detail.state}
        </Badge>
        <h2 className="mt-3 font-display text-3xl leading-tight text-heading sm:text-4xl">
          {detail.course.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-body">{detail.course.purpose}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-subdued">
          <span>{detail.course.stage}</span>
          <span aria-hidden="true">·</span>
          <span>Draft content version {detail.course.version}</span>
        </div>
        <ProgressBar
          className="mt-6 max-w-md"
          value={Math.round((detail.completedLessons.length / lessons.length) * 100)}
          label={`${detail.completedLessons.length} of ${lessons.length} lessons completed on server`}
        />
      </Card>
      {detail.project?.feedback && (
        <div role="status">
          <InfoBox
            tone={complete ? 'green' : 'amber'}
            title={complete ? 'Reviewer feedback' : 'Revision requested'}
          >
            {detail.project.feedback}
          </InfoBox>
        </div>
      )}
      {waiting && (
        <InfoBox tone="amber" title="Waiting for an assigned human reviewer">
          Your server-saved submission is pending. A pilot operator assigns a reviewer out of band;
          the browser cannot appoint one, mark a pass or open the next course.
        </InfoBox>
      )}
      {complete && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Check className="mt-1 h-6 w-6 text-mint-700" />
            <div>
              <h3 className="text-base font-extrabold text-heading">
                Passed in the internal rehearsal
              </h3>
              <p className="mt-1 text-sm text-body">
                Recorded on the pilot server with a human review. This draft is not an accredited or
                official completion.
              </p>
              {detail.course.number < 44 && (
                <Link
                  to={`/pilot/courses/course-${String(detail.course.number + 1).padStart(2, '0')}`}
                  className={buttonStyles('primary', 'md', 'mt-5')}
                >
                  Continue to the next required course <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}
      <Card className="p-6">
        <h3 className="text-sm font-extrabold text-heading">Required lesson order</h3>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="flex items-start gap-3 rounded-xl bg-raised p-3 text-xs text-body"
            >
              <span className="font-extrabold text-heading">{index + 1}.</span>
              <span>
                {lesson.title} ·{' '}
                {detail.completedLessons.includes(lesson.id)
                  ? 'complete'
                  : index === detail.completedLessons.length && !waiting && !complete
                    ? 'current'
                    : 'locked'}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      {learningAnnotationsEnabled && (
        <LessonNotebook
          key={`${detail.course.id}:${detail.course.version}`}
          courseId={detail.course.id}
          contentVersion={detail.course.version}
          lessons={lessons.slice(0, Math.min(lessons.length, detail.completedLessons.length + 1))}
        />
      )}
      {!waiting && !complete && nextLesson && (
        <LessonForm
          key={nextLesson.id}
          courseId={detail.course.id}
          lesson={nextLesson}
          onDone={refresh}
        />
      )}
      {!waiting && !complete && !nextLesson && (
        <>
          {detail.quiz && (
            <InfoBox
              tone={quizPassed ? 'green' : 'amber'}
              title={`Latest server quiz: ${detail.quiz.score}%`}
            >
              {quizPassed
                ? 'Your knowledge and safety gate passed.'
                : 'Review the lessons and retry within this course. A later course remains locked.'}
            </InfoBox>
          )}
          {!quizPassed && <QuizForm detail={detail} onDone={refresh} />}
          {quizPassed && <ProjectForm detail={detail} onDone={refresh} />}
        </>
      )}
      <div className="flex items-start gap-2 text-xs leading-6 text-body">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Real work is stored in the pilot PostgreSQL database; do not enter private information.
          This draft record is controlled by the server; changing the page cannot grant course credit.
        </p>
      </div>
    </div>
  );
}
