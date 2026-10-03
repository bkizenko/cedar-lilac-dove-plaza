import type { Game } from "./sim";
import type { Unit } from "./types";
import { isDependent, reserveSeconds } from "./settlement";
import { soilQuality } from "./ecology";
export function lifeEvent(g: Game, team: number, text: string, x?: number, z?: number) {
  const history = (g.state.lifeHistory ??= []);
  history.push({ team, text, time: g.state.time });
  if (history.length > 256) history.shift();
  if (team === 0 || (x !== undefined && z !== undefined && g.visibleAt(x, z))) g.banner(text, 4);
}
function settlementSite(g: Game, u: Unit, expanding: boolean) {
  let best: { x: number; z: number } | null = null,
    score = -Infinity;
  for (let ring = 1; ring <= 4; ring++)
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8 + u.id,
        r = (expanding ? 90 : 25) + ring * 16,
        x = u.x + Math.sin(angle) * r,
        z = u.z + Math.cos(angle) * r;
      const spot = g.findOpenSpot(x, z, "townhall", u.team);
      if (!spot || g.height(spot.x, spot.z) < g.world.waterY + 0.6) continue;
      if (
        g.state.buildings.some(
          (b) => b.hp > 0 && b.type === "townhall" && Math.hypot(b.x - spot.x, b.z - spot.z) < 75,
        )
      )
        continue;
      const food = g.state.forage.filter(
        (n) => n.amount > 0 && Math.hypot(n.x - spot.x, n.z - spot.z) < 40,
      ).length;
      const wood = g.state.trees.filter(
        (n) => n.amount > 0 && Math.hypot(n.x - spot.x, n.z - spot.z) < 40,
      ).length;
      if (!food || wood < 2) continue;
      const value = food * 2 + wood + soilQuality(g, spot.x, spot.z) * 8 - ring;
      if (value > score) {
        score = value;
        best = spot;
      }
    }
  return best;
}
export function tickCommunities(g: Game, dt: number) {
  g.state.communityTimer = (g.state.communityTimer ?? 30) - dt;
  if (g.state.communityTimer > 0) return;
  g.state.communityTimer = 30;
  const records = (g.state.communities ??= []);
  for (const hall of g.state.buildings.filter((b) => b.type === "townhall" && b.team < 3)) {
    let record = records.find((c) => c.hall === hall.id);
    if (!record) {
      record = {
        hall: hall.id,
        team: hall.team,
        name: g.tribe(hall.team).name + " hearth",
        founded: g.state.time,
        emptySince: null,
        status: "growing",
      };
      records.push(record);
    }
    for (const u of g.state.units.filter((u) => u.team === hall.team && u.hp > 0))
      if (u.homeHall === undefined)
        u.homeHall = g.state.buildings
          .filter((b) => b.team === u.team && b.type === "townhall" && b.hp > 0)
          .sort(
            (a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
          )[0]?.id;
    const residents = g.state.units.filter((u) => u.hp > 0 && u.homeHall === hall.id).length;
    if (hall.hp <= 0) {
      if (record.status !== "abandoned")
        lifeEvent(
          g,
          hall.team,
          record.name + " fell; its surviving people may rebuild",
          hall.x,
          hall.z,
        );
      record.status = "abandoned";
      continue;
    }
    if (!residents) {
      record.emptySince ??= g.state.time;
      if (g.state.time - record.emptySince >= 600) {
        hall.hp = 0;
        record.status = "abandoned";
        g.state.walkDirty = true;
        lifeEvent(g, hall.team, record.name + " was abandoned", hall.x, hall.z);
      }
    } else {
      record.emptySince = null;
      record.status =
        reserveSeconds(g, hall.team) < 90 ? "struggling" : residents >= 8 ? "thriving" : "growing";
    }
  }
  for (const t of g.state.tribes) {
    if (t.id === 3) continue;
    const halls = g.state.buildings.filter(
      (b) => b.team === t.id && b.type === "townhall" && b.hp > 0,
    );
    const survivors = g.state.units.filter(
      (u) => u.team === t.id && u.hp > 0 && u.type === "worker" && !isDependent(g, u),
    );
    if (!survivors.length || g.state.units.some((u) => u.team === t.id && u.foundingJourney))
      continue;
    const expansion = halls.length > 0;
    if (
      expansion &&
      (t.id === 0 ||
        halls.length >= 5 ||
        g.popNow(t.id) < 12 ||
        reserveSeconds(g, t.id) < 600 ||
        t.wood < 100 ||
        g.state.time - (t.lastSettlement || 0) < 1800)
    )
      continue;
    if (t.wood < 20) continue;
    const crew = survivors
      .filter(
        (u) =>
          u.carry === 0 &&
          !u.visit &&
          !u.scout &&
          !u.envoy &&
          !u.expedition &&
          !u.recalled &&
          !u.emergency,
      )
      .slice(0, 3);
    if (!crew.length) continue;
    const site = settlementSite(g, crew[0], expansion);
    if (!site) continue;
    t.wood -= 20;
    t.lastSettlement = g.state.time;
    for (let i = 0; i < crew.length; i++) {
      const u = crew[i];
      u.foundingJourney = { ...site, leader: i === 0 };
      u.order = "move";
      u.node = null;
      u.target = null;
      u.tx = site.x;
      u.tz = site.z;
      u.stuckT = 0;
      if (i === 0) {
        u.carry = 20;
        u.carryType = "wood";
      }
    }
    lifeEvent(
      g,
      t.id,
      expansion
        ? t.name + " sends families to a new hearth"
        : t.name + " survivors set out to rebuild",
      crew[0].x,
      crew[0].z,
    );
  }
}
export function foundingJourneyAI(g: Game, u: Unit, dt: number) {
  const mission = u.foundingJourney;
  if (!mission) return false;
  if (u.stuckT > 16) {
    u.foundingJourney = undefined;
    u.order = u.carry > 0 ? "return" : "idle";
    return true;
  }
  let hall = g.state.buildings.find(
    (b) =>
      b.team === u.team &&
      b.type === "townhall" &&
      b.hp > 0 &&
      Math.hypot(b.x - mission.x, b.z - mission.z) < 12,
  );
  const reach = hall ? Math.max(hall.w, hall.d) * 0.55 + 2 : 10;
  if (Math.hypot(u.x - mission.x, u.z - mission.z) > reach) {
    u.tx = mission.x;
    u.tz = mission.z;
    u.workReason = "Traveling to establish a new hearth";
    g.steer(u, dt);
    return true;
  }
  if (!hall) {
    if (!mission.leader) return true;
    if (u.carryType !== "wood" || u.carry < 20) {
      u.foundingJourney = undefined;
      u.order = "idle";
      return true;
    }
    u.carry -= 20;
    if (u.carry === 0) u.carryType = null;
    hall = g.makeBld("townhall", mission.x, mission.z, u.team);
    hall.build = 0;
    hall.hp = Math.floor(hall.maxHp * 0.14);
    g.state.buildings.push(hall);
    g.state.walkDirty = true;
    g.tribe(u.team).alive = true;
    lifeEvent(g, u.team, g.tribe(u.team).name + " began raising a new settlement", hall.x, hall.z);
  }
  u.homeHall = hall.id;
  u.foundingJourney = undefined;
  u.node = hall;
  u.order = "build";
  u.tx = hall.x;
  u.tz = hall.z;
  return true;
}
