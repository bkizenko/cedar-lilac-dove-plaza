/** Physical growth of a building in several stages: it gets bigger (a wider footprint, an added wing, an extra storey) as the village grows.
 *  Pure read model over the existing paid fabric record (buildingFabric.ts): no state of its own, so every existing building keeps working
 *  (no fabric = the first stage). Stage numbers are internal; player text uses the `word`, never a numbered level. */
import type {Building} from './types';
export const GROWTH_RULES={
 /** Visual size multiplier of the whole building per stage (stage 0 is the building as first raised). */
 scale:[1,1.08,1.18,1.3] as const,
 /** Extra storeys shown per stage. */
 storeys:[0,0,1,1] as const,
 words:['Newly raised','Enlarged','Wing added','Grown and storeyed'] as const,
 /** What the village must have before it can ask for the next stage: people, wood and stone on hand, and the era of its building techniques. */
 gates:[{population:0,wood:0,stone:0,era:0},{population:6,wood:24,stone:8,era:0},{population:14,wood:48,stone:16,era:1},{population:30,wood:72,stone:32,era:2}] as const,
} as const;
export type GrowthView={stage:number;maxStage:number;scale:number;extraStoreys:number;word:string;wing:boolean};
export function growthView(b:Pick<Building,'fabric'>):GrowthView{
 const n=b.fabric?.upgrades.length??0,max=GROWTH_RULES.scale.length-1,stage=Math.min(n,max);
 return{stage,maxStage:max,scale:GROWTH_RULES.scale[stage],extraStoreys:GROWTH_RULES.storeys[stage],word:GROWTH_RULES.words[stage],wing:!!b.fabric?.upgrades.some(u=>u.mode==='extend')};
}
/** Why the next growth stage is not yet on offer (null when the village is ready); the era is judged by the village's building techniques. */
export function growthReadiness(b:Pick<Building,'fabric'>,v:{population:number;wood:number;stone:number;era:number}):string|null{
 const next=growthView(b).stage+1;if(next>GROWTH_RULES.scale.length-1)return'Fully grown';
 const g=GROWTH_RULES.gates[next];
 if(v.population<g.population)return`Needs a village of ${g.population} people`;
 if(v.era<g.era)return'Needs newer building techniques';
 if(v.wood<g.wood||v.stone<g.stone)return`Needs ${g.wood} wood and ${g.stone} stone`;
 return null;
}
