import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Run GSAP setup scoped to an element; everything it creates (tweens, ScrollTriggers)
 * is reverted when the component unmounts or deps change.
 */
export function useGsap(scope: RefObject<HTMLElement>, setup: (reduced: boolean) => void, deps: DependencyList = []) {
  useLayoutEffect(() => {
    if (!scope.current) return;
    const ctx = gsap.context(() => setup(prefersReducedMotion()), scope);
    // layout can shift once images/fonts land
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      window.clearTimeout(id);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
