import type {Game} from './sim';
import type {GameState,Unit,Building} from './types';
import {GARMENT_KINDS,type Garment,type GarmentKind} from './textiles';
import type {ItemKind,ItemStock} from './production';
import {productionSlots,ITEM_NAMES} from './production';
import {workRuntime} from './workRuntime';
import type {JobCoordinator} from './jobCoordinator';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {craftingEffort} from './crafting';
import {releaseTreeWorker} from './workAllocation';

export const GARMENT_REPAIR_RULES={version:1,workSeconds:40,targetCondition:.9,minimumDamage:.15,maximumCounter:1e12,patchUnits:1,cordageUnits:1} as const;
export const GARMENT_PATCH:Readonly<Record<GarmentKind,ItemKind>>={lightClothes:'cloth',skinClothes:'driedSkin',leatherClothes:'leather',hideCoat:'leather',woolCoat:'woolCloth'};
export type GarmentSlot='worn'|'spare';
export type GarmentRepair={version:1;team:number;workplaceId:number;sourceSlot:GarmentSlot;garment:Garment;initialCondition:number;phase:'traveling'|'working'|'paused';progress:number;started:number;paid:ItemStock;beforeJobLock:boolean;beforeFoodRole?:true};
export type GarmentMaintenance={version:1;metrics:{materialsUsed:ItemStock;started:number;completed:number;cancelled:number;lost:number;workSeconds:number;conditionRestored:number}};
const stock=(g:Game)=>g.state.garmentMaintenance??={version:1,metrics:{materialsUsed:{},started:0,completed:0,cancelled:0,lost:0,workSeconds:0,conditionRestored:0}};
const ownership=new WeakMap<Game,{state:GameState;owners:Set<Unit>}>();
const owners=(g:Game)=>{let c=ownership.get(g);if(!c||c.state!==g.state){c={state:g.state,owners:new Set()};ownership.set(g,c);}return c.owners;};
const id=(u:Unit)=>`garment-repair:${u.id}`;
const target=(u:Unit,slot:GarmentSlot)=>slot==='worn'?u.garment:u.spareGarment;
const setTarget=(u:Unit,slot:GarmentSlot,g?:Garment)=>{if(slot==='worn')u.garment=g;else u.spareGarment=g;};
const cacheReached=(g:Game,u:Unit)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return !!p&&supplyReached(g,u,d,p);});
const site=(g:Game,u:Unit,workplaceId?:number)=>g.state.buildings.filter(b=>b.team===u.team&&b.type==='tailor'&&g.finished(b)&&(workplaceId===undefined||b.id===workplaceId)).sort((a,b)=>Math.hypot(u.x-a.x,u.z-a.z)-Math.hypot(u.x-b.x,u.z-b.z)).find(b=>!!g.interactionSpot(u,b));
function available(g:Game,u:Unit){return u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&u.enslavedFrom===undefined&&!isDependent(g,u)&&!u.emergency&&!u.recalled&&!u.resting&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!hasTaskCommitment(u,'garmentRepair')&&['idle','hold','gather'].includes(u.order);}
function slotFree(g:Game,b:Building,except?:Unit){return (g.state.production?.projects.filter(p=>p.workplace===b.id&&!['complete','lost','returning','unloading','stored'].includes(p.phase)&&!(p.phase==='paused'&&['returning','unloading'].includes(p.resumePhase))).length||0)+g.state.units.filter(u=>u!==except&&u.hp>0&&u.garmentRepair?.workplaceId===b.id&&u.garmentRepair.phase!=='paused').length<productionSlots(b);}
function claim(g:Game,u:Unit,jobs:JobCoordinator=workRuntime(g)){
 const p=u.garmentRepair;if(!p||p.phase==='paused')return false;const b=g.state.buildings.find(b=>b.id===p.workplaceId&&b.team===u.team&&b.type==='tailor'&&g.finished(b));if(!b)return false;
 const key=id(u),prior=jobs.job(key);if(prior&&['completed','canceled'].includes(prior.phase))jobs.forget(key);
 if(!jobs.job(key))jobs.propose({id:key,kind:'garment-repair',owner:u.team,actors:[u.id],target:b.id});
 const ok=jobs.activeJob(u.id)?.id===key||jobs.amend(key,[u.id],[{key:`production:${b.id}:slots`,amount:1,capacity:productionSlots(b)}]);
 if(ok){owners(g).add(u);jobs.transition(key,p.phase==='working'?'working':'traveling',p.progress);}return ok;
}
function release(g:Game,u:Unit,finished=false){if(finished)owners(g).delete(u);else owners(g).add(u);const jobs=workRuntime(g),key=id(u);if(finished){jobs.finish(key);jobs.forget(key);}else jobs.suspend(key,'Garment and paid patches stay with the owner; repair paused');}
export function rebuildGarmentRepairOwnership(g:Game,jobs:JobCoordinator){for(const u of g.state.units)if(u.garmentRepair){owners(g).add(u);if(u.hp>0&&u.garmentRepair.phase!=='paused')claim(g,u,jobs);}}
export function garmentRepairIssue(g:Game,unitId:number,slot:GarmentSlot,workplaceId?:number){
 const u=g.state.units.find(u=>u.id===unitId&&u.team===0&&u.hp>0);if(!u||!['worn','spare'].includes(slot))return 'Choose an available resident and an owned garment';
 if(u.garmentRepair)return 'Finish or cancel the existing paid garment repair';
 const garment=target(u,slot);if(!garment)return 'No garment in this slot';if(garment.condition>GARMENT_REPAIR_RULES.targetCondition-GARMENT_REPAIR_RULES.minimumDamage)return 'This garment is already serviceable';
 if(!available(g,u))return 'This resident must finish their carried or reserved work first';if(!cacheReached(g,u))return 'Bring the garment owner to a real camp or store for repair materials';
 const b=site(g,u,workplaceId);if(!b)return 'Finish a reachable sewing shelter';if(!slotFree(g,b))return 'The sewing shelter is busy; finish or pause its paid work';
 const items=g.tribe(u.team).items||{},patch=GARMENT_PATCH[garment.item];if((items[patch]||0)<1)return `Need one ${ITEM_NAMES[patch]} patch in stores`;if((items.cordage||0)<1)return 'Need one cordage in stores';return null;
}
export function beginGarmentRepair(g:Game,unitId:number,slot:GarmentSlot,workplaceId?:number){
 const issue=garmentRepairIssue(g,unitId,slot,workplaceId);if(issue){g.banner(issue,3);return false;}const u=g.state.units.find(u=>u.id===unitId)!,b=site(g,u,workplaceId)!,garment=target(u,slot)!,patch=GARMENT_PATCH[garment.item];
 const p:GarmentRepair={version:1,team:u.team,workplaceId:b.id,sourceSlot:slot,garment,initialCondition:garment.condition,phase:'traveling',progress:0,started:g.state.time,paid:{[patch]:1,cordage:1},beforeJobLock:!!u.jobLock,...(u.foodRole?{beforeFoodRole:true}:{})};
 releaseTreeWorker(g,u);g.interruptMission(u);u.garmentRepair=p;if(!claim(g,u)){release(g,u,true);u.garmentRepair=undefined;g.banner('The sewing shelter or this resident is already reserved',3);return false;}
 setTarget(u,slot,undefined);const items=g.tribe(u.team).items!;items[patch]!--;items.cordage!--;const m=stock(g).metrics;m.started++;m.materialsUsed[patch]=(m.materialsUsed[patch]||0)+1;m.materialsUsed.cordage=(m.materialsUsed.cordage||0)+1;
 u.order='hold';u.jobLock=true;u.target=null;u.node=null;u.workReason='Carrying the original garment and paid patches to the sewing shelter';g.invalidateRoute(u);return true;
}
export function pauseGarmentRepair(g:Game,u:Unit){const p=u.garmentRepair;if(!p)return false;if(p.phase==='paused')return true;p.phase='paused';release(g,u);u.jobLock=false;return true;}
export function resumeGarmentRepair(g:Game,unitId:number){const u=g.state.units.find(u=>u.id===unitId&&u.team===0),p=u?.garmentRepair;if(!u||!p||p.phase!=='paused'||p.team!==u.team||!available(g,u))return false;const b=site(g,u,p.workplaceId);if(!b||!slotFree(g,b,u))return false;
 releaseTreeWorker(g,u);g.interruptMission(u);p.phase='traveling';if(!claim(g,u)){p.phase='paused';return false;}u.order='hold';u.jobLock=true;g.invalidateRoute(u);return true;
}
function restore(g:Game,u:Unit,completed:boolean,restoreWork=true){const p=u.garmentRepair;if(!p)return false;
 // Admission and equipment controls keep the source slot empty. Never overwrite
 // another physical garment if external state violates that custody invariant.
 if(target(u,p.sourceSlot))return false;setTarget(u,p.sourceSlot,p.garment);release(g,u,true);u.garmentRepair=undefined;
 if(restoreWork){u.jobLock=p.beforeJobLock;u.foodRole=p.beforeFoodRole;u.order=g.state.autoWorkEnabled===false&&!u.foodRole?'hold':'idle';u.workReason=completed?'Original garment repaired; ready for village work':'Repair cancelled; paid patches used, original garment returned';g.invalidateRoute(u);}return true;
}
export function cancelGarmentRepair(g:Game,unitId:number){const u=g.state.units.find(u=>u.id===unitId&&u.team===0);if(!u?.garmentRepair)return false;const active=u.garmentRepair.phase!=='paused';if(!restore(g,u,false,active))return false;stock(g).metrics.cancelled++;return true;}
export function garmentRepairRemainingWork(u:Unit){return u.garmentRepair?Math.max(0,GARMENT_REPAIR_RULES.workSeconds-u.garmentRepair.progress):0;}
/** Terminal custody reconciliation is also safe at dt=0 after deaths/transfers. */
export function tickGarmentRepairs(g:Game){const m=g.state.garmentMaintenance?.metrics;if(!m||m.started===m.completed+m.cancelled+m.lost)return;for(const u of [...owners(g)])if(!g.state.units.includes(u)){release(g,u,true);if(u.garmentRepair){u.garmentRepair=undefined;stock(g).metrics.lost++;}}for(const u of g.state.units){const p=u.garmentRepair;if(!p)continue;owners(g).add(u);
 if(u.hp<=0){release(g,u,true);u.garmentRepair=undefined;stock(g).metrics.lost++;continue;}
 if(u.team!==p.team||u.prisoner||u.enslavedFrom!==undefined){const freeBody=!u.prisoner&&u.enslavedFrom===undefined&&!hasTaskCommitment(u,'garmentRepair')&&u.order==='hold';if(restore(g,u,false,freeBody))stock(g).metrics.cancelled++;continue;}
 const b=g.state.buildings.find(b=>b.id===p.workplaceId&&b.team===p.team&&b.type==='tailor'&&g.finished(b));if(!b&&p.phase!=='paused'){pauseGarmentRepair(g,u);u.workReason='Original garment retained; sewing shelter unavailable';}
 }}
