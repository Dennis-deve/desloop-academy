import { useState } from 'react';
import { publicStages } from '@/curriculum/public';

/** The nine actual draft-stage names, never achievement/uptime statistics. */
export function MotionTicker() {
  const [paused, setPaused] = useState(false);
  const stages = publicStages.map((stage) => ({ number: stage.number, title: stage.title }));
  return (
    <div className={`motion-ticker${paused ? ' motion-ticker-paused' : ''}`} role="group" aria-label="Unreviewed draft course stages">
      <div className="motion-ticker-clip">
        <div className="motion-ticker-track">
          {[false, true].map((duplicate) => (
            <ul key={String(duplicate)} className="motion-ticker-list" aria-hidden={duplicate || undefined}>
              {stages.map((stage) => (
                <li key={stage.number}>
                  <span aria-hidden="true">✳</span>
                  <span>Stage {String(stage.number).padStart(2, '0')} · {stage.title}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button className="motion-ticker-toggle" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
        {paused ? 'Resume stage ticker' : 'Pause stage ticker'}
      </button>
    </div>
  );
}
