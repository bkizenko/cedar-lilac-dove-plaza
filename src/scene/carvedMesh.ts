/** Pure triangle-soup builder for Option H carved buildings. No three.js
 * import: emits Float32Arrays (positions, flat normals, metric grain UVs,
 * vertex colours, per-vertex grain strength) that the thin adapter in
 * carvedBuildingLayer.ts wraps in one BufferGeometry per variant and LOD.
 * One shared vertex-coloured material draws every carved building, so draw
 * calls scale with distinct (variant, LOD) buckets, not with building count.
 *
 * Every part shape here is convex, so winding is fixed automatically by
 * orienting each triangle away from the part centroid. Triangle counts equal
 * partTriangles() exactly (tested). */
import {hashSeed,partsAtLod,partTriangles,rotatePoint,seededRandom,SPHERE_SEGMENTS,type BuildingSpec,type LodTier,type Part} from './buildingParts';
import {layerForMat,NO_LAYER} from './buildingTextures';
import {CARVED_GRAIN,carvedSwatch,getCarvedPalette,hexToRgb,specSwatch,type CarvedMaterialId} from './carvedPalette';

type V3=[number,number,number];
export type CarvedMeshData={positions:Float32Array;normals:Float32Array;uvs:Float32Array;colors:Float32Array;grain:Float32Array;/** per-vertex material layer+1 (0 = none), wear, part height fraction, part seed (bytes, see buildingTextures.packBm) */bm:Uint8Array;triangles:number;
 bounds:{minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number}};

const quad=(out:V3[][],a:V3,b:V3,c:V3,d:V3)=>{out.push([a,b,c],[a,c,d]);};
const ring=(n:number,rx:number,rz:number,y:number):V3[]=>Array.from({length:n},(_,i)=>{const t=i/n*Math.PI*2;return [Math.cos(t)*rx,y,Math.sin(t)*rz] as V3;});

/** Local-frame triangles (base centre at origin, Y up, already scaled). */
export function shapeTriangles(p:Part):V3[][]{
 const [w,h,d]=p.size,hw=w/2,hd=d/2,n=Math.max(3,p.sides??8),out:V3[][]=[];
 switch(p.shape){
  case 'box':{
   const [tx,tz]=p.taper??[1,1],c=(x:number,y:number,z:number):V3=>[x*hw*(1+(tx-1)*y),y*h,z*hd*(1+(tz-1)*y)];
   quad(out,c(-1,0,-1),c(1,0,-1),c(1,0,1),c(-1,0,1));quad(out,c(-1,1,-1),c(1,1,-1),c(1,1,1),c(-1,1,1));
   quad(out,c(-1,0,-1),c(1,0,-1),c(1,1,-1),c(-1,1,-1));quad(out,c(-1,0,1),c(1,0,1),c(1,1,1),c(-1,1,1));
   quad(out,c(-1,0,-1),c(-1,0,1),c(-1,1,1),c(-1,1,-1));quad(out,c(1,0,-1),c(1,0,1),c(1,1,1),c(1,1,-1));break;}
  case 'cylinder':{
   const ov=p.oval??1,b=ring(n,w/2,w/2*ov,0),t=ring(n,d/2,d/2*ov,h);
   for(let i=0;i<n;i++){const j=(i+1)%n;quad(out,b[i],b[j],t[j],t[i]);out.push([[0,0,0],b[i],b[j]],[[0,h,0],t[i],t[j]]);}break;}
  case 'cone':{
   const b=ring(n,w/2,d/2,0);for(let i=0;i<n;i++){const j=(i+1)%n;out.push([[0,h,0],b[i],b[j]],[[0,0,0],b[i],b[j]]);}break;}
  case 'prism':{
   const L:V3=[-hw,0,-hd],R:V3=[hw,0,-hd],T:V3=[0,h,-hd],L2:V3=[-hw,0,hd],R2:V3=[hw,0,hd],T2:V3=[0,h,hd];
   quad(out,L,T,T2,L2);quad(out,R,T,T2,R2);out.push([L,R,T],[L2,R2,T2]);quad(out,L,R,R2,L2);break;}
  case 'wedge':{
   const A:V3=[-hw,0,-hd],B:V3=[hw,0,-hd],C:V3=[hw,0,hd],D:V3=[-hw,0,hd],E:V3=[-hw,h,-hd],F:V3=[hw,h,-hd];
   quad(out,A,B,C,D);quad(out,A,B,F,E);quad(out,E,F,C,D);out.push([A,E,D],[B,F,C]);break;}
  case 'hip':{
   const i=Math.min(Math.max(0,p.inset??0),hd),A:V3=[-hw,0,-hd],B:V3=[hw,0,-hd],C:V3=[hw,0,hd],D:V3=[-hw,0,hd],R0:V3=[0,h,-hd+i],R1:V3=[0,h,hd-i];
   quad(out,A,B,C,D);quad(out,B,C,R1,R0);quad(out,A,D,R1,R0);out.push([A,B,R0],[D,C,R1]);break;}
  case 'pyramid':{
   const A:V3=[-hw,0,-hd],B:V3=[hw,0,-hd],C:V3=[hw,0,hd],D:V3=[-hw,0,hd],T:V3=[0,h,0];
   out.push([A,B,T],[B,C,T],[C,D,T],[D,A,T]);quad(out,A,B,C,D);break;}
  case 'sphere':{
   const {lon,lat}=SPHERE_SEGMENTS,ry=h/2,pt=(i:number,j:number):V3=>{const th=j/lat*Math.PI,ph=i/lon*Math.PI*2;return [Math.sin(th)*Math.cos(ph)*hw,ry-Math.cos(th)*ry,Math.sin(th)*Math.sin(ph)*hd];};
   for(let i=0;i<lon;i++){const k=(i+1)%lon;out.push([pt(0,0),pt(i,1),pt(k,1)],[pt(0,lat),pt(i,lat-1),pt(k,lat-1)]);for(let j=1;j<lat-1;j++)quad(out,pt(i,j),pt(k,j),pt(k,j+1),pt(i,j+1));}
   break;}
 }
 return out;
}

