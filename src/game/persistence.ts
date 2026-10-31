import {generateWorld,sampleHeight} from './worldgen';
import {WORLD_LAYOUTS,WORLD_SIZES} from './worldOptions';
import {syncRiverboats} from './boats';
import {DIFFICULTIES} from './difficulty';
import {scalablePlot,validPlot} from './plots';
import {discountTownhallPlans} from "./construction";
import {weatherWaterLevel} from "./hydrology";
import {reconcileTradeReservations} from "./tradeReservations";
import {carcassStateValid} from "./hunting";
import {validFarmToolUnit} from "./farmTools";
import {validHaulageUnit,validHaulageTribe} from "./haulage";
import { DISCOVERIES, TRADITIONS, TRADITION_COST } from "./discovery";
import { Game } from "./sim";
import { prehistoricName } from "./people";
import { FOOD_KINDS } from "./pantry";
import {CROPS,initializeCultivation} from "./cultivation";
import { FOW, SAVE_VERSION, BUILDINGS, UNITS } from "./constants";
import type { GameState, Unit, Building, ResourceNode, Critter } from "./types";
type Entity = Unit | Building | ResourceNode | Critter;
const key = (e: Entity | null) => (e ? `${"kind" in e ? e.kind : "critter"}:${e.id}` : null);
export function encodeGame(g: Game) {
  syncRiverboats(g);
  reconcileTradeReservations(g);
  const s = g.state;
  return {
    version: SAVE_VERSION,
    demographicVersion: 1,
    cargoVersion: 1,
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
  if(raw.cargoVersion!==undefined&&raw.cargoVersion!==1)fail();
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
  if(s.worldOptions!==undefined&&(!obj(s.worldOptions)||![7,8,9].includes(s.worldgenVersion)||!WORLD_SIZES.includes(s.worldOptions.size)||!WORLD_LAYOUTS.includes(s.worldOptions.layout)))fail();
  if([7,8,9].includes(s.worldgenVersion)&&s.worldOptions===undefined)fail();
  const HALF=(s.worldOptions?.size??1040)/2;
  const validTeam=(team:number)=>Number.isInteger(team)&&team>=0&&!!s.tribes[team];
  const rivalTeam=(team:number)=>validTeam(team)&&team>0&&team!==3;
  if(s.contacts!==undefined&&(!Array.isArray(s.contacts)||s.contacts.length>s.tribes.length-1||new Set(s.contacts).size!==s.contacts.length||s.contacts.some((t:number)=>(!validTeam(t)||t===0))))fail();
  if(s.encounter!==undefined){const e=s.encounter;if(!obj(e)||(!validTeam(e.team)||e.team===0)||!Number.isSafeInteger(e.person)||e.person<1||!Number.isSafeInteger(e.stranger)||e.stranger<1||typeof e.resume!=="boolean")fail();}
  if(s.communityTimer!==undefined&&(!num(s.communityTimer)||s.communityTimer<0||s.communityTimer>30))fail();
  if(s.lifeHistory!==undefined){
    if(!Array.isArray(s.lifeHistory)||s.lifeHistory.length>256)fail();
    for(const e of s.lifeHistory)if(!obj(e)||!validTeam(e.team)||typeof e.text!=="string"||e.text.length>300||!num(e.time)||e.time<0||e.time>s.time)fail();
  }
  if(s.communities!==undefined){
    if(!Array.isArray(s.communities)||s.communities.length>20000)fail();const halls=new Set();
    for(const c of s.communities){if(!obj(c)||!Number.isSafeInteger(c.hall)||c.hall<1||halls.has(c.hall)||(!validTeam(c.team)||c.team===3)||typeof c.name!=="string"||c.name.length>200||!num(c.founded)||c.founded<0||c.founded>s.time||
      (c.emptySince!==null&&(!num(c.emptySince)||c.emptySince<0||c.emptySince>s.time))||!["growing","thriving","struggling","abandoned"].includes(c.status))fail();halls.add(c.hall);}
  }
  if(s.conquestAt!==undefined&&(!num(s.conquestAt)||s.conquestAt<0||s.conquestAt>s.time))fail();
  if(s.difficulty!==undefined&&(!Object.hasOwn(DIFFICULTIES,s.difficulty)))fail();
  if(s.nightWork!==undefined&&typeof s.nightWork!=="boolean")fail();
  if(s.raidCampaign!==undefined){const r=s.raidCampaign;if(!obj(r)||typeof r.active!=='boolean'||!Number.isSafeInteger(r.adults)||r.adults<0||r.adults>20000||!Number.isSafeInteger(r.buildings)||r.buildings<0||r.buildings>20000||!num(r.loss)||r.loss<0||r.loss>1)fail();}
  if(s.raidCampaign)for(const key of ['people','sites']){const ids=s.raidCampaign[key];if(ids!==undefined&&(!Array.isArray(ids)||ids.length>20000||new Set(ids).size!==ids.length||ids.some((id:unknown)=>!Number.isSafeInteger(id)||Number(id)<1)))fail();}
  if(s.scoutTimer!==undefined&&(!num(s.scoutTimer)||s.scoutTimer<0||s.scoutTimer>1000))fail();
  if(s.trails!==undefined) {
    if(!Array.isArray(s.trails)||s.trails.length>8192)fail();const cells=new Set();
    for(const t of s.trails){if(!obj(t)||!Number.isSafeInteger(t.cell)||t.cell<0||t.cell>=65536||cells.has(t.cell)||
      !num(t.wear)||t.wear<0||t.wear>1||!num(t.last)||t.last<0||t.last>s.time||!num(t.angle)||Math.abs(t.angle)>Math.PI)fail();
      for(const key of ["x","z"])if(t[key]!==undefined&&(!num(t[key])||Math.abs(t[key])>HALF))fail();
      cells.add(t.cell);}
  }
  if(s.rivalKnowledge!==undefined){
    if(!Array.isArray(s.rivalKnowledge)||s.rivalKnowledge.length>s.tribes.length-2)fail();const teams=new Set();
    for(const m of s.rivalKnowledge){if(!obj(m)||!rivalTeam(m.team)||teams.has(m.team)||!Array.isArray(m.cells)||m.cells.length>1024||
      new Set(m.cells).size!==m.cells.length||m.cells.some((c:unknown)=>!Number.isSafeInteger(c)||Number(c)<0||Number(c)>=1024))fail();teams.add(m.team);}
  }
  if(s.boats!==undefined){
    if(!Array.isArray(s.boats)||s.boats.length>96)fail();const ids=new Set();
    for(const b of s.boats){if(!obj(b)||!Number.isSafeInteger(b.id)||b.id<1||b.id>=s.nextId||ids.has(b.id)||!Number.isSafeInteger(b.team)||b.team<0||b.team>=s.tribes.length||!Number.isSafeInteger(b.dock)||b.dock<1||!num(b.x)||!num(b.z)||Math.abs(b.x)>HALF||Math.abs(b.z)>HALF||!num(b.y)||!num(b.facing)||!num(b.hp)||b.hp<0||b.hp>300||b.capacity!==5||b.captain!==undefined&&(!Number.isSafeInteger(b.captain)||b.captain<1))fail();ids.add(b.id);}
  }
  if(s.visitorTimer!==undefined&&(!num(s.visitorTimer)||s.visitorTimer<0||s.visitorTimer>1000))fail();
  if(s.worldgenVersion!==undefined&&![1,2,3,4,5,6,7,8,9].includes(s.worldgenVersion))fail();
  if(s.cultivationVersion!==undefined&&s.cultivationVersion!==1)fail();
  const cropAmounts=(value:unknown,max:number)=>{
    if(!obj(value))fail();
    for(const [kind,amount] of Object.entries(value))
      if(!CROPS.includes(kind as any)||!num(amount)||amount<0||amount>max)fail();
  };
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
    const terms=['whitePeace','tribute','forcedLabor','puppet','annexation'];
    if(t.peaceTerm!==undefined&&!terms.includes(t.peaceTerm))fail();
    if(t.nextPeaceOffer!==undefined&&(!num(t.nextPeaceOffer)||t.nextPeaceOffer<0))fail();
    if(t.peaceOffer!==undefined){const p=t.peaceOffer;if(!obj(p)||p.from!==t.id||!terms.includes(p.term)||!num(p.expires)||p.expires<0)fail();}
    if(t.tribute!==undefined){const c=t.tribute;if(!obj(c)||!['tribute','puppet'].includes(t.peaceTerm)||!num(c.amount)||c.amount<=0||c.amount>20||!Number.isInteger(c.remaining)||c.remaining< -1||c.remaining>6||!num(c.next)||c.next<0||!num(c.owed)||c.owed<0||!num(c.paid)||c.paid<0)fail();}
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
    if(t.foodLots!==undefined){
      if(!obj(t.foodLots))fail();
      for(const [kind,amount] of Object.entries(t.foodLots))
        if(!FOOD_KINDS.includes(kind as any)||!num(amount)||amount<0||amount>1e9)fail();
    }
    if(t.seeds!==undefined&&(!num(t.seeds)||t.seeds<0||t.seeds>100000))fail();
    if(t.cropSamples!==undefined)cropAmounts(t.cropSamples,1e9);
    if(t.copperExperiment!==undefined&&typeof t.copperExperiment!=="boolean")fail();
    if(t.cultivated!==undefined&&(!Array.isArray(t.cultivated)||t.cultivated.length>3||new Set(t.cultivated).size!==t.cultivated.length||t.cultivated.some((k:unknown)=>!CROPS.includes(k as any))))fail();
    if(t.cropTrial!==undefined){const p=t.cropTrial;if(!obj(p)||!CROPS.includes(p.kind)||!num(p.progress)||!num(p.duration)||p.duration<30||p.duration>360||p.progress<0||p.progress>p.duration)fail();}
    if(rivalTeam(i)&&["Dunmere","Saltborn","Greyhaven","Mossfall","Redcliff","Ashfen","Harrow","Kest"].includes(t.name)) {
      t.name=prehistoricName(s.seed,i*977);t.short=t.name;
    }
  }
  const validateOffers=(offers:unknown)=>{
    if(!Array.isArray(offers)||offers.length>20)fail();
    for(const d of offers)if(!obj(d)||!["food","wood","stone","copper","iron"].includes(d.give)||
      !["food","wood","stone","copper","iron"].includes(d.get)||d.give===d.get||
      !Number.isSafeInteger(d.giveAmt)||d.giveAmt<1||d.giveAmt>100||!Number.isSafeInteger(d.getAmt)||d.getAmt<1||d.getAmt>200)fail();
  };
  if(s.rivalTradeRefusals!==undefined){
    if(!Array.isArray(s.rivalTradeRefusals)||s.rivalTradeRefusals.length>128)fail();
    for(const r of s.rivalTradeRefusals)if(!obj(r)||!rivalTeam(r.team)||!rivalTeam(r.partner)||r.team===r.partner||
      !['food','wood','stone','copper','iron'].includes(r.wanted)||!['food','wood','stone','copper','iron'].includes(r.offered)||r.wanted===r.offered||
      !num(r.time)||r.time<0||r.time>s.time)fail();
  }
  if(s.tradeReports!==undefined){
    if(!Array.isArray(s.tradeReports)||s.tradeReports.length>s.tribes.length-2)fail();
    const teams=new Set();for(const r of s.tradeReports){
      if(!obj(r)||!rivalTeam(r.team)||teams.has(r.team)||!num(r.time)||r.time<0||r.time>s.time)fail();
      teams.add(r.team);validateOffers(r.offers);
      if(r.observation!==undefined){
        const o=r.observation;
        if(!obj(o)||!Number.isSafeInteger(o.populationLow)||o.populationLow<0||!Number.isSafeInteger(o.populationHigh)||o.populationHigh<o.populationLow||o.populationHigh>100000||!Number.isSafeInteger(o.buildings)||o.buildings<0||o.buildings>100000||!obj(o.stocks))fail();
        for(const [kind,level] of Object.entries(o.stocks))if(!["food","wood","stone","copper","iron"].includes(kind)||!["scarce","adequate","plentiful"].includes(level as string))fail();
      }
    }
  }
  if (s.growthPolicy !== undefined && !["stable", "welcome", "eager"].includes(s.growthPolicy)) fail();
  if (s.laborPolicy !== undefined && !["balanced", "food", "build", "wood", "stone", "hunt", "explore", "trade"].includes(s.laborPolicy)) fail();
  if (s.conflict !== undefined && !["quiet", "balanced", "dangerous"].includes(s.conflict)) fail();
  for(const list of [s.trees,s.forage,s.fish,s.stones,s.copper,s.iron])for(const n of list)if(n.pressure!==undefined&&(!num(n.pressure)||n.pressure<0||n.pressure>1))fail();
  for (const t of s.tribes) {
    if(!validHaulageTribe(t))fail();
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
      Math.abs(e.x) > Math.max(1000,HALF+40) ||
      Math.abs(e.z) > Math.max(1000,HALF+40) ||
      (kind && e.kind !== kind)
    )
      fail();
    const k = key(e as Entity)!;
    if (refs.has(k)) fail();
    refs.set(k, e as Entity);
  };
  for (const u of s.units) {
    add(u, "unit");
    if(u.name!==undefined&&(typeof u.name!=="string"||u.name.length>80))fail();
    if (u.maturesAt !== undefined && (!num(u.maturesAt) || u.maturesAt < 0)) fail();
    if (u.emergency !== undefined) {
      if (
        !obj(u.emergency) ||
        !num(u.emergency.until) ||
        typeof u.emergency.autoArmed !== "boolean" ||
        (u.emergency.defending !== undefined && typeof u.emergency.defending !== "boolean") ||
        typeof u.emergency.jobLock !== "boolean" ||
        ![null, "food", "wood", "stone", "copper", "iron"].includes(u.emergency.job)
      )
        fail();
    }
    if (u.sickUntil !== undefined && !num(u.sickUntil)) fail();
    if(u.escortId!==undefined&&(!Number.isSafeInteger(u.escortId)||u.escortId<1||u.escortId===u.id))fail();
    if(u.caravanArmed!==undefined&&(typeof u.caravanArmed!=="boolean"||(u.caravanArmed&&(!u.militia||!["spearman","archer","swordsman"].includes(u.type)))))fail();
    if(u.buildOrder!==undefined&&(!Number.isSafeInteger(u.buildOrder)||u.buildOrder<1||u.team!==0))fail();
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
    if(u.foundingJourney!==undefined){const m=u.foundingJourney;if(!obj(m)||!num(m.x)||!num(m.z)||Math.abs(m.x)>HALF||Math.abs(m.z)>HALF||typeof m.leader!=="boolean"||(m.timber!==undefined&&(!Number.isSafeInteger(m.timber)||m.timber<20||m.timber>100000)))fail();}
    if(u.fatigue!==undefined&&(!num(u.fatigue)||u.fatigue<0||u.fatigue>1))fail();
    if(u.resting!==undefined&&typeof u.resting!=="boolean")fail();
    if(u.shelterId!==undefined&&(!Number.isSafeInteger(u.shelterId)||u.shelterId<1))fail();
    if(u.carryFood!==undefined&&!FOOD_KINDS.includes(u.carryFood))fail();
    if(u.seedSamples!==undefined)cropAmounts(u.seedSamples,100);
    if(u.combatXP!==undefined&&(!num(u.combatXP)||u.combatXP<0||u.combatXP>150))fail();
    if(u.tributeJourney!==undefined){const m=u.tributeJourney;if(!obj(m)||!rivalTeam(u.team)||!['pickup','deliver','return'].includes(m.phase)||!num(m.amount)||m.amount<0||m.amount>20||(m.phase==='deliver'&&(u.carryType!=='wood'||u.carry<m.amount)))fail();}
    if(u.husbandryWork!==undefined){const w=u.husbandryWork;if(!obj(w)||!Number.isSafeInteger(w.pen)||w.pen<1||!num(w.progress)||w.progress<0||w.progress>1e8||!["care","slaughter","pack"].includes(w.action)||!["pen","fetch","feed","deliver"].includes(w.phase)||(w.animal!==undefined&&(!Number.isSafeInteger(w.animal)||w.animal<1))||(w.paused!==undefined&&typeof w.paused!=="boolean"))fail();}
    if(u.tamingWork!==undefined){const w=u.tamingWork;if(!obj(w)||(w.pen!==undefined&&(!Number.isSafeInteger(w.pen)||w.pen<1))||!Number.isSafeInteger(w.animal)||w.animal<1||!num(w.progress)||w.progress<0||w.progress>60||(w.paused!==undefined&&typeof w.paused!=='boolean')||u.haulage!==undefined)fail();}
    if(u.caravanRoute!==undefined&&(!Number.isSafeInteger(u.caravanRoute)||!s.routes.some((r:any)=>r.id===u.caravanRoute&&r.caravan)))fail();
    if(u.boat!==undefined){
      const ride=u.boat,b=s.boats?.find((b:any)=>b.id===ride.id);
      if(!obj(ride)||!b||b.team!==u.team||u.haulage!=='canoe'||!['boarding','aboard','landing'].includes(ride.phase)||ride.phase==='landing'&&(!num(ride.x)||!num(ride.z)||Math.abs(ride.x)>HALF||Math.abs(ride.z)>HALF))fail();
    }
    if(!validHaulageUnit(u)||!validFarmToolUnit(u))fail();
    if(u.seaRaid!==undefined){const r=u.seaRaid;if(!obj(r)||u.team!==3||!["raid","retreat"].includes(r.phase))fail();numbers(r,["x","z","goalX","goalZ","thinkAt","departAt"]);if([r.x,r.z,r.goalX,r.goalZ].some(v=>Math.abs(v)>HALF)||r.thinkAt<0||r.departAt<0)fail();}
    if(u.craftingXP!==undefined&&(!num(u.craftingXP)||u.craftingXP<0||u.craftingXP>36000))fail();
    if(u.packAnimal!==undefined){const a=u.packAnimal;if(!obj(a)||u.haulage!=="pack"||!Number.isSafeInteger(a.id)||a.id<1||!num(a.hp)||!num(a.maxHp)||a.hp<=0||a.maxHp<=0||a.hp>a.maxHp||a.maxHp>1000||!num(a.scale)||a.scale<.1||a.scale>5)fail();}
    if(u.copperStudy!==undefined){const p=u.copperStudy;if(!obj(p)||!Number.isSafeInteger(p.workplace)||p.workplace<1||!num(p.progress)||p.progress<0||p.progress>90||(p.paused!==undefined&&typeof p.paused!=="boolean"))fail();}
    if(u.plantingWork!==undefined){const p=u.plantingWork;if(!obj(p)||!Number.isSafeInteger(p.treeId)||p.treeId<1||!num(p.progress)||p.progress<0||p.progress>12)fail();}
    if(u.weaponWork!==undefined){const w=u.weaponWork;if(!obj(w)||!["spear","bow","blade"].includes(w.kind)||!num(w.progress)||!num(w.duration)||w.duration<1||w.duration>180||w.progress<0||w.progress>w.duration||!Number.isSafeInteger(w.workplace)||w.workplace<1||(w.paused!==undefined&&typeof w.paused!=="boolean"))fail();}
    if(u.studyCrop!==undefined&&!CROPS.includes(u.studyCrop))fail();
    if(u.expedition!==undefined){const e=u.expedition;if(!obj(e)||!num(e.food)||e.food<0||e.food>24||typeof e.returning!=="boolean"||!num(e.forage)||e.forage<0||e.forage>8.5)fail();}
    if(u.scout!==undefined&&(!obj(u.scout)||!rivalTeam(u.team)||!Number.isSafeInteger(u.scout.legs)||u.scout.legs<0||u.scout.legs>5||typeof u.scout.returning!=="boolean"))fail();
    if(u.visit!==undefined&&(!obj(u.visit)||!rivalTeam(u.team)||!["outbound","waiting","return"].includes(u.visit.phase)||!num(u.visit.wait)||u.visit.wait<0||u.visit.wait>121))fail();
    if(u.visit?.team!==undefined&&(!rivalTeam(u.visit.team)||u.visit.team===u.team||!["food","wood","stone","copper","iron"].includes(u.visit.wanted)||u.visit.phase==="waiting"))fail();
    if(u.visit?.wanted!==undefined&&u.visit.team===undefined)fail();
    if(u.customOffer!==undefined&&typeof u.customOffer!=="boolean")fail();
    if(u.procurement!==undefined&&(!obj(u.procurement)||!Number.isSafeInteger(u.procurement.minimum)||u.procurement.minimum<1||u.procurement.minimum>200||u.team!==0))fail();
    if(u.tradeReservation!==undefined){
      const r=u.tradeReservation;
      if(!obj(r)||u.team!==0||!rivalTeam(r.team)||r.team!==u.tradeTeam||
        !["food","wood","stone","copper","iron"].includes(r.kind)||!Number.isSafeInteger(r.amount)||r.amount<1||r.amount>200||
        !u.trade||r.kind!==u.trade.get||r.amount!==u.trade.getAmt||u.customOffer||u.procurement)fail();
    }
    if(u.hunger!==undefined&&(!num(u.hunger)||u.hunger<0||u.hunger>1200))fail();
    if(u.recalled!==undefined&&typeof u.recalled!=="boolean")fail();
    if(u.demobilizing!==undefined&&typeof u.demobilizing!=="boolean")fail();
    if(u.returnAfterCombat!==undefined&&typeof u.returnAfterCombat!=="boolean")fail();
    if(u.massRaidTarget!==undefined&&(!Number.isSafeInteger(u.massRaidTarget)||u.massRaidTarget<1))fail();
    if(u.enslavedFrom!==undefined&&(!rivalTeam(u.enslavedFrom)||u.team!==0))fail();
    if(u.repatriating!==undefined&&(u.repatriating!==true||!rivalTeam(u.team)||u.enslavedFrom!==undefined))fail();
    if(u.captivityUnrest!==undefined&&(!num(u.captivityUnrest)||u.captivityUnrest<0||u.captivityUnrest>100||u.enslavedFrom===undefined))fail();
    if(u.searchJob!==undefined&&!["wood","food","hunt"].includes(u.searchJob))fail();
    if(u.envoy!==undefined){
      const m=u.envoy;
      if(m.term!==undefined&&!['whitePeace','tribute','forcedLabor','puppet','annexation'].includes(m.term))fail();
      if(!obj(m)||u.team!==0||!rivalTeam(m.team)||!["peace","trade","gift"].includes(m.kind)||
        !["outbound","return"].includes(m.phase)||!num(m.talk)||m.talk<0)fail();
      if(m.report!==undefined){if(!obj(m.report)||!num(m.report.time)||m.report.time<0||m.report.time>s.time)fail();validateOffers(m.report.offers);}
    }
    if (u.homeCamp !== undefined && (!Number.isSafeInteger(u.homeCamp) || u.homeCamp < 1 || u.team !== 3)) fail();
    if (u.stationOnArrival !== undefined && typeof u.stationOnArrival !== "boolean") fail();
    if (u.emergency?.resume !== undefined) {
      const r = u.emergency.resume;
      if (!obj(r) || !["move", "hold", "explore", "trade"].includes(r.order) ||
          !num(r.tx) || !num(r.tz) || typeof r.station !== "boolean") fail();
    }
    if (u.attackDestination != null) {
      if (!obj(u.attackDestination)) fail();
      numbers(u.attackDestination, ["x", "z"]);
    }
  }
  for (const b of s.buildings) {
    add(b, "building");
    if(b.gateOpen!==undefined&&typeof b.gateOpen!=="boolean")fail();
    if(b.gateMode!==undefined&&!["auto","open","closed"].includes(b.gateMode))fail();
    if (b.storeCare !== undefined && (!num(b.storeCare) || b.storeCare < 0 || b.storeCare > 1)) fail();
    if (b.fertility !== undefined && (!num(b.fertility) || b.fertility < 0.5 || b.fertility > 1))
      fail();
    if(b.raidLoot!==undefined){if(!obj(b.raidLoot))fail();for(const [kind,amount] of Object.entries(b.raidLoot))if(!["food","wood","stone","copper","iron"].includes(kind)||!num(amount)||amount<0||amount>200)fail();}
    if(b.lootTeam!==undefined&&(!Number.isInteger(b.lootTeam)||!s.tribes[b.lootTeam]))fail();
    if(b.lootClaimed!==undefined&&typeof b.lootClaimed!=="boolean")fail();
    if (b.raiderCamp !== undefined && (typeof b.raiderCamp !== "boolean" || b.team !== 3 || b.type !== "hut")) fail();
    if (b.fallowYear !== undefined && (!Number.isInteger(b.fallowYear) || b.fallowYear < 0)) fail();
    if(b.cropType!==undefined&&!CROPS.includes(b.cropType))fail();
    if (b.crop !== undefined) {
      if (!obj(b.crop)) fail();
      numbers(b.crop, ["year", "planted", "tended", "remaining"]);
      if(b.crop.water!==undefined&&(!num(b.crop.water)||b.crop.water<0.35||b.crop.water>1))fail();
      if(b.crop.kind!==undefined&&!CROPS.includes(b.crop.kind))fail();
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
    if(b.type==="bridge"&&b.bridge===undefined)fail();
    if(b.bridge!==undefined){
      const span=b.bridge;if(b.type!=="bridge"||!obj(span))fail();numbers(span,["ax","az","bx","bz"]);
      const length=Math.hypot(span.bx-span.ax,span.bz-span.az);
      if(length<5||length>28||Math.abs((span.ax+span.bx)/2-b.x)>.01||Math.abs((span.az+span.bz)/2-b.z)>.01||[span.ax,span.az,span.bx,span.bz].some(v=>Math.abs(v)>HALF-4))fail();
    }
    if(b.excavation!==undefined){const e=b.excavation;if(!obj(e)||!num(e.remaining)||!num(e.dug)||!num(e.quality)||e.remaining<0||e.remaining>1200||e.dug<0||e.dug>1200||e.quality<.65||e.quality>1.65||(e.prospected!==undefined&&(!Number.isInteger(e.prospected)||e.prospected<0||e.prospected>3)))fail();}
    if (!(b.type in BUILDINGS) || !s.tribes[b.team] || !Array.isArray(b.queue)) fail();
    numbers(b, ["hp", "maxHp", "w", "d", "cd", "build"]);
    if(scalablePlot(b.type)&&!validPlot(b.type,b))fail();
    if (b.build < 0 || b.build > 1) fail();
    if(b.expansion!==undefined){const e=b.expansion;if(!obj(e)||!validPlot(b.type,{w:e.w,d:e.d})||b.build!==1||b.plannedCost||e.w<b.w||e.d<b.d||(e.w===b.w&&e.d===b.d)||!num(e.progress)||e.progress<0||e.progress>1||typeof e.paid!=="boolean"||(!e.paid&&e.progress!==0))fail();}
    if(b.plannedCost!==undefined){
      if(!obj(b.plannedCost)||b.build!==0||b.queue.length)fail();
      const allowed=["food","wood","stone","copper","iron","seeds"];
      if(Object.keys(b.plannedCost).some(k=>!allowed.includes(k)))fail();
      for(const k of allowed){const n=b.plannedCost[k]??(k==='seeds'?0:undefined);if(!num(n)||n<0||n>100000)fail();}
    }
    if(b.planPaused===false&&!b.plannedCost)b.planPaused=undefined; // Older direct build orders wrote a redundant false flag.
    if(b.planPaused!==undefined&&(typeof b.planPaused!=="boolean"||!b.plannedCost))fail();
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
      if(n.planted!==undefined&&(typeof n.planted!=="boolean"||n.kind!=="tree"))fail();
      if(n.cropCandidate!==undefined&&(n.kind!=="forage"||!CROPS.includes(n.cropCandidate)))fail();
    }
  if(s.livestock!==undefined){
    if(!Array.isArray(s.livestock)||s.livestock.length>96)fail();
    const perPen=new Map<number,number>();
    for(const a of s.livestock){
      add(a);numbers(a,["team","pen","hp","maxHp","facing","vx","vz","wanderT","fly","scale","born","tamedAt","hunger","milk","pregnancy"]);
      const pen=s.buildings.find((b:any)=>b.id===a.pen&&b.type==='pen'&&b.team===a.team);
      if(!pen||a.species!=='goat'||!['female','male'].includes(a.sex)||a.born< -300||a.born>s.time||a.tamedAt<0||a.tamedAt>s.time||a.hp<0||a.hp>a.maxHp||a.maxHp<=0||a.maxHp>1000||a.scale<.3||a.scale>3||a.hunger<0||a.hunger>100||a.milk<0||a.milk>6||a.pregnancy<0||a.pregnancy>240||!carcassStateValid(a.carcass,a.species,a.hp,s.time))fail();
      if(a.lactatingUntil!==undefined&&(!num(a.lactatingUntil)||a.lactatingUntil<0||a.lactatingUntil>s.time+901))fail();
      if(a.hp>0){perPen.set(a.pen,(perPen.get(a.pen)||0)+1);if((perPen.get(a.pen)||0)>8)fail();}
    }
  }
  for (const c of s.wildlife) {
    add(c);
    if(c.grazing!==undefined&&(!obj(c.grazing)||!num(c.grazing.x)||!num(c.grazing.z)||Math.abs(c.grazing.x)>Math.max(1000,HALF+40)||Math.abs(c.grazing.z)>Math.max(1000,HALF+40)))fail();
    numbers(c, ["hp", "maxHp", "facing", "vx", "vz", "wanderT", "fly", "scale"]);
    if (!["deer", "boar", "goat", "bird"].includes(c.species)||!carcassStateValid(c.carcass,c.species,c.hp,s.time)) fail();
  }
  for(const b of s.buildings)if(b.pasture!==undefined){const p=b.pasture;if(b.type!=='pen'||!obj(p)||!num(p.condition)||p.condition<0||p.condition>1||!num(p.feed)||p.feed<0||p.feed>100||!num(p.care)||p.care<0||p.care>1)fail();}
  for(const u of s.units){
    for(const w of [u.husbandryWork,u.tamingWork?.pen!==undefined?u.tamingWork:undefined])if(w&&!s.buildings.some((b:any)=>b.id===w.pen&&b.type==='pen'&&b.team===u.team))fail();
  }
  for (const r of s.routes) {
    if (!obj(r)) fail();
    numbers(r, ["id", "team", "giveAmt", "getAmt", "interval", "t"]);
    if(r.caravan!==undefined){const c=r.caravan;
      if(!obj(c)||![1,2,3].includes(c.size)||![0,1,2].includes(c.guards)||!['any','pack','cart'].includes(c.transport)||!Array.isArray(c.workerIds)||c.workerIds.length>3||new Set(c.workerIds).size!==c.workerIds.length||c.workerIds.some((id:any)=>!Number.isSafeInteger(id)||id<1)||!Number.isSafeInteger(c.trips)||c.trips<0||!Number.isSafeInteger(c.losses)||c.losses<0||!num(c.refunded)||c.refunded<0||!obj(c.received)||Object.entries(c.received).some(([k,v])=>!['food','wood','stone','copper','iron'].includes(k)||!num(v)||v<0)||c.lastResult!==undefined&&(typeof c.lastResult!=='string'||c.lastResult.length>1000))fail();
    }
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
    // Demographic-era saves already contained physical cargo, including a fully
    // stolen load. Never reconstruct their empty hands as a new shipment.
    if (d.cargoVersion===undefined && d.demographicVersion===undefined && u.order === "trade" && u.trade && u.carry === 0) {
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
  for(const b of s.boats||[]){
    const crew=s.units.filter((u:any)=>u.hp>0&&u.boat?.id===b.id);
    if(crew.length>b.capacity||b.captain!==undefined&&!crew.some((u:any)=>u.id===b.captain&&u.boat.phase==='aboard'))fail();
  }
  g.reset(s.seed,s.worldgenVersion??1,s.worldOptions);
  // Early v7 random-layout saves omitted the original selection roll. Select
  // the reconstruction supported by saved natural-node heights, not a new map.
  if(s.worldgenVersion===7&&s.worldOptions){
    const evidence=[...s.trees,...s.stones,...s.forage].filter((n:any)=>Number.isFinite(n.y));
    const points=evidence.filter((_:unknown,i:number)=>i%Math.max(1,Math.floor(evidence.length/64))===0).slice(0,64);
    const error=(world:typeof g.world)=>points.reduce((sum:number,n:any)=>sum+Math.min(30,Math.abs(sampleHeight(world.heights,n.x,n.z,world.size)-n.y)),0)/Math.max(1,points.length);
    const initial=error(g.world);
    if(points.length>=8&&initial>.25){
      const candidate=generateWorld(s.seed,7,{size:s.worldOptions.size,layout:'random'});
      if(candidate.options?.layout===s.worldOptions.layout&&error(candidate)<initial*.5)g.world=candidate;
    }
  }
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
  initializeCultivation(g,s.cultivationVersion===undefined);
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
  g.world.waterY=weatherWaterLevel(g.world.baseWaterY,g.state.weather);
  g.rebuildWalk();
  discountTownhallPlans(g);
  return g;
}
