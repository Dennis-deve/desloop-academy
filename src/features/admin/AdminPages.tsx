import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  CreditCard,
  Headphones,
  LockKeyhole,
  School2,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wallet,
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
} from '@/components/ui';
import { commercial } from '@/config/site';
import { masterCourses, masterStages, masterVersion } from '@/curriculum/model';
import { sampleLedger } from '@/mocks/catalog';
import { useDemo, useToast } from '@/app/providers';
import type { ApplicationRecord, ApplicationStatus, ContentStatus } from '@/types';
import { formatMoney } from '@/lib/utils';

export function AdminDashboard() {
  const { state } = useDemo();
  const pending = state.applications.filter((item) => item.status === 'pending').length;
  const reports = state.reportedPostIds.length;
  return (
    <>
      <PageHeader
        eyebrow="Platform operations · demonstration"
        title="A considered view of the platform."
        description="Review sample applications, content, safety reports and operational readiness in one place."
        action={<Badge tone="amber">Privileged actions are local only</Badge>}
      />
      <InfoBox tone="amber" className="mb-6">
        This is not a secure admin console. Role switching is a browser demonstration; the
        production backend must authorise and audit every privileged action.
      </InfoBox>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: ClipboardCheck,
            label: 'Applications for review',
            value: pending,
            href: '/admin/applications',
          },
          {
            icon: BookOpen,
            label: 'Course drafts',
            value: state.savedCourseDraft ? 1 : 0,
            href: '/admin/content',
          },
          {
            icon: ShieldCheck,
            label: 'Community reports',
            value: reports,
            href: '/admin/moderation',
          },
          {
            icon: Headphones,
            label: 'Open support previews',
            value: state.supportTickets.filter((item) => item.status === 'open').length,
            href: '/admin/operations',
          },
        ].map(({ icon: Icon, label, value, href }) => (
          <Link
            to={href}
            key={label}
            className="group rounded-2xl border border-line bg-panel p-5 hover:shadow-soft"
          >
            <Icon className="h-5 w-5 text-brand-600" />
            <p className="mt-5 text-[11px] font-bold text-body">{label}</p>
            <div className="mt-1 flex items-end justify-between">
              <span className="font-display text-3xl text-heading">{value}</span>
              <ArrowRight className="h-4 w-4 text-brand-600 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-[10px] text-subdued">Local demo state</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.8fr]">
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-2xl text-heading">What needs attention?</h2>
          <div className="mt-5 space-y-2">
            {[
              {
                icon: UsersRound,
                label: 'Review teacher, school and facilitator applications',
                href: '/admin/applications',
                meta: `${pending} pending locally`,
              },
              {
                icon: BookOpen,
                label: 'Check course quality and publication state',
                href: '/admin/content',
                meta: state.savedCourseDraft?.status ?? 'No local draft',
              },
              {
                icon: ShieldCheck,
                label: 'Review reported community content',
                href: '/admin/moderation',
                meta: `${reports} report(s) locally`,
              },
              {
                icon: Wallet,
                label: 'Monitor programme and billing readiness',
                href: '/admin/operations',
                meta: 'Integrations required',
              },
            ].map(({ icon: Icon, label, href, meta }) => (
              <Link
                to={href}
                key={label}
                className="flex flex-col gap-2 rounded-xl border border-line p-4 hover:bg-raised sm:flex-row sm:items-center"
              >
                <Icon className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="flex-1 text-xs font-bold text-heading">{label}</span>
                <span className="text-[11px] text-subdued">{meta}</span>
                <ArrowRight className="h-4 w-4 text-brand-600" />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <LockKeyhole className="h-6 w-6 text-mint-700" />
          <h2 className="mt-5 text-sm font-extrabold text-heading">Trust is operational.</h2>
          <p className="mt-3 text-xs leading-7 text-body">
            Policies alone are not enough. Real role grants, school isolation, child-safety
            response, verified payments, audit logs and trained moderation must be in place before
            launch.
          </p>
          <Link
            to="/child-safety"
            className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
          >
            Child-safety approach <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold text-heading">Recent local audit preview</h2>
          <Link
            to="/admin/operations"
            className="text-xs font-bold text-brand-600 dark:text-brand-200"
          >
            Operations →
          </Link>
        </div>
        {state.auditEvents.length ? (
          <div className="mt-4 space-y-2">
            {state.auditEvents.slice(0, 3).map((event) => (
              <div
                className="flex justify-between gap-3 rounded-xl bg-raised p-3 text-xs"
                key={event.id}
              >
                <span className="font-bold text-heading">{event.action}</span>
                <span className="text-subdued">Local demo</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-body">
            No local admin actions yet. Real audit history must be server-owned and
            tamper-resistant.
          </p>
        )}
      </Card>
    </>
  );
}
export function AdminApplicationsPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [target, setTarget] = useState<{
    type: ApplicationRecord['type'];
    status: ApplicationStatus;
  } | null>(null);
  const loadSamples = () => {
    actions.addApplication({
      type: 'teacher',
      status: 'pending',
      applicant: 'Demo Teacher Applicant',
      submittedAt: new Date().toISOString(),
    });
    actions.addApplication({
      type: 'school',
      status: 'pending',
      applicant: 'Demo School Applicant',
      submittedAt: new Date().toISOString(),
    });
    toast('Illustrative applications loaded locally.');
  };
  const confirm = () => {
    if (!target) return;
    actions.updateApplicationStatus(target.type, target.status);
    actions.addAuditEvent(
      `${target.status.replace('_', ' ')} ${target.type} application · local preview`,
    );
    toast('Application status changed locally. No applicant was notified.');
    setTarget(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="Admin / Applications"
        title="Review with care."
        description="Teacher, facilitator and school applications need verification, documented decisions and secure communication."
      />
      <InfoBox tone="amber" className="mb-6">
        Decisions on this page are local status previews. They do not approve access, create
        accounts, send notices or trigger real onboarding.
      </InfoBox>
      {state.applications.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.applications.map((item) => (
            <Card key={item.type} className="p-6">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  {item.type === 'school' ? (
                    <School2 className="h-5 w-5" />
                  ) : (
                    <UsersRound className="h-5 w-5" />
                  )}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-5 text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                {item.type.replace('_', ' ')} application · local preview
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-heading">{item.applicant}</h2>
              <p className="mt-2 text-xs text-body">
                Submitted locally on {new Date(item.submittedAt).toLocaleDateString('en-GH')}.
                Detailed private verification is not stored in this demo.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => setTarget({ type: item.type, status: 'approved' })}
                >
                  Approve demo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTarget({ type: item.type, status: 'more_info' })}
                >
                  Request info · demo
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => setTarget({ type: item.type, status: 'rejected' })}
                >
                  Reject demo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="No local applications yet"
          description="Try one of the public application forms, or load illustrative records to preview review states."
          action={<Button onClick={loadSamples}>Load sample applications</Button>}
        />
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={`Preview ${target?.status.replace('_', ' ') ?? 'application'} decision?`}
        description="This will change a local status and add a local audit preview event. It will not grant permissions, send a message or complete real verification."
        confirmLabel="Confirm local state"
        destructive={target?.status === 'rejected'}
        onConfirm={confirm}
      />
    </>
  );
}
export function AdminContentPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [target, setTarget] = useState<ContentStatus | null>(null);
  const draft = state.savedCourseDraft;
  const load = () => {
    actions.setCourseDraft({
      title: 'Sample creative technology course',
      subject: 'Digital literacy',
      audience: 'Teenagers',
      objectives: 'Learners can plan, build and explain a small practical digital project.',
      duration: '4 weeks',
      language: 'English',
      teachingStyle: 'Guided project-based',
      projectOutcome: 'Build a simple digital story',
      status: 'in_review',
      modules: [
        {
          id: 'sample-module',
          title: 'Getting started',
          lessons: [
            {
              id: 'sample-lesson',
              title: 'Plan a small idea',
              content:
                'Introduce a practical problem, sketch a solution and reflect on the first test.',
            },
          ],
        },
      ],
      quizQuestions: ['What is one thing you would test first, and why?'],
      assignment: 'Build a small project and explain one decision.',
    });
    toast('Illustrative content draft loaded locally.');
  };
  const change = () => {
    if (!draft || !target) return;
    actions.setCourseDraft({ ...draft, status: target });
    actions.addAuditEvent(`${target.replace('_', ' ')} course draft · local preview`);
    toast('Local publication state updated. The public catalogue did not change.');
    setTarget(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="Admin / Courses & content"
        title="Publish with intention."
        description="Review course quality, safeguarding and practical outcomes before an authorised publication decision."
      />
      <InfoBox tone="amber" className="mb-6">
        This frontend cannot publish a course. Status changes are local previews; the public sample
        catalogue and the required curriculum remain unchanged. Production publication requires
        server-side approval, versioned policy and audit.
      </InfoBox>
      <Card className="mb-6 p-6">
        <Badge tone="amber">Not approved for publication</Badge>
        <h2 className="mt-3 font-display text-2xl text-heading">
          Required 44-course curriculum · {masterVersion}
        </h2>
        <p className="mt-2 text-xs leading-6 text-body">
          {masterCourses.length} ordered courses in {masterStages.length} stages and{' '}
          {masterCourses.reduce((sum, item) => sum + item.modules.length, 0)} module lesson drafts
          are available for preview. Every course needs subject-matter, age-safety, accessibility,
          assessment and legal review. The local approve/publish controls below apply only to a
          separate illustrative draft and cannot publish or bypass the required pathway preview.
        </p>
        <Link
          to="/courses"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
        >
          Inspect pathway outline <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
      {draft ? (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="blue">{draft.subject}</Badge>
              <h2 className="mt-3 font-display text-3xl text-heading">
                {draft.title || 'Untitled draft'}
              </h2>
              <p className="mt-2 text-xs text-body">
                {draft.audience} · {draft.modules.length} modules · {draft.language}
              </p>
            </div>
            <StatusBadge status={draft.status} />
          </div>
          <div className="mt-6 grid gap-5 border-t border-line pt-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-extrabold text-heading">Learning objective</h3>
              <p className="mt-2 text-xs leading-6 text-body">{draft.objectives}</p>
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-heading">Practical outcome</h3>
              <p className="mt-2 text-xs leading-6 text-body">{draft.projectOutcome}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            {draft.status !== 'published' && draft.status !== 'archived' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setTarget('changes_requested')}>
                  Request changes · demo
                </Button>
                <Button size="sm" variant="soft" onClick={() => setTarget('approved')}>
                  Approve · demo
                </Button>
              </>
            )}
            {draft.status === 'approved' && (
              <Button size="sm" onClick={() => setTarget('published')}>
                Publish state · demo
              </Button>
            )}
            {draft.status === 'published' && (
              <Button size="sm" variant="outline" onClick={() => setTarget('archived')}>
                Archive state · demo
              </Button>
            )}
            {draft.status === 'archived' && (
              <Button size="sm" variant="outline" onClick={() => setTarget('draft')}>
                Return to draft · demo
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No local course draft for review"
          description="Create a course in the facilitator preview or load a sample draft to explore approval states."
          action={<Button onClick={load}>Load sample course draft</Button>}
        />
      )}
      <Card className="mt-6 p-6">
        <h2 className="text-sm font-extrabold text-heading">Publication checklist</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            'Objectives describe demonstrable skills',
            'Lessons and assessments are accurate',
            'Age-appropriate content and safety reviewed',
            'Projects include constructive feedback paths',
            'Rights and media permissions checked',
            'Authorised approver and audit recorded',
          ].map((item) => (
            <div key={item} className="flex gap-2 text-xs text-body">
              <Check className="h-4 w-4 shrink-0 text-mint-500" />
              {item}
            </div>
          ))}
        </div>
      </Card>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={`Change local content state to ${target?.replace('_', ' ')}?`}
        description="This changes only a browser-stored demonstration draft. No learner-facing course will be published or removed."
        confirmLabel="Change demo state"
        destructive={target === 'archived'}
        onConfirm={change}
      />
    </>
  );
}
export function AdminModerationPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [target, setTarget] = useState<{ id: string; action: 'resolve' | 'hide' } | null>(null);
  const queue = state.posts.filter((post) => state.reportedPostIds.includes(post.id));
  const load = () => {
    const candidate = state.posts.find((post) => post.status === 'visible');
    if (candidate) {
      actions.reportPost(candidate.id);
      toast('Sample report added to the local queue.');
    }
  };
  const confirm = () => {
    if (!target) return;
    if (target.action === 'resolve') actions.resolvePost(target.id);
    else actions.hidePost(target.id);
    actions.addAuditEvent(`${target.action} community report · local preview`);
    toast('Moderation state changed locally. No real user was notified.');
    setTarget(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="Admin / Community moderation"
        title="Keep learning spaces safer."
        description="Review reports, decide carefully and create an accountable record. This is a local workflow preview."
      />
      <InfoBox tone="amber" className="mb-6">
        No live reports or trained moderators are connected. A real child-safety incident must
        follow established safeguarding procedures, not this demo queue.
      </InfoBox>
      {queue.length ? (
        <div className="space-y-4">
          {queue.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="red">Reported locally</Badge>
                <span className="text-[11px] text-subdued">{post.space}</span>
              </div>
              <h2 className="mt-4 text-base font-extrabold text-heading">{post.title}</h2>
              <p className="mt-2 text-xs leading-6 text-body">{post.body}</p>
              <p className="mt-3 text-[11px] text-subdued">Author: {post.author} · sample data</p>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTarget({ id: post.id, action: 'resolve' })}
                >
                  Resolve demo report
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setTarget({ id: post.id, action: 'hide' })}
                >
                  Hide post · demo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No reports in the local queue"
          description="A learner can report a demo post, or you can load a sample report to inspect moderation states."
          action={<Button onClick={load}>Load sample report</Button>}
        />
      )}
      <Card className="mt-6 p-6">
        <h2 className="text-sm font-extrabold text-heading">Moderation principles</h2>
        <p className="mt-3 text-xs leading-7 text-body">
          Triage safety concerns, protect minors, minimise exposure to sensitive content, document
          decisions and support appeals where appropriate. Production review requires role
          permissions and secure audit trails.
        </p>
      </Card>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={target?.action === 'hide' ? 'Hide this sample post?' : 'Resolve this sample report?'}
        description="This changes only local demonstration data and creates a local audit preview. It is not a real moderation decision."
        confirmLabel="Confirm demo action"
        destructive={target?.action === 'hide'}
        onConfirm={confirm}
      />
    </>
  );
}
export function AdminOperationsPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const resolve = () => {
    if (!ticketId) return;
    actions.resolveSupportTicket(ticketId);
    actions.addAuditEvent('resolved support ticket · local preview');
    toast('Local support ticket marked resolved. No message was sent.');
    setTicketId(null);
  };
  return (
    <>
      <PageHeader
        eyebrow="Admin / Operations"
        title="Run the platform responsibly."
        description="Commercial rules, support, role management and audit belong to trusted backend operations—not browser-only controls."
      />
      <InfoBox tone="amber" className="mb-6">
        No payments, payouts, refunds, subscription changes, messages or real privilege grants can
        be processed from this preview.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-extrabold text-heading">Support ticket previews</h2>
          </div>
          {state.supportTickets.length ? (
            <div className="mt-4 space-y-3">
              {state.supportTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-heading">{ticket.topic}</p>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-2 text-xs text-body">{ticket.message}</p>
                  {ticket.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setTicketId(ticket.id)}
                    >
                      Resolve locally
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-6 text-body">
              No local support tickets. Try the workspace support form to preview the queue.
            </p>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-extrabold text-heading">Plan configuration</h2>
          </div>
          <p className="mt-4 text-xs leading-7 text-body">
            The illustrative plan structure is held in a central configuration file. Final prices,
            benefits, billing periods, eligibility and consumer terms need owner approval before
            checkout is connected.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {commercial.plans.map((plan) => (
              <Badge key={plan.id} tone="blue">
                {plan.name} · price pending
              </Badge>
            ))}
          </div>
          <Link
            to="/pricing"
            className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
          >
            See pricing preview <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-extrabold text-heading">Commission & payout oversight</h2>
          </div>
          <p className="mt-4 text-xs leading-7 text-body">
            Teacher commission rate: <strong className="text-heading">not configured</strong>.
            Financial records must be append-only and based on provider-verified payments, refunds
            and explicit attribution rules.
          </p>
          <div className="mt-4 space-y-2">
            {sampleLedger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-raised p-3 text-xs"
              >
                <span className="text-body">{entry.description} · sample</span>
                <span className="font-extrabold text-heading">{formatMoney(entry.amount)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-subdued">
            No payout action is available without a trusted backend, approved terms and finance
            controls.
          </p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-extrabold text-heading">
              Subscriptions, payments & refunds
            </h2>
          </div>
          <p className="mt-4 text-xs leading-7 text-body">
            Payment-provider confirmation, webhook verification, receipts, refund handling,
            reconciliation and school billing are not configured. Never trust a client-provided
            payment success state.
          </p>
          <Badge tone="amber" className="mt-4">
            Integration required
          </Badge>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-extrabold text-heading">
              Roles, permissions & local audit preview
            </h2>
          </div>
          <p className="mt-3 text-xs leading-6 text-body">
            Real role grants, school tenant isolation and privileged audit entries belong on the
            server. The events below are only browser-stored examples and can be edited or cleared
            by a user.
          </p>
          {state.auditEvents.length ? (
            <div className="mt-5 space-y-2">
              {state.auditEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col justify-between gap-1 rounded-xl bg-raised p-3 text-xs sm:flex-row"
                >
                  <span className="font-bold text-heading">{event.action}</span>
                  <span className="text-subdued">
                    {new Date(event.at).toLocaleString('en-GH')} · {event.actor}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-xs text-subdued">No local audit preview events yet.</p>
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={ticketId !== null}
        onOpenChange={(open) => {
          if (!open) setTicketId(null);
        }}
        title="Resolve the local support preview?"
        description="This changes the demo ticket state only. No customer receives a reply and no real case is closed."
        confirmLabel="Resolve locally"
        onConfirm={resolve}
      />
    </>
  );
}
