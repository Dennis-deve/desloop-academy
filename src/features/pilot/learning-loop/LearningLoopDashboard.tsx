import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  GripVertical,
  LockKeyhole,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
} from 'lucide-react';
import {
  publicCatalog,
  publicCourses,
  publicStages,
  type PublicAgeBand,
} from '@/curriculum/public';
import type { PilotPathway, PilotWeeklyActivity } from '../api';
import {
  applyAction,
  expandProgram,
  initialSprite,
  type BlockKind,
  type LabAction,
  type LabBlock,
  type SpriteColour,
} from './program';
import { LearningOrbit } from '@/components/motion/LearningOrbit';
import { MotionParticles } from '@/components/motion/MotionParticles';
import { MotionTicker } from '@/components/motion/MotionTicker';
import { motionRipple } from '@/components/motion/ripple';
import { motionSpotlight } from '@/components/motion/spotlight';
import '@/components/motion/motion.css';
import './LearningLoop.css';

const ageBands: { id: PublicAgeBand; label: string }[] = [
  { id: 'early', label: 'Ages 6–8' },
  { id: 'junior', label: 'Ages 9–12' },
  { id: 'teen', label: 'Ages 13–17' },
  { id: 'adult', label: 'Adults' },
];
const palette: Record<SpriteColour, string> = { teal: '#24c8ba', coral: '#ff7b7e', sun: '#ffd36b' };
const blockTitle: Record<BlockKind, string> = {
  MOVE: 'Move right',
  SAY: 'Say “Hello!”',
  COLOUR: 'Set colour',
  REPEAT: 'Repeat previous ×2',
};
const blockHelp: Record<BlockKind, string> = {
  MOVE: 'One space to the right',
  SAY: 'A speech bubble appears',
  COLOUR: 'Choose a new sprite colour',
  REPEAT: 'Runs the preceding action twice more',
};
const blocksToAdd: BlockKind[] = ['MOVE', 'SAY', 'COLOUR', 'REPEAT'];

export interface LearningLoopProps {
  mode: 'private' | 'review';
  pathway?: PilotPathway | null;
  activity?: PilotWeeklyActivity | null;
  activityUnavailable?: boolean;
  displayName?: string;
  onOpenCourse?: (id: string) => void;
  onOpenStudio?: () => void;
}

