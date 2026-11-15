import type {Building} from './types';
/** Felling clears a field: a stump (amount 0, not replanted) inside a cultivated plot is ploughed out, so it is neither drawn nor treated as an obstacle.
 * Pure read of state; the stump record itself stays in the save (regrowth is already blocked by the building), so nothing is migrated. */
export const FIELD_CLEARING_RULES={marginMetres:.25} as const;
export function insideField(b:Pick<Building,'x'|'z'|'w'|'d'>,x:number,z:number){const m=FIELD_CLEARING_RULES.marginMetres;return Math.abs(x-b.x)<b.w/2+m&&Math.abs(z-b.z)<b.d/2+m;}
/** Returns a point test for the farms standing now (cheap to build once per sync). */
export function fieldClearingTest(g:{state:{buildings:readonly (Pick<Building,'x'|'z'|'w'|'d'|'hp'>&{type?:string;plannedCost?:unknown})[]}}){
 const farms=g.state.buildings.filter(b=>b.type==='farm'&&b.hp>0&&!b.plannedCost);
 return (x:number,z:number)=>farms.some(b=>insideField(b,x,z));
}
