import type { HousingMaterials } from "./housingTypes";
export const HOUSING_MATERIAL_KEYS = ["wood", "stone", "plantFibre"] as const;
export const emptyHousingMaterials = (): HousingMaterials => ({ wood: 0, stone: 0, plantFibre: 0 });
export function housingMaterialTotal(m: HousingMaterials) {
  return m.wood + m.stone + m.plantFibre;
}
export function addHousingMaterials(to: HousingMaterials, from: HousingMaterials) {
  for (const k of HOUSING_MATERIAL_KEYS) to[k] += from[k];
}
/** Move existing units; never copy or synthesize paid material inventory. */
export function takeHousingMaterials(from: HousingMaterials, capacity: number) {
  const out = emptyHousingMaterials();
  for (const k of HOUSING_MATERIAL_KEYS) {
    const n = Math.min(from[k], Math.max(0, capacity));
    out[k] = n;
    from[k] -= n;
    capacity -= n;
  }
  return out;
}
export function housingMaterialsEqual(a: HousingMaterials, b: HousingMaterials) {
  return HOUSING_MATERIAL_KEYS.every((k) => Math.abs(a[k] - b[k]) < 1e-8);
}
