import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FactPanel, Photo, PlaceTag, Reveal, SourcePanel, StatusBadge } from '../components/bits';
import { Lightbox, SplitReveal, starBurst, toast } from '../components/fx';
import { scrollToTarget, useTilt } from '../lib/motion';
import type { SpaceObject } from '../data/types';
import { Viewer } from '../components/Viewer';
import { GlobeCanvas } from '../components/Scenes';
import { gsap, useGsap } from '../lib/gsap';
import { THEMES } from '../data/types';
import { answers, byId, CORE, PLACE_LABEL, useAnswers, useReducedMotion } from '../lib/util';

const CHAPTERS = ['Meet the machine', 'The mission', 'What it discovered', 'Where it rests today', 'The unfinished question'];

export default function Story({ id }: { id: string }) {
  const o = byId(id)!;
  const root = useRef<HTMLElement>(null);
  const zoom = useMemo(() => ({ value: 0 }), []);
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const navList = useRef<HTMLOListElement>(null);
  const navPill = useRef<HTMLSpanElement>(null);

  // Slide the highlight to the chapter you're reading.
  useLayoutEffect(() => {
    const a = navList.current?.querySelectorAll<HTMLElement>('a')[current];
    if (!a || !navPill.current) return;
    gsap.to(navPill.current, { x: a.offsetLeft, width: a.offsetWidth, duration: 0.55, ease: 'expo.out' });
    a.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  // Track which chapter is on screen for the chapter nav.
  useEffect(() => {
    const els = CHAPTERS.map((_, i) => document.getElementById(`ch-${i + 1}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(Number(e.target.id.slice(3)) - 1);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [id]);

  const planet = o.location === 'moon' || o.location === 'mars' ? o.location : null;
  const site = planet && o.coordinates ? [{ id: o.id, label: o.shortName, lat: o.coordinates.lat, lon: o.coordinates.lon }] : [];

  // GSAP ScrollTrigger: reading-progress bar, word-by-word mission text, and the
  // chapter-4 descent from orbit to the landing site, all scrubbed by the scroll.
  useGsap(
    root,
    (reducedMotion) => {
      gsap.fromTo('.progress', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });
      if (reducedMotion) {
        zoom.value = 1;
        return;
      }
      gsap.fromTo(
        '.mission-text .w',
        { opacity: 0.14 },
        { opacity: 1, stagger: 0.04, ease: 'none', scrollTrigger: { trigger: '.mission-text', start: 'top 80%', end: 'bottom 45%', scrub: true } },
      );
      if (document.querySelector('.descent')) {
        gsap.fromTo(zoom, { value: 0 }, { value: 1, ease: 'none', scrollTrigger: { trigger: '.descent', start: 'top top', end: 'bottom bottom', scrub: 1 } });
        gsap.fromTo('.descent-copy', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, scrollTrigger: { trigger: '.descent', start: '55% bottom', end: '75% bottom', scrub: true } });
        gsap.fromTo('.descent-hint', { autoAlpha: 1 }, { autoAlpha: 0, scrollTrigger: { trigger: '.descent', start: 'top top', end: '20% top', scrub: true } });
      }
    },
    [id],
  );

  const idx = CORE.findIndex((x) => x.id === o.id);
  const next = o.epilogue ? CORE[0] : CORE[(idx + 1) % CORE.length];
  const back = o.location === 'interstellar' ? '#/' : `#/${o.location}`;

  return (
    <article ref={root} className={`story story-${o.location}`}>
      <div className="progress" aria-hidden="true" />

      <nav className="chapter-nav" aria-label="Chapters">
        <ol ref={navList}>
          <span ref={navPill} className="chapter-pill" aria-hidden="true" />
          {CHAPTERS.map((c, i) => (
            <li key={c}>
              <a
                href={`#ch-${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(`ch-${i + 1}`);
                  if (el) scrollToTarget(el, { offset: -110 });
                }}
                aria-current={current === i ? 'step' : undefined}
              >
                <span className="num">{i + 1}</span>
                <span className="label">{c}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <header className="story-head">
        <a className="back" href={back}>← {o.location === 'interstellar' ? 'Home' : PLACE_LABEL[o.location]}</a>
        {o.epilogue && <p className="epilogue-flag">Epilogue · this object is not on the Moon or Mars</p>}
        <p className="eyebrow">
          <PlaceTag place={o.location} /> · {o.year}
        </p>
        <SplitReveal as="h1" text={o.name} onLoad delay={0.35} />
        <Reveal delay={0.5}>
          <p className="lede">{o.character}</p>
        </Reveal>
      </header>

      {/* 1 */}
      <section id="ch-1" className="chapter" aria-labelledby="h-1">
        <ChapterTitle n={1} />
        <Viewer o={o} />
        <Reveal>
          <FactPanel o={o} />
        </Reveal>
      </section>

      {/* 2 */}
      <section id="ch-2" className="chapter" aria-labelledby="h-2">
        <ChapterTitle n={2} />
        <p className="mission-text" aria-label={o.mission}>
          {o.mission.split(' ').map((w, i) => (
            <span key={i} className="w" aria-hidden="true">
              {w}{' '}
            </span>
          ))}
        </p>
      </section>

      {/* 3 */}
      <section id="ch-3" className="chapter" aria-labelledby="h-3">
        <ChapterTitle n={3} />
        <div className="evidence-grid">
          {o.discoveries.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.1}>
              <EvidenceCard d={d} n={i + 1} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 4 */}
      <section id="ch-4" className="chapter" aria-labelledby="h-4">
        <ChapterTitle n={4} />
        {planet && site.length > 0 && (
          <div className="descent">
            <div className="descent-stage">
              <GlobeCanvas
                place={planet}
                sites={site}
                active={o.id}
                zoom={zoom}
                reducedMotion={reduced}
                fallback={o.restImage ? <img className="descent-fallback" src={o.restImage.src} alt={o.restImage.alt} /> : <div />}
              />
              <p className="descent-hint">Keep scrolling to fly down to where it rests ↓</p>
              <div className="descent-copy">
                <StatusBadge status={o.status} />
                <p className="rest-text">{o.statusText}</p>
                <p className="muted small">
                  {o.site} · {Math.abs(o.coordinates!.lat).toFixed(1)}°{o.coordinates!.lat >= 0 ? 'N' : 'S'}, {Math.abs(o.coordinates!.lon).toFixed(1)}°
                  {o.coordinates!.lon >= 0 ? 'E' : 'W'}
                </p>
              </div>
            </div>
          </div>
        )}
        <Reveal className={`rest${planet && site.length ? ' rest-after' : ''}`}>
          {o.restImage && <Photo img={o.restImage} className="rest-photo" />}
          {planet && site.length ? (
            o.restImage && (
              <div className="rest-copy">
                <p className="eyebrow">The real thing</p>
                <p>{o.restImage.alt}</p>
              </div>
            )
          ) : (
            <div className="rest-copy">
              <StatusBadge status={o.status} />
              <p className="rest-text">{o.statusText}</p>
              <p className="muted">{o.site}</p>
            </div>
          )}
        </Reveal>
      </section>

      {/* 5 */}
      <section id="ch-5" className="chapter chapter-question" aria-labelledby="h-5">
        <ChapterTitle n={5} />
        <Question id={o.id} />
      </section>

      <SourcePanel o={o} />

      <NextStory id={next.id} />
    </article>
  );
}

function ChapterTitle({ n }: { n: number }) {
  return (
    <div className="chapter-title">
      <span className="chapter-num">{String(n).padStart(2, '0')}</span>
      <SplitReveal text={CHAPTERS[n - 1]} id={`h-${n}`} />
    </div>
  );
}

/** Evidence card: tilts toward the pointer and opens the photo full-screen. */
function EvidenceCard({ d, n }: { d: SpaceObject['discoveries'][number]; n: number }) {
  const ref = useTilt<HTMLDivElement>(6);
  const [open, setOpen] = useState(false);
  return (
    <div ref={ref} className="evidence-card">
      <span className="glare" aria-hidden="true" />
      <span className="evidence-n" aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
      {d.image ? (
        <button type="button" className="evidence-photo" onClick={() => setOpen(true)} data-cursor="View" aria-label={`Open photo: ${d.image.alt}`}>
          <img src={d.image.src} alt={d.image.alt} loading="lazy" decoding="async" />
          <span className="evidence-zoom" aria-hidden="true">⤢</span>
        </button>
      ) : (
        <div className="evidence-icon" aria-hidden="true">
          <span>✦</span>
        </div>
      )}
      <h3>{d.title}</h3>
      <p>{d.text}</p>
      {d.image && (
        <p className="photo-credit">
          Image: {d.image.credit} · {d.image.nasaId}
        </p>
      )}
      {open && d.image && <Lightbox img={d.image} title={d.title} text={d.text} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Full-width "next story" card with the next machine's photo drifting behind. */
function NextStory({ id }: { id: string }) {
  const n = byId(id)!;
  const ref = useRef<HTMLAnchorElement>(null);
  useGsap(ref, (reduced) => {
    if (reduced) return;
    gsap.fromTo('.next-bg img', { yPercent: -12, scale: 1.15 }, { yPercent: 12, scale: 1.05, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  return (
    <a ref={ref} href={`#/object/${n.id}`} className="next-story" data-cursor="Next">
      <span className="next-bg" aria-hidden="true">
        <img src={n.fallbackImage.src} alt="" loading="lazy" />
      </span>
      <span className="next-copy">
        <span className="eyebrow">Next story</span>
        <span className="next-title">{n.shortName}</span>
        <span className="next-q">“{n.question}”</span>
      </span>
      <span className="next-arrow" aria-hidden="true">→</span>
    </a>
  );
}

function Question({ id }: { id: string }) {
  const o = byId(id)!;
  const saved = useAnswers()[id];
  const [choice, setChoice] = useState<string | null>(saved?.choiceId ?? null);
  const [reason, setReason] = useState(saved?.reason ?? '');
  const [savedNote, setSavedNote] = useState(false);
  const picked = o.nextMissionChoices.find((c) => c.id === choice);

  const save = (choiceId: string, why: string) => {
    const c = o.nextMissionChoices.find((x) => x.id === choiceId)!;
    answers.save({ objectId: id, choiceId, theme: c.theme, reason: why.trim().slice(0, 400), at: new Date().toISOString() });
  };

  return (
    <div className="question">
      <div className="knowledge">
        <Reveal className="k k-confirmed">
          <h3>
            <span className="k-dot" aria-hidden="true" /> Confirmed
          </h3>
          <ul>{o.confirmed.map((t) => <li key={t}>{t}</li>)}</ul>
        </Reveal>
        <Reveal className="k k-inferred" delay={0.08}>
          <h3>
            <span className="k-dot" aria-hidden="true" /> Scientists think
          </h3>
          <ul>{o.inferred.map((t) => <li key={t}>{t}</li>)}</ul>
        </Reveal>
        <Reveal className="k k-unknown" delay={0.16}>
          <h3>
            <span className="k-dot" aria-hidden="true" /> Still unknown
          </h3>
          <ul>{o.unknown.map((t) => <li key={t}>{t}</li>)}</ul>
        </Reveal>
      </div>

      <Reveal>
        <fieldset className="next-mission">
          <legend>
            <span className="eyebrow">Your next mission</span>
            <span className="big-q">{o.question}</span>
          </legend>
          <p className="muted">There is no wrong answer. Pick the one you would send.</p>
          <div className="choices">
            {o.nextMissionChoices.map((c) => (
              <label key={c.id} className={`choice${choice === c.id ? ' is-picked' : ''}`} style={{ ['--theme' as string]: THEMES[c.theme].color }}>
                <input
                  type="radio"
                  name={`q-${id}`}
                  value={c.id}
                  checked={choice === c.id}
                  onChange={(e) => {
                    const first = !saved;
                    setChoice(c.id);
                    save(c.id, reason);
                    setSavedNote(false);
                    const label = e.currentTarget.closest('label');
                    if (label) starBurst(label as HTMLElement, THEMES[c.theme].color);
                    toast(first ? '✦ A new star joined your constellation' : '✦ Your star moved to ' + THEMES[c.theme].label);
                  }}
                />
                <span className="choice-text">{c.label}</span>
                <span className="choice-theme">{THEMES[c.theme].label}</span>
              </label>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {picked && (
              <motion.div key={picked.id} className="feedback" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <p>{picked.feedback}</p>
                <label className="reason">
                  <span>Why would you send it there? (optional, stays on this device)</span>
                  <textarea
                    value={reason}
                    maxLength={400}
                    rows={3}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setSavedNote(false);
                    }}
                    placeholder="Because…"
                  />
                </label>
                <div className="feedback-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      save(picked.id, reason);
                      setSavedNote(true);
                      toast('✦ Your reason is saved with your star');
                    }}
                  >
                    Add to my constellation ✦
                  </button>
                  {savedNote && <span className="saved-note">Saved. A new star is shining.</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>
      </Reveal>
    </div>
  );
}
