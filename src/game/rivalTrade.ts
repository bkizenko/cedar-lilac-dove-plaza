import {equipCaravan} from "./caravans";
import {isRivalTeam} from "./factions";
import type {Game} from './sim';
import type {ResKind,Unit} from './types';
import {AGE_COST} from './constants';
import {foodDemand,isDependent,reserveSeconds} from './settlement';
import {rivalKnows} from './rivalDevelopment';
import {receiveFood} from './pantry';

const goods:ResKind[]=['wood','stone','copper','iron','food'];
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
const usable=(g:Game,team:number,k:ResKind)=>k!=='copper'&&k!=='iron'||g.tribe(team).age>=(k==='copper'?1:2);
export function rivalTradeReserve(g:Game,team:number,k:ResKind){
  if(k==='food')return foodDemand(g,team)*900;
  return Math.max(k==='wood'?48:k==='stone'?24:8,AGE_COST[g.tribe(team).age+1]?.[k]||0);
}
const reviews=new WeakMap<Game,Map<number,number>>();
/** A resident takes an offer to a known community. Its stocks are inspected
 * only on arrival; no purchase or payment occurs across the map. */
export function dispatchRivalBarter(g:Game,team:number){
  if(!isRivalTeam(team)||!g.tribe(team).alive||g.popNow(team)<6||reserveSeconds(g,team)<600)return false;
  let clock=reviews.get(g);if(!clock){clock=new Map();reviews.set(g,clock);}
  const due=clock.get(team)||0;if(due>g.state.time&&due<=g.state.time+120)return false;
  clock.set(team,g.state.time+120);
  if(g.state.units.some(u=>u.team===team&&u.hp>0&&u.visit))return false;
  const t=g.tribe(team);
  const wanted=goods.filter(k=>k!=='food'&&usable(g,team,k)&&t[k]<rivalTradeReserve(g,team,k))
    .sort((a,b)=>(1-t[b]/rivalTradeReserve(g,team,b))-(1-t[a]/rivalTradeReserve(g,team,a)))[0];
  if(!wanted)return false;
  const offered=goods.filter(k=>k!==wanted&&usable(g,team,k)&&t[k]-rivalTradeReserve(g,team,k)>=12)
    .sort((a,b)=>Number(a==='food')-Number(b==='food')||(t[b]-rivalTradeReserve(g,team,b))*worth[b]-(t[a]-rivalTradeReserve(g,team,a))*worth[a])[0];
  if(!offered)return false;
  const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u));
  const workers=adults.filter(u=>u.carry===0&&!u.jobLock&&!u.buildOrder&&!u.tamingWork&&!u.tributeJourney&&!u.visit&&!u.scout&&!u.expedition&&!u.envoy&&!u.emergency&&!u.recalled&&
    !u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&u.drill==null&&['idle','gather'].includes(u.order));
  if(workers.length<4)return false;
  workers.sort((a,b)=>Number(a.order!=='idle')-Number(b.order!=='idle'));
  let u:Unit|undefined;
  let destination:typeof g.state.buildings[number]|undefined;
  for(const candidate of workers){
  const halls=g.state.buildings.filter(b=>isRivalTeam(b.team)&&b.team!==team&&b.type==='townhall'&&g.finished(b)&&
    g.tribe(b.team).alive&&!g.isFoe(team,b.team)&&rivalKnows(g,team,b.x,b.z)&&g.interactionSpot(candidate,b))
    .sort((a,b)=>Math.hypot(candidate.x-a.x,candidate.z-a.z)-Math.hypot(candidate.x-b.x,candidate.z-b.z));
  if(halls.length){u=candidate;destination=halls[0];break;}
  }
  if(!u||!destination)return false;
  const amount=Math.min(32,Math.floor(t[offered]-rivalTradeReserve(g,team,offered)));
  equipCaravan(g,u);
  g.spend(team,{[offered]:amount});u.carry=amount;u.carryType=offered;u.carryFood=offered==='food'?'provisions':undefined;
  u.visit={phase:'outbound',wait:0,team:destination.team,wanted};u.order='move';u.node=null;u.target=null;u.job=null;u.jobLock=false;u.stuckT=0;
  u.tx=destination.x;u.tz=destination.z;u.workReason='Taking surplus to a known village to seek '+wanted;
  return true;
}
/** Execute a finite exchange at the meeting place. Both communities keep their
 * own working/age reserves; unavailable or unattractive offers return intact. */
export function settleRivalBarter(g:Game,u:Unit){
  const m=u.visit,seller=m?.team===undefined?null:g.tribe(m.team),get=m?.wanted,give=u.carryType;
  if(!m||!seller||!get||!give||u.carry<=0||give===get||!seller.alive||g.isFoe(u.team,seller.id))return false;
  const hall=g.state.buildings.find(b=>b.team===seller.id&&b.type==='townhall'&&g.finished(b));
  if(!hall||Math.hypot(u.x-hall.x,u.z-hall.z)>Math.max(hall.w,hall.d)*.55+3||!g.interactionSpot(u,hall))return false;
  if(!usable(g,seller.id,get)||!usable(g,seller.id,give))return false;
  const reserve=rivalTradeReserve(g,seller.id,get),spare=Math.floor(seller[get]-reserve);
  // A village with a glut of the offered material will decline it. A shortage
  // makes the same physical offer worth more, without exposing a remote quote.
  const value=Math.max(.45,Math.min(1.35,rivalTradeReserve(g,seller.id,give)/Math.max(1,seller[give])));
  const amount=Math.min(spare,Math.floor(u.carry*worth[give]/worth[get]*value*.9));
  if(amount<4||seller[give]>rivalTradeReserve(g,seller.id,give)*3)return false;
  g.spend(seller.id,{[get]:amount});
  if(give==='food')receiveFood(g,seller.id,u.carry,u.carryFood);else seller[give]+=u.carry;
  u.carry=amount;u.carryType=get;u.carryFood=get==='food'?'provisions':undefined;
  u.workReason='Bringing bartered '+get+' home';return true;
}
