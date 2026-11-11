import{hasConstructionWork}from'./constructionTargets';
import{housingFundingIssue,knowsHousing,housingOwnerCanContinue}from'./housing';
import{rawCerealField,collectCerealSheaves}from'./cerealRules';
import {scoutIndependentNeeds} from './scoutProvisions';
import {constructionPriority,CONSTRUCTION_QUEUE_RULES} from './constructionQueue';
import {coastalIndependentNeeds} from './coastalTrade';
import {sameTypedValues} from './terrainWalkCache';
import {campMoveIndependentNeeds} from './nomadicCamp';
import {societyMissionIndependentNeeds} from './rivalActivity';
import {prisonerIndependentNeeds} from './captivity';
import {reserveTreeWorker} from './workAllocation';
import {rivalOperationIntent} from './rivalOperations';
import {difficulty} from './difficulty';
import {expansionCost,plotArea} from './plots';
import {connectedForUnit} from "./waterTravel";
import {constructionDemand} from "./construction";
import {rivalWorkRangeContext,rivalMaterialPriority,rivalMaterialTargets,type RivalMaterialKind,RIVAL_RESOURCE_RANGE} from "./rivalDevelopment";
import {huntable} from "./hunting";
import {farmToolRate,wearFarmTool} from "./farmTools";
import {carryingCapacity} from "./haulage";
import {beginExpedition} from "./journeys";
import {bridgeApproach} from './transport';
import {quarryAvailable} from "./mining";
import {fishingBank,fishingGrounds} from "./fishing";
import { predisposition } from "./people";
import { readyNourishment, preservationAvailable } from "./pantry";
import {fieldTerrain} from "./fieldTerrain";
import { habitatAt } from "./ecology";
import type { Game } from "./sim";
import type { Building, Unit, ResKind, ResourceNode, Critter } from "./types";
import { LUMBER_R, QUARRY_R, DOCK_R, GATHER_WORK_RATE } from "./constants";

