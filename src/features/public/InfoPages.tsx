import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  HeartHandshake,
  LockKeyhole,
  MessageCircleQuestion,
  Send,
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
  Eyebrow,
  Field,
  InfoBox,
  Input,
  SectionHeading,
  buttonStyles,
} from '@/components/ui';
import { contactSchema } from '@/lib/validation';
import { initialProjects } from '@/mocks/catalog';
import { site } from '@/config/site';

export function AboutPage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-20 sm:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_.75fr]">
          <div>
            <Eyebrow>About {site.shortName}</Eyebrow>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight text-heading sm:text-6xl">
              Education should lead to possibility.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-body">
              We are designing a connected learning experience where a question can become a skill,
              a skill can become a project, and a project can open a new direction.
            </p>
            <Link to="/explore" className={buttonStyles('primary', 'lg', 'mt-8')}>
              Explore the approach <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-line bg-[#f2f5fa] p-3 shadow-soft">
              <img
                src={site.brandAssets.wordmarkLight}
                alt="Desloop Academy by Destech Solutions wordmark on a light background"
                width={1200}
                height={543}
                loading="lazy"
                className="w-full rounded-2xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BookOpen, label: 'Accessible foundations' },
                { icon: Sparkles, label: 'Thoughtful AI' },
                { icon: HeartHandshake, label: 'Human guidance' },
                { icon: Compass, label: 'Practical outcomes' },
              ].map(({ icon: Icon, label }) => (
                <div
                  className="flex min-h-[116px] flex-col justify-between rounded-3xl border border-line bg-panel p-5 shadow-soft"
                  key={label}
                >
                  <Icon className="h-7 w-7 text-brand-600" />
                  <span className="text-sm font-extrabold text-heading">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
      <section className="py-20">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>What guides us</Eyebrow>
            <h2 className="mt-4 font-display text-4xl text-heading">
              Learn by doing. Grow with people.
            </h2>
            <p className="mt-5 text-sm leading-8 text-body">
              Good education meets people where they are. Desloop Academy is being built for
              learners in Ghana and beyond, with attention to access, practical creativity, safety
              and real human support.
            </p>
            <p className="mt-4 text-sm leading-8 text-body">
              This frontend preview demonstrates the intended experience. It is not a launched
              school programme, a certified course provider, or a connected payments and AI service.
            </p>
          </div>
          <div className="space-y-3">
            {[
              {
                title: 'Skills should be useful',
                text: 'Projects and evidence matter as much as completing a lesson.',
              },
              {
                title: 'AI should serve understanding',
                text: 'Hints and explanations complement, rather than replace, human teaching and learner effort.',
              },
              {
                title: 'Trust has to be earned',
                text: 'Transparent terms, privacy choices and age-aware safeguarding are essential foundations.',
              },
            ].map((value) => (
              <Card key={value.title} className="p-5">
                <h3 className="text-sm font-extrabold text-heading">{value.title}</h3>
                <p className="mt-2 text-xs leading-6 text-body">{value.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

export function ProjectGalleryPage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container>
          <Eyebrow>Project gallery</Eyebrow>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight text-heading sm:text-6xl">
            Learning you can see in action.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-body">
            These are sample project briefs, not work submitted by real learners. Each project turns
            a new skill into practical evidence of understanding.
          </p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="Make something meaningful" title="Start with a project idea." />
          <div className="grid gap-5 md:grid-cols-3">
            {initialProjects.map((project, index) => (
              <Card key={project.id} className="flex flex-col overflow-hidden">
                <div
                  className={`course-art course-art-${['blue', 'lavender', 'mint'][index]} flex h-40 items-center justify-center`}
                >
                  <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[26px] bg-white/60">
                    <Compass className="h-9 w-9" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <Badge tone="blue">Sample project</Badge>
                  <h2 className="mt-4 font-display text-2xl leading-tight text-heading">
                    {project.title}
                  </h2>
                  <p className="mt-3 flex-1 text-xs leading-6 text-body">{project.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.skills.map((skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                  <Link
                    to={`/sample-courses/${project.courseId}`}
                    className="mt-6 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200"
                  >
                    Explore related course <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

type ContactValues = z.infer<typeof contactSchema>;
export function ContactPage({ support = false }: { support?: boolean }) {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', topic: support ? 'Support question' : '', message: '' },
  });
  const submit = async (_data: ContactValues) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSent(true);
    reset();
  };
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-20">
        <Container>
          <Eyebrow>{support ? 'Help & support' : 'Contact'}</Eyebrow>
          <h1 className="mt-4 max-w-2xl font-display text-5xl leading-tight text-heading sm:text-6xl">
            {support ? 'The right help, when you need it.' : 'Start a conversation.'}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-body sm:text-base">
            {support
              ? 'Find answers and learn where to turn for guidance. The form below is a local UI demonstration and does not deliver a message.'
              : 'Questions about learning, partnerships or the platform? Tell us what is on your mind. Message delivery is not connected in this preview.'}
          </p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="grid gap-9 lg:grid-cols-[.75fr_1.25fr]">
          <div className="space-y-4">
            <Card className="p-6">
              <MessageCircleQuestion className="h-6 w-6 text-brand-600" />
              <h2 className="mt-5 text-base font-extrabold text-heading">Looking for an answer?</h2>
              <p className="mt-2 text-xs leading-6 text-body">
                Browse common questions about learning, AI guidance and the current preview.
              </p>
              <Link
                to="/faq"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
              >
                Visit FAQ <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
            <Card className="p-6">
              <ShieldCheck className="h-6 w-6 text-mint-700" />
              <h2 className="mt-5 text-base font-extrabold text-heading">A safety concern?</h2>
              <p className="mt-2 text-xs leading-6 text-body">
                Read the safeguarding information. A real urgent reporting channel must be
                configured before launch.
              </p>
              <Link
                to="/child-safety"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
              >
                Safety information <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
            <InfoBox tone="amber">
              There is no connected support inbox yet. Do not send urgent concerns or sensitive
              information through this demonstration form.
            </InfoBox>
          </div>
          <Card className="p-6 sm:p-8">
            {sent ? (
              <EmptyState
                icon={CheckCircle2}
                title="Local form preview complete"
                description="This demonstrates the confirmation state only. No message was sent, stored, or delivered. Please use an official contact channel when one is configured."
                action={
                  <Button onClick={() => setSent(false)} variant="outline">
                    Write another preview message
                  </Button>
                }
                className="!border-0 !p-0"
              />
            ) : (
              <>
                <h2 className="font-display text-3xl text-heading">Send a message</h2>
                <p className="mt-2 text-xs leading-6 text-body">
                  Fields marked with * are required. This form does not send messages in demo mode.
                </p>
                <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5" noValidate>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="contact-name" label="Your name *" error={errors.name?.message}>
                      <Input
                        id="contact-name"
                        placeholder="Your name"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'contact-name-error' : undefined}
                        {...register('name')}
                      />
                    </Field>
                    <Field id="contact-email" label="Email address *" error={errors.email?.message}>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="you@example.com"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'contact-email-error' : undefined}
                        {...register('email')}
                      />
                    </Field>
                  </div>
                  <Field
                    id="contact-topic"
                    label="What is this about? *"
                    error={errors.topic?.message}
                  >
                    <select
                      id="contact-topic"
                      className="field"
                      aria-invalid={!!errors.topic}
                      {...register('topic')}
                    >
                      <option value="">Select a topic</option>
                      {[
                        'Learning question',
                        'Teacher partnership',
                        'School partnership',
                        'Facilitator opportunity',
                        'Support question',
                        'Other',
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    id="contact-message"
                    label="Your message *"
                    error={errors.message?.message}
                  >
                    <textarea
                      id="contact-message"
                      rows={5}
                      className="field resize-y"
                      placeholder="Tell us a little about what you need..."
                      aria-invalid={!!errors.message}
                      {...register('message')}
                    />
                  </Field>
                  <Button type="submit" loading={isSubmitting}>
                    Preview submission <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </Card>
        </Container>
      </section>
    </>
  );
}

const faqs = [
  {
    topic: 'Learning',
    question: 'Where should I start?',
    answer:
      'Choose a course that matches your interest and current experience, or explore a learning path for a guided sequence. The preview includes sample courses and locally stored progress.',
  },
  {
    topic: 'Learning',
    question: 'Can I learn at my own pace?',
    answer:
      'The self-directed experience is designed for flexible learning. Future facilitated sessions and school schedules may follow a specific timetable.',
  },
  {
    topic: 'AI',
    question: 'Is the AI tutor connected?',
    answer:
      'No. The current studio uses clearly labelled demonstration responses. A production AI service must be secured behind a backend, monitored for safety and designed to support learning rather than replace it.',
  },
  {
    topic: 'Projects',
    question: 'Can I share my work publicly?',
    answer:
      'The demo portfolio shows local visibility controls only. Production publication requires moderation, permission checks and age-appropriate consent, particularly for children.',
  },
  {
    topic: 'Accounts',
    question: 'Is demo sign-in a secure account?',
    answer:
      'No. Demo sign-in creates a local session only. Do not enter sensitive data. Real authentication and backend authorisation must be implemented before production.',
  },
  {
    topic: 'Payments',
    question: 'How much does a plan cost?',
    answer:
      'Final plans, prices, benefits and billing terms are not set. The pricing page shows an illustrative structure only; the payment flow does not charge money.',
  },
  {
    topic: 'Partners',
    question: 'What commission will teacher partners earn?',
    answer:
      'No final rate or eligibility rules have been approved. The programme owner must set transparent terms and implement server-side attribution, ledgers and payout review before launch.',
  },
  {
    topic: 'Offline',
    question: 'What works when I am offline?',
    answer:
      'Approved lesson text can be saved in IndexedDB and revisited in the browser after the app shell has been visited. Real-time AI, billing, remote verification and community updates require connectivity. Production sync remains to be built.',
  },
];
export function FAQPage() {
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container>
          <Eyebrow>Frequently asked questions</Eyebrow>
          <h1 className="mt-4 font-display text-5xl text-heading sm:text-6xl">Curious? Good.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-body">
            Clear answers about the learning experience and what is—and is not—available in this
            frontend preview.
          </p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="max-w-[960px]">
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-line bg-panel p-5 sm:p-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-heading">
                  <span>
                    <span className="mr-3 text-[10px] uppercase tracking-widest text-brand-600 dark:text-brand-200">
                      {faq.topic}
                    </span>
                    {faq.question}
                  </span>
                  <span className="text-lg text-brand-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-xs leading-7 text-body">{faq.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 rounded-3xl bg-ink-900 p-8 text-white">
            <h2 className="font-display text-3xl">Still wondering?</h2>
            <p className="mt-2 text-sm text-slate-300">
              The contact form is a demonstration until delivery is connected.
            </p>
            <Link to="/contact" className={buttonStyles('white', 'md', 'mt-5')}>
              Contact page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

const policyData = {
  privacy: {
    eyebrow: 'Privacy information',
    title: 'Privacy starts with good choices.',
    intro:
      'This page describes the intended privacy approach for the frontend preview. It is not a final, legally reviewed privacy notice.',
    icon: LockKeyhole,
    sections: [
      [
        'What this demo stores',
        'The preview stores local learning progress, form states and preferences in your browser, and a temporary demo session in session storage. Saved lesson text uses IndexedDB. No connected server receives your demo form data.',
      ],
      [
        'Children’s data',
        'Do not enter a child’s personal information in this preview. Production child profiles, consent, retention, deletion and guardian rights need formal design and legal review.',
      ],
      [
        'What production needs',
        'A real privacy notice must identify the operator, lawful basis, data sharing, storage locations, retention, user rights and contact details. Backend access controls and deletion workflows must be implemented.',
      ],
    ],
  },
  terms: {
    eyebrow: 'Terms of service',
    title: 'Clear terms, before any commitment.',
    intro:
      'This is a product-preview information page, not binding production terms. Business and legal terms have not been approved.',
    icon: BookOpen,
    sections: [
      [
        'Preview use',
        'The interface is for evaluating a demonstration. Accounts, progress, applications, pricing, subscriptions and commissions shown here are illustrative and not legally operative.',
      ],
      [
        'Payments and access',
        'No payment provider is connected, no charge is made, and no plan entitlement is granted. Final plan descriptions, cancellation, renewal and refund terms must be reviewed and published before launch.',
      ],
      [
        'Content and conduct',
        'Learning content is sample material. Users of the future platform must follow an approved acceptable-use and community policy. No accreditation or employment outcome is promised.',
      ],
    ],
  },
  'community-guidelines': {
    eyebrow: 'Community guidelines',
    title: 'Learn together. Treat each other well.',
    intro:
      'The community is designed as a moderated learning space. These are draft principles for the preview, pending operational review.',
    icon: UsersRound,
    sections: [
      [
        'Be constructive',
        'Ask questions, share what you tried, and give feedback that helps someone improve. Disagreement is welcome; personal attacks are not.',
      ],
      [
        'Protect privacy',
        'Do not share addresses, phone numbers, passwords, school identifiers or other private details. Ask permission before sharing someone else’s work or image.',
      ],
      [
        'Report concerns',
        'Use the report action on a post in the demo community. It records a local report state only; no moderator is notified. Production reporting must route to a trained moderation team with response processes.',
      ],
      [
        'Age-aware spaces',
        'Younger learners need restricted contact, guardian-aware settings, appropriate content review and server-enforced permissions. Direct messaging with unknown adults is not enabled by default.',
      ],
    ],
  },
  'child-safety': {
    eyebrow: 'Child safety',
    title: 'A safer space is built on purpose.',
    intro:
      'Safety is a design requirement, not a badge. This preview shows intended controls; it is not yet ready for children to use independently.',
    icon: ShieldCheck,
    sections: [
      [
        'Privacy-first by default',
        'Collect only information needed for learning. Avoid public child rankings, precise locations, public contact details and unnecessary profile fields. Portfolio sharing for minors must be optional and consented.',
      ],
      [
        'Communication boundaries',
        'Children should be in age-appropriate, moderated spaces. Unrestricted private messages between children and unknown adults are not enabled. Educator communication needs permissions and oversight.',
      ],
      [
        'Reports and response',
        'A production platform needs accessible reporting, blocking where suitable, trained moderator review, clear escalation and safeguarding incident procedures. The current report button is local demonstration only.',
      ],
      [
        'Guardian involvement',
        'Linking, consent, account controls and age verification must be implemented and reviewed before real child accounts are accepted. Seek appropriate legal and safeguarding advice for launch markets.',
      ],
    ],
  },
} as const;
export function PolicyPage({ page }: { page: keyof typeof policyData }) {
  const item = policyData[page];
  const Icon: LucideIcon = item.icon;
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_160px]">
          <div>
            <Eyebrow>{item.eyebrow}</Eyebrow>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight text-heading sm:text-6xl">
              {item.title}
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-8 text-body sm:text-base">{item.intro}</p>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-brand-50 text-brand-600 dark:bg-brand-500/20">
            <Icon className="h-14 w-14" strokeWidth={1.4} />
          </div>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[.4fr_.6fr]">
          <div>
            <InfoBox tone="amber" title="Preview information only">
              This is not a reviewed legal document or proof of compliance. Policies, contacts and
              operational processes must be approved before production use.
            </InfoBox>
            <Link to="/contact" className={buttonStyles('outline', 'md', 'mt-5')}>
              Questions? Contact page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-5">
            {item.sections.map(([title, text], index) => (
              <Card key={title} className="p-6">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-200">
                  0{index + 1}
                </span>
                <h2 className="mt-2 font-display text-2xl text-heading">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-body">{text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
