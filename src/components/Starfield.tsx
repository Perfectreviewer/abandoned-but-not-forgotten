import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  p: number; // twinkle phase
  z: number; // depth: 0.15 (far) .. 1 (near)
  c: string;
}

const TINTS = ['232,236,255', '232,236,255', '232,236,255', '190,210,255', '255,226,190'];

/**
 * Deep-space backdrop behind every page: three depth layers of stars that drift at
 * different speeds as you scroll and move the mouse, so the page feels like it has
 * depth. Nearer stars are bigger and move more. Static when reduced motion is on.
 */
export function Starfield({ still }: { still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    const m = { x: 0, y: 0, tx: 0, ty: 0 };

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 3000);
      stars = Array.from({ length: n }, () => {
        const layer = Math.random();
        const z = layer < 0.6 ? 0.15 + Math.random() * 0.2 : layer < 0.9 ? 0.4 + Math.random() * 0.25 : 0.75 + Math.random() * 0.25;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.25 + z * (Math.random() < 0.06 ? 1.6 : 0.95),
          p: Math.random() * Math.PI * 2,
          z,
          c: TINTS[Math.floor(Math.random() * TINTS.length)],
        };
      });
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      m.x += (m.tx - m.x) * 0.04;
      m.y += (m.ty - m.y) * 0.04;
      const sy = still ? 0 : window.scrollY;
      for (const s of stars) {
        // parallax: near stars travel further with scroll and pointer
        let y = (s.y - sy * s.z * 0.18 + m.y * s.z * 14) % h;
        if (y < 0) y += h;
        let x = (s.x + m.x * s.z * 18) % w;
        if (x < 0) x += w;
        const a = still ? 0.6 + s.z * 0.3 : (0.35 + s.z * 0.45) * (0.7 + 0.3 * Math.sin(t / 1300 + s.p));
        ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.5) {
          // the brightest stars get a soft cross flare
          ctx.fillStyle = `rgba(${s.c},${(a * 0.25).toFixed(3)})`;
          ctx.fillRect(x - s.r * 3.5, y - 0.4, s.r * 7, 0.8);
          ctx.fillRect(x - 0.4, y - s.r * 3.5, 0.8, s.r * 7);
        }
      }
      if (!still) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      m.tx = e.clientX / w - 0.5;
      m.ty = e.clientY / h - 0.5;
    };
    const onResize = () => {
      size();
      if (still) draw(0);
    };

    size();
    draw(0);
    window.addEventListener('resize', onResize);
    if (!still) window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [still]);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
