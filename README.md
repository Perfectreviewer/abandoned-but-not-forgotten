# Abandoned but Not Forgotten

> They stopped moving. Their stories didn't.

A scroll-driven website built for the **NASA Space Apps Challenge 2026**. Students aged 10–15 meet six pieces of NASA hardware left on the Moon and Mars, learn the science each one made possible, and finish every story by answering the question it left behind.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r169-000000?logo=threedotjs&logoColor=white)
![Static site](https://img.shields.io/badge/backend-none-informational)

## Table of contents

- [Features](#features)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Data and fact-checking](#data-and-fact-checking)
- [Tech stack](#tech-stack)
- [Accessibility and privacy](#accessibility-and-privacy)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [AI use](#ai-use)

## Features

- **Five-chapter stories.** Each object's story is driven by a single JSON record, so content and layout stay separate.
- **Interactive 3D viewer.** Rotate and zoom each object, with hotspots on three parts per model and a NASA photo fallback when WebGL is unavailable.
- **Scroll-driven 3D scenes.** The landing page flies from the Moon to Mars on real NASA globes, and chapter 4 descends from orbit to the exact landing site.
- **Confirmed, Scientists think, Still unknown.** Every story separates established fact from open questions.
- **"Your next mission" choice.** Students answer the question the object left behind and get feedback on each option.
- **Sources on every object.** A "Where this comes from" panel links back to NASA.
- **Timeline and map.** A 1967–2022 timeline, plus a Moon and Mars map that places each object at its real latitude and longitude.
- **Question Constellation.** Students collect their own questions, stored in `localStorage` only.
- **Printable teacher page.** Available at `#/teacher`, with print styles included.
- **Voyager 1 epilogue.** Clearly labelled as going beyond the Moon and Mars.

<details>
<summary>Requirement traceability (PRD v2.0)</summary>

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
| FR-13 | Printable teacher page | `src/pages/Teacher.tsx` |
| FR-14 | Voyager 1 epilogue | Flagged `epilogue: true` in the JSON |

</details>

## Getting started

**Prerequisites:** Node.js 18 or later and npm.

```bash
git clone https://github.com/Perfectreviewer/abandoned-but-not-forgotten.git
cd abandoned-but-not-forgotten
npm install
npm run dev
```

The dev server runs at <http://localhost:5173>.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Validate data, type-check, and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run validate` | Validate `src/data/objects.json` against the schema |
| `npm run validate:strict` | Same, and fail while any fact-check is still `PENDING`. Run before submitting. |

## Project structure

```
.
├── .github/workflows/   GitHub Pages deploy workflow
├── public/
│   ├── models/          Compressed NASA glTF models
│   └── textures/        Moon and Mars globe textures
├── scripts/             Data validation and model tooling
├── src/
│   ├── components/      Shared UI, viewer, starfield, effects
│   ├── data/            objects.json and its TypeScript types
│   ├── lib/             GSAP, motion and utility helpers
│   ├── pages/           Home, Story, World, Timeline, Constellation, Teacher, About
│   └── three/           Globes, scenes, model viewer and hand-built models
└── index.html
```

## Data and fact-checking

All story content lives in `src/data/objects.json`. `scripts/validate-data.mjs` checks it against `scripts/object.schema.json` with Ajv, and the build fails if a record:

- is missing `sources` (which must be `nasa.gov` URLs) or `verifiedBy`;
- has a mission text over 80 words;
- has the same writer and checker;
- sits outside the Moon or Mars without being marked as the epilogue;
- uses images not hosted by the NASA Image and Video Library.

Each object shows a "Draft" badge until a named checker and date are recorded in `verifiedBy`.

## Tech stack

- **Framework:** React 18, TypeScript, Vite
- **3D:** Three.js through React Three Fiber, Drei and postprocessing, lazy-loaded after first paint
- **Animation:** GSAP with ScrollTrigger for scroll-driven motion, Framer Motion for small UI transitions, Lenis for smooth scrolling
- **Validation:** Ajv
- **Storage:** `localStorage` only. There is no backend, no accounts and no tracking.

## Accessibility and privacy

- Full keyboard navigation, with 3D hotspots mirrored as real buttons.
- Alt text on images.
- `prefers-reduced-motion` disables auto-rotate, twinkle and other animations.
- 3D scenes fall back to NASA photos when WebGL is unavailable.
- Mobile-friendly layout, tested at 375 px wide.
- No analytics or tracking. The only stored data is the student's own constellation, kept in their browser.

## Deployment

The build is fully static, so `dist/` can be hosted anywhere.

- **GitHub Pages:** a workflow is included at `.github/workflows/deploy.yml`. In the repository settings, set **Pages → Source** to **GitHub Actions**.
- **Vercel:** import the repo and choose the **Vite** framework preset.

## Roadmap

- [ ] Fact-check every object against its linked NASA sources, then record `verifiedBy.checker` and `verifiedBy.date`. This is blocking for submission.
- [ ] Replace the hand-built models (retroreflector, Lunar Rover, Surveyor 3, Sojourner) with better ones, if available. NASA publishes none for these. Compress new models with:
  ```bash
  npx gltf-transform optimize in.glb public/models/<id>.glb --compress meshopt --texture-compress false
  ```
  then set `"modelPath"` and place hotspots using `?debug` (open `http://localhost:5173/?debug#/object/<id>` and click the model to print coordinates) or `scripts/model-geometry.mjs`.
- [ ] Re-check the 2026 submission guide when it is released on 13 November.
- [ ] Record the 30-second demo with English subtitles.

## AI use

AI tools (Claude) helped write the code and draft the story text. Every AI-drafted fact must be checked against a NASA source by a teammate before it is marked verified.

## Credits

All imagery and 3D models come from NASA, including the NASA Image and Video Library and NASA 3D Resources. See the in-app About page for full credits.
