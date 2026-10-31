import {contactYieldingTo} from './encounters';
import {isSocietyPeaceMessengerFor} from './rivalActivity';
import {missionMayTargetCivilian,occupationProtectsCivilian} from './conflictIntent';
import type {Game} from './sim';
import type {Unit,Building} from './types';
import {UNITS,AGE_STAT} from './constants';
import {supplyDrops,supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import {isDependent} from './settlement';
import {queueStandDown} from './demobilization';

export const DEFENSE_RULES={localMobilizationMetres:70,intrusionMetres:28,reviewSeconds:.5,manualAlarmSeconds:20,healthyFraction:.5,armingDangerMetres:8,shelterArrivalMetres:1,retreatMetres:8,shelterCapacity:{hut:5,townhall:8,keep:12}} as const;

/** Follow the same physical entrance and occupancy contract as ordinary rest.
 * Shelter conceals occupants; its building remains vulnerable to attack. */
function seekEmergencyShelter(g:Game,u:Unit,foes:Unit[],dt:number){
  const occupancy=new Map<number,number>();
  for(const resident of g.state.units)if(resident!==u&&resident.hp>0&&resident.shelterId!==undefined)
    occupancy.set(resident.shelterId,(occupancy.get(resident.shelterId)||0)+1);
  const shelters=g.state.buildings.filter(b=>b.team===u.team&&g.finished(b)&&
    b.type in DEFENSE_RULES.shelterCapacity&&(occupancy.get(b.id)||0)<DEFENSE_RULES.shelterCapacity[b.type as keyof typeof DEFENSE_RULES.shelterCapacity]);
  const danger=(x:number,z:number)=>foes.reduce((sum,e)=>sum+Math.max(0,25-Math.hypot(x-e.x,z-e.z))*4,0);
  shelters.sort((a,b)=>danger(a.x,a.z)+Math.hypot(a.x-u.x,a.z-u.z)-danger(b.x,b.z)-Math.hypot(b.x-u.x,b.z-u.z));
  for(const shelter of shelters){
    const entrance=g.interactionSpot(u,shelter);if(!entrance)continue;
    u.target=null;u.tx=entrance.x;u.tz=entrance.z;
    if(Math.hypot(u.x-entrance.x,u.z-entrance.z)>DEFENSE_RULES.shelterArrivalMetres){
      u.order='move';u.workReason='Seeking shelter from invaders';g.steer(u,dt);
    }else{
      u.shelterId=shelter.id;u.order='hold';u.workReason='Sheltering inside from invaders';
      // Existing pursuers must lose concealed targets, just as acquireTarget
      // ignores resting occupants. Already airborne projectiles still resolve.
      for(const foe of g.state.units)if(foe.target===u)foe.target=null;
    }
    return true;
  }
  return false;
}

export type DefenseMobilizationMetrics={hornCalls:number;automaticAlarms:number;residentsAlerted:number;weaponsTaken:number;toolDefenders:number;shelterOrders:number;protectedDuties:number};
const defenseMetrics=new WeakMap<Game,DefenseMobilizationMetrics>();
export function defenseMobilizationStatus(g:Game){let value=defenseMetrics.get(g);if(!value){value={hornCalls:0,automaticAlarms:0,residentsAlerted:0,weaponsTaken:0,toolDefenders:0,shelterOrders:0,protectedDuties:0};defenseMetrics.set(g,value);}return value;}
const weaponAvailable=(g:Game,team:number)=>{const t=g.tribe(team);return !!t&&(t.blades>0||t.spears>0||t.bows>0);};
const armTargets=new WeakMap<Unit,{until:number;drop:SupplyDrop;spot:{x:number;z:number}}>();
function armingTarget(g:Game,u:Unit){let cached=armTargets.get(u);if(cached&&g.state.time<cached.until&&('hp' in cached.drop?g.finished(cached.drop):true))return cached;for(const drop of supplyDrops(g,u.team).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))){const spot=supplyApproach(g,u,drop);if(!spot)continue;cached={until:g.state.time+DEFENSE_RULES.reviewSeconds,drop,spot};armTargets.set(u,cached);return cached;}return null;}
function takeLocalDefenseWeapon(g:Game,u:Unit){if(!u.emergency?.defending||isDependent(g,u)||u.hp<u.maxHp*DEFENSE_RULES.healthyFraction||u.type!=='worker'||u.militia||!weaponAvailable(g,u.team))return false;const local=armingTarget(g,u);if(!local||!supplyReached(g,u,local.drop,local.spot))return false;const t=g.tribe(u.team),kind=t.blades>0?'swordsman':t.spears>0?'spearman':'archer';if(kind==='swordsman')t.blades--;else if(kind==='spearman')t.spears--;else t.bows--;const d=UNITS[kind];u.type=kind;u.militia=true;u.range=d.range;u.dmg=d.dmg*AGE_STAT[t.age];u.rof=d.rof;u.emergency.autoArmed=true;defenseMobilizationStatus(g).weaponsTaken++;return true;}
function armForLocalDefense(g:Game,u:Unit,foes:Unit[],dt:number){if(u.type!=='worker'||isDependent(g,u)||u.hp<u.maxHp*DEFENSE_RULES.healthyFraction||!u.emergency?.defending||!weaponAvailable(g,u.team))return false;if(takeLocalDefenseWeapon(g,u))return false;if(u.escortId!==undefined||u.conflictIntent==='occupy'||u.conflictIntent==='capture'||foes.some(e=>Math.hypot(e.x-u.x,e.z-u.z)<DEFENSE_RULES.armingDangerMetres))return false;const target=armingTarget(g,u);if(!target)return false;u.target=null;u.order='move';u.tx=target.spot.x;u.tz=target.spot.z;u.workReason='Defense horn — walking to the cache to take an available weapon';g.steer(u,dt);return true;}

