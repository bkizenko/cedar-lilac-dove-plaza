import {FISHING_BANK_RADII,SHALLOW_FISH_SITE_RULES} from './shallowFishSites';
import {subsistenceLaborMultiplier} from './subsistenceBalance';
import {connectedForUnit} from "./waterTravel";
import {carryingCapacity} from "./haulage";
import type {Game} from './sim';
import type {Building,Unit,ResourceNode} from './types';
import {DOCK_R,GATHER,GATHER_WORK_RATE} from './constants';
import {reserveSeconds} from "./settlement";
import {mulberry32} from './rng';
/** Seconds, fish units, and dimensionless habitat pressure. These keep catch
 * finite: recovery changes wild stock, never the village inventory. */
export const FISHERY_RULES=Object.freeze({replenishmentSpeed:2,defaultCapacityFish:8,habitatCell:12,yearSeconds:1800,seasonSeconds:450,winterProductivity:.4,droughtProductivity:.35,floodProductivity:1.2,pressureRecoverySeconds:1200,fullStockRecoverySeconds:240,maximumPressurePenalty:.8,emptyRestBaseSeconds:60,emptyRestPressureSeconds:180});
/** One saved habitat cell identity for dock and reach surveys. Water
 * connectivity is still checked by the caller; a cell alone is not an ocean. */
export const fishHabitatCell=(x:number,z:number)=>`${Math.floor(x/FISHERY_RULES.habitatCell)}:${Math.floor(z/FISHERY_RULES.habitatCell)}`;
/** Charge only actual catches to the same finite node. Repeated attempts at an
 * empty node do not restart its rest timer; recovery never credits a village. */
export function consumeFishStock(n:ResourceNode,requested:number){
 const taken=Number.isFinite(requested)?Math.max(0,Math.min(requested,n.amount)):0;
 if(taken<=0)return 0;
 n.amount=Math.max(0,n.amount-taken);
 n.pressure=Math.min(1,(n.pressure||0)+.4*taken/Math.max(1,n.maxAmt||FISHERY_RULES.defaultCapacityFish));
 if(n.amount===0)n.regenT=FISHERY_RULES.emptyRestBaseSeconds+(n.pressure||0)*FISHERY_RULES.emptyRestPressureSeconds;
 return taken;
}
function fishRecoveryRate(g:Game){return (Math.floor((g.state.time%FISHERY_RULES.yearSeconds)/FISHERY_RULES.seasonSeconds)===3?FISHERY_RULES.winterProductivity:1)*(g.state.weather==='drought'?FISHERY_RULES.droughtProductivity:g.state.weather==='flood'?FISHERY_RULES.floodProductivity:1);}
/** Conservative resting estimate at current season/weather; continued catches
 * or changing weather can change it. Includes the actual remaining rest timer. */
export function fishRecoveryEstimateSeconds(g:Game,n:ResourceNode){
 if(n.amount>=1)return 0;const rate=fishRecoveryRate(g),rest=n.amount<=0?Math.max(0,n.regenT)/(rate*FISHERY_RULES.replenishmentSpeed):0,pressure=Math.max(0,(n.pressure||0)-rest/FISHERY_RULES.pressureRecoverySeconds),growth=(n.maxAmt||FISHERY_RULES.defaultCapacityFish)/FISHERY_RULES.fullStockRecoverySeconds*rate*FISHERY_RULES.replenishmentSpeed*(1-FISHERY_RULES.maximumPressurePenalty*pressure);return Math.ceil(rest+Math.max(0,1-n.amount)/growth);
}
type WaterPoint={x:number;z:number};
const waterCache=new WeakMap<Game,{world:Game["world"];height:Game["height"];water:number;second:number;fish:ResourceNode[];docks:Map<number,WaterPoint[]>;grounds:Map<number,ResourceNode[]>}>();
/** Local water connectivity prevents a dock draining a separate pond across land. */
function dockWaters(g:Game,b:Building){
  let cache=waterCache.get(g);
  if(!cache||cache.world!==g.world||cache.height!==g.height||cache.water!==g.world.waterY||cache.second!==Math.floor(g.state.time)||cache.fish!==g.state.fish){
    cache={world:g.world,height:g.height,water:g.world.waterY,second:Math.floor(g.state.time),fish:g.state.fish,docks:new Map(),grounds:new Map()};waterCache.set(g,cache);
  }
  const cached=cache.docks.get(b.id);if(cached)return cached;
  const step=2,radius=DOCK_R+8,width=radius+1;
  const ox=Math.floor((b.x-radius)/step)*step,oz=Math.floor((b.z-radius)/step)*step;
  const wet=new Uint8Array(width*width),seen=new Uint8Array(wet.length);
  let start=-1,nearest=Infinity;
  for(let iz=0;iz<width;iz++)for(let ix=0;ix<width;ix++){
    const x=ox+ix*step,z=oz+iz*step,id=iz*width+ix;
    if(g.height(x,z)>g.waterAt(x,z)+.04)continue;
    wet[id]=1;const d=Math.hypot(x-b.x,z-b.z);
    if(d<nearest){nearest=d;start=id;}
  }
  const result:WaterPoint[]=[];
  if(start>=0&&nearest<=9){
    const queue=[start];seen[start]=1;
    for(let head=0;head<queue.length;head++){
      const at=queue[head],ix=at%width,iz=Math.floor(at/width);
      result.push({x:ox+ix*step,z:oz+iz*step});
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=ix+dx,nz=iz+dz,id=nz*width+nx;
        if(nx<0||nz<0||nx>=width||nz>=width||!wet[id]||seen[id])continue;
        seen[id]=1;queue.push(id);
      }
    }
  }
  cache.docks.set(b.id,result);return result;
}
function touchesWater(g:Game,n:WaterPoint,water:WaterPoint[]){
  // Original saves represent fish near the bank, sometimes just above water.
  const radius=g.height(n.x,n.z)<=g.waterAt(n.x,n.z)+.04?1.5:6.5;
  return water.some(p=>(p.x-n.x)**2+(p.z-n.z)**2<=radius*radius);
}
function localGrounds(g:Game,b:Building,water:WaterPoint[]){
  return g.state.fish.filter(n=>Math.hypot(n.x-b.x,n.z-b.z)<=DOCK_R&&touchesWater(g,n,water));
}
/** Survey fixed habitat sections once; exhausted sections remain saved nodes and
 * are never refilled by a new dock, clicking again, moving away, or loading. */
