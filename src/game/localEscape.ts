import type {Game} from './sim';
import type {Unit} from './types';
type Point={x:number;z:number};
type Route={revision:number;retry:number;points:Point[]};
const routes=new WeakMap<Unit,Route>();
/** Rare blocked-cell recovery: a bounded fine-grid search follows physical
 * collision checks, including monotonic exits from occupied footprints. */
export function localEscapeStep(g:Game,u:Unit):Point|null{
 let route=routes.get(u);
 if(route&&route.revision===g.navigationRevision()){
  while(route.points.length&&Math.hypot(route.points[0].x-u.x,route.points[0].z-u.z)<.18)route.points.shift();
  if(route.points.length&&g.canStep(u,route.points[0].x,route.points[0].z))return route.points[0];
  if(!route.points.length&&g.state.time<route.retry)return null;
 }
 const step=.6,radius=16,width=radius*2+1,start=radius*width+radius;
 const parent=new Int32Array(width*width).fill(-1),queue=new Int32Array(width*width);
 parent[start]=start;queue[0]=start;let head=0,tail=1,found=-1;
 const point=(at:number)=>({x:u.x+(at%width-radius)*step,z:u.z+(Math.floor(at/width)-radius)*step});
 while(head<tail){
  const at=queue[head++],p=point(at),cx=at%width,cz=Math.floor(at/width);
  if(at!==start&&g.walkable(p.x,p.z)){found=at;break;}
  const probe={...u,x:p.x,z:p.z,y:g.travelHeight(p.x,p.z)};
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=cx+dx,z=cz+dz,next=z*width+x;
   if(x<0||z<0||x>=width||z>=width||parent[next]!==-1)continue;
   const q=point(next);
   if(!g.canStep(probe,(p.x+q.x)/2,(p.z+q.z)/2)||!g.canStep(probe,q.x,q.z))continue;
   parent[next]=at;queue[tail++]=next;
  }
 }
 const points:Point[]=[];
 if(found!==-1)for(let at=found;at!==start;at=parent[at])points.push(point(at));
 points.reverse();route={revision:g.navigationRevision(),retry:g.state.time+2,points};routes.set(u,route);
 return points[0]||null;
}
