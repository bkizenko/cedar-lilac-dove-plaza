/**
 * Terrain-aware spheres of influence as a pure, seeded function.
 *
 * BLUF: influence is a cost-distance field over real terrain layers. Each source keeps its historic radius as a
 * full-strength core, and the gradient begins exactly where that old ring ends and keeps going for `fadeMeters`
 * of further travel cost. There is no ring edge: the falloff is a smoothstep on cost, never on Euclidean distance.
 * Slope, cliffs and canyons, mountains, open water, big rivers, dense forest and wetland all add cost or stop the
 * wave. Passes, fords, bridges, roads and ships (launched from a finished port) are the ways through.
 *
 * Pure: no Game, no Math.random, no clock. Same layers + sources + seed always give the same field.
 * Units are "equivalent metres of ordinary level walking", the same unit the legacy field reports.
 */

/** Tunable gameplay coefficients, not measurements. */
export const TERRAIN_INFLUENCE_RULES=Object.freeze({
 version:1,
 /** Gradient length past the old ring, in cost metres. Legacy was 36; a young source fades over this. */
 fadeMeters:64,
 /** A mature settlement reaches this much further (see `reachGrowth`). */
 maximumGrowth:1.5,
 verticalCostMetersPerMeter:3,
 passVerticalCostMetersPerMeter:1.5,
 maximumStepMetres:2.45,
 passMaximumStepMetres:3.6,
 forestCost:1.6,wetlandCost:2.2,roughCost:2,
 /** Streams are slowed in proportion to width; a river wider than this stops the wave unless forded, bridged or shipped. */
 riverCostPerUnitWidth:5,riverBarrierWidth:10,fordMultiplier:3,
 /** Fraction of forest/wetland/river drag a road removes, and its pace bonus. */
 roadClearing:.85,roadPaceBonus:.45,bridgeMultiplier:.9,
 shipWaterCost:.9,embarkCostMeters:8,landingCostMeters:8,defaultShipReachMeters:140,
 /** Smooth edge jitter so an edge never traces a perfect geometric curve. Seeded, bounded, symmetric. */
 noiseAmplitude:.07,noiseCellsPerLattice:6,
 maximumVisitedPerGroup:400000,
 /** Cells whose strength is below this are treated as outside every sphere. */
 minimumStrength:.0005,
}as const);
const R=TERRAIN_INFLUENCE_RULES;

export type TerrainLayers={
 /** World edge length in metres and cells per side. Cells are square. */
 size:number;width:number;
 /** Ground (or travel-surface) height in metres. */
 height:Float32Array;
 /** 1 where the cell is open water (sea, lake or river surface). Rivers carry riverWidth and are handled as rivers. */
 water:Uint8Array;
 /** 1 where a land cell is physically obstructed (structure, boulder). Costs more, does not stop the wave on its own. */
 rough?:Uint8Array;
 /** 0..1 canopy density. */forest?:Float32Array;
 /** 0..1 marsh/bog wetness. */wetland?:Float32Array;
 /** River width in metres on cells the river covers, else 0. */riverWidth?:Float32Array;
 /** 1 where a shallow ford crosses a river. */ford?:Uint8Array;
 /** 1 where a mountain pass or saddle lifts the step limit. */pass?:Uint8Array;
 /** 0..1 road/trail wear. */road?:Float32Array;
 /** 1 where a finished bridge spans water or a river. */bridge?:Uint8Array;
};
export type InfluenceSource={
 id:number;team:number;x:number;z:number;
 /** Full-strength core radius in cost metres: the old hard ring. */radius:number;
 strength:number;
 /** 0..1 maturity. Stretches the gradient length by up to `maximumGrowth`. */growth?:number;
 /** Ships that can really sail from this source (a finished port with hulls moored there). 0 means no crossing of open water. */
 ships?:number;
 /** How far from the source ships carry influence over open water, in metres. */shipReachMeters?:number;
};
export type TerrainInfluenceOptions={seed:number};
export type BlockedCounts={water:number;cliff:number;river:number;budget:number};
export type TerrainInfluenceField={
 version:1;size:number;width:number;cellMeters:number;seed:number;
 /** 0..1 strength after smooth falloff (max over sources). */strength:Float32Array;
 /** Cost metres from the nearest-reaching source, Infinity where unreached. */cost:Float32Array;
 /** Id of the source whose wave set the strength, -1 where none. */origin:Int32Array;
 /** 1 where the strongest contribution crossed open water by ship. */byShip:Uint8Array;
 blocked:BlockedCounts;visited:number;
};
export const sourceFadeMeters=(s:Pick<InfluenceSource,'growth'>)=>R.fadeMeters*(1+R.maximumGrowth*Math.max(0,Math.min(1,s.growth??0)));

