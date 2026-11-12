import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { Planet, Reveal } from '../components/bits';
import { Hangar } from '../components/Hangar';
import { MagneticLink, Marquee, SplitReveal } from '../components/fx';
import { useCountUp } from '../lib/motion';
import { HeroCanvas } from '../components/Scenes';
import { gsap, prefersReducedMotion, useGsap } from '../lib/gsap';
import { CORE, hasWebGL, OBJECTS, useAnswers } from '../lib/util';

const CHAPTERS = [
  ['Meet the machine', 'Spin a real 3D model and tap its parts.'],
  ['The mission', 'Why NASA sent it, in under 80 words.'],
  ['What it discovered', 'Real NASA photos, one clear sentence each.'],
  ['Where it rests today', 'Fly down to the exact spot it was left.'],
  ['The unfinished question', 'You decide what the next mission should do.'],
];

type Fly = (place: 'moon' | 'mars', id: string | null, href: string) => void;

function ChooseButtons({ fly }: { fly: Fly }) {
  const go = (place: 'moon' | 'mars') => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    fly(place, null, '#/' + place);
  };
  const moon = CORE.filter((o) => o.location === 'moon');
  const mars = CORE.filter((o) => o.location === 'mars');
  return (
    <div className="choose" role="group" aria-label="Choose where to start">
      <a className="choose-btn moon" href="#/moon" onClick={go('moon')} data-cursor="Fly">
        <Planet place="moon" size={44} />
        <span>
          <strong>Start on the Moon</strong>
          <small>{moon.length} objects · 1967–1972</small>
        </span>
      </a>
      <a className="choose-btn mars" href="#/mars" onClick={go('mars')} data-cursor="Fly">
        <Planet place="mars" size={44} />
        <span>
          <strong>Start on Mars</strong>
          <small>{mars.length} objects · 1997–2022</small>
        </span>
      </a>
    </div>
  );
}

