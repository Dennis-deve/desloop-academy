import { useEffect, useRef } from 'react';

type Dot = { x: number; y: number; dx: number; dy: number; radius: number; colour: string };

/** Decorative only. At most 28 dots / 24fps; pauses off-screen, hidden, reduced-motion or save-data. */
export function MotionParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let visible = true;
    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let pointer: { x: number; y: number } | null = null;
    let seed = 1907;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const canAnimate = () => !preference.matches && !saveData && visible && !document.hidden;
    const draw = (advance: boolean) => {
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        if (advance) {
          dot.x = (dot.x + dot.dx + width) % width;
          dot.y = (dot.y + dot.dy + height) % height;
          if (pointer) {
            const vx = dot.x - pointer.x;
            const vy = dot.y - pointer.y;
            const distance = Math.hypot(vx, vy);
            if (distance > 2 && distance < 95) {
              const nudge = (1 - distance / 95) * 1.3;
              dot.x = Math.max(0, Math.min(width, dot.x + (vx / distance) * nudge));
              dot.y = Math.max(0, Math.min(height, dot.y + (vy / distance) * nudge));
            }
          }
        }
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, 2 * Math.PI);
        ctx.fillStyle = dot.colour;
        ctx.fill();
      }
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      canvas.dataset.motion = 'static';
    };
    const tick = (now: number) => {
      frame = 0;
      if (!canAnimate() || !width || !height) return;
      if (now - lastFrame >= 1000 / 24) {
        draw(true);
        lastFrame = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (!canAnimate() || !width || !height) {
        stop();
        if (width && height) draw(false);
      } else if (!frame) {
        canvas.dataset.motion = 'running';
        frame = requestAnimationFrame(tick);
      }
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(0, Math.round(rect.width));
      height = Math.max(0, Math.round(rect.height));
      if (!width || !height) { stop(); return; }
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 1907;
      dots = Array.from({ length: width < 600 ? 16 : 28 }, () => ({
        x: random() * width,
        y: random() * height,
        dx: (random() - 0.5) * 0.52,
        dy: (random() - 0.5) * 0.52,
        radius: 1.1 + random() * 1.8,
        colour: random() > 0.5 ? 'rgba(142,245,226,.72)' : 'rgba(241,200,255,.66)',
      }));
      draw(false);
      sync();
    };
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType === 'touch' || preference.matches) return;
      const rect = host.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = () => { pointer = null; };
    const onVisibility = () => sync();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    if (!resizeObserver) window.addEventListener('resize', resize);
    const intersection = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.02 })
      : null;
    intersection?.observe(host);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    preference.addEventListener('change', onVisibility);
    resize();
    return () => {
      stop();
      resizeObserver?.disconnect();
      intersection?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      preference.removeEventListener('change', onVisibility);
    };
  }, []);
  return <canvas ref={ref} className="motion-particles" aria-hidden="true" />;
}
