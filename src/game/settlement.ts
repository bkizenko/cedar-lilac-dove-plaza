import type { Game } from "./sim";
import type { Building, Unit, ResKind, ResourceNode, Critter } from "./types";
import { LUMBER_R, QUARRY_R, UNITS, MAP, HALF } from "./constants";

export const YEAR_SECONDS = 1800;
export const FOOD_PER_PERSON_SECOND = 0.055;
export function calendar(g: Game) {
  const year = Math.floor(g.state.time / YEAR_SECONDS);
  const phase = Math.floor((g.state.time % YEAR_SECONDS) / (YEAR_SECONDS / 4));
  return {
    year,
    phase,
    name: ["Spring", "Summer", "Autumn", "Winter"][phase],
    remaining: YEAR_SECONDS / 4 - (g.state.time % (YEAR_SECONDS / 4)),
  };
}
export function isDependent(g: Game, u: Unit) {
  return u.maturesAt !== undefined && u.maturesAt > g.state.time;
}
export function foodDemand(g: Game, team = 0) {
  const mouths = g.state.units
    .filter((u) => u.team === team && u.hp > 0)
    .reduce((sum, u) => sum + (isDependent(g, u) ? 0.5 : 1), 0);
  const weather = g.state.weather === "drought" ? 1.4 : g.state.weather === "frost" ? 1.15 : 1;
  return mouths * FOOD_PER_PERSON_SECOND * weather;
}
export function reserveSeconds(g: Game, team = 0) {
  return g.tribe(team).food / Math.max(0.055, foodDemand(g, team));
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
              ? -(b.team === 0 && g.state.agePicks[3] === "econ" ? 0.07 : 0.12) * b.crop.planted
              : b.team === 0 && g.state.agePicks[3] === "econ"
                ? 0.3
                : 0.24),
        ),
      );
    b.crop = { year, planted: 0, tended: 0, remaining: 0, ripened: false };
  }
  if (phase === 2 && !b.crop.ripened) {
    const fields = b.team === 0 && g.state.agePicks[3] === "econ" ? 1.2 : 1;
    b.crop.remaining = Math.floor(
      b.crop.planted * (160 + 100 * b.crop.tended) * (b.fertility ?? 1) * fields,
    );
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
  u.workReason =
    p === 0 ? "Sowing the spring crop" : p === 1 ? "Tending the crop" : "Harvesting before winter";
  const open = b.team === 0 && g.state.agePicks[3] === "econ" ? 1.4 : 1;
  if (p === 0) c.planted = Math.min(1, c.planted + (dt / 180) * open);
  else if (p === 1) c.tended = Math.min(1, c.tended + (dt / 220) * open);
  else {
    u.gatherT += dt;
    const pace = 0.8 / open;
    if (u.gatherT >= pace) {
      u.gatherT -= pace;
      const n = Math.min(2, c.remaining);
      c.remaining -= n;
      u.carry += n;
      u.carryType = "food";
      if (u.carry >= 8 || c.remaining === 0) u.order = "return";
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
    for (const t of g.state.tribes) {
      if (!t.alive || t.id === 3) continue;
      const list: Task[] = [],
        pop = g.popNow(t.id),
        foodUrgency = reserveSeconds(g, t.id) < 240 ? 180 : 80;
      const buildings = g.state.buildings.filter((b) => b.team === t.id && b.hp > 0);
      const add = (node: Node, kind: Task["kind"], slots: number, priority: number) =>
        list.push({ node, kind, slots, priority });
      const nearby = (n: Node, type: string, r: number) =>
        buildings.some(
          (b) => b.type === type && g.finished(b) && Math.hypot(b.x - n.x, b.z - n.z) < r,
        );
      for (const b of buildings) {
        if (!g.finished(b)) {
          add(b, "build", 2, 75);
          continue;
        }
        if (b.type === "farm" && farmAvailable(g, b))
          add(b, "food", 3, calendar(g).phase === 2 ? 200 : 110);
        if (b.type === "dock") add(b, "food", 2, foodUrgency);
      }
      for (const n of g.state.forage) if (n.amount > 0) add(n, "food", 2, foodUrgency);
      for (const n of g.state.trees)
        if (
          n.amount > 0 &&
          ((t.id === 0 && g.chopMarks.has(n.id)) || g.cornerstoneAt(n.x, n.z, t.id) || nearby(n, "lumber", LUMBER_R) ||
            Math.hypot(n.x - g.campOf(t.id).x, n.z - g.campOf(t.id).z) < 28)
        )
          add(n, "wood", 2, t.id === 0 && g.chopMarks.has(n.id) ? 220 : Math.max(15, 95 - t.wood * 0.35));
      for (const n of g.state.stones)
        if (
          n.amount > 0 &&
          (g.cornerstoneAt(n.x, n.z, t.id) || nearby(n, "quarry", QUARRY_R) ||
            Math.hypot(n.x - g.campOf(t.id).x, n.z - g.campOf(t.id).z) < 28)
        )
          add(n, "stone", 2, Math.max(10, 65 - t.stone * 0.4));
      if (t.age >= 1)
        for (const n of g.state.copper) if (n.amount > 0) add(n, "copper", 2, 45 - t.copper * 0.25);
      if (t.age >= 2)
        for (const n of g.state.iron) if (n.amount > 0) add(n, "iron", 2, 40 - t.iron * 0.25);
      for (const n of g.state.wildlife)
        if (n.hp > 0 && n.species !== "bird") add(n, "food", 1, foodUrgency - 30);
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
        const key = other.team + ":" + other.node.id;
        this.occupancy.set(key, (this.occupancy.get(key) || 0) + 1);
      }
    }
    const list = this.tasks.get(u.team) || [];
    let best: Task | null = null,
      score = -Infinity;
    let occupied = false,
      unsafe = false;
    for (const task of list) {
      const preparingField =
        "type" in task.node && task.node.type === "farm" && calendar(g).phase < 2;
      if (task.kind === "food" && !preparingField && g.tribe(u.team).food >= g.stockCap(u.team))
        continue;
      if (u.jobLock && u.job && task.kind !== u.job) continue;
      if (u.huntOnly && !("species" in task.node)) continue;
      if (u.blockedTask === task.node.id && (u.retryWorkAt || 0) > g.state.time) continue;
      if ("hp" in task.node && task.node.hp <= 0) continue;
      if ("amount" in task.node && task.node.amount <= 0) continue;
      if (task.kind === "build" && g.finished(task.node as Building)) continue;
      if (
        "type" in task.node &&
        task.node.type === "farm" &&
        !farmAvailable(g, task.node as Building)
      )
        continue;
      const distance = Math.hypot(task.node.x - u.x, task.node.z - u.z);
      const markedWork = u.team === 0 && task.kind === "wood" && g.chopMarks.has(task.node.id);
      const settlementWork = markedWork || g.cornerstoneAt(task.node.x, task.node.z, u.team) ||
        (task.kind === "build" && "type" in task.node && task.node.type === "cornerstone");
      if ((distance > 100 && !settlementWork) || !origin || this.taskComponent(g, task.node) !== origin) continue;
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
      const count = this.occupancy.get(u.team + ":" + task.node.id) || 0;
      if (count >= task.slots) {
        occupied = true;
        continue;
      }
      const policy = g.state.laborPolicy;
      const bonus =
        policy === "food" && task.kind === "food"
          ? 70
          : policy === "build" && task.kind === "build"
            ? 90
            : 0;
      const value = task.priority + bonus - distance * 0.8 - count * 15;
      if (value > score) {
        score = value;
        best = task;
      }
    }
    if (!best) {
      u.workReason =
        g.tribe(u.team).food >= g.stockCap(u.team) && (u.job === "food" || !u.jobLock)
          ? "Food stores full — build storage or assign another job"
          : unsafe
            ? "Waiting for a safe work site"
            : occupied
              ? "All suitable work sites are occupied"
              : u.jobLock
                ? "No available work for the assigned job"
                : "No reachable work nearby — check camps and resources";
      return;
    }
    const key = u.team + ":" + best.node.id;
    this.occupancy.set(key, (this.occupancy.get(key) || 0) + 1);
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

/** Automatic response is local; commanded expeditions are not recalled across the map. */
export function emergencyResponse(g: Game, u: Unit, dt: number): boolean {
  if (u.team === 3) return false;
  const foes = g.state.units.filter(
    (e) =>
      e.hp > 0 &&
      g.isFoe(u.team, e.team) &&
      (u.team !== 0 || g.visibleAt(e.x, e.z)) &&
      Math.hypot(e.x - u.x, e.z - u.z) < 17,
  );
  if (foes.length && u.type === "worker" && !u.emergency) {
    u.emergency = { until: g.state.time + 10, job: u.job, jobLock: u.jobLock, autoArmed: false };
    const t = g.tribe(u.team);
    let type: "spearman" | "archer" | null = null;
    if (!isDependent(g, u) && t.spears > 0) {
      t.spears--;
      type = "spearman";
    } else if (!isDependent(g, u) && t.bows > 0) {
      t.bows--;
      type = "archer";
    }
    if (type) {
      const d = UNITS[type];
      u.type = type;
      u.militia = true;
      u.range = d.range;
      u.dmg = d.dmg;
      u.rof = d.rof;
      u.emergency.autoArmed = true;
    }
    u.node = null;
    u.target = null;
  }
  if (!u.emergency) return false;
  if (foes.length) u.emergency.until = g.state.time + 10;
  if (g.state.time >= u.emergency.until) {
    if (u.emergency.autoArmed) {
      const t = g.tribe(u.team);
      if (u.type === "archer") t.bows++;
      else t.spears++;
      const d = UNITS.worker;
      u.type = "worker";
      u.militia = false;
      u.range = d.range;
      u.dmg = d.dmg;
      u.rof = d.rof;
    }
    u.job = u.emergency.job;
    u.jobLock = u.emergency.jobLock;
    u.emergency = undefined;
    u.target = null;
    u.node = null;
    u.order = u.carry > 0 ? "return" : "idle";
    u.workReason = "Returning to village work";
    return false;
  }
  if (u.emergency.autoArmed) {
    u.workReason = "Militia defending the settlement";
    const foe = foes.sort(
      (a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
    )[0];
    if (foe) {
      u.target = foe;
      u.order = "attack";
      g.combatAI(u, dt);
    } else u.order = "hold";
    return true;
  }
  const shelters = g.state.buildings.filter(
    (b) => b.team === u.team && g.finished(b) && ["townhall", "hut", "keep"].includes(b.type),
  );
  const shelter = shelters.sort((a, b) => {
    const safety = (b: Building) =>
      foes.reduce((n, e) => n + Math.max(0, 25 - Math.hypot(b.x - e.x, b.z - e.z)) * 4, 0) +
      Math.hypot(b.x - u.x, b.z - u.z);
    return safety(a) - safety(b);
  })[0];
  u.workReason = "Taking shelter from invaders";
  u.order = "move";
  if (shelter) {
    u.tx = shelter.x;
    u.tz = shelter.z;
    g.steer(u, dt);
  } else if (foes[0]) {
    const a = Math.atan2(u.z - foes[0].z, u.x - foes[0].x);
    u.tx = u.x + Math.cos(a) * 8;
    u.tz = u.z + Math.sin(a) * 8;
    g.steer(u, dt);
  }
  return true;
}

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
    (u) => u.team === team && u.type !== "worker" && u.hp > 0,
  ).length;
  const defenders = g.state.units.filter(
    (u) => u.team === 0 && u.type !== "worker" && u.hp > 0,
  ).length;
  if (
    (t.hostile || grievance || (scarcity && t.aggro > 0.65)) &&
    army >= Math.max(3, defenders) &&
    p.food > 30
  )
    return "raid";
  return scarcity ? "trade" : "defend";
}
