/** Game units/time/packed volume are tuning values, not kilograms, furnace
 * temperatures or historical assays. A charcoal bloom is solid and requires
 * subsequent hot consolidation; this does not implement molten iron or steel.
 * Historic England, Archaeometallurgy: Guidelines for Best Practice, §3.2. */
export const IRON_METALLURGY_RULES={version:1,orePerBatch:8,smeltingCharcoalPerBatch:4,bloomPerBatch:4,smeltWorkSeconds:120,forgingCharcoalPerBatch:1,metalPerBatch:4,forgeWorkSeconds:60,orePackedLiters:4,bloomPackedLiters:2,metalPackedLiters:1,oreCarryUnits:40} as const;