export function garmentRepairAI(g:Game,u:Unit,dt:number){const p=u.garmentRepair;if(!p||p.phase==='paused')return false;
 if(u.team!==p.team||u.hp<=0||u.prisoner)return false;const b=g.state.buildings.find(b=>b.id===p.workplaceId&&b.team===u.team&&b.type==='tailor'&&g.finished(b));
 if(!b||!claim(g,u)){pauseGarmentRepair(g,u);u.workReason='Paid repair paused; original garment and patches retained';return true;}
 const spot=g.interactionSpot(u,b);if(!spot){pauseGarmentRepair(g,u);u.workReason='Repair route blocked; original garment retained';return true;}u.tx=spot.x;u.tz=spot.z;u.order='hold';
 if(!g.buildingWorkReached(u,b)){u.workReason='Carrying the original garment to the sewing shelter';g.steer(u,dt);return true;}
 p.phase='working';u.workReason=`Repairing ${p.garment.item} · ${Math.floor(p.progress/GARMENT_REPAIR_RULES.workSeconds*100)}%`;const before=p.progress;p.progress=Math.min(GARMENT_REPAIR_RULES.workSeconds,p.progress+craftingEffort(u,dt,b));stock(g).metrics.workSeconds+=p.progress-before;
 if(p.progress>=GARMENT_REPAIR_RULES.workSeconds){const restored=GARMENT_REPAIR_RULES.targetCondition-p.initialCondition;p.garment.condition=GARMENT_REPAIR_RULES.targetCondition;if(restore(g,u,true)){stock(g).metrics.completed++;stock(g).metrics.conditionRestored+=restored;}}
 return true;
}
export function validGarment(value:unknown):value is Garment{if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as Garment;return GARMENT_KINDS.includes(v.item)&&Number.isFinite(v.condition)&&v.condition>=0&&v.condition<=1&&(v.heatExposureSeconds===undefined||Number.isFinite(v.heatExposureSeconds)&&v.heatExposureSeconds>=0&&v.heatExposureSeconds<=1e12)&&(v.wetness===undefined||Number.isFinite(v.wetness)&&v.wetness>=0&&v.wetness<=1);}
export function validGarmentRepairs(s:GameState){
 const finite=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,m=s.garmentMaintenance;
 if(m&&(m.version!==1||!m.metrics||!m.metrics.materialsUsed||typeof m.metrics.materialsUsed!=='object'||Array.isArray(m.metrics.materialsUsed)||!Object.entries(m.metrics.materialsUsed).every(([k,n])=>['cloth','driedSkin','leather','woolCloth','cordage'].includes(k)&&finite(n))||!['started','completed','cancelled','lost','workSeconds','conditionRestored'].every(k=>finite(m.metrics[k as keyof typeof m.metrics]))))return false;
 if(m){const n=m.metrics,active=s.units.filter(u=>u.garmentRepair).length,activeWork=s.units.reduce((sum,u)=>sum+(u.garmentRepair?.progress||0),0),patches=['cloth','driedSkin','leather','woolCloth'].reduce((sum,k)=>sum+(n.materialsUsed[k as ItemKind]||0),0);if(![n.started,n.completed,n.cancelled,n.lost].every(Number.isSafeInteger)||n.completed+n.cancelled+n.lost+active>n.started||n.conditionRestored>n.completed*GARMENT_REPAIR_RULES.targetCondition+1e-6||n.workSeconds>n.started*GARMENT_REPAIR_RULES.workSeconds+1e-6||(n.materialsUsed.cordage||0)!==n.started||patches!==n.started||!Object.values(n.materialsUsed).every(Number.isSafeInteger)||n.workSeconds+1e-6<n.completed*GARMENT_REPAIR_RULES.workSeconds+activeWork||n.conditionRestored+1e-6<n.completed*GARMENT_REPAIR_RULES.minimumDamage)return false;}
 for(const u of s.units){const p=u.garmentRepair;if(!p)continue;const patch=validGarment(p.garment)?GARMENT_PATCH[p.garment.item]:undefined;
  if(!m||p.version!==1||!Number.isInteger(p.team)||!s.tribes[p.team]||!Number.isSafeInteger(p.workplaceId)||p.workplaceId<1||p.workplaceId>=s.nextId||!['worn','spare'].includes(p.sourceSlot)||!validGarment(p.garment)||!finite(p.initialCondition,GARMENT_REPAIR_RULES.targetCondition)||p.initialCondition>GARMENT_REPAIR_RULES.targetCondition-GARMENT_REPAIR_RULES.minimumDamage||p.garment.condition!==p.initialCondition||!['traveling','working','paused'].includes(p.phase)||!finite(p.progress,GARMENT_REPAIR_RULES.workSeconds)||!finite(p.started,s.time)||typeof p.beforeJobLock!=='boolean'||p.beforeFoodRole!==undefined&&p.beforeFoodRole!==true||!p.paid||Object.keys(p.paid).length!==2||p.paid.cordage!==1||!patch||p.paid[patch]!==1||target(u,p.sourceSlot)!==undefined)return false;
 }
 const slotUse=new Map<number,number>();
 for(const p of s.production?.projects||[]){const phase=p.phase==='paused'?p.resumePhase:p.phase;if(['complete','lost'].includes(p.phase)||['returning','unloading','stored'].includes(phase))continue;const b=s.buildings.find(b=>b.id===p.workplace&&b.team===p.team&&b.hp>0);if(b)slotUse.set(b.id,(slotUse.get(b.id)||0)+1);}
 for(const u of s.units){const p=u.garmentRepair;if(!p||p.phase==='paused'||u.hp<=0)continue;if(hasTaskCommitment(u,'garmentRepair'))return false;const b=s.buildings.find(b=>b.id===p.workplaceId&&b.team===p.team&&b.hp>0);if(!b)continue;if(b.type!=='tailor')return false;const count=(slotUse.get(b.id)||0)+1;slotUse.set(b.id,count);if(count>productionSlots(b))return false;}
 return true;
}
