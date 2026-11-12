import type {Game} from './sim';
import type {Building} from './types';
import {sampleWorldHeight} from './worldgen';
import {EXCAVATION_RULES,cutAmount,cutBounds,excavationCuts,excavationDepth,excavationIssue,excavationHeightAt,setExcavationDepth,configureExcavation,commitExcavation} from './excavation';
import {routeAqueduct,routeCanal,measureCanal} from './waterRoutes';
import {canalWorks,canalDigAt,canalPhase,breachStageReady,withBreachPermit,type CanalWork,type CanalDigMark} from './canalBreach';

/** Commissioning aqueduct and canal lines as ordinary digs (Grok W-World, W7).
 * A routed line becomes a lattice of the same trench digs the player can place:
 * same placement and excavation checks, same workers, `excavationWorkNeed`
 * (6 s/m³, union volume) and the same save records. Preview and commission share
 * one plan function; commission is all-or-nothing and refuses if the fresh plan
 * differs from the preview. Digs whose banks overlap an unfinished dig wait for a
 * later batch, so shared soil is charged once (as wonder earthworks).
 * - Aqueduct: the channel cut is dug wherever the ground stands above the channel;
 *   arcades are masonry (reported, a Codex hook). The intake is never dug into the
 *   source: digs that would reach water are held 1 m short (no aqueduct breach rule).
 * - Canal: channel digs first, under the unchanged rule (they stay clear of water).
 *   Then the breach phase (approved 11 Nov 19:16 ET, `canalBreach.ts`): the digs that
 *   take the channel below the water, mouths onto river/sea last. In the game's water
 *   model the surface is a field, so ground dug below it is wet: the plan proves the
 *   finished channel will be wet end to end before anything is laid out. */
export const WATER_LINE_RULES={version:1,footprintGapMetres:3.4,breachGapMetres:1,trenchLimit:56,canalWaterDepthMetres:.5,fillDepthMetres:.1,aqueductSillMetres:.25,checkStepMetres:1,fillPasses:6,shortcutFactor:2,shortcutMinimumMetres:40,integrationMetres:.5} as const;
type P={x:number;z:number};
export type LineStage={x:number;z:number;s:number;depth:number;role:'aqueduct'|'channel'|'breach';mouth?:boolean;issue:string|null};
type Dig=Building&{excavationDepth?:number;excavationVolume?:number;excavationWorkSeconds?:number;canalWork?:CanalDigMark};
const allowed=EXCAVATION_RULES.depths,deepest=allowed[allowed.length-1];
const raw=(g:Game,x:number,z:number)=>sampleWorldHeight(g.world,x,z);
const wet=(g:Game,x:number,z:number)=>g.height(x,z)<g.waterAt(x,z)+.02;
const stub=(x:number,z:number,team:number)=>({id:-1,team,x,z,w:4,d:4});
const ceilDepth=(need:number)=>need<=.05?0:allowed.find(d=>d>=need-1e-6)??Infinity;
function withDepth<T>(g:Game,team:number,depth:number,fn:()=>T):T{if(team!==0)return fn();const before=excavationDepth(g);setExcavationDepth(g,depth);try{return fn();}finally{setExcavationDepth(g,before);}}
/** The ordinary dig check (unchanged rule). */
export function lineStageIssue(g:Game,s:Pick<LineStage,'x'|'z'|'depth'>,team=0){return withDepth(g,team,s.depth,()=>excavationIssue(g,stub(s.x,s.z,team),s.depth)??g.placementIssue('trench',s.x,s.z,team));}
/** The breach-stage check: everything but the water clearance (permit scoped to this one stage). */
function breachIssue(g:Game,s:Pick<LineStage,'x'|'z'|'depth'>,team:number){return withBreachPermit(g,team,s,()=>lineStageIssue(g,s,team));}
const boundsOf=(s:Pick<LineStage,'x'|'z'|'depth'>)=>cutBounds({...stub(s.x,s.z,0),depth:s.depth});
function touchesWater(g:Game,s:Pick<LineStage,'x'|'z'|'depth'>,gap:number=WATER_LINE_RULES.breachGapMetres){const b=boundsOf(s);for(let z=b.z0-gap;z<=b.z1+gap;z+=1)for(let x=b.x0-gap;x<=b.x1+gap;x+=1)if(wet(g,x,z))return true;return false;}
/** Dig points along the line, far enough apart that trench footprints never collide. */
function lattice(line:P[]){const R=WATER_LINE_RULES,out:{x:number;z:number;s:number}[]=[];let acc=0,last:P|null=null;
 for(let k=1;k<line.length;k++){const a=line[k-1],b=line[k],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<1e-6)continue;const ux=(b.x-a.x)/len,uz=(b.z-a.z)/len,step=R.footprintGapMetres/Math.max(Math.abs(ux),Math.abs(uz));
  for(let t=0;t<=len+1e-6;t+=step/4){const p={x:a.x+ux*t,z:a.z+uz*t};if(!last||Math.max(Math.abs(p.x-last.x),Math.abs(p.z-last.z))>=R.footprintGapMetres-1e-6){out.push({...p,s:acc+t});last=p;}}acc+=len;}
 return out;}
