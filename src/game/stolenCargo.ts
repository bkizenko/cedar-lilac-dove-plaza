import {withdrawCarriedFood,receiveCarriedFood} from './tradeFood';
import type {Game} from './sim';
import {noteRaidDefenseRecovery} from './warPrestige';
import type {FoodKind,GameState,ResKind,Unit} from './types';
import type {ItemKind} from './production';
import {GATHER} from './constants';
import {FOOD_KINDS} from './foodKinds';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {receiveFood} from './pantry';
import {recordSimulationEvent} from './simulationEvents';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {connectedForUnit} from './waterTravel';

/** Dropped cargo: finite parcels left where a carrier died.
 * Conservation rules:
 *  - a parcel is created ONLY by moving the exact `carry` of a dead carrier into it;
 *  - a pickup moves exactly min(parcel, carry capacity) from the parcel into a living
 *    unit's hands; the parcel is deleted at zero; nothing else creates or removes goods;
 *  - a deposit moves a unit's hands into the depositing team's stock through the same
 *    path as ordinary hauling.
 * The original owner is remembered by a `CargoMark` written where goods are stolen
 * (raiders) or picked up from a parcel; unmarked goods belong to the carrier's team. */
export const STOLEN_CARGO_RULES={version:1,scanSeconds:3,ownerRecoveryMeters:70,ownerHomeMeters:160,finderMeters:18,finderGraceSeconds:240,
 pickupMeters:1.8,walkSeconds:240,returnSeconds:240,maximumTrips:12,maximumParcels:64,maximumMarks:64,maximumRest:32,
 healthFraction:.6,mergeMeters:2.5,chaseDispatchMeters:30,chaseSeconds:40,chaseDistanceMeters:60,chaseMaximumPerRaider:3,chaseQuitHealthFraction:.45,restSeconds:120,
 maximumDelivered:1e9} as const;
export const STOLEN_CARGO_REASONS=['parcel-cap','mark-cap','no-owner-adult','too-far','unreachable','no-cache','claimed','not-eligible','busy','walk-timeout','return-timeout','parcel-gone','carry-full',
 'pursuit-time','pursuit-distance','pursuit-hurt','pursuit-ended','claimant-lost'] as const;
export type StolenCargoReason=typeof STOLEN_CARGO_REASONS[number];
/** Bulk trade goods carried in a trade carrier's itemCargo also become parcels on that carrier's death. */
export const PARCEL_ITEMS:ItemKind[]=['cordage','basket','pottery','cloth','leather','skinClothes','hideCoat','woolCloth','woolCoat','copperOre','copperMetal','ironOre','ironBloom','ironMetal'];
export type ParcelKind=ResKind|ItemKind;
const isItem=(k:ParcelKind):k is ItemKind=>(PARCEL_ITEMS as string[]).includes(k);
const heldItems=(u:Unit)=>PARCEL_ITEMS.filter(k=>(u.itemCargo?.[k]||0)>0);
const holds=(u:Unit)=>u.carry>0||heldItems(u).length>0;
export type DroppedParcel={raidBandId?:number;id:number;kind:ParcelKind;amount:number;food?:FoodKind;x:number;z:number;originalOwnerTeam:number;fromTeam:number;droppedAt:number;claimedBy?:number;lastReason?:StolenCargoReason};
/** Whose goods a unit is currently holding (only written when that differs from the unit's own team). */
export type CargoMark={unitId:number;owner:number;raidBandId?:number};
export type CargoTripPhase='chase'|'walk'|'return';
export type CargoTrip={unitId:number;team:number;phase:CargoTripPhase;startedAt:number;deadline:number;originX:number;originZ:number;parcelId?:number;raiderId?:number;owner:number;finder:boolean};
export type DroppedCargoState={version:1;parcels:DroppedParcel[];marks:CargoMark[];trips:CargoTrip[];rest:{unitId:number;until:number}[];
 reasons:Partial<Record<StolenCargoReason,number>>;ledger:{dropped:number;pickedUp:number;deposited:number;depositedByOwner:number;depositedByFinder:number};nextScanAt:number};
type Point={x:number;z:number};
const R=STOLEN_CARGO_RULES;
const KINDS:ParcelKind[]=['food','wood','stone','copper','iron',...PARCEL_ITEMS];

