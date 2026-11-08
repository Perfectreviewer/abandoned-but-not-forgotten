// Lazy wrappers for the 3D scenes: they load three.js only when needed, mount only when
// close to the viewport, and fall back to plain content if WebGL is missing or fails.
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { hasWebGL } from '../lib/util';
import type { HeroProps } from '../three/HeroScene';
import type { GlobeSceneProps } from '../three/GlobeScene';

const HeroScene = lazy(() => import('../three/HeroScene'));
const GlobeScene = lazy(() => import('../three/GlobeScene'));

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useNear<T extends HTMLElement>(margin = '300px') {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

export function Lazy3D({ fallback, children, className }: { fallback: ReactNode; children: ReactNode; className?: string }) {
  const [ref, near] = useNear<HTMLDivElement>();
  const ok = hasWebGL();
  return (
    <div ref={ref} className={className}>
      {ok && near ? (
        <Boundary fallback={fallback}>
          <Suspense fallback={<div className="scene-loading">{fallback}</div>}>{children}</Suspense>
        </Boundary>
      ) : (
        fallback
      )}
    </div>
  );
}

export function HeroCanvas(props: HeroProps & { fallback: ReactNode }) {
  const { fallback, ...rest } = props;
  return (
    <Lazy3D className="scene-fill" fallback={fallback}>
      <HeroScene {...rest} />
    </Lazy3D>
  );
}

export function GlobeCanvas(props: GlobeSceneProps & { fallback: ReactNode; className?: string }) {
  const { fallback, className, ...rest } = props;
  return (
    <Lazy3D className={className ?? 'scene-fill'} fallback={fallback}>
      <GlobeScene {...rest} />
    </Lazy3D>
  );
}
