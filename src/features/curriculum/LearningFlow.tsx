import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CloudDownload,
  Lightbulb,
  LockKeyhole,
  MessageCircleQuestion,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Field,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '@/components/ui';
import { useDemo, useToast } from '@/app/providers';
import {
  ageBands,
  courseById,
  finalChecks,
  lessonScaffold,
  lessonsFor,
  nextCourse,
  type MasterCourse,
  type MasterLesson,
} from '@/curriculum/model';
import {
  COURSE_POLICY,
  allLessonsComplete,
  completedPrefix,
  courseState,
  latestQuiz,
  lessonAvailable,
  lessonComplete,
  recordLesson,
  recordQuiz,
  submitProject,
} from '@/curriculum/progression';
import type { ResponseMode } from '@/curriculum/state';
import { offlineService } from '@/services/offline';
import { CourseStatus, DraftNotice, LockedCourse } from './shared';

function PreviousLessonLock({ course, lesson }: { course: MasterCourse; lesson: MasterLesson }) {
  const lessons = lessonsFor(course);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  return (
    <Card className="p-7">
      <EmptyState
        icon={LockKeyhole}
        title="Finish the previous lesson first"
        description={`Complete the required practice and check for “${lessons[index - 1]?.title ?? 'the previous lesson'}” before entering this lesson. A direct URL cannot skip a lesson in this demo.`}
        action={
          <Link
            to={`/app/learn/${course.id}/${lessons[index - 1]?.id ?? lessons[0].id}`}
            className={buttonStyles('primary')}
          >
            Go to the previous lesson
          </Link>
        }
      />
    </Card>
  );
}

