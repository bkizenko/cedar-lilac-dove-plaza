import type {Game} from './sim';
import {nearestFreshWater,WATER_WORKS_RULES} from './waterWorks';
import {EXCAVATION_RULES} from './excavation';

/** Aqueducts and canals routed around terrain (Grok W-World, W6). Pure queries:
 * a Dijkstra search on an 8 m grid finds a channel that respects the same limits
 * as the straight check (cut ≤ one 2 m dig, arcade ≤ 12 m, gravity fall for
 * aqueducts; locks every 2.5 m for canals), then the polyline is measured on the
 * real terrain at 4 m. Nothing is built; labour uses the excavation rate. */
export const WATER_ROUTE_RULES={version:1,cellMetres:8,paddingMetres:160,maxCells:40000,cutPenalty:3,arcadePenalty:.6,landPenalty:1,waterCost:.15,heightPenalty:.08} as const;
type G=Pick<Game,'world'|'state'|'height'|'waterAt'|'exploredAt'>;
type P={x:number;z:number};
const DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
const wet=(g:G,x:number,z:number)=>g.height(x,z)<g.waterAt(x,z)+.02;

type Grid={x0:number;z0:number;w:number;h:number;cell:number};
function grid(a:P,b:P):Grid|null{const R=WATER_ROUTE_RULES,c=R.cellMetres,x0=Math.min(a.x,b.x)-R.paddingMetres,z0=Math.min(a.z,b.z)-R.paddingMetres,w=Math.ceil((Math.abs(a.x-b.x)+2*R.paddingMetres)/c)+1,h=Math.ceil((Math.abs(a.z-b.z)+2*R.paddingMetres)/c)+1;return w*h>R.maxCells?null:{x0,z0,w,h,cell:c};}
const at=(G:Grid,i:number)=>({x:G.x0+(i%G.w)*G.cell,z:G.z0+Math.floor(i/G.w)*G.cell});
const cellOf=(G:Grid,p:P)=>Math.round((p.z-G.z0)/G.cell)*G.w+Math.round((p.x-G.x0)/G.cell);
/** Small binary heap keyed by cost. */
class Heap{private k:number[]=[];private v:number[]=[];push(cost:number,i:number){const k=this.k,v=this.v;let n=k.length;k.push(cost);v.push(i);while(n>0){const p=(n-1)>>1;if(k[p]<=k[n])break;[k[p],k[n]]=[k[n],k[p]];[v[p],v[n]]=[v[n],v[p]];n=p;}}
 pop(){const k=this.k,v=this.v,top=v[0],tk=k[0];const lk=k.pop()!,lv=v.pop()!;if(k.length){k[0]=lk;v[0]=lv;let n=0;for(;;){const l=2*n+1,r=l+1;let m=n;if(l<k.length&&k[l]<k[m])m=l;if(r<k.length&&k[r]<k[m])m=r;if(m===n)break;[k[m],k[n]]=[k[n],k[m]];[v[m],v[n]]=[v[n],v[m]];n=m;}}return{cost:tk,i:top};}
 get size(){return this.k.length;}}
function simplify(pts:P[]){if(pts.length<3)return pts;const out=[pts[0]];for(let i=1;i<pts.length-1;i++){const a=out[out.length-1],b=pts[i],c=pts[i+1];if(Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))>1e-6)out.push(b);}out.push(pts[pts.length-1]);return out;}
function* samples(line:P[],step:number){let s=0;for(let k=1;k<line.length;k++){const a=line[k-1],b=line[k],l=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(l/step));for(let i=k===1?0:1;i<=n;i++){const t=i/n;yield{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,s:s+l*t,ds:i?l/n:0};}s+=l;}}
const length=(line:P[])=>line.slice(1).reduce((a,p,i)=>a+Math.hypot(p.x-line[i].x,p.z-line[i].z),0);

