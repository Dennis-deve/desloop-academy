import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Compass,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Container, Eyebrow, SectionHeading, buttonStyles } from '@/components/ui';
import { courseById, masterStages } from '@/curriculum/model';

const audienceContent = {
  children: {
    eyebrow: 'Digital literacy for children',
    title: 'A gentle beginning for curious minds.',
    lead: 'An age-aware approach to digital curiosity, thoughtful habits and playful making. Children should learn with a trusted adult nearby.',
    icon: Lightbulb,
    points: [
      'Simple language and short activities',
      'Guardian-aware privacy and sharing controls',
      'Projects that encourage curiosity, not competition',
    ],
    courseIds: ['course-01', 'course-02', 'course-03'],
    note: 'Ages 6–8 use the same course order with supervised, picture-supported activities. Guardian consent and age verification are not implemented; do not enter real child data.',
  },
  teens: {
    eyebrow: 'Coding and technology for teenagers',
    title: 'Make the things you wish existed.',
    lead: 'Build confidence by trying ideas, solving real problems, and making work you can explain in your own words.',
    icon: WandSparkles,
    points: [
      'Creative projects with room to experiment',
      'Safer digital participation',
      'Feedback that helps you improve',
    ],
    courseIds: ['course-01', 'course-02', 'course-03'],
    note: 'Ages 13–17 follow the same 44-course order. Teen spaces and contact restrictions need verified server-side policies before production.',
  },
  adults: {
    eyebrow: 'Adult learning',
    title: 'It is never too late to start something new.',
    lead: 'Learn useful digital, design and AI skills at a pace that works around everyday life.',
    icon: Compass,
    points: [
      'Start from your real goals',
      'Practise with practical tasks',
      'Make visible progress at your pace',
    ],
    courseIds: ['course-01', 'course-02', 'course-03'],
    note: 'Adult examples use practical work and community contexts. All course content and progress remain a browser-local draft preview.',
  },
  careers: {
    eyebrow: 'Career and professional skills',
    title: 'Build skills that travel with you.',
    lead: 'Explore practical directions across design, data, technology and communication. Show your thinking through portfolio evidence.',
    icon: BriefcaseBusiness,
    points: [
      'Connect lessons to applied projects',
      'Practise problem solving and communication',
      'Document the work behind your skills',
    ],
    courseIds: ['course-01', 'course-02', 'course-03'],
    note: 'Career-focused topics come later in the same required sequence. No employment, accreditation or certification outcome is promised.',
  },
} as const;

