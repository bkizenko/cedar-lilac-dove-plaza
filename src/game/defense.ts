import type {Game} from './sim';
import type {Unit,Building} from './types';
import {UNITS} from './constants';
import {isDependent} from './settlement';

/** Mobilize once without movement or damage, so impact notifications cannot recurse. */
function mobilize(g:Game,u:Unit){
  if(u.emergency){u.emergency.defending??=!isDependent(g,u)&&u.hp>=u.maxHp*.3;return;}
  u.emergency = { until: g.state.time + 10, job: u.job, jobLock: u.jobLock, autoArmed: false, defending: !isDependent(g,u)&&u.hp>=u.maxHp*.3,
    resume: u.team === 0 && (u.order === "explore" || (u.order === "move" && u.stationOnArrival) || u.order === "hold" || u.order === "trade")
      ? { order: u.order, tx: u.tx, tz: u.tz, station: !!u.stationOnArrival } : undefined };
  const t = g.tribe(u.team);
  let type: "spearman" | "archer" | null = null;
  if (u.emergency.defending && !u.militia && t.spears > 0) {
    t.spears--;
    type = "spearman";
  } else if (u.emergency.defending && !u.militia && t.bows > 0) {
    t.bows--;
    type = "archer";
  }
  if (type) {
    const d = UNITS[type];
    u.type = type;
    u.militia = true;
    u.range = d.range;
    u.dmg = d.dmg;
    u.rof = d.rof;
    u.emergency.autoArmed = true;
  }
  u.node = null;
  u.target = null;
  u.shelterId=undefined;
}

/** A real hit is a local alarm, including attacks during recall, work or sleep. */
export function raiseAttackAlarm(g:Game,victim:Unit|Building,attackerTeam:number){
  if(victim.team===3)return;
  const attackers=g.state.units.filter(e=>e.hp>0&&e.team===attackerTeam&&
    (victim.team!==0||g.visibleAt(e.x,e.z))&&Math.hypot(e.x-victim.x,e.z-victim.z)<60)
    .sort((a,b)=>Math.hypot(a.x-victim.x,a.z-victim.z)-Math.hypot(b.x-victim.x,b.z-victim.z));
  for(const u of g.state.units){
    if(u.team!==victim.team||u.hp<=0||Math.hypot(u.x-victim.x,u.z-victim.z)>45||u.envoy?.kind==='peace')continue;
    if(u.type==='worker'||u.militia){
      mobilize(g,u);u.emergency!.until=g.state.time+10;
      if(isDependent(g,u)||u.hp<u.maxHp*.3){
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
  if (u.team === 3) return false;
  // Explicit adult combat orders take precedence over automatic shelter behavior.
  if ((u.team === 0 || u.militia) && (u.type === "worker" || u.militia) && !u.emergency && !isDependent(g, u) &&
      (u.order === "attack" || u.order === "attackmove")) return false;
  if(u.envoy?.kind==="peace")return false;
  // A visible attack on a nearby workplace raises the village alarm as well as
  // personal danger. Already armed civilians must answer it even while holding.
  const defendedSites = g.state.buildings.filter(b=>b.team===u.team&&g.finished(b)&&
    Math.hypot(b.x-u.x,b.z-u.z)<40);
  const foes = g.state.units.filter(
    (e) =>
      e.hp > 0 &&
      g.isFoe(u.team, e.team) &&
      (u.team !== 0 || g.visibleAt(e.x, e.z)) &&
      (Math.hypot(e.x - u.x, e.z - u.z) < 17 ||
        (u.emergency&&u.target===e&&Math.hypot(e.x-u.x,e.z-u.z)<65) ||
        (Math.hypot(e.x-u.x,e.z-u.z)<45 && defendedSites.some(b=>Math.hypot(b.x-e.x,b.z-e.z)<20))),
  );
  if (foes.length && (u.type === "worker" || u.militia) && !u.emergency) {
    mobilize(g,u);
  }

  if (!u.emergency) return false;
  u.emergency.defending??=!isDependent(g,u)&&u.hp>=u.maxHp*.3;
  if (foes.length) u.emergency.until = g.state.time + 10;
  if (g.state.time >= u.emergency.until) {
    if (u.emergency.autoArmed) {
      const t = g.tribe(u.team);
      if (u.type === "archer") t.bows++;
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
    u.target = null;
    u.node = null;
    u.order = u.carry > 0 ? "return" : "idle";
    u.workReason = "Returning to village work";
    if (resume && (u.carry === 0 || resume.order==='trade'&&u.trade)) {
      u.order = resume.order;
      u.tx = resume.tx; u.tz = resume.tz;
      u.stationOnArrival = resume.station;
      u.stuckT = 0;
      u.workReason = "Danger passed — resuming your expedition orders";
    }
    return false;
  }
  if (!isDependent(g,u) && u.hp>=u.maxHp*.3 && (u.emergency.autoArmed || u.militia || u.emergency.defending)) {
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
  const shelters = g.state.buildings.filter(
    (b) => b.team === u.team && g.finished(b) && ["townhall", "hut", "keep"].includes(b.type),
  );
  const shelter = shelters.sort((a, b) => {
    const safety = (b: Building) =>
      foes.reduce((n, e) => n + Math.max(0, 25 - Math.hypot(b.x - e.x, b.z - e.z)) * 4, 0) +
      Math.hypot(b.x - u.x, b.z - u.z);
    return safety(a) - safety(b);
  })[0];
  u.workReason = "Taking shelter from invaders";
  u.order = "move";
  if (shelter) {
    u.tx = shelter.x;
    u.tz = shelter.z;
    g.steer(u, dt);
  } else if (foes[0]) {
    const a = Math.atan2(u.z - foes[0].z, u.x - foes[0].x);
    u.tx = u.x + Math.cos(a) * 8;
    u.tz = u.z + Math.sin(a) * 8;
    g.steer(u, dt);
  }
  return true;
}

