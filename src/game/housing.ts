import {eraUpgradeIssue,planEraChange,ensureBuildingFabric,eraUpgradeCommitIssue,commitEraUpgrade,fabricMaximumHp,supportsEraUpgrade,ERA_UPGRADE_RULES,type EraUpgradeMode} from './buildingFabric';
import type {ExtensionSide} from './extensionFootprints';
import {sitePreparationSurvey,reserveSitePreparation} from './sitePreparation';
import type { Game } from "./sim";
import type { Building, Unit, GameState } from "./types";
import type { HousingMaterials, HousingRenovation, HousingCargo } from "./housingTypes";
import {
  HOUSING_MATERIAL_KEYS,
  emptyHousingMaterials,
  housingMaterialTotal,
  takeHousingMaterials,
  addHousingMaterials,
  housingMaterialsEqual,
} from "./housingMaterials";
import { workRuntime } from "./workRuntime";
import { isDependent, reserveSeconds } from "./settlement";
import { predisposition } from "./people";
import { hasTaskCommitment } from "./workCommitments";
import { supplyDrops, supplyApproach, supplyReached } from "./campAnchor";
import {
  releaseConstructionWorker,
  reserveConstructionWorker,
  completeConstructionTarget,
} from "./constructionOwnership";
export { HOUSING_RULES } from "./housingRules";
import { HOUSING_RULES } from "./housingRules";
import { queueConstruction } from "./constructionQueue";
export const housingQuote = (): HousingMaterials => ({
  wood: HOUSING_RULES.wood,
  stone: HOUSING_RULES.stone,
  plantFibre: HOUSING_RULES.plantFibre,
});
/** Reprice only never-paid proposals; paid legacy packets/receipts keep every unit. */
function refreshUnpaidHousingQuote(p:HousingRenovation){
 if(!p.eraChange&&!p.paid&&p.progress===0&&p.quote.plantFibre>HOUSING_RULES.plantFibre&&[p.uncollected,p.delivered,p.packet].every(m=>housingMaterialTotal(m)===0)){
  p.quote={...p.quote,plantFibre:HOUSING_RULES.plantFibre};
  if(p.blockedReason?.includes('delivered plant fibre'))p.blockedReason=undefined;
 }
}
export function housingMaterialIssue(g: Game, team: number, quote = housingQuote()) {
  const t = g.tribe(team);
  if (!t) return "Community missing";
  const missing = [
    quote.wood > t.wood ? `${Math.ceil(quote.wood - t.wood)} logs` : null,
    quote.stone > t.stone ? `${Math.ceil(quote.stone - t.stone)} stone` : null,
    quote.plantFibre > (t.items?.plantFibre || 0)
      ? `${Math.ceil(quote.plantFibre - (t.items?.plantFibre || 0))} delivered plant fibre`
      : null,
  ].filter(Boolean);
  return missing.length ? "Need " + missing.join(" · ") : null;
}
/** Same pure admission before actor allocation and again at physical payment. */
export function housingFundingIssue(g:Game,team:number,quote=housingQuote()){
 const material=housingMaterialIssue(g,team,quote);if(material||team===0)return material;
 const t=g.tribe(team);return t.wood-quote.wood<HOUSING_RULES.npcTimberReserve||t.stone-quote.stone<HOUSING_RULES.npcStoneReserve||reserveSeconds(g,team)<HOUSING_RULES.npcMealReserveSeconds?'Housing preserves the community meal and working-material reserves':null;
}
function adult(g: Game, u: Unit) {
  return (
    u.hp > 0 &&
    u.type === "worker" &&
    !u.militia &&
    !u.prisoner &&
    !isDependent(g, u) &&
    u.enslavedFrom === undefined
  );
}
export function knowsHousing(u: Unit) {
  return u.hp > 0 && u.housingSkill?.demonstratedAt !== undefined && !u.prisoner;
}
export function housingAdoptionIssue(g: Game, team = 0) {
  return g.state.units.some((u) => u.team === team && knowsHousing(u))
    ? null
    : "First upgrade a hut, then physically try the paid prototype to adopt its method";
}
function teacherHere(_g: Game, u: Unit, _b: Building) {
  return knowsHousing(u);
}
export function housingPlanIssue(g: Game, b: Building) {
  if (b.hp <= 0) return "The original home was lost";
  if (b.type !== "hut" || !g.finished(b)) return "Choose a completed hut";
  if (b.expansion || b.repair) return "Finish the existing work at this home first";
  if (b.renovation) return "The same housing project is already planned";
  if (!supplyDrops(g, b.team).length) return "Need a real communal material cache";
  return null;
}
function newProject(g: Game, b: Building, mode: "upgrade" | "new"): HousingRenovation {
  return {
    version: 1,
    mode,
    actorId: null,
    phase: "planned",
    progress: 0,
    duration: HOUSING_RULES.workSeconds,
    initialHp: b.hp,
    quote: housingQuote(),
    paid: false,
    paidBy: b.team,
    custodyTeam: b.team,
    sourceTeam: b.team,
    packetTeam: b.team,
    uncollected: emptyHousingMaterials(),
    delivered: emptyHousingMaterials(),
    packet: emptyHousingMaterials(),
    parcel: { kind: "site", x: b.x, z: b.z },
    createdAt: g.state.time,
  };
}
export function beginHousingUpgrade(g: Game, id: number, team = 0) {
  const b = g.state.buildings.find((b) => b.id === id && b.team === team);
  if (!b) return { accepted: false, reason: "Choose an owned completed hut" };
  if (b.renovation)
    return { accepted: true, reason: "The existing paid/unpaid housing project remains queued" };
  const issue = housingPlanIssue(g, b);
  if (issue) return { accepted: false, reason: issue };
  b.renovation = newProject(g, b, "upgrade");
  g.workBoard.reset();
  if (team === 0) queueConstruction(g, b);
  else {const blocked=housingFundingIssue(g,team);if(blocked)b.renovation.blockedReason=blocked;else g.assignBuilders(b);}
  return {
    accepted: true,
    reason: `Upgrade planned · ${housingQuoteText(b.renovation.quote, b.renovation.duration)}; original home stays open`,
  };
}
/** Paid fabric work shares the existing physical cache/packet/site ownership ledger. */
export function beginEraUpgrade(g:Game,id:number,mode:EraUpgradeMode,side?:ExtensionSide,team=0){
 const issue=eraUpgradeIssue(g,id,mode,side,team);if(issue)return{accepted:false,reason:issue};
 const b=g.state.buildings.find(b=>b.id===id&&b.team===team)!;ensureBuildingFabric(g,b);
 const q=ERA_UPGRADE_RULES[mode];b.renovation={...newProject(g,b,'upgrade'),mode,eraChange:planEraChange(g,b,mode,side),duration:q.workSeconds,quote:{wood:q.wood,stone:q.stone,plantFibre:q.plantFibre}};
 g.workBoard.reset();if(team===0)queueConstruction(g,b);else g.assignBuilders(b);
 return{accepted:true,reason:`Paid ${mode} planned; original building and current health remain unchanged`};
}
/** Menu placement is a real saved construction site; knowledge grants no materials. */
export function planAdvancedHome(g: Game, x: number, z: number, team = 0) {
  const issue = housingAdoptionIssue(g, team) || g.placementIssue("house", x, z, team);
  if (issue) {
    if (team === 0) g.banner(issue, 4);
    return false;
  }
  const b = g.makeBld("house", x, z, team);
  b.build = 0;
  b.hp = 16;
  b.plannedCost = {
    food: 0,
    wood: HOUSING_RULES.wood,
    stone: HOUSING_RULES.stone,
    copper: 0,
    iron: 0,
  };
  b.renovation = newProject(g, b, "new");
  if(team===0&&sitePreparationSurvey(g,b).clearable.length&&!reserveSitePreparation(g,b,'unpaid',{}))return false;
  g.state.buildings.push(b);
  g.state.walkDirty = true;
  g.workBoard.reset();
  if (team === 0) {
    const trained = g.state.units
      .filter(
        (u) =>
          u.team === team &&
          adult(g, u) &&
          knowsHousing(u) &&
          !u.buildOrder &&
          !hasTaskCommitment(u) &&
          !u.jobLock &&
          !u.carry,
      )
      .sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))
      .slice(0, 1);
    if (trained.length) queueConstruction(g, b, trained);
  } else g.assignBuilders(b);
  return true;
}
export function housingStatus(g: Game, b: Building) {
  const p = b.renovation;
  if (!p)
    return b.type === "house"
      ? b.housingReceipt?.adoptedAt !== undefined
        ? "Method demonstrated locally"
        : "Paid home ready ·try it to demonstrate the method"
      : null;
  if (b.planPaused) return "Housing work paused; paid progress and materials retained";
  if (!housingOwnerCanContinue(p, b.team))
    return "Paid inputs and site have separated owners; real materials and progress retained";
  if (p.blockedReason) return p.blockedReason;
  return p.paid
    ? `${p.phase} ·${Math.floor((p.progress / p.duration) * 100)}%`
    : housingFundingIssue(g, b.team, p.quote) ||
        "Materials available ·builder must collect at the real cache";
}
/** Use the existing physical work range first; a coarse blocked cell must not
 * reject a resident who is already at the actual work frontage. */
