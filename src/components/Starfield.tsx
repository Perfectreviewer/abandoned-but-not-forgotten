import { useEffect, useRef } from 'react';

/** A cheap 2D-canvas starfield behind every page. Twinkles gently unless reduced motion is on. */
export function Starfield({ still }: { still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let stars: { x: number; y: number; r: number; p: number }[] = [];

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((window.innerWidth * window.innerHeight) / 4200);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() < 0.08 ? 1.4 : Math.random() * 0.9 + 0.2,
        p: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of stars) {
        const a = still ? 0.7 : 0.45 + 0.4 * Math.sin(t / 1400 + s.p);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#e8ecff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still) raf = requestAnimationFrame(draw);
    };

    size();
    draw(0);
    const onResize = () => {
      size();
      if (still) draw(0);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [still]);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
