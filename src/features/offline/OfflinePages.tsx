import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CloudDownload,
  CloudOff,
  HardDrive,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InfoBox,
  PageHeader,
  Skeleton,
  buttonStyles,
} from '@/components/ui';
import { offlineService, type OfflineLesson } from '@/services/offline';
import { useDemo, useToast } from '@/app/providers';

function useConnection() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return { online, refresh: () => setOnline(navigator.onLine) };
}
export function OfflinePage() {
  const [items, setItems] = useState<OfflineLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const { state } = useDemo();
  const toast = useToast();
  const { online, refresh } = useConnection();
  const load = async () => {
    setLoading(true);
    try {
      setItems(await offlineService.list());
      setError('');
    } catch {
      setError('IndexedDB is unavailable. Try a supported browser with storage enabled.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const remove = async () => {
    if (!removeId) return;
    try {
      await offlineService.remove(removeId);
      setItems((previous) => previous.filter((item) => item.id !== removeId));
      toast('Saved lesson removed from this browser.');
    } catch {
      toast('Could not remove the saved lesson.', 'error');
    }
    setRemoveId(null);
  };
  const size = new Blob([JSON.stringify(items)]).size;
  return (
    <>
      <PageHeader
        eyebrow="Low-connectivity learning"
        title="Learning that stays with you."
        description="Save approved lesson text to this device and understand what is—and is not—available without a connection."
        action={
          <Badge tone={online ? 'green' : 'amber'}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? 'Browser reports online' : 'Browser reports offline'}
          </Badge>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        Saved lessons live in this browser’s IndexedDB. They are not encrypted or synced to an
        account. On supported production browsers, a basic visited app shell may load offline; first
        installation and assets require a connection. Do not store sensitive notes on a shared
        device.
      </InfoBox>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: CloudDownload, label: 'Saved lessons', value: items.length },
          {
            icon: BookOpen,
            label: 'Local lesson notes',
            value: Object.keys(state.notes).filter((key) => !!state.notes[key]).length,
          },
          {
            icon: HardDrive,
            label: 'Approx. lesson storage',
            value: `${Math.max(0, Math.round(size / 1024))} KB`,
          },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-5">
            <Icon className="h-5 w-5 text-brand-600" />
            <p className="mt-4 text-[11px] font-bold text-body">{label}</p>
            <p className="mt-1 font-display text-3xl text-heading">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-heading">Saved for later</h2>
            <Link
              to="/app/courses"
              className="text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              Find a lesson →
            </Link>
          </div>
          {loading ? (
            <div role="status" aria-label="Loading saved lessons" className="space-y-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : error ? (
            <ErrorState onRetry={() => void load()} message={error} />
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                        {item.courseTitle}
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold text-heading">
                        {item.lesson.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-body">
                        Saved {new Date(item.savedAt).toLocaleDateString('en-GH')} · text only
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link to={`/app/offline/${item.id}`} className={buttonStyles('outline', 'sm')}>
                      Read locally <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveId(item.id)}
                      aria-label={`Remove ${item.lesson.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CloudOff}
              title="No lessons saved yet"
              description="Open a lesson and choose “Save offline” to keep a copy of its text on this device."
              action={
                <Link to="/app/courses" className={buttonStyles('primary')}>
                  Browse my learning
                </Link>
              }
            />
          )}
        </div>
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">Synchronisation status</h2>
            </div>
            <p className="mt-4 text-xs leading-7 text-body">
              Last synced: <strong className="text-heading">Never — backend not connected</strong>.
            </p>
            <p className="mt-2 text-xs leading-6 text-body">
              Notes and progress in this preview remain local. A real sync queue, retry and
              conflict-resolution service is still required.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => {
                refresh();
                toast('Connection checked. No backend sync is configured.', 'info');
              }}
            >
              <RefreshCw className="h-4 w-4" /> Check connection
            </Button>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">What needs a connection?</h2>
            <ul className="mt-4 space-y-2 text-xs leading-6 text-body">
              <li>· Live AI and teacher responses</li>
              <li>· Payments and subscription verification</li>
              <li>· Community updates and reports</li>
              <li>· Remote accounts and approvals</li>
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">Pending changes</h2>
            <p className="mt-3 text-xs leading-6 text-body">
              This demo cannot upload local changes to a server. Before launch, pending sync and
              merge conflicts must be visible and recoverable.
            </p>
            <Badge tone="amber" className="mt-4">
              Server sync unavailable
            </Badge>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        title="Remove this saved lesson?"
        description="This deletes the lesson text from IndexedDB on this browser. Your separate local progress and notes are not changed."
        confirmLabel="Remove local copy"
        destructive
        onConfirm={() => void remove()}
      />
    </>
  );
}
export function OfflineLessonPage() {
  const { id } = useParams();
  const [item, setItem] = useState<OfflineLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    offlineService
      .list()
      .then((all) => {
        setItem(all.find((entry) => entry.id === id) ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not read this local lesson.');
        setLoading(false);
      });
  }, [id]);
  return (
    <>
      <Link
        to="/app/offline"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-body hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Saved offline
      </Link>
      {loading ? (
        <Skeleton className="h-72" />
      ) : error ? (
        <ErrorState onRetry={() => window.location.reload()} message={error} />
      ) : !item ? (
        <EmptyState
          title="Local copy not found"
          description="This lesson may have been removed from the device."
          action={
            <Link to="/app/offline" className={buttonStyles('primary')}>
              Saved lessons
            </Link>
          }
        />
      ) : (
        <>
          <PageHeader
            eyebrow={`${item.courseTitle} · saved copy`}
            title={item.lesson.title}
            description="Read and practise with a locally saved copy. This is not a synced lesson session."
            action={<Badge tone="amber">Offline text copy</Badge>}
          />
          <Card className="max-w-[840px] p-6 sm:p-9">
            <h2 className="text-lg font-extrabold text-heading">What you will explore</h2>
            <ul className="mt-3 space-y-2">
              {item.lesson.objectives.map((objective) => (
                <li key={objective} className="flex gap-2 text-xs text-body">
                  <Check className="h-4 w-4 shrink-0 text-mint-500" />
                  {objective}
                </li>
              ))}
            </ul>
            <div className="my-7 border-t border-line" />
            {item.lesson.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mb-4 text-sm leading-8 text-body">
                {paragraph}
              </p>
            ))}
            <div className="mt-6 rounded-xl bg-mint-50 p-5 text-xs leading-7 text-mint-700 dark:bg-mint-500/10 dark:text-mint-100">
              <strong className="block">Try it yourself</strong>
              {item.lesson.exercise}
            </div>
            <div className="mt-8 border-t border-line pt-7">
              <h3 className="text-sm font-extrabold text-heading">Offline practice check</h3>
              <p className="mt-2 text-xs text-body">{item.lesson.quiz.question}</p>
              <div className="mt-4 space-y-2">
                {item.lesson.quiz.options.map((option, index) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 rounded-xl border border-line p-3 text-xs text-body"
                  >
                    <input
                      type="radio"
                      name="offline-quiz"
                      checked={answer === index}
                      onChange={() => {
                        setAnswer(index);
                        setChecked(false);
                      }}
                      className="accent-brand-600"
                    />
                    {option}
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-4"
                disabled={answer === null}
                onClick={() => setChecked(true)}
              >
                Check answer
              </Button>
              {checked && (
                <p role="status" className="mt-3 text-xs leading-6 text-body">
                  {answer === item.lesson.quiz.correct ? 'That is right. ' : 'Try again. '}
                  {item.lesson.quiz.explanation}
                </p>
              )}
            </div>
          </Card>
          <InfoBox tone="amber" className="mt-6 max-w-[840px]">
            Reading and quiz feedback are local. Progress is not synced to an authoritative record;
            live AI and community features are unavailable offline.
          </InfoBox>
        </>
      )}
    </>
  );
}