function samples(line:P[],step:number){const out:{x:number;z:number;s:number}[]=[];let acc=0;for(let k=1;k<line.length;k++){const a=line[k-1],b=line[k],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(len/step));for(let i=k===1?0:1;i<=n;i++){const t=i/n;out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,s:acc+len*t});}acc+=len;}return out;}
/** Ground after the planned digs (union by max with existing cuts, as the terrain applies them). */
function predicted(g:Game,stages:Pick<LineStage,'x'|'z'|'depth'>[]){const cuts=stages.filter(s=>s.depth>0).map(s=>({...stub(s.x,s.z,0),depth:s.depth}));
 return{cuts,height:(x:number,z:number)=>{const h=raw(g,x,z);let a=h-excavationHeightAt(g,x,z,h);for(const c of cuts)a=Math.max(a,cutAmount(c,x,z));return h-a;}};}
function volumes(g:Game,stages:LineStage[]){const R=WATER_LINE_RULES,f=predicted(g,stages),step=R.integrationMetres,cell=step*step,seen=new Set<string>();let v=0;
 for(const c of f.cuts){const b=cutBounds(c);for(let x=Math.floor(b.x0/step)*step+step/2;x<b.x1;x+=step)for(let z=Math.floor(b.z0/step)*step+step/2;z<b.z1;z+=step){const k=`${x.toFixed(2)},${z.toFixed(2)}`;if(seen.has(k))continue;seen.add(k);const h=raw(g,x,z),now=excavationHeightAt(g,x,z,h);v+=Math.max(0,now-f.height(x,z))*cell;}}
 return v;}
const trenchCount=(g:Game,team:number)=>g.state.buildings.filter(b=>b.team===team&&b.type==='trench'&&b.hp>0).length;
function capacityIssue(g:Game,team:number,n:number){const free=WATER_LINE_RULES.trenchLimit-trenchCount(g,team);return n>free?`Needs ${n} digs; the community can hold ${Math.max(0,free)} more excavations`:null;}
function grouped(stages:LineStage[]){const m=new Map<string,number>();for(const s of stages)if(s.issue)m.set(s.issue,(m.get(s.issue)||0)+1);return[...m].map(([k,n])=>`${n} dig${n>1?'s':''}: ${k}`);}

export type AqueductWorksPlan={version:1;kind:'aqueduct';team:number;source:P;target:P;line:P[];sourceY:number;grade:number;stages:LineStage[];heldAtIntake:number;
 plannedCutCubicMetres:number;workSeconds:number;arcadeLengthMetres:number;arcadeAreaSquareMetres:number;maxSillMetres:number;lengthMetres:number;issues:string[]};
