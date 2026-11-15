import type {Game} from './sim';
import type {Unit,Building} from './types';
import {isDependent} from './settlement';
/** Player-directed crafting wins over workload and auto-assigned work. These
 * helpers only release soft commitments (gathering, hauling queues, paused-able
 * paid projects). Anything physical stays: carried goods, journeys, emergencies. */
type Loose=Unit&Record<string,any>;
const AWAY:[string,string][]=[['societyMissionId','is away on a society mission'],['coastalVoyageId','is away on a voyage'],['coastalCommissionId','is on a coastal commission'],['expedition','is away on an expedition'],['envoy','is travelling as an envoy'],['scout','is scouting'],['visit','is visiting'],['foundingJourney','is founding a settlement'],['tributeJourney','is delivering tribute'],['emergency','is responding to an emergency'],['recalled','is answering the recall horn'],['boat','is aboard a boat'],['captive','is held captive'],['caravanArmed','is escorting a caravan']];
/** Hard reason a person cannot take directed craft work, or null. */
export function directedBlocker(g:Game,u:Unit|undefined,opts:{militia?:boolean}={}):string|null{
 if(!u||u.hp<=0)return'That person is gone';
 const x=u as Loose;
 if(u.prisoner)return'A prisoner cannot craft';
 if(isDependent(g,u))return'Children cannot do this work';
 if(u.type==='leader')return'Leaders do not craft';
 if(u.type!=='worker'&&!(opts.militia&&u.militia))return'Only adult civilians do this work';
 if(u.militia&&!opts.militia)return'Armed citizens do not do this work';
 for(const[k,why]of AWAY)if(x[k])return`${x.name||'This person'} ${why}`;
 if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0)||x.housingCargo||(x.waterWork?.liters||0)>0||x.farmToolCargoId!==undefined)return`${x.name||'This person'} is carrying goods and must deliver them first`;
 return null;
}
/** Free a person for directed craft work. Returns false (and changes nothing) when a hard blocker applies. */
export function freeForDirectedWork(g:Game,u:Unit,opts:{militia?:boolean}={}):boolean{
 if(directedBlocker(g,u,opts))return false;
 if(typeof g.interruptMission==="function")g.interruptMission(u);
 // Interrupting pauses the person's own paid craft records; the caller reactivates the one it needs.
 u.order='idle';u.node=null;u.target=null;u.attackDestination=null as any;
 return true;
}
/** Lower is better: nearest first; soft penalties keep free hands ahead of busy ones and builders last. */
export function directedRank(u:Unit,b:Pick<Building,'x'|'z'>):number{
 const busy=!['idle','hold'].includes(u.order)||(u as Loose).jobLock;
 return Math.hypot(b.x-u.x,b.z-u.z)+(busy?25:0)+(u.buildOrder!==undefined?400:0)+(u.selected?-1000:0);
}
export function directedFail(g:Game,team:number,reason:string){if(team===0){g.banner(reason,4);g.onSfx('invalid');}return false;}
