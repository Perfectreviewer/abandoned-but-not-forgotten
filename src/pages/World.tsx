import { SplitReveal } from '../components/fx';
import { useState } from 'react';
import { ObjectCard, Planet, Reveal } from '../components/bits';
import { GlobeCanvas } from '../components/Scenes';
import { CORE, useReducedMotion } from '../lib/util';

const COPY = {
  moon: {
    title: 'The Moon',
    lede: 'Between 1967 and 1972, robots and astronauts left scouts, cars and mirrors across the near side of the Moon. Most went silent long ago. One still answers every time we shine a laser at it.',
    other: 'mars' as const,
  },
  mars: {
    title: 'Mars',
    lede: 'Since 1997, NASA has parked rovers and landers on Mars that worked far longer than planned. They are silent now, covered in red dust, but what they found is still changing how we think about the planet.',
    other: 'moon' as const,
  },
};

/** Flat map, used when 3D is unavailable. */
function FlatMap({ place, items, hover, setHover }: { place: 'moon' | 'mars'; items: typeof CORE; hover: string | null; setHover: (id: string | null) => void }) {
  return (
    <div className={`map map-${place}`}>
      <div className="map-surface">
        <span className="map-grid" aria-hidden="true" />
        {items.map((o) =>
          o.coordinates ? (
            <a
              key={o.id}
              href={`#/object/${o.id}`}
              className={`map-pin${hover === o.id ? ' is-hover' : ''}`}
              style={{ left: `${((o.coordinates.lon + 180) / 360) * 100}%`, top: `${((90 - o.coordinates.lat) / 180) * 100}%` }}
              onMouseEnter={() => setHover(o.id)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="map-dot" aria-hidden="true" />
              <span className="map-label">{o.shortName}</span>
            </a>
          ) : null,
        )}
      </div>
    </div>
  );
}

export default function World({ place }: { place: 'moon' | 'mars' }) {
  const items = CORE.filter((o) => o.location === place);
  const [hover, setHover] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const c = COPY[place];
  const sites = items.filter((o) => o.coordinates).map((o) => ({ id: o.id, label: o.shortName, lat: o.coordinates!.lat, lon: o.coordinates!.lon }));

  return (
    <div className="page">
      <header className="world-head">
        <Planet place={place} size={120} />
        <div>
          <p className="eyebrow">{items.length} objects</p>
          <SplitReveal as="h1" text={c.title} onLoad delay={0.3} />
          <p className="lede">{c.lede}</p>
        </div>
      </header>

      <div className="world-layout">
        <figure className="globe-figure">
          <GlobeCanvas
            className="globe-stage"
            place={place}
            sites={sites}
            active={hover}
            onPick={(id) => (window.location.hash = `#/object/${id}`)}
            reducedMotion={reduced}
            fallback={<FlatMap place={place} items={items} hover={hover} setHover={setHover} />}
          />
          <figcaption className="muted small">
            Real NASA map of {place === 'moon' ? 'the Moon' : 'Mars'}. Drag to spin. Gold dots mark each landing site at its true latitude and longitude.
            {place === 'moon' && ' The Lunar Rover dot marks Apollo 15; the Apollo 16 and 17 rovers rest at their own sites.'}
          </figcaption>
        </figure>

        <div className="world-list">
          {items.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.06}>
              <div onMouseEnter={() => setHover(o.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(o.id)} onBlur={() => setHover(null)}>
                <ObjectCard o={o} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <p className="center">
        <a className="btn ghost" href={`#/${c.other}`}>
          Visit {c.other === 'mars' ? 'Mars' : 'the Moon'} next →
        </a>
      </p>
    </div>
  );
}