/** Cheap deterministic hash in [0,1). */
export function hash01(seed:number,x:number,z:number){
 let h=(seed|0)^Math.imul(x|0,0x27d4eb2d)^Math.imul(z|0,0x165667b1);
 h=Math.imul(h^(h>>>15),0x2c1b3c6d);h=Math.imul(h^(h>>>12),0x297a2d39);h^=h>>>15;
 return (h>>>0)/4294967296;
}
/** Smooth value noise in [0,1], lattice spacing in cells. */
export function smoothNoise(seed:number,cx:number,cz:number,spacing:number){
 const gx=cx/spacing,gz=cz/spacing,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
 const a=hash01(seed,ix,iz),b=hash01(seed,ix+1,iz),c=hash01(seed,ix,iz+1),d=hash01(seed,ix+1,iz+1);
 return (a*(1-sx)+b*sx)*(1-sz)+(c*(1-sx)+d*sx)*sz;
}
/** Smoothstep falloff past the core. `excess` is cost metres beyond the old ring. */
export function falloff(excess:number,fade:number,strength=1){
 if(excess<=1e-9)return Math.max(0,strength);
 const t=Math.max(0,Math.min(1,excess/Math.max(.001,fade)));
 return Math.max(0,strength)*(1-t*t*(3-2*t));
}

class Heap{
 keys:number[]=[];vals:number[]=[];
 get size(){return this.keys.length;}
 push(key:number,val:number){
  const k=this.keys,v=this.vals;let i=k.length;k.push(key);v.push(val);
  while(i){const p=(i-1)>>1;if(k[p]<key||k[p]===key&&v[p]<=val)break;k[i]=k[p];v[i]=v[p];i=p;}
  k[i]=key;v[i]=val;
 }
 pop():[number,number]{
  const k=this.keys,v=this.vals,fk=k[0],fv=v[0],lk=k.pop()!,lv=v.pop()!;
  if(k.length){let i=0;for(;;){let c=i*2+1;if(c>=k.length)break;if(c+1<k.length&&(k[c+1]<k[c]||k[c+1]===k[c]&&v[c+1]<v[c]))c++;if(k[c]>lk||k[c]===lk&&v[c]>=lv)break;k[i]=k[c];v[i]=v[c];i=c;}k[i]=lk;v[i]=lv;}
  return [fk,fv];
 }
}
const STEPS:readonly (readonly [number,number])[]=[
 [1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],
 [2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2],
];
/** Intermediate cells a knight step passes through, to forbid cutting a corner through a barrier. */
function between(dx:number,dz:number):[number,number][]{
 if(Math.abs(dx)<=1&&Math.abs(dz)<=1)return dx&&dz?[[dx,0],[0,dz]]:[];
 const sx=Math.sign(dx),sz=Math.sign(dz);
 return Math.abs(dx)===2?[[sx,0],[sx,sz]]:[[0,sz],[sx,sz]];
}
export function emptyLayers(size:number,width:number):TerrainLayers{
 return {size,width,height:new Float32Array(width*width),water:new Uint8Array(width*width)};
}
/** Validates dimensions so a malformed layer set fails loudly, never as NaN strength. */
export function layersIssue(l:TerrainLayers):string|null{
 const n=l.width*l.width;
 if(!Number.isInteger(l.width)||l.width<2||!(l.size>0))return 'Bad grid size';
 if(l.height.length!==n||l.water.length!==n)return 'Height/water layer size mismatch';
 for(const k of ['rough','ford','pass','bridge'] as const)if(l[k]&&l[k]!.length!==n)return `${k} layer size mismatch`;
 for(const k of ['forest','wetland','riverWidth','road'] as const)if(l[k]&&l[k]!.length!==n)return `${k} layer size mismatch`;
 return null;
}

