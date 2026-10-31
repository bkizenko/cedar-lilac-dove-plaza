import {difficulty} from './difficulty';
import type { Game } from "./sim";
import type { Unit, Building, ResourceNode } from "./types";
import { foodDemand, isDependent } from "./settlement";
import { receiveFood } from "./pantry";
import { applyForagePressure } from "./ecology";
import { mulberry32 } from "./rng";
import { findPath } from "./navigation";
import {queueStandDown} from './demobilization';

/** Population matters even while a large settlement remains in the Stone Age.
 * A small first village still meets scouts; established towns face actual bands. */
export function seaRaidStrength(population:number,age:number,threat:number,wave:number,roll:number,dangerous=false,capacity=36,loss=0,band=1){
 const ceiling=Math.max(1,Math.min(36,Math.ceil(population*(dangerous?.6:.45)),Math.floor(capacity)));
 if(population<16&&wave<=1)return {count:Math.min(ceiling,roll<.5?1:2),condition:.78,label:"A scouting party from the sea"};
 const base=Math.max(3,Math.min(26,Math.ceil(population*.22)));
 // History increases pressure in small steps, then plateaus. Losses and current
 // capacity can make the next raid smaller even after many successful years.
 const escalation=Math.min(5,Math.floor(Math.max(0,wave-1)/2));
 const count=Math.max(1,Math.min(ceiling,Math.round((base+Math.min(3,age)+Math.floor(threat*3)+escalation+(roll<.25?-1:roll>.75?1:0))*(dangerous?1.25:1)*Math.max(.25,Math.min(2,band))*(1-Math.min(.5,loss)))));
 return {count,condition:.95,label:count>=8?"A warband from the sea":"Raiders from the sea"};
}
export function seaRaidArrivalChance(threat:number,night:boolean){return Math.min(.8,threat*.42*(night?1.25:.9));}

/** Count living adults and usable defenses, not children, wealth or historical peaks. */
export function raidReadiness(g:Game){
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&!isDependent(g,u));
 const local=adults.filter(u=>!u.expedition&&!u.foundingJourney&&!u.visit&&!u.envoy&&!u.scout);
 const t=g.tribe(0);let weapons=Math.max(0,t.spears+t.bows+t.blades);
 let power=0;
 for(const u of local){const armed=u.militia||!['worker','leader'].includes(u.type);const equipped=armed||weapons-->0;power+=(equipped?1:.35)*Math.min(1,u.hp/u.maxHp);}
 const buildings=g.state.buildings.filter(b=>b.team===0&&g.finished(b));
 const towers=Math.min(4,buildings.filter(b=>['watchtower','keep'].includes(b.type)).length);
 return {adults:adults.length,buildings:buildings.length,cap:Math.max(1,Math.ceil(power*(g.state.conflict==='dangerous'?.95:.75)+towers))};
}

/** The respite starts when a band has actually gone, including its retreat. */
export function finishSeaRaid(g:Game){
 const campaign=g.state.raidCampaign;
 if(!campaign?.active||g.state.units.some(u=>u.team===3&&u.hp>0&&u.homeCamp===undefined))return;
 const now=raidReadiness(g);
 // New arrivals or construction must not conceal casualties or ruined homes.
 const survivors=campaign.people?campaign.people.filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0&&u.team===0)).length:now.adults;
 const standing=campaign.sites?campaign.sites.filter(id=>g.state.buildings.some(b=>b.id===id&&b.hp>0&&b.team===0)).length:now.buildings;
 campaign.loss=Math.min(1,Math.max(0,(campaign.adults-survivors)/Math.max(1,campaign.adults),(campaign.buildings-standing)/Math.max(1,campaign.buildings)));
 campaign.active=false;
 for(const u of g.state.units){
  if(u.team!==0||u.hp<=0||!u.militia||u.pillage>=0||u.massRaidTarget!==undefined||u.visit||u.trade||u.envoy||u.scout||u.expedition||u.foundingJourney||u.escortId!==undefined||u.huntOnly)continue;
  if(g.state.buildings.some(b=>b.team===0&&g.finished(b)&&Math.hypot(u.x-b.x,u.z-b.z)<60))queueStandDown(g,u,true);
 }
 const hungry=g.tribe(0).food<foodDemand(g)*120;
 g.state.raidT=Math.max(g.state.raidT,480/difficulty(g).raid+Math.round(campaign.loss*900)+(hungry?180:0));
}