function centroidOf(p:Part):V3{
 const [,h]=p.size;
 switch(p.shape){case 'cone':case 'pyramid':return [0,h/4,0];case 'prism':case 'hip':return [0,h/3,0];case 'wedge':return [0,h/3,-p.size[2]/6];default:return [0,h/2,0];}
}
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

const NO_AO:ReadonlySet<string>=new Set(['fire','water','cloth']);
const rgbCache=new Map<string,V3>();
const swatchRgb=(m:CarvedMaterialId)=>{const k=getCarvedPalette()+m;let c=rgbCache.get(k);if(!c){c=hexToRgb(carvedSwatch(m).hex);rgbCache.set(k,c);}return c;};
const hexRgb=(hex:string)=>{let c=rgbCache.get(hex);if(!c){c=hexToRgb(hex);rgbCache.set(hex,c);}return c;};

/** Build the merged carved mesh for one building spec at one LOD tier. */
export type MeshSelect={select?:(p:Part)=>boolean;origin?:readonly [number,number,number]};
/** `select` limits the parts (the layer builds the static shell without animated parts, and each rotor group alone);
 * `origin` is subtracted from every position so a rotor mesh turns about its own pivot. */
export function buildCarvedMesh(spec:BuildingSpec,tier:LodTier,opt:MeshSelect={}):CarvedMeshData{
 const o=opt.origin??[0,0,0],parts=opt.select?partsAtLod(spec,tier).filter(opt.select):partsAtLod(spec,tier),triangles=parts.reduce((s,p)=>s+partTriangles(p),0),vc=triangles*3;
 const positions=new Float32Array(vc*3),normals=new Float32Array(vc*3),uvs=new Float32Array(vc*2),colors=new Float32Array(vc*3),grain=new Float32Array(vc),bm=new Uint8Array(vc*4),texEra=spec.tex?.era??2,texWear=spec.tex?.wear??.3,rb=seededRandom(hashSeed(spec.variantKey,tier,'bm'));
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const r=seededRandom(hashSeed(spec.variantKey,tier));let v=0;
 for(const p of parts){
  const tris=shapeTriangles(p),c=centroidOf(p),[w,h,d]=p.size,own=spec.materials?.[p.mat],base=own?hexRgb(own.hex):swatchRgb(p.mat),tone=1+(r()-.5)*.08,offU=r(),offV=r(),gs=own?specSwatch(spec.materials,p.mat).grain:carvedSwatch(p.mat).grain,layer=p.mat.startsWith('shared.')?NO_LAYER:layerForMat(p.mat,own?.course,texEra),pw=Math.max(0,Math.min(1,texWear*(.75+rb()*.5))),pseed=rb();
  for(const tri of tris){
   let [a,b,e]=tri;let nrm=cross(sub(b,a),sub(e,a));
   const mid:V3=[(a[0]+b[0]+e[0])/3,(a[1]+b[1]+e[1])/3,(a[2]+b[2]+e[2])/3];
   if(dot(nrm,sub(mid,c))<0){[b,e]=[e,b];nrm=[-nrm[0],-nrm[1],-nrm[2]];}
   const len=Math.hypot(nrm[0],nrm[1],nrm[2])||1,ln:V3=[nrm[0]/len,nrm[1]/len,nrm[2]/len];
   // Planar grain projection in the part frame; grain runs along the longer in-plane dimension.
   const ax=Math.abs(ln[0]),ay=Math.abs(ln[1]),az=Math.abs(ln[2]);
   const wn=p.rot?rotatePoint(ln,p.rot):ln;
   for(const q of[a,b,e]){
    let u:number,vv:number;
    if(ay>=ax&&ay>=az){[u,vv]=w>=d?[q[0],q[2]]:[q[2],q[0]];}
    else if(ax>=az){[u,vv]=d>=h?[q[2],q[1]]:[q[1],q[2]];}
    else{[u,vv]=w>=h?[q[0],q[1]]:[q[1],q[0]];}
    const wp=p.rot?rotatePoint(q,p.rot):q,x=wp[0]+p.pos[0]-o[0],y=wp[1]+p.pos[1]-o[1],z=wp[2]+p.pos[2]-o[2];
    positions[v*3]=x;positions[v*3+1]=y;positions[v*3+2]=z;
    normals[v*3]=wn[0];normals[v*3+1]=wn[1];normals[v*3+2]=wn[2];
    uvs[v*2]=u/CARVED_GRAIN.tileMetres+offU;uvs[v*2+1]=vv/CARVED_GRAIN.tileMetres+offV;
    // Soft baked contact darkening near the ground (no extra pass, no texture).
    const ao=NO_AO.has(p.mat)||p.mat.startsWith('shared.')?1:.8+.2*Math.min(1,Math.max(0,y/1.1));
    colors[v*3]=Math.min(1,base[0]*tone*ao);colors[v*3+1]=Math.min(1,base[1]*tone*ao);colors[v*3+2]=Math.min(1,base[2]*tone*ao);
    grain[v]=gs;
    bm[v*4]=layer===NO_LAYER?0:layer+1;bm[v*4+1]=Math.round(pw*255);bm[v*4+2]=Math.round(Math.max(0,Math.min(1,h>0?q[1]/h:0))*255);bm[v*4+3]=Math.round(pseed*255);
    bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y);bounds.minZ=Math.min(bounds.minZ,z);bounds.maxZ=Math.max(bounds.maxZ,z);
    v++;
   }
  }
 }
 return {positions,normals,uvs,colors,grain,bm,triangles,bounds};
}