/** Measure an aqueduct along any polyline (the straight check is the 2-point case). */
export function measureAqueduct(g:G,line:P[],sourceY:number,team=0,fixedGrade?:number){
 const R=WATER_WORKS_RULES.aqueduct,len=length(line),end=line[line.length-1],endY=g.height(end.x,end.z),fall=sourceY-endY,issues:string[]=[];
 if(fall<len*R.minGrade)issues.push(`The source is not high enough — needs ${(len*R.minGrade).toFixed(1)} m fall, has ${fall.toFixed(1)} m`);
 const grade=fixedGrade??Math.max(R.minGrade,fall/Math.max(1,len));let cut=0,cutLen=0,arcade=0,arcadeLen=0,maxCut=0,maxArcade=0,unseen=0;
 for(const p of samples(line,R.sampleMetres)){const channel=sourceY-grade*p.s,y=Math.max(g.height(p.x,p.z),g.waterAt(p.x,p.z));if(team===0&&!g.exploredAt(p.x,p.z))unseen++;
  if(y>channel){cut+=(y-channel)*p.ds;cutLen+=p.ds;maxCut=Math.max(maxCut,y-channel);}else{arcade+=(channel-y)*p.ds;arcadeLen+=p.ds;maxArcade=Math.max(maxArcade,channel-y);}}
 if(unseen)issues.push('Explore the whole route first');
 if(maxCut>R.maxCutMetres+1e-6)issues.push(`The channel would need a ${maxCut.toFixed(1)} m cut — deeper than one dig (tunnel needed)`);
 if(maxArcade>R.maxArcadeMetres+1e-6)issues.push(`The arcade would stand ${maxArcade.toFixed(1)} m high — taller than ${R.maxArcadeMetres} m`);
 return{issues,feasible:issues.length===0,lengthMetres:+len.toFixed(1),fallMetres:+fall.toFixed(2),grade:+grade.toFixed(4),cutLengthMetres:+cutLen.toFixed(1),arcadeLengthMetres:+arcadeLen.toFixed(1),
  maxCutMetres:+maxCut.toFixed(2),maxArcadeMetres:+maxArcade.toFixed(2),cutWorkSeconds:Math.round(cut*EXCAVATION_RULES.workSecondsPerCubicMeter),arcadeAreaSquareMetres:+arcade.toFixed(1),points:line.length};
}
/** Aqueduct routed around terrain: Dijkstra where the channel at each cell is the
 * source level minus the minimum grade × path length; cells needing more than one
 * dig of cut or a taller arcade than allowed are forbidden, cut and arcade cost extra. */
export function routeAqueduct(g:G,source:P,target:P,team=0){
 const src=nearestFreshWater(g,source.x,source.z,24);if(!src)return{issues:['An aqueduct must start at fresh water (a river or lake)'],feasible:false,line:[] as P[]};
 const R=WATER_ROUTE_RULES,A=WATER_WORKS_RULES.aqueduct,G=grid(src,target);if(!G)return{issues:['Too far for one aqueduct survey'],feasible:false,line:[] as P[]};
 // one channel grade for search and measurement: the fall spread over 1.25 × the
 // straight distance (room to wind round hills), never flatter than the minimum
 const grade=Math.max(A.minGrade,(src.y-g.height(target.x,target.z))/(1.25*Math.max(1,Math.hypot(target.x-src.x,target.z-src.z))));
 const n=G.w*G.h,cost=new Float64Array(n).fill(Infinity),dist=new Float64Array(n),prev=new Int32Array(n).fill(-1),s=cellOf(G,src),t=cellOf(G,target),heap=new Heap();
 cost[s]=0;heap.push(0,s);
 while(heap.size){const {cost:c,i}=heap.pop();if(c>cost[i])continue;if(i===t)break;const ix=i%G.w,iz=(i/G.w)|0;
  for(const [dx,dz] of DIRS){const jx=ix+dx,jz=iz+dz;if(jx<0||jz<0||jx>=G.w||jz>=G.h)continue;const j=jz*G.w+jx,p=at(G,j),ds=G.cell*Math.hypot(dx,dz),d=dist[i]+ds,channel=src.y-grade*d;
   const y=Math.max(g.height(p.x,p.z),g.waterAt(p.x,p.z)),cut=Math.max(0,y-channel),arc=Math.max(0,channel-y);if(cut>A.maxCutMetres||arc>A.maxArcadeMetres)continue;if(team===0&&!g.exploredAt(p.x,p.z))continue;
   const nc=c+ds*(1+R.cutPenalty*cut+R.arcadePenalty*arc/4);if(nc<cost[j]){cost[j]=nc;dist[j]=d;prev[j]=i;heap.push(nc,j);}}}
 if(!Number.isFinite(cost[t]))return{issues:['No route keeps the channel within one dig of cut and the arcade limit'],feasible:false,line:[] as P[]};
 const cells:P[]=[];for(let i=t;i>=0;i=prev[i])cells.push(at(G,i));cells.reverse();cells[0]={x:src.x,z:src.z};cells[cells.length-1]={x:target.x,z:target.z};
 const line=simplify(cells),m=measureAqueduct(g,line,src.y,team,grade);return{...m,source:{kind:src.kind,id:src.id,x:src.x,z:src.z,surfaceMetres:+src.y.toFixed(2)},line};
}

/** Measure a canal along any polyline: level reaches stepping by locks (evenly
 * along the length), dig to channel depth, embankments refused. */
