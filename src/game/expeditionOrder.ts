import type {Game} from './sim';
import {orderExploration,explorationOrderIssue} from './explorationOrders';
import {expeditionProvisionCapacity} from './expeditionProvisions';
import {isDependent} from './settlement';
/** The send-expedition panel's order: named adults, one destination, real provisions packed per person by the existing
 * expedition rules. This module only validates and fans the order out; it never creates food, people or travel. */
export const SEND_EXPEDITION_RULES={version:1,maximumParty:12,minimumMeters:30,maximumMeters:400} as const;
export type SendExpeditionCommand={kind:'send-expedition';unitIds:number[];x:number;z:number};
export type ExpeditionCandidate={id:number;name:string;issue:string|null;provisionUnits:number};
export function expeditionCandidates(g:Game):ExpeditionCandidate[]{
 return g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia).slice(0,64).map(u=>({id:u.id,name:u.name||`Resident ${u.id}`,issue:explorationOrderIssue(g,u),provisionUnits:expeditionProvisionCapacity(u)}));
}
export function destinationFrom(g:Game,bearingDegrees:number,meters:number){
 const home=g.campOf(0),r=Math.max(SEND_EXPEDITION_RULES.minimumMeters,Math.min(SEND_EXPEDITION_RULES.maximumMeters,meters)),a=bearingDegrees*Math.PI/180,lim=g.world.size/2-8;
 return{x:Math.max(-lim,Math.min(lim,home.x+Math.sin(a)*r)),z:Math.max(-lim,Math.min(lim,home.z-Math.cos(a)*r))};
}
export function applySendExpedition(g:Game,c:SendExpeditionCommand):{accepted:boolean;reason:string}{
 const no=(reason:string)=>({accepted:false,reason});
 if(!Number.isFinite(c.x)||!Number.isFinite(c.z)||Math.abs(c.x)>g.world.size||Math.abs(c.z)>g.world.size)return no('Choose a destination on the map');
 const ids=[...new Set(c.unitIds)];if(!ids.length)return no('Choose who goes');if(ids.length>SEND_EXPEDITION_RULES.maximumParty)return no(`A party is at most ${SEND_EXPEDITION_RULES.maximumParty} people`);
 let sent=0,queued=0,reason='';
 for(const id of ids){const u=g.state.units.find(u=>u.id===id&&u.team===0&&u.hp>0);if(!u){reason='Someone in the party is no longer with you';continue;}
  const issue=orderExploration(g,u,{x:c.x,z:c.z});if(issue){reason=issue;continue;}sent++;if(u.exploreAfterDelivery)queued++;}
 return sent?{accepted:true,reason:`${sent} ${sent===1?'person sets':'people set'} out${queued?` (${queued} after unloading at the stores)`:''}${sent<ids.length?`; ${ids.length-sent} could not go: ${reason}`:''}`}:no(reason||'No one could go');
}
