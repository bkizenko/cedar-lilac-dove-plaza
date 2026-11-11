import {FOW} from './constants.ts';
import type {Game} from './sim.ts';
import type {Unit,Building} from './types.ts';

/** Fog provenance (G10). Diagnostic, read-only: attributes every fog cell that
 * changes from unexplored to explored during one step to the team-0 observer
 * whose sight circle covers it. Sight radii mirror Game.updateVision. Holds no
 * save state and never writes vision. */
export const FOG_PROVENANCE_RULES={version:1,unitSight:{worker:11,archer:16,ranger:16,other:13},buildingSight:{townhall:18,dock:20,fortification:5,other:12,watchtowerMax:30}} as const;

export type FogSource=
 |{kind:'player-order';unitId:number;order:string}
 |{kind:'search-party';unitId:number;searchJob:string;reason?:string}
 |{kind:'expedition';unitId:number;reason?:string}
 |{kind:'auto-explore';unitId:number;reason?:string}
 |{kind:'resident-work';unitId:number;order:string;reason?:string}
 |{kind:'building';buildingId:number;type:string}
 |{kind:'test-reveal'}
 |{kind:'unattributed'};

export function unitSight(u:Pick<Unit,'type'>){const s=FOG_PROVENANCE_RULES.unitSight;return u.type==='worker'?s.worker:u.type==='archer'||u.type==='ranger'?s.archer:s.other;}
function buildingSight(b:Building){const s=FOG_PROVENANCE_RULES.buildingSight;return b.type==='watchtower'?s.watchtowerMax:b.type==='townhall'?s.townhall:b.type==='dock'?s.dock:s.other;}

/** Classify why a unit is where it is. Player commands are distinguished from
 * autonomous labour by the settlement's own search/expedition markers. */
export function classifyObserver(u:Unit):FogSource{
 if(u.expedition&&!u.expedition.returning)return{kind:'expedition',unitId:u.id,reason:u.workReason};
 if(u.order==='explore'&&u.searchJob)return{kind:'search-party',unitId:u.id,searchJob:u.searchJob,reason:u.workReason};
 if(u.order==='explore')return u.goatSearchPen!==undefined?{kind:'resident-work',unitId:u.id,order:'goat-search',reason:u.workReason}:{kind:'auto-explore',unitId:u.id,reason:u.workReason};
 if(u.type==='worker'&&!u.recalled&&!['move','attack','attackMove'].includes(u.order))return{kind:'resident-work',unitId:u.id,order:u.order,reason:u.workReason};
 return{kind:'player-order',unitId:u.id,order:u.order};
}

export interface FogTick{revealed:number;bySource:Map<string,{source:FogSource;cells:number}>;unattributed:number[]}
const key=(s:FogSource)=>s.kind==='building'?`building:${s.buildingId}`:'unitId' in s?`${s.kind}:${s.unitId}`:s.kind;

/** Attribute cells that went 0 → ≥1 between `before` and the game's current
 * vision. Observer positions are taken from the end of the step, which is the
 * moment updateVision stamped them. */
export function attributeReveals(g:Game,before:Uint8Array):FogTick{
 const n=FOW,size=g.world.size,cell=size/n,vis=g.vision,bySource=new Map<string,{source:FogSource;cells:number}>(),unattributed:number[]=[];let revealed=0;
 const observers:{x:number;z:number;r:number;source:FogSource}[]=[];
 for(const u of g.state.units)if(u.team===0&&u.hp>0)observers.push({x:u.x,z:u.z,r:unitSight(u),source:classifyObserver(u)});
 for(const b of g.state.buildings)if(b.team===0&&b.hp>0&&!b.plannedCost)observers.push({x:b.x,z:b.z,r:buildingSight(b),source:{kind:'building',buildingId:b.id,type:b.type}});
 const testReveal=g.testMode&&g.revealMap;
 for(let i=0;i<vis.length;i++){
  if(before[i]!==0||vis[i]===0)continue;revealed++;
  const wx=-size/2+(i%n+.5)*cell,wz=-size/2+((i/n|0)+.5)*cell;
  let src:FogSource|undefined;
  // Prefer a moving unit over a building; ties go to the nearest observer.
  let best=1e9;for(const o of observers){const d=Math.hypot(o.x-wx,o.z-wz);if(d<=o.r+cell*.75){const rank=d+(o.source.kind==='building'?1e3:0);if(rank<best){best=rank;src=o.source;}}}
  if(!src&&testReveal)src={kind:'test-reveal'};
  if(!src){unattributed.push(i);continue;}
  const k=key(src),e=bySource.get(k);if(e)e.cells++;else bySource.set(k,{source:src,cells:1});
 }
 return{revealed,bySource,unattributed};
}

/** Run `seconds` of simulation and summarise who revealed what, by kind. */
export function traceFog(g:Game,seconds:number,dt=.2){
 const totals:Record<string,number>={},reasons:Record<string,number>={};let revealed=0,unattributed=0;
 for(let t=0;t<seconds;t+=dt){const before=g.vision.slice();g.step(dt);const tick=attributeReveals(g,before);revealed+=tick.revealed;unattributed+=tick.unattributed.length;
  for(const {source,cells} of tick.bySource.values()){totals[source.kind]=(totals[source.kind]||0)+cells;const r=('reason' in source&&source.reason)||('searchJob' in source?source.searchJob:'');if(r)reasons[r]=(reasons[r]||0)+cells;}}
 return{seconds,revealed,unattributed,byKind:totals,byReason:reasons};
}
