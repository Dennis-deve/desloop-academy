import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  CircleHelp,
  Clock3,
  Headphones,
  LockKeyhole,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  InfoBox,
  PageHeader,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { useAuth, useDemo, useTheme, useToast } from '@/app/providers';
import { offlineService } from '@/services/offline';

export function NotificationsPage() {
  const { state, actions } = useDemo();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const items =
    filter === 'unread' ? state.notifications.filter((item) => !item.read) : state.notifications;
  const unread = state.notifications.filter((item) => !item.read).length;
  return (
    <>
      <PageHeader
        eyebrow="Your updates"
        title="Stay in the loop."
        description="Useful reminders and learning updates, with control over what you read and receive."
        action={
          unread > 0 && (
            <Button variant="outline" onClick={actions.markAllNotifications}>
              <Check className="h-4 w-4" /> Mark all read
            </Button>
          )
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilter('all')}
          className={
            filter === 'all' ? buttonStyles('primary', 'sm') : buttonStyles('outline', 'sm')
          }
        >
          All updates
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={
            filter === 'unread' ? buttonStyles('primary', 'sm') : buttonStyles('outline', 'sm')
          }
        >
          Unread ({unread})
        </button>
        <Link
          to="/workspace/settings"
          className="ml-auto text-xs font-bold text-brand-600 dark:text-brand-200"
        >
          Preferences →
        </Link>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              to={item.href}
              onClick={() => actions.markNotification(item.id)}
              key={item.id}
              className={`flex items-start gap-4 rounded-2xl border p-5 transition hover:shadow-soft ${item.read ? 'border-line bg-panel' : 'border-brand-200 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/10'}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.read ? 'bg-raised text-body' : 'bg-brand-100 text-brand-600 dark:bg-brand-500/20'}`}
              >
                <Bell className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-heading">{item.title}</span>
                  {!item.read && <Badge tone="blue">New</Badge>}
                </span>
                <span className="mt-1 block text-xs leading-6 text-body">{item.body}</span>
                <span className="mt-2 block text-[11px] text-subdued">
                  {item.time} · Sample notification
                </span>
              </span>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-brand-600" />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'All caught up' : 'No notifications yet'}
          description={
            filter === 'unread'
              ? 'You have read all local demo updates. Focus on what matters next.'
              : 'Helpful updates will appear here when connected to a real notification service.'
          }
          action={
            filter === 'unread' ? (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View all updates
              </Button>
            ) : undefined
          }
        />
      )}
      <InfoBox tone="amber" className="mt-6">
        Notifications here are local sample data. No email, SMS or WhatsApp is sent from the
        preview.
      </InfoBox>
    </>
  );
}
export function SettingsPage() {
  const { session, updateName, signOut } = useAuth();
  const { state, actions } = useDemo();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(session?.name ?? '');
  const [resetOpen, setResetOpen] = useState(false);
  const [signoutOpen, setSignoutOpen] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="Account & preferences"
        title="Make this space yours."
        description="Manage local demo preferences. Real account changes and data requests need a secure backend."
      />
      <InfoBox tone="amber" className="mb-6">
        This session is not securely authenticated. Avoid sensitive details. Settings save in this
        browser only and are not synced across devices.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <Card className="p-6 sm:p-8">
            <h2 className="text-sm font-extrabold text-heading">Demo profile</h2>
            <p className="mt-2 text-xs text-body">
              Display name is local to this browser tab’s demo session.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="settings-name"
                  className="mb-2 block text-xs font-extrabold text-heading"
                >
                  Display name
                </label>
                <input
                  id="settings-name"
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="settings-email"
                  className="mb-2 block text-xs font-extrabold text-heading"
                >
                  Demo email
                </label>
                <input
                  id="settings-email"
                  className="field"
                  value={session?.email ?? ''}
                  readOnly
                  aria-readonly="true"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-5"
              onClick={() => {
                if (name.trim().length < 2) {
                  toast('Enter a display name with at least 2 characters.', 'error');
                  return;
                }
                updateName(name.trim());
                toast('Display name saved to this demo session.');
              }}
            >
              Save demo profile
            </Button>
          </Card>
          <Card className="p-6 sm:p-8">
            <h2 className="text-sm font-extrabold text-heading">Notification preferences</h2>
            <p className="mt-2 text-xs text-body">
              Choices are local previews. No external notification channel is connected.
            </p>
            <div className="mt-5 space-y-3">
              {[
                {
                  key: 'email' as const,
                  title: 'Email updates',
                  text: 'Learning updates by email when delivery is configured.',
                },
                {
                  key: 'reminders' as const,
                  title: 'Learning reminders',
                  text: 'Optional nudges you choose, never pressure.',
                },
                {
                  key: 'community' as const,
                  title: 'Community updates',
                  text: 'Responses and moderated group activity where permitted.',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line p-4"
                >
                  <span>
                    <span className="block text-xs font-extrabold text-heading">{item.title}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-body">{item.text}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={state.preferences[item.key]}
                    onChange={(event) =>
                      actions.updatePreferences({ [item.key]: event.target.checked })
                    }
                    className="h-5 w-5 shrink-0 accent-brand-600"
                    aria-label={item.title}
                  />
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <h2 className="text-sm font-extrabold text-heading">Appearance</h2>
            <p className="mt-2 text-xs text-body">
              Choose a comfortable theme. Reduced-motion preferences are respected automatically.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                size="sm"
                variant={theme === 'light' ? 'primary' : 'outline'}
                onClick={() => {
                  setTheme('light');
                  actions.updatePreferences({ theme: 'light' });
                }}
              >
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button
                size="sm"
                variant={theme === 'dark' ? 'primary' : 'outline'}
                onClick={() => {
                  setTheme('dark');
                  actions.updatePreferences({ theme: 'dark' });
                }}
              >
                <Moon className="h-4 w-4" /> Dark
              </Button>
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-6">
            <ShieldCheck className="h-6 w-6 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Privacy & safety</h2>
            <p className="mt-2 text-xs leading-7 text-body">
              A production account should offer accessible data access, deletion, consent and
              guardian controls. This demo keeps only sample learning state locally.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/privacy" className="text-xs font-bold text-brand-600 dark:text-brand-200">
                Privacy information →
              </Link>
              <Link
                to="/child-safety"
                className="text-xs font-bold text-brand-600 dark:text-brand-200"
              >
                Child safety →
              </Link>
            </div>
          </Card>
          <Card className="p-6">
            <LockKeyhole className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Session & demo data</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Signing out clears the tab’s demo session. Resetting demo data removes local sample
              progress, preferences and saved offline lessons from this browser. It does not sign
              you out.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSignoutOpen(true)}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  signOut();
                  navigate('/sign-in?expired=1');
                }}
              >
                <Clock3 className="h-4 w-4" /> Preview expiry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => setResetOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Reset local data
              </Button>
            </div>
          </Card>
          <Card className="p-6">
            <CircleHelp className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Need a hand?</h2>
            <p className="mt-2 text-xs text-body">
              Explore support information or record a local ticket preview.
            </p>
            <Link to="/workspace/support" className={buttonStyles('outline', 'sm', 'mt-4')}>
              Open support
            </Link>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={signoutOpen}
        onOpenChange={setSignoutOpen}
        title="Sign out of the demo?"
        description="This clears only your temporary browser-tab demo session. Local sample progress remains until you reset it."
        confirmLabel="Sign out"
        onConfirm={() => {
          signOut();
          navigate('/');
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset local demo data?"
        description="This replaces browser-stored sample progress, applications, projects, reports and preferences with the starting demo state and removes saved offline lessons in IndexedDB. Your demo session stays open."
        confirmLabel="Reset demo data"
        destructive
        onConfirm={() => {
          actions.reset();
          setTheme('light');
          void offlineService
            .clear()
            .then(() => toast('Local demo data and offline lessons cleared.'))
            .catch(() =>
              toast(
                'Demo data reset, but offline lessons could not be cleared. Remove them from Saved offline.',
                'error',
              ),
            );
        }}
      />
    </>
  );
}
export function WorkspaceSupportPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [topic, setTopic] = useState('Learning question');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (message.trim().length < 15) {
      setError('Please add at least 15 characters so the issue is clear.');
      return;
    }
    actions.addSupportTicket({
      id: `ticket-${Date.now()}`,
      topic,
      message: message.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    setMessage('');
    setError('');
    toast('Ticket preview saved locally. No support team was contacted.');
  };
  return (
    <>
      <PageHeader
        eyebrow="Help & support"
        title="Find a way forward."
        description="Browse guidance and preview a support request. Message delivery and real ticket handling are not configured."
      />
      <InfoBox tone="amber" className="mb-6">
        Do not enter sensitive data or urgent safety concerns here. Local demo tickets are not sent
        to support. Use established safeguarding channels for real incidents.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Card className="p-6 sm:p-8">
          <Headphones className="h-6 w-6 text-brand-600" />
          <h2 className="mt-4 font-display text-2xl text-heading">
            Record a local support preview
          </h2>
          <p className="mt-2 text-xs leading-6 text-body">
            See how a request and status could appear in a future connected support centre.
          </p>
          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="support-topic"
                className="mb-2 block text-xs font-extrabold text-heading"
              >
                Topic
              </label>
              <select
                id="support-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="field"
              >
                <option>Learning question</option>
                <option>Account help</option>
                <option>Project feedback</option>
                <option>School support</option>
                <option>Billing question</option>
                <option>Community concern</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="support-message"
                className="mb-2 block text-xs font-extrabold text-heading"
              >
                How can we help? *
              </label>
              <textarea
                id="support-message"
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="field resize-y"
                placeholder="Describe the issue without private information..."
              />
            </div>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button onClick={submit}>
              Record demo ticket <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">Useful resources</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Frequently asked questions', href: '/faq' },
                { label: 'Child-safety information', href: '/child-safety' },
                { label: 'Community guidelines', href: '/community-guidelines' },
                { label: 'Privacy information', href: '/privacy' },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center justify-between rounded-xl bg-raised p-3 text-xs font-bold text-heading hover:text-brand-600"
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">Your local ticket previews</h2>
            {state.supportTickets.length ? (
              <div className="mt-4 space-y-2">
                {state.supportTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl bg-raised p-3">
                    <div className="flex justify-between gap-2">
                      <p className="text-xs font-bold text-heading">{ticket.topic}</p>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-body">{ticket.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-body">No demo tickets yet.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