/** Per-cell traversal multiplier for land (>=0.2) or NaN-free Infinity where the wave may never step. */
function cellMultiplier(l:TerrainLayers,i:number){
 const road=l.road?Math.max(0,Math.min(1,l.road[i])):0,bridge=!!l.bridge?.[i];
 if(bridge)return R.bridgeMultiplier;
 const clear=1-R.roadClearing*road;
 let m=1+(l.forest?R.forestCost*Math.max(0,Math.min(1,l.forest[i])):0)*clear+(l.wetland?R.wetlandCost*Math.max(0,Math.min(1,l.wetland[i])):0)*clear+(l.rough?.[i]?R.roughCost:0);
 const rw=l.riverWidth?.[i]??0;
 if(rw>0){
  if(l.ford?.[i])m+=R.fordMultiplier-1;
  else if(rw>R.riverBarrierWidth)return Infinity;
  else m+=R.riverCostPerUnitWidth*Math.min(1,rw/R.riverBarrierWidth)*clear;
 }
 return m/(1+R.roadPaceBonus*road);
}
/** Open water is sea, lake or a river too wide to wade. Fords and bridges make a crossing ordinary ground. */
const isOpenWater=(l:TerrainLayers,i:number)=>{
 if(l.bridge?.[i]||l.ford?.[i])return false;
 const rw=l.riverWidth?.[i]??0;
 return rw>R.riverBarrierWidth||!!l.water[i]&&rw<=0;
};

/**
 * Compute the influence field for a set of sources over terrain layers. Sources with the same strength and ship
 * ability share one wave, so a village of many huts is one pass, not many.
 */
export function computeTerrainInfluence(layers:TerrainLayers,sources:readonly InfluenceSource[],options:TerrainInfluenceOptions):TerrainInfluenceField{
 const issue=layersIssue(layers);if(issue)throw new Error(issue);
 const W=layers.width,n=W*W,cell=layers.size/W,half=layers.size/2,seed=options.seed|0;
 const field:TerrainInfluenceField={version:1,size:layers.size,width:W,cellMeters:cell,seed,strength:new Float32Array(n),cost:new Float32Array(n).fill(Infinity),origin:new Int32Array(n).fill(-1),byShip:new Uint8Array(n),blocked:{water:0,cliff:0,river:0,budget:0},visited:0};
 const mult=new Float32Array(n),open=new Uint8Array(n);
 for(let i=0;i<n;i++){open[i]=isOpenWater(layers,i)?1:0;mult[i]=open[i]?1:cellMultiplier(layers,i);}
 const pointOf=(i:number)=>({x:-half+(i%W+.5)*cell,z:-half+(Math.floor(i/W)+.5)*cell});
 const cellOf=(x:number,z:number)=>{const ix=Math.floor((x+half)/cell),iz=Math.floor((z+half)/cell);return ix<0||iz<0||ix>=W||iz>=W?-1:iz*W+ix;};
 const valid=sources.filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)&&Number.isFinite(s.radius)&&s.strength>0&&cellOf(s.x,s.z)>=0);
 const groups=new Map<string,InfluenceSource[]>();
 for(const s of valid){const key=`${s.strength}|${(s.ships??0)>0?Math.round(s.shipReachMeters??R.defaultShipReachMeters):0}`;const g=groups.get(key);if(g)g.push(s);else groups.set(key,[s]);}
 const keys=[...groups.keys()].sort();
 const minMult=1/(1+R.roadPaceBonus)*Math.min(1,R.bridgeMultiplier);
 for(const key of keys){
  const list=groups.get(key)!.slice().sort((a,b)=>a.id-b.id),strength=list[0].strength,shipReach=(list[0].ships??0)>0?(list[0].shipReachMeters??R.defaultShipReachMeters):0;
  const score=new Float64Array(n).fill(Infinity),by=new Int32Array(n).fill(-1),aboard=new Uint8Array(n),heap=new Heap();
  const bySource=new Map<number,InfluenceSource>();
  for(const s of list){
   bySource.set(s.id,s);const i=cellOf(s.x,s.z),start=-s.radius;
   if(start<score[i]){score[i]=start;by[i]=s.id;heap.push(start,i);}
  }
  let visited=0;
  while(heap.size){
   const [sc,i]=heap.pop();if(sc>score[i])continue;
   const s=bySource.get(by[i])!,fade=sourceFadeMeters(s);
   if(sc>fade)continue;
   if(++visited>R.maximumVisitedPerGroup){field.blocked.budget++;break;}
   const ix=i%W,iz=(i-ix)/W,wet=!!open[i],sx=-half+(ix+.5)*cell,sz=-half+(iz+.5)*cell;
   const val=falloff(sc,fade,strength);
   if(val>field.strength[i]+1e-9||val===field.strength[i]&&val>0&&field.origin[i]>by[i]){field.strength[i]=val;field.cost[i]=sc+s.radius;field.origin[i]=by[i];field.byShip[i]=aboard[i];}
   for(const [dx,dz] of STEPS){
    const nx=ix+dx,nz=iz+dz;if(nx<0||nz<0||nx>=W||nz>=W)continue;
    const ni=nz*W+nx,nWet=!!open[ni];
    // Never cut a corner through something impassable or through water the source cannot sail.
    let blockedCorner=false;
    for(const [bx,bz] of between(dx,dz)){const bi=(iz+bz)*W+(ix+bx);if(!Number.isFinite(mult[bi])&&!open[bi]){blockedCorner=true;break;}}
    if(blockedCorner){field.blocked.river++;continue;}
    const length=Math.hypot(dx,dz)*cell;
    let extra=0,factor:number;
    if(nWet||wet){
     if(!shipReach){field.blocked.water++;continue;}
     const q=pointOf(ni);if(Math.hypot(q.x-s.x,q.z-s.z)>shipReach&&nWet){field.blocked.water++;continue;}
     if(!wet&&nWet)extra+=R.embarkCostMeters;
     if(wet&&!nWet)extra+=R.landingCostMeters;
     factor=nWet?R.shipWaterCost:mult[ni];
     if(!Number.isFinite(factor)){field.blocked.river++;continue;}
    }else{
     const a=mult[i],b=mult[ni];
     if(!Number.isFinite(b)||!Number.isFinite(a)){field.blocked.river++;continue;}
     factor=(a+b)/2;
    }
    let vertical=0;
    if(!wet&&!nWet){
     const rise=Math.abs(layers.height[ni]-layers.height[i]),eased=!!layers.pass?.[ni]||!!layers.pass?.[i]||!!layers.bridge?.[ni]||!!layers.bridge?.[i];
     const limit=(eased?R.passMaximumStepMetres:R.maximumStepMetres)*Math.hypot(dx,dz);
     if(rise>limit){field.blocked.cliff++;continue;}
     vertical=rise*(eased?R.passVerticalCostMetersPerMeter:R.verticalCostMetersPerMeter);
    }
    const mx=(ix+nx)/2,mz=(iz+nz)/2,noise=1+R.noiseAmplitude*(smoothNoise(seed,mx,mz,R.noiseCellsPerLattice)*2-1);
    const next=sc+length*Math.max(minMult,factor)*noise+vertical+extra;
    if(next<score[ni]-1e-9){score[ni]=next;by[ni]=by[i];aboard[ni]=nWet||wet?1:aboard[i];heap.push(next,ni);}
   }
  }
  field.visited+=visited;
 }
 return field;
}

