import type { PointerEvent } from 'react';

/** Update CSS coordinates on a hovered card without React renders or remote calls. */
export function motionSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch') return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
}