function LoopLab({ onOpenStudio }: { onOpenStudio?: () => void }) {
  const reducedMotion = Boolean(useReducedMotion());
  const [blocks, setBlocks] = useState<LabBlock[]>([]);
  const [nextId, setNextId] = useState(1);
  const [actions, setActions] = useState<LabAction[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [sprite, setSprite] = useState(initialSprite);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState(
    'Add blocks, then run them to see the SVG change.',
  );

  useEffect(() => {
    if (!running) return;
    if (stepIndex === actions.length) {
      setRunning(false);
      setAnnouncement(
        `Finished ${actions.length} action${actions.length === 1 ? '' : 's'} in this tab. No course progress was saved.`,
      );
      return;
    }
    const timeout = window.setTimeout(
      () => {
        const action = actions[stepIndex];
        setSprite((previous) => applyAction(previous, action));
        setAnnouncement(`Step ${stepIndex + 1} of ${actions.length}: ${blockTitle[action.kind]}.`);
        setStepIndex((previous) => previous + 1);
      },
      reducedMotion ? 35 : 560,
    );
    return () => window.clearTimeout(timeout);
  }, [actions, reducedMotion, running, stepIndex]);

  const addBlock = (kind: BlockKind) => {
    if (blocks.length >= 8) {
      setError('This small activity accepts up to eight blocks. Remove one to add another.');
      return;
    }
    setBlocks((previous) => [
      ...previous,
      { id: `block-${nextId}`, kind, ...(kind === 'COLOUR' ? { colour: 'coral' as const } : {}) },
    ]);
    setNextId((id) => id + 1);
    setError('');
    setAnnouncement(`Added ${blockTitle[kind]}. Run the sequence when ready.`);
  };
  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((previous) => {
      const moved = [...previous];
      [moved[index], moved[index + direction]] = [moved[index + direction], moved[index]];
      return moved;
    });
    setAnnouncement(`Moved block ${index + 1} ${direction < 0 ? 'up' : 'down'}.`);
  };
  const run = () => {
    if (blocks.length === 0) {
      setError('Add at least one block before running.');
      return;
    }
    try {
      const expanded = expandProgram(blocks);
      setError('');
      setSprite({ ...initialSprite });
      setStepIndex(0);
      setActions(expanded);
      setRunning(true);
      setAnnouncement(
        `Running ${expanded.length} local action${expanded.length === 1 ? '' : 's'}.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Check the block order and retry.');
    }
  };
  const reset = () => {
    setRunning(false);
    setBlocks([]);
    setActions([]);
    setSprite({ ...initialSprite });
    setStepIndex(0);
    setError('');
    setAnnouncement('Cleared this in-tab activity. Nothing was saved or credited.');
  };
  // Expanded repeats use the Repeat block's id with a bounded -1/-2 suffix.
  const activeActionId = running ? actions[stepIndex]?.id : undefined;
  const activeBlockId = activeActionId
    ? blocks.find((block) => activeActionId === block.id || activeActionId.startsWith(`${block.id}-`))?.id
    : undefined;

  return (
    <section className="ll-lab-section ll-section" id="ll-lab" aria-labelledby="ll-lab-title">
      <div className="ll-section-heading">
        <div>
          <span className="ll-eyebrow">A little room to experiment</span>
          <h2 id="ll-lab-title">Build a thought. Watch it move.</h2>
          <p>
            Arrange real instructions and run them one step at a time. The sprite follows only the
            blocks you place.
          </p>
        </div>
        <span className="ll-section-number" aria-hidden="true">
          02 / THE LAB
        </span>
      </div>
      <div className="ll-lab-grid">
        <div className="ll-lab-editor motion-spotlight" onPointerMove={motionSpotlight}>
          <div className="ll-card-topline">
            <span className="ll-live-dot" aria-hidden="true" /> YOUR BLOCKS{' '}
            <span className="ll-count">{blocks.length} / 8</span>
          </div>
          <div className="ll-palette" role="group" aria-label="Add a block">
            {blocksToAdd.map((kind) => (
              <button
                className={`ll-add motion-pressable ll-add-${kind.toLowerCase()}`}
                type="button"
                key={kind}
                disabled={running || blocks.length >= 8}
                onPointerDown={motionRipple}
                onClick={() => addBlock(kind)}
                title={blockHelp[kind]}
              >
                <Plus size={15} aria-hidden="true" /> {blockTitle[kind]}
              </button>
            ))}
          </div>
          {blocks.length === 0 ? (
            <div className="ll-lab-empty">
              Begin with <strong>Move right</strong>, then add another block. Nothing runs until you
              press Run.
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={blocks}
              onReorder={(next) => {
                if (!running) setBlocks(next);
              }}
              as="ol"
              className="ll-block-list"
              aria-label="Block program, drag to reorder or use the arrow buttons"
            >
              {blocks.map((block, index) => (
                <Reorder.Item
                  as="li"
                  value={block}
                  key={block.id}
                  drag={running ? false : 'y'}
                  className={`ll-block ll-block-${block.kind.toLowerCase()}${activeBlockId === block.id ? ' ll-block-active' : ''}`}
                  aria-current={activeBlockId === block.id ? 'step' : undefined}
                >
                  <GripVertical size={17} aria-hidden="true" className="ll-grip" />
                  <span className="ll-block-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="ll-block-description">
                    <strong>{blockTitle[block.kind]}</strong>
                    <small>{blockHelp[block.kind]}</small>
                  </span>
                  {block.kind === 'COLOUR' && (
                    <select
                      aria-label={`Colour for block ${index + 1}`}
                      value={block.colour ?? 'coral'}
                      disabled={running}
                      onPointerDown={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setBlocks((previous) =>
                          previous.map((item) =>
                            item.id === block.id
                              ? { ...item, colour: event.target.value as SpriteColour }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="coral">Coral</option>
                      <option value="teal">Teal</option>
                      <option value="sun">Yellow</option>
                    </select>
                  )}
                  <span className="ll-block-actions">
                    <button
                      type="button"
                      disabled={running || index === 0}
                      aria-label={`Move ${blockTitle[block.kind]} block up`}
                      onClick={() => moveBlock(index, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={running || index === blocks.length - 1}
                      aria-label={`Move ${blockTitle[block.kind]} block down`}
                      onClick={() => moveBlock(index, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={running}
                      aria-label={`Remove ${blockTitle[block.kind]} block`}
                      onClick={() => {
                        setBlocks((previous) => previous.filter((item) => item.id !== block.id));
                        setAnnouncement(`Removed ${blockTitle[block.kind]}.`);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
          {error && (
            <p className="ll-lab-error" role="alert">
              {error}
            </p>
          )}
          <div className="ll-lab-controls">
            <button className="ll-run motion-pressable" type="button" disabled={running} onPointerDown={motionRipple} onClick={run}>
              <Play size={16} fill="currentColor" aria-hidden="true" />{' '}
              {running ? 'Running…' : 'Run blocks'} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              className="ll-reset motion-pressable"
              type="button"
              disabled={running || (blocks.length === 0 && sprite.position === 0 && !sprite.speech)}
              onPointerDown={motionRipple}
              onClick={reset}
            >
              <RotateCcw size={16} aria-hidden="true" /> Clear
            </button>
          </div>
          <p className="ll-lab-note">
            In-tab activity only · no save, course credit or AI.{' '}
            {onOpenStudio
              ? 'The separate private project studio has server-saved work.'
              : 'A private account is required for server-saved work.'}
          </p>
          {onOpenStudio && (
            <button className="ll-text-action" type="button" onClick={onOpenStudio}>
              Open the private project studio <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="ll-preview-column">
          <div className="ll-preview-head">
            <span className="ll-card-topline">LIVE SVG OUTPUT</span>
            <span className="ll-preview-live">
              {running
                ? `Step ${Math.min(stepIndex + 1, actions.length)} / ${actions.length}`
                : 'Ready when you are'}
            </span>
          </div>
          <div className={`ll-preview-stage${running ? ' ll-preview-running' : ''}`}>
            <svg
              viewBox="0 0 420 220"
              role="img"
              aria-label={`Sprite at space ${sprite.position + 1} of 6, colour ${sprite.colour}${sprite.speech ? ', saying Hello' : ''}`}
            >
              <rect width="420" height="220" rx="22" fill="#11132f" />
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <g key={index}>
                  <circle
                    cx={56 + index * 62}
                    cy="143"
                    r="17"
                    fill="none"
                    stroke="#3d4269"
                    strokeWidth="1.5"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={56 + index * 62}
                    y="183"
                    fill="#b5bbd7"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    {index + 1}
                  </text>
                </g>
              ))}
              <path d="M56 143 H366" stroke="#6e759c" strokeWidth="2" strokeDasharray="5 7" />
              <motion.g
                animate={{ x: sprite.position * 62 }}
                transition={{ duration: reducedMotion ? 0 : 0.48, ease: 'easeInOut' }}
              >
                <motion.circle
                  cx="56"
                  cy="143"
                  r="20"
                  animate={{ fill: palette[sprite.colour] }}
                  transition={{ duration: reducedMotion ? 0 : 0.32 }}
                />
                <circle cx="50" cy="139" r="2.2" fill="#13223c" />
                <circle cx="62" cy="139" r="2.2" fill="#13223c" />
                <path
                  d="M51 148 Q56 153 61 148"
                  fill="none"
                  stroke="#13223c"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </motion.g>
              <AnimatePresence>
                {sprite.speech && (
                  <motion.g
                    key="speech"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.22 }}
                  >
                    <rect
                      x={Math.min(317, 65 + sprite.position * 62)}
                      y="52"
                      width="92"
                      height="44"
                      rx="13"
                      fill="#ffffff"
                    />
                    <text
                      x={Math.min(363, 111 + sprite.position * 62)}
                      y="80"
                      textAnchor="middle"
                      fontSize="16"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fill="#171538"
                    >
                      Hello!
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
              <text
                x="26"
                y="34"
                fill="#91f4df"
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="bold"
                letterSpacing="1.5"
              >
                THE LITTLE CANVAS
              </text>
            </svg>
          </div>
          <div className="ll-output-line" role="status" aria-live="polite">
            {announcement}
          </div>
          <div className="ll-code-hint">
            <span>SEQUENCE</span>
            <code>
              {blocks.length === 0
                ? '// Your instructions will appear here'
                : blocks
                    .map((block) =>
                      block.kind === 'COLOUR'
                        ? `colour(${block.colour ?? 'coral'})`
                        : block.kind === 'REPEAT'
                          ? 'repeat(previous, 2)'
                          : block.kind === 'MOVE'
                            ? 'moveRight(1)'
                            : 'say("Hello!")',
                    )
                    .join('  →  ')}
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LearningLoopDashboard({
  mode,
  pathway = null,
  activity = null,
  activityUnavailable = false,
  displayName,
  onOpenCourse,
  onOpenStudio,
}: LearningLoopProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (!statsRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStatsVisible(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );
  const [age, setAge] = useState<PublicAgeBand>('adult');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(6);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const stateByCourse = useMemo(
    () => new Map(pathway?.courses.map((course) => [course.id, course.state]) ?? []),
    [pathway],
  );
  const filtered = useMemo(
    () =>
      publicCourses.filter(
        (course) =>
          (category === 'all' || course.stage === category) &&
          `${course.title} ${course.purpose} ${course.stage}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [category, query],
  );
  const visibleCourses = filtered.slice(0, shown);
  const current = pathway?.courses.find((course) => course.id === pathway.currentCourseId);
  const count = pathway?.completedCount;
  const complete = count !== undefined && Number.isSafeInteger(count) && count >= 0 && count <= publicCourses.length ? count : undefined;
  // A stale/malformed server response must not become a fictional chart or crash
  // the private page. This also keeps the standalone view data-free by design.
  const activityDays =
    activity?.timezone === 'UTC' &&
    activity.measure === 'persisted-learner-actions' &&
    Array.isArray(activity.sources) &&
    activity.sources.every((source) => source === 'draft-1' || source === 'draft-2') &&
    Array.isArray(activity.days) &&
    activity.days.length === 7 &&
    activity.days.every(
      (day, index) =>
        day &&
        typeof day.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
        Number.isSafeInteger(day.actions) &&
        day.actions >= 0 &&
        (index === 0 || day.date > activity.days[index - 1].date),
    )
      ? activity.days
      : null;
  const peak = Math.max(1, ...(activityDays?.map((day) => day.actions) ?? []));
  const totalActions = activityDays?.reduce((sum, day) => sum + day.actions, 0);
  const brand = mode === 'review' ? '__DESLOOP_BRAND_MARK__' : '/brand/brandmark-dark.webp';
  const HeroHeading = mode === 'review' ? 'h1' : 'h2'; // PilotLayout already supplies the private page h1.
  const changeFilter = (nextCategory: string) => {
    setCategory(nextCategory);
    setShown(6);
    setExpandedCourse(null);
  };
  const courseStateText = (state?: string) =>
    !state
      ? 'Draft outline'
      : state === 'locked'
        ? 'Locked by server'
        : state === 'review'
          ? 'Awaiting review'
          : state === 'revision'
            ? 'Revision requested'
            : state === 'completed'
              ? 'Passed in pilot'
              : 'Current in pilot';

  return (
    <div className="learning-loop" data-theme={theme} id="ll-top">
      <div className="ll-shell">
        {mode === 'review' && <div className="motion-weave-bar" aria-hidden="true" />}
        <header className="ll-header">
          <div className="ll-identity">
            <img src={brand} alt="" width="50" height="30" />
            <span>
              desloop<span className="ll-identity-accent">.</span>
              <small>ACADEMY</small>
            </span>
          </div>
          {mode === 'review' && (
            <nav className="ll-top-nav" aria-label="Design sections">
              <a href="#ll-journey">The loop</a>
              <a href="#ll-lab">Block lab</a>
              <a href="#ll-courses">Draft courses</a>
            </nav>
          )}
          <button
            className="ll-theme-toggle"
            type="button"
            onClick={() => setTheme((previous) => (previous === 'light' ? 'dark' : 'light'))}
            aria-label={`Switch dashboard to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>
        </header>
        <MotionTicker />
        <div className="ll-main" role={mode === 'review' ? 'main' : undefined}>
          <section className="ll-hero" id="ll-journey" aria-labelledby="ll-title">
            <MotionParticles />
            <div className="ll-hero-copy">
              <span className="ll-kicker">
                <span className="ll-kicker-star" aria-hidden="true">
                  ✳
                </span>{' '}
                {mode === 'private'
                  ? 'YOUR PRIVATE LEARNING SPACE'
                  : 'A LOOK AT THE LEARNING SPACE'}
              </span>
              <HeroHeading id="ll-title">
                Curiosity starts
                <br />
                <em>a loop.</em>
              </HeroHeading>
              <p className="ll-hero-sub">
                {displayName && mode === 'private' ? `Welcome, ${displayName}. ` : ''}Learn
                something. Make something. Share safely. Grow from there. The next step is always
                yours to explore.
              </p>
              <div className="ll-hero-actions">
                {current && onOpenCourse ? (
                  <button
                    type="button"
                    className="ll-hero-primary motion-pressable"
                    onPointerDown={motionRipple}
                    onClick={() => onOpenCourse(current.id)}
                  >
                    Continue Course {String(current.number).padStart(2, '0')}{' '}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                ) : (
                  <a className="ll-hero-primary motion-pressable" href="#ll-courses" onPointerDown={motionRipple}>
                    Explore the draft pathway <ArrowRight size={18} aria-hidden="true" />
                  </a>
                )}
                <a className="ll-hero-secondary motion-pressable" href="#ll-lab" onPointerDown={motionRipple}>
                  Try the block lab <ChevronDown size={17} aria-hidden="true" />
                </a>
              </div>
              <p className="ll-hero-footnote">
                {mode === 'private'
                  ? `Private adult/internal pilot · ${pathway?.contentVersion ?? publicCatalog.version} · not official credit`
                  : `Design review · ${publicCatalog.version} · no sign-in or activity data`}
              </p>
            </div>
            <div className="ll-orbit-wrap"><LearningOrbit variant="pilot" /></div>
          </section>
          <div className="ll-content">
            <section className="ll-stats ll-section" aria-labelledby="ll-progress-title">
              <div className="ll-section-heading">
                <div>
                  <span className="ll-eyebrow">Your journey, honestly</span>
                  <h2 id="ll-progress-title">
                    Every step counts. <span>Only the real ones.</span>
                  </h2>
                  <p>
                    Private records shape these charts. The design-only view never invents scores or
                    minutes.
                  </p>
                </div>
                <span className="ll-section-number" aria-hidden="true">
                  01 / MOMENTUM
                </span>
              </div>
              <div className="ll-stat-grid" ref={statsRef}>
                <div className="ll-stat-card ll-progress-card motion-spotlight" onPointerMove={motionSpotlight}>
                  <div className="ll-card-topline">
                    DRAFT-1 COURSE PROGRESSION{' '}
                    <span className="ll-stat-decoration" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                  <div className="ll-progress-body">
                    <div className="ll-progress-ring">
                      <svg viewBox="0 0 180 180" aria-hidden="true">
                        <circle
                          cx="90"
                          cy="90"
                          r="69"
                          fill="none"
                          stroke="var(--ll-ring-track)"
                          strokeWidth="12"
                        />
                        <motion.circle
                          cx="90"
                          cy="90"
                          r="69"
                          fill="none"
                          stroke="var(--ll-ring-fill)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 69}
                          transform="rotate(-90 90 90)"
                          initial={reducedMotion ? false : { strokeDashoffset: 2 * Math.PI * 69 }}
                          animate={{
                            strokeDashoffset: statsVisible || reducedMotion
                              ? 2 * Math.PI * 69 * (1 - (complete ?? 0) / publicCourses.length)
                              : 2 * Math.PI * 69,
                          }}
                          transition={{ duration: reducedMotion ? 0 : 0.9, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="ll-ring-label">
                        <strong>
                          {complete === undefined
                            ? '—'
                            : `${Math.round((complete / publicCourses.length) * 100)}%`}
                        </strong>
                        <span>
                          {complete === undefined
                            ? 'No data'
                            : `${complete} of ${publicCourses.length}`}
                        </span>
                      </div>
                    </div>
                    <div className="ll-progress-caption">
                      <strong>
                        {complete === undefined
                          ? 'No private record connected'
                          : `${complete} of ${publicCourses.length} draft courses passed`}
                      </strong>
                      <p>
                        {complete === undefined
                          ? 'Progress appears only in a signed-in adult pilot. This preview contains no learner records.'
                          : 'Draft-1 pathway from the server. Draft-2 progress remains in its separate engine. No official accreditation.'}
                      </p>
                      {current && onOpenCourse && (
                        <button
                          className="ll-text-action"
                          type="button"
                          onClick={() => onOpenCourse(current.id)}
                        >
                          Go to your current course <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ll-stat-card ll-activity-card motion-spotlight" onPointerMove={motionSpotlight}>
                  <div className="ll-card-topline">
                    LAST 7 UTC DAYS{' '}
                    <span className="ll-stat-decoration" aria-hidden="true">
                      ◷
                    </span>
                  </div>
                  <h3>Practice, day by day.</h3>
                  <p className="ll-activity-detail">
                    Persisted lesson attempts, quiz attempts and project submissions ·{' '}
                    {activityDays ? activity?.sources.join(' + ') : 'private pilot only'}. Actions,
                    not time spent.
                  </p>
                  {activityDays ? (
                    <>
                      <div
                        className="ll-bars"
                        role="img"
                        aria-label={`Recorded practice actions in the last seven UTC calendar days: ${activityDays.map((day) => `${day.date}: ${day.actions}`).join('; ')}`}
                      >
                        {activityDays.map((day, index) => (
                          <div className="ll-bar-column" key={day.date}>
                            <span className="ll-bar-number">{day.actions}</span>
                            <div className="ll-bar-track">
                              <motion.span
                                className={index === 6 ? 'll-bar-current' : ''}
                                initial={reducedMotion ? false : { height: 0 }}
                                animate={{
                                  height: (statsVisible || reducedMotion) && day.actions
                                    ? `${Math.max(10, (day.actions / peak) * 100)}%`
                                    : '0%',
                                }}
                                transition={{
                                  duration: reducedMotion ? 0 : 0.65,
                                  delay: reducedMotion ? 0 : index * 0.065,
                                }}
                              />
                            </div>
                            <span className="ll-bar-day">
                              {new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-GH', {
                                weekday: 'short',
                                timeZone: 'UTC',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="ll-week-summary">
                        {totalActions} recorded action{totalActions === 1 ? '' : 's'} in these 7 UTC
                        days.
                      </p>
                    </>
                  ) : (
                    <div className="ll-activity-empty">
                      <span aria-hidden="true">▥</span>
                      <strong>Activity unavailable</strong>
                      <p>
                        {activityUnavailable || mode === 'private'
                          ? 'The private activity record is unavailable or malformed. No values have been inferred; refresh or ask the pilot operator.'
                          : 'No activity is shown in the design-only view. Sign-in and real records are required.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <LoopLab onOpenStudio={onOpenStudio} />
            <section
              className="ll-courses-section ll-section"
              id="ll-courses"
              aria-labelledby="ll-courses-title"
            >
              <div className="ll-section-heading">
                <div>
                  <span className="ll-eyebrow">There is more to discover</span>
                  <h2 id="ll-courses-title">Find your next idea.</h2>
                  <p>
                    All {publicCourses.length} courses remain in their original draft order. Age
                    lenses show teaching notes, not an invitation to enrol a child.
                  </p>
                </div>
                <span className="ll-section-number" aria-hidden="true">
                  03 / THE PATHWAY
                </span>
              </div>
              <div className="ll-filter-panel">
                <div className="ll-filter-top">
                  <label className="ll-stage-filter">
                    Explore a stage{' '}
                    <select value={category} onChange={(event) => changeFilter(event.target.value)}>
                      <option value="all">All 9 stages</option>
                      {publicStages.map((item) => (
                        <option key={item.number} value={item.title}>
                          {String(item.number).padStart(2, '0')} · {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ll-search-filter">
                    Find a course{' '}
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setShown(6);
                        setExpandedCourse(null);
                      }}
                      placeholder="Search draft titles or themes"
                    />
                  </label>
                </div>
                <div className="ll-age-filter">
                  <span id="ll-age-label">Teaching lens</span>
                  <div role="group" aria-labelledby="ll-age-label">
                    {ageBands.map((band) => (
                      <button
                        type="button"
                        key={band.id}
                        className={age === band.id ? 'll-age-selected' : ''}
                        aria-pressed={age === band.id}
                        onClick={() => {
                          setAge(band.id);
                          setExpandedCourse(null);
                        }}
                      >
                        {band.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="ll-filter-note">
                  These are unreviewed draft adaptations. Ages 6–8, 9–12 and 13–17 are informational
                  only; child access remains closed.
                </p>
              </div>
              <div className="ll-result-row" role="status" aria-live="polite">
                Showing {visibleCourses.length} of {filtered.length} matching draft courses · in
                pathway order
              </div>
              <motion.ol layout className="ll-course-grid">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visibleCourses.map((course) => {
                    const state = stateByCourse.get(course.id);
                    const open = expandedCourse === course.id;
                    return (
                      <motion.li
                        layout
                        key={course.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reducedMotion ? undefined : { opacity: 0, scale: 0.97 }}
                        transition={{ duration: reducedMotion ? 0 : 0.22 }}
                        className="ll-course-card motion-spotlight"
                        onPointerMove={motionSpotlight}
                      >
                        <div className="ll-course-head">
                          <span className="ll-course-number">
                            {String(course.number).padStart(2, '0')}
                          </span>
                          <span
                            className={`ll-course-state ${state === 'completed' ? 'll-completed' : ''}`}
                          >
                            {state === 'locked' && <LockKeyhole size={12} aria-hidden="true" />}
                            {courseStateText(state)}
                          </span>
                        </div>
                        <span className="ll-course-stage">{course.stage}</span>
                        <h3>{course.title}</h3>
                        <p className="ll-course-purpose">{course.purpose}</p>
                        <div className="ll-course-divider" />
                        <p className="ll-course-adaptation">
                          <strong>
                            {ageBands.find((band) => band.id === age)?.label} · teaching note
                          </strong>
                          <span>{course.ageAdaptation[age]}</span>
                        </p>
                        <button
                          className="ll-course-expand"
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpandedCourse(open ? null : course.id)}
                        >
                          {open ? 'Hide course outline' : 'See course outline'}{' '}
                          <ChevronDown size={15} aria-hidden="true" />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              className="ll-course-more"
                              initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                              transition={{ duration: reducedMotion ? 0 : 0.24 }}
                            >
                              <strong>Draft modules</strong>
                              <ol>
                                {course.modules.map((module, index) => (
                                  <li key={`${index}-${module.title}`}>{module.title}</li>
                                ))}
                              </ol>
                              {mode === 'private' &&
                                state &&
                                state !== 'locked' &&
                                onOpenCourse && (
                                  <button
                                    className="ll-text-action"
                                    type="button"
                                    onClick={() => onOpenCourse(course.id)}
                                  >
                                    Open this authorised course{' '}
                                    <ArrowRight size={15} aria-hidden="true" />
                                  </button>
                                )}
                              {state === 'locked' && (
                                <p>
                                  This course opens only after the server confirms earlier
                                  requirements.
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ol>
              {filtered.length === 0 && (
                <p className="ll-empty-results">
                  No matching draft course. Try another stage or search term.
                </p>
              )}
              {visibleCourses.length < filtered.length && (
                <button
                  className="ll-show-more"
                  type="button"
                  onClick={() => setShown((previous) => Math.min(previous + 6, filtered.length))}
                >
                  Show more courses <ArrowDown size={16} aria-hidden="true" />
                </button>
              )}
            </section>
          </div>
        </div>
        <footer className="ll-footer">
          <div className="ll-footer-main">
            <div>
              <div className="ll-footer-identity">
                <img src={brand} alt="" width="50" height="30" />
                <strong>
                  desloop<span>.</span>
                </strong>
              </div>
              <p>Learn it. Build it. Make it yours.</p>
            </div>
            <nav aria-label="Dashboard footer">
              <a href="#ll-journey">The learning loop</a>
              <a href="#ll-lab">Block lab</a>
              <a href="#ll-courses">Draft catalogue</a>
              <a href="#ll-top">Back to top ↑</a>
            </nav>
          </div>
          <div className="ll-footer-bottom">
            <span>Desloop Academy · {publicCatalog.version} · unreviewed teaching draft</span>
            <span>
              {mode === 'review'
                ? 'Design review only. No sign-in, records, AI or payments.'
                : 'Adult/internal pilot. No child admission, AI actions or official credit.'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
