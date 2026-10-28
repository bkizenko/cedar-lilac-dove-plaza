import {craftBenchReady,craftingEffort,craftingQueue,craftingBenches} from './crafting';
import type { Game } from './sim';
import type { Building, ResKind, Tribe, Unit } from './types';
import { GATHER } from './constants';
import { isDependent } from './settlement';
import { predisposition } from './people';

export const HAULAGE = {
  sled: { name: 'Carrying sled', wood: 8, stone: 1, seconds: 45, capacity: 2, loadedSpeed: .88 },
  canoe: { name: 'Dugout canoe', wood: 20, stone: 2, seconds: 75, capacity: 2, loadedSpeed: 1 },
  pack: { name: 'Pack goat', wood: 0, stone: 0, seconds: 60, capacity: 2, loadedSpeed: 1 },
  cart: { name: 'Wheeled handcart', wood: 24, stone: 4, seconds: 90, capacity: 3, loadedSpeed: .94 },
} as const;
export const WHEEL_PRACTICE = 60;
export type HaulageKind = keyof typeof HAULAGE;
export type HaulageWork = {
  kind: HaulageKind; progress: number; duration: number; workplace: number; paused?: boolean;
};
// Optional fields preserve pre-transport saves. Exporting this shape also keeps
// save validation and the integration contract in one place.
export type HaulageUnit = Unit & {
  haulage?: HaulageKind;
  haulageWork?: HaulageWork;
  captive?: unknown;
  guardPost?: number;
};
export type HaulageTribe = Tribe & { haulagePractice?: number };

function civilian(g: Game, u: HaulageUnit) {
  return u.hp > 0 && u.type === 'worker' && !u.militia && !isDependent(g, u) &&
    !u.captive && u.guardPost === undefined;
}

function available(g: Game, u: HaulageUnit) {
  return civilian(g, u) && u.carry === 0 && !u.tamingWork && !u.weaponWork && !u.farmToolWork && !u.studyCrop &&
    u.drill === undefined && !u.expedition && !u.envoy && !u.scout && !u.visit &&
    !u.emergency && !u.foundingJourney && !u.recalled &&
    ['idle', 'gather', 'hold'].includes(u.order);
}

function workplaces(g: Game, team: number, kind: HaulageKind, id?: number) {
  return g.state.buildings.filter(b => b.team === team && g.finished(b) &&
    (id === undefined || b.id === id) &&
    (kind==='canoe'?b.type==='dock':b.type === 'workshop' || kind === 'sled' && b.type === 'townhall'));
}

