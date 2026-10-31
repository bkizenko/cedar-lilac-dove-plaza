import type {Game} from './sim';
import type {ResKind,TradeRoute,Unit} from './types';
import {eligibleTradeCarrier,knownSettlement} from './barter';
import {carryingCapacity} from './haulage';
import {equipCaravan,sendTradeEscort} from './caravans';
import {foodDemand,isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
const GOODS=['food','wood','stone','copper','iron'];
export function planCaravan(g:Game,team:number,give:ResKind,get:ResKind,budget:number,minimum:number,size=1,guards=0,transport:'any'|'pack'|'cart'='any'){
 const t=g.tribe(team);
 if(!t?.alive||t.hostile||team===0||team===3||!knownSettlement(g,team)||!GOODS.includes(give)||!GOODS.includes(get)||give===get||
  !Number.isSafeInteger(budget)||budget<size||budget>100||!Number.isSafeInteger(minimum)||minimum<size||minimum>200||
  ![1,2,3].includes(size)||![0,1,2].includes(guards)||!['any','pack','cart'].includes(transport))return false;
 if(g.state.routes.filter(r=>r.caravan).length>=8||g.state.routes.some(r=>r.caravan&&r.team===team&&r.give===give&&r.get===get)){g.banner('This caravan route already exists, or eight routes are planned',4);return false;}
 g.state.routes.push({id:g.id(),team,rival:t.name,give,get,giveAmt:budget,getAmt:minimum,interval:90,t:1,
  caravan:{size,guards,transport,workerIds:[],trips:0,losses:0,received:{},refunded:0}});
 g.banner('Caravan planned. Goods are negotiated at arrival; departures use spare workers and real cargo.',5);return true;
}
function atHome(g:Game,u:Unit){return g.state.buildings.some(b=>b.team===0&&g.finished(b)&&['townhall','warehouse'].includes(b.type)&&Math.hypot(b.x-u.x,b.z-u.z)<24);}
function guardsReady(g:Game){return g.state.units.filter(u=>u.team===0&&u.hp>0&&u.militia&&!u.caravanArmed&&u.enslavedFrom===undefined&&!isDependent(g,u)&&!hasTaskCommitment(u)&&!u.escortId&&!u.emergency&&!u.recalled&&!u.envoy&&!u.scout&&!u.visit&&!u.expedition&&!u.trade&&!u.tributeJourney&&!u.foundingJourney&&u.carry===0&&['idle','hold'].includes(u.order)&&atHome(g,u)&&!g.state.buildings.some(b=>b.team===0&&b.type==='cornerstone'&&g.finished(b)&&Math.hypot(u.x-b.x,u.z-b.z)<32));}
function departure(g:Game,r:TradeRoute){
 const c=r.caravan!,t=g.tribe(r.team);
 if(!t?.alive||t.hostile){r.status='Paused by conflict';return;}
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&(u.type==='worker'||u.caravanArmed)&&!isDependent(g,u));
 const away=adults.filter(u=>u.boat||u.envoy||u.expedition||u.scout||u.visit||u.foundingJourney||u.tradeTeam>0||u.caravanRoute).length;
 if(adults.length-away-c.size<3||away+c.size>Math.max(1,Math.floor(adults.length/4))){r.status='Need spare adults; three workers stay home';return;}
 if(g.tribe(0).food-(r.give==='food'?r.giveAmt:0)<foodDemand(g)*360){r.status='Keeping six minutes of food at home';return;}
 if(!g.canAfford(0,{[r.give]:r.giveAmt})){r.status='Waiting for trade goods';return;}
 const people=g.state.units.filter(u=>eligibleTradeCarrier(g,u,true)&&atHome(g,u)&&(c.transport==='any'||u.haulage===c.transport))
  .sort((a,b)=>carryingCapacity(b,r.give)-carryingCapacity(a,r.give)).slice(0,c.size);
 if(people.length<c.size){r.status=c.transport==='any'?'Waiting for carriers at stores':`Waiting for ${c.size} ${c.transport} carriers at stores`;return;}
 if(guardsReady(g).length<c.guards){r.status=`Waiting for ${c.guards} armed guards at stores`;return;}
 const shares=people.map((u,i)=>({u,budget:Math.floor(r.giveAmt/c.size)+(i<r.giveAmt%c.size?1:0),minimum:Math.floor(r.getAmt/c.size)+(i<r.getAmt%c.size?1:0)}));
 if(shares.some(s=>s.budget>carryingCapacity(s.u,r.give))){r.status='Cargo too heavy — add carriers, pack animals or carts';return;}
 c.workerIds=[];
 for(const s of shares){
  if(!g.dispatchTrade(s.u,{give:r.give,get:r.get,giveAmt:s.budget,getAmt:s.minimum},r.team,false))continue;
  s.u.caravanRoute=r.id;s.u.procurement={minimum:s.minimum};s.u.customOffer=undefined;
  equipCaravan(g,s.u);c.workerIds.push(s.u.id);
 }
 if(!c.workerIds.length){r.status='No route could depart';return;}
 for(let i=0;i<c.guards;i++)sendTradeEscort(g,c.workerIds[0]);
 r.status=`${c.workerIds.length} carriers outbound · ${c.guards} guards`;
}
export function tickCaravanRoutes(g:Game,dt:number){
 for(const r of g.state.routes){
  const c=r.caravan;if(!c)continue;
  if(c.workerIds.length){
   const active=c.workerIds.map(id=>g.state.units.find(u=>u.id===id&&u.hp>0)).filter((u):u is Unit=>!!u&&u.team===0&&u.caravanRoute===r.id);
   if(active.length){r.status=active.some(u=>u.order==='trade')?`${active.length} carriers negotiating or outbound`:`${active.length} carriers returning`;continue;}
   c.losses+=c.workerIds.filter(id=>!g.state.units.some(u=>u.id===id&&u.hp>0&&u.team===0)).length;c.trips++;c.workerIds=[];r.t=r.interval;
  }
  if(r.paused){r.status='Departures paused';continue;}
  r.t=Math.max(0,r.t-dt);if(r.t>0){r.status='Preparing next caravan';continue;}
  departure(g,r);r.t=10;
 }
}
/** Called at an actual unloading frontage, never at the foreign market. */
export function recordCaravanDelivery(g:Game,u:Unit){
 if(u.caravanRoute===undefined)return;
 if(u.team!==0){u.caravanRoute=undefined;return;}
 const r=g.state.routes.find(r=>r.id===u.caravanRoute),c=r?.caravan;
 if(c&&u.carry>0&&u.carryType){
  if(u.carryType===r!.get){c.received[u.carryType]=(c.received[u.carryType]||0)+u.carry;c.lastResult=`Delivered ${Math.floor(u.carry)} ${u.carryType}`;}
  else {c.refunded+=u.carry;c.lastResult='Offer refused or recalled; remaining budget returned';}
 }
 u.caravanRoute=undefined;
}
/** The leading carrier waits; followers keep moving, avoiding mutual waiting. */
export function waitForCaravan(g:Game,u:Unit){
 if(u.caravanRoute===undefined||!['trade','return'].includes(u.order))return false;
 const home=u.order==='trade'?g.campOf(u.tradeTeam):g.campOf(0);
 const peers=g.state.units.filter(p=>p.hp>0&&p.caravanRoute===u.caravanRoute&&p.order===u.order);
 const leader=peers.reduce((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)<=Math.hypot(b.x-home.x,b.z-home.z)?a:b,u);
 if(leader!==u||!peers.some(p=>Math.hypot(p.x-u.x,p.z-u.z)>18&&Math.hypot(p.x-u.x,p.z-u.z)<90))return false;
 u.workReason='Regrouping with the caravan';u.vx=0;u.vz=0;return true;
}
