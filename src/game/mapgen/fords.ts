/** Ford verification: a ford is only kept if the finished height field really is wadable there. */
import { WATER_Y } from '../constants';
import type { Hydrology } from './hydro';
import type { HeightField } from './heightfield';
export const FORD_RULES = { maxDepthMetres: 0.5, maxChannelGrade: 0.12, maxApproachRiseMetres: 2.6, approachMetres: 6 } as const;
export type FordReport = { chain: string; x: number; z: number; width: number; depthMetres: number; channelGrade: number; approachRiseMetres: number };
/** Measures every ford group on the finished field; groups that fail lose their flag (the caller rebuilds the field). */
export function checkFords(hf: HeightField, hydro: Hydrology): { fords: FordReport[]; dropped: number } {
  const fords: FordReport[] = [];
  let dropped = 0;
  for (const ch of hydro.chains) {
    const pts = ch.pts;
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].ford) continue;
      let j = i;
      while (j + 1 < pts.length && pts[j + 1].ford) j++;
      const a = pts[i], b = pts[j], c = pts[Math.floor((i + j) / 2)];
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len, half = c.w / 2;
      let depth = 0, approach = -Infinity;
      for (let k = Math.min(j, i + 2); k <= Math.max(i, j - 2); k++) {
        const p = pts[k], surface = p.y + WATER_Y;
        for (const f of [-0.8, -0.4, 0, 0.4, 0.8]) depth = Math.max(depth, surface - hf.at(p.x + nx * half * f, p.z + nz * half * f));
        for (const side of [-1, 1]) approach = Math.max(approach, hf.at(p.x + nx * (half + FORD_RULES.approachMetres) * side, p.z + nz * (half + FORD_RULES.approachMetres) * side) - surface);
      }
      const grade = Math.abs(hf.at(a.x, a.z) - hf.at(b.x, b.z)) / len;
      if (depth <= FORD_RULES.maxDepthMetres && grade <= FORD_RULES.maxChannelGrade && approach <= FORD_RULES.maxApproachRiseMetres) fords.push({ chain: ch.id, x: c.x, z: c.z, width: c.w, depthMetres: depth, channelGrade: grade, approachRiseMetres: approach });
      else { for (let k = i; k <= j; k++) pts[k].ford = false; dropped++; }
      i = j;
    }
  }
  return { fords, dropped };
}
