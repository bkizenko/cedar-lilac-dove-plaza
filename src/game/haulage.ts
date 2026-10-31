import {workRuntime} from './workRuntime';
import {releaseTreeWorker} from './workAllocation';
import {hasTaskCommitment} from './workCommitments';
import {launchRiverboat} from './boats';
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
  kind: HaulageKind; progress: number; duration: number; workplace: number; paused?: boolean; vessel?:boolean; projectId?:number;
};
/** Paid materials and progress belong to the settlement project, independently
 * of a living assignee. Unit.haulageWork remains an executor compatibility view. */
export type HaulageProject={id:number;team:number;actorId:number|null;lastActorId?:number;work:HaulageWork;createdAt:number;inputHaulage?:'sled';blockedReason?:string};
type ProjectState=Game['state']&{haulageProjects?:HaulageProject[]};
const projectKey=(id:number)=>`haulage:${id}`;
const projects=(g:Game)=>(g.state as ProjectState).haulageProjects??((g.state as ProjectState).haulageProjects=[]);
function registerProject(g:Game,u:HaulageUnit){
 const work=u.haulageWork;if(!work)return undefined;
 let project=projects(g).find(p=>p.id===work.projectId);
 if(!project){const id=g.id();work.projectId=id;project={id,team:u.team,actorId:u.id,lastActorId:u.id,work,createdAt:g.state.time,...(work.kind==='cart'?{inputHaulage:'sled' as const}:{})};projects(g).push(project);}
 else if(project.actorId===u.id)u.haulageWork=project.work;
 return project;
}
/** Adopt legacy jobs and relink the compatibility view after JSON save/load.
 * This does not reassign workers or discard paused compatibility views. */
