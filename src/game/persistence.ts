import { Game } from "./sim";
import { FOW, SAVE_VERSION, BUILDINGS, UNITS } from "./constants";
import type { GameState, Unit, Building, ResourceNode, Critter } from "./types";
type Entity = Unit | Building | ResourceNode | Critter;
const key = (e: Entity | null) => (e ? `${"kind" in e ? e.kind : "critter"}:${e.id}` : null);
export function encodeGame(g: Game) {
  const s = g.state;
  return {
    version: SAVE_VERSION,
    state: {
      ...s,
      selBld: null,
      placing: null,
      pendingAge: false,
      particles: [],
      floaters: [],
      units: s.units.map((u) => ({
        ...u,
        selected: false,
        node: key(u.node),
        target: key(u.target),
      })),
      buildings: s.buildings.map((b) => ({ ...b, selected: false })),
      projectiles: s.projectiles.map((p) => ({ ...p, target: key(p.target) })),
    },
    vision: Array.from(g.vision),
    visAge: Array.from(g.visAge),
    looted: [...g.looted],
    seaT: g.seaT,
    calamityT: g.calamityT,
    tradeTeam: g.tradeTeam,
  };
}
function fail(): never {
  throw new Error("Save is damaged or incompatible. The current village was not changed.");
}
function obj(x: unknown): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function num(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function numbers(x: Record<string, any>, fields: string[]) {
  for (const f of fields) if (!num(x[f])) fail();
}
export function decodeGame(raw: unknown): Game {
  if (!obj(raw) || raw.version !== SAVE_VERSION || !obj(raw.state)) fail();
  const d = JSON.parse(JSON.stringify(raw)),
    s = d.state,
    g = new Game();
  for (const [name, v] of Object.entries(g.blank())) {
    if (!(name in s)) fail();
    if (typeof v === "number" && !num(s[name])) fail();
    if (typeof v === "string" && typeof s[name] !== "string") fail();
    if (typeof v === "boolean" && typeof s[name] !== "boolean") fail();
    if (Array.isArray(v) && (!Array.isArray(s[name]) || s[name].length > 20000)) fail();
  }
  if (!Number.isInteger(s.seed) || !Number.isInteger(s.nextId) || s.nextId < 1 || s.time < 0)
    fail();
  if (
    !["clear", "mist", "rain", "storm", "frost", "golden", "flood", "drought"].includes(
      s.weather,
    ) ||
    ![null, "win", "lose"].includes(s.ended)
  )
    fail();
  if (
    !["none", "herd"].includes(s.event) ||
    !["food", "wood", "stone", "copper", "iron"].includes(s.richRes)
  )
    fail();
  if (
    s.agePicks.some((p: unknown) => p !== "econ" && p !== "army") ||
    s.tribes.length < 4 ||
    s.tribes.length > 16
  )
    fail();
  for (const [i, t] of s.tribes.entries()) {
    if (!obj(t) || t.id !== i || typeof t.name !== "string") fail();
    numbers(t, [
      "food",
      "wood",
      "stone",
      "copper",
      "iron",
      "age",
      "aggro",
      "expand",
      "tech",
      "lastRaid",
      "thinkT",
      "tradeCd",
      "tension",
      "tensionBand",
      "spears",
      "bows",
      "blades",
      "fallenT",
    ]);
    if (!Number.isInteger(t.age) || t.age < 0 || t.age > 5) fail();
  }
  if (s.growthPolicy !== undefined && !["stable", "welcome"].includes(s.growthPolicy)) fail();
  if (s.laborPolicy !== undefined && !["balanced", "food", "build"].includes(s.laborPolicy)) fail();
  if (s.conflict !== undefined && !["quiet", "balanced", "dangerous"].includes(s.conflict)) fail();
  for (const t of s.tribes) {
    if (t.trust !== undefined && (!num(t.trust) || t.trust < 0 || t.trust > 1)) fail();
    if (t.recoveryUntil !== undefined && !num(t.recoveryUntil)) fail();
    if (t.compactUntil !== undefined && !num(t.compactUntil)) fail();
  }
  const refs = new Map<string, Entity>();
  const add = (e: any, kind?: string) => {
    if (!obj(e)) fail();
    numbers(e, ["id", "x", "y", "z"]);
    if (
      !Number.isInteger(e.id) ||
      Math.abs(e.x) > 1000 ||
      Math.abs(e.z) > 1000 ||
      (kind && e.kind !== kind)
    )
      fail();
    const k = key(e as Entity)!;
    if (refs.has(k)) fail();
    refs.set(k, e as Entity);
  };
  for (const u of s.units) {
    add(u, "unit");
    if (u.maturesAt !== undefined && (!num(u.maturesAt) || u.maturesAt < 0)) fail();
    if (u.emergency !== undefined) {
      if (
        !obj(u.emergency) ||
        !num(u.emergency.until) ||
        typeof u.emergency.autoArmed !== "boolean" ||
        typeof u.emergency.jobLock !== "boolean" ||
        ![null, "food", "wood", "stone", "copper", "iron"].includes(u.emergency.job)
      )
        fail();
    }
    if (u.workCheckAt !== undefined && !num(u.workCheckAt)) fail();
    if (u.retryWorkAt !== undefined && !num(u.retryWorkAt)) fail();
    if (u.blockedTask !== undefined && !num(u.blockedTask)) fail();
    if (!(u.type in UNITS) || !Number.isInteger(u.team) || !s.tribes[u.team]) fail();
    numbers(u, [
      "hp",
      "maxHp",
      "speed",
      "range",
      "dmg",
      "rof",
      "cd",
      "r",
      "vx",
      "vz",
      "facing",
      "tx",
      "tz",
      "gatherT",
      "carry",
      "wanderT",
      "aggroT",
      "stride",
      "tradeTeam",
      "ageT",
      "stuckT",
      "pillage",
      "stature",
      "tint",
    ]);
    if (
      ![
        "idle",
        "move",
        "gather",
        "return",
        "attack",
        "attackmove",
        "hold",
        "trade",
        "explore",
        "build",
      ].includes(u.order)
    )
      fail();
    for (const f of ["node", "target"]) if (u[f] !== null && typeof u[f] !== "string") fail();
    if (u.attackDestination != null) {
      if (!obj(u.attackDestination)) fail();
      numbers(u.attackDestination, ["x", "z"]);
    }
  }
  for (const b of s.buildings) {
    add(b, "building");
    if (b.fertility !== undefined && (!num(b.fertility) || b.fertility < 0.5 || b.fertility > 1))
      fail();
    if (b.fallowYear !== undefined && (!Number.isInteger(b.fallowYear) || b.fallowYear < 0)) fail();
    if (b.crop !== undefined) {
      if (!obj(b.crop)) fail();
      numbers(b.crop, ["year", "planted", "tended", "remaining"]);
      if (
        b.crop.planted < 0 ||
        b.crop.planted > 1 ||
        b.crop.tended < 0 ||
        b.crop.tended > 1 ||
        b.crop.remaining < 0 ||
        typeof b.crop.ripened !== "boolean"
      )
        fail();
    }
    if (!(b.type in BUILDINGS) || !s.tribes[b.team] || !Array.isArray(b.queue)) fail();
    numbers(b, ["hp", "maxHp", "w", "d", "cd", "build"]);
    if (b.build < 0 || b.build > 1) fail();
    for (const q of b.queue) {
      if (!obj(q) || !(q.unit in UNITS)) fail();
      numbers(q, ["t", "max"]);
    }
    if (b.rally !== null) {
      if (!obj(b.rally)) fail();
      numbers(b.rally, ["x", "z"]);
    }
  }
  for (const list of ["trees", "stones", "forage", "fish", "copper", "iron"])
    for (const n of s[list]) {
      add(n);
      numbers(n, ["amount", "maxAmt", "regenT", "scale", "rich"]);
      if (!["tree", "stone", "forage", "farm", "fish", "copper", "iron"].includes(n.kind)) fail();
    }
  for (const c of s.wildlife) {
    add(c);
    numbers(c, ["hp", "maxHp", "facing", "vx", "vz", "wanderT", "fly", "scale"]);
    if (!["deer", "boar", "goat", "bird"].includes(c.species)) fail();
  }
  for (const r of s.routes) {
    if (!obj(r)) fail();
    numbers(r, ["id", "team", "giveAmt", "getAmt", "interval", "t"]);
    if (r.paused !== undefined && typeof r.paused !== "boolean") fail();
    if (r.workerId !== undefined && !Number.isInteger(r.workerId)) fail();
    if (r.status !== undefined && typeof r.status !== "string") fail();
    if (
      !["food", "wood", "stone", "copper", "iron"].includes(r.give) ||
      !["food", "wood", "stone", "copper", "iron"].includes(r.get)
    )
      fail();
  }
  for (const r of s.regions) {
    if (!obj(r)) fail();
    numbers(r, ["id", "x", "z", "r", "owner", "cluster"]);
  }
  for (const deal of [
    ...s.deals,
    ...(s.routeOffer ? [s.routeOffer] : []),
    ...s.units.flatMap((u: any) => (u.trade ? [u.trade] : [])),
  ]) {
    if (!obj(deal)) fail();
    numbers(deal, ["giveAmt", "getAmt"]);
    if (
      !["food", "wood", "stone", "copper", "iron"].includes(deal.give) ||
      !["food", "wood", "stone", "copper", "iron"].includes(deal.get)
    )
      fail();
  }
  if (
    !Array.isArray(d.vision) ||
    d.vision.length !== FOW * FOW ||
    d.vision.some((n: unknown) => n !== 0 && n !== 1 && n !== 2)
  )
    fail();
  if (
    !Array.isArray(d.visAge) ||
    d.visAge.length !== FOW * FOW ||
    d.visAge.some((n: unknown) => !num(n))
  )
    fail();
  if (!Array.isArray(d.looted) || d.looted.some((n: unknown) => !num(n))) fail();
  numbers(d, ["seaT", "calamityT", "tradeTeam"]);
  if (!s.tribes[d.tradeTeam]) fail();
  const resolve = (id: unknown) => (typeof id === "string" ? refs.get(id) || null : null);
  for (const u of s.units) {
    // Earlier v17 caravans reserved goods without representing their cargo.
    if (u.order === "trade" && u.trade && u.carry === 0) {
      u.carry = u.trade.giveAmt;
      u.carryType = u.trade.give;
    }
    u.node = resolve(u.node);
    u.target = resolve(u.target);
    u.selected = false;
    if (u.target && (!("kind" in u.target) || !["unit", "building"].includes(u.target.kind)))
      fail();
  }
  for (const p of s.projectiles) {
    if (!obj(p)) fail();
    numbers(p, ["x", "y", "z", "tx", "ty", "tz", "speed", "life", "dmg", "team"]);
    p.target = resolve(p.target);
  }
  g.reset(s.seed);
  g.state = {
    ...s,
    selBld: null,
    placing: null,
    pendingAge: false,
    paused: true,
    walkDirty: true,
    particles: [],
    floaters: [],
  } as GameState;
  g.vision.set(d.vision);
  g.visAge.set(d.visAge);
  g.looted = new Set(d.looted);
  g.seaT = d.seaT;
  g.calamityT = d.calamityT;
  g.tradeTeam = d.tradeTeam;
  g.started = true;
  g.awaitingStart = false;
  g.rebuildWalk();
  return g;
}