/** Aqueduct preview. `line/sourceY/grade` re-plan an earlier preview exactly. */
export function planAqueductWorks(g:Game,source:P,target:P,team=0,fixed?:{line:P[];sourceY:number;grade:number}):AqueductWorksPlan{
 const R=WATER_LINE_RULES,issues:string[]=[];let line=fixed?.line??[],sourceY=fixed?.sourceY??0,grade=fixed?.grade??0,arcadeLen=0,arcadeArea=0,lengthMetres=0;
 if(!fixed){const r=routeAqueduct(g,source,target,team) as ReturnType<typeof routeAqueduct>&{source?:{surfaceMetres:number};grade?:number;arcadeLengthMetres?:number;arcadeAreaSquareMetres?:number;lengthMetres?:number};
  issues.push(...r.issues);line=r.line;if(r.source){sourceY=r.source.surfaceMetres;grade=r.grade!;arcadeLen=r.arcadeLengthMetres??0;arcadeArea=r.arcadeAreaSquareMetres??0;lengthMetres=r.lengthMetres??0;}}
 const stages:LineStage[]=[];let held=0;
 if(line.length>=2&&!issues.length){const channel=(s:number)=>sourceY-grade*s;
  for(const p of lattice(line)){const need=raw(g,p.x,p.z)-channel(p.s),depth=ceilDepth(need);if(!depth)continue;if(depth>deepest){stages.push({...p,depth:deepest,role:'aqueduct',issue:'The channel needs more than one 2 m dig here'});continue;}
   const st:LineStage={...p,depth,role:'aqueduct',issue:null};
   if(touchesWater(g,st)){held++;continue;} // intake held 1 m short of the source
   st.issue=lineStageIssue(g,st,team);stages.push(st);}
  // the channel must pass: between digs the cut ground may not stand above the
  // channel by more than a sill; deepen (or add) the nearest dig where it would
  const lat=lattice(line),checks=samples(line,R.checkStepMetres).filter(q=>!wet(g,q.x,q.z)&&raw(g,q.x,q.z)>channel(q.s)&&!touchesWater(g,{...q,depth:deepest}));let sill=0;
  for(let pass=0;pass<=R.fillPasses;pass++){const f=predicted(g,stages);const bad=checks.filter(q=>f.height(q.x,q.z)-channel(q.s)>R.aqueductSillMetres);sill=0;for(const q of checks)sill=Math.max(sill,f.height(q.x,q.z)-channel(q.s));if(!bad.length||pass===R.fillPasses)break;
   let changed=false;for(const q of bad){let near=lat[0],bd=Infinity;for(const p of lat){const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<bd){bd=d;near=p;}}
    let st=stages.find(s=>Math.abs(s.x-near.x)<.01&&Math.abs(s.z-near.z)<.01);if(!st){const n:LineStage={...near,depth:0,role:'aqueduct',issue:null};if(touchesWater(g,{...n,depth:allowed[0]}))continue;stages.push(n);stages.sort((a,b)=>a.s-b.s);st=n;}
    const idx=allowed.indexOf(st.depth);if(idx<allowed.length-1){st.depth=allowed[idx+1];changed=true;}}if(!changed)break;}
  // a dig whose banks would reach the source is held (no aqueduct breach rule): shallower if that still keeps clear, else dropped
  for(const st of [...stages]){if(st.issue||!touchesWater(g,st))continue;const ok=allowed.filter(d=>d<st.depth).reverse().find(d=>!touchesWater(g,{...st,depth:d}));if(ok)st.depth=ok;else{stages.splice(stages.indexOf(st),1);held++;}}
  for(const st of stages)if(!st.issue)st.issue=lineStageIssue(g,st,team);
  {const f=predicted(g,stages);sill=0;for(const q of checks)sill=Math.max(sill,f.height(q.x,q.z)-channel(q.s));}
  if(sill>R.aqueductSillMetres)issues.push(`The cut would leave a ${sill.toFixed(2)} m sill in the channel`);
  issues.push(...grouped(stages));const cap=capacityIssue(g,team,stages.length);if(cap)issues.push(cap);
  if(!stages.length)issues.push(held?'Only the intake would need digging, and it is held short of the source':'The route needs no cut — the arcade is masonry (not dug)');
  const v=volumes(g,stages);
  return{version:1,kind:'aqueduct',team,source:{...source},target:{...target},line,sourceY,grade,stages,heldAtIntake:held,plannedCutCubicMetres:+v.toFixed(1),workSeconds:Math.round(Math.max(stages.length*EXCAVATION_RULES.minimumWorkSeconds,v*EXCAVATION_RULES.workSecondsPerCubicMeter)),
   arcadeLengthMetres:arcadeLen,arcadeAreaSquareMetres:arcadeArea,maxSillMetres:+sill.toFixed(2),lengthMetres,issues};}
 return{version:1,kind:'aqueduct',team,source:{...source},target:{...target},line,sourceY,grade,stages,heldAtIntake:0,plannedCutCubicMetres:0,workSeconds:0,arcadeLengthMetres:arcadeLen,arcadeAreaSquareMetres:arcadeArea,maxSillMetres:0,lengthMetres,issues:issues.length?issues:['No route']};
}

