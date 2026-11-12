import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SpaceObject } from '../data/types';
import { hasWebGL, useReducedMotion } from '../lib/util';
import { SceneLoader } from './Preloader';

const ModelViewer = lazy(() => import('../three/ModelViewer'));

class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * "Meet the machine": 3D model + numbered hotspots. The hotspot list is real buttons
 * outside the canvas, so it works with a keyboard and screen readers (FR-11).
 * Falls back to a NASA photo if WebGL is unavailable or the 3D code fails (FR-03).
 */
export function Viewer({ o }: { o: SpaceObject }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const webgl = hasWebGL();

  // Lazy-mount the 3D scene only when it is about to scroll into view.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setNear(true), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fallback = (
    <div className="viewer-fallback">
      <img src={o.fallbackImage.src} alt={o.fallbackImage.alt} />
      {!webgl && <p className="small">3D is not available on this device, so here is a NASA photo instead.</p>}
    </div>
  );

  const hs = o.hotspots.find((h) => h.id === active);
  const toggle = (id: string) => setActive((cur) => (cur === id ? null : id));

  return (
    <div className="viewer">
      <div className="viewer-stage" ref={box}>
        {webgl && near ? (
          <CanvasBoundary fallback={fallback}>
            <Suspense fallback={<div className="viewer-loading">
              <SceneLoader label="Preparing 3D model" />
            </div>}>
              <ModelViewer object={o} active={active} onHotspot={toggle} reducedMotion={reduced} />
            </Suspense>
          </CanvasBoundary>
        ) : webgl ? (
          <div className="viewer-loading">
              <SceneLoader label="Preparing 3D model" />
            </div>
        ) : (
          fallback
        )}
        {webgl && <p className="viewer-hint">Drag to rotate · pinch or scroll to zoom</p>}
      </div>
      <div className="hotspots">
        <p className="eyebrow">Tap a part to learn what it did</p>
        <ol className="hotspot-list">
          {o.hotspots.map((h, i) => (
            <li key={h.id}>
              <button type="button" aria-expanded={active === h.id} aria-controls={`hs-${o.id}`} className={active === h.id ? 'is-active' : ''} onClick={() => toggle(h.id)}>
                <span className="num" aria-hidden="true">{i + 1}</span>
                {h.label}
              </button>
            </li>
          ))}
        </ol>
        <div id={`hs-${o.id}`} className="hotspot-detail" aria-live="polite">
          <AnimatePresence mode="wait">
            {hs ? (
              <motion.div key={hs.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <strong>{hs.label}</strong>
                <p>{hs.text}</p>
              </motion.div>
            ) : (
              <motion.p key="none" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Pick a numbered part on the model or in this list.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