export function CurriculumLessonPage() {
  const { courseId, lessonId } = useParams();
  // Key the form by route to avoid carrying one lesson's answer into the next.
  return (
    <LessonSession
      key={`${courseId}/${lessonId}`}
      courseId={courseId ?? ''}
      lessonId={lessonId ?? ''}
    />
  );
}
function LessonSession({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const course = courseById(courseId);
  const lessons = course ? lessonsFor(course) : [];
  const lesson = lessons.find((item) => item.id === lessonId);
  const [practice, setPractice] = useState(() => state.curriculum.lessonDrafts[lessonId] ?? '');
  const [mode, setMode] = useState<ResponseMode>('typed');
  const [answer, setAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'wrong' | 'passed' | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (!course || !lesson)
    return (
      <EmptyState
        title="Lesson not found"
        description="Choose a lesson from the required course map."
        action={
          <Link to="/app/courses" className={buttonStyles('primary')}>
            Open pathway
          </Link>
        }
      />
    );
  if (courseState(course, state.curriculum) === 'locked')
    return <LockedCourse course={course} lesson />;
  if (!lessonAvailable(course, lesson.id, state.curriculum))
    return <PreviousLessonLock course={course} lesson={lesson} />;
  const index = lessons.indexOf(lesson);
  const next = lessons[index + 1];
  const completed = lessonComplete(course, lesson.id, state.curriculum);
  const completedCount = lessons.filter((item) =>
    lessonComplete(course, item.id, state.curriculum),
  ).length;
  const isChild = state.curriculum.band === 'early' || state.curriculum.band === 'junior';
  const saveOffline = async () => {
    setSaving(true);
    try {
      await offlineService.save({
        id: lesson.id,
        courseId: course.id,
        courseTitle: course.title,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          minutes: lesson.minutes,
          objectives: [lesson.objective],
          paragraphs: [lesson.explanation, lesson.workedExample, lesson.guidedPractice],
          exercise: lesson.independentPractice,
          quiz: lesson.check,
        },
        savedAt: new Date().toISOString(),
      });
      toast('Lesson text saved to this browser. Offline first-visit loading is not guaranteed.');
    } catch {
      toast('Offline storage could not save the lesson on this device.', 'error');
    } finally {
      setSaving(false);
    }
  };
  const handleCheck = () => {
    if (practice.trim().length < COURSE_POLICY.practiceMinimum) {
      setError(
        `Describe your practice in at least ${COURSE_POLICY.practiceMinimum} characters. A facilitator may record a dictated response.`,
      );
      return;
    }
    if (answer === null) {
      setError('Choose one answer before checking.');
      return;
    }
    setError('');
    actions.updateCurriculum((current) =>
      recordLesson(current, course.id, lesson.id, practice, answer, mode),
    );
    setFeedback(answer === lesson.check.correct ? 'passed' : 'wrong');
  };
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-1 text-xs font-bold text-body"
      >
        <Link to="/app/courses">Pathway</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/courses/${course.slug}`}>Course {String(course.number).padStart(2, '0')}</Link>
        <ChevronRight className="h-3 w-3" />
        <span aria-current="page" className="text-heading">
          Lesson {index + 1}
        </span>
      </nav>
      <PageHeader
        eyebrow={`Stage ${course.stage} · Course ${String(course.number).padStart(2, '0')} · Lesson ${index + 1} of ${lessons.length}`}
        title={lesson.title}
        description={lesson.objective}
        action={
          <Button variant="outline" loading={saving} onClick={() => void saveOffline()}>
            <CloudDownload className="h-4 w-4" /> Save lesson text
          </Button>
        }
      />
      <DraftNotice />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(230px,0.7fr)]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="course-art course-art-mint flex min-h-36 items-center justify-between px-6 py-5 sm:px-8">
              <div className="relative z-10">
                <Badge tone="blue">Learning draft · {lesson.minutes} min</Badge>
                <h2 className="mt-3 font-display text-2xl text-ink-900">Understand the idea</h2>
              </div>
              <BookOpen className="relative z-10 h-10 w-10 text-ink-900" aria-hidden="true" />
            </div>
            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <h3 className="font-extrabold text-heading">Your outcome</h3>
                <p className="mt-2 text-sm leading-7 text-body">{lesson.objective}.</p>
              </div>
              <div>
                <h3 className="font-extrabold text-heading">The idea</h3>
                <p className="mt-2 text-sm leading-7 text-body">{lesson.explanation}</p>
              </div>
              <div
                id="worked-example"
                className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10"
              >
                <h3 className="flex items-center gap-2 font-extrabold text-heading">
                  <Lightbulb className="h-4 w-4 text-brand-600" /> Worked example
                </h3>
                <p className="mt-2 text-sm leading-7 text-body">{lesson.workedExample}</p>
              </div>
              <div>
                <h3 className="font-extrabold text-heading">Try together</h3>
                <p className="mt-2 text-sm leading-7 text-body">{lesson.guidedPractice}</p>
              </div>
              <div className="rounded-2xl border border-mint-200 bg-mint-50 p-5 dark:border-mint-500/30 dark:bg-mint-500/10">
                <h3 className="font-extrabold text-heading">
                  Your teaching scaffold ·{' '}
                  {ageBands.find((band) => band.id === state.curriculum.band)?.label}
                </h3>
                <p className="mt-2 text-sm leading-7 text-body">
                  {lessonScaffold(course, lesson, state.curriculum.band)}
                </p>
                <p className="mt-2 text-xs text-subdued">
                  This changes support and examples, never the required outcome or course order.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Eyebrow>Required practice</Eyebrow>
                <h2 className="mt-2 font-display text-2xl text-heading">
                  Make a small first attempt
                </h2>
              </div>
              {completed && (
                <Badge tone="green">
                  <Check className="h-3 w-3" /> Completed · demo
                </Badge>
              )}
            </div>
            <p className="mt-4 text-sm leading-7 text-body">{lesson.independentPractice}</p>
            <p className="mt-3 text-xs leading-6 text-subdued">
              {isChild
                ? 'Use a fictional example. A trusted facilitator may type a dictated explanation or describe a drawing. Never include a child’s full name, school, address or contact details.'
                : 'Use a fictional or non-sensitive example. Do not enter real personal data, secrets or private workplace material.'}{' '}
              Your text stays in this browser demo, not a submitted file.
            </p>
            <div className="mt-5 space-y-4">
              <Field
                label="How did you practise?"
                id="practice-evidence"
                error={
                  error && practice.trim().length < COURSE_POLICY.practiceMinimum
                    ? error
                    : undefined
                }
                hint="Describe your attempt or have a facilitator record your oral/visual explanation. The same objective applies at every age."
              >
                <textarea
                  id="practice-evidence"
                  className="field min-h-32"
                  maxLength={5000}
                  value={practice}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPractice(value);
                    actions.updateCurriculum((current) => ({
                      ...current,
                      lessonDrafts: { ...current.lessonDrafts, [lesson.id]: value },
                    }));
                  }}
                  placeholder="I tried the step with a safe example and checked..."
                />
              </Field>
              <Field label="Evidence format" id="practice-mode">
                <select
                  className="field"
                  id="practice-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ResponseMode)}
                >
                  <option value="typed">Typed explanation</option>
                  <option value="dictated-or-described">
                    Facilitator-recorded spoken / visual explanation
                  </option>
                </select>
              </Field>
            </div>
            <fieldset className="mt-7 space-y-3">
              <legend className="font-extrabold text-heading">Quick knowledge check</legend>
              <p className="text-sm leading-6 text-body">{lesson.check.question}</p>
              {lesson.check.options.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel p-3 text-sm leading-6 text-body hover:bg-raised"
                >
                  <input
                    type="radio"
                    name={`lesson-check-${lesson.id}`}
                    checked={answer === optionIndex}
                    onChange={() => {
                      setAnswer(optionIndex);
                      setError('');
                      setFeedback(null);
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  {option}
                </label>
              ))}
            </fieldset>
            {error && practice.trim().length >= COURSE_POLICY.practiceMinimum && (
              <p role="alert" className="mt-3 text-xs font-bold text-red-600 dark:text-red-200">
                {error}
              </p>
            )}
            {feedback && (
              <div
                className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${feedback === 'wrong' ? 'border-amber-300 bg-amber-50 text-[#70450b] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100' : 'border-mint-200 bg-mint-50 text-mint-800 dark:border-mint-500/40 dark:bg-mint-500/10 dark:text-mint-100'}`}
                role="status"
              >
                <strong>
                  {feedback === 'wrong'
                    ? 'Not yet — review and try again.'
                    : 'Good work — this lesson is complete in the demo.'}
                </strong>{' '}
                {lesson.check.explanation}{' '}
                {feedback === 'wrong' && (
                  <a href="#worked-example" className="font-bold underline">
                    Revisit the example
                  </a>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {!completed && (
                <Button onClick={handleCheck}>
                  Check practice and answer <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {completed &&
                (next ? (
                  <Link
                    className={buttonStyles('primary')}
                    to={`/app/learn/${course.id}/${next.id}`}
                  >
                    Next lesson: {next.title} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link className={buttonStyles('primary')} to={`/app/assess/${course.id}`}>
                    Course assessment <ArrowRight className="h-4 w-4" />
                  </Link>
                ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="p-5">
            <Eyebrow>Course map</Eyebrow>
            <h2 className="mt-1 font-display text-lg text-heading">{course.title}</h2>
            <ProgressBar
              className="mt-5"
              value={Math.round((completedCount / lessons.length) * 100)}
              label="Lessons practised"
            />
            <ol className="mt-5 space-y-2">
              {lessons.map((item, itemIndex) => {
                const available = lessonAvailable(course, item.id, state.curriculum);
                return (
                  <li key={item.id}>
                    {available ? (
                      <Link
                        to={`/app/learn/${course.id}/${item.id}`}
                        aria-current={item.id === lesson.id ? 'page' : undefined}
                        className={`flex items-start gap-2 rounded-lg p-2 text-xs font-bold hover:bg-raised ${item.id === lesson.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100' : 'text-body'}`}
                      >
                        {lessonComplete(course, item.id, state.curriculum) ? (
                          <Check className="h-4 w-4 shrink-0 text-mint-600" />
                        ) : (
                          <span className="shrink-0">{itemIndex + 1}.</span>
                        )}
                        {item.title}
                      </Link>
                    ) : (
                      <span className="flex items-start gap-2 p-2 text-xs text-subdued">
                        <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
                        {item.title} · locked
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <Link
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
              to={`/app/assess/${course.id}`}
            >
              Assessment <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          <Card className="p-5">
            <Eyebrow>Teaching adaptation</Eyebrow>
            <p className="mt-2 text-xs leading-6 text-body">
              {course.ageAdaptation[state.curriculum.band]}
            </p>
            <Link
              to="/app/courses"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Change presentation on pathway map <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          <Card className="p-5">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h2 className="mt-3 text-sm font-extrabold text-heading">Ask for a hint</h2>
            <p className="mt-1 text-xs leading-6 text-body">
              The AI learning studio offers scripted sample explanations, not live AI or a way to
              bypass this lesson’s required practice and check. Use only fictional details.
            </p>
            <Link
              to={`/app/ai-studio?lesson=${encodeURIComponent(lesson.title)}`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Open hint studio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          <Card className="p-5">
            <ShieldCheck className="h-5 w-5 text-mint-600" />
            <h2 className="mt-3 text-sm font-extrabold text-heading">Learn safely</h2>
            <p className="mt-1 text-xs leading-6 text-body">
              All examples can use fictional data, paper or approved tools. Share concerns with a
              trusted adult or appropriate support channel. Offline copies contain lesson text, not
              your practice entry.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

export function CurriculumAssessmentPage() {
  const { courseId } = useParams();
  const { state, actions } = useDemo();
  const course = courseById(courseId ?? '');
  if (!course)
    return (
      <EmptyState
        title="Course not found"
        description="Choose a course from the pathway map."
        action={
          <Link className={buttonStyles('primary')} to="/app/courses">
            Open pathway
          </Link>
        }
      />
    );
  return <AssessmentSession key={course.id} course={course} state={state} actions={actions} />;
}
function AssessmentSession({
  course,
  state,
  actions,
}: {
  course: MasterCourse;
  state: ReturnType<typeof useDemo>['state'];
  actions: ReturnType<typeof useDemo>['actions'];
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(finalChecks(course).length).fill(null),
  );
  const [artefact, setArtefact] = useState(
    () => state.curriculum.evidence[course.id]?.artefact ?? '',
  );
  const [reflection, setReflection] = useState(
    () => state.curriculum.evidence[course.id]?.reflection ?? '',
  );
  const [mode, setMode] = useState<ResponseMode>(
    () => state.curriculum.evidence[course.id]?.mode ?? 'typed',
  );
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [message, setMessage] = useState('');
  const status = courseState(course, state.curriculum);
  if (status === 'locked') return <LockedCourse course={course} />;
  const lessons = lessonsFor(course);
  const nextLesson = lessons.find((lesson) => !lessonComplete(course, lesson.id, state.curriculum));
  const quiz = latestQuiz(course, state.curriculum);
  const passed = Boolean(quiz && quiz.score >= COURSE_POLICY.quizMinimum && quiz.criticalPassed);
  const evidence = state.curriculum.evidence[course.id];
  const checks = finalChecks(course);
  const following = nextCourse(course);
  const submitQuiz = () => {
    if (answers.some((answer) => answer === null)) {
      setMessage('Answer all five questions to see targeted feedback.');
      return;
    }
    actions.updateCurriculum((current) => recordQuiz(current, course.id, answers as number[]));
    setAnswers(Array(checks.length).fill(null));
    setMessage('Knowledge check scored locally. See the result and next action below.');
  };
  const submitEvidence = () => {
    if (
      artefact.trim().length < COURSE_POLICY.evidenceMinimum ||
      reflection.trim().length < COURSE_POLICY.reflectionMinimum ||
      !safetyChecked
    ) {
      setMessage(
        `Add at least ${COURSE_POLICY.evidenceMinimum} characters describing your artefact, at least ${COURSE_POLICY.reflectionMinimum} for reflection, and complete the privacy self-check.`,
      );
      return;
    }
    actions.updateCurriculum((current) =>
      submitProject(current, course.id, artefact, reflection, mode, safetyChecked),
    );
    setMessage('Project evidence submitted to the local demo review queue. No message was sent.');
  };
  return (
    <>
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-body"
        aria-label="Breadcrumb"
      >
        <Link to="/app/courses">Pathway</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/courses/${course.slug}`}>Course {String(course.number).padStart(2, '0')}</Link>
        <ChevronRight className="h-3 w-3" />
        <span aria-current="page" className="text-heading">
          Assessment
        </span>
      </nav>
      <PageHeader
        eyebrow={`Required course ${String(course.number).padStart(2, '0')} of 44`}
        title="Show what you can do."
        description={`${course.title} · Finish practice, pass the five-item quiz and request a project review. A missed gate means revision here, not a jump to the next course.`}
        action={<CourseStatus status={status} />}
      />
      <DraftNotice />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          [
            'Practice',
            `${lessons.filter((lesson) => lessonComplete(course, lesson.id, state.curriculum)).length} / ${lessons.length} lessons`,
          ],
          [
            'Quiz',
            quiz
              ? `${quiz.score}% · ${quiz.criticalPassed ? 'safety passed' : 'safety retry'}`
              : 'Not attempted',
          ],
          [
            'Project',
            evidence
              ? evidence.status === 'submitted'
                ? 'In review'
                : 'Revision needed'
              : 'Not submitted',
          ],
          ['Next course', status === 'completed' ? 'Available' : 'Locked'],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-subdued">{label}</p>
            <p className="mt-2 text-sm font-extrabold text-heading">{value}</p>
          </Card>
        ))}
      </div>
      {status === 'completed' ? (
        <Card className="p-7 sm:p-9">
          <Badge tone="green">
            <Check className="h-3 w-3" /> Passed · local demo
          </Badge>
          <h2 className="mt-3 font-display text-2xl text-heading">Your next course is ready.</h2>
          <p className="mt-2 text-sm leading-7 text-body">
            Quiz {state.curriculum.completions[course.id]?.quizScore}% · project rubric{' '}
            {state.curriculum.completions[course.id]?.projectScore}% ·{' '}
            {state.curriculum.completions[course.id]?.reviewer}. This is not an official record.
          </p>
          {following ? (
            <Link
              className={buttonStyles('primary', 'md', 'mt-5')}
              to={`/app/learn/${following.id}/${lessonsFor(following)[0].id}`}
            >
              Start Course {String(following.number).padStart(2, '0')}: {following.title}{' '}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/app/courses" className={buttonStyles('outline', 'md', 'mt-5')}>
              Review the full pathway
            </Link>
          )}
        </Card>
      ) : null}
      {status !== 'completed' && nextLesson && (
        <Card className="p-6">
          <Eyebrow>Step 1 · practice</Eyebrow>
          <h2 className="mt-2 font-display text-xl text-heading">
            Complete all four lessons first.
          </h2>
          <p className="mt-2 text-sm leading-7 text-body">
            There is no skip or self-attested completion: practise each step and pass its formative
            check before taking the course quiz.
          </p>
          <Link
            className={buttonStyles('primary', 'md', 'mt-5')}
            to={`/app/learn/${course.id}/${nextLesson.id}`}
          >
            Continue: {nextLesson.title} <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      )}
      {status !== 'completed' &&
        allLessonsComplete(course, state.curriculum) &&
        status !== 'review' && (
          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
            <Card className="p-6 sm:p-8">
              <Eyebrow>Step 2 · knowledge check</Eyebrow>
              <h2 className="mt-2 font-display text-2xl text-heading">
                Five questions. Four correct to pass.
              </h2>
              <p className="mt-2 text-sm leading-7 text-body">
                You need at least 80% across the five items. Every safety-critical item must be
                correct even if your total is 80%. Review missed ideas and retry here; previous
                lesson practice remains saved.
              </p>
              {quiz && (
                <div
                  className={`mt-4 rounded-xl border p-4 text-xs leading-6 ${passed ? 'border-mint-200 bg-mint-50 text-mint-800 dark:border-mint-500/40 dark:bg-mint-500/10 dark:text-mint-100' : 'border-amber-200 bg-amber-50 text-[#70450b] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100'}`}
                  role="status"
                >
                  <strong>Latest attempt: {quiz.score}%.</strong>{' '}
                  {passed
                    ? 'Quiz and safety gates met in this preview.'
                    : 'Not yet. Work through the missed items below, then retry. A safety-critical miss must be corrected.'}
                </div>
              )}
              {!passed && (
                <>
                  <div className="mt-6 space-y-6">
                    {checks.map((check, index) => (
                      <fieldset key={index} className="border-t border-line pt-5">
                        <legend className="px-1 text-sm font-extrabold leading-6 text-heading">
                          {index + 1}. {check.question}{' '}
                          {check.safetyCritical && (
                            <span className="text-red-700 dark:text-red-200">
                              · safety-critical
                            </span>
                          )}
                        </legend>
                        <div className="mt-3 space-y-2">
                          {check.options.map((option, optionIndex) => (
                            <label
                              key={optionIndex}
                              className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-xs leading-6 text-body hover:bg-raised"
                            >
                              <input
                                className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                                type="radio"
                                name={`final-${course.id}-${index}`}
                                checked={answers[index] === optionIndex}
                                onChange={() =>
                                  setAnswers((current) =>
                                    current.map((value, target) =>
                                      target === index ? optionIndex : value,
                                    ),
                                  )
                                }
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                        {quiz && quiz.answers[index] !== check.correct && (
                          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-[#70450b] dark:bg-amber-500/10 dark:text-amber-100">
                            <strong>Focus on this idea:</strong> {check.explanation}{' '}
                            <Link
                              className="font-bold underline"
                              to={`/app/learn/${course.id}/${lessons[Math.min(index, lessons.length - 1)].id}`}
                            >
                              Revisit lesson
                            </Link>
                          </p>
                        )}
                      </fieldset>
                    ))}
                  </div>
                  <Button className="mt-6" onClick={submitQuiz}>
                    Score knowledge check <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              {message && (
                <p className="mt-4 text-xs font-bold text-body" role="status">
                  {message}
                </p>
              )}
            </Card>
            <Card className="h-fit p-6">
              <MessageCircleQuestion className="h-6 w-6 text-brand-600" />
              <h2 className="mt-3 font-display text-xl text-heading">
                Remediation is part of learning.
              </h2>
              <p className="mt-2 text-xs leading-6 text-body">
                If you miss an item, return to that lesson, try a new example and explain the
                reasoning before another attempt. Attempt history is kept only in this browser.
                These questions are illustrative drafts and need review before real assessment.
              </p>
              <p className="mt-4 text-xs font-bold text-heading">
                Attempt count: {state.curriculum.quizzes[course.id]?.length ?? 0}
              </p>
            </Card>
          </div>
        )}
      {status !== 'completed' &&
        allLessonsComplete(course, state.curriculum) &&
        passed &&
        status !== 'review' && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.8fr]">
            <Card className="p-6 sm:p-8">
              <Eyebrow>Step 3 · required project</Eyebrow>
              <h2 className="mt-2 font-display text-2xl text-heading">
                Submit evidence for human review.
              </h2>
              <p className="mt-3 text-sm leading-7 text-body">{course.project.brief}</p>
              <ul className="mt-3 list-inside list-disc text-xs leading-6 text-body">
                {course.project.requiredEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {evidence?.status === 'revision_requested' && (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-[#70450b] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
                >
                  <strong>Revision requested:</strong> {evidence.feedback} Improve this project and
                  resubmit within Course {String(course.number).padStart(2, '0')}.
                </div>
              )}
              <div className="mt-6 space-y-4">
                <Field
                  id="artefact"
                  label="Describe your artefact or facilitator-recorded demonstration"
                  hint="No file upload or public link is required. Use fictional data; local text only."
                >
                  <textarea
                    className="field min-h-32"
                    id="artefact"
                    maxLength={5000}
                    value={artefact}
                    onChange={(event) => setArtefact(event.target.value)}
                    placeholder="I made a safe example that shows..."
                  />
                </Field>
                <Field id="reflection" label="What did you test or change?">
                  <textarea
                    className="field min-h-24"
                    id="reflection"
                    maxLength={5000}
                    value={reflection}
                    onChange={(event) => setReflection(event.target.value)}
                    placeholder="I tested... and revised..."
                  />
                </Field>
                <Field id="evidence-mode" label="Evidence format">
                  <select
                    id="evidence-mode"
                    className="field"
                    value={mode}
                    onChange={(event) => setMode(event.target.value as ResponseMode)}
                  >
                    <option value="typed">Typed description</option>
                    <option value="dictated-or-described">
                      Facilitator-recorded oral or visual explanation
                    </option>
                  </select>
                </Field>
                <label className="flex items-start gap-3 text-xs leading-6 text-body">
                  <input
                    type="checkbox"
                    checked={safetyChecked}
                    onChange={(event) => setSafetyChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  I checked that this description uses no personal details, secrets or unapproved
                  sharing and that any borrowed work is credited.
                </label>
              </div>
              <Button onClick={submitEvidence} className="mt-6">
                Send to demo review queue <ArrowRight className="h-4 w-4" />
              </Button>
              {message && (
                <p className="mt-4 text-xs font-bold text-body" role="status">
                  {message}
                </p>
              )}
            </Card>
            <Card className="h-fit p-6">
              <NotebookPen className="h-6 w-6 text-brand-600" />
              <h2 className="mt-3 font-display text-xl text-heading">Review gate</h2>
              <p className="mt-2 text-xs leading-6 text-body">
                A facilitator or classroom teacher must inspect the project in this preview and
                enter a project rubric score of at least 70%, mark safety passed and provide
                feedback. No learner self-approval.
              </p>
              <p className="mt-4 text-xs leading-6 text-body">
                {course.number === 44
                  ? 'Capstone: problem 10%, functionality 25%, accessibility/design 15%, technical reasoning 15%, testing/revision 15%, safety/privacy 10% and presentation/reflection 10%.'
                  : 'Default overall weighting: quiz 20%, guided practice 20%, project 40%, reflection 10% and safety 10%.'}
              </p>
            </Card>
          </div>
        )}
      {status === 'review' && (
        <Card className="p-7">
          <Badge tone="purple">Awaiting demo review</Badge>
          <h2 className="mt-3 font-display text-2xl text-heading">
            Your work stays in this course.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-body">
            The project description is queued locally for a facilitator or classroom teacher
            preview. No real reviewer has been contacted. Course{' '}
            {String(course.number + 1).padStart(2, '0')} remains locked until the rubric, safety and
            prerequisite gates pass.
          </p>
          <Link to="/app/courses" className={buttonStyles('outline', 'md', 'mt-5')}>
            See pathway states
          </Link>
        </Card>
      )}
      <div className="mt-8">
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
          to="/app/courses"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the 44-course map ·{' '}
          {completedPrefix(state.curriculum)} passed
        </Link>
      </div>
    </>
  );
}
