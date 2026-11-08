// Rocket cursor. The nose tip is the exact click point.
// - Turns to fly the way the mouse moves, stretches slightly at speed, sways when idle.
// - Engine glow and flame scale with thrust (mouse speed or scrolling).
// - Canvas effects: a tapered glowing contrail, fiery exhaust cooling to smoke, sparks,
//   and a shockwave ring on click. Sprites are pre-rendered once so it stays smooth.
// - Lock-on: over links, buttons and cards, gold targeting brackets snap around the
//   element with its label pinned to the corner.
// Mouse/trackpad only; never with reduced motion; text fields get the normal text cursor.
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
  kind: 'fire' | 'spark';
}
interface Ring {
  x: number;
  y: number;
  life: number;
}
interface TrailPt {
  x: number;
  y: number;
  t: number;
}

const ROCKET_LEN = 34; // nose to nozzle in px at scale 1
const REST_ANGLE = -32; // tilted like an arrow cursor when idle
const TRAIL_MS = 380;
const TARGETS = 'a, button, label, select, summary, [data-cursor]';

/** A soft radial sprite drawn once and reused for every particle. */
function sprite(stops: [number, string][], size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function RocketCursor() {
  const rocket = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lock = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const el = rocket.current;
    const cv = canvas.current;
    const lk = lock.current;
    if (!el || !cv || !lk || !finePointer() || prefersReducedMotion()) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const root = document.documentElement;

    const FIRE = sprite([
      [0, 'rgba(255,255,240,1)'],
      [0.18, 'rgba(255,230,150,0.95)'],
      [0.45, 'rgba(255,140,50,0.55)'],
      [1, 'rgba(255,70,20,0)'],
    ]);
    const SMOKE = sprite([
      [0, 'rgba(200,205,225,0.5)'],
      [0.6, 'rgba(160,165,185,0.18)'],
      [1, 'rgba(140,145,165,0)'],
    ]);
    const GLOW = sprite([
      [0, 'rgba(255,207,122,0.9)'],
      [1, 'rgba(255,207,122,0)'],
    ]);

    let dpr = 1;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const s = {
      x: 0, y: 0, px: 0, py: 0,
      angle: REST_ANGLE, target: REST_ANGLE,
      scale: 1.2, stretch: 0, thrust: 0, kick: 0, scrollBoost: 0,
      hover: false, still: 0, time: 0, last: performance.now(),
      active: false, drawn: false, reticle: false,
    };
    const parts: Particle[] = [];
    const rings: Ring[] = [];
    const trail: TrailPt[] = [];
    let target: HTMLElement | null = null;
    const box = { x: 0, y: 0, w: 0, h: 0, a: 0 }; // lock-on bracket rectangle + opacity

    const heading = () => {
      const a = (s.angle * Math.PI) / 180;
      return { fx: Math.sin(a), fy: -Math.cos(a) }; // nose direction
    };
    const tail = () => {
      const { fx, fy } = heading();
      const L = ROCKET_LEN * s.scale * (1 + s.stretch * 0.12);
      return { x: s.x - fx * L, y: s.y - fy * L, bx: -fx, by: -fy };
    };

    const emit = (n: number, power: number, kind: Particle['kind'] = 'fire') => {
      const t = tail();
      for (let i = 0; i < n; i++) {
        const spread = (Math.random() - 0.5) * (kind === 'spark' ? 1.4 : 0.6);
        const sp = (kind === 'spark' ? 220 + Math.random() * 260 : 60 + Math.random() * 140) * power;
        const c = Math.cos(spread);
        const si = Math.sin(spread);
        const dx = t.bx * c - t.by * si;
        const dy = t.bx * si + t.by * c;
        const max = kind === 'spark' ? 0.18 + Math.random() * 0.22 : 0.35 + Math.random() * 0.45;
        parts.push({ x: t.x + (Math.random() - 0.5) * 3, y: t.y + (Math.random() - 0.5) * 3, vx: dx * sp, vy: dy * sp, life: max, max, r: kind === 'spark' ? 1 : 2 + Math.random() * 2.4, kind });
      }
      if (parts.length > 500) parts.splice(0, parts.length - 500);
    };

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      s.time += dt;
      if (!s.active) return;

      // --- motion & heading ---
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
      const sway = s.still > 0.6 ? Math.sin(s.time * 2.2) * 3 : 0; // idle hover sway
      const diff = ((s.target + sway - s.angle + 540) % 360) - 180;
      s.angle += diff * Math.min(1, dt * 9);
      s.scrollBoost = Math.max(0, s.scrollBoost - dt * 2.5);
      const want = Math.min(1, speed / 1500 + s.scrollBoost);
      s.thrust = lerp(s.thrust, want, Math.min(1, dt * 8));
      s.kick = Math.max(0, s.kick - dt * 3);
      s.stretch = lerp(s.stretch, Math.min(1, speed / 1800), Math.min(1, dt * 10));
      s.scale = lerp(s.scale, s.hover ? 1.38 : 1.2, Math.min(1, dt * 12));

      const sx = s.scale * (1 - s.stretch * 0.08);
      const sy = s.scale * (1 + s.stretch * 0.12);
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.angle}deg) scale(${sx}, ${sy})`;
      el.style.setProperty('--thrust', (s.thrust + s.kick).toFixed(3));

      // --- emitters ---
      const burn = speed > 80 || s.scrollBoost > 0.05;
      if (burn) {
        emit(Math.min(5, 1 + Math.floor(speed / 450) + (s.scrollBoost > 0.3 ? 2 : 0)), 0.6 + s.thrust);
        if (speed > 900 && Math.random() < 0.5) emit(1, 1, 'spark');
      } else if (Math.random() < 0.22) emit(1, 0.25);

      const tp = tail();
      trail.push({ x: tp.x, y: tp.y, t: now });
      while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();

      // --- lock-on brackets follow the hovered element ---
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        const pad = 6;
        const k = Math.min(1, dt * 16);
        box.x = lerp(box.x, r.left - pad, k);
        box.y = lerp(box.y, r.top - pad, k);
        box.w = lerp(box.w, r.width + pad * 2, k);
        box.h = lerp(box.h, r.height + pad * 2, k);
        box.a = lerp(box.a, 1, Math.min(1, dt * 10));
      } else {
        const k = Math.min(1, dt * 14);
        // no element to lock onto: shrink to a small reticle on the nose (shown on 3D scenes)
        const rs = s.reticle ? 34 : 20;
        box.x = lerp(box.x, s.x - rs / 2, k);
        box.y = lerp(box.y, s.y - rs / 2, k);
        box.w = lerp(box.w, rs, k);
        box.h = lerp(box.h, rs, k);
        box.a = lerp(box.a, s.reticle ? 1 : 0, Math.min(1, dt * 12));
      }
      lk.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
      lk.style.width = `${box.w}px`;
      lk.style.height = `${box.h}px`;
      lk.style.opacity = box.a.toFixed(3);

      // --- draw canvas effects ---
      const busy = parts.length || rings.length || trail.length > 1;
      if (!busy && !s.drawn) return;
      ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
      s.drawn = !!busy;

      // contrail: tapered glowing ribbon from the nozzle
      if (trail.length > 2) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1];
          const b = trail[i];
          const age = 1 - (now - b.t) / TRAIL_MS; // 1 = fresh
          if (age <= 0) continue;
          const w = (1 + s.thrust * 3.5) * age * 2.2;
          ctx.strokeStyle = `rgba(255, ${Math.round(150 + 90 * age)}, ${Math.round(70 + 120 * age)}, ${0.55 * age * (0.35 + s.thrust)})`;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // particles: fire cools to smoke; sparks streak
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const drag = p.kind === 'spark' ? 0.9 : 0.93;
        p.vx *= drag;
        p.vy *= drag;
        if (p.kind === 'fire') p.vy -= 12 * dt; // smoke drifts up a little
        const k = p.life / p.max;
        if (p.kind === 'spark') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(255, 230, 170, ${k})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
          ctx.stroke();
        } else if (k > 0.42) {
          ctx.globalCompositeOperation = 'lighter';
          const r = p.r * (1 + (1 - k) * 2.4) * 2.2;
          ctx.globalAlpha = Math.min(1, k * 1.1);
          ctx.drawImage(FIRE, p.x - r, p.y - r, r * 2, r * 2);
        } else {
          ctx.globalCompositeOperation = 'source-over';
          const r = p.r * (1 + (1 - k) * 3) * 2;
          ctx.globalAlpha = (k / 0.42) * 0.7;
          ctx.drawImage(SMOKE, p.x - r, p.y - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
      }

      // click shockwaves
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.life -= dt * 1.8;
        if (g.life <= 0) {
          rings.splice(i, 1);
          continue;
        }
        const t = 1 - g.life;
        const rad = 6 + (1 - Math.pow(1 - t, 3)) * 46;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 207, 122, ${g.life * 0.9})`;
        ctx.lineWidth = 2 * g.life + 0.5;
        ctx.beginPath();
        ctx.arc(g.x, g.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = g.life * 0.5;
        ctx.drawImage(GLOW, g.x - rad * 0.6, g.y - rad * 0.6, rad * 1.2, rad * 1.2);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
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
        box.x = s.x;
        box.y = s.y;
        root.classList.add('has-cursor');
      }
      const hit = e.target as HTMLElement | null;
      const typing = !!hit?.closest?.('input, textarea, [contenteditable="true"]');
      root.classList.toggle('cursor-text', typing);
      const t = typing ? null : (hit?.closest?.(TARGETS) as HTMLElement | null);
      const onCanvas = !typing && hit?.tagName === 'CANVAS';
      // lock onto real controls; skip giant wrappers so the brackets stay meaningful
      const r = t?.getBoundingClientRect();
      target = t && r && r.width * r.height < window.innerWidth * window.innerHeight * 0.45 ? t : null;
      s.hover = !!t || onCanvas;
      s.reticle = onCanvas;
      setLabel(typing ? '' : (t?.dataset.cursor ?? (onCanvas ? 'Drag' : '')));
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !s.active) return;
      s.kick = 1;
      rings.push({ x: s.x, y: s.y, life: 1 });
      emit(16, 1.6);
      emit(8, 1, 'spark');
    };
    let lastY = window.scrollY;
    const scroll = () => {
      const d = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      s.scrollBoost = Math.min(1, s.scrollBoost + d / 400);
    };
    const leave = () => root.classList.add('cursor-out');
    const enter = () => root.classList.remove('cursor-out');
    const vis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        s.last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', vis);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('pointerenter', enter);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('has-cursor', 'cursor-out', 'cursor-text');
      window.removeEventListener('resize', size);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', vis);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('pointerenter', enter);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="rocket-trail" aria-hidden="true" />
      <div ref={lock} className={`rocket-lock${label ? ' has-label' : ''}`} aria-hidden="true">
        <i className="lk tl" />
        <i className="lk tr" />
        <i className="lk bl" />
        <i className="lk br" />
        <span className="lk-label">{label}</span>
      </div>
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
            <radialGradient id="rk-engine" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="rk-shine" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* engine glow behind the nozzle, brighter with thrust */}
          <ellipse className="rk-engine" cx="14" cy="37" rx="9" ry="7" fill="url(#rk-engine)" />
          {/* engine flame (scaled by --thrust) */}
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
          <path d="M9.6 34 L18.4 34 L19 35 L9 35 Z" fill="#ff9a3c" className="rk-hot" />
          {/* body */}
          <path d="M14 0.5 C21 7 21.5 20 19.5 31.5 L8.5 31.5 C6.5 20 7 7 14 0.5 Z" fill="url(#rk-body)" stroke="#2b2e38" strokeWidth="0.8" />
          {/* panel line and rivets */}
          <path d="M8.2 24 L19.8 24" stroke="#9aa0ae" strokeWidth="0.6" />
          <circle cx="10" cy="26.5" r="0.45" fill="#7b8090" />
          <circle cx="18" cy="26.5" r="0.45" fill="#7b8090" />
          {/* moving highlight sweep */}
          <path className="rk-shine" d="M14 0.5 C21 7 21.5 20 19.5 31.5 L8.5 31.5 C6.5 20 7 7 14 0.5 Z" fill="url(#rk-shine)" />
          {/* nose cone */}
          <path d="M14 0.5 C17.3 3.6 18.7 6.6 19.2 9 L8.8 9 C9.3 6.6 10.7 3.6 14 0.5 Z" fill="#ffcf7a" />
          {/* window */}
          <circle cx="14" cy="16" r="3.6" fill="url(#rk-glass)" stroke="#ffcf7a" strokeWidth="1.3" />
          <circle cx="12.9" cy="14.9" r="0.9" fill="#fff" opacity="0.85" />
          {/* centre fin */}
          <path d="M14 24 L14 34" stroke="#c9822b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