/** Seeded land camps have a finite initial band. They never manufacture replacements. */
export function establishRaiderCamps(g: Game) {
  const random = mulberry32(g.state.seed ^ 0x7ad34);
  const home = g.campOf(0);
  const camps = 1 + Math.floor(random() * 2);
  for (let c = 0; c < camps; c++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = random() * Math.PI * 2;
      const radius = g.world.islandR * (0.3 + random() * 0.32);
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.hypot(x - home.x, z - home.z) < 100 || !g.walkable(x, z) ||
          g.state.buildings.some(b => Math.hypot(b.x - x, b.z - z) < 70)) continue;
      if (g.placementIssue("hut", x, z, 3)) continue;
      const camp = g.makeBld("hut", x, z, 3);
      camp.build = 1; camp.hp = camp.maxHp; camp.raiderCamp = true;
      g.state.buildings.push(camp); g.state.walkDirty = true;
      g.tribe(3).food += 60; // Enough to reach the opening grace; later supplies must be gathered or stolen.
      for (let i = 0; i < 2; i++) {
        const angle = i * Math.PI, spot = { x: x + Math.cos(angle) * 6, z: z + Math.sin(angle) * 6 };
        for (let j = 0; j < 16; j++) {
          const a = angle + j * Math.PI / 8, sx = x + Math.cos(a) * 6, sz = z + Math.sin(a) * 6;
          if (g.walkable(sx, sz) && g.workBoard.connected(g, x, z, sx, sz)) { spot.x = sx; spot.z = sz; break; }
        }
        const raider = g.spawnUnit("spearman", spot.x, spot.z, 3);
        raider.homeCamp = camp.id;
        raider.order = "hold";
        raider.workReason = "Watching paths near the raider camp";
      }
      break;
    }
  }
}
/** Permanent land guards must not suppress arrivals from the sea forever. */
export function canScheduleSeaRaid(g: Game) {
  return g.state.conflict !== "quiet" &&
    g.state.time >= (g.state.conflict === "dangerous" ? 600 : 1200) &&
    g.state.units.some(u=>u.team===0&&u.hp>0&&!isDependent(g,u)) &&
    !g.state.units.some(u => u.team === 3 && u.hp > 0 && u.homeCamp === undefined);
}

/** Land at a real shore connected to the player's landmass, never in deep water.
 * The landing is kept outside the village; its inhabitants still have time to react. */
export function findRaiderLanding(g: Game) {
  if (g.state.walkDirty) g.rebuildWalk();
  const home = g.campOf(0), preferred = Math.atan2(home.z, home.x);
  const width = Math.sqrt(g.walk.length), cell = g.world.size / width;
  const index = (x: number, z: number) => Math.floor((z + (g.world.size/2)) / cell) * width + Math.floor((x + (g.world.size/2)) / cell);
  const goals: {x:number;z:number}[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8, x = home.x + Math.cos(angle) * 9, z = home.z + Math.sin(angle) * 9;
    if (g.walkable(x, z)) goals.push({x,z});
  }
  if (!goals.length) return null;
  for (let sweep = 0; sweep < 32; sweep++) {
    const offset = Math.ceil(sweep / 2) * Math.PI / 16 * (sweep % 2 ? 1 : -1);
    const angle = preferred + offset;
    for (let radius = g.world.islandR * 1.25; radius > 24; radius -= 6) {
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      if (Math.hypot(x - home.x, z - home.z) < 80 || !g.walkable(x, z)) continue;
      let shore = false;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        if (g.height(x + Math.cos(a) * 10, z + Math.sin(a) * 10) < g.world.waterY) { shore = true; break; }
      }
      if (!shore || !g.workBoard.connected(g, home.x, home.z, x, z)) continue;
      const goal = goals.slice().sort((a,b) => Math.hypot(a.x-x,a.z-z) - Math.hypot(b.x-x,b.z-z))[0];
      // Component membership alone is insufficient: the runtime pathfinder has
      // a finite search budget. Reject a landing whose journey exceeds it.
      if (findPath(g.walk, width, index(x,z), index(goal.x,goal.z))) return { x, z };
    }
  }
  return null;
}

