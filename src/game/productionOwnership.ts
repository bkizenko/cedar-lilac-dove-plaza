import type{Game}from'./sim';
import type{Unit}from'./types';
import type{ProductionProject}from'./production';
import{PRODUCTION_RECIPES,productionSlots,itemCapacity,cerealReservedMaterials,outsideFoodCache,PRODUCTION_RULES}from'./production';
import type{JobCoordinator}from'./jobCoordinator';
import{workRuntime}from'./workRuntime';
export const productionJobId=(id:number)=>`production:${id}`;
const effective=(p:ProductionProject)=>p.phase==='paused'?p.resumePhase:p.phase;
const live=(p:ProductionProject)=>p.phase!=='complete'&&p.phase!=='lost';
export function paidInputUnits(p:ProductionProject){const r=PRODUCTION_RECIPES[p.recipe];return Object.values(r.inputs).reduce((n,v)=>n+(v||0),0)+r.grain+Object.values(r.foodInputs).reduce((n,v)=>n+(v||0),0);}
export function cachedProductionUnits(g:Game,team:number){let total=0;for(const p of g.state.production?.projects||[])if(p.team===team&&['stored','collecting'].includes(effective(p)))total+=paidInputUnits(p);return total;}
type Context={state:Game['state'];jobs:JobCoordinator;claims:Map<number,string>;rebuilds:number;amendments:number;conflicts:number};
const contexts=new WeakMap<Game,Context>();
function context(g:Game,jobs?:JobCoordinator){let c=contexts.get(g);if(c?.state===g.state)return c;const coordinator=jobs||workRuntime(g);c=contexts.get(g);if(c?.state===g.state)return c;c={state:g.state,jobs:coordinator,claims:new Map(),rebuilds:0,amendments:0,conflicts:0};contexts.set(g,c);return c;}

function requests(g:Game,p:ProductionProject){const phase=effective(p),claims:{key:string;amount:number;capacity:number}[]=[];
 const b=g.state.buildings.find(b=>b.id===p.workplace&&b.team===p.team&&g.finished(b));
 if(!['returning','unloading','stored'].includes(phase)&&b)claims.push({key:`production:${b.id}:slots`,amount:1,capacity:productionSlots(b)});
 if(['stored','collecting'].includes(phase)){const outside=outsideFoodCache(g,p);if(outside){claims.push({key:`production:outside-food:${outside.id}:parcels`,amount:1,capacity:PRODUCTION_RULES.maximumProjects});return claims;}const used=Object.values(g.tribe(p.team).items||{}).reduce((n,v)=>n+(v||0),0);
 // New loose gathered goods may be unloaded outside. They must not revoke
 // space already held by real paid parcels or stop their physical collection.
 // Only parcels already stored/collecting in saved state count: a proposed
 // new unload gets no extra admission capacity from its own future claim.
 let alreadyPlaced=0;for(const q of g.state.production?.projects||[])if(q.team===p.team&&live(q)&&['stored','collecting'].includes(effective(q))&&!outsideFoodCache(g,q))alreadyPlaced+=paidInputUnits(q);
 claims.push({key:`production:cache:${p.team}:units`,amount:paidInputUnits(p),capacity:Math.max(alreadyPlaced,0,itemCapacity(g,p.team)-used-cerealReservedMaterials(g,p.team,p.id))});}
 return claims;
}
/** Saved project owns goods. This runtime claims only hands and physical space. */
export function claimProductionOwnership(g:Game,p:ProductionProject,jobs?:JobCoordinator){const c=context(g,jobs),id=productionJobId(p.id);if(!live(p)){releaseProductionOwnership(g,p);return true;}const claims=requests(g,p),signature=JSON.stringify([p.actorId,p.workplace,...claims.map(x=>[x.key,x.amount,...(g.state.cerealProcessing?[x.capacity]:[])])]);
 if(c.claims.get(p.id)!==signature){if(!c.jobs.job(id))c.jobs.propose({id,kind:`production:${p.recipe}`,owner:p.team,actors:[],target:p.workplace});
 if(!c.jobs.amend(id,p.actorId===null?[]:[p.actorId],claims)){c.conflicts++;return false;}c.claims.set(p.id,signature);c.amendments++;c.jobs.retarget(id,p.workplace);}
 const phase=effective(p);c.jobs.transition(id,p.phase==='paused'||phase==='stored'||phase==='ready'&&p.actorId===null?'reserved':phase==='returning'||phase==='unloading'?'returning':phase==='working'||phase==='curing'?'working':'traveling',p.progress);return true;
}
export function productionOwnershipReason(g:Game,p:ProductionProject){const reason=workRuntime(g).job(productionJobId(p.id))?.blockedReason;return reason?.includes(':slots')?'All physical processing slots at this workplace are reserved':reason?.includes(':cache:')?'Material storage has no room to park this paid batch':reason?.includes('Resident')?'This resident already owns another active job':reason||'Paid batch ownership is unavailable';}
export function releaseProductionOwnership(g:Game,p:ProductionProject){const c=context(g);if(!c.claims.has(p.id)&&!c.jobs.job(productionJobId(p.id)))return;c.jobs.finish(productionJobId(p.id),p.phase==='lost');c.jobs.forget(productionJobId(p.id));c.claims.delete(p.id);}
/** workRuntime calls this before any tree/build/haulage admission on a loaded state. */
export function rebuildProductionOwnership(g:Game,jobs:JobCoordinator){const c=context(g,jobs);c.rebuilds++;for(const p of g.state.production?.projects||[])if(live(p)&&!claimProductionOwnership(g,p,jobs))p.blockedReason=productionOwnershipReason(g,p);}
export function productionActorAvailable(g:Game,u:Unit,project?:number){const job=workRuntime(g).activeJob(u.id);return !job||job.id===productionJobId(project??-1)||job.kind==='gather:wood';}
export function productionOwnershipIssue(g:Game,u:Unit){const p=g.state.production?.projects.find(p=>p.id===u.productionProjectId&&live(p));if(!p)return null;const phase=effective(p);return ['carrying','returning','unloading'].includes(phase)?'This resident carries a paid batch. Use Unload batch at cache at its workplace queue before assigning another job; move orders remain available.':null;}
export function productionOwnershipDiagnostics(g:Game){const c=context(g),all=(g.state.production?.projects||[]).filter(live);return{activeProductionProjects:c.claims.size,activeProductionActors:all.filter(p=>p.actorId!==null).length,passiveBatches:all.filter(p=>effective(p)==='curing').length,storedBatches:all.filter(p=>effective(p)==='stored').length,rebuilds:c.rebuilds,amendments:c.amendments,conflicts:c.conflicts,coordinator:{...c.jobs.metrics},reservations:{...c.jobs.reservations.metrics}};}
