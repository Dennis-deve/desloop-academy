import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  FilePlus2,
  HeartHandshake,
  Link2,
  LockKeyhole,
  MessageSquareText,
  School2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Card,
  Container,
  Eyebrow,
  InfoBox,
  SectionHeading,
  buttonStyles,
} from '@/components/ui';

function FeatureGrid({ items }: { items: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, title, text }) => (
        <Card key={title} className="p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-100">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="mt-5 text-sm font-extrabold text-heading">{title}</h3>
          <p className="mt-2 text-xs leading-6 text-body">{text}</p>
        </Card>
      ))}
    </div>
  );
}

export function TeachersPage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>For teachers & teacher partners</Eyebrow>
            <h1 className="mt-4 max-w-[650px] font-display text-5xl leading-[1.13] text-heading sm:text-6xl">
              Your impact can go further.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-body">
              Bring learners into practical education, support their progress and participate in a
              transparent partner programme when approved. Teaching comes first; revenue rules stay
              clear and configurable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/apply/teacher" className={buttonStyles('primary', 'lg')}>
                Apply to partner <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/sign-in" className={buttonStyles('outline', 'lg')}>
                Explore workspace
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-subdued">
              Applications in this preview are saved locally only. Approval and eligibility require
              a real review process.
            </p>
          </div>
          <div className="rounded-[32px] bg-ink-900 p-5 text-white shadow-float sm:p-7">
            <div className="flex items-center justify-between border-b border-white/15 pb-5">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <UsersRound className="h-5 w-5 text-[#9ce3d2]" /> Teacher Growth Centre
              </div>
              <Badge className="!bg-white/15 !text-white">Preview</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] text-white/60">Learner invitations</p>
                <p className="mt-1 font-display text-3xl">03</p>
                <span className="text-[10px] text-white/60">sample records</span>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] text-white/60">Learning groups</p>
                <p className="mt-1 font-display text-3xl">02</p>
                <span className="text-[10px] text-white/60">sample groups</span>
              </div>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-5 text-ink-900">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold">Helping learners move forward</span>
                <HeartHandshake className="h-4 w-4 text-mint-500" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { name: 'Creative makers · sample', progress: 66 },
                  { name: 'Digital starters · sample', progress: 42 },
                ].map((group) => (
                  <div key={group.name}>
                    <div className="mb-1.5 flex justify-between text-[10px] font-bold">
                      <span>{group.name}</span>
                      <span>{group.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-200">
                      <div
                        className="h-1.5 rounded-full bg-brand-500"
                        style={{ width: `${group.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-[10px] text-white/60">
              Illustrative data. No real learners or earnings are shown.
            </p>
          </div>
        </Container>
      </section>
      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="A partnership with purpose"
            title="Bring learners in. Help them grow."
            description="Partner tools are designed for responsible educational support, not high-pressure referrals."
          />
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                number: '01',
                title: 'Apply',
                text: 'Share your background and teaching interests for review.',
              },
              {
                number: '02',
                title: 'Invite',
                text: 'If approved, use an assigned link or code for learner invitations.',
              },
              {
                number: '03',
                title: 'Guide',
                text: 'Recommend courses, set group goals and support practical work.',
              },
              {
                number: '04',
                title: 'Understand earnings',
                text: 'Review eligible activity and auditable commission statements.',
              },
            ].map((step) => (
              <div key={step.number} className="rounded-3xl border border-line bg-panel p-6">
                <span className="font-display text-3xl text-brand-600 dark:text-brand-200">
                  {step.number}
                </span>
                <h3 className="mt-6 text-sm font-extrabold text-heading">{step.title}</h3>
                <p className="mt-2 text-xs leading-6 text-body">{step.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-y border-line bg-panel py-20">
        <Container>
          <SectionHeading
            eyebrow="Teacher Growth Centre"
            title="A useful workspace for real support."
          />
          <FeatureGrid
            items={[
              {
                icon: Link2,
                title: 'Clear invitations',
                text: 'Share an approved referral link or enrolment code and see the sample invitation state.',
              },
              {
                icon: UsersRound,
                title: 'Learner groups',
                text: 'Organise learners and view only the progress you are authorised to see.',
              },
              {
                icon: BookOpen,
                title: 'Course recommendations',
                text: 'Suggest a relevant path or project instead of sending generic promotions.',
              },
              {
                icon: MessageSquareText,
                title: 'Educational engagement',
                text: 'Plan announcements, encouragement and feedback within approved channels.',
              },
              {
                icon: Wallet,
                title: 'Earnings visibility',
                text: 'See sample pending and confirmed ledger entries, adjustments and terms.',
              },
              {
                icon: ShieldCheck,
                title: 'Separated permissions',
                text: 'A referral never grants access to private school records or unrestricted contact.',
              },
            ]}
          />
        </Container>
      </section>
      <section className="py-20">
        <Container className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <Eyebrow>Clear commercial terms</Eyebrow>
            <h2 className="mt-3 font-display text-4xl text-heading">
              Know what counts. Know what does not.
            </h2>
            <p className="mt-5 text-sm leading-7 text-body">
              Programme rules are set by the platform owner and must be agreed before any real
              attribution or payout.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-panel p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  title: 'Attribution',
                  text: 'Eligible learner association will follow server-side rules, windows and dispute handling.',
                },
                {
                  title: 'Eligible revenue',
                  text: 'Only verified, qualifying subscription activity can enter the commission ledger.',
                },
                {
                  title: 'Adjustments',
                  text: 'Refunds, chargebacks, reversals and disputes must be traceable.',
                },
                {
                  title: 'Payouts',
                  text: 'Thresholds, schedules, taxes and payout status require approved terms and backend processing.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <Check className="mb-2 h-4 w-4 text-mint-500" />
                  <h3 className="text-sm font-extrabold text-heading">{item.title}</h3>
                  <p className="mt-1 text-xs leading-6 text-body">{item.text}</p>
                </div>
              ))}
            </div>
            <InfoBox tone="amber" className="mt-6" title="Terms not yet set">
              No final commission rate, income guarantee, payout schedule or commercial offer is
              stated in this preview.
            </InfoBox>
          </div>
        </Container>
      </section>
      <section className="bg-ink-900 py-16 text-white">
        <Container className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-4xl">Teach with purpose. Grow with clarity.</h2>
            <p className="mt-3 text-sm text-slate-300">
              Start with a short application for review.
            </p>
          </div>
          <Link to="/apply/teacher" className={buttonStyles('white', 'lg')}>
            Apply as a teacher partner <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>
    </>
  );
}

export function SchoolsPage() {
  const steps = [
    'Apply & review',
    'Set up your school',
    'Invite teachers',
    'Create classes',
    'Assign learning',
    'See progress',
  ];
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>For schools & institutions</Eyebrow>
            <h1 className="mt-4 max-w-[650px] font-display text-5xl leading-[1.13] text-heading sm:text-6xl">
              A stronger way to learn, together.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-body">
              Bring hands-on digital learning into your school with structured courses, practical
              projects, teacher support and progress that reflects real work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/apply/school" className={buttonStyles('primary', 'lg')}>
                Explore school onboarding <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className={buttonStyles('outline', 'lg')}>
                Ask a question
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-subdued">
              No curriculum accreditation, partnership or school plan is claimed in this preview.
            </p>
          </div>
          <div className="overflow-hidden rounded-[30px] border border-line bg-panel shadow-float">
            <div className="flex items-center justify-between bg-ink-900 px-6 py-5 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  SCHOOL LAUNCH CENTRE
                </p>
                <p className="mt-1 font-display text-2xl">A clear path from day one</p>
              </div>
              <School2 className="h-8 w-8 text-[#8ddfc6]" />
            </div>
            <div className="p-6">
              <p className="mb-4 text-[11px] font-extrabold uppercase tracking-wider text-subdued">
                Illustrative setup journey
              </p>
              <div className="space-y-1">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-heading"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${index < 2 ? 'bg-mint-50 text-mint-700' : 'bg-raised text-subdued'}`}
                    >
                      {index < 2 ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    {step}
                    {index === 2 && (
                      <span className="ml-auto text-[10px] font-bold text-brand-600 dark:text-brand-200">
                        Up next
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="The school experience"
            title="One connected learning environment."
            description="Help classroom teams coordinate learning while keeping progress meaningful and student information appropriately scoped."
          />
          <FeatureGrid
            items={[
              {
                icon: BookOpen,
                title: 'Configurable programmes',
                text: 'Support age-adapted teaching and practice in the one required 44-course sequence. Actual curriculum alignment requires verification.',
              },
              {
                icon: UsersRound,
                title: 'Classroom organisation',
                text: 'Invite teachers, set up classes and plan course assignments in a school workspace.',
              },
              {
                icon: ClipboardCheck,
                title: 'Projects and review',
                text: 'See submitted work, provide constructive feedback and support revision.',
              },
              {
                icon: CalendarDays,
                title: 'Learning schedules',
                text: 'Coordinate sessions, deadlines and facilitator support where configured.',
              },
              {
                icon: School2,
                title: 'Institutional view',
                text: 'See progress by class and programme without flattening learning into one score.',
              },
              {
                icon: LockKeyhole,
                title: 'Tenant boundaries',
                text: 'Production backend policies must isolate each school and teacher assignment.',
              },
            ]}
          />
        </Container>
      </section>
      <section className="border-y border-line bg-panel py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>From interest to impact</Eyebrow>
            <h2 className="mt-3 font-display text-4xl leading-tight text-heading">
              A considered launch, not a complicated leap.
            </h2>
            <p className="mt-5 text-sm leading-7 text-body">
              Tell us about your school, the learners you serve and your device and connectivity
              realities. A future reviewed onboarding process will determine configuration and
              support.
            </p>
            <Link to="/apply/school" className={buttonStyles('primary', 'md', 'mt-7')}>
              Begin school application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-line bg-canvas p-5">
                <span className="text-xs font-extrabold text-brand-600 dark:text-brand-200">
                  0{index + 1}
                </span>
                <p className="mt-4 text-sm font-extrabold text-heading">{step}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="py-20">
        <Container className="grid gap-8 rounded-3xl bg-ink-900 p-8 text-white sm:p-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <ShieldCheck className="h-9 w-9 text-[#9ce3d2]" />
            <h2 className="mt-5 font-display text-4xl">Learning data deserves care.</h2>
          </div>
          <div>
            <p className="text-sm leading-8 text-slate-300">
              The eventual server must enforce school tenant isolation, classroom assignment scopes,
              appropriate guardian consent and auditable administrative actions. A teacher’s
              referral relationship is separate from school access.
            </p>
            <Link
              to="/child-safety"
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#a9f0d4]"
            >
              Our safety approach <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

export function ParentsPage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>For parents & guardians</Eyebrow>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-tight text-heading sm:text-6xl">
              Be part of the journey, not over their shoulder.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-body">
              Support curiosity, celebrate practical progress and stay informed about what matters.
              The parent experience is built for constructive involvement, not surveillance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className={buttonStyles('primary', 'lg')}>
                Explore family learning <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/child-safety" className={buttonStyles('outline', 'lg')}>
                Read about safety
              </Link>
            </div>
          </div>
          <div className="rounded-[30px] bg-[#E5F3EB] p-5 shadow-soft dark:bg-[#24483E] sm:p-8">
            <div className="rounded-2xl bg-panel p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                    GUARDIAN VIEW · DEMO
                  </p>
                  <h3 className="mt-1 text-base font-extrabold text-heading">
                    Learning, in perspective
                  </h3>
                </div>
                <HeartHandshake className="h-6 w-6 text-mint-700" />
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-raised p-4">
                  <p className="text-xs font-bold text-heading">A new project milestone</p>
                  <p className="mt-1 text-xs text-body">
                    Your linked learner is exploring ideas for an interactive story.
                  </p>
                </div>
                <div className="rounded-xl bg-raised p-4">
                  <p className="text-xs font-bold text-heading">Conversation starter</p>
                  <p className="mt-1 text-xs text-body">
                    “What part of your project felt most interesting this week?”
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[11px] text-subdued">
                <ShieldCheck className="h-4 w-4" />
                No private conversations or precise location data.
              </div>
            </div>
          </div>
        </Container>
      </section>
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Support that feels supportive"
            title="The right view, with the right boundaries."
          />
          <FeatureGrid
            items={[
              {
                icon: BookOpen,
                title: 'See learning direction',
                text: 'Understand enrolled courses, goals and meaningful milestones without monitoring every click.',
              },
              {
                icon: HeartHandshake,
                title: 'Celebrate practical work',
                text: 'See project milestones and encourage reflection and improvement.',
              },
              {
                icon: CalendarDays,
                title: 'Stay in the loop',
                text: 'View approved session reminders and learning updates with configurable preferences.',
              },
              {
                icon: ShieldCheck,
                title: 'Manage consent',
                text: 'Review age-appropriate participation, sharing and account settings when production flows are verified.',
              },
              {
                icon: MessageSquareText,
                title: 'Find support',
                text: 'Reach safety information and request help through approved support channels.',
              },
              {
                icon: LockKeyhole,
                title: 'Respect privacy',
                text: 'Private learner interactions are not exposed simply because a guardian is linked.',
              },
            ]}
          />
        </Container>
      </section>
      <section className="border-t border-line bg-panel py-20">
        <Container className="flex flex-col justify-between gap-8 rounded-3xl bg-ink-900 p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="font-display text-4xl">Let their curiosity lead.</h2>
            <p className="mt-3 text-sm text-slate-300">
              Explore the demo parent portal. Real linking and consent are not enabled yet.
            </p>
          </div>
          <Link to="/sign-in" className={buttonStyles('white', 'lg')}>
            Open demo access <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>
    </>
  );
}

export function FacilitatorsPage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_.8fr]">
          <div>
            <Eyebrow>For facilitators & creators</Eyebrow>
            <h1 className="mt-4 max-w-2xl font-display text-5xl leading-tight text-heading sm:text-6xl">
              Create learning that comes alive.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-body">
              Turn your expertise into thoughtful lessons, practical projects and human feedback.
              Use AI to help draft, then review every detail before learners see it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/apply/facilitator" className={buttonStyles('primary', 'lg')}>
                Apply to facilitate <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/sign-in" className={buttonStyles('outline', 'lg')}>
                Preview creator workspace
              </Link>
            </div>
          </div>
          <div className="rounded-[30px] bg-ink-900 p-7 text-white shadow-float">
            <div className="flex items-center gap-3">
              <FilePlus2 className="h-6 w-6 text-[#a9f0d4]" />
              <span className="text-sm font-extrabold">Course creation, made clearer</span>
            </div>
            <div className="mt-7 space-y-3">
              {[
                {
                  icon: BookOpen,
                  title: 'Shape the learning objectives',
                  note: 'Start with what learners will be able to do',
                },
                {
                  icon: Sparkles,
                  title: 'Generate a draft, thoughtfully',
                  note: 'AI-assisted outline · requires future backend',
                },
                {
                  icon: ClipboardCheck,
                  title: 'Review and refine',
                  note: 'Add projects, checks and your expertise',
                },
                {
                  icon: ShieldCheck,
                  title: 'Submit for approval',
                  note: 'Publication only after authorised review',
                },
              ].map(({ icon: Icon, title, note }, index) => (
                <div key={title} className="flex gap-3 rounded-2xl bg-white/10 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold">
                      {index + 1}. {title}
                    </p>
                    <p className="mt-1 text-[10px] text-white/60">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="The facilitator workspace"
            title="Teach, guide, and keep improving."
          />
          <FeatureGrid
            items={[
              {
                icon: FilePlus2,
                title: 'Course authoring',
                text: 'Organise objectives, modules, lessons, quizzes and practical assignments.',
              },
              {
                icon: Sparkles,
                title: 'AI-assisted drafting',
                text: 'Prepare a reviewable draft; never publish unreviewed generated content automatically.',
              },
              {
                icon: CalendarDays,
                title: 'Session planning',
                text: 'Coordinate future sessions and learning groups.',
              },
              {
                icon: ClipboardCheck,
                title: 'Project feedback',
                text: 'Review evidence and request thoughtful revisions.',
              },
              {
                icon: UsersRound,
                title: 'Learner progress',
                text: 'Notice where groups need support, without reducing learning to one score.',
              },
              {
                icon: ShieldCheck,
                title: 'Publication review',
                text: 'Move through draft, generated, review, approved and published states with permission checks.',
              },
            ]}
          />
        </Container>
      </section>
      <section className="bg-ink-900 py-16 text-white">
        <Container className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-4xl">Make the learning you wish you had.</h2>
            <p className="mt-3 text-sm text-slate-300">
              Applications require future verification before real teaching access.
            </p>
          </div>
          <Link to="/apply/facilitator" className={buttonStyles('white', 'lg')}>
            Apply to facilitate <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>
    </>
  );
}
