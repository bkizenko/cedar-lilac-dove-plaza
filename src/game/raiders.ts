import type { Game } from "./sim";
import type { Unit } from "./types";
import { mulberry32 } from "./rng";

/** Seeded land camps have a finite initial band. They never manufacture replacements. */
export function establishRaiderCamps(g: Game) {
  const random = mulberry32(g.state.seed ^ 0x7ad34);
  const home = g.campOf(0);
  const camps = 1 + Math.floor(random() * 2);
  for (let c = 0; c < camps; c++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = random() * Math.PI * 2;
      const radius = g.world.islandR * (0.3 + random() * 0.32);
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.hypot(x - home.x, z - home.z) < 100 || !g.walkable(x, z) ||
          g.state.buildings.some(b => Math.hypot(b.x - x, b.z - z) < 70)) continue;
      if (g.placementIssue("hut", x, z, 3)) continue;
      const camp = g.makeBld("hut", x, z, 3);
      camp.build = 1; camp.hp = camp.maxHp; camp.raiderCamp = true;
      g.state.buildings.push(camp); g.state.walkDirty = true;
      g.tribe(3).food += 24; // Initial supplies, consumed by the same population system.
      for (let i = 0; i < 2; i++) {
        const raider = g.spawnUnit("spearman", x + 5 + i * 2, z + 5, 3);
        raider.homeCamp = camp.id;
        raider.order = "hold";
        raider.workReason = "Watching paths near the raider camp";
      }
      break;
    }
  }
}
export function campRaidAI(g: Game, u: Unit, dt: number) {
  if (u.homeCamp === undefined) return false;
  const camp = g.state.buildings.find(b => b.id === u.homeCamp && b.raiderCamp && b.hp > 0);
  if (!camp) {
    u.order = "hold"; u.target = null;
    u.workReason = "Camp destroyed — the surviving band is scattered";
    return true;
  }
  if (u.carry > 0 && u.carryType) {
    u.tx = camp.x; u.tz = camp.z; u.order = "return";
    if (Math.hypot(u.x - camp.x, u.z - camp.z) > 5) g.steer(u, dt);
    else {
      g.tribe(3)[u.carryType] += u.carry;
      u.carry = 0; u.carryType = null; u.target = null;
      u.order = "hold"; u.wanderT = 30;
    }
    return true;
  }
  u.wanderT -= dt;
  const retaliate = g.state.units.find(e => e.hp > 0 && e.team !== 3 &&
    (e.target === u || e.target === camp) && Math.hypot(e.x - u.x, e.z - u.z) < 20);
  if (retaliate) {u.target = retaliate; u.order = "attack"; g.combatAI(u, dt); return true;}
  const roaming = g.state.time >= 300 && g.state.conflict !== "quiet";
  const sight = g.isNight() ? 12 : 22;
  if (roaming && u.wanderT <= 0) {
    const victim = g.state.units.find(e => e.team !== 3 && e.hp > 0 && e.carry > 0 && e.carryType &&
      Math.hypot(e.x - u.x, e.z - u.z) < sight && Math.hypot(e.x - camp.x, e.z - camp.z) < 65);
    if (victim) {
      u.tx = victim.x; u.tz = victim.z; u.order = "move";
      if (Math.hypot(u.x - victim.x, u.z - victim.z) > 2) g.steer(u, dt);
      else {
        const stolen = Math.min(4, victim.carry);
        victim.carry -= stolen;
        u.carry = stolen; u.carryType = victim.carryType;
        if (victim.carry === 0) victim.carryType = null;
        if (victim.team === 0) g.banner(`A raider stole ${stolen} goods from a carrier — escort the route or clear the camp`, 5);
      }
      return true;
    }
    const store = g.state.buildings.find(b => b.team !== 3 && g.finished(b) && b.type === "warehouse" &&
      Math.hypot(b.x - u.x, b.z - u.z) < sight && Math.hypot(b.x - camp.x, b.z - camp.z) < 65 && g.tribe(b.team).food >= 4);
    if (store) {
      u.tx = store.x; u.tz = store.z; u.order = "move";
      if (Math.hypot(u.x - store.x, u.z - store.z) > 5) g.steer(u, dt);
      else {
        g.tribe(store.team).food -= 4; u.carry = 4; u.carryType = "food";
        if (store.team === 0) g.banner("Raiders stole food from a storehouse — defend it or clear their camp", 5);
      }
      return true;
    }
  }
  // Local patrols inspect routes rather than knowing where distant stores or traders are.
  if (u.wanderT <= 0) {
    const angle = (g.state.time / 11 + u.id) % (Math.PI * 2), radius = roaming ? 24 : 8;
    u.tx = camp.x + Math.cos(angle) * radius; u.tz = camp.z + Math.sin(angle) * radius;
    u.wanderT = 5; u.order = "move";
  }
  if (u.order === "move" && g.steer(u, dt)) u.order = "hold";
  return true;
}