export const YEAR_SECONDS = 1800;
export const FOOD_PER_PERSON_SECOND = 0.036;
export function calendar(g: Game) {
  const year = Math.floor(g.state.time / YEAR_SECONDS);
  const phase = Math.floor((g.state.time % YEAR_SECONDS) / (YEAR_SECONDS / 4));
  return {
    year,
    phase,
    month: ["March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February"][Math.floor((g.state.time % YEAR_SECONDS) / (YEAR_SECONDS / 12))],
    name: ["Spring", "Summer", "Autumn", "Winter"][phase],
    remaining: YEAR_SECONDS / 4 - (g.state.time % (YEAR_SECONDS / 4)),
  };
}
export function isDependent(g: Game, u: Unit) {
  return u.maturesAt !== undefined && u.maturesAt > g.state.time;
}
export function foodDemand(g: Game, team = 0, phase = calendar(g).phase) {
  const mouths = g.state.units
    .filter((u) => u.team === team && u.hp > 0 && !u.expedition && !scoutIndependentNeeds(u)&&!prisonerIndependentNeeds(u)&&!societyMissionIndependentNeeds(g,u)&&!coastalIndependentNeeds(g,u)&&!campMoveIndependentNeeds(g,u))
    .reduce((sum, u) => sum + (isDependent(g, u) ? 0.5 : 1) * predisposition(u).appetite *
      (phase === 3 ? habitatAt(g, u.x, u.z).winterFood : 1)+(u.haulage==="pack"?(phase===3?.35:.08):0), 0);
  const weather = g.state.weather === "drought" ? 1.4 : g.state.weather === "frost" ? 1.15 : 1;
  return mouths * FOOD_PER_PERSON_SECOND * weather * (team===0?difficulty(g).food:1);
}
/** Storage protects food; it never caps the player's gathering orders. */
export function foodWorkTarget(g:Game,team=0){
  return team===0 ? Infinity : g.stockCap(team);
}
export function reserveSeconds(g: Game, team = 0) {
  return readyNourishment(g.tribe(team), team) / Math.max(0.055, foodDemand(g, team));
}
/** Shared by real ripening and read-only production forecasts. */
export function farmHarvestEstimate(g:Game,b:Building,planted=1,tended=1,water=b.crop?.water??1){
  const fields=b.team===0&&g.state.agePicks[3]==="econ"?1.2:1;
  const land=fieldTerrain(g,b),kind=b.crop?.kind||b.cropType||"grain";
  const yieldFactor=kind==="tubers"?land.tubers:land.grain*(kind==="pulses"?.85:1);
  return Math.floor(plotArea(b)*planted*(160+100*tended)*(b.fertility??1)*fields*water*yieldFactor);
}
export function crop(g: Game, b: Building) {
  const { year, phase } = calendar(g);
  if (!b.crop || b.crop.year !== year) {
    if (b.crop)
      b.fertility = Math.max(
        0.5,
        Math.min(
          1,
          (b.fertility ?? 1) +
            (b.crop.planted > 0
              ? -(b.crop.kind==="pulses"?.03:b.team === 0 && g.state.agePicks[3] === "econ" ? 0.07 : 0.12) * b.crop.planted
              : b.team === 0 && g.state.agePicks[3] === "econ"
                ? 0.3
                : 0.24),
        ),
      );
    b.crop = { year, planted: 0, tended: 0, remaining: 0, ripened: false, water:1,kind:b.cropType||"grain" };
  }
  if (phase === 2 && !b.crop.ripened) {
    b.crop.remaining = farmHarvestEstimate(g,b,b.crop.planted,b.crop.tended,b.crop.water??1);
    b.crop.ripened = true;
  }
  if (phase === 3) b.crop.remaining = 0;
  return b.crop;
}
export function farmAvailable(g: Game, b: Building) {
  if (b.fallowYear === calendar(g).year) return false;
  const c = crop(g, b),
    p = calendar(g).phase;
  return p === 0
    ? c.planted < 1
    : p === 1
      ? c.planted > 0 && c.tended < 1
      : p === 2
        ? c.remaining > 0
        : false;
}
export function farmWork(g: Game, u: Unit, b: Building, dt: number) {
  const c = crop(g, b),
    p = calendar(g).phase;
  if (!farmAvailable(g, b)) {
    u.order = "idle";
    u.node = null;
    return;
  }
  u.stride+=dt*8;u.facing=Math.atan2(b.x-u.x,b.z-u.z);
  u.workReason =
    p === 0 ? "Sowing the spring crop" : p === 1 ? "Tending the crop" : "Harvesting before winter";
  const open = GATHER_WORK_RATE * (b.team === 0 && g.state.agePicks[3] === "econ" ? 1.4 : 1)*farmToolRate(u,p);
  const toolSeconds=p===0?Math.min(dt,(1-c.planted)*180*plotArea(b)/open):p===1?Math.min(dt,(1-c.tended)*220*plotArea(b)/open):dt;
  if(wearFarmTool(u,toolSeconds)&&u.team===0)g.banner('A farming tool broke — hand work continues; repair it at a toolmaking workplace',4);
  if (p === 0) c.planted = Math.min(1, c.planted + (dt / (180*plotArea(b))) * open);
  else if (p === 1) c.tended = Math.min(1, c.tended + (dt / (220*plotArea(b))) * open);
  else {
    u.gatherT += dt;
    const pace = 0.8 / open;
    if (u.gatherT >= pace) {
      u.gatherT -= pace;
      const proposed = Math.min(2, c.remaining);
      if(rawCerealField(b)){
        const n=collectCerealSheaves(g,u,proposed,carryingCapacity(u,'food'));c.remaining-=n;
        u.workReason='Harvesting unthreshed cereal — grain still needs threshing and winnowing';
        if(n<proposed||Object.values(u.itemCargo||{}).reduce((a,v)=>a+(v||0),0)>=carryingCapacity(u,'food')||c.remaining===0)u.order='return';
        return;
      }
      const n=proposed;
      c.remaining -= n;
      u.carry += n;
      u.carryType = "food";
      u.carryFood = c.kind||"grain";
      if (u.carry >= carryingCapacity(u,"food") || c.remaining === 0) u.order = "return";
    }
  }
}

