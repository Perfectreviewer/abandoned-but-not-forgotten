import { useRef } from 'react';
import { PlaceTag, StatusBadge } from '../components/bits';
import { SplitReveal } from '../components/fx';
import { gsap, useGsap } from '../lib/gsap';
import { useTilt } from '../lib/motion';
import { formatDate, OBJECTS } from '../lib/util';
import type { SpaceObject } from '../data/types';

// An "ended" note for the ones that went quiet, so you can see how long each worked.
const ENDINGS: Record<string, string> = {
  'surveyor-3': 'Apollo 12 visits: November 1969',
  sojourner: 'Last contact: September 1997',
  opportunity: 'Last contact: June 2018',
  insight: 'Mission ends: December 2022',
};

function TimelineCard({ o, side }: { o: SpaceObject; side: 'l' | 'r' }) {
  const ref = useTilt<HTMLAnchorElement>(5);
  return (
    <a ref={ref} href={`#/object/${o.id}`} className={`tl-card tl-${side}`} data-cursor="Open">
      <span className="glare" aria-hidden="true" />
      <span className="tl-img">
        <img src={o.fallbackImage.src} alt="" loading="lazy" />
      </span>
      <span className="tl-body">
        <span className="tl-meta">
          <PlaceTag place={o.location} /> <StatusBadge status={o.status} />
          {o.epilogue && <span className="tl-flag">Epilogue</span>}
        </span>
        <strong>{o.name}</strong>
        <span className="muted small">
          {formatDate(o.date)} · {o.site}
        </span>
        <span>{o.character}</span>
        {ENDINGS[o.id] && <span className="tl-end">{ENDINGS[o.id]}</span>}
      </span>
    </a>
  );
}

/** FR-10: every object in date order, 1967–2022, plus the Voyager epilogue. */
export default function Timeline() {
  const items = [...OBJECTS].sort((a, b) => a.date.localeCompare(b.date));
  const root = useRef<HTMLDivElement>(null);

  // GSAP: the line draws itself as you scroll; each year and card slides in from its side.
  useGsap(root, (reduced) => {
    if (reduced) return;
    gsap.fromTo('.tl-line-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 60%', end: 'bottom 60%', scrub: true } });
    gsap.utils.toArray<HTMLElement>('.tl-item').forEach((el) => {
      const left = el.classList.contains('side-l');
      gsap.from(el.querySelector('.tl-card'), { x: left ? -80 : 80, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
      gsap.from(el.querySelector('.tl-year'), { scale: 0.6, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
      gsap.to(el.querySelector('.tl-dot'), { scale: 1, backgroundColor: 'var(--accent)', scrollTrigger: { trigger: el, start: 'top 60%', toggleActions: 'play none none reverse' } });
    });
  });

  return (
    <div className="page" ref={root}>
      <header className="page-head">
        <p className="eyebrow">1967 → 2022</p>
        <SplitReveal as="h1" text="Timeline" onLoad delay={0.3} />
        <p className="lede">Fifty-five years of machines that kept teaching us long after they stopped moving.</p>
      </header>
      <ol className="timeline">
        <span className="tl-line" aria-hidden="true">
          <span className="tl-line-fill" />
        </span>
        {items.map((o, i) => (
          <li key={o.id} className={`tl-item tl-${o.location} side-${i % 2 ? 'r' : 'l'}${o.epilogue ? ' tl-epilogue' : ''}`}>
            <span className="tl-dot" aria-hidden="true" />
            <span className="tl-year">{o.year}</span>
            <TimelineCard o={o} side={i % 2 ? 'r' : 'l'} />
          </li>
        ))}
      </ol>
    </div>
  );
}
