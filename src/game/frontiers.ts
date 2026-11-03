import {difficultyGrievance} from './difficulty';
import {queueDiplomaticMessage} from './diplomaticKnowledge';
import {refreshSettlementSites} from './settlementKnowledge';
export {validObservedSettlements} from './settlementKnowledge';
import type {Game} from './sim';
import type {Building,Unit,GameState} from './types';
import {soilQuality} from './ecology';
import {isDependent} from './settlement';
import {rivalKnows} from './rivalDevelopment';

const armed=(u:Unit)=>u.hp>0&&(u.militia||!['worker','leader'].includes(u.type));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
/** Each armed resident backs only the nearest completed frontier post. */
export function frontierStatus(g:Game,b:Building){
 const posts=g.state.buildings.filter(p=>p.team===b.team&&p.type==='cornerstone'&&g.finished(p));
 const halls=g.state.buildings.filter(p=>p.team===b.team&&p.type==='townhall'&&g.finished(p));
 const homeDistance=Math.min(...halls.map(h=>distance(h,b)),500);
 refreshSettlementSites(g);
 const foreign=(g.state.observedSettlements||[]).filter(p=>p.observer===b.team&&p.owner!==b.team&&p.active);
 const nearRival=Math.min(...foreign.map(h=>distance(h,b)),500);
 const needed=Math.min(8,1+Math.floor(Math.max(0,posts.length-1)/2)+Math.floor(homeDistance/180)+(nearRival<110?2:nearRival<180?1:0));
 const guards=g.state.units.filter(u=>u.team===b.team&&armed(u)&&!isDependent(g,u)&&!u.shelterId&&distance(u,b)<32&&
   !posts.some(p=>p!==b&&(distance(u,p)<distance(u,b)||(distance(u,p)===distance(u,b)&&p.id<b.id)))).length;
 const support=Math.min(1,guards/needed),strength=.25+.75*support;
 return {guards,needed,strength,radius:28+28*support,nearRival};
}
/** Only surveyed local land enters a player's appraisal; no remote stockpile inspection. */
export function frontierValue(g:Game,b:Building,observer=b.team,witnesses?:readonly Unit[]){
 const known=(x:number,z:number)=>(observer===0?g.exploredAt(x,z):rivalKnows(g,observer,x,z))&&(!witnesses||witnesses.some(u=>distance(u,{x,z})<=CLAIM_OBSERVATION_RULES.witnessRadiusMeters));
 const nearby=(n:{x:number;z:number;amount:number})=>distance(n,b)<45&&known(n.x,n.z)&&n.amount>0;
 const timber=g.state.trees.filter(nearby).reduce((sum,n)=>sum+n.amount,0);
 const minerals=[...g.state.stones,...g.state.copper,...g.state.iron].filter(nearby).reduce((sum,n)=>sum+n.amount,0);
 const soil=soilQuality(g,b.x,b.z);
 const trail=g.state.trails?.some(t=>t.wear>.5&&t.x!==undefined&&t.z!==undefined&&distance({x:t.x,z:t.z},b)<25&&known(t.x,t.z))||false;
 const labels=[soil>.75?'fertile soil':null,timber>80?'woodland':null,minerals>40?'minerals':null,trail?'established path':null].filter(Boolean) as string[];
 return {timber,minerals,soil,trail,labels,value:Math.min(1,.15+Math.max(0,soil-.5)*.6+Math.min(.3,timber/1000)+Math.min(.25,minerals/500)+(trail?.2:0))};
}
export function frontierReport(g:Game,b:Building){
 const s=frontierStatus(g,b),v=frontierValue(g,b);
 return `${s.guards}/${s.needed} nearby armed guards · claim strength ${Math.round(s.strength*100)}% · reach ${Math.round(s.radius*1.45)} m · ${v.labels.join(', ')||'surveyed open land'}${s.nearRival<180?' · rival frontier: expansion may raise tensions':''}. Guards eat normal rations and leave civilian work.`;
}
export function guardFrontier(g:Game,id:number){
 const b=g.state.buildings.find(p=>p.id===id&&p.team===0&&p.type==='cornerstone'&&g.finished(p));if(!b)return 0;
 const s=frontierStatus(g,b);let sent=0;
 const choices=g.state.units.filter(u=>u.team===0&&armed(u)&&!isDependent(g,u)&&!u.emergency&&u.escortId===undefined&&u.carry===0&&!u.expedition&&!u.envoy&&!u.visit&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.scout&&!u.studyCrop&&u.drill==null&&['idle','hold','gather'].includes(u.order)&&distance(u,b)>=32)
   .filter(u=>!g.state.buildings.some(p=>p.team===0&&p.type==='cornerstone'&&g.finished(p)&&distance(u,p)<32))
   .sort((a,c)=>distance(a,b)-distance(c,b));
 for(const u of choices){
  if(sent>=s.needed-s.guards)break;
  const spot=g.interactionSpot(u,b);if(!spot)continue;
  g.interruptMission(u);u.node=null;u.target=null;u.jobLock=false;u.job=null;u.order='move';u.stationOnArrival=true;u.tx=spot.x;u.tz=spot.z;u.workReason='Walking to guard the frontier outpost';sent++;
 }
 g.banner(sent?`${sent} armed residents are walking to the outpost. Claim strength rises when they arrive.`:'No spare armed adults available. Equip residents at a crafting building, then send guards.',5);return sent;
}
/** A surveyed coordinate is not evidence of a later claim built there. These
 * dated facts change only when a living observer can see the old or new site. */
