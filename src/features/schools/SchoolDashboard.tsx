import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Plus,
  School2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  InfoBox,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatusBadge,
  buttonStyles,
} from '@/components/ui';
import { masterCourses as courses } from '@/curriculum/model';
import { useDemo, useToast } from '@/app/providers';

export function SchoolDashboard() {
  const { state } = useDemo();
  const school = state.schoolProfile;
  return (
    <>
      <PageHeader
        eyebrow="School workspace · demonstration"
        title={`Welcome to ${school.name}.`}
        description="A clearer view of classroom learning, setup and next actions—without reducing learners to a single number."
        action={
          <Link to="/school/launch" className={buttonStyles('primary')}>
            Open launch centre <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        This is an illustrative school tenant preview. No school has been onboarded; classes,
        learners and progress are sample data. Server-side tenant isolation is not active.
      </InfoBox>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: School2,
            label: 'Sample classes',
            value: state.schoolClasses.length,
            note: 'Local demo records',
          },
          {
            icon: UsersRound,
            label: 'Learners (sample)',
            value:
              state.schoolClasses.reduce((sum, item) => sum + item.learnerCount, 0) +
              state.schoolImportedCount,
            note: 'Not actual student records',
          },
          {
            icon: BookOpen,
            label: 'Courses assigned',
            value: state.schoolClasses.filter((item) => item.assignedCourseId).length,
            note: 'Sample assignments',
          },
          {
            icon: ClipboardCheck,
            label: 'Submissions to review',
            value: state.submissions.filter((item) => item.status === 'submitted').length,
            note: 'Local workspace demo',
          },
        ].map(({ icon: Icon, label, value, note }) => (
          <Card key={label} className="p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-5 text-[11px] font-bold text-body">{label}</p>
            <p className="mt-1 font-display text-3xl text-heading">{value}</p>
            <p className="mt-1 text-[10px] text-subdued">{note}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.85fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-200">
                Your school at a glance
              </p>
              <h2 className="mt-1 font-display text-2xl text-heading">Learning by class</h2>
            </div>
            <Link
              to="/school/classes"
              className="text-xs font-extrabold text-brand-600 dark:text-brand-200"
            >
              Manage classes →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {state.schoolClasses.slice(0, 3).map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-50 text-mint-700">
                    <School2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-heading">{item.name}</p>
                    <p className="mt-1 text-[11px] text-subdued">
                      {item.level} · {item.learnerCount} sample learners
                    </p>
                  </div>
                </div>
                <div className="min-w-[135px]">
                  <ProgressBar
                    value={index === 0 ? 62 : index === 1 ? 48 : 0}
                    label="Illustrative progress"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="!bg-ink-900 p-6 text-white">
            <GraduationCap className="h-7 w-7 text-[#a9f0d4]" />
            <h2 className="mt-4 font-display text-2xl">Launch with intention.</h2>
            <p className="mt-2 text-xs leading-6 text-slate-300">
              From an application to teachers, classes and courses—see each step in one place.
            </p>
            <Link to="/school/launch" className={buttonStyles('white', 'sm', 'mt-5')}>
              View launch steps <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
          <Card className="p-6">
            <h2 className="text-sm font-extrabold text-heading">Institutional plan</h2>
            <p className="mt-3 text-xs leading-6 text-body">
              Plan terms, renewals and billing are not configured. A school plan would appear here
              after a verified agreement.
            </p>
            <Link
              to="/workspace/billing"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Billing preview <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {[
          {
            title: 'Invite teachers',
            text: 'Plan your teaching team and their class permissions.',
            href: '/school/people',
            icon: UsersRound,
          },
          {
            title: 'Assign learning',
            text: 'Match courses to classes and practical goals.',
            href: '/school/classes',
            icon: BookOpen,
          },
          {
            title: 'Understand progress',
            text: 'See sample learning impact beyond simple completion.',
            href: '/school/reports',
            icon: ChartNoAxesCombined,
          },
        ].map(({ title, text, href, icon: Icon }) => (
          <Link
            to={href}
            key={title}
            className="group rounded-2xl border border-line bg-panel p-6 hover:shadow-soft"
          >
            <Icon className="h-5 w-5 text-brand-600" />
            <h3 className="mt-5 text-sm font-extrabold text-heading">{title}</h3>
            <p className="mt-2 text-xs leading-6 text-body">{text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
              Open <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
export function SchoolLaunchPage() {
  const { state } = useDemo();
  const steps = [
    {
      title: 'Apply for partnership',
      description: 'Share your school needs and contact details for future verification.',
      href: '/apply/school',
      complete: state.applications.some((item) => item.type === 'school'),
    },
    {
      title: 'Set up school profile',
      description: 'Review basic institution details and proposed programme direction.',
      href: '/school/settings',
      complete: !!state.schoolProfile.name,
    },
    {
      title: 'Invite teachers',
      description: 'Prepare authorised classroom roles and assignments.',
      href: '/school/people',
      complete: state.schoolTeacherInvites.length > 0,
    },
    {
      title: 'Create classes',
      description: 'Organise learning groups with clear boundaries.',
      href: '/school/classes',
      complete: state.schoolClasses.length > 0,
    },
    {
      title: 'Assign a course',
      description: 'Choose a relevant learning starting point.',
      href: '/school/classes',
      complete: state.schoolClasses.some((item) => !!item.assignedCourseId),
    },
    {
      title: 'Review learning impact',
      description: 'Look at practical evidence, not one simplistic score.',
      href: '/school/reports',
      complete: false,
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="School Launch Centre"
        title="A considered path to launch."
        description="Track the shape of a future onboarding journey. Completing steps here does not approve a school or create real accounts."
      />
      <div className="mb-7 rounded-3xl bg-ink-900 p-7 text-white sm:p-9">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#a9f0d4]">
          Illustrative setup
        </p>
        <h2 className="mt-3 font-display text-3xl">
          From first conversation to connected learning.
        </h2>
        <p className="mt-3 text-xs leading-6 text-slate-300">
          {steps.filter((step) => step.complete).length} of {steps.length} preview steps visible.
          Approval and verification cannot happen in this browser.
        </p>
        <div className="mt-5 h-2 rounded-full bg-white/20">
          <div
            className="h-2 rounded-full bg-[#8fe0c8]"
            style={{
              width: `${Math.round((steps.filter((step) => step.complete).length / steps.length) * 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Link
            to={step.href}
            key={step.title}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 transition hover:shadow-soft sm:flex-row sm:items-center"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${step.complete ? 'bg-mint-50 text-mint-700' : 'bg-raised text-subdued'}`}
            >
              {step.complete ? <Check className="h-5 w-5" /> : `0${index + 1}`}
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-heading">{step.title}</h3>
              <p className="mt-1 text-xs leading-6 text-body">{step.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200">
              {step.complete ? 'Review' : 'Explore'} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
      <InfoBox tone="amber" className="mt-7">
        A real launch requires school verification, a signed agreement, tenant setup, staff
        authorisation, privacy review, safe import and operational support. Demo steps do not grant
        access.
      </InfoBox>
    </>
  );
}
export function SchoolClassesPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const filtered = state.schoolClasses.filter((item) =>
    `${item.name} ${item.level}`.toLowerCase().includes(search.toLowerCase()),
  );
  const create = () => {
    if (name.trim().length < 3 || !level.trim()) {
      setError('Add a class name (3+ characters) and level.');
      return;
    }
    actions.addSchoolClass({
      id: `class-${Date.now()}`,
      name: name.trim(),
      level: level.trim(),
      learnerCount: 0,
    });
    setName('');
    setLevel('');
    setError('');
    setCreateOpen(false);
    toast('Class added to this local school demo.');
  };
  return (
    <>
      <PageHeader
        eyebrow="School workspace / Classes"
        title="A home for each class."
        description="Organise sample classes, plan a course assignment and keep the next learning step visible."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create demo class
          </Button>
        }
      />
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Badge tone="amber">Sample tenant data only</Badge>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search classes"
          className="w-full sm:w-[260px]"
        />
      </div>
      {filtered.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <School2 className="h-5 w-5" />
                </span>
                <Badge tone="blue">{item.learnerCount} sample learners</Badge>
              </div>
              <h2 className="mt-5 text-lg font-extrabold text-heading">{item.name}</h2>
              <p className="mt-1 text-xs text-body">{item.level}</p>
              <div className="mt-5 space-y-4 border-t border-line pt-5">
                <div>
                  <label
                    htmlFor={`assign-${item.id}`}
                    className="mb-2 block text-xs font-extrabold text-heading"
                  >
                    Planned pathway course (cannot bypass prerequisites)
                  </label>
                  <select
                    id={`assign-${item.id}`}
                    value={item.assignedCourseId ?? ''}
                    onChange={(event) => {
                      actions.updateSchoolClass(item.id, {
                        assignedCourseId: event.target.value || undefined,
                      });
                      toast(
                        'Illustrative class plan saved locally. Learner prerequisites are unchanged.',
                      );
                    }}
                    className="field !min-h-10 !py-2 text-xs"
                  >
                    <option value="">Choose a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {String(course.number).padStart(2, '0')}. {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`schedule-${item.id}`}
                    className="mb-2 block text-xs font-extrabold text-heading"
                  >
                    Session note (optional)
                  </label>
                  <input
                    id={`schedule-${item.id}`}
                    value={item.schedule ?? ''}
                    onChange={(event) =>
                      actions.updateSchoolClass(item.id, { schedule: event.target.value })
                    }
                    placeholder="e.g. Wednesday afternoons"
                    className="field !min-h-10 !py-2 text-xs"
                    maxLength={80}
                  />
                  <p className="mt-1 text-[10px] text-subdued">
                    Local planning note only. No calendar invite is sent.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No classes found"
          description="Try another search or create a demo class."
          action={<Button onClick={() => setSearch('')}>Clear search</Button>}
        />
      )}
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create a demo class"
        description="A local sample class only. No real school or learners are created."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create class</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="class-name" className="mb-2 block text-xs font-extrabold text-heading">
              Class name *
            </label>
            <input
              id="class-name"
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Digital Makers C"
            />
          </div>
          <div>
            <label htmlFor="class-level" className="mb-2 block text-xs font-extrabold text-heading">
              Level or age band *
            </label>
            <input
              id="class-level"
              className="field"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              placeholder="e.g. Junior high"
            />
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
export function SchoolPeoplePage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [tab, setTab] = useState<'teachers' | 'learners'>('teachers');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [csvPreview, setCsvPreview] = useState<{ fileName: string; count: number } | null>(null);
  const invite = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    actions.addSchoolTeacherInvite(email.trim().toLowerCase());
    setEmail('');
    setError('');
    toast('Teacher invitation drafted locally. No email was sent.');
  };
  const readCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvPreview(null);
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 1024 * 1024) {
      setError('Choose a CSV file smaller than 1 MB.');
      return;
    }
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const header = lines[0]
        ?.toLowerCase()
        .replace(/\s/g, '')
        .replace(/^\uFEFF/, '');
      if (header !== 'learner_code,class') {
        setError(
          'Use exactly two columns: learner_code,class. Do not include personal information.',
        );
        return;
      }
      const count = lines
        .slice(1)
        .filter((line) => line.trim() && line.split(',').length === 2).length;
      if (count === 0 || count > 500) {
        setError('Include 1–500 sample rows with two columns.');
        return;
      }
      setError('');
      setCsvPreview({ fileName: file.name, count });
    } catch {
      setError('Could not read the CSV file.');
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="School workspace / People"
        title="The right people, the right access."
        description="Plan teacher invitations and preview a privacy-conscious learner import. Nothing is delivered or imported to a server."
      />
      <div className="mb-6 flex gap-2" role="tablist" aria-label="People sections">
        <button
          role="tab"
          aria-selected={tab === 'teachers'}
          onClick={() => setTab('teachers')}
          className={tab === 'teachers' ? buttonStyles('primary') : buttonStyles('outline')}
        >
          Teachers
        </button>
        <button
          role="tab"
          aria-selected={tab === 'learners'}
          onClick={() => setTab('learners')}
          className={tab === 'learners' ? buttonStyles('primary') : buttonStyles('outline')}
        >
          Learners
        </button>
      </div>
      {tab === 'teachers' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <Card className="p-6 sm:p-8">
            <h2 className="text-sm font-extrabold text-heading">Invite a classroom teacher</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Record an invitation draft in this browser. Real role grants require verification and
              a school-scoped backend workflow.
            </p>
            <label
              htmlFor="school-teacher-email"
              className="mt-6 block text-xs font-extrabold text-heading"
            >
              Teacher email
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="school-teacher-email"
                type="email"
                className="field"
                placeholder="teacher@school.test"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button onClick={invite}>
                <Plus className="h-4 w-4" /> Draft
              </Button>
            </div>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="text-xs font-extrabold text-heading">Invitation drafts</h3>
              {state.schoolTeacherInvites.length ? (
                state.schoolTeacherInvites.map((address) => (
                  <div
                    key={address}
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-raised p-3 text-xs"
                  >
                    <span className="text-heading">{address}</span>
                    <Badge tone="amber">Not sent</Badge>
                  </div>
                ))
              ) : (
                <p className="mt-3 text-xs text-body">No invitation drafts yet.</p>
              )}
            </div>
          </Card>
          <InfoBox tone="amber" title="School access is separate">
            A teacher partner who refers a learner does not gain access to this school. Classroom
            teachers must be explicitly assigned to authorised classes and learners by the backend.
          </InfoBox>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <Card className="p-6 sm:p-8">
            <FileSpreadsheet className="h-6 w-6 text-brand-600" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">Preview CSV learner import</h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Use synthetic codes only. Format:{' '}
              <code className="rounded bg-raised px-1 font-mono">learner_code,class</code>. This
              browser reads row counts; it does not store identifiers or create accounts.
            </p>
            <label htmlFor="school-csv" className="mt-6 block text-xs font-extrabold text-heading">
              Choose a sample CSV
            </label>
            <input
              id="school-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void readCsv(event)}
              className="field mt-2 !h-auto text-xs"
            />
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            {csvPreview && (
              <div className="mt-5 rounded-xl border border-mint-100 bg-mint-50 p-4 text-xs text-mint-700 dark:bg-mint-500/10 dark:text-mint-100">
                <p className="font-extrabold">Preview ready: {csvPreview.count} sample rows</p>
                <p className="mt-1">{csvPreview.fileName} · No data was uploaded.</p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    actions.addSchoolImportedCount(csvPreview.count);
                    setCsvPreview(null);
                    toast('Row count added to local demo. No learner records were imported.');
                  }}
                >
                  Add count to demo view
                </Button>
              </div>
            )}
          </Card>
          <div className="space-y-4">
            <InfoBox tone="amber" title="Do not upload real learner data">
              Production imports need authorisation, consent checks, tenant validation, duplicate
              handling, secure storage and server-side file validation. This preview is not safe for
              actual student records.
            </InfoBox>
            <Card className="p-6">
              <h3 className="text-sm font-extrabold text-heading">Local import summary</h3>
              <p className="mt-3 font-display text-3xl text-heading">{state.schoolImportedCount}</p>
              <p className="text-xs text-body">
                Sample row count added in this browser. No learner profiles created.
              </p>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
export function SchoolReportsPage() {
  const { state } = useDemo();
  const toast = useToast();
  const download = () => {
    const rows = [
      'class,learner_count,illustrative_progress,assigned_course',
      ...state.schoolClasses.map(
        (item, index) =>
          `"${item.name.replaceAll('"', '""')}",${item.learnerCount},${index === 0 ? 62 : index === 1 ? 48 : 0},"${courses.find((course) => course.id === item.assignedCourseId)?.title ?? 'Not assigned'}"`,
      ),
    ];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'school-impact-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Illustrative class report downloaded.');
  };
  return (
    <>
      <PageHeader
        eyebrow="School workspace / Reports"
        title="Look for learning, not just numbers."
        description="Illustrative progress, project evidence and support needs in a school-scoped reporting layout."
        action={
          <Button variant="outline" onClick={download}>
            <Download className="h-4 w-4" /> Export sample CSV
          </Button>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        All figures on this page are illustrative. Reports are not connected to a school database.
        Exports contain sample aggregate class data only.
      </InfoBox>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'Classes supported',
            value: state.schoolClasses.length,
            note: 'Local demo classes',
            icon: School2,
          },
          {
            title: 'Projects in focus',
            value: state.projects.length,
            note: 'Sample project briefs',
            icon: ClipboardCheck,
          },
          {
            title: 'Courses assigned',
            value: state.schoolClasses.filter((item) => item.assignedCourseId).length,
            note: 'Local class assignments',
            icon: BookOpen,
          },
        ].map(({ title, value, note, icon: Icon }) => (
          <Card key={title} className="p-6">
            <Icon className="h-5 w-5 text-brand-600" />
            <p className="mt-4 text-xs font-bold text-body">{title}</p>
            <p className="mt-1 font-display text-3xl text-heading">{value}</p>
            <p className="mt-1 text-[11px] text-subdued">{note}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line p-6">
          <h2 className="text-sm font-extrabold text-heading">Class learning snapshot</h2>
          <p className="mt-1 text-xs text-body">
            Sample percentages show the interface, not real learner outcomes.
          </p>
        </div>
        <div className="space-y-1 p-4">
          {state.schoolClasses.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl p-4 hover:bg-raised md:grid-cols-[1fr_1fr_100px] md:items-center"
            >
              <div>
                <p className="text-xs font-extrabold text-heading">{item.name}</p>
                <p className="mt-1 text-[11px] text-subdued">
                  {item.learnerCount} sample learners ·{' '}
                  {courses.find((course) => course.id === item.assignedCourseId)?.title ??
                    'No course assigned'}
                </p>
              </div>
              <ProgressBar
                value={index === 0 ? 62 : index === 1 ? 48 : 0}
                label="Illustrative activity"
              />
              <Badge tone="blue">{index === 0 ? 'Project exploration' : 'Foundations'}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-extrabold text-heading">Practical skill evidence</h2>
          <p className="mt-3 text-xs leading-7 text-body">
            A future report should connect course milestones to actual projects, revision and
            educator feedback—with appropriate consent and class permissions.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-extrabold text-heading">Support needs</h2>
          <p className="mt-3 text-xs leading-7 text-body">
            No live support indicators are available. Real insights should help teachers offer
            support without labelling or ranking children publicly.
          </p>
        </Card>
      </div>
    </>
  );
}
export function SchoolSettingsPage() {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [name, setName] = useState(state.schoolProfile.name);
  const [location, setLocation] = useState(state.schoolProfile.location);
  return (
    <>
      <PageHeader
        eyebrow="School workspace / Profile"
        title="School profile."
        description="Review sample institution details and see where future verified settings will live."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
        <Card className="p-6 sm:p-8">
          <h2 className="text-sm font-extrabold text-heading">Basic details · local demo</h2>
          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="school-profile-name"
                className="mb-2 block text-xs font-extrabold text-heading"
              >
                Institution name
              </label>
              <input
                id="school-profile-name"
                className="field"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="school-profile-location"
                className="mb-2 block text-xs font-extrabold text-heading"
              >
                General location
              </label>
              <input
                id="school-profile-location"
                className="field"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!name.trim()) {
                  toast('Enter a school name.', 'error');
                  return;
                }
                actions.updateSchoolProfile({ name: name.trim(), location: location.trim() });
                toast('Local demo school profile updated.');
              }}
            >
              Save demo profile
            </Button>
          </div>
        </Card>
        <div className="space-y-4">
          <InfoBox tone="amber">
            This is not a verified school profile. Production changes need authorised school
            administrators, tenant-scoped policies and audit logs.
          </InfoBox>
          <Card className="p-6">
            <ShieldCheck className="h-6 w-6 text-mint-700" />
            <h2 className="mt-4 text-sm font-extrabold text-heading">
              Privacy and tenant isolation
            </h2>
            <p className="mt-2 text-xs leading-6 text-body">
              Only assigned teachers and authorised administrators should access school data.
              Frontend route checks are never sufficient.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
export function ClassroomDashboard() {
  const { state } = useDemo();
  const assigned = state.schoolClasses[0];
  return (
    <>
      <PageHeader
        eyebrow="Classroom teacher · demonstration"
        title="Make room for good learning."
        description="See an illustrative assigned class, guide practical work and notice where support is needed."
        action={
          <Link to="/classroom/review" className={buttonStyles('primary')}>
            Review project work <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <InfoBox tone="amber" className="mb-6">
        This classroom preview uses local sample data. A real teacher must only see specifically
        assigned classes and learners, enforced by the school backend.
      </InfoBox>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Assigned classes', value: '01', icon: School2 },
          { label: 'Sample learners', value: assigned?.learnerCount ?? 0, icon: UsersRound },
          {
            label: 'Work awaiting review',
            value: state.submissions.filter((item) => item.status === 'submitted').length,
            icon: ClipboardCheck,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-6">
            <Icon className="h-5 w-5 text-brand-600" />
            <p className="mt-4 text-xs font-bold text-body">{label}</p>
            <p className="mt-1 font-display text-3xl text-heading">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.8fr]">
        <Card className="p-6 sm:p-7">
          <h2 className="font-display text-2xl text-heading">{assigned?.name ?? 'Sample class'}</h2>
          <p className="mt-2 text-xs text-body">
            {assigned?.level} · {assigned?.learnerCount} sample learners
          </p>
          <div className="mt-6 rounded-2xl bg-raised p-5">
            <p className="text-xs font-extrabold text-heading">Course focus</p>
            <p className="mt-2 text-xs text-body">
              {courses.find((course) => course.id === assigned?.assignedCourseId)?.title ??
                'No course assigned'}
            </p>
            <ProgressBar value={62} label="Illustrative activity" className="mt-5" />
          </div>
          <Link to="/classroom/classes" className={buttonStyles('outline', 'sm', 'mt-5')}>
            Open class view <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card className="p-6">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <h2 className="mt-4 text-sm font-extrabold text-heading">Teaching rhythm</h2>
          <p className="mt-3 text-xs leading-6 text-body">
            Set a learning goal, give useful feedback and make space for practice. No live sessions
            are scheduled in this preview.
          </p>
          <Link
            to="/classroom/review"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
          >
            Review workflow <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </>
  );
}
export function ClassroomClassesPage() {
  const { state } = useDemo();
  const assigned = state.schoolClasses[0];
  const [announcement, setAnnouncement] = useState('');
  const [saved, setSaved] = useState('');
  const toast = useToast();
  return (
    <>
      <PageHeader
        eyebrow="Classroom teacher / My classes"
        title="A class to guide."
        description="Assigned-class preview, lesson planning notes and sample progress. No communication is sent."
      />
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <School2 className="h-6 w-6" />
          </span>
          <div>
            <Badge tone="blue">Assigned class · sample</Badge>
            <h2 className="mt-2 font-display text-3xl text-heading">
              {assigned?.name ?? 'Sample class'}
            </h2>
            <p className="mt-2 text-xs text-body">
              {assigned?.level} · {assigned?.learnerCount} sample learners
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-5 border-t border-line pt-7 md:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold text-heading">Course assignment</p>
            <p className="mt-2 text-xs text-body">
              {courses.find((course) => course.id === assigned?.assignedCourseId)?.title ??
                'No course assigned'}
            </p>
            <Link
              to={`/courses/${assigned?.assignedCourseId ?? 'course-01'}`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              Open course outline <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <p className="text-xs font-extrabold text-heading">Learner support</p>
            <p className="mt-2 text-xs leading-6 text-body">
              The future roster will show only learners assigned to this class, with privacy-aware
              indicators and consent checks.
            </p>
          </div>
        </div>
      </Card>
      <Card className="mt-5 p-6 sm:p-8">
        <h2 className="text-sm font-extrabold text-heading">Class announcement draft</h2>
        <p className="mt-2 text-xs text-body">
          Write a supportive reminder; it stays on this page only and is not delivered.
        </p>
        <label htmlFor="class-announcement" className="sr-only">
          Announcement draft
        </label>
        <textarea
          id="class-announcement"
          rows={3}
          className="field mt-4"
          value={announcement}
          onChange={(event) => setAnnouncement(event.target.value)}
          placeholder="Remember to explain one decision you made in your project..."
        />
        <Button
          size="sm"
          className="mt-3"
          disabled={announcement.trim().length < 10}
          onClick={() => {
            setSaved(announcement.trim());
            setAnnouncement('');
            toast('Announcement saved on this page only. Nothing was sent.');
          }}
        >
          Save page draft
        </Button>
        {saved && (
          <p className="mt-4 rounded-xl bg-raised p-4 text-xs text-body">Draft only: {saved}</p>
        )}
      </Card>
    </>
  );
}
export function ClassroomReviewPage({
  context = 'classroom',
}: {
  context?: 'classroom' | 'facilitator';
}) {
  const { state, actions } = useDemo();
  const toast = useToast();
  const [target, setTarget] = useState<{
    id: string;
    outcome: 'revision_requested' | 'complete';
  } | null>(null);
  const active = state.submissions.filter((item) => item.status === 'submitted');
  const loadSample = () => {
    actions.saveSubmission({
      projectId: 'toolkit',
      text: 'Sample learner submission: I created a digital toolkit with a folder plan, safer sign-in checklist, and a short guide for finding reliable information.',
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    });
    actions.updateProject('toolkit', { status: 'submitted' });
    toast('Illustrative submission loaded locally for review practice.');
  };
  const review = () => {
    if (!target) return;
    const item = state.submissions.find((record) => record.projectId === target.id);
    if (!item) return;
    actions.saveSubmission({ ...item, status: target.outcome });
    actions.updateProject(target.id, {
      status: target.outcome,
      feedback:
        target.outcome === 'complete'
          ? 'Sample teacher feedback: The work explains the process clearly and shows practical digital skills.'
          : 'Sample teacher feedback: Add a concrete example and explain why you chose this approach, then submit a revision.',
    });
    toast('Local sample review outcome saved. No actual learner was contacted.');
    setTarget(null);
  };
  return (
    <>
      <PageHeader
        eyebrow={
          context === 'facilitator'
            ? 'Facilitator / Project review'
            : 'Classroom teacher / Project review'
        }
        title="Feedback moves learning forward."
        description="Preview how a teacher could respond to submitted work. All review actions change local sample state only."
      />
      <InfoBox tone="amber" className="mb-6">
        Classroom teacher access and feedback must be authorised, school-scoped and audited on the
        backend. This preview is not a secure review tool.
      </InfoBox>
      {active.length ? (
        <div className="space-y-4">
          {active.map((item) => {
            const project = state.projects.find((entry) => entry.id === item.projectId);
            return (
              <Card key={item.projectId} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Badge tone="blue">Local demo submission</Badge>
                    <h2 className="mt-2 text-lg font-extrabold text-heading">
                      {project?.title ?? 'Project'}
                    </h2>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-4 rounded-xl bg-raised p-4 text-xs leading-7 text-body">
                  {item.text}
                </p>
                {item.link && (
                  <p className="mt-2 text-xs text-body">Project link supplied: {item.link}</p>
                )}
                {item.fileName && (
                  <p className="mt-2 text-xs text-body">
                    File name only: {item.fileName} · file not uploaded
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTarget({ id: item.projectId, outcome: 'revision_requested' })}
                  >
                    Request sample revision
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setTarget({ id: item.projectId, outcome: 'complete' })}
                  >
                    Record sample approval
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="No work awaiting review"
          description="A learner can record a project submission in the local demo, or load an illustrative sample to preview the teacher review workflow."
          action={<Button onClick={loadSample}>Load sample submission</Button>}
        />
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Record an illustrative review?"
        description="This will update a local demo project and feedback state. No real learner is notified, and no privileged backend action occurs."
        confirmLabel="Save sample review"
        onConfirm={review}
      />
    </>
  );
}
