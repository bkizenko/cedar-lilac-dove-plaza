import type {Game} from './sim';
import type {BldType,Building} from './types';
import {BUILD_TIME} from './constants';
import {plotArea} from './plots';
import {wellSite,watermillSite,windmillSite,aqueductRoute,cisternCatchment,nearestFreshWater} from './waterWorks';
import {currentPowerKw} from './riverCurrents';
import type {LocalWaterBody} from './localWater';

/** A delivery click has to reach a *higher* fresh source, not merely the nearest water. */
export function feasibleAqueductTo(g:Game,target:{x:number;z:number},team=0){
 let best:{source:{x:number;z:number};route:ReturnType<typeof aqueductRoute>} | null=null;
 for(const b of (g.world.waterBodies||[]) as LocalWaterBody[]){
  const pts=b.kind==='lake'?(b.shoreline?.length?b.shoreline:[{x:b.x,z:b.z}]):b.pts;
  const candidates=b.kind==='lake'?pts.filter((_,i)=>i%(Math.max(1,Math.floor(pts.length/8)))===0).slice(0,8):[pts[0],pts[Math.floor(pts.length/2)],pts[pts.length-1]];
  for(const p of candidates){
   if(!p)continue;
   const route=aqueductRoute(g,p,target,team);
   if(!route.feasible)continue;
   if(!best||(route.lengthMetres??Infinity)<(best.route.lengthMetres??Infinity))best={source:{x:p.x,z:p.z},route};
  }
 }
 return best;
}

/** Water-works building types (Grok World). Placement uses the terrain queries
 * in waterWorks.ts; labour is the catalog time plus the measured dig or cut.
 * Watermill power is the live river current (`currentPowerKw` at the wheel). */
export const WATER_WORKS_TYPES=['well','cistern','watermill','windmill','aqueduct','canal'] as const;
export type WaterWorksType=typeof WATER_WORKS_TYPES[number];
export function isWaterWorksType(t:string):t is WaterWorksType{return (WATER_WORKS_TYPES as readonly string[]).includes(t);}

export function waterWorksPlacementIssue(g:Game,type:BldType,x:number,z:number,team=0):string|null{
 if(type==='well')return wellSite(g,x,z,team).issues[0]??null;
 if(type==='cistern'){
  if(team===0&&!g.exploredAt(x,z))return 'Explore the site first';
  if(g.height(x,z)<=g.waterAt(x,z))return 'A cistern needs dry ground';
  cisternCatchment(g,x,z);
  return null;
 }
 if(type==='watermill')return watermillSite(g,x,z,team).issues[0]??null;
 if(type==='windmill')return windmillSite(g,x,z,team).issues[0]??null;
 if(type==='aqueduct'){
  if(g.height(x,z)<g.waterAt(x,z))return 'The delivery point is under water';
  const hit=feasibleAqueductTo(g,{x,z},team);
  if(hit)return null;
  const src=nearestFreshWater(g,x,z);
  if(!src)return 'An aqueduct must start at fresh water (a river or lake)';
  return aqueductRoute(g,src,{x,z},team).issues[0]??'No higher fresh source can reach this point';
 }
 if(type==='canal')return 'A canal joins two waters — commission a line between them';
 return null;
}

export function waterWorksLabour(g:Game,b:Pick<Building,'type'|'x'|'z'|'team'|'w'|'d'>):number|null{
 if(!isWaterWorksType(b.type))return null;
 const base=(BUILD_TIME[b.type]||16)*plotArea(b);
 if(b.type==='well')return base+wellSite(g,b.x,b.z,b.team).digWorkSeconds;
 if(b.type==='aqueduct'){
  const hit=feasibleAqueductTo(g,{x:b.x,z:b.z},b.team);
  return base+(hit?.route.cutWorkSeconds||0);
 }
 return base;
}

/** Live wheel power for a watermill (kW). Windmills are not river wheels. */
export function millPowerKw(g:Game,b:Pick<Building,'type'|'x'|'z'>):number{
 if(b.type!=='watermill')return 0;
 const wheel=watermillSite(g,b.x,b.z).wheel;
 return wheel?currentPowerKw(g,wheel.x,wheel.z):0;
}
