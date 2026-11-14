import {journeyPermit} from './rulersRuntime';
import {SCOUT_PROVISION_RULES,loadScoutProvisions,tickScoutProvisions,scoutReturnBudgetLow} from './scoutProvisions';
import {hasTaskCommitment} from './workCommitments';
import {recordCoastalReview} from './coastalStrategy';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {connectedForUnit,requestWaterNavigation} from "./waterTravel";
import {isRivalTeam} from "./factions";
import type { Game } from "./sim";
import type { Unit } from "./types";
import { isDependent, reserveSeconds } from "./settlement";
export const SCOUTING_RULES={gridWidth:32,paidCanoeFrontierBonusMetres:180,paidCanoeFrontierRadiusMetres:320} as const;
const GRID = SCOUTING_RULES.gridWidth;
export function scoutKnowledge(g: Game, u: Unit) {
  // Player vision already follows actual owned bodies; inherited return packs
  // must not create an invalid NPC-only private memory for team zero.
  if(!isRivalTeam(u.team))return{team:u.team,cells:[] as number[]};
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
    const distance=Math.hypot(x-u.x,z-u.z);
    // A real paid canoe surveys a nearby water-separated frontier before
    // duplicating another pedestrian's local circuit; no partner/resource coordinates are consulted.
    const d=distance-(u.haulage==='canoe'&&distance<=SCOUTING_RULES.paidCanoeFrontierRadiusMetres&&!g.workBoard.connected(g,u.x,u.z,x,z)?SCOUTING_RULES.paidCanoeFrontierBonusMetres:0);
    if (d < score) {
      score = d;
      best = { x, z };
    }
  }
  return best;
}
export function tickScouts(g: Game, dt: number) {
  tickScoutProvisions(g,dt);
  g.state.scoutTimer = (g.state.scoutTimer ?? 120) - dt;
  if (g.state.scoutTimer > 0) return;
  g.state.scoutTimer = 180;
  for (const t of g.state.tribes) {
    if (
      !isRivalTeam(t.id) ||
      !t.alive ||
      reserveSeconds(g,t.id)<(journeyPermit(g,t.id,'explore')?.reserve??450) || g.popNow(t.id)<5 ||
      g.state.units.some((u) => u.team === t.id && u.hp > 0 && u.scout)
    )
      continue;
    const candidates = g.state.units.filter(
      (u) =>
        u.team === t.id &&
        u.type === "worker" &&
        u.hp >=u.maxHp*SCOUT_PROVISION_RULES.departureHealthFraction && (u.thirstSeconds||0)<SCOUT_PROVISION_RULES.departureMaximumThirstSeconds &&
        !isDependent(g, u) && !u.prisoner&&!u.militia&&!hasTaskCommitment(u)&&
        !u.societyMissionId&&!u.coastalVoyageId&&!u.coastalCommissionId && !u.emergency &&
        !u.recalled && !u.envoy && u.drill == null && u.buildOrder === undefined &&
        !u.jobLock && !u.tamingWork&&!u.husbandryWork && !u.tributeJourney && !u.visit && !u.weaponWork && !u.haulageWork && !u.farmToolWork && !u.studyCrop &&
        !u.foundingJourney &&
        u.carry === 0 &&
        ["idle", "gather"].includes(u.order),
    );
    candidates.sort((a,b)=>Number(b.haulage==='canoe')-Number(a.haulage==='canoe')||a.id-b.id);
    if(candidates[0]?.haulage==='canoe'&&requestWaterNavigation(g,false).status==='pending'){g.state.scoutTimer=Math.min(g.state.scoutTimer,1);recordCoastalReview(g,t.id,'scout-water-preparing','Preparing the current amphibious route');continue;}
    // A blocked pedestrian must not prevent a canoe owner or another resident
    // from surveying a reachable frontier. Do not expose unknown resources.
    let u:Unit|undefined,target:{x:number;z:number}|null=null;
    for(const candidate of candidates){
      target=nextTarget(g,candidate);
      if(target){u=candidate;break;}
    }
    if (!u||!target) continue;
    g.interruptMission(u);
    u.scout = { legs: 0, returning: false,preparing:true };
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
  if(m.preparing){
    const homes=supplyDrops(g,u.team).map(d=>({d,p:supplyApproach(g,u,d)})).filter(row=>row.p).sort((a,b)=>Math.hypot(u.x-a.p!.x,u.z-a.p!.z)-Math.hypot(u.x-b.p!.x,u.z-b.p!.z));const home=homes[0];
    if(!home){u.scout=undefined;u.order='idle';return true;}
    u.order='move';u.workReason='Walking home to load finite scouting food and water';u.tx=home.p!.x;u.tz=home.p!.z;
    if(!supplyReached(g,u,home.d,home.p!)){g.steer(u,dt);return true;}
    if(!loadScoutProvisions(g,u)){u.scout=undefined;u.order='idle';return true;}
    const target=nextTarget(g,u);if(!target){u.scout=undefined;u.order='idle';return true;}
    if(u.haulage==='canoe')recordCoastalReview(g,u.team,'paid-canoe-scout-departed');
    m.preparing=undefined;u.tx=target.x;u.tz=target.z;return true;
  }
  if(scoutReturnBudgetLow(g,u))m.returning=true;
  if (u.stuckT > 16 && m.returning) {
    u.scout = undefined;
    u.order = "return";u.recalled=true;u.stationOnArrival=false;
    u.workReason="Scouting return needs a reachable camp, store or crossing";
    return true;
  }
  if (u.stuckT > 8 || m.legs >= (journeyPermit(g,u.team,'explore')?.legs ?? 5) || reserveSeconds(g,u.team)<(journeyPermit(g,u.team,'explore')?.recall??180)) m.returning = true;
  if (m.returning) {
    const homes=supplyDrops(g,u.team).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
    const destination=homes.map(h=>({h,spot:supplyApproach(g,u,h)})).find(p=>p.spot);
    if(!destination){
      u.scout=undefined;u.recalled=true;u.stationOnArrival=false;u.order='return';
      u.workReason='Scouting return needs a reachable camp or store';return true;
    }
    u.tx = destination.spot!.x;
    u.tz = destination.spot!.z;
    u.workReason = "Bringing scouting knowledge home";
    if (supplyReached(g,u,destination.h,destination.spot!)) {
      u.scout = undefined;
      // Any retained cargo stays on its existing return executor; scouting
      // never credits supplies or duplicates the communal cache itself.
      u.order = u.carry>0?"return":"idle";u.node=null;u.stuckT=0;
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
