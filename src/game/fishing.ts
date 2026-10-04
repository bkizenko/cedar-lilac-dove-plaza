import type {Game} from './sim';
import type {Building,Unit,ResourceNode} from './types';
import {DOCK_R,GATHER} from './constants';
/** Docks improve access and handling; the fish themselves remain finite wild stocks. */
export function fishingGrounds(g:Game,b:Building){
  return g.state.fish.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<=DOCK_R&&
    (b.team!==0||g.exploredAt(n.x,n.z))).sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
}
export function fishingReport(g:Game,b:Building){
  const grounds=fishingGrounds(g,b),workers=g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length;
  return `${workers}/2 fishers · ${Math.floor(grounds.reduce((n,p)=>n+p.amount,0))} fish in known nearby grounds · up to ${Math.floor(60/(GATHER.food.period*GATHER.food.campBonus))} fish per fisher/min before hauling; winter slows fishing`;
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
  ground.amount=Math.max(0,ground.amount-1);ground.pressure=Math.min(1,(ground.pressure||0)+.035);
  if(ground.amount===0)ground.regenT=180+(ground.pressure||0)*600;
  u.carry++;u.carryType='food';u.carryFood='fish';u.workReason='Fishing from the dock — carrying the catch home';
  if(u.team===0)g.onSfx('splash');
  if(u.carry>=GATHER.food.carry||ground.amount===0)u.order='return';
}
