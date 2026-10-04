import type {Game} from './sim';
import type {Building,Unit,ResourceNode} from './types';
import {DOCK_R,GATHER} from './constants';
/** Docks improve access and handling; the fish themselves remain finite wild stocks. */
export function fishingGrounds(g:Game,b:Building,includeEmpty=false){
  return g.state.fish.filter(n=>(includeEmpty||n.amount>=1)&&Math.hypot(n.x-b.x,n.z-b.z)<=DOCK_R&&
    (b.team!==0||g.exploredAt(n.x,n.z))).sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
}
export function fishingReport(g:Game,b:Building){
  const grounds=fishingGrounds(g,b,true),capacity=grounds.reduce((n,p)=>n+(p.maxAmt||8),0),health=capacity?grounds.reduce((n,p)=>n+(1-(p.pressure||0))*(p.maxAmt||8),0)/capacity:0,workers=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
  return `${workers}/2 fishers · ${Math.floor(grounds.reduce((n,p)=>n+p.amount,0))} fish in known nearby grounds · water health ${Math.round(health*100)}% · up to ${Math.floor(60/(GATHER.food.period*GATHER.food.campBonus))} fish per fisher/min before hauling; winter slows fishing`;
}
export function fishingBank(g:Game,u:Unit,n:ResourceNode){
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
  if(!ground){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='Fishing grounds depleted — finding other food work';g.workBoard.reset();return;}
  ground.amount=Math.max(0,ground.amount-1);ground.pressure=Math.min(1,(ground.pressure||0)+.4/Math.max(1,ground.maxAmt||8));
  if(ground.amount===0)ground.regenT=180+(ground.pressure||0)*600;
  u.carry++;u.carryType='food';u.carryFood='fish';u.workReason='Fishing from the dock — carrying the catch home';
  if(u.team===0)g.onSfx('splash');
  if(u.carry>=GATHER.food.carry||ground.amount===0)u.order='return';
}

/** Rest restores a river section; catches and reproduction change stock, never village food. */
export function renewFish(g:Game,n:ResourceNode,dt:number){
  const capacity=n.maxAmt||8;
  const winter=Math.floor((g.state.time%1800)/450)===3;
  const rate=(winter?.4:1)*(g.state.weather==='drought'?.35:g.state.weather==='flood'?1.2:1);
  n.pressure=Math.max(0,(n.pressure||0)-dt/2400);
  if(n.amount<=0){n.regenT=Math.max(0,n.regenT-dt*rate);if(n.regenT>0)return;}
  // A fully depleted section recovers gradually, rather than refilling in one frame.
  n.amount=Math.min(capacity,n.amount+capacity*dt/900*rate*(1-.8*(n.pressure||0)));
}

export function staffDock(g:Game,id:number){
  const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==='dock'&&g.finished(b));
  if(!b)return 0;
  g.updateVision(0);
  if(!fishingGrounds(g,b).some(n=>n.amount>=1)){g.banner('Nearby waters need time to recover before fishing',4);return 0;}
  const existing=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
  const candidates=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&(!u.maturesAt||u.maturesAt<=g.state.time)&&u.carry===0&&!u.recalled&&!u.envoy&&!u.expedition&&!u.scout&&!u.visit&&!u.studyCrop&&!u.weaponWork&&!u.foundingJourney&&u.node!==b&&['idle','hold','gather'].includes(u.order))
    .sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
  let sent=0;
  for(const u of candidates){if(existing+sent>=2)break;if(!g.interactionSpot(u,b))continue;
    g.interruptMission(u);u.order='gather';u.node=b;u.job='food';u.jobLock=true;u.huntOnly=false;u.target=null;u.gatherT=0;u.workReason='Assigned to fish at this dock';sent++;
  }
  g.workBoard.reset();g.banner(`${existing+sent}/2 fishers assigned${existing+sent<2?' — need available adults with a clear bank route':''}`,4);return sent;
}