export type CanalWorksPlan={version:1;kind:'canal';team:number;a:P;b:P;line:P[];levelMetres:number;bedMetres:number;stages:LineStage[];
 channelStages:number;breachStages:number;mouthStages:number;plannedCutCubicMetres:number;channelCutCubicMetres:number;breachCutCubicMetres:number;workSeconds:number;
 dryAfterMetres:number;landMetres:number;lengthMetres:number;shortcutSavesMetres:number;issues:string[]};
/** Canal preview: channel digs (unchanged rule) + breach digs, with a fill proof. */
export function planCanalWorks(g:Game,a:P,b:P,team=0,fixedLine?:P[]):CanalWorksPlan{
 const R=WATER_LINE_RULES,issues:string[]=[];let line=fixedLine??[];let m:ReturnType<typeof measureCanal>|null=null;
 let shortcut=0;
 if(!fixedLine){const r=routeCanal(g,a,b,team);issues.push(...r.issues);line=r.line;
  // waters already joined by water: a straight cut is still worth digging when the boat
  // route round is much longer (a shortcut through a spit); otherwise no canal is needed
  if('alreadyJoinedByWater' in r&&r.alreadyJoinedByWater){const direct=Math.hypot(b.x-a.x,b.z-a.z),round=r.lengthMetres??0;
   if(round>=R.shortcutFactor*direct+R.shortcutMinimumMetres){line=[{...a},{...b}];shortcut=+(round-direct).toFixed(1);}else issues.push('These waters are already joined by water — no canal needed');}}
 if(line.length>=2){m=measureCanal(g,line,team);if(fixedLine)issues.push(...m.issues);}
 const empty=(lvl=0)=>({version:1 as const,kind:'canal' as const,team,a:{...a},b:{...b},line,levelMetres:lvl,bedMetres:lvl-R.canalWaterDepthMetres,stages:[] as LineStage[],channelStages:0,breachStages:0,mouthStages:0,plannedCutCubicMetres:0,channelCutCubicMetres:0,breachCutCubicMetres:0,workSeconds:0,dryAfterMetres:0,landMetres:m?.landMetres??0,lengthMetres:m?.lengthMetres??0,shortcutSavesMetres:shortcut,issues});
 if(!m||m.locks===undefined)return empty();
 if(m.locks>0)issues.push(`This canal needs ${m.locks} lock${m.locks>1?'s':''} — locks are structures (Codex hook), not digs`);
 if(issues.length)return empty();
 const level=Math.min(g.waterAt(line[0].x,line[0].z),g.waterAt(line[line.length-1].x,line[line.length-1].z)),bed=level-R.canalWaterDepthMetres;
 const footDry=(p:P)=>g.dryFoundation('trench',p.x,p.z); // the placement rule's own footprint test
 // channel digs need the placement rule's dry footprint; breach digs (mouths at the
 // water's edge) only a dry centre — their placement is the approved exception
 const pts=lattice(line).filter(p=>!wet(g,p.x,p.z)),stages:LineStage[]=[];
 pts.forEach((p,i)=>{const need=raw(g,p.x,p.z)-bed+.2,want=Math.min(deepest,ceilDepth(need));
  let dry=0;if(i%2===0&&footDry(p))for(const d of [...allowed].reverse()){if(d>=want)continue;const s={...p,depth:d};if(!touchesWater(g,s)&&!lineStageIssue(g,s,team)){dry=d;break;}}
  stages.push(dry?{...p,depth:dry,role:'channel',issue:null}:{...p,depth:want||allowed[0],role:'breach',issue:null});});
 // fill proof on the real ground: every land sample on the finished centreline lies
 // at least 0.1 m under the water the game reports there; deepen breach digs if not
 const land=samples(line,R.checkStepMetres).filter(q=>!wet(g,q.x,q.z));let dryLen=0;
 for(let pass=0;pass<=R.fillPasses;pass++){const f=predicted(g,stages),dry=land.filter(q=>f.height(q.x,q.z)>g.waterAt(q.x,q.z)-R.fillDepthMetres);dryLen=dry.length*R.checkStepMetres;if(!dry.length||pass===R.fillPasses)break;
  let changed=false;for(const q of dry){let best:LineStage|null=null,bd=Infinity;for(const s of stages)if(s.depth<deepest||s.role==='channel'){const d=Math.hypot(s.x-q.x,s.z-q.z);if(d<bd){bd=d;best=s;}}if(!best||bd>=12)continue;
   // a shallow channel dig standing where the channel must go deeper becomes a breach dig
   if(best.role==='channel'){best.role='breach';best.depth=Math.max(best.depth,Math.min(deepest,ceilDepth(raw(g,best.x,best.z)-bed+.2)));changed=true;continue;}
   best.depth=allowed[allowed.indexOf(best.depth)+1];changed=true;}if(!changed)break;}
 // a shallower breach dig has narrower banks (it may then meet the unchanged bank
 // rule): try the shallowest depth that keeps the whole channel wet
 const stillWet=()=>{const f=predicted(g,stages);return land.every(q=>f.height(q.x,q.z)<=g.waterAt(q.x,q.z)-R.fillDepthMetres);};
 if(dryLen===0)for(const st of stages){if(st.role!=='breach'||!breachIssue(g,st,team))continue;const keep=st.depth;let best=keep;
  for(const d of allowed.filter(d=>d<keep).reverse()){st.depth=d;if(!stillWet())break;if(!breachIssue(g,st,team)){best=d;break;}}st.depth=best;}
 if(dryLen>0)issues.push(stages.some(s=>s.role==='breach')?`The finished channel would stay dry for ${dryLen} m — the ground there is more than one dig above the water`:`The land is too narrow or wet for a trench footprint — the channel would stay dry for ${dryLen} m`);
 for(const s of stages){if(s.role==='breach'){s.mouth=touchesWater(g,s);s.issue=breachIssue(g,s,team);}}
 issues.push(...grouped(stages));const cap=capacityIssue(g,team,stages.length);if(cap)issues.push(cap);
 if(!stages.length)issues.push('Nothing to dig');
 const total=volumes(g,stages),chan=volumes(g,stages.filter(s=>s.role==='channel'));
 return{...empty(level),stages,channelStages:stages.filter(s=>s.role==='channel').length,breachStages:stages.filter(s=>s.role==='breach').length,mouthStages:stages.filter(s=>s.mouth).length,
  plannedCutCubicMetres:+total.toFixed(1),channelCutCubicMetres:+chan.toFixed(1),breachCutCubicMetres:+(total-chan).toFixed(1),workSeconds:Math.round(Math.max(stages.length*EXCAVATION_RULES.minimumWorkSeconds,total*EXCAVATION_RULES.workSecondsPerCubicMeter)),dryAfterMetres:dryLen,issues};
}