function root(g:Game){return g.state.droppedCargo??={version:1,parcels:[],marks:[],trips:[],rest:[],reasons:{},ledger:{dropped:0,pickedUp:0,deposited:0,depositedByOwner:0,depositedByFinder:0},nextScanAt:0};}
function note(g:Game,reason:StolenCargoReason,parcel?:DroppedParcel){const s=root(g);s.reasons[reason]=(s.reasons[reason]||0)+1;if(parcel)parcel.lastReason=reason;}
const unitOf=(g:Game,id:number)=>g.state.units.find(u=>u.id===id);
const capacity=(kind:ParcelKind)=>isItem(kind)?8:GATHER[kind].carry;
const tripOf=(g:Game,id:number)=>g.state.droppedCargo?.trips.find(t=>t.unitId===id);
const markOf=(g:Game,id:number)=>g.state.droppedCargo?.marks.find(m=>m.unitId===id);
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Record that `thief` now holds goods taken from `owner`. Called where raiders take goods. */
/** Returns false when provenance could not be recorded (mark cap full); callers must not move goods then. */
export function stolenMarkRoom(g:Game,thief:Unit){const s=g.state.droppedCargo;return !s||s.marks.some(m=>m.unitId===thief.id)||s.marks.filter(m=>{const u=g.state.units.find(x=>x.id===m.unitId);return !!u&&(u.hp>0||cargoBodyMustRemain(u))&&holds(u);}).length<R.maximumMarks;}
export function markStolenLoad(g:Game,thief:Unit,owner:number,raidBandId?:number){
 if(owner===thief.team&&raidBandId===undefined||!holds(thief))return true;
 const s=root(g);const m=s.marks.find(m=>m.unitId===thief.id);
 if(m){m.owner=owner;m.raidBandId=raidBandId;return true;}
 // Make room only by pruning marks whose holder no longer carries anything; never evict a live owner mark.
 if(s.marks.length>=R.maximumMarks)s.marks=s.marks.filter(x=>{const u=g.state.units.find(y=>y.id===x.unitId);return !!u&&(u.hp>0||cargoBodyMustRemain(u))&&holds(u);});
 if(s.marks.length>=R.maximumMarks){note(g,'mark-cap');return false;}
 s.marks.push({unitId:thief.id,owner,...(raidBandId===undefined?{}:{raidBandId})});return true;
}
/** Who owns the goods this unit holds right now. */
export function cargoOwner(g:Game,u:Unit){return markOf(g,u.id)?.owner??u.team;}
/** Interruption seam: a direct order or new duty ends this person's recovery trip and releases its parcel claim only. */
export function cancelCargoTrip(g:Game,u:Unit){const t=tripOf(g,u.id);if(!t)return false;endTrip(g,t,'busy');return true;}
export function droppedParcels(g:Game){return g.state.droppedCargo?.parcels??[];}

/** Transfer only actual packet goods to a local finite parcel. At a full table
 * the unaccepted remainder stays on its physical body for a later retry. */
