import type { Game } from "./sim";
export const HABITATS = {
  plains: { name: "Grassland", crops: 1.2, forage: 1, timber: 0.85, winterFood: 1.08, advice: "Open fertile ground favors fields. Store the autumn harvest; timber is slower to collect." },
  forest: { name: "Woodland", crops: 0.8, forage: 1.2, timber: 1.2, winterFood: 1, advice: "Woodland supports gathering and timber. Smaller harvests make a mixed food supply valuable." },
  hills: { name: "Uplands", crops: 0.7, forage: 0.85, timber: 0.9, winterFood: 1.2, advice: "Thin soils give smaller harvests. Exposed winters need more food; prepare stores and trade for grain." },
} as const;
export function habitatAt(g: Game, x: number, z: number) {
  let kind: keyof typeof HABITATS = "plains", distance = Infinity;
  for (const biome of g.world.biomes || []) {
    const d = (biome.x-x)**2 + (biome.z-z)**2;
    if (d < distance) { distance = d; kind = biome.kind; }
  }
  return HABITATS[kind];
}
