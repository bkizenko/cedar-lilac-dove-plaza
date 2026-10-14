import type { Game } from "./sim";
import type { Building, Unit } from "./types";
export function craftingBenches(b: Building) {
  return b.type === "workshop"
    ? 3
    : b.type === "forge" || b.type === "barracks"
      ? 2
      : b.type === "townhall"
        ? 1
        : 0;
}
export function craftingQueue(g: Game, b: Building) {
  return g.state.units
    .filter(
      (u) =>
        u.hp > 0 &&
        u.team === b.team &&
        u.order === "hold" &&
        [u.weaponWork, u.haulageWork, u.farmToolWork].some(
          (j) => j && !j.paused && j.workplace === b.id,
        ),
    )
    .sort((a, b) => a.id - b.id);
}
export function craftBenchReady(g: Game, u: Unit, b: Building) {
  const index = craftingQueue(g, b).indexOf(u);
  if (index >= 0 && index < craftingBenches(b)) return true;
  u.workReason = "Crafting queued — waiting for a free bench";
  return false;
}
/** Practice accrues only during hands-on crafting, never while travelling or queued. */
export function craftingEffort(u: Unit, dt: number) {
  const seconds = Math.max(0, dt),
    rate = 1 + Math.min(0.3, (u.craftingXP || 0) / 1200);
  u.craftingXP = Math.min(36000, (u.craftingXP || 0) + seconds);
  return seconds * rate;
}
export function craftingReport(g: Game, id: number) {
  const b = g.state.buildings.find((b) => b.id === id);
  if (!b) return "";
  const count = craftingQueue(g, b).length,
    benches = craftingBenches(b);
  return benches
    ? `${Math.min(count, benches)}/${benches} crafting benches reserved${count > benches ? ` · ${count - benches} waiting` : ""}. More shelters let more adults craft at once.`
    : "";
}

/** New village priorities release waiting hands without erasing their paid projects. */
export function pauseQueuedCrafting(g:Game,team=0){
 for(const b of g.state.buildings){
  if(b.team!==team)continue;
  const waiting=craftingQueue(g,b).slice(craftingBenches(b));
  for(const u of waiting)for(const job of [u.weaponWork,u.haulageWork,u.farmToolWork])if(job)job.paused=true;
 }
}
