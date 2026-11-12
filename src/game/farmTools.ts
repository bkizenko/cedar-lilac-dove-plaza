import {packCapacityMultiplier} from './packAnimalState';
import{claimFarmToolOwnership,releaseFarmToolOwnership}from'./farmToolOwnership';
import{releaseTreeWorker}from'./workAllocation';
import {hasTaskCommitment} from './workCommitments';
import {craftBenchReady,craftingEffort,craftingQueue,craftingBenches} from './crafting';
import type { Game } from './sim';
import type { Building, Unit } from './types';
import { isDependent } from './settlement';
import { predisposition } from './people';

export const FARM_TOOLS = {
  woodenArd: { name: 'Wooden ard', wood: 10, stone: 2, copper: 0, iron: 0, age: 0, seconds: 60, cultivation: 2.2, harvest: 1 },
  stoneHoe: { name: 'Stone hoe', wood: 3, stone: 2, copper: 0, iron: 0, age: 0, seconds: 24, cultivation: 1.25, harvest: 1.1 },
  copperTools: { name: 'Copper farming tools', wood: 3, stone: 0, copper: 4, iron: 0, age: 1, seconds: 45, cultivation: 1.5, harvest: 1.25 },
  ironTools: { name: 'Iron farming tools', wood: 3, stone: 0, copper: 0, iron: 4, age: 2, seconds: 60, cultivation: 1.7, harvest: 1.4 },
} as const;
export type FarmToolKind = keyof typeof FARM_TOOLS;
export const FARM_TOOL_MAINTENANCE={version:1,repairBelowCondition:.9,lifeWorkSeconds:{woodenArd:900,stoneHoe:600,copperTools:900,ironTools:1200},repair:{woodenArd:{wood:3,stone:1,copper:0,iron:0,seconds:30},stoneHoe:{wood:1,stone:1,copper:0,iron:0,seconds:12},copperTools:{wood:1,stone:0,copper:1,iron:0,seconds:18},ironTools:{wood:1,stone:0,copper:0,iron:1,seconds:24}}}as const;
export function farmToolCondition(u:Pick<Unit,'farmTool'|'farmToolCondition'>){return u.farmTool?u.farmToolCondition??1:0;}
export function wearFarmTool(u:Unit,seconds:number){const before=farmToolCondition(u);if(!u.farmTool||u.type!=='worker'||u.militia||u.farmToolWork?.mode==='repair'||!(seconds>0)||!Number.isFinite(seconds))return false;u.farmToolCondition=Math.max(0,before-seconds/FARM_TOOL_MAINTENANCE.lifeWorkSeconds[u.farmTool]);return before>0&&u.farmToolCondition===0;}

export type FarmToolWork = {
  mode?:'repair';repairVersion?:1;conditionAtStart?:number;paid?:{wood:number;stone:number;copper:number;iron:number};
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
  return civilian(g, u) && u.farmToolCargoId===undefined && u.carry === 0 && !hasTaskCommitment(u,'farmToolWork') &&
    u.drill === undefined && !u.expedition && !u.envoy && !u.scout && !u.visit &&
    !u.emergency && !u.foundingJourney && !u.recalled && u.buildOrder===undefined&&!u.resting&&!u.shelterId&& ['idle', 'gather', 'hold'].includes(u.order);
}

/** Shared by workplace validation and visible recipe controls. */
export function farmToolWorkplace(kind:FarmToolKind,type:string,copperExperiment=false){
 return kind==='woodenArd'?type==='workshop':kind==='stoneHoe'?['hearth','townhall','workshop'].includes(type):kind==='copperTools'&&copperExperiment?['workshop','forge'].includes(type):type==='forge';
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
  return !u.farmTool || farmToolCondition(u)===0 || FARM_TOOLS[kind].cultivation > FARM_TOOLS[u.farmTool].cultivation;
}

