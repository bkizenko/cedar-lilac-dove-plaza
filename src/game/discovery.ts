import type { Game } from "./sim";
import { habitatAt, HABITATS } from "./ecology";
import { knownSettlement } from "./barter";

/** One-time historical moments, independent of the current era and resource balances. */
export const DISCOVERIES = [
  { id: "woodland", name: "Under the canopy", points: 2,
    hint: "Send someone into woodland. Learn where timber and wild food can be found.",
    met: (g: Game) => visits(g, "forest") },
  { id: "uplands", name: "Beyond the lowlands", points: 2,
    hint: "Visit the uplands to seek stone and mineral country.",
    met: (g: Game) => visits(g, "hills") },
  { id: "grassland", name: "Open country", points: 2,
    hint: "Visit grassland to locate potential fields and grazing country.",
    met: (g: Game) => visits(g, "plains") },
  { id: "copper", name: "A different kind of stone", points: 3,
    hint: "Reveal a copper deposit. Finding a material is the first step toward learning its uses.",
    met: (g: Game) => g.state.copper.some(n => g.exploredAt(n.x, n.z)) },
  { id: "iron", name: "Dark mineral seams", points: 3,
    hint: "Reveal an iron deposit, even if your people cannot yet work it.",
    met: (g: Game) => g.state.iron.some(n => g.exploredAt(n.x, n.z)) },
  { id: "contact", name: "People beyond our valley", points: 4,
    hint: "Find another living settlement. Contact opens opportunities for exchange.",
    met: (g: Game) => g.state.tribes.some(t => t.id !== 0 && t.id !== 3 && t.alive && knownSettlement(g, t.id)) },
  { id: "stones", name: "Footsteps before ours", points: 3,
    hint: "Reach and investigate a standing-stone site with a villager.",
    met: (g: Game) => g.looted.size > 0 },
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
