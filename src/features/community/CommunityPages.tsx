import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Check,
  Flag,
  Heart,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  MessageCircleQuestion,
  Plus,
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
  EmptyState,
  InfoBox,
  Modal,
  PageHeader,
  SearchInput,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { useDemo, useToast } from '@/app/providers';
import type { CommunityPost } from '@/types';

const kindStyles: Record<
  CommunityPost['kind'],
  { label: string; tone: 'blue' | 'green' | 'amber' | 'purple'; icon: LucideIcon }
> = {
  announcement: { label: 'Facilitator announcement', tone: 'blue', icon: Megaphone },
  project: { label: 'Project showcase', tone: 'green', icon: Sparkles },
  question: { label: 'Learning question', tone: 'purple', icon: MessageCircleQuestion },
  discussion: { label: 'Discussion', tone: 'amber', icon: UsersRound },
};
function CommunityPostCard({
  post,
  onReport,
}: {
  post: CommunityPost;
  onReport: (id: string) => void;
}) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const youngerBand = state.curriculum.band === 'early' || state.curriculum.band === 'junior';
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const kind = kindStyles[post.kind];
  const Icon = kind.icon;
  const saved = state.savedPostIds.includes(post.id);
  const liked = state.likedPostIds.includes(post.id);
  const submitReply = () => {
    if (youngerBand) return;
    if (reply.trim().length < 5) {
      toast('Write a little more to add a helpful response.', 'error');
      return;
    }
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(reply)) {
      toast('Please do not share contact details in community spaces.', 'error');
      return;
    }
    actions.addComment(post.id, reply.trim());
    setReply('');
    toast('Comment added locally. No live community was notified.');
  };
  return (
    <Card
      className={`overflow-hidden ${post.kind === 'announcement' ? 'border-brand-200 dark:border-brand-500/40' : ''}`}
    >
      <div className={post.kind === 'announcement' ? 'h-1 bg-brand-500' : ''} />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${post.kind === 'announcement' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20' : 'bg-mint-50 text-mint-700 dark:bg-mint-500/20'}`}
            >
              {post.avatar}
            </span>
            <div>
              <p className="text-xs font-extrabold text-heading">{post.author}</p>
              <p className="text-[11px] text-subdued">
                {post.role} · {post.time}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={kind.tone}>
              <Icon className="h-3 w-3" />
              {kind.label}
            </Badge>
            {post.status !== 'visible' && <StatusBadge status={post.status} />}
          </div>
        </div>
        <h2 className="mt-5 text-base font-extrabold text-heading">{post.title}</h2>
        <p className="mt-2 whitespace-pre-line text-xs leading-7 text-body">{post.body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{post.space}</Badge>
          <Badge>
            {post.ageSpace === 'general' ? 'General space' : `${post.ageSpace} space · preview`}
          </Badge>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-line pt-3 text-[11px] font-bold text-body">
          <button
            type="button"
            onClick={() => actions.toggleLike(post.id)}
            aria-pressed={liked}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-raised ${liked ? 'text-brand-600 dark:text-brand-200' : ''}`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            {post.likes} Appreciations
          </button>
          <button
            type="button"
            onClick={() => setReplyOpen((value) => !value)}
            aria-expanded={replyOpen}
            disabled={youngerBand}
            title={youngerBand ? 'Replying is unavailable in the younger-band preview' : undefined}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-raised"
          >
            <MessageCircle className="h-4 w-4" />
            {post.replies} Replies
          </button>
          <button
            type="button"
            onClick={() => {
              actions.toggleSavedPost(post.id);
              toast(saved ? 'Post removed from saved items.' : 'Post saved locally.');
            }}
            aria-pressed={saved}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-raised"
          >
            <Bookmark className={`h-4 w-4 ${saved ? 'fill-current text-brand-600' : ''}`} />
            {saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onReport(post.id)}
            className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 hover:bg-raised"
          >
            <Flag className="h-4 w-4" />
            Report
          </button>
        </div>
        {replyOpen && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-3 text-[11px] font-extrabold text-heading">
              Learning discussion · local demo
            </p>
            {(state.comments[post.id] ?? []).map((comment, index) => (
              <div
                key={index}
                className="mb-2 rounded-xl bg-raised p-3 text-xs leading-6 text-body"
              >
                <strong className="text-heading">You · demo:</strong> {comment}
              </div>
            ))}
            <label htmlFor={`reply-${post.id}`} className="sr-only">
              Write a helpful response to {post.title}
            </label>
            <textarea
              id={`reply-${post.id}`}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={2}
              placeholder="Share a helpful idea, not personal details..."
              className="field resize-y"
            />
            <Button size="sm" onClick={submitReply} className="mt-2">
              <Send className="h-3.5 w-3.5" /> Add demo reply
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
export function CommunityPage() {
  const [params] = useSearchParams();
  const { state, actions } = useDemo();
  const toast = useToast();
  const youngerBand = state.curriculum.band === 'early' || state.curriculum.band === 'junior';
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [space, setSpace] = useState(params.get('space') ?? 'All spaces');
  const [createOpen, setCreateOpen] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postKind, setPostKind] = useState<'question' | 'project' | 'discussion'>('question');
  const [error, setError] = useState('');
  const posts = useMemo(
    () =>
      state.posts.filter(
        (post) =>
          post.status !== 'hidden' &&
          (kind === 'all' || post.kind === kind) &&
          (space === 'All spaces' || post.space === space) &&
          `${post.title} ${post.body} ${post.space}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [state.posts, kind, space, search],
  );
  const publish = () => {
    if (youngerBand) return;
    if (title.trim().length < 5 || body.trim().length < 15) {
      setError('Add a title (5+ characters) and a little more detail (15+ characters).');
      return;
    }
    if (
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(`${title} ${body}`) ||
      /\+?\d[\d\s-]{8,}\d/.test(`${title} ${body}`)
    ) {
      setError('Please remove contact details or phone numbers before posting.');
      return;
    }
    actions.addPost(title.trim(), body.trim(), postKind);
    setCreateOpen(false);
    setTitle('');
    setBody('');
    setError('');
    setKind('all');
    setSpace('All spaces');
    toast('Post added to the local demo feed. It is not public.');
  };
  return (
    <>
      <PageHeader
        eyebrow="Learning community"
        title="Learn better, together."
        description="Ask a thoughtful question, share your process, and help others make progress. This is a sample moderated-style space."
        action={
          <Button disabled={youngerBand} onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create a post
          </Button>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        <ShieldCheck className="mr-2 inline h-4 w-4" />
        This is a local demo. Posts and reports are not sent to a community or moderation team. Age
        spaces are a visual preview, not server-enforced access.
      </InfoBox>
      {youngerBand && (
        <InfoBox tone="blue" className="mb-6">
          For the selected ages 6–12 presentation, posting and replies are disabled in this preview.
          If something feels unsafe, speak to a trusted adult; the local report button does not
          alert a safeguarding team. Changing this unverified band is not a production safety
          control.
        </InfoBox>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_270px]">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 sm:flex-row">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search discussions"
              className="flex-1"
            />
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              aria-label="Filter by post type"
              className="field sm:w-[170px]"
            >
              <option value="all">All post types</option>
              <option value="announcement">Announcements</option>
              <option value="question">Questions</option>
              <option value="project">Projects</option>
              <option value="discussion">Discussions</option>
            </select>
            <select
              value={space}
              onChange={(event) => setSpace(event.target.value)}
              aria-label="Filter by learning space"
              className="field sm:w-[170px]"
            >
              <option>All spaces</option>
              <option>General learning</option>
              <option>Creative coding</option>
              <option>Digital literacy</option>
            </select>
          </div>
          <p className="text-[11px] font-bold text-subdued">
            {posts.length} sample discussion{posts.length === 1 ? '' : 's'}
          </p>
          {posts.length ? (
            posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} onReport={setReportId} />
            ))
          ) : (
            <EmptyState
              icon={MessageCircleQuestion}
              title="No discussions found"
              description="Try a different filter or start a thoughtful question of your own."
              action={
                <Button
                  onClick={() => {
                    setKind('all');
                    setSpace('All spaces');
                    setSearch('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-sm font-extrabold text-heading">Learning circles</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Smaller groups, shared goals and moderated conversation. Join an illustrative circle
              to see the experience.
            </p>
            <Link
              to="/app/circles"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Explore circles <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-5">
            <ShieldCheck className="h-5 w-5 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">A kind space to grow</h2>
            <ul className="mt-3 space-y-2 text-xs leading-6 text-body">
              <li>· Focus feedback on the work, not the person.</li>
              <li>· Keep private details private.</li>
              <li>· Report content that feels unsafe or inappropriate.</li>
            </ul>
            <Link
              to="/community-guidelines"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Read guidelines <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-extrabold text-heading">Saved posts</p>
            <p className="mt-2 text-xs text-body">
              {state.savedPostIds.length} saved locally for later reading.
            </p>
          </Card>
        </aside>
      </div>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Start a learning conversation"
        description="Share a question, a project process or an idea. Posts stay in this browser only."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={publish}>
              Add demo post <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="post-kind" className="mb-2 block text-xs font-extrabold text-heading">
              Post type
            </label>
            <select
              id="post-kind"
              className="field"
              value={postKind}
              onChange={(event) => setPostKind(event.target.value as typeof postKind)}
            >
              <option value="question">Learning question</option>
              <option value="project">Project showcase</option>
              <option value="discussion">Discussion</option>
            </select>
          </div>
          <div>
            <label htmlFor="post-title" className="mb-2 block text-xs font-extrabold text-heading">
              Title *
            </label>
            <input
              id="post-title"
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              placeholder="What would you like to share?"
            />
          </div>
          <div>
            <label htmlFor="post-body" className="mb-2 block text-xs font-extrabold text-heading">
              Your post *
            </label>
            <textarea
              id="post-body"
              rows={4}
              className="field"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              placeholder="What have you tried? What would help?"
            />
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <InfoBox tone="amber">
            Do not include names of children, contact details, precise locations or private school
            information. Client checks are not moderation.
          </InfoBox>
        </div>
      </Modal>
      <Modal
        open={!!reportId}
        onOpenChange={(open) => {
          if (!open) {
            setReportId(null);
            setReportReason('');
          }
        }}
        title="Report a concern"
        description="Choose why this post should be reviewed. In this demo, no moderator is contacted."
        footer={
          <>
            <Button variant="outline" onClick={() => setReportId(null)}>
              Cancel
            </Button>
            <Button
              disabled={!reportReason}
              onClick={() => {
                if (reportId) actions.reportPost(reportId);
                setReportId(null);
                setReportReason('');
                toast(
                  'Report recorded in local demo moderation queue. No one was notified.',
                  'info',
                );
              }}
            >
              Record demo report
            </Button>
          </>
        }
      >
        <label htmlFor="report-reason" className="mb-2 block text-xs font-extrabold text-heading">
          What is the concern?
        </label>
        <select
          id="report-reason"
          className="field"
          value={reportReason}
          onChange={(event) => setReportReason(event.target.value)}
        >
          <option value="">Select a reason</option>
          <option>Personal information</option>
          <option>Bullying or harmful content</option>
          <option>Inappropriate interaction</option>
          <option>Inaccurate or misleading information</option>
          <option>Other</option>
        </select>
        <p className="mt-3 text-xs leading-6 text-body">
          For an urgent safety concern, do not rely on this demo. Follow local safeguarding
          procedures.
        </p>
      </Modal>
    </>
  );
}
const circles = [
  {
    id: 'makers',
    title: 'Creative makers',
    topic: 'Coding and making',
    goal: 'Build a small idea and share how it changed.',
    icon: Sparkles,
    color: 'course-art-lavender',
  },
  {
    id: 'digital',
    title: 'Digital starters',
    topic: 'Everyday digital skills',
    goal: 'Practise one useful digital habit each week.',
    icon: BookIcon,
    color: 'course-art-blue',
  },
  {
    id: 'design',
    title: 'Design together',
    topic: 'Design and problem-solving',
    goal: 'Ask better questions and test ideas with care.',
    icon: HeartHandshake,
    color: 'course-art-mint',
  },
];
function BookIcon({ className }: { className?: string }) {
  return <MessageCircle className={className} />;
}
export function CirclesPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const youngerBand = state.curriculum.band === 'early' || state.curriculum.band === 'junior';
  return (
    <>
      <PageHeader
        eyebrow="Learning circles"
        title="Good ideas grow together."
        description="Small learning groups with shared goals, project ideas and moderated discussion. This is a visual and local membership preview."
        action={
          <Link to="/app/community" className={buttonStyles('outline')}>
            Community feed <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-7">
        Circle membership is saved locally only. Real age-space permissions, group moderation and
        facilitator access must be enforced by the backend.
      </InfoBox>
      {youngerBand && (
        <InfoBox tone="blue" className="mb-6">
          Joining circles is disabled for the selected ages 6–12 preview. Real group membership
          requires verified age, consent and moderation rules.
        </InfoBox>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        {circles.map((circle) => {
          const joined = state.joinedCircleIds.includes(circle.id);
          return (
            <Card key={circle.id} className="overflow-hidden">
              <div className={`course-art ${circle.color} flex h-36 items-center justify-center`}>
                <circle.icon className="relative z-10 h-10 w-10" />
              </div>
              <div className="p-6">
                <Badge tone="blue">{circle.topic}</Badge>
                <h2 className="mt-4 text-lg font-extrabold text-heading">{circle.title}</h2>
                <p className="mt-2 min-h-[52px] text-xs leading-6 text-body">{circle.goal}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={youngerBand}
                    variant={joined ? 'outline' : 'primary'}
                    onClick={() => {
                      actions.toggleCircle(circle.id);
                      toast(
                        joined ? 'Left this local demo circle.' : 'Joined this local demo circle.',
                      );
                    }}
                  >
                    {joined ? (
                      <>
                        <Check className="h-4 w-4" /> Joined · leave
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Join demo circle
                      </>
                    )}
                  </Button>
                  <Link
                    to={`/app/community?space=${encodeURIComponent(circle.id === 'makers' ? 'Creative coding' : circle.id === 'digital' ? 'Digital literacy' : 'General learning')}`}
                    className={buttonStyles('ghost', 'sm')}
                  >
                    Discussion <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="mt-7 p-6">
        <h2 className="text-sm font-extrabold text-heading">How circles stay useful</h2>
        <p className="mt-2 text-xs leading-7 text-body">
          Circle goals are collaborative, not public rankings. Future facilitated groups need clear
          class boundaries, reporting, guardian-aware controls and approved communication channels.
          Direct messaging between children and unknown adults is not available.
        </p>
      </Card>
    </>
  );
}