function surveyFishingWater(g:Game,b:Building,water:WaterPoint[]){
  if(!g.finished(b)||!water.length)return;
  const sections=FISHERY_RULES.habitatCell,existing=g.state.fish.filter(n=>Math.hypot(n.x-b.x,n.z-b.z)<=DOCK_R+15&&touchesWater(g,n,water));
  for(let iz=Math.floor((b.z-DOCK_R)/sections);iz<=Math.floor((b.z+DOCK_R)/sections);iz++)
    for(let ix=Math.floor((b.x-DOCK_R)/sections);ix<=Math.floor((b.x+DOCK_R)/sections);ix++){
      const cx=(ix+.5)*sections,cz=(iz+.5)*sections;
      let site:WaterPoint|undefined,best=Infinity;
      for(const p of water){if(Math.floor(p.x/sections)!==ix||Math.floor(p.z/sections)!==iz)continue;const d=(p.x-cx)**2+(p.z-cz)**2;if(d<best){site=p;best=d;}}
      if(!site||Math.hypot(site.x-b.x,site.z-b.z)>DOCK_R||
        (b.team===0&&!g.exploredAt(site.x,site.z))||existing.some(n=>fishHabitatCell(n.x,n.z)===fishHabitatCell(site!.x,site!.z)||Math.hypot(n.x-site!.x,n.z-site!.z)<10))continue;
      const random=mulberry32(g.state.seed^Math.imul(ix,73856093)^Math.imul(iz,19349663));
      const capacity=36+Math.floor(random()*24);
      const n:ResourceNode={id:g.id(),kind:'fish',x:site.x,z:site.z,y:g.waterAt(site.x,site.z)+.1,
        amount:capacity,maxAmt:capacity,regenT:0,pressure:0,scale:.9+random()*.2,rich:.9+random()*.2};
      g.state.fish.push(n);existing.push(n);
    }
}
/** Docks improve access and handling; the fish themselves remain finite wild stocks. */
export function fishingGrounds(g:Game,b:Building,includeEmpty=false){
  const water=dockWaters(g,b),cache=waterCache.get(g)!;
  let grounds=cache.grounds.get(b.id);
  if(!grounds){surveyFishingWater(g,b,water);grounds=localGrounds(g,b,water);cache.grounds.set(b.id,grounds);}
  return grounds.filter(n=>(includeEmpty||n.amount>=1)&&
    (b.team!==0||g.exploredAt(n.x,n.z))).sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
}
function fishingIssue(g:Game,b:Building){
  const water=dockWaters(g,b);
  if(!water.length)return 'No connected water at this dock — choose a usable shoreline';
  const all=waterCache.get(g)?.grounds.get(b.id)||localGrounds(g,b,water),known=all.filter(n=>b.team!==0||g.exploredAt(n.x,n.z));
  if(!known.length)return all.length?'Explore the nearby shore to locate its fishing grounds':'No surveyed fishing grounds here — explore nearby water';
  if(!known.some(n=>n.amount>=1)){const rest=Math.min(...known.map(n=>fishRecoveryEstimateSeconds(g,n)));return `Nearby fishing grounds are depleted — rest this water; first catch in about ${Math.max(1,Math.ceil(rest/60))} minutes at current season/weather, or use another shore`;}
  return null;
}
export function fishingReport(g:Game,b:Building){
  const grounds=fishingGrounds(g,b,true),capacity=grounds.reduce((n,p)=>n+(p.maxAmt||8),0),health=capacity?grounds.reduce((n,p)=>n+(1-(p.pressure||0))*(p.maxAmt||8),0)/capacity:0,workers=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
  const issue=fishingIssue(g,b);
  return `${workers}/2 fishers · ${issue||`${Math.floor(grounds.reduce((n,p)=>n+p.amount,0))} fish in known nearby grounds`} · ${capacity?`water health ${Math.round(health*100)}% · `:''}up to ${Math.floor(60*GATHER_WORK_RATE/(GATHER.food.period*GATHER.food.campBonus*subsistenceLaborMultiplier(g,'food',b.x,b.z)))} fish per fisher/min before hauling; winter slows fishing`;
}
const bankApproaches=new WeakMap<Unit,{
  world:Game['world']; node:ResourceNode; revision:number; water:number; spot:WaterPoint;
}>();
export function fishingBank(g:Game,u:Unit,n:ResourceNode){
  if(u.haulage==="canoe"&&g.height(n.x,n.z)<=g.waterAt(n.x,n.z)+.3&&connectedForUnit(g,u,n.x,n.z))return {x:n.x,z:n.z};
  const revision=g.navigationRevision(),water=g.world.waterY;
  const previous=bankApproaches.get(u);
  // Keep the same reachable destination as the path bends around the water.
  // Preview calls for other fish do not replace an active gatherer's target.
  const gathering=u.order==='gather'&&u.node===n;
  if(gathering&&previous?.world===g.world&&previous.node===n&&previous.revision===revision&&previous.water===water&&u.stuckT<2)
    return previous.spot;
  let best:WaterPoint|null=null,score=Infinity;
  for(const radius of FISHING_BANK_RADII)for(let i=0;i<16;i++){
    const x=n.x+Math.sin(i*Math.PI/8)*radius,z=n.z+Math.cos(i*Math.PI/8)*radius;
    const distance=Math.hypot(x-u.x,z-u.z);
    if(distance>=score||g.height(x,z)<=g.waterAt(x,z)+SHALLOW_FISH_SITE_RULES.dryClearanceMetres||
      !g.walkable(x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
    if(!g.canStep({...u,y:g.travelHeight(x,z)},x,z))continue;
    score=distance;best={x,z};
  }
  if(gathering&&best)bankApproaches.set(u,{world:g.world,node:n,revision,water,spot:best});
  return best;
}
export function catchDockFish(g:Game,u:Unit,b:Building){
  const ground=fishingGrounds(g,b)[0];
  if(!ground){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason=fishingIssue(g,b)||'Finding other food work';g.workBoard.reset();return;}
  const taken=consumeFishStock(ground,Math.min(1,Math.max(0,carryingCapacity(u,"food")-u.carry)));
  if(taken<=0){u.order='return';return;}
  u.carry+=taken;u.carryType='food';u.carryFood='fish';u.workReason='Fishing from the dock — carrying the catch home';
  if(u.team===0)g.onSfx('fish');
  if(u.carry>=carryingCapacity(u,"food")||ground.amount===0||(u.carry>=8&&reserveSeconds(g,u.team)<90))u.order='return';
}

/** Rest restores a river section; catches and reproduction change stock, never village food. */
export function renewFish(g:Game,n:ResourceNode,dt:number){
  const capacity=n.maxAmt||FISHERY_RULES.defaultCapacityFish;
  const rate=fishRecoveryRate(g);
  n.pressure=Math.max(0,(n.pressure||0)-dt/FISHERY_RULES.pressureRecoverySeconds);
  if(n.amount<=0){n.regenT=Math.max(0,n.regenT-dt*rate*FISHERY_RULES.replenishmentSpeed);if(n.regenT>0)return;}
  // A fully depleted section recovers gradually, rather than refilling in one frame.
  n.amount=Math.min(capacity,n.amount+capacity*dt/FISHERY_RULES.fullStockRecoverySeconds*rate*FISHERY_RULES.replenishmentSpeed*(1-FISHERY_RULES.maximumPressurePenalty*(n.pressure||0)));
}

export function staffDock(g:Game,id:number){
  const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==='dock'&&g.finished(b));
  if(!b)return 0;
  g.updateVision(0);
  waterCache.get(g)?.grounds.delete(b.id);
  fishingGrounds(g,b);
  const issue=fishingIssue(g,b);if(issue){g.banner(issue,4);return 0;}
  const existing=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
  const candidates=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&(!u.maturesAt||u.maturesAt<=g.state.time)&&u.carry===0&&!u.recalled&&!u.envoy&&!u.expedition&&!u.scout&&!u.visit&&!u.studyCrop&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.foundingJourney&&u.node!==b&&['idle','hold','gather'].includes(u.order))
    .sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
  let sent=0;
  for(const u of candidates){if(existing+sent>=2)break;if(!g.interactionSpot(u,b))continue;
    g.interruptMission(u);u.order='gather';u.node=b;u.job='food';u.jobLock=true;u.huntOnly=false;u.target=null;u.gatherT=0;u.workReason='Assigned to fish at this dock';sent++;
  }
  g.workBoard.reset();g.banner(`${existing+sent}/2 fishers assigned${existing+sent<2?' — need available adults with a clear bank route':''}`,4);return sent;
}