export function ExplorePage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_.9fr]">
          <div>
            <Eyebrow>Explore learning</Eyebrow>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.12] text-heading sm:text-6xl">
              Your next skill starts with a question.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-body">
              What would you like to understand, make or do? Explore the 44-course sequence, choose
              age-appropriate teaching support, and collect practical evidence as you progress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className={buttonStyles('primary', 'lg')}>
                Browse courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/courses" className={buttonStyles('outline', 'lg')}>
                See the one pathway
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: BookOpen,
                title: 'Discover',
                text: 'Begin with Course 01',
                color: 'bg-[#E7EDFF] text-[#435AC4]',
              },
              {
                icon: Sparkles,
                title: 'Understand',
                text: 'Ask, practise and reflect',
                color: 'bg-[#E8E3F8] text-[#6952AE]',
              },
              {
                icon: Lightbulb,
                title: 'Create',
                text: 'Build a real project',
                color: 'bg-[#FFF0D5] text-[#9B6922]',
              },
              {
                icon: HeartHandshake,
                title: 'Grow',
                text: 'Learn with support',
                color: 'bg-[#DDF3E9] text-[#227D60]',
              },
            ].map(({ icon: Icon, title, text, color }, index) => (
              <div
                className={`flex min-h-[178px] flex-col justify-between rounded-3xl p-5 ${color} ${index % 2 ? 'translate-y-5' : ''}`}
                key={title}
              >
                <Icon className="h-7 w-7" strokeWidth={1.7} />
                <div>
                  <p className="font-display text-[26px]">{title}</p>
                  <p className="mt-1 text-xs opacity-80">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Find your fit"
            title="Find your way to learn."
            description="Different ages need different examples and support. Every learner begins at Course 01 and follows the same essential outcomes."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(audienceContent).map(([key, info]) => (
              <Link
                key={key}
                to={`/learn/${key}`}
                className="group flex items-start gap-5 rounded-3xl border border-line bg-panel p-6 transition hover:shadow-soft"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  <info.icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                    {info.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-extrabold text-heading">{info.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-body">{info.lead}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200">
                    Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-y border-line bg-panel py-20">
        <Container>
          <SectionHeading
            eyebrow="One ordered curriculum"
            title="The early steps prepare you for the later ones."
            description="These are milestones in the same 44-course sequence, not tracks you can select or skip to."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {[masterStages[0], masterStages[3], masterStages[8]].map((stage) => (
              <Link
                to={`/courses#stage-${stage.number}`}
                key={stage.number}
                className="rounded-3xl border border-line bg-canvas p-6 hover:shadow-soft"
              >
                <Badge tone="blue">
                  Stage {stage.number} · Courses {stage.first}–{stage.last}
                </Badge>
                <h3 className="mt-5 font-display text-2xl text-heading">{stage.title}</h3>
                <p className="mt-2 text-xs leading-6 text-body">{stage.subtitle}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
                  Preview stage <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <section id="offline" className="py-20">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div>
            <Eyebrow>Low-connectivity learning</Eyebrow>
            <h2 className="mt-3 font-display text-4xl text-heading">
              A learning rhythm that works around your connection.
            </h2>
          </div>
          <div className="text-sm leading-8 text-body">
            <p>
              In the demo workspace you can save selected lesson text to your browser for reading
              after a connection drops. Notes and progress are local demonstration data, not
              synchronised to a server.
            </p>
            <p className="mt-3">
              Live AI responses, payments, accounts and community updates need a connection.
              Production synchronisation, conflict handling and device security still need
              engineering and testing.
            </p>
            <Link to="/register" className={buttonStyles('primary', 'md', 'mt-6')}>
              Try the learner preview <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

export function AudiencePage({ audience }: { audience: keyof typeof audienceContent }) {
  const info = audienceContent[audience];
  const recommended = info.courseIds
    .map((id) => courseById(id))
    .filter((course) => course !== undefined);
  const Icon: LucideIcon = info.icon;
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid items-center gap-10 md:grid-cols-[1fr_.7fr]">
          <div>
            <Eyebrow>{info.eyebrow}</Eyebrow>
            <h1 className="mt-4 max-w-[670px] font-display text-5xl leading-[1.12] text-heading sm:text-6xl">
              {info.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-body">{info.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className={buttonStyles('primary', 'lg')}>
                Explore courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/courses" className={buttonStyles('outline', 'lg')}>
                See the one pathway
              </Link>
            </div>
          </div>
          <div className="relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center rounded-[38px] bg-[#E6EBFC] dark:bg-[#293A69]">
            <div className="absolute inset-7 rounded-[32px] border border-white/70" />
            <span className="flex h-40 w-40 items-center justify-center rounded-[42px] bg-white/80 text-brand-600 shadow-float dark:bg-panel">
              <Icon className="h-20 w-20" strokeWidth={1.2} />
            </span>
            <span className="absolute bottom-6 left-6 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-ink-900 shadow-soft">
              Learn → Try → Make
            </span>
          </div>
        </Container>
      </section>
      <section className="py-20">
        <Container className="grid gap-10 lg:grid-cols-[.7fr_1fr]">
          <div>
            <Eyebrow>Made with you in mind</Eyebrow>
            <h2 className="mt-3 font-display text-4xl text-heading">
              Progress worth feeling good about.
            </h2>
            <p className="mt-5 text-sm leading-7 text-body">
              Learn in small steps and build understanding you can use outside the lesson.
            </p>
          </div>
          <div className="grid gap-4">
            {info.points.map((point, index) => (
              <div
                key={point}
                className="flex items-center gap-5 rounded-2xl border border-line bg-panel p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-700">
                  <Check className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                    0{index + 1}
                  </span>
                  <p className="mt-1 text-sm font-bold text-heading">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-y border-line bg-panel py-20">
        <Container>
          <SectionHeading
            eyebrow="Where everyone begins"
            title="Courses 01–03 for every age"
            description="The same first three required courses for all learners. Teaching presentation and examples adapt; prerequisites stay the same."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {recommended.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group overflow-hidden rounded-3xl border border-line bg-canvas"
              >
                <div className="course-art course-art-mint flex h-32 items-center justify-center">
                  <BookOpen className="relative z-10 h-10 w-10" />
                </div>
                <div className="p-5">
                  <Badge tone="blue">
                    Required Course {String(course.number).padStart(2, '0')}
                  </Badge>
                  <h3 className="mt-3 text-base font-extrabold text-heading">{course.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-body">{course.purpose}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
                    View course{' '}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-[#865d22] dark:bg-amber-500/10 dark:text-amber-100">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            {info.note}
          </p>
        </Container>
      </section>
      <section className="py-20">
        <Container className="flex flex-col gap-5 rounded-3xl bg-ink-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#a9f0d4]">
              Ready when you are
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Begin with the foundations, your way.
            </h2>
          </div>
          <Link to="/register" className={buttonStyles('white', 'lg')}>
            Try the demo <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>
    </>
  );
}
