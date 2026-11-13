/** ITEM GEOMETRY: the three.js side of item meshes. One shared BufferGeometry per (id, era, skin, condition, seed, LOD), vertex colours converted to
 *  linear once, and an instancing layer so a hundred identical spears are one draw call. Everything model-making lives in itemModels.ts (pure). */
import * as THREE from 'three';
import type {ItemMesh} from './itemMesh';
import {buildItem,itemKey} from './itemModels';
import type {ItemReq} from './itemKit';
import {buildAtlas,atlasGpuBytes,ATLAS_SIZE,TILE_COUNT,DECAL_GRID,type Atlas} from './itemTexture';

const linear=(c:Float32Array)=>{const o=new Float32Array(c.length),k=new THREE.Color();for(let i=0;i<c.length;i+=3){k.setRGB(c[i],c[i+1],c[i+2],THREE.SRGBColorSpace);o[i]=k.r;o[i+1]=k.g;o[i+2]=k.b;}return o;};
export function meshGeometry(m:ItemMesh):THREE.BufferGeometry{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(m.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(m.normals,3));g.setAttribute('color',new THREE.BufferAttribute(linear(m.colors),3));
 const nv=m.positions.length/3;
 // surface layer: (u,v,layer), decal (u,v,cellA,cellB) and the two decal colours; a mesh without them (hand-built) gets the neutral layer
 g.setAttribute('aTex',new THREE.BufferAttribute(m.uvs&&m.uvs.length===nv*3?m.uvs:new Float32Array(nv*3),3));
 g.setAttribute('aDec',new THREE.BufferAttribute(m.decals&&m.decals.length===nv*4?m.decals:new Float32Array(nv*4),4));
 const acc=m.accents&&m.accents.length===nv*8?m.accents:new Uint8Array(nv*8),a1=new Uint8Array(nv*4),a2=new Uint8Array(nv*4);
 for(let i=0;i<nv;i++){for(let k=0;k<4;k++){a1[i*4+k]=acc[i*8+k];a2[i*4+k]=acc[i*8+4+k];}}
 g.setAttribute('aAccA',new THREE.BufferAttribute(a1,4,true));g.setAttribute('aAccB',new THREE.BufferAttribute(a2,4,true));
 g.computeBoundingSphere();return g;
}
const geos=new Map<string,THREE.BufferGeometry|null>();
/** Shared geometry for a request, cached by key; null for an unknown id. */
export function itemGeometry(req:ItemReq):THREE.BufferGeometry|null{
 const key=itemKey(req);if(geos.has(key))return geos.get(key)!;
 const m=buildItem(req),g=m?meshGeometry(m):null;if(geos.size>400){for(const v of geos.values())v?.dispose();geos.clear();}geos.set(key,g);return g;
}
export function disposeItemGeometries(){for(const v of geos.values())v?.dispose();geos.clear();}
// ---------------------------------------------------------------------------------------------------------------- the one material
/** Live knobs of the shared item material. `env` scales the painted sky reflection that makes metal read as metal (no env map needed);
 *  `normal` scales the grain/hammer relief. Callers (a day/night driver) may change them at any time. */
export const ITEM_SURFACE={env:{value:2.6},normal:{value:1}};
let atlas:Atlas|null=null,texs:{detail:THREE.DataArrayTexture;mat:THREE.DataArrayTexture;decal:THREE.DataTexture}|null=null;
/** Build the atlas and its three GPU textures once (seeded; no network). */
export function itemTextures(){
 if(texs)return texs;
 atlas=buildAtlas(1);const S=ATLAS_SIZE,mk=(data:Uint8Array)=>{const t=new THREE.DataArrayTexture(data,S,S,TILE_COUNT);t.format=THREE.RGBAFormat;t.type=THREE.UnsignedByteType;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.anisotropy=4;t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;return t;};
 const decal=new THREE.DataTexture(atlas.decal,atlas.decalSize,atlas.decalSize,THREE.RedFormat,THREE.UnsignedByteType);decal.minFilter=THREE.LinearMipmapLinearFilter;decal.magFilter=THREE.LinearFilter;decal.generateMipmaps=true;decal.wrapS=THREE.ClampToEdgeWrapping;decal.wrapT=THREE.ClampToEdgeWrapping;decal.unpackAlignment=1;decal.colorSpace=THREE.NoColorSpace;decal.needsUpdate=true;
 texs={detail:mk(atlas.detail),mat:mk(atlas.material),decal};return texs;
}
/** What the atlas costs: bytes on the GPU (mipmapped), layers, generation time. */
export const itemTextureStats=()=>{const a=atlas??buildAtlas(1);return {layers:a.layers,size:ATLAS_SIZE,gpuBytes:atlasGpuBytes(a),cpuBytes:a.bytes,generateMs:+a.ms.toFixed(1),textures:3};};
export function disposeItemTextures(){if(texs){texs.detail.dispose();texs.mat.dispose();texs.decal.dispose();texs=null;}}
const VERT_DECL=`attribute vec3 aTex;attribute vec4 aDec;attribute vec4 aAccA;attribute vec4 aAccB;varying vec3 vTexC;varying vec4 vDecC;varying vec3 vAccAC;varying vec3 vAccBC;`;
const FRAG_DECL=`uniform highp sampler2DArray uDetail;uniform highp sampler2DArray uMatTex;uniform highp sampler2D uDecal;uniform float uEnvK;uniform float uNormK;
varying vec3 vTexC;varying vec4 vDecC;varying vec3 vAccAC;varying vec3 vAccBC;
float decalCover(float cell,vec2 uv){float c=floor(cell+.5);if(c<.5)return 0.0;vec2 o=vec2(mod(c,${DECAL_GRID}.0),floor(c/${DECAL_GRID}.0))/${DECAL_GRID}.0;return texture(uDecal,o+clamp(uv,.004,.996)/${DECAL_GRID}.0).r;}`;
/** The one material every item shares: vertex colour (hue, patina, wear) x detail layer (grain, weave, hammering) with a tangent-space relief, per-texel roughness and metalness, painted decals
 *  (shield motifs and civ emblems in the society's colours) and a painted sky reflection on metal. Draw calls stay bounded: one program, one material, three textures. */