export default function Home() {
  const track = useRef<HTMLElement>(null);
  const progress = useMemo(() => ({ value: 0 }), []);
  const answered = Object.keys(useAnswers()).length;
  const moon = CORE.filter((o) => o.location === 'moon');
  const mars = CORE.filter((o) => o.location === 'mars');
  const sites = (list: typeof CORE) => list.filter((o) => o.coordinates).map((o) => ({ id: o.id, label: o.shortName, lat: o.coordinates!.lat, lon: o.coordinates!.lon }));

  const dive = useMemo<{ value: number; place: 'moon' | 'mars' | null; id: string | null }>(() => ({ value: 0, place: null, id: null }), []);
  const veil = useRef<HTMLDivElement>(null);
  const flying = useRef(false);

  useEffect(
    () => () => {
      gsap.killTweensOf(dive);
      dive.value = 0;
      dive.place = null;
    },
    [dive],
  );

  /** Clicking a world or a landing site: the camera flies down to it, then the page opens. */
  const fly: Fly = (place, id, href) => {
    if (flying.current) return;
    if (prefersReducedMotion() || !hasWebGL()) {
      window.location.hash = href;
      return;
    }
    flying.current = true;
    dive.place = place;
    dive.id = id;
    // a longer flight if the camera has to cross from one world to the other
    const far = (place === 'mars') !== progress.value > 0.5;
    const d = far ? 2.6 : 1.8;
    gsap
      .timeline({
        onComplete: () => {
          window.location.hash = href;
        },
      })
      .to('.flight-step, .scroll-cue', { autoAlpha: 0, duration: 0.35, overwrite: true }, 0)
      .to(dive, { value: 1, duration: d, ease: 'power2.inOut' }, 0)
      .fromTo(veil.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.in' }, d - 0.45);
  };
  const flyToObject = (id: string) => {
    const o = CORE.find((x) => x.id === id);
    if (o && (o.location === 'moon' || o.location === 'mars')) fly(o.location, id, '#/object/' + id);
    else window.location.hash = '#/object/' + id;
  };
  const linkFly = (id: string) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    flyToObject(id);
  };

  // GSAP: pin the 3D stage and scrub the camera flight + captions with the scroll.
  useGsap(track, (reduced) => {
    if (reduced) {
      progress.value = 0.25;
      return;
    }
    const st = { trigger: track.current, start: 'top top', end: 'bottom bottom', scrub: 1 };
    gsap.to(progress, { value: 1, ease: 'none', scrollTrigger: st });
    const tl = gsap.timeline({ scrollTrigger: st, defaults: { ease: 'power2.out' } });
    const fade = (sel: string, at: number, out: number | null) => {
      tl.fromTo(sel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.06 }, at);
      if (out !== null) tl.to(sel, { autoAlpha: 0, y: -40, duration: 0.06 }, out);
    };
    tl.set('.step-0', { autoAlpha: 1 }, 0).to('.step-0', { autoAlpha: 0, y: -60, duration: 0.08 }, 0.08);
    fade('.step-1', 0.18, 0.42);
    fade('.step-2', 0.47, 0.58);
    fade('.step-3', 0.66, 0.88);
    fade('.step-4', 0.92, null);
    tl.to('.scroll-cue', { autoAlpha: 0, duration: 0.05 }, 0.04);
  });

  const fallback = (
    <div className="hero-fallback" aria-hidden="true">
      <Planet place="moon" size={340} />
      <Planet place="mars" size={180} />
    </div>
  );

  return (
    <>
      <section className="flight" ref={track} aria-label="Fly from the Moon to Mars">
        <div className="flight-stage">
          <HeroCanvas progress={progress} moonSites={sites(moon)} marsSites={sites(mars)} onPick={flyToObject} dive={dive} fallback={fallback} />
          <div ref={veil} className="dive-veil" aria-hidden="true" />

          <div className="flight-step step-0">
            <p className="eyebrow">Six machines left on the Moon and Mars</p>
            <h1>
              They stopped moving.
              <br />
              <span className="accent">Their stories didn’t.</span>
            </h1>
            <p className="lede">Meet the hardware NASA left behind, find out what it discovered, and answer the question each one left for your generation.</p>
            <ChooseButtons fly={fly} />
          </div>

          <div className="flight-step step-1 right">
            <p className="eyebrow">The Moon · 1967–1972</p>
            <h2>Three machines, still where we left them</h2>
            <ul className="flight-list">
              {moon.map((o) => (
                <li key={o.id}>
                  <a href={`#/object/${o.id}`} onClick={linkFly(o.id)}>
                    {o.shortName}
                  </a>{' '}
                  <span>{o.year}</span>
                </li>
              ))}
            </ul>
            <p className="muted small">Gold dots mark their real landing sites. Tap one to open its story.</p>
          </div>

          <div className="flight-step step-2 center">
            <p className="eyebrow">Leaving the Moon</p>
            <h2>Millions of kilometres later…</h2>
            <p className="muted small">Not to scale. Mars is never closer to us than about 55 million km.</p>
          </div>

          <div className="flight-step step-3 right">
            <p className="eyebrow">Mars · 1997–2022</p>
            <h2>Three explorers, now silent under red dust</h2>
            <ul className="flight-list">
              {mars.map((o) => (
                <li key={o.id}>
                  <a href={`#/object/${o.id}`} onClick={linkFly(o.id)}>
                    {o.shortName}
                  </a>{' '}
                  <span>{o.year}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flight-step step-4">
            <p className="eyebrow">Your turn</p>
            <h2>Every machine left a question unanswered.</h2>
            <p className="lede">Pick a world and find out which one is waiting for you.</p>
            <ChooseButtons fly={fly} />
          </div>

          <p className="scroll-cue" aria-hidden="true">Scroll to fly ↓</p>
        </div>
      </section>

      <Marquee
        items={[
          '100 mirrors still answering lasers',
          '45 km driven on Mars',
          '1,300+ marsquakes heard',
          '3 cars parked on the Moon',
          'Planned for 90 days, worked for 15 years',
          'First rover on another planet, 1997',
          'Moon drifting away 3.8 cm a year',
        ]}
      />

      <section className="section stats" aria-label="By the numbers">
        <Stat value={55} label="years of machines left behind" suffix="" />
        <Stat value={45} label="kilometres Opportunity drove" suffix=" km" />
        <Stat value={1300} label="marsquakes InSight detected" suffix="+" />
        <Stat value={100} label="laser mirrors on the Moon" suffix="" />
      </section>

      <HowItWorks />

      <section className="section hangar-section">
        <p className="eyebrow">The hangar · six machines</p>
        <SplitReveal text="Pick any machine to begin" />
        <Reveal>
          <Hangar />
        </Reveal>
      </section>

      <section className="section split">
        <Reveal className="panel panel-glow">
          <p className="eyebrow">✦ Question Constellation</p>
          <h2>Every answer becomes a star</h2>
          <p>
            Each time you choose what the next mission should do, a star appears in your own constellation, grouped by theme: water, life, geology and more. It is saved only in this
            browser. No account, no sign-up.
          </p>
          <MagneticLink href="#/constellation" className="btn" cursor="Open">
            {answered ? `See your ${answered} star${answered === 1 ? '' : 's'}` : 'See your constellation'}
          </MagneticLink>
        </Reveal>
        <Reveal className="panel" delay={0.08}>
          <p className="eyebrow">1967 → 2022</p>
          <h2>Follow the timeline</h2>
          <p>From a robot scout testing the Moon’s soil to a lander listening to marsquakes: 55 years of machines that kept teaching us after they stopped.</p>
          <MagneticLink href="#/timeline" className="btn ghost" cursor="Open">
            Open the timeline
          </MagneticLink>
        </Reveal>
      </section>

      <section className="section epilogue-teaser">
        <p className="eyebrow">Epilogue · beyond the Moon and Mars</p>
        <SplitReveal text="And one that’s still out there" />
        <Reveal>
          <p>{OBJECTS.find((o) => o.epilogue)?.character} It isn’t on the Moon or Mars, so we saved it for the end.</p>
          <MagneticLink href="#/object/voyager-1" className="btn ghost" cursor="Go">
            Read the Voyager 1 epilogue
          </MagneticLink>
        </Reveal>
      </section>
    </>
  );
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix: string }) {
  const ref = useCountUp<HTMLSpanElement>(value);
  return (
    <div className="stat">
      <p className="stat-num">
        <span ref={ref}>{value.toLocaleString('en-GB')}</span>
        {suffix}
      </p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

/** The five chapters, pinned and scrolled sideways on wide screens (GSAP ScrollTrigger). */
function HowItWorks() {
  const wrap = useRef<HTMLElement>(null);
  useGsap(wrap, (reduced) => {
    const track = wrap.current?.querySelector<HTMLElement>('.hiw-track');
    if (!track || reduced || window.innerWidth < 900) return;
    const dist = () => track.scrollWidth - window.innerWidth + 80;
    const tw = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: { trigger: wrap.current, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    gsap.utils.toArray<HTMLElement>('.hiw-card').forEach((card) => {
      gsap.from(card.querySelector('.hiw-num'), {
        yPercent: 60,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tw, start: 'left 95%', end: 'left 55%', scrub: true },
      });
    });
  });
  return (
    <section className="hiw" ref={wrap} aria-label="How every story works">
      <div className="hiw-head">
        <p className="eyebrow">How every story works</p>
        <SplitReveal text="Five short chapters. One question that’s yours." />
      </div>
      <ol className="hiw-track">
        {CHAPTERS.map(([t, d], i) => (
          <li key={t} className={`hiw-card${i === 4 ? ' is-last' : ''}`}>
            <span className="hiw-num">0{i + 1}</span>
            <strong>{t}</strong>
            <span>{d}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
