// Rocket cursor. The nose tip is the click point. The rocket turns to fly the way the
// mouse moves, its engine burns brighter with speed and leaves a fiery exhaust trail
// (drawn on a canvas) that cools into smoke. Clicking fires a short thrust burst.
// Over links it grows and shows a small label; in text fields the normal text cursor
// returns. Only on mouse/trackpad, and never with reduced motion.
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/gsap';
import { finePointer } from '../lib/motion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}

const ROCKET_LEN = 34; // nose to nozzle, in px at scale 1
const REST_ANGLE = -32; // tilted like a normal arrow cursor when idle

export function RocketCursor() {
  const rocket = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const el = rocket.current;
    const cv = canvas.current;
    const tg = tag.current;
    if (!el || !cv || !tg || !finePointer() || prefersReducedMotion()) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const root = document.documentElement;

    let dpr = 1;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const s = { x: 0, y: 0, px: 0, py: 0, angle: REST_ANGLE, target: REST_ANGLE, scale: 1, hover: false, thrust: 0, kick: 0, still: 0, last: performance.now(), active: false, drawn: false };
    const parts: Particle[] = [];

    const tail = () => {
      const a = (s.angle * Math.PI) / 180;
      const L = ROCKET_LEN * s.scale;
      // nose direction is (sin a, -cos a); the nozzle sits behind it
      return { x: s.x - Math.sin(a) * L, y: s.y + Math.cos(a) * L, bx: -Math.sin(a), by: Math.cos(a) };
    };

    const emit = (n: number, power: number) => {
      const t = tail();
      for (let i = 0; i < n; i++) {
        const spread = (Math.random() - 0.5) * 0.7;
        const sp = (60 + Math.random() * 140) * power;
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        const dx = t.bx * cos - t.by * sin;
        const dy = t.bx * sin + t.by * cos;
        const max = 0.35 + Math.random() * 0.45;
        parts.push({ x: t.x + (Math.random() - 0.5) * 3, y: t.y + (Math.random() - 0.5) * 3, vx: dx * sp, vy: dy * sp, life: max, max, r: 1.5 + Math.random() * 2.2 });
      }
      if (parts.length > 400) parts.splice(0, parts.length - 400);
    };

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (!s.active) return;

      // heading from movement; drift back to the resting tilt when still
      const dx = s.x - s.px;
      const dy = s.y - s.py;
      s.px = s.x;
      s.py = s.y;
      const speed = Math.hypot(dx, dy) / Math.max(dt, 0.001);
      if (speed > 80) {
        s.target = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        s.still = 0;
      } else {
        s.still += dt;
        if (s.still > 0.3) s.target = REST_ANGLE;
      }
      const diff = ((s.target - s.angle + 540) % 360) - 180;
      s.angle += diff * Math.min(1, dt * 9);
      s.scale += ((s.hover ? 1.3 : 1) - s.scale) * Math.min(1, dt * 12);
      const want = Math.min(1, speed / 1600);
      s.thrust += (want - s.thrust) * Math.min(1, dt * 8);
      s.kick = Math.max(0, s.kick - dt * 3);

      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.angle}deg) scale(${s.scale})`;
      el.style.setProperty('--thrust', (s.thrust + s.kick).toFixed(3));
      tg.style.transform = `translate3d(${s.x + 26}px, ${s.y + 20}px, 0)`;

      // exhaust: steady while moving, a faint idle wisp otherwise
      if (speed > 80) emit(Math.min(5, 1 + Math.floor(speed / 500)), 0.6 + s.thrust);
      else if (Math.random() < 0.25) emit(1, 0.25);

      // draw: hot core with additive blending, cooling to drifting smoke
      if (parts.length || s.drawn) {
        ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
        s.drawn = parts.length > 0;
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life -= dt;
          if (p.life <= 0) {
            parts.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.93;
          p.vy *= 0.93;
          const k = p.life / p.max; // 1 = fresh, 0 = gone
          const r = p.r * (1 + (1 - k) * 2.6);
          if (k > 0.45) {
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
            const hot = (k - 0.45) / 0.55;
            g.addColorStop(0, `rgba(255, ${Math.round(200 + 55 * hot)}, ${Math.round(140 + 115 * hot)}, ${0.9 * k})`);
            g.addColorStop(0.4, `rgba(255, ${Math.round(140 + 60 * hot)}, 60, ${0.5 * k})`);
            g.addColorStop(1, 'rgba(255, 90, 20, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(190, 195, 215, ${0.22 * (k / 0.45)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
    raf = requestAnimationFrame(tick);

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.active) {
        // hide the system cursor only once the rocket is under the mouse
        s.active = true;
        s.px = s.x;
        s.py = s.y;
        root.classList.add('has-cursor');
      }
      const t = (e.target as HTMLElement | null)?.closest?.('a, button, label, select, summary, [data-cursor], canvas, input, textarea, [contenteditable="true"]') as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      root.classList.toggle('cursor-text', typing);
      s.hover = !!t && !typing;
      setLabel(typing ? '' : (t?.dataset.cursor ?? (t?.tagName === 'CANVAS' ? 'Drag' : '')));
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !s.active) return;
      s.kick = 0.9;
      emit(18, 1.6);
    };
    const leave = () => root.classList.add('cursor-out');
    const enter = () => root.classList.remove('cursor-out');

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    document.documentElement.addEventListener('pointerenter', enter);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('has-cursor', 'cursor-out', 'cursor-text');
      window.removeEventListener('resize', size);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.documentElement.removeEventListener('pointerenter', enter);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="rocket-trail" aria-hidden="true" />
      <div ref={rocket} className="rocket-cursor" aria-hidden="true">
        <svg width="28" height="58" viewBox="0 0 28 58">
          <defs>
            <linearGradient id="rk-body" x1="0" x2="1">
              <stop offset="0" stopColor="#8e93a3" />
              <stop offset="0.35" stopColor="#ffffff" />
              <stop offset="0.7" stopColor="#dfe2ea" />
              <stop offset="1" stopColor="#7b8090" />
            </linearGradient>
            <linearGradient id="rk-fin" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffd98f" />
              <stop offset="1" stopColor="#c9822b" />
            </linearGradient>
            <radialGradient id="rk-glass" cx="0.35" cy="0.35" r="0.7">
              <stop offset="0" stopColor="#9fd0ff" />
              <stop offset="0.5" stopColor="#2a4f8f" />
              <stop offset="1" stopColor="#0d1830" />
            </radialGradient>
            <linearGradient id="rk-flame" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.25" stopColor="#ffe9a8" />
              <stop offset="0.6" stopColor="#ff9a3c" />
              <stop offset="1" stopColor="#ff4d1a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* engine flame (scaled by speed via --thrust) */}
          <g className="rk-flame-wrap">
            <g className="rk-flame">
              <path d="M9.5 35 Q14 56 14 56 Q14 56 18.5 35 Z" fill="url(#rk-flame)" />
              <path d="M11.5 35 Q14 47 14 47 Q14 47 16.5 35 Z" fill="#fff" opacity="0.85" />
            </g>
          </g>
          {/* fins */}
          <path d="M8 22 L1.5 33 L2.5 35 L9 31 Z" fill="url(#rk-fin)" />
          <path d="M20 22 L26.5 33 L25.5 35 L19 31 Z" fill="url(#rk-fin)" />
          {/* nozzle */}
          <path d="M10 31 L18 31 L19 35 L9 35 Z" fill="#4b4f5c" />
          {/* body */}
          <path d="M14 0.5 C21 7 21.5 20 19.5 31.5 L8.5 31.5 C6.5 20 7 7 14 0.5 Z" fill="url(#rk-body)" stroke="#2b2e38" strokeWidth="0.8" />
          {/* nose cone */}
          <path d="M14 0.5 C17.3 3.6 18.7 6.6 19.2 9 L8.8 9 C9.3 6.6 10.7 3.6 14 0.5 Z" fill="#ffcf7a" />
          {/* window */}
          <circle cx="14" cy="16" r="3.6" fill="url(#rk-glass)" stroke="#ffcf7a" strokeWidth="1.3" />
          <circle cx="12.9" cy="14.9" r="0.9" fill="#fff" opacity="0.8" />
          {/* centre fin */}
          <path d="M14 24 L14 34" stroke="#c9822b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div ref={tag} className={`rocket-label${label ? ' is-on' : ''}`} aria-hidden="true">
        {label}
      </div>
    </>
  );
}
