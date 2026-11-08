// Global premium effects: intro loader, page-transition curtain,
// split-text reveals, scroll-reactive marquee, image lightbox and toasts.
import { createElement, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/gsap';
import { stopScroll, useMagnetic } from '../lib/motion';
import type { NasaImage } from '../data/types';

// ---------- intro loader ----------
/** First visit in a session: a short count-up and title reveal, then the curtain lifts. */
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

  useLayoutEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem('abnf.intro', '1');
    } catch {
      /* storage blocked: the intro may replay, which is harmless */
    }
    stopScroll(true);
    const o = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        stopScroll(false);
        setShow(false);
      },
    });
    tl.from('.pre-word', { yPercent: 110, duration: 0.9, stagger: 0.08, ease: 'power4.out' })
      .to(
        o,
        {
          v: 100,
          duration: 1.3,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (num.current) num.current.textContent = String(Math.round(o.v)).padStart(3, '0');
          },
        },
        0,
      )
      .to('.pre-bar i', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
      .to('.pre-inner', { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.in' }, '+=0.15')
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.25');
    return () => {
      tl.kill();
      stopScroll(false);
    };
  }, [show]);

  if (!show) return null;
  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div className="pre-inner">
        <p className="pre-title">
          {['Abandoned', 'but', 'Not', 'Forgotten'].map((w) => (
            <span key={w} className="pre-mask">
              <span className="pre-word">{w}</span>
            </span>
          ))}
        </p>
        <div className="pre-bar">
          <i />
        </div>
        <p className="pre-num">
          <span ref={num}>000</span>
        </p>
      </div>
    </div>
  );
}

// ---------- page transition ----------
/** A curtain sweeps across on every route change while the new page settles in. */
export function PageCurtain({ routeKey }: { routeKey: string }) {
  const el = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline();
    tl.set(el.current, { display: 'block', clipPath: 'inset(0 0 0 0)' })
      .to(el.current, { clipPath: 'inset(0 0 0 100%)', duration: 0.8, ease: 'expo.inOut' })
      .set(el.current, { display: 'none' });
    gsap.fromTo('#main > *', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', delay: 0.25, clearProps: 'transform,opacity,visibility' });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 700);
    return () => {
      tl.kill();
      window.clearTimeout(id);
    };
  }, [routeKey]);
  return (
    <div ref={el} className="curtain" aria-hidden="true">
      <span className="curtain-glow" />
    </div>
  );
}

// ---------- split text ----------
/** Splits a heading into words that rise from a mask as it scrolls into view. */
export function SplitReveal({ text, as = 'h2', className, delay = 0, onLoad = false, id }: { text: string; as?: string; className?: string; delay?: number; onLoad?: boolean; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(ref.current!.querySelectorAll('.sw > span'), {
        yPercent: 115,
        rotate: 4,
        duration: 1.1,
        stagger: 0.05,
        delay,
        ease: 'power4.out',
        scrollTrigger: onLoad ? undefined : { trigger: ref.current, start: 'top 88%', once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, [text, delay, onLoad]);
  const words = text.split(' ');
  return createElement(
    as,
    { ref, id, className: `splt ${className ?? ''}`, 'aria-label': text },
    words.flatMap((w, i) => [
      <span key={i} className="sw" aria-hidden="true">
        <span>{w}</span>
      </span>,
      i < words.length - 1 ? ' ' : null,
    ]),
  );
}

// ---------- marquee ----------
/** An endless ticker that speeds up and reverses with your scroll. */
export function Marquee({ items }: { items: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!track.current || prefersReducedMotion()) return;
    const el = track.current;
    const loop = gsap.to(el, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const v = self.getVelocity() / 300;
        const dir = self.direction;
        gsap.to(loop, { timeScale: dir * Math.min(6, 1 + Math.abs(v)), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.25, overwrite: false });
      },
    });
    return () => {
      st.kill();
      loop.kill();
    };
  }, []);
  const row = items.map((it, i) => (
    <span key={i} className="mq-item">
      {it}
      <span className="mq-star" aria-hidden="true">✦</span>
    </span>
  ));
  return (
    <div className="marquee" aria-hidden="true">
      <div ref={track} className="mq-track">
        {row}
        {row}
      </div>
    </div>
  );
}

