import type {Game} from './sim';
import type {GameState,Unit} from './types';
import type {JobCoordinator} from './jobCoordinator';
import {workRuntime,peekWorkRuntime} from './workRuntime';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {knownDiplomaticRelation} from './diplomaticKnowledge';
import {methodRecords,depositMethodRecord,type MethodRecord} from './methodRecords';
import {appendMethodRecordAcquisition,METHOD_RECORD_TRADE_PRICE_WOOD} from './methodRecordAcquisition';
import {sameCargoCache} from './farmToolCargo';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';

export type MethodRecordTradeOrder={recordId:number;sellerTeam:number;priceWood:number;startedAt:number;phase:'loading'|'outbound'|'returning'};
type Trader=Unit&{methodRecordTrade?:MethodRecordTradeOrder};
export const METHOD_RECORD_TRADE_RULES={priceWood:METHOD_RECORD_TRADE_PRICE_WOOD,maximumActive:8,journeySeconds:900,stockLimit:1e12,tolerance:1e-8} as const;
const order=(u:Unit)=>(u as Trader).methodRecordTrade;
const key=(u:Unit)=>`method-record-trade:${u.id}`;
const assetKey=(id:number)=>`method-record:${id}:pickup`;
const record=(g:Game,id:number)=>methodRecords(g).find(r=>r.id===id);
const active=(p:{phase:string})=>!['complete','lost'].includes(p.phase);
function busyRecord(g:Game,r:MethodRecord){return g.state.production?.projects.some(p=>active(p)&&(p.methodRecordAssetId===r.id||p.methodRecordWork&&p.methodRecordWork.kind!=='author'&&p.methodRecordWork.recordId===r.id))??false;}
function sellerCache(g:Game,r:MethodRecord){if(r.holder.kind!=='cache')return null;const h=r.holder;return supplyDrops(g,r.team).find(d=>sameCargoCache(h,d))??null;}
function peaceful(g:Game,team:number){const t=g.state.tribes.find(t=>t.id===team);return team>0&&team!==3&&!!t?.alive&&knownDiplomaticRelation(g,team).known&&!g.isFoe(0,team);}
function reserved(g:Game,r:MethodRecord,except?:Unit){return g.state.units.some(u=>u!==except&&(u.methodRecordPickupId===r.id||order(u)?.recordId===r.id))||(peekWorkRuntime(g)?.reservations.used(assetKey(r.id),except?key(except):undefined)??0)>0;}
function eligibleRecord(g:Game,r:MethodRecord,except?:Unit){return peaceful(g,r.team)&&!!sellerCache(g,r)&&!busyRecord(g,r)&&!reserved(g,r,except);}
/** Only actual currently seen peaceful stores advertise a concrete available
 * example. Reading offers never initializes stock, advances AI or reveals a site. */
export function methodRecordTradeOffers(g:Game){return methodRecords(g).filter(r=>g.visibleAt(r.holder.x,r.holder.z)&&eligibleRecord(g,r)).map(r=>({recordId:r.id,sellerTeam:r.team,sellerName:g.tribe(r.team).name,recipe:r.source.recipe,makerName:r.source.makerName,priceWood:METHOD_RECORD_TRADE_RULES.priceWood}));}
function conflicting(u:Unit,w?:MethodRecordTradeOrder){if(!w)return hasTaskCommitment(u);const copy={...u} as Trader;delete copy.methodRecordTrade;if(w.phase==='returning'&&copy.methodRecordCargoId===w.recordId)delete copy.methodRecordCargoId;return hasTaskCommitment(copy);}
function free(g:Game,u:Unit){return u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&u.enslavedFrom===undefined&&!isDependent(g,u)&&!u.boat&&!u.haulage&&!u.expedition&&!u.visit&&!u.envoy&&!u.scout&&!u.trade&&!u.tributeJourney&&!u.foundingJourney&&!u.recalled&&!u.emergency&&!u.buildOrder&&u.escortId===undefined&&!u.conflictIntent&&u.drill==null&&!u.resting&&!u.shelterId&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!conflicting(u)&&(!u.jobLock||u.order==='hold')&&['idle','hold','gather'].includes(u.order)&&!peekWorkRuntime(g)?.activeJob(u.id);}
function home(g:Game,u:Unit){return supplyDrops(g,u.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).filter((v):v is {drop:typeof v.drop;spot:{x:number;z:number}}=>!!v.spot).sort((a,b)=>Math.hypot(a.spot.x-u.x,a.spot.z-u.z)-Math.hypot(b.spot.x-u.x,b.spot.z-u.z))[0]??null;}
function own(g:Game,u:Unit,w:MethodRecordTradeOrder,provided?:JobCoordinator){const jobs=provided??workRuntime(g),id=key(u),current=jobs.activeJob(u.id);if(current&&current.id!==id)return false;if(current?.id===id)return true;const old=jobs.job(id);if(old&&['completed','canceled'].includes(old.phase))jobs.forget(id);if(!jobs.job(id))jobs.propose({id,kind:'method-record-trade',owner:u.team,actors:[u.id],target:w.recordId});if(jobs.reserve(id,[{key:assetKey(w.recordId),amount:1,capacity:1}]))return true;jobs.finish(id,true);jobs.forget(id);return false;}
function release(g:Game,u:Unit,completed=false){const jobs=workRuntime(g);jobs.finish(key(u),!completed);jobs.forget(key(u));}
/** Interruption never refunds from afar. The actual remaining payment/record
 * stays on this person; a normal return can carry it back, or a new direct order
 * can take the same body elsewhere. Existing death handlers own dropped goods. */
