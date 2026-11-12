/** Detail kit for the village grammar (buildingFamiliesVillage.ts): composite pieces that give walls, roofs, openings and yards
 * believable construction at near LOD while the massing (lod 2) stays a few solid parts. Pure: every helper only pushes Parts.
 * Conventions follow buildingParts.ts: metres, Y up, entrance +Z, `pos` is the centre of a part's base. Detail parts are lod 0
 * (near only) or lod 1 (near+mid); anything that carries a silhouette is lod 2. */
import {beam,part,type LodTier,type Part} from './buildingParts';
import type {CarvedMaterialId as M} from './carvedPalette';
import type {FamilyContext} from './buildingHelpers';

export type V3=[number,number,number];
export type Face='+z'|'-z'|'+x'|'-x';
const TAU=Math.PI*2;

export const box=(p:Part[],mat:M,size:V3,pos:V3,lod:LodTier=2,rot?:V3)=>{p.push(part('box',mat,size,pos,lod,rot));};
export const cyl=(p:Part[],mat:M,dia:number,h:number,pos:V3,lod:LodTier=2,sides=8,rot?:V3,top?:number)=>{p.push(part('cylinder',mat,[dia,h,top??dia],pos,lod,rot,sides));};
export const post=(p:Part[],mat:M,x:number,z:number,h:number,t=.14,lod:LodTier=1,y0=0)=>{p.push(beam(mat,[x,y0,z],[x,y0+h,z],t,lod));};

/** A box whose centre sits at radius `r` and angle `a` (0 = up, turning toward +Z) around an X-axis wheel at (cx,cy,0); height runs radially. */
export function radialBox(p:Part[],mat:M,cx:number,cy:number,r:number,a:number,size:V3,lod:LodTier,tilt=0){
  const h=size[1],rr=r-h;
  p.push(part('box',mat,size,[cx,cy+rr*Math.cos(a),rr*Math.sin(a)],lod,[a+tilt,0,0]));
}
/** A box standing out from a hub on a wheel turning about Z (windmill sails, hub at hx,hy,hz): starts at radius r0 along angle `a`
 * (0 = up, turning toward +X), `side` shifts it across the radial line inside the sail plane. */
export function radialBoxZ(p:Part[],mat:M,hx:number,hy:number,hz:number,r0:number,a:number,size:V3,lod:LodTier,side=0){
  const sx=Math.sin(a),cy=Math.cos(a);
  p.push(part('box',mat,size,[hx+sx*r0+cy*side,hy+cy*r0-sx*side,hz],lod,[0,0,-a]));
}

