import {connectedForUnit} from "./waterTravel";
import {carryingCapacity} from "./haulage";
import type {Game} from './sim';
import type {Building,Unit,ResourceNode} from './types';
import {DOCK_R,GATHER,GATHER_WORK_RATE} from './constants';
import {reserveSeconds} from "./settlement";
import {mulberry32} from './rng';
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
    if(g.height(x,z)>g.world.waterY+.04)continue;
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
  const radius=g.height(n.x,n.z)<=g.world.waterY+.04?1.5:6.5;
  return water.some(p=>(p.x-n.x)**2+(p.z-n.z)**2<=radius*radius);
}
function localGrounds(g:Game,b:Building,water:WaterPoint[]){
  return g.state.fish.filter(n=>Math.hypot(n.x-b.x,n.z-b.z)<=DOCK_R&&touchesWater(g,n,water));
}
/** Survey fixed habitat sections once; exhausted sections remain saved nodes and
 * are never refilled by a new dock, clicking again, moving away, or loading. */
function surveyFishingWater(g:Game,b:Building,water:WaterPoint[]){
  if(!g.finished(b)||!water.length)return;
  const sections=12,existing=g.state.fish.filter(n=>Math.hypot(n.x-b.x,n.z-b.z)<=DOCK_R+15&&touchesWater(g,n,water));
  for(let iz=Math.floor((b.z-DOCK_R)/sections);iz<=Math.floor((b.z+DOCK_R)/sections);iz++)
    for(let ix=Math.floor((b.x-DOCK_R)/sections);ix<=Math.floor((b.x+DOCK_R)/sections);ix++){
      const cx=(ix+.5)*sections,cz=(iz+.5)*sections;
      let site:WaterPoint|undefined,best=Infinity;
      for(const p of water){if(Math.floor(p.x/sections)!==ix||Math.floor(p.z/sections)!==iz)continue;const d=(p.x-cx)**2+(p.z-cz)**2;if(d<best){site=p;best=d;}}
      if(!site||Math.hypot(site.x-b.x,site.z-b.z)>DOCK_R||
        (b.team===0&&!g.exploredAt(site.x,site.z))||existing.some(n=>Math.hypot(n.x-site!.x,n.z-site!.z)<10))continue;
      const random=mulberry32(g.state.seed^Math.imul(ix,73856093)^Math.imul(iz,19349663));
      const capacity=36+Math.floor(random()*24);
      const n:ResourceNode={id:g.id(),kind:'fish',x:site.x,z:site.z,y:g.world.waterY+.1,
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
  if(!known.some(n=>n.amount>=1))return 'Nearby fishing grounds are depleted — let this water recover or use another shore';
  return null;
}
export function fishingReport(g:Game,b:Building){
  const grounds=fishingGrounds(g,b,true),capacity=grounds.reduce((n,p)=>n+(p.maxAmt||8),0),health=capacity?grounds.reduce((n,p)=>n+(1-(p.pressure||0))*(p.maxAmt||8),0)/capacity:0,workers=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
  const issue=fishingIssue(g,b);
  return `${workers}/2 fishers · ${issue||`${Math.floor(grounds.reduce((n,p)=>n+p.amount,0))} fish in known nearby grounds`} · ${capacity?`water health ${Math.round(health*100)}% · `:''}up to ${Math.floor(60*GATHER_WORK_RATE/(GATHER.food.period*GATHER.food.campBonus))} fish per fisher/min before hauling; winter slows fishing`;
}
export function fishingBank(g:Game,u:Unit,n:ResourceNode){
  if(u.haulage==="canoe"&&g.height(n.x,n.z)<=g.world.waterY+.3&&connectedForUnit(g,u,n.x,n.z))return {x:n.x,z:n.z};
  let best:{x:number;z:number}|null=null,score=Infinity;
  for(const radius of [1,2,3.5,5,6.5])for(let i=0;i<16;i++){
    const x=n.x+Math.sin(i*Math.PI/8)*radius,z=n.z+Math.cos(i*Math.PI/8)*radius;
    if(!g.walkable(x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
    const distance=Math.hypot(x-u.x,z-u.z);if(distance<score){score=distance;best={x,z};}
  }
  return best;
}
export function catchDockFish(g:Game,u:Unit,b:Building){
  const ground=fishingGrounds(g,b)[0];
  if(!ground){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason=fishingIssue(g,b)||'Finding other food work';g.workBoard.reset();return;}
  const taken=Math.min(1,ground.amount,Math.max(0,carryingCapacity(u,"food")-u.carry));
  if(taken<=0){u.order='return';return;}
  ground.amount=Math.max(0,ground.amount-taken);ground.pressure=Math.min(1,(ground.pressure||0)+.4*taken/Math.max(1,ground.maxAmt||8));
  if(ground.amount===0)ground.regenT=60+(ground.pressure||0)*180;
  u.carry+=taken;u.carryType='food';u.carryFood='fish';u.workReason='Fishing from the dock — carrying the catch home';
  if(u.team===0)g.onSfx('fish');
  if(u.carry>=carryingCapacity(u,"food")||ground.amount===0||(u.carry>=8&&reserveSeconds(g,u.team)<90))u.order='return';
}

/** Rest restores a river section; catches and reproduction change stock, never village food. */
export function renewFish(g:Game,n:ResourceNode,dt:number){
  const capacity=n.maxAmt||8;
  const winter=Math.floor((g.state.time%1800)/450)===3;
  const rate=(winter?.4:1)*(g.state.weather==='drought'?.35:g.state.weather==='flood'?1.2:1);
  n.pressure=Math.max(0,(n.pressure||0)-dt/1200);
  if(n.amount<=0){n.regenT=Math.max(0,n.regenT-dt*rate);if(n.regenT>0)return;}
  // A fully depleted section recovers gradually, rather than refilling in one frame.
  n.amount=Math.min(capacity,n.amount+capacity*dt/240*rate*(1-.8*(n.pressure||0)));
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
