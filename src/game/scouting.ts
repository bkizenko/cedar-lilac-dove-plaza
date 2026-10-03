import type { Game } from "./sim";
import type { Unit } from "./types";
import { HALF, MAP } from "./constants";
import { isDependent } from "./settlement";
const GRID = 32,
  CELL = MAP / GRID;
export function scoutKnowledge(g: Game, u: Unit) {
  const memories = (g.state.rivalKnowledge ??= []);
  let memory = memories.find((m) => m.team === u.team);
  if (!memory) {
    memory = { team: u.team, cells: [] };
    memories.push(memory);
  }
  const ix = Math.floor((u.x + HALF) / CELL),
    iz = Math.floor((u.z + HALF) / CELL);
  for (let z = iz - 1; z <= iz + 1; z++)
    for (let x = ix - 1; x <= ix + 1; x++)
      if (x >= 0 && z >= 0 && x < GRID && z < GRID && !memory.cells.includes(z * GRID + x))
        memory.cells.push(z * GRID + x);
  return memory;
}
function nextTarget(g: Game, u: Unit) {
  const memory = scoutKnowledge(g, u);
  let best: { x: number; z: number } | null = null,
    score = Infinity;
  for (let i = 0; i < GRID * GRID; i++) {
    if (memory.cells.includes(i)) continue;
    const x = ((i % GRID) + 0.5) * CELL - HALF,
      z = (Math.floor(i / GRID) + 0.5) * CELL - HALF;
    if (g.height(x, z) <= g.world.waterY + 0.3) continue;
    const d = Math.hypot(x - u.x, z - u.z);
    if (d < score) {
      score = d;
      best = { x, z };
    }
  }
  return best;
}
export function tickScouts(g: Game, dt: number) {
  g.state.scoutTimer = (g.state.scoutTimer ?? 120) - dt;
  if (g.state.scoutTimer > 0) return;
  g.state.scoutTimer = 180;
  for (const t of g.state.tribes) {
    if (
      ![1, 2].includes(t.id) ||
      !t.alive ||
      g.state.units.some((u) => u.team === t.id && u.hp > 0 && u.scout)
    )
      continue;
    const u = g.state.units.find(
      (u) =>
        u.team === t.id &&
        u.type === "worker" &&
        u.hp > 0 &&
        !isDependent(g, u) &&
        !u.emergency &&
        !u.visit &&
        !u.foundingJourney &&
        u.carry === 0 &&
        ["idle", "gather", "hold"].includes(u.order),
    );
    if (!u) continue;
    const target = nextTarget(g, u);
    if (!target) continue;
    u.scout = { legs: 0, returning: false };
    u.node = null;
    u.target = null;
    u.order = "move";
    u.tx = target.x;
    u.tz = target.z;
    u.stuckT = 0;
  }
}
export function scoutAI(g: Game, u: Unit, dt: number) {
  if (!u.scout) return false;
  scoutKnowledge(g, u);
  const m = u.scout;
  if (u.stuckT > 16 && m.returning) {
    u.scout = undefined;
    u.order = "idle";
    return true;
  }
  if (u.stuckT > 8 || m.legs >= 5) m.returning = true;
  if (m.returning) {
    const h = g.campOf(u.team);
    u.tx = h.x;
    u.tz = h.z;
    u.workReason = "Bringing scouting knowledge home";
    if (Math.hypot(u.x - h.x, u.z - h.z) < 10) {
      u.scout = undefined;
      u.order = "idle";
      return true;
    }
  } else u.workReason = "Exploring beyond their village";
  if (g.steer(u, dt) && !m.returning) {
    m.legs++;
    const next = nextTarget(g, u);
    if (next) {
      u.tx = next.x;
      u.tz = next.z;
    } else m.returning = true;
  }
  return true;
}