/** Wall segment with stone coursing: massing box plus course lines and a plinth lip on the listed faces. */
export function stoneWall(p:Part[],o:{x:number;z:number;w:number;d:number;y0?:number;h:number;mat?:M;line?:M;faces?:Face[];course?:number;lod?:LodTier}){
  const {x,z,w,d,h}=o,y0=o.y0??0,mat=o.mat??'stone',line=o.line??'stoneDark',course=o.course??.34,faces=o.faces??['+z','-z','+x','-x'];
  p.push(part('box',mat,[w,h,d],[x,y0,z],o.lod??2));
  const n=Math.max(2,Math.floor(h/course));
  for(const f of faces)for(let i=1;i<n;i++){
    const y=y0+i*h/n;
    if(f==='+z'||f==='-z')box(p,line,[w+.03,.04,.04],[x,y,z+(f==='+z'?1:-1)*(d/2+.005)],0);
    else box(p,line,[.04,.04,d+.03],[x+(f==='+x'?1:-1)*(w/2+.005),y,z],0);
  }
}
/** Alternating long/short corner blocks up the four corners of a masonry or framed block. */
export function quoins(p:Part[],x:number,z:number,w:number,d:number,y0:number,h:number,mat:M='stoneDark',count=4){
  const bh=h/count;
  for(const sx of[-1,1])for(const sz of[-1,1])for(let i=0;i<count;i++){
    const long=i%2===0,bw=long?.34:.22,bd=long?.22:.34;
    box(p,mat,[bw,bh*.92,bd],[x+sx*(w/2-bw/2+.02),y0+i*bh,z+sz*(d/2-bd/2+.02)],0);
  }
}
/** Timber-frame facade on a face: posts, sill and head rails, a mid rail and diagonal braces over a plaster/daub infill that the caller drew. */
export function timberFrame(p:Part[],o:{face:Face;cx:number;cz:number;len:number;depth:number;y0:number;h:number;bays:number;frame?:M;brace?:boolean;lod?:LodTier}){
  const {face,cx,cz,len,depth,y0,h,bays}=o,m=o.frame??'woodDark',lod=o.lod??1,zFace=face==='+z'||face==='-z',s=face==='+z'||face==='+x'?1:-1,off=depth/2+.025;
  const at=(u:number,y:number):V3=>zFace?[cx+u,y,cz+s*off]:[cx+s*off,y,cz+u];
  const sz=(a:number,b:number,c:number):V3=>zFace?[a,b,c]:[c,b,a];
  for(let i=0;i<=bays;i++)p.push(part('box',m,sz(.13,h,.07),at(-len/2+i*len/bays,y0),lod));
  p.push(part('box',m,sz(len+.1,.12,.08),at(0,y0),lod),part('box',m,sz(len+.1,.12,.08),at(0,y0+h-.12),lod));
  if(h>1.6)p.push(part('box',m,sz(len+.06,.09,.07),at(0,y0+h*.52),0));
  if(o.brace)for(let i=0;i<bays;i++){const u=-len/2+(i+.5)*len/bays,sg=i%2?1:-1,ang=Math.atan2(h*.8,len/bays*.9);
    p.push(part('box',m,sz(.08,Math.hypot(h*.8,len/bays*.9),.06),at(u,y0+h*.1),0,zFace?[0,0,sg*(Math.PI/2-ang)*(-1)]:[sg*(Math.PI/2-ang),0,0]));}
}
/** Door set into a face: recessed leaf, frame, lintel and a stone step. `w` x `h` opening. */
export function doorway(p:Part[],o:{face?:Face;x:number;z:number;w?:number;h?:number;wall:number;leaf?:M;frame?:M;step?:boolean;double?:boolean}){
  const face=o.face??'+z',w=o.w??.9,h=o.h??1.7,leaf=o.leaf??'woodDark',frame=o.frame??'woodEdge',zFace=face==='+z'||face==='-z',s=face==='+z'||face==='+x'?1:-1,e=o.wall/2;
  const at=(u:number,y:number,out:number):V3=>zFace?[o.x+u,y,o.z+s*(e+out)]:[o.x+s*(e+out),y,o.z+u];
  const sz=(a:number,b:number,c:number):V3=>zFace?[a,b,c]:[c,b,a];
  p.push(part('box','recess',sz(w,h,.08),at(0,0,.015),1));
  const lv=o.double?[-w/4,w/4]:[0];for(const u of lv)p.push(part('box',leaf,sz(o.double?w/2-.04:w-.1,h-.1,.05),at(u,0,.045),1));
  p.push(part('box',frame,sz(w+.28,.16,.12),at(0,h,.02),1),part('box',frame,sz(.12,h,.1),at(-w/2-.06,0,.02),1),part('box',frame,sz(.12,h,.1),at(w/2+.06,0,.02),1));
  if(o.step!==false)p.push(part('box','stoneDark',sz(w+.5,.14,.45),at(0,0,.22),0));
  p.push(part('box','iron',sz(.07,.07,.05),at(w/2-.13,h*.5,.075),0)); // latch
}
/** Window with recess, sill and a pair of open shutters (near) — `face` selects the wall plane. */
export function window2(p:Part[],o:{face?:Face;x:number;y:number;z:number;wall:number;w?:number;h?:number;shutters?:M|null}){
  const face=o.face??'+z',w=o.w??.5,h=o.h??.55,zFace=face==='+z'||face==='-z',s=face==='+z'||face==='+x'?1:-1,e=o.wall/2;
  const at=(u:number,y:number,out:number):V3=>zFace?[o.x+u,y,o.z+s*(e+out)]:[o.x+s*(e+out),y,o.z+u];
  const sz=(a:number,b:number,c:number):V3=>zFace?[a,b,c]:[c,b,a];
  p.push(part('box','recess',sz(w,h,.06),at(0,o.y,.01),0),part('box','woodLight',sz(w+.16,.07,.14),at(0,o.y-.07,.04),0));
  if(o.shutters!==null)for(const u of[-1,1])p.push(part('box',o.shutters??'woodMid',sz(.2,h,.04),at(u*(w/2+.12),o.y,.03),0));
}
/** Stone chimney stack with cap; runs from y0 to y1. */
export function chimney(p:Part[],x:number,z:number,y0:number,y1:number,w=.55,mat:M='stone'){
  p.push(part('box',mat,[w,y1-y0,w],[x,y0,z],2),part('box','stoneDark',[w+.14,.12,w+.14],[x,y1-.02,z],1),part('box',mat,[w*.62,.14,w*.62],[x,y1+.1,z],0),part('box','recess',[w*.5,.04,w*.5],[x,y1+.24,z],0));
}
/** Barrel (bound staves), sack, crate, bucket: small yard props that say what the building does. */
export const barrel=(p:Part[],x:number,y:number,z:number,s=1,lod:LodTier=0)=>{p.push(part('cylinder','woodMid',[.5*s,.7*s,.5*s],[x,y,z],lod,undefined,6),part('cylinder','iron',[.53*s,.05*s,.53*s],[x,y+.14*s,z],0,undefined,6),part('cylinder','iron',[.53*s,.05*s,.53*s],[x,y+.5*s,z],0,undefined,6));};
export const sack=(p:Part[],x:number,y:number,z:number,s=1,yaw=0,lod:LodTier=0)=>{p.push(part('box','cloth',[.46*s,.34*s,.3*s],[x,y,z],lod,[0,yaw,0]),part('box','cloth',[.28*s,.14*s,.2*s],[x,y+.32*s,z],0,[0,yaw,0]));};
export const crate=(p:Part[],x:number,y:number,z:number,s=1,yaw=0,lod:LodTier=0)=>{p.push(part('box','woodLight',[.5*s,.4*s,.5*s],[x,y,z],lod,[0,yaw,0]),part('box','woodDark',[.52*s,.06*s,.52*s],[x,y+.17*s,z],0,[0,yaw,0]));};
export const bucket=(p:Part[],x:number,y:number,z:number,lod:LodTier=0)=>{p.push(part('cylinder','woodDark',[.3,.26,.24],[x,y,z],lod,undefined,6));};
/** Ladder leaning from (x,0,z0) up to (x,top,z1). */
export function ladder(p:Part[],x:number,z0:number,z1:number,top:number,rungs=6,lod:LodTier=0){
  for(const s of[-.2,.2])p.push(beam('woodDark',[x+s,0,z0],[x+s,top,z1],.06,lod));
  for(let i=1;i<=rungs;i++){const t=i/(rungs+1);p.push(part('box','woodLight',[.44,.04,.05],[x,top*t,z0+(z1-z0)*t],0));}
}
/** Stacked firewood: rows of logs lying along Z, `w` wide, centred at (x,z). */
export function woodpile(p:Part[],x:number,z:number,w=1.1,rows=3,len=.6,lod:LodTier=0){
  for(let r=0;r<rows;r++){const n=Math.max(2,Math.round(w/.2)-r);for(let i=0;i<n;i++)p.push(part('cylinder',i%2?'woodMid':'woodLight',[.17,len,.17],[x+(i-(n-1)/2)*.19,.1+r*.16,z-len/2],lod,[Math.PI/2,0,0],5));}
}
/** Thatch/shingle gable roof with an eave drop board, ridge roll/cap and course lines; axis = ridge direction. Returns the rise. */
export function roofGable(p:Part[],ctx:FamilyContext,o:{span:number;len:number;eave:number;pitch:number;cx:number;cz:number;axis:'x'|'z';over?:number;mat:M;ridge?:boolean;hipEnds?:boolean}){
  const {span,len,eave,pitch,cx,cz,axis,mat}=o,ov=o.over??.28,rise=Math.max(.3,span/2*Math.tan(pitch)),rot:V3|undefined=axis==='x'?[0,Math.PI/2,0]:undefined,L=len+2*ov,S=span+2*ov;
  p.push(part('prism',mat,[S,rise,L],[cx,eave,cz],2,rot));
  const a=Math.atan2(rise,S/2);
  // layered rows: slightly proud slabs stepping up each slope (thatch bands / shingle courses / tile rows)
  const rows=mat==='thatch'||mat==='straw'?3:mat==='slate'||mat==='shingle'?3:4,line:M=mat==='thatch'||mat==='straw'?'woodDark':mat==='tile'?'stoneDark':'woodEdge';
  for(const side of[-1,1])for(let i=0;i<rows;i++){
    const t=.2+i*(.62/Math.max(1,rows-1)),lx=side*(S/2)*(1-t),y=eave+rise*t,theta=side<0?a:-a;
    const pos:V3=axis==='z'?[cx+lx,y+.01,cz]:[cx,y+.01,cz-lx];
    p.push(part('box',line,[.1,.035,L-.06],pos,0,axis==='z'?[0,0,theta]:[0,Math.PI/2,theta]));
  }
  if(o.ridge!==false){
    const rl=L+.04;
    if(mat==='thatch'||mat==='straw')p.push(part('cylinder',mat,[.3,rl,.3],axis==='x'?[cx+rl/2,eave+rise-.12,cz]:[cx,eave+rise-.12,cz-rl/2],1,axis==='x'?[0,0,Math.PI/2]:[Math.PI/2,0,0],6));
    else p.push(part('box',mat==='tile'?'stoneDark':'woodEdge',axis==='x'?[rl,.14,.2]:[.2,.14,rl],[cx,eave+rise-.05,cz],1));
  }
  // eave fascia
  for(const side of[-1,1])p.push(part('box','woodEdge',axis==='x'?[L,.1,.06]:[.06,.1,L],axis==='x'?[cx,eave-.05,cz+side*(S/2-.02)]:[cx+side*(S/2-.02),eave-.05,cz],0));
  // gable bargeboards
  for(const e of[-1,1]){const ex=axis==='x'?cx+e*(L/2-.02):cx,ez=axis==='z'?cz+e*(L/2-.02):cz;p.push(part('box','woodEdge',axis==='x'?[.07,.1,S]:[S,.1,.07],[ex,eave-.04,ez],0));}
  return rise;
}
/** Awning on two posts over a work apron (cloth or boards), front at z. */
export function awning(p:Part[],x:number,z:number,w:number,depth:number,y:number,cloth:M='clothRed'){
  p.push(part('wedge',cloth,[w,.4,depth],[x,y-.3,z],1,[0,Math.PI,0]));
  for(const s of[-1,1])p.push(beam('woodDark',[x+s*(w/2-.08),0,z+depth-.1],[x+s*(w/2-.08),y-.12,z+depth-.1],.09,1));
}
/** Low fence run along X at z (posts + two rails). */
export function fenceX(p:Part[],x0:number,x1:number,z:number,h=.8,lod:LodTier=0){
  const n=Math.max(2,Math.round((x1-x0)/1.1));
  for(let i=0;i<=n;i++)p.push(beam('woodDark',[x0+i*(x1-x0)/n,0,z],[x0+i*(x1-x0)/n,h,z],.09,lod));
  for(const y of[h*.45,h*.85])p.push(part('box','woodMid',[x1-x0,.06,.05],[(x0+x1)/2,y,z],lod));
}
/** Standing millstone/grinding disc with a hub (upright leaning disc). */
export function millstoneUpright(p:Part[],x:number,z:number,dia=.9,thick=.2,yaw=0){
  p.push(part('cylinder','stoneDark',[dia,thick,dia],[x,dia/2,z],0,[Math.PI/2,yaw,0],12),part('cylinder','recess',[dia*.2,thick+.02,dia*.2],[x,dia/2,z],0,[Math.PI/2,yaw,0],6));
}
export const ring=(n:number,f:(a:number,i:number)=>void,phase=0)=>{for(let i=0;i<n;i++)f(i/n*TAU+phase,i);};
