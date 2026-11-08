import { SplitReveal } from '../components/fx';
import { OBJECTS } from '../lib/util';

export default function About() {
  const images = OBJECTS.flatMap((o) => [o.fallbackImage, o.restImage, ...o.discoveries.map((d) => d.image)]).filter(
    (x, i, arr): x is NonNullable<typeof x> => !!x && arr.findIndex((y) => y?.nasaId === x.nasaId) === i,
  );

  return (
    <div className="page prose">
      <header className="page-head">
        <p className="eyebrow">NASA Space Apps Challenge 2026</p>
        <SplitReveal as="h1" text="About this project" onLoad delay={0.3} />
        <p className="lede">
          <em>Abandoned but Not Forgotten</em> tells the stories of NASA hardware left on the Moon and Mars, the science
          each machine made possible, and the question each one left for the next generation.
        </p>
      </header>

      <h2 className="h3">How we keep it accurate</h2>
      <ul>
        <li>Every fact links to a NASA source on its story page, under “Where this comes from”.</li>
        <li>Every object needs one writer and a different teammate who checks each fact. Until that happens, the page says “Draft”.</li>
        <li>All object data lives in one JSON file that is checked automatically at build time. A record without sources or a named checker cannot ship.</li>
        <li>Opportunity found strong signs of past water on Mars, not evidence of life. We say so on its page.</li>
      </ul>

      <h2 className="h3">NASA data used</h2>
      <ul>
        <li><a href="https://images.nasa.gov/">NASA Image and Video Library</a>: every photo on this site ({images.length} images).</li>
        <li>NASA and NASA Science mission pages for each object: facts, dates and status.</li>
        <li><a href="https://github.com/nasa/NASA-3D-Resources">NASA 3D Resources</a>: 3D models of Opportunity, InSight, Voyager and the Apollo Lunar Module. NASA has not published models of the Apollo retroreflector, Lunar Rover, Surveyor 3 or Sojourner, so those are simplified models built by the team.</li>
        <li><a href="https://svs.gsfc.nasa.gov/4720">NASA Scientific Visualization Studio, CGI Moon Kit</a>: the Lunar Reconnaissance Orbiter colour and elevation maps on our 3D Moon. The Mars globe uses the Mars map from NASA 3D Resources.</li>
        <li><a href="https://pds.nasa.gov/">NASA Planetary Data System</a>: deeper data for teachers.</li>
      </ul>

      <h2 className="h3">Image credits</h2>
      <ul className="small credit-list">
        {images.map((img) => (
          <li key={img.nasaId}>
            <a href={`https://images.nasa.gov/details/${encodeURIComponent(img.nasaId)}`}>{img.nasaId}</a>: {img.credit}
          </li>
        ))}
      </ul>

      <h2 className="h3">Use of AI</h2>
      <p>
        AI tools helped write code and draft text for this site. Every AI-drafted fact is checked against a NASA
        source by a person before it is marked as verified.
      </p>

      <h2 className="h3">Privacy</h2>
      <p>No accounts, no tracking, no server. Your answers to the unfinished questions are kept only in your own browser.</p>

      <p className="muted small">This site is a student project and is not endorsed by NASA.</p>
    </div>
  );
}
