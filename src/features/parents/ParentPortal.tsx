import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  HeartHandshake,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  InfoBox,
  Modal,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '@/components/ui';
import { lessonsFor, masterCourses, masterStages } from '@/curriculum/model';
import { completedPrefix, courseState, lessonComplete } from '@/curriculum/progression';
import { useDemo, useToast } from '@/app/providers';
import { percentage } from '@/lib/utils';

export function ParentDashboard() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [linkOpen, setLinkOpen] = useState(false);
  const [code, setCode] = useState('');
  const passed = completedPrefix(state.curriculum);
  const course = masterCourses[Math.min(passed, 43)];
  const lessons = lessonsFor(course);
  const completed = lessons.filter((lesson) =>
    lessonComplete(course, lesson.id, state.curriculum),
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="Parent & guardian portal · demonstration"
        title="Support the journey, gently."
        description="See meaningful learning highlights and make room for conversation, not pressure."
        action={
          <Button onClick={() => setLinkOpen(true)} variant="outline">
            <Plus className="h-4 w-4" /> Preview learner linking
          </Button>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        This is an illustrative guardian view. “Sam” is a sample learner, not a linked child. No
        identity, consent or relationship has been verified.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_.8fr]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEBE6] text-sm font-extrabold text-mint-700">
                S
              </span>
              <div>
                <Badge tone="blue">Sample learner profile</Badge>
                <h2 className="mt-1 text-lg font-extrabold text-heading">Sam · sample</h2>
              </div>
            </div>
            <HeartHandshake className="h-5 w-5 text-mint-700" />
          </div>
          <p className="mt-5 text-xs leading-7 text-body">
            Learning is more than a number. Here is a gentle shared-browser illustration of the
            required learning sequence.
          </p>
          <div className="mt-5 rounded-2xl bg-raised p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-subdued">
                  Required course · shared-browser illustration
                </p>
                <p className="mt-1 text-sm font-extrabold text-heading">{course.title}</p>
              </div>
              <BookOpen className="h-5 w-5 text-brand-600" />
            </div>
            <ProgressBar
              value={percentage(completed, lessons.length)}
              label="Illustrative lesson practice"
              className="mt-5"
            />
          </div>
          <p className="mt-3 text-xs text-subdued">
            {passed} of 44 course passes previewed locally. This is not Sam’s verified progress.
          </p>
          <Link to="/parent/progress" className={buttonStyles('outline', 'sm', 'mt-5')}>
            View learning highlights <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-50 text-mint-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-sm font-extrabold text-heading">A conversation starter</h2>
            <p className="mt-2 text-xs leading-7 text-body">
              “What did you try this week? What would you change if you had another go?”
            </p>
          </Card>
          <Card className="p-6">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Upcoming sessions</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              No real sessions are scheduled in the demo.
            </p>
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[
          {
            icon: BookOpen,
            title: 'Learning direction',
            text: 'See enrolled subjects and suggested next steps.',
            href: '/parent/progress',
          },
          {
            icon: ShieldCheck,
            title: 'Safety and controls',
            text: 'Preview guardian-aware choices and safeguarding resources.',
            href: '/parent/safety',
          },
          {
            icon: HeartHandshake,
            title: 'Support when needed',
            text: 'Find help and learn how concerns should be handled.',
            href: '/workspace/support',
          },
        ].map(({ icon: Icon, title, text, href }) => (
          <Link
            to={href}
            className="group rounded-2xl border border-line bg-panel p-6 hover:shadow-soft"
            key={title}
          >
            <Icon className="h-5 w-5 text-brand-600" />
            <h3 className="mt-4 text-sm font-extrabold text-heading">{title}</h3>
            <p className="mt-2 text-xs leading-6 text-body">{text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
              Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-heading">Subscription information</h2>
            <p className="mt-2 text-xs text-body">
              No real family plan, price or billing record is connected.
            </p>
          </div>
          <Link to="/workspace/billing" className={buttonStyles('outline', 'sm')}>
            View billing preview
          </Link>
        </div>
      </Card>
      <Modal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="Preview guardian linking"
        description="Real linking needs verified guardian identity, learner consent where appropriate, age checks and backend approval."
        footer={
          <>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={code.trim().length < 4}
              onClick={() => {
                actions.requestGuardianLink();
                setLinkOpen(false);
                setCode('');
                toast('Local linking request preview saved. No learner was linked.');
              }}
            >
              Record local request
            </Button>
          </>
        }
      >
        <label htmlFor="link-code" className="mb-2 block text-xs font-extrabold text-heading">
          Sample learner code
        </label>
        <input
          id="link-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="field"
          placeholder="e.g. DEMO-LEARNER"
        />
        <p className="mt-3 text-xs text-body">
          Do not enter a real child’s information.{' '}
          {state.guardianLinkRequested
            ? 'A local request state already exists.'
            : 'No existing request.'}
        </p>
      </Modal>
    </>
  );
}
export function ParentProgressPage() {
  const { state } = useDemo();
  const passed = completedPrefix(state.curriculum);
  const current = masterCourses[Math.min(passed, 43)];
  const lessons = lessonsFor(current);
  const practised = lessons.filter((lesson) =>
    lessonComplete(current, lesson.id, state.curriculum),
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="Parent portal / Learning highlights"
        title="Notice the growth behind the progress."
        description="One 44-course sequence, adapted teaching and room for revision. A supportive illustration, not a real child's learning record."
      />
      <InfoBox tone="amber" className="mb-6">
        The sample learner is not linked to a real account. The numbers below reflect a shared
        browser preview only; this role does not provide verified guardian access. Private practice
        entries and review evidence are not displayed.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-extrabold text-heading">
                The required next step · illustrative
              </h2>
            </div>
            <h3 className="mt-5 font-display text-xl text-heading">
              Course {String(current.number).padStart(2, '0')}: {current.title}
            </h3>
            <p className="mt-2 text-xs leading-6 text-body">{current.purpose}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="blue">{passed} of 44 passed · demo</Badge>
              <Badge
                tone={courseState(current, state.curriculum) === 'revision' ? 'amber' : 'green'}
              >
                {courseState(current, state.curriculum)}
              </Badge>
            </div>
            <ProgressBar
              value={Math.round((practised / lessons.length) * 100)}
              label={`${practised} of ${lessons.length} lessons practised`}
              className="mt-5"
            />
            <p className="mt-4 text-xs leading-6 text-body">
              Ask what was tried and what helped. Do not treat this local preview as an official
              grade or demand access to a learner’s private working notes.
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">Stage overview</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {masterStages.map((stage) => (
                <li key={stage.number} className="rounded-xl bg-raised p-3 text-xs">
                  <span className="font-bold text-heading">
                    {stage.number}. {stage.title}
                  </span>
                  <span className="mt-1 block text-body">
                    Courses {stage.first}–{stage.last} ·{' '}
                    {passed >= stage.last
                      ? 'passed in preview'
                      : current.number >= stage.first && current.number <= stage.last
                        ? 'current stage'
                        : 'not yet open'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-6">
            <HeartHandshake className="h-6 w-6 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">
              Encouragement, not surveillance
            </h2>
            <p className="mt-2 text-xs leading-7 text-body">
              Ask about a skill your learner is excited to use. Celebrate the process, not just
              completion, and make room for rest and a different pace.
            </p>
          </Card>
          <Card className="p-6">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Upcoming learning</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              There are no real scheduled sessions or deadlines in this preview.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
export function ParentSafetyPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  return (
    <>
      <PageHeader
        eyebrow="Parent portal / Consent & safety"
        title="A safer learning space takes work."
        description="Preview age-aware choices and learn which safeguards must be real before children use the platform."
      />
      <InfoBox tone="amber" className="mb-6" title="Not a legal consent flow">
        These local switches are visual previews, not verified guardian consent. They do not
        activate public sharing, community access or an account permission.
      </InfoBox>
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Card className="p-6 sm:p-8">
          <h2 className="text-sm font-extrabold text-heading">Guardian preference previews</h2>
          <p className="mt-2 text-xs leading-6 text-body">
            These demonstrate how future choices could be explained. No real access policy changes.
          </p>
          <div className="mt-6 space-y-3">
            {[
              {
                key: 'communityPreview' as const,
                title: 'Age-appropriate community preview',
                description: 'Moderated group spaces, not unrestricted messages.',
              },
              {
                key: 'portfolioPreview' as const,
                title: 'Portfolio sharing preview',
                description: 'Optional visibility with consent and moderation before publication.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line p-4"
              >
                <div>
                  <p className="text-xs font-extrabold text-heading">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-body">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={state.guardianPreferences[item.key]}
                  onChange={(event) => {
                    actions.updateGuardianPreferences({ [item.key]: event.target.checked });
                    toast('Local preference preview updated. No real consent was recorded.');
                  }}
                  className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                  aria-label={item.title}
                />
              </label>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-raised p-4 text-xs leading-6 text-body">
            <strong className="text-heading">Learner link request:</strong>{' '}
            {state.guardianLinkRequested
              ? 'Local request preview recorded; not verified.'
              : 'No local request preview.'}
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <ShieldCheck className="h-6 w-6 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Designed for boundaries</h2>
            <ul className="mt-3 space-y-2 text-xs leading-6 text-body">
              <li>· No public child rankings.</li>
              <li>· No unrestricted private messages with unknown adults.</li>
              <li>· No precise location or contact details on profiles.</li>
              <li>· Reporting and moderation need trained human review.</li>
            </ul>
            <Link
              to="/child-safety"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Read child-safety information <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-6">
            <LockKeyhole className="h-5 w-5 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Production requirements</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Age verification, legal guardian linking, consent records, retention, deletion and
              server-side restrictions require implementation and specialist review before launch.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
