import { SplitReveal } from '../components/fx';
import { PlaceTag, StatusBadge } from '../components/bits';
import { formatDate, OBJECTS } from '../lib/util';

/** FR-13: a printable page with facts, the three knowledge levels, prompts and sources. */
export default function Teacher() {
  return (
    <div className="page teacher">
      <header className="page-head">
        <p className="eyebrow">For teachers and home-schoolers</p>
        <SplitReveal as="h1" text="Teacher page" onLoad delay={0.3} />
        <p className="lede">
          One page per object: the key facts, what is confirmed versus what scientists think, discussion prompts, and
          the NASA sources. Built for ages 10–15; each story takes 3–5 minutes on screen.
        </p>
        <button className="btn no-print" onClick={() => window.print()}>Print this page</button>
      </header>

      <section className="teacher-howto">
        <h2 className="h3">A 30-minute lesson idea</h2>
        <ol>
          <li><strong>5 min:</strong> As a class, open one story and spin the 3D model together.</li>
          <li><strong>10 min:</strong> In pairs, students read chapters 2–4 and note one surprising fact.</li>
          <li><strong>10 min:</strong> Each pair picks a next mission in chapter 5 and writes one sentence on why.</li>
          <li><strong>5 min:</strong> Share. Sort the class’s answers into “Confirmed”, “Scientists think” and “Still unknown”.</li>
        </ol>
        <p className="muted small">Students’ answers are stored only in their own browser. Nothing is sent anywhere.</p>
      </section>

      {OBJECTS.map((o) => (
        <section key={o.id} className="teacher-object">
          <h2>
            {o.name} {o.epilogue && <span className="muted small">(epilogue, not on the Moon or Mars)</span>}
          </h2>
          <p className="teacher-meta">
            <PlaceTag place={o.location} /> <StatusBadge status={o.status} /> {formatDate(o.date)} · {o.site}
          </p>
          <p>{o.mission}</p>
          <div className="teacher-cols">
            <div>
              <h3>Confirmed</h3>
              <ul>{o.confirmed.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div>
              <h3>Scientists think</h3>
              <ul>{o.inferred.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div>
              <h3>Still unknown</h3>
              <ul>{o.unknown.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
          <h3>Discussion prompts</h3>
          <ul>
            <li><strong>{o.question}</strong></li>
            {o.teacherPrompts.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <h3>Sources</h3>
          <ul className="small">
            {o.sources.map((s) => (
              <li key={s.url}>
                {s.title}, {s.publisher}: <a href={s.url}>{s.url}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
