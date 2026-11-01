import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockKeyhole, SearchX } from 'lucide-react';
import { Badge, Card, Container, EmptyState, Eyebrow, buttonStyles } from '@/components/ui';
import { publicCatalog, publicCourseBySlug, publicCourses, publicStages } from '@/curriculum/public';
import { LearningOrbit } from '@/components/motion/LearningOrbit';
import { MotionParticles } from '@/components/motion/MotionParticles';
import { MotionTicker } from '@/components/motion/MotionTicker';
import { motionRipple } from '@/components/motion/ripple';
import { motionSpotlight } from '@/components/motion/spotlight';

const draftNotice = 'Unreviewed curriculum outline · Not open for public enrolment or official credit';

export function ReleaseHome() {
  return (
    <>
      <section className="motion-hero-public motion-public-page border-b border-line py-14 sm:py-20">
        <MotionParticles />
        <Container className="grid items-center gap-9 lg:grid-cols-[1.12fr_.88fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/brand/brandmark-dark.webp" alt="" width={450} height={450} className="h-10 w-10 rounded-xl" />
              <Eyebrow className="motion-hero-badge">Desloop Academy · course guide</Eyebrow>
            </div>
            <h1 aria-label="Learn it. Build it. Make it yours." className="motion-hero-title mt-6 max-w-3xl font-display text-5xl leading-[1.08] sm:text-6xl">
              <span className="block">Learn it. <em>Build it.</em></span>
              <span className="block">Make it yours.</span>
            </h1>
            <p className="motion-hero-copy mt-6 max-w-2xl text-base leading-8">
              Explore a draft sequence of 44 digital-skills courses, from foundations to a capstone.
              Every learner would follow the same order; examples and support can adapt without skipping essential skills.
            </p>
            <p className="motion-hero-note mt-4 max-w-2xl text-sm leading-7">
              This is <strong>information, not enrolment</strong>. Lessons and awards need expert review;
              the working learning engine is restricted to an invited-adult internal service. Children cannot register.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" onPointerDown={motionRipple} className={buttonStyles('primary', 'lg')}>
                Explore the 44-course outline <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/availability" onPointerDown={motionRipple} className={buttonStyles('outline', 'lg', 'border-white/60 bg-white/10 text-white hover:bg-white/20')}>
                Check availability
              </Link>
            </div>
            <p className="motion-hero-foot mt-6 text-xs leading-6">{draftNotice}.</p>
          </div>
          <div className="motion-orbit-panel">
            <LearningOrbit />
            <p className="mt-5 text-center text-xs leading-6 text-[#e3e7fa]">Select a stage to read about it. This guide cannot save progress.</p>
          </div>
        </Container>
      </section>
      <MotionTicker />
      <section className="motion-public-page py-14 sm:py-20">
        <Container>
          <Eyebrow>First, understand the sequence</Eyebrow>
          <h2 className="mt-3 max-w-2xl font-display text-3xl text-heading sm:text-4xl">
            Begin with the foundations. Continue in order.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[publicStages[0], publicStages[3], publicStages[8]].map((stage) => (
              <Link key={stage.number} to={`/courses?stage=${stage.number}`} onPointerMove={motionSpotlight} className="motion-spotlight motion-card-link group rounded-2xl border border-line bg-panel p-6 hover:border-brand-400">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-200">Stage {stage.number} · Courses {stage.first}–{stage.last}</span>
                <h3 className="mt-3 font-display text-xl text-heading">{stage.title}</h3>
                <p className="mt-2 text-sm leading-6 text-body">{stage.subtitle}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-600 dark:text-brand-200">
                  See courses <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

export function ReleaseCatalog() {
  const [params, setParams] = useSearchParams();
  // The query string keeps a stage link shareable. Search is local to the public metadata only.
  const stageParam = params.get('stage') ?? 'all';
  const stage = publicStages.some((item) => String(item.number) === stageParam) ? stageParam : 'all';
  const [search, setSearch] = useState('');
  const matches = useMemo(
    () => publicCourses.filter((course) =>
      (stage === 'all' || String(publicStages.find((item) => item.title === course.stage)?.number) === stage) &&
      `${course.title} ${course.purpose} ${course.stage} ${course.modules.map((module) => module.title).join(' ')}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    ),
    [search, stage],
  );
  const setStage = (value: string) => {
    setParams(value === 'all' ? {} : { stage: value }, { replace: true });
  };
  const reset = () => { setSearch(''); setStage('all'); };
  return (
    <section className="motion-public-page public-bg py-12 sm:py-16">
      <Container>
        <Eyebrow>Version {publicCatalog.version} · {publicCatalog.reviewStatus}</Eyebrow>
        <h1 className="mt-3 font-display text-4xl text-heading sm:text-5xl">The 44-course outline</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-body">
          Read the courses in order. These are draft descriptions, <strong>not enrolment, lessons or earned progress</strong>.
          Searching and filtering only changes this list; it cannot change prerequisites or record an assessment.
        </p>
        <div className="mt-8 grid gap-4 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-[1fr_230px] sm:items-end">
          <label className="block text-sm font-bold text-heading">
            Search course outlines
            <input type="search" className="field mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Course title or skill" />
          </label>
          <label className="block text-sm font-bold text-heading">
            Stage
            <select aria-label="Filter by stage" className="field mt-2" value={stage} onChange={(event) => setStage(event.target.value)}>
              <option value="all">All nine stages</option>
              {publicStages.map((item) => <option key={item.number} value={item.number}>{item.number}. {item.title}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-sm font-semibold text-body">
            Showing {matches.length} of 44 courses in the original order.
          </p>
          {(search || stage !== 'all') && <button type="button" className={buttonStyles('outline')} onClick={reset}>Clear filters</button>}
        </div>
        {matches.length ? (
          <ol className="mt-6 grid gap-3">
            {matches.map((course) => (
              <li key={course.id} onPointerMove={motionSpotlight} className="motion-spotlight motion-card-link rounded-2xl border border-line bg-panel p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-bold text-brand-700" aria-hidden="true">
                    {String(course.number).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-subdued">Course {String(course.number).padStart(2, '0')} · {course.stage}</span>
                    <h2 className="mt-1 font-display text-xl text-heading">
                      <Link to={`/courses/${course.slug}`} className="hover:underline hover:underline-offset-4">{course.title}</Link>
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-body">{course.purpose}</p>
                    <p className="mt-3 text-xs text-subdued">{course.modules.length} modules · ~{course.guidedHours} guided hours (draft estimate)</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-6"><EmptyState icon={SearchX} title="No matching course outlines" description="Try another word or return to all stages." action={<button type="button" onClick={reset} className={buttonStyles('primary')}>Show all courses</button>} /></div>
        )}
      </Container>
    </section>
  );
}

export function ReleaseCourse() {
  const { slug } = useParams();
  const course = publicCourseBySlug(slug ?? '');
  if (!course) return <ReleaseUnavailable />;
  const previous = publicCourses[course.number - 2];
  const next = publicCourses[course.number];
  return (
    <section className="motion-public-page public-bg py-12 sm:py-16">
      <Container>
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-200">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All 44 courses
        </Link>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1.5fr_.8fr]">
          <div>
            <Eyebrow>Course {String(course.number).padStart(2, '0')} of 44 · {course.stage}</Eyebrow>
            <h1 className="mt-3 font-display text-4xl leading-tight text-heading sm:text-5xl">{course.title}</h1>
            <p className="mt-5 text-base leading-8 text-body">{course.purpose}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="amber">Unreviewed draft · no course credit</Badge>
              <Badge tone="blue">{course.modules.length} modules</Badge>
              <Badge>~{course.guidedHours} guided hours (estimate)</Badge>
            </div>
          </div>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-200"><LockKeyhole className="h-5 w-5" aria-hidden="true" /><h2 className="font-display text-xl text-heading">Learning access</h2></div>
            <p className="mt-3 text-sm leading-7 text-body">
              This page describes a draft course. It cannot enrol anyone or save progress. Public and minor learning are closed.
              The real learning engine is an invitation-only adult/internal service with server-owned prerequisites.
            </p>
            <Link to="/availability" className={buttonStyles('outline', 'md', 'mt-5')}>Check availability <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </Card>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <h2 className="font-display text-2xl text-heading">Four ordered modules</h2>
            <ol className="mt-4 space-y-3">
              {course.modules.map((module, index) => (
                <li key={module.title} onPointerMove={motionSpotlight} className="motion-spotlight rounded-2xl border border-line bg-panel p-5">
                  <h3 className="font-bold text-heading">{index + 1}. {module.title}</h3>

                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-display text-2xl text-heading">About the learning outline</h2>
            <p className="mt-3 text-sm leading-7 text-body">
              The four module topics show the intended order. Detailed lesson outcomes and assessed questions are not published in this course guide while they await specialist review. The course is not available for enrolment or credit.
            </p>
            <details className="mt-7 rounded-2xl border border-line bg-panel p-5">
              <summary className="cursor-pointer text-sm font-bold text-heading">How the examples would adapt by age</summary>
              <p className="mt-3 text-xs text-body">The learning outcome and course order do not change. These notes are not permission for a child to register.</p>
              <dl className="mt-4 space-y-4 text-sm leading-6 text-body">
                {([
                  ['early', 'Ages 6–8'], ['junior', 'Ages 9–12'], ['teen', 'Ages 13–17'], ['adult', 'Adults'],
                ] as const).map(([band, label]) => (
                  <div key={band}><dt className="font-bold text-heading">{label}</dt><dd className="mt-1">{course.ageAdaptation[band]}</dd></div>
                ))}
              </dl>
            </details>
          </div>
        </div>
        <nav aria-label="Adjacent course outlines" className="mt-10 flex flex-wrap justify-between gap-4 border-t border-line pt-6 text-sm font-bold text-brand-600 dark:text-brand-200">
          {previous ? <Link to={`/courses/${previous.slug}`}>← Course {String(previous.number).padStart(2, '0')}: {previous.title}</Link> : <Link to="/courses">All courses</Link>}
          {next && <Link to={`/courses/${next.slug}`}>Course {String(next.number).padStart(2, '0')}: {next.title} →</Link>}
        </nav>
        <p className="mt-5 text-xs text-subdued">Viewing later course outlines does not unlock their lessons or allow bypassing earlier courses.</p>
      </Container>
    </section>
  );
}

export function ReleaseMethod() {
  return (
    <section className="motion-public-page public-bg py-12 sm:py-16">
      <Container>
        <Eyebrow>Learning approach · proposed, not a published qualification</Eyebrow>
        <h1 className="mt-3 max-w-3xl font-display text-4xl text-heading sm:text-5xl">How learning works</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-body">
          The intended rhythm is learn, practise with guidance, work independently, receive feedback, revise and demonstrate mastery before advancing.
          An internal adult learning engine enforces required course order, but the curriculum and assessment still need human approval before official use.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['Learn and try', 'A worked example and guided practice introduce one skill at a time.'],
            ['Make and revise', 'A practical task and feedback show what to improve; another attempt stays within the same course.'],
            ['Prove mastery', 'The server checks required evidence and thresholds. An assigned human reviews projects when required before the next course opens.'],
          ].map(([heading, text], index) => (
            <li key={heading} onPointerMove={motionSpotlight} className="motion-spotlight rounded-2xl border border-line bg-panel p-6">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-200">Step {index + 1}</span>
              <h2 className="mt-2 font-display text-xl text-heading">{heading}</h2>
              <p className="mt-2 text-sm leading-7 text-body">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl text-sm leading-7 text-body">
          The course order is shared across ages. Support, examples and pacing may adapt, but an accommodation cannot silently waive a required outcome.
          No AI tutor, payment, school account, child account or public certificate is currently available.
        </p>
        <Link to="/courses" className={buttonStyles('primary', 'md', 'mt-7')}>See the course outline <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </Container>
    </section>
  );
}

export function ReleaseUnavailable() {
  return (
    <section className="motion-public-page public-bg py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-panel p-7 sm:p-10">
          <Eyebrow>Unavailable</Eyebrow>
          <h1 className="mt-3 font-display text-3xl text-heading">This page is not available</h1>
          <p className="mt-4 text-sm leading-7 text-body">
            The address may be wrong, or this feature is not ready for real use. No account, payment or progress has been created.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className={buttonStyles('primary')}>Go home</Link>
            <Link to="/courses" className={buttonStyles('outline')}>Browse courses</Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