export function dropFoodUnits(g:Game,u:Unit,food:FoodKind,units:number,originalOwnerTeam=u.team){
 if(u.hp>0||!Number.isFinite(units)||units<=0)return 0;
 const raidBandId=markOf(g,u.id)?.raidBandId;
 const s=root(g),near=s.parcels.find(p=>p.claimedBy===undefined&&p.kind==='food'&&p.food===food&&p.originalOwnerTeam===originalOwnerTeam&&p.raidBandId===raidBandId&&distance(p,u)<=R.mergeMeters);
 if(!near&&s.parcels.length>=R.maximumParcels){note(g,'parcel-cap');return 0;}
 if(near)near.amount+=units;else s.parcels.push({id:g.id(),kind:'food',food,amount:units,x:u.x,z:u.z,originalOwnerTeam,fromTeam:u.team,droppedAt:g.state.time,...(raidBandId===undefined?{}:{raidBandId})});
 s.ledger.dropped+=units;return units;
}
function dropExpeditionFood(g:Game,u:Unit){
 const e=u.expedition;if(!e||u.hp>0)return;
 if(e.foodCustody){
  const p=e.foodCustody;const legacy=dropFoodUnits(g,u,'provisions',p.legacyUnits);p.legacyUnits-=legacy;e.food-=legacy;
  for(const lot of p.lots){const dropped=dropFoodUnits(g,u,lot.kind,lot.units);lot.units-=dropped;e.food-=dropped;}
  p.lots=p.lots.filter(l=>l.units>1e-10);
 }else e.food-=dropFoodUnits(g,u,'provisions',e.food);
 if(e.food<1e-9)delete u.expedition;
}
// ---- Creation: only from a dead carrier's exact hands.
function dropFrom(g:Game,u:Unit){
 const kind=u.carryType;if(!kind||!(u.carry>0)||!Number.isFinite(u.carry))return;
 if(kind==='food'&&u.carryFoodLots){const owner=cargoOwner(g,u);for(const food of FOOD_KINDS){const units=u.carryFoodLots?.[food]||0;if(!units)continue;const dropped=dropFoodUnits(g,u,food,units,owner);if(dropped>0)withdrawCarriedFood(u,dropped,food);}return;}
 const s=root(g),owner=cargoOwner(g,u),amount=u.carry,food=kind==='food'?u.carryFood:undefined,raidBandId=markOf(g,u.id)?.raidBandId;
 const near=s.parcels.find(p=>p.claimedBy===undefined&&p.kind===kind&&p.food===food&&p.originalOwnerTeam===owner&&p.raidBandId===raidBandId&&distance(p,u)<=R.mergeMeters);
 // Only a LOCAL merge or a free parcel slot may take the goods. When the cap is full the exact goods
 // stay on the body (no teleporting into a distant parcel, no 65th entry); the next tick retries.
 if(!near&&s.parcels.length>=R.maximumParcels){note(g,'parcel-cap');return;}
 u.carry=0;u.carryType=null;u.carryFood=undefined;
 s.ledger.dropped+=amount;
 if(near){near.amount+=amount;return;}
 s.parcels.push({id:g.id(),kind,amount,...(food?{food}:{}),...(raidBandId===undefined?{}:{raidBandId}),x:u.x,z:u.z,originalOwnerTeam:owner,fromTeam:u.team,droppedAt:g.state.time});
}

/** Dead trade cargo and ordinary mined ore leave actual finite item parcels. */
export function dropTradeCargoItems(g:Game,u:Unit){
 if(u.hp>0||u.tradeNeedsId===undefined&&!u.tradeCargoPending&&!(u.itemCargo?.copperOre||u.itemCargo?.copperMetal||u.itemCargo?.ironOre||u.itemCargo?.ironBloom||u.itemCargo?.ironMetal))return;// other itemCargo (fibre, sheaves…) keeps its owner's existing loss accounting
 const s=root(g),owner=cargoOwner(g,u);
 for(const kind of heldItems(u)){const amount=u.itemCargo![kind]!;
  const near=s.parcels.find(p=>p.claimedBy===undefined&&p.kind===kind&&p.originalOwnerTeam===owner&&distance(p,u)<=R.mergeMeters);
  if(!near&&s.parcels.length>=R.maximumParcels){note(g,'parcel-cap');continue;}
  delete u.itemCargo![kind];s.ledger.dropped+=amount;
  if(near)near.amount+=amount;else s.parcels.push({id:g.id(),kind,amount,x:u.x,z:u.z,originalOwnerTeam:owner,fromTeam:u.team,droppedAt:g.state.time});}
 if(!Object.values(u.itemCargo||{}).some(n=>(n||0)>0))u.itemCargo=undefined;
 if(heldItems(u).length)u.tradeCargoPending=true;else delete u.tradeCargoPending;
}
/** Bounded parcel tables leave undropped goods at the actual death site until room exists. */
export function cargoBodyMustRemain(u:Unit){return u.hp<=0&&(!!u.tradeCargoPending||u.carry>0&&!!u.carryType||(u.expedition?.food??0)>0||Object.values(u.packJourneySupplies?.feed??{}).some(n=>(n??0)>0));}
/** Explicit legacy-save migration: existing trips acquire their own reservation, never a new trip. */
export function restoreCargoRecoveryCommitments(s:GameState){for(const t of s.droppedCargo?.trips||[]){const u=s.units.find(u=>u.id===t.unitId);if(u&&u.cargoRecoveryId===undefined)u.cargoRecoveryId=u.id;}}
// ---- Eligibility for physical recovery.
function freeAdult(g:Game,u:Unit){
 return u.type==='worker'&&u.team!==3&&u.hp>=u.maxHp*R.healthFraction&&!isDependent(g,u)&&!u.prisoner&&!u.militia&&!u.boat&&!u.jobLock&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&
  !u.emergency&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.trade&&!u.tributeJourney&&!u.foundingJourney&&!u.recalled&&!u.buildOrder&&u.escortId===undefined&&
  !u.societyMissionId&&!u.seaExplorationId&&!u.scoutProvisions&&!u.haulage&&u.drill==null&&!u.conflictIntent&&u.massRaidTarget===undefined&&u.pillage<0&&
  !hasTaskCommitment(u)&&['idle','hold','gather'].includes(u.order);
}
const resting=(g:Game,id:number)=>!!g.state.droppedCargo?.rest.some(r=>r.unitId===id&&r.until>g.state.time);
function candidate(g:Game,u:Unit){return freeAdult(g,u)&&!tripOf(g,u.id)&&!resting(g,u.id);}

