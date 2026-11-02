import {animalProcessingEnabled,harvestAnimalMaterials} from './production';
import {butcheryLaborMultiplier} from './subsistenceBalance';
import type { Game } from "./sim";
import type { Critter, CritterKind, Unit, Projectile } from "./types";
import { GATHER_WORK_RATE } from "./constants";
import { reserveSeconds } from "./settlement";
import { carryingCapacity } from "./haulage";
import { climateAt } from "./ecology";
import { predisposition } from "./people";
import {WildlifeObstacles,moveGroundWildlife} from "./wildlifeMovement";
import {nearbyStepBuildings} from "./buildingQueries";

export type Carcass = { meat: number; diedAt: number; hides?:number; bones?:number;prepared?:true;preparationWork?:number;skinningWork?:number };
/** Tunable game work seconds, not a historical time measurement. */
export const CARCASS_PROCESSING_RULES={gutSeconds:2,skinSeconds:3} as const;
export type HuntableCritter = Critter & { carcass?: Carcass };
export const CARCASS_MEAT = { deer: 24, boar: 32, goat: 16, bird: 0 } as const;

/** Old dead wildlife has no carcass field: loading cannot recreate eaten meat. */
export function carcassStateValid(value: unknown, species: CritterKind, hp: number, now: number) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value) || hp > 0 || species === "bird") return false;
  const c = value as Carcass;
  return Number.isFinite(c.meat) && c.meat >= 0 && c.meat <= CARCASS_MEAT[species] &&
    (c.hides===undefined||Number.isFinite(c.hides)&&c.hides>=0&&c.hides<=1)&&(c.bones===undefined||Number.isFinite(c.bones)&&c.bones>=0&&c.bones<=(species==='boar'?3:2))&&
    (c.prepared===undefined||c.prepared===true)&&
    (c.preparationWork===undefined||Number.isFinite(c.preparationWork)&&c.preparationWork>=0&&c.preparationWork<=CARCASS_PROCESSING_RULES.gutSeconds)&&
    (c.skinningWork===undefined||Number.isFinite(c.skinningWork)&&c.skinningWork>=0&&c.skinningWork<=CARCASS_PROCESSING_RULES.skinSeconds)&&
    (c.prepared?c.preparationWork===CARCASS_PROCESSING_RULES.gutSeconds:!(c.preparationWork===CARCASS_PROCESSING_RULES.gutSeconds))&&
    (!c.skinningWork||!!c.prepared)&&
    Number.isFinite(c.diedAt) && c.diedAt >= 0 && c.diedAt <= now;
}

function carcassLifetime(g: Game, c: Critter) {
  const climate = climateAt(g, c.x, c.z);
  const warmth = Math.max(0.5, 0.65 + Math.max(-8, climate.temperature) / 15);
  return Math.max(100, Math.min(720, 360 / (warmth * (0.8 + climate.humidity * 0.4))));
}

export function carcassAvailable(g: Game, c: HuntableCritter) {
  return c.hp <= 0 && c.species !== "bird" && !!c.carcass && c.carcass.meat > 0 &&
    g.state.time >= c.carcass.diedAt && g.state.time - c.carcass.diedAt < carcassLifetime(g, c);
}

export function huntable(g: Game, c: HuntableCritter, team?:number) {
  if(c.hp>0&&team!==undefined&&g.state.units.some(u=>u.hp>0&&u.team===team&&u.tamingWork?.animal===c.id))return false;
  return c.species !== "bird" && (c.hp > 0 || carcassAvailable(g, c));
}

/** Call before wildlife recruitment. Usable remains persist; spoiled meat never returns. */
export function updateCarcass(g: Game, c: HuntableCritter) {
  if (c.hp > 0 || !c.carcass) return false;
  if (!carcassAvailable(g, c)) c.carcass.meat = 0;
  return c.carcass.meat > 0;
}

export function wildlifeFleeSpeed(c: Critter) {
  const base = c.species === "deer" ? 4 : c.species === "boar" ? 2.8 : 2.5;
  return base * (0.6 + 0.4 * Math.max(0, Math.min(1, c.hp / Math.max(1, c.maxHp))));
}

/** Owned bows shoot; spears/blades work at physical reach. Unarmed residents
 * use loose stones, following the existing game's non-inventoried ammunition rule. */