/** Strength sampled at a world point with bilinear smoothing between cell centres. */
export function sampleStrength(f:TerrainInfluenceField,x:number,z:number){
 const W=f.width,gx=(x+f.size/2)/f.cellMeters-.5,gz=(z+f.size/2)/f.cellMeters-.5,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
 if(!Number.isFinite(gx)||!Number.isFinite(gz)||ix<0||iz<0||ix+1>=W||iz+1>=W)return 0;
 const a=iz*W+ix,b=a+W,s=f.strength;
 return (s[a]*(1-fx)+s[a+1]*fx)*(1-fz)+(s[b]*(1-fx)+s[b+1]*fx)*fz;
}

/** Local saddles: a pass is an open, gentle cell with a rise on opposite sides across the line of travel. */
export function detectPasses(layers:Pick<TerrainLayers,'size'|'width'|'height'|'water'>,options:{lookCells?:number;minimumRiseMetres?:number;maximumGrade?:number;minimumAboveWater?:number;waterLevel?:number}={}){
 const W=layers.width,look=options.lookCells??4,rise=options.minimumRiseMetres??6,maxGrade=options.maximumGrade??.3,high=options.minimumAboveWater??12,cell=layers.size/W,out=new Uint8Array(W*W);
 const h=(x:number,z:number)=>layers.height[z*W+x];
 for(let z=look;z<W-look;z++)for(let x=look;x<W-look;x++){
  const i=z*W+x;if(layers.water[i])continue;
  const here=h(x,z);if(here<(options.waterLevel??0)+high)continue;
  const grade=Math.hypot(h(x+1,z)-h(x-1,z),h(x,z+1)-h(x,z-1))/(2*cell);if(grade>maxGrade)continue;
  const across=(ax:number,az:number)=>h(x+ax*look,z+az*look)-here>=rise&&h(x-ax*look,z-az*look)-here>=rise;
  // Higher ground on both sides across the line of travel, and no such wall along it: a saddle.
  if(across(1,0)&&!across(0,1)||across(0,1)&&!across(1,0))out[i]=1;
 }
 return out;
}
