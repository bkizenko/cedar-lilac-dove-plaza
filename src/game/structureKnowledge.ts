import type { Game } from "./sim";
import type { Building, GameState, Unit } from "./types";
import { BUILDINGS } from "./constants";
import { tradeIntelHomeReached } from "./tradeIntelHome";
import { isDependent } from "./settlement";

export const STRUCTURE_KNOWLEDGE_RULES = {
  version: 1,
  reviewSeconds: 2,
  sightMeters: 26,
  maximumShared: 1024,
  maximumCarried: 64,
} as const;
type Site = Pick<Building, "id" | "type" | "team" | "x" | "y" | "z" | "w" | "d" | "hp" | "maxHp">;
export type StructureReport = {
  version: 1;
  observer: number;
  witnessId: number;
  observedAt: number;
  receivedAt?: number;
  active: boolean;
  site: Site;
  defenders: number;
  defensePower: number;
};
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const free = (u: Unit) => u.hp > 0 && (!u.prisoner || u.prisoner.phase === "released");
const reviews = new WeakMap<Game, { state: GameState; time: number }>();
const key = (p: StructureReport) => `${p.observer}:${p.site.id}`;
function remember(list: StructureReport[], fact: StructureReport, cap: number) {
  const at = list.findIndex((p) => key(p) === key(fact));
  if (at >= 0) {
    if (list[at].observedAt <= fact.observedAt) list[at] = fact;
    return;
  }
  if (list.length >= cap) {
    let oldest = 0;
    for (let i = 1; i < list.length; i++)
      if (list[i].observedAt < list[oldest].observedAt) oldest = i;
    list.splice(oldest, 1);
  }
  list.push(fact);
}
/** Geography is not a report about later structures. NPC reports stay on the
 * observing body until that same body reaches its own real supply entrance. */
