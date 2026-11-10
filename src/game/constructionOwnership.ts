import{hasConstructionWork}from'./constructionTargets';
import type {Game} from './sim';
import type {Building,Unit} from './types';
import {workRuntime} from './workRuntime';
import {releaseTreeWorker} from './workAllocation';
export const CONSTRUCTION_OWNERSHIP_RULES={auditIntervalSeconds:1} as const;
type Claim={id:string;target:Building};
type Context={state:Game['state'];claims:Map<number,Claim>;nextAudit:number;audits:number};
const contexts=new WeakMap<Game,Context>();
function context(g:Game){let c=contexts.get(g);if(!c||c.state!==g.state){c={state:g.state,claims:new Map(),nextAudit:-1,audits:0};contexts.set(g,c);}return c;}
function viable(g:Game,u:Unit,b:Building){return u.hp>0&&!u.emergency&&!u.prisoner&&b.hp>0&&b.team===u.team&&!b.planPaused&&hasConstructionWork(b);}
function release(g:Game,c:Context,actor:number,completed=false){const claim=c.claims.get(actor);if(!claim)return;const jobs=workRuntime(g);jobs.finish(claim.id,!completed);jobs.forget(claim.id);c.claims.delete(actor);}
/** Actor-only migration: paid materials, cargo and construction rates remain
 * owned by their existing executors. There is deliberately no new site cap. */
export function reserveConstructionWorker(g:Game,u:Unit,b:Building,phase:'reserved'|'traveling'|'working'|'returning'='reserved'){
 const c=context(g);if(!viable(g,u,b)){release(g,c,u.id);return false;}
 let claim=c.claims.get(u.id);if(claim&&claim.target!==b){release(g,c,u.id);claim=undefined;}
 if(!claim){
  releaseTreeWorker(g,u);
  const jobs=workRuntime(g),id=`construction:${b.id}:worker:${u.id}`;
  jobs.propose({id,kind:'construction',owner:u.team,actors:[u.id],target:b.id});
  if(!jobs.reserve(id,b.renovation?[{key:`housing:${b.id}:workspot`,amount:1,capacity:1}]:[])){jobs.finish(id,true);jobs.forget(id);return false;}
  claim={id,target:b};c.claims.set(u.id,claim);
 }
 if(phase!=='reserved')workRuntime(g).transition(claim.id,phase,b.renovation?b.renovation.progress/b.renovation.duration:b.expansion?.progress??b.build);
 return true;
}
export function releaseConstructionWorker(g:Game,u:Unit){release(g,context(g),u.id);}
export function completeConstructionTarget(g:Game,b:Building){const c=context(g);for(const[actor,claim]of c.claims)if(claim.target===b)release(g,c,actor,true);}
/** Serialized intent is authoritative; rebuilding the runtime changes no orders,
 * inventory, project progress or cargo. One shared scan per second, never one
 * world scan per builder. Direct cargo returns remain construction commitments. */
export function reconcileConstructionWorkers(g:Game){
 const c=context(g);if(c.nextAudit>g.state.time&&c.nextAudit<=g.state.time+CONSTRUCTION_OWNERSHIP_RULES.auditIntervalSeconds)return;
 c.nextAudit=g.state.time+CONSTRUCTION_OWNERSHIP_RULES.auditIntervalSeconds;c.audits++;
 const buildings=new Map(g.state.buildings.map(b=>[b.id,b])),intents=new Map<number,{u:Unit;b:Building}>();
 for(const u of g.state.units){const b=u.buildOrder!==undefined?buildings.get(u.buildOrder):u.order==='build'&&u.node&&'type'in u.node?buildings.get(u.node.id):undefined;if(b&&viable(g,u,b))intents.set(u.id,{u,b});}
 for(const[actor,claim]of c.claims){const intent=intents.get(actor);if(!intent||intent.b!==claim.target)release(g,c,actor,claim.target.hp>0&&!hasConstructionWork(claim.target));}
 for(const{u,b}of intents.values())reserveConstructionWorker(g,u,b,u.carry>0?'returning':'reserved');
}
export function constructionOwnershipDiagnostics(g:Game){const c=context(g);return{activeConstructionJobs:c.claims.size,audits:c.audits,...workRuntime(g).metrics};}