function releaseClaim(g:Game,trip:CargoTrip){
 const p=trip.parcelId===undefined?undefined:root(g).parcels.find(p=>p.id===trip.parcelId);
 if(p&&p.claimedBy===trip.unitId)delete p.claimedBy;
}
function endTrip(g:Game,trip:CargoTrip,reason?:StolenCargoReason,restSeconds=0){
 const s=root(g);releaseClaim(g,trip);
 const i=s.trips.indexOf(trip);if(i>=0)s.trips.splice(i,1);
 const u=unitOf(g,trip.unitId);
 if(u?.cargoRecoveryId===trip.unitId)delete u.cargoRecoveryId;
 if(reason)note(g,reason,trip.parcelId===undefined?undefined:s.parcels.find(p=>p.id===trip.parcelId));
 if(restSeconds>0){s.rest=s.rest.filter(r=>r.unitId!==trip.unitId&&r.until>g.state.time);if(s.rest.length<R.maximumRest)s.rest.push({unitId:trip.unitId,until:g.state.time+restSeconds});}
 // A trip pre-empted by another duty must not overwrite that duty's order/route.
 if(u&&u.hp>0&&reason!=='busy'){u.order=holds(u)?'return':'idle';u.target=null;u.node=null;u.workReason=holds(u)?'Carrying recovered goods home':'';g.invalidateRoute(u);u.stuckT=0;}
}
function begin(g:Game,u:Unit,trip:Omit<CargoTrip,'unitId'|'team'|'startedAt'|'originX'|'originZ'>){
 const s=root(g);if(s.trips.length>=R.maximumTrips)return false;
 g.interruptMission(u);u.cargoRecoveryId=u.id;u.target=null;u.node=null;u.order='move';u.stationOnArrival=false;
 s.trips.push({...trip,unitId:u.id,team:u.team,startedAt:g.state.time,originX:u.x,originZ:u.z});return true;
}
/** Claim one parcel for one unit; refuses if another unit already holds the claim. */
export function claimParcel(g:Game,u:Unit,parcelId:number){
 const s=root(g),p=s.parcels.find(p=>p.id===parcelId);if(!p||!(p.amount>0))return false;
 if(p.claimedBy!==undefined&&unitOf(g,p.claimedBy)?.hp){note(g,'claimed',p);return false;}
 if(!candidate(g,u)){note(g,'not-eligible',p);return false;}
 const finder=u.team!==p.originalOwnerTeam;
 if(!connectedForUnit(g,u,p.x,p.z)){note(g,'unreachable',p);return false;}
 if(!begin(g,u,{phase:'walk',deadline:g.state.time+R.walkSeconds,parcelId:p.id,owner:p.originalOwnerTeam,finder}))return false;
 p.claimedBy=u.id;u.workReason=finder?'Picking up goods left on the ground':'Fetching our goods left where a carrier fell';return true;
}

