import {craftBenchReady,craftingEffort,craftingQueue,craftingBenches} from './crafting';
import type { Game } from './sim';
import type { Building, Unit } from './types';
import { isDependent } from './settlement';
import { predisposition } from './people';

export const FARM_TOOLS = {
  stoneHoe: { name: 'Stone hoe', wood: 3, stone: 2, copper: 0, iron: 0, age: 0, seconds: 24, cultivation: 1.25, harvest: 1.1 },
  copperTools: { name: 'Copper farming tools', wood: 3, stone: 0, copper: 4, iron: 0, age: 1, seconds: 45, cultivation: 1.5, harvest: 1.25 },
  ironTools: { name: 'Iron farming tools', wood: 3, stone: 0, copper: 0, iron: 4, age: 2, seconds: 60, cultivation: 1.7, harvest: 1.4 },
} as const;
export type FarmToolKind = keyof typeof FARM_TOOLS;
export type FarmToolWork = {
  kind: FarmToolKind; progress: number; duration: number; workplace: number; paused?: boolean;
};
export type FarmToolUnit = Unit & {
  farmTool?: FarmToolKind;
  farmToolWork?: FarmToolWork;
  haulageWork?: unknown;
  captive?: unknown;
  guardPost?: number;
};

function civilian(g: Game, u: FarmToolUnit) {
  return u.hp > 0 && u.type === 'worker' && !u.militia && !isDependent(g, u) &&
    !u.captive && u.guardPost === undefined;
}

function available(g: Game, u: FarmToolUnit) {
  return civilian(g, u) && !u.boat && u.carry === 0 && !u.plantingWork&&!u.tamingWork && !u.weaponWork && !u.haulageWork && !u.copperStudy&&!u.studyCrop &&
    u.drill === undefined && !u.expedition && !u.envoy && !u.scout && !u.visit &&
    !u.emergency && !u.foundingJourney && !u.recalled && ['idle', 'gather', 'hold'].includes(u.order);
}

/** Shared by workplace validation and visible recipe controls. */
export function farmToolWorkplace(kind:FarmToolKind,type:string,copperExperiment=false){
 return kind==='stoneHoe'?['townhall','workshop'].includes(type):kind==='copperTools'&&copperExperiment?['workshop','forge'].includes(type):type==='forge';
}

function workplaces(g: Game, team: number, kind: FarmToolKind, id?: number) {
  return g.state.buildings.filter(b => b.team === team && g.finished(b) &&
    (id === undefined || id === b.id) &&
    farmToolWorkplace(kind,b.type,!!g.tribe(team).copperExperiment));
}

