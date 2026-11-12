/** THIN three.js adapter for Option H carved buildings — UNEXECUTED.
 * node_modules/three were unavailable in the authoring environment, so this
 * file has only been type-read against the three r185 API from memory; it has
 * never been run, rendered or profiled. All structure, triangle and colour
 * logic lives in the pure, tested modules (buildingFamilies, carvedMesh,
 * carvedPalette); this file only wraps their arrays.
 *
 * Plan (mirrors TowerPlatformLayer/instanceCapacity patterns):
 *  - ONE shared MeshStandardMaterial (vertex colours + one 256² grain map,
 *    grain strength per vertex) for every carved building.
 *  - One InstancedMesh per resident (variant key x LOD tier); buildings using
 *    the same variant share geometry. Beyond the far LOD, one instanced
 *    crossed-quad impostor card draw serves every distant building.
 *  - Nothing is created unless the caller selects the 'optionH' render style (src/game/graphics.ts);
 *    the classic renderer remains the default and the fallback. */
import * as THREE from 'three';
import {partsAtLod,renderTierForDistance,type BuildingSpec,type LodTier,type PartAnim,type RenderTier} from './buildingParts';
import {getBuildingGrammar} from './buildingFamilies';
import {carvedVariantFor,prosperityTier,skinKeyPart,variantSpec,type CarvedBuildingInput} from './buildingStyleMap';
import {buildCarvedMesh,impostorCard,type CarvedMeshData} from './carvedMesh';
import {CARVED_GRAIN,CARVED_LIGHT_RIG,getCarvedPalette,specSwatch,woodGrainPixels} from './carvedPalette';
import {ensureInstanceCapacity} from './instanceCapacity';

export const CARVED_LAYER_RULES=Object.freeze({maximumBuckets:192,initialInstances:16,cardInitialInstances:256});

/** Building as seen by the layer: stable generator input plus placement.
 * `y` is the terrain-contact level (Grok's grounding/foundation query). */
export type CarvedInstance=CarvedBuildingInput&{x:number;y:number;z:number;yaw:number;progress?:number;
 /** Angular speed (rad/s, signed) of this building's rotors (water wheel, sails) from the live simulation: 0 stands still. */
 spin?:number};

const srgbToLinear=(c:number)=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);

/** Wrap pure mesh arrays. Vertex colours are authored in sRGB and converted
 * to linear here because three treats colour attributes as linear. */
export function carvedGeometry(data:CarvedMeshData):THREE.BufferGeometry{
 const g=new THREE.BufferGeometry(),lin=new Float32Array(data.colors.length);
 for(let i=0;i<lin.length;i++)lin[i]=srgbToLinear(data.colors[i]);
 g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
 g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
 g.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2));
 g.setAttribute('color',new THREE.BufferAttribute(lin,3));
 g.setAttribute('grain',new THREE.BufferAttribute(data.grain,1));
 g.computeBoundingSphere();g.computeBoundingBox();
 return g;
}

let sharedGrain:THREE.DataTexture|null=null;
export function carvedGrainTexture():THREE.DataTexture{
 if(sharedGrain)return sharedGrain;
 const size=CARVED_GRAIN.textureSize,t=new THREE.DataTexture(woodGrainPixels(size),size,size,THREE.RGBAFormat);
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;
 sharedGrain=t;return t;
}

/** The single shared carved material: vertex colour x grain map, where the
 * per-vertex `grain` attribute (palette grain strength) blends the map in. */
export function createCarvedMaterial():THREE.MeshStandardMaterial{
 const m=new THREE.MeshStandardMaterial({vertexColors:true,map:carvedGrainTexture(),roughness:.86,metalness:0,flatShading:true});
 m.name='carved-h-shared';
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float grain;\nvarying float vGrain;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGrain=grain;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGrain;').replace('#include <map_fragment>','#ifdef USE_MAP\n vec4 sampledDiffuseColor=texture2D(map,vMapUv);\n diffuseColor.rgb*=mix(vec3(1.0),sampledDiffuseColor.rgb,vGrain);\n#endif');
 };
 m.customProgramCacheKey=()=>'carved-h-grain-v1';
 return m;
}

/** Unit crossed-quad impostor (two vertical 1x1 planes through the origin,
 * base at y=0), slightly darker at the top so roofs read against walls. */
