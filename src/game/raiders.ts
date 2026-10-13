import type { Game } from "./sim";
import type { Unit, Building, ResourceNode } from "./types";
import { foodDemand } from "./settlement";
import { receiveFood } from "./pantry";
import { applyForagePressure } from "./ecology";
import { mulberry32 } from "./rng";
import { findPath } from "./navigation";
import { MAP, HALF } from "./constants";

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
      g.tribe(3).food += 60; // Enough to reach the opening grace; later supplies must be gathered or stolen.
      for (let i = 0; i < 2; i++) {
        const angle = i * Math.PI, spot = { x: x + Math.cos(angle) * 6, z: z + Math.sin(angle) * 6 };
        for (let j = 0; j < 16; j++) {
          const a = angle + j * Math.PI / 8, sx = x + Math.cos(a) * 6, sz = z + Math.sin(a) * 6;
          if (g.walkable(sx, sz) && g.workBoard.connected(g, x, z, sx, sz)) { spot.x = sx; spot.z = sz; break; }
        }
        const raider = g.spawnUnit("spearman", spot.x, spot.z, 3);
        raider.homeCamp = camp.id;
        raider.order = "hold";
        raider.workReason = "Watching paths near the raider camp";
      }
      break;
    }
  }
}
/** Permanent land guards must not suppress arrivals from the sea forever. */
export function canScheduleSeaRaid(g: Game) {
  return g.state.conflict !== "quiet" &&
    g.state.time >= (g.state.conflict === "dangerous" ? 600 : 1200) &&
    g.popNow(0) > 0 &&
    !g.state.units.some(u => u.team === 3 && u.hp > 0 && u.homeCamp === undefined);
}

/** Land at a real shore connected to the player's landmass, never in deep water.
 * The landing is kept outside the village; its inhabitants still have time to react. */
export function findRaiderLanding(g: Game) {
  if (g.state.walkDirty) g.rebuildWalk();
  const home = g.campOf(0), preferred = Math.atan2(home.z, home.x);
  const width = Math.sqrt(g.walk.length), cell = MAP / width;
  const index = (x: number, z: number) => Math.floor((z + HALF) / cell) * width + Math.floor((x + HALF) / cell);
  const goals: {x:number;z:number}[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8, x = home.x + Math.cos(angle) * 9, z = home.z + Math.sin(angle) * 9;
    if (g.walkable(x, z)) goals.push({x,z});
  }
  if (!goals.length) return null;
  for (let sweep = 0; sweep < 32; sweep++) {
    const offset = Math.ceil(sweep / 2) * Math.PI / 16 * (sweep % 2 ? 1 : -1);
    const angle = preferred + offset;
    for (let radius = g.world.islandR * 1.25; radius > 24; radius -= 6) {
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.hypot(x - home.x, z - home.z) < 80 || !g.walkable(x, z)) continue;
      let shore = false;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (g.height(x + Math.cos(a) * 10, z + Math.sin(a) * 10) < g.world.waterY) { shore = true; break; }
      }
      if (!shore || !g.workBoard.connected(g, home.x, home.z, x, z)) continue;
      const goal = goals.slice().sort((a,b) => Math.hypot(a.x-x,a.z-z) - Math.hypot(b.x-x,b.z-z))[0];
      // Component membership alone is insufficient: the runtime pathfinder has
      // a finite search budget. Reject a landing whose journey exceeds it.
      if (findPath(g.walk, width, index(x,z), index(goal.x,goal.z))) return { x, z };
    }
  }
  return null;
}

function localForage(g: Game, u: Unit, camp: Building, dt: number) {
  let node = u.node && "kind" in u.node && u.node.kind === "forage" ? u.node as ResourceNode : null;
  if (node && (node.amount < 1 || u.stuckT > 6)) {
    u.blockedTask = node.id; u.retryWorkAt = g.state.time + 30;
    u.node = null; node = null; u.gatherT = 0;
  }
  if (!node && g.tribe(3).food >= Math.max(24, foodDemand(g, 3) * 180)) return false;
  if (!node) {
    const candidates = g.state.forage.filter(n => n.amount >= 1 &&
      Math.hypot(n.x - camp.x, n.z - camp.z) < 55 &&
      (Math.hypot(n.x - camp.x, n.z - camp.z) < 22 || Math.hypot(n.x - u.x, n.z - u.z) < 22) &&
      !(u.blockedTask === n.id && (u.retryWorkAt || 0) > g.state.time) &&
      !g.state.units.some(other => other !== u && other.hp > 0 && other.homeCamp !== undefined && other.node === n));
    candidates.sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z));
    node = candidates.find(n => g.walkable(n.x, n.z) && g.workBoard.connected(g, u.x, u.z, n.x, n.z)) || null;
    if (!node) return false;
    u.node = node; u.gatherT = 0; u.stuckT = 0;
  }
  u.target = null; u.order = "gather"; u.tx = node.x; u.tz = node.z;
  u.workReason = "Gathering food for the raider camp";
  if (Math.hypot(u.x - node.x, u.z - node.z) > 1.8) g.steer(u, dt);
  else {
    u.gatherT += dt;
    if (u.gatherT >= 8) {
      const amount = Math.min(5, Math.floor(node.amount));
      node.amount -= amount; applyForagePressure(node, amount);
      node.regenT = node.amount <= 0 ? 240 + (node.pressure || 0) * 900 : 0;
      u.carry = amount; u.carryType = "food"; u.carryFood = node.cropCandidate || "berries";
      u.node = null; u.gatherT = 0; u.order = "return";
    }
  }
  return true;
}

