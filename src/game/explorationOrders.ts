import{productionOwnershipIssue}from'./productionOwnership';
import{unloadProductionProject,productionAI}from'./production';
import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {beginExpedition} from './journeys';
/** A saved intent, not a second cargo inventory or prepaid expedition. */
export const EXPLORE_ORDER_RULES={retrySeconds:5} as const;
const nextAttempt=new WeakMap<Unit,number>();
export function explorationLoad(u:Unit){const cargo=(u as Unit&{itemCargo?:Record<string,number>}).itemCargo;return u.carry>0||(u.waterWork?.liters||0)>0||Object.values(cargo||{}).some(n=>n>0);}
export function explorationOrderIssue(g:Game,u:Unit){return u.team!==0||u.hp<=0?'Select a living resident':isDependent(g,u)?'Children cannot depart on an independent expedition':u.prisoner?'Release or escort this person through the custody controls first':u.emergency?'Wait until this resident is safe from the current attack':u.boat?'Disembark before starting a land expedition':u.escortId!==undefined||u.conflictIntent==='occupy'||u.conflictIntent==='capture'?'Withdraw the guarding or occupation duty before exploring':u.order==='trade'||u.visit||u.tributeJourney?'Finish or recall the physical shipment before exploring':null;}
export function startExploration(g:Game,u:Unit,target=g.findExploreTarget(u)){if(!target)return 'No unknown reachable ground found';if(!beginExpedition(g,u))return 'Not enough food to pack a safe journey';g.interruptMission(u);Object.assign(u,{order:'explore',pillage:-1,attackDestination:null,stuckT:0,workReason:'Exploring until you give another order',tx:target.x,tz:target.z,target:null,node:null,trade:null,wanderT:0,gatherT:0});return null;}
export function orderExploration(g:Game,u:Unit,target?:{x:number;z:number}){const issue=explorationOrderIssue(g,u);if(issue)return issue;if(productionOwnershipIssue(g,u)&&u.productionProjectId!==undefined){if(!unloadProductionProject(g,u.productionProjectId)){
 const project=g.state.production?.projects.find(p=>p.id===u.productionProjectId);
 return project?.blockedReason||'The paid batch needs its original living carrier and a reachable cache';
}u.exploreAfterDelivery=true;u.workReason='Explore queued — physically unloading the paid batch first';nextAttempt.delete(u);return null;}if(!explorationLoad(u))return startExploration(g,u,target);g.interruptMission(u);u.exploreAfterDelivery=true;u.recalled=true;u.stationOnArrival=false;u.order='return';u.target=null;u.node=null;u.pillage=-1;u.attackDestination=null;u.workReason='Explore queued — carrying existing supplies home first';nextAttempt.delete(u);return null;}
/** The existing recall executor unloads at a reachable physical cache. Only
 * afterwards do we pack provisions and issue Explore; paid jobs stay paused. */
export function queuedExplorationAI(g:Game,u:Unit,dt:number){if(!u.exploreAfterDelivery||u.demobilizing)return false;if(u.productionProjectId!==undefined){productionAI(g,u,dt);if(u.exploreAfterDelivery)u.workReason='Explore queued — '+(u.workReason||'unloading the paid batch at cache');return true;}if(u.recalled||explorationLoad(u)){u.recalled=true;g.workerAI(u,dt);if(u.exploreAfterDelivery)u.workReason='Explore queued — '+(u.recalled?((u.workReason?.includes('no reachable')||u.workReason?.includes('cache full'))?u.workReason:'returning and unloading existing supplies'):'supplies delivered; preparing the journey');return true;}
 if(g.state.time<(nextAttempt.get(u)||0))return true;nextAttempt.set(u,g.state.time+EXPLORE_ORDER_RULES.retrySeconds);const issue=startExploration(g,u);if(issue){u.order='hold';u.workReason='Explore queued — '+issue.toLowerCase();}return true;}
