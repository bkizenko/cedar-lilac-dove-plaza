import type {Game} from './sim.ts';
import {requestWaterNavigation,type WaterNavigation} from './waterNavigation.ts';
import {DOCK_R} from './constants.ts';

/** Claude request 1 (W3): water routes for voyages planned from observation.
 * A* over the water-navigation grid restricted to cells the planning team has
 * actually observed. The search never reads the navigation grid at an
 * unobserved cell, so a plan cannot reveal hidden water, a hidden connection or
 * its absence. An unobserved target gets a route to the observed frontier cell
 * closest to it; the voyage then observes more and replans. */
export const OBSERVED_WATER_ROUTE_RULES={version:1,defaultMaxNodes:40000,launchSearchMetres:18,npcResidentSightMetres:26,npcSiteSightMetres:55,ownDockSightMetres:DOCK_R+4,knowledgeGrid:32} as const;

export type ObservedWaterRoute=
 |{waypoints:{x:number;z:number}[];reachesTarget:boolean;endsAtFrontier:boolean;expandedNodes:number}
 |{rejected:'unobserved'|'no-water-connection'|'budget'|'preparing'|'no-dock';expandedNodes:number};

/** Team knowledge predicate. Team 0: its fog (explored). Other teams: the same
 * rules as rivalDevelopment.rivalKnows (residents 26 m, finished halls/outposts/
 * camps 55 m, remembered 32×32 knowledge cells), plus the team's own finished
 * docks (the player's docks see DOCK_R+4 too). */
export function teamKnowledge(g:Game,team:number):(x:number,z:number)=>boolean{
 if(team===0)return(x,z)=>g.exploredAt(x,z);
 const R=OBSERVED_WATER_ROUTE_RULES,residents=g.state.units.filter(u=>u.team===team&&u.hp>0);
 const sites=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&['townhall','cornerstone','lumber','quarry'].includes(b.type)&&g.finished(b));
 const docks=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.type==='dock'&&g.finished(b));
 const cells=new Set(g.state.rivalKnowledge?.find(m=>m.team===team)?.cells||[]),half=g.world.size/2,K=R.knowledgeGrid;
 return(x,z)=>{
  for(const u of residents)if(Math.hypot(u.x-x,u.z-z)<R.npcResidentSightMetres)return true;
  for(const b of sites)if(Math.hypot(b.x-x,b.z-z)<R.npcSiteSightMetres)return true;
  for(const b of docks)if(Math.hypot(b.x-x,b.z-z)<R.ownDockSightMetres)return true;
  const cx=Math.floor((x+half)/g.world.size*K),cz=Math.floor((z+half)/g.world.size*K);
  return cx>=0&&cx<K&&cz>=0&&cz<K&&cells.has(cz*K+cx);
 };
}

class Heap{private a:number[]=[];private f:number[]=[];get size(){return this.a.length;}
 push(n:number,p:number){const a=this.a,f=this.f;a.push(n);f.push(p);let i=a.length-1;while(i>0){const j=(i-1)>>1;if(f[j]<=f[i])break;[a[i],a[j]]=[a[j],a[i]];[f[i],f[j]]=[f[j],f[i]];i=j;}}
 pop(){const a=this.a,f=this.f,top=a[0],ln=a.pop()!,lf=f.pop()!;if(a.length){a[0]=ln;f[0]=lf;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<a.length&&f[l]<f[m])m=l;if(r<a.length&&f[r]<f[m])m=r;if(m===i)break;[a[i],a[m]]=[a[m],a[i]];[f[i],f[m]]=[f[m],f[i]];i=m;}}return top;}}

export interface ObservedWaterRouteOptions{maxNodes?:number;/** Test seam: a prepared navigation to use instead of requesting one. */navigation?:Pick<WaterNavigation,'grid'|'width'>;knows?:(x:number,z:number)=>boolean}