function localForage(g: Game, u: Unit, camp: Building, dt: number) {
  let node = u.node && "kind" in u.node && u.node.kind === "forage" ? u.node as ResourceNode : null;
  if (node && (node.amount < 1 || u.stuckT > 6)) {
    u.blockedTask = node.id; u.retryWorkAt = g.state.time + 30;
    u.node = null; node = null; u.gatherT = 0;
  }
  if (!node && g.tribe(3).food >= Math.max(24, foodDemand(g, 3) * 180)) return false;
  if (!node) {
    const candidates = g.state.forage.filter(n => n.amount >= 1 &&
      Math.hypot(n.x - camp.x, n.z - camp.z) < 55 &&
      (Math.hypot(n.x - camp.x, n.z - camp.z) < 22 || Math.hypot(n.x - u.x, n.z - u.z) < 22) &&
      !(u.blockedTask === n.id && (u.retryWorkAt || 0) > g.state.time) &&
      !g.state.units.some(other => other !== u && other.hp > 0 && other.homeCamp !== undefined && other.node === n));
    candidates.sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z));
    node = candidates.find(n => g.walkable(n.x, n.z) && g.workBoard.connected(g, u.x, u.z, n.x, n.z)) || null;
    if (!node) return false;
    u.node = node; u.gatherT = 0; u.stuckT = 0;
  }
  u.target = null; u.order = "gather"; u.tx = node.x; u.tz = node.z;
  u.workReason = "Gathering food for the raider camp";
  if (Math.hypot(u.x - node.x, u.z - node.z) > 1.8) g.steer(u, dt);
  else {
    u.gatherT += dt;
    if (u.gatherT >= 8) {
      const amount = Math.min(5, Math.floor(node.amount));
      node.amount -= amount; applyForagePressure(node, amount);
      node.regenT = node.amount <= 0 ? 240 + (node.pressure || 0) * 900 : 0;
      u.carry = amount; u.carryType = "food"; u.carryFood = node.cropCandidate || "berries";
      u.node = null; u.gatherT = 0; u.order = "return";
    }
  }
  return true;
}

