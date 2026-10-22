import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CloudDownload,
  Compass,
  HeartHandshake,
  Lightbulb,
  Play,
  School2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { Container, Eyebrow, SectionHeading, Badge, buttonStyles } from '@/components/ui';
import { site } from '@/config/site';
import { masterCourses, masterStages, type MasterCourse } from '@/curriculum/model';

const audiences: {
  title: string;
  note: string;
  href: string;
  icon: LucideIcon;
  className: string;
}[] = [
  {
    title: 'Young explorers',
    note: 'Curiosity, care and digital basics',
    href: '/learn/children',
    icon: Lightbulb,
    className: 'bg-[#E6F5EB] text-[#176D50]',
  },
  {
    title: 'Teen makers',
    note: 'Make, test and find your voice',
    href: '/learn/teens',
    icon: WandSparkles,
    className: 'bg-[#E9E6FB] text-[#5947AD]',
  },
  {
    title: 'Lifelong learners',
    note: 'Skills for work and everyday life',
    href: '/learn/adults',
    icon: Compass,
    className: 'bg-[#E5ECFF] text-[#354EAD]',
  },
  {
    title: 'Schools & educators',
    note: 'Bring hands-on learning together',
    href: '/schools',
    icon: School2,
    className: 'bg-[#FFF1DB] text-[#9B6519]',
  },
];
const previewCourses = masterCourses.slice(0, 3);
const previewResponses = [
  {
    label: 'Explain simply',
    response:
      'Imagine a folder as a labelled drawer. Each file is one item inside it. Giving things clear names makes them easier to find later.',
  },
  {
    label: 'Give me a hint',
    response:
      'Think about a place you already organise things. What would the “drawer” be, and what would go inside it?',
  },
  {
    label: 'Let me try',
    response:
      'Your turn: describe one way you would organise three school or work files. You can change your answer as you learn.',
  },
];
const faqs = [
  {
    question: 'Is this a live learning platform already?',
    answer:
      'These public course pages are draft information, not enrolment. Role workspaces, AI, billing and child progress are demonstrations. A separate invite-only adult/internal pilot uses a real server, but child accounts require verified guardian consent and safeguarding review before they can open.',
  },
  {
    question: 'Do I need experience to start?',
    answer:
      'No. The required pathway begins with approachable digital foundations and builds toward practical projects. Teaching support and pace can adapt, but the 44 required courses stay in the same order.',
  },
  {
    question: 'Will AI do the work for learners?',
    answer:
      'The studio is designed to offer hints, explanations, practice and feedback so learners build understanding. A future live AI service would require a secure backend and human oversight.',
  },
  {
    question: 'How will young learners be protected?',
    answer:
      'The design uses moderated, age-aware spaces and privacy-first defaults. Production use for children requires guardian consent, policy enforcement on the backend, moderation operations and legal review.',
  },
];

