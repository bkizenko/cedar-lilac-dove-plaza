import * as THREE from 'three';
import type {BoundaryKind} from '../game/fieldLook';
import {mergeParts,tube,rngFrom,type V3} from './painterTrees';
import {blade} from './painterCrops';
/** Painterly field boundaries that read as what they are. Each piece is BOUNDARY_LEN metres long along local +x (the renderer stretches it
 * to the real chord between two sites on the drawn soil edge); pieces come in a few variants plus a low-poly one for the middle distance.
 *   stone  drystone wall: tapered, coursed face stones with chinks, a dark rubble core, upright coping stones on top
 *   wattle woven hurdle: pointed stakes with withies woven in and out, ragged ends
 *   hedge  dense angular shrub clumps of mixed species, bare stems and twigs, berries on one variant
 *   bank   grassy earth bank, broken by patches of bare earth, with stakes and laid brush on the crest
 *   gate   wooden field gate, used at the gate gap and where a trail crosses
 * Vertex colour is the linear material colour for wattle, hedge, bank and gate; for stone it is grey light/shade only and the instance colour
 * carries the local rock (see geologyAt in contourFields.ts). Pure, deterministic geometry. */
export const BOUNDARY_LEN=1.5;
export type BoundaryMeshKind=BoundaryKind|'gate';
export type BoundaryDetail=number|'lo';
const lin=(h:string):V3=>{const c=new THREE.Color(h);return[c.r,c.g,c.b];};
const mul=(c:V3,k:number):V3=>[c[0]*k,c[1]*k,c[2]*k];
const mix=(a:V3,b:V3,t:number):V3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
/** Paint every vertex through fn(x,y,z) and return the geometry with flat-ish normals. */
function paint(g:THREE.BufferGeometry,fn:(x:number,y:number,z:number)=>V3){const p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=fn(p.getX(i),p.getY(i),p.getZ(i));c[i*3]=v[0];c[i*3+1]=v[1];c[i*3+2]=v[2];}g.setAttribute('color',new THREE.BufferAttribute(c,3));g.computeVertexNormals();return g;}
/** A rough, slightly lopsided stone block (five faces, no bottom): corners are nudged, lit from the top. */
function chunk(cx:number,cy:number,cz:number,w:number,h:number,d:number,rnd:()=>number,jit:number,col:V3,rotY=0,sheen=.28){
 const g=new THREE.BoxGeometry(w,h,d),p=g.attributes.position,off=new Map<string,V3>();
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=`${Math.sign(x)}${Math.sign(y)}${Math.sign(z)}`;let o=off.get(k);if(!o){o=[(rnd()-.5)*jit*w,(rnd()-.5)*jit*h*.7,(rnd()-.5)*jit*d];off.set(k,o);}p.setXYZ(i,x+o[0],y+o[1],z+o[2]);}
 g.setIndex(Array.from(g.index!.array).filter((_,i)=>i<18||i>=24));
 if(rotY)g.rotateY(rotY);g.translate(cx,cy,cz);
 return paint(g,(_x,y)=>mul(col,.86+sheen*Math.max(0,Math.min(1,(y-(cy-h/2))/Math.max(.01,h)))));
}
const stoneGrey=(rnd:()=>number,weathered:number):V3=>{const v=.74+.34*rnd(),r=rnd();return r<weathered?[v*.9,v*1.0,v*.8]:r<weathered+.12?[v*1.06,v*.98,v*.9]:[v,v*.99,v*.97];};
function stakeSpike(x:number,z:number,h:number,r:number,col:V3,tiltX=0,tiltZ=0,tip=true){
 const g=new THREE.CylinderGeometry(r*.6,r,h,4,1,true);g.translate(0,h/2,0);
 if(tip){const t=new THREE.ConeGeometry(r*.62,r*1.6,4,1,true);t.translate(0,h+r*.8,0);const m=mergeParts([paint(g,(_x,y)=>mul(col,.8+.35*y/h)),paint(t,()=>mul(col,1.1))]);m.rotateX(tiltX);m.rotateZ(tiltZ);m.translate(x,0,z);return m;}
 g.rotateX(tiltX);g.rotateZ(tiltZ);g.translate(x,0,z);return paint(g,(_x,y)=>mul(col,.8+.35*y/h));
}
// ---------------------------------------------------------------- drystone wall
function wall(seed:number,hs:number[],weathered:number,lo=false){
 const rnd=rngFrom(seed),L=BOUNDARY_LEN,H=hs.reduce((a,b)=>a+b,0),baseHalf=.27,topHalf=.18,halfAt=(y:number)=>baseHalf+(topHalf-baseHalf)*y/H,parts:THREE.BufferGeometry[]=[];
 const core=new THREE.BoxGeometry(L+.04,H*.96,(baseHalf+topHalf)*.95),cp=core.attributes.position;
 for(let i=0;i<cp.count;i++)if(cp.getY(i)>0)cp.setZ(i,cp.getZ(i)*topHalf/baseHalf*1.15);
 core.translate(0,H*.48,0);parts.push(paint(core,(_x,y)=>mul([.62,.6,.58],.36+.2*y/H)));
 let y=0;
 for(let c=0;c<hs.length;c++){
  const h=hs[c],half=halfAt(y+h/2),span=lo?.46:.2,var_=lo?.22:.22;
  for(const side of [-1,1]){
   let x=-L/2-rnd()*.18;
   while(x<L/2-.03){
    const w=span+rnd()*var_,ww=Math.min(w,L/2+.07-x);if(ww<.08)break;
    const sh=h*(.84+.3*rnd()),depth=.16+rnd()*.1+(rnd()<.12?.07:0),cz=side*(half-depth/2+.035*(rnd()-.25)),cx=x+ww/2;
    parts.push(chunk(cx,y+sh/2+rnd()*.012,cz,ww-(lo?.03:.02),sh,depth,rnd,.24,stoneGrey(rnd,weathered),(rnd()-.5)*.18));
    x+=ww;
   }
  }
  y+=h;
 }
 // Coping: upright stones along the top, unequal heights.
 let x=-L/2;
 while(x<L/2-.02){const w=(lo?.3:.12)+rnd()*(lo?.14:.1),hh=.12+rnd()*.08;parts.push(chunk(x+w/2,H+hh/2-.012,0,w-.012,hh,topHalf*2+.06+(rnd()-.5)*.05,rnd,.2,stoneGrey(rnd,weathered*.5),(rnd()-.5)*.14,.34));x+=w;}
 return mergeParts(parts);
}
// ---------------------------------------------------------------- wattle hurdle
const WITHY=['#a68a5c','#b59a62','#8f7650','#9c8358'].map(lin),STAKE=['#6a5238','#5a4630','#74583a'].map(lin);
function wattle(seed:number,rows:number,height:number,lo=false){
 const rnd=rngFrom(seed),L=BOUNDARY_LEN,parts:THREE.BufferGeometry[]=[],n=lo?5:6,sp=1.44/(n-1);
 for(let i=0;i<n;i++){const x=-.72+i*sp+(rnd()-.5)*.06,h=height-.02+rnd()*.14;parts.push(stakeSpike(x,(rnd()-.5)*.02,h,.03+rnd()*.012,STAKE[Math.floor(rnd()*STAKE.length)],(rnd()-.5)*.05,(rnd()-.5)*.05));}
 if(lo){
  // Low-poly: a banded panel (dark/light withy courses) between the stakes.
  const g=new THREE.BoxGeometry(L-.06,height*.8,.08);g.translate(0,height*.46,0);const c=lin('#b39a6c'),d=lin('#7d6444');parts.push(paint(g,(_x,y)=>mul(Math.floor(y/(height*.8)*9)%2?c:d,.9+.2*rnd())));
  return mergeParts(parts);
 }
 for(let r=0;r<rows;r++){
  const y=.1+r*(height-.2)/Math.max(1,rows-1),phase=(r%2)*Math.PI,col=WITHY[Math.floor(rnd()*WITHY.length)],pts:V3[]=[];
  const x0=-L/2-.04+rnd()*.12,x1=L/2+.04-rnd()*.12;
  for(let k=0;k<=n*2-2;k++){const t=k/(n*2-2),x=x0+(x1-x0)*t;pts.push([x,y+(rnd()-.5)*.018,.052*Math.sin((x+.72)/sp*Math.PI+phase)]);}
  parts.push(tube(pts,pts.map(()=>.03+rnd()*.008),3,()=>mul(col,.88+.2*rnd()),seed+r*7));
 }
 return mergeParts(parts);
}
// ---------------------------------------------------------------- hedge
const SPECIES=['#6e9a45','#46683a','#7fa34c','#325a35','#5e8c46','#8a9a4a','#52783d'].map(lin),TWIG=lin('#6a5a3c'),STEM=lin('#5a4836'),BERRY=lin('#b13a2e'),DRY=lin('#a3a65a');
function hedge(seed:number,berries:boolean,lo=false){
 const rnd=rngFrom(seed),parts:THREE.BufferGeometry[]=[],layers=lo?[[.3,.55,3],[.55,.85,3]]:[[.14,.4,7],[.38,.65,8],[.62,.92,6]];
 // Dark inner mass so the hedge is dense (no see-through) behind the leaf cards.
 for(let i=0;i<(lo?3:5);i++){const g=new THREE.OctahedronGeometry(.3,0);g.scale(1.3,.8,.5);g.translate(-.6+i*(1.2/((lo?3:5)-1||1)),.33,0);parts.push(paint(g,(_x,y)=>mul(SPECIES[4],.42+.3*y)));}
 for(let i=0;i<(lo?4:7);i++){const x=-.7+i*(1.4/(lo?3:6))+(rnd()-.5)*.1,h=.2+rnd()*.14;parts.push(stakeSpike(x,(rnd()-.5)*.14,h,.022,STEM,(rnd()-.5)*.2,(rnd()-.5)*.2,false));}
 let species=Math.floor(rnd()*SPECIES.length);
 const cards=lo?8:16;
 for(const [y0,y1,cnt] of layers){
  for(let i=0;i<cnt;i++){
   if(y1<.5&&rnd()<.22)continue; // see-through gaps low down
   if(rnd()<.45)species=Math.floor(Math.pow(rnd(),1.4)*SPECIES.length);
   const cx=-.7+(i+rnd()*.8)/cnt*1.4,cy=y0+rnd()*(y1-y0),cz=(rnd()-.5)*.2,rad=.13+rnd()*.07;
   let base=SPECIES[species];if(rnd()<.08)base=DRY;
   for(let k=0;k<cards;k++){
    const az=rnd()*6.283,up=rnd(),r=rad*(.35+.8*rnd()),ox=Math.cos(az)*r,oz=Math.sin(az)*r*.9,oy=(up-.45)*rad*1.3,sh=.62+.5*(oy/rad+.7)*.5+.12*rnd(),j=.9+.2*rnd();
    const c0=mul(base,sh*.7*j),c1=mul(base,Math.min(1.35,sh*1.15*j));
    parts.push(blade([cx+ox,Math.max(.04,cy+oy),cz+oz],az+(rnd()-.5)*.8,.15+rnd()*.09,.15+rnd()*.05,.8+rnd()*.5,c0,[c1[0]*1.02,c1[1]*1.04,c1[2]*.9],1));
   }
   if(!lo&&rnd()<.5){const g=new THREE.ConeGeometry(.017,.22+rnd()*.12,3,1,true),a=rnd()*6.28,tilt=.7+rnd()*.5;g.translate(0,.12,0);g.rotateZ(Math.cos(a)*tilt);g.rotateX(Math.sin(a)*tilt);g.translate(cx,cy+rad*.4,cz);parts.push(paint(g,(_x,yy)=>mul(TWIG,.8+.4*yy)));}
   if(berries&&!lo&&cy>.35&&rnd()<.6)for(let q=0;q<2;q++){const b=new THREE.OctahedronGeometry(.028,0);b.translate(cx+(rnd()-.5)*rad*1.6,cy+rad*(.1+rnd()*.5),cz+(rnd()<.5?-1:1)*rad*.7);parts.push(paint(b,()=>BERRY));}
  }
 }
 return mergeParts(parts);
}
// ---------------------------------------------------------------- earth bank with stakes
function bank(seed:number,H:number,lo=false){
 const rnd=rngFrom(seed),L=BOUNDARY_LEN,nx=lo?4:8,nu=lo?4:6,hw=.44,g=new THREE.BufferGeometry(),pos:number[]=[],col:number[]=[],idx:number[]=[],parts:THREE.BufferGeometry[]=[],GRASS=lin('#657a40'),LOW=lin('#566a36'),EARTH=lin('#7a6040'),TOP=lin('#7b8e4a');
 const ph=[rnd()*6,rnd()*6];
 for(let i=0;i<=nx;i++){
  const x=-L/2+L*i/nx,edge=i===0||i===nx;
  for(let j=0;j<=nu;j++){
   const u=-1+2*j/nu,au=Math.abs(u),n=edge?0:(Math.sin(x*5.3+ph[0])*.5+Math.sin(x*11+u*3+ph[1])*.5),y=H*(1-Math.pow(au,1.7))*(1+.3*n+(edge?0:.12*Math.sin(x*23+ph[1])))+(j===0||j===nu?0:.035*Math.sin(x*17+u*9+ph[0])),z=u*hw*(1+(edge?0:.16*n));
   pos.push(x,Math.max(0,y),z);
   const t=Math.max(0,Math.min(1,y/H)),patch=.5+.5*Math.sin(x*9.1+u*4.3+ph[1]*3)*Math.cos(x*4.7+ph[0]),bare=t>.08&&t<.8&&patch>.38&&!edge?(patch-.38)*3.6:0;
   const c=mix(mix(LOW,GRASS,Math.min(1,t*1.6)),TOP,Math.max(0,t-.7)*2);const k=mix(c,EARTH,Math.min(.85,bare));col.push(k[0],k[1],k[2]);
  }
 }
 for(let i=0;i<nx;i++)for(let j=0;j<nu;j++){const a=i*(nu+1)+j,b=a+1,c=a+nu+1,d=c+1;idx.push(a,c,b,b,c,d);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();parts.push(g);
 const nst=lo?2:3;for(let i=0;i<nst;i++){const x=-.5+i*(1/(nst-1||1))+(rnd()-.5)*.2;parts.push(stakeSpike(x,(rnd()-.5)*.08,H+.2+rnd()*.12,.026,STAKE[Math.floor(rnd()*3)],(rnd()-.5)*.14,(rnd()-.5)*.14));}
 if(!lo){
  for(let r=0;r<2;r++){const y=H+.03+r*.07,pts:V3[]=[];for(let k=0;k<5;k++){const t=k/4;pts.push([-.66+1.32*t,y+.01*Math.sin(t*7+r),(r?.03:-.03)+.03*Math.sin(t*6+r*2)]);}parts.push(tube(pts,pts.map(()=>.017),3,()=>mul(WITHY[r%4],.9),seed+r));}
  for(let k=0;k<12;k++){const x=-.68+rnd()*1.36,z=(rnd()-.5)*.28;parts.push(blade([x,H*(1-Math.pow(Math.abs(z)/hw,1.9))-.02,z],rnd()*6.28,.14+rnd()*.14,.045,.5,mul(GRASS,.8),mul(TOP,1.1)));}
 }
 return mergeParts(parts);
}
// ---------------------------------------------------------------- field gate
const GATE_WOOD=lin('#8a6e4a'),GATE_POST=lin('#6c5438');
function gate(seed:number){
 const rnd=rngFrom(seed),parts:THREE.BufferGeometry[]=[],L=BOUNDARY_LEN;
 for(const s of [-1,1])parts.push(chunk(s*(L/2-.06),.5,0,.1,1.0,.1,rnd,.08,GATE_POST,0,.2));
 for(const y of [.2,.42,.64,.86])parts.push(chunk(0,y,.045,L-.2,.065,.04,rnd,.04,mul(GATE_WOOD,.9+.2*rnd()),0,.1));
 const br=chunk(0,.5,.075,Math.hypot(L-.3,.66),.06,.035,rnd,.03,GATE_WOOD,0,.1);br.rotateZ(Math.atan2(.66,L-.3));parts.push(br);
 return mergeParts(parts);
}
/** Geometry for one boundary mesh: `detail` is a variant index, or 'lo' for the low-poly middle-distance version. */
export function boundaryGeometry(kind:BoundaryMeshKind,detail:BoundaryDetail=0):THREE.BufferGeometry{
 const lo=detail==='lo',v=lo?0:detail as number,seed=({stone:101,wattle:211,hedge:307,bank:401,gate:503}[kind])+v*17;
 let g:THREE.BufferGeometry;
 if(kind==='stone')g=lo?wall(seed,[.27,.25],.2,true):wall(seed,v===0?[.2,.18,.16]:[.21,.19,.15],v===0?.1:.3);
 else if(kind==='wattle')g=lo?wattle(seed,3,.8,true):wattle(seed,v===0?8:9,v===0?.84:.96);
 else if(kind==='hedge')g=hedge(seed,v===1,lo);
 else if(kind==='bank')g=bank(seed,v===0?.26:.34,lo);
 else g=gate(seed);
 g.deleteAttribute('uv');g.computeBoundingBox();g.computeBoundingSphere();return g;
}
/** Fallback hue (sRGB hex) per kind. Stone is tinted by the local rock instead; the others carry their colour in the vertices and the tint only varies it a little. */
export const BOUNDARY_COLOURS:Record<BoundaryMeshKind,[string,string]>={bank:['#e4e2c8','#f6f4dc'],hedge:['#dde6cc','#f4f2de'],stone:['#85807a','#a09a8c'],wattle:['#e6dcc6','#fff6e2'],gate:['#e6d8bf','#fff4de']};
export const BOUNDARY_CAPACITY:Record<BoundaryMeshKind,number>={bank:1500,hedge:2500,stone:2500,wattle:2500,gate:200};
/** Scene-wide ceiling on boundary pieces drawn at once, nearest fields first. */
export const BOUNDARY_SCENE_BUDGET=4500;
