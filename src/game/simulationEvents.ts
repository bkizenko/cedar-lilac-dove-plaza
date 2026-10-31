import type {Game} from './sim';
export const SIMULATION_EVENT_RULES={version:1,recentLimit:256,maxTeams:32,continuousBucketSeconds:1} as const;
export const EVENT_KINDS=['food_received','food_consumed','food_spoiled','cargo_delivered'] as const;
export type SimulationEventKind=typeof EVENT_KINDS[number];
export type SimulationEvent={sequence:number;timeSeconds:number;kind:SimulationEventKind;team:number;resource:'food'|'wood'|'stone'|'copper'|'iron';amount:number;actorId?:number};
export type SimulationEventLog={version:1;nextSequence:number;recent:SimulationEvent[];totals:Record<string,number>};
/** A bounded journal plus conserved quantity totals. Separate event kinds must
 * not be summed together: cargo delivery and food receipt describe the same goods. */
const continuous=new WeakMap<SimulationEventLog,Map<string,SimulationEvent>>();
export function recordSimulationEvent(g:Game,kind:SimulationEventKind,team:number,resource:SimulationEvent['resource'],amount:number,actorId?:number){
 if(!Number.isFinite(amount)||amount<=0||!Number.isInteger(team)||team<0||team>=SIMULATION_EVENT_RULES.maxTeams)return;
 const log=g.state.simulationEvents??={version:1,nextSequence:1,recent:[],totals:{}};
 const key=`${kind}:${team}:${resource}`;
 log.totals[key]=(log.totals[key]||0)+amount;
 if(kind==='food_consumed'||kind==='food_spoiled'){
  let cache=continuous.get(log);if(!cache){cache=new Map();continuous.set(log,cache);}
  const prior=cache.get(key),bucket=SIMULATION_EVENT_RULES.continuousBucketSeconds;
  if(prior&&Math.floor(prior.timeSeconds/bucket)===Math.floor(g.state.time/bucket)&&prior.sequence>=(log.recent[0]?.sequence??0)){prior.amount+=amount;return;}
  const event={sequence:log.nextSequence++,timeSeconds:g.state.time,kind,team,resource,amount,...(actorId===undefined?{}:{actorId})};
  log.recent.push(event);cache.set(key,event);
 }else log.recent.push({sequence:log.nextSequence++,timeSeconds:g.state.time,kind,team,resource,amount,...(actorId===undefined?{}:{actorId})});
 if(log.recent.length>SIMULATION_EVENT_RULES.recentLimit)log.recent.splice(0,log.recent.length-SIMULATION_EVENT_RULES.recentLimit);
}
export function supplyAccounting(g:Game,team=0){
 const total=(kind:SimulationEventKind,resource='food')=>g.state.simulationEvents?.totals[`${kind}:${team}:${resource}`]||0;
 return {foodReceived:total('food_received'),foodConsumed:total('food_consumed'),foodSpoiled:total('food_spoiled'),cargoDelivered:Object.fromEntries(['food','wood','stone','copper','iron'].map(resource=>[resource,total('cargo_delivered',resource)]))};
}
export function validSimulationEvents(value:unknown){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const log=value as SimulationEventLog;
 if(log.version!==1||!Number.isSafeInteger(log.nextSequence)||log.nextSequence<1||!Array.isArray(log.recent)||log.recent.length>SIMULATION_EVENT_RULES.recentLimit||!log.totals||typeof log.totals!=='object'||Array.isArray(log.totals))return false;
 const entries=Object.entries(log.totals);if(entries.length>EVENT_KINDS.length*SIMULATION_EVENT_RULES.maxTeams*5)return false;
 if(entries.some(([key,n])=>! /^(food_received|food_consumed|food_spoiled|cargo_delivered):([0-9]|[12][0-9]|3[01]):(food|wood|stone|copper|iron)$/.test(key)||!Number.isFinite(n)||n<0))return false;
 let previous=0;
 for(const e of log.recent){
  if(!e||!Number.isSafeInteger(e.sequence)||e.sequence<=previous||e.sequence>=log.nextSequence||!Number.isFinite(e.timeSeconds)||e.timeSeconds<0||!EVENT_KINDS.includes(e.kind)||!Number.isInteger(e.team)||e.team<0||e.team>=SIMULATION_EVENT_RULES.maxTeams||!['food','wood','stone','copper','iron'].includes(e.resource)||!Number.isFinite(e.amount)||e.amount<=0||e.actorId!==undefined&&(!Number.isSafeInteger(e.actorId)||e.actorId<1))return false;
  previous=e.sequence;
 }
 return true;
}
