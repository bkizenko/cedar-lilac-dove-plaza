/** Render budget ESTIMATES for Option H carved buildings. Pure: counts come
 * from the same part lists the mesh builder emits (partTriangles is exact for
 * our geometry), but draw-call and memory figures assume the instancing plan
 * in carvedBuildingLayer.ts (one shared material, one InstancedMesh per
 * resident variant x LOD, one instanced impostor-card draw). None of this has
 * been measured on the M1/8 GB target; Codex's renderMetrics owns real numbers. */
import {BUILDINGS} from '../game/constants';
import {specTriangles,type RenderTier} from './buildingParts';
import {IMPOSTOR_TRIANGLES} from './carvedMesh';
import {CARVED_TYPES,carvedBuildingSpec,carvedVariantFor} from './buildingStyleMap';
import type {FamilyId} from './buildingFamilies';

/** Bytes per non-indexed vertex: position, normal, colour (3 floats each),
 * uv (2) and grain (1) = 12 floats. */
export const BYTES_PER_VERTEX=48;

export type FamilyBudget={family:FamilyId;samples:number;trisAvg:[number,number,number];trisMax:[number,number,number]};
/** Average/max triangles per family at near/mid/far across eras, habitats and variants. */
export function familyBudgets(worldSeed=1):FamilyBudget[]{
 const acc=new Map<FamilyId,{n:number;sum:[number,number,number];max:[number,number,number]}>();
 for(const type of CARVED_TYPES)for(const era of[0,1,2,3,5])for(const habitat of['plains','forest','hills','desert'] as const)for(let id=1;id<=6;id++){
  const fp=BUILDINGS[type as keyof typeof BUILDINGS],input={worldSeed,type,id,era,habitat,footprint:{w:fp.w,d:fp.d},...(type==='grindingStone'&&id%2?{waterSide:'+x' as const}:{})};
  const spec=carvedBuildingSpec(input);if(!spec)continue;const f=spec.family as FamilyId,a=acc.get(f)??{n:0,sum:[0,0,0],max:[0,0,0]};
  for(const t of[0,1,2] as const){const n=specTriangles(spec,t);a.sum[t]+=n;a.max[t]=Math.max(a.max[t],n);}a.n++;acc.set(f,a);
 }
 return [...acc].map(([family,a])=>({family,samples:a.n,trisAvg:a.sum.map(s=>Math.round(s/a.n)) as [number,number,number],trisMax:a.max}));
}

export type VillageInstance={type:string;id:number;era:number;distance:number;settlementSeed?:number;prosperity?:number};
export type VillageEstimate={buildings:number;triangles:number;drawCalls:number;shadowDrawCalls:number;residentVariants:number;geometryBytes:number};
/** Estimate one frame for a set of visible buildings at given camera distances. */
export function estimateVillage(worldSeed:number,instances:VillageInstance[],tierFor:(m:number)=>RenderTier):VillageEstimate{
 const buckets=new Set<string>(),geom=new Map<string,number>();let tris=0,cards=0;
 for(const b of instances){
  const fp=BUILDINGS[b.type as keyof typeof BUILDINGS];if(!fp)continue;
  const input={worldSeed,type:b.type,id:b.id,era:b.era,footprint:{w:fp.w,d:fp.d},...(b.settlementSeed!==undefined?{settlementSeed:b.settlementSeed}:{}),...(b.prosperity!==undefined?{prosperity:b.prosperity}:{})};
  const v=carvedVariantFor(input),spec=v&&carvedBuildingSpec(input);if(!v||!spec)continue;
  const tier=tierFor(b.distance);
  if(tier===3){tris+=IMPOSTOR_TRIANGLES;cards++;continue;}
  const n=specTriangles(spec,tier);tris+=n;const key=v.key+'#'+tier;buckets.add(key);geom.set(key,n*3*BYTES_PER_VERTEX);
 }
 const drawCalls=buckets.size+(cards?1:0);
 return {buildings:instances.length,triangles:tris,drawCalls,shadowDrawCalls:buckets.size,residentVariants:buckets.size,geometryBytes:[...geom.values()].reduce((a,b)=>a+b,0)};
}
