import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  Hammer,
  Lightbulb,
  MessageSquareText,
  Paperclip,
  PencilLine,
  UploadCloud,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  InfoBox,
  PageHeader,
  ProgressBar,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { courses } from '@/mocks/catalog';
import { useDemo, useToast } from '@/app/providers';
import type { SubmissionRecord } from '@/types';
import { percentage } from '@/lib/utils';

export function ProjectsPage() {
  const { state } = useDemo();
  const active = state.projects.filter((project) => project.status !== 'complete').length;
  return (
    <>
      <PageHeader
        eyebrow="Optional sample project studio"
        title="Make something real."
        description="Standalone sample projects for exploration. These do not meet the required project gate or unlock any of the 44 courses."
        action={<Badge tone="blue">{active} projects to explore</Badge>}
      />
      <InfoBox tone="amber" className="mb-6 text-xs">
        Required pathway projects live inside each course assessment. Sample project completion here
        gives no required-course credit.{' '}
        <Link to="/app/courses" className="font-bold underline">
          Go to your required course
        </Link>
        .
      </InfoBox>
      <div className="mb-7 rounded-3xl bg-ink-900 p-7 text-white sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#a9f0d4]">
              Project-to-portfolio pathway
            </p>
            <h2 className="mt-3 font-display text-3xl">From “I tried” to “I can show you.”</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">
              Follow a brief, make a first version, collect evidence, learn from feedback and decide
              what belongs in your portfolio.
            </p>
          </div>
          <Link to="/app/portfolio" className={buttonStyles('white')}>
            My portfolio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((project, index) => {
          const related = courses.find((course) => course.id === project.courseId);
          const checks = state.projectChecks[project.id] ?? [];
          return (
            <Link
              key={project.id}
              to={`/app/projects/${project.id}`}
              className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-panel transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div
                className={`course-art course-art-${related?.accent ?? 'blue'} flex h-40 items-center justify-center`}
              >
                <Hammer className="relative z-10 h-12 w-12" strokeWidth={1.4} />
                <span className="absolute bottom-4 left-4 z-10 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold">
                  PROJECT 0{index + 1}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="blue">{related?.category ?? 'Practical skills'}</Badge>
                  <StatusBadge status={project.status} />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-heading">{project.title}</h2>
                <p className="mt-2 flex-1 text-xs leading-6 text-body">{project.description}</p>
                <ProgressBar
                  value={percentage(checks.length, project.steps.length)}
                  label={`${checks.length} of ${project.steps.length} steps tried`}
                  className="mt-5"
                />
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200">
                  Open project{' '}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <InfoBox tone="amber" className="mt-7">
        Projects, submissions and review outcomes in this preview are local demonstrations. Selected
        files are never uploaded. Real teacher review and secure storage need a backend.
      </InfoBox>
    </>
  );
}

const allowedExtensions = ['png', 'jpg', 'jpeg', 'pdf', 'txt', 'js', 'ts', 'zip'];
const maxFileSize = 5 * 1024 * 1024;
export function validateEvidence(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!allowedExtensions.includes(extension))
    return 'Choose a PNG, JPG, PDF, TXT, JS, TS or ZIP file.';
  if (file.size > maxFileSize) return 'Choose a file smaller than 5 MB.';
  return null;
}
export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, actions } = useDemo();
  const toast = useToast();
  const project = state.projects.find((item) => item.id === id);
  const submission = state.submissions.find((item) => item.projectId === id);
  const [text, setText] = useState(submission?.text ?? '');
  const [link, setLink] = useState(submission?.link ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewKind, setReviewKind] = useState<'revision' | 'complete' | null>(null);
  if (!project)
    return (
      <EmptyState
        title="Project not found"
        description="Choose another project brief to keep making."
        action={
          <Link to="/app/projects" className={buttonStyles('primary')}>
            All projects
          </Link>
        }
      />
    );
  const course = courses.find((item) => item.id === project.courseId);
  const checks = state.projectChecks[project.id] ?? [];
  const isLocked = project.status === 'submitted' || project.status === 'complete';
  const portfolioItem = state.portfolio.find((item) => item.projectId === project.id);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    if (!next) return;
    const error = validateEvidence(next);
    setFileError(error ?? '');
    setFile(error ? null : next);
  };
  const draft = () => {
    actions.saveSubmission({
      projectId: project.id,
      text,
      link,
      fileName: file?.name ?? submission?.fileName,
      status: 'draft',
    });
    actions.updateProject(project.id, { status: 'in_progress' });
    toast('Draft saved in this browser. No file was uploaded.');
  };
  const prepareSubmit = () => {
    if (text.trim().length < 20) {
      setFormError('Describe your work in at least 20 characters.');
      return;
    }
    if (link && !/^https?:\/\/\S+/i.test(link)) {
      setFormError('Enter a full project link starting with http:// or https://.');
      return;
    }
    setFormError('');
    setConfirmOpen(true);
  };
  const submit = () => {
    const record: SubmissionRecord = {
      projectId: project.id,
      text: text.trim(),
      link: link.trim() || undefined,
      fileName: file?.name ?? submission?.fileName,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
    actions.saveSubmission(record);
    actions.updateProject(project.id, { status: 'submitted' });
    toast('Submission recorded locally for demonstration. No reviewer was notified.');
  };
  const loadReview = () => {
    if (!reviewKind) return;
    if (reviewKind === 'revision') {
      actions.updateProject(project.id, {
        status: 'revision_requested',
        feedback:
          'Sample feedback: Your idea is clear. Add one concrete example to show how someone would use your project, then submit a revised version.',
      });
      actions.saveSubmission({ ...submission!, status: 'revision_requested' });
      toast('Sample revision feedback loaded. No real teacher reviewed this.');
    } else {
      actions.updateProject(project.id, {
        status: 'complete',
        feedback:
          'Sample feedback: Your project shows the intended skills and explains your process clearly. Nice work refining it.',
      });
      actions.saveSubmission({ ...submission!, status: 'complete' });
      toast('Sample completion outcome loaded. No real review occurred.');
    }
    setReviewKind(null);
  };
  const addToPortfolio = () => {
    actions.addPortfolio({
      id: `portfolio-${project.id}`,
      projectId: project.id,
      description: text || project.description,
      visible: false,
      skills: project.skills,
    });
    toast('Added privately to your local demo portfolio.');
    navigate('/app/portfolio');
  };
  return (
    <>
      <Link
        to="/app/projects"
        className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-body hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>
      <PageHeader
        eyebrow={`${course?.title ?? 'Learning'} · Project brief`}
        title={project.title}
        description={project.description}
        action={<StatusBadge status={project.status} />}
      />
      <InfoBox tone="amber" className="mb-5 text-xs">
        This is an optional sample project, not the required course assessment. Its local status
        cannot unlock the next course.{' '}
        <Link to="/app/courses" className="font-bold underline">
          See the 44-course pathway
        </Link>
        .
      </InfoBox>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_290px]">
        <div className="space-y-5">
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-200">
              <Lightbulb className="h-5 w-5" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">
                What you are making
              </span>
            </div>
            <h2 className="mt-3 font-display text-3xl text-heading">The project brief</h2>
            <p className="mt-4 text-sm leading-8 text-body">{project.description}</p>
            <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-subdued">
                  Learning objective
                </p>
                <p className="mt-2 text-xs leading-6 text-heading">{project.objective}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-subdued">
                  Tools and materials
                </p>
                <ul className="mt-2 space-y-1 text-xs text-heading">
                  {project.tools.map((tool) => (
                    <li key={tool}>· {tool}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-200">
                  Guided practice → independent work
                </span>
                <h2 className="mt-2 font-display text-2xl text-heading">A step at a time</h2>
              </div>
              <Badge tone="blue">
                {checks.length}/{project.steps.length} tried
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-6 text-body">
              Use this checklist as a guide. Marking steps reflects your own local demo progress.
            </p>
            <div className="mt-5 space-y-2">
              {project.steps.map((step, index) => (
                <label
                  key={step}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl border border-line p-4 hover:bg-raised"
                >
                  <input
                    type="checkbox"
                    checked={checks.includes(index)}
                    onChange={() => actions.toggleProjectStep(project.id, index)}
                    className="h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-raised text-[11px] font-extrabold text-brand-600">
                    0{index + 1}
                  </span>
                  <span className="text-xs font-bold text-heading">{step}</span>
                </label>
              ))}
            </div>
            <ProgressBar
              value={percentage(checks.length, project.steps.length)}
              label="Steps tried"
              className="mt-6"
            />
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-200">
              <UploadCloud className="h-5 w-5" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">
                Your work
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl text-heading">Submit your project</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Describe what you made, how you made it and what you would improve. A future service
              will securely accept evidence and route it for review.
            </p>
            {submission && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-raised px-4 py-3 text-xs">
                <span className="font-bold text-heading">Latest local record:</span>
                <StatusBadge status={submission.status} />
                {submission.submittedAt && (
                  <span className="text-subdued">
                    {new Date(submission.submittedAt).toLocaleDateString('en-GH')}
                  </span>
                )}
              </div>
            )}
            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="project-description"
                  className="mb-2 block text-xs font-extrabold text-heading"
                >
                  Describe your work *
                </label>
                <textarea
                  id="project-description"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setFormError('');
                  }}
                  rows={5}
                  disabled={isLocked}
                  className="field resize-y"
                  placeholder="I made... The part I am proud of is... Next time I would..."
                />
                <p className="mt-1 text-[11px] text-subdued">
                  At least 20 characters. Do not include personal details.
                </p>
              </div>
              <div>
                <label
                  htmlFor="project-link"
                  className="mb-2 block text-xs font-extrabold text-heading"
                >
                  Project link (optional)
                </label>
                <input
                  id="project-link"
                  type="url"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  disabled={isLocked}
                  className="field"
                  placeholder="https://example.com/my-project"
                />
              </div>
              <div>
                <label
                  htmlFor="project-file"
                  className="mb-2 block text-xs font-extrabold text-heading"
                >
                  Select evidence (optional)
                </label>
                <input
                  id="project-file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,.txt,.js,.ts,.zip"
                  onChange={onFile}
                  disabled={isLocked}
                  className="field !h-auto cursor-pointer text-xs"
                />
                <p className="mt-1 text-[11px] leading-5 text-subdued">
                  PNG, JPG, PDF, TXT, JS, TS or ZIP · max 5 MB. The file is not uploaded; only its
                  name is saved locally.
                </p>
                {fileError && (
                  <p role="alert" className="field-error">
                    {fileError}
                  </p>
                )}
                {(file || submission?.fileName) && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-body">
                    <Paperclip className="h-3.5 w-3.5" />
                    {file?.name ?? submission?.fileName} · metadata only
                  </p>
                )}
              </div>
              {formError && (
                <p role="alert" className="field-error">
                  {formError}
                </p>
              )}
              {!isLocked && (
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={draft}>
                    <PencilLine className="h-4 w-4" /> Save draft
                  </Button>
                  <Button onClick={prepareSubmit}>
                    Record demo submission <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {isLocked && (
                <InfoBox tone="blue">
                  This demo submission is awaiting a sample review outcome. To revise, load sample
                  feedback below; no actual teacher has been contacted.
                </InfoBox>
              )}
            </div>
          </Card>
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-brand-600" />
              <h2 className="font-display text-2xl text-heading">Feedback & revision</h2>
            </div>
            {project.feedback ? (
              <div className="mt-5 rounded-2xl border border-mint-100 bg-mint-50 p-5 text-sm leading-7 text-mint-700 dark:border-mint-500/30 dark:bg-mint-500/10 dark:text-mint-100">
                <p className="text-[10px] font-extrabold uppercase tracking-widest">
                  Illustrative feedback only
                </p>
                <p className="mt-2">{project.feedback}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-6 text-body">
                No feedback yet. You can load an illustrative review state after recording a demo
                submission.
              </p>
            )}
            {project.status === 'submitted' && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setReviewKind('revision')}>
                  Load sample revision request
                </Button>
                <Button size="sm" variant="soft" onClick={() => setReviewKind('complete')}>
                  Load sample approval
                </Button>
              </div>
            )}
            {project.status === 'revision_requested' && (
              <p className="mt-4 text-xs font-bold text-heading">
                Revise your description or evidence above and submit another demo version.
              </p>
            )}
            {project.status === 'complete' && (
              <div className="mt-5 border-t border-line pt-5">
                {portfolioItem ? (
                  <Link to="/app/portfolio" className={buttonStyles('outline')}>
                    View in portfolio <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Button onClick={addToPortfolio}>
                    <BadgeCheck className="h-4 w-4" />
                    Add privately to portfolio
                  </Button>
                )}
                <p className="mt-3 text-[11px] text-subdued">
                  Portfolio items are private by default. Public sharing needs production consent
                  and moderation.
                </p>
              </div>
            )}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-extrabold text-heading">The journey</h2>
            <div className="mt-4 space-y-4">
              {[
                { icon: BookOpen, label: 'Learn the idea' },
                { icon: Hammer, label: 'Make your version' },
                { icon: ClipboardCheck, label: 'Get feedback' },
                { icon: BadgeCheck, label: 'Add to portfolio' },
              ].map(({ icon: Icon, label }, index) => (
                <div className="flex items-center gap-3 text-xs text-body" key={label}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  {index + 1}. {label}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-extrabold text-heading">Skills you are showing</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <Badge key={skill} tone="blue">
                  {skill}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-body">
              {project.due ?? 'No fixed deadline in this demo.'}
            </p>
          </Card>
          <InfoBox tone="amber">
            Backend review must check permissions, file types, sizes, malware and consent again.
            Client checks are never enough.
          </InfoBox>
        </aside>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Record your demo submission?"
        description="Your description and selected file name will be saved locally. The file itself will not be uploaded or reviewed by anyone."
        confirmLabel="Record demo submission"
        onConfirm={submit}
      />
      <ConfirmDialog
        open={reviewKind !== null}
        onOpenChange={(open) => {
          if (!open) setReviewKind(null);
        }}
        title="Load an illustrative review?"
        description="This changes the local project status to demonstrate the review workflow. No teacher or facilitator has reviewed this work."
        confirmLabel="Load sample outcome"
        onConfirm={loadReview}
      />
    </>
  );
}