export function campRaidAI(g: Game, u: Unit, dt: number) {
  if (u.homeCamp === undefined) return false;
  const camp = g.state.buildings.find(b => b.id === u.homeCamp && b.raiderCamp && b.hp > 0);
  if (!camp) {
    u.order = "hold"; u.target = null; u.node = null;
    u.workReason = "Camp destroyed — the surviving band is scattered";
    return true;
  }
  const retaliate = g.state.units.find(e => e.hp > 0 && e.team !== 3 &&
    (e.target === u || e.target === camp) && Math.hypot(e.x - u.x, e.z - u.z) < 20);
  if (retaliate) {u.target = retaliate; u.order = "attack"; g.combatAI(u, dt); return true;}
  if (u.carry > 0 && u.carryType) {
    u.tx = camp.x; u.tz = camp.z; u.order = "return";
    u.workReason = "Carrying supplies to the raider camp";
    if (!g.buildingWorkReached(u, camp)) g.steer(u, dt);
    else {
      if (u.carryType === "food") receiveFood(g, 3, u.carry, u.carryFood);
      else g.tribe(3)[u.carryType] += u.carry;
      u.carry = 0; u.carryType = null; u.carryFood = undefined; u.target = null; u.node = null;
      u.order = "hold"; u.wanderT = 5;
    }
    return true;
  }
  u.wanderT -= dt;
  const roaming = g.state.time >= 300 && g.state.conflict !== "quiet";
  const sight = g.isNight() ? 12 : 22;
  if (roaming) {
    const victim = g.state.units.find(e => e.team !== 3 && e.hp > 0 && e.carry > 0 && e.carryType &&
      Math.hypot(e.x - u.x, e.z - u.z) < sight && Math.hypot(e.x - camp.x, e.z - camp.z) < 65);
    if (victim) {
      u.tx = victim.x; u.tz = victim.z; u.order = "move"; u.node = null;
      u.workReason = "Intercepting an unguarded carrier";
      if (Math.hypot(u.x - victim.x, u.z - victim.z) > 2) g.steer(u, dt);
      else {
        const stolen = Math.min(4, victim.carry);
        victim.carry -= stolen;
        u.carry = stolen; u.carryType = victim.carryType; u.carryFood = victim.carryFood;
        if (victim.carry === 0) { victim.carryType = null; victim.carryFood = undefined; }
        if (victim.team === 0) g.banner(`A raider stole ${stolen} goods from a carrier — escort the route or clear the camp`, 5);
      }
      return true;
    }
    const store = g.state.buildings.find(b => b.team !== 3 && g.finished(b) && b.type === "warehouse" &&
      Math.hypot(b.x - u.x, b.z - u.z) < sight && Math.hypot(b.x - camp.x, b.z - camp.z) < 65 && g.tribe(b.team).food >= 4);
    if (store) {
      u.tx = store.x; u.tz = store.z; u.order = "move"; u.node = null;
      if (!g.buildingWorkReached(u, store)) g.steer(u, dt);
      else {
        g.tribe(store.team).food -= 4; u.carry = 4; u.carryType = "food"; u.carryFood = "provisions";
        if (store.team === 0) g.banner("Raiders stole food from a storehouse — defend it or clear their camp", 5);
      }
      return true;
    }
  }
  if (localForage(g, u, camp, dt)) return true;
  // Finish each leg before choosing another. The old five-second redirect kept
  // distant patrols circling in place and regularly selected water/cliffs.
  if (u.order === "move" && u.stuckT <= 6) {
    if (g.steer(u, dt)) {u.order = "hold"; u.wanderT = 5;}
    return true;
  }
  if (u.wanderT <= 0 || u.stuckT > 6) {
    const radius = roaming ? 28 + ((Math.floor(g.state.time / 90) + u.id) % 3) * 14 : 8;
    const base = (g.state.time / 11 + u.id) % (Math.PI * 2);
    for (let i = 0; i < 12; i++) {
      const angle = base + i * Math.PI / 6;
      const x = camp.x + Math.cos(angle) * radius, z = camp.z + Math.sin(angle) * radius;
      if (!g.walkable(x, z) || !g.workBoard.connected(g, u.x, u.z, x, z)) continue;
      u.tx = x; u.tz = z; u.order = "move"; u.stuckT = 0;
      u.workReason = roaming ? "Patrolling nearby paths for supply carriers" : "Watching paths near the raider camp";
      g.steer(u, dt); return true;
    }
    u.order = "hold"; u.wanderT = 5;
  }
  return true;
}
