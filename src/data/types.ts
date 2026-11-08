// Shape of one object record in objects.json.
// The same shape is enforced at build time by scripts/object.schema.json (Ajv).

export type Place = 'moon' | 'mars' | 'interstellar';
export type Status = 'silent' | 'retired' | 'still-working';
export type Theme = 'water' | 'life' | 'geology' | 'tools' | 'deep-space';
export type ModelKind = 'retroreflector' | 'lrv' | 'surveyor' | 'sojourner' | 'opportunity' | 'insight' | 'voyager';

export interface NasaImage {
  src: string;
  alt: string;
  credit: string;
  nasaId: string;
}

export interface Hotspot {
  id: string;
  label: string;
  text: string;
  /** Position in model space, used to pin the marker on the 3D model. */
  position: [number, number, number];
}

export interface Discovery {
  title: string;
  text: string;
  image?: NasaImage;
}

export interface Choice {
  id: string;
  label: string;
  theme: Theme;
  feedback: string;
}

export interface Source {
  title: string;
  url: string;
  publisher: string;
}

export interface Verification {
  writer: string;
  /** Second person who checked every fact against the sources. "PENDING" until done. */
  checker: string;
  date: string | null;
}

export interface SpaceObject {
  id: string;
  name: string;
  shortName: string;
  location: Place;
  site: string;
  coordinates: { lat: number; lon: number } | null;
  date: string;
  year: number;
  status: Status;
  statusText: string;
  character: string;
  purpose: string;
  mission: string;
  discoveries: Discovery[];
  hotspots: Hotspot[];
  confirmed: string[];
  inferred: string[];
  unknown: string[];
  question: string;
  nextMissionChoices: Choice[];
  modelKind: ModelKind;
  modelPath: string | null;
  fallbackImage: NasaImage;
  restImage: NasaImage | null;
  teacherPrompts: string[];
  sources: Source[];
  credits: string;
  verifiedBy: Verification;
  epilogue: boolean;
}

export const THEMES: Record<Theme, { label: string; color: string }> = {
  water: { label: 'Water', color: '#5fb3ff' },
  life: { label: 'Life', color: '#7be0a0' },
  geology: { label: 'Geology', color: '#f0a35e' },
  tools: { label: 'Tools & engineering', color: '#d7c7ff' },
  'deep-space': { label: 'Deep space', color: '#ff8fb8' },
};