// ---- Dispatch (bounded scan on a fixed cadence).
function dispatch(g:Game){
 const s=root(g);
 for(const p of [...s.parcels].sort((a,b)=>a.id-b.id)){
  if(p.claimedBy!==undefined)continue;
  const owner=g.tribe(p.originalOwnerTeam),home=owner?.alive?supplyDrops(g,p.originalOwnerTeam)[0]:undefined;
  let best:Unit|undefined,bestD=Infinity,sawOwner=false;
  for(const u of g.state.units){
   if(u.hp<=0||!candidate(g,u))continue;
   const d=distance(u,p);
   if(u.team===p.originalOwnerTeam){
    sawOwner=true;
    if(d>R.ownerRecoveryMeters)continue;
    if(home&&distance(home,p)>R.ownerHomeMeters)continue;
   }else{
    if(g.state.time-p.droppedAt<R.finderGraceSeconds||d>R.finderMeters)continue;
    if(!supplyDrops(g,u.team).length)continue;
   }
   // The owner is always preferred over a finder at similar distance.
   const rank=d+(u.team===p.originalOwnerTeam?0:40);
   if(rank<bestD){best=u;bestD=rank;}
  }
  if(!best){if(!sawOwner)note(g,'no-owner-adult',p);else note(g,'too-far',p);continue;}
  claimParcel(g,best,p.id);
 }
 // Bounded pursuit: owner adults near a living carrier of their goods.
 for(const m of s.marks){
  const raider=unitOf(g,m.unitId);if(!raider||raider.hp<=0||!holds(raider))continue;
  const chasers=s.trips.filter(t=>t.phase==='chase'&&t.raiderId===raider.id).length;
  if(chasers>=R.chaseMaximumPerRaider)continue;
  const near=g.state.units.filter(u=>u.team===m.owner&&u.hp>0&&candidate(g,u)&&distance(u,raider)<=R.chaseDispatchMeters).sort((a,b)=>distance(a,raider)-distance(b,raider)||a.id-b.id)[0];
  if(!near)continue;
  if(begin(g,near,{phase:'chase',deadline:g.state.time+R.chaseSeconds,raiderId:raider.id,owner:m.owner,finder:false}))near.workReason='Chasing a raider who took our goods';
 }
}