export const HUNTING_WEAPONS={stone:{range:5,period:1.1,damage:1,speed:16},bow:{range:8,period:.9,damage:1.5,speed:22},spear:{range:2.6,period:.9,damage:1.5,speed:0},blade:{range:1.8,period:.9,damage:1.5,speed:0}} as const;
export function huntingWeapon(u:Unit):keyof typeof HUNTING_WEAPONS{return ['archer','ranger'].includes(u.type)?'bow':u.type==='spearman'||u.type==='worker'&&u.militia?'spear':['swordsman','cavalry','warden'].includes(u.type)?'blade':'stone';}
function damagePrey(g:Game,c:HuntableCritter,damage:number,team:number,attackerId?:number){
 if(c.hp<=0)return;c.hp=Math.max(0,c.hp-damage);if(team===0)g.onSfx('hit');
 if(c.hp>0&&c.species==='boar'&&attackerId!==undefined){const u=g.state.units.find(u=>u.id===attackerId&&u.hp>0);if(u)c.huntDefense={hunterId:u.id,expiresAt:g.state.time+HUNTING_HAZARD_RULES.alertSeconds,nextAttackAt:Math.max(g.state.time,c.huntDefense?.nextAttackAt??0),lastX:u.x,lastZ:u.z};}
 if(c.hp===0){delete c.huntDefense;c.carcass={meat:CARCASS_MEAT[c.species],diedAt:g.state.time,...(animalProcessingEnabled(g,team)?{hides:1,bones:c.species==='boar'?3:2}:{})};c.vx=0;c.vz=0;c.wanderT=600;g.workBoard.reset();g.addBurst(c.x,c.y+.3,c.z,'#8a5a3a',6);if(team===0)g.addFloater(c.x,c.y+1.8,c.z,`${CARCASS_MEAT[c.species]} meat to carry home`,'#efe4b0');}
}
/** Named game parameters; ammunition remains the existing non-inventoried rule. */
export const HUNTING_FLIGHT_RULES={terrainProbeMeters:.5,bodyRadiusMeters:.55,maxLeadSeconds:.8,maxFlightSeconds:2,maxProjectiles:40} as const;
export const HUNTING_TRACKING_RULES={memorySeconds:25,searchSeconds:8,searchRadiusMeters:4,localSightMeters:18} as const;
export const HUNTING_HAZARD_RULES={alertSeconds:8,pursuitMeters:18,chargeSpeed:4.2,contactMeters:1.65,damage:6,attackCooldownSeconds:2.2} as const;
function localObstacles(g:Game,x:number,z:number,r:number){return new WildlifeObstacles(nearbyStepBuildings(g,x,z,r).filter(b=>g.solidBuilding(b)));}
/** A target must be physically visible; shared tribe vision alone cannot shoot through a wall. */
export function huntingSightClear(g:Game,a:{x:number;y:number;z:number},b:{x:number;y:number;z:number},obstacles?:WildlifeObstacles){
 const d=Math.hypot(b.x-a.x,b.z-a.z),o=obstacles||localObstacles(g,(a.x+b.x)/2,(a.z+b.z)/2,d/2+2);
 if(!o.clearAt(a,.05)||!o.clearAt(b,.05)||!o.segmentClear(a,b,.05))return false;
 for(let i=1,n=Math.max(1,Math.ceil(d/1.5));i<n;i++){const t=i/n;if(g.height(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)>a.y+(b.y-a.y)*t)return false;}
 return true;
}
/** Range applies to the actual eye-to-body aim, including relief and bounded lead. */
function huntingAim(u:Unit,c:Critter,spec:{range:number;speed:number}){
 const dy=c.y+.4-(u.y+1.2),distance=Math.hypot(c.x-u.x,dy,c.z-u.z);
 if(!spec.speed||!Number.isFinite(distance)||distance>spec.range)return null;
 const lead=Math.min(HUNTING_FLIGHT_RULES.maxLeadSeconds,distance/spec.speed),dx=c.x+c.vx*lead-u.x,dz=c.z+c.vz*lead-u.z,d=Math.hypot(dx,dy,dz),life=Math.max(.5,d/spec.speed+.3);
 if(!Number.isFinite(d)||d<=0||d>spec.range||life>HUNTING_FLIGHT_RULES.maxFlightSeconds)return null;
 return {dx,dy,dz,d,life};
}
export function fireHuntingProjectile(g:Game,u:Unit,c:Critter){
 const weapon=huntingWeapon(u),spec=HUNTING_WEAPONS[weapon];if(!spec.speed||c.hp<=0||c.species==='bird'||!g.state.wildlife.includes(c)||g.state.projectiles.length>=HUNTING_FLIGHT_RULES.maxProjectiles)return false;
 const aim=huntingAim(u,c,spec);if(!aim||!huntingSightClear(g,{x:u.x,y:u.y+1.2,z:u.z},{x:c.x,y:c.y+.4,z:c.z}))return false;
 const {dx,dy,dz,d,life}=aim;
 g.state.projectiles.push({x:u.x,y:u.y+1.2,z:u.z,tx:c.x,ty:c.y+.4,tz:c.z,target:null,attackerId:u.id,team:u.team,wildlifeTargetId:c.id,huntingWeapon:weapon as 'stone'|'bow',huntingVelocity:{x:dx/d*spec.speed,y:dy/d*spec.speed,z:dz/d*spec.speed},speed:spec.speed,life,dmg:spec.damage});
 if(u.team===0)g.onSfx(weapon==='bow'?'bow':'move');return true;
}
/** Earliest swept moving-sphere hit, rather than homing or an expiry reward. */
function bodyHit(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number},old:{x:number;y:number;z:number},now:{x:number;y:number;z:number},radius:number){
 const x=a.x-old.x,y=a.y-old.y,z=a.z-old.z,dx=b.x-now.x-x,dy=b.y-now.y-y,dz=b.z-now.z-z,A=dx*dx+dy*dy+dz*dz,B=2*(x*dx+y*dy+z*dz),C=x*x+y*y+z*z-radius*radius;
 if(C<=0)return 0;if(A<1e-12)return Infinity;const disc=B*B-4*A*C;if(disc<0)return Infinity;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:Infinity;
}
/** Fixed launch direction. A removed, dead or missed target yields nothing. */
export function advanceHuntingProjectile(g:Game,p:Projectile,dt:number,obstacles?:WildlifeObstacles){
 const flight=Math.min(Math.max(0,p.life),Math.max(0,dt));p.life-=dt;const v=p.huntingVelocity;if(!v||flight<=0)return true;
 const a={x:p.x,y:p.y,z:p.z},b={x:p.x+v.x*flight,y:p.y+v.y*flight,z:p.z+v.z*flight},c=g.state.wildlife.find(a=>a.id===p.wildlifeTargetId&&a.hp>0),now=c?{x:c.x,y:c.y+.4,z:c.z}:{x:p.tx,y:p.ty,z:p.tz};
 const part=dt>0?flight/dt:0,endPrey={x:p.tx+(now.x-p.tx)*part,y:p.ty+(now.y-p.ty)*part,z:p.tz+(now.z-p.tz)*part};
 const hit=c?bodyHit(a,b,{x:p.tx,y:p.ty,z:p.tz},endPrey,HUNTING_FLIGHT_RULES.bodyRadiusMeters*c.scale):Infinity;
 const o=obstacles||localObstacles(g,(a.x+b.x)/2,(a.z+b.z)/2,Math.hypot(b.x-a.x,b.z-a.z)/2+2),n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/HUNTING_FLIGHT_RULES.terrainProbeMeters));
 let stop=Infinity,prev=a;for(let i=1;i<=n;i++){const t=i/n,q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(g.height(q.x,q.z)>q.y+.05||!o.segmentClear(prev,q,.03)){stop=(i-1)/n;break;}prev=q;}
 if(Number.isFinite(hit)&&hit<=stop&&c){damagePrey(g,c,p.dmg,p.team,p.attackerId);return true;}
 if(stop!==Infinity)return true;Object.assign(p,b,{tx:now.x,ty:now.y,tz:now.z});return p.life<=0;
}
/** Wounded boars defend against the actual attacker, never a whole society. */
export function tickHuntingHazard(g:Game,c:Critter,dt:number,obstacles:WildlifeObstacles){
 const h=c.huntDefense;if(!h)return false;const u=g.state.units.find(u=>u.id===h.hunterId&&u.hp>0),r=HUNTING_HAZARD_RULES;
 if(c.hp<=0||c.species!=='boar'||!u||u.boat||u.shelterId||g.state.time>=h.expiresAt){delete c.huntDefense;return false;}
 const distance=Math.hypot(u.x-c.x,u.z-c.z);if(distance>r.pursuitMeters){delete c.huntDefense;return false;}
 const seen=huntingSightClear(g,{x:c.x,y:c.y+.6,z:c.z},{x:u.x,y:u.y+.8,z:u.z},obstacles);
 if(seen){h.lastX=u.x;h.lastZ=u.z;}
 const d=Math.hypot(h.lastX-c.x,h.lastZ-c.z);c.vx=d>.1?(h.lastX-c.x)/d*r.chargeSpeed:0;c.vz=d>.1?(h.lastZ-c.z)/d*r.chargeSpeed:0;
 if(seen&&distance<=r.contactMeters){c.vx=0;c.vz=0;if(g.state.time>=h.nextAttackAt){u.hp=Math.max(0,u.hp-r.damage);h.nextAttackAt=g.state.time+r.attackCooldownSeconds;u.workReason='Wounded boar is charging — injury risk';g.addFloater(u.x,u.y+2,u.z,`−${r.damage}`,'#e98265');if(u.team===0)g.onSfx('hit');}}
 else moveGroundWildlife(g,c,dt,obstacles);c.facing=Math.atan2(h.lastX-c.x,h.lastZ-c.z);return true;
}

