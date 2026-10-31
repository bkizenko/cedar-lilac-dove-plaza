import {connectedForUnit} from "./waterTravel";
import {isRivalTeam} from "./factions";
import type { Game } from "./sim";
import type { Unit } from "./types";
import { isDependent, reserveSeconds } from "./settlement";
const GRID = 32;
export function scoutKnowledge(g: Game, u: Unit) {
  const memories = (g.state.rivalKnowledge ??= []);
  let memory = memories.find((m) => m.team === u.team);
  if (!memory) {
    memory = { team: u.team, cells: [] };
    memories.push(memory);
  }
  const HALF=g.world.size/2,CELL=g.world.size/GRID;
  const ix = Math.floor((u.x + HALF) / CELL),
    iz = Math.floor((u.z + HALF) / CELL);
  for (let z = iz - 1; z <= iz + 1; z++)
    for (let x = ix - 1; x <= ix + 1; x++)
      if (x >= 0 && z >= 0 && x < GRID && z < GRID && !memory.cells.includes(z * GRID + x))
        memory.cells.push(z * GRID + x);
  return memory;
}
function nextTarget(g: Game, u: Unit) {
  const memory = scoutKnowledge(g, u);
  const HALF=g.world.size/2,CELL=g.world.size/GRID;
  let best: { x: number; z: number } | null = null,
    score = Infinity;
  for (let i = 0; i < GRID * GRID; i++) {
    if (memory.cells.includes(i)) continue;
    const x = ((i % GRID) + 0.5) * CELL - HALF,
      z = (Math.floor(i / GRID) + 0.5) * CELL - HALF;
    if (g.height(x, z) <= g.waterAt(x,z) + 0.3 || !connectedForUnit(g,u,x,z)) continue;
    const d = Math.hypot(x - u.x, z - u.z);
    if (d < score) {
      score = d;
      best = { x, z };
    }
  }
  return best;
}
export function tickScouts(g: Game, dt: number) {
  g.state.scoutTimer = (g.state.scoutTimer ?? 120) - dt;
  if (g.state.scoutTimer > 0) return;
  g.state.scoutTimer = 180;
  for (const t of g.state.tribes) {
    if (
      !isRivalTeam(t.id) ||
      !t.alive ||
      reserveSeconds(g,t.id)<450 || g.popNow(t.id)<5 ||
      g.state.units.some((u) => u.team === t.id && u.hp > 0 && u.scout)
    )
      continue;
    const candidates = g.state.units.filter(
      (u) =>
        u.team === t.id &&
        u.type === "worker" &&
        u.hp > 0 &&
        !isDependent(g, u) &&
        !u.emergency &&
        !u.recalled && !u.envoy && u.drill == null && u.buildOrder === undefined &&
        !u.jobLock && !u.tamingWork&&!u.husbandryWork && !u.tributeJourney && !u.visit && !u.weaponWork && !u.haulageWork && !u.farmToolWork && !u.studyCrop &&
        !u.foundingJourney &&
        u.carry === 0 &&
        ["idle", "gather"].includes(u.order),
    );
    // A blocked pedestrian must not prevent a canoe owner or another resident
    // from surveying a reachable frontier. Do not expose unknown resources.
    let u:Unit|undefined,target:{x:number;z:number}|null=null;
    for(const candidate of candidates){
      target=nextTarget(g,candidate);
      if(target){u=candidate;break;}
    }
    if (!u||!target) continue;
    u.scout = { legs: 0, returning: false };
    u.node = null;
    u.target = null;
    u.order = "move";
    u.tx = target.x;
    u.tz = target.z;
    u.stuckT = 0;
  }
}
export function scoutAI(g: Game, u: Unit, dt: number) {
  if (!u.scout) return false;
  scoutKnowledge(g, u);
  const m = u.scout;
  if (u.stuckT > 16 && m.returning) {
    u.scout = undefined;
    u.order = "return";u.recalled=true;u.stationOnArrival=false;
    u.workReason="Scouting return needs a reachable hearth or crossing";
    return true;
  }
  if (u.stuckT > 8 || m.legs >= 5 || reserveSeconds(g,u.team)<180) m.returning = true;
  if (m.returning) {
    const homes=g.state.buildings.filter(b=>b.team===u.team&&b.type==='townhall'&&g.finished(b))
      .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
    const destination=homes.map(h=>({h,spot:g.interactionSpot(u,h)})).find(p=>p.spot);
    if(!destination){
      u.scout=undefined;u.recalled=true;u.stationOnArrival=false;u.order='return';
      u.workReason='Scouting return needs a reachable hearth or crossing';return true;
    }
    u.tx = destination.spot!.x;
    u.tz = destination.spot!.z;
    u.workReason = "Bringing scouting knowledge home";
    if (g.buildingWorkReached(u,destination.h)) {
      u.scout = undefined;
      u.order = "idle";u.node=null;u.stuckT=0;
      u.workReason='Home from scouting — joining village work';
      return true;
    }
  } else u.workReason = "Exploring beyond their village";
  if (g.steer(u, dt) && !m.returning) {
    m.legs++;
    const next = nextTarget(g, u);
    if (next) {
      u.tx = next.x;
      u.tz = next.z;
    } else m.returning = true;
  }
  return true;
}