/** Mobilize once without movement or damage, so impact notifications cannot recurse. */
function mobilize(g:Game,u:Unit){
  if(u.emergency){u.emergency.defending=!isDependent(g,u)&&u.hp>=u.maxHp*DEFENSE_RULES.healthyFraction;return;}
  u.emergency = { until: g.state.time + 10, job: u.job, jobLock: u.jobLock, autoArmed: false, defending: !isDependent(g,u)&&u.hp>=u.maxHp*DEFENSE_RULES.healthyFraction,
    resume: u.team === 0 && (u.order === "explore" || (u.order === "move" && u.stationOnArrival) || u.order === "hold" || u.order === "trade")
      ? { order: u.order, tx: u.tx, tz: u.tz, station: !!u.stationOnArrival } : undefined };
  takeLocalDefenseWeapon(g,u);
  u.node = null;
  u.target = null;
  u.shelterId=undefined;
}

/** A real hit is a local alarm, including attacks during recall, work or sleep. */
export function raiseAttackAlarm(g:Game,victim:Unit|Building,attackerTeam:number){
  if(victim.kind==='unit')victim.contactSurrender=undefined;
  if(victim.team===3)return;
  const attackers=g.state.units.filter(e=>e.hp>0&&e.team===attackerTeam&&
    (victim.team!==0||g.visibleAt(e.x,e.z))&&Math.hypot(e.x-victim.x,e.z-victim.z)<60)
    .sort((a,b)=>Math.hypot(a.x-victim.x,a.z-victim.z)-Math.hypot(b.x-victim.x,b.z-victim.z));
  for(const center of villageCenters(g,victim.team))if(Math.hypot(victim.x-center.x,victim.z-center.z)<=DEFENSE_RULES.localMobilizationMetres&&attackers.length)automaticVillageCall(g,center,attackers,victim.team);
  for(const u of g.state.units){
    if(u.team!==victim.team||u.hp<=0||u.prisoner||Math.hypot(u.x-victim.x,u.z-victim.z)>45||(u.envoy?.kind==='peace'||g.state.rivalMissions?.some(m=>m.id===u.societyMissionId&&m.kind==='peace'&&['outbound','contact','returning'].includes(m.phase))))continue;
    if(u.type==='worker'||u.militia){
      mobilize(g,u);u.emergency!.until=g.state.time+10;
      if(isDependent(g,u)||u.hp<u.maxHp*DEFENSE_RULES.healthyFraction){
        u.order='move';u.workReason='Alarm — seeking shelter';continue;
      }
    }
    if(attackers[0]){u.target=attackers[0];u.order='attack';u.tx=attackers[0].x;u.tz=attackers[0].z;}
    else u.order='hold';
    u.workReason='Alarm — defending the tribe';
  }
}

