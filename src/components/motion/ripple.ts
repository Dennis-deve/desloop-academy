import type { PointerEvent } from 'react';

/** Decorative feedback only. No browser storage, requests, or stateful permissions. */
export function motionRipple(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'motion-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  target.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 640);
}