function reachableWorkplace(g: Game, u: Unit, sites: Building[]) {
  return sites.filter(b => !!g.interactionSpot(u, b))
    .sort((a, b) => (craftingQueue(g,a).length/craftingBenches(a)-craftingQueue(g,b).length/craftingBenches(b))*100+Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
}

function improvement(u: FarmToolUnit, kind: FarmToolKind) {
  return !u.farmTool || FARM_TOOLS[kind].cultivation > FARM_TOOLS[u.farmTool].cultivation;
}

export function farmToolRequirement(g: Game, kind: FarmToolKind, team = 0): string | null {
  const spec = FARM_TOOLS[kind], t = g.tribe(team);
  if (t.age < spec.age && !(kind==='copperTools'&&t.copperExperiment)) return kind === 'ironTools' ? 'Iron farming tools need the Iron Age and four iron' : 'Copper farming tools need the Bronze Age and four copper';
  if (!workplaces(g, team, kind).length) return kind === 'stoneHoe' ? 'Make stone hoes at a completed hearth or crafting shelter' : 'Finish a forge to shape metal farming tools';
  return null;
}

/** Each paid project equips one real resident, never every farm in the village. */
export function beginFarmToolWork(g: Game, kind: FarmToolKind, team = 0, workplaceId?: number, unitId?: number) {
  const spec = FARM_TOOLS[kind], t = g.tribe(team);
  const reject = (reason: string) => {
    if (team === 0) { g.banner(reason, 4); g.onSfx('invalid'); }
    return false;
  };
  if (!spec || !t) return false;
  const issue = farmToolRequirement(g, kind, team);
  if (issue) return reject(issue);
  const sites = workplaces(g, team, kind, workplaceId);
  if (!sites.length) return reject(kind === 'stoneHoe' ? 'Choose a completed hearth or crafting shelter' : 'Metal toolmaking needs a completed forge');
  const isFarmer = (u: Unit) => !!u.node && 'type' in u.node && u.node.type === 'farm';
  const u = (g.state.units as FarmToolUnit[]).filter(p => p.team === team &&
    (unitId === undefined || p.id === unitId) && available(g, p) && !p.farmToolWork && improvement(p, kind))
    .sort((a, b) => Number(b.selected) - Number(a.selected) || Number(isFarmer(b)) - Number(isFarmer(a)))
    .find(p => reachableWorkplace(g, p, sites));
  if (!u) return reject('Need an available adult with empty hands who can benefit from these tools and reach the workplace');
  if (t.wood < spec.wood || t.stone < spec.stone || t.copper < spec.copper || t.iron < spec.iron)
    return reject(`Need ${spec.wood} logs${spec.stone ? ` and ${spec.stone} stone` : ''}${spec.copper ? ` and ${spec.copper} copper` : ''}${spec.iron ? ` and ${spec.iron} iron` : ''}`);
  const b = reachableWorkplace(g, u, sites)!;
  t.wood -= spec.wood; t.stone -= spec.stone; t.copper -= spec.copper; t.iron -= spec.iron;
  u.farmToolWork = {kind, progress: 0, duration: spec.seconds * (b.type === 'townhall' ? 2 : 1), workplace: b.id};
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Making ${spec.name.toLowerCase()} — walking to the workplace`;
  g.workBoard.reset();
  if (team === 0) g.banner(`${spec.name}: materials reserved; one adult crafts their own farming tools`, 4);
  return true;
}

export function pauseFarmToolWork(u: FarmToolUnit) {
  if (u.farmToolWork) u.farmToolWork.paused = true;
}

export function resumeFarmToolWork(g: Game, u: FarmToolUnit, workplaceId?: number) {
  const job = u.farmToolWork;
  if (!job || !available(g, u) || u.stuckT > 8) return false;
  const b = reachableWorkplace(g, u, workplaces(g, u.team, job.kind, workplaceId));
  if (!b) return false;
  const fraction = job.progress / job.duration;
  job.duration = FARM_TOOLS[job.kind].seconds * (b.type === 'townhall' ? 2 : 1);
  job.progress = fraction * job.duration; job.workplace = b.id; job.paused = false;
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Resuming ${FARM_TOOLS[job.kind].name.toLowerCase()}`;
  g.workBoard.reset();
  return true;
}

export function farmToolWorkAI(g: Game, u: FarmToolUnit, dt: number) {
  const job = u.farmToolWork;
  if (!job || job.paused || !civilian(g, u) || u.order !== 'hold') return false;
  if (g.state.weather === 'storm' || g.clockState().period === 'Night' && !g.state.nightWork) return false;
  const b = workplaces(g, u.team, job.kind, job.workplace)[0], spot = b && g.interactionSpot(u, b);
  if (!b || !spot || u.stuckT > 8) {
    job.paused = true; u.order = 'idle';
    u.workReason = 'Toolmaking paused — choose a reachable replacement workplace';
    g.workBoard.reset(); return true;
  }
  if (!craftBenchReady(g,u,b)) return true;
  if (!g.buildingWorkReached(u, b)) {
    u.tx = spot.x; u.tz = spot.z; g.steer(u, dt);
    u.workReason = `Walking to make ${FARM_TOOLS[job.kind].name.toLowerCase()}`;
    return true;
  }
  job.progress = Math.min(job.duration, job.progress + craftingEffort(u,dt) * predisposition(u).strength);
  u.stride += Math.max(0, dt) * 5; u.facing = Math.atan2(b.x - u.x, b.z - u.z);
  u.workReason = `Making ${FARM_TOOLS[job.kind].name.toLowerCase()} · ${Math.floor(100 * job.progress / job.duration)}%`;
  if (job.progress >= job.duration) {
    u.farmTool = job.kind; u.farmToolWork = undefined; u.order = 'idle';
    u.workReason = `${FARM_TOOLS[job.kind].name} ready — faster sowing, tending and harvest work`;
    g.workBoard.reset();
    if (u.team === 0) { g.banner(u.workReason, 4); g.onSfx('place'); }
  }
  return true;
}

/** Multiply farm labor speed only. Soil, crop water, seasons and finite harvest remain unchanged. */
export function farmToolRate(u: FarmToolUnit, phase: number) {
  if (!u.farmTool || u.type !== 'worker' || u.militia) return 1;
  return phase === 0 || phase === 1 ? FARM_TOOLS[u.farmTool].cultivation : phase === 2 ? FARM_TOOLS[u.farmTool].harvest : 1;
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const kind = (v: unknown): v is FarmToolKind => v === 'stoneHoe' || v === 'copperTools' || v === 'ironTools';
export function validFarmToolUnit(v: unknown) {
  if (!record(v) || v.farmTool !== undefined && !kind(v.farmTool)) return false;
  if (v.farmToolWork === undefined) return true;
  const w = v.farmToolWork;
  if (!record(w) || !kind(w.kind)) return false;
  const durations = w.kind === 'stoneHoe' ? [FARM_TOOLS.stoneHoe.seconds, FARM_TOOLS.stoneHoe.seconds * 2] : [FARM_TOOLS[w.kind].seconds];
  return finite(w.duration) && durations.includes(w.duration) && finite(w.progress) &&
    w.progress >= 0 && w.progress <= w.duration && Number.isSafeInteger(w.workplace) && Number(w.workplace) > 0 &&
    (w.paused === undefined || typeof w.paused === 'boolean') &&
    (v.farmTool === undefined || FARM_TOOLS[w.kind].cultivation > FARM_TOOLS[v.farmTool].cultivation);
}
