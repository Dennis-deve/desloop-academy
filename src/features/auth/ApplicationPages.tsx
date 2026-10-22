import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  School2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Container,
  Eyebrow,
  Field,
  InfoBox,
  Input,
  ProgressBar,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import {
  facilitatorApplicationSchema,
  schoolApplicationSchema,
  teacherApplicationSchema,
} from '@/lib/validation';
import { useDemo } from '@/app/providers';
import type { ApplicationRecord } from '@/types';

function ApplicationShell({
  eyebrow,
  title,
  description,
  steps,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="hero-surface border-b border-line py-12 sm:py-16">
        <Container>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-xs font-bold text-body"
          >
            <ArrowLeft className="h-4 w-4" /> Back to explore
          </Link>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_.65fr]">
            <div>
              <Eyebrow>{eyebrow}</Eyebrow>
              <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-heading sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-body">{description}</p>
            </div>
            <div className="hidden rounded-3xl bg-ink-900 p-6 text-white lg:block">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#a9f0d4]">
                What happens next
              </p>
              <div className="mt-4 space-y-3">
                {steps.map((step, index) => (
                  <div className="flex items-center gap-3 text-xs font-bold" key={step}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[10px]">
                      0{index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container className="max-w-[880px]">{children}</Container>
      </section>
    </>
  );
}
function ApplicationSuccess({
  record,
  heading,
  description,
  again,
}: {
  record: ApplicationRecord;
  heading: string;
  description: string;
  again: () => void;
}) {
  return (
    <Card className="p-7 text-center sm:p-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-mint-50 text-mint-700">
        <FileCheck2 className="h-7 w-7" />
      </span>
      <Badge tone="amber" className="mt-5">
        Local demonstration
      </Badge>
      <h2 className="mt-3 font-display text-4xl text-heading">{heading}</h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-body">{description}</p>
      <div className="mx-auto mt-6 flex max-w-sm items-center justify-between rounded-xl bg-raised p-4 text-xs">
        <span className="font-bold text-body">Application state</span>
        <StatusBadge status={record.status} />
      </div>
      <InfoBox tone="amber" className="mx-auto mt-6 max-w-xl text-left">
        Saved in this browser only. No application has been delivered, reviewed or approved.
        Production review, verification and status notifications need a backend.
      </InfoBox>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={again}>
          Preview form again
        </Button>
        <Link to="/demo" className={buttonStyles('primary')}>
          Explore demo workspaces <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
function Agreement({
  id,
  register,
  error,
  text,
}: {
  id: string;
  register: ReturnType<typeof useForm<z.infer<typeof teacherApplicationSchema>>>['register'];
  error?: string;
  text: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 text-xs leading-6 text-body">
        <input
          id={id}
          type="checkbox"
          className="mt-1 h-4 w-4 accent-brand-600"
          {...register('agree')}
        />
        {text}
      </label>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function TeacherApplicationPage() {
  const { state, actions } = useDemo();
  const existing = state.applications.find((record) => record.type === 'teacher');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof teacherApplicationSchema>>({
    resolver: zodResolver(teacherApplicationSchema),
  });
  const submit = async (values: z.infer<typeof teacherApplicationSchema>) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    actions.addApplication({
      type: 'teacher',
      status: 'pending',
      applicant: values.name,
      submittedAt: new Date().toISOString(),
    });
    setDone(true);
  };
  return (
    <ApplicationShell
      eyebrow="Teacher partner application"
      title="Help learners go further."
      description="Tell us a little about your teaching experience and the learners you hope to support. In production, applications go through verification and a transparent approval process."
      steps={['Share your background', 'Review and submit', 'Wait for a real review process']}
    >
      {done && existing ? (
        <ApplicationSuccess
          record={existing}
          heading="Preview submitted."
          description="Your teacher-partner application has a local pending state in this browser."
          again={() => {
            setDone(false);
            reset();
          }}
        />
      ) : (
        <Card className="p-6 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-heading">Teacher partner application</h2>
              <p className="text-xs text-body">Only the essentials for an initial review.</p>
            </div>
          </div>
          {existing && !done && (
            <InfoBox tone="amber" className="mt-6">
              A {existing.status} sample application already exists locally. Submitting again
              replaces its demo status.
            </InfoBox>
          )}
          <form onSubmit={handleSubmit(submit)} noValidate className="mt-7 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="teacher-name" label="Full name *" error={errors.name?.message}>
                <Input
                  id="teacher-name"
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
              </Field>
              <Field id="teacher-email" label="Email address *" error={errors.email?.message}>
                <Input
                  id="teacher-email"
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </Field>
            </div>
            <Field
              id="teacher-background"
              label="Teaching or professional background *"
              error={errors.background?.message}
            >
              <textarea
                id="teacher-background"
                rows={4}
                className="field resize-y"
                placeholder="What have you taught or worked on?"
                aria-invalid={!!errors.background}
                {...register('background')}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="teacher-expertise"
                label="Areas of expertise *"
                error={errors.expertise?.message}
              >
                <Input
                  id="teacher-expertise"
                  placeholder="e.g. Digital literacy, design"
                  aria-invalid={!!errors.expertise}
                  {...register('expertise')}
                />
              </Field>
              <Field
                id="teacher-audience"
                label="Learners you plan to support *"
                error={errors.audience?.message}
              >
                <select
                  id="teacher-audience"
                  className="field"
                  aria-invalid={!!errors.audience}
                  defaultValue=""
                  {...register('audience')}
                >
                  <option value="">Select audience</option>
                  <option>Children with guardian involvement</option>
                  <option>Teenagers</option>
                  <option>Adults</option>
                  <option>Mixed age groups</option>
                </select>
              </Field>
            </div>
            <InfoBox tone="blue">
              <ShieldCheck className="mr-1 inline h-4 w-4" /> Verification details and safeguarding
              checks will be requested through a secure process later. Do not include IDs or
              sensitive documents here.
            </InfoBox>
            <Agreement
              id="teacher-agree"
              register={register}
              error={errors.agree?.message}
              text="I understand this is a local preview, and that programme rules, commission terms, verification and approval are not yet in effect. *"
            />
            <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-6">
              <Link to="/teachers" className={buttonStyles('outline')}>
                Back to programme
              </Link>
              <Button type="submit" loading={isSubmitting}>
                Preview application <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}
    </ApplicationShell>
  );
}

export function SchoolApplicationPage() {
  const { state, actions } = useDemo();
  const existing = state.applications.find((record) => record.type === 'school');
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(1);
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof schoolApplicationSchema>>({
    resolver: zodResolver(schoolApplicationSchema),
    mode: 'onTouched',
  });
  const next = async () => {
    const valid = await trigger(['schoolName', 'schoolType', 'location', 'contactName', 'email']);
    if (valid) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const submit = async (values: z.infer<typeof schoolApplicationSchema>) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    actions.addApplication({
      type: 'school',
      status: 'pending',
      applicant: values.schoolName,
      submittedAt: new Date().toISOString(),
    });
    setDone(true);
  };
  return (
    <ApplicationShell
      eyebrow="School partnership application"
      title="Tell us about your school."
      description="A thoughtful launch begins with understanding your learners, programmes and connectivity needs. This preview does not send your application anywhere."
      steps={[
        'School and representative',
        'Learning needs and context',
        'Future verification and review',
      ]}
    >
      {done && existing ? (
        <ApplicationSuccess
          record={existing}
          heading="A first step, previewed."
          description="Your school application has a local pending state in this browser. No real onboarding has begun."
          again={() => {
            setDone(false);
            setStep(1);
            reset();
          }}
        />
      ) : (
        <Card className="p-6 sm:p-9">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <School2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-heading">School application</h2>
                <p className="text-xs text-body">
                  Step {step} of 2 · {step === 1 ? 'School details' : 'Learning needs'}
                </p>
              </div>
            </div>
            <Badge tone="blue">{step}/2</Badge>
          </div>
          <ProgressBar value={step * 50} label="Application progress" className="mt-6" />
          {existing && !done && (
            <InfoBox tone="amber" className="mt-5">
              A {existing.status} sample application already exists locally. A new submission
              replaces its demo status.
            </InfoBox>
          )}
          <form onSubmit={handleSubmit(submit)} noValidate className="mt-7 space-y-5">
            {step === 1 ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="school-name" label="School name *" error={errors.schoolName?.message}>
                    <Input
                      id="school-name"
                      placeholder="School name"
                      aria-invalid={!!errors.schoolName}
                      {...register('schoolName')}
                    />
                  </Field>
                  <Field id="school-type" label="School type *" error={errors.schoolType?.message}>
                    <select
                      id="school-type"
                      className="field"
                      defaultValue=""
                      aria-invalid={!!errors.schoolType}
                      {...register('schoolType')}
                    >
                      <option value="">Select type</option>
                      <option>Primary</option>
                      <option>Junior high</option>
                      <option>Senior high</option>
                      <option>Higher education</option>
                      <option>Other institution</option>
                    </select>
                  </Field>
                </div>
                <Field
                  id="school-location"
                  label="General location *"
                  error={errors.location?.message}
                  hint="City or region only. No precise location needed."
                >
                  <Input
                    id="school-location"
                    placeholder="e.g. Accra, Greater Accra"
                    aria-invalid={!!errors.location}
                    {...register('location')}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="school-contact"
                    label="Authorised representative *"
                    error={errors.contactName?.message}
                  >
                    <Input
                      id="school-contact"
                      placeholder="Representative name"
                      aria-invalid={!!errors.contactName}
                      {...register('contactName')}
                    />
                  </Field>
                  <Field
                    id="school-email"
                    label="Official contact email *"
                    error={errors.email?.message}
                  >
                    <Input
                      id="school-email"
                      type="email"
                      placeholder="contact@school.example"
                      aria-invalid={!!errors.email}
                      {...register('email')}
                    />
                  </Field>
                </div>
                <div className="flex justify-end border-t border-line pt-6">
                  <Button onClick={() => void next()}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="school-learners"
                    label="Estimated learners *"
                    error={errors.learners?.message}
                  >
                    <Input
                      id="school-learners"
                      type="number"
                      min={1}
                      placeholder="e.g. 120"
                      aria-invalid={!!errors.learners}
                      {...register('learners')}
                    />
                  </Field>
                  <Field
                    id="school-teachers"
                    label="Estimated teachers *"
                    error={errors.teachers?.message}
                  >
                    <Input
                      id="school-teachers"
                      type="number"
                      min={1}
                      placeholder="e.g. 8"
                      aria-invalid={!!errors.teachers}
                      {...register('teachers')}
                    />
                  </Field>
                </div>
                <Field
                  id="school-programmes"
                  label="Programmes of interest *"
                  error={errors.programmes?.message}
                >
                  <textarea
                    id="school-programmes"
                    rows={3}
                    className="field resize-y"
                    placeholder="e.g. Digital literacy and practical coding"
                    aria-invalid={!!errors.programmes}
                    {...register('programmes')}
                  />
                </Field>
                <Field
                  id="school-connectivity"
                  label="Connectivity & device situation *"
                  error={errors.connectivity?.message}
                >
                  <select
                    id="school-connectivity"
                    className="field"
                    defaultValue=""
                    aria-invalid={!!errors.connectivity}
                    {...register('connectivity')}
                  >
                    <option value="">Select the closest fit</option>
                    <option>Reliable shared internet and devices</option>
                    <option>Intermittent internet, shared devices</option>
                    <option>Limited internet or devices</option>
                    <option>Not sure yet</option>
                  </select>
                </Field>
                <InfoBox tone="blue">
                  No student records or verification documents are needed at this stage. Any later
                  school verification must use a secure channel.
                </InfoBox>
                <div>
                  <label className="flex items-start gap-3 text-xs leading-6 text-body">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-brand-600"
                      {...register('agree')}
                    />
                    I understand this is a local preview and have read the{' '}
                    <Link to="/privacy" className="font-bold text-brand-600 dark:text-brand-200">
                      privacy information
                    </Link>
                    . *
                  </label>
                  {errors.agree && (
                    <p role="alert" className="field-error">
                      {errors.agree.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    Preview application <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </form>
        </Card>
      )}
    </ApplicationShell>
  );
}
export function FacilitatorApplicationPage() {
  const { state, actions } = useDemo();
  const existing = state.applications.find((record) => record.type === 'facilitator');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof facilitatorApplicationSchema>>({
    resolver: zodResolver(facilitatorApplicationSchema),
  });
  const submit = async (values: z.infer<typeof facilitatorApplicationSchema>) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    actions.addApplication({
      type: 'facilitator',
      status: 'pending',
      applicant: values.name,
      submittedAt: new Date().toISOString(),
    });
    setDone(true);
  };
  return (
    <ApplicationShell
      eyebrow="Facilitator application"
      title="Share what you love to teach."
      description="Tell us about the subjects and teaching experience you would bring to a future reviewed facilitator programme."
      steps={['Share your expertise', 'Preview your submission', 'Verification and review later']}
    >
      {done && existing ? (
        <ApplicationSuccess
          record={existing}
          heading="Preview submitted."
          description="Your facilitator application has a local pending state. No reviewer was notified."
          again={() => {
            setDone(false);
            reset();
          }}
        />
      ) : (
        <Card className="p-6 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-heading">Facilitator application</h2>
              <p className="text-xs text-body">Start with a short introduction.</p>
            </div>
          </div>
          {existing && !done && (
            <InfoBox tone="amber" className="mt-5">
              A {existing.status} sample application already exists locally.
            </InfoBox>
          )}
          <form onSubmit={handleSubmit(submit)} noValidate className="mt-7 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="fac-name" label="Name *" error={errors.name?.message}>
                <Input
                  id="fac-name"
                  aria-invalid={!!errors.name}
                  placeholder="Your name"
                  {...register('name')}
                />
              </Field>
              <Field id="fac-email" label="Email *" error={errors.email?.message}>
                <Input
                  id="fac-email"
                  type="email"
                  aria-invalid={!!errors.email}
                  placeholder="you@example.com"
                  {...register('email')}
                />
              </Field>
            </div>
            <Field id="fac-expertise" label="Subject expertise *" error={errors.expertise?.message}>
              <Input
                id="fac-expertise"
                aria-invalid={!!errors.expertise}
                placeholder="e.g. Design, robotics, digital literacy"
                {...register('expertise')}
              />
            </Field>
            <Field
              id="fac-experience"
              label="Teaching or facilitation experience *"
              error={errors.experience?.message}
            >
              <textarea
                id="fac-experience"
                rows={4}
                className="field resize-y"
                aria-invalid={!!errors.experience}
                placeholder="Tell us about how you help others learn..."
                {...register('experience')}
              />
            </Field>
            <div>
              <label className="flex items-start gap-3 text-xs leading-6 text-body">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-brand-600"
                  {...register('agree')}
                />
                I understand this preview does not submit for real review and that verification is
                required before teaching. *
              </label>
              {errors.agree && (
                <p role="alert" className="field-error">
                  {errors.agree.message}
                </p>
              )}
            </div>
            <Button type="submit" loading={isSubmitting}>
              Preview application <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </ApplicationShell>
  );
}
