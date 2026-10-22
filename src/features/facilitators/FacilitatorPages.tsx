import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Eye,
  FilePlus2,
  GripVertical,
  Lightbulb,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  WandSparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  InfoBox,
  Input,
  Modal,
  PageHeader,
  Skeleton,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { courseDraftSchema } from '@/lib/validation';
import { useDemo, useToast } from '@/app/providers';
import type { ContentStatus, CourseDraft } from '@/types';
import { ClassroomReviewPage } from '@/features/schools/SchoolDashboard';

type Values = z.infer<typeof courseDraftSchema>;
const blankValues: Values = {
  title: '',
  subject: '',
  audience: 'Adults',
  objectives: '',
  duration: '4 weeks',
  language: 'English',
  teachingStyle: 'Project-based and guided',
  projectOutcome: '',
};
const blankModule = () => ({
  id: `module-${Date.now()}-${Math.random()}`,
  title: '',
  lessons: [{ id: `lesson-${Date.now()}-${Math.random()}`, title: '', content: '' }],
});

export function FacilitatorDashboard() {
  const { state } = useDemo();
  const draft = state.savedCourseDraft;
  return (
    <>
      <PageHeader
        eyebrow="Facilitator workspace · demonstration"
        title="Help learning come alive."
        description="Create thoughtful content, guide practical work and give feedback that moves a learner forward."
        action={
          <Link to="/facilitator/courses/new" className={buttonStyles('primary')}>
            Create a course draft <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        This creator workspace is a local preview. No content is published, AI API is connected or
        facilitator is verified by using this interface.
      </InfoBox>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: BookOpen, label: 'Local course drafts', value: draft ? '01' : '00' },
          {
            icon: ClipboardCheck,
            label: 'Sample submissions',
            value:
              `${state.submissions.filter((item) => item.status === 'submitted').length}`.padStart(
                2,
                '0',
              ),
          },
          { icon: CalendarDays, label: 'Scheduled sessions', value: '00' },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-6">
            <Icon className="h-5 w-5 text-brand-600" />
            <p className="mt-5 text-[11px] font-bold text-body">{label}</p>
            <p className="mt-1 font-display text-3xl text-heading">{value}</p>
            <p className="mt-1 text-[10px] text-subdued">Illustrative workspace state</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl text-heading">Course creation</h2>
            <Sparkles className="h-5 w-5 text-brand-600" />
          </div>
          {draft ? (
            <div className="mt-5 rounded-2xl bg-raised p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="blue">{draft.subject || 'New subject'}</Badge>
                <StatusBadge status={draft.status} />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-heading">
                {draft.title || 'Untitled course draft'}
              </h3>
              <p className="mt-2 text-xs text-body">
                {draft.modules.length} module{draft.modules.length === 1 ? '' : 's'} ·{' '}
                {draft.audience} · local draft
              </p>
              <Link to="/facilitator/courses/new" className={buttonStyles('outline', 'sm', 'mt-5')}>
                Continue editing <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line p-7 text-center">
              <FilePlus2 className="mx-auto h-8 w-8 text-brand-600" />
              <p className="mt-3 text-xs font-bold text-heading">
                Your first course starts with an objective.
              </p>
              <Link to="/facilitator/courses/new" className={buttonStyles('outline', 'sm', 'mt-5')}>
                Start a draft
              </Link>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <ClipboardCheck className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Project feedback</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              See a demonstration of review, revision requests and constructive comments.
            </p>
            <Link to="/facilitator/reviews" className={buttonStyles('outline', 'sm', 'mt-4')}>
              Open review space <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-6">
            <ShieldCheck className="h-5 w-5 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Quality before publication</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              AI suggestions are drafts. Human review, safeguarding and authorised approval come
              before a course goes live.
            </p>
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Lightbulb,
            title: 'Start with outcomes',
            text: 'Describe what learners can do, not just what they will read.',
          },
          {
            icon: WandSparkles,
            title: 'Use AI as a drafting tool',
            text: 'Generate a sample outline, then verify and improve it.',
          },
          {
            icon: UsersRound,
            title: 'Make room for people',
            text: 'Add projects, questions and opportunities for feedback.',
          },
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title} className="p-6">
            <Icon className="h-5 w-5 text-brand-600" />
            <h3 className="mt-4 text-sm font-extrabold text-heading">{title}</h3>
            <p className="mt-2 text-xs leading-6 text-body">{text}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
export function FacilitatorCoursesPage() {
  const { state } = useDemo();
  const draft = state.savedCourseDraft;
  return (
    <>
      <PageHeader
        eyebrow="Facilitator / My courses"
        title="Build something worth teaching."
        description="Create and refine a local course draft, then preview the review workflow."
        action={
          <Link to="/facilitator/courses/new" className={buttonStyles('primary')}>
            <Plus className="h-4 w-4" /> Create course
          </Link>
        }
      />
      {draft ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge tone="blue">{draft.subject || 'Uncategorised'}</Badge>
              <h2 className="mt-3 text-lg font-extrabold text-heading">
                {draft.title || 'Untitled course draft'}
              </h2>
              <p className="mt-2 text-xs text-body">
                {draft.audience} · {draft.modules.length} module(s) · Sample local draft
              </p>
            </div>
            <StatusBadge status={draft.status} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <Link to="/facilitator/courses/new" className={buttonStyles('outline', 'sm')}>
              Open editor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={FilePlus2}
          title="No course drafts yet"
          description="Start with a subject, learner objectives and one useful project outcome."
          action={
            <Link to="/facilitator/courses/new" className={buttonStyles('primary')}>
              Create your first draft
            </Link>
          }
        />
      )}
      <InfoBox tone="amber" className="mt-6">
        The 44 required courses are a separate versioned authoring draft; optional sample workshops
        are also fixed. This local editor cannot change either catalogue or bypass publication
        review. Use Pathway reviews for local project-assessment previews, never real child work.
      </InfoBox>
    </>
  );
}
export function CourseEditorPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [params] = useSearchParams();
  const initial = state.savedCourseDraft;
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(courseDraftSchema),
    defaultValues: initial
      ? {
          title: initial.title,
          subject: initial.subject,
          audience: initial.audience,
          objectives: initial.objectives,
          duration: initial.duration,
          language: initial.language,
          teachingStyle: initial.teachingStyle,
          projectOutcome: initial.projectOutcome,
        }
      : {
          ...blankValues,
          ...(params.get('template') === 'digital'
            ? {
                title: 'Everyday digital skills',
                subject: 'Digital literacy',
                projectOutcome: 'Create a useful digital guide',
              }
            : {}),
        },
  });
  const [modules, setModules] = useState<CourseDraft['modules']>(
    initial?.modules ?? [blankModule()],
  );
  const [quizQuestions, setQuizQuestions] = useState<string[]>(initial?.quizQuestions ?? ['']);
  const [assignment, setAssignment] = useState(initial?.assignment ?? '');
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? 'draft');
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [preview, setPreview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const title = watch('title');
  const subject = watch('subject');
  const audience = watch('audience');
  const objectives = watch('objectives');
  const duration = watch('duration');
  const language = watch('language');
  const teachingStyle = watch('teachingStyle');
  const projectOutcome = watch('projectOutcome');
  useEffect(() => {
    if (!dirty) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      actions.setCourseDraft({ ...getValues(), modules, quizQuestions, assignment, status });
      setDirty(false);
      setSaveState('saved');
    }, 750);
    return () => clearTimeout(timer);
  }, [
    dirty,
    title,
    subject,
    audience,
    objectives,
    duration,
    language,
    teachingStyle,
    projectOutcome,
    modules,
    quizQuestions,
    assignment,
    status,
    actions,
    getValues,
  ]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
  const updateModule = (id: string, value: string) => {
    setModules((previous) =>
      previous.map((item) => (item.id === id ? { ...item, title: value } : item)),
    );
    setDirty(true);
  };
  const updateLesson = (
    moduleId: string,
    lessonId: string,
    field: 'title' | 'content',
    value: string,
  ) => {
    setModules((previous) =>
      previous.map((item) =>
        item.id === moduleId
          ? {
              ...item,
              lessons: item.lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, [field]: value } : lesson,
              ),
            }
          : item,
      ),
    );
    setDirty(true);
  };
  const saveNow = () => {
    actions.setCourseDraft({ ...getValues(), modules, quizQuestions, assignment, status });
    setDirty(false);
    setSaveState('saved');
    toast('Course draft saved in this browser.');
  };
  const generate = () => {
    setGenerateOpen(false);
    setStatus('generating');
    setDirty(true);
    window.setTimeout(() => {
      setModules([
        {
          id: `sample-m1-${Date.now()}`,
          title: `Discover ${getValues('subject') || 'the subject'}`,
          lessons: [
            {
              id: `sample-l1-${Date.now()}`,
              title: 'A useful first idea',
              content:
                'Sample outline: introduce one practical concept and ask learners to notice where it appears in daily life. Replace this with reviewed teaching content.',
            },
            {
              id: `sample-l2-${Date.now()}`,
              title: 'Try it yourself',
              content:
                'Sample outline: give learners a small task, invite a first attempt, then ask them to reflect on what changed.',
            },
          ],
        },
        {
          id: `sample-m2-${Date.now()}`,
          title: 'Make and improve',
          lessons: [
            {
              id: `sample-l3-${Date.now()}`,
              title: 'Build a small project',
              content:
                'Sample outline: plan, build, test and improve a useful outcome. Add safety and accessibility checks before review.',
            },
          ],
        },
      ]);
      setQuizQuestions(['What would you try first, and why?']);
      setAssignment(
        getValues('projectOutcome') ||
          'Create a small project that demonstrates the learning objective.',
      );
      setStatus('generated');
      setDirty(true);
      toast('Scripted sample outline generated locally. It is not an AI response.');
    }, 1100);
  };
  const submitReview = (values: Values) => {
    if (
      !modules.some(
        (module) =>
          module.title.trim() &&
          module.lessons.some(
            (lesson) => lesson.title.trim() && lesson.content.trim().length >= 15,
          ),
      )
    ) {
      setReviewError('Add at least one named module and lesson with 15+ characters of content.');
      return;
    }
    if (!quizQuestions.some((question) => question.trim().length >= 10)) {
      setReviewError('Add at least one knowledge check question (10+ characters).');
      return;
    }
    if (assignment.trim().length < 10) {
      setReviewError('Add a practical assignment of at least 10 characters.');
      return;
    }
    setReviewError('');
    actions.setCourseDraft({ ...values, modules, quizQuestions, assignment, status: 'in_review' });
    setStatus('in_review');
    setDirty(false);
    toast('Local draft moved to “in review”. No reviewer was notified.');
  };
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/facilitator/courses"
          onClick={(event) => {
            if (dirty && !window.confirm('You have unsaved changes. Leave the editor?'))
              event.preventDefault();
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-body hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> My courses
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-subdued">
            {saveState === 'saving' ? 'Saving locally...' : 'Saved locally'}
          </span>
          <StatusBadge status={status} />
        </div>
      </div>
      <PageHeader
        eyebrow="Course authoring · local demo"
        title="Shape a course with purpose."
        description="Start with outcomes, build a learning sequence, add practice and submit a reviewable draft. Nothing is published from this browser."
        action={
          <>
            <Button variant="outline" onClick={saveNow}>
              <Save className="h-4 w-4" /> Save draft
            </Button>
            <Button variant="soft" onClick={() => setPreview(true)}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
          </>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        AI course generation here is a scripted sample outline, not a connected model. Drafts save
        to this browser. A secure backend, expert review and server-side approval are required
        before publication.
      </InfoBox>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_260px]">
        <form
          onChange={() => setDirty(true)}
          onSubmit={handleSubmit(submitReview)}
          noValidate
          className="space-y-5"
        >
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <BookOpen className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-extrabold text-heading">01 · Course details</h2>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field id="editor-title" label="Course title *" error={errors.title?.message}>
                <Input
                  id="editor-title"
                  placeholder="e.g. Everyday digital confidence"
                  aria-invalid={!!errors.title}
                  {...register('title')}
                />
              </Field>
              <Field id="editor-subject" label="Subject *" error={errors.subject?.message}>
                <Input
                  id="editor-subject"
                  placeholder="e.g. Digital literacy"
                  aria-invalid={!!errors.subject}
                  {...register('subject')}
                />
              </Field>
              <Field
                id="editor-audience"
                label="Learner audience *"
                error={errors.audience?.message}
              >
                <select id="editor-audience" className="field" {...register('audience')}>
                  <option>Children</option>
                  <option>Teenagers</option>
                  <option>Adults</option>
                  <option>All ages</option>
                </select>
              </Field>
              <Field
                id="editor-duration"
                label="Estimated duration *"
                error={errors.duration?.message}
              >
                <Input id="editor-duration" placeholder="e.g. 4 weeks" {...register('duration')} />
              </Field>
              <Field id="editor-language" label="Language *" error={errors.language?.message}>
                <Input id="editor-language" placeholder="e.g. English" {...register('language')} />
              </Field>
              <Field
                id="editor-style"
                label="Teaching style *"
                error={errors.teachingStyle?.message}
              >
                <Input
                  id="editor-style"
                  placeholder="e.g. Project-based"
                  {...register('teachingStyle')}
                />
              </Field>
            </div>
            <div className="mt-5 space-y-5">
              <Field
                id="editor-objectives"
                label="Learning objectives *"
                error={errors.objectives?.message}
                hint="What should learners be able to do, in their own words?"
              >
                <textarea
                  id="editor-objectives"
                  rows={3}
                  className="field resize-y"
                  placeholder="By the end, learners can..."
                  {...register('objectives')}
                />
              </Field>
              <Field
                id="editor-project"
                label="Practical project outcome *"
                error={errors.projectOutcome?.message}
              >
                <Input
                  id="editor-project"
                  placeholder="e.g. Create a useful digital guide"
                  {...register('projectOutcome')}
                />
              </Field>
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-200">
                  Structure the journey
                </span>
                <h2 className="mt-1 text-lg font-extrabold text-heading">02 · Modules & lessons</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModules((previous) => [...previous, blankModule()]);
                  setDirty(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add module
              </Button>
            </div>
            <p className="mt-2 text-xs leading-6 text-body">
              Keep lessons short, clear and connected to practical work.
            </p>
            <div className="mt-6 space-y-5">
              {modules.map((module, moduleIndex) => (
                <div
                  key={module.id}
                  className="rounded-2xl border border-line bg-raised p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-subdued" />
                    <span className="text-[10px] font-extrabold text-subdued">
                      0{moduleIndex + 1}
                    </span>
                    <input
                      aria-label={`Module ${moduleIndex + 1} title`}
                      value={module.title}
                      onChange={(event) => updateModule(module.id, event.target.value)}
                      className="field !min-h-10 flex-1 !py-2 text-xs font-bold"
                      placeholder="Module title"
                    />
                    <button
                      type="button"
                      aria-label={`Remove module ${moduleIndex + 1}`}
                      onClick={() => {
                        setModules((previous) => previous.filter((item) => item.id !== module.id));
                        setDirty(true);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3 pl-1 sm:pl-6">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="rounded-xl border border-line bg-panel p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-subdued">
                            Lesson {lessonIndex + 1}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove lesson ${lessonIndex + 1}`}
                            onClick={() => {
                              setModules((previous) =>
                                previous.map((item) =>
                                  item.id === module.id
                                    ? {
                                        ...item,
                                        lessons: item.lessons.filter(
                                          (entry) => entry.id !== lesson.id,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                              setDirty(true);
                            }}
                            className="ml-auto text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <label htmlFor={`lesson-title-${lesson.id}`} className="sr-only">
                          Lesson title
                        </label>
                        <input
                          id={`lesson-title-${lesson.id}`}
                          value={lesson.title}
                          onChange={(event) =>
                            updateLesson(module.id, lesson.id, 'title', event.target.value)
                          }
                          className="field mt-2 !min-h-10 !py-2 text-xs"
                          placeholder="Lesson title"
                        />
                        <label htmlFor={`lesson-content-${lesson.id}`} className="sr-only">
                          Lesson outline
                        </label>
                        <textarea
                          id={`lesson-content-${lesson.id}`}
                          value={lesson.content}
                          onChange={(event) =>
                            updateLesson(module.id, lesson.id, 'content', event.target.value)
                          }
                          rows={2}
                          className="field mt-2 resize-y text-xs"
                          placeholder="What will the learner understand or practise?"
                        />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setModules((previous) =>
                          previous.map((item) =>
                            item.id === module.id
                              ? {
                                  ...item,
                                  lessons: [
                                    ...item.lessons,
                                    {
                                      id: `lesson-${Date.now()}-${Math.random()}`,
                                      title: '',
                                      content: '',
                                    },
                                  ],
                                }
                              : item,
                          ),
                        );
                        setDirty(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add lesson
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-200">
              Practice makes it stick
            </span>
            <h2 className="mt-1 text-lg font-extrabold text-heading">03 · Check & apply</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Add a knowledge check and a practical assignment. These will need review before
              publication.
            </p>
            <div className="mt-5 space-y-3">
              {quizQuestions.map((question, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    aria-label={`Knowledge check question ${index + 1}`}
                    value={question}
                    onChange={(event) => {
                      setQuizQuestions((previous) =>
                        previous.map((item, i) => (i === index ? event.target.value : item)),
                      );
                      setDirty(true);
                    }}
                    className="field"
                    placeholder="What question checks understanding?"
                  />
                  <button
                    type="button"
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => {
                      setQuizQuestions((previous) => previous.filter((_, i) => i !== index));
                      setDirty(true);
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuizQuestions((previous) => [...previous, '']);
                  setDirty(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </div>
            <label
              htmlFor="editor-assignment"
              className="mt-6 block text-xs font-extrabold text-heading"
            >
              Practical assignment *
            </label>
            <textarea
              id="editor-assignment"
              rows={3}
              value={assignment}
              onChange={(event) => {
                setAssignment(event.target.value);
                setDirty(true);
              }}
              className="field mt-2 resize-y"
              placeholder="Make a small project that demonstrates..."
            />
            {reviewError && (
              <p role="alert" className="field-error mt-4">
                {reviewError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-6">
              <Button type="submit">
                <ClipboardCheck className="h-4 w-4" /> Submit local review state
              </Button>
              <Button variant="outline" onClick={saveNow}>
                <Save className="h-4 w-4" /> Save draft
              </Button>
            </div>
          </Card>
        </form>
        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">AI-assisted outline</h2>
            </div>
            <p className="mt-3 text-xs leading-6 text-body">
              Load a scripted outline based on the subject, then refine every lesson. This is not
              connected to an AI provider.
            </p>
            <Button
              size="sm"
              variant="soft"
              className="mt-4 w-full"
              disabled={status === 'generating'}
              onClick={() => setGenerateOpen(true)}
            >
              <WandSparkles className="h-4 w-4" /> Draft sample outline
            </Button>
            {status === 'generating' && (
              <div role="status" className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <span className="text-[11px] text-body">Preparing scripted sample...</span>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-extrabold text-heading">Review stages</h2>
            <div className="mt-4 space-y-3">
              {[
                'Draft',
                'Generating',
                'Generated',
                'In review',
                'Changes requested',
                'Approved',
                'Published',
                'Archived',
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-[11px] text-body">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${status.replace(/_/g, ' ').toLowerCase() === step.toLowerCase() ? 'bg-brand-600 text-white' : 'bg-raised text-subdued'}`}
                  >
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </Card>
          <InfoBox tone="amber">
            Submitting here changes only a local status. A server must enforce who can generate,
            review, approve and publish.
          </InfoBox>
        </aside>
      </div>
      <Modal
        open={preview}
        onOpenChange={setPreview}
        title={getValues('title') || 'Untitled course preview'}
        description="A private preview of your local draft, not a published course."
        footer={<Button onClick={() => setPreview(false)}>Close preview</Button>}
      >
        <div className="space-y-4 text-xs leading-6 text-body">
          <p>
            <strong className="text-heading">Subject:</strong> {getValues('subject') || 'Not set'} ·{' '}
            {getValues('audience')}
          </p>
          <p>
            <strong className="text-heading">Objectives:</strong>{' '}
            {getValues('objectives') || 'Add objectives to guide learning.'}
          </p>
          <p>
            <strong className="text-heading">Project outcome:</strong>{' '}
            {getValues('projectOutcome') || 'Not set'}
          </p>
          <div className="border-t border-line pt-3">
            {modules.map((module) => (
              <div key={module.id} className="mb-3">
                <strong className="text-heading">{module.title || 'Untitled module'}</strong>
                <ul className="ml-4 list-disc">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>{lesson.title || 'Untitled lesson'}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p>
            <strong className="text-heading">Assignment:</strong> {assignment || 'Not yet added'}
          </p>
        </div>
      </Modal>
      <Modal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title="Replace the current outline?"
        description="This loads a scripted sample outline and replaces your current modules, quiz questions and assignment. It is not real AI generation."
        footer={
          <>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generate}>Load sample outline</Button>
          </>
        }
      >
        <InfoBox tone="amber">
          Save your current draft first if you want a local copy. Only one course draft is stored in
          this demo.
        </InfoBox>
      </Modal>
    </>
  );
}
export function FacilitatorReviewsPage() {
  return <ClassroomReviewPage context="facilitator" />;
}
