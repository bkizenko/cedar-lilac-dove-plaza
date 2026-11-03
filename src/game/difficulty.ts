import { isRivalTeam } from "./factions";
import type { Game } from "./sim";
const profile = (p: {
  name: string;
  food: number;
  spoil: number;
  raid: number;
  band: number;
  damage: number;
  abundance: number;
  climate: number;
  provisions: number;
  decisionInterval: number;
  conflictPressure: number;
  description: string;
}) => p;
/** All modifiers are explicit. Resource stocks are finite opening endowments;
 * no profile changes pathing, command admission, accuracy or worker obedience. */
export const DIFFICULTIES = {
  "super-easy": profile({
    name: "Super easy",
    food: 0.55,
    spoil: 0.35,
    raid: 0.35,
    band: 0.5,
    damage: 0.55,
    abundance: 1.5,
    climate: 0.55,
    provisions: 1.6,
    decisionInterval: 2,
    conflictPressure: 0.45,
    description: "Larger opening reserves, milder seasons and more forgiving neighbors.",
  }),
  easy: profile({
    name: "Easy",
    food: 0.75,
    spoil: 0.65,
    raid: 0.65,
    band: 0.75,
    damage: 0.75,
    abundance: 1.25,
    climate: 0.8,
    provisions: 1.3,
    decisionInterval: 1.4,
    conflictPressure: 0.7,
    description: "More opening supplies, milder seasons and lighter attacks.",
  }),
  normal: profile({
    name: "Normal",
    food: 1,
    spoil: 1,
    raid: 1,
    band: 1,
    damage: 1,
    abundance: 1,
    climate: 1,
    provisions: 1,
    decisionInterval: 1,
    conflictPressure: 1,
    description: "Standard supplies, seasons, food needs and rival pressure.",
  }),
  hard: profile({
    name: "Hard",
    food: 1.15,
    spoil: 1.3,
    raid: 1.3,
    band: 1.15,
    damage: 1.2,
    abundance: 0.9,
    climate: 1.15,
    provisions: 0.85,
    decisionInterval: 0.85,
    conflictPressure: 1.25,
    description: "Tighter opening reserves, harsher seasons and quicker rivals.",
  }),
  survival: profile({
    name: "Survival",
    food: 1.3,
    spoil: 1.65,
    raid: 1.65,
    band: 1.35,
    damage: 1.45,
    abundance: 0.8,
    climate: 1.3,
    provisions: 0.7,
    decisionInterval: 0.7,
    conflictPressure: 1.5,
    description: "Sparse reserves, severe seasons and little tolerance for intrusion.",
  }),
  apocalypse: profile({
    name: "Apocalypse",
    food: 1.5,
    spoil: 2,
    raid: 2,
    band: 1.6,
    damage: 1.8,
    abundance: 0.65,
    climate: 1.5,
    provisions: 0.5,
    decisionInterval: 0.55,
    conflictPressure: 1.8,
    description: "Extreme seasonal pressure, lean openings and punishing attacks.",
  }),
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export function difficultyId(value: unknown): Difficulty {
  if (value === undefined) return "normal";
  if (typeof value !== "string" || !Object.hasOwn(DIFFICULTIES, value))
    throw new Error("Unknown difficulty preset");
  return value as Difficulty;
}
export function difficulty(g: Game) {
  return DIFFICULTIES[difficultyId(g.state.difficulty)];
}
export function difficultyTemperature(g: Game, celsius: number) {
  const scale = difficulty(g).climate;
  return scale === 1 ? celsius : 12 + (celsius - 12) * scale;
}
export function difficultyGrievance(g: Game, change: number) {
  return change > 0 ? change * difficulty(g).conflictPressure : change;
}
/** Apply once while constructing a new world. Strict saved state restores its
 * exact depleted stocks afterwards and never calls this on a loaded village. */
export function initializeDifficultyOpening(g: Game) {
  const p = difficulty(g);
  for (const t of g.state.tribes) if (isRivalTeam(t.id)) t.thinkT *= p.decisionInterval;
  for (const nodes of [
    g.state.trees,
    g.state.stones,
    g.state.forage,
    g.state.fish,
    g.state.copper,
    g.state.iron,
  ])
    for (const n of nodes) {
      n.amount *= p.abundance;
      n.maxAmt *= p.abundance;
    }
  const own = g.tribe(0);
  own.food *= p.provisions;
  if (own.foodLots)
    for (const k of Object.keys(own.foodLots) as (keyof typeof own.foodLots)[])
      own.foodLots[k]! *= p.provisions;
  if (own.survival) own.survival.waterLiters *= p.provisions;
}
export function difficultyEffects(id: Difficulty) {
  const p = DIFFICULTIES[id];
  return `Shared world: new-world natural node capacities ×${p.abundance}; temperature departures from 12°C ×${p.climate}. Player: new-world starting food/water ×${p.provisions}; food use ×${p.food}; edible spoilage ×${p.spoil}; incoming enemy damage ×${p.damage}; raid timing/arrival pressure ×${p.raid}, party-size factor ×${p.band}. Rivals: strategic review interval ×${p.decisionInterval}; witnessed player-border grievance gain ×${p.conflictPressure}. Command reliability is unchanged.`;
}
