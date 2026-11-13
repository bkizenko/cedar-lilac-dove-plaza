import * as THREE from 'three';
import {makeBotanicalFarMaterial,makeFarFade,type FarFade} from './botanicalMaterial';
import {painterFarClustered,painterFarNeedle} from './painterTrees';
/** GPU side of the cosmetic filler forest: far crowns and rooted trunks for individual filler trees beyond the mid-detail trees, and merged low-poly horizon
 * crowns ("blobs"). Instanced, one shared shader program, never picked (raycast disabled), never shadow-casting, never part of any resource list.
 * Individual far crowns fade OUT and blobs fade IN over the same metres with a screen-door dither (complementary patterns), and blobs fade out again at the
 * last distance the budget reaches, so the hand-over and the outer limit are not visible as a line. */
const unit=(g:THREE.BufferGeometry)=>{g.computeBoundingBox();const b=g.boundingBox!,c=b.getCenter(new THREE.Vector3()),h=b.getSize(new THREE.Vector3()).multiplyScalar(.5);g.translate(-c.x,-c.y,-c.z);g.scale(1/h.x,1/h.y,1/h.z);g.computeBoundingBox();return g;};
/** Lighter on top, darker under the crown (baked, like the painter far crowns), so a lone blob reads as a lit mass. */
function shaded(g:THREE.BufferGeometry){const p=g.getAttribute('position'),a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=.7+.4*(p.getY(i)+1)/2;a[i*3]=v;a[i*3+1]=v;a[i*3+2]=v*.96;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
export const FILLER_BLOB_TRIANGLES={round:20,needle:12} as const;
type Pool={mesh:THREE.InstancedMesh;n:number};
export class FillerLayer{
 readonly farFade:FarFade=makeFarFade();readonly blobFade:FarFade=makeFarFade();
 private farMat:THREE.MeshStandardMaterial;private blobMat:THREE.MeshStandardMaterial;private scene:THREE.Scene;
 private crowns:Pool[];private trunk:Pool;private blobs:Pool[];
 constructor(scene:THREE.Scene){
  this.scene=scene;this.farMat=makeBotanicalFarMaterial(this.farFade);this.blobMat=makeBotanicalFarMaterial(this.blobFade);
  const trunkGeo=new THREE.CylinderGeometry(1,1,1,5).translate(0,.5,0),a=new Float32Array(trunkGeo.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([.2,.12,.07],i);trunkGeo.setAttribute('color',new THREE.BufferAttribute(a,3));
  this.trunk=this.pool(trunkGeo,this.farMat,'filler-far-trunk',false);
  this.crowns=[this.pool(unit(painterFarClustered()),this.farMat,'filler-far-crown'),this.pool(unit(painterFarNeedle()),this.farMat,'filler-far-needle')];
  this.blobs=[this.pool(shaded(new THREE.IcosahedronGeometry(1,0)),this.blobMat,'filler-horizon-crown',true,true),this.pool(shaded(new THREE.ConeGeometry(1,2,6,1)),this.blobMat,'filler-horizon-needle',true,true)];
 }
 private pool(geo:THREE.BufferGeometry,mat:THREE.Material,name:string,colored=true,pickable=false):Pool{
  const mesh=new THREE.InstancedMesh(geo,mat,64);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;if(!pickable)mesh.raycast=()=>{};
  if(colored)mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(64*3),3);this.scene.add(mesh);return {mesh,n:0};
 }
 private push(p:Pool,m:THREE.Matrix4,c?:THREE.Color){
  if(p.n>=p.mesh.instanceMatrix.count){
   const old=p.mesh,cap=Math.max(64,old.instanceMatrix.count*2),mesh=new THREE.InstancedMesh(old.geometry,old.material,cap);mesh.name=old.name;mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;if(old.raycast===THREE.Mesh.prototype.raycast||old.raycast===THREE.InstancedMesh.prototype.raycast){/* pickable pool keeps default raycast */}else mesh.raycast=()=>{};
   mesh.instanceMatrix.array.set(old.instanceMatrix.array);if(old.instanceColor){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);(mesh.instanceColor.array as Float32Array).set(old.instanceColor.array as Float32Array);}
   this.scene.remove(old);old.dispose();this.scene.add(mesh);p.mesh=mesh;
  }
  p.mesh.setMatrixAt(p.n,m);if(c)p.mesh.setColorAt(p.n,c);p.n++;
 }
 begin(){this.trunk.n=0;for(const p of this.crowns)p.n=0;for(const p of this.blobs)p.n=0;}
 addTrunk(m:THREE.Matrix4){this.push(this.trunk,m);}
 addCrown(needle:boolean,m:THREE.Matrix4,c:THREE.Color){this.push(this.crowns[needle?1:0],m,c);}
 addBlob(needle:boolean,m:THREE.Matrix4,c:THREE.Color){this.push(this.blobs[needle?1:0],m,c);}
 /** Fade ranges. Individual crowns: out over [detail-fade, detail]; blobs: in over the same range, out over [far-fade, far]. fade 0 disables (hard edges). */
 setFades(detail:number,far:number,fade:number){
  if(fade<=0){this.farFade.value.set(1e9,1e9+1,-2,-1);this.blobFade.value.set(1e9,1e9+1,-2,-1);return;}
  this.farFade.value.set(detail-fade,detail,-2,-1);
  this.blobFade.value.set(far-fade*1.5,far,detail-fade,detail);
 }
 finish(){
  for(const p of [this.trunk,...this.crowns,...this.blobs]){p.mesh.count=p.n;p.mesh.visible=p.n>0;p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;}
 }
 stats(){return {trunks:this.trunk.n,crowns:this.crowns[0].n+this.crowns[1].n,blobs:this.blobs[0].n+this.blobs[1].n,
  triangles:this.trunk.n*48+this.crowns[0].n*240+this.crowns[1].n*92+this.blobs[0].n*FILLER_BLOB_TRIANGLES.round+this.blobs[1].n*FILLER_BLOB_TRIANGLES.needle};}
 /** The pooled horizon-crown mesh (0 round, 1 needle). Pickable: the first instances are sim trees' cheap far crowns, the rest are cosmetic and have no id. */
 blobMesh(i:number){return this.blobs[i].mesh;}
 meshes(){return [this.trunk,...this.crowns,...this.blobs].map(p=>p.mesh);}
 dispose(){for(const p of [this.trunk,...this.crowns,...this.blobs]){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.dispose();}this.farMat.dispose();this.blobMat.dispose();}
}
