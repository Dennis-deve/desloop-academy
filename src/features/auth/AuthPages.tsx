import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  Mail,
  School2,
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
  Eyebrow,
  Field,
  InfoBox,
  Input,
  ProgressBar,
  buttonStyles,
} from '@/components/ui';
import { registerSchema, signInSchema, emailSchema } from '@/lib/validation';
import { useAuth, useDemo, useToast } from '@/app/providers';
import { primaryRoles, roleDetails, site } from '@/config/site';
import type { Role } from '@/types';
import { AgeBandSelector } from '@/features/curriculum/shared';
import type { AgeBand } from '@/curriculum/model';

function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hero-surface min-h-[calc(100vh-80px)] py-14 sm:py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
        <div className="max-w-xl">
          <Eyebrow>Welcome to your next step</Eyebrow>
          <h1 className="mt-4 font-display text-5xl leading-tight text-heading sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-8 text-body sm:text-base">{description}</p>
          <div className="mt-10 hidden space-y-4 lg:block">
            {[
              { icon: BookOpen, text: 'Begin at Course 01 with age-adapted support' },
              { icon: Sparkles, text: 'Learn with useful guidance, not shortcuts' },
              { icon: HeartHandshake, text: 'Make something you can be proud of' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-xs font-bold text-body">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <Card className="mx-auto w-full max-w-[490px] p-6 shadow-soft sm:p-9">{children}</Card>
      </Container>
    </section>
  );
}
function PasswordField({
  register,
  error,
  id = 'password',
}: {
  register: ReturnType<typeof useForm<z.infer<typeof signInSchema>>>['register'];
  error?: string;
  id?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label="Password" error={error}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={id === 'password' ? 'current-password' : 'new-password'}
          placeholder="At least 8 characters"
          className="pr-12"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-subdued hover:bg-raised"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  const submit = async (values: z.infer<typeof signInSchema>) => {
    setError('');
    try {
      await signIn(values.email, values.password);
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/app');
    } catch {
      setError('Could not start the demo session. Try again.');
    }
  };
  return (
    <AuthShell
      title="Good to have you back."
      description="Pick up a lesson, check a project, or take a new direction. Your next useful step is waiting."
    >
      <div>
        <Badge tone="amber">Local demo only</Badge>
        {params.get('expired') && (
          <InfoBox tone="amber" className="mt-4">
            Your demonstration session has ended. Sign in or choose a role to continue. Real session
            expiration must be handled by an authentication provider.
          </InfoBox>
        )}
        <h2 className="mt-4 font-display text-3xl text-heading">Sign in</h2>
        <p className="mt-2 text-xs leading-6 text-body">
          Any valid email and 8-character password starts a local learner demo. No credentials are
          verified or sent to a server.
        </p>
        <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5" noValidate>
          <Field id="signin-email" label="Email address" error={errors.email?.message}>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'signin-email-error' : undefined}
              {...register('email')}
            />
          </Field>
          <PasswordField register={register} error={errors.password?.message} />
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign in to demo <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
        <div className="my-6 flex items-center gap-3 text-[11px] text-subdued">
          <span className="h-px flex-1 bg-line" />
          or explore without an account
          <span className="h-px flex-1 bg-line" />
        </div>
        <Link to="/demo" className={buttonStyles('outline', 'md', 'w-full')}>
          Choose a demo role
        </Link>
        <p className="mt-6 text-center text-xs text-body">
          New here?{' '}
          <Link to="/register" className="font-extrabold text-brand-600 dark:text-brand-200">
            Create a demo account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const referral = params.get('ref');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { agree: false as never },
  });
  const submit = async (values: z.infer<typeof registerSchema>) => {
    setError('');
    try {
      await createAccount(values.name, values.email, values.password);
      if (referral === 'DL-TEACH-DEMO' && !state.referralCode) actions.setReferralCode(referral);
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/onboarding');
    } catch {
      setError('Could not create a demo session. Try again.');
    }
  };
  return (
    <AuthShell
      title="Start somewhere great."
      description="The best way to learn is to begin. Explore a subject, try an idea and discover what you can make."
    >
      <Badge tone="amber">No real account created</Badge>
      <h2 className="mt-4 font-display text-3xl text-heading">Join the learning preview</h2>
      <p className="mt-2 text-xs leading-6 text-body">
        This form creates a temporary local demo session. Do not enter real passwords or a child’s
        personal details.
      </p>
      {referral && (
        <InfoBox tone="blue" className="mt-4 text-xs">
          Invitation code:{' '}
          <strong>{referral === 'DL-TEACH-DEMO' ? referral : 'Unrecognised sample code'}</strong>.{' '}
          {state.referralCode
            ? `This browser already has a demo code (${state.referralCode}); it will not be replaced.`
            : 'No real learner attribution occurs. A future server must validate consent, eligibility and duplicate claims.'}
        </InfoBox>
      )}
      <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5" noValidate>
        <Field id="register-name" label="Your name" error={errors.name?.message}>
          <Input
            id="register-name"
            placeholder="Your name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
        </Field>
        <Field id="register-email" label="Email address" error={errors.email?.message}>
          <Input
            id="register-email"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field
          id="register-password"
          label="Password"
          error={errors.password?.message}
          hint="Use 8 characters or more. This is only a demo; do not reuse a real password."
        >
          <div className="relative">
            <Input
              id="register-password"
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pr-12"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-subdued hover:bg-raised"
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <div>
          <label className="flex items-start gap-3 text-xs leading-6 text-body">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-brand-600"
              {...register('agree')}
            />
            I understand this is a local demonstration and have read the{' '}
            <Link to="/terms" className="font-bold text-brand-600 dark:text-brand-200">
              preview terms
            </Link>
            .
          </label>
          {errors.agree && (
            <p role="alert" className="field-error">
              {errors.agree.message}
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Continue to onboarding <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-body">
        Already exploring?{' '}
        <Link to="/sign-in" className="font-extrabold text-brand-600 dark:text-brand-200">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
export function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setDone(true);
  };
  return (
    <AuthShell
      title="A fresh start is okay."
      description="Password recovery is part of the planned account experience. In this preview, no email is delivered."
    >
      {done ? (
        <div className="py-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-700">
            <Mail className="h-6 w-6" />
          </span>
          <h2 className="mt-5 font-display text-3xl text-heading">Preview confirmed</h2>
          <p className="mt-3 text-sm leading-7 text-body">
            This is a demonstration state. No reset link was sent. Real recovery requires a
            configured authentication provider.
          </p>
          <Link to="/sign-in" className={buttonStyles('primary', 'md', 'mt-6')}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h2 className="font-display text-3xl text-heading">Reset your password</h2>
          <p className="mt-2 text-xs leading-6 text-body">
            Enter an email to preview the recovery flow. No message will be sent.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
            <Field id="recovery-email" label="Email address" error={error}>
              <Input
                id="recovery-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={!!error}
              />
            </Field>
            <Button type="submit" className="w-full">
              Preview recovery <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <Link
            to="/sign-in"
            className="mt-5 inline-flex text-xs font-bold text-brand-600 dark:text-brand-200"
          >
            Back to sign in
          </Link>
        </>
      )}
    </AuthShell>
  );
}
export function VerifyEmailPage() {
  return (
    <AuthShell
      title="One more check, when it is ready."
      description="Email verification will help protect real accounts once authentication is connected."
    >
      <div className="py-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Mail className="h-6 w-6" />
        </span>
        <h2 className="mt-5 font-display text-3xl text-heading">Verification preview</h2>
        <p className="mt-3 text-sm leading-7 text-body">
          No verification email has been sent. A production provider must issue and verify secure,
          expiring links.
        </p>
        <Link to="/demo" className={buttonStyles('primary', 'md', 'mt-6')}>
          Explore demo roles
        </Link>
      </div>
    </AuthShell>
  );
}

export function DemoGate({ requiredRole }: { requiredRole?: Role[] }) {
  const { enterDemo, session, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const roles = requiredRole?.length ? requiredRole : primaryRoles;
  const next = params.get('next') ?? (requiredRole ? location.pathname + location.search : null);
  return (
    <section className="hero-surface min-h-[80vh] py-14 sm:py-20">
      <Container className="max-w-[1020px]">
        <div className="mx-auto max-w-2xl text-center">
          <img
            src={site.brandAssets.appIcon}
            alt=""
            aria-hidden="true"
            width={88}
            height={88}
            className="mx-auto mb-6 h-[88px] w-[88px] rounded-[22px] shadow-soft"
          />
          <Badge tone="amber">Frontend preview</Badge>
          <h1 className="mt-5 font-display text-4xl text-heading sm:text-5xl">
            Choose a workspace to explore.
          </h1>
          <p className="mt-4 text-sm leading-7 text-body">
            {requiredRole
              ? 'This area has a role-specific preview. Switch your demo role to continue.'
              : 'Try the essential journeys with sample data. This is not authentication or a secure account.'}
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const iconMap: Partial<Record<Role, LucideIcon>> = {
              learner: BookOpen,
              parent: HeartHandshake,
              teacher_partner: UsersRound,
              school_admin: School2,
              classroom_teacher: School2,
              facilitator: Sparkles,
              platform_admin: ShieldCheck,
            };
            const Icon = iconMap[role] ?? LockKeyhole;
            return (
              <button
                type="button"
                key={role}
                onClick={() => {
                  if (session) switchRole(role);
                  else enterDemo(role);
                  navigate(
                    next &&
                      !next.startsWith('//') &&
                      (next.startsWith(roleDetails[role].home) || next.startsWith('/workspace/'))
                      ? next
                      : roleDetails[role].home,
                  );
                }}
                className="group flex flex-col items-start rounded-3xl border border-line bg-panel p-6 text-left transition hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-5 text-sm font-extrabold text-heading">
                  {roleDetails[role].label}
                </span>
                <span className="mt-1 flex-1 text-xs leading-6 text-body">
                  {roleDetails[role].description}
                </span>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
                  Open preview{' '}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>
        <InfoBox tone="amber" className="mt-7">
          Role switching only changes this browser’s demo interface. It does not grant real
          permissions or protect data. Never use sample access controls for production.
        </InfoBox>
        <Card className="mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="text-sm font-extrabold text-heading">Invited adult/internal tester?</h2>
            <p className="mt-1 text-xs leading-6 text-body">
              Use the separate PostgreSQL-backed pilot for server-authoritative learning and
              assigned human review. It is off until an operator deploys and enables it.
            </p>
          </div>
          <Link to="/pilot" className={buttonStyles('outline', 'sm')}>
            Private pilot portal <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </Container>
    </section>
  );
}

export function OnboardingPage() {
  const { session, switchRole } = useAuth();
  const { state, actions } = useDemo();
  const navigate = useNavigate();
  const toast = useToast();
  const [goal, setGoal] = useState(state.goal);
  const [audience, setAudience] = useState<'learner' | 'guardian'>('learner');
  const [band, setBand] = useState<AgeBand>(state.curriculum.band);
  if (!session) return <DemoGate />;
  return (
    <section className="hero-surface min-h-[80vh] py-14 sm:py-20">
      <Container className="max-w-[1040px]">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>A good start</Eyebrow>
          <h1 className="mt-3 font-display text-4xl text-heading sm:text-5xl">
            What would you like to do next?
          </h1>
          <p className="mt-4 text-sm leading-7 text-body">
            Choose a learning presentation and goal that suit you. The required 44-course order
            stays the same; this preview does not verify ages or guardian consent.
          </p>
          <ProgressBar value={50} label="Demo onboarding" className="mx-auto mt-7 max-w-sm" />
          {state.referralCode && (
            <InfoBox tone="blue" className="mt-5 text-left">
              You arrived with sample invitation code <strong>{state.referralCode}</strong>. This is
              local display only; no real attribution or teacher access has been granted.
            </InfoBox>
          )}
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_.75fr]">
          <Card className="p-6 sm:p-8">
            <h2 className="text-sm font-extrabold text-heading">I am exploring as...</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { id: 'learner', label: 'A learner', icon: BookOpen },
                { id: 'guardian', label: 'A parent / guardian', icon: HeartHandshake },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setAudience(id as typeof audience)}
                  aria-pressed={audience === id}
                  className={`flex min-h-[96px] flex-col justify-between rounded-2xl border p-4 text-left text-xs font-extrabold ${audience === id ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100' : 'border-line bg-panel text-heading'}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
            {audience === 'learner' && (
              <div className="mt-7">
                <AgeBandSelector value={band} onChange={setBand} id="onboarding-band" />
              </div>
            )}
            <div className="mt-7">
              <Field
                id="goal"
                label="One goal for this week"
                hint="Keep it small and useful. This is stored locally for the demo."
              >
                <Input
                  id="goal"
                  value={goal}
                  maxLength={120}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="e.g. Try two lessons this week"
                />
              </Field>
            </div>
            <Button
              className="mt-6"
              onClick={() => {
                actions.setGoal(goal.trim() || state.goal);
                if (audience === 'learner')
                  actions.updateCurriculum((previous) => ({ ...previous, band }));
                if (audience === 'guardian') {
                  switchRole('parent');
                  navigate('/parent');
                } else {
                  switchRole('learner');
                  navigate('/app');
                }
                toast('Your demo starting point is ready.');
              }}
            >
              Open my workspace <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
          <div className="space-y-4">
            <Card className="p-6">
              <ShieldCheck className="h-6 w-6 text-mint-700" />
              <h3 className="mt-4 text-sm font-extrabold text-heading">For younger learners</h3>
              <p className="mt-2 text-xs leading-6 text-body">
                Do not enter real child details in this preview. Guardian consent, age checks, safe
                spaces and linking must be implemented and reviewed before production.
              </p>
            </Card>
            <Card className="p-6">
              <School2 className="h-6 w-6 text-brand-600" />
              <h3 className="mt-4 text-sm font-extrabold text-heading">
                Here for a school or teaching role?
              </h3>
              <p className="mt-2 text-xs leading-6 text-body">
                Teacher, school and facilitator applications have their own review paths.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-brand-600 dark:text-brand-200">
                <Link to="/apply/teacher">Teacher application →</Link>
                <Link to="/apply/school">School application →</Link>
                <Link to="/apply/facilitator">Facilitator application →</Link>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