export function housingApproach(g:Game,u:Unit,b:Building){return g.buildingWorkReached(u,b)?{x:u.x,z:u.z}:g.interactionSpot(u,b);}
function reachableHousingSupply(g:Game,u:Unit,team:number){
 for(const drop of supplyDrops(g,team).slice().sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))){const spot=supplyApproach(g,u,drop);if(spot)return{drop,spot};}
 return null;
}
/** Atomic debit occurs only when the actual builder reaches this actual cache. */
function payAtCache(g: Game, b: Building, u: Unit, p: HousingRenovation, dt: number,route:NonNullable<ReturnType<typeof reachableHousingSupply>>) {
  const {drop,spot}=route;
  if (!drop || !spot) {
    p.blockedReason = "No reachable material cache";
    return false;
  }
  u.tx = spot.x;
  u.tz = spot.z;
  if (!supplyReached(g, u, drop, spot)) {
    g.steer(u, dt);
    u.workReason = "Walking to the cache for housing materials";
    return false;
  }
  const missing=housingFundingIssue(g,b.team,p.quote);
  if (missing) {
    p.blockedReason = missing;
    return false;
  }
  const t = g.tribe(b.team);
  t.wood -= p.quote.wood;
  t.stone -= p.quote.stone;
  t.items ??= {};
  t.items.plantFibre = (t.items.plantFibre || 0) - p.quote.plantFibre;
  delete b.plannedCost;
  g.state.walkDirty = true;
  p.paid = true;
  p.paidBy = b.team;
  p.custodyTeam = b.team;
  p.sourceTeam = b.team;
  p.packetTeam = b.team;
  p.uncollected = { ...p.quote };
  p.source = { x: drop.x, z: drop.z, ...(drop.kind === "building" ? { cacheId: drop.id } : {}) };
  p.parcel = { kind: "cache", ...p.source };
  p.phase = "fetching";
  p.blockedReason = undefined;
  return true;
}
/** A just-loaded claim can exist in the shared coordinator before the legacy
 * construction adapter has built its private context. Release that exact job too. */
