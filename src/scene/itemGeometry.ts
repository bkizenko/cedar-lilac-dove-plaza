/** ITEM GEOMETRY: the three.js side of item meshes. One shared BufferGeometry per (id, era, skin, condition, seed, LOD), vertex colours converted to
 *  linear once, and an instancing layer so a hundred identical spears are one draw call. Everything model-making lives in itemModels.ts (pure). */
import * as THREE from 'three';
import type {ItemMesh} from './itemMesh';
import {buildItem,itemKey} from './itemModels';
import type {ItemReq} from './itemKit';

const linear=(c:Float32Array)=>{const o=new Float32Array(c.length),k=new THREE.Color();for(let i=0;i<c.length;i+=3){k.setRGB(c[i],c[i+1],c[i+2],THREE.SRGBColorSpace);o[i]=k.r;o[i+1]=k.g;o[i+2]=k.b;}return o;};
export function meshGeometry(m:ItemMesh):THREE.BufferGeometry{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(m.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(m.normals,3));g.setAttribute('color',new THREE.BufferAttribute(linear(m.colors),3));
 g.computeBoundingSphere();return g;
}
const geos=new Map<string,THREE.BufferGeometry|null>();
/** Shared geometry for a request, cached by key; null for an unknown id. */
export function itemGeometry(req:ItemReq):THREE.BufferGeometry|null{
 const key=itemKey(req);if(geos.has(key))return geos.get(key)!;
 const m=buildItem(req),g=m?meshGeometry(m):null;if(geos.size>400){for(const v of geos.values())v?.dispose();geos.clear();}geos.set(key,g);return g;
}
export function disposeItemGeometries(){for(const v of geos.values())v?.dispose();geos.clear();}
/** The one vertex-colour material every item shares. */
let mat:THREE.MeshStandardMaterial|null=null;
export const itemMaterial=()=>mat??(mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.04}));

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