// ---- Per-unit execution. Returns true while this system owns the unit's step.
function stillValid(g:Game,u:Unit,trip:CargoTrip){
 if(u.hp<=0)return 'claimant-lost' as const;
 if(u.prisoner||u.emergency||u.recalled||u.boat||u.societyMissionId||u.seaExplorationId||u.expedition||u.envoy||u.visit||u.trade||u.scout||u.foundingJourney||u.tributeJourney||u.conflictIntent||u.massRaidTarget!==undefined)return 'busy' as const;
 if(u.team!==trip.team||hasTaskCommitment(u,'cargoRecoveryId'))return 'busy' as const;
 return null;
}
function pickUp(g:Game,u:Unit,trip:CargoTrip){
 const s=root(g),p=s.parcels.find(p=>p.id===trip.parcelId);
 if(!p||!(p.amount>0)){endTrip(g,trip,'parcel-gone');return;}
 if(holds(u)){endTrip(g,trip,'carry-full');return;}
 if(p.raidBandId!==undefined&&!stolenMarkRoom(g,u)){endTrip(g,trip,'mark-cap');return;}
 const take=Math.min(p.amount,capacity(p.kind));
 if(isItem(p.kind)){p.amount-=take;u.itemCargo={[p.kind]:take};s.ledger.pickedUp+=take;}
 else{p.amount-=take;u.carry=take;u.carryType=p.kind;u.carryFood=p.food;s.ledger.pickedUp+=take;}
 const owner=p.originalOwnerTeam;
 if(owner!==u.team||p.raidBandId!==undefined){const m=s.marks.find(m=>m.unitId===u.id);if(m){m.owner=owner;m.raidBandId=p.raidBandId;}else if(s.marks.length<R.maximumMarks)s.marks.push({unitId:u.id,owner,...(p.raidBandId===undefined?{}:{raidBandId:p.raidBandId})});}
 delete p.claimedBy;
 if(p.amount<=1e-9){s.parcels.splice(s.parcels.indexOf(p),1);}
 trip.phase='return';trip.parcelId=undefined;trip.deadline=g.state.time+R.returnSeconds;
 u.workReason=trip.finder?'Taking found goods to our cache':'Carrying our recovered goods home';
}
function deposit(g:Game,u:Unit,trip:CargoTrip){
 const s=root(g),item=heldItems(u)[0];
 if(item&&!(u.carry>0)){const amount=u.itemCargo![item]!;const t=g.tribe(u.team),items=t.items??={};if(item==='copperMetal'||item==='ironMetal')t[item==='copperMetal'?'copper':'iron']+=amount;else items[item]=(items[item]||0)+amount;delete u.itemCargo![item];if(!Object.values(u.itemCargo||{}).some(n=>(n||0)>0))u.itemCargo=undefined;s.ledger.deposited+=amount;if(trip.finder)s.ledger.depositedByFinder+=amount;else s.ledger.depositedByOwner+=amount;if(holds(u))return;s.marks=s.marks.filter(m=>m.unitId!==u.id);endTrip(g,trip);return;}
 const kind=u.carryType,amount=u.carry;if(!kind||!(amount>0)){endTrip(g,trip);return;}
 recordSimulationEvent(g,'cargo_delivered',u.team,kind,amount,u.id);
 const provenance=markOf(g,u.id);noteRaidDefenseRecovery(g,provenance?.raidBandId,trip.owner,u.team,amount);
 if(kind==='food')receiveCarriedFood(g,u.team,u);else g.tribe(u.team)[kind]+=amount;
 u.carry=0;u.carryType=null;u.carryFood=undefined;s.ledger.deposited+=amount;
 if(trip.finder)s.ledger.depositedByFinder+=amount;else s.ledger.depositedByOwner+=amount;
 if(holds(u))return;// a robbed load can hold a resource and bulk items: finish the rest at the same cache
 s.marks=s.marks.filter(m=>m.unitId!==u.id);
 endTrip(g,trip);
}
/** A taker (robber) walks stolen goods to a real cache of its own society; the owner's mark and pursuit stay on the load. */
export function beginLootReturn(g:Game,u:Unit,owner:number){
 if(u.hp<=0||!holds(u))return false;const s=root(g);
 if(s.trips.some(t=>t.unitId===u.id)){const t=tripOf(g,u.id)!;if(t.phase==='return'){t.deadline=g.state.time+R.returnSeconds;return true;}return false;}
 if(!begin(g,u,{phase:'return',deadline:g.state.time+R.returnSeconds,owner,finder:true}))return false;
 u.workReason='Carrying taken goods home';return true;
}
function stand(g:Game,u:Unit,trip:CargoTrip,reason:StolenCargoReason){endTrip(g,trip,reason,R.restSeconds);}