function releaseHousingClaim(g:Game,u:Unit,buildingId:number){
 releaseConstructionWorker(g,u);
 const jobs=workRuntime(g),id=`construction:${buildingId}:worker:${u.id}`;
 if(jobs.job(id)){jobs.finish(id,true);jobs.forget(id);}
}
function releaseActor(g: Game, b: Building, u: Unit, reason: string) {
  const p = b.renovation;
  if (!p) return;
  if (u.housingCargo?.buildingId === b.id) {
    p.packet = { ...u.housingCargo.materials };
    p.packetTeam = u.housingCargo.custodyTeam;
    delete u.housingCargo;
    p.parcel = { kind: "ground", x: u.x, z: u.z };
  }
  if (p.actorId === u.id) p.actorId = null;
  delete u.housingWorkId;
  p.phase = b.planPaused ? "paused" : "planned";
  p.blockedReason = reason;
  releaseHousingClaim(g,u,b.id);
}
export function pauseHousingWorker(g: Game, u: Unit) {
  if (u.housingUse) {
    u.housingUse.paused = true;
    clearHomeUseClaim(g, u);
  }
  if (u.housingWorkId === undefined && !u.housingCargo) return;
  const targetId=u.housingWorkId??u.housingCargo!.buildingId;
  const b = g.state.buildings.find((b) => b.id === targetId);
  if (b?.renovation) releaseActor(g, b, u, "Builder interrupted; actual paid materials retained");
  else if (u.housingCargo) {
    const cargo = u.housingCargo;
    g.state.retainedHousingProjects ??= [];
    const p: HousingRenovation = {
      ...newProject(
        g,
        { id: cargo.buildingId, team: cargo.custodyTeam, x: u.x, z: u.z, hp: 0 } as Building,
        "upgrade",
      ),
      paid: true,
      paidBy: cargo.paidBy,
      custodyTeam: cargo.custodyTeam,
      sourceTeam: cargo.custodyTeam,
      packetTeam: cargo.custodyTeam,
      quote: { ...cargo.materials },
      packet: { ...cargo.materials },
      parcel: { kind: "ground", x: u.x, z: u.z },
    };
    g.state.retainedHousingProjects.push({
      version: 1,
      id: g.id(),
      buildingId: cargo.buildingId,
      team: cargo.custodyTeam,
      project: p,
      reason: "Original construction target missing; physical packet retained",
    });
    delete u.housingCargo;
    delete u.housingWorkId;
  }
  delete u.housingWorkId;
  releaseHousingClaim(g,u,targetId);
}
/** Finished labour must not send the builder back into the future wing each tick. */
function finishEraWork(g:Game,u:Unit,b:Building,p:HousingRenovation,dt:number){
 const blocked=eraUpgradeCommitIssue(g,b,p);
 if(blocked){
  p.blockedReason=blocked;u.workReason=blocked;
  const t=p.eraChange!.target;
  if(p.mode==='extend'&&Math.abs(u.x-t.x)<t.w/2+u.r&&Math.abs(u.z-t.z)<t.d/2+u.r){
   const exits=[{x:t.x+t.w/2+u.r+1.2,z:t.z},{x:t.x-t.w/2-u.r-1.2,z:t.z},{x:t.x,z:t.z+t.d/2+u.r+1.2},{x:t.x,z:t.z-t.d/2-u.r-1.2}]
    .filter(v=>g.walkable(v.x,v.z)&&g.workBoard.connected(g,u.x,u.z,v.x,v.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z));
   if(exits.length){u.tx=exits[0].x;u.tz=exits[0].z;g.steer(u,dt);}
  }
  return true;
 }
 const issue=commitEraUpgrade(g,b,p,u.id);if(issue){p.blockedReason=issue;return true;}
 delete b.renovation;delete b.planPaused;delete u.housingWorkId;u.buildOrder=undefined;u.node=null;u.order='idle';
 completeConstructionTarget(g,b);if(u.team===0)g.banner('Paid building work finished; added durability can be filled by real repair work',5);return true;
}
export function housingAI(g: Game, u: Unit, b: Building, dt: number) {
  const p = b.renovation;
  if (!p) return false;
  if (p.custodyTeam !== b.team || u.team !== b.team || b.hp <= 0) {
    p.blockedReason = "Paid housing work and current target have different owners";
    return true;
  }
  if (b.planPaused) {
    releaseActor(g, b, u, "Housing plan paused");
    return true;
  }
  if (p.actorId !== null && p.actorId !== u.id) {
    u.workReason = "Another builder owns the housing workspot";
    return true;
  }
  if (!adult(g, u)) {
    releaseActor(g, b, u, "Builder unavailable");
    return true;
  }
  if(u.team!==0&&!p.paid){const missing=housingFundingIssue(g,u.team,p.quote);if(missing){releaseActor(g,b,u,missing);if(u.buildOrder===b.id)u.buildOrder=undefined;u.node=null;u.order=u.carry>0?'return':'idle';u.workReason=missing;return true;}}
  if (p.mode === "new" && !teacherHere(g, u, b)) {
    u.workReason = p.blockedReason = "Bring a builder who actually learned the home method";
    return true;
  }
  const unpaidRoute=!p.paid?{target:housingApproach(g,u,b),supply:reachableHousingSupply(g,u,b.team)}:undefined;
  if(unpaidRoute&&(!unpaidRoute.target||!unpaidRoute.supply)){
   const reason=!unpaidRoute.target?'No physical approach to the home; unpaid intention retained':'No reachable material cache; unpaid intention retained';
   releaseActor(g,b,u,reason);if(u.buildOrder===b.id)u.buildOrder=undefined;u.node=null;u.order=u.carry>0?'return':'idle';u.blockedTask=b.id;u.retryWorkAt=g.state.time+30;u.workReason=reason;return true;
  }
  if (!reserveConstructionWorker(g, u, b, "traveling")) return true;
  p.blockedReason = undefined;
  p.actorId = u.id;
  u.housingWorkId = b.id;
  u.buildOrder = b.id;
  u.order = "build";
  u.node = b;
  if (!p.paid) {
    if (!payAtCache(g, b, u, p, dt,unpaidRoute!.supply!)) return true;
  }
  if (!u.housingCargo && housingMaterialTotal(p.packet) > 0) {
    if (p.packetTeam !== u.team) {
      p.blockedReason = "The actual reserved packet remains under another community’s ownership";
      return true;
    }
    u.tx = p.parcel.x;
    u.tz = p.parcel.z;
    if (Math.hypot(u.x - u.tx, u.z - u.tz) > 1.8) {
      g.steer(u, dt);
      u.workReason = "Collecting the actual dropped housing packet";
      return true;
    }
    u.housingCargo = {
      version: 1,
      buildingId: b.id,
      materials: p.packet,
      custodyTeam: u.team,
      paidBy: p.paidBy,
    };
    p.parcel = { kind: "carrier", x: u.x, z: u.z };
    p.phase = "carrying";
  }
  if (!u.housingCargo && housingMaterialTotal(p.uncollected) > 0) {
    if (p.sourceTeam !== u.team) {
      p.blockedReason = "Remaining paid inputs belong to the actual former cache owner";
      return true;
    }
    const source = p.source;
    if (!source) {
      p.blockedReason = "Paid input source missing; inventory retained";
      return true;
    }
    const d = supplyDrops(g, p.custodyTeam).find((d) =>
        source.cacheId !== undefined
          ? d.kind === "building" &&
            d.id === source.cacheId &&
            Math.hypot(d.x - source.x, d.z - source.z) < 0.1
          : Math.hypot(d.x - source.x, d.z - source.z) < 0.1,
      ),
      spot = d ? supplyApproach(g, u, d) : source;
    if (!spot) {
      p.blockedReason = "Paid cache is not reachable";
      return true;
    }
    u.tx = spot.x;
    u.tz = spot.z;
    if (d ? !supplyReached(g, u, d, spot) : Math.hypot(u.x - spot.x, u.z - spot.z) > 1.8) {
      g.steer(u, dt);
      u.workReason = "Fetching the next finite housing packet";
      return true;
    }
    p.packet = takeHousingMaterials(p.uncollected, HOUSING_RULES.packetCapacity);
    p.packetTeam = u.team;
    u.housingCargo = {
      version: 1,
      buildingId: b.id,
      materials: p.packet,
      custodyTeam: u.team,
      paidBy: p.paidBy,
    };
    p.parcel = { kind: "carrier", x: u.x, z: u.z };
    p.phase = "carrying";
  }
  if(p.eraChange&&p.progress+1e-8>=p.duration&&housingMaterialsEqual(p.delivered,p.quote))return finishEraWork(g,u,b,p,dt);
  const spot = housingApproach(g,u,b);
  if (!spot) {
    p.blockedReason = "No physical approach to the home";
    return true;
  }
  u.tx = spot.x;
  u.tz = spot.z;
  if (!g.buildingWorkReached(u, b)) {
    g.steer(u, dt);
    u.workReason = u.housingCargo
      ? "Carrying housing materials to the real home"
      : "Walking to the housing worksite";
    if (u.housingCargo) p.parcel = { kind: "carrier", x: u.x, z: u.z };
    return true;
  }
  if (u.housingCargo) {
    addHousingMaterials(p.delivered, p.packet);
    p.packet = emptyHousingMaterials();
    delete u.housingCargo;
    p.parcel = { kind: "site", x: b.x, z: b.z };
    if (housingMaterialTotal(p.uncollected) > 0 || housingMaterialTotal(p.packet) > 0) {
      p.phase = "fetching";
      return true;
    }
  }
  if (!housingMaterialsEqual(p.delivered, p.quote)) {
    p.blockedReason = "All actual materials must reach the site before work";
    return true;
  }
  p.phase = "working";
  p.blockedReason = undefined;
  reserveConstructionWorker(g, u, b, "working");
  u.vx = 0;
  u.vz = 0;
  const work = Math.min(p.duration - p.progress, dt * predisposition(u).strength);
  p.progress += work;
  u.stride += work * 5;
  u.workReason = `Improving the home ·${Math.floor((p.progress / p.duration) * 100)}%`;
  if (p.mode === "new") {
    b.build = Math.min(0.99, p.progress / p.duration);
    b.hp = Math.min(b.maxHp, b.hp + ((b.maxHp - p.initialHp) * work) / p.duration);
  }
  if (p.progress + 1e-8 >= p.duration) {
    if(p.eraChange)return finishEraWork(g,u,b,p,dt);
    const hp = b.hp;
    b.type = "house";
    b.build = 1;
    b.maxHp = HOUSING_RULES.maximumHp;
    if(b.fabric){b.fabric.baseMaxHp=HOUSING_RULES.maximumHp;b.maxHp=fabricMaximumHp(b.fabric);}
    b.hp = Math.min(hp, b.maxHp);
    b.housingReceipt = {
      version: 1,
      mode: p.mode as "upgrade"|"new",
      paidBy: p.paidBy,
      materials: { ...p.quote },
      workSeconds: p.progress,
      completedAt: g.state.time,
      makerId: u.id,
      demonstrationSeconds: 0,
    };
    if (!knowsHousing(u))
      u.housingSkill = {
        version: 1,
        sourceHouseId: b.id,
        originTeam: b.team,
        builtAt: g.state.time,
      };
    delete b.renovation;
    delete b.planPaused;
    delete u.housingWorkId;
    u.buildOrder = undefined;
    u.node = null;
    u.order = "idle";
    completeConstructionTarget(g, b);
    g.state.walkDirty = true;
    g.workBoard.reset();
    if (u.team === 0)
      g.banner("Timber home finished. Try the real home to demonstrate its method.", 5);
  }
  return true;
}
export function housingShelterBonus(b: Building | undefined) {
  return b?.type === "house" && b.hp > 0 && b.build >= 1 ? HOUSING_RULES.shelterWarmthCelsius : 0;
}
export function beginHomeUse(g: Game, id: number, team = 0, actorId?: number) {
  const b = g.state.buildings.find(
    (b) => b.id === id && b.team === team && b.type === "house" && g.finished(b),
  );
  if (!b?.housingReceipt)
    return { accepted: false, reason: "Try an actual completed paid home prototype" };
  const candidates = g.state.units
      .filter(
        (u) =>
          u.team === team &&
          adult(g, u) &&
          (!actorId || u.id === actorId) &&
          !u.emergency &&
          !u.recalled &&
          !u.buildOrder &&
          !u.carry &&
          !u.housingCargo &&
          !Object.values(u.itemCargo || {}).some((n) => !!n) &&
          !hasTaskCommitment(u, "housingUse") &&
          (!u.jobLock || u.foodRole === true) &&
          ["idle", "hold", "gather"].includes(u.order),
      )
      .sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z)),
    u = candidates.find((u) => !!g.interactionSpot(u, b));
  if (!u)
    return {
      accepted: false,
      reason: "Need an available adult with empty hands and a real route to this home",
    };
  g.interruptMission(u);
  u.housingUse = {
    version: 1,
    buildingId: b.id,
    seconds: u.housingUse?.buildingId === b.id ? u.housingUse.seconds : 0,
  };
  u.order = "hold";
  u.node = null;
  u.job = null;
  return {
    accepted: true,
    reason: "Resident must walk to and actually try the paid home; ordinary needs remain active",
  };
}
export function homeUseAI(g: Game, u: Unit, dt: number) {
  const w = u.housingUse;
  if (!w || w.paused) return false;
  const b = g.state.buildings.find(
    (b) => b.id === w.buildingId && b.team === u.team && b.type === "house" && g.finished(b),
  );
  if (!b?.housingReceipt || !adult(g, u) || u.emergency) {
    w.paused = true;
    u.workReason = "Home demonstration paused; resident or home unavailable";
    return false;
  }
  const jobs = workRuntime(g),
    key = `home-use:${u.id}`;
  if (!jobs.job(key))
    jobs.propose({
      id: key,
      kind: "practice:housing",
      owner: u.team,
      actors: [u.id],
      target: b.id,
    });
  if (jobs.activeJob(u.id)?.id !== key && !jobs.reserve(key)) {
    u.workReason = "Home demonstration waits for the resident’s current commitment";
    return true;
  }
  const spot = g.interactionSpot(u, b);
  if (!spot) {
    u.workReason = "Home needs a real reachable approach";
    return true;
  }
  u.tx = spot.x;
  u.tz = spot.z;
  if (!g.buildingWorkReached(u, b)) {
    g.steer(u, dt);
    u.workReason = "Walking to try the actual home";
    return true;
  }
  u.order = "hold";
  u.vx = 0;
  u.vz = 0;
  u.resting = true;
  u.fatigue = Math.max(0, (u.fatigue || 0) - dt / 30);
  w.seconds = Math.min(HOUSING_RULES.demonstrationSeconds, w.seconds + dt);
  b.housingReceipt.demonstrationSeconds = Math.max(
    b.housingReceipt.demonstrationSeconds,
    w.seconds,
  );
  jobs.transition(key, "working", w.seconds / HOUSING_RULES.demonstrationSeconds);
  u.workReason = `Trying the improved home ·${Math.floor((w.seconds / HOUSING_RULES.demonstrationSeconds) * 100)}%`;
  if (w.seconds >= HOUSING_RULES.demonstrationSeconds) {
    b.housingReceipt.adoptedAt ??= g.state.time;
    u.housingSkill = {
      version: 1,
      sourceHouseId: b.id,
      originTeam: u.team,
      ...(b.housingReceipt.makerId === u.id ? { builtAt: b.housingReceipt.completedAt } : {}),
      demonstratedAt: g.state.time,
    };
    delete u.housingUse;
    u.resting = undefined;
    u.order = "idle";
    jobs.finish(key);
    jobs.forget(key);
    if (u.team === 0)
      g.banner(
        "The improved home has been tried and adopted locally. Timber homes are available.",
        5,
      );
  }
  return true;
}
function clearHomeUseClaim(g: Game, u: Unit) {
  const jobs = workRuntime(g),
    id = `home-use:${u.id}`;
  if (jobs.job(id)) {
    jobs.finish(id, true);
    jobs.forget(id);
  }
}
const clocks = new WeakMap<Game, { state: GameState; next: number; npc: number }>();
/** Reconcile every physical carrier before dead/deleted actors can disappear. */
export function tickHousing(g: Game, dt: number) {
  for (const b of g.state.buildings) {
    const p = b.renovation;
    if (!p) continue;
    refreshUnpaidHousingQuote(p);
    const u = p.actorId === null ? undefined : g.state.units.find((u) => u.id === p.actorId);
    if (p.actorId !== null && !u) {
      p.actorId = null;
      p.phase = "planned";
      if (p.parcel.kind === "carrier") p.parcel = { kind: "ground", x: p.parcel.x, z: p.parcel.z };
      p.blockedReason = "Previous carrier missing; packet retained at its last actual position";
    }
    if (u?.housingCargo?.buildingId === b.id) {
      u.housingCargo.materials = p.packet;
      p.packetTeam = u.housingCargo.custodyTeam;
      if (p.parcel.kind === "carrier") {
        p.parcel.x = u.x;
        p.parcel.z = u.z;
      }
    }
    if (!p.paid && p.progress === 0) {
      p.sourceTeam = b.team;
      p.packetTeam = b.team;
      p.paidBy = b.team;
    }
    p.custodyTeam = b.team;
    if (p.paid && p.source?.cacheId !== undefined) {
      const source = g.state.buildings.find(
        (v) =>
          v.id === p.source!.cacheId &&
          Math.hypot(v.x - p.source!.x, v.z - p.source!.z) < 0.1 &&
          v.hp > 0,
      );
      if (source) p.sourceTeam = source.team;
    }
    if (
      u &&
      (u.hp <= 0 || u.team !== p.custodyTeam || u.prisoner || u.emergency || u.buildOrder !== b.id)
    )
      releaseActor(
        g,
        b,
        u,
        u.hp <= 0
          ? "Builder died; actual packet dropped in place"
          : "Builder/target ownership or orders separated; paid work retained",
      );
    if (b.hp <= 0) {
      if (u) releaseActor(g, b, u, "Structure lost; actual packet retained");
      if (p.paid) {
        g.state.retainedHousingProjects ??= [];
        g.state.retainedHousingProjects.push({
          version: 1,
          id: g.id(),
          buildingId: b.id,
          team: p.custodyTeam,
          project: p,
          reason:
            "Original structure lost; source, site materials, progress and dropped packet retained",
        });
      }
      delete b.renovation;
      continue;
    }
    if (!housingOwnerCanContinue(p, b.team)) {
      if (u) {
        releaseActor(g, b, u, "Target ownership separated; physical inputs retained");
        u.buildOrder = undefined;
        if (["build", "hold"].includes(u.order)) {
          u.order = "idle";
          u.node = null;
        }
      }
      p.phase = "paused";
      p.blockedReason =
        "Paid project and current building owners differ; original physical materials/progress retained";
    }
  }
  for (const u of g.state.units) {
    if (u.housingUse && (u.hp <= 0 || u.housingUse.paused)) {
      clearHomeUseClaim(g, u);
      if (u.hp <= 0) delete u.housingUse;
    }
    if (
      u.housingCargo &&
      !g.state.buildings.some((b) => b.id === u.housingCargo!.buildingId && b.renovation)
    )
      pauseHousingWorker(g, u);
  }
  const old = clocks.get(g);
  if (old?.state === g.state && old.next > g.state.time) return;
  const now = {
    state: g.state,
    next: g.state.time + HOUSING_RULES.reviewSeconds,
    npc: old?.state === g.state ? old.npc : 0,
  };
  clocks.set(g, now);
  if (g.state.time < now.npc) return;
  now.npc = g.state.time + HOUSING_RULES.npcReviewSeconds;
  for (const t of g.state.tribes) {
    if (
      t.id === 0 ||
      t.id === 3 ||
      !t.alive ||
      reserveSeconds(g, t.id) < HOUSING_RULES.npcMealReserveSeconds
    )
      continue;
    const people = g.state.units.filter((u) => u.team === t.id && adult(g, u)),
      need = g.popCap(t.id) - g.popNow(t.id) < 2 || people.some((u) => (u.coldSeconds || 0) > 30);
    const home = g.state.buildings.find(
      (b) =>
        b.team === t.id &&
        b.type === "house" &&
        g.finished(b) &&
        b.housingReceipt &&
        !b.housingReceipt.adoptedAt,
    );
    if (home && (need || people.some((u) => (u.fatigue || 0) > 0.12))) {
      beginHomeUse(g, home.id, t.id);
      continue;
    }
    if (!need) continue;
    if (g.state.buildings.some((b) => b.team === t.id && b.renovation)) continue;
    if (
      housingMaterialIssue(g, t.id) ||
      t.wood - HOUSING_RULES.wood < HOUSING_RULES.npcTimberReserve ||
      t.stone - HOUSING_RULES.stone < HOUSING_RULES.npcStoneReserve
    )
      continue;
    const hut = g.state.buildings.find((b) => b.team === t.id && !housingPlanIssue(g, b)&&people.some(u=>!u.emergency&&!u.jobLock&&!u.buildOrder&&!u.carry&&!hasTaskCommitment(u)&&!!housingApproach(g,u,b)));
    if (hut) beginHousingUpgrade(g, hut.id, t.id);
  }
}
/** A legal whole handover moves actual project ownership with its sites/cache.
 * Partial separations retain the original claim and coordinates, never remote-credit inputs. */