export function farmToolRequirement(g: Game, kind: FarmToolKind, team = 0): string | null {
  const spec = FARM_TOOLS[kind], t = g.tribe(team);
  if (t.age < spec.age && !(kind==='copperTools'&&t.copperExperiment)) return kind === 'ironTools' ? 'Iron farming tools need the Iron Age and four iron' : 'Copper farming tools need the Bronze Age and four copper';
  if (!workplaces(g, team, kind).length) return kind==='woodenArd'?'Finish a crafting shelter to make a wooden ard':kind === 'stoneHoe' ? 'Make stone hoes at a completed hearth, town hall or crafting shelter' : 'Finish a forge to shape metal farming tools';
  if(kind==='woodenArd'&&!g.state.units.some(u=>u.team===team&&draftTractionReady(u)))return 'Train a real pack horse at a stable, then choose its adult handler to make an ard';
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
  if (!sites.length) return reject(kind==='woodenArd'?'Choose a completed crafting shelter for the wooden ard':kind === 'stoneHoe' ? 'Choose a completed hearth, town hall or crafting shelter' : 'Metal toolmaking needs a completed forge');
  const isFarmer = (u: Unit) => !!u.node && 'type' in u.node && u.node.type === 'farm';
  const u = (g.state.units as FarmToolUnit[]).filter(p => p.team === team &&
    (unitId === undefined || p.id === unitId) && (kind!=='woodenArd'||draftTractionReady(p)) && available(g, p) && !p.farmToolWork && improvement(p, kind))
    .sort((a, b) => Number(b.selected) - Number(a.selected) || Number(isFarmer(b)) - Number(isFarmer(a)))
    .find(p => reachableWorkplace(g, p, sites));
  if (!u) return reject(kind==='woodenArd'?'Choose a free adult handler with their living trained pack horse, empty hands and a route to the crafting shelter':'Need an available adult with empty hands who can benefit from these tools and reach the workplace');
  if (t.wood < spec.wood || t.stone < spec.stone || t.copper < spec.copper || t.iron < spec.iron)
    return reject(`Need ${spec.wood} logs${spec.stone ? ` and ${spec.stone} stone` : ''}${spec.copper ? ` and ${spec.copper} copper` : ''}${spec.iron ? ` and ${spec.iron} iron` : ''}`);
  const b = reachableWorkplace(g, u, sites)!;
  releaseTreeWorker(g,u);
  u.farmToolWork = {kind, progress: 0, duration: spec.seconds * (['townhall','hearth'].includes(b.type) ? 2 : 1), workplace: b.id};
  if(!claimFarmToolOwnership(g,u)){u.farmToolWork=undefined;return reject('This resident already owns other active work');}
  t.wood -= spec.wood; t.stone -= spec.stone; t.copper -= spec.copper; t.iron -= spec.iron;
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Making ${spec.name.toLowerCase()} — walking to the workplace`;
  g.workBoard.reset();
  if (team === 0) g.banner(`${spec.name}: materials reserved; one adult crafts their own farming tools`, 4);
  return true;
}

export function pauseFarmToolWork(u: FarmToolUnit,g?:Game) {
  if (u.farmToolWork){u.farmToolWork.paused = true;if(g)releaseFarmToolOwnership(g,u);}
}

export function resumeFarmToolWork(g: Game, u: FarmToolUnit, workplaceId?: number) {
  const job = u.farmToolWork;
  if (!job || !available(g, u) || u.stuckT > 8) return false;
  const b = reachableWorkplace(g, u, workplaces(g, u.team, job.kind, workplaceId));
  if (!b) return false;
  const fraction = job.progress / job.duration;
  job.duration = (job.mode==='repair'?FARM_TOOL_MAINTENANCE.repair[job.kind].seconds:FARM_TOOLS[job.kind].seconds) * (['townhall','hearth'].includes(b.type) ? 2 : 1);
  job.progress = fraction * job.duration; job.workplace = b.id; job.paused = false;
  releaseTreeWorker(g,u);if(!claimFarmToolOwnership(g,u)){job.paused=true;return false;}
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Resuming ${FARM_TOOLS[job.kind].name.toLowerCase()}`;
  g.workBoard.reset();
  if(u.team===0)g.banner(`${job.mode==='repair'?'Paid repair':'Paid toolmaking'} resumed; materials were not charged again`,4);
  return true;
}