export function stolenCargoAI(g:Game,u:Unit,dt:number){
 const s=g.state.droppedCargo;if(!s)return false;
 const trip=s.trips.find(t=>t.unitId===u.id);if(!trip)return false;
 const issue=stillValid(g,u,trip);if(issue){endTrip(g,trip,issue);return false;}
 const now=g.state.time;
 if(trip.phase==='chase'){
  const raider=unitOf(g,trip.raiderId!);
  if(!raider||raider.hp<=0||!holds(raider)||!markOf(g,raider.id)||markOf(g,raider.id)!.owner!==trip.owner){stand(g,u,trip,'pursuit-ended');return false;}
  if(now>trip.deadline){stand(g,u,trip,'pursuit-time');return false;}
  if(distance(u,{x:trip.originX,z:trip.originZ})>R.chaseDistanceMeters){stand(g,u,trip,'pursuit-distance');return false;}
  if(u.hp<u.maxHp*R.chaseQuitHealthFraction){stand(g,u,trip,'pursuit-hurt');return false;}
  u.cd=Math.max(0,u.cd-dt);u.tx=raider.x;u.tz=raider.z;u.order='move';
  const reach=u.range+raider.r+.35;
  if(distance(u,raider)>reach)g.steer(u,dt);
  else{u.facing=Math.atan2(raider.x-u.x,raider.z-u.z);u.stride+=dt*10;if(u.cd<=0){u.cd=u.rof;g.dealDamage(u,raider);}}
  return true;
 }
 if(trip.phase==='walk'){
  const p=s.parcels.find(p=>p.id===trip.parcelId);
  if(!p||!(p.amount>0)||p.claimedBy!==u.id&&p.claimedBy!==undefined){endTrip(g,trip,p?'claimed':'parcel-gone');return false;}
  if(now>trip.deadline){endTrip(g,trip,'walk-timeout');return false;}
  const spot=g.nearestWalk(u,p.x,p.z);u.tx=spot.x;u.tz=spot.z;u.order='move';
  // Possession needs the body within real reach of the parcel itself, not merely a nearby walkable spot.
  if(distance(u,p)<=R.pickupMeters){pickUp(g,u,trip);return true;}
  if(distance(u,spot)<=.6&&distance(spot,p)>R.pickupMeters){endTrip(g,trip,'unreachable');return false;}
  g.steer(u,dt);
  return true;
 }
 // return: walk to a real cache and put the goods into the stock.
 if(now>trip.deadline){endTrip(g,trip,'return-timeout');return false;}
 if(!holds(u)){endTrip(g,trip);return false;}
 let drop,spot:Point|null=null;
 for(const d of [...supplyDrops(g,u.team)].sort((a,b)=>distance(a,u)-distance(b,u))){const p=supplyApproach(g,u,d);if(p){drop=d;spot=p;break;}}
 if(!drop||!spot){endTrip(g,trip,'no-cache');return false;}
 if(supplyReached(g,u,drop,spot)){deposit(g,u,trip);return true;}
 u.tx=spot.x;u.tz=spot.z;u.order='move';
 if(g.steer(u,dt)&&supplyReached(g,u,drop,spot))deposit(g,u,trip);
 return true;
}

// ---- World tick: sweep deaths, prune, and dispatch. Runs inside tickCoastalTrade (both call sites).
export function tickStolenCargo(g:Game,dt:number){
 const s=g.state.droppedCargo;
 if(!s&&!g.state.units.some(u=>u.hp<=0&&((u.expedition?.food??0)>0||Object.values(u.packJourneySupplies?.feed??{}).some(n=>(n??0)>0)||u.carry>0&&u.carryType||(u.tradeNeedsId!==undefined||u.tradeCargoPending||u.itemCargo?.copperOre||u.itemCargo?.copperMetal||u.itemCargo?.ironOre||u.itemCargo?.ironBloom||u.itemCargo?.ironMetal)&&heldItems(u).length)))return;
 for(const u of g.state.units){
  if(u.hp>0||!holds(u)&&!(u.expedition?.food))continue;
  dropTradeCargoItems(g,u);
  const trip=tripOf(g,u.id);dropExpeditionFood(g,u);dropFrom(g,u);
  if(trip)endTrip(g,trip,'claimant-lost');
 }
 const r=root(g);
 for(const t of [...r.trips]){
  const u=unitOf(g,t.unitId);
  if(!u||u.hp<=0){endTrip(g,t,'claimant-lost');continue;}
  // Higher-priority duties (defense emergency, orders) pre-empt the trip before its AI runs; never hold a claim forever.
  const issue=stillValid(g,u,t);
  if(issue){endTrip(g,t,issue);continue;}
  if(g.state.time>t.deadline)endTrip(g,t,t.phase==='chase'?'pursuit-time':t.phase==='walk'?'walk-timeout':'return-timeout',t.phase==='chase'?R.restSeconds:0);
 }
 r.marks=r.marks.filter(m=>{const u=unitOf(g,m.unitId);return !!u&&(u.hp>0||cargoBodyMustRemain(u))&&holds(u);});
 r.rest=r.rest.filter(x=>x.until>g.state.time);
 if(dt<=0)return;
 if(g.state.time<r.nextScanAt)return;
 r.nextScanAt=g.state.time+R.scanSeconds;
 if(r.parcels.length||r.marks.length)dispatch(g);
 // A taker of the player's own society whose walk home was broken by a fight resumes carrying the marked load to a cache.
 for(const m of r.marks){const u=unitOf(g,m.unitId);if(!u||u.hp<=0||u.team!==0||m.owner===0||tripOf(g,u.id)||u.emergency||u.prisoner||u.conflictIntent||!holds(u))continue;if(['idle','hold','return'].includes(u.order))beginLootReturn(g,u,m.owner);}
}