export type ObservedClaim = {
  version: 1;
  observer: number;
  owner: 0;
  postId: number;
  x: number;
  z: number;
  observedAt: number;
  witnessId: number;
  active: boolean;
  value: number;
  woodland: boolean;
  mineralRich: boolean;
};
export const CLAIM_OBSERVATION_RULES = {
  version: 1,
  witnessRadiusMeters: 26,
  maximumMemories: 512,
  reviewSeconds: 2,
} as const;
function claimWitnesses(g: Game, team: number) {
  return g.state.units.filter(
    (u) =>
      u.team === team &&
      u.hp > 0 &&
      (!u.prisoner || u.prisoner.phase === "released"),
  );
}
function refreshClaims(g: Game, team: number, posts: Building[]) {
  const witnesses = claimWitnesses(g, team);
  if (!witnesses.length) return;
  const visible = (x: number, z: number) =>
    witnesses.find(
      (u) =>
        distance(u, { x, z }) <= CLAIM_OBSERVATION_RULES.witnessRadiusMeters,
    );
  // Revisiting the LAST observed location can discover removal/movement. Never
  // follow an unseen current entity to its new position through the global list.
  for (const old of g.state.observedClaims || []) {
    if (old.observer !== team) continue;
    const witness = visible(old.x, old.z);
    if (!witness) continue;
    const same = posts.some(
      (p) => p.id === old.postId && p.x === old.x && p.z === old.z,
    );
    if (!same) {
      old.active = false;
      old.observedAt = g.state.time;
      old.witnessId = witness.id;
    }
  }
  for (const post of posts) {
    const witness = visible(post.x, post.z);
    if (!witness) continue;
    const appraisal = frontierValue(g, post, team, witnesses),
      fact: ObservedClaim = {
        version: 1,
        observer: team,
        owner: 0,
        postId: post.id,
        x: post.x,
        z: post.z,
        observedAt: g.state.time,
        witnessId: witness.id,
        active: true,
        value: appraisal.value,
        woodland: appraisal.timber > 80,
        mineralRich: appraisal.minerals > 40,
      };
    const memories = (g.state.observedClaims ??= []),
      index = memories.findIndex(
        (m) => m.observer === team && m.postId === post.id,
      );
    if (index >= 0) memories[index] = fact;
    else {
      if (memories.length >= CLAIM_OBSERVATION_RULES.maximumMemories) {
        let oldest = 0;
        for (let i = 1; i < memories.length; i++)
          if (
            Number(memories[i].active) - Number(memories[oldest].active) < 0 ||
            (memories[i].active === memories[oldest].active &&
              memories[i].observedAt < memories[oldest].observedAt)
          )
            oldest = i;
        memories.splice(oldest, 1);
      }
      memories.push(fact);
    }
    g.state.observedClaims = memories;
  }
}
export function validObservedClaims(s: GameState) {
  const value = s.observedClaims;
  if (value === undefined) return true;
  if (
    !Array.isArray(value) ||
    value.length > CLAIM_OBSERVATION_RULES.maximumMemories
  )
    return false;
  const half = (s.worldOptions?.size ?? 1040) / 2,
    ids = new Set<string>(),
    keys = [
      "version",
      "observer",
      "owner",
      "postId",
      "x",
      "z",
      "observedAt",
      "witnessId",
      "active",
      "value",
      "woodland",
      "mineralRich",
    ];
  for (const m of value) {
    if (
      !m ||
      typeof m !== "object" ||
      Array.isArray(m) ||
      Object.keys(m).some((k) => !keys.includes(k)) ||
      m.version !== 1 ||
      !Number.isSafeInteger(m.observer) ||
      m.observer <= 0 ||
      m.observer === 3 ||
      m.observer >= s.tribes.length ||
      m.owner !== 0 ||
      !Number.isSafeInteger(m.postId) ||
      m.postId < 1 ||
      m.postId >= s.nextId ||
      !Number.isSafeInteger(m.witnessId) ||
      m.witnessId < 1 ||
      m.witnessId >= s.nextId ||
      m.witnessId === m.postId ||
      ![m.x, m.z].every((n) => Number.isFinite(n) && Math.abs(n) <= half) ||
      !Number.isFinite(m.observedAt) ||
      m.observedAt < 0 ||
      m.observedAt > s.time ||
      typeof m.active !== "boolean" ||
      !Number.isFinite(m.value) ||
      m.value < 0 ||
      m.value > 1 ||
      typeof m.woodland !== "boolean" ||
      typeof m.mineralRich !== "boolean"
    )
      return false;
    const key = `${m.observer}:${m.postId}`;
    if (ids.has(key)) return false;
    ids.add(key);
  }
  return true;
}
const reviews=new WeakMap<Game,{buildings:Building[];time:number}>();
const warnings=new WeakMap<Game,Map<number,number>>();
/** Known claims retain their last witnessed appraisal and position. A new,
 * moved or removed remote post cannot silently update another society's facts. */
