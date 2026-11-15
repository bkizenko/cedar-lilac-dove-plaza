/** Storage caps for the four raw stockpiles (logs, stone, copper, iron). Goods are never destroyed: a full
 * village simply stops starting new hauls (the material stays at its source) and loads already in hand are
 * delivered, so the pile can overshoot by at most what the carriers hold. Food keeps its own rules (stockCap). */
import type {Game} from './sim';
import {plotArea} from './plots';
export type CappedResource='wood'|'stone'|'copper'|'iron';
export const CAPPED_RESOURCES:readonly CappedResource[]=['wood','stone','copper','iron'];
export const RESOURCE_CAP_RULES={
 base:{wood:400,stone:300,copper:120,iron:120},
 warehouse:{wood:500,stone:400,copper:200,iron:200},
 townhall:{wood:150,stone:100,copper:40,iron:40},
 home:{wood:12,stone:6,copper:0,iron:0},
 forge:{wood:0,stone:0,copper:60,iron:60},
 /** Seconds a worker waits before re-trying a source it left because the stores were full. */
 retrySeconds:45,
} as const;
export function isCappedResource(k:unknown):k is CappedResource{return k==='wood'||k==='stone'||k==='copper'||k==='iron';}
/** Capacity for one raw resource across all finished storage of the team. */
export function resourceCap(g:Game,team:number,kind:CappedResource):number{
 const R=RESOURCE_CAP_RULES;let cap:number=R.base[kind];
 for(const b of g.state.buildings){
  if(b.team!==team||b.hp<=0||!g.finished(b))continue;
  if(b.type==='warehouse')cap+=Math.floor(R.warehouse[kind]*plotArea(b));
  else if(b.type==='townhall')cap+=R.townhall[kind];
  else if(b.type==='hut'||b.type==='house')cap+=R.home[kind];
  else if(b.type==='forge')cap+=R.forge[kind];
 }
 return cap;
}
export function resourceCaps(g:Game,team=0):Record<CappedResource,number>{
 return{wood:resourceCap(g,team,'wood'),stone:resourceCap(g,team,'stone'),copper:resourceCap(g,team,'copper'),iron:resourceCap(g,team,'iron')};
}
/** True when the stockpile has no room for another haul of this kind. */
export function resourceFull(g:Game,team:number,kind:CappedResource):boolean{
 return Math.floor(Number(g.tribe(team)[kind])||0)>=resourceCap(g,team,kind);
}
