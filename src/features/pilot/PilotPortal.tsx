import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Database, LockKeyhole, ShieldCheck } from 'lucide-react';
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
  buttonStyles,
} from '@/components/ui';
import {
  pilotApi,
  PilotApiError,
  type PilotPathway,
  type PilotWeeklyActivity,
  type PilotStatus,
  type PilotUser,
} from './api';
import { projectCoreApi } from './project-core/api';
import { createProjectDraftVault, type ProjectDraftVault } from './project-core/draft-vault';
import { LearningLoopDashboard } from './learning-loop/LearningLoopDashboard';

interface PilotContext {
  user: PilotUser;
  engineV2Enabled: boolean;
  refresh: () => void;
  /** Ephemeral UI recovery only; server GET and authorization are required before restoration. */
  projectDrafts: ProjectDraftVault;
}
export function usePilotContext() {
  return useOutletContext<PilotContext>();
}
const pilotNotice =
  'Private adult/internal pilot · unreviewed curriculum draft · server-saved when enabled, not official course credit.';

export function PilotLayout() {
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const [user, setUser] = useState<PilotUser | null>(null);
  const [aiAdmin, setAiAdmin] = useState(false);
  const [projectCoreAvailable, setProjectCoreAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [projectDrafts] = useState(createProjectDraftVault);
  const focusAfterSignOut = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setAiAdmin(false);
    setProjectCoreAvailable(false);
    pilotApi
      .status()
      .then(async (result) => {
        if (!active) return;
        setStatus(result);
        if (result.enabled) {
          try {
            const session = await pilotApi.me();
            if (active) {
              projectDrafts.setOwner(session.user.id); // Clear a prior account before its UI can reappear.
              setUser(session.user);
            }
            if (session.user.role === 'learner') {
              try {
                // Never advertise a default-off private route. A successful authenticated
                // server list is discovery, not browser-side permission authority.
                await projectCoreApi.projects();
                if (active) setProjectCoreAvailable(true);
              } catch {
                // A missing/denied/unreachable local project API is not a usable feature.
              }
            } else {
              try {
                const access = await pilotApi.aiAdminAccess();
                if (active) setAiAdmin(access.allowed);
              } catch {
                // A missing/denied admin route is an expected closed feature, not an AI success.
              }
            }
          } catch (reason) {
            if (active && reason instanceof PilotApiError && reason.status === 401) {
              projectDrafts.setOwner(null);
              setUser(null);
            } else if (active) {
              setError(reason instanceof Error ? reason.message : 'Could not check your session.');
            }
          }
        } else if (active) {
          projectDrafts.setOwner(null);
          setUser(null);
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Pilot API unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, projectDrafts]);
  useEffect(() => {
    // Sign-out replaces the focused button without changing the route. Give the
    // keyboard user a predictable focus target in the real access form.
    if (!user && !loading && focusAfterSignOut.current) {
      document.getElementById('pilot-email')?.focus();
      focusAfterSignOut.current = false;
    }
  }, [user, loading]);
  const signOut = async () => {
    if (user && projectDrafts.hasUnsaved(user.id) &&
        !window.confirm('Sign out and discard unsaved project text held only in this tab? A save still being checked may or may not have reached the server.')) return;
    setError('');
    try {
      await pilotApi.logout();
      projectDrafts.setOwner(null);
      focusAfterSignOut.current = true;
      setUser(null);
      setAiAdmin(false);
      setProjectCoreAvailable(false);
    } catch (reason) {
      if (reason instanceof PilotApiError && reason.status === 401) {
        projectDrafts.setOwner(null);
        focusAfterSignOut.current = true;
        setUser(null);
      } else
        setError(
          reason instanceof Error
            ? reason.message
            : 'Could not end the server session. Please try again.',
        );
    }
  };
  return (
    <section className="hero-surface motion-public-page min-h-[70vh] pb-20 pt-12 sm:pt-16">
      <Container>
        <div className="mb-7 flex flex-col items-start justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>PostgreSQL-backed · synthetic adult/internal pilot</Eyebrow>
            <h1 className="mt-2 font-display text-4xl text-heading sm:text-5xl">
              Adult learning pilot
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-body">{pilotNotice}</p>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-body">
              <span className="rounded-full bg-raised px-3 py-2">
                {user.displayName} · {user.role}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out of pilot
              </Button>
            </div>
          )}
        </div>
        {error && (
          <InfoBox tone="amber" className="mb-5" role="alert">
            {error}
          </InfoBox>
        )}
        {loading ? (
          <Card className="p-8" role="status">
            Checking the private pilot connection…
          </Card>
        ) : !status || !status.enabled ? (
          <Card className="mx-auto max-w-2xl p-8 sm:p-10">
            <EmptyState
              icon={Database}
              title="The private adult pilot is unavailable"
              description="No registration or progress can be saved here until an operator enables the private API and grants approved browser access. Nothing has been submitted."
              action={<Link to="/availability" className={buttonStyles('outline')}>Read the access status</Link>}
            />
          </Card>
        ) : !user ? (
          <PilotAccess
            onAuthenticated={(next) => {
              projectDrafts.setOwner(next.id);
              setUser(next);
              setError('');
              setRevision((current) => current + 1); // Refresh server-authorised navigation after sign-in.
            }}
          />
        ) : (
          <>
            <nav aria-label="Pilot navigation" className="mb-6 flex flex-wrap gap-2">
              <Link to="/pilot" className={buttonStyles('outline', 'sm')}>
                Pilot overview
              </Link>
              {user.role === 'reviewer' && (
                <Link to="/pilot/reviews" className={buttonStyles('outline', 'sm')}>
                  Assigned reviews
                </Link>
              )}
              {aiAdmin && (
                <Link to="/pilot/ai/admin" className={buttonStyles('outline', 'sm')}>
                  AI provider operations
                </Link>
              )}
              {status.engineV2Enabled && (
                <Link
                  to={user.role === 'reviewer' ? '/pilot/engine/reviews' : '/pilot/engine'}
                  className={buttonStyles('outline', 'sm')}
                >
                  Draft-2 learning engine
                </Link>
              )}
              {user.role === 'learner' && projectCoreAvailable && (
                <Link to="/pilot/projects" className={buttonStyles('outline', 'sm')}>
                  Private project documents
                </Link>
              )}
            </nav>
            <Outlet
              context={
                {
                  user,
                  engineV2Enabled: status.engineV2Enabled,
                  refresh: () => setRevision((current) => current + 1),
                  projectDrafts,
                } satisfies PilotContext
              }
            />
          </>
        )}
      </Container>
    </section>
  );
}