export function campRaidAI(g: Game, u: Unit, dt: number) {
  if (u.homeCamp === undefined) return false;
  const camp = g.state.buildings.find(b => b.id === u.homeCamp && b.raiderCamp && b.hp > 0);
  if (!camp) {
    u.order = "hold"; u.target = null; u.node = null;
    u.workReason = "Camp destroyed — the surviving band is scattered";
    return true;
  }
  const retaliate = g.state.units.find(e => e.hp > 0 && e.team !== 3 &&
    (e.target === u || e.target === camp) && Math.hypot(e.x - u.x, e.z - u.z) < 20);
  if (retaliate) {u.target = retaliate; u.order = "attack"; g.combatAI(u, dt); return true;}
  if (u.carry > 0 && u.carryType) {
    u.tx = camp.x; u.tz = camp.z; u.order = "return";
    u.workReason = "Carrying supplies to the raider camp";
    if (!g.buildingWorkReached(u, camp)) g.steer(u, dt);
    else {
      if (u.carryType === "food") receiveFood(g, 3, u.carry, u.carryFood);
      else g.tribe(3)[u.carryType] += u.carry;
      u.carry = 0; u.carryType = null; u.carryFood = undefined; u.target = null; u.node = null;
      u.order = "hold"; u.wanderT = 5;
    }
    return true;
  }
  u.wanderT -= dt;
  const roaming = g.state.time >= 300 && g.state.conflict !== "quiet";
  const sight = g.isNight() ? 12 : 22;
  if (roaming) {
    // Camp patrols look for soft opportunities; escorts and watchposts matter.
    const guarded=(x:number,z:number,team:number)=>g.state.units.some(v=>v.team===team&&v.hp>0&&(v.militia||!['worker','leader'].includes(v.type))&&Math.hypot(v.x-x,v.z-z)<14)||g.state.buildings.some(b=>b.team===team&&g.finished(b)&&['watchtower','keep'].includes(b.type)&&Math.hypot(b.x-x,b.z-z)<22);
    const victim = g.state.units.find(e => e.team !== 3 && e.hp > 0 && e.carry > 0 && e.carryType &&
      Math.hypot(e.x - u.x, e.z - u.z) < sight && Math.hypot(e.x - camp.x, e.z - camp.z) < 65 && !guarded(e.x,e.z,e.team));
    if (victim) {
      u.tx = victim.x; u.tz = victim.z; u.order = "move"; u.node = null;
      u.workReason = "Intercepting an unguarded carrier";
      if (Math.hypot(u.x - victim.x, u.z - victim.z) > 2) g.steer(u, dt);
      else {
        const stolen = Math.min(4, victim.carry);
        victim.carry -= stolen;
        u.carry = stolen; u.carryType = victim.carryType; u.carryFood = victim.carryFood;
        if (victim.carry === 0) { victim.carryType = null; victim.carryFood = undefined; }
        if (victim.team === 0) g.banner(`A raider stole ${stolen} goods from a carrier — escort the route or clear the camp`, 5);
      }
      return true;
    }
    const store = g.state.buildings.find(b => b.team !== 3 && g.finished(b) && b.type === "warehouse" &&
      Math.hypot(b.x - u.x, b.z - u.z) < sight && Math.hypot(b.x - camp.x, b.z - camp.z) < 65 && !guarded(b.x,b.z,b.team) && !(u.blockedTask===b.id&&(u.retryWorkAt||0)>g.state.time));
    if (store) {
      u.tx = store.x; u.tz = store.z; u.order = "move"; u.node = null;
      if (!g.buildingWorkReached(u, store)) g.steer(u, dt);
      else {
        const stolen=Math.min(4,Math.max(0,g.tribe(store.team).food));
        if(!stolen){u.blockedTask=store.id;u.retryWorkAt=g.state.time+90;u.order="hold";u.workReason="The store is empty — looking elsewhere";return true;}
        g.tribe(store.team).food -= stolen; u.carry = stolen; u.carryType = "food"; u.carryFood = "provisions";
        if (store.team === 0) g.banner("Raiders stole food from a storehouse — defend it or clear their camp", 5);
      }
      return true;
    }
  }
  if (localForage(g, u, camp, dt)) return true;
  // Finish each leg before choosing another. The old five-second redirect kept
  // distant patrols circling in place and regularly selected water/cliffs.
  if (u.order === "move" && u.stuckT <= 6) {
    if (g.steer(u, dt)) {u.order = "hold"; u.wanderT = 5;}
    return true;
  }
  if (u.wanderT <= 0 || u.stuckT > 6) {
    const radius = roaming ? 28 + ((Math.floor(g.state.time / 90) + u.id) % 3) * 14 : 8;
    const base = (g.state.time / 11 + u.id) % (Math.PI * 2);
    for (let i = 0; i < 12; i++) {
      const angle = base + i * Math.PI / 6;
      const x = camp.x + Math.cos(angle) * radius, z = camp.z + Math.sin(angle) * radius;
      if (!g.walkable(x, z) || !g.workBoard.connected(g, u.x, u.z, x, z)) continue;
      u.tx = x; u.tz = z; u.order = "move"; u.stuckT = 0;
      u.workReason = roaming ? "Patrolling nearby paths for supply carriers" : "Watching paths near the raider camp";
      g.steer(u, dt); return true;
    }
    u.order = "hold"; u.wanderT = 5;
  }
  return true;
}