// ---------- magnetic link/button ----------
export function MagneticLink({ href, className, children, cursor }: { href: string; className?: string; children: ReactNode; cursor?: string }) {
  const ref = useMagnetic<HTMLAnchorElement>(0.35);
  return (
    <a ref={ref} href={href} className={className} data-cursor={cursor}>
      <span className="btn-label">{children}</span>
    </a>
  );
}

// ---------- lightbox ----------
export function Lightbox({ img, title, text, onClose }: { img: NasaImage; title: string; text: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    stopScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const tl = gsap.timeline();
    if (!prefersReducedMotion()) {
      tl.from(root.current, { autoAlpha: 0, duration: 0.3 })
        .from('.lb-figure img', { scale: 1.08, clipPath: 'inset(12% 12% 12% 12% round 24px)', duration: 0.9, ease: 'expo.out' }, 0)
        .from('.lb-copy > *', { y: 24, autoAlpha: 0, stagger: 0.06, duration: 0.6, ease: 'power3.out' }, 0.2);
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => {
      tl.kill();
      stopScroll(false);
      window.removeEventListener('keydown', key);
      prev?.focus?.();
    };
  }, [onClose]);
  return createPortal(
    <div ref={root} className="lightbox" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="lb-inner" onClick={(e) => e.stopPropagation()}>
        <figure className="lb-figure">
          <img src={img.src.replace(/~(small|thumb)\.jpg$/, '~medium.jpg').replace('~thumb', '~orig')} onError={(e) => ((e.target as HTMLImageElement).src = img.src)} alt={img.alt} />
        </figure>
        <div className="lb-copy">
          <p className="eyebrow">Evidence</p>
          <h3>{title}</h3>
          <p>{text}</p>
          <p className="muted small">
            {img.alt} · Image: {img.credit} ·{' '}
            <a href={`https://images.nasa.gov/details/${encodeURIComponent(img.nasaId)}`} target="_blank" rel="noreferrer">
              {img.nasaId} on NASA Images ↗
            </a>
          </p>
        </div>
        <button ref={closeBtn} className="lb-close" onClick={onClose} aria-label="Close" data-cursor="Close">
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ---------- toast ----------
export function toast(message: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);
  gsap.fromTo(el, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.6)' });
  gsap.to(el, { y: -20, autoAlpha: 0, duration: 0.4, delay: 2.6, onComplete: () => el.remove() });
}

/** Little stars burst from a point and fly to the "My questions" link in the header. */
export function starBurst(from: HTMLElement, color: string) {
  if (prefersReducedMotion()) return;
  const target = document.querySelector('.nav-constellation');
  const a = from.getBoundingClientRect();
  const b = target?.getBoundingClientRect();
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('span');
    s.className = 'burst-star';
    s.textContent = '✦';
    s.style.color = color;
    s.style.left = `${a.left + a.width / 2}px`;
    s.style.top = `${a.top + a.height / 2}px`;
    document.body.appendChild(s);
    const ang = (i / 9) * Math.PI * 2;
    const tl = gsap.timeline({ onComplete: () => s.remove() });
    tl.to(s, { x: Math.cos(ang) * 70, y: Math.sin(ang) * 70, scale: 1.4, rotate: 180, duration: 0.45, ease: 'power3.out' });
    if (b)
      tl.to(s, { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: 0.4, rotate: 360, duration: 0.7, ease: 'power3.in', delay: i * 0.03 });
    else tl.to(s, { autoAlpha: 0, duration: 0.4 });
  }
  if (target) gsap.fromTo(target, { scale: 1 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1, delay: 1.0, ease: 'power2.out' });
}
