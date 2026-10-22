import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  Clock3,
  Code2,
  Palette,
  Play,
  SearchX,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  ErrorState,
  Eyebrow,
  InfoBox,
  LoadingCards,
  PageHeader,
  ProgressBar,
  SearchInput,
  SectionHeading,
  buttonStyles,
} from '@/components/ui';
import { categories } from '@/config/site';
import { demoCatalogService } from '@/services/demo';
import { useAuth, useDemo, useToast } from '@/app/providers';
import { percentage } from '@/lib/utils';
import type { Course } from '@/types';

const artIcons: Record<Course['icon'], LucideIcon> = {
  laptop: BookOpen,
  code: Code2,
  spark: BrainCircuit,
  shield: ShieldCheck,
  chart: ChartNoAxesCombined,
  palette: Palette,
};
export function CourseCard({
  course,
  progress,
  compact = false,
}: {
  course: Course;
  progress?: number;
  compact?: boolean;
}) {
  const Icon = artIcons[course.icon];
  return (
    <Link
      to={`/sample-courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-panel transition duration-200 hover:-translate-y-1 hover:shadow-soft"
    >
      <div
        className={`course-art course-art-${course.accent} flex ${compact ? 'h-36' : 'h-44'} items-center justify-center`}
      >
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/50 bg-white/55 shadow-soft">
          <Icon className="h-9 w-9" strokeWidth={1.5} />
        </div>
        <span className="absolute right-4 top-4 z-10 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-extrabold">
          {course.audience}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-200">
          {course.category} · {course.level}
        </p>
        <h3 className="mt-2 text-base font-extrabold leading-snug text-heading">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-6 text-body">{course.subtitle}</p>
        {progress !== undefined && (
          <ProgressBar value={progress} label="Your progress" className="mt-4" />
        )}
        <div
          className="mt-auto flex items-center justify-between border-t border-line pt-4 text-[11px] font-bold text-subdued"
          style={{ marginTop: progress !== undefined ? 18 : 22 }}
        >
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {course.duration}
          </span>
          <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-200">
            View course <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CatalogPage({ embedded = false }: { embedded?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState('featured');
  const { state } = useDemo();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: demoCatalogService.listCourses,
  });
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? 'All subjects';
  const level = params.get('level') ?? 'All levels';
  const audience = params.get('audience') ?? 'All ages';
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value.startsWith('All ')) next.delete(key);
    else next.set(key, value);
    setParams(next);
  };
  const filtered = useMemo(() => {
    let list = (data ?? []).filter(
      (course) =>
        `${course.title} ${course.category} ${course.description} ${course.skills.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (category === 'All subjects' || course.category === category) &&
        (level === 'All levels' || course.level === level) &&
        (audience === 'All ages' || course.audience === audience || course.audience === 'All ages'),
    );
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'duration')
      list = [...list].sort((a, b) => parseInt(a.duration) - parseInt(b.duration));
    return list;
  }, [data, search, category, level, audience, sort]);
  const enrolled = filtered; // These are optional samples, not the required course sequence.
  return (
    <div className={embedded ? '' : 'public-bg min-h-screen'}>
      {!embedded && (
        <section className="hero-surface border-b border-line py-14 sm:py-20">
          <Container>
            <Eyebrow>Optional sample workshops · local demo</Eyebrow>
            <h1 className="mt-3 max-w-2xl font-display text-5xl leading-tight text-heading sm:text-6xl">
              Explore standalone practice samples.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-8 text-body sm:text-base">
              From everyday digital confidence to creative problem-solving, explore practical sample
              workshops and see what you could make. These do not unlock any required course.
            </p>
          </Container>
        </section>
      )}
      <div className={embedded ? '' : 'py-14 sm:py-18'}>
        <div className={embedded ? '' : 'mx-auto w-full max-w-page px-5 sm:px-7 lg:px-10'}>
          {embedded ? (
            <PageHeader
              eyebrow="Optional samples"
              title="Standalone workshops"
              description="Practice here for exploration only. Sample completions never satisfy the 44-course pathway."
              action={
                <Link to="/courses" className={buttonStyles('outline')}>
                  Required 44-course path <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : null}
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={(value) => setFilter('q', value)}
              placeholder="Search courses or skills"
              className="w-full lg:flex-1"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
              {' '}
              <select
                aria-label="Filter by category"
                className="field !min-h-[44px] !py-2 text-xs"
                value={category}
                onChange={(event) => setFilter('category', event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="Filter by level"
                className="field !min-h-[44px] !py-2 text-xs"
                value={level}
                onChange={(event) => setFilter('level', event.target.value)}
              >
                {['All levels', 'Beginner', 'Intermediate', 'Advanced'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="Filter by audience"
                className="field !min-h-[44px] !py-2 text-xs"
                value={audience}
                onChange={(event) => setFilter('audience', event.target.value)}
              >
                {['All ages', 'Children', 'Teenagers', 'Adults'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="Sort courses"
                className="field !min-h-[44px] !py-2 text-xs"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="featured">Featured first</option>
                <option value="title">Title A–Z</option>
                <option value="duration">Shortest first</option>
              </select>
            </div>
          </div>
          {isLoading ? (
            <LoadingCards />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-body">
                  {enrolled.length} {embedded ? 'sample workshop' : 'sample course'}
                  {enrolled.length === 1 ? '' : 's'}{' '}
                  {search || category !== 'All subjects' || level !== 'All levels'
                    ? 'matching your filters'
                    : 'to explore'}
                </p>
                {(search ||
                  category !== 'All subjects' ||
                  level !== 'All levels' ||
                  audience !== 'All ages') && (
                  <button
                    className="text-xs font-extrabold text-brand-600 dark:text-brand-200"
                    onClick={() => setParams({})}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {enrolled.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {enrolled.map((course) => {
                    const lessons = course.modules.flatMap((module) => module.lessons);
                    const done = lessons.filter((item) =>
                      state.completedLessonIds.includes(item.id),
                    ).length;
                    return (
                      <CourseCard
                        key={course.id}
                        course={course}
                        progress={
                          state.enrolledCourseIds.includes(course.id)
                            ? percentage(done, lessons.length)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={SearchX}
                  title={embedded ? 'No sample workshops match' : 'No samples match those filters'}
                  description={
                    embedded
                      ? 'Clear filters to see optional practice workshops.'
                      : 'Try another subject, audience or search term.'
                  }
                  action={
                    embedded ? (
                      <Link to="/courses" className={buttonStyles('primary')}>
                        Explore courses
                      </Link>
                    ) : (
                      <Button variant="outline" onClick={() => setParams({})}>
                        Clear filters
                      </Button>
                    )
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { state, actions } = useDemo();
  const toast = useToast();
  const {
    data: course,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => demoCatalogService.getCourse(slug ?? ''),
    enabled: Boolean(slug),
  });
  if (isLoading)
    return (
      <div className="public-bg min-h-screen py-20">
        <Container>
          <LoadingCards />
        </Container>
      </div>
    );
  if (isError)
    return (
      <div className="public-bg min-h-screen py-20">
        <Container>
          <ErrorState onRetry={() => void refetch()} />
        </Container>
      </div>
    );
  if (!course)
    return (
      <div className="public-bg min-h-screen py-20">
        <Container>
          <EmptyState
            title="We could not find that course"
            description="The course may have moved, or the link may be incorrect."
            action={
              <Link className={buttonStyles('primary')} to="/courses">
                Browse courses
              </Link>
            }
          />
        </Container>
      </div>
    );
  const lessons = course.modules.flatMap((module) => module.lessons);
  const enrolled = state.enrolledCourseIds.includes(course.id);
  const completed = lessons.filter((item) => state.completedLessonIds.includes(item.id)).length;
  const nextLesson =
    lessons.find((item) => !state.completedLessonIds.includes(item.id)) ?? lessons[0];
  const start = () => {
    if (session?.role === 'learner') {
      actions.enroll(course.id);
      toast(enrolled ? 'Opening your next lesson.' : 'Added to your learning space (demo).');
      navigate(`/app/sample-lesson/${course.id}/${nextLesson.id}`);
    } else {
      navigate(
        `/register?next=${encodeURIComponent(`/app/sample-lesson/${course.id}/${nextLesson.id}`)}`,
      );
    }
  };
  return (
    <>
      <section className="hero-surface border-b border-line py-12 sm:py-20">
        <Container>
          <Link
            to="/sample-courses"
            className="inline-flex items-center gap-2 text-xs font-bold text-body hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Sample workshops
          </Link>
          <div className="mt-8 grid items-center gap-9 lg:grid-cols-[1fr_.7fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="amber">Optional sample · not pathway credit</Badge>
                <Badge tone="blue">{course.category}</Badge>
                <Badge>{course.level}</Badge>
                <Badge>{course.audience}</Badge>
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.1] text-heading sm:text-6xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-body">{course.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button onClick={start} size="lg">
                  {enrolled ? 'Continue sample' : 'Start sample workshop'}{' '}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Link to="/courses" className={buttonStyles('outline', 'lg')}>
                  See required pathway
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-5 text-xs font-bold text-body">
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-brand-600" />
                  {course.duration} estimated
                </span>
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-brand-600" />
                  {lessons.length} sample lessons
                </span>
                <span className="inline-flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-brand-600" />
                  {course.instructor}
                </span>
              </div>
            </div>
            <div
              className={`course-art course-art-${course.accent} flex h-[300px] items-center justify-center rounded-[32px] sm:h-[370px]`}
            >
              <span className="relative z-10 flex h-40 w-40 items-center justify-center rounded-[42px] border border-white/50 bg-white/55 shadow-float">
                {(() => {
                  const Icon = artIcons[course.icon];
                  return <Icon className="h-20 w-20" strokeWidth={1.2} />;
                })()}
              </span>
              <span className="absolute bottom-5 left-5 z-10 rounded-full bg-white/80 px-4 py-2 text-[11px] font-bold">
                Learn → Practice → Build
              </span>
            </div>
          </div>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="grid gap-8 lg:grid-cols-[1fr_330px]">
          <div>
            <SectionHeading eyebrow="Inside this course" title="What you will be able to do" />
            <div className="grid gap-3 sm:grid-cols-2">
              {course.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 text-sm font-bold text-heading"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-50 text-mint-700">
                    <Check className="h-4 w-4" />
                  </span>
                  {skill}
                </div>
              ))}
            </div>
            <div className="mt-12">
              <SectionHeading
                eyebrow="The learning journey"
                title="A lesson at a time."
                description="Open each module to see the illustrative lesson outline."
              />
              <div className="space-y-3">
                {course.modules.map((module, index) => (
                  <details
                    key={module.id}
                    open={index === 0}
                    className="group rounded-2xl border border-line bg-panel p-5"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-heading">
                      <span>
                        <span className="mr-3 text-xs text-brand-600 dark:text-brand-200">
                          0{index + 1}
                        </span>
                        {module.title}
                      </span>
                      <span className="text-xs text-subdued">{module.lessons.length} lessons</span>
                    </summary>
                    <div className="mt-4 space-y-1 border-t border-line pt-3">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-xs text-body"
                        >
                          <span className="flex items-center gap-2">
                            <Play className="h-3.5 w-3.5 text-brand-600" />
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                          <span className="shrink-0 text-subdued">{lesson.minutes} min</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
            <div className="mt-12 rounded-3xl bg-ink-900 p-7 text-white">
              <Sparkles className="h-7 w-7 text-[#a9f0d4]" />
              <h3 className="mt-5 font-display text-3xl">Make something real.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Put your learning to work with a practical project:{' '}
                <strong className="font-extrabold text-white">{course.project}</strong>.
              </p>
              <Link
                to="/projects"
                className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#a9f0d4]"
              >
                View project gallery <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <aside className="space-y-5">
            <Card className="sticky top-24 p-6">
              <h2 className="text-base font-extrabold text-heading">Your learning, your pace</h2>
              <p className="mt-2 text-xs leading-6 text-body">
                Follow the lessons, check your understanding and build the project at your own pace.
              </p>
              {enrolled && (
                <ProgressBar
                  value={percentage(completed, lessons.length)}
                  label={`${completed} of ${lessons.length} lessons`}
                  className="mt-5"
                />
              )}
              <Button onClick={start} className="mt-6 w-full">
                {enrolled ? 'Continue course' : 'Start learning'} <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="mt-5 border-t border-line pt-5 text-xs leading-6 text-body">
                <p>
                  <strong className="text-heading">Prerequisites:</strong> Curiosity and a
                  willingness to practise.
                </p>
                <p className="mt-2">
                  <strong className="text-heading">Format:</strong> Self-paced sample lessons and a
                  practical project.
                </p>
              </div>
              <InfoBox tone="amber" className="mt-5 text-xs">
                Optional illustrative workshop. Completion here never unlocks a required course. All
                progress is browser-local; no credential or certificate is issued.
              </InfoBox>
            </Card>
          </aside>
        </Container>
      </section>
    </>
  );
}