function finishTask(g: Game, u: Unit, reason: string) {
  u.node = null; u.gatherT = 0; delete u.huntTrail;
  u.order = u.carry > 0 ? "return" : "idle";
  u.workReason = reason;
  g.workBoard.reset();
}

/** Civilian hunting and butchery share normal paths, finite cargo and physical delivery. */
export function workerHuntAI(g: Game, u: Unit, dt: number): boolean {
  if (u.order !== "gather" || !u.node || !("species" in u.node) || u.hp <= 0) return false;
  const c = u.node as HuntableCritter;
  if (!huntable(g, c,u.team)) {
    finishTask(g, u, c.hp>0?"This goat is reserved for taming — finding other food":"The carcass is exhausted or spoiled — finding other food");
    return true;
  }
  if (u.carry > 0 && (u.carryType !== "food" || (u.carryFood || "provisions") !== "meat" || animalProcessingEnabled(g,u.team)&&!u.rawHuntMeat)) {
    u.order = "return"; u.workReason = "Delivering the current load before hunting";
    return true;
  }
  if (u.carry+Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0) >= carryingCapacity(u, "food")) {
    u.order = "return"; u.workReason = "Carrying the hunting catch home";
    return true;
  }
  const observed=c.hp>0?(u.team===0?g.visibleAt(c.x,c.z):Math.hypot(c.x-u.x,c.z-u.z)<=HUNTING_TRACKING_RULES.localSightMeters)&&huntingSightClear(g,{x:u.x,y:u.y+1.2,z:u.z},{x:c.x,y:c.y+.4,z:c.z}):g.exploredAt(c.x,c.z)||u.team!==0;
  if(c.hp>0&&observed)u.huntTrail={animal:c.id,x:c.x,z:c.z,seenAt:g.state.time,expiresAt:g.state.time+HUNTING_TRACKING_RULES.memorySeconds};
  if(!observed){
    const trail=u.huntTrail;
    if(c.hp<=0||!trail||trail.animal!==c.id||g.state.time>=trail.expiresAt){finishTask(g,u,'Lost the trail — finding reachable food');return true;}
    const reached=Math.hypot(u.x-trail.x,u.z-trail.z)<2;
    if(reached)trail.searchStartedAt??=g.state.time;
    if(trail.searchStartedAt!==undefined&&g.state.time-trail.searchStartedAt>=HUNTING_TRACKING_RULES.searchSeconds){finishTask(g,u,'Trail search exhausted — finding reachable food');return true;}
    const a=(c.id%8)*Math.PI/4+Math.floor((g.state.time-(trail.searchStartedAt??g.state.time))/2)*Math.PI/2;
    const spot=g.nearestWalk(u,trail.x+(trail.searchStartedAt!==undefined?Math.sin(a)*HUNTING_TRACKING_RULES.searchRadiusMeters:0),trail.z+(trail.searchStartedAt!==undefined?Math.cos(a)*HUNTING_TRACKING_RULES.searchRadiusMeters:0));
    u.tx=spot.x;u.tz=spot.z;u.workReason='Tracking last-seen prey';g.steer(u,dt);return true;
  }
  if (u.team !== 0 && Math.hypot(c.x - g.campOf(u.team).x, c.z - g.campOf(u.team).z) > 75) {
    finishTask(g, u, "Herd beyond safe gathering range — returning to local work");
    return true;
  }
  const weapon=huntingWeapon(u),spec=HUNTING_WEAPONS[weapon];
  const alive = c.hp > 0;
  const range = alive ? spec.range : 1.8;
  const urgency = reserveSeconds(g,u.team) < 240 ? 1.25 : 1;
  const period = alive ? spec.period : 1.8 * butcheryLaborMultiplier(g,u.x,u.z) / (GATHER_WORK_RATE * urgency);
  // Ready the next throw while stalking, but never accumulate remote butchery.
  if (alive) u.gatherT = Math.min(period, u.gatherT + dt * predisposition(u).strength);
  const inReach = () => alive&&spec.speed ? huntingAim(u,c,spec)!==null : Math.hypot(c.x - u.x, c.z - u.z) <= range;
  if (!inReach()) {
    const spot = g.nearestWalk(u, c.x, c.z);
    if (!g.walkable(spot.x, spot.z) || !g.workBoard.connected(g, u.x, u.z, spot.x, spot.z)) {
      u.blockedTask = c.id; u.retryWorkAt = g.state.time + 30;
      finishTask(g, u, "Hunting route blocked — seeking reachable food");
      return true;
    }
    // A moving prey goal can drift below navigation's ordinary 2m cache tolerance.
    // Refresh only at stale final arrival; reaching that old point is not proof
    // that the actual carcass is unreachable, and cannot permit remote butchery.
    const route=g.peekMovementRoute(u.id),last=route?.points[0];
    if(route&&route.points.length===1&&last&&Math.hypot(last.x-u.x,last.z-u.z)<.6&&Math.hypot(route.tx-spot.x,route.tz-spot.z)>.01)g.invalidateRoute(u);
    u.tx = spot.x; u.tz = spot.z;
    u.workReason = alive ? `Stalking ${c.species}` : "Walking to butcher the hunting catch";
    if (g.steer(u, dt) && !inReach()) {
      u.blockedTask = c.id; u.retryWorkAt = g.state.time + 30;
      finishTask(g, u, "Cannot reach the hunting catch — finding another food source");
    }
    return true;
  }
  u.facing = Math.atan2(c.x - u.x, c.z - u.z);
  u.stride += dt * 8;
  if(!alive){const carcass=c.carcass!,work=dt*predisposition(u).strength*GATHER_WORK_RATE*urgency/butcheryLaborMultiplier(g,u.x,u.z);
    if(!carcass.prepared){carcass.preparationWork=Math.min(CARCASS_PROCESSING_RULES.gutSeconds,(carcass.preparationWork||0)+work);u.workReason=`Gutting ${c.species}`;if(carcass.preparationWork>=CARCASS_PROCESSING_RULES.gutSeconds)carcass.prepared=true;return true;}
    if(animalProcessingEnabled(g,u.team)&&((carcass.hides||0)>0||(carcass.bones||0)>0)){carcass.skinningWork=Math.min(CARCASS_PROCESSING_RULES.skinSeconds,(carcass.skinningWork||0)+work);u.workReason=`Skinning ${c.species}`;if(carcass.skinningWork>=CARCASS_PROCESSING_RULES.skinSeconds)harvestAnimalMaterials(g,u,carcass,Math.max(0,carryingCapacity(u,"food")-u.carry-Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0)));return true;}
  }
  if (!alive) u.gatherT += dt * predisposition(u).strength;
  u.workReason = alive ? `Hunting ${c.species}` : `Butchering ${c.species} · ${Math.ceil(c.carcass!.meat)} meat remains`;
  if (u.gatherT < period) return true;
  u.gatherT = 0;
  if (alive) {
    if(spec.speed){if(!fireHuntingProjectile(g,u,c))u.gatherT=period;}else damagePrey(g,c,spec.damage,u.team,u.id);
    return true;
  }

  const carcass = c.carcass!;
  const taken = Math.min(3, carcass.meat, Math.max(0, carryingCapacity(u, "food") - u.carry-Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0)));
  carcass.meat -= taken;
  if(taken>0&&animalProcessingEnabled(g,u.team))u.rawHuntMeat=true;
  u.carry += taken; u.carryType = "food"; u.carryFood = "meat";
  if (u.carry+Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0) >= carryingCapacity(u, "food") || (u.carry >= 8 && reserveSeconds(g,u.team) < 90) || carcass.meat === 0) {
    u.order = "return"; u.workReason = "Carrying the hunting catch home";
    if (carcass.meat === 0) g.workBoard.reset();
  }
  return true;
}
