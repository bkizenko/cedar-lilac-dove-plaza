/** Procedural per-material texture set for carved buildings (pure: no three.js import, deterministic, seeded, tiling).
 *
 * 13 small tiling materials (thatch, reed, timber, plank, wattle-and-daub, mud brick with straw, lime plaster, dressed ashlar courses,
 * rubble, slate, clay tile, hide/felt, turf), each packed as ONE layer of two RGBA8 layered atlases (WebGL2 2-D array textures: one bind,
 * hardware mips, clean tiling, no atlas bleeding):
 *   A: rgb = albedo detail multiplier (mean near .85, multiplies the vertex/palette colour), a = height (drives the bump-style detail normal)
 *   B: r = roughness factor, g = cavity/AO (joints, cracks, gaps), b = stain/streak mask (rain streaks, plaster stains), a = spare
 * Sizes follow the Detail option: Standard 128 px, High 192, Ultra 256 (see textureMemory for the measured bytes).
 * The same module owns the material choice (layerForMat), the per-vertex packing and the GLSL patch, so the game layer and the preview
 * render the identical shader. Weathering (moss on north faces and bases, soot near the roof ridge, rain streaks under eaves, sun bleach, wet
 * darkening) is computed in the shader from the world normal, the height above the building base and three season uniforms; nothing here
 * touches the simulation. Legacy switch: setBuildingTextureMode('legacy') returns to the single shared 256 px grain map. */
export const MATERIAL_LAYERS=['thatch','reed','timber','plank','wattle','mudbrick','plaster','ashlar','rubble','slate','tile','hide','turf'] as const;
export type MaterialLayer=typeof MATERIAL_LAYERS[number];
export const LAYER_COUNT=MATERIAL_LAYERS.length;
export const NO_LAYER=255;
export const layerIndex=(l:MaterialLayer)=>MATERIAL_LAYERS.indexOf(l);
export type TextureMode='set'|'legacy';
let mode:TextureMode='set';
export const setBuildingTextureMode=(m:TextureMode)=>{mode=m==='legacy'?'legacy':'set';};
export const getBuildingTextureMode=()=>mode;
/** Season/moisture inputs of the weathering shader, all 0..1. Set from the season mix; defaults are a dry mild day. */
export const buildingWeather={wet:0,sun:.4,moss:.5};
export function setBuildingWeather(w:Partial<typeof buildingWeather>){for(const k of ['wet','sun','moss'] as const){const v=w[k];if(v!==undefined&&Number.isFinite(v))buildingWeather[k]=Math.max(0,Math.min(1,v));}}

// ---------------------------------------------------------------- tiling noise
const hash=(x:number,y:number,s:number)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const sm=(t:number)=>t*t*(3-2*t),mix=(a:number,b:number,t:number)=>a+(b-a)*t,cl=(v:number,lo=0,hi=1)=>v<lo?lo:v>hi?hi:v,fr=(v:number)=>v-Math.floor(v);
/** periodic value noise, u,v in tile units [0,1), px,py cells per tile */
function vn(u:number,v:number,px:number,py:number,s:number){const x=fr(u)*px,y=fr(v)*py,xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi),X=(i:number)=>((xi+i)%px+px)%px,Y=(j:number)=>((yi+j)%py+py)%py;
 return mix(mix(hash(X(0),Y(0),s),hash(X(1),Y(0),s),fx),mix(hash(X(0),Y(1),s),hash(X(1),Y(1),s),fx),fy);}
const fbm=(u:number,v:number,px:number,py:number,s:number,oct=3)=>{let a=.5,t=0,n=0;for(let i=0;i<oct;i++){t+=a*vn(u,v,px<<i,py<<i,s+i*17);n+=a;a*=.5;}return t/n;};
/** periodic voronoi on an n x n cell grid: [f1,f2,cellHash] */
function vor(u:number,v:number,n:number,s:number):[number,number,number]{const x=fr(u)*n,y=fr(v)*n,xi=Math.floor(x),yi=Math.floor(y);let f1=9,f2=9,id=0;
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=xi+i,cy=yi+j,wx=((cx%n)+n)%n,wy=((cy%n)+n)%n,px=cx+hash(wx,wy,s),py=cy+hash(wx,wy,s+91),d=Math.hypot(px-x,py-y);if(d<f1){f2=f1;f1=d;id=hash(wx,wy,s+7);}else if(d<f2)f2=d;}
 return [f1,f2,id];}
