import * as THREE from 'three';
import {PROVINCE_KINDS,type EcologicalProvinceGrid} from '../game/ecologicalProvinces';
import {fbm} from './biomeTerrain';
/** Surface geology for the painterly map: which rock a place is made of, how its beds tilt, how deep the soil is, where scree aprons lie
 * below cliffs, and how high the ground stands above (or how deep it lies below) the local water. Render-only; heights, collision and saves
 * never see it.
 *
 * Source of truth, in order:
 *  1. `world.mapgen.geology` (or `world.geology`) when the generator provides it. Accepted shape, every field optional:
 *       {width, size?, rock?:ids, rockNames?:string[], strata?:phase metres, soil?:0..1, scree?:0..1, landform?:ids, landforms?:string[]}
 *     as row-major `width*width` grids over the map (rock ids index `rockNames`, default ROCK_KINDS order), or `at(x,z)` returning the same
 *     fields for one point. Anything missing falls through to 2.
 *  2. A deterministic procedural field from the seed, the ecological province and the relief (sedimentary beds in the dry lowlands and
 *     coasts, igneous caps and cores on the high ground), so every world gets real-looking rock even without generator support. */
export const ROCK_KINDS=['sandstone','limestone','basalt','granite','shale'] as const;
export type RockKind=typeof ROCK_KINDS[number];
/** Four bed tones and one joint tone per rock (sRGB hex), thickness is the typical bed in metres. Families: sandstone reds and ochres,
 * limestone creams, basalt greys, granite pinks and greys, shale darks. */
export const ROCK_PALETTE:Record<RockKind,{bands:readonly [string,string,string,string];joint:string;soil:string;thickness:number}>={
 sandstone:{bands:['#b4623b','#cc8a52','#dbaa6e','#9a4f32'],joint:'#5a3022',soil:'#a65e3c',thickness:1.25},
 limestone:{bands:['#e3d8bb','#d3c6a3','#c2b590','#b7ab8f'],joint:'#6f6551',soil:'#cdb98d',thickness:2.1},
 basalt:{bands:['#4a4b50','#5c5d62','#3b3c41','#6a665f'],joint:'#1c1c20',soil:'#4a3a2e',thickness:5.5},
 granite:{bands:['#b99a8f','#a39e9c','#c6aa9d','#8f8c8c'],joint:'#4d4545',soil:'#a58d72',thickness:2.8},
 shale:{bands:['#514b44','#665c50','#3d3b39','#59564f'],joint:'#201f1e',soil:'#6a6046',thickness:.45},
};
const lin=(h:string)=>{const c=new THREE.Color(h);return [c.r,c.g,c.b] as const;};
const v3=(c:readonly number[])=>`vec3(${c.map(x=>x.toFixed(4)).join(',')})`;
/** GLSL constants for the five rock families (linear colour). */
export function rockPaletteGLSL(){
 return ROCK_KINDS.map(k=>{const p=ROCK_PALETTE[k],u=k.toUpperCase();
  return `const vec3 ${u}_0=${v3(lin(p.bands[0]))};const vec3 ${u}_1=${v3(lin(p.bands[1]))};const vec3 ${u}_2=${v3(lin(p.bands[2]))};const vec3 ${u}_3=${v3(lin(p.bands[3]))};const vec3 ${u}_J=${v3(lin(p.joint))};const vec3 ${u}_SOIL=${v3(lin(p.soil))};`;}).join('\n');
}
/** Per-province prior over [sandstone, limestone, basalt, granite, shale]. */
const PRIOR:Record<string,readonly number[]>={
 meadow:[.22,.28,.1,.2,.2],'mixed-woodland':[.15,.25,.1,.25,.25],'conifer-forest':[.08,.17,.2,.4,.15],alpine:[.05,.13,.27,.45,.1],
 wetland:[.1,.35,.05,.05,.45],'dry-scrub':[.45,.3,.07,.08,.1],arid:[.7,.1,.08,.05,.07],'warm-coast':[.2,.5,.05,.1,.15],
};
const clamp01=(v:number)=>v<0?0:v>1?1:v;
const smooth=(a:number,b:number,x:number)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
export type MapgenGeology={width?:number;size?:number;rock?:ArrayLike<number>;rockNames?:readonly string[];strata?:ArrayLike<number>;soil?:ArrayLike<number>;scree?:ArrayLike<number>;landform?:ArrayLike<number>;landforms?:readonly string[];
 at?:(x:number,z:number)=>{rock?:number|string;strata?:number;soil?:number;scree?:number;landform?:number|string}|null};
