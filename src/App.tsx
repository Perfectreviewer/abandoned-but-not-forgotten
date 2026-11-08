import { MotionConfig } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Starfield } from './components/Starfield';
import { MagneticLink, PageCurtain, Preloader } from './components/fx';
import { RocketCursor } from './components/RocketCursor';
import { useRoute, byId, useReducedMotion, useAnswers, type Route } from './lib/util';
import { gsap, ScrollTrigger } from './lib/gsap';
import { startSmoothScroll } from './lib/motion';
import Home from './pages/Home';
import World from './pages/World';
import Story from './pages/Story';
import Timeline from './pages/Timeline';
import Constellation from './pages/Constellation';
import Teacher from './pages/Teacher';
import About from './pages/About';


function titleFor(r: Route) {
  const base = 'Abandoned but Not Forgotten';
  switch (r.page) {
    case 'world':
      return `${r.place === 'moon' ? 'The Moon' : 'Mars'} · ${base}`;
    case 'object':
      return `${byId(r.id)?.shortName} · ${base}`;
    case 'timeline':
      return `Timeline · ${base}`;
    case 'constellation':
      return `Your Question Constellation · ${base}`;
    case 'teacher':
      return `Teacher page · ${base}`;
    case 'about':
      return `About & sources · ${base}`;
    default:
      return base;
  }
}

const routeKey = (r: Route) => (r.page === 'object' ? `object/${r.id}` : r.page === 'world' ? r.place : r.page);

/** Header that tucks away when you scroll down and returns when you scroll up. */
function Header({ route }: { route: Route }) {
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const stars = Object.keys(useAnswers()).length;

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const hide = self.direction === 1 && self.scroll() > 240;
        document.body.classList.toggle('header-hidden', hide);
        document.body.classList.toggle('scrolled', self.scroll() > 20);
      },
    });
    return () => st.kill();
  }, []);

  // Slide a highlight pill under the current nav item.
  useLayoutEffect(() => {
    const cur = nav.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!pill.current) return;
    if (!cur) {
      gsap.to(pill.current, { autoAlpha: 0, duration: 0.3 });
      return;
    }
    gsap.to(pill.current, { x: cur.offsetLeft, width: cur.offsetWidth, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
  }, [route]);

  const is = (p: string) => (routeKey(route) === p ? 'page' : undefined);
  return (
    <header className="site-header">
      <a href="#/" className="brand" aria-label="Abandoned but Not Forgotten, home" data-cursor="Home">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-text">
          Abandoned <em>but</em> Not Forgotten
        </span>
      </a>
      <nav aria-label="Main" ref={nav}>
        <span ref={pill} className="nav-pill" aria-hidden="true" />
        <a href="#/moon" aria-current={is('moon')}>Moon</a>
        <a href="#/mars" aria-current={is('mars')}>Mars</a>
        <a href="#/timeline" aria-current={is('timeline')}>Timeline</a>
        <a href="#/constellation" className="nav-constellation" aria-current={is('constellation')}>
          <span className="nav-star" aria-hidden="true">✦</span> My questions
          {stars > 0 && <span className="nav-count" aria-label={`${stars} answered`}>{stars}</span>}
        </a>
      </nav>
    </header>
  );
}

export default function App() {
  const route = useRoute();
  const reduced = useReducedMotion();

  useEffect(() => {
    startSmoothScroll();
  }, []);

  useEffect(() => {
    document.title = titleFor(route);
  }, [route]);

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <Starfield still={reduced} />
      <div className="grain" aria-hidden="true" />
      <Preloader />
      <RocketCursor />
      <PageCurtain routeKey={routeKey(route)} />
      <Header route={route} />
      <main id="main" tabIndex={-1}>
        {route.page === 'home' && <Home />}
        {route.page === 'world' && <World place={route.place} />}
        {route.page === 'object' && <Story key={route.id} id={route.id} />}
        {route.page === 'timeline' && <Timeline />}
        {route.page === 'constellation' && <Constellation />}
        {route.page === 'teacher' && <Teacher />}
        {route.page === 'about' && <About />}
      </main>
      <footer className="site-footer">
        <div className="footer-cta">
          <p className="eyebrow">Keep exploring</p>
          <p className="footer-big">
            Every machine left a question.
            <br />
            <span className="accent">Which one is yours?</span>
          </p>
          <div className="footer-btns">
            <MagneticLink href="#/moon" className="btn" cursor="Go">The Moon</MagneticLink>
            <MagneticLink href="#/mars" className="btn ghost" cursor="Go">Mars</MagneticLink>
          </div>
        </div>
        <div className="footer-meta">
          <p>Made for the NASA Space Apps Challenge 2026. Images, models and mission facts from NASA; this site is not endorsed by NASA.</p>
          <p className="footer-links">
            <a href="#/teacher">For teachers</a>
            <a href="#/about">About &amp; sources</a>
            <a href="#/object/voyager-1">Epilogue: Voyager 1</a>
          </p>
        </div>
      </footer>
    </MotionConfig>
  );
}
