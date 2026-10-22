import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Badge, Card, EmptyState, buttonStyles } from '@/components/ui';
import { ageBands, type AgeBand, type MasterCourse } from '@/curriculum/model';
import { courseState, nextAction, type CourseState } from '@/curriculum/progression';
import type { CurriculumProgress } from '@/curriculum/state';

export const stateCopy: Record<
  CourseState,
  { label: string; tone: 'neutral' | 'blue' | 'green' | 'amber' | 'purple'; explanation: string }
> = {
  locked: { label: 'Locked', tone: 'neutral', explanation: 'Pass the previous course to enter.' },
  current: {
    label: 'Current',
    tone: 'blue',
    explanation: 'Work through lessons and the final assessment.',
  },
  review: {
    label: 'In review',
    tone: 'purple',
    explanation: 'Awaiting a demo facilitator decision.',
  },
  revision: {
    label: 'Revision',
    tone: 'amber',
    explanation: 'Use feedback and retry in this course.',
  },
  completed: {
    label: 'Passed · demo',
    tone: 'green',
    explanation: 'All required preview gates were met.',
  },
};

export function CourseStatus({ status }: { status: CourseState }) {
  return (
    <Badge tone={stateCopy[status].tone}>
      {status === 'locked' && <LockKeyhole className="h-3 w-3" aria-hidden="true" />}
      {stateCopy[status].label}
    </Badge>
  );
}

export function DraftNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-[#70450b] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 ${compact ? '' : 'mb-6'}`}
      role="note"
    >
      <strong>Curriculum preview · not a certification.</strong> All 44 courses and 176 lesson
      outlines are authoring drafts. Checks and review decisions are local demonstrations, not
      validated assessments or official completion. Content, age safeguards and question banks
      require expert review before publication.
    </div>
  );
}

export function AgeBandSelector({
  value,
  onChange,
  id = 'curriculum-age-band',
}: {
  value: AgeBand;
  onChange: (value: AgeBand) => void;
  id?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-extrabold text-heading">
        Teaching presentation
      </label>
      <select
        id={id}
        className="field w-full sm:w-auto"
        value={value}
        onChange={(event) => onChange(event.target.value as AgeBand)}
      >
        {ageBands.map((band) => (
          <option value={band.id} key={band.id}>
            {band.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] leading-5 text-subdued">
        A local preview setting, not age verification. Course order and outcomes never change.
      </p>
    </div>
  );
}

export function LockedCourse({
  course,
  lesson = false,
}: {
  course: MasterCourse;
  lesson?: boolean;
}) {
  const previous = course.number > 1 ? course.number - 1 : null;
  const prev = previous ? `Course ${String(previous).padStart(2, '0')}` : 'the start';
  return (
    <Card className="p-7 sm:p-9">
      <EmptyState
        icon={LockKeyhole}
        title={`${lesson ? 'Lesson' : 'Course'} locked in the demo`}
        description={`${course.title} follows ${prev}. Complete and pass each prior course, including practice, a quiz of at least 80%, a project rubric of at least 70%, safety checks and a demo human review where required. Entering a URL cannot skip the sequence.`}
        action={
          <Link to="/app/courses" className={buttonStyles('primary')}>
            See your next step <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <p className="mt-4 text-center text-xs text-subdued">
        Browser-only lock preview. The production API must independently enforce this gate.
      </p>
    </Card>
  );
}

export function PathwayAction({
  course,
  progress,
}: {
  course: MasterCourse;
  progress: CurriculumProgress;
}) {
  const status = courseState(course, progress);
  const action = nextAction(course, progress);
  return status === 'locked' || !action.href ? (
    <span className="text-xs font-semibold text-subdued">{stateCopy[status].explanation}</span>
  ) : (
    <Link
      className={buttonStyles(status === 'completed' ? 'outline' : 'primary', 'sm')}
      to={action.href}
    >
      {action.label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
