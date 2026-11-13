/** Geometry toolkit for the animal models: lofted bodies, swept tubes, tufts, merging. Pure maths over THREE.BufferGeometry, deterministic,
 * no clock and no ambient randomness. Everything is vertex-coloured; colours are authored in sRGB and converted to linear once. */
import * as THREE from 'three';

export type RGB=[number,number,number];
export type Paint=(x:number,y:number,z:number,ny:number,s:number)=>RGB;
/** Cross-section of a loft: `s` along the axis, (u,v) centre offset in the cross plane, (ru,rv) radii, `sq` superellipse exponent (2 = ellipse). */
export type Sec={s:number;u?:number;v?:number;ru:number;rv:number;sq?:number};
export type Mesh={pos:number[];col:number[];idx:number[]};
export const newMesh=():Mesh=>({pos:[],col:[],idx:[]});
const c3=new THREE.Color();
export function hex(h:string):RGB{c3.set(h);return [c3.r,c3.g,c3.b];}
export const mix=(a:RGB,b:RGB,t:number):RGB=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
export const mul=(a:RGB,k:number):RGB=>[a[0]*k,a[1]*k,a[2]*k];
export const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Countershading: dorsal colour on top, lighter belly below, smooth in between (ny = surface normal y). */
export const counter=(back:RGB,belly:RGB,ny:number,hard=.25):RGB=>mix(belly,back,smooth(-.8,hard,ny));
const sgnPow=(v:number,e:number)=>Math.sign(v)*Math.pow(Math.abs(v),e);