export function settleHousingHandover(
  s: GameState,
  from: number,
  to: number,
  whole: boolean,
  sites: Set<number>,
  people: Set<number>,
) {
  for (const b of s.buildings) {
    const p = b.renovation;
    if (!p) continue;
    if (sites.has(b.id)) p.custodyTeam = to;
    if (
      p.sourceTeam === from &&
      (whole || (p.source?.cacheId !== undefined && sites.has(p.source.cacheId)))
    )
      p.sourceTeam = to;
    if (
      p.packetTeam === from &&
      (whole ||
        (p.parcel.kind === "carrier" && p.actorId !== null && people.has(p.actorId)) ||
        (p.parcel.kind === "site" && sites.has(b.id)))
    )
      p.packetTeam = to;
    const u = p.actorId === null ? undefined : s.units.find((u) => u.id === p.actorId);
    if (u?.housingCargo) {
      u.housingCargo.custodyTeam = p.packetTeam;
      u.housingCargo.materials = p.packet;
    }
    if (u && (u.team !== b.team || !housingOwnerCanContinue(p, b.team))) {
      if (u.housingCargo) {
        p.parcel = { kind: "ground", x: u.x, z: u.z };
        delete u.housingCargo;
      }
      delete u.housingWorkId;
      if (u.buildOrder === b.id) u.buildOrder = undefined;
      if (["build", "hold"].includes(u.order)) {
        u.order = "idle";
        u.node = null;
      }
      p.actorId = null;
      p.phase = "paused";
      p.blockedReason = "Community handover separated the actual material owners/locations";
    } else if (p.phase === "paused" && !b.planPaused && housingOwnerCanContinue(p, b.team)) {
      p.phase = "planned";
      p.blockedReason = undefined;
    }
  }
  for (const r of s.retainedHousingProjects || [])
    if (whole) {
      if (r.team === from) {
        r.team = to;
        r.project.custodyTeam = to;
      }
      if (r.project.sourceTeam === from) r.project.sourceTeam = to;
      if (r.project.packetTeam === from) r.project.packetTeam = to;
    }
  for (const u of s.units) {
    if (people.has(u.id) && u.housingCargo) u.housingCargo.custodyTeam = to;
    if (u.housingUse) {
      const b = s.buildings.find((b) => b.id === u.housingUse!.buildingId);
      if (!b || b.team !== u.team) u.housingUse.paused = true;
    }
  }
}
export function housingOwnerCanContinue(p: HousingRenovation, team: number) {
  return (
    p.custodyTeam === team &&
    (housingMaterialTotal(p.packet) > 0
      ? p.packetTeam === team
      : housingMaterialTotal(p.uncollected) === 0 || p.sourceTeam === team)
  );
}

