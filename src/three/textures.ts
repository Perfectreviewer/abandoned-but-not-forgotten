// Procedural canvas textures: regolith detail, crinkled gold foil, solar cells.
// Generated once in the browser, so they cost nothing to download.
import * as THREE from 'three';
import { fbm, noise2 } from './noise';

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, size: number, paint: (img: ImageData) => void, color = true, repeat = 1) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  paint(img);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Tileable-ish grey/red regolith grain used on the ground near the object. */
export function regolithTexture(place: 'moon' | 'mars') {
  const [r0, g0, b0] = place === 'moon' ? [118, 115, 110] : [150, 78, 44];
  const [r1, g1, b1] = place === 'moon' ? [165, 162, 155] : [196, 112, 66];
  return canvasTexture(`regolith-${place}`, 512, (img) => {
    const s = img.width;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const n = fbm(x / 64, y / 64, 5, place === 'moon' ? 3 : 7);
        const grain = noise2(x * 0.9, y * 0.9, 11) * 0.25;
        const t = Math.min(1, Math.max(0, n * 1.1 + grain - 0.15));
        const i = (y * s + x) * 4;
        img.data[i] = r0 + (r1 - r0) * t;
        img.data[i + 1] = g0 + (g1 - g0) * t;
        img.data[i + 2] = b0 + (b1 - b0) * t;
        img.data[i + 3] = 255;
      }
  }, true, 6);
}

/** Normal map that makes flat panels look like crinkled multi-layer insulation foil. */
export function foilNormal() {
  return canvasTexture('foil-normal', 256, (img) => {
    const s = img.width;
    const h = (x: number, y: number) => fbm(x / 18, y / 18, 4, 5) + noise2(x / 5, y / 5, 9) * 0.25;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const dx = h(x + 1, y) - h(x - 1, y);
        const dy = h(x, y + 1) - h(x, y - 1);
        const nx = -dx * 3;
        const ny = -dy * 3;
        const len = Math.hypot(nx, ny, 1);
        const i = (y * s + x) * 4;
        img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
        img.data[i + 2] = (1 / len) * 0.5 * 255 + 127;
        img.data[i + 3] = 255;
      }
  }, false, 2);
}

/** Roughness map with fine brushed streaks, for bare aluminium. */
export function brushedRoughness() {
  return canvasTexture('brushed', 256, (img) => {
    const s = img.width;
    for (let y = 0; y < s; y++) {
      const row = noise2(0, y * 0.9, 31) * 60;
      for (let x = 0; x < s; x++) {
        const v = 120 + row + noise2(x / 60, y * 2, 32) * 40 + fbm(x / 30, y / 30, 3, 33) * 30;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v);
        img.data[i + 3] = 255;
      }
    }
  }, false, 2);
}

/** Woven wire mesh with see-through gaps (alpha), like the Lunar Rover's piano-wire tyres. */
export function wireMeshTexture() {
  return canvasTexture('wiremesh', 256, (img) => {
    const s = img.width;
    const cell = 16;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        // two diagonal wire families
        const a = (x + y) % cell;
        const b = (x - y + s * 4) % cell;
        const wire = a < 3 || b < 3;
        const shade = wire ? 200 - (a < 3 ? a : b) * 25 : 0;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = shade;
        img.data[i + 3] = wire ? 255 : 0;
      }
  }, false, 1);
}

/** Soft blotches of dust and wear, multiplied over paint so nothing looks factory-new. */
export function grimeTexture(place: 'moon' | 'mars') {
  const tint = place === 'mars' ? [214, 150, 112] : [196, 192, 184];
  return canvasTexture(`grime-${place}`, 256, (img) => {
    const s = img.width;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const n = fbm(x / 40, y / 40, 5, 41);
        const t = Math.min(1, Math.max(0, (n - 0.35) * 1.8)) * 0.55 + (y / s) * 0.25; // dustier lower down
        const i = (y * s + x) * 4;
        img.data[i] = 255 + (tint[0] - 255) * t;
        img.data[i + 1] = 255 + (tint[1] - 255) * t;
        img.data[i + 2] = 255 + (tint[2] - 255) * t;
        img.data[i + 3] = 255;
      }
  }, true, 1);
}

/** Grid of dark blue solar cells with thin silver lines. */
export function solarTexture() {
  return canvasTexture('solar', 256, (img) => {
    const s = img.width;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const line = x % 32 < 2 || y % 16 < 1;
        const shade = noise2(x / 40, y / 40, 4) * 18;
        const i = (y * s + x) * 4;
        img.data[i] = line ? 150 : 22 + shade;
        img.data[i + 1] = line ? 155 : 34 + shade;
        img.data[i + 2] = line ? 165 : 78 + shade * 1.5;
        img.data[i + 3] = 255;
      }
  }, true, 2);
}