export type Axis='x'|'down'|'y';
/** Loft cross-sections along an axis. 'x': s->X, u->Y, v->Z.  'down': s->-Y (a leg hanging from its joint), u->X (forward), v->Z.  'y': s->+Y, u->X, v->Z. */
export function loft(m:Mesh,secs:readonly Sec[],o:{seg?:number;axis?:Axis;paint?:Paint;capStart?:boolean;capEnd?:boolean;flipZ?:boolean}={}){
 const seg=o.seg??8,axis=o.axis??'x',paint=o.paint??(()=>[.5,.5,.5] as RGB),base=m.pos.length/3;
 const place=(s:number,a:number,b:number):[number,number,number]=>axis==='x'?[s,a,b]:axis==='down'?[a,-s,b]:[a,s,b];
 for(let i=0;i<secs.length;i++){
  const q=secs[i],ex=2/(q.sq??2);
  for(let j=0;j<seg;j++){
   const t=j/seg*Math.PI*2,cu=sgnPow(Math.cos(t),ex),cv=sgnPow(Math.sin(t),ex);
   const [x,y,z]=place(q.s,(q.u??0)+q.ru*cu,((q.v??0)+q.rv*cv)*(o.flipZ?-1:1));
   // outward normal y estimate for countershading: cross-plane component of the radial direction
   const col=paint(x,y,z,axis==='x'?Math.cos(t):0,q.s);
   m.pos.push(x,y,z);m.col.push(col[0],col[1],col[2]);
  }
 }
 for(let i=0;i<secs.length-1;i++)for(let j=0;j<seg;j++){
  const a=base+i*seg+j,b=base+i*seg+(j+1)%seg,c=base+(i+1)*seg+j,d=base+(i+1)*seg+(j+1)%seg;
  m.idx.push(a,c,b,b,c,d);
 }
 const cap=(i:number,flip:boolean)=>{
  const q=secs[i],[x,y,z]=place(q.s,q.u??0,(q.v??0)*(o.flipZ?-1:1));
  const ci=m.pos.length/3,col=paint(x,y,z,0,q.s);m.pos.push(x,y,z);m.col.push(col[0],col[1],col[2]);
  for(let j=0;j<seg;j++){const a=base+i*seg+j,b=base+i*seg+(j+1)%seg;m.idx.push(...(flip?[ci,b,a]:[ci,a,b]));}
 };
 if(o.capStart??true)cap(0,false);
 if(o.capEnd??true)cap(secs.length-1,true);
}
/** Swept tube along a polyline with per-point (ra,rb) radii (rb = width in the second cross axis; a flat tine/palm has rb>>ra). */
export function tube(m:Mesh,pts:readonly (readonly [number,number,number])[],radii:readonly (readonly [number,number])[],o:{seg?:number;paint?:Paint;up?:[number,number,number];capEnd?:boolean}={}){
 const seg=o.seg??5,base=m.pos.length/3,paint=o.paint??(()=>[.7,.65,.55] as RGB),up0=new THREE.Vector3(...(o.up??[0,0,1]));
 const p=pts.map(v=>new THREE.Vector3(...v)),n=p.length;
 for(let i=0;i<n;i++){
  const t=p[Math.min(n-1,i+1)].clone().sub(p[Math.max(0,i-1)]).normalize();
  let a=up0.clone().sub(t.clone().multiplyScalar(up0.dot(t)));if(a.lengthSq()<1e-6)a=new THREE.Vector3(0,1,0).sub(t.clone().multiplyScalar(t.y));a.normalize();
  const b=t.clone().cross(a).normalize(),[ra,rb]=radii[Math.min(i,radii.length-1)];
  for(let j=0;j<seg;j++){
   const th=j/seg*Math.PI*2,q=p[i].clone().addScaledVector(a,Math.cos(th)*ra).addScaledVector(b,Math.sin(th)*rb),col=paint(q.x,q.y,q.z,Math.cos(th),i/(n-1));
   m.pos.push(q.x,q.y,q.z);m.col.push(col[0],col[1],col[2]);
  }
 }
 for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=base+i*seg+j,b=base+i*seg+(j+1)%seg,c=base+(i+1)*seg+j,d=base+(i+1)*seg+(j+1)%seg;m.idx.push(a,b,c,b,d,c);}
 const ci=m.pos.length/3,e=p[n-1],col=paint(e.x,e.y,e.z,0,1);m.pos.push(e.x,e.y,e.z);m.col.push(col[0],col[1],col[2]);
 if(o.capEnd??true)for(let j=0;j<seg;j++)m.idx.push(ci,base+(n-1)*seg+j,base+(n-1)*seg+(j+1)%seg);
}
/** A small ellipsoid (eyes, nostrils, hooves, pads): `lat` latitude bands, `lon` longitude segments. */
export function blob(m:Mesh,c:readonly [number,number,number],r:readonly [number,number,number],col:RGB,o:{lon?:number;lat?:number;rot?:[number,number,number];paint?:Paint}={}){
 const lon=o.lon??6,lat=o.lat??3,base=m.pos.length/3,e=new THREE.Euler(...(o.rot??[0,0,0])),q=new THREE.Quaternion().setFromEuler(e),v=new THREE.Vector3();
 for(let i=0;i<=lat;i++){
  const ph=i/lat*Math.PI;
  for(let j=0;j<(i===0||i===lat?1:lon);j++){
   const th=j/lon*Math.PI*2;v.set(Math.cos(ph)*r[0],Math.sin(ph)*Math.cos(th)*r[1],Math.sin(ph)*Math.sin(th)*r[2]).applyQuaternion(q);
   const x=c[0]+v.x,y=c[1]+v.y,z=c[2]+v.z,k=o.paint?o.paint(x,y,z,Math.cos(ph),0):col;m.pos.push(x,y,z);m.col.push(k[0],k[1],k[2]);
  }
 }
 const ring=(i:number)=>i===0?[0]:i===lat?[1+(lat-1)*lon]:Array.from({length:lon},(_,j)=>1+(i-1)*lon+j);
 for(let i=0;i<lat;i++){
  const A=ring(i),B=ring(i+1);
  if(A.length===1)for(let j=0;j<lon;j++)m.idx.push(base+A[0],base+B[(j+1)%lon],base+B[j]);
  else if(B.length===1)for(let j=0;j<lon;j++)m.idx.push(base+A[j],base+A[(j+1)%lon],base+B[0]);
  else for(let j=0;j<lon;j++){const j1=(j+1)%lon;m.idx.push(base+A[j],base+B[j],base+A[j1],base+A[j1],base+B[j],base+B[j1]);}
 }
}
/** A 3-sided fur/feather tuft: base point, direction and length; 3 triangles, tapering to a point. */
export function tuft(m:Mesh,p:readonly [number,number,number],dir:readonly [number,number,number],len:number,w:number,col:RGB,tipCol?:RGB){
 const d=new THREE.Vector3(...dir).normalize(),a=new THREE.Vector3(0,1,0);if(Math.abs(d.y)>.9)a.set(1,0,0);
 const s=a.sub(d.clone().multiplyScalar(a.dot(d))).normalize(),t=d.clone().cross(s),base=m.pos.length/3,P=new THREE.Vector3(...p);
 const tip=P.clone().addScaledVector(d,len),tc=tipCol??col;
 for(let k=0;k<3;k++){const th=k/3*Math.PI*2,q=P.clone().addScaledVector(s,Math.cos(th)*w).addScaledVector(t,Math.sin(th)*w);m.pos.push(q.x,q.y,q.z);m.col.push(col[0],col[1],col[2]);}
 m.pos.push(tip.x,tip.y,tip.z);m.col.push(tc[0],tc[1],tc[2]);
 m.idx.push(base,base+3,base+1,base+1,base+3,base+2,base+2,base+3,base);
}
/** A flat fan/blade polygon in a plane (fins, ear leaf, wing feather panel): points CCW seen from +normal; both faces drawn (two sets of triangles). */
export function plate(m:Mesh,pts:readonly (readonly [number,number,number])[],col:RGB,o:{paint?:(i:number)=>RGB;thick?:number;nrm?:[number,number,number]}={}){
 const base=m.pos.length/3,n=pts.length;
 for(let i=0;i<n;i++){const k=o.paint?o.paint(i):col;m.pos.push(pts[i][0],pts[i][1],pts[i][2]);m.col.push(k[0],k[1],k[2]);}
 for(let i=1;i<n-1;i++)m.idx.push(base,base+i,base+i+1);
 for(let i=1;i<n-1;i++)m.idx.push(base,base+i+1,base+i);
}
/** Transform a mesh in place by a matrix (positions only). */
export function xform(m:Mesh,mat:THREE.Matrix4):Mesh{const v=new THREE.Vector3();for(let i=0;i<m.pos.length;i+=3){v.set(m.pos[i],m.pos[i+1],m.pos[i+2]).applyMatrix4(mat);m.pos[i]=v.x;m.pos[i+1]=v.y;m.pos[i+2]=v.z;}return m;}
export function append(dst:Mesh,src:Mesh,mat?:THREE.Matrix4){
 const base=dst.pos.length/3,v=new THREE.Vector3();
 for(let i=0;i<src.pos.length;i+=3){if(mat){v.set(src.pos[i],src.pos[i+1],src.pos[i+2]).applyMatrix4(mat);dst.pos.push(v.x,v.y,v.z);}else dst.pos.push(src.pos[i],src.pos[i+1],src.pos[i+2]);}
 for(const c of src.col)dst.col.push(c);for(const i of src.idx)dst.idx.push(base+i);
}
const lin=(v:number)=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
/** Build the BufferGeometry: smooth normals, linear-light vertex colours. Colours given as THREE.Color values are already linear. */
export function toGeometry(m:Mesh):THREE.BufferGeometry{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(m.pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(m.col,3));
 g.setIndex(m.idx);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 if(g.boundingSphere)g.boundingSphere.radius=Math.max(g.boundingSphere.radius,2);
 return g;
}
export const triangles=(g:THREE.BufferGeometry)=>(g.index?g.index.count:g.getAttribute('position').count)/3;
export {lin as srgbToLinear};