type Node = ResourceNode | Building | Critter;
type Task = { node: Node; kind: "build" | ResKind; slots: number; priority: number };
const NAVIGATION_NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
/** Assignments themselves reserve slots, so reservations survive save/load. */
export class WorkBoard {
  private tasks = new Map<number, Task[]>();
  private occupiedAt = -1;
  private occupancy = new Map<string, number>();
  private next = 0;
  private revision = -1;
  private nodeComponents = new WeakMap<Node, number>();
  private obstructionWorld: Game["world"] | null = null;
  private obstructionState: Game["state"] | null = null;
  private obstructionFootprints: number[] = [];
  private solidFootprints: Building[] = [];
  private obstructedResources = new WeakMap<Node, { x: number; z: number; blocked: boolean }>();
  private labels = new Int32Array(0);
  private labeledWalk = new Uint8Array(0);
  private labelNavigation(g: Game) {
    if (g.state.walkDirty) g.rebuildWalk();
    if (this.revision === g.navigationRevision()) return;
    this.revision = g.navigationRevision();
    const grid = g.walk,
      n = Math.sqrt(grid.length);
    this.nodeComponents = new WeakMap();
    if(sameTypedValues(grid,this.labeledWalk))return;
    this.labeledWalk=grid.slice();
    this.labels = new Int32Array(grid.length);
    const queue = new Int32Array(grid.length);
    let component = 0;
    for (let start = 0; start < grid.length; start++) {
      if (!grid[start] || this.labels[start]) continue;
      component++;
      let head = 0,
        tail = 0;
      queue[tail++] = start;
      this.labels[start] = component;
      while (head < tail) {
        const at = queue[head++],
          x = at % n,
          z = Math.floor(at / n);
        for (const [dx, dz] of NAVIGATION_NEIGHBORS) {
          const nx = x + dx,
            nz = z + dz;
          if (nx < 0 || nx >= n || nz < 0 || nz >= n) continue;
          const id = nz * n + nx;
          if (grid[id] && !this.labels[id]) {
            this.labels[id] = component;
            queue[tail++] = id;
          }
        }
      }
    }
  }
  private component(g: Game, x: number, z: number) {
    const n = Math.sqrt(g.walk.length),
      cx = Math.floor(((x + (g.world.size/2)) / g.world.size) * n),
      cz = Math.floor(((z + (g.world.size/2)) / g.world.size) * n);
    // Distance zero is already the exact minimum; retain the old nearest-cell
    // search (including its tie order) for obstructed or out-of-bounds centers.
    if (cx >= 0 && cx < n && cz >= 0 && cz < n) {
      const center = this.labels[cz * n + cx];
      if (center) return center;
    }
    let best = 0,
      distance = Infinity;
    for (let dz = -4; dz <= 4; dz++)
      for (let dx = -4; dx <= 4; dx++) {
        const ix = cx + dx,
          iz = cz + dz;
        if (ix < 0 || ix >= n || iz < 0 || iz >= n) continue;
        const label = this.labels[iz * n + ix],
          d = dx * dx + dz * dz;
        if (label && d < distance) {
          best = label;
          distance = d;
        }
      }
    return best;
  }
  connected(g: Game, ax: number, az: number, bx: number, bz: number) {
    this.labelNavigation(g);const a=this.component(g,ax,az);return a!==0&&a===this.component(g,bx,bz);
  }
  closestReachableCell(g: Game, ax: number, az: number, tx: number, tz: number) {
    this.labelNavigation(g);
    const component = this.component(g, ax, az);
    if (!component) return -1;
    const width = Math.sqrt(g.walk.length);
    const cell = g.world.size / width;
    const origin = -g.world.size / 2 + cell / 2;
    let best = -1, distance = Infinity;
    for (let i = 0; i < this.labels.length; i++) {
      if (this.labels[i] !== component) continue;
      const dx = origin + (i % width) * cell - tx;
      const dz = origin + Math.floor(i / width) * cell - tz;
      const candidate = dx * dx + dz * dz;
      if (candidate >= distance) continue;
      best = i;
      distance = candidate;
    }
    return best;
  }

