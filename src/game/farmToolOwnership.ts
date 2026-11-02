import type{Game}from'./sim';import type{Unit}from'./types';import type{JobCoordinator}from'./jobCoordinator';import{workRuntime}from'./workRuntime';
const ownership=new WeakMap<Game,{state:Game['state'];next:number;owners:Set<Unit>}>();
function context(g:Game){let c=ownership.get(g);if(!c||c.state!==g.state){c={state:g.state,next:-Infinity,owners:new Set()};ownership.set(g,c);}return c;}
export const farmToolJobId=(u:Pick<Unit,'id'>)=>`craft:farm-tool:${u.id}`;
/** Actor ownership only. Physical benches retain craftingQueue ordering;
 * haulage already accounts these workers as legacy bench users. */
export function claimFarmToolOwnership(g:Game,u:Unit,jobs=workRuntime(g)){
 const w=u.farmToolWork;if(!w||w.paused||u.hp<=0)return false;const id=farmToolJobId(u),prior=jobs.job(id);if(prior&&['completed','canceled'].includes(prior.phase))jobs.forget(id);
 if(!jobs.job(id))jobs.propose({id,kind:'craft:farm-tool',owner:u.team,actors:[u.id],target:w.workplace});const job=jobs.job(id),ok=jobs.activeJob(u.id)?.id===id?true:job?.phase==='suspended'?jobs.resume(id,[u.id]):jobs.reserve(id);
 if(ok){context(g).owners.add(u);jobs.retarget(id,w.workplace);jobs.transition(id,'working',w.progress/w.duration);}return ok;
}
export function releaseFarmToolOwnership(g:Game,u:Unit,complete=false){const jobs=workRuntime(g),id=farmToolJobId(u);context(g).owners.delete(u);if(complete){jobs.finish(id);jobs.forget(id);}else jobs.suspend(id,'Tool work paused; paid materials and progress retained');}
export function rebuildFarmToolOwnership(g:Game,jobs:JobCoordinator){for(const u of g.state.units)if(u.hp>0&&u.farmToolWork&&!u.farmToolWork.paused)claimFarmToolOwnership(g,u,jobs);}

/** One bounded ownership audit per second, including removed/dead makers. */
export function reconcileFarmToolOwnership(g:Game){const c=context(g);if(c.next>g.state.time&&c.next<=g.state.time+1)return;c.next=g.state.time+1;const living=new Set(g.state.units);for(const u of c.owners)if(!living.has(u)||u.hp<=0||!u.farmToolWork||u.farmToolWork.paused||u.order!=='hold')releaseFarmToolOwnership(g,u);for(const u of g.state.units)if(u.hp>0&&u.farmToolWork&&!u.farmToolWork.paused&&u.order==='hold')claimFarmToolOwnership(g,u);}
