import type {Game} from './sim';
import type {Unit,Building} from './types';
import {beginHaulageWork} from './haulage';
import {waterNavigation} from './waterTravel';
export type Riverboat={id:number;team:number;dock:number;x:number;y:number;z:number;facing:number;captain?:number;hp:number;capacity:number};
export const BOAT_COST={wood:40,stone:4,seconds:150,seats:5};
export function boatCrew(g:Game,id:number){return g.state.units.filter(u=>u.hp>0&&u.boat?.id===id);}
export function beginRiverboat(g:Game,dock:number,team=0){
 const t=g.tribe(team);if(t.wood<BOAT_COST.wood||t.stone<BOAT_COST.stone){if(team===0)g.banner('Riverboat needs 40 logs and 4 stone',4);return false;}
 if((g.state.boats||[]).filter(b=>b.team===team&&b.hp>0).length>=12){if(team===0)g.banner('Twelve vessels already need crews',4);return false;}
 const existing=new Set(g.state.units.filter(u=>u.haulageWork).map(u=>u.id));
 if(!beginHaulageWork(g,'canoe',team,dock))return false;
 const u=g.state.units.find(u=>u.team===team&&!existing.has(u.id)&&u.haulageWork)!;
 t.wood-=20;t.stone-=2;u.haulageWork!.vessel=true;u.haulageWork!.duration=BOAT_COST.seconds;
 if(team===0)g.banner('Building a five-seat riverboat at the dock',4);return true;
}
function waterPoint(g:Game,x:number,z:number,radius=18){
 for(let r=0;r<=radius;r+=2)for(let i=0;i<24;i++){
  const a=i*Math.PI/12,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  if(Math.abs(px)>(g.world.size/2)-5||Math.abs(pz)>(g.world.size/2)-5)continue;
  if([[-1.5,0],[1.5,0],[0,-3],[0,3]].every(([dx,dz])=>g.height(px+dx,pz+dz)<g.world.waterY+.1))return {x:px,z:pz};
 }
 return null;
}
export function launchRiverboat(g:Game,b:Building){
 const p=waterPoint(g,b.x,b.z);if(!p)return false;
 const boat:Riverboat={id:g.id(),team:b.team,dock:b.id,...p,y:g.world.waterY+.16,facing:0,hp:300,capacity:BOAT_COST.seats};
 (g.state.boats??=[]).push(boat);return true;
}
export function boardRiverboat(g:Game,id:number,people=g.selectedUnits()){
 const b=g.state.boats?.find(b=>b.id===id&&b.team===0&&b.hp>0);if(!b)return 0;
 let n=0;
 for(const u of people){
  if(boatCrew(g,id).length>=b.capacity)break;
  if(u.hp<=0||u.team!==b.team||u.boat||u.haulage||Math.hypot(u.x-b.x,u.z-b.z)>24)continue;
  g.interruptMission(u);u.boat={id,phase:'boarding'};u.haulage='canoe';u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);n++;
 }
 if(!n)g.banner('Select nearby residents without carts, sleds or personal canoes to board',4);
 else g.banner(`${n} residents boarding · first aboard takes the helm`,4);
 g.workBoard.reset();return n;
}
function wetDestination(g:Game,b:Riverboat,x:number,z:number){
 const nav=waterNavigation(g,true),cell=g.world.size/nav.width;
 const idx=(px:number,pz:number)=>Math.floor((pz+(g.world.size/2))/cell)*nav.width+Math.floor((px+(g.world.size/2))/cell);
 const label=nav.labels[idx(b.x,b.z)];if(!label)return null;
 let best:{x:number;z:number}|null=null,score=Infinity;
 for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++){
  const px=x+dx*cell,pz=z+dz*cell;if(Math.abs(px)>(g.world.size/2)-5||Math.abs(pz)>(g.world.size/2)-5)continue;
  if(nav.labels[idx(px,pz)]!==label||g.height(px,pz)>=g.world.waterY+.3)continue;
  const d=dx*dx+dz*dz;if(d<score){score=d;best={x:px,z:pz};}
 }
 return best;
}
export function commandRiverboat(g:Game,id:number,x:number,z:number){
 const b=g.state.boats?.find(b=>b.id===id&&b.hp>0),u=b&&g.state.units.find(u=>u.id===b.captain&&u.hp>0);if(!b||!u)return false;
 const p=wetDestination(g,b,x,z);if(!p){g.banner('No connected navigable water near that destination',4);return false;}
 g.interruptMission(u);u.order='move';u.tx=p.x;u.tz=p.z;u.target=null;u.node=null;g.invalidateRoute(u);return true;
}
export function landRiverboat(g:Game,id:number){
 const b=g.state.boats?.find(b=>b.id===id&&b.hp>0);if(!b)return false;
 const crew=boatCrew(g,id);let n=0;
 for(const u of crew){
  let point:{x:number;z:number}|null=null;
  for(let r=2;r<=10&&!point;r+=1)for(let i=0;i<24;i++){
   const a=i*Math.PI/12,x=b.x+Math.cos(a)*r,z=b.z+Math.sin(a)*r;
   if(g.walkable(x,z)&&g.height(x,z)>g.world.waterY+.3&&[[-1,0],[1,0],[0,-1],[0,1]].every(([dx,dz])=>g.walkable(x+dx,z+dz))){point={x,z};break;}
  }
  if(!point)continue;
  u.boat={id,phase:'landing',...point};u.order='hold';g.invalidateRoute(u);n++;
 }
 if(n){b.captain=undefined;g.banner('Landing party disembarking; the boat stays moored here',4);}
 else g.banner('Bring the boat within 10 m of a gentle landing shore',4);
 return n>0;
}
export function riverboatAI(g:Game,u:Unit,dt:number){
 const ride=u.boat;if(!ride)return false;
 const b=g.state.boats?.find(b=>b.id===ride.id&&b.hp>0);
 if(!b){u.boat=undefined;u.haulage=undefined;u.order='idle';return false;}
 if(ride.phase==='boarding'){
  u.tx=b.x;u.tz=b.z;u.workReason='Boarding riverboat';
  if(Math.hypot(u.x-b.x,u.z-b.z)>1.5){g.steer(u,dt);return true;}
  ride.phase='aboard';u.order='hold';b.captain??=u.id;g.invalidateRoute(u);
 }
 if(ride.phase==='landing'){
  u.tx=ride.x!;u.tz=ride.z!;u.workReason='Disembarking';
  if(Math.hypot(u.x-u.tx,u.z-u.tz)>1||!g.walkable(u.x,u.z)||g.height(u.x,u.z)<=g.world.waterY+.3){g.steer(u,dt);return true;}
  u.boat=undefined;u.haulage=undefined;u.order='idle';u.node=null;g.invalidateRoute(u);g.workBoard.reset();return true;
 }
 if(b.captain===u.id){
  u.workReason=u.order==='move'?'Rowing riverboat':'At the helm · click a water destination';
  if(u.order==='move'&&g.steer(u,dt)){u.order='hold';}
 }else u.workReason='Aboard riverboat';
 return true;
}
export function syncRiverboats(g:Game){
 for(const b of g.state.boats||[]){
  const aboard=boatCrew(g,b.id).filter(u=>u.boat?.phase==='aboard');
  let captain=aboard.find(u=>u.id===b.captain);
  if(!captain&&aboard.length){captain=aboard[0];b.captain=captain.id;captain.order='hold';}
  if(captain){b.x=captain.x;b.z=captain.z;b.facing=captain.facing;}
  else delete b.captain;
  b.y=g.world.waterY+.16;
  for(let i=0;i<aboard.length;i++){
   const u=aboard[i];if(u===captain)continue;
   const offset=(i-2)*.8;u.x=b.x+Math.sin(b.facing)*offset;u.z=b.z+Math.cos(b.facing)*offset;u.y=b.y;u.facing=b.facing;u.vx=0;u.vz=0;
  }
 }
}