export function syncHaulageProjects(g:Game){
 for(const u of g.state.units)if(u.haulageWork)registerProject(g,u);
 for(const p of projects(g)){
  const u=p.actorId===null?undefined:g.state.units.find(u=>u.id===p.actorId);
  if(u&&u.hp>0){u.haulageWork=p.work;}else if(p.actorId!==null)detachHaulageProject(g,u,p,'Assigned resident lost');
 }
}
function reserveProject(g:Game,p:HaulageProject,u:HaulageUnit,b:Building){
 const coordinator=workRuntime(g),id=projectKey(p.id);
 const legacyBenchUsers=craftingQueue(g,b).filter(person=>!person.haulageWork).length;
 const claims=[{key:`craft:${b.id}:bench`,amount:1,capacity:Math.max(0,craftingBenches(b)-legacyBenchUsers)}];
 if(!coordinator.job(id))coordinator.propose({id,kind:'craft:haulage',owner:p.team,actors:[u.id],target:b.id});
 const current=coordinator.job(id);
 const accepted=current?.phase==='suspended'?coordinator.resume(id,[u.id],claims):coordinator.reserve(id,claims);
 if(!accepted){p.blockedReason=coordinator.job(id)?.blockedReason?.startsWith('Insufficient capacity')?'All crafting benches at this workplace are occupied':'This resident already owns another active project';coordinator.suspend(id,p.blockedReason);return false;}
 coordinator.retarget(id,b.id);coordinator.transition(id,'traveling',p.work.progress/p.work.duration);p.blockedReason=undefined;return true;
}
function detachHaulageProject(g:Game,u:HaulageUnit|undefined,p:HaulageProject,reason:string){
 p.lastActorId=p.actorId??u?.id??p.lastActorId;p.work.paused=true;p.actorId=null;p.blockedReason=reason;
 if(u){if(p.work.kind==='cart'&&u.haulage==='sled'){p.inputHaulage='sled';u.haulage=undefined;}if(u.haulageWork?.projectId===p.id)u.haulageWork=undefined;if(u.order==='hold'){u.order='idle';u.node=null;u.workReason=reason;g.workBoard.reset();}}
 workRuntime(g).suspend(projectKey(p.id),reason);
}
/** Called before dead residents are removed; detached projects remain saveable. */
export function reconcileHaulageProjects(g:Game){
 syncHaulageProjects(g);
 for(const p of projects(g)){
  const u=p.actorId===null?undefined:g.state.units.find(u=>u.id===p.actorId);
  if(!u)continue;
  if(u.hp<=0||p.work.paused||u.order!=='hold'||!civilian(g,u)){detachHaulageProject(g,u,p,u.hp<=0?'Assigned resident died':'Work suspended by another order');continue;}
  const b=workplaces(g,p.team,p.work.kind,p.work.workplace)[0];
  if(!b){detachHaulageProject(g,u,p,'Workplace lost — choose a replacement');continue;}
  const job=workRuntime(g).activeJob(u.id);
  if(job?.id!==projectKey(p.id)){releaseTreeWorker(g,u);if(!reserveProject(g,p,u,b))detachHaulageProject(g,u,p,p.blockedReason||'Bench unavailable');}
 }
}
export function haulageProjectDiagnostics(g:Game){const all=projects(g);return {projects:all.length,active:all.filter(p=>p.actorId!==null&&!p.work.paused).length,suspended:all.filter(p=>p.work.paused).length,coordinator:{...workRuntime(g).metrics}};}
function completeProject(g:Game,u:HaulageUnit){const id=u.haulageWork?.projectId;if(id===undefined)return;const list=projects(g),index=list.findIndex(p=>p.id===id);if(index>=0)list.splice(index,1);const runtime=workRuntime(g);runtime.finish(projectKey(id));runtime.forget(projectKey(id));}

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
  return civilian(g, u) && u.carry === 0 && !hasTaskCommitment(u,'haulageWork') &&
    u.drill === undefined && !u.expedition && !u.envoy && !u.scout && !u.visit &&
    !u.emergency && !u.foundingJourney && !u.recalled && !u.buildOrder && !u.tributeJourney && !u.resting && !u.shelterId &&
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
  syncHaulageProjects(g);
  const pending=projects(g).filter(p=>p.team===team&&p.work.kind===kind&&!p.work.vessel&&p.work.paused);
  for(const p of pending)if(resumeHaulageProject(g,p.id,unitId,workplaceId))return true;
  if(pending.length)return reject(pending[0].blockedReason||'Paid transport work is waiting for an available adult and bench');
  const candidates = (g.state.units as HaulageUnit[]).filter(u => u.team === team &&
    (unitId === undefined || u.id === unitId) && available(g, u) && !u.haulageWork && !u.farmToolWork &&
    (kind === 'cart' ? u.haulage === 'sled' : !u.haulage))
    .sort((a, b) => Number(b.selected) - Number(a.selected));
  const u = candidates.find(p => nearestWorkplace(g, p, sites));
  if (!u) return reject(kind === 'cart' ? 'Choose an available adult sled carrier with empty hands and a route to the shelter' : 'Need an available adult with empty hands and a route to the workplace');
  if (t.wood < spec.wood || t.stone < spec.stone) return reject(`Need ${spec.wood} logs and ${spec.stone} stone`);
  const b = nearestWorkplace(g, u, sites)!;
  u.haulageWork = { kind, progress: 0, duration: spec.seconds * (b.type === 'townhall' ? 2 : 1), workplace: b.id };
  const project=registerProject(g,u)!;releaseTreeWorker(g,u);
  if(!reserveProject(g,project,u,b)){const list=projects(g);list.splice(list.indexOf(project),1);workRuntime(g).finish(projectKey(project.id),true);workRuntime(g).forget(projectKey(project.id));u.haulageWork=undefined;return reject(project.blockedReason||'No free crafting bench');}
  t.wood -= spec.wood;t.stone -= spec.stone;
  u.order = 'hold'; u.node = null; u.target = null; u.trade = null; u.searchJob = undefined;
  u.workReason = `Making ${spec.name.toLowerCase()} — walking to the workplace`;
  g.workBoard.reset();
  if (team === 0) g.banner(`${spec.name}: materials reserved; one adult leaves other work to build it`, 4);
  return true;
}

/** Explicit movement, recall and combat pause work without erasing paid materials. */
export function pauseHaulageWork(u: HaulageUnit,g?:Game) {
 if(!u.haulageWork)return;
 u.haulageWork.paused=true;
 if(g){const p=registerProject(g,u);if(p)detachHaulageProject(g,u,p,'Explicit order suspended transport work');}
}