/** Far-distance impostor card: two crossed vertical quads sized to the
 * building silhouette, coloured by the dominant roof/wall swatches. Used
 * beyond the far LOD distance (tier 3) so a distant village costs 4
 * triangles per building in one instanced draw. */
export type ImpostorCard={width:number;depth:number;eave:number;height:number;wall:CarvedMaterialId;roof:CarvedMaterialId};
export function impostorCard(spec:BuildingSpec):ImpostorCard{
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxY=0,eave=0;const area=new Map<CarvedMaterialId,number>();let roof:CarvedMaterialId='thatch';let roofArea=-1;
 for(const p of partsAtLod(spec,2)){
  const [w,h,d]=p.size,ext=Math.max(w,d)/2;minX=Math.min(minX,p.pos[0]-ext);maxX=Math.max(maxX,p.pos[0]+ext);minZ=Math.min(minZ,p.pos[2]-ext);maxZ=Math.max(maxZ,p.pos[2]+ext);maxY=Math.max(maxY,p.pos[1]+h);
  const isRoof=p.shape==='prism'||p.shape==='hip'||p.shape==='cone'||p.shape==='pyramid'||p.shape==='wedge';
  if(isRoof){if(w*d>roofArea){roofArea=w*d;roof=p.mat;}eave=Math.max(eave,p.pos[1]);}
  else area.set(p.mat,(area.get(p.mat)??0)+w*h);
 }
 let wall:CarvedMaterialId='woodMid',best=-1;for(const [m,a] of area)if(a>best){best=a;wall=m;}
 const fw=spec.footprint.w,fd=spec.footprint.d;
 return {width:Math.min(fw,Math.max(.5,maxX-minX)),depth:Math.min(fd,Math.max(.5,maxZ-minZ)),eave:eave||maxY*.6,height:maxY,wall,roof};
}
export const IMPOSTOR_TRIANGLES=4;
