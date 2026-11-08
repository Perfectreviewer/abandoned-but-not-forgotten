import { useRef, type ReactNode } from 'react';
import { gsap, useGsap } from '../lib/gsap';
import { useTilt } from '../lib/motion';
import type { NasaImage, SpaceObject } from '../data/types';
import { PLACE_LABEL, STATUS_LABEL, formatDate } from '../lib/util';

/** Fades and lifts content in as it scrolls into view (GSAP ScrollTrigger). */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, (reduced) => {
    if (reduced) return;
    gsap.from(ref.current, {
      autoAlpha: 0,
      y: 40,
      duration: 0.9,
      delay,
      ease: 'power3.out',
      scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
    });
  });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function Planet({ place, size = 160 }: { place: 'moon' | 'mars' | 'interstellar'; size?: number }) {
  return <span className={`planet planet-${place}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function StatusBadge({ status }: { status: SpaceObject['status'] }) {
  return <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function PlaceTag({ place }: { place: SpaceObject['location'] }) {
  return <span className={`place-tag place-${place}`}>{PLACE_LABEL[place]}</span>;
}

export function Photo({ img, className }: { img: NasaImage; className?: string }) {
  return (
    <figure className={`photo ${className ?? ''}`}>
      <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
      <figcaption>
        Image: {img.credit} ·{' '}
        <a href={`https://images.nasa.gov/details/${encodeURIComponent(img.nasaId)}`} target="_blank" rel="noreferrer">
          {img.nasaId}
        </a>
      </figcaption>
    </figure>
  );
}

/** FR-04: name, mission, date, location, purpose, status. */
export function FactPanel({ o }: { o: SpaceObject }) {
  return (
    <dl className="fact-panel">
      <div>
        <dt>Name</dt>
        <dd>{o.name}</dd>
      </div>
      <div>
        <dt>{o.epilogue ? 'Launched' : 'Arrived'}</dt>
        <dd>{formatDate(o.date)}</dd>
      </div>
      <div>
        <dt>Where</dt>
        <dd>
          {o.site}
          {o.coordinates && (
            <span className="coords">
              {' '}
              ({Math.abs(o.coordinates.lat).toFixed(1)}°{o.coordinates.lat >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(o.coordinates.lon).toFixed(1)}°{o.coordinates.lon >= 0 ? 'E' : 'W'})
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt>Job</dt>
        <dd>{o.purpose}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>
          <StatusBadge status={o.status} />
        </dd>
      </div>
    </dl>
  );
}

/** FR-07: "Where this comes from" on every object. */
export function SourcePanel({ o }: { o: SpaceObject }) {
  const checked = o.verifiedBy.checker !== 'PENDING';
  return (
    <section className="source-panel" aria-labelledby={`src-${o.id}`}>
      <h3 id={`src-${o.id}`}>Where this comes from</h3>
      <ul>
        {o.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>{' '}
            <span className="muted">· {s.publisher}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">{o.credits}</p>
      <p className={`verify ${checked ? 'ok' : 'pending'}`}>
        {checked
          ? `Facts checked by ${o.verifiedBy.checker}${o.verifiedBy.date ? ` on ${formatDate(o.verifiedBy.date)}` : ''}.`
          : 'Draft: these facts are waiting for a second teammate to check them against the sources.'}
      </p>
    </section>
  );
}

export function ObjectCard({ o }: { o: SpaceObject }) {
  const ref = useTilt<HTMLAnchorElement>(7);
  return (
    <a ref={ref} className="object-card" href={`#/object/${o.id}`} data-cursor="Explore">
      <span className="glare" aria-hidden="true" />
      <span className="object-card-img">
        <img src={o.fallbackImage.src} alt="" loading="lazy" decoding="async" />
        <span className={`live-dot status-dot-${o.status}`} aria-hidden="true" />
      </span>
      <span className="object-card-body">
        <span className="object-card-meta">
          <PlaceTag place={o.location} /> <span className="year">{o.year}</span>
        </span>
        <strong>{o.shortName}</strong>
        <span className="object-card-line">{o.character}</span>
        <span className="object-card-q">
          <span>“{o.question}”</span>
        </span>
        <span className="object-card-go" aria-hidden="true">
          Open the story <span className="arrow">→</span>
        </span>
      </span>
    </a>
  );
}