type Px={r:number;g:number;b:number;h:number;ro:number;cav:number;st:number};
const px=(r:number,g:number,b:number,h:number,ro:number,cav=1,st=0):Px=>({r,g,b,h,ro,cav,st});
/** stamp short straw flecks into a wrapped mask */
function flecks(size:number,count:number,len:number,seed:number){const m=new Float32Array(size*size);for(let i=0;i<count;i++){const cx=hash(i,1,seed)*size,cy=hash(i,2,seed)*size,a=hash(i,3,seed)*Math.PI,L=len*(.6+hash(i,4,seed)*.8);
  for(let t=-L/2;t<=L/2;t+=.5){const x=((Math.round(cx+Math.cos(a)*t)%size)+size)%size,y=((Math.round(cy+Math.sin(a)*t)%size)+size)%size;m[y*size+x]=1;}}return m;}

// ---------------------------------------------------------------- per-material pixel functions (u,v in 0..1)
type Gen=(u:number,v:number,x:number,y:number)=>Px;
function genFor(l:MaterialLayer,size:number,seed:number):Gen{
 const s=seed+layerIndex(l)*131;
 switch(l){
  case 'thatch':return(u,v)=>{const w=u*48+(vn(u,v,6,6,s)-.5)*1.6+Math.sin(v*Math.PI*2*3+u*5)*.35,id=Math.floor(w),f=fr(w),tone=hash(id,0,s);
   const c=fr(v*6+(vn(u*24,0,24,1,s+3)-.5)*.14),ledge=sm(cl(c/.3)),ragged=1-sm(cl((c-.9)/.1))*.5,hh=Math.sin(Math.PI*f)*.6*ledge*ragged+(1-c)*.25,t=.7+.22*tone+.12*vn(u,v,4,4,s+9);
   return px(t*1.0,t*.93,t*.74,hh,.97,.5+.5*ledge*(1-Math.abs(f-.5)*.35),0);};
  case 'reed':return(u,v)=>{const w=u*22+(vn(u,v,4,4,s)-.5)*.8,id=Math.floor(w),f=fr(w),tone=hash(id,0,s),node=Math.abs(fr(v*5+hash(id,5,s))-.5)<.012?.7:1,band=Math.abs(fr(v*2)-.5)<.03?.5:1;
   const hh=Math.sin(Math.PI*f)*.8*band,t=(.74+.22*tone)*node*(.6+.4*band);return px(t,t*.95,t*.72,hh,.9,.55+.45*Math.sin(Math.PI*f),0);};
  case 'timber':return(u,v)=>{const warp=(fbm(u,v,3,2,s)-.5)*.14,ring=Math.sin((v+warp+vn(u,v,2,8,s+2)*.04)*Math.PI*2*13),f=.5+.5*ring,weather=fbm(u,v,3,3,s+5),
   knot=((hash(1,1,s)-.5)*0+Math.exp(-(Math.pow(fr(u-.3-hash(2,2,s)*.4+.5)-.5,2)*60+Math.pow(fr(v-.25-hash(3,3,s)*.5+.5)-.5,2)*400)))*.5,
   crackV=Math.abs(fr(v*3.1+vn(u,v,5,1,s+8)*.03)-.5),crack=crackV<.004&&vn(u,0,6,1,s+12)>.55?1:0,t=.8+.12*f-.1*knot+.1*(weather-.5);
   const g=mix(.0,.1,weather);return px(t*(1-g*.6)*.98,t*(1-g*.2),t*(1+g*.3)*.92,.5+.3*f-.5*crack,.9,1-.8*crack-.2*knot,weather);};
  case 'plank':return(u,v)=>{const b=Math.floor(u*4),f=fr(u*4),gap=f<.04||f>.96,t0=hash(b,0,s),grain=fbm(u*.25+b*.37,v,2,12,s+b*3,3),streak=.5+.5*Math.sin((v+grain*.1)*Math.PI*2*18+b),
   nail=[.1,.9].some(nv=>Math.hypot((f-.5)*.25,fr(v-nv+.5)-.5)<.014),knot=Math.exp(-(Math.pow(f-.5,2)*30+Math.pow(fr(v-hash(b,9,s)+.5)-.5,2)*500))*(hash(b,8,s)>.6?1:0),
   w=fbm(u,v,4,4,s+4),t=.74+.14*t0+.1*streak*grain+.06*(w-.5)-.2*knot;
   if(gap)return px(.35,.3,.26,.05,1,.15,0);if(nail)return px(.3,.28,.26,.8,.6,.4,0);return px(t,t*.96,t*.88,.55+.25*streak*grain-.2*knot,.9,.9-.4*knot,w);};
  case 'wattle':return(u,v)=>{const [f1,f2]=vor(u,v,5,s),crack=cl(1-(f2-f1)/.05),rod=Math.abs(fr(v*8)-.5)<.12,exposed=fbm(u,v,4,4,s+3)>.7,lump=fbm(u,v,6,6,s+6),
   weave=.5+.5*Math.sin((u+(Math.floor(v*8)%2)*.06)*Math.PI*2*10);
   if(exposed)return px(.58+.1*weave,.44+.08*weave,.3,.35+.3*(rod?1:0)*weave,.95,rod?.55:.3,0);
   const t=.82+.12*lump-.2*crack;return px(t,t*.93,t*.8,.55+.25*lump-.4*crack,.97,1-.7*crack,fbm(u,v,3,6,s+9));};
  case 'mudbrick':{const fl=flecks(size,Math.round(size*size/110),7*size/128,s);return(u,v,x,y)=>{const row=Math.floor(v*7),off=(row%2)*.5/3,bu=fr(u*3+off),bv=fr(v*7),mortar=bu<.035||bu>.965||bv<.05||bv>.95,id=Math.floor(u*3+off)+row*13,tone=hash(id,row,s),
   lump=fbm(u,v,8,8,s+5),f=fl[y*size+x];if(mortar)return px(.62,.55,.45,.15,1,.3,0);
   const t=.78+.14*tone+.1*(lump-.5);return px(f?t*1.12:t,f?t*1.0:t*.9,f?t*.72:t*.72,.55+.3*lump+(f?.12:0),.97,.9-.15*(1-lump),fbm(u,v,2,5,s+2));};}
  case 'plaster':return(u,v)=>{const m=fbm(u,v,3,3,s,4),pit=hash(Math.floor(u*size),Math.floor(v*size),s)>.985?1:0,[f1,f2]=vor(u,v,3,s+4),crack=cl(1-(f2-f1)/.018)*(vn(u,v,3,3,s+8)>.5?1:0),stain=fr(0)+vn(u,v,9,2,s+12)*cl(vn(u,v,2,3,s+14)*1.6),t=.88+.1*(m-.5)-.18*pit-.12*stain-.25*crack;
   return px(t,t*.975,t*.92,.5+.2*(m-.5)-.4*crack-.2*pit,.95,1-.7*crack-.3*pit,stain);};
  case 'ashlar':return(u,v)=>{const hs=[.18,.24,.16,.22,.2],ch=hs.map((_,i)=>hs.slice(0,i).reduce((a,b)=>a+b,0)),row=ch.findIndex((c,i)=>fr(v)>=c&&fr(v)<c+hs[i]);const r=Math.max(0,row),rv=(fr(v)-ch[r])/hs[r],n=2+(r%2),off=hash(r,0,s)*.5,bu=fr(u*n+off),id=Math.floor(u*n+off)+r*9,tone=hash(id,r,s),
   joint=bu<.025||bu>.975||rv<.04||rv>.96,chisel=.5+.5*Math.sin((u*40+v*13+tone*9)*Math.PI),w=fbm(u,v,8,8,s+3);if(joint)return px(.5,.48,.45,.1,1,.25,0);
   const t=.8+.14*tone+.05*chisel+.05*(w-.5);return px(t,t*.98,t*.94,.6+.2*w+.08*chisel-.15*Math.min(bu,1-bu<.1?1:0),.93,.95-.2*(1-sm(cl(rv*8))),vn(u,v,3,3,s+2));};
  case 'rubble':return(u,v)=>{const [f1,f2,id]=vor(u,v,6,s),edge=f2-f1,mortar=edge<.08,dome=cl(1-f1*1.4),tone=id,w=fbm(u,v,12,12,s+5);if(mortar)return px(.5,.46,.4,.1,1,.2+edge*3,0);
   const t=.68+.22*tone+.06*(w-.5),warm=hash(Math.floor(id*100),3,s);return px(t*(.95+.1*warm),t*.96,t*(.9+.06*(1-warm)),.35+.5*dome+.1*w,.95,.6+.4*sm(cl(edge*3)),vn(u,v,3,3,s+2));};
  case 'slate':return(u,v)=>{const row=Math.floor(v*8),bu=fr(u*4+(row%2)*.5),bv=fr(v*8),id=Math.floor(u*4+(row%2)*.5)+row*7,tone=hash(id,row,s),edge=bu<.02||bu>.98,shade=sm(cl(bv/.25))*.4+.6,lift=1-bv,
   w=fbm(u,v,10,10,s+3),t=(.66+.2*tone)*shade+.05*(w-.5);if(edge)return px(.3,.31,.33,.1,.9,.3,0);return px(t*.96,t*.99,t*1.05,.35+.5*lift+.1*w,.62,.5+.5*shade,vn(u,v,4,2,s+2));};
  case 'tile':return(u,v)=>{const row=Math.floor(v*5),cu=fr(u*6+(row%2)*.5),bv=fr(v*5),id=Math.floor(u*6+(row%2)*.5)+row*11,tone=hash(id,row,s),barrel=Math.sin(Math.PI*cu),lap=sm(cl(bv/.22)),w=fbm(u,v,6,6,s+3),
   t=(.7+.2*tone)*(.55+.45*barrel)*(.7+.3*lap)+.06*(w-.5);return px(t*1.0,t*.86,t*.74,.2+.7*barrel*(.55+.45*lap),.85,.4+.5*lap*barrel+.1,vn(u,v,5,2,s+2));};
  case 'hide':return(u,v)=>{const [f1,f2,id]=vor(u,v,3,s),seam=f2-f1<.03,fibre=fbm(u*.5,v*3,4,24,s+2,3),mott=fbm(u,v,5,5,s+6),stitch=seam&&fr((u+v)*40)<.4,t=.72+.12*id+.14*(fibre-.5)+.08*(mott-.5);
   if(stitch)return px(.3,.26,.2,.7,.8,.5,0);if(seam)return px(.45,.4,.34,.2,.9,.3,0);return px(t*1.0,t*.93,t*.82,.45+.3*fibre,.88,.8+.2*fibre,mott);};
  case 'turf':return(u,v)=>{const [f1,f2,id]=vor(u,v,4,s),edge=f2-f1<.06,blade=hash(Math.floor(u*size*.5),Math.floor(v*size*.25),s),clump=fbm(u,v,10,10,s+3),t=.62+.2*id+.14*blade+.08*(clump-.5);
   if(edge)return px(.4,.33,.24,.2,1,.35,0);return px(t*.92,t*1.0,t*.62,.4+.4*blade+.15*clump,.98,.7+.3*blade,fbm(u,v,2,4,s+2));};
 }
}
export type MaterialSet={size:number;layers:number;a:Uint8Array;b:Uint8Array;bytes:number;mipBytes:number};
const setCache=new Map<string,MaterialSet>();
/** Generate (and cache) the packed set. Deterministic: same (size, seed) gives the same bytes. */
export function generateMaterialSet(size=128,seed=1337):MaterialSet{
 const key=size+':'+seed,hit=setCache.get(key);if(hit)return hit;
 const n=size*size*4,a=new Uint8Array(n*LAYER_COUNT),b=new Uint8Array(n*LAYER_COUNT),q=(v:number)=>Math.max(0,Math.min(255,Math.round(v*255)));
 MATERIAL_LAYERS.forEach((l,li)=>{const g=genFor(l,size,seed);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const p=g((x+.5)/size,(y+.5)/size,x,y),o=li*n+(y*size+x)*4;
   a[o]=q(p.r);a[o+1]=q(p.g);a[o+2]=q(p.b);a[o+3]=q(p.h);b[o]=q(p.ro);b[o+1]=q(p.cav);b[o+2]=q(p.st);b[o+3]=255;}});
 const bytes=a.length+b.length,out={size,layers:LAYER_COUNT,a,b,bytes,mipBytes:Math.round(bytes*4/3)};setCache.set(key,out);return out;
}
/** Measured GPU memory of the set (both layered atlases, full mip chain). */
export function textureMemory(size:number){const bytes=size*size*4*LAYER_COUNT*2;return {size,layers:LAYER_COUNT,baseBytes:bytes,withMipsBytes:Math.round(bytes*4/3),withMipsMB:+(bytes*4/3/1048576).toFixed(2)};}
export const TEXTURE_SIZES={standard:128,high:192,ultra:256} as const;
export const textureSizeFor=(level:'standard'|'high'|'ultra')=>TEXTURE_SIZES[level]??128;

