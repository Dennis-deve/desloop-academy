import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Container,
  EmptyState,
  Eyebrow,
  InfoBox,
  PageHeader,
  SectionHeading,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { commercial, site } from '@/config/site';
import { useAuth, useDemo, useToast } from '@/app/providers';
import type { CheckoutRecord } from '@/types';

export function PricingPage() {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  return (
    <>
      <section className="hero-surface border-b border-line py-16 sm:py-24">
        <Container className="text-center">
          <Eyebrow>Plans & access</Eyebrow>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-tight text-heading sm:text-6xl">
            Learning should be clear from the start.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-body sm:text-base">
            The plan structure below is illustrative. Final prices, benefits, billing terms and
            eligibility have not been set by the owner.
          </p>
          <div
            className="mx-auto mt-8 inline-flex rounded-xl border border-line bg-panel p-1"
            role="group"
            aria-label="Illustrative billing period"
          >
            <button
              type="button"
              aria-pressed={period === 'monthly'}
              onClick={() => setPeriod('monthly')}
              className={`rounded-lg px-5 py-2.5 text-xs font-extrabold ${period === 'monthly' ? 'bg-ink-900 text-white' : 'text-body'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={period === 'annual'}
              onClick={() => setPeriod('annual')}
              className={`rounded-lg px-5 py-2.5 text-xs font-extrabold ${period === 'annual' ? 'bg-ink-900 text-white' : 'text-body'}`}
            >
              Annual
            </button>
          </div>
          <p className="mt-3 text-[11px] text-subdued">
            Switches demonstrate billing-period choices; no discount or price is implied.
          </p>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {commercial.plans.map((plan, index) => (
              <Card
                key={plan.id}
                className={`flex flex-col p-7 sm:p-8 ${index === 0 ? 'border-brand-200 shadow-soft dark:border-brand-500/40' : ''}`}
              >
                <Badge tone={index === 0 ? 'blue' : 'neutral'}>
                  {index === 0 ? 'A place to begin' : 'Illustrative plan'}
                </Badge>
                <h2 className="mt-6 font-display text-3xl text-heading">{plan.name}</h2>
                <p className="mt-2 text-xs text-body">{plan.audience}</p>
                <div className="mt-6 border-b border-line pb-6">
                  <p className="font-display text-2xl text-heading">Price to be confirmed</p>
                  <p className="mt-1 text-xs text-subdued">
                    {period === 'monthly' ? 'Monthly' : 'Annual'} structure preview ·{' '}
                    {commercial.currency}
                  </p>
                </div>
                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                  Possible features · pending approval
                </p>
                <ul className="mt-4 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-xs leading-6 text-body"
                    >
                      <Check className="mt-1 h-4 w-4 shrink-0 text-mint-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={
                    plan.id === 'school'
                      ? '/apply/school'
                      : `/register?next=${encodeURIComponent(`/workspace/checkout?plan=${plan.id}&period=${period}`)}`
                  }
                  className={buttonStyles(index === 0 ? 'primary' : 'outline', 'md', 'mt-8 w-full')}
                >
                  {plan.id === 'school' ? 'Explore school onboarding' : 'Preview checkout'}{' '}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))}
          </div>
          <InfoBox tone="amber" className="mt-7" title="No commercial offer is made">
            These example benefits are not final entitlements. No price, teacher commission, AI
            allowance, payment method or renewal term is promised. The checkout is only a
            demonstration.
          </InfoBox>
        </Container>
      </section>
      <section className="border-t border-line bg-panel py-16">
        <Container>
          <SectionHeading
            eyebrow="Payment readiness"
            title="Designed for Ghana. Ready to grow."
            description="A future provider may support Mobile Money, bank payments and cards where verified and configured. No provider or method is active today."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Smartphone,
                title: 'Mobile Money',
                text: 'Potential Ghanaian payment flow after provider integration.',
              },
              {
                icon: Banknote,
                title: 'Bank payments',
                text: 'Availability depends on the selected provider and agreement.',
              },
              {
                icon: CreditCard,
                title: 'Cards',
                text: 'Use tokenised provider flows; never store raw card details.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-6">
                <Icon className="h-5 w-5 text-brand-600" />
                <h3 className="mt-4 text-sm font-extrabold text-heading">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-body">{text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
const methods: { id: CheckoutRecord['method']; name: string; note: string; icon: LucideIcon }[] = [
  { id: 'momo', name: 'Mobile Money', note: 'Ghana-ready interface preview', icon: Smartphone },
  { id: 'bank', name: 'Bank payment', note: 'Provider availability pending', icon: Banknote },
  { id: 'card', name: 'Card', note: 'No card details collected here', icon: CreditCard },
];
export function CheckoutPage() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const { actions } = useDemo();
  const toast = useToast();
  const plan =
    commercial.plans.find((item) => item.id === params.get('plan')) ?? commercial.plans[0];
  const period: 'monthly' | 'annual' = params.get('period') === 'annual' ? 'annual' : 'monthly';
  const [method, setMethod] = useState<CheckoutRecord['method']>('momo');
  const [name, setName] = useState(session?.name ?? '');
  const [email, setEmail] = useState(
    session?.email?.endsWith('.invalid') ? '' : (session?.email ?? ''),
  );
  const [error, setError] = useState('');
  const [stage, setStage] = useState<'details' | 'pending' | 'success' | 'failed' | 'cancelled'>(
    'details',
  );
  const prepare = () => {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a name and valid email for the demo billing preview.');
      return;
    }
    setError('');
    setStage('pending');
  };
  const finish = (status: CheckoutRecord['status']) => {
    actions.addCheckoutRecord({
      id: `DEMO-${Date.now()}`,
      plan: plan.name,
      period,
      method,
      status,
      at: new Date().toISOString(),
    });
    setStage(
      status === 'success_demo' ? 'success' : status === 'failed_demo' ? 'failed' : 'cancelled',
    );
    toast('Demo checkout state saved locally. No payment or subscription was created.', 'info');
  };
  return (
    <>
      <PageHeader
        eyebrow="Checkout preview"
        title="Take a clear next step."
        description="Review an illustrative plan and explore payment states without making a charge."
        action={<Badge tone="amber">No payment provider connected</Badge>}
      />
      <InfoBox tone="amber" className="mb-6" title="This is not a checkout">
        No money is charged. Do not enter real payment credentials. A simulated success never grants
        access, verifies payment, creates a subscription or issues a receipt.
      </InfoBox>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-6 sm:p-8">
          {stage === 'details' && (
            <>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-600" />
                <h2 className="font-display text-2xl text-heading">Billing details · demo</h2>
              </div>
              <p className="mt-2 text-xs leading-6 text-body">
                These fields are used only to preview this page. No billing data is transmitted.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="billing-name"
                    className="mb-2 block text-xs font-extrabold text-heading"
                  >
                    Name *
                  </label>
                  <input
                    id="billing-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="field"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="billing-email"
                    className="mb-2 block text-xs font-extrabold text-heading"
                  >
                    Email *
                  </label>
                  <input
                    id="billing-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="field"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <h3 className="mt-8 text-sm font-extrabold text-heading">
                Choose a method to preview
              </h3>
              <p className="mt-1 text-xs text-body">
                None of these methods is currently available for real payment.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {methods.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setMethod(item.id)}
                    aria-pressed={method === item.id}
                    className={`flex min-h-[117px] flex-col items-start justify-between rounded-2xl border p-4 text-left transition ${method === item.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/20' : 'border-line hover:bg-raised'}`}
                  >
                    <item.icon className="h-5 w-5 text-brand-600" />
                    <div>
                      <p className="text-xs font-extrabold text-heading">{item.name}</p>
                      <p className="mt-1 text-[10px] leading-4 text-body">{item.note}</p>
                    </div>
                  </button>
                ))}
              </div>
              {error && (
                <p role="alert" className="field-error mt-4">
                  {error}
                </p>
              )}
              <Button className="mt-7" onClick={prepare}>
                Continue to demo pending state <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {stage === 'pending' && (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <RefreshCw className="h-8 w-8" />
              </span>
              <Badge tone="amber" className="mt-6">
                Pending · simulated
              </Badge>
              <h2 className="mt-3 font-display text-3xl text-heading">
                Payment would be verified here.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-xs leading-7 text-body">
                In production, a provider and trusted backend must confirm payment. Choose a sample
                outcome to preview the interface. No actual payment request is made.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={() => finish('success_demo')}>Simulate success</Button>
                <Button variant="outline" onClick={() => finish('failed_demo')}>
                  Simulate failure
                </Button>
                <Button variant="ghost" onClick={() => finish('cancelled_demo')}>
                  Cancel preview
                </Button>
              </div>
            </div>
          )}
          {stage !== 'details' && stage !== 'pending' && (
            <div className="py-8 text-center">
              <span
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${stage === 'success' ? 'bg-mint-50 text-mint-700' : 'bg-amber-50 text-amber-500'}`}
              >
                {stage === 'success' ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <XCircle className="h-8 w-8" />
                )}
              </span>
              <Badge tone={stage === 'success' ? 'green' : 'amber'} className="mt-6">
                {stage} · demo only
              </Badge>
              <h2 className="mt-3 font-display text-3xl text-heading">
                {stage === 'success'
                  ? 'Success screen, not a charge.'
                  : stage === 'failed'
                    ? 'Failure screen, safely previewed.'
                    : 'Preview cancelled.'}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-xs leading-7 text-body">
                {stage === 'success'
                  ? 'No payment was taken, verified or recorded with a provider. No subscription or entitlement was created.'
                  : 'No money moved and no billing record exists beyond a local sample state.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link to="/workspace/billing" className={buttonStyles('primary')}>
                  View billing preview <ArrowRight className="h-4 w-4" />
                </Link>
                <Button variant="outline" onClick={() => setStage('details')}>
                  Try another demo state
                </Button>
              </div>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
            Illustrative order summary
          </p>
          <h2 className="mt-3 font-display text-2xl text-heading">{plan.name}</h2>
          <p className="mt-1 text-xs text-body">{plan.audience}</p>
          <div className="mt-5 flex items-center justify-between border-y border-line py-4 text-xs">
            <span className="text-body">Billing period</span>
            <strong className="capitalize text-heading">{period}</strong>
          </div>
          <div className="flex items-center justify-between border-b border-line py-4 text-xs">
            <span className="text-body">Price</span>
            <strong className="text-heading">Not configured</strong>
          </div>
          <ul className="mt-5 space-y-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[11px] text-body">
                <Check className="h-3.5 w-3.5 text-mint-500" />
                {feature} · illustrative
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-subdued">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            Real payments would use a trusted provider. Never enter card or Mobile Money credentials
            here.
          </div>
          <Link
            to="/pricing"
            className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to pricing
          </Link>
        </Card>
      </div>
    </>
  );
}
export function BillingPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [refund, setRefund] = useState(false);
  const successful = state.checkoutHistory.find((entry) => entry.status === 'success_demo');
  const download = (entry: CheckoutRecord) => {
    const content = [
      'DEMONSTRATION ONLY — NOT A RECEIPT OR INVOICE',
      '',
      `${site.name} checkout interface preview`,
      `Reference: ${entry.id}`,
      `Plan: ${entry.plan}`,
      `Period: ${entry.period}`,
      `Outcome: ${entry.status}`,
      'Amount: none — no payment was made',
      'No tax document or entitlement is issued.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `not-a-receipt-${entry.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Demonstration document downloaded. It is not a receipt.');
  };
  const requestRefund = () => {
    actions.addSupportTicket({
      id: `ticket-${Date.now()}`,
      topic: 'Refund enquiry · demo',
      message: 'Local refund request workflow preview. No payment exists to refund.',
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    setRefund(false);
    toast('Local refund enquiry preview recorded. No refund was requested or processed.', 'info');
  };
  return (
    <>
      <PageHeader
        eyebrow="Billing & subscription"
        title="Know where you stand."
        description="View the plan structure and local checkout attempts. There is no active paid subscription in this preview."
        action={
          <Link to="/pricing" className={buttonStyles('outline')}>
            Explore plan structure <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        No prices, provider, receipts, invoices, renewal terms or cancellation processing are
        configured. Local simulated success does not activate a plan.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                Subscription status
              </p>
              <h2 className="text-lg font-extrabold text-heading">No active paid plan</h2>
            </div>
          </div>
          <p className="mt-5 text-xs leading-7 text-body">
            Real subscriptions require an agreed plan, verified payment, server-owned entitlements
            and clear renewal and cancellation information.
          </p>
          <Link to="/pricing" className={buttonStyles('primary', 'sm', 'mt-5')}>
            View illustrative plans <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card className="p-6">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <h2 className="mt-4 text-sm font-extrabold text-heading">Renewal & cancellation</h2>
          <p className="mt-2 text-xs leading-7 text-body">
            There is nothing to renew or cancel in the demo. Production must offer a clear,
            accessible cancellation path and display the next billing date before charging.
          </p>
          <Badge tone="amber" className="mt-4">
            Not applicable in preview
          </Badge>
        </Card>
      </div>
      <Card className="mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-heading">Local billing history preview</h2>
            <p className="mt-1 text-xs text-body">
              Sample checkout states saved in this browser, not financial records.
            </p>
          </div>
          <Badge tone="blue">{state.checkoutHistory.length} attempt(s)</Badge>
        </div>
        {state.checkoutHistory.length ? (
          <div className="mt-6 space-y-2">
            {state.checkoutHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-xs font-extrabold text-heading">
                    {entry.plan} · {entry.period}
                  </p>
                  <p className="mt-1 text-[11px] text-subdued">
                    {entry.id} · {new Date(entry.at).toLocaleDateString('en-GH')} ·{' '}
                    {entry.method.toUpperCase()} preview
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={entry.status} />
                  <Button size="sm" variant="ghost" onClick={() => download(entry)}>
                    <Download className="h-4 w-4" /> Demo document
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon={FileText}
              title="No billing attempts yet"
              description="You can explore a simulated checkout, but no money can be paid and no plan becomes active."
              action={
                <Link to="/pricing" className={buttonStyles('primary')}>
                  Explore pricing
                </Link>
              }
              className="!border-0 !p-6"
            />
          </div>
        )}
      </Card>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <ShieldCheck className="h-5 w-5 text-mint-700" />
          <h2 className="mt-4 text-sm font-extrabold text-heading">Payment safety</h2>
          <p className="mt-2 text-xs leading-7 text-body">
            Raw payment credentials should never be stored in the application database. A production
            system must verify provider events on a trusted backend.
          </p>
        </Card>
        <Card className="p-6">
          <FileText className="h-5 w-5 text-brand-600" />
          <h2 className="mt-4 text-sm font-extrabold text-heading">Refund support</h2>
          <p className="mt-2 text-xs leading-7 text-body">
            A real refund policy and verified transaction are required. The button below previews
            only a local enquiry state.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={!successful}
            onClick={() => setRefund(true)}
          >
            Preview refund enquiry
          </Button>
          {!successful && (
            <p className="mt-2 text-[11px] text-subdued">
              Preview a simulated checkout success first.
            </p>
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={refund}
        onOpenChange={setRefund}
        title="Record a demo refund enquiry?"
        description="This creates a local sample support ticket. There is no actual payment to refund, and no request is delivered."
        confirmLabel="Record local enquiry"
        onConfirm={requestRefund}
      />
    </>
  );
}