export function farmToolWorkAI(g: Game, u: FarmToolUnit, dt: number) {
  const job = u.farmToolWork;
  if (!job)return false;
  if(job.paused||!civilian(g,u)||u.order!=='hold'){releaseFarmToolOwnership(g,u);return false;}
  if(!claimFarmToolOwnership(g,u)){u.workReason='Tool work waits for this resident’s other commitment';return true;}
  if (g.state.weather === 'storm' || g.clockState().period === 'Night' && !g.state.nightWork) return false;
  const b = workplaces(g, u.team, job.kind, job.workplace)[0], spot = b && g.interactionSpot(u, b);
  if (!b || !spot || u.stuckT > 8) {
    job.paused = true;releaseFarmToolOwnership(g,u); u.order = 'idle';
    u.workReason = `${job.mode==='repair'?'Tool repair':'Toolmaking'} paused — choose a reachable replacement workplace`;
    g.workBoard.reset(); return true;
  }
  if (!craftBenchReady(g,u,b)) return true;
  if (!g.buildingWorkReached(u, b)) {
    u.tx = spot.x; u.tz = spot.z; g.steer(u, dt);
    u.workReason = `Walking to ${job.mode==='repair'?'repair':'make'} ${FARM_TOOLS[job.kind].name.toLowerCase()}`;
    return true;
  }
  job.progress = Math.min(job.duration, job.progress + craftingEffort(u,dt,b) * predisposition(u).strength);
  u.stride += Math.max(0, dt) * 5; u.facing = Math.atan2(b.x - u.x, b.z - u.z);
  u.workReason = `${job.mode==='repair'?'Repairing':'Making'} ${FARM_TOOLS[job.kind].name.toLowerCase()} · ${Math.floor(100 * job.progress / job.duration)}%`;
  if (job.progress >= job.duration) {
    u.farmTool = job.kind;u.farmToolCondition=1;releaseFarmToolOwnership(g,u,true); u.farmToolWork = undefined; u.order = 'idle';
    u.workReason = job.kind==='woodenArd'?'Wooden ard ready — spring preparation with a trained horse; hand tending and harvest':`${FARM_TOOLS[job.kind].name} ready — faster sowing, tending and harvest work`;
    g.workBoard.reset();
    if (u.team === 0) { g.banner(u.workReason, 4); g.onSfx('place'); }
  }
  return true;
}

export const DRAFT_TRACTION_RULES={practiceSeconds:120,startingMultiplier:1.4,maximumMultiplier:2.2} as const;
/** Physical actor/horse eligibility, shared by crafting and actual traction work.
 * Tool ownership, condition and cultivation phase are checked by farmToolRate. */
export function draftTractionReady(u:Unit):boolean{
 return u.type==='worker'&&u.hp>0&&!u.militia&&u.haulage==='pack'&&u.packAnimal?.species==='horse'&&u.packAnimal.hp>0&&
  !u.boat&&!u.prisoner&&!u.emergency&&!u.shelterId&&!u.resting;
}

