import {sampleHeight,sampleWorldHeight,type WorldData} from './worldgen';
import {waterSurfaceAt} from './localWater';
import {highWaterLevel} from './hydrology';
import {provinceAt} from './ecologicalProvinces';

/** GW-11/12/15 measurement (Grok W-World). Offline diagnostics only: never call per frame.
 * Rivers: does the water surface only fall downstream, do the banks contain it,
 * does the channel end in other water. Regions: are habitats contiguous rather
 * than speckled, and does relief agree with the habitat label. */
export const LANDFORM_COHERENCE_RULES={version:1,riverStepMetres:4,riseToleranceMetres:.05,bankOffsetMetres:4,bankFreeboardMetres:.3,mouthSearchMetres:14,regionGrid:64,fragmentCells:3} as const;
type World=Pick<WorldData,'size'|'heights'|'rivers'|'biomes'|'baseWaterY'|'waterY'>&Partial<Pick<WorldData,'bankTerrain'|'ecology'|'waterBodies'|'waterfalls'|'waterHeights'|'localWaterVersion'>>;
export function worldHeight(world:World){return (x:number,z:number)=>world.bankTerrain?sampleWorldHeight(world as WorldData,x,z):sampleHeight(world.heights,x,z,world.size);}
export function habitatAt(world:World,x:number,z:number){if(world.ecology)return provinceAt(world.ecology,x,z).baseHabitat;let best='plains',bd=Infinity;for(const b of world.biomes){const d=(b.x-x)**2+(b.z-z)**2;if(d<bd){bd=d;best=b.kind;}}return best;}

function resample(pts:{x:number;z:number}[],step:number){const out:{x:number;z:number;tx:number;tz:number}[]=[];let carry=0;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l<1e-9)continue;let s=carry;for(;s<=l;s+=step)out.push({x:a.x+dx*s/l,z:a.z+dz*s/l,tx:dx/l,tz:dz/l});carry=s-l;}const e=pts.at(-1),p=pts.at(-2);if(e&&p){const l=Math.hypot(e.x-p.x,e.z-p.z)||1;out.push({x:e.x,z:e.z,tx:(e.x-p.x)/l,tz:(e.z-p.z)/l});}return out;}

/** Optional samplers so tests (and future generators) can probe synthetic terrain. */
export type LandformProbe={height?:(x:number,z:number)=>number;surface?:(x:number,z:number)=>number;habitat?:(x:number,z:number)=>string};
export function riverCoherence(world:World,probe:LandformProbe={}){
 const R=LANDFORM_COHERENCE_RULES,h=probe.height??worldHeight(world),surface=probe.surface??((x:number,z:number)=>waterSurfaceAt(world,x,z));
 return world.rivers.map((river,index)=>{
  let s=resample(river.pts,R.riverStepMetres);if(s.length<2)return{index,samples:s.length,lengthMetres:0,dropMetres:0,gradientPer100m:0,rises:0,riseMetres:0,containedFraction:1,dryBedFraction:0,sinuosity:1,mouth:'none' as const};
  const ys=s.map(p=>surface(p.x,p.z));if(ys[0]<ys.at(-1)!){s=s.reverse().map(p=>({...p,tx:-p.tx,tz:-p.tz}));ys.reverse();}
  let length=0,rises=0,riseMetres=0,contained=0,dry=0;
  for(let i=0;i<s.length;i++){if(i){length+=Math.hypot(s[i].x-s[i-1].x,s[i].z-s[i-1].z);const up=ys[i]-ys[i-1];if(up>R.riseToleranceMetres){rises++;riseMetres+=up;}}
   const off=river.w/2+R.bankOffsetMetres,nx=-s[i].tz,nz=s[i].tx,need=ys[i]+R.bankFreeboardMetres;
   if(h(s[i].x+nx*off,s[i].z+nz*off)>=need&&h(s[i].x-nx*off,s[i].z-nz*off)>=need)contained++;
   if(h(s[i].x,s[i].z)>=ys[i])dry++;}
  const end=s.at(-1)!,chord=Math.hypot(end.x-s[0].x,end.z-s[0].z),high=highWaterLevel(world.baseWaterY);
  const beyond={x:end.x+end.tx*R.mouthSearchMetres,z:end.z+end.tz*R.mouthSearchMetres};
  const joins=world.rivers.some((o,j)=>j!==index&&o.pts.some((p,k)=>k<o.pts.length-1&&segDist(end,p,o.pts[k+1])<o.w/2+R.mouthSearchMetres));
  const edge=Math.max(Math.abs(beyond.x),Math.abs(beyond.z))>=world.size/2-2;
  const mouth=h(beyond.x,beyond.z)<Math.max(high,surface(beyond.x,beyond.z))-.1?'open-water' as const:joins?'confluence' as const:edge?'map-edge' as const:'dead-end' as const;
  return{index,samples:s.length,lengthMetres:+length.toFixed(1),dropMetres:+(ys[0]-ys.at(-1)!).toFixed(2),gradientPer100m:+((ys[0]-ys.at(-1)!)/Math.max(1,length)*100).toFixed(3),rises,riseMetres:+riseMetres.toFixed(2),containedFraction:+(contained/s.length).toFixed(3),dryBedFraction:+(dry/s.length).toFixed(3),sinuosity:+(length/Math.max(1,chord)).toFixed(3),mouth};
 });
}
function segDist(p:{x:number;z:number},a:{x:number;z:number},b:{x:number;z:number}){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}

