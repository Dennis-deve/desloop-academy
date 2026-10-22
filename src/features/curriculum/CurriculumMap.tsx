import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Map,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Card,
  Container,
  EmptyState,
  Eyebrow,
  PageHeader,
  SearchInput,
  buttonStyles,
} from '@/components/ui';
import { useAuth, useDemo } from '@/app/providers';
import {
  ageBands,
  courseBySlug,
  lessonsFor,
  masterCourses,
  masterStages,
  nextCourse,
  stageFor,
  type AgeBand,
  type MasterCourse,
} from '@/curriculum/model';
import { completedPrefix, courseState, nextAction } from '@/curriculum/progression';
import { AgeBandSelector, CourseStatus, DraftNotice } from './shared';

function CourseRow({
  course,
  isLearner,
  progress,
}: {
  course: MasterCourse;
  isLearner: boolean;
  progress: ReturnType<typeof useDemo>['state']['curriculum'];
}) {
  const status = courseState(course, progress);
  const action = nextAction(course, progress);
  return (
    <li className="group rounded-2xl border border-line bg-panel p-4 transition hover:border-brand-400 hover:shadow-soft sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-display text-lg font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100"
          aria-hidden="true"
        >
          {String(course.number).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-display text-lg leading-snug text-heading underline-offset-4 hover:text-brand-600 hover:underline"
              to={`/courses/${course.slug}`}
            >
              {course.title}
            </Link>
            {isLearner ? (
              <CourseStatus status={status} />
            ) : course.number === 1 ? (
              <Badge tone="blue">Start here</Badge>
            ) : (
              <Badge tone="neutral">
                Follows Course {String(course.number - 1).padStart(2, '0')}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-body">{course.purpose}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-subdued">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {course.modules.length} modules
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" /> ~{course.guidedHours} guided hours
            </span>
            <span>Required project</span>
          </div>
        </div>
        {isLearner && action.href && status !== 'completed' ? (
          <Link to={action.href} className={buttonStyles('outline', 'sm', 'shrink-0 self-start')}>
            {status === 'review' ? 'View status' : status === 'revision' ? 'Revise' : 'Continue'}{' '}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : status === 'locked' && isLearner ? (
          <LockKeyhole className="h-4 w-4 shrink-0 text-subdued" aria-label="Locked" />
        ) : null}
      </div>
    </li>
  );
}

export function CurriculumCatalogPage({ embedded = false }: { embedded?: boolean }) {
  const { session } = useAuth();
  const { state, actions } = useDemo();
  const isLearner = embedded && session?.role === 'learner';
  const [previewBand, setPreviewBand] = useState<AgeBand>('adult');
  const band = isLearner ? state.curriculum.band : previewBand;
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const completed = isLearner ? completedPrefix(state.curriculum) : 0;
  const active = masterCourses[completed] ?? masterCourses[43];
  const matches = useMemo(
    () =>
      masterCourses.filter(
        (course) =>
          (stageFilter === 'all' || stageFor(course).number.toString() === stageFilter) &&
          `${course.title} ${course.purpose} ${course.stage} ${course.outcomes.join(' ')}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [query, stageFilter],
  );
  const changeBand = (value: AgeBand) => {
    if (isLearner) actions.updateCurriculum((previous) => ({ ...previous, band: value }));
    else setPreviewBand(value);
  };
  const content = (
    <>
      {embedded ? (
        <PageHeader
          eyebrow="Required learning pathway"
          title="One route. Forty-four steps."
          description="Follow every course in order. Your examples and support change with your age band; the essential outcomes and gates do not."
          action={
            <Link to={`/courses/${active.slug}`} className={buttonStyles('outline')}>
              View Course {String(active.number).padStart(2, '0')}{' '}
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : null}
      <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-9 text-white sm:px-9 lg:px-12">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border-[55px] border-white/5" />
        <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold text-[#a9f0d4]">
              <Map className="h-3.5 w-3.5" /> THE DESLOOP PATHWAY · DRAFT
            </span>
            {!embedded && (
              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
                Start with the basics.
                <br />
                <span className="text-[#a9f0d4]">Build towards what is next.</span>
              </h1>
            )}
            <p
              className={`${embedded ? 'mt-5 font-display text-3xl' : 'mt-5 text-base'} max-w-2xl leading-8 text-slate-200`}
            >
              {embedded
                ? `Course ${String(active.number).padStart(2, '0')}: ${active.title}`
                : 'A single ordered curriculum from digital foundations to an integrated capstone. Lessons use different examples and scaffolding for different ages—never a shortcut around the same essential skills.'}
            </p>
            {isLearner && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Badge tone="green">{completed} / 44 passed · demo</Badge>
                <span className="text-xs text-slate-300">
                  Your next action: {nextAction(active, state.curriculum).label}
                </span>
              </div>
            )}
            {!isLearner && (
              <Link
                to="/demo?next=%2Fapp%2Fcourses"
                className={buttonStyles('white', 'md', 'mt-7')}
              >
                Preview as a learner <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-[420px] lg:justify-self-end">
            {[
              [44, 'required courses'],
              [9, 'ordered stages'],
              [4, 'teaching bands'],
              ['80 / 70', 'quiz / project gates'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <span className="block font-display text-2xl">{value}</span>
                <span className="text-[11px] font-semibold text-slate-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="my-6">
        <DraftNotice compact />
      </div>
      <div className="grid gap-4 rounded-2xl border border-line bg-panel p-5 md:grid-cols-[minmax(0,1fr)_minmax(230px,1fr)] md:items-start">
        <AgeBandSelector
          value={band}
          onChange={changeBand}
          id={embedded ? 'learner-band' : 'public-band'}
        />
        <div>
          <Eyebrow>Same route, adapted support</Eyebrow>
          <p className="mt-2 text-xs leading-6 text-body">
            {active.ageAdaptation[band]} No actual age verification or child consent is provided in
            this browser demo.
          </p>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 md:flex-row">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Find a course, skill or stage"
          className="flex-1"
        />
        <label
          className="flex flex-col gap-1 text-xs font-bold text-heading md:min-w-56"
          htmlFor="stage-filter"
        >
          Stage
          <select
            id="stage-filter"
            className="field"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="all">All nine stages</option>
            {masterStages.map((stage) => (
              <option key={stage.number} value={stage.number}>
                {stage.number}. {stage.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-subdued" role="status">
        Showing {matches.length} of 44 courses in the original sequence. Filtering never changes
        prerequisites.
      </p>
      {matches.length ? (
        <div className="mt-7 space-y-9">
          {masterStages.map((stage) => {
            const items = matches.filter((course) => course.stage === stage.title);
            if (!items.length) return null;
            return (
              <section
                key={stage.number}
                id={`stage-${stage.number}`}
                aria-labelledby={`stage-title-${stage.number}`}
                className="scroll-mt-28"
              >
                <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <Eyebrow>
                      Stage {String(stage.number).padStart(2, '0')} · Courses{' '}
                      {String(stage.first).padStart(2, '0')}–{String(stage.last).padStart(2, '0')}
                    </Eyebrow>
                    <h2
                      className="mt-1 font-display text-2xl text-heading sm:text-3xl"
                      id={`stage-title-${stage.number}`}
                    >
                      {stage.title}
                    </h2>
                    <p className="mt-1 text-xs leading-6 text-body">{stage.subtitle}</p>
                  </div>
                  <Badge tone="blue">{stage.last - stage.first + 1} courses</Badge>
                </div>
                <ol start={stage.first} className="grid gap-3">
                  {items.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      isLearner={isLearner}
                      progress={state.curriculum}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No courses match"
          description="Try a different subject or return to all stages."
          action={
            <button
              className={buttonStyles('outline')}
              onClick={() => {
                setQuery('');
                setStageFilter('all');
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
      <div className="mt-12 rounded-3xl border border-line bg-panel p-6 sm:p-8">
        <Eyebrow>How progression works</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-heading">
          Pass one course before opening the next.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-body">
          Complete every required practice task and lesson, score at least 80% on the five-item
          course knowledge check, submit project evidence, pass all safety-critical checks, then
          earn at least 70% on an authorised human-reviewed project rubric. If you miss a gate,
          revise and retry inside the same course. This browser preview cannot grant an official
          pass.
        </p>
        <Link
          to="/courses/getting-started-with-learning-and-digital-confidence"
          className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand-600 dark:text-brand-200"
        >
          See the first course <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
  return embedded ? (
    <div>{content}</div>
  ) : (
    <section className="public-bg pb-20 pt-12">
      <Container>{content}</Container>
    </section>
  );
}

export function CurriculumCoursePage() {
  const { slug } = useParams();
  const course = courseBySlug(slug ?? '');
  const { session } = useAuth();
  const { state } = useDemo();
  if (!course)
    return (
      <section className="public-bg py-20">
        <Container>
          <EmptyState
            title="Course not found"
            description="The 44-course pathway is always available from the course map."
            action={
              <Link to="/courses" className={buttonStyles('primary')}>
                See the pathway
              </Link>
            }
          />
        </Container>
      </section>
    );
  const learner = session?.role === 'learner';
  const status = learner ? courseState(course, state.curriculum) : null;
  const action = learner ? nextAction(course, state.curriculum) : null;
  const previous = masterCourses[course.number - 2];
  const following = nextCourse(course);
  return (
    <section className="public-bg pb-20 pt-10">
      <Container>
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1 text-xs font-bold text-body"
        >
          <Link to="/courses" className="hover:text-brand-600">
            Required pathway
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>{course.stage}</span>
          <ChevronRight className="h-3 w-3" />
          <span aria-current="page" className="text-heading">
            Course {String(course.number).padStart(2, '0')}
          </span>
        </nav>
        <div className="grid gap-8 lg:grid-cols-[1.6fr_0.85fr] lg:items-start">
          <div>
            <Eyebrow>
              Stage {stageFor(course).number} of 9 · Course {String(course.number).padStart(2, '0')}{' '}
              of 44 · {course.version}
            </Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-heading sm:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-body">{course.purpose}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge tone="blue">
                {course.modules.length} modules · {lessonsFor(course).length} lessons
              </Badge>
              <Badge tone="green">~{course.guidedHours} guided hours</Badge>
              {status && <CourseStatus status={status} />}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {learner && action?.href && status !== 'locked' ? (
                <Link to={action.href} className={buttonStyles('primary')}>
                  {action.label} <ArrowRight className="h-4 w-4" />
                </Link>
              ) : learner && status === 'locked' ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm font-bold text-body">
                  <LockKeyhole className="h-4 w-4" /> Finish Course{' '}
                  {String(course.number - 1).padStart(2, '0')} first
                </span>
              ) : (
                <Link to="/demo?next=%2Fapp%2Fcourses" className={buttonStyles('primary')}>
                  Enter learner preview <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link to="/courses" className={buttonStyles('outline')}>
                View all 44
              </Link>
            </div>
          </div>
          <Card className="p-6">
            <Eyebrow>Adapt the teaching, not the destination</Eyebrow>
            <div className="mt-4 space-y-4">
              {ageBands.map((band) => (
                <div key={band.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <h2 className="text-xs font-extrabold text-heading">{band.label}</h2>
                  <p className="mt-1 text-xs leading-6 text-body">
                    {course.ageAdaptation[band.id]}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="mt-7">
          <DraftNotice compact />
        </div>
        <div className="mt-9 grid gap-6 lg:grid-cols-[1.25fr_0.8fr]">
          <div>
            <h2 className="font-display text-2xl text-heading">The learning sequence</h2>
            <p className="mt-2 text-sm leading-6 text-body">
              Each module includes an objective, worked example, guided practice, independent
              evidence and a formative check. Lessons open one at a time inside the current course.
            </p>
            <ol className="mt-5 space-y-3">
              {course.modules.map((module, index) => (
                <li key={module.id} className="rounded-2xl border border-line bg-panel p-5">
                  <div className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-heading">{module.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-body">{module.focus}</p>
                      {learner && status !== 'locked' && (
                        <Link
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
                          to={`/app/learn/${course.id}/${module.lessons[0].id}`}
                        >
                          Open lesson <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-5">
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-600" />
                <h2 className="font-display text-xl text-heading">What you will show</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {course.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2 text-xs leading-6 text-body">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-mint-500" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <Eyebrow>Required project</Eyebrow>
              <h2 className="mt-2 font-display text-xl text-heading">Make your learning visible</h2>
              <p className="mt-3 text-xs leading-6 text-body">{course.project.brief}</p>
              <p className="mt-4 text-xs font-extrabold text-heading">Assessment evidence</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-6 text-body">
                {course.project.requiredEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-6 text-body">{course.assessment}</p>
            </Card>
          </div>
        </div>
        <nav
          aria-label="Adjacent courses"
          className="mt-10 flex flex-wrap justify-between gap-4 border-t border-line pt-6 text-xs font-bold text-brand-600 dark:text-brand-200"
        >
          {previous ? (
            <Link to={`/courses/${previous.slug}`}>
              ← Course {String(previous.number).padStart(2, '0')}: {previous.title}
            </Link>
          ) : (
            <span>Beginning of the pathway</span>
          )}
          {following ? (
            <Link to={`/courses/${following.slug}`}>
              Course {String(following.number).padStart(2, '0')}: {following.title} →
            </Link>
          ) : (
            <span>End of the pathway</span>
          )}
        </nav>
      </Container>
    </section>
  );
}