function PilotAccess({ onAuthenticated }: { onAuthenticated: (user: PilotUser) => void }) {
  const [view, setView] = useState<'sign-in' | 'invitation'>('sign-in');
  const [email, setEmail] = useState('');
  const [invitation, setInvitation] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [adultAttested, setAdultAttested] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result =
        view === 'sign-in'
          ? await pilotApi.login(email.trim().toLowerCase(), password)
          : await pilotApi.register(invitation.trim(), name.trim(), password, adultAttested);
      setPassword('');
      setInvitation('');
      onAuthenticated(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign in to the pilot.');
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[.9fr_1fr] lg:items-start">
      <Card className="p-7 sm:p-9">
        <Badge tone="amber">Invitation-only adults</Badge>
        <h2 className="mt-4 font-display text-3xl text-heading">
          Invitation-only account with server-owned progress.
        </h2>
        <p className="mt-4 text-sm leading-7 text-body">
          Only adults invited by the pilot operator can register. The server stores your account and
          learning attempts in PostgreSQL, while official course credit remains unavailable until
          content and safeguards are approved.
        </p>
        <ul className="mt-6 space-y-4 text-sm text-body">
          <li className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            Server-issued roles, hashed passwords and revocable HttpOnly sessions.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            The server alone decides quiz scores, reviews and course unlocks.
          </li>
        </ul>
        <InfoBox tone="amber" className="mt-6">
          Adult status is self-declared and invitations are distributed out of band; this is{' '}
          <strong>not verified age, email identity or permission to enrol children</strong>. Do not
          include personal or confidential information in practice or project descriptions.
        </InfoBox>
      </Card>
      <Card className="p-7 shadow-soft sm:p-9">
        <div
          className="flex gap-2 border-b border-line pb-5"
          role="tablist"
          aria-label="Pilot access"
        >
          <button
            role="tab"
            aria-selected={view === 'sign-in'}
            onClick={() => {
              setView('sign-in');
              setError('');
            }}
            className={buttonStyles(view === 'sign-in' ? 'primary' : 'outline', 'sm')}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={view === 'invitation'}
            onClick={() => {
              setView('invitation');
              setError('');
            }}
            className={buttonStyles(view === 'invitation' ? 'primary' : 'outline', 'sm')}
          >
            Use invitation
          </button>
        </div>
        <h2 className="mt-6 text-lg font-extrabold text-heading">
          {view === 'sign-in' ? 'Pilot sign-in' : 'Register with a one-time invitation'}
        </h2>
        <form onSubmit={submit} className="mt-6 space-y-5">
          {view === 'invitation' ? (
            <>
              <Field label="One-time invitation code" id="pilot-invite">
                <Input
                  required
                  id="pilot-invite"
                  type="text"
                  autoComplete="off"
                  value={invitation}
                  onChange={(event) => setInvitation(event.target.value)}
                  minLength={32}
                />
              </Field>
              <Field label="Display name" id="pilot-name">
                <Input
                  required
                  id="pilot-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={120}
                />
              </Field>
            </>
          ) : (
            <Field label="Invited email" id="pilot-email">
              <Input
                required
                id="pilot-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}
          <Field
            label="Password"
            id="pilot-password"
            hint={
              view === 'invitation'
                ? 'Use a unique passphrase of at least 12 characters that you do not use elsewhere.'
                : undefined
            }
          >
            <Input
              required
              id="pilot-password"
              type="password"
              autoComplete={view === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={view === 'sign-in' ? 1 : 12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {view === 'invitation' && (
            <label className="flex items-start gap-3 text-sm leading-6 text-body">
              <input
                type="checkbox"
                required
                className="mt-1 h-4 w-4 accent-brand-600"
                checked={adultAttested}
                onChange={(event) => setAdultAttested(event.target.checked)}
              />
              <span>
                I confirm I am an adult internal tester. I understand this is a draft rehearsal, not
                official course completion or an age-verification process.
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={pending}>
            {view === 'sign-in' ? 'Sign in to pilot' : 'Use invitation'}{' '}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function PilotHome() {
  const { user, engineV2Enabled } = usePilotContext();
  const navigate = useNavigate();
  const [data, setData] = useState<PilotPathway | null>(null);
  const [activity, setActivity] = useState<PilotWeeklyActivity | null>(null);
  const [activityUnavailable, setActivityUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user.role !== 'learner') return;
    let active = true;
    setLoading(true);
    Promise.allSettled([pilotApi.pathway(), pilotApi.weeklyActivity()]).then(([pathway, weekly]) => {
      if (!active) return;
      if (pathway.status === 'fulfilled') setData(pathway.value);
      else setError(pathway.reason instanceof Error ? pathway.reason.message : 'Could not load your pathway.');
      if (weekly.status === 'fulfilled') setActivity(weekly.value);
      else setActivityUnavailable(true); // Do not fabricate bars when the server is unavailable.
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user.id, user.role]);
  if (user.role === 'reviewer')
    return (
      <Card className="p-8">
        <h2 className="font-display text-3xl text-heading">Your assigned review space</h2>
        <p className="mt-3 text-sm text-body">
          You can see only projects assigned to your server-authorised reviewer account. This role
          cannot be chosen in the browser.
        </p>
        <Link to="/pilot/reviews" className={buttonStyles('primary', 'md', 'mt-6')}>
          Open assigned reviews <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    );
  if (loading)
    return <Card className="p-8" role="status">Loading your server-owned pathway and recorded activity…</Card>;
  if (error || !data)
    return <InfoBox tone="amber" role="alert">{error || 'Could not load the pilot pathway. No progress has been inferred.'}</InfoBox>;
  return (
    <LearningLoopDashboard
      mode="private"
      displayName={user.displayName}
      pathway={data}
      activity={activity}
      activityUnavailable={activityUnavailable}
      onOpenCourse={(id) => navigate(`/pilot/courses/${id}`)}
      onOpenStudio={engineV2Enabled ? () => navigate('/pilot/engine/studio') : undefined}
    />
  );
}