export function regionalCoherence(world:World,probe:LandformProbe={}){
 const R=LANDFORM_COHERENCE_RULES,n=R.regionGrid,cell=world.size/n,h=probe.height??worldHeight(world),high=highWaterLevel(world.baseWaterY),surface=probe.surface??((x:number,z:number)=>waterSurfaceAt(world,x,z)),habitat=probe.habitat??((x:number,z:number)=>habitatAt(world,x,z));
 const kind:(string|null)[]=new Array(n*n).fill(null),relief=new Float32Array(n*n);
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const x=((ix+.5)/n-.5)*world.size,z=((iz+.5)/n-.5)*world.size,c=h(x,z);if(c<Math.max(high,surface(x,z))+.3)continue;kind[iz*n+ix]=habitat(x,z);
  const q=cell/2;relief[iz*n+ix]=Math.max(c,h(x+q,z),h(x-q,z),h(x,z+q),h(x,z-q))-Math.min(c,h(x+q,z),h(x-q,z),h(x,z+q),h(x,z-q));}
 let land=0,speckled=0;const seen=new Uint8Array(n*n),patches:Record<string,number[]>={};
 for(let i=0;i<n*n;i++){const k=kind[i];if(!k)continue;land++;const ix=i%n,iz=(i/n)|0;let other=0,nb=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const jx=ix+dx,jz=iz+dz;if(jx<0||jz<0||jx>=n||jz>=n)continue;const o=kind[jz*n+jx];if(!o)continue;nb++;if(o!==k)other++;}if(nb>=4&&other>=5)speckled++;
  if(seen[i])continue;let size=0;const st=[i];seen[i]=1;while(st.length){const c=st.pop()!;size++;const cx=c%n,cz=(c/n)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const jx=cx+dx,jz=cz+dz;if(jx<0||jz<0||jx>=n||jz>=n)continue;const j=jz*n+jx;if(!seen[j]&&kind[j]===k){seen[j]=1;st.push(j);}}}(patches[k]??=[]).push(size);}
 const reliefBy:Record<string,number>={};for(const k of Object.keys(patches)){const r:number[]=[];for(let i=0;i<n*n;i++)if(kind[i]===k)r.push(relief[i]);r.sort((a,b)=>a-b);reliefBy[k]=+(r[r.length>>1]??0).toFixed(2);}
 const all=Object.values(patches).flat(),fragments=all.filter(s=>s<=R.fragmentCells).length;
 return{landCells:land,habitats:Object.fromEntries(Object.entries(patches).map(([k,v])=>[k,{cells:v.reduce((a,b)=>a+b,0),patches:v.length,largestPatch:Math.max(...v)}])),speckledFraction:+(speckled/Math.max(1,land)).toFixed(4),fragmentPatches:fragments,fragmentCellFraction:+(all.filter(s=>s<=R.fragmentCells).reduce((a,b)=>a+b,0)/Math.max(1,land)).toFixed(4),medianReliefByHabitat:reliefBy,hillsRougherThanPlains:reliefBy.hills===undefined||reliefBy.plains===undefined?null:reliefBy.hills>reliefBy.plains};
}
export function landformCoherence(world:World,probe:LandformProbe={}){const rivers=riverCoherence(world,probe),regions=regionalCoherence(world,probe);const len=rivers.reduce((a,r)=>a+r.lengthMetres,0);
 return{version:LANDFORM_COHERENCE_RULES.version,rivers,riverSummary:{count:rivers.length,lengthMetres:+len.toFixed(1),risingRivers:rivers.filter(r=>r.rises>0).length,deadEnds:rivers.filter(r=>r.mouth==='dead-end').length,containedFraction:+(rivers.reduce((a,r)=>a+r.containedFraction*r.lengthMetres,0)/Math.max(1,len)).toFixed(3)},regions};}
