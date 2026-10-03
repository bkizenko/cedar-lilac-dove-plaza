import type { Game } from "./sim";
import { habitatAt, HABITATS } from "./ecology";
import { reserveSeconds } from "./settlement";
import { knownSettlement } from "./barter";

/** One-time historical moments, independent of the current era and resource balances. */
export const DISCOVERIES = [
  { id: "woodland", name: "Under the canopy", points: 4,
    hint: "Send someone into woodland. Learn where timber and wild food can be found.",
    met: (g: Game) => visits(g, "forest") },
  { id: "uplands", name: "Beyond the lowlands", points: 4,
    hint: "Visit the uplands to seek stone and mineral country.",
    met: (g: Game) => visits(g, "hills") },
  { id: "grassland", name: "Open country", points: 4,
    hint: "Visit grassland to locate potential fields and grazing country.",
    met: (g: Game) => visits(g, "plains") },
  { id: "copper", name: "A different kind of stone", points: 6,
    hint: "Reveal a copper deposit. Finding a material is the first step toward learning its uses.",
    met: (g: Game) => g.state.copper.some(n => g.exploredAt(n.x, n.z)) },
  { id: "iron", name: "Dark mineral seams", points: 6,
    hint: "Reveal an iron deposit, even if your people cannot yet work it.",
    met: (g: Game) => g.state.iron.some(n => g.exploredAt(n.x, n.z)) },
  { id: "contact", name: "People beyond our valley", points: 8,
    hint: "Find another living settlement. Contact opens opportunities for exchange.",
    met: (g: Game) => g.state.tribes.some(t => t.id !== 0 && t.id !== 3 && t.alive && knownSettlement(g, t.id)) },
  { id: "stones", name: "Footsteps before ours", points: 6,
    hint: "Reach and investigate a standing-stone site with a villager.",
    met: (g: Game) => g.world.megaliths.some((_, i) => g.looted.has(i)) },
  { id: "outpost", name: "A foothold beyond home", points: 8,
    hint: "Finish a cornerstone outpost at least 64 units from the home camp.",
    met: (g: Game) => g.state.buildings.some(b => b.team === 0 && b.type === "cornerstone" && g.finished(b) &&
      Math.hypot(b.x - g.campOf(0).x, b.z - g.campOf(0).z) >= 64) },
  { id: "winter", name: "Ready for the lean season", points: 8,
    hint: "Reach winter with eight minutes of food reserves and a storehouse at least 60% prepared.",
    met: (g: Game) => Math.floor(g.state.time / 450) % 4 === 3 && reserveSeconds(g) >= 480 &&
      g.state.buildings.some(b => b.team === 0 && b.type === "warehouse" && g.finished(b) && (b.storeCare || 0) >= 0.6) },
] as const;
function visits(g: Game, kind: keyof typeof HABITATS) {
  return g.state.units.some(u => u.team === 0 && u.hp > 0 && habitatAt(g, u.x, u.z) === HABITATS[kind]);
}
export function recordDiscoveries(g: Game) {
  const history = g.state.discoveries ??= [];
  const added: string[] = [];
  for (const d of DISCOVERIES) {
    if (history.some(h => h.id === d.id) || !d.met(g)) continue;
    history.push({ id: d.id, age: g.tribe(0).age, time: g.state.time });
    added.push(d.name);
  }
  if (added.length) g.banner(`Discovery: ${added.join(" · ")} — recorded in Village (L)`, 4);
}
export function discoveryScore(g: Game, age?: number) {
  return (g.state.discoveries || []).reduce((score, h) => score +
    (age === undefined || h.age === age ? DISCOVERIES.find(d => d.id === h.id)?.points || 0 : 0), 0);
}

export const TRADITIONS = [
  {id:"pathfinders", name:"Pathfinders", hint:"Scouts travel 25% faster while exploring; caravans travel 15% faster."},
  {id:"winter-stores", name:"Winter stores", hint:"80 extra food capacity and 25% less ordinary spoilage."},
  {id:"woodcraft", name:"Woodcraft", hint:"Cutting takes 20% less time, with or without a lumber camp."},
] as const;
export type Tradition = typeof TRADITIONS[number]["id"];
export const TRADITION_COST = 12;
export function hasTradition(g: Game, kind: Tradition) {
  return g.state.traditions?.some(t => t.kind === kind) || false;
}
export function unspentLegacy(g: Game) {
  return discoveryScore(g) - (g.state.traditions?.length || 0) * TRADITION_COST;
}
export function adoptTradition(g: Game, kind: Tradition) {
  const age = g.tribe(0).age;
  if (!TRADITIONS.some(t => t.id === kind) || hasTradition(g, kind) ||
      g.state.traditions?.some(t => t.age === age) || unspentLegacy(g) < TRADITION_COST) return false;
  (g.state.traditions ??= []).push({age, kind});
  g.banner(`${TRADITIONS.find(t => t.id === kind)!.name} adopted — a lasting village tradition`, 4);
  return true;
}