export function planObservedWaterRoute(g:Game,team:number,fromDockId:number,target:{x:number;z:number},options:ObservedWaterRouteOptions={}):ObservedWaterRoute{
 const R=OBSERVED_WATER_ROUTE_RULES,dock=g.state.buildings.find(b=>b.id===fromDockId&&b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b));
 if(!dock)return{rejected:'no-dock',expandedNodes:0};
 let nav=options.navigation;
 if(!nav){const request=requestWaterNavigation(g,true);if(request.status!=='ready')return{rejected:'preparing',expandedNodes:0};nav=request.navigation;}
 const {grid,width}=nav,cell=g.world.size/width,half=g.world.size/2,knows=options.knows??teamKnowledge(g,team);
 const known=new Int8Array(grid.length);// 0 unasked, 1 known, -1 unknown
 const centre=(i:number)=>({x:-half+(i%width+.5)*cell,z:-half+(Math.floor(i/width)+.5)*cell});
 const isKnown=(i:number)=>{if(!known[i]){const p=centre(i);known[i]=knows(p.x,p.z)?1:-1;}return known[i]===1;};
 // Only ever read grid[i] after the team is known to have observed cell i.
 const water=(i:number)=>isKnown(i)&&grid[i]!==0;
 const index=(x:number,z:number)=>Math.max(0,Math.min(width-1,Math.floor((z+half)/cell)))*width+Math.max(0,Math.min(width-1,Math.floor((x+half)/cell)));
 // Launch: the nearest observed navigable water cell within the dock's reach.
 let start=-1,bestLaunch=Infinity;const reach=Math.ceil(R.launchSearchMetres/cell),di=index(dock.x,dock.z),dx0=di%width,dz0=Math.floor(di/width);
 for(let dz=-reach;dz<=reach;dz++)for(let dx=-reach;dx<=reach;dx++){const x=dx0+dx,z=dz0+dz;if(x<0||z<0||x>=width||z>=width)continue;const d=dx*dx+dz*dz;if(d>reach*reach||d>=bestLaunch)continue;const i=z*width+x;if(water(i)){bestLaunch=d;start=i;}}
 if(start<0)return{rejected:'no-water-connection',expandedNodes:0};
 const goal=index(target.x,target.z),goalKnown=isKnown(goal),gx=goal%width,gz=Math.floor(goal/width);
 const h=(i:number)=>Math.hypot(i%width-gx,Math.floor(i/width)-gz);
 const cost=new Float32Array(grid.length).fill(Infinity),from=new Int32Array(grid.length).fill(-1),closed=new Uint8Array(grid.length),heap=new Heap();
 cost[start]=0;heap.push(start,h(start));let expanded=0,reached=-1,frontierBest=-1,frontierH=Infinity;const maxNodes=options.maxNodes??R.defaultMaxNodes;
 const steps=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]] as const;
 while(heap.size){
  const i=heap.pop();if(closed[i])continue;closed[i]=1;
  if(++expanded>maxNodes)return{rejected:'budget',expandedNodes:expanded};
  if(i===goal&&goalKnown&&grid[i]){reached=i;break;}
  const x=i%width,z=Math.floor(i/width);let frontier=false;
  for(const [sx,sz,c] of steps){const nx=x+sx,nz=z+sz;if(nx<0||nz<0||nx>=width||nz>=width)continue;const n=nz*width+nx;
   if(!isKnown(n)){frontier=true;continue;}
   if(!grid[n]||closed[n])continue;
   // No diagonal corner cutting through observed land or unobserved cells.
   if(sx&&sz&&!(water(z*width+nx)&&water(nz*width+x)))continue;
   const next=cost[i]+c;if(next<cost[n]){cost[n]=next;from[n]=i;heap.push(n,next+h(n));}
  }
  if(frontier&&h(i)<frontierH){frontierH=h(i);frontierBest=i;}
 }
 let end=reached;
 if(end<0){
  if(goalKnown)return{rejected:'no-water-connection',expandedNodes:expanded};
  // Unobserved target: head for the observed frontier closest to it, but only
  // when that actually gets closer than the launch point.
  if(frontierBest<0||frontierH>=h(start)-1)return{rejected:'unobserved',expandedNodes:expanded};
  end=frontierBest;
 }
 const cells:number[]=[];for(let i=end;i>=0;i=from[i])cells.push(i);cells.reverse();
 // Keep turning points only.
 const waypoints:{x:number;z:number}[]=[];
 for(let k=0;k<cells.length;k++){if(k>0&&k<cells.length-1){const a=cells[k-1],b=cells[k],c=cells[k+1];if(b-a===c-b)continue;}waypoints.push(centre(cells[k]));}
 return{waypoints,reachesTarget:reached>=0,endsAtFrontier:reached<0,expandedNodes:expanded};
}