// ---- Persistence validation (runs inside validCoastalTradeState's existing path).
export function validDroppedCargoState(s:GameState){
 const root=s.droppedCargo;
 for(const u of s.units){if(u.cargoRecoveryId!==undefined&&(u.cargoRecoveryId!==u.id||!root?.trips?.some(t=>t.unitId===u.id)))return false;if(u.tradeCargoPending!==undefined&&(u.tradeCargoPending!==true||u.hp>0||!heldItems(u).length))return false;}
 if(root===undefined)return !s.units.some(u=>u.tradeCargoPending);
 const half=(s.worldOptions?.size??1040)/2,fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&(n as number)>0&&(n as number)<s.nextId,
  point=(x:unknown,z:unknown)=>typeof x==='number'&&typeof z==='number'&&Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=half&&Math.abs(z)<=half;
 if(!root||typeof root!=='object'||root.version!==1||!Array.isArray(root.parcels)||!Array.isArray(root.marks)||!Array.isArray(root.trips)||!Array.isArray(root.rest))return false;
 if(root.parcels.length>R.maximumParcels||root.marks.length>R.maximumMarks||root.trips.length>R.maximumTrips||root.rest.length>R.maximumRest||!fin(root.nextScanAt))return false;
 const l=root.ledger;if(!l||typeof l!=='object'||!['dropped','pickedUp','deposited','depositedByOwner','depositedByFinder'].every(k=>fin((l as any)[k],1e12)))return false;
 if(!root.reasons||typeof root.reasons!=='object'||Object.entries(root.reasons).some(([k,n])=>!(STOLEN_CARGO_REASONS as readonly string[]).includes(k)||!fin(n,1e12)))return false;
 const alive=new Map(s.units.map(u=>[u.id,u]));
 const pids=new Set<number>();
 for(const p of root.parcels){
  if(!p||!id(p.id)||pids.has(p.id)||!KINDS.includes(p.kind)||!(typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>0&&p.amount<=1e7)||!point(p.x,p.z)||!s.tribes[p.originalOwnerTeam]||!s.tribes[p.fromTeam]||!fin(p.droppedAt,s.time+1e-6))return false;
  if(p.raidBandId!==undefined&&!id(p.raidBandId))return false;
  if(p.food!==undefined&&(p.kind!=='food'||!FOOD_KINDS.includes(p.food)))return false;
  if(p.lastReason!==undefined&&!(STOLEN_CARGO_REASONS as readonly string[]).includes(p.lastReason))return false;
  if(p.claimedBy!==undefined&&(!id(p.claimedBy)||!alive.has(p.claimedBy)||!root.trips.some((t:CargoTrip)=>t.unitId===p.claimedBy&&t.parcelId===p.id&&t.phase==='walk')))return false;
  pids.add(p.id);
 }
 const mids=new Set<number>();
 for(const m of root.marks){if(!m||!id(m.unitId)||mids.has(m.unitId)||!alive.has(m.unitId)||!s.tribes[m.owner]||m.raidBandId!==undefined&&!id(m.raidBandId))return false;mids.add(m.unitId);}
 const tids=new Set<number>();
 for(const t of root.trips){
  if(!t||!id(t.unitId)||tids.has(t.unitId)||!['chase','walk','return'].includes(t.phase)||!s.tribes[t.team]||!s.tribes[t.owner]||typeof t.finder!=='boolean'||!fin(t.startedAt,s.time+1e-6)||!fin(t.deadline)||!point(t.originX,t.originZ))return false;
  const u=alive.get(t.unitId);if(!u||u.team!==t.team)return false;
  if(t.phase==='walk'&&(t.parcelId===undefined||!pids.has(t.parcelId)))return false;
  if(t.phase==='chase'&&(!id(t.raiderId)||!alive.has(t.raiderId!)))return false;
  if(t.phase==='return'&&t.parcelId!==undefined)return false;
  tids.add(t.unitId);
 }
 for(const r of root.rest)if(!r||!id(r.unitId)||!fin(r.until))return false;
 return true;
}