const digAt=(g:Game,team:number,s:P)=>canalDigAt(g,team,s) as Dig|undefined;
const overlaps=(a:ReturnType<typeof cutBounds>,b:ReturnType<typeof cutBounds>)=>Math.max(a.x0,b.x0)<Math.min(a.x1,b.x1)&&Math.max(a.z0,b.z0)<Math.min(a.z1,b.z1);
/** Lay out every stage whose banks overlap no unfinished dig of this line. */
function layBatch(g:Game,team:number,all:Pick<LineStage,'x'|'z'|'depth'>[],todoStages:Pick<LineStage,'x'|'z'|'depth'>[],validate:(s:Pick<LineStage,'x'|'z'|'depth'>)=>string|null,place:(s:Pick<LineStage,'x'|'z'|'depth'>)=>boolean,mark?:CanalDigMark&{forStage:(s:Pick<LineStage,'x'|'z'|'depth'>)=>CanalDigMark},deferred=false){
 const cut=new Set(excavationCuts(g).map(c=>c.buildingId)),busy:ReturnType<typeof cutBounds>[]=[],ids:number[]=[];
 for(const s of all){const b=digAt(g,team,s);if(b&&!cut.has(b.id))busy.push(boundsOf(s));}
 for(const s of todoStages.filter(s=>!digAt(g,team,s))){const bb=boundsOf(s);if(!deferred&&busy.some(o=>overlaps(o,bb)))continue;if(validate(s)){if(deferred)break;continue;}
  const before=g.state.buildings.length,ok=withDepth(g,team,s.depth,()=>place(s));const b=ok&&g.state.buildings.length>before?g.state.buildings[g.state.buildings.length-1] as Dig:null;if(!b)continue;
  if(mark)b.canalWork=mark.forStage(s);
  if(b.excavationDepth!==s.depth||mark){b.excavationDepth=s.depth;b.excavationVolume=undefined;b.excavationWorkSeconds=undefined;configureExcavation(g,b);}
  if(!deferred)busy.push(bb);ids.push(b.id);}
 return ids;}
