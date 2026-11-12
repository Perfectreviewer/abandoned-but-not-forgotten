// Intro loader, shown on the first visit in a browser session: a 3D lander touches
// down on the Moon while the counter runs, then the screen lifts to reveal the site.
// Falls back to a plain count if WebGL is unavailable, and can never get stuck:
// a safety timer lifts it regardless.
import { Component, lazy, Suspense, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { stopScroll } from '../lib/motion';
import { hasWebGL } from '../lib/util';

const LandingScene = lazy(() => import('../three/LandingScene'));

class Quiet extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Preloader() {
  const [show, setShow] = useState(() => {
    try {
      return !prefersReducedMotion() && !sessionStorage.getItem('abnf.intro');
    } catch {
      return false;
    }
  });
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  const webgl = hasWebGL();

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    gsap
      .timeline({
        onComplete: () => {
          stopScroll(false);
          setShow(false);
        },
      })
      .to('.pre-inner', { autoAlpha: 0, y: -24, duration: 0.5, ease: 'power3.in' })
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.2');
  }, []);

  const onProgress = useCallback((p: number) => {
    if (num.current) num.current.textContent = String(Math.round(p * 100)).padStart(3, '0');
    if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    if (status.current) status.current.textContent = p < 0.3 ? 'Beginning descent' : p < 0.88 ? 'Descending' : 'Touchdown';
  }, []);

  useLayoutEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem('abnf.intro', '1');
    } catch {
      /* storage blocked: the intro may replay, which is harmless */
    }
    stopScroll(true);
    const words = gsap.fromTo('.pre-word', { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out' });
    let plain: gsap.core.Tween | null = null;
    if (!webgl) {
      const o = { v: 0 };
      plain = gsap.to(o, { v: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: () => onProgress(o.v), onComplete: finish });
    }
    const safety = window.setTimeout(finish, 12000);
    return () => {
      window.clearTimeout(safety);
      words.kill();
      plain?.kill();
      stopScroll(false);
    };
  }, [show, webgl, finish, onProgress]);

  if (!show) return null;
  return (
    <div ref={root} className="preloader" aria-hidden="true">
      {webgl && (
        <div className="pre-scene">
          <Quiet onError={finish}>
            <Suspense fallback={null}>
              <LandingScene onProgress={onProgress} onDone={finish} />
            </Suspense>
          </Quiet>
        </div>
      )}
      <div className="pre-inner">
        <p className="pre-title">
          {['Abandoned', 'but', 'Not', 'Forgotten'].map((w) => (
            <span key={w} className="pre-mask">
              <span className="pre-word">{w}</span>
            </span>
          ))}
        </p>
        <div className="pre-bar">
          <i ref={bar} />
        </div>
        <p className="pre-num">
          <span ref={status} className="pre-status">
            Preparing descent
          </span>
          <span ref={num}>000</span>
        </p>
      </div>
    </div>
  );
}

/** Small landing animation shown wherever a 3D scene is still loading. */
export function SceneLoader({ label = 'Preparing 3D scene' }: { label?: string }) {
  return (
    <div className="scene-loader" role="status">
      <span className="sl-lander" aria-hidden="true">
        <svg viewBox="0 0 48 64" width="48" height="64">
          <path className="sl-flame" d="M19 40 Q24 62 24 62 Q24 62 29 40 Z" fill="#ff9a3c" />
          <path d="M16 12 Q24 0 32 12 L33 26 L15 26 Z" fill="#d7dae2" stroke="#2b2e38" strokeWidth="1" />
          <rect x="11" y="26" width="26" height="10" rx="2" fill="#d6a84a" stroke="#2b2e38" strokeWidth="1" />
          <circle cx="24" cy="17" r="3.4" fill="#1b2a4a" stroke="#ffcf7a" strokeWidth="1.2" />
          <path d="M13 36 L5 48 M35 36 L43 48" stroke="#cfd2d9" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 48 H9 M39 48 H46" stroke="#d6a84a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M20 36 L18 41 H30 L28 36 Z" fill="#4b4f5c" />
        </svg>
      </span>
      <span className="sl-ground" aria-hidden="true" />
      <span className="sl-label">{label}</span>
    </div>
  );
}
