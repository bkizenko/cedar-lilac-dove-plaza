import * as THREE from 'three';
import {rngFrom} from './painterTrees';
import type {PainterSway} from './painterVegetationMaterial';
/** Botanical foliage atlas and material. The atlas is painted procedurally (deterministic, no image assets): 8 tiles of 128 px in a 4x2
 * sheet, luminance-only so the per-instance hue, season and vertex-baked light multiply cleanly. Tiles hold leaf sprigs, needle sprays, palm
 * and fern fronds, small-leaf scatter and grass, each with ragged cut-out silhouettes so crowns read as leaf mass, not smooth blobs.
 * One material draws bark, cores and leaf cards of every species: bark/leaf are told apart by the `aLeaf` vertex attribute (instance hue only
 * tints leaf), `aShed` lets a tree drop leaves card by card against the per-instance leaf density `iState.x`, and `iState.y` is snow load. */
export const ATLAS_COLS=4,ATLAS_ROWS=2,ATLAS_TILE=128;
export const TILE={sprig:0,needle:1,narrow:2,solid:3,frond:4,fern:5,small:6,grass:7} as const;
export type TileId=typeof TILE[keyof typeof TILE];
/** UV rectangle of a tile (v up), inset a few pixels so mip bleeding stays inside the gutter. */
export function tileUV(tile:number,inset=2):[number,number,number,number]{
 const c=tile%ATLAS_COLS,r=Math.floor(tile/ATLAS_COLS),u0=(c*ATLAS_TILE+inset)/(ATLAS_COLS*ATLAS_TILE),u1=((c+1)*ATLAS_TILE-inset)/(ATLAS_COLS*ATLAS_TILE),v0=(r*ATLAS_TILE+inset)/(ATLAS_ROWS*ATLAS_TILE),v1=((r+1)*ATLAS_TILE-inset)/(ATLAS_ROWS*ATLAS_TILE);
 return [u0,v0,u1,v1];
}
type Canvas={w:number;h:number;px:Uint8Array};
function put(cv:Canvas,tile:number,x:number,y:number,lum:number,a=1){
 const c=tile%ATLAS_COLS,r=Math.floor(tile/ATLAS_COLS);if(x<0||y<0||x>=ATLAS_TILE||y>=ATLAS_TILE)return;
 const i=((r*ATLAS_TILE+y)*cv.w+c*ATLAS_TILE+x)*4,old=cv.px[i+3]/255;if(a<old)return;
 const v=Math.round(Math.max(0,Math.min(1,lum))*255);cv.px[i]=cv.px[i+1]=cv.px[i+2]=v;cv.px[i+3]=Math.max(cv.px[i+3],Math.round(a*255));
}
/** Hard-edged rotated ellipse with a lengthwise light ramp and a darker midrib. */
function leaf(cv:Canvas,tile:number,cx:number,cy:number,len:number,wid:number,ang:number,lum:number,rib=.16){
 const ca=Math.cos(ang),sa=Math.sin(ang),ext=Math.ceil(Math.max(len,wid))+2;
 for(let dy=-ext;dy<=ext;dy++)for(let dx=-ext;dx<=ext;dx++){
  const u=(dx*ca+dy*sa)/len,v=(-dx*sa+dy*ca)/wid,d=u*u+v*v;if(d>1)continue;
  const edge=Math.min(1,(1-d)*4),core=Math.min(1,(1-d)*2.4),shade=Math.min(1,lum*1.32*(.8+.2*(u*.5+.5))*(1-rib*Math.exp(-v*v*30))*(.74+.26*core));
  put(cv,tile,Math.round(cx+dx),Math.round(cy+dy),shade,edge>.35?1:edge*2.5);
 }
}
function stroke(cv:Canvas,tile:number,x0:number,y0:number,x1:number,y1:number,w:number,lum:number){
 const n=Math.ceil(Math.hypot(x1-x0,y1-y0)*1.5)+1;
 for(let i=0;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,r=w*(1-.5*t);for(let dy=-Math.ceil(r);dy<=Math.ceil(r);dy++)for(let dx=-Math.ceil(r);dx<=Math.ceil(r);dx++)if(dx*dx+dy*dy<=r*r+.3)put(cv,tile,Math.round(x+dx),Math.round(y+dy),lum*(.92+.08*(t)),1);}
}
function paintTiles(cv:Canvas){
 const rnd=rngFrom(0x1eaf);
 // 0 sprig: a fan-shaped leafy shoot inside a rounded hull (corners stay empty so cards never read as rectangles)
 {const pts:[number,number,number,number][]=[];
  for(let i=0;i<26;i++){const t=(i+rnd()*.8)/26,ang=-1.15+t*2.3+(rnd()-.5)*.25,rr=24+rnd()*38,x=64+Math.sin(ang)*rr*.95,y=10+Math.cos(ang)*rr*1.45+rnd()*8;if(((x-64)/56)**2+((y-62)/60)**2>1)continue;pts.push([x,y,ang,rr]);}
  pts.sort((p,q)=>p[1]-q[1]);for(const [x,y,ang] of pts)stroke(cv,0,64,6,x,y-4,.9,.5);
  for(const [x,y,ang] of pts)leaf(cv,0,x,y,15+rnd()*7,7.4+rnd()*2.2,Math.PI/2-ang*.8+(rnd()-.5)*.7,.62+rnd()*.38,.2);}
 // 1 needle spray: stem with dense forward-angled needle pairs
 {let px=64,py=4;for(let i=0;i<30;i++){const t=i/30,nx=64+Math.sin(t*2.1)*4,ny=4+t*118;stroke(cv,1,px,py,nx,ny,1.3,.45);
  const len=(1-Math.abs(t-.42)*1.2)*26+8;
  for(const side of [-1,1]){const a=Math.PI/2+side*(.95-.25*t);const ex=nx+Math.cos(a)*len,ey=ny+Math.sin(a)*len*.7+4;stroke(cv,1,nx,ny,ex,ey,1.5,.8+rnd()*.2);}
  px=nx;py=ny;}}
 // 2 narrow sprig: long drooping lanceolate leaves on three twigs
 for(const fan of [-.6,0,.6]){let x=64+fan*14,y=4;for(let i=0;i<6;i++){const t=i/6,nx=64+fan*14+fan*t*26,ny=4+t*104;stroke(cv,2,x,y,nx,ny,1,.5);
  for(const side of [-1,1]){const a=Math.PI/2+side*(.55+rnd()*.3)+fan*.3;leaf(cv,2,nx+Math.cos(a)*10,ny+Math.sin(a)*10,16+rnd()*7,3.1+rnd(),a,.76+rnd()*.24,.2);}x=nx;y=ny;}}
 // 3 solid: opaque neutral with faint mottling (bark, cores, ground-hugging mass)
 for(let y=0;y<ATLAS_TILE;y++)for(let x=0;x<ATLAS_TILE;x++){const m=.9+.1*Math.sin(x*.31+Math.sin(y*.17)*2)*Math.cos(y*.23);put(cv,3,x,y,m,1);}
 // 4 frond: pinnate palm leaf, leaflets lengthen then shorten toward the tip and droop
 {for(let i=0;i<22;i++){const t=i/22,y=3+t*120,len=Math.sin(Math.min(1,t*1.15+.08)*Math.PI*.95)*40*(1-.35*t)+4;
  for(const side of [-1,1]){const ex=64+side*len,ey=y+len*.1+3-len*.28;stroke(cv,4,64,y,ex,ey,1.7,.7+rnd()*.25);}}
  stroke(cv,4,64,2,64,124,2.2,.42);}
 // 5 fern: fine pinnate frond with serrated pinnae
 {for(let i=0;i<26;i++){const t=i/26,y=3+t*118,len=Math.sin(Math.min(1,t*1.1+.06)*Math.PI*.92)*26+3;
  for(const side of [-1,1]){const ex=64+side*len,ey=y+len*.45+2;stroke(cv,5,64,y,ex,ey,1.25,.62+rnd()*.34);for(let k=1;k<4;k++){const q=k/4;leaf(cv,5,64+side*len*q,y+(ey-y)*q+2,3.4,1.4,Math.PI/2+side*.7,.8+rnd()*.2,0);}}}
  stroke(cv,5,64,2,64,122,1.7,.4);}
 // 6 small leaves: loose scatter of rounded leaves with open gaps, for birch/aspen/tamarisk
 {for(let i=0;i<46;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*46,x=64+Math.cos(a)*r*1.05,y=64+Math.sin(a)*r*.95;if(Math.hypot(x-64,y-64)>54)continue;
  leaf(cv,6,x,y,6.5+rnd()*3.5,5+rnd()*2,rnd()*6.28,.7+rnd()*.3,.12);}
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3;stroke(cv,6,64,64,64+Math.cos(a)*34,64+Math.sin(a)*34,.8,.45);}}
 // 7 grass: a fan of curved blades
 {for(let i=0;i<9;i++){const bx=64+(i-4)*7+(rnd()-.5)*4,h=70+rnd()*46,lean=(i-4)*5+(rnd()-.5)*10;
  for(let s=0;s<=26;s++){const t=s/26,x=bx+lean*t*t*1.4,y=3+h*t,w=(1-t)*(3.6+rnd()*.3)+.5;for(let dx=-Math.ceil(w);dx<=Math.ceil(w);dx++)if(Math.abs(dx)<=w)put(cv,7,Math.round(x+dx),Math.round(y),.55+.45*t+(rnd()-.5)*.06,1);}}}
}
let atlas:THREE.DataTexture|null=null;
export function botanicalAtlasPixels(){
 const cv:Canvas={w:ATLAS_COLS*ATLAS_TILE,h:ATLAS_ROWS*ATLAS_TILE,px:new Uint8Array(ATLAS_COLS*ATLAS_TILE*ATLAS_ROWS*ATLAS_TILE*4)};
 paintTiles(cv);return cv;
}
export function botanicalAtlas(){
 if(atlas)return atlas;
 const cv=botanicalAtlasPixels(),t=new THREE.DataTexture(cv.px,cv.w,cv.h,THREE.RGBAFormat);
 t.colorSpace=THREE.NoColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.anisotropy=2;t.needsUpdate=true;
 return atlas=t;
}
/** Wind tuning: trunk sway grows with height squared, canopy cards flutter on top of it. Render-only. */
export const BOTANICAL_WIND={sway:.0072,flutter:.016,gust:.55} as const;
export type BotanicalUniforms={uSnowTone:{value:THREE.Color}};
export function makeBotanicalMaterial(sway:PainterSway,opts:{translucency?:number;ground?:boolean;still?:boolean}={}){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,vertexColors:true,side:THREE.DoubleSide,map:botanicalAtlas(),alphaTest:.42});
 const trans=(opts.translucency??1).toFixed(3);
 m.customProgramCacheKey=()=>opts.ground?(opts.still?'botanical-still-v1':'botanical-ground-v1'):'botanical-v1';
 m.onBeforeCompile=shader=>{
  shader.uniforms.uTime=sway.uTime;shader.uniforms.uWind=sway.uWind;
  shader.vertexShader=`uniform float uTime;uniform float uWind;attribute float aLeaf;attribute float aShed;attribute vec2 iState;varying float vLeaf;varying float vUp;varying float vLoad;\n`+shader.vertexShader
   .replace('#include <color_vertex>',`#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
     vColor=vec4(1.0);
    #endif
    #ifdef USE_COLOR
     vColor.rgb*=color;
    #endif
    #ifdef USE_INSTANCING_COLOR
     vColor.rgb*=mix(vec3(1.0),instanceColor.rgb,aLeaf);
    #endif`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vLeaf=aLeaf;vLoad=iState.y;
    #ifdef USE_INSTANCING
     vec3 iPos=instanceMatrix[3].xyz;
     vec3 wn=normalize(mat3(instanceMatrix)*objectNormal);vUp=wn.y;
    #else
     vec3 iPos=vec3(0.);vUp=objectNormal.y;
    #endif
    if(aShed>=0.&&iState.x<aShed)transformed=vec3(0.);
    {
     float hgt=max(position.y,0.);
     float ph=dot(iPos.xz,vec2(.173,.131));
     float gust=.5+.5*sin(uTime*.55+iPos.x*.021+iPos.z*.017);
     vec2 w=vec2(sin(uTime*1.25+ph),cos(uTime*.93+ph*1.31))*uWind*(.3+.7*gust);
     transformed.xz+=w*hgt*hgt*${opts.still?'0.00000':opts.ground?'.30000':BOTANICAL_WIND.sway.toFixed(5)};
     if(aLeaf>.2${opts.ground?'&&false':''})transformed+=vec3(sin(uTime*3.1+position.x*2.3+ph),sin(uTime*2.7+position.y*2.1+ph*1.7),cos(uTime*3.4+position.z*2.5+ph))*${BOTANICAL_WIND.flutter.toFixed(4)}*uWind*smoothstep(.5,3.,hgt)*aLeaf;
    }`);
  shader.fragmentShader=`varying float vLeaf;varying float vUp;varying float vLoad;\n`+shader.fragmentShader
   // Cards are shaded with the soft crown normals baked into them, whichever face the camera sees.
   .replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);')
   .replace('#include <color_fragment>',`#include <color_fragment>
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.96,1.),clamp(vLoad,0.,1.)*smoothstep(.12,.7,vUp)*.9);`)
   .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
    reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.10,.115,.05)*vLeaf*${trans};`);
 };
 return m;
}
/** Cheap flat material for far crowns: same lighting as the near set, no map or wind. */
export function makeBotanicalFarMaterial(){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95,metalness:0,vertexColors:true});
 m.customProgramCacheKey=()=>'botanical-far-v1';
 m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
  reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.10,.115,.05);`);};
 return m;
}
