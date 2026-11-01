import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {bridgeApproach} from './transport';
import {orderConstruction} from './construction';
import {releaseConstructionWorker} from './constructionOwnership';
export type ConstructionQueueState={sites:number[];paused?:true};
export type ConstructionPriority=0|1|2;
type Builder=Unit&{constructionQueue?:ConstructionQueueState};
type Site=Building&{constructionPriority?:ConstructionPriority};
export const CONSTRUCTION_QUEUE_RULES={maximumSites:64,auditIntervalSeconds:1,automaticPriorityDelta:100} as const;
const clocks=new WeakMap<Game,{state:Game['state'];next:number}>();
function wake(g:Game){clocks.delete(g);}
function adult(g:Game,u:Unit){return u.team===0&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&!u.prisoner;}
function live(g:Game,b:Building){return b.team===0&&b.hp>0&&(!g.finished(b)||!!b.expansion);}
export function constructionPriority(b:Site){return b.constructionPriority??1;}
export function setConstructionPriority(g:Game,b:Site,value:ConstructionPriority){if(!live(g,b)||![0,1,2].includes(value))return false;b.constructionPriority=value;g.workBoard.reset();wake(g);return true;}
export function queueConstruction(g:Game,b:Building,workers:Unit[]=g.selectedUnits()){
 if(!live(g,b))return{accepted:false,reason:'Choose an unfinished village building or extension'};
 const chosen=(workers.length?workers:g.state.units.filter(u=>adult(g,u)&&!u.militia&&!u.emergency&&!hasTaskCommitment(u)).sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z)).slice(0,2)).filter(u=>adult(g,u)) as Builder[];
 if(!chosen.length)return{accepted:false,reason:'Choose an adult builder'};
 let count=0;for(const u of chosen){const prior=u.constructionQueue,active=u.buildOrder??(u.order==='build'&&u.node&&'type'in u.node?u.node.id:undefined),sites=[...new Set(prior?.sites??[])];if(active&&!sites.includes(active)&&sites.length<CONSTRUCTION_QUEUE_RULES.maximumSites)sites.unshift(active);if(!sites.includes(b.id)){if(sites.length>=CONSTRUCTION_QUEUE_RULES.maximumSites)continue;sites.push(b.id);}u.constructionQueue={sites,...(prior?.paused?{paused:true as const}:{})};count++;}
 wake(g);return{accepted:count>0,reason:count?`Added to ${count} builder ${count===1?'queue':'queues'}`:'Builder queue is full'};
}
/** An explicit Build now command keeps existing pending sites, but puts this
 * site first. Legacy residents without a queue retain their existing behavior. */
export function recordImmediateConstruction(g:Game,u:Builder,b:Building){if(!u.constructionQueue)return;const active=u.buildOrder;const existing=u.constructionQueue.sites,ordered=[...new Set([b.id,...(active?[active]:[]),...existing])];u.constructionQueue={sites:ordered.length<=CONSTRUCTION_QUEUE_RULES.maximumSites?ordered:existing};wake(g);}
export function pauseConstructionQueue(g:Game,u:Builder){if(!u.constructionQueue)return false;u.constructionQueue.paused=true;if(u.buildOrder!==undefined){releaseConstructionWorker(g,u);u.buildOrder=undefined;if(u.order==='build'){u.node=null;u.order=u.carry>0?'return':'hold';}}wake(g);return true;}
export function resumeConstructionQueue(g:Game,u:Builder){if(!u.constructionQueue)return false;delete u.constructionQueue.paused;wake(g);return true;}
export function editConstructionQueue(g:Game,u:Builder,id:number,direction:'remove'|'up'|'down'){
 const q=u.constructionQueue;if(!q)return false;const at=q.sites.indexOf(id);if(at<0)return false;
 if(direction==='remove'){q.sites.splice(at,1);if(u.buildOrder===id){releaseConstructionWorker(g,u);u.buildOrder=undefined;if(u.order==='build'){u.node=null;u.order=u.carry>0?'return':'idle';}}}else{const next=at+(direction==='up'?-1:1);if(next<0||next>=q.sites.length)return false;[q.sites[at],q.sites[next]]=[q.sites[next],q.sites[at]];}
 if(!q.sites.length)u.constructionQueue=undefined;wake(g);return true;
}
function focusMatch(g:Game,b:Building){const focus=g.state.laborPolicy;return focus==='food'&&['farm','dock'].includes(b.type)||focus==='wood'&&b.type==='lumber'||focus==='stone'&&b.type==='quarry'?1:0;}
/** Queue intent holds no actor or material reservations. Only the selected
 * current site enters the ordinary direct-order executor and coordinator. */
export function updateConstructionQueues(g:Game){
 const previous=clocks.get(g);if(previous?.state===g.state&&previous.next>g.state.time&&previous.next<=g.state.time+CONSTRUCTION_QUEUE_RULES.auditIntervalSeconds)return;
 clocks.set(g,{state:g.state,next:g.state.time+CONSTRUCTION_QUEUE_RULES.auditIntervalSeconds});const buildings=new Map(g.state.buildings.map(b=>[b.id,b]));
 for(const worker of g.state.units){const u=worker as Builder,q=u.constructionQueue;if(!q)continue;q.sites=q.sites.filter(id=>{const b=buildings.get(id);return!!b&&live(g,b);});if(!q.sites.length){u.constructionQueue=undefined;continue;}
  if(q.paused||!adult(g,u)||u.emergency||u.militia||u.recalled||u.envoy||u.scout||u.expedition||u.foundingJourney||u.visit||u.escortId!==undefined||hasTaskCommitment(u)||!['idle','hold','gather','return','build'].includes(u.order))continue;
  const active=u.buildOrder!==undefined?buildings.get(u.buildOrder):undefined;if(active&&live(g,active)&&!active.planPaused)continue;
  const ready=q.sites.map((id,index)=>({b:buildings.get(id)! as Site,index})).filter(({b})=>!b.planPaused&&(!b.plannedCost||g.state.weather!=='storm'&&g.canAfford(0,b.plannedCost))&&(b.type==='bridge'?!!bridgeApproach(g,u,b):g.workBoard.connected(g,u.x,u.z,b.x,b.z))).sort((a,b)=>constructionPriority(b.b)-constructionPriority(a.b)||focusMatch(g,b.b)-focusMatch(g,a.b)||a.index-b.index);
  const selected=ready[0]?.b;if(!selected)continue;const retained=q.sites.slice();if(orderConstruction(g,selected,[u]))u.constructionQueue={sites:retained};
 }
}