export function impostorGeometry():THREE.BufferGeometry{
 const p:number[]=[],c:number[]=[],n:number[]=[];
 const quad=(ax:number,az:number,nx:number,nz:number)=>{const v=[[-ax,0,-az],[ax,0,az],[ax,1,az],[-ax,0,-az],[ax,1,az],[-ax,1,-az]];for(const q of v){p.push(q[0]*.5,q[1],q[2]*.5);const s=q[1]>0?.78:1;c.push(s,s,s);n.push(nx,0,nz);}};
 quad(1,0,0,1);quad(0,1,1,0);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return g;
}

/** One turning assembly (water wheel, sail cross) of a variant: its own instanced mesh built about its pivot, driven per frame. */
type Rotor={mesh:THREE.InstancedMesh;anim:PartAnim;bases:Float32Array;axis:THREE.Vector3;pivot:THREE.Vector3};
type Bucket={mesh:THREE.InstancedMesh;count:number;owners:CarvedInstance[];used:number;rotors:Rotor[]};
export class CarvedBuildingLayer{
 private scene:THREE.Scene;
 private material=createCarvedMaterial();
 private cardMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,side:THREE.DoubleSide});
 private specs=new Map<string,BuildingSpec>();
 private buckets=new Map<string,Bucket>();
 private keys=new Map<string,string|null>();
 private frame=0;
 private phase=new Map<string,number>();private lastPalette=getCarvedPalette();private lastGrammar=getBuildingGrammar();
 private card:{mesh:THREE.InstancedMesh;count:number;owners:CarvedInstance[]};
 private m=new THREE.Matrix4();private q=new THREE.Quaternion();private p=new THREE.Vector3();private s=new THREE.Vector3();private up=new THREE.Vector3(0,1,0);private c=new THREE.Color();
 constructor(scene:THREE.Scene){
  this.scene=scene;
  const mesh=new THREE.InstancedMesh(impostorGeometry(),this.cardMaterial,CARVED_LAYER_RULES.cardInitialInstances);
  mesh.name='carved-h-impostors';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(CARVED_LAYER_RULES.cardInitialInstances*3),3);
  scene.add(mesh);this.card={mesh,count:0,owners:[]};
 }
 /** Stable variant key for an instance, cached per generator-relevant input. */
 private keyFor(b:CarvedInstance){
  const k=`${b.worldSeed}:${b.type}:${b.id}:${b.era}:${b.habitat??''}:${b.footprint.w}x${b.footprint.d}:${b.waterSide??''}:${b.wallAxis??''}:${b.join??''}:${b.gateOpen?'o':''}:${b.settlementSeed??''}:${prosperityTier(b.prosperity)}:${b.reviewWatermill?'mill':''}:${b.lit===false?'cold':'lit'}:${getBuildingGrammar()}:${getCarvedPalette()}:${skinKeyPart(b)}`;
  if(!this.keys.has(k)){const v=carvedVariantFor(b);this.keys.set(k,v?v.key:null);if(v&&!this.specs.has(v.key))this.specs.set(v.key,variantSpec(v));}
  return this.keys.get(k)??null;
 }
 private bucket(variantKey:string,tier:LodTier){
  const key=variantKey+'#'+tier,old=this.buckets.get(key);if(old){old.used=this.frame;return old;}
  if(this.buckets.size>=CARVED_LAYER_RULES.maximumBuckets&&!this.evictOne())return null;
  const spec=this.specs.get(variantKey);if(!spec)return null;
  const animated=partsAtLod(spec,tier).some(p=>p.anim),mk=(geo:THREE.BufferGeometry,name:string)=>{const m=new THREE.InstancedMesh(geo,this.material,CARVED_LAYER_RULES.initialInstances);
   m.name=name;m.count=0;m.castShadow=tier<2;m.receiveShadow=true;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(m);return m;};
  const mesh=mk(carvedGeometry(buildCarvedMesh(spec,tier,animated?{select:p=>!p.anim}:{})),`carved-h-${key}`),rotors:Rotor[]=[];
  if(animated){const seen=new Map<string,PartAnim>();for(const p of partsAtLod(spec,tier))if(p.anim&&!seen.has(p.anim.id))seen.set(p.anim.id,p.anim);
   for(const [id,anim] of seen)rotors.push({mesh:mk(carvedGeometry(buildCarvedMesh(spec,tier,{select:p=>p.anim?.id===id,origin:anim.pivot})),`carved-h-${key}~${id}`),anim,bases:new Float32Array(CARVED_LAYER_RULES.initialInstances*16),axis:new THREE.Vector3(...anim.axis).normalize(),pivot:new THREE.Vector3(...anim.pivot)});}
  const b:Bucket={mesh,count:0,owners:[],used:this.frame,rotors};this.buckets.set(key,b);return b;
 }
 /** C13/WQ-12: free the least-recently-used bucket that this sync has not touched, so near buildings
  * are not stuck as impostors once a long session has visited many variants. */
 private evictOne(){let k:string|null=null,age=Infinity;for(const [key,b] of this.buckets)if(b.used<this.frame&&b.used<age){age=b.used;k=key;}
  if(k===null)return false;const b=this.buckets.get(k)!;this.disposeBucket(b);this.buckets.delete(k);return true;}
 private disposeBucket(b:Bucket){for(const m of[b.mesh,...b.rotors.map(r=>r.mesh)]){m.parent?.remove(m);m.geometry.dispose();m.dispose();}}
 /** Rebuild instance lists. Codex's culling hook should pre-filter
  * `instances` to the camera frustum; this layer only picks LOD by distance. */
 sync(instances:readonly CarvedInstance[],camera:THREE.Vector3,tierFor:(m:number)=>RenderTier=renderTierForDistance){
  if(this.lastPalette!==getCarvedPalette()||this.lastGrammar!==getBuildingGrammar()){this.lastPalette=getCarvedPalette();this.lastGrammar=getBuildingGrammar();this.reset();}
  this.frame++;for(const b of this.buckets.values()){b.count=0;b.owners.length=0;}this.card.count=0;this.card.owners.length=0;
  for(const inst of instances){
   const key=this.keyFor(inst);if(!key)continue;
   const tier=tierFor(Math.hypot(inst.x-camera.x,inst.z-camera.z));
   const grow=Math.max(.15,Math.min(1,inst.progress??1));
   if(tier<3){const b=this.bucket(key,tier as LodTier);if(b){
     if(b.count>=b.mesh.instanceMatrix.count)b.mesh=ensureInstanceCapacity(this.scene,b.mesh,b.count+1);
     this.q.setFromAxisAngle(this.up,inst.yaw);this.p.set(inst.x,inst.y,inst.z);this.s.set(1,grow,1);this.m.compose(this.p,this.q,this.s);
     b.mesh.setMatrixAt(b.count,this.m);
     for(const ro of b.rotors){if(b.count>=ro.mesh.instanceMatrix.count)ro.mesh=ensureInstanceCapacity(this.scene,ro.mesh,b.count+1);if((b.count+1)*16>ro.bases.length){const g=new Float32Array(Math.max(ro.bases.length*2,(b.count+1)*16));g.set(ro.bases);ro.bases=g;}this.m.toArray(ro.bases,b.count*16);}
     b.count++;b.owners.push(inst);continue;}}
   const spec=this.specs.get(key);if(!spec)continue;const card=impostorCard(spec);
   if(this.card.count>=this.card.mesh.instanceMatrix.count)this.card.mesh=ensureInstanceCapacity(this.scene,this.card.mesh,this.card.count+1);
   this.q.setFromAxisAngle(this.up,inst.yaw);this.p.set(inst.x,inst.y,inst.z);this.s.set(card.width,card.height*grow,card.depth);this.m.compose(this.p,this.q,this.s);
   this.c.set(specSwatch(spec.materials,card.wall).hex);this.card.mesh.setMatrixAt(this.card.count,this.m);this.card.mesh.setColorAt(this.card.count,this.c);this.card.count++;this.card.owners.push(inst);
  }
  for(const b of this.buckets.values()){b.mesh.count=b.count;b.mesh.visible=b.count>0;b.mesh.instanceMatrix.needsUpdate=true;for(const ro of b.rotors){ro.mesh.count=b.count;ro.mesh.visible=b.count>0;}}
  this.animate(0);
  const cm=this.card.mesh;cm.count=this.card.count;cm.visible=this.card.count>0;cm.instanceMatrix.needsUpdate=true;if(cm.instanceColor)cm.instanceColor.needsUpdate=true;
 }
 private base=new THREE.Matrix4();private local=new THREE.Matrix4();private rq=new THREE.Quaternion();private one=new THREE.Vector3(1,1,1);
 /** Turn every rotor by its building's live `spin` (call each frame; cheap: only buildings with wheels or sails are touched). */
 animate(dt:number){
  for(const b of this.buckets.values()){
   if(!b.rotors.length||!b.count)continue;
   for(const [i,o] of b.owners.entries()){
    const k=o.type+':'+o.id,ph=((this.phase.get(k)??((o.id*2.399)%(Math.PI*2)))+(o.spin??0)*dt)%(Math.PI*2);this.phase.set(k,ph);
    for(const ro of b.rotors){this.base.fromArray(ro.bases,i*16);this.rq.setFromAxisAngle(ro.axis,ph);this.local.compose(ro.pivot,this.rq,this.one);this.base.multiply(this.local);ro.mesh.setMatrixAt(i,this.base);}
   }
   for(const ro of b.rotors)ro.mesh.instanceMatrix.needsUpdate=true;
  }
 }
 /** Drop every cached mesh (palette or grammar switched). */
 reset(){for(const b of this.buckets.values())this.disposeBucket(b);this.buckets.clear();this.specs.clear();this.keys.clear();}
 /** For picking: mesh -> owning instances in draw order. */
 sources(){const out=new Map<THREE.InstancedMesh,CarvedInstance[]>();for(const b of this.buckets.values())out.set(b.mesh,b.owners);out.set(this.card.mesh,this.card.owners);return out;}
 /** Picking: every drawn mesh including the turning rotors (a click on the wheel selects its building). */
 pickSources(){const out=this.sources();for(const b of this.buckets.values())for(const ro of b.rotors)out.set(ro.mesh,b.owners);return out;}
 stats(){let tris=0;for(const b of this.buckets.values())tris+=b.count*((b.mesh.geometry.getAttribute('position')?.count??0)/3);return {buckets:this.buckets.size,drawCalls:[...this.buckets.values()].filter(b=>b.count>0).length+(this.card.count?1:0),triangles:tris+this.card.count*4};}
 dispose(){
  for(const b of this.buckets.values())this.disposeBucket(b);
  this.buckets.clear();this.card.mesh.parent?.remove(this.card.mesh);this.card.mesh.geometry.dispose();this.card.mesh.dispose();
  this.material.dispose();this.cardMaterial.dispose();this.specs.clear();this.keys.clear();
 }
}

