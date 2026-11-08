# Abandoned but Not Forgotten

> They stopped moving. Their stories didn't.

A scroll-driven website for the **NASA Space Apps Challenge 2026** where students aged 10–15 meet six pieces of NASA hardware left on the Moon and Mars, learn the science each one made possible, and finish every story by answering the question it left behind.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # validate data, type-check, build to dist/
npm run validate:strict   # run before submitting: fails while any fact-check is PENDING
```

The build is fully static. Deploy `dist/` anywhere: GitHub Pages (workflow included in `.github/workflows/deploy.yml`, enable Pages → "GitHub Actions" in the repo settings) or Vercel (framework preset "Vite").

## What's built (PRD v2.0 requirements)

| ID | Requirement | Where |
|---|---|---|
| FR-01 | Landing page, tagline, Moon/Mars choice | `src/pages/Home.tsx` |
| FR-02 | Five-chapter story driven by one JSON file | `src/pages/Story.tsx`, `src/data/objects.json` |
| FR-03 | 3D viewer (rotate, zoom) with image fallback | `src/components/Viewer.tsx`, `src/three/` |
| FR-04 | Fact panel | `FactPanel` in `src/components/bits.tsx` |
| FR-05 | Confirmed / Scientists think / Still unknown | Chapter 5 in `Story.tsx` |
| FR-06 | "Your next mission" choice with feedback per option | Chapter 5 in `Story.tsx` |
| FR-07 | "Where this comes from" source panel | `SourcePanel` in `bits.tsx` |
| FR-08 | Mobile-friendly layout | `src/styles.css` (tested at 375 px wide) |
| FR-09 | 3D hotspots on 3 parts per model | `hotspots[]` in the JSON |
| FR-10 | Timeline 1967–2022 | `src/pages/Timeline.tsx` |
| FR-11 | Keyboard nav, alt text, reduced motion | Hotspots mirrored as real buttons; `prefers-reduced-motion` stops auto-rotate, twinkle and animations |
| FR-12 | Question Constellation (localStorage only) | `src/pages/Constellation.tsx` |
| FR-13 | Printable teacher page | `src/pages/Teacher.tsx` (`#/teacher`, print styles included) |
| FR-14 | Voyager 1 epilogue | Flagged `epilogue: true`, clearly labelled as beyond the Moon and Mars |

Also: a Moon/Mars map placing each object by its real latitude/longitude, and an About page with the "NASA data used", image credits and AI-use statements for the submission form.

## Team to-dos before submission

1. **Fact-check every object (blocking).** All text in `objects.json` is an AI-assisted first draft. For each object, the research lead checks every sentence against the linked NASA sources, then sets `verifiedBy.checker` to their name and `verifiedBy.date`. The site shows "Draft" on any object still marked `PENDING`, and `npm run validate:strict` fails until all are done.
2. **3D models.** Opportunity, InSight and Voyager use real NASA 3D Resources models (`public/models/`, each under 2 MB, meshopt-compressed). NASA publishes no models for the retroreflector, Lunar Rover, Surveyor 3 or Sojourner, so those are hand-built in `src/three/models.tsx`; if you find or make better ones, compress with `npx gltf-transform optimize in.glb public/models/<id>.glb --compress meshopt --texture-compress false`, set `"modelPath"`, and place hotspots with `?debug` (open `http://localhost:5173/?debug#/object/<id>` and click the model; the console prints coordinates) or `scripts/model-geometry.mjs`.
3. **Re-check the 2026 submission guide** when it's released on 13 November.
4. Record the 30-second demo with English subtitles.

## Data rules (enforced at build time)

`scripts/validate-data.mjs` checks `src/data/objects.json` against `scripts/object.schema.json` with Ajv. The build fails if a record:

- is missing `sources` (must be `nasa.gov` URLs) or `verifiedBy`;
- has a mission text over 80 words;
- has the same writer and checker;
- sits outside the Moon or Mars without being marked as the epilogue;
- uses images not hosted by the NASA Image and Video Library.

## Stack

React 18 + TypeScript + Vite · Three.js via React Three Fiber + Drei + postprocessing (lazy-loaded after first paint) · GSAP + ScrollTrigger for every scroll-driven animation (landing Moon-to-Mars flight, word-by-word mission text, chapter-4 descent to the landing site, camera fly-ins and hotspot glides) · Framer Motion for small UI transitions · Ajv · localStorage. No backend, no accounts, no tracking.

### 3D scenes

- **Landing:** real NASA Moon (LRO colour + elevation) and Mars globes; scrolling flies the camera from one to the other, with each object pinned at its true landing coordinates.
- **Moon / Mars pages:** drag-to-spin globes; hovering a card turns the globe to that site.
- **Story chapter 1:** the object on sculpted terrain with craters or rocks, harsh sunlight and real shadows, a black sky with Earth (Moon) or dusty haze (Mars), and the Lunar Module in the background of the Apollo-era scenes.
- **Story chapter 4:** a scroll-scrubbed descent from orbit to the exact landing site.
- Everything respects reduced-motion settings and falls back to NASA photos without WebGL.

## AI use

AI tools (Claude) helped write the code and draft the story text. Every AI-drafted fact must be checked against a NASA source by a teammate before it is marked verified.
