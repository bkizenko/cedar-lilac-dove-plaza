import type { Game } from "./sim";
import { HALF, MAP } from "./constants";
export const TRAIL_GRID = 256,
  TRAIL_CELL = MAP / TRAIL_GRID;
export type Trail = { cell: number; wear: number; last: number; angle: number; x?:number; z?:number };
const caches = new WeakMap<Game, { source: Trail[]; map: Map<number, Trail> }>();
export function trailCell(x: number, z: number) {
  const ix = Math.floor((x + HALF) / TRAIL_CELL),
    iz = Math.floor((z + HALF) / TRAIL_CELL);
  return ix < 0 || iz < 0 || ix >= TRAIL_GRID || iz >= TRAIL_GRID ? -1 : iz * TRAIL_GRID + ix;
}
function map(g: Game) {
  const source = (g.state.trails ??= []);
  let cache = caches.get(g);
  if (!cache || cache.source !== source) {
    cache = { source, map: new Map(source.map((t) => [t.cell, t])) };
    caches.set(g, cache);
  }
  return cache.map;
}
export function pathPace(g: Game, x: number, z: number) {
  const t = map(g).get(trailCell(x, z));
  return t ? 1 + Math.max(0, t.wear - 0.4) * 0.2 : 1;
}
export function wearTrail(g: Game, x: number, z: number, dx: number, dz: number) {
  const cell = trailCell(x, z),
    distance = Math.hypot(dx, dz);
  if (cell < 0 || distance < 0.01) return;
  const roads = map(g);
  let t = roads.get(cell);
  if (!t) {
    if (roads.size >= 8192) return;
    t = { cell, wear: 0, last: g.state.time, angle: Math.atan2(dx, dz), x, z };
    roads.set(cell, t);
    g.state.trails!.push(t);
  }
  // Keep the visual mark on the actual route instead of snapping to a four-metre tile.
  const blend=t.x===undefined?1:Math.min(.15,distance/4);
  t.x=(t.x??x)+(x-(t.x??x))*blend;t.z=(t.z??z)+(z-(t.z??z))*blend;
  const angle=Math.atan2(dx,dz);
  t.angle+=Math.atan2(Math.sin(angle-t.angle),Math.cos(angle-t.angle))*blend;
  t.angle=Math.atan2(Math.sin(t.angle),Math.cos(t.angle));
  t.wear = Math.min(1, t.wear + distance / 16);
  t.last = g.state.time;
}
export function fadeTrails(g: Game, dt: number) {
  if (!g.state.trails) return;
  for (const t of g.state.trails)
    if (g.state.time - t.last > 180) t.wear = Math.max(0, t.wear - dt / 3600);
  if (g.state.trails.length > 7000) {
    g.state.trails = g.state.trails.filter((t) => t.wear > 0.02);
    caches.delete(g);
  }
}
