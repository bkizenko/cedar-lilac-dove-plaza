import type {Game} from './sim';
import type {Unit} from './types';

/** Portable dugouts share one lazily-built amphibious navigation grid. */
const caches=new WeakMap<Game,{revision:number;grid:Uint8Array;labels:Int32Array;width:number}>();
export function canoeHeight(g:Game,u:Unit,x:number,z:number){
 return u.haulage==='canoe'?Math.max(g.travelHeight(x,z),g.waterAt(x,z)+.16):g.travelHeight(x,z);
}
const vesselCaches=new WeakMap<Game,{revision:number;grid:Uint8Array;labels:Int32Array;width:number}>();
export function waterNavigation(g:Game,waterOnly=false){return cachedWaterNavigation(g,waterOnly);}
function cachedWaterNavigation(g:Game,waterOnly=false){
 const cache=waterOnly?vesselCaches:caches;
 const old=cache.get(g);if(old?.revision===g.navigationRevision())return old;
 const width=Math.sqrt(g.walk.length),cell=g.world.size/width,grid=g.walk.slice();
 for(let z=0;z<width;z++)for(let x=0;x<width;x++){
  const wx=-(g.world.size/2)+(x+.5)*cell,wz=-(g.world.size/2)+(z+.5)*cell,h=g.height(wx,wz);
  if(Math.abs(wx)>(g.world.size/2)-2||Math.abs(wz)>(g.world.size/2)-2)continue;
  if(waterOnly&&h>=g.waterAt(wx,wz)+.3)grid[z*width+x]=0;
  if(h<g.waterAt(wx,wz)+.3){
   const surface=Math.max(h,g.waterAt(wx,wz)+.16);
   if(Math.abs(surface-Math.max(g.height(wx+cell,wz),g.waterAt(wx+cell,wz)+.16))<=2.45&&Math.abs(surface-Math.max(g.height(wx,wz+cell),g.waterAt(wx,wz+cell)+.16))<=2.45)grid[z*width+x]=1;
  }
 }
 // Waterfall lips are portage barriers, never navigable vertical shortcuts.
 for(const fall of g.world.waterfalls||[])if(fall.upperY-fall.lowerY>2.45){
  const r=fall.width*.7+cell,length=Math.hypot(fall.dx,fall.dz)||1,dirX=fall.dx/length,dirZ=fall.dz/length;
  for(let iz=Math.max(0,Math.floor((fall.z-r+g.world.size/2)/cell));iz<=Math.min(width-1,Math.ceil((fall.z+r+g.world.size/2)/cell));iz++)
   for(let ix=Math.max(0,Math.floor((fall.x-r+g.world.size/2)/cell));ix<=Math.min(width-1,Math.ceil((fall.x+r+g.world.size/2)/cell));ix++){
    const dx=-g.world.size/2+(ix+.5)*cell-fall.x,dz=-g.world.size/2+(iz+.5)*cell-fall.z;
    if(Math.abs(dx*dirX+dz*dirZ)<cell*1.5&&Math.abs(-dx*dirZ+dz*dirX)<r)grid[iz*width+ix]=0;
   }
 }
 // Buildings still block navigation, even in old saves containing wet foundations.
 for(const b of g.state.buildings){
  if(b.hp<=0||b.plannedCost||['dock','bridge','farm','pen','quarry','lumber','grove','cairn','cornerstone','trench','moat'].includes(b.type)||b.type==='gate'&&b.gateOpen)continue;
  const rx=b.w*.4+.75,rz=b.d*.4+.75;
  for(let z=Math.max(0,Math.floor((b.z-rz+(g.world.size/2))/cell));z<=Math.min(width-1,Math.floor((b.z+rz+(g.world.size/2))/cell));z++)
   for(let x=Math.max(0,Math.floor((b.x-rx+(g.world.size/2))/cell));x<=Math.min(width-1,Math.floor((b.x+rx+(g.world.size/2))/cell));x++)
    if(Math.abs(-(g.world.size/2)+(x+.5)*cell-b.x)<rx&&Math.abs(-(g.world.size/2)+(z+.5)*cell-b.z)<rz)grid[z*width+x]=0;
 }
 const labels=new Int32Array(grid.length),queue=new Int32Array(grid.length);let label=0;
 for(let start=0;start<grid.length;start++)if(grid[start]&&!labels[start]){
  label++;let head=0,tail=1;queue[0]=start;labels[start]=label;
  while(head<tail){const at=queue[head++],x=at%width,z=Math.floor(at/width);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,n=nz*width+nx;
    if(nx<0||nz<0||nx>=width||nz>=width||!grid[n]||labels[n])continue;labels[n]=label;queue[tail++]=n;}
  }
 }
 const result={revision:g.navigationRevision(),grid,labels,width};cache.set(g,result);return result;
}
export function connectedForUnit(g:Game,u:Unit,x:number,z:number){
 if(u.haulage!=='canoe')return g.workBoard.connected(g,u.x,u.z,x,z);
 const nav=waterNavigation(g,u.boat?.phase==='aboard'),cell=g.world.size/nav.width;
 const index=(px:number,pz:number)=>Math.max(0,Math.min(nav.width-1,Math.floor((pz+(g.world.size/2))/cell)))*nav.width+Math.max(0,Math.min(nav.width-1,Math.floor((px+(g.world.size/2))/cell)));
 const a=nav.labels[index(u.x,u.z)],b=nav.labels[index(x,z)];return a>0&&a===b;
}