/** Multiply farm labor speed only. Soil, crop water, seasons and finite harvest remain unchanged. */
export function farmToolRate(u: FarmToolUnit, phase: number) {
  if (!u.farmTool || u.type !== 'worker' || u.militia||u.farmToolWork?.mode==='repair') return 1;
  if(u.farmTool==='woodenArd'){
   if(phase!==0||!draftTractionReady(u))return 1;
   const practice=Number.isFinite(u.draftPracticeSeconds)?Math.max(0,Math.min(1,(u.draftPracticeSeconds??0)/DRAFT_TRACTION_RULES.practiceSeconds)):0;
   const full=DRAFT_TRACTION_RULES.startingMultiplier+(DRAFT_TRACTION_RULES.maximumMultiplier-DRAFT_TRACTION_RULES.startingMultiplier)*practice;
   const welfare=Math.max(0,Math.min(1,(packCapacityMultiplier(u)-1.25)/(3.5-1.25)));
   return 1+(full-1)*farmToolCondition(u)*welfare;
  }
  const full=phase === 0 || phase === 1 ? FARM_TOOLS[u.farmTool].cultivation : phase === 2 ? FARM_TOOLS[u.farmTool].harvest : 1;return 1+(full-1)*farmToolCondition(u);
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const kind = (v: unknown): v is FarmToolKind => v === 'woodenArd' || v === 'stoneHoe' || v === 'copperTools' || v === 'ironTools';
export function validFarmToolUnit(v: unknown) {
 if(!record(v)||v.farmTool!==undefined&&!kind(v.farmTool)||v.farmToolCondition!==undefined&&(!kind(v.farmTool)||!finite(v.farmToolCondition)||v.farmToolCondition<0||v.farmToolCondition>1))return false;
 if(v.farmToolWork===undefined)return true;const w=v.farmToolWork;if(!record(w)||!kind(w.kind)||w.mode!==undefined&&w.mode!=='repair')return false;
 const repair=w.mode==='repair',spec=FARM_TOOL_MAINTENANCE.repair[w.kind],base=repair?spec.seconds:FARM_TOOLS[w.kind].seconds,durations=w.kind==='stoneHoe'?[base,base*2]:[base];
 if(!finite(w.duration)||!durations.includes(w.duration)||!finite(w.progress)||w.progress<0||w.progress>w.duration||!Number.isSafeInteger(w.workplace)||Number(w.workplace)<1||w.paused!==undefined&&typeof w.paused!=='boolean')return false;
 if(repair)return w.repairVersion===1&&v.farmTool===w.kind&&finite(w.conditionAtStart)&&w.conditionAtStart>=0&&w.conditionAtStart<FARM_TOOL_MAINTENANCE.repairBelowCondition&&v.farmToolCondition===w.conditionAtStart&&record(w.paid)&&['wood','stone','copper','iron'].every(key=>(w.paid as Record<string,unknown>)[key]===spec[key as keyof typeof spec]);
 return w.repairVersion===undefined&&w.conditionAtStart===undefined&&w.paid===undefined&&(v.farmTool===undefined||v.farmToolCondition===0||FARM_TOOLS[w.kind].cultivation>FARM_TOOLS[v.farmTool as FarmToolKind].cultivation);
}
export function farmToolRepairIssue(g:Game,unitId:number,workplaceId?:number,team=0):string|null{
 const u=g.state.units.find(u=>u.id===unitId&&u.team===team);if(!u||!civilian(g,u))return'Choose a living adult farmer';if(!u.farmTool)return'This resident has no farming tool';if(u.farmToolWork)return'Tool work is already paid; resume that project';if(!available(g,u))return'Need empty hands and no other active commitment';if(farmToolCondition(u)>=FARM_TOOL_MAINTENANCE.repairBelowCondition)return'This tool does not need repair yet';
 const sites=workplaces(g,u.team,u.farmTool,workplaceId);if(!sites.length)return'Choose a compatible completed toolmaking workplace';if(!reachableWorkplace(g,u,sites))return'No reachable repair workplace';const cost=FARM_TOOL_MAINTENANCE.repair[u.farmTool],t=g.tribe(u.team);if(t.wood<cost.wood||t.stone<cost.stone||t.copper<cost.copper||t.iron<cost.iron)return'Not enough materials for this repair';return null;
}
export function beginFarmToolRepair(g:Game,unitId:number,workplaceId?:number,team=0){
 const issue=farmToolRepairIssue(g,unitId,workplaceId,team);if(issue){if(team===0)g.banner(issue,4);return false;}const u=g.state.units.find(u=>u.id===unitId)!,kind=u.farmTool!,spec=FARM_TOOL_MAINTENANCE.repair[kind],b=reachableWorkplace(g,u,workplaces(g,u.team,kind,workplaceId))!,t=g.tribe(u.team);
 const job:FarmToolWork={mode:'repair',repairVersion:1,kind,conditionAtStart:farmToolCondition(u),paid:{wood:spec.wood,stone:spec.stone,copper:spec.copper,iron:spec.iron},duration:spec.seconds*(['townhall','hearth'].includes(b.type)?2:1),progress:0,workplace:b.id};
 releaseTreeWorker(g,u);u.farmToolCondition=job.conditionAtStart;u.farmToolWork=job;if(!claimFarmToolOwnership(g,u)){u.farmToolWork=undefined;if(team===0)g.banner('This resident already owns active work',4);return false;}
 t.wood-=spec.wood;t.stone-=spec.stone;t.copper-=spec.copper;t.iron-=spec.iron;u.order='hold';u.node=null;u.target=null;u.trade=null;u.searchJob=undefined;u.workReason='Repair paid — carrying the worn tool to its workplace';g.workBoard.reset();return true;
}
