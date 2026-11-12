import type {Building} from './types';
import {herdRules} from './animalSpecies';
/** Goat-equivalent care demand; capacity and actor counts stay separate. */
export const penCareDemand=(animals:readonly {species:string}[])=>animals.reduce((n,a)=>n+herdRules(a.species).careMultiplier,0);
export const PEN_RULES={baseAreaSquareMeters:100,maximumCachedSurveys:256,baseHousingCapacity:8,maximumAnimalsPerPen:48,maximumAnimalsTotal:96,feedPerAnimalSecond:.012,feedCapacityPerBaseArea:100,animalsPerKeeper:8,edgeClearanceMetres:.5,maximumGrade:.6,biomassFoodPerSquareMetre:1.8,springRegrowthPerSecond:.00015,seasonRegrowth:[1,.8,.55,0],droughtRegrowthFactor:.15,careDecayPerAnimalSecond:.000125} as const;
type Pen=Pick<Building,'x'|'z'|'w'|'d'>;
export function penHousingCapacity(b:Pick<Building,'w'|'d'>){return Math.min(PEN_RULES.maximumAnimalsPerPen,Math.max(0,Math.floor(PEN_RULES.baseHousingCapacity*b.w*b.d/PEN_RULES.baseAreaSquareMeters+1e-6)));}
export function penFeedCapacity(b:Pick<Building,'w'|'d'>){return PEN_RULES.feedCapacityPerBaseArea*b.w*b.d/PEN_RULES.baseAreaSquareMeters;}
export function penInterior(b:Pick<Building,'w'|'d'>){return{halfWidth:Math.max(0,b.w/2-PEN_RULES.edgeClearanceMetres),halfDepth:Math.max(0,b.d/2-PEN_RULES.edgeClearanceMetres)};}
export function insidePen(b:Pen,x:number,z:number,margin=0){const r=penInterior(b);return Math.abs(x-b.x)<=Math.max(0,r.halfWidth-margin)&&Math.abs(z-b.z)<=Math.max(0,r.halfDepth-margin);}