export function relinkHousingViews(g: Game) {
  for (const b of g.state.buildings) {
    if(supportsEraUpgrade(b.type))ensureBuildingFabric(g,b);
    const p = b.renovation;
    if(!p)continue;
    refreshUnpaidHousingQuote(p);
    if(p.actorId===null)continue;
    const u = g.state.units.find((u) => u.id === p.actorId);
    if (u?.housingCargo?.buildingId === b.id) u.housingCargo.materials = p.packet;
  }
}
export function rebuildHousingOwnership(g: Game, jobs: import("./jobCoordinator").JobCoordinator) {
  for (const u of g.state.units) {
    const b =
      u.housingWorkId === undefined
        ? undefined
        : g.state.buildings.find(
            (b) =>
              b.id === u.housingWorkId &&
              b.renovation?.actorId === u.id &&
              b.team === u.team &&
              !b.planPaused,
          );
    if (b && u.hp > 0 && !u.prisoner) {
      const id = `construction:${b.id}:worker:${u.id}`;
      jobs.propose({ id, kind: "construction", owner: u.team, actors: [u.id], target: b.id });
      jobs.reserve(id, [{ key: `housing:${b.id}:workspot`, amount: 1, capacity: 1 }]);
    }
    const w = u.housingUse;
    if (w && !w.paused && u.hp > 0 && !u.prisoner) {
      const id = `home-use:${u.id}`;
      jobs.propose({
        id,
        kind: "practice:housing",
        owner: u.team,
        actors: [u.id],
        target: w.buildingId,
      });
      jobs.reserve(id);
    }
  }
}

