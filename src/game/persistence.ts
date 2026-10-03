import { DISCOVERIES, TRADITIONS, TRADITION_COST } from "./discovery";
import { Game } from "./sim";
import { FOW, SAVE_VERSION, BUILDINGS, UNITS, HALF } from "./constants";
import type { GameState, Unit, Building, ResourceNode, Critter } from "./types";
type Entity = Unit | Building | ResourceNode | Critter;
const key = (e: Entity | null) => (e ? `${"kind" in e ? e.kind : "critter"}:${e.id}` : null);
export function encodeGame(g: Game) {
  const s = g.state;
  return {
    version: SAVE_VERSION,
    demographicVersion: 1,
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
    chopMarks: [...g.chopMarks],
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
  if(s.communityTimer!==undefined&&(!num(s.communityTimer)||s.communityTimer<0||s.communityTimer>30))fail();
  if(s.lifeHistory!==undefined){
    if(!Array.isArray(s.lifeHistory)||s.lifeHistory.length>256)fail();
    for(const e of s.lifeHistory)if(!obj(e)||![0,1,2,3].includes(e.team)||typeof e.text!=="string"||e.text.length>300||!num(e.time)||e.time<0||e.time>s.time)fail();
  }
  if(s.communities!==undefined){
    if(!Array.isArray(s.communities)||s.communities.length>20000)fail();const halls=new Set();
    for(const c of s.communities){if(!obj(c)||!Number.isSafeInteger(c.hall)||c.hall<1||halls.has(c.hall)||![0,1,2].includes(c.team)||typeof c.name!=="string"||c.name.length>200||!num(c.founded)||c.founded<0||c.founded>s.time||
      (c.emptySince!==null&&(!num(c.emptySince)||c.emptySince<0||c.emptySince>s.time))||!["growing","thriving","struggling","abandoned"].includes(c.status))fail();halls.add(c.hall);}
  }
  if(s.nightWork!==undefined&&typeof s.nightWork!=="boolean")fail();
  if(s.scoutTimer!==undefined&&(!num(s.scoutTimer)||s.scoutTimer<0||s.scoutTimer>1000))fail();
  if(s.trails!==undefined) {
    if(!Array.isArray(s.trails)||s.trails.length>8192)fail();const cells=new Set();
    for(const t of s.trails){if(!obj(t)||!Number.isSafeInteger(t.cell)||t.cell<0||t.cell>=65536||cells.has(t.cell)||
      !num(t.wear)||t.wear<0||t.wear>1||!num(t.last)||t.last<0||t.last>s.time||!num(t.angle)||Math.abs(t.angle)>Math.PI)fail();cells.add(t.cell);}
  }
  if(s.rivalKnowledge!==undefined){
    if(!Array.isArray(s.rivalKnowledge)||s.rivalKnowledge.length>2)fail();const teams=new Set();
    for(const m of s.rivalKnowledge){if(!obj(m)||![1,2].includes(m.team)||teams.has(m.team)||!Array.isArray(m.cells)||m.cells.length>1024||
      new Set(m.cells).size!==m.cells.length||m.cells.some((c:unknown)=>!Number.isSafeInteger(c)||Number(c)<0||Number(c)>=1024))fail();teams.add(m.team);}
  }
  if(s.visitorTimer!==undefined&&(!num(s.visitorTimer)||s.visitorTimer<0||s.visitorTimer>1000))fail();
  if(s.worldgenVersion!==undefined&&![1,2].includes(s.worldgenVersion))fail();
  if (s.discoveries !== undefined) {
    if (!Array.isArray(s.discoveries) || s.discoveries.length > DISCOVERIES.length) fail();
    const seen = new Set();
    for (const h of s.discoveries) {
      if (!obj(h) || !DISCOVERIES.some(d => d.id === h.id) || seen.has(h.id) ||
          !Number.isInteger(h.age) || h.age < 0 || h.age > 5 ||
          !num(h.time) || h.time < 0 || h.time > s.time) fail();
      seen.add(h.id);
    }
  }
  if (s.traditions !== undefined) {
    if (!Array.isArray(s.traditions) || s.traditions.length > TRADITIONS.length) fail();
    const kinds = new Set(), ages = new Set();
    for (const t of s.traditions) {
      if (!obj(t) || !Number.isInteger(t.age) || t.age < 0 || t.age > 5 ||
          !TRADITIONS.some(d => d.id === t.kind) || kinds.has(t.kind) || ages.has(t.age)) fail();
      kinds.add(t.kind); ages.add(t.age);
    }
    const points = (s.discoveries || []).reduce((n: number, h: {id:string}) => n + (DISCOVERIES.find(d => d.id === h.id)?.points || 0), 0);
    if (s.traditions.length * TRADITION_COST > points) fail();
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
  const validateOffers=(offers:unknown)=>{
    if(!Array.isArray(offers)||offers.length>20)fail();
    for(const d of offers)if(!obj(d)||!["food","wood","stone","copper","iron"].includes(d.give)||
      !["food","wood","stone","copper","iron"].includes(d.get)||d.give===d.get||
      !Number.isSafeInteger(d.giveAmt)||d.giveAmt<1||d.giveAmt>100||!Number.isSafeInteger(d.getAmt)||d.getAmt<1||d.getAmt>200)fail();
  };
  if(s.tradeReports!==undefined){
    if(!Array.isArray(s.tradeReports)||s.tradeReports.length>2)fail();
    const teams=new Set();for(const r of s.tradeReports){
      if(!obj(r)||![1,2].includes(r.team)||teams.has(r.team)||!num(r.time)||r.time<0||r.time>s.time)fail();
      teams.add(r.team);validateOffers(r.offers);
    }
  }
  if (s.growthPolicy !== undefined && !["stable", "welcome"].includes(s.growthPolicy)) fail();
  if (s.laborPolicy !== undefined && !["balanced", "food", "build", "wood", "stone", "hunt"].includes(s.laborPolicy)) fail();
  if (s.conflict !== undefined && !["quiet", "balanced", "dangerous"].includes(s.conflict)) fail();
  for (const t of s.tribes) {
    if(t.lastSettlement!==undefined&&(!num(t.lastSettlement)||t.lastSettlement<0||t.lastSettlement>s.time))fail();
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
    if (u.sickUntil !== undefined && !num(u.sickUntil)) fail();
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
    if(u.homeHall!==undefined&&(!Number.isSafeInteger(u.homeHall)||u.homeHall<1))fail();
    if(u.parents!==undefined&&(!Array.isArray(u.parents)||u.parents.length>2||new Set(u.parents).size!==u.parents.length||u.parents.some((id:unknown)=>!Number.isSafeInteger(id)||Number(id)<1||id===u.id)))fail();
    if(u.foundingJourney!==undefined){const m=u.foundingJourney;if(!obj(m)||!num(m.x)||!num(m.z)||Math.abs(m.x)>HALF||Math.abs(m.z)>HALF||typeof m.leader!=="boolean")fail();}
    if(u.fatigue!==undefined&&(!num(u.fatigue)||u.fatigue<0||u.fatigue>1))fail();
    if(u.expedition!==undefined){const e=u.expedition;if(!obj(e)||!num(e.food)||e.food<0||e.food>24||typeof e.returning!=="boolean"||!num(e.forage)||e.forage<0||e.forage>8.5)fail();}
    if(u.scout!==undefined&&(!obj(u.scout)||![1,2].includes(u.team)||!Number.isSafeInteger(u.scout.legs)||u.scout.legs<0||u.scout.legs>5||typeof u.scout.returning!=="boolean"))fail();
    if(u.visit!==undefined&&(!obj(u.visit)||![1,2].includes(u.team)||!["outbound","waiting","return"].includes(u.visit.phase)||!num(u.visit.wait)||u.visit.wait<0||u.visit.wait>121))fail();
    if(u.customOffer!==undefined&&typeof u.customOffer!=="boolean")fail();
    if(u.hunger!==undefined&&(!num(u.hunger)||u.hunger<0||u.hunger>1200))fail();
    if(u.recalled!==undefined&&typeof u.recalled!=="boolean")fail();
    if(u.searchJob!==undefined&&u.searchJob!=="wood")fail();
    if(u.envoy!==undefined){
      const m=u.envoy;
      if(!obj(m)||u.team!==0||![1,2].includes(m.team)||!["peace","trade","gift"].includes(m.kind)||
        !["outbound","return"].includes(m.phase)||!num(m.talk)||m.talk<0)fail();
      if(m.report!==undefined){if(!obj(m.report)||!num(m.report.time)||m.report.time<0||m.report.time>s.time)fail();validateOffers(m.report.offers);}
    }
    if (u.homeCamp !== undefined && (!Number.isSafeInteger(u.homeCamp) || u.homeCamp < 1 || u.team !== 3)) fail();
    if (u.stationOnArrival !== undefined && typeof u.stationOnArrival !== "boolean") fail();
    if (u.emergency?.resume !== undefined) {
      const r = u.emergency.resume;
      if (!obj(r) || !["move", "hold", "explore"].includes(r.order) ||
          !num(r.tx) || !num(r.tz) || typeof r.station !== "boolean") fail();
    }
    if (u.attackDestination != null) {
      if (!obj(u.attackDestination)) fail();
      numbers(u.attackDestination, ["x", "z"]);
    }
  }
  for (const b of s.buildings) {
    add(b, "building");
    if (b.storeCare !== undefined && (!num(b.storeCare) || b.storeCare < 0 || b.storeCare > 1)) fail();
    if (b.fertility !== undefined && (!num(b.fertility) || b.fertility < 0.5 || b.fertility > 1))
      fail();
    if (b.raiderCamp !== undefined && (typeof b.raiderCamp !== "boolean" || b.team !== 3 || b.type !== "hut")) fail();
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
  if (d.demographicVersion === undefined) {
    for (const u of s.units) {
      if (u.maturesAt !== undefined && u.maturesAt > s.time) {
        u.ageT = 8 * 1800;
        u.maturesAt = s.time + 8 * 1800;
      } else u.ageT = (18 + (u.id % 25)) * 1800;
    }
  } else if (d.demographicVersion !== 1) fail();
  g.reset(s.seed,s.worldgenVersion??1);
  g.state = {
    ...s,
    growthPolicy: s.growthPolicy ?? "welcome",
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
  if (d.chopMarks !== undefined && (!Array.isArray(d.chopMarks) || d.chopMarks.length > 20000 ||
    d.chopMarks.some((id: unknown) => !Number.isSafeInteger(id)))) fail();
  const liveTrees = new Set(g.state.trees.filter(t => t.amount > 0).map(t => t.id));
  g.chopMarks = new Set((d.chopMarks || []).filter((id: number) => liveTrees.has(id)));
  g.seaT = d.seaT;
  g.calamityT = d.calamityT;
  g.tradeTeam = d.tradeTeam;
  g.started = true;
  g.awaitingStart = false;
  g.rebuildWalk();
  return g;
}
