import { useEffect, useState, useSyncExternalStore } from 'react';
import raw from '../data/objects.json';
import type { SpaceObject, Theme } from '../data/types';
import { scrollToTarget } from './motion';

export const OBJECTS = raw as SpaceObject[];
export const CORE = OBJECTS.filter((o) => !o.epilogue);
export const byId = (id: string) => OBJECTS.find((o) => o.id === id);

// ---------- Hash routing (works on any static host, including GitHub Pages) ----------
export type Route =
  | { page: 'home' }
  | { page: 'world'; place: 'moon' | 'mars' }
  | { page: 'object'; id: string }
  | { page: 'timeline' }
  | { page: 'constellation' }
  | { page: 'teacher' }
  | { page: 'about' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'moon':
    case 'mars':
      return { page: 'world', place: parts[0] };
    case 'object':
      return parts[1] && byId(parts[1]) ? { page: 'object', id: parts[1] } : { page: 'home' };
    case 'timeline':
    case 'constellation':
    case 'teacher':
    case 'about':
      return { page: parts[0] };
    default:
      return { page: 'home' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      scrollToTarget(0, { immediate: true });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

// ---------- Answers (Question Constellation), stored only in this browser ----------
export interface Answer {
  objectId: string;
  choiceId: string;
  theme: Theme;
  reason: string;
  at: string;
}

const KEY = 'abnf.answers.v1';
const listeners = new Set<() => void>();
let cache: Record<string, Answer> | null = null;

function read(): Record<string, Answer> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    cache = {};
  }
  return cache!;
}

function write(next: Record<string, Answer>) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode or storage blocked: answers last for this visit only */
  }
  listeners.forEach((l) => l());
}

export const answers = {
  save(a: Answer) {
    write({ ...read(), [a.objectId]: a });
  },
  clear() {
    write({});
  },
};

export function useAnswers(): Record<string, Answer> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
  );
}

// ---------- Environment ----------
export function useReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)';
  const [v, setV] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setV(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return v;
}

let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}

export const PLACE_LABEL = { moon: 'The Moon', mars: 'Mars', interstellar: 'Interstellar space' } as const;
export const STATUS_LABEL = { silent: 'Silent', retired: 'Retired', 'still-working': 'Still working' } as const;

export function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