const sameStages=(a:LineStage[],b:LineStage[])=>a.length===b.length&&a.every((s,i)=>Math.abs(s.x-b[i].x)<.01&&Math.abs(s.z-b[i].z)<.01&&s.depth===b[i].depth&&s.role===b[i].role);

/** All-or-nothing aqueduct commission (no save state beyond the ordinary digs). */
export function executeAqueductWorks(g:Game,plan:AqueductWorksPlan){
 const fresh=planAqueductWorks(g,plan.source,plan.target,plan.team,{line:plan.line,sourceY:plan.sourceY,grade:plan.grade});
 if(fresh.issues.length)return{ok:false,reason:fresh.issues[0],buildingIds:[] as number[]};if(!sameStages(fresh.stages,plan.stages))return{ok:false,reason:'The ground changed since the preview — preview again',buildingIds:[] as number[]};
 const ids=continueAqueductWorks(g,fresh,false);return ids.length?{ok:true,buildingIds:ids}:{ok:false,reason:'A dig could not be laid out',buildingIds:ids};}
export function continueAqueductWorks(g:Game,plan:AqueductWorksPlan,validate=true){return layBatch(g,plan.team,plan.stages,plan.stages,s=>validate?lineStageIssue(g,s,plan.team):null,s=>g.placeBuilding('trench',s.x,s.z,plan.team));}