export function setHousingPaused(g: Game, id: number, paused: boolean, team = 0) {
  const b = g.state.buildings.find((b) => b.id === id && b.team === team && b.renovation);
  if (!b || b.renovation!.custodyTeam !== team) return false;
  if (paused) {
    b.planPaused = true;
    for (const u of g.state.units)
      if (u.housingWorkId === b.id) {
        releaseActor(g, b, u, "Housing paused; physical materials retained");
        u.buildOrder = undefined;
        if (["build", "hold"].includes(u.order)) {
          u.order = "idle";
          u.node = null;
        }
      }
  } else {
    delete b.planPaused;
    b.renovation!.phase = "planned";
    b.renovation!.blockedReason = undefined;
    if (team === 0) queueConstruction(g, b);
    else g.assignBuilders(b);
  }
  g.workBoard.reset();
  return true;
}
export function housingQuoteText(q = housingQuote(), duration: number = HOUSING_RULES.workSeconds) {
  return [`${q.wood} logs`,`${q.stone} stone`,...(q.plantFibre>0?[`${q.plantFibre} fibre`]:[]),`${duration}s work + hauling`].join(" · ");
}

/** Preserve all reserved material buckets before a target is removed outside Game.step. */
export function retainHousingProject(g: Game, b: Building, reason: string) {
  const p = b.renovation;
  if (!p) return;
  for (const u of g.state.units)
    if (u.housingWorkId === b.id || u.housingCargo?.buildingId === b.id) {
      releaseActor(g, b, u, reason);
      if (u.buildOrder === b.id) u.buildOrder = undefined;
      u.node = null;
      if (u.order === "build") u.order = "idle";
    }
  p.actorId = null;
  if (p.paid) {
    g.state.retainedHousingProjects ??= [];
    g.state.retainedHousingProjects.push({
      version: 1,
      id: g.id(),
      buildingId: b.id,
      team: p.custodyTeam,
      project: p,
      reason,
    });
  }
  delete b.renovation;
}

/** Ordinary shelter expansion chooses the learned class only with real inputs/reserves. */
export function preferredRivalHome(g: Game, team: number): "hut" | "house" {
  const t = g.tribe(team);
  return !housingAdoptionIssue(g, team) &&
    !housingMaterialIssue(g, team) &&
    t.wood - HOUSING_RULES.wood >= HOUSING_RULES.npcTimberReserve &&
    t.stone - HOUSING_RULES.stone >= HOUSING_RULES.npcStoneReserve &&
    reserveSeconds(g, team) >= HOUSING_RULES.npcMealReserveSeconds
    ? "house"
    : "hut";
}