export type GeologyWorld={heights:Float32Array;size:number;waterY:number;ecology?:EcologicalProvinceGrid;mapgen?:{geology?:MapgenGeology;wind?:{x:number;z:number}}|undefined;geology?:MapgenGeology};
export type GeologyHooks={height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number};
/** Rock weights [sandstone, limestone, basalt, granite]; shale is the remainder. */
export function proceduralRock(seed:number,x:number,z:number,province:string,rel:number,out:Float32Array,o:number){
 const prior=PRIOR[province]??PRIOR.meadow,s=seed%991;
 // a broad terrane noise picks the rock; stretch it so the middle of the fbm range does not swallow the extremes
 let u=clamp01((fbm(x*.0036+s,z*.0036-s,2,3)-.5)*2.6+.5);
 // high ground leans igneous (caps and cores), low wet ground leans sedimentary
 const high=smooth(10,34,rel);u=u*(1-high*.35)+high*.35*clamp01((fbm(x*.011,z*.011,s+7,2)-.3)*2);
 let total=0;for(const p of prior)total+=p;
 let acc=0;const w=[0,0,0,0,0],edge=.05;
 for(let i=0;i<5;i++){const lo=acc/total;acc+=prior[i];const hi=acc/total;w[i]=smooth(lo-edge,lo+edge,u)*(1-smooth(hi-edge,hi+edge,u));if(i===0)w[i]=1-smooth(hi-edge,hi+edge,u);if(i===4)w[i]=smooth(lo-edge,lo+edge,u);}
 const sum=w[0]+w[1]+w[2]+w[3]+w[4]||1;
 for(let i=0;i<4;i++)out[o+i]=w[i]/sum;
}
const nameIndex=(names:readonly string[]|undefined,id:number|string|undefined)=>{
 if(id===undefined)return -1;if(typeof id==='string')return ROCK_KINDS.indexOf(id as RockKind);
 const n=names?names[id]:ROCK_KINDS[id];return n?ROCK_KINDS.indexOf(n as RockKind):-1;
};
/** Per-vertex geology, sampled on the world grid once and read bilinearly anywhere (coarse terrain 1:1, bank tiles and meshes by position).
 * rock = [sandstone,limestone,basalt,granite] weights; state = [soil 0..1, scree 0..1, metres above local water (-6..6), bed tilt metres]. */
