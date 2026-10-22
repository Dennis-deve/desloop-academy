import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudDownload,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  NotebookPen,
  Play,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  InfoBox,
  ProgressBar,
  buttonStyles,
} from '@/components/ui';
import { courses } from '@/mocks/catalog';
import { useDemo, useToast } from '@/app/providers';
import { offlineService } from '@/services/offline';
import { cn, percentage } from '@/lib/utils';

export function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { state, actions } = useDemo();
  const toast = useToast();
  const course = courses.find((item) => item.id === courseId);
  const lessons = course?.modules.flatMap((module) => module.lessons) ?? [];
  const lesson = lessons.find((item) => item.id === lessonId);
  const [note, setNote] = useState(() => state.notes[lessonId ?? ''] ?? '');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  if (!course || !lesson)
    return (
      <EmptyState
        title="Lesson not found"
        description="Choose a course to get back to learning."
        action={
          <Link to="/courses" className={buttonStyles('primary')}>
            Browse courses
          </Link>
        }
      />
    );
  const currentIndex = lessons.findIndex((item) => item.id === lesson.id);
  const previous = lessons[currentIndex - 1];
  const next = lessons[currentIndex + 1];
  const currentModule = course.modules.find((module) =>
    module.lessons.some((item) => item.id === lesson.id),
  );
  const done = state.completedLessonIds.includes(lesson.id);
  const correct = selectedAnswer === lesson.quiz.correct;
  const completedCount = lessons.filter((item) =>
    state.completedLessonIds.includes(item.id),
  ).length;
  const bookmarked = state.bookmarkedLessonIds.includes(lesson.id);
  const noteChanged = note !== (state.notes[lesson.id] ?? '');
  const saveOffline = async () => {
    setSavingOffline(true);
    try {
      await offlineService.save({
        id: lesson.id,
        courseId: course.id,
        courseTitle: course.title,
        lesson,
        savedAt: new Date().toISOString(),
      });
      toast('Lesson text saved to this browser for offline reading.');
    } catch {
      toast('Offline storage is unavailable. Try again in a supported browser.', 'error');
    } finally {
      setSavingOffline(false);
    }
  };
  const goTo = (id: string) => {
    if (noteChanged) {
      actions.saveNote(lesson.id, note);
      toast('Your note was saved locally before leaving.');
    }
    navigate(`/app/sample-lesson/${course.id}/${id}`);
  };
  return (
    <>
      <div
        className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-[#70450b] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
        role="note"
      >
        <strong>Optional sample workshop.</strong> Practice here is browser-local and does not count
        toward or unlock the required 44-course pathway.{' '}
        <Link to="/app/courses" className="font-bold underline">
          Return to your required next step
        </Link>
        .
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-body">
        <Link to="/app/courses" className="font-bold hover:text-brand-600">
          Optional workshops
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/sample-courses/${course.slug}`} className="font-bold hover:text-brand-600">
          {course.title}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-heading">{lesson.title}</span>
      </div>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-200">
            {currentModule?.title} · Lesson {currentIndex + 1} of {lessons.length}
          </span>
          <h1 className="mt-1 font-display text-3xl text-heading sm:text-4xl">{lesson.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              actions.toggleBookmark(lesson.id);
              toast(bookmarked ? 'Bookmark removed.' : 'Lesson bookmarked locally.');
            }}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
          >
            <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-brand-600 text-brand-600')} />
            {bookmarked ? 'Saved' : 'Bookmark'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={savingOffline}
            onClick={() => void saveOffline()}
          >
            <CloudDownload className="h-4 w-4" /> Save offline
          </Button>
        </div>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[240px_minmax(0,1fr)_245px]">
        <aside className="hidden xl:block">
          <Card className="sticky top-24 overflow-hidden p-4">
            <p className="mb-4 px-2 text-[10px] font-extrabold uppercase tracking-widest text-subdued">
              Course outline
            </p>
            {course.modules.map((module, index) => (
              <div key={module.id} className="mb-4">
                <p className="mb-2 px-2 text-[11px] font-extrabold text-heading">
                  {index + 1}. {module.title}
                </p>
                <div className="space-y-1">
                  {module.lessons.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => goTo(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] font-bold leading-5 text-body hover:bg-raised',
                        item.id === lesson.id && 'nav-link-active',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[10px]',
                          state.completedLessonIds.includes(item.id) &&
                            'border-mint-500 bg-mint-500 text-white',
                        )}
                      >
                        {state.completedLessonIds.includes(item.id) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          module.lessons.indexOf(item) + 1
                        )}
                      </span>
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <ProgressBar
              value={percentage(completedCount, lessons.length)}
              label="Course progress"
              className="border-t border-line px-2 pt-4"
            />
          </Card>
        </aside>
        <div className="min-w-0 space-y-5">
          <div className="xl:hidden">
            <label
              htmlFor="lesson-select"
              className="mb-1 block text-xs font-extrabold text-heading"
            >
              Jump to a lesson
            </label>
            <select
              id="lesson-select"
              value={lesson.id}
              onChange={(event) => goTo(event.target.value)}
              className="field"
            >
              {course.modules.map((module) => (
                <optgroup label={module.title} key={module.id}>
                  {module.lessons.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Card className="overflow-hidden">
            <div
              className={`course-art course-art-${course.accent} flex min-h-[190px] items-center justify-center sm:min-h-[220px]`}
            >
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-soft">
                <BookOpen className="h-7 w-7" />
              </div>
              <span className="absolute bottom-5 left-5 z-10 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold">
                TEXT LESSON · {lesson.minutes} MIN
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <Badge tone="blue">Learn the idea</Badge>
                {done && (
                  <Badge tone="green">
                    <Check className="h-3 w-3" />
                    Completed · demo
                  </Badge>
                )}
              </div>
              <div className="mt-7">
                <h2 className="text-lg font-extrabold text-heading">By the end, you can...</h2>
                <ul className="mt-3 space-y-2">
                  {lesson.objectives.map((objective) => (
                    <li
                      key={objective}
                      className="flex items-start gap-2 text-sm leading-6 text-body"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-mint-500" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="my-7 border-t border-line" />
              <div className="prose-lesson">
                {lesson.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <InfoBox tone="green" className="mt-7">
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-1 h-4 w-4 shrink-0" />
                  <div>
                    <strong className="block">Try it yourself</strong>
                    <span>{lesson.exercise}</span>
                  </div>
                </div>
              </InfoBox>
              <div className="mt-7 rounded-2xl border border-dashed border-line bg-raised p-5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-heading">
                  <Play className="h-4 w-4" />
                  Media and examples
                </div>
                <p className="mt-2 text-xs leading-6 text-body">
                  This text-based sample lesson works without a video. Authorised creators can add
                  reviewed media and interactive examples in the future.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-200">
              <ListChecks className="h-5 w-5" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">
                Knowledge check
              </span>
            </div>
            <h2 className="mt-3 text-lg font-extrabold text-heading">{lesson.quiz.question}</h2>
            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">Choose one answer</legend>
              {lesson.quiz.options.map((option, index) => (
                <label
                  key={option}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-bold transition',
                    selectedAnswer === index
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100'
                      : 'border-line text-body hover:bg-raised',
                  )}
                >
                  <input
                    type="radio"
                    name={`quiz-${lesson.id}`}
                    value={index}
                    checked={selectedAnswer === index}
                    onChange={() => {
                      setSelectedAnswer(index);
                      setChecked(false);
                    }}
                    className="h-4 w-4 accent-brand-600"
                  />
                  {option}
                </label>
              ))}
            </fieldset>
            <Button
              className="mt-5"
              size="sm"
              disabled={selectedAnswer === null}
              onClick={() => setChecked(true)}
            >
              Check my answer
            </Button>
            {checked && (
              <div
                role="status"
                className={`mt-4 rounded-xl p-4 text-xs leading-6 ${correct ? 'bg-mint-50 text-mint-700 dark:bg-mint-500/20 dark:text-mint-100' : 'bg-amber-50 text-[#946115] dark:bg-amber-500/20 dark:text-amber-100'}`}
              >
                <strong className="block">
                  {correct ? 'You got it.' : 'Not quite. Have another look.'}
                </strong>
                {lesson.quiz.explanation}
              </div>
            )}
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-extrabold text-heading">Your notes</h2>
            </div>
            <p className="mt-2 text-xs text-body">
              Capture what makes sense in your own words. Notes are stored in this browser only.
            </p>
            <label htmlFor="lesson-notes" className="sr-only">
              Notes for this lesson
            </label>
            <textarea
              id="lesson-notes"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What do you want to remember?"
              className="field mt-4 resize-y"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-subdued">
                {noteChanged ? 'Unsaved changes' : 'All changes saved locally'}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!noteChanged}
                onClick={() => {
                  actions.saveNote(lesson.id, note);
                  toast('Note saved to this browser.');
                }}
              >
                Save note
              </Button>
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-heading">Ready for the next step?</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Finish the knowledge check, then mark this lesson complete. Progress here is a local
              demonstration, not a verified record.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={!done && !(checked && correct)}
                onClick={() => {
                  actions.completeLesson(lesson.id);
                  toast('Lesson marked complete in this demo.');
                }}
              >
                {done ? 'Completed' : 'Mark lesson complete'} <Check className="h-4 w-4" />
              </Button>
              {next && (
                <Button variant="outline" onClick={() => goTo(next.id)}>
                  Next lesson <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!done && !(checked && correct) && (
              <p className="mt-3 text-[11px] text-subdued">
                Answer the check correctly to enable completion.
              </p>
            )}
          </Card>
          <div className="flex justify-between gap-3 pb-5 text-xs font-bold">
            {previous ? (
              <button
                onClick={() => goTo(previous.id)}
                className="inline-flex items-center gap-1 text-body hover:text-brand-600"
              >
                <ArrowLeft className="h-4 w-4" /> Previous lesson
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                onClick={() => goTo(next.id)}
                className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-200"
              >
                Next lesson <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/app/projects"
                className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-200"
              >
                Explore projects <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-heading">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Need a different explanation?
            </div>
            <p className="mt-2 text-xs leading-6 text-body">
              Ask for a hint, an example, or a simple explanation. The current tutor uses sample
              responses.
            </p>
            <Link
              to={`/app/ai-studio?lesson=${encodeURIComponent(lesson.title)}`}
              className={buttonStyles('soft', 'sm', 'mt-4 w-full')}
            >
              Open AI studio <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-heading">
              <MessageCircleQuestion className="h-4 w-4 text-brand-600" />
              Learning with people
            </div>
            <p className="mt-2 text-xs leading-6 text-body">
              Human feedback matters. The demo community offers moderated-style discussion controls,
              but does not contact a real educator.
            </p>
            <Link
              to="/app/community"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Visit community <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-extrabold text-heading">Related project</h3>
            <p className="mt-2 text-xs leading-6 text-body">{course.project}</p>
            <Link
              to="/app/projects"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Open project studio <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </aside>
      </div>
    </>
  );
}
