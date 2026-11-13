import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Game} from '../game/sim';
import {ditchesOf,ditchComplete,irrigationEnabled,type LiftKind} from '../game/irrigation';
/** Ditches drawn on the terrain (a raised earth lip and a bed that darkens to water once the ditch is finished), a preview line while planning,
 * and a small shaduf or water wheel at the intake. Render only: nothing here writes game state. Muted colours. */
type Preview={x0:number;z0:number;x1:number;z1:number;ok:boolean};
const MAX_SEGMENTS=1400;
const col=(hex:string)=>new THREE.Color(hex);
function part(g:THREE.BufferGeometry,hex:string){const c=col(hex),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));g.deleteAttribute('uv');return g.index?g.toNonIndexed():g;}
function shadufGeometry(){
 const wood='#6d5a3c',stone='#8a857a',parts:THREE.BufferGeometry[]=[];
 for(const x of [-.35,.35]){const p=new THREE.BoxGeometry(.14,1.7,.14);p.translate(x,.85,0);parts.push(part(p,wood));}
 const beam=new THREE.BoxGeometry(.12,.12,3.1);beam.translate(0,0,.2);beam.rotateX(-.22);beam.translate(0,1.65,0);parts.push(part(beam,wood));
 const w=new THREE.DodecahedronGeometry(.34,0);w.translate(0,1.2,-1.45);parts.push(part(w,stone));
 const b=new THREE.CylinderGeometry(.2,.15,.3,6);b.translate(0,.85,1.75);parts.push(part(b,'#7a6a4e'));
 const m=mergeGeometries(parts,false)!;m.computeBoundingSphere();return m;
}
function wheelGeometry(){
 const wood='#6d5a3c',parts:THREE.BufferGeometry[]=[];
 const ring=new THREE.TorusGeometry(1.5,.09,5,18);ring.rotateY(Math.PI/2);ring.translate(0,1.55,0);parts.push(part(ring,wood));
 for(let i=0;i<8;i++){const s=new THREE.BoxGeometry(.08,.08,1.5);s.translate(0,0,.75);s.rotateX(i*Math.PI/4);s.translate(0,1.55,0);parts.push(part(s,wood));}
 for(let i=0;i<8;i++){const a=i*Math.PI/4,p=new THREE.CylinderGeometry(.12,.09,.24,5);p.rotateZ(Math.PI/2);p.translate(0,1.55+Math.cos(a)*1.5,Math.sin(a)*1.5);parts.push(part(p,'#7a6a4e'));}
 for(const z of [-1,1]){const p=new THREE.BoxGeometry(.14,1.7,.14);p.translate(0,.85,z*.8);parts.push(part(p,wood));}
 const m=mergeGeometries(parts,false)!;m.computeBoundingSphere();return m;
}
export class IrrigationLayer{
 private scene:THREE.Scene;private height:(x:number,z:number)=>number;
 private ribbons:THREE.Mesh;private positions=new Float32Array(MAX_SEGMENTS*6*3);private colours=new Float32Array(MAX_SEGMENTS*6*3);
 private lifts=new Map<LiftKind,THREE.InstancedMesh>();private signature='';private preview:Preview|null=null;private previewDirty=false;
 constructor(scene:THREE.Scene,height:(x:number,z:number)=>number){
  this.scene=scene;this.height=height;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.positions,3));g.setAttribute('color',new THREE.BufferAttribute(this.colours,3));g.setDrawRange(0,0);
  this.ribbons=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.94,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  this.ribbons.frustumCulled=false;this.ribbons.renderOrder=6;this.ribbons.raycast=()=>{};this.ribbons.visible=false;scene.add(this.ribbons);
  for(const kind of ['shaduf','wheel'] as const){const m=new THREE.InstancedMesh(kind==='shaduf'?shadufGeometry():wheelGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}),16);m.count=0;m.frustumCulled=false;m.castShadow=true;m.raycast=()=>{};scene.add(m);this.lifts.set(kind,m);}
 }
 setPreview(p:Preview|null){this.preview=p;this.previewDirty=true;}
 sync(game:Game){
  const on=irrigationEnabled(game),ditches=on?ditchesOf(game):[];
  const sig=`${on}|${ditches.map(d=>`${d.id}:${d.done.toFixed(0)}:${ditchComplete(d)?1:0}`).join(',')}|${this.preview?`${this.preview.x0.toFixed(1)},${this.preview.z0.toFixed(1)},${this.preview.x1.toFixed(1)},${this.preview.z1.toFixed(1)},${this.preview.ok}`:''}`;
  if(sig===this.signature&&!this.previewDirty)return;this.signature=sig;this.previewDirty=false;
  let v=0;const P=this.positions,C=this.colours;
  const quad=(ax:number,az:number,bx:number,bz:number,half:number,lift:number,c:THREE.Color)=>{
   const len=Math.hypot(bx-ax,bz-az);if(len<.01)return;const nx=-(bz-az)/len*half,nz=(bx-ax)/len*half,ya=this.height(ax,az)+lift,yb=this.height(bx,bz)+lift;
   const q=[[ax-nx,ya,az-nz],[ax+nx,ya,az+nz],[bx+nx,yb,bz+nz],[ax-nx,ya,az-nz],[bx+nx,yb,bz+nz],[bx-nx,yb,bz-nz]];
   for(const p of q){if(v+3>P.length)return;P[v]=p[0];P[v+1]=p[1];P[v+2]=p[2];C[v]=c.r;C[v+1]=c.g;C[v+2]=c.b;v+=3;}
  };
  const draw=(x0:number,z0:number,x1:number,z1:number,dugLen:number,total:number,done:boolean)=>{
   const len=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(len/2)),lip=col('#7d7254'),bed=col(done?'#3f5f5c':'#4a3d2b'),raw=col('#6e6247');
   for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,ax=x0+(x1-x0)*t0,az=z0+(z1-z0)*t0,bx=x0+(x1-x0)*t1,bz=z0+(z1-z0)*t1,mid=(t0+t1)/2*total;
    const dug=mid<=dugLen;quad(ax,az,bx,bz,1.15,.1,dug?lip:raw);if(dug)quad(ax,az,bx,bz,.55,.14,bed);}
  };
  const lifted=new Map<LiftKind,{x:number;z:number;yaw:number}[]>();
  for(const d of ditches){draw(d.x0,d.z0,d.x1,d.z1,d.done,d.length,ditchComplete(d));
   if(d.lift!=='none')(lifted.get(d.lift)??lifted.set(d.lift,[]).get(d.lift)!).push({x:d.x0,z:d.z0,yaw:Math.atan2(d.x1-d.x0,d.z1-d.z0)});}
  if(this.preview){const p=this.preview,c=col(p.ok?'#d9b55e':'#c0664f');const len=Math.hypot(p.x1-p.x0,p.z1-p.z0),n=Math.max(1,Math.ceil(len/2));
   for(let i=0;i<n;i+=1){if(i%2===0)quad(p.x0+(p.x1-p.x0)*i/n,p.z0+(p.z1-p.z0)*i/n,p.x0+(p.x1-p.x0)*(i+1)/n,p.z0+(p.z1-p.z0)*(i+1)/n,.5,.3,c);}}
  const g=this.ribbons.geometry;(g.attributes.position as THREE.BufferAttribute).needsUpdate=true;(g.attributes.color as THREE.BufferAttribute).needsUpdate=true;g.setDrawRange(0,v/3);this.ribbons.visible=v>0;
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),s=new THREE.Vector3(1,1,1),pos=new THREE.Vector3();
  for(const [kind,mesh] of this.lifts){const list=lifted.get(kind)??[];mesh.count=Math.min(list.length,16);
   for(let i=0;i<mesh.count;i++){const l=list[i];q.setFromAxisAngle(up,l.yaw);pos.set(l.x,this.height(l.x,l.z),l.z);m.compose(pos,q,s);mesh.setMatrixAt(i,m);}
   mesh.instanceMatrix.needsUpdate=true;}
 }
 dispose(){this.scene.remove(this.ribbons);this.ribbons.geometry.dispose();(this.ribbons.material as THREE.Material).dispose();for(const m of this.lifts.values()){this.scene.remove(m);m.geometry.dispose();(m.material as THREE.Material).dispose();m.dispose();}}
}