// ---------------------------------------------------------------- material choice (per civ course / palette id / age)
const COURSE_LAYER:Record<string,MaterialLayer>={rockcut:'rubble',smooth:'plaster',brick:'mudbrick',timberPaper:'plaster',laterite:'ashlar',ashlar:'ashlar',rammed:'mudbrick',polygonal:'rubble',stucco:'plaster',weave:'reed',wattle:'wattle',log:'timber',felt:'hide',turf:'turf',thatch:'thatch',tile:'tile',plank:'plank',beam:'timber',cloth:'hide',earth:'mudbrick'};
const ID_LAYER:Record<string,MaterialLayer|null>={woodLight:'plank',woodMid:'timber',woodDark:'timber',woodEdge:'timber',woodInlay:'plank',trunk:'timber',thatch:'thatch',straw:'thatch',shingle:'plank',tile:'tile',slate:'slate',stone:'ashlar',stoneDark:'rubble',plaster:'plaster',mud:'mudbrick',cloth:'hide',clothRed:'hide',clothBlue:'hide',
 recess:null,foliage:null,foliageDark:null,moss:null,water:null,fire:null,iron:null};
/** The layer a part material draws with, or NO_LAYER. `course` is the civ swatch's construction course, `era` the building's age (stone is rubble before era 2, ashlar after). */
export function layerForMat(mat:string,course?:string,era=2):number{
 let l:MaterialLayer|null|undefined;
 if(course&&COURSE_LAYER[course])l=COURSE_LAYER[course];
 else if(mat in ID_LAYER)l=ID_LAYER[mat];
 else{const slot=mat.replace(/^.*[.:]/,'').replace(/\d+$/,'');l=slot.startsWith('wall')?(era>=3?'ashlar':era>=1?'plaster':'mudbrick'):slot.startsWith('roof')?(era>=2?'tile':'thatch'):slot==='trim'||slot==='accent'?'timber':slot==='cloth'?'hide':slot==='ground'?'mudbrick':slot==='dark'?null:null;}
 if(l==='ashlar'&&era<2&&(mat==='stone'||mat==='stoneDark'))l='rubble';
 return l?layerIndex(l):NO_LAYER;
}
/** Per-layer moss tolerance used by the shader (hide never grows moss). */
export const LAYER_MOSS=[.8,.6,.8,.7,.6,.7,1,.6,1,.5,1,0,.3] as const;
export const LAYER_IS_ROOF=[1,1,0,0,0,0,0,0,0,1,1,1,1] as const;