/** A paid project may move to a replacement reachable workplace; it never repays costs. */
export function resumeHaulageWork(g:Game,u:HaulageUnit,workplaceId?:number){
 const owned=registerProject(g,u);
 if(owned)return resumeHaulageProject(g,owned.id,u.id,workplaceId);
 syncHaulageProjects(g);
 const former=projects(g).filter(p=>p.team===u.team&&p.actorId===null&&p.work.paused&&p.lastActorId===u.id);
 const matching=workplaceId===undefined?former:former.filter(p=>p.work.workplace===workplaceId);
 const candidates=matching.length?matching:former;
 if(candidates.length!==1){for(const p of candidates)p.blockedReason='Select the saved project explicitly — this resident has more than one suspended project';return false;}
 return resumeHaulageProject(g,candidates[0].id,u.id,workplaceId);
}
/** Explicitly resume paid work on a replacement adult; inputs are never charged again. */
export function resumeHaulageProject(g:Game,id:number,unitId?:number,workplaceId?:number){
 syncHaulageProjects(g);
 const p=projects(g).find(p=>p.id===id);if(!p)return false;
 const previous=p.actorId===null?undefined:g.state.units.find(u=>u.id===p.actorId);
 if(previous&&!p.work.paused&&previous.hp>0){p.blockedReason='This project already has an active worker';return false;}
 if(previous)detachHaulageProject(g,previous,p,'Reassigning suspended transport project');
 const sites=workplaces(g,p.team,p.work.kind,workplaceId);
 if(!sites.length){p.work.paused=true;p.blockedReason='Complete a compatible workplace before resuming this project';return false;}
 const candidates=g.state.units.filter(u=>u.team===p.team&&(unitId===undefined||u.id===unitId)&&available(g,u)&&!u.haulageWork&&u.stuckT<=8&&
  (p.work.kind==='cart'?p.inputHaulage==='sled'&&!u.haulage:!u.haulage)).sort((a,b)=>Number(b.selected)-Number(a.selected)||a.id-b.id);
 let reachable=false,benchReason:string|undefined;
 for(const u of candidates){
  const b=nearestWorkplace(g,u,sites);if(!b)continue;
  reachable=true;releaseTreeWorker(g,u);if(!reserveProject(g,p,u,b)){benchReason=p.blockedReason;continue;}
  const fraction=p.work.progress/p.work.duration;
  p.work.duration=p.work.vessel?150:HAULAGE[p.work.kind].seconds*(b.type==='townhall'?2:1);p.work.progress=fraction*p.work.duration;
  p.work.workplace=b.id;p.work.paused=false;p.actorId=u.id;p.lastActorId=u.id;u.haulageWork=p.work;
  u.order='hold';u.node=null;u.target=null;u.trade=null;u.searchJob=undefined;
  u.workReason=`Resuming ${p.work.vessel?'riverboat':HAULAGE[p.work.kind].name.toLowerCase()}`;g.workBoard.reset();return true;
 }
 p.work.paused=true;p.blockedReason=!candidates.length?'Choose an available adult with empty hands and no other project':!reachable?'No reachable completed workplace for this project':benchReason||'No free crafting bench';return false;
}

export function haulageWorkAI(g: Game, u: HaulageUnit, dt: number) {
  const job = u.haulageWork;
  if (!job || job.paused || !civilian(g, u) || u.order !== 'hold') return false;
  const project=registerProject(g,u)!;const coordinator=workRuntime(g);
  if(coordinator.activeJob(u.id)?.id!==projectKey(project.id)){const site=workplaces(g,u.team,job.kind,job.workplace)[0];releaseTreeWorker(g,u);if(!site||!reserveProject(g,project,u,site)){job.paused=true;u.workReason=project.blockedReason||'Transport work waiting for a bench';return true;}}
  if (g.state.weather === 'storm' || g.clockState().period === 'Night' && !g.state.nightWork) return false;
  const b = workplaces(g, u.team, job.kind, job.workplace)[0];
  const spot = b && g.interactionSpot(u, b);
  if (!b || !spot) {
    job.paused = true; u.order = 'idle';
    u.workReason = 'Transport work paused — choose a reachable replacement workplace';
    g.workBoard.reset();
    return true;
  }
  if (u.stuckT > 8) {
    job.paused = true; u.order = 'idle'; u.node = null;
    u.workReason = 'Transport work paused — cannot reach the crafting bench';
    g.workBoard.reset();
    return true;
  }
  if (!craftBenchReady(g,u,b)) return true;
  coordinator.transition(projectKey(project.id),'working',job.progress/job.duration);
  if (!g.buildingWorkReached(u, b)) {
    u.tx = spot.x; u.tz = spot.z; g.steer(u, dt);
    u.workReason = `Walking to make ${job.vessel?'riverboat':HAULAGE[job.kind].name.toLowerCase()}`;
    return true;
  }
  job.progress = Math.min(job.duration, job.progress + craftingEffort(u,dt) * predisposition(u).strength);
  u.stride += Math.max(0, dt) * 5; u.facing = Math.atan2(b.x - u.x, b.z - u.z);
  u.workReason = `Making ${job.vessel?'riverboat':HAULAGE[job.kind].name.toLowerCase()} · ${Math.floor(100 * job.progress / job.duration)}%`;
  if (job.progress >= job.duration) {
    if(job.vessel){if(!launchRiverboat(g,b)){u.workReason='Riverboat ready — waiting for clear launch water';return true;}completeProject(g,u);u.haulageWork=undefined;u.order='idle';g.workBoard.reset();if(u.team===0)g.banner('Riverboat launched. Select residents and board from this dock.',5);return true;}
    completeProject(g,u);u.haulage = job.kind; u.haulageWork = undefined; u.order = 'idle';
    u.workReason = `${HAULAGE[job.kind].name} ready — carrying capacity ×${HAULAGE[job.kind].capacity}`;
    g.workBoard.reset();
    if (u.team === 0) { g.banner(u.workReason, 4); g.onSfx('place'); }
  }
  return true;
}

