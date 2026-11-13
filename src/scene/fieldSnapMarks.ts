import * as THREE from 'three';
import type {SnapEdge} from '../game/fieldSnap';
/** Warm ribbon laid along the seam where a field being placed snaps to its neighbour. Render only. */
export class FieldSnapMarks{
 private scene:THREE.Scene;private height:(x:number,z:number)=>number;
 private mesh:THREE.Mesh;private positions:Float32Array;private readonly maxEdges=12;private readonly seg=24;
 constructor(scene:THREE.Scene,height:(x:number,z:number)=>number){
  this.scene=scene;this.height=height;
  this.positions=new Float32Array(this.maxEdges*this.seg*6*3);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));geo.setDrawRange(0,0);
  this.mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xf2c76b,transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  this.mesh.frustumCulled=false;this.mesh.renderOrder=20;this.mesh.visible=false;this.mesh.raycast=()=>{};scene.add(this.mesh);
 }
 set(edges:readonly SnapEdge[]){
  if(!edges.length){this.mesh.visible=false;return;}
  let v=0;const P=this.positions,half=.3;
  for(const e of edges.slice(0,this.maxEdges)){
   const len=Math.hypot(e.x1-e.x0,e.z1-e.z0);if(len<.1)continue;
   const ux=(e.x1-e.x0)/len,uz=(e.z1-e.z0)/len,nx=-uz*half,nz=ux*half,n=Math.max(1,Math.min(this.seg,Math.ceil(len/2)));
   for(let i=0;i<n;i++){
    const t0=i/n,t1=(i+1)/n,ax=e.x0+(e.x1-e.x0)*t0,az=e.z0+(e.z1-e.z0)*t0,bx=e.x0+(e.x1-e.x0)*t1,bz=e.z0+(e.z1-e.z0)*t1,ya=this.height(ax,az)+.32,yb=this.height(bx,bz)+.32;
    const q=[[ax-nx,ya,az-nz],[ax+nx,ya,az+nz],[bx+nx,yb,bz+nz],[ax-nx,ya,az-nz],[bx+nx,yb,bz+nz],[bx-nx,yb,bz-nz]];
    for(const p of q){P[v++]=p[0];P[v++]=p[1];P[v++]=p[2];}
   }
  }
  const g=this.mesh.geometry;(g.attributes.position as THREE.BufferAttribute).needsUpdate=true;g.setDrawRange(0,v/3);this.mesh.visible=v>0;
 }
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();}
}
