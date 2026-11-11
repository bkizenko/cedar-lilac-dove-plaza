import type {Game} from './sim';
import {highWaterLevel} from './hydrology';

/** GW-13 hikeable mountains and prospecting targets (Grok W-World).
 * Massifs are connected upland on an 8 m grid: land at least `uplandMetres` above
 * the island's median land height (relative, so hilly and flat maps both get their
 * own high ground; no universal gentle-land bias). Hikeability uses the real walk
 * grid: the summit counts as hiked when a walkable cell within `summitReachMetres`
 * is connected to the team's home. For the player, everything reported is clipped to
 * explored cells, so no unexplored terrain leaks. Mining yields are Codex's. */
export const MOUNTAIN_RULES={version:1,cellMetres:8,uplandMetres:9,minimumCells:6,summitReachMetres:8,prospectSpacingMetres:28,maximumProspects:12} as const;
export type Massif={id:number;cells:number;areaSquareMetres:number;summit:{x:number;z:number;y:number};prominenceMetres:number;walkableFraction:number;/** Some walkable massif cell is connected on foot to home (false: another landmass). */connectedToHome:boolean;summitHikeable:boolean;approach:{x:number;z:number}|null;prospects:{x:number;z:number;y:number}[]};

/** Walk-grid connected components (4-neighbour): landmasses reachable on foot. */
export function walkLabels(g:Game){const W=Math.round(Math.sqrt(g.walk.length)),labels=new Int32Array(W*W).fill(-1);let next=0;const st:number[]=[];
 for(let s=0;s<W*W;s++){if(!g.walk[s]||labels[s]>=0)continue;labels[s]=next;st.push(s);while(st.length){const i=st.pop()!,x=i%W,z=(i/W)|0;for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,z>0?i-W:-1,z<W-1?i+W:-1])if(j>=0&&g.walk[j]&&labels[j]<0){labels[j]=next;st.push(j);}}next++;}
 return{W,labels};}

export function mountainSurvey(g:Game,team=0){
 const R=MOUNTAIN_RULES,size=g.world.size,n=Math.round(size/R.cellMetres),c=size/n,N=n*n,high=highWaterLevel(g.world.baseWaterY);
 const fog=team===0,known=(x:number,z:number)=>!fog||g.exploredAt(x,z);
 const h=new Float32Array(N),land:number[]=[];
 for(let i=0;i<N;i++){const x=((i%n)+.5)*c-size/2,z=(Math.floor(i/n)+.5)*c-size/2;h[i]=g.height(x,z);if(h[i]>Math.max(high,g.waterAt(x,z))+.3&&known(x,z))land.push(h[i]);} // the relative baseline also uses only known land
 land.sort((a,b)=>a-b);const median=land[land.length>>1]??0,threshold=median+R.uplandMetres;
 const {W,labels}=walkLabels(g),wc=size/W,walkAt=(x:number,z:number)=>{const ix=Math.floor((x+size/2)/wc),iz=Math.floor((z+size/2)/wc);return ix<0||iz<0||ix>=W||iz>=W?-1:iz*W+ix;};
 const camp=g.campOf(team),hall=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0),home=hall??camp;
 let homeLabel=-1;for(let r=0;r<=12&&homeLabel<0;r+=2)for(let k=0;k<16&&homeLabel<0;k++){const i=walkAt(home.x+Math.cos(k/16*Math.PI*2)*r,home.z+Math.sin(k/16*Math.PI*2)*r);if(i>=0&&labels[i]>=0)homeLabel=labels[i];}
 const seen=new Uint8Array(N),out:Massif[]=[];
 for(let s=0;s<N;s++){if(seen[s]||h[s]<threshold)continue;const cells:number[]=[],st=[s];seen[s]=1;
  while(st.length){const i=st.pop()!;cells.push(i);const x=i%n,z=(i/n)|0;for(const j of [x>0?i-1:-1,x<n-1?i+1:-1,z>0?i-n:-1,z<n-1?i+n:-1])if(j>=0&&!seen[j]&&h[j]>=threshold){seen[j]=1;st.push(j);}}
  const pos=(i:number)=>({x:((i%n)+.5)*c-size/2,z:(Math.floor(i/n)+.5)*c-size/2});
  const visible=cells.filter(i=>{const p=pos(i);return known(p.x,p.z);});if(visible.length<R.minimumCells)continue;
  let top=visible[0];for(const i of visible)if(h[i]>h[top])top=i;const summit={...pos(top),y:+h[top].toFixed(2)};
  let walkable=0;const walkCells:number[]=[];for(const i of visible){const p=pos(i),w=walkAt(p.x,p.z);if(w>=0&&g.walk[w]){walkable++;if(labels[w]===homeLabel)walkCells.push(i);}}
  let summitHikeable=false;for(let dz=-R.summitReachMetres;dz<=R.summitReachMetres&&!summitHikeable;dz+=wc)for(let dx=-R.summitReachMetres;dx<=R.summitReachMetres;dx+=wc){if(dx*dx+dz*dz>R.summitReachMetres**2)continue;const w=walkAt(summit.x+dx,summit.z+dz);if(w>=0&&homeLabel>=0&&labels[w]===homeLabel&&known(summit.x+dx,summit.z+dz)){summitHikeable=true;break;}}
  let approach:{x:number;z:number}|null=null,best=Infinity;for(const i of walkCells){const p=pos(i),d=Math.hypot(p.x-home.x,p.z-home.z);if(d<best){best=d;approach=p;}}
  const ranked=walkCells.slice().sort((a,b)=>h[b]-h[a]||a-b),prospects:{x:number;z:number;y:number}[]=[];
  for(const i of ranked){if(prospects.length>=R.maximumProspects)break;const p=pos(i);if(prospects.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>=R.prospectSpacingMetres))prospects.push({...p,y:+h[i].toFixed(2)});}
  out.push({id:out.length,cells:visible.length,areaSquareMetres:visible.length*c*c,summit,prominenceMetres:+(h[top]-median).toFixed(2),walkableFraction:+(walkable/visible.length).toFixed(3),connectedToHome:walkCells.length>0,summitHikeable,approach,prospects});}
 out.sort((a,b)=>b.prominenceMetres-a.prominenceMetres||a.id-b.id);out.forEach((m,i)=>m.id=i);
 return{medianLandMetres:+median.toFixed(2),uplandThresholdMetres:+threshold.toFixed(2),massifs:out};
}