type CanalState={canalWorks?:CanalWork[]};
/** All-or-nothing canal commission: records the canal (channel + breach stages) and lays the first channel batch. */
export function executeCanalWorks(g:Game,plan:CanalWorksPlan){
 const fresh=planCanalWorks(g,plan.a,plan.b,plan.team,plan.line);
 if(fresh.issues.length)return{ok:false,reason:fresh.issues[0],buildingIds:[] as number[]};if(!sameStages(fresh.stages,plan.stages))return{ok:false,reason:'The ground changed since the preview — preview again',buildingIds:[] as number[]};
 const s=g.state as Game['state']&CanalState,id=Math.max(0,...(s.canalWorks||[]).map(c=>c.id))+1;
 const w:CanalWork={version:1,id,team:plan.team,channel:fresh.stages.filter(k=>k.role==='channel').map(k=>({x:k.x,z:k.z,depth:k.depth})),breach:fresh.stages.filter(k=>k.role==='breach').map(k=>({x:k.x,z:k.z,depth:k.depth,mouth:!!k.mouth}))};
 (s.canalWorks??=[]).push(w);const ids=continueCanalWorks(g,id);
 if(!ids.length){s.canalWorks=s.canalWorks.filter(c=>c.id!==id);return{ok:false,reason:'A dig could not be laid out',buildingIds:ids};}
 return{ok:true,canalId:id,buildingIds:ids};}
/** Next step for the current phase. Channel: the next batch of dry digs (each checked
 * with the unchanged rule). Breach: every breach dig is laid out at once in stage order
 * (each charged only the soil earlier breach stages leave — union volume), laboured
 * while the ground is still dry, and once all are laboured they are committed together,
 * in stage order, through the ordinary `commitExcavation`: the water comes in once. */
export function continueCanalWorks(g:Game,canalId:number){
 const w=canalWorks(g).find(c=>c.id===canalId);if(!w)return[];const p=canalPhase(g,w),all=[...w.channel,...w.breach];
 const mark=(role:'channel'|'breach')=>({id:w.id,role,forStage:()=>({id:w.id,role})});
 if(p.phase==='channel')return layBatch(g,w.team,all,w.channel,s=>touchesWater(g,s)?'water':lineStageIssue(g,s,w.team),s=>g.placeBuilding('trench',s.x,s.z,w.team),mark('channel'));
 if(p.phase==='complete')return[];
 const ids=layBatch(g,w.team,all,w.breach,s=>breachStageReady(g,w,s)?breachIssue(g,s,w.team):'not ready',s=>withBreachPermit(g,w.team,s,()=>g.placeBuilding('trench',s.x,s.z,w.team)),mark('breach'),true);
 // a fully laboured dig waits at build 1−1e−6 (the sim's "paid, ground not yet changed"); its labour is complete
 if(canalPhase(g,w).breachLabourDone)for(const s of w.breach){const b=digAt(g,w.team,s);if(!b)break;if(excavationCuts(g).some(c=>c.buildingId===b.id))continue;const before=b.build;b.build=1;if(!commitExcavation(g,b)){b.build=before;break;}}
 return ids;}
export function canalWorksProgress(g:Game,canalId:number){
 const w=canalWorks(g).find(c=>c.id===canalId);if(!w)return null;const cut=new Set(excavationCuts(g).map(c=>c.buildingId)),all=[...w.channel,...w.breach],digs=all.map(s=>digAt(g,w.team,s)).filter(Boolean) as Dig[];
 let paid=0,need=0;for(const b of digs){const x=b.excavationWorkSeconds??EXCAVATION_RULES.minimumWorkSeconds;need+=x;paid+=Math.min(1,b.build)*x;}
 return{...canalPhase(g,w),stages:all.length,laid:digs.length,dug:digs.filter(b=>cut.has(b.id)).length,paidWorkSeconds:Math.round(paid),neededWorkSeconds:Math.round(need),buildingIds:digs.map(b=>b.id)};}
