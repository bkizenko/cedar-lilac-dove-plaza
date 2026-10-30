import {workdayAt} from "./daylight";
import {applyForagePressure} from "./ecology";
import type { Game } from "./sim";
import type { Unit } from "./types";
import { foodDemand, FOOD_PER_PERSON_SECOND, reserveSeconds } from "./settlement";
import { predisposition } from "./people";
export function beginExpedition(g: Game, u: Unit) {
  if (u.expedition) return true;
  const t = g.tribe(u.team),
    available = Math.max(0, t.food - foodDemand(g, u.team) * 90);
  const food = Math.min(24, Math.floor(available));
  if (food < 6) return false;
  t.food -= food;
  u.expedition = { food, returning: false, forage: 0 };
  return true;
}
export function expeditionAI(g: Game, u: Unit, dt: number) {
  const e = u.expedition;
  if (!e) return false;
  const halls = g.state.buildings.filter(
    (b) => b.team === u.team && b.type === "townhall" && g.finished(b),
  );
  const home =
    halls.find((b) => b.id === u.homeHall) ||
    halls.sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
  if (!home) {e.food=Math.max(0,e.food-dt*FOOD_PER_PERSON_SECOND);return false;}
  const distance = Math.hypot(u.x - home.x, u.z - home.z);
  if (distance < Math.max(home.w, home.d) * 0.55 + 3 && (e.returning || u.order !== "explore")) {
    g.tribe(u.team).food += e.food;
    u.expedition = undefined;
    if (e.returning) {
      u.order = "idle";
      u.node = null;
      u.workReason = "Expedition home — unused provisions returned";
    }
    return false;
  }
  e.food = Math.max(0, e.food - dt * FOOD_PER_PERSON_SECOND * predisposition(u).appetite);
  if (e.returning && (u.order !== "move" || Math.hypot(u.tx - home.x, u.tz - home.z) > 1))
    e.returning = false;
  if (u.order !== "explore" && !e.returning) return false;
  const threat = g.state.units.some(
    (p) => p.hp > 0 && g.isFoe(u.team, p.team) && Math.hypot(p.x - u.x, p.z - u.z) < 20,
  );
  if (!threat && !e.returning && e.food > 2 && e.food < 12) {
    const patch = g.state.forage.find((n) => n.amount >= 1 && Math.hypot(n.x - u.x, n.z - u.z) < 5);
    if (patch) {
      e.forage += dt;
      u.workReason = "Foraging nearby wild food for the journey";
      if (e.forage >= 8) {
        e.forage -= 8;
        patch.amount -= 1;
        applyForagePressure(patch);if(patch.amount<=0)patch.regenT=240+(patch.pressure||0)*900;
        e.food += 1;
      }
      if (e.forage > 0) return true;
    }
  }
  const returnNeed = Math.max(2, (distance / Math.max(1, u.speed)) * FOOD_PER_PERSON_SECOND * 1.4);
  if (e.food <= returnNeed || threat || u.stuckT > 8) e.returning = true;
  const offShift = !workdayAt(g.state.time,g.dayPhase()*24).working;
  if (offShift && !g.state.nightWork && !threat && !e.returning && e.food>2 && distance > 18) {
    u.fatigue = Math.max(0, (u.fatigue || 0) - dt / 15);
    u.workReason = "Night camp — resting with journey provisions";
    return true;
  }
  if(e.returning&&e.food<2){const patch=g.state.forage.find(n=>n.amount>=1&&Math.hypot(n.x-u.x,n.z-u.z)<4);if(patch){e.forage+=dt;if(e.forage>=8){e.forage=0;patch.amount--;applyForagePressure(patch);if(patch.amount<=0)patch.regenT=240+(patch.pressure||0)*900;e.food++;}}}
  if (e.returning) {
    u.order = "move";
    u.tx = home.x;
    u.tz = home.z;
    u.workReason = "Returning before journey provisions run out";
    g.steer(u, dt);
    return true;
  }
  return false;
}
export function routineRest(g: Game, u: Unit, dt: number) {
  u.shelterId=undefined;
  if (
    (u.type !== "worker" && !(u.militia&&u.huntOnly)) ||
    u.foundingJourney ||
    u.expedition ||
    u.envoy ||
    u.visit ||
    u.scout ||
    u.recalled ||
    u.emergency ||
    u.pillage >= 0 ||
    !["idle", "gather", "build", "return", "hold"].includes(u.order)
  )
    return false;
  if(u.carry>0&&u.order==="return")return false;
  // Recovery has an end: a recovered adult resumes work even before sunrise.
  // Idle adults must reach the work board in a food shortage without a manual order.
  const adult=!u.maturesAt||u.maturesAt<=g.state.time;
  const night=g.clockState().period === "Night";
  const fatigue=u.fatigue||0;
  const offShift=!workdayAt(g.state.time,g.dayPhase()*24).working;
  const urgentFood=adult&&reserveSeconds(g,u.team)<240&&
    ((u.job==="food"&&u.order==="gather")||(u.order==="idle"&&!u.jobLock));
  if(fatigue<=.12)u.resting=undefined;
  if(!u.resting&&fatigue>=.85)u.resting=true;
  const resting=u.resting||(!g.state.nightWork&&(adult?offShift&&!urgentFood:night))||g.state.weather==="storm";
  if (!resting) {
    if (/^(Sleeping|Sheltering|Seeking shelter|Night camp)/.test(u.workReason || "")) u.workReason = undefined;
    u.fatigue = Math.max(0,Math.min(1, fatigue + (u.order==="hold"||u.order==="idle"?-dt/60:dt/240)));
    return false;
  }
  // Distant gatherers camp by their work at night instead of spending every
  // short game day repeating a round trip. Severe storms still require shelter.
  const distantWork=!!u.job&&u.order==="gather"&&g.state.weather!=="storm"&&
    !g.state.buildings.some(b=>b.team===u.team&&g.finished(b)&&["hut","townhall","keep"].includes(b.type)&&Math.hypot(b.x-u.x,b.z-u.z)<18);
  if(distantWork){u.fatigue=Math.max(0,(u.fatigue||0)-dt/30);u.workReason="Night camp — resting by the gathering grounds";return true;}
  // Count residents once, rather than scanning every resident for every hut.
  const occupancy=new Map<number,number>();
  for(const p of g.state.units)if(p.hp>0&&p.shelterId!==undefined)occupancy.set(p.shelterId,(occupancy.get(p.shelterId)||0)+1);
  let shelter:typeof g.state.buildings[number]|undefined,nearest=Infinity;
  for(const b of g.state.buildings){
    if(b.team!==u.team||!g.finished(b)||!["hut","townhall","keep"].includes(b.type)||
      (occupancy.get(b.id)||0)>=(b.type==="hut"?5:b.type==="keep"?12:8))continue;
    const distance=(b.x-u.x)**2+(b.z-u.z)**2;
    if(distance<nearest){nearest=distance;shelter=b;}
  }
  if (!shelter) {u.workReason="No shelter room — build more huts";return false;}
  const entrance=g.interactionSpot(u,shelter);
  if(!entrance){u.workReason="Shelter unreachable — seeking a clear entrance";return false;}
  if (Math.hypot(u.x - entrance.x, u.z - entrance.z) > 1) {
    u.tx = entrance.x;
    u.tz = entrance.z;
    g.steer(u, dt);
    u.workReason = "Seeking shelter for rest";
    return true;
  }
  u.fatigue = Math.max(0, (u.fatigue || 0) - dt / 20);
  u.shelterId=shelter.id;
  u.workReason =
    g.state.weather === "storm" ? "Sheltering inside from the storm" : "Sleeping inside by the hearth";
  if (!u.sickUntil && (u.hunger || 0) < 10) u.hp = Math.min(u.maxHp, u.hp + (dt * u.maxHp) / 900);
  return true;
}
