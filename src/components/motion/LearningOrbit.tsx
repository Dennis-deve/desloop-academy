import { useState } from 'react';
import { motionRipple } from './ripple';

/** Copy is deliberately different in the public guide and the invited-adult space. */
const guideStages = [
  { label: 'Learn', short: 'Read the draft', detail: 'Explore the unreviewed course outline in its intended order.', colour: 'mint' },
  { label: 'Build', short: 'Make with care', detail: 'Practical work belongs to the separate invited-adult pilot.', colour: 'coral' },
  { label: 'Share', short: 'Show with care', detail: 'Submitted work is visible only to assigned internal reviewers.', colour: 'gold' },
  { label: 'Grow', short: 'Next step', detail: 'The pilot server, not this guide, controls course progression.', colour: 'lilac' },
] as const;
const pilotStages = [
  { label: 'Learn', short: 'Understand it', detail: 'Start with an idea and try an example.', colour: 'mint' },
  { label: 'Build', short: 'Try it out', detail: 'Arrange real steps and see what they do.', colour: 'coral' },
  { label: 'Share', short: 'Show your work', detail: 'An assigned human reviews submitted work when required.', colour: 'gold' },
  { label: 'Grow', short: 'Keep going', detail: 'The private server decides which course opens next.', colour: 'lilac' },
] as const;

/** A slow, pausable ring; the selected stage changes copy only, never course access. */
export function LearningOrbit({ variant = 'guide' }: { variant?: 'guide' | 'pilot' }) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const stages = variant === 'guide' ? guideStages : pilotStages;
  const stage = stages[selected];
  return (
    <div className={`motion-orbit${paused ? ' motion-orbit-paused' : ''}`} role="group" aria-label="Four selectable learning stages">
      <button className="motion-orbit-pause" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
        {paused ? 'Resume orbit' : 'Pause orbit'}
      </button>
      <div className="motion-orbit-ring" aria-hidden="true" />
      <div className="motion-orbit-rotor">
        {stages.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={`motion-orbit-node motion-orbit-node-${index} motion-orbit-${item.colour}`}
            aria-pressed={selected === index}
            aria-label={`${String(index + 1).padStart(2, '0')}. ${item.label}: ${item.short}`}
            onPointerDown={motionRipple}
            onClick={() => setSelected(index)}
          >
            <span className="motion-orbit-node-content">
              <span className="motion-orbit-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span>{item.label}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="motion-orbit-center" aria-live="polite" aria-atomic="true">
        <span className="motion-orbit-center-glyph" aria-hidden="true">✳</span>
        <strong>{stage.label}</strong>
        <span>{stage.detail}</span>
      </div>
      <span className="motion-visually-hidden">Select a stage to read about it. This does not enrol or save progress.</span>
    </div>
  );
}
