import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { SplitReveal } from '../components/fx';
import { gsap, useGsap } from '../lib/gsap';
import { finePointer } from '../lib/motion';
import { rng } from '../three/noise';
import { THEMES, type Theme } from '../data/types';
import { answers, byId, OBJECTS, useAnswers, type Answer } from '../lib/util';

// Where each theme's cluster sits in the 1000 x 600 sky.
const CENTERS: Record<Theme, [number, number]> = {
  water: [210, 190],
  life: [500, 130],
  geology: [790, 210],
  tools: [330, 440],
  'deep-space': [700, 450],
};

// Deterministic spread inside a cluster, so a star never jumps between visits.
function offset(key: string, i: number): [number, number] {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = ((h % 360) * Math.PI) / 180 + i * 2.1;
  const r = 30 + ((h >> 8) % 55);
  return [Math.cos(a) * r, Math.sin(a) * r * 0.8];
}

/** FR-12: answers shown as stars grouped by theme. Stored only in this browser. */
export default function Constellation() {
  const all = useAnswers();
  const list = Object.values(all);
  const [sel, setSel] = useState<Answer | null>(null);
  const sky = useRef<HTMLDivElement>(null);
  const field = useMemo(() => {
    const r = rng(2026);
    return Array.from({ length: 160 }, () => ({ x: r() * 1000, y: r() * 600, s: r() * 1.4 + 0.3, d: r() * 4, layer: r() < 0.5 ? 1 : 2 }));
  }, []);

  // GSAP: deep-field stars drift with the pointer for depth, and a shooting star crosses now and then.
  useGsap(sky, (reduced) => {
    if (reduced) return;
    gsap.to('.sky-twinkle', { opacity: 0.15, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.03, from: 'random' } });
    const shoot = () => {
      const y = 40 + Math.random() * 220;
      gsap.fromTo('.shooting', { x: -120, y, opacity: 0 }, { x: 1150, y: y + 160, opacity: 1, duration: 1.4, ease: 'power2.in', onComplete: () => void gsap.set('.shooting', { opacity: 0 }) });
    };
    const loop = gsap.delayedCall(2, function again() {
      shoot();
      loop.restart(true);
      loop.delay(5 + Math.random() * 6);
    });
    if (!finePointer() || !sky.current) return;
    const l1x = gsap.quickTo('.sky-l1', 'x', { duration: 1.2, ease: 'power3' });
    const l1y = gsap.quickTo('.sky-l1', 'y', { duration: 1.2, ease: 'power3' });
    const l2x = gsap.quickTo('.sky-l2', 'x', { duration: 1.2, ease: 'power3' });
    const l2y = gsap.quickTo('.sky-l2', 'y', { duration: 1.2, ease: 'power3' });
    const fx = gsap.quickTo('.sky-fg', 'x', { duration: 1.2, ease: 'power3' });
    const fy = gsap.quickTo('.sky-fg', 'y', { duration: 1.2, ease: 'power3' });
    sky.current.addEventListener('pointermove', (e) => {
      const r = sky.current!.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      l1x(px * -10); l1y(py * -8); l2x(px * -22); l2y(py * -16); fx(px * 14); fy(py * 10);
    });
  });
  const [confirmClear, setConfirmClear] = useState(false);

  const byTheme = (Object.keys(THEMES) as Theme[]).map((t) => ({
    theme: t,
    stars: list
      .filter((a) => a.theme === t)
      .sort((a, b) => a.objectId.localeCompare(b.objectId))
      .map((a, i) => {
        const [cx, cy] = CENTERS[t];
        const [dx, dy] = offset(a.objectId, i);
        return { a, x: cx + dx, y: cy + dy };
      }),
  }));

  const selObj = sel ? byId(sel.objectId) : null;
  const selChoice = selObj?.nextMissionChoices.find((c) => c.id === sel?.choiceId);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">✦ Saved only on this device</p>
        <SplitReveal as="h1" text="Your Question Constellation" onLoad delay={0.3} />
        <p className="lede">
          {list.length === 0
            ? 'Your sky is empty for now. Finish any story and answer its unfinished question to light your first star.'
            : `You have answered ${list.length} of ${OBJECTS.length} unfinished questions. Stars cluster by what your ideas are about.`}
        </p>
      </header>

      <div className="sky-wrap" ref={sky} data-cursor="Explore">
        <svg className="sky" viewBox="0 0 1000 600" role="img" aria-label={`Constellation with ${list.length} stars`}>
          <defs>
            <linearGradient id="trail"><stop offset="0%" stopColor="#fff" stopOpacity="0" /><stop offset="100%" stopColor="#fff" stopOpacity="1" /></linearGradient>
            <radialGradient id="glow">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[1, 2].map((layer) => (
            <g key={layer} className={`sky-l${layer}`} aria-hidden="true">
              {field.filter((f) => f.layer === layer).map((f, i) => (
                <circle key={i} className="sky-twinkle" cx={f.x} cy={f.y} r={f.s * (layer === 2 ? 1.2 : 0.8)} fill="#dfe6ff" opacity={0.55} />
              ))}
            </g>
          ))}
          <line className="shooting" x1={0} y1={0} x2={90} y2={14} stroke="url(#trail)" strokeWidth={2} strokeLinecap="round" opacity={0} />
          <g className="sky-fg">
          {byTheme.map(({ theme, stars }) => {
            const [cx, cy] = CENTERS[theme];
            const color = THEMES[theme].color;
            return (
              <g key={theme}>
                <text x={cx} y={cy + 105} textAnchor="middle" className="sky-label" fill={color} opacity={stars.length ? 0.95 : 0.35}>
                  {THEMES[theme].label}
                </text>
                {stars.length > 1 && (
                  <motion.polyline
                    points={stars.map((s) => `${s.x},${s.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.45}
                    strokeWidth={1.2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2 }}
                  />
                )}
                {stars.length === 0 && <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.25} />}
                {stars.map((s, i) => (
                  <motion.g
                    key={s.a.objectId}
                    initial={{ opacity: 0, scale: 0.2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 * i, type: 'spring' }}
                    style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                  >
                    <circle cx={s.x} cy={s.y} r={22} fill="url(#glow)" opacity={0.35} />
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={sel?.objectId === s.a.objectId ? 9 : 6}
                      fill={color}
                      className="sky-star"
                      tabIndex={0}
                      role="button"
                      aria-label={`${byId(s.a.objectId)?.shortName}: ${THEMES[theme].label}`}
                      onClick={() => setSel(s.a)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(s.a))}
                    />
                  </motion.g>
                ))}
              </g>
            );
          })}
          </g>
        </svg>

        {selObj && selChoice && sel && (
          <div className="sky-detail" aria-live="polite">
            <p className="eyebrow">{selObj.shortName}</p>
            <p className="big-q small-q">{selObj.question}</p>
            <p>
              You chose: <strong>{selChoice.label}</strong>
            </p>
            {sel.reason && <p className="reason-quote">“{sel.reason}”</p>}
            <a href={`#/object/${selObj.id}`} className="small">Change my answer →</a>
          </div>
        )}
      </div>

      {list.length > 0 && (
        <section className="section-tight">
          <h2 className="h3">All your answers</h2>
          <ul className="answer-list">
            {list.map((a) => {
              const ob = byId(a.objectId);
              const c = ob?.nextMissionChoices.find((x) => x.id === a.choiceId);
              if (!ob || !c) return null;
              return (
                <li key={a.objectId}>
                  <span className="swatch" style={{ background: THEMES[a.theme].color }} aria-hidden="true" />
                  <a href={`#/object/${ob.id}`}>{ob.shortName}</a>: {c.label}
                  {a.reason && <span className="muted"> · “{a.reason}”</span>}
                </li>
              );
            })}
          </ul>
          {confirmClear ? (
            <p>
              Remove all your stars from this device?{' '}
              <button className="btn small danger" onClick={() => { answers.clear(); setSel(null); setConfirmClear(false); }}>Yes, clear</button>{' '}
              <button className="btn small ghost" onClick={() => setConfirmClear(false)}>Keep them</button>
            </p>
          ) : (
            <button className="btn small ghost" onClick={() => setConfirmClear(true)}>Clear my constellation</button>
          )}
        </section>
      )}

      <section className="section-tight">
        <h2 className="h3">Questions still waiting for you</h2>
        <ul className="todo-list">
          {OBJECTS.filter((o) => !all[o.id]).map((o) => (
            <li key={o.id}>
              <a href={`#/object/${o.id}`}>{o.shortName}</a>: <span className="muted">{o.question}</span>
            </li>
          ))}
          {OBJECTS.every((o) => all[o.id]) && <li>None. You answered every unfinished question. ✦</li>}
        </ul>
      </section>
    </div>
  );
}