/** Evaluate only locally observed targets; distant reserves are never inspected. */
export function raiderTarget(g:Game,u:Unit){
 const candidates=g.state.buildings.filter(b=>b.hp>0&&!b.plannedCost&&g.isFoe(u.team,b.team)&&!['trench','moat'].includes(b.type)&&Math.hypot(b.x-u.x,b.z-u.z)<65);
 const score=(b:Building)=>{
  const guards=g.state.units.filter(v=>v.hp>0&&g.isFoe(u.team,v.team)&&(v.type!=='worker'||v.militia)&&Math.hypot(v.x-b.x,v.z-b.z)<18).length;
  const towers=candidates.filter(v=>['watchtower','keep'].includes(v.type)&&Math.hypot(v.x-b.x,v.z-b.z)<22).length;
  const value=b.type==='warehouse'?55:['farm','dock','lumber'].includes(b.type)?35:b.type==='hut'?20:0;
  return value-Math.hypot(b.x-u.x,b.z-u.z)*.4-guards*20-towers*25-b.hp*.025;
 };
 // If supplies are enclosed, the reachable weakest perimeter becomes the target.
 return candidates.sort((a,b)=>score(b)-score(a)).find(b=>!!g.interactionSpot(u,b))||null;
}
export function seaRaidAI(g:Game,u:Unit,dt:number){
 const raid=u.seaRaid;
 if(u.team!==3||u.homeCamp!==undefined||!raid)return false;
 const nearby=g.state.units.filter(v=>v.hp>0&&Math.hypot(v.x-u.x,v.z-u.z)<18);
 const defenders=nearby.filter(v=>g.isFoe(u.team,v.team)&&(v.type!=='worker'||v.militia));
 const allies=nearby.filter(v=>v.team===u.team);
 if(u.hp<u.maxHp*.32||defenders.length>allies.length*2+1||g.state.time>raid.departAt||u.carry>0)raid.phase='retreat';
 if(raid.phase==='retreat'){
  const breach=u.target;
  if(breach?.kind==='building'&&breach.hp>0&&['gate','palisade','stonewall'].includes(breach.type)&&!(breach.type==='gate'&&breach.gateOpen)){u.order='attack';g.combatAI(u,dt);return true;}
  u.order='move';u.target=null;u.tx=raid.x;u.tz=raid.z;u.workReason=u.carry?'Withdrawing to shore with stolen supplies':'Withdrawing from the raid';
  if(Math.hypot(u.x-raid.x,u.z-raid.z)<5){
   const seen=g.visibleAt(u.x,u.z),loot=u.carry;
   const last=!g.state.units.some(v=>v!==u&&v.team===3&&v.hp>0&&v.seaRaid&&v.homeCamp===undefined);
   if(seen){g.addFloater(u.x,u.y+2,u.z,loot?"Escaped with supplies":"Departed by sea","#e8c878");if(last)g.banner(loot?"The last sea raider escaped with stolen supplies.":"The surviving sea raiders withdrew to their landing and departed.",5);}
   u.carry=0;u.carryType=null;u.carryFood=undefined;u.hp=0;return true;
  }
  // A newly closed perimeter can block withdrawal. Break an accessible barrier.
  if(u.stuckT>3){const wall=g.state.buildings.filter(b=>b.hp>0&&!b.plannedCost&&g.isFoe(u.team,b.team)&&['gate','palisade','stonewall'].includes(b.type)&&!(b.type==='gate'&&b.gateOpen)&&Math.hypot(b.x-u.x,b.z-u.z)<65).sort((a,b)=>a.hp-b.hp+Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)).find(b=>!!g.interactionSpot(u,b));if(wall){u.target=wall;u.order='attack';g.combatAI(u,dt);return true;}}
  g.steer(u,dt);return true;
 }
 // Fight an intercepting guard before resuming the shared village objective.
 // Otherwise the periodic building retarget overrides combat every three seconds.
 const intercept=defenders.filter(v=>Math.hypot(v.x-u.x,v.z-u.z)<=Math.max(7,u.range+2))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
 if(intercept){u.target=intercept;u.order='attack';g.combatAI(u,dt);return true;}
 if(!defenders.some(v=>Math.hypot(v.x-u.x,v.z-u.z)<7)){
  const ruin=g.state.buildings.find(b=>b.hp<=0&&b.lootTeam===3&&b.raidLoot&&Object.values(b.raidLoot).some(v=>(v||0)>0)&&Math.hypot(b.x-u.x,b.z-u.z)<12);
  if(ruin){
   if(g.attackDistance(u,ruin)>u.r+1.8){u.tx=ruin.x;u.tz=ruin.z;g.steer(u,dt);return true;}
   const kind=(['food','wood','stone','copper','iron'] as const).find(k=>(ruin.raidLoot![k]||0)>0)!;
   const amount=Math.min(12,ruin.raidLoot![kind]!);ruin.raidLoot![kind]!-=amount;u.carry=amount;u.carryType=kind;u.carryFood=kind==='food'?'provisions':undefined;raid.phase='retreat';return true;
  }
 }
 if(g.state.time>=raid.thinkAt){
  raid.thinkAt=g.state.time+3;
  const mark=raiderTarget(g,u);
  if(mark){u.target=mark;u.order='attack';u.tx=mark.x;u.tz=mark.z;}
  else if(!u.target||u.target.hp<=0){u.target=null;u.order='attackmove';u.tx=raid.goalX;u.tz=raid.goalZ;}
 }
 g.combatAI(u,dt);return true;
}
