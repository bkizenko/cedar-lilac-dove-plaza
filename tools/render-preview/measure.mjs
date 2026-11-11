// Wood-tone measurement shared by compare.mjs: mean/quantile hue, saturation
// and value of "wood" pixels (hue 12..48 deg, sat >= .28, value >= .22).
// The same mask is applied to the board crop and to renders.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export function requireSharp() {
  for (const b of [path.resolve(here, '../..'), process.env.NODE_PATH || '/home/claude/.npm-global/lib/node_modules']) { try { const r = createRequire(path.join(b, 'noop.js')); return r('sharp'); } catch { } }
  throw new Error('sharp not found (set NODE_PATH to a global node_modules with sharp)');
}
export function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d > 0) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
/** region: {left, top, width, height} in source pixels (optional); exclude: list of rects to skip. */
export async function woodStats(file, { region, exclude = [] } = {}) {
  const sharp = requireSharp();
  let img = sharp(file).removeAlpha();
  if (region) img = img.extract(region);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const H = [], S = [], V = [], R = [0, 0, 0]; let n = 0, total = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (exclude.some(e => x >= e.left && x < e.left + e.width && y >= e.top && y < e.top + e.height)) continue;
    total++;
    const o = (y * info.width + x) * info.channels, r = data[o] / 255, g = data[o + 1] / 255, b = data[o + 2] / 255, [h, s, v] = hsv(r, g, b);
    if (h < 12 || h > 48 || s < .28 || v < .22) continue;
    H.push(h); S.push(s); V.push(v); R[0] += r; R[1] += g; R[2] += b; n++;
  }
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const hex = R.map(c => Math.round(c / n * 255).toString(16).padStart(2, '0')).join('');
  return { coverage: n / total, hue: mean(H), sat: mean(S), val: mean(V), hueQ: [q(H, .1), q(H, .5), q(H, .9)], satQ: [q(S, .1), q(S, .5), q(S, .9)], valQ: [q(V, .1), q(V, .5), q(V, .9)], meanHex: '#' + hex };
}
export const fmt = s => `hue ${s.hue.toFixed(1)}° (p10/50/90 ${s.hueQ.map(v => v.toFixed(0)).join('/')}) · sat ${s.sat.toFixed(3)} (${s.satQ.map(v => v.toFixed(2)).join('/')}) · val ${s.val.toFixed(3)} (${s.valQ.map(v => v.toFixed(2)).join('/')}) · mean ${s.meanHex} · wood px ${(s.coverage * 100).toFixed(0)}%`;
/** Board panel H (bottom-middle of the 1536x1024 sheet), inside its frame. */
export const BOARD_H = { left: 520, top: 520, width: 496, height: 496 };
/** UI overlays inside the H crop (icons bottom-left, play controls top-right, compass/scale bottom-right), crop coordinates. */
export const BOARD_H_UI = [{ left: 0, top: 360, width: 60, height: 136 }, { left: 380, top: 0, width: 116, height: 50 }, { left: 330, top: 420, width: 166, height: 76 }];
