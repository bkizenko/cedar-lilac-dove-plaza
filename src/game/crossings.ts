import type {Game} from './sim';
import {planBridge} from './transport';
import {rivalKnows} from './rivalDevelopment';
import {AGE_COST,BUILDINGS} from './constants';
import {isDependent,reserveSeconds} from './settlement';

type Point={x:number;z:number};
/** Survey known banks between two disconnected places. The returned placement
 * uses the same physical span validation as a player-built bridge. */
export function findCrossing(g:Game,from:Point,to:Point,team:number){
  const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
  if(length<5||length>180||g.workBoard.connected(g,from.x,from.z,to.x,to.z))return null;
  let best:{x:number;z:number;score:number}|null=null;
  for(let step=1;step<10;step++)for(const side of [0,-4,4,-8,8,-12,12]){
    const x=from.x+dx*step/10-dz/length*side,z=from.z+dz*step/10+dx/length*side;
    const span=planBridge(g,x,z);if(!span)continue;
    const known=(px:number,pz:number)=>team===0?g.exploredAt(px,pz):rivalKnows(g,team,px,pz);
    if(!known(span.ax,span.az)||!known(span.bx,span.bz))continue;
    const a=g.workBoard.connected(g,from.x,from.z,span.ax,span.az)&&g.workBoard.connected(g,to.x,to.z,span.bx,span.bz);
    const b=g.workBoard.connected(g,from.x,from.z,span.bx,span.bz)&&g.workBoard.connected(g,to.x,to.z,span.ax,span.az);
    if(!a&&!b||!g.placementValid('bridge',x,z,team))continue;
    const score=Math.hypot(span.ax-span.bx,span.az-span.bz)+Math.abs(side)*.3;
    if(!best||score<best.score)best={x,z,score};
  }
  return best;
}
export function strandedResidents(g:Game,team:number){
  const stores=g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&['townhall','warehouse','cornerstone'].includes(b.type));
  return g.state.units.filter(u=>u.team===team&&u.hp>0&&(u.recalled||u.order==='return'&&u.carry>0)&&
    !stores.some(b=>g.interactionSpot(u,b)));
}
export function planReturnCrossing(g:Game){
  const selected=g.selectedUnits(),stranded=strandedResidents(g,0);
  const candidates=selected.length?stranded.filter(u=>selected.includes(u)):stranded;
  for(const u of candidates){
    const home=g.campOf(0);
    const pending=g.state.buildings.some(b=>b.team===0&&b.hp>0&&!g.finished(b)&&b.bridge&&
      ((g.workBoard.connected(g,u.x,u.z,b.bridge.ax,b.bridge.az)&&g.workBoard.connected(g,home.x,home.z,b.bridge.bx,b.bridge.bz))||
       (g.workBoard.connected(g,u.x,u.z,b.bridge.bx,b.bridge.bz)&&g.workBoard.connected(g,home.x,home.z,b.bridge.ax,b.bridge.az))));
    if(pending){g.banner('A return crossing is already planned. Supply its materials and let the builders finish.',5);return false;}
    const site=findCrossing(g,u,g.campOf(0),0);
    if(site&&g.placeBuilding('bridge',site.x,site.z,0)){g.banner('Crossing planned — builders work from either bank; supplies return when the bridge is finished.',5);return true;}
  }
  g.banner('No safe short crossing found on explored banks. Explore a route, clear an obstruction or place a bridge across a narrower channel.',5);return false;
}
const reviews=new WeakMap<Game,Map<number,number>>();
/** Rivals use real stock and builders to reconnect stranded residents first,
 * then known resources. No teleporting people, cargo, free bridges or income. */
export function developRivalCrossings(g:Game,team:number){
  if(![1,2].includes(team))return false;
  let clock=reviews.get(g);if(!clock){clock=new Map();reviews.set(g,clock);}
  const due=clock.get(team)||0;if(due>g.state.time&&due<=g.state.time+25)return false;
  clock.set(team,g.state.time+25);
  if(!g.canAfford(team,BUILDINGS.bridge)||g.state.buildings.some(b=>b.team===team&&b.hp>0&&b.type==='bridge'&&!g.finished(b)))return false;
  const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&u.carry===0&&
    !u.emergency&&!u.visit&&!u.scout&&!u.expedition&&!u.envoy&&!u.foundingJourney&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&u.drill==null&&['idle','gather'].includes(u.order));
  if(!adults.length)return false;
  const home=g.campOf(team),people=strandedResidents(g,team);
  const targets:Point[]=[...people];
  const t=g.tribe(team),next=AGE_COST[t.age+1];
  if(reserveSeconds(g,team)>300)for(const kind of ['wood','stone'] as const){
    if(t[kind]>=Math.max(next?.[kind]||0,kind==='wood'?100:60))continue;
    const nodes=kind==='wood'?g.state.trees:g.state.stones;
    const known=nodes.filter(n=>n.amount>=8&&Math.hypot(n.x-home.x,n.z-home.z)<150&&rivalKnows(g,team,n.x,n.z)&&!g.workBoard.connected(g,home.x,home.z,n.x,n.z));
    known.sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z));
    targets.push(...known.slice(0,2));
  }
  for(const target of targets){
    const site=findCrossing(g,target,home,team);
    if(site&&g.placeBuilding('bridge',site.x,site.z,team))return true;
  }
  return false;
}
