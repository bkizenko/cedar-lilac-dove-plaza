import * as THREE from 'three';
/** Original repeatable construction surfaces, generated once and shared by every
 * instance/material clone. No downloads, random state or per-frame painting. */
export const BUILDING_SURFACE_RULES={resolution:128,metresPerRepeat:1.6,families:4,mapsPerFamily:3,anisotropy:4} as const;
export type BuildingSurfaceKind='timber'|'thatch'|'earth'|'masonry';
export type BuildingSurface={map:THREE.DataTexture;roughnessMap:THREE.DataTexture;bumpMap:THREE.DataTexture;bumpScale:number};
function hash(x:number,y:number){let n=Math.imul(x+13,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
function fract(x:number){return x-Math.floor(x);}
function smooth(a:number,b:number,x:number){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
/** Bright neutral albedo lets existing village palettes supply material colour.
 * Broad joints and weaving read before fine grain; no high-contrast stipple. */
export function buildingSurfaceSample(kind:BuildingSurfaceKind,u:number,v:number){
 const x=fract(u),y=fract(v);let height=.5,shade=.94,roughness=.93;
 if(kind==='timber'){
  const plank=Math.floor(x*5),fx=fract(x*5),seam=1-smooth(0,.035,Math.min(fx,1-fx));
  const bend=.045*Math.sin(y*Math.PI*2+plank*1.7),grain=Math.sin((x+bend)*Math.PI*86+y*6)*.5+.5;
  const knot=Math.exp(-((x-(plank+.45)/5)**2*1800+(y-(.25+hash(plank,3)*.5))**2*65));
  height=.5+grain*.09-seam*.32-knot*.09;shade=.97-seam*.17-knot*.12-grain*.045+hash(plank,7)*.025;roughness=.8+seam*.15+grain*.06;
 }else if(kind==='thatch'){
  const course=Math.floor(y*8),fy=fract(y*8),reed=Math.sin((x+hash(course,4)*.15)*Math.PI*110)*.5+.5;
  const lap=1-smooth(0,.12,fy);height=.45+reed*.14+fy*.16-lap*.17;shade=.96-lap*.105-reed*.055+Math.sin(x*Math.PI*10+course)*.025;roughness=.91+reed*.07;
 }else if(kind==='earth'){
  const weave=Math.sin(x*Math.PI*12)*Math.sin(y*Math.PI*14),broad=Math.sin(x*Math.PI*4+y*Math.PI*2)*Math.sin(y*Math.PI*6)*.5;
  height=.5+weave*.045+broad*.08;shade=.95+broad*.055+weave*.018;roughness=.94+broad*.07;
 }else{
  const row=Math.floor(y*5),fx=fract(x*4+(row%2)*.5+.05*Math.sin(y*Math.PI*10)),fy=fract(y*5),gap=1-smooth(.015,.065,Math.min(fx,1-fx,fy,1-fy));
  const block=hash(Math.floor(x*4+(row%2)*.5),row),worn=Math.sin(x*Math.PI*22+y*Math.PI*8)*Math.sin(y*Math.PI*18)*.025;
  height=.57+block*.13-gap*.31+worn;shade=.94+block*.045-gap*.14+worn;roughness=.9+gap*.08+block*.025;
 }
 return{albedo:Math.max(0,Math.min(1,shade)),height:Math.max(0,Math.min(1,height)),roughness:Math.max(0,Math.min(1,roughness))};
}
function texture(data:Uint8Array,size:number,color=false){const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=BUILDING_SURFACE_RULES.anisotropy;t.needsUpdate=true;return t;}
export function makeBuildingSurfaces(){const result={} as Record<BuildingSurfaceKind,BuildingSurface>;const size=BUILDING_SURFACE_RULES.resolution;for(const kind of ['timber','thatch','earth','masonry'] as const){const data=[new Uint8Array(size*size*4),new Uint8Array(size*size*4),new Uint8Array(size*size*4)];for(let y=0;y<size;y++)for(let x=0;x<size;x++){const s=buildingSurfaceSample(kind,(x+.5)/size,(y+.5)/size),i=(y*size+x)*4;for(let channel=0;channel<3;channel++){data[0][i+channel]=Math.round(s.albedo*255);data[1][i+channel]=Math.round(s.roughness*255);data[2][i+channel]=Math.round(s.height*255);}for(const d of data)d[i+3]=255;}result[kind]={map:texture(data[0],size,true),roughnessMap:texture(data[1],size),bumpMap:texture(data[2],size),bumpScale:kind==='timber'?.025:kind==='thatch'?.045:kind==='earth'?.025:.055};}return result;}
export function bindBuildingSurface(material:THREE.MeshStandardMaterial,surface:BuildingSurface){Object.assign(material,surface);return material;}
/** Reproject once in physical metre units; merged primitive UVs otherwise stretch
 * one plank over a whole wall and repeat a whole wall on every tiny brace. */
export function buildingSurfaceUV(geometry:THREE.BufferGeometry){const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');if(!p||!n)return geometry;const uv=new Float32Array(p.count*2),scale=1/BUILDING_SURFACE_RULES.metresPerRepeat;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv[i*2]=(nx>ny&&nx>nz?p.getZ(i):p.getX(i))*scale;uv[i*2+1]=(ny>=nx&&ny>=nz?p.getZ(i):p.getY(i))*scale;}geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;}

export function disposeBuildingSurfaceTextures(materials:readonly THREE.MeshStandardMaterial[]){const textures=new Set<THREE.Texture>();for(const m of materials)for(const t of[m.map,m.roughnessMap,m.bumpMap])if(t)textures.add(t);for(const t of textures)t.dispose();}
