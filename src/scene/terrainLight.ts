import * as THREE from 'three';
/** Baked terrain light field for the painterly map look. One RGBA8 texture covers the whole map:
 *  R = ambient occlusion (valleys, gullies, river cuts)   G = sun visibility (soft hill horizon shadow, re-baked in slices as the sun moves)
 *  B = distance to water / 16 m (shore wetness, foam hints)   A = convexity (ridge and bank highlights, 0.5 neutral).
 * Pure CPU over the existing heightfield: it never changes a height, a collision or a save. */
export const TERRAIN_LIGHT_RULES={maxResolution:512,metresPerTexel:3,waterDistanceMetres:16,sliceRows:40,resunAngleRadians:.02,
 aoRadiiMetres:[5,14,34],sunMarchMetres:[3,6,10,16,24,36,52,75,105,150,210],ringDirections:8} as const;
export type LightmapGround={size:number;height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number};
const clamp01=(v:number)=>v<0?0:v>1?1:v;
const smooth=(a:number,b:number,x:number)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
/** Pure: fraction of the sun left after the horizon of a height grid. dir is horizontal unit (toward the sun) and tanElev the sun slope. */
export function horizonVisibility(sample:(x:number,z:number)=>number,x:number,z:number,dirX:number,dirZ:number,tanElev:number,marches:readonly number[]=TERRAIN_LIGHT_RULES.sunMarchMetres){
 const h0=sample(x,z)+.9;let occl=0;
 for(const d of marches){const rise=sample(x+dirX*d,z+dirZ*d)-(h0+d*tanElev);if(rise>0){const o=rise/(d*.22+2.5);if(o>occl)occl=o;}}
 return 1-smooth(0,1.1,occl);
}
export class TerrainLightmap{
 readonly texture:THREE.DataTexture;readonly res:number;readonly size:number;
 private data:Uint8Array;private heights:Float32Array;private ground:LightmapGround;private sunKey='';private sunDir=new THREE.Vector3();private nextRow=0;private baking=false;private dirX=0;private dirZ=0;private tanElev=1;
 constructor(ground:LightmapGround){
  this.ground=ground;this.size=ground.size;this.res=Math.max(32,Math.min(TERRAIN_LIGHT_RULES.maxResolution,Math.ceil(ground.size/TERRAIN_LIGHT_RULES.metresPerTexel)));
  const n=this.res;this.data=new Uint8Array(n*n*4);this.heights=new Float32Array(n*n);
  for(let i=0;i<n*n;i++){this.data[i*4]=255;this.data[i*4+1]=255;this.data[i*4+2]=255;this.data[i*4+3]=128;}
  this.texture=new THREE.DataTexture(this.data,n,n,THREE.RGBAFormat,THREE.UnsignedByteType);
  this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.generateMipmaps=false;this.texture.wrapS=this.texture.wrapT=THREE.ClampToEdgeWrapping;this.texture.needsUpdate=true;
  this.bakeStatic();
 }
 private cellX(i:number){return (i+.5)/this.res*this.size-this.size/2;}
 /** Bilinear read of the sampled height grid (metres). */
 private h(x:number,z:number){
  const n=this.res,gx=Math.max(0,Math.min(n-1.001,(x/this.size+.5)*n-.5)),gz=Math.max(0,Math.min(n-1.001,(z/this.size+.5)*n-.5)),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,H=this.heights;
  return (H[iz*n+ix]*(1-fx)+H[iz*n+ix+1]*fx)*(1-fz)+(H[(iz+1)*n+ix]*(1-fx)+H[(iz+1)*n+ix+1]*fx)*fz;
 }
 /** Static channels: AO, convexity, water distance. */
 bakeStatic(){
  const n=this.res,{ground}=this,D=this.data,H=this.heights,texel=this.size/n,water=new Uint8Array(n*n);
  for(let j=0;j<n;j++){const z=this.cellX(j);for(let i=0;i<n;i++){const x=this.cellX(i),h=ground.height(x,z);H[j*n+i]=h;if(h<ground.waterAt(x,z)-.03)water[j*n+i]=1;}}
  // Chamfer distance to the nearest water cell, in metres (clamped to 16).
  const far=TERRAIN_LIGHT_RULES.waterDistanceMetres,dist=new Float32Array(n*n);
  for(let k=0;k<n*n;k++)dist[k]=water[k]?0:far;
  const a=texel,b=texel*1.4142;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;let d=dist[k];
   if(i>0)d=Math.min(d,dist[k-1]+a);if(j>0){d=Math.min(d,dist[k-n]+a);if(i>0)d=Math.min(d,dist[k-n-1]+b);if(i<n-1)d=Math.min(d,dist[k-n+1]+b);}dist[k]=d;}
  for(let j=n-1;j>=0;j--)for(let i=n-1;i>=0;i--){const k=j*n+i;let d=dist[k];
   if(i<n-1)d=Math.min(d,dist[k+1]+a);if(j<n-1){d=Math.min(d,dist[k+n]+a);if(i<n-1)d=Math.min(d,dist[k+n+1]+b);if(i>0)d=Math.min(d,dist[k+n-1]+b);}dist[k]=d;}
  const radii=TERRAIN_LIGHT_RULES.aoRadiiMetres,dirs=TERRAIN_LIGHT_RULES.ringDirections,ring:number[][]=[];
  for(let d=0;d<dirs;d++){const a0=d/dirs*Math.PI*2+.3;ring.push([Math.cos(a0),Math.sin(a0)]);}
  for(let j=0;j<n;j++){const z=this.cellX(j);for(let i=0;i<n;i++){
   const x=this.cellX(i),h0=H[j*n+i];let occl=0,convex=0,wsum=0;
   for(let r=0;r<radii.length;r++){const R=radii[r];let up=0,down=0;
    for(const [cx,cz] of ring){const dh=this.h(x+cx*R,z+cz*R)-h0;if(dh>0)up+=Math.min(1.6,dh/R);else down+=Math.min(1.6,-dh/R);}
    const w=1/(1+r*.6);occl+=w*up/dirs;convex+=w*down/dirs;wsum+=w;}
   occl/=wsum;convex/=wsum;
   const o=((j*n+i)*4);
   D[o]=Math.round(255*(1-clamp01(occl*1.35)*.72));
   D[o+2]=Math.round(255*clamp01(dist[j*n+i]/far));
   D[o+3]=Math.round(255*clamp01(.5+(convex-occl)*.9));
  }}
  this.texture.needsUpdate=true;
 }
 /** Call with the world-space direction TOWARD the sun (any length). Starts an incremental re-bake when it moved enough. */
 setSun(dir:THREE.Vector3){
  const d=dir.clone().normalize(),moved=d.angleTo(this.sunDir)>TERRAIN_LIGHT_RULES.resunAngleRadians;
  if(!moved&&this.sunKey)return;
  this.sunDir.copy(d);this.sunKey='set';
  const horiz=Math.hypot(d.x,d.z)||1e-4;this.dirX=d.x/horiz;this.dirZ=d.z/horiz;this.tanElev=Math.max(.02,d.y/horiz);
  this.nextRow=0;this.baking=true;
 }
 /** Bake a slice of sun-visibility rows; returns true while more remain. First call after a big change may be given a larger row budget. */
 step(rows:number=TERRAIN_LIGHT_RULES.sliceRows){
  if(!this.baking)return false;
  const n=this.res,D=this.data,end=Math.min(n,this.nextRow+rows),sample=(x:number,z:number)=>this.h(x,z);
  for(let j=this.nextRow;j<end;j++){const z=this.cellX(j);for(let i=0;i<n;i++){
   D[(j*n+i)*4+1]=Math.round(255*horizonVisibility(sample,this.cellX(i),z,this.dirX,this.dirZ,this.tanElev));
  }}
  this.nextRow=end;this.texture.needsUpdate=true;
  if(end>=n){this.baking=false;return false;}
  return true;
 }
 bakeSunNow(dir:THREE.Vector3){this.sunKey='';this.setSun(dir);while(this.step(this.res));}
 dispose(){this.texture.dispose();}
}