export class SurfaceGeology{
 readonly n:number;readonly size:number;readonly rock:Float32Array;readonly state:Float32Array;readonly fromMapgen:boolean;
 constructor(world:GeologyWorld,seed:number,hooks:GeologyHooks){
  const segs=Math.round(Math.sqrt(world.heights.length))-1,n=this.n=segs+1,size=this.size=world.size;
  this.rock=new Float32Array(n*n*4);this.state=new Float32Array(n*n*4);
  const H=world.heights,grid=world.ecology,source=world.mapgen?.geology??world.geology,cell=size/segs;
  this.fromMapgen=!!source;
  const slope=new Float32Array(n*n),cliff=new Float32Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*n+i,dx=(H[j*n+Math.min(n-1,i+1)]-H[j*n+Math.max(0,i-1)])/(cell*(i>0&&i<n-1?2:1)),dz=(H[Math.min(n-1,j+1)*n+i]-H[Math.max(0,j-1)*n+i])/(cell*(j>0&&j<n-1?2:1));
   slope[k]=Math.hypot(dx,dz);cliff[k]=smooth(.5,1.0,slope[k]);
  }
  // scree: the foot of a steep face, a short way downhill of cliff cells that stand clearly above it
  const scree=new Float32Array(n*n),R=3;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*n+i;let best=0;
   for(let d=1;d<=R;d++)for(let a=0;a<8;a++){const ox=Math.round(Math.cos(a*.7854)*d),oz=Math.round(Math.sin(a*.7854)*d),ii=i+ox,jj=j+oz;if(ii<0||jj<0||ii>=n||jj>=n)continue;
    const kk=jj*n+ii,above=H[kk]-H[k];if(above>1.2){const v=cliff[kk]*smooth(1.2,5,above)*(1-d/(R+1)*.55);if(v>best)best=v;}}
   scree[k]=best*(1-cliff[k]*.85);
  }
  const w4=new Float32Array(4);
  for(let j=0;j<n;j++){const z=(j/segs-.5)*size;for(let i=0;i<n;i++){
   const k=j*n+i,x=(i/segs-.5)*size,h=H[k],water=hooks.waterAt(x,z),rel=h-water;
   let province='meadow',soilEco=.5,moist=.5;
   if(grid){const gx=Math.max(0,Math.min(grid.width-1,Math.round((x/grid.size+.5)*grid.width-.5))),gz=Math.max(0,Math.min(grid.width-1,Math.round((z/grid.size+.5)*grid.width-.5))),c=gz*grid.width+gx;province=PROVINCE_KINDS[grid.kinds[c]]??'meadow';soilEco=grid.soil[c]??.5;moist=grid.moisture[c]??.5;}
   proceduralRock(seed,x,z,province,rel,w4,0);
   let soil=clamp01(soilEco*.7+.25-slope[k]*.9+(fbm(x*.045,z*.045,seed%613,2)-.5)*.5-(province==='arid'?.18:province==='dry-scrub'?.08:0)+moist*.1),sc=scree[k],phase=(x*.012+z*.008)+(fbm(x*.004,z*.004,seed%409,2)-.5)*5;
   const m=source?sampleMapgen(source,x,z,size):null;
   if(m){
    if(m.rock>=0){w4.fill(0);if(m.rock<4)w4[m.rock]=1;}
    if(m.soil>=0)soil=m.soil;if(m.scree>=0)sc=Math.max(sc,m.scree);if(m.strata!==undefined)phase=m.strata;
    if(m.landform==='scree'||m.landform==='talus')sc=Math.max(sc,.85);
   }
   const o=k*4;this.rock[o]=w4[0];this.rock[o+1]=w4[1];this.rock[o+2]=w4[2];this.rock[o+3]=w4[3];
   this.state[o]=soil;this.state[o+1]=clamp01(sc);this.state[o+2]=Math.max(-6,Math.min(6,rel));this.state[o+3]=phase;
  }}
 }
 /** Bilinear sample into outRock/outState at offset o (each 4 floats). */
 sample(x:number,z:number,outRock:Float32Array,outState:Float32Array,o:number){
  const segs=this.n-1,gx=Math.max(0,Math.min(segs-.0001,(x/this.size+.5)*segs)),gz=Math.max(0,Math.min(segs-.0001,(z/this.size+.5)*segs)),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,n=this.n;
  const a=(iz*n+ix)*4,b=a+4,c=a+n*4,d=c+4,wa=(1-fx)*(1-fz),wb=fx*(1-fz),wc=(1-fx)*fz,wd=fx*fz;
  for(let q=0;q<4;q++){outRock[o+q]=this.rock[a+q]*wa+this.rock[b+q]*wb+this.rock[c+q]*wc+this.rock[d+q]*wd;outState[o+q]=this.state[a+q]*wa+this.state[b+q]*wb+this.state[c+q]*wc+this.state[d+q]*wd;}
 }
 /** Attributes for any position buffer; the coarse terrain grid maps 1:1 so it just copies. */
 attributes(positions:THREE.BufferAttribute,heightOverride?:(x:number,z:number)=>number,waterAt?:(x:number,z:number)=>number){
  const count=positions.count,rock=new Float32Array(count*4),state=new Float32Array(count*4);
  if(count===this.n*this.n){rock.set(this.rock);state.set(this.state);return {rock,state};}
  for(let i=0;i<count;i++){const x=positions.getX(i),z=positions.getZ(i);this.sample(x,z,rock,state,i*4);
   if(waterAt)state[i*4+2]=Math.max(-6,Math.min(6,positions.getY(i)-waterAt(x,z)));}
  void heightOverride;return {rock,state};
 }
 /** Dominant rock tint (linear) at a point, for boulders and rubble. */
 rockAt(x:number,z:number){const r=new Float32Array(4),s=new Float32Array(4);this.sample(x,z,r,s,0);return {weights:r,scree:s[1],soil:s[0],tint:rockTint(r)};}
}
function sampleMapgen(g:MapgenGeology,x:number,z:number,worldSize:number){
 const out={rock:-1,soil:-1,scree:-1,strata:undefined as number|undefined,landform:'' as string};
 if(g.at){const r=g.at(x,z);if(r){out.rock=nameIndex(g.rockNames,r.rock as number|string|undefined);if(r.soil!==undefined)out.soil=r.soil;if(r.scree!==undefined)out.scree=r.scree;if(r.strata!==undefined)out.strata=r.strata;
  if(typeof r.landform==='string')out.landform=r.landform;else if(r.landform!==undefined&&g.landforms?.[r.landform])out.landform=g.landforms[r.landform];}return out;}
 const w=g.width??0;if(w<2)return out;
 const size=g.size??worldSize,gx=Math.max(0,Math.min(w-1.001,(x/size+.5)*w-.5)),gz=Math.max(0,Math.min(w-1.001,(z/size+.5)*w-.5)),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,near=Math.round(gz)*w+Math.round(gx);
 const bil=(a:ArrayLike<number>)=>(a[iz*w+ix]*(1-fx)+a[iz*w+ix+1]*fx)*(1-fz)+(a[(iz+1)*w+ix]*(1-fx)+a[(iz+1)*w+ix+1]*fx)*fz;
 if(g.rock&&g.rock.length>=w*w)out.rock=nameIndex(g.rockNames,g.rock[near]);
 if(g.soil&&g.soil.length>=w*w)out.soil=clamp01(bil(g.soil));
 if(g.scree&&g.scree.length>=w*w)out.scree=clamp01(bil(g.scree));
 if(g.strata&&g.strata.length>=w*w)out.strata=bil(g.strata);
 if(g.landform&&g.landform.length>=w*w){const id=g.landform[near];out.landform=g.landforms?.[id]??'';}
 return out;
}
const MEAN=ROCK_KINDS.map(k=>lin(ROCK_PALETTE[k].bands[1]));
/** Multiplier for the grey painterly rock mesh so boulders and rubble take the local rock's colour. */
export function rockTint(w:ArrayLike<number>):[number,number,number]{
 const shale=Math.max(0,1-w[0]-w[1]-w[2]-w[3]),ws=[w[0],w[1],w[2],w[3],shale],out:[number,number,number]=[0,0,0];
 for(let i=0;i<5;i++)for(let c=0;c<3;c++)out[c]+=MEAN[i][c]*ws[i];
 return [Math.min(2.2,out[0]/.4),Math.min(2.2,out[1]/.4),Math.min(2.2,out[2]/.4)];
}
const cache=new WeakMap<object,SurfaceGeology>();
/** One SurfaceGeology per world; built lazily by the renderer on rebuild. */
export function geologyFor(world:GeologyWorld,seed:number,hooks:GeologyHooks):SurfaceGeology{
 let g=cache.get(world);if(!g){g=new SurfaceGeology(world,seed,hooks);cache.set(world,g);}return g;
}
export function peekGeology(world:object):SurfaceGeology|undefined{return cache.get(world);}
export function dropGeology(world:object){cache.delete(world);}