function nearestWorkplace(g: Game, u: Unit, candidates: Building[]) {
  return candidates.filter(b => !!g.interactionSpot(u, b))
    .sort((a, b) => (craftingQueue(g,a).length/craftingBenches(a)-craftingQueue(g,b).length/craftingBenches(b))*100+Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
}

export function haulageRequirement(g: Game, kind: HaulageKind, team = 0): string | null {
  if(kind==='pack')return 'Tame a discovered wild goat at a hearth; pack animals cannot be crafted.';
  if(kind==='canoe')return workplaces(g,team,kind).length?null:'Finish a fishing dock to carve a dugout canoe';
  if (kind !== 'cart') return null;
  const practice = (g.tribe(team) as HaulageTribe).haulagePractice || 0;
  if (practice < WHEEL_PRACTICE)
    return `First deliver ${WHEEL_PRACTICE} goods using sleds (${Math.floor(practice)} delivered). Hauling experience prepares wheel-and-axle trials.`;
  if (!workplaces(g, team, kind).length) return 'Finish a crafting shelter to shape wheels and fit an axle';
  return null;
}

/** Reserve materials once. The selected civilian must walk to a real workplace. */
export function beginHaulageWork(g: Game, kind: HaulageKind, team = 0, workplaceId?: number, unitId?: number) {
  const spec = HAULAGE[kind], t = g.tribe(team) as HaulageTribe;
  const reject = (reason: string) => {
    if (team === 0) { g.banner(reason, 4); g.onSfx('invalid'); }
    return false;
  };
  if (!spec || !t) return false;
  const issue = haulageRequirement(g, kind, team);
  if (issue) return reject(issue);
  const sites = workplaces(g, team, kind, workplaceId);
  if (!sites.length) return reject(kind === 'cart' ? 'Make handcarts at a completed crafting shelter' : 'Make sleds at a hearth or completed crafting shelter');
  const candidates = (g.state.units as HaulageUnit[]).filter(u => u.team === team &&
    (unitId === undefined || u.id === unitId) && available(g, u) && !u.haulageWork && !u.farmToolWork &&
    (kind === 'cart' ? u.haulage === 'sled' : !u.haulage))
    .sort((a, b) => Number(b.selected) - Number(a.selected));
  const u = candidates.find(p => nearestWorkplace(g, p, sites));
  if (!u) return reject(kind === 'cart' ? 'Choose an available adult sled carrier with empty hands and a route to the shelter' : 'Need an available adult with empty hands and a route to the workplace');
  if (t.wood < spec.wood || t.stone < spec.stone) return reject(`Need ${spec.wood} logs and ${spec.stone} stone`);
  const b = nearestWorkplace(g, u, sites)!;
  t.wood -= spec.wood;
  t.stone -= spec.stone;
  u.haulageWork = { kind, progress: 0, duration: spec.seconds * (b.type === 'townhall' ? 2 : 1), workplace: b.id };
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Making ${spec.name.toLowerCase()} — walking to the workplace`;
  g.workBoard.reset();
  if (team === 0) g.banner(`${spec.name}: materials reserved; one adult leaves other work to build it`, 4);
  return true;
}

/** Explicit movement, recall and combat pause work without erasing paid materials. */
export function pauseHaulageWork(u: HaulageUnit) {
  if (u.haulageWork) u.haulageWork.paused = true;
}

/** A paid project may move to a replacement reachable workplace; it never repays costs. */
export function resumeHaulageWork(g: Game, u: HaulageUnit, workplaceId?: number) {
  const job = u.haulageWork;
  if (!job || !available(g, u)) return false;
  const b = nearestWorkplace(g, u, workplaces(g, u.team, job.kind, workplaceId));
  if (!b) return false;
  // Keep completed fraction when moving between open hearth and sheltered work.
  const fraction = job.progress / job.duration;
  job.duration = HAULAGE[job.kind].seconds * (b.type === 'townhall' ? 2 : 1);
  job.progress = fraction * job.duration;
  job.workplace = b.id; job.paused = false;
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Resuming ${HAULAGE[job.kind].name.toLowerCase()}`;
  g.workBoard.reset();
  return true;
}

export function haulageWorkAI(g: Game, u: HaulageUnit, dt: number) {
  const job = u.haulageWork;
  if (!job || job.paused || !civilian(g, u) || u.order !== 'hold') return false;
  if (g.state.weather === 'storm' || g.clockState().period === 'Night' && !g.state.nightWork) return false;
  const b = workplaces(g, u.team, job.kind, job.workplace)[0];
  const spot = b && g.interactionSpot(u, b);
  if (!b || !spot) {
    job.paused = true; u.order = 'idle';
    u.workReason = 'Transport work paused — choose a reachable replacement workplace';
    g.workBoard.reset();
    return true;
  }
  if (!craftBenchReady(g,u,b)) return true;
  if (!g.buildingWorkReached(u, b)) {
    u.tx = spot.x; u.tz = spot.z; g.steer(u, dt);
    u.workReason = `Walking to make ${HAULAGE[job.kind].name.toLowerCase()}`;
    return true;
  }
  job.progress = Math.min(job.duration, job.progress + craftingEffort(u,dt) * predisposition(u).strength);
  u.stride += Math.max(0, dt) * 5; u.facing = Math.atan2(b.x - u.x, b.z - u.z);
  u.workReason = `Making ${HAULAGE[job.kind].name.toLowerCase()} · ${Math.floor(100 * job.progress / job.duration)}%`;
  if (job.progress >= job.duration) {
    u.haulage = job.kind; u.haulageWork = undefined; u.order = 'idle';
    u.workReason = `${HAULAGE[job.kind].name} ready — carrying capacity ×${HAULAGE[job.kind].capacity}`;
    g.workBoard.reset();
    if (u.team === 0) { g.banner(u.workReason, 4); g.onSfx('place'); }
  }
  return true;
}

/** One real transport belongs to one civilian; no village-wide passive bonus. */
export function carryingCapacity(u: HaulageUnit, kind: ResKind) {
  return GATHER[kind].carry * (u.type === 'worker' && !u.militia && u.haulage ? HAULAGE[u.haulage].capacity : 1);
}

export function loadedHaulSpeed(u: HaulageUnit) {
  return u.type === 'worker' && !u.militia && u.carry > 0 && u.haulage ? HAULAGE[u.haulage].loadedSpeed : 1;
}

/** Call exactly once on an actual store delivery, immediately before clearing cargo. */
export function recordHaulDelivery(g: Game, u: HaulageUnit) {
  if (u.haulage !== 'sled' || u.type !== 'worker' || u.militia || !u.carryType || u.carry <= 0) return;
  const t = g.tribe(u.team) as HaulageTribe, previous = t.haulagePractice || 0;
  t.haulagePractice = Math.min(WHEEL_PRACTICE, previous + u.carry);
  if (u.team === 0 && previous < WHEEL_PRACTICE && t.haulagePractice >= WHEEL_PRACTICE)
    g.banner('Sled hauling is established. A sled carrier can now try making a wheeled handcart at a crafting shelter.', 5);
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validHaulageUnit(v: unknown) {
  if (!record(v)) return false;
  if (v.haulage !== undefined && !['sled','cart','canoe','pack'].includes(String(v.haulage))) return false;
  if (v.haulageWork === undefined) return true;
  const w = v.haulageWork;
  if (!record(w) || w.kind !== 'sled' && w.kind !== 'cart' && w.kind !== 'canoe') return false;
  const durations = w.kind === 'sled' ? [HAULAGE.sled.seconds, HAULAGE.sled.seconds * 2] : [w.kind==='canoe'?HAULAGE.canoe.seconds:HAULAGE.cart.seconds];
  if (!finite(w.duration) || !durations.includes(w.duration) ||
    !finite(w.progress) || w.progress < 0 || w.progress > w.duration ||
    !Number.isSafeInteger(w.workplace) || Number(w.workplace) < 1 ||
    w.paused !== undefined && typeof w.paused !== 'boolean') return false;
  return w.kind === 'cart' ? v.haulage === 'sled' : v.haulage === undefined;
}

export function validHaulageTribe(v: unknown) {
  return record(v) && (v.haulagePractice === undefined ||
    finite(v.haulagePractice) && v.haulagePractice >= 0 && v.haulagePractice <= WHEEL_PRACTICE);
}
