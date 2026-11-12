import type {Game} from './sim';
import type {Building} from './types';

/** Canal breach permit (Grok W-World, W7; approved by Boris 11 Nov 19:16 ET).
 * The excavation rule keeps every dig clear of water. The only exception is a
 * commissioned canal's breach phase: a dig may go below the water clearance only when
 * - it is a recorded breach stage of a canal record (`state.canalWorks`),
 * - every channel dig of that canal is already dug (committed excavation), and
 * - to change the ground: every breach dig of that canal has been fully laboured, so
 *   the water comes in once, at the end of an otherwise finished channel (the digs
 *   are applied together, in stage order; mouths onto river/sea are flagged).
 * Nothing else may breach water: ordinary trenches, channel digs, aqueducts and
 * wonder earthworks keep the unchanged rule. This module imports nothing from
 * excavation so excavation can consult it without a cycle. */
export type CanalStage={x:number;z:number;depth:number};
export type CanalWork={version:1;id:number;team:number;channel:CanalStage[];breach:(CanalStage&{mouth:boolean})[]};
export type CanalDigMark={id:number;role:'channel'|'breach'};
type S={canalWorks?:CanalWork[];excavations?:{buildingId:number}[]};
type B=Pick<Building,'id'|'team'|'x'|'z'>&{canalWork?:CanalDigMark;excavationDepth?:number;type?:string;hp?:number};
const st=(g:Game)=>g.state as Game['state']&S;
export const canalWorks=(g:Game)=>st(g).canalWorks||[];
const same=(a:{x:number;z:number},b:{x:number;z:number})=>Math.abs(a.x-b.x)<.01&&Math.abs(a.z-b.z)<.01;
export function canalDigAt(g:Game,team:number,s:{x:number;z:number}){return g.state.buildings.find(b=>b.type==='trench'&&b.team===team&&b.hp>0&&same(b,s)) as (Building&{canalWork?:CanalDigMark;excavationDepth?:number})|undefined;}
const dug=(g:Game)=>new Set((st(g).excavations||[]).map(c=>c.buildingId));
export function canalStageDug(g:Game,w:CanalWork,s:CanalStage,cut=dug(g)){const b=canalDigAt(g,w.team,s);return !!b&&cut.has(b.id);}
const labourDone=(g:Game,w:CanalWork,s:CanalStage,cut:Set<number>)=>{const b=canalDigAt(g,w.team,s);return !!b&&(cut.has(b.id)||b.build>=1-1e-5);};
/** Phase of a canal record, derived from live digs (no extra save state):
 * channel (dry digs) -> breach (below-water digs laboured while still dry) -> complete
 * (the breach: every breach dig committed together, in stage order). */
export function canalPhase(g:Game,w:CanalWork){const cut=dug(g);
 const channelDone=w.channel.every(s=>canalStageDug(g,w,s,cut)),breachLabourDone=channelDone&&w.breach.every(s=>labourDone(g,w,s,cut)),complete=channelDone&&w.breach.every(s=>canalStageDug(g,w,s,cut));
 return{channelDone,breachLabourDone,complete,phase:complete?'complete' as const:!channelDone?'channel' as const:'breach' as const};}
/** May this breach dig be laid out (placed) now? Only once the channel is dug. */
export function breachStageReady(g:Game,w:CanalWork,_s?:CanalStage){return canalPhase(g,w).channelDone;}
/** Breach digs paid for but not yet applied that come before `b` in stage order, so
 * `excavationVolume` charges shared soil once across the deferred group. */
export function breachPredecessorCuts(g:Game,b:B){const mark=b.canalWork;if(!mark||mark.role!=='breach')return[];
 const w=canalWorks(g).find(c=>c.id===mark.id&&c.team===b.team);if(!w)return[];const i=w.breach.findIndex(k=>same(k,b));if(i<0)return[];const cut=dug(g),out:{x:number;z:number;w:number;d:number;depth:number}[]=[];
 for(let j=0;j<i;j++){const s=w.breach[j],d=canalDigAt(g,w.team,s);if(d&&!cut.has(d.id))out.push({x:s.x,z:s.z,w:4,d:4,depth:s.depth});}return out;}
let transient:{g:Game;team:number;x:number;z:number;depth:number}|null=null;
/** Used only by the canal commissioning code around its own `placeBuilding` call,
 * after it has checked `breachStageReady`; always cleared. */
export function withBreachPermit<T>(g:Game,team:number,s:CanalStage,fn:()=>T):T{const before=transient;transient={g,team,x:s.x,z:s.z,depth:s.depth};try{return fn();}finally{transient=before;}}
/** Consulted by trench placement before refusing a footprint at the water's edge:
 * true only inside `withBreachPermit` for that exact stage (a ready breach dig). */
export function breachPlacementPermit(g:Game,x:number,z:number,team:number){return !!transient&&transient.g===g&&transient.team===team&&same(transient,{x,z});}
/** Consulted by `excavationIssue` before refusing a dig that would reach water. */
export function canalBreachPermit(g:Game,b:B,depth:number):boolean{
 if(transient&&transient.g===g&&transient.team===b.team&&same(transient,b)&&transient.depth===depth)return true;
 const mark=b.canalWork;if(!mark||mark.role!=='breach')return false;
 const w=canalWorks(g).find(c=>c.id===mark.id&&c.team===b.team);if(!w)return false;
 const i=w.breach.findIndex(k=>same(k,b));if(i<0||w.breach[i].depth!==depth)return false;
 // the breach: only once every canal dig's labour is done, applied in stage order
 const p=canalPhase(g,w);if(!p.breachLabourDone)return false;const cut=dug(g);
 return w.breach.slice(0,i).every(s=>canalStageDug(g,w,s,cut));
}
/** Save validator for `state.canalWorks` and building `canalWork` marks (for Codex's persistence). */
export function validCanalWorks(state:{canalWorks?:unknown;buildings:unknown[]},size:number){
 const v=state.canalWorks;if(v===undefined){return state.buildings.every(b=>(b as B).canalWork===undefined);}
 if(!Array.isArray(v)||v.length>64)return false;const ids=new Set<number>();const half=size/2,depths=[.5,1,1.5,2];
 const stage=(s:unknown,mouth:boolean)=>{const k=s as CanalStage&{mouth?:unknown};return !!k&&typeof k==='object'&&[k.x,k.z].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=half)&&depths.includes(k.depth)&&(!mouth||typeof k.mouth==='boolean');};
 for(const w of v as CanalWork[]){if(!w||typeof w!=='object'||w.version!==1||!Number.isSafeInteger(w.id)||w.id<1||ids.has(w.id)||!Number.isInteger(w.team)||w.team<0||w.team>63||!Array.isArray(w.channel)||!Array.isArray(w.breach)||w.channel.length+w.breach.length>128||!w.channel.every(s=>stage(s,false))||!w.breach.every(s=>stage(s,true)))return false;ids.add(w.id);}
 for(const b of state.buildings as B[]){const m=b.canalWork;if(m===undefined)continue;if(!m||typeof m!=='object'||b.type!=='trench'||!['channel','breach'].includes(m.role))return false;
  const w=(v as CanalWork[]).find(c=>c.id===m.id);if(!w||w.team!==b.team||!(m.role==='channel'?w.channel:w.breach).some(s=>same(s,b)))return false;}
 return true;
}