// ---------------------------------------------------------------- GLSL (shared by the game layer and the preview)
export type TextureUniforms={a:{value:unknown};b:{value:unknown};set:{value:number};bump:{value:number};wet:{value:number};sun:{value:number};moss:{value:number}};
type ShaderLike={uniforms:Record<string,{value:unknown}>;vertexShader:string;fragmentShader:string};
const arr=(a:readonly number[])=>a.map(v=>v.toFixed(2)).join(',');
export const BUILDING_SHADER_KEY='bld-tex-v1';
/** Patch a MeshStandardMaterial shader (instanced, vertex coloured, flat shaded) to use the packed set. Call BEFORE patchSnowShader. */
export function patchBuildingShader(shader:ShaderLike,u:TextureUniforms){
 shader.uniforms.uBldA=u.a;shader.uniforms.uBldB=u.b;shader.uniforms.uBldSet=u.set;shader.uniforms.uBldBump=u.bump;shader.uniforms.uBldWet=u.wet;shader.uniforms.uBldSun=u.sun;shader.uniforms.uBldMoss=u.moss;
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 bm;\nvarying vec4 vBm;\nvarying vec3 vBldN;\nvarying float vBldY;\nvarying vec3 vBldInst;')
  .replace('#include <begin_vertex>',`#include <begin_vertex>
 vBm=bm;vBldY=position.y;
 {vec3 bn=normal;vBldInst=vec3(0.0);
 #ifdef USE_INSTANCING
  bn=mat3(instanceMatrix)*bn;vBldInst=vec3(instanceMatrix[3].x,instanceMatrix[3].y,instanceMatrix[3].z);
 #endif
  vBldN=normalize(mat3(modelMatrix)*bn);}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uBldA;uniform sampler2DArray uBldB;uniform float uBldSet;uniform float uBldBump;uniform float uBldWet;uniform float uBldSun;uniform float uBldMoss;
varying vec4 vBm;varying vec3 vBldN;varying float vBldY;varying vec3 vBldInst;
const float BLD_MOSS[13]=float[13](${arr(LAYER_MOSS)});
const float BLD_ROOF[13]=float[13](${arr(LAYER_IS_ROOF)});
vec2 bldHash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
vec3 bldPerturb(vec3 pos,vec3 N,vec2 dH,float fd){vec3 sx=normalize(dFdx(pos)),sy=normalize(dFdy(pos));vec3 R1=cross(sy,N),R2=cross(N,sx);float det=dot(sx,R1)*fd;vec3 g=sign(det)*(dH.x*R1+dH.y*R2);return normalize(abs(det)*N-g);}
`)
  .replace('#include <map_fragment>',`
 float bldRough=1.0,bldH=0.0,bldOn=0.0;vec3 bldTint=vec3(1.0);float bldBleach=0.0,bldMoss=0.0;
#ifdef USE_MAP
 vec4 sampledDiffuseColor=texture2D(map,vMapUv);
 if(uBldSet>0.5&&vBm.x>0.002){
  bldOn=1.0;float lay=floor(vBm.x*255.0+0.5)-1.0,wear=vBm.y,hF=vBm.z,sd=vBm.w;
  vec2 off=bldHash2(vBldInst.xz*0.173+vBldInst.y)+sd*vec2(0.37,0.71);
  vec2 uvT=vMapUv+off;vec4 A=texture(uBldA,vec3(uvT,lay));vec4 B=texture(uBldB,vec3(uvT,lay));
  float nz=texture(uBldA,vec3(uvT*0.23+off,lay)).g;
  diffuseColor.rgb*=A.rgb*1.14*mix(1.0,B.g,0.85);bldH=A.a;bldRough=clamp(B.r/0.9,0.5,1.15);
  vec3 N=normalize(vBldN);float up=N.y,side=1.0-abs(up);int li=int(lay);
  float north=smoothstep(0.15,0.85,-N.z)*side,roofN=smoothstep(0.1,0.8,-N.z)*smoothstep(0.2,0.7,up),low=1.0-smoothstep(0.15,1.3,vBldY);
  float m=uBldMoss*(0.25+wear)*(north*(0.35+0.65*low)+low*side*0.4+roofN*0.55)*(0.45+nz)*BLD_MOSS[li];
  bldMoss=smoothstep(0.32,0.72,m)*0.8*(1.0-uSnow);
  float roof=BLD_ROOF[li];float soot=roof*smoothstep(0.7,1.0,hF)*smoothstep(0.1,0.5,up)*wear*0.6;
  float streak=(1.0-roof)*B.b*smoothstep(0.55,0.95,hF)*side*(0.25+0.75*uBldWet)*(0.4+wear);
  float splash=(1.0-roof)*low*side*wear*0.3;
  bldTint=vec3(1.0)*(1.0-soot*0.55-streak*0.4-splash*0.5)*(1.0-0.22*uBldWet*(0.5+0.5*B.b));
  bldBleach=uBldSun*(0.5*smoothstep(0.3,0.9,up)+0.5*smoothstep(0.2,0.8,N.z))*(0.3+wear)*0.3;
  bldRough*=1.0-0.4*uBldWet;
 }else{diffuseColor.rgb*=mix(vec3(1.0),sampledDiffuseColor.rgb,vGrain);}
#endif`)
  .replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
 if(bldOn>0.5){diffuseColor.rgb*=bldTint;float bl=dot(diffuseColor.rgb,vec3(0.3,0.59,0.11));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(bl*1.1+0.02,bl*1.06+0.015,bl*0.98),bldBleach);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.17,0.21,0.09)*(0.7+0.6*bl),bldMoss);}`)
  .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=clamp(roughnessFactor*bldRough,0.05,1.0);')
  .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n if(bldOn>0.5&&uBldBump>0.0){normal=bldPerturb(-vViewPosition,normal,vec2(dFdx(bldH),dFdy(bldH))*uBldBump,faceDirection);}');
}
/** Per-vertex packing: bm = (layer, wear, height fraction within the part, per-part seed), all 0..255. */
export const packBm=(layerPlus1:number,wear:number,hFrac:number,seed:number)=>[layerPlus1&255,Math.round(cl(wear)*255),Math.round(cl(hFrac)*255),Math.round(cl(seed)*255)] as const;
