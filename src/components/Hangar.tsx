// "The Hangar": a 3D showcase of the six machines. One stands on the pedestal at a time;
// arrows, thumbnails, arrow keys or the auto-advance timer bring in the next one.
import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { CORE, useAnswers, useReducedMotion } from '../lib/util';
import { PLACE_LABEL } from '../lib/util';
import { Lazy3D } from './Scenes';
import { MagneticLink } from './fx';

const HangarScene = lazy(() => import('../three/HangarScene'));
const AUTO_MS = 7000;

export function Hangar() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduced = useReducedMotion();
  const answered = useAnswers();
  const root = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const o = CORE[i];
  const n = CORE.length;

  const go = useCallback(
    (next: number, user = true) => {
      setI(((next % n) + n) % n);
      if (user) setAuto(false);
    },
    [n],
  );

  // Auto-advance while the section is on screen and the visitor hasn't taken over.
  useEffect(() => {
    if (!auto || reduced || !root.current) return;
    let visible = false;
    const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting), { threshold: 0.4 });
    io.observe(root.current);
    const id = window.setInterval(() => {
      if (visible) setI((v) => (v + 1) % n);
    }, AUTO_MS);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [auto, reduced, n]);

  // The thin bar under the arrows fills up until the next machine arrives.
  useEffect(() => {
    if (!auto || reduced || !bar.current) return;
    const tw = gsap.fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, duration: AUTO_MS / 1000, ease: 'none' });
    return () => {
      tw.kill();
    };
  }, [auto, reduced, i]);

  // Text slides in for each new machine.
  useEffect(() => {
    if (prefersReducedMotion() || !info.current) return;
    const tw = gsap.fromTo(info.current.querySelectorAll('[data-in]'), { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
    return () => {
      tw.kill();
    };
  }, [i]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  };

  return (
    <div ref={root} className={`hangar hangar-${o.location}`} onKeyDown={onKey}>
      <div className="hangar-stage" data-cursor="Spin">
        <Lazy3D className="scene-fill" fallback={<img className="hangar-fallback" src={o.fallbackImage.src} alt={o.fallbackImage.alt} />}>
          <HangarScene object={o} reducedMotion={reduced} />
        </Lazy3D>
        <span className="hangar-index" aria-hidden="true">
          0{i + 1}
        </span>
        <p className="hangar-hint" aria-hidden="true">Drag to spin</p>
      </div>

      <div className="hangar-info" ref={info} aria-live="polite">
        <p className="hangar-count" data-in>
          <span>{String(i + 1).padStart(2, '0')}</span> / {String(n).padStart(2, '0')}
          <span className={`hangar-place place-${o.location}`}>{PLACE_LABEL[o.location]} · {o.year}</span>
        </p>
        <h3 className="hangar-name" data-in>
          {o.shortName}
        </h3>
        <p className="hangar-line" data-in>
          {o.character}
        </p>
        <p className="hangar-q" data-in>
          “{o.question}”
        </p>
        <div className="hangar-cta" data-in>
          <MagneticLink href={`#/object/${o.id}`} className="btn" cursor="Open">
            Open the story →
          </MagneticLink>
          {answered[o.id] && <span className="hangar-done">✦ You answered this one</span>}
        </div>

        <div className="hangar-nav" data-in>
          <button type="button" className="hangar-arrow" onClick={() => go(i - 1)} aria-label="Previous machine">
            ←
          </button>
          <button type="button" className="hangar-arrow" onClick={() => go(i + 1)} aria-label="Next machine">
            →
          </button>
          <span className="hangar-progress" aria-hidden="true">
            <span ref={bar} style={{ transform: auto && !reduced ? undefined : 'scaleX(0)' }} />
          </span>
        </div>
      </div>

      <div className="hangar-thumbs" role="tablist" aria-label="Choose a machine">
        {CORE.map((m, k) => (
          <button key={m.id} type="button" role="tab" aria-selected={k === i} className={`hangar-thumb${k === i ? ' is-on' : ''}`} onClick={() => go(k)} data-cursor={m.shortName.split(' ')[0]}>
            <img src={m.fallbackImage.src} alt="" loading="lazy" />
            <span>{m.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