export function cancelMethodRecordTrade(g:Game,u:Unit,reason='Record purchase cancelled; retained goods return physically'){
 if(!order(u))return false;delete (u as Trader).methodRecordTrade;release(g,u);
 u.node=null;u.target=null;u.order='hold';u.workReason=reason;
 if(u.hp>0&&u.team===0&&(u.carry>0||u.methodRecordCargoId!==undefined)){u.recalled=true;u.stationOnArrival=false;u.order='return';}
 g.invalidateRoute(u);return true;
}
export function beginMethodRecordTrade(g:Game,recordId:number,unitId?:number){
 const no=(reason:string)=>({accepted:false,reason}),r=record(g,recordId);
 if(!r||!g.visibleAt(r.holder.x,r.holder.z)||!eligibleRecord(g,r))return no('Meet a known peaceful community with this visible uncommitted record at its actual store');
 if(g.state.units.filter(u=>order(u)).length>=METHOD_RECORD_TRADE_RULES.maximumActive)return no('Finish one of the current record purchases first');
 if(g.tribe(0).wood<METHOD_RECORD_TRADE_RULES.priceWood)return no('Need four logs at the home cache; payment loads only at actual contact');
 const drop=sellerCache(g,r)!;
 const u=g.state.units.filter(u=>(unitId===undefined||u.id===unitId)&&free(g,u)).sort((a,b)=>Number(b.selected)-Number(a.selected)||Math.hypot(a.x-drop.x,a.z-drop.z)-Math.hypot(b.x-drop.x,b.z-drop.z)).find(u=>!!home(g,u)&&!!supplyApproach(g,u,drop));
 if(!u)return no('Need a free civilian adult on foot with routes to the home cache and seller');
 const w:MethodRecordTradeOrder={recordId,sellerTeam:r.team,priceWood:METHOD_RECORD_TRADE_RULES.priceWood,startedAt:g.state.time,phase:'loading'};
 // All state/cargo/route/asset admission precedes interruption. No paid job is
 // paused or actor stolen merely because a proposed purchase was refused.
 if(!own(g,u,w))return no('The resident or physical record is already reserved');
 g.interruptMission(u);(u as Trader).methodRecordTrade=w;u.jobLock=false;u.order='hold';u.node=null;u.target=null;u.workReason='Walking to the home cache to collect the agreed four logs';g.invalidateRoute(u);return {accepted:true,reason:'Record purchase arranged; actual payment loads at home, then this person walks to the seller'};
}
function fail(g:Game,u:Unit,reason:string){cancelMethodRecordTrade(g,u,reason);return true;}
export function methodRecordTradeAI(g:Game,u:Unit,dt:number){
 const w=order(u);if(!w)return false;
 if(u.team!==0||u.hp<=0||u.prisoner||u.enslavedFrom!==undefined||u.emergency||u.boat||u.haulage||conflicting(u,w))return fail(g,u,'Record purchase ended because the resident’s duty or custody changed; actual goods remain with their holder');
 const r=record(g,w.recordId);if(!r)return fail(g,u,'The offered record is no longer available; remaining carried payment returns home');
 if(!own(g,u,w))return fail(g,u,'Record purchase reservation could not be retained; actual goods stay carried');
 if(w.phase==='returning'){
  if(r.team!==u.team||r.holder.kind!=='carrier'||r.holder.unitId!==u.id||u.methodRecordCargoId!==r.id)return fail(g,u,'Purchased record custody changed; no replacement is created');
  const h=home(g,u);if(!h){u.workReason='Purchased record waits for a reachable owned cache';return true;}
  u.tx=h.spot.x;u.tz=h.spot.z;u.order='hold';u.workReason='Bringing the same purchased method record home before study';
  if(supplyReached(g,u,h.drop,h.spot)){if(!depositMethodRecord(g,u)){u.workReason='The purchased record still needs actual cache contact';return true;}delete (u as Trader).methodRecordTrade;release(g,u,true);u.order='hold';u.workReason='Purchased method record delivered; study and useful replication remain paid work';g.invalidateRoute(u);}else g.steer(u,dt);return true;
 }
 if(g.state.time-w.startedAt>METHOD_RECORD_TRADE_RULES.journeySeconds)return fail(g,u,'Record purchase timed out; actual unspent goods return physically');
 if(r.team!==w.sellerTeam||!eligibleRecord(g,r,u))return fail(g,u,'The seller, peace or offered record changed; actual unspent goods return physically');
 const seller=sellerCache(g,r);if(!seller)return fail(g,u,'The original offered record has left its store; no remote payment is made');
 if(w.phase==='loading'){
  if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0))return fail(g,u,'Unexpected cargo retained; no second payment was loaded');
  const h=home(g,u);if(!h){u.workReason='Purchase waits for a reachable home cache; nothing paid';return true;}
  u.tx=h.spot.x;u.tz=h.spot.z;u.order='hold';u.workReason='Collecting four real logs at the home cache';
  if(!supplyReached(g,u,h.drop,h.spot)){g.steer(u,dt);return true;}
  const t=g.tribe(u.team);if(t.wood<w.priceWood)return fail(g,u,'Home no longer has the agreed logs; nothing was loaded');
  t.wood-=w.priceWood;u.carryType='wood';u.carryFood=undefined;u.carry=w.priceWood;w.phase='outbound';g.invalidateRoute(u);return true;
 }
 if(u.carryType!=='wood'||Math.abs(u.carry-w.priceWood)>METHOD_RECORD_TRADE_RULES.tolerance)return fail(g,u,'The agreed carried payment is incomplete; only actual remaining cargo returns');
 const spot=supplyApproach(g,u,seller);if(!spot){u.workReason='Payment remains carried while a physical seller route is blocked';return true;}
 u.tx=spot.x;u.tz=spot.z;u.order='hold';u.workReason='Carrying agreed logs to the actual record’s peaceful store';
 if(!supplyReached(g,u,seller,spot)){g.steer(u,dt);return true;}
 const t=g.tribe(w.sellerTeam);if(!Number.isFinite(t.wood)||t.wood>METHOD_RECORD_TRADE_RULES.stockLimit-w.priceWood)return fail(g,u,'Seller storage cannot receive this payment; no goods were exchanged');
 // One synchronous contact transaction. Identity/source are never cloned or
 // rewritten; payment is not a lesson and grants no technique or age.
 t.wood+=w.priceWood;u.carry=0;u.carryType=null;u.carryFood=undefined;
 appendMethodRecordAcquisition(r,{kind:'traded',fromTeam:w.sellerTeam,toTeam:u.team,at:g.state.time,by:u.id,payment:{kind:'wood',amount:w.priceWood}});
 r.team=u.team;r.holder={kind:'carrier',unitId:u.id,x:u.x,z:u.z};u.methodRecordCargoId=r.id;w.phase='returning';g.invalidateRoute(u);return true;
}
export function reconcileMethodRecordTrades(g:Game){for(const u of g.state.units){const w=order(u);if(!w)continue;const r=record(g,w.recordId);if(u.hp<=0||u.team!==0||u.prisoner||u.emergency||!r||w.phase!=='returning'&&(r.team!==w.sellerTeam||!peaceful(g,w.sellerTeam)||r.holder.kind!=='cache'||busyRecord(g,r)))cancelMethodRecordTrade(g,u,'Record purchase stopped after custody, record or diplomatic change; finite goods remain physical');}}
export function rebuildMethodRecordTradeOwnership(g:Game,jobs:JobCoordinator){for(const u of g.state.units){const w=order(u);if(w&&(u.hp<=0||u.team!==0||conflicting(u,w)||!record(g,w.recordId)||!own(g,u,w,jobs))){delete (u as Trader).methodRecordTrade;jobs.finish(key(u),true);jobs.forget(key(u));u.workReason='Record purchase stopped; original cargo and record custody retained';}}}
export function validMethodRecordTrades(s:GameState){
 const targets=new Set<number>();let count=0;
 for(const body of s.units){const u=body as Trader,w=order(u);if(w===undefined)continue;count++;
  if(!w||typeof w!=='object'||Array.isArray(w)||Object.keys(w).some(k=>!['recordId','sellerTeam','priceWood','startedAt','phase'].includes(k))||!Number.isSafeInteger(w.recordId)||w.recordId<1||w.recordId>=s.nextId||targets.has(w.recordId)||!s.methodRecords?.records.some(r=>r.id===w.recordId)||u.team!==0||!Number.isSafeInteger(w.sellerTeam)||w.sellerTeam<=0||w.sellerTeam===3||!s.tribes.some(t=>t.id===w.sellerTeam)||w.priceWood!==METHOD_RECORD_TRADE_RULES.priceWood||!Number.isFinite(w.startedAt)||w.startedAt<0||w.startedAt>s.time||!['loading','outbound','returning'].includes(w.phase)||conflicting(u,w))return false;
  targets.add(w.recordId);
 }
 return count<=METHOD_RECORD_TRADE_RULES.maximumActive;
}