export function measureCanal(g:G,line:P[],team=0){
 const R=WATER_WORKS_RULES.canal,a=line[0],b=line[line.length-1],issues:string[]=[];
 if(!wet(g,a.x,a.z)||!wet(g,b.x,b.z))return{issues:['A canal joins two waters — start and end in water'],feasible:false} as const;
 const wa=g.waterAt(a.x,a.z),wb=g.waterAt(b.x,b.z),len=length(line),locks=Math.ceil(Math.max(0,Math.abs(wa-wb)-R.levelToleranceMetres)/R.lockRiseMetres);
 let volume=0,maxDig=0,unseen=0,land=0,above=0;
 for(const p of samples(line,R.sampleMetres)){const t=p.s/Math.max(1,len);if(team===0&&!g.exploredAt(p.x,p.z))unseen++;if(wet(g,p.x,p.z))continue;land+=p.ds;
  const reach=locks?Math.min(locks,Math.floor(t*(locks+1))):0,level=wa+(wb-wa)*(locks?reach/locks:0),h=g.height(p.x,p.z),dig=h-level+.5;
  if(dig>0){volume+=dig*R.channelWidthMetres*p.ds;maxDig=Math.max(maxDig,dig);}if(level>h+.3)above=Math.max(above,level-h);}
 if(unseen)issues.push('Explore the whole route first');if(maxDig>R.maxDigMetres+1e-6)issues.push(`The channel would need a ${maxDig.toFixed(1)} m cut — deeper than one dig`);
 if(above>0)issues.push(`The water would stand ${above.toFixed(1)} m above the ground — embankments needed (fill is not dug)`);
 return{issues,feasible:issues.length===0,lengthMetres:+len.toFixed(1),landMetres:+land.toFixed(1),levelDifferenceMetres:+Math.abs(wa-wb).toFixed(2),locks,maxDigMetres:+maxDig.toFixed(2),
  digCubicMetres:+volume.toFixed(1),digWorkSeconds:Math.round(volume*EXCAVATION_RULES.workSecondsPerCubicMeter),points:line.length};
}
/** Canal routed around terrain: existing water is nearly free, land costs by
 * length and by how far it stands above the lower water (so it seeks low saddles);
 * cells too high to dig even with the full lock flight are forbidden. */
export function routeCanal(g:G,a:P,b:P,team=0){
 const R=WATER_ROUTE_RULES,C=WATER_WORKS_RULES.canal;if(!wet(g,a.x,a.z)||!wet(g,b.x,b.z))return{issues:['A canal joins two waters — start and end in water'],feasible:false,line:[] as P[]};
 const G=grid(a,b);if(!G)return{issues:['Too far for one canal survey'],feasible:false,line:[] as P[]};
 const wa=g.waterAt(a.x,a.z),wb=g.waterAt(b.x,b.z),hi=Math.max(wa,wb),lo=Math.min(wa,wb),n=G.w*G.h,cost=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),s=cellOf(G,a),t=cellOf(G,b),heap=new Heap();
 cost[s]=0;heap.push(0,s);
 while(heap.size){const {cost:c,i}=heap.pop();if(c>cost[i])continue;if(i===t)break;const ix=i%G.w,iz=(i/G.w)|0;
  for(const [dx,dz] of DIRS){const jx=ix+dx,jz=iz+dz;if(jx<0||jz<0||jx>=G.w||jz>=G.h)continue;const j=jz*G.w+jx,p=at(G,j),ds=G.cell*Math.hypot(dx,dz);if(team===0&&!g.exploredAt(p.x,p.z))continue;
   let step:number;if(wet(g,p.x,p.z))step=ds*R.waterCost;else{const h=g.height(p.x,p.z);if(h-hi+.5>C.maxDigMetres)continue;if(h<lo-.3)continue;step=ds*(R.landPenalty+R.heightPenalty*Math.max(0,h-lo)*4);}
   const nc=c+step;if(nc<cost[j]){cost[j]=nc;prev[j]=i;heap.push(nc,j);}}}
 if(!Number.isFinite(cost[t]))return{issues:['No route between these waters stays within one dig'],feasible:false,line:[] as P[]};
 const cells:P[]=[];for(let i=t;i>=0;i=prev[i])cells.push(at(G,i));cells.reverse();cells[0]={x:a.x,z:a.z};cells[cells.length-1]={x:b.x,z:b.z};
 const line=simplify(cells),m=measureCanal(g,line,team);
 // waters already joined by water need no canal: report it (a boat can go round) rather than call it a canal
 return{...m,line,alreadyJoinedByWater:'landMetres' in m&&m.landMetres===0};
}