/** Borrowing a caravan weapon does not leave the resident’s transport behind. */
function usesTransport(u: HaulageUnit) {
  return (u.type === 'worker' && !u.militia) || !!u.caravanArmed;
}

/** One real transport belongs to one civilian; no village-wide passive bonus. */
export function carryingCapacity(u: HaulageUnit, kind: ResKind) {
  return GATHER[kind].carry * (u.boat?.phase==='aboard'?5:usesTransport(u) && u.haulage ? HAULAGE[u.haulage].capacity : 1);
}

export function loadedHaulSpeed(u: HaulageUnit) {
  return usesTransport(u) && u.carry > 0 && u.haulage ? HAULAGE[u.haulage].loadedSpeed : 1;
}

/** Call exactly once on an actual store delivery, immediately before clearing cargo. */
export function recordHaulDelivery(g: Game, u: HaulageUnit) {
  if (u.haulage !== 'sled' || !usesTransport(u) || !u.carryType || u.carry <= 0) return;
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
  if(w.vessel!==undefined&&(typeof w.vessel!=='boolean'||w.kind!=='canoe'))return false;
  const durations = w.vessel?[150]:w.kind === 'sled' ? [HAULAGE.sled.seconds, HAULAGE.sled.seconds * 2] : [w.kind==='canoe'?HAULAGE.canoe.seconds:HAULAGE.cart.seconds];
  if (!finite(w.duration) || !durations.includes(w.duration) ||
    !finite(w.progress) || w.progress < 0 || w.progress > w.duration ||
    !Number.isSafeInteger(w.workplace) || Number(w.workplace) < 1 ||
    w.paused !== undefined && typeof w.paused !== 'boolean') return false;
  if(w.projectId!==undefined&&(!Number.isSafeInteger(w.projectId)||Number(w.projectId)<1))return false;
  return w.kind === 'cart' ? v.haulage === 'sled'||w.projectId!==undefined&&v.haulage===undefined : v.haulage === undefined;
}

export function validHaulageTribe(v: unknown) {
  return record(v) && (v.haulagePractice === undefined ||
    finite(v.haulagePractice) && v.haulagePractice >= 0 && v.haulagePractice <= WHEEL_PRACTICE);
}

/** Share idle land transport only through a physical handoff at a settlement.
 * Boats and bonded animals stay with their handlers; direct orders remain owned. */
