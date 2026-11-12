import type {Game} from './sim';
import type {Building,ResKind,Unit} from './types';
import {isRivalTeam} from './factions';
import {prehistoricName} from './people';
import {CITY_LEADERS} from './constants';
import {recordConflict} from './conflictMetrics';
import type {PrisonerUnit} from './captivity';

/**
 * Raider camps can settle into productive societies (user: "raiders can maintain real camps and potentially
 * transition into productive societies"). The decision is measured, per camp, from its own state:
 *  - its residents have stayed home (no departures) and lost nobody for a sustained quiet period, or raiding
 *    stopped paying (heavy losses) followed by a shorter quiet period;
 *  - the site can feed people from nearby wild food (forage, fish or game) and has timber;
 *  - a free society identity exists (a rival slot whose society is gone, not annexed).
 * Nothing is created: the same people, hut and a head-count share of the raiders' actual shared stores move to
 * the new society. Saved as optional `state.raiderSettlement` (absent = none tracked).
 */
export type CampWatch={campId:number;quietSeconds:number;lastDepartures:number;lastLost:number;lostSinceWatch:number;bandAtWatch:number;lastMeasuredAt:number};
export type CampTransition={campId:number;team:number;at:number;residents:number;goods:Partial<Record<ResKind,number>>};
export type RaiderSettlementState={version:1;camps:CampWatch[];transitions:CampTransition[]};
export const RAIDER_SETTLEMENT_RULES={version:1,quietSeconds:1200,lossQuietSeconds:600,lossFraction:.5,minimumResidents:2,siteRadiusMeters:65,minimumTrees:2,maximumWatched:32,maximumTransitions:64} as const;
const R=RAIDER_SETTLEMENT_RULES;
const st=(g:Game)=>g.state as Game['state']&{raiderSettlement?:RaiderSettlementState};
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const home=(g:Game,camp:Building)=>g.state.units.filter(u=>u.team===3&&u.hp>0&&u.homeCamp===camp.id&&!(u as PrisonerUnit).prisoner);
const away=(u:Unit)=>!!u.seaRaid||!!(u as Unit&{campTrip?:unknown}).campTrip||u.order==='attack'||u.order==='attackmove';
export function campSiteCanFeed(g:Game,camp:{x:number;z:number}){
 const food=g.state.forage.some(n=>n.amount>0&&dist(n,camp)<R.siteRadiusMeters)||g.state.fish.some(n=>n.amount>=1&&dist(n,camp)<R.siteRadiusMeters)||g.state.wildlife.some(n=>n.hp>0&&n.species!=='bird'&&dist(n,camp)<R.siteRadiusMeters);
 const trees=g.state.trees.filter(n=>n.amount>0&&dist(n,camp)<R.siteRadiusMeters).length>=R.minimumTrees;
 return food&&trees;
}
export function freeSocietySlot(g:Game){return g.state.tribes.find(t=>isRivalTeam(t.id)&&!t.alive&&t.peaceTerm!=='annexation'&&!g.state.units.some(u=>u.team===t.id&&u.hp>0)&&!g.state.buildings.some(b=>b.team===t.id&&b.hp>0))?.id;}
export function tickRaiderSettlement(g:Game){
 const camps=g.state.buildings.filter(b=>b.team===3&&b.raiderCamp&&b.hp>0&&g.finished(b));
 if(!camps.length&&!st(g).raiderSettlement)return;
 const s=st(g).raiderSettlement??=(st(g).raiderSettlement={version:1,camps:[],transitions:[]});
 s.camps=s.camps.filter(w=>camps.some(c=>c.id===w.campId));
 for(const camp of camps){
  const e=camp.campEconomy,people=home(g,camp);
  let w=s.camps.find(x=>x.campId===camp.id);
  if(!w){if(s.camps.length>=R.maximumWatched)continue;w={campId:camp.id,quietSeconds:0,lastDepartures:e?.departures??0,lastLost:e?.lost??0,lostSinceWatch:0,bandAtWatch:people.length,lastMeasuredAt:g.state.time};s.camps.push(w);continue;}
  const dt=Math.max(0,g.state.time-w.lastMeasuredAt);w.lastMeasuredAt=g.state.time;
  const departures=e?.departures??0,lost=e?.lost??0;
  if(lost>w.lastLost){w.lostSinceWatch+=lost-w.lastLost;w.quietSeconds=0;}
  if(departures>w.lastDepartures||people.some(away))w.quietSeconds=0;else w.quietSeconds+=dt;
  w.lastDepartures=departures;w.lastLost=lost;
  const beaten=w.bandAtWatch>0&&w.lostSinceWatch>=w.bandAtWatch*R.lossFraction;
  const ready=people.length>=R.minimumResidents&&(w.quietSeconds>=R.quietSeconds||beaten&&w.quietSeconds>=R.lossQuietSeconds)&&campSiteCanFeed(g,camp);
  if(!ready)continue;
  const slot=freeSocietySlot(g);if(slot===undefined)continue;
  settleCamp(g,camp,people,slot,s);
 }
}
function settleCamp(g:Game,camp:Building,people:Unit[],slot:number,s:RaiderSettlementState){
 const raiders=g.tribe(3),tr=g.tribe(slot),all=g.state.units.filter(u=>u.team===3&&u.hp>0).length;
 const share=people.length/Math.max(1,all),goods:Partial<Record<ResKind,number>>={};
 for(const k of ['food','wood','stone','copper','iron'] as ResKind[]){const n=Math.floor((raiders[k]||0)*share);if(n<=0)continue;raiders[k]-=n;goods[k]=n;}
 tr.food=goods.food||0;tr.wood=goods.wood||0;tr.stone=goods.stone||0;tr.copper=goods.copper||0;tr.iron=goods.iron||0;tr.foodLots=undefined;
 tr.alive=true;tr.hostile=false;tr.ally=false;tr.tension=.5;tr.trust=0;tr.aggro=.5;tr.peaceTerm=undefined;tr.tribute=undefined;
 tr.spears=0;tr.bows=0;tr.blades=0;tr.name=prehistoricName(g.state.seed,slot*977+Math.floor(g.state.time)+camp.id);tr.short=tr.name;
 tr.spec='wood';const pick=(CITY_LEADERS.wood||[])[camp.id%Math.max(1,(CITY_LEADERS.wood||[]).length)];if(pick){tr.leader=pick.name;tr.leaderTitle=pick.title;tr.csType=pick.csType;}
 camp.team=slot;camp.raiderCamp=undefined;camp.campEconomy=undefined;
 const site=g.world.camps.find(c=>c.team===slot);if(site){site.x=camp.x;site.z=camp.z;}
 for(const u of people){g.interruptMission(u);if((u as Unit&{campTrip?:unknown}).campTrip)continue;u.team=slot;u.homeCamp=undefined;u.seaRaid=undefined;u.pillage=-1;u.target=null;u.attackDestination=null;u.order='idle';u.workReason='Former raiders settling down to work the land';}
 g.state.walkDirty=true;
 s.transitions.push({campId:camp.id,team:slot,at:g.state.time,residents:people.length,goods});if(s.transitions.length>R.maximumTransitions)s.transitions.shift();
 recordConflict(g,'raiders_settled',slot,people.length,{targetId:camp.id});
 if(g.visibleAt(camp.x,camp.z))g.banner(`The raider camp has settled down as ${tr.name}.`,6);
}
export function validRaiderSettlementState(state:unknown){
 const s=state as Game['state']&{raiderSettlement?:RaiderSettlementState};if(!s||typeof s!=='object'||!Array.isArray(s.tribes))return false;
 const v=s.raiderSettlement;if(v===undefined)return true;
 const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
 if(!v||v.version!==1||!Array.isArray(v.camps)||!Array.isArray(v.transitions)||v.camps.length>R.maximumWatched||v.transitions.length>R.maximumTransitions)return false;
 const seen=new Set<number>();for(const w of v.camps){if(!w||!id(w.campId)||seen.has(w.campId)||![w.quietSeconds,w.lastDepartures,w.lastLost,w.lostSinceWatch,w.bandAtWatch,w.lastMeasuredAt].every(n=>fin(n)))return false;seen.add(w.campId);}
 for(const t of v.transitions){if(!t||!id(t.campId)||!Number.isInteger(t.team)||t.team<0||t.team>=s.tribes.length||t.team===3||!fin(t.at)||!fin(t.residents,4096)||!t.goods||typeof t.goods!=='object'||Object.values(t.goods).some(n=>!fin(n)))return false;}
 return true;
}
