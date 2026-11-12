import {queueConstruction} from './constructionQueue';
import type {Game} from './sim';
import {planAqueductWorks,planCanalWorks,executeAqueductWorks,executeCanalWorks,continueAqueductWorks,continueCanalWorks,type AqueductWorksPlan} from './waterLineWorks';
import {canalWorks,canalPhase,validCanalWorks} from './canalBreach';
import {excavationCuts,EXCAVATION_RULES} from './excavation';
export type WaterEngineeringKind='canal'|'aqueduct';
export type WaterEngineeringPoint={x:number;z:number};
export const WATER_ENGINEERING_RULES={maximumAqueductPlans:16,reviewSeconds:1} as const;
const reviews=new WeakMap<object,{state:Game['state'];next:number}>();
function queueDigs(g:Game,ids:number[]){for(const id of ids){const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.hp>0);if(b&&!g.state.units.some(u=>u.hp>0&&u.constructionQueue?.sites.includes(id)))queueConstruction(g,b,[]);}}
export function previewWaterEngineering(g:Game,kind:WaterEngineeringKind,source:WaterEngineeringPoint,target:WaterEngineeringPoint){return kind==='canal'?planCanalWorks(g,source,target):planAqueductWorks(g,source,target);}
/** Commissions ordinary paid-labour digs; this does not construct masonry arcades. */
export function commissionWaterEngineering(g:Game,kind:WaterEngineeringKind,source:WaterEngineeringPoint,target:WaterEngineeringPoint){
 const plan=previewWaterEngineering(g,kind,source,target);
 if(plan.issues.length)return{ok:false,reason:plan.issues[0]};
 if(plan.kind==='canal'){const result=executeCanalWorks(g,plan);if(result.ok)queueDigs(g,result.buildingIds);return result;}
 if((g.state.aqueductWorks?.length??0)>=WATER_ENGINEERING_RULES.maximumAqueductPlans)return{ok:false,reason:'Finish an existing channel project first'};
 const result=executeAqueductWorks(g,plan);if(result.ok){(g.state.aqueductWorks??=[]).push(plan);queueDigs(g,result.buildingIds);}return result;
}
/** Lay deferred non-overlapping stages after actual earlier earthworks complete. */
export function tickWaterEngineering(g:Game){
 if(!g.state.aqueductWorks?.length&&!g.state.canalWorks?.length)return;
 const old=reviews.get(g);if(old?.state===g.state&&g.state.time<old.next&&old.next<=g.state.time+WATER_ENGINEERING_RULES.reviewSeconds)return;
 reviews.set(g,{state:g.state,next:g.state.time+WATER_ENGINEERING_RULES.reviewSeconds});
 for(const line of canalWorks(g))if(!canalPhase(g,line).complete){queueDigs(g,continueCanalWorks(g,line.id));queueDigs(g,g.state.buildings.filter(b=>b.team===0&&(b as typeof b&{canalWork?:{id:number}}).canalWork?.id===line.id).map(b=>b.id));}
 if(!g.state.aqueductWorks?.length)return;
 const cuts=new Set(excavationCuts(g).map(c=>c.buildingId));
 g.state.aqueductWorks=g.state.aqueductWorks.filter(plan=>{
  const allDug=plan.stages.every(stage=>g.state.buildings.some(b=>b.team===plan.team&&b.type==='trench'&&Math.abs(b.x-stage.x)<.01&&Math.abs(b.z-stage.z)<.01&&cuts.has(b.id)));
  if(allDug)return false;queueDigs(g,continueAqueductWorks(g,plan));queueDigs(g,g.state.buildings.filter(b=>b.team===0&&b.type==='trench'&&plan.stages.some(stage=>Math.abs(b.x-stage.x)<.01&&Math.abs(b.z-stage.z)<.01)).map(b=>b.id));return true;
 });
}
/** Optional old-save-compatible references; no terrain regeneration during validation. */
export function validWaterEngineering(state:any,size:number){
 if(!validCanalWorks(state,size))return false;
 const plans=state.aqueductWorks;if(plans===undefined)return true;if(!Array.isArray(plans)||plans.length>WATER_ENGINEERING_RULES.maximumAqueductPlans)return false;
 const point=(p:any)=>p&&typeof p==='object'&&[p.x,p.z].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=size/2);
 return plans.every((p:any)=>p&&p.version===1&&p.kind==='aqueduct'&&Number.isInteger(p.team)&&state.tribes.some((t:any)=>t.id===p.team)&&point(p.source)&&point(p.target)&&Number.isFinite(p.sourceY)&&Math.abs(p.sourceY)<=512&&Number.isFinite(p.grade)&&p.grade>0&&p.grade<=1&&Array.isArray(p.line)&&p.line.length>=2&&p.line.length<=512&&p.line.every(point)&&Array.isArray(p.stages)&&p.stages.length>0&&p.stages.length<=128&&p.stages.every((s:any)=>point(s)&&EXCAVATION_RULES.depths.includes(s.depth)&&s.role==='aqueduct'&&Number.isFinite(s.s)&&s.s>=0&&s.s<=size*8&&(s.issue===null||typeof s.issue==='string')));
}