export function shareLocalTransport(g:Game){
 if(g.clockState().period==='Night'||g.state.weather==='storm')return 0;
 const safe=(u:HaulageUnit)=>civilian(g,u)&&available(g,u)&&!u.haulageWork&&!u.jobLock&&!u.buildOrder&&!u.selected&&!u.resting&&!u.shelterId&&!u.tributeJourney;
 const donors=g.state.units.filter(u=>safe(u)&&u.order==='idle'&&(u.haulage==='sled'||u.haulage==='cart'));
 if(!donors.length)return 0;
 const recipients=g.state.units.filter(u=>safe(u)&&!u.haulage&&u.order==='gather'&&u.node&&
  Math.hypot(u.node.x-u.x,u.node.z-u.z)>12);
 let shared=0;
 for(const donor of donors){
  const depot=g.state.buildings.find(b=>b.team===donor.team&&g.finished(b)&&['townhall','warehouse','cornerstone'].includes(b.type)&&g.buildingWorkReached(donor,b));
  if(!depot)continue;
  const receiver=recipients.find(u=>!u.haulage&&u.team===donor.team&&Math.hypot(u.x-donor.x,u.z-donor.z)<=2.4&&g.canStep(donor,u.x,u.z));
  if(!receiver)continue;
  receiver.haulage=donor.haulage;donor.haulage=undefined;shared++;
  donor.workReason='Shared transport with a nearby carrier';
  receiver.workReason=`Borrowed ${HAULAGE[receiver.haulage!].name.toLowerCase()} for this journey`;
 }
 return shared;
}

/** Validate project/actor cross references before relinking untrusted saved JSON. */
export function validHaulageProjects(state:unknown){
 if(!record(state))return false;
 if(state.haulageProjects===undefined)return Array.isArray(state.units)&&state.units.every(u=>!record(u)||!record(u.haulageWork)||u.haulageWork.projectId===undefined);
 if(!Array.isArray(state.haulageProjects)||state.haulageProjects.length>10000||!Array.isArray(state.units)||!Array.isArray(state.tribes))return false;
 const ids=new Set<number>(),actors=new Set<number>();
 const entityIds=new Set<number>();
 for(const key of ['units','buildings','trees','stones','forage','fish','copper','iron','critters','boats']){const list=state[key];if(Array.isArray(list))for(const entity of list)if(record(entity)&&Number.isSafeInteger(entity.id))entityIds.add(Number(entity.id));}
 for(const value of state.haulageProjects){
  if(!record(value)||!Number.isSafeInteger(value.id)||Number(value.id)<1||!Number.isSafeInteger(state.nextId)||Number(value.id)>=Number(state.nextId)||entityIds.has(Number(value.id))||ids.has(Number(value.id))||!Number.isInteger(value.team)||Number(value.team)<0||Number(value.team)>=state.tribes.length||!finite(value.createdAt)||value.createdAt<0||finite(state.time)&&value.createdAt>state.time||!record(value.work)||value.work.projectId!==value.id)return false;
  ids.add(Number(value.id));
  if(value.lastActorId!==undefined&&(!Number.isSafeInteger(value.lastActorId)||Number(value.lastActorId)<1||Number(value.lastActorId)>=Number(state.nextId)))return false;
  if(value.inputHaulage!==undefined&&value.inputHaulage!=='sled'||value.work.kind==='cart'&&value.inputHaulage!=='sled'||value.work.kind!=='cart'&&value.inputHaulage!==undefined||value.blockedReason!==undefined&&(typeof value.blockedReason!=='string'||value.blockedReason.length>500))return false;
  if(!validHaulageUnit({haulageWork:value.work,...(value.work.kind==='cart'?{haulage:'sled'}:{})}))return false;
  if(value.actorId===null){if(value.work.paused!==true)return false;}
  else{
   if(!Number.isSafeInteger(value.actorId)||Number(value.actorId)<1||actors.has(Number(value.actorId)))return false;
   actors.add(Number(value.actorId));
   const actor=state.units.find(u=>record(u)&&u.id===value.actorId);
   if(!record(actor)||actor.team!==value.team||!finite(actor.hp)||actor.hp<=0||!record(actor.haulageWork)||actor.haulageWork.projectId!==value.id)return false;
   // JSON duplicates object values: require the serialized facade to agree exactly.
   for(const key of ['kind','progress','duration','workplace','paused','vessel','projectId'])if(actor.haulageWork[key]!==value.work[key])return false;
   if(value.work.kind==='cart'&&actor.haulage!==undefined&&actor.haulage!=='sled')return false;
  }
 }
 for(const actor of state.units)if(record(actor)&&record(actor.haulageWork)&&actor.haulageWork.projectId!==undefined){const work=actor.haulageWork;const p=state.haulageProjects.find(p=>record(p)&&p.id===work.projectId);if(!record(p)||p.actorId!==actor.id)return false;}
 return true;
}