let mat:THREE.MeshStandardMaterial|null=null;
export const itemMaterial=()=>{
 if(mat)return mat;
 const t=itemTextures();
 mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:1});mat.name='item-surface';
 mat.onBeforeCompile=sh=>{
  sh.uniforms.uDetail={value:t.detail};sh.uniforms.uMatTex={value:t.mat};sh.uniforms.uDecal={value:t.decal};sh.uniforms.uEnvK=ITEM_SURFACE.env;sh.uniforms.uNormK=ITEM_SURFACE.normal;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+VERT_DECL).replace('#include <begin_vertex>','#include <begin_vertex>\nvTexC=aTex;vDecC=aDec;vAccAC=aAccA.rgb;vAccBC=aAccB.rgb;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+FRAG_DECL)
   .replace('#include <color_fragment>',`#include <color_fragment>
vec4 dT=texture(uDetail,vTexC);vec4 mT=texture(uMatTex,vTexC);
float decA=decalCover(vDecC.z,vDecC.xy),decB=decalCover(vDecC.w,vDecC.xy);
diffuseColor.rgb*=dT.rgb*2.0;
vec3 gr=clamp(dT.rgb*2.0,.65,1.3);
diffuseColor.rgb=mix(diffuseColor.rgb,pow(vAccAC,vec3(2.2))*gr,decA*.94);
diffuseColor.rgb=mix(diffuseColor.rgb,pow(vAccBC,vec3(2.2))*gr,decB*.94);
float paintK=clamp(decA+decB,0.0,1.0);`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(mT.b,.82,paintK);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mT.a*(1.0-paintK);')
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{vec3 nm=vec3(mT.rg*2.0-1.0,0.0);nm.xy*=uNormK*(1.0-paintK*.6);nm.z=sqrt(max(0.0,1.0-dot(nm.xy,nm.xy)));
 vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);vec2 s0=dFdx(vTexC.xy),s1=dFdy(vTexC.xy);vec3 q1p=cross(q1,normal),q0p=cross(normal,q0);
 vec3 Tt=q1p*s0.x+q0p*s1.x,Bt=q1p*s0.y+q0p*s1.y;float det=max(dot(Tt,Tt),dot(Bt,Bt));float sc=(det==0.0)?0.0:inversesqrt(det);
 if(sc>0.0)normal=normalize(mat3(Tt*sc,Bt*sc,normal)*nm);}`)
   .replace('#include <aomap_fragment>',`#include <aomap_fragment>
{vec3 Vv=normalize(vViewPosition);vec3 Rw=inverseTransformDirection(reflect(-Vv,normal),viewMatrix);float up=Rw.y;
 vec3 sky=mix(vec3(.46,.40,.31),vec3(.80,.86,.94),smoothstep(-.15,.75,up));sky+=vec3(.95,.88,.74)*exp(-pow((up-.14)*5.0,2.0))*.85;
 vec3 sunD=normalize(vec3(-.45,.72,.52));sky+=vec3(1.0,.93,.8)*pow(max(dot(Rw,sunD),0.0),22.0)*1.5;
 float fr=pow(1.0-saturate(dot(normal,Vv)),3.0);
 reflectedLight.indirectSpecular+=sky*material.specularColor*metalnessFactor*uEnvK*(1.0-roughnessFactor*.6)*(.6+.8*fr);}`);
 };
 mat.customProgramCacheKey=()=>'item-surface-v3';
 return mat;
};
/** a plain vertex-colour material (the v2 look), for comparison renders and as a fallback when textures are unavailable */
export const plainItemMaterial=()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.04});

/** Instanced draw of one item model: call `set(i, matrix)` for each placement, then `commit(n)`. Grows by doubling. */
export class ItemInstancer{
 readonly mesh:THREE.InstancedMesh;private cap:number;
 constructor(readonly geometry:THREE.BufferGeometry,material:THREE.Material=itemMaterial(),capacity=16){
  this.cap=capacity;this.mesh=new THREE.InstancedMesh(geometry,material,capacity);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 }
 ensure(n:number){
  if(n<=this.cap)return;let c=this.cap;while(c<n)c*=2;
  const attr=new THREE.InstancedBufferAttribute(new Float32Array(c*16),16);attr.setUsage(THREE.DynamicDrawUsage);attr.array.set(this.mesh.instanceMatrix.array.subarray(0,this.cap*16));
  this.mesh.instanceMatrix=attr;this.cap=c;
 }
 set(i:number,m:THREE.Matrix4){this.ensure(i+1);m.toArray(this.mesh.instanceMatrix.array as unknown as number[],i*16);}
 commit(n:number){this.mesh.count=n;this.mesh.visible=n>0;this.mesh.instanceMatrix.needsUpdate=true;}
 dispose(){this.mesh.dispose();}
}