export function tickStructureKnowledge(g: Game, force = false) {
  const last = reviews.get(g);
  if (
    !force &&
    last?.state === g.state &&
    g.state.time >= last.time &&
    g.state.time - last.time < STRUCTURE_KNOWLEDGE_RULES.reviewSeconds
  )
    return;
  reviews.set(g, { state: g.state, time: g.state.time });
  const size = STRUCTURE_KNOWLEDGE_RULES.sightMeters,
    cell = (x: number, z: number) => `${Math.floor(x / size)},${Math.floor(z / size)}`;
  const buildings = new Map<string, Building[]>(),
    people = new Map<string, Unit[]>(),
    byId = new Map<number, Building>();
  for (const b of g.state.buildings) {
    byId.set(b.id, b);
    if (!g.finished(b)) continue;
    const k = cell(b.x, b.z),
      list = buildings.get(k) || [];
    list.push(b);
    buildings.set(k, list);
  }
  for (const u of g.state.units)
    if (free(u)) {
      const k = cell(u.x, u.z),
        list = people.get(k) || [];
      list.push(u);
      people.set(k, list);
    }
  const shared = g.state.structureReports || [],
    memories = new Map<string, StructureReport[]>();
  for (const p of shared)
    if (p.active) {
      const k = cell(p.site.x, p.site.z),
        list = memories.get(k) || [];
      list.push(p);
      memories.set(k, list);
    }
  for (const u of g.state.units) {
    if (!free(u) || u.team === 3) continue;
    const seen: Building[] = [],
      local: Unit[] = [],
      nearbyMemories: StructureReport[] = [];
    const cx = Math.floor(u.x / size),
      cz = Math.floor(u.z / size);
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let z = cz - 1; z <= cz + 1; z++) {
        nearbyMemories.push(...(memories.get(`${x},${z}`) || []));
        for (const b of buildings.get(`${x},${z}`) || [])
          if (b.team !== u.team && b.team !== 3 && distance(u, b) <= size) seen.push(b);
        for (const p of people.get(`${x},${z}`) || []) if (distance(u, p) <= size) local.push(p);
      }
    const cargo = u.structureReportCargo || [];
    for (const old of [...nearbyMemories, ...cargo]) {
      if (old.observer !== u.team || !old.active || distance(u, old.site) > size) continue;
      const b = byId.get(old.site.id);
      if (
        b &&
        g.finished(b) &&
        b.team === old.site.team &&
        b.x === old.site.x &&
        b.z === old.site.z
      )
        continue;
      remember(
        cargo,
        { ...old, receivedAt: undefined, witnessId: u.id, observedAt: g.state.time, active: false },
        STRUCTURE_KNOWLEDGE_RULES.maximumCarried,
      );
    }
    for (const b of seen) {
      const defenders = local.filter(
          (p) => p.team === b.team && !isDependent(g, p) && distance(p, b) < 55,
        ),
        strength = defenders.reduce(
          (n, p) =>
            n +
            Math.max(0.2, p.dmg / 10) *
              Math.min(1, p.hp / Math.max(1, p.maxHp)) *
              (p.militia || !["worker", "leader"].includes(p.type) ? 1 : 0.3),
          0,
        ),
        forts = seen.filter(
          (p) =>
            p.team === b.team &&
            ["watchtower", "keep", "barracks"].includes(p.type) &&
            distance(p, b) < 35,
        ).length;
      const site: Site = {
        id: b.id,
        type: b.type,
        team: b.team,
        x: b.x,
        y: b.y,
        z: b.z,
        w: b.w,
        d: b.d,
        hp: b.hp,
        maxHp: b.maxHp,
      };
      remember(
        cargo,
        {
          version: 1,
          observer: u.team,
          witnessId: u.id,
          observedAt: g.state.time,
          active: true,
          site,
          defenders: defenders.length,
          defensePower: strength + forts * 2,
        },
        STRUCTURE_KNOWLEDGE_RULES.maximumCarried,
      );
    }
    if (cargo.length) u.structureReportCargo = cargo;
    if (cargo.length && (u.team === 0 || tradeIntelHomeReached(g, u))) {
      const reports = (g.state.structureReports ??= []);
      for (const fact of cargo)
        if (fact.observer === u.team)
          remember(
            reports,
            { ...fact, receivedAt: g.state.time, site: { ...fact.site } },
            STRUCTURE_KNOWLEDGE_RULES.maximumShared,
          );
      u.structureReportCargo = undefined;
    }
  }
}
export function knownStructures(g: Game, observer: number, owner?: number) {
  tickStructureKnowledge(g);
  return (g.state.structureReports || []).filter(
    (p) => p.observer === observer && p.active && (owner === undefined || p.site.team === owner),
  );
}
/** An inert dated target for planning only. Never pass this object to combat. */
export function rememberedStructure(p: StructureReport): Building {
  return {
    ...p.site,
    kind: "building",
    selected: false,
    queue: [],
    rally: null,
    cd: 0,
    build: 1,
    reclaimed: false,
  };
}
export function validStructureKnowledge(s: GameState) {
  const num = (n: unknown, min: number, max: number) =>
      typeof n === "number" && Number.isFinite(n) && n >= min && n <= max,
    id = (n: unknown) => Number.isSafeInteger(n) && num(n, 1, s.nextId - 1),
    team = (n: unknown) => Number.isInteger(n) && Number(n) !== 3 && !!s.tribes[Number(n)],
    keys = (o: object, allowed: string[]) => Object.keys(o).every((k) => allowed.includes(k)),
    half = (s.worldOptions?.size || 1040) / 2 + 32;
  const valid = (p: StructureReport, shared: boolean) =>
    !!p &&
    keys(p, [
      "version",
      "observer",
      "witnessId",
      "observedAt",
      "receivedAt",
      "active",
      "site",
      "defenders",
      "defensePower",
    ]) &&
    p.version === 1 &&
    team(p.observer) &&
    id(p.witnessId) &&
    num(p.observedAt, 0, s.time) &&
    (shared ? num(p.receivedAt, p.observedAt, s.time) : p.receivedAt === undefined) &&
    typeof p.active === "boolean" &&
    Number.isInteger(p.defenders) &&
    num(p.defenders, 0, 10000) &&
    num(p.defensePower, 0, 1e6) &&
    !!p.site &&
    keys(p.site, ["id", "type", "team", "x", "y", "z", "w", "d", "hp", "maxHp"]) &&
    id(p.site.id) &&
    team(p.site.team) &&
    p.site.team !== p.observer &&
    Object.hasOwn(BUILDINGS, p.site.type) &&
    [p.site.x, p.site.z].every((n) => num(n, -half, half)) &&
    num(p.site.y, -10000, 10000) &&
    [p.site.w, p.site.d].every((n) => num(n, 0.01, 1000)) &&
    num(p.site.hp, 0, p.site.maxHp) &&
    num(p.site.maxHp, 0.01, 1e9);
  const list = s.structureReports;
  if (
    list !== undefined &&
    (!Array.isArray(list) ||
      list.length > 1024 ||
      list.some((p) => !valid(p, true)) ||
      new Set(list.map(key)).size !== list.length)
  )
    return false;
  for (const u of s.units)
    if (u.structureReportCargo !== undefined) {
      const rows = u.structureReportCargo;
      if (
        !Array.isArray(rows) ||
        !rows.length ||
        rows.length > 64 ||
        rows.some((p) => !valid(p, false) || p.witnessId !== u.id) ||
        new Set(rows.map(key)).size !== rows.length
      )
        return false;
    }
  return true;
}
