// Rocket cursor: one small rocket whose nose tip is the exact click point.
// It turns gently toward the direction you move. At rest the engine flame is small;
// while it travels the flame grows a little and leaves a short, soft smoke trail
// that fades within a second.
// Over links it grows slightly; in text fields the normal text cursor returns.
// Mouse/trackpad only; never with reduced motion.
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/gsap';
import { finePointer } from '../lib/motion';

const REST_ANGLE = -32; // tilted like an arrow cursor when idle
const NOZZLE = 27; // px from the nose tip to the nozzle at scale 1 (svg y=35 of 54, drawn 42 px tall)

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}

/** Soft round smoke sprite, drawn once and reused for every puff. */
function smokeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(215,218,232,0.55)');
  grad.addColorStop(0.55, 'rgba(180,184,200,0.2)');
  grad.addColorStop(1, 'rgba(160,164,180,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Warm glow for the hot exhaust right behind the nozzle. */
function emberSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,236,190,0.95)');
  grad.addColorStop(0.35, 'rgba(255,150,60,0.6)');
  grad.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}
const TARGETS = 'a, button, label, select, summary, [data-cursor], canvas';

export function RocketCursor() {
  const rocket = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = rocket.current;
    const cv = canvas.current;
    if (!el || !cv || !finePointer() || prefersReducedMotion()) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const SMOKE = smokeSprite();
    const EMBER = emberSprite();
    const puffs: Puff[] = [];
    let drawn = false;
    let carry = 0; // fractional puffs carried between frames
    let dpr = 1;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);
    const root = document.documentElement;
    const s = {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      angle: REST_ANGLE,
      target: REST_ANGLE,
      scale: 1,
      hover: false,
      thrust: 0,
      bend: 0,
      still: 0,
      last: performance.now(),
      active: false,
      moving: false,
    };

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (!s.active) return;
      const dx = s.x - s.px;
      const dy = s.y - s.py;
      s.px = s.x;
      s.py = s.y;
      const speed = Math.hypot(dx, dy) / Math.max(dt, 0.001);
      if (speed > 120) {
        s.target = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        s.still = 0;
      } else {
        s.still += dt;
        if (s.still > 0.25) s.target = REST_ANGLE;
      }
      const diff = ((s.target - s.angle + 540) % 360) - 180;
      const turn = diff * Math.min(1, dt * 8);
      s.angle += turn;
      // when the rocket turns, the exhaust swings out the other way, like a real flame
      const turnRate = turn / Math.max(dt, 0.001); // degrees per second
      s.bend += (Math.max(-14, Math.min(14, -turnRate * 0.06)) - s.bend) * Math.min(1, dt * 10);
      s.scale += ((s.hover ? 1.15 : 1) - s.scale) * Math.min(1, dt * 12);
      s.thrust += (Math.min(1, speed / 1800) - s.thrust) * Math.min(1, dt * 8);
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.angle}deg) scale(${s.scale})`;
      el.style.setProperty('--thrust', s.thrust.toFixed(3));
      el.style.setProperty('--bend', s.bend.toFixed(2) + 'deg');
      const moving = s.thrust > 0.08;
      if (moving !== s.moving) {
        s.moving = moving;
        el.classList.toggle('is-moving', moving);
      }

      // smoke: only while travelling, a few soft puffs from just behind the flame
      const a = (s.angle * Math.PI) / 180;
      const bx = -Math.sin(a); // backwards, out of the nozzle
      const by = Math.cos(a);
      if (speed > 150) {
        carry += Math.min(2.2, speed / 650);
        while (carry >= 1) {
          carry -= 1;
          const L = NOZZLE * s.scale + 5 + s.thrust * 6;
          const max = 0.55 + Math.random() * 0.4;
          const sp = 18 + Math.random() * 30;
          puffs.push({
            x: s.x + bx * L + (Math.random() - 0.5) * 3,
            y: s.y + by * L + (Math.random() - 0.5) * 3,
            vx: bx * sp + (Math.random() - 0.5) * 14,
            vy: by * sp + (Math.random() - 0.5) * 14,
            life: max,
            max,
            r: 2.2 + Math.random() * 1.6,
          });
        }
        if (puffs.length > 90) puffs.splice(0, puffs.length - 90);
      } else {
        carry = 0;
      }

      if (!puffs.length && !drawn) return;
      ctx.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
      drawn = puffs.length > 0;
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt;
        if (p.life <= 0) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt - 6 * dt; // smoke drifts up a touch
        p.vx *= 0.94;
        p.vy *= 0.94;
        const k = p.life / p.max; // 1 = fresh, 0 = gone
        const r = p.r * (1 + (1 - k) * 2.4);
        if (k > 0.78) {
          // the first moment of a puff is still hot: a small warm glow
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (k - 0.78) * 2.2;
          ctx.drawImage(EMBER, p.x - r, p.y - r, r * 2, r * 2);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, k * 1.3) * 0.55;
        ctx.drawImage(SMOKE, p.x - r * 1.3, p.y - r * 1.3, r * 2.6, r * 2.6);
      }
      ctx.globalAlpha = 1;
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
        root.classList.add('has-cursor');
      }
      const hit = e.target as HTMLElement | null;
      const typing = !!hit?.closest?.('input, textarea, [contenteditable="true"]');
      root.classList.toggle('cursor-text', typing);
      s.hover = !typing && !!hit?.closest?.(TARGETS);
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
    document.addEventListener('visibilitychange', vis);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('pointerenter', enter);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('has-cursor', 'cursor-out', 'cursor-text');
      window.removeEventListener('resize', size);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', vis);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('pointerenter', enter);
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="rocket-smoke" aria-hidden="true" />
      <div ref={rocket} className="rocket-cursor" aria-hidden="true">
        <svg width="22" height="42" viewBox="0 0 28 54">
          <defs>
            <linearGradient id="rk-body" x1="0" x2="1">
              <stop offset="0" stopColor="#9aa0ae" />
              <stop offset="0.4" stopColor="#ffffff" />
              <stop offset="1" stopColor="#8a8f9c" />
            </linearGradient>
            {/* outer flame: deep orange fading to nothing at the tip */}
            <linearGradient id="rk-fl-outer" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ff9a2e" />
              <stop offset="0.45" stopColor="#ff5a12" stopOpacity="0.85" />
              <stop offset="1" stopColor="#c81e00" stopOpacity="0" />
            </linearGradient>
            {/* middle flame: yellow */}
            <linearGradient id="rk-fl-mid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff1a8" />
              <stop offset="0.6" stopColor="#ffc23d" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
            </linearGradient>
            {/* white-hot core */}
            <linearGradient id="rk-fl-core" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
            </linearGradient>
            <filter id="rk-soft" x="-50%" y="-20%" width="200%" height="140%">
              <feGaussianBlur stdDeviation="0.55" />
            </filter>
            <filter id="rk-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          {/* small realistic engine flame: glow, three flickering layers, blue base */}
          <g className="rk-flame">
            <ellipse className="rk-fl-glow" cx="14" cy="38" rx="4.5" ry="4" fill="#ff8a2a" filter="url(#rk-glow)" />
            <g className="rk-fl-a" filter="url(#rk-soft)">
              <path d="M9.6 35 C9.4 38.5 11.4 41 12.3 43.5 C12.9 45.2 13.5 46.6 14 47.6 C14.5 46.6 15.1 45.2 15.7 43.5 C16.6 41 18.6 38.5 18.4 35 Z" fill="url(#rk-fl-outer)" />
            </g>
            <g className="rk-fl-b" filter="url(#rk-soft)">
              <path d="M11 35 C10.9 37.6 12.3 39.6 13 41.6 C13.4 42.7 13.8 43.6 14 44.2 C14.2 43.6 14.6 42.7 15 41.6 C15.7 39.6 17.1 37.6 17 35 Z" fill="url(#rk-fl-mid)" />
            </g>
            <g className="rk-fl-c">
              <path d="M12.3 35 C12.3 36.6 13.2 38 13.6 39.4 C13.8 40 13.9 40.4 14 40.7 C14.1 40.4 14.2 40 14.4 39.4 C14.8 38 15.7 36.6 15.7 35 Z" fill="url(#rk-fl-core)" />
            </g>
            {/* faint blue at the nozzle, where real exhaust burns hottest */}
            <ellipse cx="14" cy="35.6" rx="3.4" ry="0.9" fill="#7fb6ff" opacity="0.55" filter="url(#rk-soft)" />
          </g>
          {/* fins */}
          <path d="M8 22 L2 33 L9 31 Z" fill="#ffcf7a" />
          <path d="M20 22 L26 33 L19 31 Z" fill="#ffcf7a" />
          {/* nozzle */}
          <path d="M10 31 L18 31 L19 35 L9 35 Z" fill="#4b4f5c" />
          {/* body */}
          <path d="M14 0.5 C21 7 21.5 20 19.5 31.5 L8.5 31.5 C6.5 20 7 7 14 0.5 Z" fill="url(#rk-body)" stroke="#23252e" strokeWidth="1" />
          {/* nose cone */}
          <path d="M14 0.5 C17.3 3.6 18.7 6.6 19.2 9 L8.8 9 C9.3 6.6 10.7 3.6 14 0.5 Z" fill="#ffcf7a" />
          {/* window */}
          <circle cx="14" cy="16" r="3.4" fill="#1f3a6e" stroke="#ffcf7a" strokeWidth="1.2" />
        </svg>
      </div>
    </>
  );
}