export function tickFrontiers(g:Game){
 refreshSettlementSites(g);
 const old=reviews.get(g);if(old&&old.buildings===g.state.buildings&&g.state.time>=old.time&&g.state.time-old.time<CLAIM_OBSERVATION_RULES.reviewSeconds)return;
 const dt=old&&old.buildings===g.state.buildings&&g.state.time>=old.time?Math.min(CLAIM_OBSERVATION_RULES.reviewSeconds,g.state.time-old.time):0;
 reviews.set(g,{buildings:g.state.buildings,time:g.state.time});if(!dt)return;
 const posts=g.state.buildings.filter(b=>b.team===0&&b.type==='cornerstone'&&g.finished(b));
 for(const t of g.state.tribes){
  if(t.id===0||t.id===3||!t.alive)continue;
  refreshClaims(g,t.id,posts);
  if(t.ally||(t.compactUntil||0)>g.state.time)continue;
  const halls=g.state.buildings.filter(b=>b.team===t.id&&b.type==='townhall'&&g.finished(b));
  let grievance=0;
  for(const p of g.state.observedClaims||[]){
   if(p.observer!==t.id||!p.active)continue;
   const d=Math.min(...halls.map(h=>distance(h,p)));if(d>=160)continue;
   const need=(t.wood<80&&p.woodland ? .3 : 0)+(t.stone<32&&p.mineralRich ? .25 : 0);
   grievance+=Math.max(0,1-d/160)*(.5+p.value+need+Math.max(0,t.expand)*.3)*(t.trust!==undefined?1-Math.min(.7,t.trust*.5):1);
  }
  if(!grievance)continue;
  const before=t.tension;t.tension=Math.min(1,t.tension+difficultyGrievance(g,dt*Math.min(.24,grievance*.2)));
  t.trust=Math.max(0,(t.trust||0)-difficultyGrievance(g,dt*Math.min(.006,grievance*.003)));
  let warned=warnings.get(g);if(!warned){warned=new Map();warnings.set(g,warned);}
  const last=warned.get(t.id)??-Infinity;
  if(before<.28&&t.tension>=.28&&(g.state.time-last>120||g.state.time<last)){const witness=g.state.observedClaims?.find(p=>p.observer===t.id&&p.active)?.witnessId;queueDiplomaticMessage(g,t.id,'frontier',undefined,witness);warned.set(t.id,g.state.time);}
 }
}
