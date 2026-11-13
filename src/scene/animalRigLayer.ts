/** Instanced renderer for rigged animals (quadrupeds, birds, fish). One InstancedMesh per (model, tier, part): near animals pose every bone on the CPU
 * (instance matrices, no skinning), mid animals four or five rigid pieces, far animals one static silhouette. Coat detail (mottling, fawn spots,
 * piglet stripes, winter greying) is a small shader chunk driven by a per-instance attribute and the vertex `rig` position, so it is seamless over parts.
 * The old merged low-poly meshes stay in world.ts as invisible picking proxies; this layer only draws. */
import * as THREE from 'three';
import type {RigModel} from './animalRig';

export type CoatState={spots:number;winter:number;seed:number;tint:[number,number,number];scale:number};
export type Draw={model:RigModel;/** world position of the ground point under the animal */x:number;y:number;z:number;facing:number;size:number;
 /** bone matrices in the rig frame (near/mid); lift raises the rig so the feet stand on y */mats?:Map<string,THREE.Matrix4>;lift:number;coat:CoatState;
 tier:0|1|2;/** extra whole-body rotation before placement (corpse) */rx?:number;rz?:number;hidden?:readonly string[]};
type Slot={mesh:THREE.InstancedMesh;n:number;cap:number;coat:THREE.InstancedBufferAttribute;geo:THREE.BufferGeometry;cast:boolean};
export const ANIMAL_LOD_METRES=[34,80] as const;
export const tierForDistance=(d:number):0|1|2=>d<ANIMAL_LOD_METRES[0]?0:d<ANIMAL_LOD_METRES[1]?1:2;
const CHUNK_V=`attribute vec3 rig;attribute vec4 aCoat;varying vec3 vRig;varying vec4 vCoat;`;
const CHUNK_F=`varying vec3 vRig;varying vec4 vCoat;
float h31(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const COLOR_F=`#include <color_fragment>
{
 vec3 q=vRig*vCoat.w+vec3(vCoat.z*7.0);
 float n=vn(q*7.0)*.6+vn(q*19.0)*.4;
 diffuseColor.rgb*=0.88+0.24*n;
 float up=smoothstep(-0.12*vCoat.w*0.0-0.5,0.0,vRig.y*vCoat.w);
 if(vCoat.x>0.01){
  vec3 c=q*15.0;vec3 i=floor(c);vec3 f=fract(c);float best=9.0;
  for(int dx=-1;dx<=1;dx++)for(int dy=-1;dy<=1;dy++)for(int dz=-1;dz<=1;dz++){vec3 o=vec3(float(dx),float(dy),float(dz));vec3 cell=i+o;vec3 ctr=vec3(h31(cell),h31(cell+7.3),h31(cell+3.1));best=min(best,distance(f,o+ctr));}
  float sp=1.0-smoothstep(.2,.3,best);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.5,.32),sp*vCoat.x*up);
 }else if(vCoat.x<-0.01){
  float band=smoothstep(.35,.5,abs(fract(vRig.y*vCoat.w*9.0)-.5)*2.0);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.42,.26),band*(-vCoat.x)*up);
 }
 float g=dot(diffuseColor.rgb,vec3(.3,.5,.2));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(g*1.08),clamp(vCoat.y,0.,1.)*.6);
}`;
export function animalMaterial():THREE.MeshLambertMaterial{
 const mat=new THREE.MeshLambertMaterial({vertexColors:true});
 mat.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+CHUNK_V).replace('#include <begin_vertex>','#include <begin_vertex>\nvRig=rig;vCoat=aCoat;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+CHUNK_F).replace('#include <color_fragment>',COLOR_F);
 };
 mat.customProgramCacheKey=()=>'animal-coat-1';
 return mat;
}
const _m=new THREE.Matrix4(),_b=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new THREE.Vector3(),_s=new THREE.Vector3(),_c=new THREE.Color();
export class AnimalRigLayer{
 readonly material=animalMaterial();readonly slots=new Map<string,Slot>();stats={animals:0,instances:0,draws:0,triangles:[0,0,0] as [number,number,number],byTier:[0,0,0] as [number,number,number]};
 private touched=new Set<string>();
 constructor(private scene:THREE.Scene,private shadows=true){}
 beginFrame(){for(const s of this.slots.values())s.n=0;this.touched.clear();this.stats={animals:0,instances:0,draws:0,triangles:[0,0,0],byTier:[0,0,0]};}
 private slot(key:string,geo:THREE.BufferGeometry,need:number,cast:boolean):Slot{
  let s=this.slots.get(key);
  if(s&&s.cap>=need)return s;
  const cap=Math.max(need,s?s.cap*2:8);
  const old=s;
  const g=geo.clone();const coat=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4);coat.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aCoat',coat);
  const mesh=new THREE.InstancedMesh(g,this.material,cap);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=cast&&this.shadows;mesh.receiveShadow=false;mesh.count=0;mesh.name='animal:'+key;
  mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);
  if(old){mesh.instanceMatrix.array.set(old.mesh.instanceMatrix.array.subarray(0,old.n*16));mesh.instanceColor!.array.set(old.mesh.instanceColor!.array.subarray(0,old.n*3));coat.array.set(old.coat.array.subarray(0,old.n*4));
   this.scene.remove(old.mesh);old.mesh.dispose();old.geo.dispose();}
  this.scene.add(mesh);
  const next:Slot={mesh,n:old?old.n:0,cap,coat,geo:g,cast};this.slots.set(key,next);return next;
 }
 /** Count first so slots grow once: call `add` for every animal after beginFrame; instance arrays are written immediately. */
 add(d:Draw){
  const {model,tier}=d;this.stats.animals++;this.stats.byTier[tier]++;
  _e.set(d.rx??0,d.facing,d.rz??0,'YXZ');_q.setFromEuler(_e);_p.set(d.x,d.y+d.lift*d.size,d.z);_s.setScalar(d.size);const base=_m.compose(_p,_q,_s).clone();
  const put=(key:string,geo:THREE.BufferGeometry,local:THREE.Matrix4|null,cast:boolean)=>{
   const need=(this.slots.get(key)?.n??0)+1,s=this.slot(key,geo,need,cast);
   _b.copy(base);if(local)_b.multiply(local);
   s.mesh.setMatrixAt(s.n,_b);_c.setRGB(d.coat.tint[0],d.coat.tint[1],d.coat.tint[2]);s.mesh.setColorAt(s.n,_c);
   s.coat.setXYZW(s.n,d.coat.spots,d.coat.winter,d.coat.seed,d.coat.scale);
   s.n++;this.stats.instances++;this.touched.add(key);
   const idx=geo.index?geo.index.count:geo.getAttribute('position').count;this.stats.triangles[tier]+=idx/3;
  };
  if(tier===2){put(model.key+'|2',model.far,null,false);return;}
  if(!d.mats)return;
  if(tier===1){for(const p of model.mid)for(const b of p.bones){const mm=d.mats.get(b);if(mm)put(model.key+'|1|'+p.name,p.geo,mm,p.name==='body');}return;}
  for(const b of model.bones){const g=model.geo[b.part];if(!g||d.hidden?.includes(b.part))continue;const mm=d.mats.get(b.id);if(mm)put(model.key+'|0|'+b.part,g,mm,b.part==='torso'||b.part==='neck'||b.part==='head');}
 }
 endFrame(){
  for(const [k,s] of this.slots){
   s.mesh.count=s.n;s.mesh.visible=s.n>0;
   if(s.n>0){s.mesh.instanceMatrix.needsUpdate=true;if(s.mesh.instanceColor)s.mesh.instanceColor.needsUpdate=true;s.coat.needsUpdate=true;this.stats.draws++;}
   void k;
  }
 }
 dispose(){for(const s of this.slots.values()){this.scene.remove(s.mesh);s.mesh.dispose();s.geo.dispose();}this.slots.clear();this.material.dispose();}
}
