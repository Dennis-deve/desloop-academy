import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Flag,
  Hammer,
  LockKeyhole,
  Pencil,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Card,
  Eyebrow,
  Modal,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '@/components/ui';
import { useAuth, useDemo, useToast } from '@/app/providers';
import { lessonsFor, masterCourses, masterStages } from '@/curriculum/model';
import { completedPrefix, courseState, lessonComplete, nextAction } from '@/curriculum/progression';
import { CourseStatus, DraftNotice } from '@/features/curriculum/shared';

export function LearnerDashboard() {
  const { session } = useAuth();
  const { state, actions } = useDemo();
  const toast = useToast();
  const [goalOpen, setGoalOpen] = useState(false);
  const [draftGoal, setDraftGoal] = useState(state.goal);
  const passed = completedPrefix(state.curriculum);
  const current = masterCourses[Math.min(passed, 43)];
  const status = courseState(current, state.curriculum);
  const lessons = lessonsFor(current);
  const practised = lessons.filter((lesson) =>
    lessonComplete(current, lesson.id, state.curriculum),
  ).length;
  const next = nextAction(current, state.curriculum);
  const unread = state.notifications.filter((notice) => !notice.read).length;
  return (
    <>
      <PageHeader
        eyebrow="Your learning space · required curriculum"
        title={`Welcome back, ${session?.name.split(' ')[0] ?? 'learner'}.`}
        description="The same 44-course journey for everyone. Work on one useful step today; support and examples adapt to your learning band."
        action={
          <Link to="/app/courses" className={buttonStyles('outline')}>
            View 44-course map <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white sm:p-8 lg:p-9">
        <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border-[50px] border-white/5" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_230px] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#a9f0d4]">
              <Sparkles className="h-3.5 w-3.5" /> Your required next step
            </span>
            <h2 className="mt-5 font-display text-3xl sm:text-4xl">
              Course {String(current.number).padStart(2, '0')}: {current.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              {status === 'completed'
                ? 'You have reached the end of the demo pathway.'
                : current.purpose}{' '}
              {status === 'review'
                ? 'Your project is waiting for a demo reviewer. There is no jump around this gate.'
                : status === 'revision'
                  ? 'Use feedback and try again within this course.'
                  : ''}
            </p>
            {next.href && (
              <Link to={next.href} className={buttonStyles('white', 'md', 'mt-6')}>
                {next.label} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              Required course passes
            </p>
            <p className="mt-3 font-display text-4xl">
              {passed}
              <span className="text-xl text-white/60"> / 44</span>
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {practised} of {lessons.length} lessons practised in this course
            </p>
            <div
              className="mt-4 h-2 rounded-full bg-white/20"
              role="progressbar"
              aria-label="Required courses passed"
              aria-valuemin={0}
              aria-valuemax={44}
              aria-valuenow={passed}
            >
              <div
                className="h-2 rounded-full bg-[#8fe0c8]"
                style={{ width: `${(passed / 44) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-[10px] text-white/70">Local preview only · no official pass</p>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <DraftNotice compact />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Eyebrow>Keep the momentum</Eyebrow>
              <h2 className="mt-2 font-display text-2xl text-heading">Continue learning</h2>
            </div>
            <CourseStatus status={status} />
          </div>
          <p className="mt-4 text-sm leading-7 text-body">{current.purpose}</p>
          <ProgressBar
            value={Math.round((practised / lessons.length) * 100)}
            label="Practice in current course"
            className="mt-5"
          />
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Link
                  to={`/app/learn/${current.id}/${lesson.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line p-3 text-xs font-bold text-body hover:bg-raised"
                >
                  {lessonComplete(current, lesson.id, state.curriculum) ? (
                    <Check className="h-4 w-4 shrink-0 text-mint-600" />
                  ) : index > practised ? (
                    <LockKeyhole className="h-4 w-4 shrink-0 text-subdued" />
                  ) : (
                    <BookOpen className="h-4 w-4 shrink-0 text-brand-600" />
                  )}
                  {lesson.title}
                  <ChevronRight className="ml-auto h-3 w-3 shrink-0" />
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            {next.href && (
              <Link className={buttonStyles('primary', 'sm')} to={next.href}>
                {next.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link className={buttonStyles('outline', 'sm')} to={`/app/assess/${current.id}`}>
              Assessment & project
            </Link>
          </div>
        </Card>
        <Card className="flex flex-col p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-50 text-mint-700">
              <Flag className="h-5 w-5" />
            </span>
            <button
              onClick={() => {
                setDraftGoal(state.goal);
                setGoalOpen(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-subdued hover:bg-raised"
              aria-label="Edit learning goal"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-5 font-display text-2xl text-heading">Your learning goal</h2>
          <p className="mt-2 text-sm leading-7 text-body">{state.goal}</p>
          <p className="mt-auto pt-5 text-[11px] text-subdued">
            A goal you choose for yourself, not a score to chase. Progress stays in this browser.
          </p>
        </Card>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Eyebrow>One ordered journey</Eyebrow>
              <h2 className="mt-1 font-display text-2xl text-heading">
                Nine stages. One sequence.
              </h2>
            </div>
            <Link
              to="/app/courses"
              className="text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              All 44 courses →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {masterStages.map((stage) => {
              const stageState =
                passed >= stage.last
                  ? 'Passed'
                  : current.number >= stage.first && current.number <= stage.last
                    ? 'In progress'
                    : 'Locked';
              return (
                <Link
                  to={`/courses#stage-${stage.number}`}
                  key={stage.number}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 hover:bg-raised"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${stageState === 'Passed' ? 'bg-mint-50 text-mint-700' : stageState === 'In progress' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100' : 'bg-raised text-subdued'}`}
                  >
                    {stageState === 'Passed' ? <Check className="h-4 w-4" /> : stage.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-extrabold text-heading">{stage.title}</span>
                    <span className="text-[11px] text-subdued">
                      Courses {stage.first}–{stage.last} · {stageState}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        <div className="space-y-5">
          <Card className="p-6">
            <Eyebrow>Required course project</Eyebrow>
            <h2 className="mt-2 font-display text-xl text-heading">Make it real.</h2>
            <p className="mt-2 text-xs leading-6 text-body">{current.project.brief}</p>
            <Link
              to={`/app/assess/${current.id}`}
              className={buttonStyles('outline', 'sm', 'mt-5')}
            >
              View project gate <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          <Card className="p-6">
            <Hammer className="h-5 w-5 text-brand-600" />
            <h2 className="mt-3 text-sm font-extrabold text-heading">
              Optional sample practice studio
            </h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Try illustrative standalone workshops and projects. They do not satisfy or unlock any
              of the 44 required courses.
            </p>
            <Link
              to="/app/samples"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Open samples <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">Learning updates</h2>
            </div>
            <p className="mt-3 text-xs leading-6 text-body">
              No live sessions are scheduled in this demo. {unread} sample update
              {unread === 1 ? '' : 's'} unread.
            </p>
            <Link
              to="/workspace/notifications"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              <Bell className="h-3.5 w-3.5" /> View updates
            </Link>
          </Card>
        </div>
      </div>
      <Modal
        open={goalOpen}
        onOpenChange={setGoalOpen}
        title="Set a goal that fits your life"
        description="Keep it specific and kind to yourself. Your goal stays in this browser."
        footer={
          <>
            <Button variant="outline" onClick={() => setGoalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (draftGoal.trim().length < 3) {
                  toast('Add a little more detail to your goal.', 'error');
                  return;
                }
                actions.setGoal(draftGoal.trim());
                setGoalOpen(false);
                toast('Learning goal updated locally.');
              }}
            >
              Save goal
            </Button>
          </>
        }
      >
        <label htmlFor="goal-draft" className="mb-2 block text-xs font-extrabold text-heading">
          My goal
        </label>
        <textarea
          id="goal-draft"
          className="field"
          rows={3}
          maxLength={120}
          value={draftGoal}
          onChange={(event) => setDraftGoal(event.target.value)}
        />
      </Modal>
    </>
  );
}
