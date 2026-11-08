// Premium motion layer: smooth scrolling, magnetic elements, 3D tilt with glare,
// split-text reveals and counters. Everything switches off for reduced motion and
// the pointer effects switch off on touch screens.
import { useEffect, useRef, type RefObject } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';

export const finePointer = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

// ---------- smooth scroll ----------
let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return;
  lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/** Scroll to a position or element, smoothly when Lenis is running. */
export function scrollToTarget(target: number | HTMLElement, opts: { immediate?: boolean; offset?: number } = {}) {
  if (lenis) {
    lenis.scrollTo(target, { immediate: opts.immediate, offset: opts.offset ?? 0, duration: 1.4 });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: opts.immediate ? 'auto' : 'smooth' });
  } else {
    const y = target.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0);
    window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
  }
}

export function stopScroll(stop: boolean) {
  if (!lenis) return;
  if (stop) lenis.stop();
  else lenis.start();
}

// ---------- magnetic ----------
/** Element drifts toward the pointer while hovered, then springs back. */
export function useMagnetic<T extends HTMLElement>(strength = 0.3): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || prefersReducedMotion()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [strength]);
  return ref;
}

// ---------- tilt + glare ----------
/** 3D tilt toward the pointer with a moving light glare (reads --gx/--gy in CSS). */
export function useTilt<T extends HTMLElement>(max = 8): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || prefersReducedMotion()) return;
    gsap.set(el, { transformPerspective: 900, transformStyle: 'preserve-3d' });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * max * 2);
      rx(-(py - 0.5) * max * 2);
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
      el.style.setProperty('--glare', '1');
    };
    const leave = () => {
      rx(0);
      ry(0);
      el.style.setProperty('--glare', '0');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [max]);
  return ref;
}

// ---------- counters ----------
/** Counts a number up from zero when it scrolls into view. */
export function useCountUp<T extends HTMLElement>(value: number, decimals = 0): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) => v.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (prefersReducedMotion()) {
      el.textContent = fmt(value);
      return;
    }
    const obj = { v: 0 };
    el.textContent = fmt(0);
    const tw = gsap.to(obj, {
      v: value,
      duration: 2.2,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = fmt(obj.v);
      },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, [value, decimals]);
  return ref;
}
