import * as THREE from 'three';
import {TEAM_STYLE} from '../game/constants';
/** Soft contact shadows where walls meet the ground (painterly look). One low-resolution coverage map of building footprints, read by the
 * terrain shader as extra ambient occlusion, so the shadow hugs the real terrain on slopes and never adds geometry or draw calls.
 * Render-only: it never touches heights, footprints or collision. Hearths, fields, pens, fences and other ground work are skipped. */
export const CONTACT_RULES={metresPerTexel:2,fadeMetres:2.4,strength:.9} as const;
const SKIP=new Set(['farm','pen','dock','bridge','grove','cairn','cornerstone','palisade','gate','stonewall','trench','moat','hearth','threshingFloor','lumber','quarry']);
export type ContactBuilding={id?:number;type:string;x:number;z:number;w:number;d:number;hp:number;build:number;team:number};
export class ContactShadowMap{
 readonly texture:THREE.DataTexture;readonly res:number;readonly size:number;private data:Uint8Array;private key=NaN;
 constructor(size:number){
  this.size=size;this.res=Math.max(16,Math.min(1024,Math.ceil(size/CONTACT_RULES.metresPerTexel)));
  this.data=new Uint8Array(this.res*this.res);
  this.texture=new THREE.DataTexture(this.data,this.res,this.res,THREE.RedFormat,THREE.UnsignedByteType);
  this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.generateMipmaps=false;this.texture.needsUpdate=true;
 }
 /** Cheap order-independent signature of everything that changes the map. */
 static signature(list:readonly ContactBuilding[]){let h=0;for(const b of list){if(b.hp<=0||b.build<.15||SKIP.has(b.type))continue;h=(h*31+Math.round(b.x*4)*7+Math.round(b.z*4)*13+Math.round(b.w*4)*3+Math.round(b.d*4)*5+b.team+1)%1000000007;}return h;}
 /** Re-rasterise only when the building set moved. Returns true when the texture changed. */
 update(list:readonly ContactBuilding[]){
  const key=ContactShadowMap.signature(list);if(key===this.key)return false;this.key=key;
  const {res,size,data}=this,texel=size/res,fade=CONTACT_RULES.fadeMetres;data.fill(0);
  for(const b of list){
   if(b.hp<=0||b.build<.15||SKIP.has(b.type))continue;
   const st=TEAM_STYLE[b.team]||TEAM_STYLE[0],hx=b.w*.5*st.sx,hz=b.d*.5*st.sz,co=Math.cos(st.yaw),si=Math.sin(st.yaw),reach=Math.hypot(hx,hz)+fade;
   const i0=Math.max(0,Math.floor((b.x-reach+size/2)/texel)),i1=Math.min(res-1,Math.ceil((b.x+reach+size/2)/texel)),j0=Math.max(0,Math.floor((b.z-reach+size/2)/texel)),j1=Math.min(res-1,Math.ceil((b.z+reach+size/2)/texel));
   for(let j=j0;j<=j1;j++){const z=(j+.5)*texel-size/2-b.z;for(let i=i0;i<=i1;i++){const x=(i+.5)*texel-size/2-b.x,lx=co*x-si*z,lz=si*x+co*z;
    // signed distance to the rounded footprint (negative inside)
    const qx=Math.abs(lx)-hx,qz=Math.abs(lz)-hz,sd=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0);
    const t=Math.max(0,Math.min(1,1-sd/fade)),v=t*t*(3-2*t),o=j*res+i,q=Math.round(v*255);if(q>data[o])data[o]=q;}}
  }
  this.texture.needsUpdate=true;return true;
 }
 dispose(){this.texture.dispose();}
}