function CourseMiniCard({ course }: { course: MasterCourse }) {
  const accents = ['mint', 'blue', 'lavender'] as const;
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group block overflow-hidden rounded-3xl border border-line bg-panel shadow-soft transition-transform hover:-translate-y-1"
    >
      <div
        className={`course-art course-art-${accents[(course.number - 1) % 3]} flex h-44 items-center justify-center`}
      >
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[27px] border border-white/60 bg-white/65 shadow-soft">
          <BookOpen className="h-10 w-10" strokeWidth={1.45} />
        </div>
        <span className="absolute right-4 top-4 z-10 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider">
          COURSE {String(course.number).padStart(2, '0')}
        </span>
      </div>
      <div className="p-5">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-200">
          {course.stage} · required sequence
        </p>
        <h3 className="text-base font-extrabold leading-snug text-heading">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-6 text-body">{course.purpose}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200">
          Explore course{' '}
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function HomePage() {
  const [activePreview, setActivePreview] = useState(0);
  return (
    <>
      <section className="hero-surface relative overflow-hidden border-b border-line/70">
        <Container className="grid items-center gap-10 pb-16 pt-14 lg:min-h-[640px] lg:grid-cols-[1fr_1.03fr] lg:gap-12 lg:pb-20 lg:pt-16">
          <div className="relative z-10 max-w-[590px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-[11px] font-extrabold tracking-wide text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100">
              <span className="h-2 w-2 rounded-full bg-mint-500" />
              LEARNING WITH PURPOSE, MADE FOR REAL LIFE
            </div>
            <h1 className="text-[clamp(3.2rem,6vw,5.35rem)] font-extrabold leading-[1.08] tracking-[-.075em] text-heading">
              Learn it.
              <br />
              Build it.
              <br />
              <span className="font-display font-normal italic tracking-[-.045em] text-brand-600 dark:text-brand-200">
                Make it yours.
              </span>
            </h1>
            <p className="mt-7 max-w-[505px] text-[15px] leading-8 text-body sm:text-[17px]">
              Explore one 44-course journey built around hands-on learning and useful projects.
              These pages show the draft pathway; child accounts and live AI guidance are not open
              yet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={buttonStyles('primary', 'lg')} to="/explore">
                Explore learning <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className={buttonStyles('outline', 'lg')}
                to={`/courses/${masterCourses[0].slug}`}
              >
                <Play className="h-4 w-4" /> Preview a lesson
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3 border-t border-line pt-6 text-xs font-semibold text-body">
              <div className="flex -space-x-2" aria-hidden="true">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-panel bg-[#CAE4DA] text-[10px] font-bold text-[#276B55]">
                  A
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-panel bg-[#DED9F4] text-[10px] font-bold text-[#6553AC]">
                  K
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-panel bg-[#F7DFBB] text-[10px] font-bold text-[#986726]">
                  E
                </div>
              </div>
              <span>
                Built for every starting point.{' '}
                <strong className="text-heading">Made for what comes next.</strong>
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[570px] pb-4 sm:pb-8">
            <div className="brand-stage relative overflow-hidden rounded-[30px] border-[7px] border-white shadow-float dark:border-ink-800">
              <div className="relative z-10 flex h-[360px] flex-col justify-between p-5 pb-16 sm:h-[485px] sm:p-9 sm:pb-20">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-[.16em] text-white/80">
                    One path. Many possibilities.
                  </span>
                  <span
                    aria-hidden="true"
                    className="brand-spectrum h-1.5 w-14 shrink-0 rounded-full"
                  />
                </div>
                <img
                  src={site.brandAssets.wordmarkDark}
                  alt="Desloop Academy by Destech Solutions multicolour wordmark"
                  width={1200}
                  height={554}
                  className="mx-auto w-full max-w-[510px] rounded-2xl object-contain"
                />
                <div className="grid grid-cols-3 gap-2 border-t border-white/20 pt-4 text-white sm:gap-4">
                  {[
                    ['09', 'connected stages'],
                    ['44', 'required courses'],
                    ['04', 'teaching bands'],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <p className="text-xl font-extrabold tracking-tight sm:text-2xl">{value}</p>
                      <p className="text-[10px] leading-4 text-white/75 sm:text-[11px]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 left-4 right-4 flex items-center gap-3 rounded-2xl border border-line bg-panel p-3.5 shadow-float sm:-bottom-3 sm:left-auto sm:right-[-12px] sm:w-[285px] sm:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-700">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-heading">A project at every step</p>
                <p className="mt-0.5 text-[10px] leading-4 text-body">
                  Create work you can explain and be proud of.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line bg-panel">
        <Container className="grid gap-5 py-6 md:grid-cols-3 md:gap-8">
          <div className="flex items-center gap-3 text-xs font-bold text-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
              <BookOpen className="h-4 w-4" />
            </span>
            Practise at a sustainable pace
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-50 text-mint-700 dark:bg-mint-500/20">
              <HammerIcon />
            </span>
            Make practical things
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/20">
              <HeartHandshake className="h-4 w-4" />
            </span>
            Grow with human support
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Your journey, your way"
            title="One route, room for every learner."
            description="Everyone starts with the foundations. Teaching examples and support adapt for ages 6–8, 9–12, 13–17 and 18+."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map(({ title, note, href, icon: Icon, className }) => (
              <Link
                key={href}
                to={href}
                className="group flex min-h-[198px] flex-col justify-between rounded-3xl border border-line bg-panel p-6 transition hover:-translate-y-1 hover:shadow-soft"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${className}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="mt-6 text-[15px] font-extrabold text-heading">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-body">{note}</p>
                </div>
                <ArrowUpRight className="absolute hidden" />
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
                  Explore{' '}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-panel py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="The required pathway"
            title="Nine stages. One route forward."
            description="The course order is the same for everyone. Complete and pass one course—including its project and safety checks—before opening the next. This is a curriculum draft and local demonstration."
            action={
              <Link className={buttonStyles('outline')} to="/courses">
                See all 44 courses <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {masterStages.slice(0, 3).map((stage, index) => (
              <Link
                to={`/courses#stage-${stage.number}`}
                key={stage.number}
                className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl bg-ink-900 p-7 text-white transition hover:-translate-y-1"
                style={{
                  backgroundColor: index === 1 ? '#38346D' : index === 2 ? '#155C5A' : undefined,
                }}
              >
                <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full border-[36px] border-white/10" />
                <div className="relative">
                  <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-white/70">
                    STAGE 0{stage.number} · COURSES {stage.first}–{stage.last}
                  </span>
                  <h3 className="mt-8 max-w-[270px] font-display text-[29px] leading-tight">
                    {stage.title}
                  </h3>
                  <p className="mt-3 max-w-[280px] text-xs leading-6 text-white/75">
                    {stage.subtitle}
                  </p>
                </div>
                <div className="relative mt-auto flex items-center justify-between border-t border-white/20 pt-5">
                  <span className="text-[11px] font-bold text-white/80">
                    {stage.last - stage.first + 1} required courses · no skipping
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <Eyebrow>How learning works</Eyebrow>
            <h2 className="mt-3 font-display text-4xl leading-tight text-heading sm:text-5xl">
              Less watching.
              <br />
              <span className="text-brand-600 dark:text-brand-200">More becoming.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-8 text-body">
              Each small step builds on the last. Learn an idea, try it out, make something real,
              and learn from feedback.
            </p>
            <div className="mt-8 space-y-5">
              {[
                {
                  step: '01',
                  title: 'Begin at Course 01',
                  text: 'Choose an age-appropriate presentation, not a shorter route.',
                },
                {
                  step: '02',
                  title: 'Learn with guidance',
                  text: 'Lessons, practice checks and AI-powered learning patterns help you think it through.',
                },
                {
                  step: '03',
                  title: 'Build and share evidence',
                  text: 'Create projects and collect the work that shows what you can do.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-[11px] font-extrabold text-brand-600 dark:bg-brand-500/20 dark:text-brand-100">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-heading">{item.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-body">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/explore"
              className="mt-8 inline-flex items-center gap-1 text-sm font-extrabold text-brand-600 dark:text-brand-200"
            >
              See how it works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[32px] bg-ink-900 p-5 shadow-float sm:p-8">
            <div className="flex items-center justify-between border-b border-white/15 pb-5">
              <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-[#a9f0d4]">
                  <Sparkles className="h-4 w-4" />
                </span>
                AI learning studio{' '}
                <Badge tone="green" className="!bg-white/15 !text-[#baf7dd]">
                  Demo
                </Badge>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#7bdbc0]" />
            </div>
            <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/85">
              “How do I make sense of files and folders?”
            </div>
            <div className="mt-4 rounded-2xl bg-white p-5 text-ink-900">
              <div className="flex items-center gap-2 text-[11px] font-extrabold text-brand-600">
                <Sparkles className="h-4 w-4" /> A thoughtful first step
              </div>
              <p className="mt-3 min-h-[80px] text-sm leading-7">
                {previewResponses[activePreview].response}
              </p>
              <span className="mt-3 block text-[10px] text-ink-700">
                Illustrative response · Always verify important information.
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {previewResponses.map((item, index) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setActivePreview(index)}
                  aria-pressed={activePreview === index}
                  className={`rounded-full border px-3 py-2 text-[11px] font-bold transition ${activePreview === index ? 'border-[#96e4d0] bg-[#a7e8d2] text-ink-900' : 'border-white/25 text-white hover:bg-white/10'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-6 text-[11px] leading-5 text-white/60">
              A real AI provider is not connected in this preview. The live service must be secured
              and reviewed.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-panel py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Start exploring"
            title="The first steps make the difference."
            description="See the first three required courses, their outcomes and the project for each. Later courses stay visible but locked until prerequisites pass."
            action={
              <Link to="/courses" className={buttonStyles('outline')}>
                Browse all courses <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {previewCourses.map((course) => (
              <CourseMiniCard key={course.id} course={course} />
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="relative rounded-[32px] bg-[#E2EEE9] p-5 sm:p-8 dark:bg-[#224440]">
            <div className="rounded-2xl bg-white p-6 shadow-soft dark:bg-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F3EF] text-mint-700">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                      PROJECT STUDIO
                    </p>
                    <h3 className="text-sm font-extrabold text-heading">My digital toolkit</h3>
                  </div>
                </div>
                <Badge tone="amber">In progress</Badge>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  'Choose a real-world task',
                  'Plan the steps and tools',
                  'Build a helpful guide',
                  'Reflect, improve, and share',
                ].map((item, index) => (
                  <div className="flex items-center gap-3 text-xs text-body" key={item}>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${index < 2 ? 'border-mint-500 bg-mint-500 text-white' : 'border-line text-subdued'}`}
                    >
                      {index < 2 ? <Check className="h-3 w-3" /> : index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <div className="mb-2 flex justify-between text-[11px] font-bold text-body">
                  <span>Your progress</span>
                  <span>2 of 4 steps</span>
                </div>
                <div className="h-2 rounded-full bg-raised">
                  <div className="h-2 w-1/2 rounded-full bg-mint-500" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-3 rounded-2xl bg-ink-900 px-5 py-3 text-[11px] font-extrabold text-white shadow-soft sm:right-[-20px]">
              An idea → a skill → a portfolio piece
            </div>
          </div>
          <div>
            <Eyebrow>Project-to-portfolio pathway</Eyebrow>
            <h2 className="mt-3 font-display text-4xl leading-tight text-heading sm:text-5xl">
              Show what you can do, not just what you know.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-8 text-body">
              Turn lessons into something tangible. Plan a project, submit your work for feedback
              where available, revise it, then choose what belongs in your portfolio.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-heading">
              {[
                'Real tasks with clear steps',
                'Room to make mistakes and improve',
                'You control what you share',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-mint-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/projects" className={buttonStyles('primary', 'md', 'mt-8')}>
              Explore the project gallery <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-[#F0F3FB] py-20 dark:bg-[#182643] sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="People make the difference"
            title="AI support. Human connection."
            description="Technology can help explain a tricky idea. Teachers, facilitators, families and peers bring perspective, encouragement and care."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                icon: HeartHandshake,
                title: 'Teachers who bring learners along',
                text: 'Invite learners and support progress through the same required pathway using approved educational tools.',
                href: '/teachers',
                link: 'Explore teacher partnerships',
                color: 'bg-[#E4E9FF] text-brand-600',
              },
              {
                icon: School2,
                title: 'Schools that learn together',
                text: 'Plan classes, assign courses and see practical progress in an institution-ready workspace.',
                href: '/schools',
                link: 'Explore school partnerships',
                color: 'bg-[#DCF2EA] text-mint-700',
              },
              {
                icon: UsersRound,
                title: 'A community to grow in',
                text: 'Ask questions, share projects and join moderated learning circles built around mutual respect.',
                href: '/community-guidelines',
                link: 'Our community approach',
                color: 'bg-[#F9E7D5] text-[#A06324]',
              },
            ].map(({ icon: Icon, title, text, href, link, color }) => (
              <div
                key={title}
                className="flex flex-col rounded-3xl border border-line bg-panel p-7"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-7 text-lg font-extrabold leading-snug text-heading">{title}</h3>
                <p className="mt-2 flex-1 text-xs leading-6 text-body">{text}</p>
                <Link
                  className="mt-6 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200"
                  to={href}
                >
                  {link} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-panel p-7 sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <CloudDownload className="h-5 w-5" />
            </div>
            <h2 className="mt-6 font-display text-3xl text-heading">Learn beyond the signal.</h2>
            <p className="mt-3 text-sm leading-7 text-body">
              Save approved lessons for reading when the connection drops. The workspace makes local
              progress and pending sync visible, without pretending live AI or payments work
              offline.
            </p>
            <Link
              to="/explore#offline"
              className="mt-6 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              How offline learning works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-3xl border border-line bg-panel p-7 sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-50 text-mint-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-6 font-display text-3xl text-heading">A safer place to grow.</h2>
            <p className="mt-3 text-sm leading-7 text-body">
              Privacy-first defaults, age-aware spaces and guided reporting shape the design.
              Production child safety depends on real consent, moderation and server-enforced rules.
            </p>
            <Link
              to="/child-safety"
              className="mt-6 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              Read our safety approach <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-panel py-20 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <Eyebrow>Questions, answered</Eyebrow>
            <h2 className="mt-3 font-display text-4xl text-heading">
              Good to know before you begin.
            </h2>
            <p className="mt-4 text-sm leading-7 text-body">
              Want to learn more? Explore the full help centre or reach out through the contact
              form.
            </p>
            <Link to="/faq" className={buttonStyles('outline', 'md', 'mt-6')}>
              Visit the FAQ <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-line bg-canvas p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-heading">
                  {item.question}
                  <ChevronRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" />
                </summary>
                <p className="mt-4 text-xs leading-7 text-body">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-ink-900 py-16 text-white sm:py-20">
        <Container className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <Eyebrow className="text-[#a9f0d4]">Your next chapter starts somewhere</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
              Make room for what you can become.
            </h2>
            <p className="mt-4 text-sm text-slate-300">
              Take the first step. The rest is something we can build together.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonStyles('white', 'lg')} to="/courses">
              Explore courses <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-[50px] items-center gap-1 px-4 text-sm font-bold text-white hover:text-[#a9f0d4]"
              to="/explore"
            >
              How learning works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
function HammerIcon() {
  return (
    <span aria-hidden="true" className="text-lg leading-none">
      ✳
    </span>
  );
}
