import {difficulty} from './difficulty';
import {expansionCost,plotArea} from './plots';
import {connectedForUnit} from "./waterTravel";
import {constructionDemand} from "./construction";
import {rivalWorkRange,rivalMaterialPriority,RIVAL_RESOURCE_RANGE} from "./rivalDevelopment";
import {huntable} from "./hunting";
import {farmToolRate} from "./farmTools";
import {carryingCapacity} from "./haulage";
import {beginExpedition} from "./journeys";
import {bridgeApproach} from './transport';
import {quarryAvailable} from "./mining";
import {fishingGrounds} from "./fishing";
import { predisposition } from "./people";
import { preservationAvailable } from "./pantry";
import {fieldTerrain} from "./fieldTerrain";
import { habitatAt } from "./ecology";
import type { Game } from "./sim";
import type { Building, Unit, ResKind, ResourceNode, Critter } from "./types";
import { LUMBER_R, QUARRY_R, DOCK_R, MAP, HALF, GATHER_WORK_RATE } from "./constants";

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
    .filter((u) => u.team === team && u.hp > 0 && !u.expedition)
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
  return g.tribe(team).food / Math.max(0.055, foodDemand(g, team));
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
  if (p === 0) c.planted = Math.min(1, c.planted + (dt / (180*plotArea(b))) * open);
  else if (p === 1) c.tended = Math.min(1, c.tended + (dt / (220*plotArea(b))) * open);
  else {
    u.gatherT += dt;
    const pace = 0.8 / open;
    if (u.gatherT >= pace) {
      u.gatherT -= pace;
      const n = Math.min(2, c.remaining);
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
/** Assignments themselves reserve slots, so reservations survive save/load. */
export class WorkBoard {
  private tasks = new Map<number, Task[]>();
  private occupiedAt = -1;
  private occupancy = new Map<string, number>();
  private next = 0;
  private revision = -1;
  private nodeComponents = new WeakMap<Node, number>();
  private labels = new Int32Array(0);
  private labelNavigation(g: Game) {
    if (g.state.walkDirty) g.rebuildWalk();
    if (this.revision === g.navigationRevision()) return;
    this.revision = g.navigationRevision();
    const grid = g.walk,
      n = Math.sqrt(grid.length);
    this.labels = new Int32Array(grid.length);
    this.nodeComponents = new WeakMap();
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
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
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
      cx = Math.floor(((x + HALF) / MAP) * n),
      cz = Math.floor(((z + HALF) / MAP) * n);
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
  private taskComponent(g: Game, node: Node) {
    let value = this.nodeComponents.get(node);
    if (value === undefined) {
      value = this.component(g, node.x, node.z);
      this.nodeComponents.set(node, value);
    }
    return value;
  }
  reset() {
    this.next = 0;
    this.occupiedAt = -1;
    this.tasks.clear();
    this.revision = -1;
  }
  refresh(g: Game) {
    if (g.state.time < this.next) return;
    this.next = g.state.time + 1;
    this.tasks.clear();
    const solid=g.state.buildings.filter(b=>g.solidBuilding(b)),obstructed=new Map<Node,boolean>();
    const blockedResource=(node:Node)=>{
      if('type' in node||'species' in node)return false;
      let blocked=obstructed.get(node);
      if(blocked===undefined){blocked=solid.some(b=>Math.abs(node.x-b.x)<b.w*.4&&Math.abs(node.z-b.z)<b.d*.4);obstructed.set(node,blocked);}
      return blocked;
    };
    for (const t of g.state.tribes) {
      if (!t.alive || t.id === 3) continue;
      const list: Task[] = [],
        pop = g.popNow(t.id),
        foodUrgency = reserveSeconds(g,t.id)<90 ? 320 : reserveSeconds(g, t.id) < 240 ? 180 : 80;
      const buildings = g.state.buildings.filter((b) => b.team === t.id && b.hp > 0);
      const needed=new Set((["wood","stone","copper","iron"] as ResKind[]).filter(k=>constructionDemand(g,t.id,k)));
      const add = (node: Node, kind: Task["kind"], slots: number, priority: number) => {
        if(!blockedResource(node))list.push({ node, kind, slots, priority:priority+(needed.has(kind as ResKind)?90:0) });
      };
      const nearby = (n: Node, type: string, r: number) =>
        buildings.some(
          (b) => b.type === type && g.finished(b) && Math.hypot(b.x - n.x, b.z - n.z) < r,
        );
      for (const b of buildings) {
        if(b.plannedCost)continue;
        if(b.expansion&&(b.expansion.paid||g.canAfford(b.team,expansionCost(b,b.expansion))))add(b,"build",2,235);
        if (!g.finished(b)) {
          add(b, "build", 2, reserveSeconds(g,t.id) < 90 ? 120 : 235);
          continue;
        }
        if (b.type === "farm" && farmAvailable(g, b))
          add(b, "food", Math.min(12,Math.ceil(3*plotArea(b))), calendar(g).phase === 2 ? 500 : reserveSeconds(g,t.id)<90 ? 100 : 210);
        if (b.type === "dock" && fishingGrounds(g,b).length) add(b, "food", 2, foodUrgency+65);
        if(b.type==="quarry"&&quarryAvailable(g,b))add(b,"stone",2,Math.max(25,100-t.stone*.35));
        if (preservationAvailable(g, b)) add(b, "food", 1, calendar(g).phase === 2 ? 105 : 85);
      }
      for(const n of g.state.fish)if(n.amount>=1&&!nearby(n,"dock",DOCK_R))add(n,"food",1,foodUrgency-20);
      for (const n of g.state.forage) if (n.amount > 0) add(n, "food", 2, foodUrgency+(n.cropCandidate&&!t.cultivated?.length?35:0));
      for (const n of g.state.trees)
        if (n.amount > 0)
          add(n, "wood", 2, t.id === 0 && g.chopMarks.has(n.id) ? 140 : Math.max(15, 95 - t.wood * 0.35));
      for (const n of g.state.stones)
        if (
          n.amount > 0 &&
          (g.cornerstoneAt(n.x, n.z, t.id) || nearby(n, "quarry", QUARRY_R) ||
            Math.hypot(n.x - g.campOf(t.id).x, n.z - g.campOf(t.id).z) < 28)
        )
          add(n, "stone", 2, Math.max(10, 65 - t.stone * 0.4));
      if (t.age >= 1 || t.id===0)
        for (const n of g.state.copper) if (n.amount > 0) add(n, "copper", 2, 45 - t.copper * 0.25);
      if (t.age >= 2)
        for (const n of g.state.iron) if (n.amount > 0) add(n, "iron", 2, 40 - t.iron * 0.25);
      for (const n of g.state.wildlife)
        if (huntable(g,n,t.id)) add(n, "food", n.hp<=0?2:1, foodUrgency + (n.hp<=0?100:calendar(g).phase===3?35:-10));
      this.tasks.set(t.id, list);
    }
  }
  assign(g: Game, u: Unit) {
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
    const materialPriorities = u.team===0 ? null : Object.fromEntries(
      (["wood","stone","copper","iron"] as ResKind[]).map(kind=>[kind,rivalMaterialPriority(g,u,kind)]));
    for (const task of list) {
      if (u.team === 0 && !("type" in task.node) &&
          ("species" in task.node&&task.node.hp>0 ? !g.visibleAt(task.node.x, task.node.z) : !g.exploredAt(task.node.x, task.node.z))) continue;
      const preparingField =
        task.kind==='food' && "type" in task.node && task.node.type === "farm" && calendar(g).phase < 2;
      const harvestingField = task.kind==='food' && "type" in task.node && task.node.type === "farm" && calendar(g).phase===2;
      const preserving = task.kind==='food' && "type" in task.node && task.node.type === "warehouse";
      if (preserving && !preservationAvailable(g, task.node as Building)) continue;
      if (task.kind === "food" && !preparingField && !harvestingField && !preserving && g.tribe(u.team).food >= foodWorkTarget(g,u.team))
        continue;
      if(u.team===0&&g.state.laborPolicy==="food"&&reserveSeconds(g,u.team)<240&&task.kind!=="food"&&!u.jobLock)continue;
      if (u.jobLock && u.job && task.kind !== u.job) continue;
      if (u.huntOnly && reserveSeconds(g,u.team)>=90 && !("species" in task.node)) continue;
      if (u.blockedTask === task.node.id && (u.retryWorkAt || 0) > g.state.time) continue;
      if ("hp" in task.node && task.node.hp <= 0 && !("species" in task.node&&huntable(g,task.node,u.team))) continue;
      if ("amount" in task.node && task.node.amount <= 0) continue;
      if (task.kind === "build" && g.finished(task.node as Building)&&!(task.node as Building).expansion) continue;
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
          !rivalWorkRange(g,u.team,task.node.x,task.node.z,task.kind as ResKind)) continue;
      const markedWork = u.team === 0 && task.kind === "wood" && g.chopMarks.has(task.node.id);
      const lumberWork = task.kind === "wood" && g.state.buildings.some(b => b.team === u.team && b.type === "lumber" && g.finished(b) && Math.hypot(b.x-task.node.x,b.z-task.node.z)<=LUMBER_R);
      const rivalOutpostWork = u.team!==0 && ((['wood','stone','copper','iron'].includes(task.kind)&&rivalWorkRange(g,u.team,task.node.x,task.node.z,task.kind as ResKind)) ||
        (task.kind==='build'&&'type' in task.node&&['lumber','quarry'].includes(task.node.type)&&Math.hypot(task.node.x-g.campOf(u.team).x,task.node.z-g.campOf(u.team).z)<RIVAL_RESOURCE_RANGE));
      const settlementWork = rivalOutpostWork || lumberWork || markedWork || g.cornerstoneAt(task.node.x, task.node.z, u.team) ||
        (task.kind === "build" && "type" in task.node && task.node.type === "cornerstone");
      // An explicit timber focus may use discovered forests beyond routine range.
      // Connectivity, danger checks and the two-cutter reservation still apply.
      const timberFocus = u.team===0 && task.kind==='wood' &&
        (g.state.laborPolicy==='wood' || (u.jobLock && u.job==='wood'));
      const routineRange = timberFocus ? 220 : 100;
      if ((distance > routineRange && !settlementWork) || (u.haulage==="canoe" ? ("type" in task.node ? !g.interactionSpot(u,task.node) : !connectedForUnit(g,u,task.node.x,task.node.z)) : !origin || ("type" in task.node&&task.node.type==="bridge" ? !bridgeApproach(g,u,task.node) : this.taskComponent(g, task.node) !== origin))) continue;
      if (
        g.state.units.some(
          (e) =>
            e.hp > 0 &&
            g.isFoe(u.team, e.team) &&
            Math.hypot(e.x - task.node.x, e.z - task.node.z) < 14,
        )
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
          ? (reserveSeconds(g,u.team)<90?80:240)
          : u.team===0 && policy === "food" && task.kind === "food"
          ? 70
          : u.team===0 && policy === "build" && task.kind === "build"
            ? 90
            : 0;
      const value = task.priority + bonus + (materialPriorities?.[task.kind]||0) + (lumberWork ? 35 : 0) - distance * 0.8 - count * 15;
      if (value > score) {
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
  const t = g.tribe(team),
    p = g.tribe(0);
  if (g.state.time < (t.recoveryUntil || 0)) return "recover";
  if (g.state.time < (t.compactUntil || 0) && !t.hostile) return "trade";
  if (
    (g.state.conflict === "quiet" && !t.hostile) ||
    g.state.time < (g.state.conflict === "dangerous" ? 300 : 600) ||
    t.ally ||
    (t.trust || 0) > 0.35
  )
    return "trade";
  const scarcity = reserveSeconds(g, team) < 150,
    grievance = t.tension > 0.65;
  const army = g.state.units.filter(
    (u) => u.team === team && (u.type !== "worker" || u.militia) && u.hp > 0,
  ).length;
  const defenders = g.state.units.filter(
    (u) => u.team === 0 && (u.type !== "worker" || u.militia) && u.hp > 0,
  ).length;
  if (
    (t.hostile || grievance || (scarcity && t.aggro > 0.65)) &&
    army >= Math.max(3, defenders) &&
    p.food > 30
  )
    return "raid";
  return scarcity ? "trade" : "defend";
}
