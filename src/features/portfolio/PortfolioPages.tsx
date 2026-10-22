import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Download,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  InfoBox,
  PageHeader,
  buttonStyles,
} from '@/components/ui';
import { useDemo, useToast } from '@/app/providers';

export function PortfolioPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [visibilityId, setVisibilityId] = useState<string | null>(null);
  const itemToToggle = state.portfolio.find((item) => item.id === visibilityId);
  const download = () => {
    const content = [
      'My learning portfolio — local demo summary',
      '',
      ...state.portfolio.map((item) => {
        const project = state.projects.find((entry) => entry.id === item.projectId);
        return `${project?.title ?? 'Project'}\nSkills: ${item.skills.join(', ')}\n${item.description}\n`;
      }),
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'learning-portfolio-demo.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    toast('Local portfolio summary downloaded.');
  };
  return (
    <>
      <PageHeader
        eyebrow="Project-to-portfolio pathway"
        title="Your work, your story."
        description="Collect evidence of skills you have practised. Portfolio items stay private by default in this demo."
        action={
          state.portfolio.length > 0 && (
            <Button variant="outline" onClick={download}>
              <Download className="h-4 w-4" /> Download summary
            </Button>
          )
        }
      />
      <div className="mb-7 grid gap-5 md:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-3xl bg-ink-900 p-7 text-white sm:p-8">
          <Badge className="!bg-white/15 !text-[#b9f2df]">My portfolio · local demo</Badge>
          <h2 className="mt-5 font-display text-3xl">A collection of what you can do.</h2>
          <p className="mt-3 max-w-lg text-xs leading-7 text-slate-300">
            A finished project says more than a checked box. Describe your process, the skills you
            used and what you would do differently next time.
          </p>
          <div className="mt-6 flex gap-6">
            <div>
              <span className="font-display text-3xl">{state.portfolio.length}</span>
              <p className="text-[10px] text-white/70">portfolio items</p>
            </div>
            <div>
              <span className="font-display text-3xl">
                {state.projects.filter((project) => project.status === 'complete').length}
              </span>
              <p className="text-[10px] text-white/70">sample completions</p>
            </div>
          </div>
        </div>
        <Card className="flex flex-col justify-between p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-50 text-mint-700">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h3 className="mt-5 text-sm font-extrabold text-heading">Your privacy matters.</h3>
            <p className="mt-2 text-xs leading-6 text-body">
              Visibility controls here only change a local preview state. No public portfolio link
              is created. Sharing by minors requires guardian consent and moderation.
            </p>
            <Link
              to="/child-safety"
              className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              Safety approach <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
      {state.portfolio.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="Your portfolio starts with a project"
          description="Finish a project, load a sample review outcome and add it privately to your portfolio. There is no pressure to share anything publicly."
          action={
            <Link to="/app/projects" className={buttonStyles('primary')}>
              Explore project studio <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {state.portfolio.map((item) => {
            const project = state.projects.find((entry) => entry.id === item.projectId);
            return (
              <Card key={item.id} className="overflow-hidden">
                <div className="course-art course-art-blue flex h-36 items-center justify-center">
                  <BriefcaseBusiness className="relative z-10 h-12 w-12" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="green">
                      <BadgeCheck className="h-3 w-3" />
                      Demo completion
                    </Badge>
                    <Badge tone={item.visible ? 'amber' : 'blue'}>
                      {item.visible ? 'Visibility preview on' : 'Private'}
                    </Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold text-heading">
                    {project?.title ?? 'Project'}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-6 text-body">
                    {item.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.skills.map((skill) => (
                      <Badge key={skill}>{skill}</Badge>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
                    <Link
                      to={`/app/projects/${item.projectId}`}
                      className={buttonStyles('outline', 'sm')}
                    >
                      View project
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setVisibilityId(item.id)}>
                      {item.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {item.visible ? 'Make private' : 'Preview visibility'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <InfoBox tone="amber" className="mt-7">
        <ShieldCheck className="mr-2 inline h-4 w-4" />
        No certificates or credentials are issued by this preview. Sharing and export permissions
        must be enforced by a real backend, especially for children.
      </InfoBox>
      <ConfirmDialog
        open={!!visibilityId}
        onOpenChange={(open) => {
          if (!open) setVisibilityId(null);
        }}
        title={
          itemToToggle?.visible ? 'Make this preview private?' : 'Preview a visible portfolio item?'
        }
        description="This only changes a local demonstration flag. It does not create a public link or publish any work. Real visibility would require consent, permissions and moderation."
        confirmLabel={itemToToggle?.visible ? 'Set private' : 'Set demo visibility'}
        onConfirm={() => {
          if (visibilityId) actions.togglePortfolioVisibility(visibilityId);
          setVisibilityId(null);
          toast('Local visibility preview updated. Nothing was published.');
        }}
      />
    </>
  );
}
