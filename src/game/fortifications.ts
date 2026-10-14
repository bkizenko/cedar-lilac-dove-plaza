import type { Game } from "./sim";
import type { BldType, Building } from "./types";
export const FORTIFICATIONS: BldType[] = ["palisade", "gate", "stonewall", "trench", "moat"];
export const earthwork = (b: Building) => b.type === "trench" || b.type === "moat";
export function earthworkPace(g: Game, x: number, z: number) {
  let pace = 1;
  for (const b of g.state.buildings)
    if (earthwork(b) && g.finished(b) && Math.abs(b.x - x) < b.w / 2 && Math.abs(b.z - z) < b.d / 2)
      pace = Math.min(pace, b.type === "moat" ? 0.25 : 0.5);
  return pace;
}
export function setGateMode(g: Game, b: Building, mode: "auto" | "open" | "closed") {
  if (b.type !== "gate" || !g.finished(b)) return;
  b.gateMode = mode;
  tickGates(g);
}
/** Closing never traps a body inside the gate. An open gate admits either side. */
export function tickGates(g: Game) {
  const alive = g.state.units.filter((u) => u.hp > 0);
  for (const b of g.state.buildings) {
    if (b.type !== "gate" || !g.finished(b)) continue;
    const occupied = alive.some(
      (u) =>
        Math.abs(u.x - b.x) < b.w * 0.4 + u.r + 0.3 && Math.abs(u.z - b.z) < b.d * 0.4 + u.r + 0.3,
    );
    const threat = alive.some(
      (u) => g.isFoe(b.team, u.team) && Math.hypot(u.x - b.x, u.z - b.z) < 16,
    );
    const open = occupied || b.gateMode === "open" || (b.gateMode !== "closed" && !threat);
    if (!!b.gateOpen !== open) {
      b.gateOpen = open;
      g.state.walkDirty = true;
      g.workBoard.reset();
    }
  }
}
