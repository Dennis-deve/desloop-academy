import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Flag,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  InfoBox,
  Modal,
  PageHeader,
  Skeleton,
  buttonStyles,
} from '@/components/ui';
import { demoAiService } from '@/services/demo';
import { useToast } from '@/app/providers';
import type { AiTutorService } from '@/services/contracts';

type Mode = Parameters<AiTutorService['respond']>[0]['mode'];
const modes: { key: Mode; label: string; description: string; icon: LucideIcon }[] = [
  {
    key: 'explain',
    label: 'Explain simply',
    description: 'Make the idea clearer',
    icon: Lightbulb,
  },
  { key: 'example', label: 'Show an example', description: 'See it in action', icon: BookOpen },
  { key: 'hint', label: 'Give me a hint', description: 'Nudge, not answer', icon: Sparkles },
  { key: 'try', label: 'Let me try first', description: 'You take the lead', icon: WandSparkles },
  {
    key: 'check',
    label: 'Check my understanding',
    description: 'Explain your thinking',
    icon: CheckCircle2,
  },
  {
    key: 'challenge',
    label: 'A harder challenge',
    description: 'Stretch your skills',
    icon: CircleHelp,
  },
  { key: 'debug', label: 'Help me debug', description: 'Find the tricky step', icon: RotateCcw },
  {
    key: 'summary',
    label: 'Summarise learning',
    description: 'Pull it together',
    icon: MessageSquareText,
  },
];
interface Response {
  question: string;
  mode: Mode;
  content: string;
  followUp: string;
}
export function AiStudio() {
  const [params] = useSearchParams();
  const context = params.get('lesson') ?? '';
  const [mode, setMode] = useState<Mode>('hint');
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState<Response[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState(0);
  const [flagOpen, setFlagOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const toast = useToast();
  const ask = async (value = question) => {
    if (value.trim().length < 3) {
      setError('Write a question with a little more detail.');
      setStatus('error');
      return;
    }
    if (requests >= 5) return;
    setStatus('loading');
    setError('');
    try {
      const result = await demoAiService.respond({ question: value, mode, context });
      setResponses((prev) => [
        ...prev,
        { question: value.trim(), mode, content: result.content, followUp: result.followUp },
      ]);
      setRequests((count) => count + 1);
      setQuestion('');
      setStatus('idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The sample response could not load.');
      setStatus('error');
    }
  };
  const modeInfo = modes.find((item) => item.key === mode) ?? modes[0];
  return (
    <>
      <PageHeader
        eyebrow="AI learning studio · demonstration"
        title="Think it through, together."
        description="Choose the kind of help you need. This studio is a structured learning preview, not a live AI service."
        action={<Badge tone="amber">Sample responses only</Badge>}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[310px_1fr]">
        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">How can I help?</h2>
            </div>
            <p className="mt-2 text-xs leading-6 text-body">
              Pick a learning approach. The best next step is often a hint, not a finished answer.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-1">
              {modes.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={mode === item.key}
                  onClick={() => setMode(item.key)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${mode === item.key ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/20' : 'border-line hover:bg-raised'}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${mode === item.key ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/30 dark:text-brand-100' : 'bg-raised text-body'}`}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[11px] font-extrabold text-heading">
                      {item.label}
                    </span>
                    <span className="hidden text-[10px] text-subdued sm:block">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
          <InfoBox tone="blue" title="Human help matters">
            Need feedback on a project or support from an educator? The future platform will route
            approved requests to a teacher or facilitator.{' '}
            <Link to="/app/community" className="font-extrabold underline">
              Explore community
            </Link>
            .
          </InfoBox>
        </aside>
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2 text-xs font-extrabold text-heading">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                  <Sparkles className="h-4 w-4" />
                </span>
                Learning conversation
              </div>
              <span className="text-[11px] font-bold text-subdued">
                {5 - requests} of 5 sample prompts left
              </span>
            </div>
            <div className="min-h-[330px] space-y-5 p-5 sm:p-7">
              {context && (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Lesson context: {context}</span>
                </div>
              )}
              {responses.length === 0 && status !== 'loading' && (
                <div className="mx-auto max-w-md py-8 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                    <Sparkles className="h-8 w-8" />
                  </span>
                  <h2 className="mt-5 font-display text-3xl text-heading">
                    A good question opens a door.
                  </h2>
                  <p className="mt-3 text-xs leading-6 text-body">
                    Tell the studio what you are working on, where you are stuck, or what you would
                    like to try. Responses are fixed educational examples in this preview.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {[
                      'How can I organise my files?',
                      'What makes an online source reliable?',
                      'Give me a hint for my project',
                    ].map((starter) => (
                      <button
                        key={starter}
                        onClick={() => setQuestion(starter)}
                        className="rounded-full border border-line px-3 py-2 text-[11px] font-bold text-body hover:bg-raised"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {responses.map((response, index) => (
                <div key={`${index}-${response.question}`} className="space-y-3">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink-900 px-5 py-3 text-xs leading-6 text-white">
                    {response.question}
                  </div>
                  <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-line bg-raised p-5">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      {modes.find((item) => item.key === response.mode)?.label} · demo
                    </div>
                    <p className="text-sm leading-7 text-heading">{response.content}</p>
                    <p className="mt-4 border-t border-line pt-3 text-xs font-bold text-brand-600 dark:text-brand-200">
                      {response.followUp}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-subdued">
                      <button
                        onClick={() => setFlagOpen(true)}
                        className="inline-flex items-center gap-1 hover:text-heading"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Flag response
                      </button>
                      <button
                        onClick={() => setHelpOpen(true)}
                        className="inline-flex items-center gap-1 hover:text-heading"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Ask for human help
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {status === 'loading' && (
                <div
                  role="status"
                  aria-label="Preparing a sample response"
                  className="max-w-[90%] rounded-2xl border border-line bg-raised p-5"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Preparing a learning response...
                  </div>
                  <Skeleton className="mt-4 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                </div>
              )}
              {status === 'error' && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-200"
                >
                  {error}{' '}
                  <button onClick={() => void ask()} className="ml-2 font-extrabold underline">
                    Retry
                  </button>
                </div>
              )}
            </div>
            <div className="border-t border-line p-5 sm:p-6">
              {requests >= 5 ? (
                <InfoBox tone="amber" title="Demo prompt limit reached">
                  The five sample prompts are used.{' '}
                  <button
                    className="font-extrabold underline"
                    onClick={() => {
                      setRequests(0);
                      setResponses([]);
                      toast('Sample prompt allowance reset locally.');
                    }}
                  >
                    Reset this local demo
                  </button>{' '}
                  to continue exploring. A real usage policy requires a backend.
                </InfoBox>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void ask();
                  }}
                >
                  <div className="flex items-start gap-3">
                    <label htmlFor="studio-question" className="sr-only">
                      Your learning question
                    </label>
                    <textarea
                      id="studio-question"
                      rows={2}
                      maxLength={500}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder={`Ask for help: ${modeInfo.description.toLowerCase()}...`}
                      className="field resize-y"
                    />
                    <Button
                      type="submit"
                      disabled={status === 'loading'}
                      aria-label="Send question"
                      className="h-[48px] shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-subdued">
                    Demo responses are scripted, may not address your question accurately, and
                    should not be treated as authoritative. Do not enter private information.
                  </p>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Modal
        open={flagOpen}
        onOpenChange={setFlagOpen}
        title="Flag a confusing response"
        description="Tell us what seems wrong. In this preview, your flag is local only and no reviewer is notified."
        footer={
          <>
            <Button variant="outline" onClick={() => setFlagOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={flagReason.trim().length < 5}
              onClick={() => {
                setFlagOpen(false);
                setFlagReason('');
                toast('Demo flag recorded locally. No moderator was contacted.', 'info');
              }}
            >
              Record demo flag
            </Button>
          </>
        }
      >
        <label htmlFor="flag-reason" className="mb-2 block text-xs font-extrabold text-heading">
          What should be checked?
        </label>
        <textarea
          id="flag-reason"
          rows={3}
          value={flagReason}
          onChange={(event) => setFlagReason(event.target.value)}
          placeholder="e.g. This explanation seems inaccurate..."
          className="field"
        />
      </Modal>
      <Modal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Human guidance"
        description="A future platform can route approved questions to a teacher or facilitator. That service is not connected in this preview."
        footer={
          <>
            <Button variant="outline" onClick={() => setHelpOpen(false)}>
              Close
            </Button>
            <Link
              to="/app/community"
              onClick={() => setHelpOpen(false)}
              className={buttonStyles('primary')}
            >
              Explore moderated discussions <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      >
        <InfoBox tone="amber">
          No message has been sent to an educator. If you have an immediate safety concern, do not
          rely on this demo tool.
        </InfoBox>
      </Modal>
    </>
  );
}
