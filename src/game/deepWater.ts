import type {Game} from './sim';

/** G16 deep-water extents (Grok W-World) for sea storms, voyages and port admission.
 * Canonical answer to "where is deep water": an 8 m grid sampled at cell centres with
 * the game's own `waterAt - height` (the same predicate Societies' `deepWater()` uses),
 * labelled into connected regions. A region touching the map edge is open sea; any
 * other deep region (deep lake, flooded quarry) is inland. `offshoreMetres` is the
 * distance across water to the nearest dry cell, so a storm can stay off the beach.
 * Simulation-side truth, not player knowledge: never feed it to fog-limited UI. */
export const DEEP_WATER_RULES={version:1,cellMetres:8,deepMetres:2.5} as const;
export type DeepWaterRegion={id:number;cells:number;areaSquareMetres:number;openSea:boolean;minX:number;maxX:number;minZ:number;maxZ:number;centroidX:number;centroidZ:number;maxDepthMetres:number;maxOffshoreMetres:number};
export type DeepWaterExtents={version:number;cellMetres:number;deepMetres:number;n:number;size:number;depth:Float32Array;labels:Int32Array;offshore:Float32Array;regions:DeepWaterRegion[]};

const cache=new WeakMap<object,{key:string;value:DeepWaterExtents}>();
export function deepWaterExtents(g:Pick<Game,'world'|'state'|'waterAt'|'height'>,deepMetres:number=DEEP_WATER_RULES.deepMetres):DeepWaterExtents{
 const key=`${g.world.waterY}|${deepMetres}|${g.state?.excavations?.length??0}`,old=cache.get(g.world);if(old?.key===key)return old.value;
 const size=g.world.size,cell=DEEP_WATER_RULES.cellMetres,n=Math.max(1,Math.round(size/cell)),c=size/n,N=n*n;
 const depth=new Float32Array(N),labels=new Int32Array(N).fill(-1),offshore=new Float32Array(N).fill(Infinity);
 const cx=(i:number)=>((i%n)+.5)*c-size/2,cz=(i:number)=>(Math.floor(i/n)+.5)*c-size/2;
 for(let i=0;i<N;i++){const x=cx(i),z=cz(i);depth[i]=g.waterAt(x,z)-g.height(x,z);}
 // offshore: two-pass chamfer distance over water cells from every dry cell
 for(let i=0;i<N;i++)if(depth[i]<=0)offshore[i]=0;
 const d1=c,d2=c*Math.SQRT2;
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const i=iz*n+ix;if(!offshore[i])continue;let v=offshore[i];if(ix>0)v=Math.min(v,offshore[i-1]+d1);if(iz>0){v=Math.min(v,offshore[i-n]+d1);if(ix>0)v=Math.min(v,offshore[i-n-1]+d2);if(ix<n-1)v=Math.min(v,offshore[i-n+1]+d2);}offshore[i]=v;}
 for(let iz=n-1;iz>=0;iz--)for(let ix=n-1;ix>=0;ix--){const i=iz*n+ix;if(!offshore[i])continue;let v=offshore[i];if(ix<n-1)v=Math.min(v,offshore[i+1]+d1);if(iz<n-1){v=Math.min(v,offshore[i+n]+d1);if(ix<n-1)v=Math.min(v,offshore[i+n+1]+d2);if(ix>0)v=Math.min(v,offshore[i+n-1]+d2);}offshore[i]=v;}
 const regions:DeepWaterRegion[]=[],stack:number[]=[];
 for(let s=0;s<N;s++){if(labels[s]>=0||depth[s]<deepMetres)continue;const id=regions.length;labels[s]=id;stack.push(s);
  const r:DeepWaterRegion={id,cells:0,areaSquareMetres:0,openSea:false,minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,centroidX:0,centroidZ:0,maxDepthMetres:0,maxOffshoreMetres:0};
  while(stack.length){const i=stack.pop()!,ix=i%n,iz=(i/n)|0,x=cx(i),z=cz(i);r.cells++;r.centroidX+=x;r.centroidZ+=z;r.minX=Math.min(r.minX,x);r.maxX=Math.max(r.maxX,x);r.minZ=Math.min(r.minZ,z);r.maxZ=Math.max(r.maxZ,z);r.maxDepthMetres=Math.max(r.maxDepthMetres,depth[i]);r.maxOffshoreMetres=Math.max(r.maxOffshoreMetres,offshore[i]);
   if(ix===0||iz===0||ix===n-1||iz===n-1)r.openSea=true;
   for(const j of [ix>0?i-1:-1,ix<n-1?i+1:-1,iz>0?i-n:-1,iz<n-1?i+n:-1])if(j>=0&&labels[j]<0&&depth[j]>=deepMetres){labels[j]=id;stack.push(j);}}
  r.areaSquareMetres=r.cells*c*c;r.centroidX/=r.cells;r.centroidZ/=r.cells;regions.push(r);}
 const value={version:DEEP_WATER_RULES.version,cellMetres:c,deepMetres,n,size,depth,labels,offshore,regions};cache.set(g.world,{key,value});return value;
}
function cellOf(e:DeepWaterExtents,x:number,z:number){const ix=Math.floor((x/e.size+.5)*e.n),iz=Math.floor((z/e.size+.5)*e.n);return ix<0||iz<0||ix>=e.n||iz>=e.n?-1:iz*e.n+ix;}
/** Point query on the extents grid (cell containing the point). */
export function deepWaterAt(g:Pick<Game,'world'|'state'|'waterAt'|'height'>,x:number,z:number){const e=deepWaterExtents(g),i=cellOf(e,x,z);if(i<0)return{deep:false,regionId:-1,openSea:false,depthMetres:0,offshoreMetres:0};const id=e.labels[i];return{deep:id>=0,regionId:id,openSea:id>=0&&e.regions[id].openSea,depthMetres:Math.max(0,e.depth[i]),offshoreMetres:Number.isFinite(e.offshore[i])?e.offshore[i]:e.size};}
/** Deterministic pick of a deep cell centre, uniform by area, for spawning a storm.
 * `unit` must be a seeded [0,1) source owned by the caller. */
export function pickDeepWaterPoint(g:Pick<Game,'world'|'state'|'waterAt'|'height'>,unit:()=>number,options:{near?:{x:number;z:number;radius:number};minOffshoreMetres?:number;openSeaOnly?:boolean}={}){
 const e=deepWaterExtents(g),open=options.openSeaOnly!==false,min=options.minOffshoreMetres??0,cand:number[]=[],near=options.near;
 for(let i=0;i<e.labels.length;i++){const id=e.labels[i];if(id<0||(open&&!e.regions[id].openSea)||e.offshore[i]<min)continue;if(near){const x=((i%e.n)+.5)*e.cellMetres-e.size/2,z=(Math.floor(i/e.n)+.5)*e.cellMetres-e.size/2;if(Math.hypot(x-near.x,z-near.z)>near.radius)continue;}cand.push(i);}
 if(!cand.length)return null;const i=cand[Math.min(cand.length-1,Math.floor(unit()*cand.length))];
 return{x:((i%e.n)+.5)*e.cellMetres-e.size/2,z:(Math.floor(i/e.n)+.5)*e.cellMetres-e.size/2,regionId:e.labels[i],offshoreMetres:e.offshore[i]};
}