/** Automatic response is local; commanded expeditions are not recalled across the map. */
export function emergencyResponse(g: Game, u: Unit, dt: number): boolean {
  if (u.team === 3 || u.prisoner ||u.contactSurrender&&u.contactSurrender.until>g.state.time&&!u.emergency) return false;
  // Explicit adult combat orders take precedence over automatic shelter behavior.
  if ((u.team === 0 || u.militia) && (u.type === "worker" || u.militia) && !u.emergency && !isDependent(g, u) &&
      (u.order === "attack" || u.order === "attackmove")) return false;
  if(u.envoy?.kind==="peace"||g.state.rivalMissions?.some(m=>m.kind==='peace'&&m.id===u.societyMissionId&&m.phase!=='completed'&&m.phase!=='lost'))return false;
  // A visible attack on a nearby workplace raises the village alarm as well as
  // personal danger. Already armed civilians must answer it even while holding.
  let defendedSites:Building[]|null=null;
  const foes = g.state.units.filter(e=>{
    if(!(e.hp>0)||e.shelterId)return false;
    const distance=Math.hypot(e.x-u.x,e.z-u.z);
    // No branch below can react beyond 65 metres. Reject remote residents
    // before diplomacy/mission checks, then survey nearby workplaces lazily.
    if(distance>=65||!g.isFoe(u.team,e.team)||
      (u.team===0&&!g.visibleAt(e.x,e.z))||contactYieldingTo(g,e,u.team)||isSocietyPeaceMessengerFor(g,e,u.team)||occupationProtectsCivilian(g,u,e)||!missionMayTargetCivilian(g,u,e))return false;
    if(distance<17||(u.emergency&&u.target===e&&distance<65))return true;
    if(distance>=45)return false;
    defendedSites??=g.state.buildings.filter(b=>b.team===u.team&&
      Math.hypot(b.x-u.x,b.z-u.z)<40&&g.finished(b));
    return defendedSites.some(b=>Math.hypot(b.x-e.x,b.z-e.z)<20);
  });
  if (foes.length && (u.type === "worker" || u.militia) && !u.emergency) {
    mobilize(g,u);
  }

  if (!u.emergency) return false;
  u.emergency.defending??=!isDependent(g,u)&&u.hp>=u.maxHp*DEFENSE_RULES.healthyFraction;
  if (foes.length) u.emergency.until = g.state.time + 10;
  if (g.state.time >= u.emergency.until) {
    const returnToWork=u.team===0&&u.militia&&!u.conflictIntent&&u.pillage<0&&u.massRaidTarget===undefined&&!u.visit&&!u.trade&&!u.envoy&&!u.scout&&!u.expedition&&!u.foundingJourney&&u.escortId===undefined&&!u.huntOnly;
    if (u.emergency.autoArmed&&!returnToWork&&u.team!==0) {
      const t = g.tribe(u.team);
      if (u.type === "archer") t.bows++;
      else if(u.type==='swordsman')t.blades++;
      else t.spears++;
      const d = UNITS.worker;
      u.type = "worker";
      u.militia = false;
      u.range = d.range;
      u.dmg = d.dmg;
      u.rof = d.rof;
    }
    const resume = u.emergency.resume;
    u.job = u.emergency.job;
    u.jobLock = u.emergency.jobLock;
    u.emergency = undefined;
    u.shelterId=undefined;
    u.target = null;
    u.node = null;
    u.order = u.carry > 0 ? "return" : "idle";
    u.workReason = "Returning to village work";
    if(returnToWork){const queuedExplore=u.exploreAfterDelivery;queueStandDown(g,u,true);if(queuedExplore)u.exploreAfterDelivery=true;return false;}
    if (resume && (u.carry === 0 || resume.order==='trade'&&u.trade)) {
      u.order = resume.order;
      u.tx = resume.tx; u.tz = resume.tz;
      u.stationOnArrival = resume.station;
      u.stuckT = 0;
      u.workReason = "Danger passed — resuming your expedition orders";
    }
    return false;
  }
  if(armForLocalDefense(g,u,foes,dt))return true;
  if (!isDependent(g,u) && u.hp>=u.maxHp*DEFENSE_RULES.healthyFraction && (u.emergency.autoArmed || u.militia || u.emergency.defending)) {
    u.workReason = u.militia ? "Militia defending the settlement" : "Defending the tribe with work tools";
    const foe = foes.sort(
      (a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
    )[0];
    if (foe) {
      u.target = foe;
      u.order = "attack";
      g.combatAI(u, dt);
    } else u.order = "hold";
    return true;
  }
  if(seekEmergencyShelter(g,u,foes,dt))return true;
  u.target=null;u.shelterId=undefined;u.order='move';
  if(foes.length){
    const nearest=foes.reduce((best,e)=>Math.hypot(e.x-u.x,e.z-u.z)<Math.hypot(best.x-u.x,best.z-u.z)?e:best);
    const away=Math.atan2(u.z-nearest.z,u.x-nearest.x),options=[];
    for(const offset of [0,.5,-.5,1,-1,1.5,-1.5,Math.PI]){
      const x=u.x+Math.cos(away+offset)*DEFENSE_RULES.retreatMetres,z=u.z+Math.sin(away+offset)*DEFENSE_RULES.retreatMetres;
      if(!g.walkable(x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
      options.push({x,z,safety:Math.min(...foes.map(e=>Math.hypot(x-e.x,z-e.z)))});
    }
    options.sort((a,b)=>b.safety-a.safety);
    if(options[0]){u.tx=options[0].x;u.tz=options[0].z;u.workReason='No reachable shelter — escaping invaders';g.steer(u,dt);}
    else {u.order='hold';u.workReason='Escape blocked — clear a route or defend this resident';}
  }else {u.order='hold';u.workReason='Waiting for the local alarm to clear';}
  return true;
}

function villageCenters(g:Game,team:number){const halls=g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&g.finished(b));return halls.length?halls:[g.campOf(team)];}
function protectedDefenseDuty(u:Unit){return !!u.contactDemand||u.contactAttackTargetId!==undefined||u.massRaidTarget!==undefined||u.pillage>=0&&!!u.attackDestination||u.escortId!==undefined||u.conflictIntent==='occupy'||u.conflictIntent==='capture'||!!(u.expedition||u.scout||u.visit||u.trade||u.envoy||u.foundingJourney||u.tributeJourney||u.boat);}
/** One bounded local call. It never interrupts a distant expedition or turns
 * a prisoner into labor; the existing emergency owns temporary defense only. */
export function callVillageDefense(g:Game,center:{x:number;z:number},intruders:Unit[]=[],manual=true,team=0){const metrics=defenseMobilizationStatus(g);if(manual)metrics.hornCalls++;let ready=0,vulnerable=0,protectedCount=0,newlyAlerted=0;for(const u of g.state.units){if(u.team!==team||u.hp<=0||u.prisoner||u.boat||Math.hypot(u.x-center.x,u.z-center.z)>DEFENSE_RULES.localMobilizationMetres)continue;const nearbyIntruder=intruders.some(e=>Math.hypot(e.x-u.x,e.z-u.z)<35);if(protectedDefenseDuty(u)&&!nearbyIntruder){protectedCount++;continue;}const wasEmergency=!!u.emergency;mobilize(g,u);u.emergency!.until=Math.max(u.emergency!.until,g.state.time+(manual?DEFENSE_RULES.manualAlarmSeconds:10));if(u.emergency!.defending)ready++;else vulnerable++;if(!wasEmergency){newlyAlerted++;metrics.residentsAlerted++;if(!u.emergency!.defending)metrics.shelterOrders++;else if(!u.militia&&!weaponAvailable(g,team))metrics.toolDefenders++;}u.workReason=u.emergency!.defending?'Defense horn — arm at the cache or defend with work tools':'Defense horn — children and injured residents seek shelter';}if(!manual&&newlyAlerted)metrics.automaticAlarms++;metrics.protectedDuties+=protectedCount;if(manual)g.banner(`${ready} nearby adults answering defense; ${vulnerable} seeking shelter${protectedCount?`; ${protectedCount} ongoing duties protected`:''}. Existing weapons and supplies are kept.`,5);return {ready,vulnerable,protected:protectedCount};}
const villageCallTimes=new WeakMap<Game,Map<string,number>>();
function automaticVillageCall(g:Game,center:{x:number;z:number},intruders:Unit[],team:number){let calls=villageCallTimes.get(g);if(!calls){calls=new Map();villageCallTimes.set(g,calls);}const key=team+':'+center.x+':'+center.z,due=calls.get(key)||0;if(g.state.time<due&&due-g.state.time<=DEFENSE_RULES.reviewSeconds)return;calls.set(key,g.state.time+DEFENSE_RULES.reviewSeconds);callVillageDefense(g,center,intruders,false,team);}
const defenseReview=new WeakMap<Game,number>();
export function tickVillageDefense(g:Game){if(g.state.time<(defenseReview.get(g)||0))return;defenseReview.set(g,g.state.time+DEFENSE_RULES.reviewSeconds);const foes=g.state.units.filter(e=>e.hp>0&&!e.shelterId&&g.isFoe(0,e.team)&&g.visibleAt(e.x,e.z)&&!(e.envoy?.kind==='peace'&&e.envoy.team===0)&&!isSocietyPeaceMessengerFor(g,e,0)&&!contactYieldingTo(g,e,0));if(!foes.length)return;for(const center of villageCenters(g,0)){const intruders=foes.filter(e=>Math.hypot(e.x-center.x,e.z-center.z)<DEFENSE_RULES.intrusionMetres);if(intruders.length)automaticVillageCall(g,center,intruders,0);}}
export function soundDefenseHorn(g:Game){const selected=g.state.selBld,center=selected&&selected.team===0&&selected.type==='townhall'&&g.finished(selected)?selected:g.campOf(0);return callVillageDefense(g,center);}

export function resetDefenseMobilization(g:Game){defenseReview.delete(g);defenseMetrics.delete(g);villageCallTimes.delete(g);}