  private taskComponent(g: Game, node: Node) {
    let value = this.nodeComponents.get(node);
    if (value === undefined) {
      value = this.component(g, node.x, node.z);
      this.nodeComponents.set(node, value);
    }
    return value;
  }
  private refreshObstructions(g: Game) {
    const solid = g.state.buildings.filter(b => g.solidBuilding(b));
    const footprints: number[] = [];
    for (const b of solid) footprints.push(b.x, b.z, b.w, b.d);
    if (this.obstructionWorld !== g.world || this.obstructionState !== g.state ||
        footprints.length !== this.obstructionFootprints.length ||
        footprints.some((v, i) => v !== this.obstructionFootprints[i])) {
      this.obstructedResources = new WeakMap();
      this.obstructionWorld = g.world;
      this.obstructionState = g.state;
      this.obstructionFootprints = footprints;
    }
    this.solidFootprints = solid;
  }
  private blockedResource(node: Node) {
    if ('type' in node || 'species' in node) return false;
    const cached = this.obstructedResources.get(node);
    if (cached && cached.x === node.x && cached.z === node.z) return cached.blocked;
    const blocked = this.solidFootprints.some(b =>
      Math.abs(node.x - b.x) < b.w * .4 && Math.abs(node.z - b.z) < b.d * .4);
    this.obstructedResources.set(node, { x: node.x, z: node.z, blocked });
    return blocked;
  }
  /** Inventory/actor-task changes do not invalidate unchanged terrain or solid
   * footprints. Still clear node components: wildlife/resource positions may
   * have moved since the last assignment. refreshObstructions checks the exact
   * current footprints again on the next task rebuild. */
  invalidateTasks() {
    this.next=0;
    this.occupiedAt=-1;
    this.tasks.clear();
    this.nodeComponents=new WeakMap();
  }
  reset() {
    this.obstructionWorld = null;
    this.obstructionState = null;
    this.obstructedResources = new WeakMap();
    this.solidFootprints = [];
    this.obstructionFootprints = [];
    this.next = 0;
    this.occupiedAt = -1;
    this.tasks.clear();
    this.revision = -1;
  }
  refresh(g: Game) {
    if (g.state.time < this.next && this.obstructionWorld === g.world && this.obstructionState === g.state) return;
    this.next = g.state.time + 1;
    this.tasks.clear();
    this.refreshObstructions(g);
    for (const t of g.state.tribes) {
      if (!t.alive || t.id === 3) continue;
      const list: Task[] = [], reserve=reserveSeconds(g,t.id),phase=calendar(g).phase,
        foodUrgency = reserve<90 ? 320 : reserve < 240 ? 180 : 80;
      const buildings = g.state.buildings.filter((b) => b.team === t.id && b.hp > 0);
      const needed=new Set((["wood","stone","copper","iron"] as ResKind[]).filter(k=>constructionDemand(g,t.id,k)));
      const add = (node: Node, kind: Task["kind"], slots: number, priority: number) => {
        if(!this.blockedResource(node))list.push({ node, kind, slots, priority:priority+(needed.has(kind as ResKind)?90:0) });
      };
      const nearby = (n: Node, type: string, r: number) =>
        buildings.some(
          (b) => b.type === type && g.finished(b) && Math.hypot(b.x - n.x, b.z - n.z) < r,
        );
      for (const b of buildings) {
        if(b.renovation){const p=b.renovation;if(!b.planPaused&&housingOwnerCanContinue(p,b.team)&&(p.paid||!housingFundingIssue(g,b.team,p.quote)))add(b,'build',1,235+(constructionPriority(b)-1)*CONSTRUCTION_QUEUE_RULES.automaticPriorityDelta);continue;}
        if(b.plannedCost)continue;
        if(b.expansion&&(b.expansion.paid||g.canAfford(b.team,expansionCost(b,b.expansion))))add(b,"build",2,235+(constructionPriority(b)-1)*CONSTRUCTION_QUEUE_RULES.automaticPriorityDelta);
        if (!g.finished(b)) {
          add(b, "build", 2, (reserve < 90 ? 120 : 235)+(constructionPriority(b)-1)*CONSTRUCTION_QUEUE_RULES.automaticPriorityDelta);
          continue;
        }
        if (b.type === "farm" && farmAvailable(g, b))
          add(b, "food", Math.min(12,Math.ceil(3*plotArea(b))), phase === 2 ? 500 : reserve<90 ? 100 : 210);
        if (b.type === "dock" && fishingGrounds(g,b).length) add(b, "food", 2, foodUrgency+65);
        if(b.type==="quarry"&&quarryAvailable(g,b))add(b,"stone",2,Math.max(25,100-t.stone*.35));
        if (preservationAvailable(g, b)) add(b, "food", 1, phase === 2 ? 105 : 85);
      }
      for(const n of g.state.fish)if(n.amount>=1&&!nearby(n,"dock",DOCK_R))add(n,"food",1,foodUrgency-20);
      for (const n of g.state.forage) if (n.amount > 0) add(n, "food", 2, foodUrgency+(n.cropCandidate&&!t.cultivated?.length?35:0));
      const woodPriority=Math.max(15,95-t.wood*.35);
      for (const n of g.state.trees)
        if (n.amount > 0)
          add(n, "wood", 2, t.id === 0 && g.chopMarks.has(n.id) ? 140 : woodPriority);
      const camp=g.campOf(t.id),stonePriority=Math.max(10,65-t.stone*.4);
      for (const n of g.state.stones)
        if (
          n.amount > 0 &&
          (g.cornerstoneAt(n.x, n.z, t.id) || nearby(n, "quarry", QUARRY_R) ||
            Math.hypot(n.x - camp.x, n.z - camp.z) < 28)
        )
          add(n, "stone", 2, stonePriority);
      if (t.age >= 1 || t.id===0)
        for (const n of g.state.copper) if (n.amount > 0) add(n, "copper", 2, 45 - t.copper * 0.25);
      if (t.age >= 2)
        for (const n of g.state.iron) if (n.amount > 0) add(n, "iron", 2, 40 - t.iron * 0.25);
      for (const n of g.state.wildlife)
        if (huntable(g,n,t.id)) add(n, "food", n.hp<=0?2:1, foodUrgency + (n.hp<=0?100:phase===3?35:-10));
      this.tasks.set(t.id, list);
    }
  }
  assign(g: Game, u: Unit) {
    if(u.housingWorkId!==undefined||u.housingUse&&!u.housingUse.paused)return;
    if(u.coastalCommissionId||u.coastalVoyageId||u.productionProjectId||u.campMoveId||u.contactDemand||u.contactAttackTargetId!==undefined||u.societyMissionId||u.coastalVoyageId||u.coastalCommissionId||u.prisoner||u.escortId!==undefined||u.conflictIntent==='occupy'||u.conflictIntent==='capture')return;
    if(u.team===0&&g.state.autoWorkEnabled===false&&!u.jobLock){u.order=u.carry>0?'return':'hold';u.node=null;u.workReason=u.carry>0?'Delivering supplies before waiting for your order':'Manual work — select this resident and give an order';return;}
    if(u.prisoner){u.order='hold';u.node=null;u.target=null;u.workReason='Custody and release need their own orders; no automatic labor';return;}
    if(u.waterWork&&!u.waterWork.paused)return;
    if((u.waterWork?.liters??0)>0){u.order='return';u.workReason='Delivering carried drinking water before another assignment';return;}
    if (isDependent(g, u)) {
      u.workReason = "Growing up — supported by the village";
      return;
    }
    if ((u.workCheckAt || 0) > g.state.time) return;
    // Spread retries so a large idle population does not all rescan on one frame.
    u.workCheckAt = g.state.time + 0.75 + (u.id % 17) / 34;
    this.refresh(g);
    this.labelNavigation(g);
    const origin = this.component(g, u.x, u.z);
    if (u.carry > 0) {
      u.order = "return";
      u.workReason = "Delivering carried supplies";
      return;
    }
    if(u.team===0&&g.state.laborPolicy==="explore"&&!u.jobLock&&reserveSeconds(g)>=240){
      const adults=g.state.units.filter(p=>p.team===0&&p.hp>0&&p.type==="worker"&&!isDependent(g,p));
      const active=adults.filter(p=>p.expedition&&!p.expedition.returning).length;
      const limit=Math.min(3,Math.max(1,Math.floor(adults.length/4)));
      if(active<limit){const next=g.findExploreTarget(u);if(next&&beginExpedition(g,u)){
        g.interruptMission(u);u.order="explore";u.tx=next.x;u.tz=next.z;u.node=null;u.target=null;u.job=null;u.pillage=-1;u.attackDestination=null;u.workReason="Village exploration focus — searching for resources and neighbours";return;
      }}
    }
    if (this.occupiedAt !== g.state.time) {
      this.occupiedAt = g.state.time;
      this.occupancy.clear();
      for (const other of g.state.units) {
        if (
          other.hp <= 0 ||
          other.emergency ||
          !other.node ||
          !["gather", "build"].includes(other.order)
        )
          continue;
        const key = String(other.node.id)+(other.order==="build"?":build":":gather");
        this.occupancy.set(key, (this.occupancy.get(key) || 0) + 1);
      }
    }
    const list = this.tasks.get(u.team) || [];
    let best: Task | null = null,
      score = -Infinity;
    let occupied = false,
      unsafe = false;
    const materialTargets=u.team===0?null:rivalMaterialTargets(g,u.team),materialStocks=g.tribe(u.team);
    const materialPriorities = u.team===0 ? null : Object.fromEntries(
      (["wood","stone","copper","iron"] as ResKind[]).map(kind=>[kind,rivalMaterialPriority(g,u,kind,materialTargets!)]));
    // These predicates are invariant during one synchronous assignment scan.
    // Rebuild them on every assignment so deaths, diplomacy and completed work
    // are immediately visible without a cross-frame cache.
    const foes=g.state.units.filter(e=>e.hp>0&&g.isFoe(u.team,e.team));
    const workRange=u.team===0?null:rivalWorkRangeContext(g,u.team);
    const lumberSites=g.state.buildings.filter(b=>b.team===u.team&&b.type==='lumber'&&g.finished(b));
    const quarrySites=g.state.buildings.filter(b=>b.team===u.team&&b.type==='quarry'&&g.finished(b));
    // Food stock, household membership and storage stay fixed during scoring.
    // Reuse only within this scan; the next resident sees all live changes.
    let taskFoodTarget: number | undefined, taskReserve: number | undefined;
    const foodTarget = () => taskFoodTarget ??= foodWorkTarget(g, u.team);
    const reserve = () => taskReserve ??= reserveSeconds(g, u.team);
    let rawBacklog:boolean|undefined;const cerealBacklog=()=>rawBacklog??=!!((g.tribe(u.team).items?.grainSheaves||0)>=8||(g.tribe(u.team).items?.roughGrain||0)>=6||g.state.units.some(p=>p.team===u.team&&p.hp>0&&(p.itemCargo?.grainSheaves||0)>=8));
    for (const task of list) {
      if (u.team === 0 && !("type" in task.node) &&
          ("species" in task.node&&task.node.hp>0 ? !g.visibleAt(task.node.x, task.node.z) : !g.exploredAt(task.node.x, task.node.z))) continue;
      const preparingField =
        task.kind==='food' && "type" in task.node && task.node.type === "farm" && calendar(g).phase < 2;
      const harvestingField = task.kind==='food' && "type" in task.node && task.node.type === "farm" && calendar(g).phase===2;
      if(harvestingField&&rawCerealField(task.node as Building)&&!u.jobLock&&reserve()<240&&cerealBacklog())continue;
      const preserving = task.kind==='food' && "type" in task.node && task.node.type === "warehouse";
      if (preserving && !preservationAvailable(g, task.node as Building)) continue;
      if (task.kind === "food" && !preparingField && !harvestingField && !preserving && g.tribe(u.team).food >= foodTarget())
        continue;
      if(u.team===0&&g.state.laborPolicy==="food"&&reserve()<240&&task.kind!=="food"&&!u.jobLock)continue;
      if (u.jobLock && u.job && task.kind !== u.job) continue;
      if(materialTargets&&!u.jobLock&&['wood','stone','copper','iron'].includes(task.kind)&&materialStocks[task.kind as RivalMaterialKind]>=materialTargets[task.kind as RivalMaterialKind])continue;
      if (u.huntOnly && reserve()>=90 && !("species" in task.node)) continue;
      if (u.blockedTask === task.node.id && (u.retryWorkAt || 0) > g.state.time) continue;
      if ("hp" in task.node && task.node.hp <= 0 && !("species" in task.node&&huntable(g,task.node,u.team))) continue;
      if ("amount" in task.node && task.node.amount <= 0) continue;
      if(task.kind==='build'){const b=task.node as Building;if(!hasConstructionWork(b)||b.planPaused||b.renovation&&(!housingOwnerCanContinue(b.renovation,u.team)||b.renovation.mode==='new'&&!knowsHousing(u)))continue;}
      if (
        task.kind==='food' && "type" in task.node &&
        task.node.type === "farm" &&
        !farmAvailable(g, task.node as Building)
      )
        continue;
      const distance = Math.hypot(task.node.x - u.x, task.node.z - u.z);
      // Routine labor must not chase a herd or successive trees across the world.
      // New settlements have their own hall; scouts and traders travel separately.
      if (u.team !== 0 && !("type" in task.node) &&
          !workRange!(task.node.x,task.node.z,task.kind as ResKind)) continue;
      const markedWork = u.team === 0 && task.kind === "wood" && g.chopMarks.has(task.node.id);
      const lumberWork = task.kind === "wood" && lumberSites.some(b=>Math.hypot(b.x-task.node.x,b.z-task.node.z)<=LUMBER_R);
      const rivalOutpostWork = u.team!==0 && ((['wood','stone','copper','iron'].includes(task.kind)&&workRange!(task.node.x,task.node.z,task.kind as ResKind)) ||
        (task.kind==='build'&&'type' in task.node&&['lumber','quarry'].includes(task.node.type)&&Math.hypot(task.node.x-g.campOf(u.team).x,task.node.z-g.campOf(u.team).z)<RIVAL_RESOURCE_RANGE));
      // Completed quarries remain real workplaces after a miner unloads at home.
      // All route, danger and worker-slot checks below still apply.
      const quarryWork = ["stone","copper","iron"].includes(task.kind) &&
        ("type" in task.node ? task.node.type === "quarry" && task.node.team === u.team && g.finished(task.node) :
          quarrySites.some(b=>Math.hypot(b.x-task.node.x,b.z-task.node.z)<=QUARRY_R));
      const settlementWork = rivalOutpostWork || lumberWork || quarryWork || markedWork || g.cornerstoneAt(task.node.x, task.node.z, u.team) ||
        (task.kind === "build" && "type" in task.node && task.node.type === "cornerstone");
      // An explicit timber focus may use discovered forests beyond routine range.
      // Connectivity, danger checks and the two-cutter reservation still apply.
      const timberFocus = u.team===0 && task.kind==='wood' &&
        (g.state.laborPolicy==='wood' || (u.jobLock && u.job==='wood'));
      const routineRange = timberFocus ? 220 : 100;
      const bankFish = "kind" in task.node && task.node.kind === "fish";
      if ((distance > routineRange && !settlementWork) || (!bankFish && (u.haulage==="canoe" ? ("type" in task.node ? !g.interactionSpot(u,task.node) : !connectedForUnit(g,u,task.node.x,task.node.z)) : !origin || ("type" in task.node&&task.node.type==="bridge" ? !bridgeApproach(g,u,task.node) : this.taskComponent(g, task.node) !== origin)))) continue;
      if (
        foes.some(e=>Math.hypot(e.x-task.node.x,e.z-task.node.z)<14)
      ) {
        unsafe = true;
        continue;
      }
      const count = this.occupancy.get(String(task.node.id)+(task.kind==="build"?":build":":gather")) || 0;
      if (count >= task.slots) {
        occupied = true;
        continue;
      }
      const policy = g.state.laborPolicy;
      const bonus =
        u.team === 0 && ((policy === "wood" && task.kind === "wood") || (policy === "stone" && task.kind === "stone") || (policy === "hunt" && "species" in task.node))
          ? (reserve()<90?80:240)
          : u.team===0 && policy === "food" && task.kind === "food"
          ? 70
          : u.team===0 && policy === "build" && task.kind === "build"
            ? 90
            : 0;
      const value = task.priority + bonus + (materialPriorities?.[task.kind]||0) + (lumberWork ? 35 : 0) - distance * 0.8 - count * 15;
      if (value > score) {
        if(bankFish&&!fishingBank(g,u,task.node as ResourceNode))continue;
        score = value;
        best = task;
      }
    }
    if (!best) {
      const search=u.huntOnly||g.state.laborPolicy==="hunt"?"hunt":u.jobLock&&u.job?u.job:reserveSeconds(g,u.team)<240?"food":g.state.laborPolicy;
      if(u.team===0&&["wood","food","hunt"].includes(search||"")&&!(["food","hunt"].includes(search||"")&&g.tribe(u.team).food>=foodWorkTarget(g,u.team))&&(!occupied||search==="wood"||(["food","hunt"].includes(search||"")&&reserveSeconds(g,u.team)<240))&&!unsafe&&u.carry===0) {
        const foodSearch=["food","hunt"].includes(search||"");
        const searchers=g.state.units.filter(p=>p.team===u.team&&p.hp>0&&p.id!==u.id&&p.order==="explore"&&["food","hunt"].includes(p.searchJob||"")).length;
        if(foodSearch&&searchers>=Math.max(1,Math.ceil(g.state.units.filter(p=>p.team===u.team&&p.hp>0&&p.type==="worker"&&!isDependent(g,p)).length/3))){u.workReason="Food sites occupied — a search party is finding more";return;}
        if(search==="wood"&&g.state.units.filter(p=>p.team===u.team&&p.hp>0&&p.order==="explore"&&p.searchJob==="wood").length>=2){u.workReason="Two cutters per tree — a small party is looking for more timber";return;}
        const destination=u.order==="explore"?{x:u.tx,z:u.tz}:g.findExploreTarget(u);
        if(destination){u.searchJob=search as "wood"|"food"|"hunt";u.order="explore";u.node=null;u.tx=destination.x;u.tz=destination.z;u.workReason=`Searching unknown ground for ${search==="hunt"?"herds":search==="wood"?"timber":"food"}`;return;}
      }


      u.workReason =
        g.tribe(u.team).food >= foodWorkTarget(g,u.team) && (u.job === "food" || !u.jobLock)
          ? "Food stores full — build storage or assign another job"
          : unsafe
            ? "Waiting for a safe work site"
            : occupied
              ? "All suitable work sites are occupied"
              : u.jobLock
                ? "No available work for the assigned job"
                : "No known reachable work — explore for resources or build an outpost";
      return;
    }
    if(best.kind==='wood'&&'kind' in best.node&&best.node.kind==='tree'&&!reserveTreeWorker(g,best.node as ResourceNode,u)){
      u.workReason='Tree slots reserved — finding another work site';u.node=null;u.order='idle';return;
    }
    const key = String(best.node.id)+(best.kind==="build"?":build":":gather");
    this.occupancy.set(key, (this.occupancy.get(key) || 0) + 1);
    u.searchJob=undefined;
    u.node = best.node;
    u.order = best.kind === "build" ? "build" : "gather";
    u.job = best.kind === "build" ? null : best.kind;
    u.tx = best.node.x;
    u.tz = best.node.z;
    u.stuckT = 0;
    u.workReason =
      best.kind === "build" ? "Building with a reserved work slot" : `Working: ${best.kind}`;
  }
}

export {emergencyResponse} from './defense';

export function neighborIntent(g: Game, team: number): "recover" | "trade" | "defend" | "raid" {
  return rivalOperationIntent(g,team,reserveSeconds(g,team));
}