/** Apply the warm H light rig; returns a function restoring the previous
 * (classic) values so switching back is lossless. */
export function applyCarvedLightRig(o:{renderer:THREE.WebGLRenderer;hemi:THREE.HemisphereLight;sun:THREE.DirectionalLight;bounce?:THREE.DirectionalLight;scene?:THREE.Scene}){
 const prev={tm:o.renderer.toneMapping,ex:o.renderer.toneMappingExposure,sky:o.hemi.color.clone(),ground:o.hemi.groundColor.clone(),hi:o.hemi.intensity,sun:o.sun.color.clone(),si:o.sun.intensity,b:o.bounce?.color.clone(),bi:o.bounce?.intensity,fog:o.scene?.fog};
 const R=CARVED_LIGHT_RIG;
 o.renderer.toneMapping=THREE.NeutralToneMapping;o.renderer.toneMappingExposure=R.exposure;
 o.hemi.color.set(R.hemiSky);o.hemi.groundColor.set(R.hemiGround);o.hemi.intensity=R.hemiIntensity;
 o.sun.color.set(R.sun);o.sun.intensity=R.sunIntensity;
 if(o.bounce){o.bounce.color.set(R.bounce);o.bounce.intensity=R.bounceIntensity;}
 if(o.scene)o.scene.fog=new THREE.Fog(R.fog,R.fogNearMetres,R.fogFarMetres);
 return ()=>{o.renderer.toneMapping=prev.tm;o.renderer.toneMappingExposure=prev.ex;o.hemi.color.copy(prev.sky);o.hemi.groundColor.copy(prev.ground);o.hemi.intensity=prev.hi;o.sun.color.copy(prev.sun);o.sun.intensity=prev.si;
  if(o.bounce&&prev.b){o.bounce.color.copy(prev.b);o.bounce.intensity=prev.bi??o.bounce.intensity;}if(o.scene)o.scene.fog=prev.fog??null;};
}
