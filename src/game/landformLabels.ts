import type {WorldData} from './worldgen';
import {sampleWorldHeight} from './worldgen';
import {waterSurfaceAt} from './localWater';
import {provinceAt} from './ecologicalProvinces';

/** Hills that are actually hilly (Grok W-World, W5), opt-in with
 * `worldOptions.landformLabelVersion: 2` (saved with the world; absent = historic
 * labels). Terrain is not changed — rivers, coasts, starts and resources stay
 * byte-identical. Only the compatibility habitat family (plains/forest/hills) is
 * read from measured relief instead of the climate province: open ground rougher
 * than the world's own `reliefPercentile` (and at least `minimumHillReliefMetres`)
 * is hills, smoother open ground is plains; woodland stays woodland. Two majority
 * passes remove speckle. Derived and cached per world. */
export const LANDFORM_LABEL_RULES={version:2,cellMetres:16,reliefRadiusMetres:24,reliefPercentile:.6,minimumHillReliefMetres:3,majorityNeighbours:5,smoothingPasses:2} as const;
type World=Pick<WorldData,'size'|'heights'|'waterY'|'baseWaterY'|'ecology'|'options'|'waterBodies'|'waterHeights'|'waterfalls'|'localWaterVersion'|'bankTerrain'|'segs'>;
type Labels={width:number;cell:number;kinds:Uint8Array;thresholdMetres:number};
const KIND=['plains','forest','hills'] as const;
const cache=new WeakMap<object,Labels>();
export const landformLabelsEnabled=(world:Pick<WorldData,'options'>)=>(world.options as {landformLabelVersion?:number}|undefined)?.landformLabelVersion===2;
export function reliefAt(world:World,x:number,z:number,r:number=LANDFORM_LABEL_RULES.reliefRadiusMetres){
 const h=(a:number,b:number)=>sampleWorldHeight(world as WorldData,a,b);let lo=Infinity,hi=-Infinity;
 for(const [dx,dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,-.7],[.7,-.7],[-.7,.7]]){const y=h(x+dx*r,z+dz*r);lo=Math.min(lo,y);hi=Math.max(hi,y);}return hi-lo;
}
export function landformLabels(world:World):Labels{
 const old=cache.get(world.heights);if(old)return old;
 const R=LANDFORM_LABEL_RULES,cell=R.cellMetres,width=Math.ceil(world.size/cell),half=world.size/2,relief=new Float32Array(width*width).fill(-1),base=new Uint8Array(width*width);
 const land:number[]=[];
 for(let j=0;j<width;j++)for(let i=0;i<width;i++){const x=(i+.5)*cell-half,z=(j+.5)*cell-half,k=j*width+i;
  const b=world.ecology?provinceAt(world.ecology,x,z).baseHabitat:'plains';base[k]=KIND.indexOf(b);
  if(sampleWorldHeight(world as WorldData,x,z)<waterSurfaceAt(world as WorldData,x,z)+.3)continue;const r=reliefAt(world,x,z);relief[k]=r;land.push(r);}
 land.sort((a,b)=>a-b);const threshold=Math.max(R.minimumHillReliefMetres,land[Math.floor(land.length*R.reliefPercentile)]??Infinity);
 const kinds=new Uint8Array(width*width);
 for(let k=0;k<kinds.length;k++)kinds[k]=base[k]===1?1:relief[k]>=threshold?2:relief[k]>=0?0:base[k];
 let smooth=kinds;
 for(let pass=0;pass<R.smoothingPasses;pass++){const from=smooth,next=from.slice();
  for(let j=1;j<width-1;j++)for(let i=1;i<width-1;i++){const k=j*width+i;if(from[k]===1||relief[k]<0)continue;const other=from[k]===2?0:2;let n=0;
   for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++)if((di||dj)&&from[k+dj*width+di]===other)n++;if(n>=R.majorityNeighbours)next[k]=other;}
  smooth=next;}
 const out={width,cell,kinds:smooth,thresholdMetres:+threshold.toFixed(2)};cache.set(world.heights,out);return out;
}
/** Woodland is decided at the exact point (the province); open ground takes the
 * smoothed relief label of its cell, or the point's own relief where the cell
 * centre happens to be woodland. */
export function landformHabitatAt(world:World,x:number,z:number):'plains'|'forest'|'hills'{
 if(world.ecology&&provinceAt(world.ecology,x,z).baseHabitat==='forest')return 'forest';
 const L=landformLabels(world),half=world.size/2,i=Math.min(L.width-1,Math.max(0,Math.floor((x+half)/L.cell))),j=Math.min(L.width-1,Math.max(0,Math.floor((z+half)/L.cell))),k=KIND[L.kinds[j*L.width+i]];
 return k!=='forest'?k:reliefAt(world,x,z)>=L.thresholdMetres?'hills':'plains';
}
