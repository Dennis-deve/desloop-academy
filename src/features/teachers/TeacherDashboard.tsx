import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  CircleHelp,
  Copy,
  HeartHandshake,
  Link2,
  Mail,
  Megaphone,
  Plus,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  InfoBox,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { commercial } from '@/config/site';
import { sampleLearners, sampleLedger, sampleReferrals } from '@/mocks/catalog';
import { useDemo, useToast } from '@/app/providers';
import { formatMoney } from '@/lib/utils';

const referralCode = 'DL-TEACH-DEMO';
function DemoReferralCard({ compact = false }: { compact?: boolean }) {
  const toast = useToast();
  const link = `${window.location.origin}/register?ref=${referralCode}`;
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast('Sample referral details copied. No attribution is created by copying.');
    } catch {
      toast('Copy was unavailable. Select the sample text manually.', 'info');
    }
  };
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
          <Link2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
            Your sample invitation
          </p>
          <h2 className="text-sm font-extrabold text-heading">Share a starting point</h2>
        </div>
      </div>
      <p className="mt-4 text-xs leading-6 text-body">
        A learner can preview a referral code at registration. This does not create real attribution
        or earnings.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          aria-label="Sample referral code"
          readOnly
          value={referralCode}
          className="field !min-h-10 flex-1 !py-2 text-xs font-extrabold"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void copy(referralCode)}
          aria-label="Copy sample code"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex gap-2">
            <input
              aria-label="Sample referral link"
              readOnly
              value={link}
              className="field !min-h-10 flex-1 !py-2 text-[11px]"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void copy(link)}
              aria-label="Copy sample referral link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Link
            to={`/register?ref=${referralCode}`}
            className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200"
          >
            Preview learner registration <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}
    </Card>
  );
}
export function TeacherDashboard() {
  const { state } = useDemo();
  return (
    <>
      <PageHeader
        eyebrow="Teacher Growth Centre"
        title="Good teaching makes a difference."
        description="A clear view of sample invitations, learner support and programme terms. All figures below are illustrative."
        action={
          <Link to="/partner/invitations" className={buttonStyles('primary')}>
            Invite learners <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        This is a teacher-partner demo. Sample learner records, attribution and amounts do not
        represent actual people, payments or entitlement to commission.
      </InfoBox>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: UsersRound, title: 'Sample learners', value: '03', note: 'Illustrative records' },
          {
            icon: Link2,
            title: 'Invitations',
            value: `${3 + state.teacherInvitations.length}`.padStart(2, '0'),
            note: 'Including local drafts',
          },
          { icon: ChartNoAxesCombined, title: 'Active groups', value: '02', note: 'Sample groups' },
          { icon: Wallet, title: 'Commission terms', value: '—', note: 'Awaiting owner approval' },
        ].map(({ icon: Icon, title, value, note }) => (
          <Card key={title} className="p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-5 text-[11px] font-bold text-body">{title}</p>
            <p className="mt-1 font-display text-3xl text-heading">{value}</p>
            <p className="mt-1 text-[10px] text-subdued">{note}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-200">
                Learner support
              </p>
              <h2 className="mt-1 font-display text-2xl text-heading">Help them move forward.</h2>
            </div>
            <Link
              to="/partner/learners"
              className="text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              View learners →
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {sampleLearners.map((learner) => (
              <div key={learner.name} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-heading">{learner.name}</p>
                    <p className="mt-1 text-[11px] text-body">
                      {learner.course} · {learner.group}
                    </p>
                  </div>
                  <Badge tone={learner.status === 'Active' ? 'green' : 'amber'}>
                    {learner.status}
                  </Badge>
                </div>
                <ProgressBar value={learner.progress} className="mt-3" />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <DemoReferralCard compact />
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">Educational engagement</h2>
            </div>
            <p className="mt-3 text-xs leading-6 text-body">
              Set group goals, recommend a relevant path or draft a supportive announcement. No
              messages are delivered in this preview.
            </p>
            <Link to="/partner/engagement" className={buttonStyles('outline', 'sm', 'mt-4')}>
              Plan engagement <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-heading">Attribution, clearly labelled</h2>
            <Link
              to="/partner/invitations"
              className="text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Details →
            </Link>
          </div>
          <p className="mt-3 text-xs leading-6 text-body">
            Sample invitations show how a future teacher–learner connection could be displayed.
            Duplicate claims and disputes need server-side rules.
          </p>
          <div className="mt-4 space-y-2">
            {sampleReferrals.slice(0, 2).map((item) => (
              <div
                key={item.learner}
                className="flex items-center justify-between gap-3 rounded-xl bg-raised p-3 text-xs"
              >
                <span className="font-bold text-heading">{item.learner}</span>
                <Badge tone="green">{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-heading">Earnings visibility</h2>
            <Link
              to="/partner/earnings"
              className="text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Open statements →
            </Link>
          </div>
          <p className="mt-3 text-xs leading-6 text-body">
            Illustrative ledger entries show pending, confirmed and adjusted states. No commission
            is calculated by this browser.
          </p>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-raised p-4">
            <span className="text-xs font-bold text-body">Terms status</span>
            <Badge tone="amber">Not configured</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}
export function TeacherInvitationsPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [dispute, setDispute] = useState(false);
  const add = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address for the local invitation preview.');
      return;
    }
    actions.addTeacherInvitation(email.toLowerCase().trim());
    setEmail('');
    setError('');
    toast('Invitation draft saved locally. No email was sent.');
  };
  return (
    <>
      <PageHeader
        eyebrow="Teacher Growth Centre / Invitations"
        title="Bring a learner along."
        description="Use a sample code or link to preview the invitation journey. Real learner consent, attribution and delivery are not connected."
        action={
          <Link to="/partner/learners" className={buttonStyles('outline')}>
            View sample learners <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <DemoReferralCard />
        <Card className="p-6">
          <Mail className="h-6 w-6 text-brand-600" />
          <h2 className="mt-4 text-sm font-extrabold text-heading">Plan an invitation</h2>
          <p className="mt-2 text-xs leading-6 text-body">
            Record a sample invitation draft. This does not send an email or add a real learner.
          </p>
          <label htmlFor="invite-email" className="mt-5 block text-xs font-extrabold text-heading">
            Learner or guardian email
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="invite-email"
              className="field"
              type="email"
              placeholder="example@school.test"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button onClick={add} aria-label="Add demo invitation">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <p className="mt-3 text-[11px] text-subdued">
            Do not enter real children’s contact details. Approved methods and guardian involvement
            are required in production.
          </p>
        </Card>
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[1.5fr_.8fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-6">
            <h2 className="text-sm font-extrabold text-heading">
              Invitation & attribution preview
            </h2>
            <Badge tone="amber">Sample data</Badge>
          </div>
          <div className="space-y-1 p-3 sm:p-4">
            {sampleReferrals.map((row) => (
              <div
                key={row.learner}
                className="flex flex-col justify-between gap-2 rounded-xl p-3 hover:bg-raised sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-xs font-extrabold text-heading">{row.learner}</p>
                  <p className="mt-1 text-[11px] text-subdued">
                    {row.source} · {row.code}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
            ))}
            {state.teacherInvitations.map((address) => (
              <div
                key={address}
                className="flex flex-col justify-between gap-2 rounded-xl p-3 hover:bg-raised sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-xs font-extrabold text-heading">{address}</p>
                  <p className="mt-1 text-[11px] text-subdued">Local invitation draft · not sent</p>
                </div>
                <Badge tone="amber">Draft only</Badge>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <InfoBox tone="blue" title="Attribution should be fair">
            A future backend must validate codes, learner choice, duplicate claims, attribution
            windows and disputes. A partner cannot access school records through a referral alone.
          </InfoBox>
          <Card className="p-5">
            <CircleHelp className="h-5 w-5 text-brand-600" />
            <h2 className="mt-3 text-sm font-extrabold text-heading">Something not right?</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              An attribution dispute process is planned. The preview shows only the request state.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setDispute(true)}>
              Preview dispute request
            </Button>
          </Card>
        </div>
      </div>
      <Modal
        open={dispute}
        onOpenChange={setDispute}
        title="Attribution review preview"
        description="In production, disputed claims need documented evidence and a server-side review. This demo cannot submit a real dispute."
        footer={<Button onClick={() => setDispute(false)}>Understood</Button>}
      >
        <InfoBox tone="amber">No request has been sent or recorded with support.</InfoBox>
      </Modal>
    </>
  );
}
export function TeacherLearnersPage() {
  const [search, setSearch] = useState('');
  const filtered = sampleLearners.filter((learner) =>
    `${learner.name} ${learner.group} ${learner.course}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="Teacher Growth Centre / Learners"
        title="Support their next step."
        description="Illustrative progress helps demonstrate educational support. Access to real learners would require consent and scoped permissions."
        action={
          <Link to="/partner/engagement" className={buttonStyles('outline')}>
            Engagement tools <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        Every name, group and progress value here is sample data. A teacher-partner relationship
        does not grant school tenant access.
      </InfoBox>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <Badge tone="blue">Creative makers · sample</Badge>
          <Badge tone="green">Digital starters · sample</Badge>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Find a sample learner"
          className="w-full sm:w-[260px]"
        />
      </div>
      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((learner) => (
            <Card key={learner.name} className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-600">
                    {learner.name.slice(0, 1)}
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold text-heading">{learner.name}</h2>
                    <p className="text-[11px] text-subdued">{learner.group}</p>
                  </div>
                </div>
                <Badge tone={learner.status === 'Active' ? 'green' : 'amber'}>
                  {learner.status}
                </Badge>
              </div>
              <p className="mt-5 text-xs font-bold text-heading">{learner.course}</p>
              <ProgressBar
                value={learner.progress}
                label="Sample course progress"
                className="mt-3"
              />
              <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
                <Link
                  to="/courses"
                  className="text-xs font-bold text-brand-600 dark:text-brand-200"
                >
                  Recommend a course →
                </Link>
                <Link
                  to="/partner/engagement"
                  className="text-xs font-bold text-brand-600 dark:text-brand-200"
                >
                  Plan encouragement →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No sample learners found"
          description="Try a different name, group or course."
          action={<Button onClick={() => setSearch('')}>Clear search</Button>}
        />
      )}
    </>
  );
}
export function TeacherEarningsPage() {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  return (
    <>
      <PageHeader
        eyebrow="Teacher Growth Centre / Earnings"
        title="Clarity before commissions."
        description="See how a transparent ledger could be presented. All entries and amounts are illustrative, not calculated earnings."
        action={
          <Link to="/teachers" className={buttonStyles('outline')}>
            Programme overview <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6" title="No commercial terms approved">
        The commission rate is{' '}
        {commercial.commissionRate === null ? 'not configured' : 'configured for this demo'}. No
        payout is due, authorised or initiated here. Real amounts must be computed server-side from
        verified payments and auditable rules.
      </InfoBox>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Pending · illustrative', amount: 48, note: 'Example ledger entry only' },
          { label: 'Confirmed · illustrative', amount: 35, note: 'Example ledger entry only' },
          { label: 'Adjustment · illustrative', amount: -8, note: 'Example reversal only' },
        ].map((item) => (
          <Card key={item.label} className="p-6">
            <p className="text-[11px] font-bold text-body">{item.label}</p>
            <p className="mt-3 font-display text-3xl text-heading">{formatMoney(item.amount)}</p>
            <p className="mt-1 text-[11px] text-subdued">{item.note}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
          <div>
            <h2 className="text-sm font-extrabold text-heading">
              Illustrative commission statement
            </h2>
            <p className="mt-1 text-xs text-body">
              Sample rows, not a financial record or payout promise.
            </p>
          </div>
          <div
            className="flex rounded-xl bg-raised p-1"
            role="group"
            aria-label="Billing period preview"
          >
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              aria-pressed={period === 'monthly'}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${period === 'monthly' ? 'bg-panel text-heading shadow-soft' : 'text-body'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('annual')}
              aria-pressed={period === 'annual'}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${period === 'annual' ? 'bg-panel text-heading shadow-soft' : 'text-body'}`}
            >
              Annual
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-5">
          <p className="mb-3 px-3 text-xs text-body">
            Viewing {period} examples. Final subscription types, renewal eligibility and commission
            rules are pending.
          </p>
          {sampleLedger.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 rounded-xl px-3 py-4 hover:bg-raised sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-extrabold text-heading">{entry.description}</p>
                <p className="mt-1 text-[11px] text-subdued">
                  {entry.id} · {entry.period}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={entry.status} />
                <span className="min-w-20 text-right text-xs font-extrabold text-heading">
                  {formatMoney(entry.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-extrabold text-heading">Payout history</h2>
          <div className="mt-5">
            <EmptyState
              icon={Wallet}
              title="No real payouts"
              description="A future payout history will show status, dates and statements after financial integration and approval."
              className="!border-0 !p-3"
            />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-extrabold text-heading">Rules to define before launch</h2>
          <ul className="mt-4 space-y-2 text-xs leading-6 text-body">
            {[
              'Eligible subscription revenue and billing periods',
              'Attribution windows and renewal eligibility',
              'Refunds, chargebacks and adjustment entries',
              'Payout thresholds, schedules and tax treatment',
              'Disputes, fraud checks and auditable approvals',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-mint-500" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
export function TeacherEngagementPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [draft, setDraft] = useState('');
  return (
    <>
      <PageHeader
        eyebrow="Teacher Growth Centre / Engagement"
        title="Support, not spam."
        description="Set useful group goals and plan encouragement. Delivery and learner contact permissions are not configured in this preview."
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">
                Draft an educational announcement
              </h2>
            </div>
            <p className="mt-3 text-xs leading-6 text-body">
              Write a message that helps learners reflect or take a practical next step. It is saved
              locally and never sent.
            </p>
            <label
              htmlFor="announcement"
              className="mt-5 block text-xs font-extrabold text-heading"
            >
              Announcement draft
            </label>
            <textarea
              id="announcement"
              rows={4}
              maxLength={500}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="This week, try one small step on your project..."
              className="field mt-2 resize-y"
            />
            <Button
              className="mt-4"
              disabled={draft.trim().length < 10}
              onClick={() => {
                actions.addTeacherAnnouncement(draft.trim());
                setDraft('');
                toast('Announcement draft saved locally. Nothing was delivered.');
              }}
            >
              Save local draft
            </Button>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">Saved drafts</h2>
            {state.teacherAnnouncements.length ? (
              <div className="mt-4 space-y-2">
                {state.teacherAnnouncements.map((item, index) => (
                  <div
                    key={`${index}-${item}`}
                    className="rounded-xl bg-raised p-4 text-xs leading-6 text-body"
                  >
                    {item}
                    <p className="mt-2 text-[10px] font-bold text-subdued">
                      Not delivered · local demo
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-body">
                No drafts yet. Start with one useful suggestion.
              </p>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-6">
            <HeartHandshake className="h-6 w-6 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">A group goal worth trying</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              “Each learner explains one thing they changed after feedback.” Practical, voluntary
              and focused on growth.
            </p>
            <Link
              to="/partner/learners"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              View sample groups <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <InfoBox tone="amber">
            Real reminders, announcements and feedback require consent, rate limits, approved
            channels and school/guardian permissions. This demo has no delivery service.
          </InfoBox>
          <Card className="p-6">
            <BookOpen className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">A useful recommendation</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Support the learner’s current required course with a helpful example or practice hint.
              Recommendations must not skip prerequisites or be driven by referral volume.
            </p>
            <Link to="/courses" className={buttonStyles('outline', 'sm', 'mt-4')}>
              View the required pathway <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
