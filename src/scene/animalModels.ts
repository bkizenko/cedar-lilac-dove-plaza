/** Quadruped model builder: anatomy numbers (animalSpecs.ts) -> jointed part geometries at three LOD tiers, plus the skeleton that poses them.
 * near (0): ~15 articulated part types (ungulate legs have 4 bones each: humerus/femur, radius/tibia, cannon, pastern+hoof) with eyes, nostrils,
 * hooves/claws, ears, horns, mane and fur tufts; mid (1): body / neck+head / fore leg / hind leg, rigid; far (2): one static merged silhouette.
 * Deterministic: variation comes only from the seed passed in, never from a clock or Math.random. */
import * as THREE from 'three';
import {append,blob,counter,hex,loft,mix,mul,newMesh,plate,smooth,toGeometry,tube,tuft,triangles,xform,type Mesh,type Paint,type RGB,type Sec} from './animalGeo';
import {QUADS,type QuadId,type QuadSpec,type Section} from './animalSpecs';
import {hashSeed,seededRandom} from './buildingParts';
import type {RigModel} from './animalRig';

export type Tier=0|1|2;
export type Sex='m'|'f';
export type PartKey='torso'|'neck'|'head'|'ear'|'hornL'|'hornR'|'tail'|'foreU'|'foreM'|'foreC'|'foreH'|'hindU'|'hindM'|'hindC'|'hindH';
export const NEAR_PARTS:readonly PartKey[]=['torso','neck','head','ear','hornL','hornR','tail','foreU','foreM','foreC','foreH','hindU','hindM','hindC','hindH'];
export type Bone={id:string;part:PartKey;parent:string|null;pivot:[number,number,number];rest:[number,number,number];side:-1|0|1};
export type QuadModel={key:string;spec:QuadSpec;sex:Sex;L:number;bones:Bone[];geo:Record<PartKey,THREE.BufferGeometry|null>;
 mid:Record<'body'|'neckhead'|'fore'|'hind',THREE.BufferGeometry>;far:THREE.BufferGeometry;tris:[number,number,number];feetY:Record<string,number>};
const D=Math.PI/180;

/** Sex-aware horn/antler presence: 1 full, .5 reduced, 0 none. */
export function hornFactor(id:QuadId,sex:Sex):number{
 switch(id){
  case 'redDeer':case 'fallowDeer':case 'roeDeer':return sex==='m'?1:0;
  case 'mouflon':return sex==='m'?1:0;
  case 'ibex':return sex==='m'?1:.45;
  case 'goat':case 'sheep':return sex==='m'?1:.5;
  case 'aurochs':return 1;case 'cattle':return sex==='m'?1:.8;
  case 'boar':return sex==='m'?1:0;
  default:return 0;
 }
}
export function sheepHorned(sex:Sex,seed:number){return sex==='m'&&seed%3!==0;}

function sections(sp:QuadSpec,L:number,flesh=1):Sec[]{
 const base:Sec[]=sp.T.map(([f,top,bot,w]:Section)=>({s:f*L,u:(top+bot)/2,ru:(top-bot)/2,rv:w*flesh,sq:2.4}));
 const a=base[0],b=base[base.length-1];
 return [{...a,s:a.s-.055*L,ru:a.ru*.3,rv:a.rv*.35,sq:2},{...a,s:a.s-.018*L,ru:a.ru*.82,rv:a.rv*.85,sq:2.2},...base,{...b,s:b.s+.012*L,ru:b.ru*.85,rv:b.rv*.85,sq:2.2},{...b,s:b.s+.045*L,ru:b.ru*.4,rv:b.rv*.4,sq:2}];
}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const lerpRS=(a:readonly [number,number],b:readonly [number,number],t:number):[number,number]=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];

/** Real skeleton: parent chain with pivots in the parent frame and standing (rest) rotations. Angles about Z (pitch) except ears (X splay). */
export function buildSkeleton(sp:QuadSpec):{L:number;bones:Bone[]}{
 const L=sp.real.trunk,bones:Bone[]=[];
 const add=(id:string,part:PartKey,parent:string|null,pivot:[number,number,number],rest:[number,number,number]=[0,0,0],side:-1|0|1=0)=>bones.push({id,part,parent,pivot,rest,side});
 add('torso','torso',null,[0,0,0]);
 const topAt=(f:number)=>{const T=sp.T;for(let i=0;i<T.length-1;i++)if(f<=T[i+1][0]){const t=(f-T[i][0])/(T[i+1][0]-T[i][0]);return T[i][1]+(T[i+1][1]-T[i][1])*t;}return T[T.length-1][1];};
 add('neck','neck','torso',[sp.neck.pivot[0]*L,topAt(sp.neck.pivot[0])-sp.neck.r0[0]*.78,0],[0,0,sp.neck.abs*D]);
 add('head','head','neck',[sp.neck.len,0,0],[0,0,(sp.head.abs-sp.neck.abs)*D]);
 for(const s of [-1,1] as const){
  add('ear'+s,'ear','head',[sp.head.earAt[0],sp.head.earAt[1],s*sp.head.sec[0][3]*.8],[s*sp.head.ear.splay*D,0,sp.head.ear.pitch*D],s);
  add(s<0?'hornL':'hornR',s<0?'hornL':'hornR','head',[0,0,0],[0,0,0],s);
 }
 add('tail','tail','torso',[-L/2+.02*L,sp.T[0][1]-.02,0],[0,0,(180-sp.tail.abs)*D]);
 for(const [g,leg] of [['fore',sp.fore],['hind',sp.hind]] as const){
  for(const s of [-1,1] as const){
   const p=g+'U'+s,m=g+'M'+s,c=g+'C'+s,h=g+'H'+s;
   add(p,(g+'U') as PartKey,'torso',[leg.pivot[0]*L,leg.pivot[1],s*leg.z],[0,0,leg.abs[0]*D],s);
   add(m,(g+'M') as PartKey,p,[0,-leg.len[0],0],[0,0,(leg.abs[1]-leg.abs[0])*D],s);
   add(c,(g+'C') as PartKey,m,[0,-leg.len[1],0],[0,0,(leg.abs[2]-leg.abs[1])*D],s);
   add(h,(g+'H') as PartKey,c,[0,-leg.len[2],0],[0,0,(leg.abs[3]-leg.abs[2])*D],s);
  }
 }
 return {L,bones};
}
export const boneMatrix=(b:Bone,extra?:[number,number,number],scale=1):THREE.Matrix4=>{
 const e=new THREE.Euler(b.rest[0]+(extra?.[0]??0),b.rest[1]+(extra?.[1]??0),b.rest[2]+(extra?.[2]??0),'ZYX');
 return new THREE.Matrix4().compose(new THREE.Vector3(...b.pivot),new THREE.Quaternion().setFromEuler(e),new THREE.Vector3(scale,scale,scale));
};
/** Rest (standing) matrix of a bone in the torso frame. */
export function restMatrices(bones:readonly Bone[]):Map<string,THREE.Matrix4>{
 const out=new Map<string,THREE.Matrix4>();
 for(const b of bones){const m=boneMatrix(b);if(b.parent)m.premultiply(out.get(b.parent)!);out.set(b.id,m);}
 return out;
}

// ---------------------------------------------------------------------------------------------------------------- colour
function torsoPaint(sp:QuadSpec,L:number):Paint{
 const c=sp.coat,back=hex(c.back),belly=hex(c.belly),flank=hex(c.flank??c.back),rump=c.rump?hex(c.rump):null,tailc=c.face?hex(c.face):back;
 void tailc;
 return (x,y,z,ny)=>{
  let col=counter(mix(back,flank,smooth(0,.7,-ny)),belly,ny,-.1);
  if(rump&&x<-.4*L&&ny>-.55)col=mix(col,rump,smooth(-.44*L,-.5*L,x)*.95+.05);
  return col;
 };
}
const limbPaint=(sp:QuadSpec,top:RGB):Paint=>{const lo=hex(sp.coat.legs);return (x,y,z,ny,s)=>mix(top,lo,smooth(0,1,s)*.95);};

// ---------------------------------------------------------------------------------------------------------------- features
type Opts={tier:Tier;sex:Sex;seed:number};
const segs=(t:Tier,n:number)=>t===0?n:t===1?Math.max(5,Math.round(n*.62)):Math.max(4,Math.min(5,Math.round(n*.45)));

function limb(m:Mesh,len:number,r0:readonly [number,number],r1:readonly [number,number],paint:Paint,seg:number,bulgeAt=0,knob=0,tier:Tier=0){
 if(tier>0){loft(m,[{s:0,ru:r0[0],rv:r0[1]},{s:len*.55,ru:lerp(r0[0],r1[0],.5)*(1+bulgeAt),rv:lerp(r0[1],r1[1],.5)*(1+bulgeAt)},{s:len,ru:r1[0],rv:r1[1]}],{axis:'down',seg,paint,capStart:false,capEnd:tier===1});return;}
 const secs:Sec[]=[
  {s:0,ru:r0[0]*.95,rv:r0[1]*.95},{s:len*.2,ru:r0[0]*(1+bulgeAt),rv:r0[1]*(1+bulgeAt)},
  {s:len*.6,ru:lerp(r0[0],r1[0],.6),rv:lerp(r0[1],r1[1],.6)},{s:len*.92,ru:r1[0]*(1+knob),rv:r1[1]*(1+knob)},{s:len,ru:r1[0]*(1+knob*.6),rv:r1[1]*(1+knob*.6)},
 ];
 loft(m,secs,{axis:'down',seg,paint,capStart:false,capEnd:true});
}
function foot(sp:QuadSpec,m:Mesh,len:number,fore:boolean,t:Tier){
 const hoof=hex(sp.coat.hoof),leg=hex(sp.coat.legs),r=(fore?sp.fore:sp.hind).r,w=r[1]*.9,seg=segs(t,8);
 if(t>0){const pl=sp.foot==='plantigrade';loft(m,pl?[{s:0,ru:w*.8,rv:w},{s:len*.5,u:len*.06,ru:w*1.1,rv:w*1.2},{s:len*.8,u:len*.1,ru:w*1.2,rv:w*1.2}]:[{s:0,ru:w*.9,rv:w},{s:len*.6,u:.01,ru:w*1.05,rv:w},{s:len,u:.025,ru:w*1.3,rv:w*1.1}],{axis:'down',seg,paint:()=>(sp.foot==='paw'||pl?leg:hoof),capStart:false,capEnd:t===1});return;}
 const pastern=len*.5;
 switch(sp.foot){
  case 'cloven':{
   // pastern (short, sloping) then two toes with split hoof walls
   loft(m,[{s:0,ru:w*.95,rv:w},{s:pastern,ru:w*.85,rv:w*1.05}],{axis:'down',seg:Math.max(5,seg-2),paint:()=>leg,capStart:false,capEnd:false});
   for(const z of [-1,1]){
    loft(m,[{s:pastern*.7,u:.004,v:z*w*.5,ru:w*.8,rv:w*.62},{s:len*.85,u:.014,v:z*w*.52,ru:w*1.05,rv:w*.55},{s:len,u:.02,v:z*w*.52,ru:w*1.2,rv:w*.5}],{axis:'down',seg:Math.max(5,seg-2),paint:()=>hoof,capStart:false,capEnd:true});
   }
   if(t===0)for(const z of [-1,1])blob(m,[-.012,-len*.62,z*w*1.1],[w*.32,w*.3,w*.3],hoof,{lon:5,lat:2});
   break;}
  case 'hoof':{
   loft(m,[{s:0,ru:w*.9,rv:w*.9},{s:pastern*.9,ru:w*.8,rv:w*.85,u:.006}],{axis:'down',seg:Math.max(6,seg-2),paint:()=>leg,capStart:false,capEnd:false});
   loft(m,[{s:pastern*.8,u:.006,ru:w*1.0,rv:w*.95},{s:len*.7,u:.02,ru:w*1.25,rv:w*1.15},{s:len*.97,u:.03,ru:w*1.5,rv:w*1.35},{s:len,u:.03,ru:w*1.3,rv:w*1.2}],{axis:'down',seg,paint:()=>hoof,capStart:false,capEnd:true});
   break;}
  case 'paw':{
   loft(m,[{s:0,ru:w*.9,rv:w*.9},{s:len*.55,u:.01,ru:w*.95,rv:w*.9}],{axis:'down',seg:Math.max(5,seg-2),paint:()=>leg,capStart:false,capEnd:false});
   loft(m,[{s:len*.45,u:.015,ru:w*1.1,rv:w*1.05},{s:len*.85,u:.03,ru:w*1.5,rv:w*1.15},{s:len,u:.032,ru:w*1.45,rv:w*1.1,sq:2}],{axis:'down',seg,paint:()=>leg,capStart:false,capEnd:true});
   if(t===0)for(const z of [-.6,-.2,.2,.6])tube(m,[[w*2.2,-len*.98,z*w],[w*2.9,-len*1.0,z*w*1.05]],[[w*.22,w*.22],[w*.06,w*.06]],{seg:4,paint:()=>hoof});
   break;}
  case 'plantigrade':{
   // flat sole lying forward from the wrist: this segment is mostly horizontal
   loft(m,[{s:0,u:.0,ru:w*.8,rv:w*.9},{s:len*.12,u:.02,ru:w*.9,rv:w*1.0}],{axis:'down',seg:6,paint:()=>leg,capStart:false,capEnd:false});
   loft(m,[{s:-len*.1,u:.02,v:0,ru:len*.14,rv:w*1.0},{s:len*.35,u:.0,ru:len*.16,rv:w*1.15},{s:len*.75,ru:len*.1,rv:w*1.1},{s:len,ru:len*.04,rv:w*.9}],{axis:'x',seg:6,paint:()=>leg,capStart:true,capEnd:true});
   // transform the sole to lie on the ground: lofted along X already; shift down below the wrist
   if(t===0)for(const z of [-.7,-.35,0,.35,.7])tube(m,[[len*.95,-len*.06,z*w*1.2],[len*1.12,-len*.1,z*w*1.25]],[[w*.14,w*.14],[w*.04,w*.04]],{seg:4,paint:()=>hoof});
   break;}
  case 'hare':{
   loft(m,[{s:0,ru:w*.9,rv:w*.9},{s:len*.3,u:.004,ru:w*.9,rv:w*.9}],{axis:'down',seg:5,paint:()=>leg,capStart:false,capEnd:false});
   loft(m,[{s:len*.25,u:.002,ru:w*.9,rv:w*.9},{s:len*.7,u:.03,ru:len*.16,rv:w*.9},{s:len,u:.06,ru:len*.2,rv:w*.8}],{axis:'down',seg:6,paint:()=>leg,capStart:false,capEnd:true});
   break;}
 }
}
const flip=(m:Mesh):Mesh=>{for(let i=0;i<m.pos.length;i+=3)m.pos[i+2]*=-1;for(let i=0;i<m.idx.length;i+=3){const t=m.idx[i+1];m.idx[i+1]=m.idx[i+2];m.idx[i+2]=t;}return m;};

// -------- horns / antlers (points in head frame; sg = side). Red-deer grammar: beam + brow + bez + trez + 3-point crown.
function antlerRed(m:Mesh,sg:number,scale:number,seed:number,tines:number,col:RGB,seg:number){
 const r=seededRandom(seed),S=scale,z=(v:number)=>v*sg;const P=(x:number,y:number,zz:number):[number,number,number]=>[x*S,y*S,z(zz)*S];
 const tip=mul(col,1.1),paint:Paint=(x,y,zq,ny,s)=>mix(mul(col,.62),tip,smooth(.1,1,s));const j=()=>(r()-.5)*.02;
 const beam=[P(0,0,0),P(-.04,.14,.05),P(-.07+j(),.3,.1),P(-.05,.46,.14),P(.02,.6,.16),P(.12,.72,.15)];
 const rad=[[.026,.026],[.022,.022],[.019,.019],[.016,.016],[.014,.014],[.012,.012]] as const;
 tube(m,beam,rad.map(([a,b])=>[a*S,b*S]),{seg,paint,up:[0,0,1]});
 const twig=(from:[number,number,number],pts:[number,number,number][],r0:number)=>tube(m,[from,...pts],[[r0*S,r0*S],...pts.map((_,i)=>[r0*S*(1-(i+1)/(pts.length+1)*.8),r0*S*(1-(i+1)/(pts.length+1)*.8)] as [number,number])],{seg:Math.max(4,seg-1),paint});
 twig(P(-.03,.07,.03),[P(.06,.1,.05),P(.15,.2,.06),P(.2,.3,.07)],.014);            // brow tine
 if(tines>=8)twig(P(-.065,.31,.1),[P(.03,.36,.12),P(.12,.46,.12),P(.15,.57,.12)],.012);   // bez
 if(tines>=10)twig(P(-.045,.46,.14),[P(.05,.54,.15),P(.13,.62,.15),P(.17,.72,.14)],.011);  // trez
 if(tines>=12){twig(P(.12,.72,.15),[P(.2,.84,.16),P(.19,.96,.17)],.011);twig(P(.12,.72,.15),[P(.14,.86,.22),P(.1,.95,.24)],.01);twig(P(.12,.72,.15),[P(.06,.85,.1),P(.0,.93,.08)],.01);}
}
function antlerFallow(m:Mesh,sg:number,scale:number,col:RGB,seg:number){
 const S=scale,P=(x:number,y:number,zz:number):[number,number,number]=>[x*S,y*S,zz*sg*S],paint:Paint=(x,y,zq,ny,s)=>mix(mul(col,.6),col,s);
 tube(m,[P(0,0,0),P(-.03,.1,.03),P(-.04,.2,.06),P(.0,.3,.08)],[[.022*S,.022*S],[.019*S,.019*S],[.017*S,.017*S],[.015*S,.015*S]],{seg,paint});
 tube(m,[P(-.02,.07,.02),P(.05,.12,.04),P(.12,.18,.05)],[[.014*S,.014*S],[.012*S,.012*S],[.006*S,.006*S]],{seg:Math.max(4,seg-1),paint});   // brow
 // palm: a broad flat blade with finger tines along the upper edge
 const pts:[number,number,number][]=[P(0,.28,.07),P(.05,.34,.1),P(.14,.4,.13),P(.2,.5,.15),P(.2,.62,.16),P(.14,.7,.16),P(.06,.66,.15),P(-.02,.58,.13),P(-.07,.46,.1),P(-.04,.34,.08)];
 plate(m,pts,col,{paint:(i)=>mix(mul(col,.7),col,i/pts.length)});
 for(const [a,b] of [[P(.14,.7,.16),P(.14,.8,.17)],[P(.2,.62,.16),P(.3,.7,.17)],[P(.2,.5,.15),P(.3,.52,.16)],[P(.06,.66,.15),P(.04,.78,.15)],[P(-.02,.58,.13),P(-.1,.66,.13)]])tube(m,[a,b],[[.009*S,.009*S],[.003*S,.003*S]],{seg:4,paint});
}
function antlerRoe(m:Mesh,sg:number,scale:number,col:RGB,seg:number){
 const S=scale,P=(x:number,y:number,zz:number):[number,number,number]=>[x*S,y*S,zz*sg*S],paint:Paint=(x,y,zq,ny,s)=>mix(mul(col,.55),col,s);
 tube(m,[P(0,0,0),P(-.01,.07,.015),P(-.02,.15,.025),P(-.015,.22,.03),P(0,.26,.03)],[[.014*S,.014*S],[.012*S,.012*S],[.011*S,.011*S],[.009*S,.009*S],[.004*S,.004*S]],{seg,paint});
 tube(m,[P(-.012,.12,.022),P(.03,.16,.03),P(.07,.2,.03)],[[.008*S,.008*S],[.006*S,.006*S],[.002*S,.002*S]],{seg:4,paint});
}
function hornCurve(m:Mesh,pts:[number,number,number][],r0:number,r1:number,sg:number,col:RGB,seg:number,ridges=0){
 const n=pts.length,P=pts.map(([x,y,z])=>[x,y,z*sg] as [number,number,number]);
 const radii=P.map((_,i)=>{const t=i/(n-1),r=lerp(r0,r1,Math.pow(t,.8));const k=ridges?1+.16*Math.sin(t*ridges*Math.PI*2):1;return [r*k,r*k*.9] as [number,number];});
 tube(m,P,radii,{seg,paint:(x,y,z,ny,s)=>mix(mul(col,.72),mul(col,1.05),s)});
}
function addHorns(m:Mesh,sp:QuadSpec,sg:number,o:Opts,k:number,t:Tier){
 const col=hex(sp.coat.horn??'#c8bca0'),seg=segs(t,6),sc=k,r=seededRandom(hashSeed(o.seed,'horn'));
 switch(sp.id){
  case 'redDeer':antlerRed(m,sg,.55+.5*r(),o.seed+sg,[8,10,12][o.seed%3],col,seg);break;
  case 'fallowDeer':antlerFallow(m,sg,.8+.35*r(),col,seg);break;
  case 'roeDeer':antlerRoe(m,sg,.85+.3*r(),col,seg);break;
  case 'aurochs':hornCurve(m,[[0,0,.02],[.0,.03,.1],[.04,.09,.2],[.13,.17,.28],[.26,.27,.31],[.38,.37,.28],[.43,.49,.22]],.036,.006,sg,col,seg);break;
  case 'cattle':hornCurve(m,[[0,0,.02],[.0,.02,.08],[.03,.07,.15],[.09,.13,.2],[.16,.2,.22],[.2,.28,.2]].map(([x,y,z])=>[x*sc,y*sc,z*sc] as [number,number,number]),.03,.006,sg,col,seg);break;
  case 'mouflon':case 'sheep':{
   const R=sp.id==='mouflon'?.1:.07,pts:[number,number,number][]=[];
   for(let i=0;i<=12;i++){const a=i/12*Math.PI*1.75,rr=R*(1-.25*i/12);pts.push([-rr*Math.sin(a)*1.0-.01,rr*(Math.cos(a)-1)*-1*.9+.0,.03+.05*Math.min(1,i/6)+.03*i/12]);}
   hornCurve(m,pts.map(([x,y,z])=>[x*sc,y*sc,z*sc] as [number,number,number]),.03*sc,.007,sg,col,seg,0);break;}
  case 'ibex':hornCurve(m,[[0,0,.02],[-.03,.1,.03],[-.1,.21,.05],[-.2,.3,.07],[-.32,.34,.09],[-.42,.31,.1]].map(([x,y,z])=>[x*sc,y*sc,z*sc] as [number,number,number]),.032,.007,sg,col,seg,o.sex==='m'?9:0);break;
  case 'goat':hornCurve(m,[[0,0,.015],[-.02,.07,.025],[-.06,.14,.035],[-.12,.19,.045],[-.18,.2,.05]].map(([x,y,z])=>[x*sc,y*sc,z*sc] as [number,number,number]),.024,.005,sg,col,seg,4);break;
  case 'boar':{ // lower canine tusk curling up and outward beside the muzzle
   const s0=sp.head.len*.9;tube(m,[[s0,-.075,.03*sg],[s0+.03,-.085,.05*sg],[s0+.07,-.07,.058*sg],[s0+.09,-.04,.05*sg]],[[.011,.011],[.009,.009],[.007,.007],[.002,.002]],{seg:5,paint:()=>col});break;}
  default:break;
 }
}
// ---------------------------------------------------------------------------------------------------------------- parts
function headMesh(sp:QuadSpec,o:Opts):Mesh{
 const m=newMesh(),c=sp.coat,t=o.tier,seg=segs(t,10),L=sp.head.len,face=hex(c.face??c.back),muz=hex(c.muzzle),back=hex(c.back),belly=hex(c.belly);
 const sec:Sec[]=sp.head.sec.map(([s,u,ru,rv])=>({s,u,ru,rv,sq:2.2}));
 loft(m,sec,{seg,paint:(x,y,z,ny,s)=>{const tpt=smooth(.62,.95,s/L);let col=counter(mix(back,face,.5),mix(belly,face,.4),ny,.2);col=mix(col,muz,tpt);return col;}});
 if(t===0){
  const eye=hex(c.eye);
  for(const sd of [-1,1]){
   const e=sp.head.eye,rv=sec[1].rv;
   blob(m,[e[0],e[1],sd*(rv*.98)],[.017*Math.max(.5,L*2.2),.014*Math.max(.5,L*2.2),.008*Math.max(.5,L*2.2)],eye,{lon:6,lat:3});
   const tipS=sec[sec.length-1],nos=hex(c.hoof);
   blob(m,[tipS.s-.004,(tipS.u??0)+tipS.ru*.35,sd*tipS.rv*.5],[tipS.rv*.28,tipS.ru*.22,tipS.rv*.2],nos,{lon:5,lat:2});
  }
  // lips / mouth line as a dark thin ridge along the muzzle sides
  const tp=sec[sec.length-1],lip=mul(hex(c.muzzle),.55);
  for(const sd of [-1,1])tube(m,[[sec[2].s,(sec[2].u??0)-sec[2].ru*.55,sd*sec[2].rv*.8],[tp.s,(tp.u??0)-tp.ru*.3,sd*tp.rv*.9]],[[.003,.003],[.003,.003]],{seg:3,paint:()=>lip});
  if(sp.id==='goat'||sp.id==='ibex'){tube(m,[[tp.s-.01,(tp.u??0)-tp.ru*.8,0],[tp.s-.03,(tp.u??0)-tp.ru*2.4,0]],[[.012,.01],[.003,.003]],{seg:4,paint:()=>mul(back,.9)});}
 }
 return m;
}
function earMesh(sp:QuadSpec,o:Opts):Mesh{
 const m=newMesh(),e=sp.head.ear,c=sp.coat,col=mix(hex(c.back),hex(c.face??c.back),.5),inner=mix(hex(c.belly),col,.35),seg=o.tier===0?6:4;
 const outer=sp.id==='fox'||sp.id==='hare'?mul(hex('#1c1714'),1):col;
 const W=e.w;
 loft(m,[{s:0,ru:W*.45,rv:.006},{s:e.len*.25,ru:W*.95,rv:.005},{s:e.len*.6,ru:W,rv:.004},{s:e.len*.9,ru:W*.45,rv:.003},{s:e.len,ru:W*.08,rv:.002}],{axis:'y',seg,paint:(x,y,z,ny,s)=>(z>0?inner:outer)});
 return m;
}
function tailMesh(sp:QuadSpec,o:Opts):Mesh{
 const m=newMesh(),t=sp.tail,c=sp.coat,col=hex(c.tail??c.back),rump=c.rump?hex(c.rump):col,seg=segs(o.tier,6);
 const dark=hex(c.mane??c.legs),tipc=sp.id==='fox'?hex('#f0ebe0'):dark;
 const L=t.len,r=t.r;
 const along=(pts:[number,number,number][],radii:[number,number][],pa:Paint)=>tube(m,pts,radii,{seg,paint:pa,up:[0,0,1]});
 switch(t.kind){
  case 'short':case 'stub':case 'scut':
   loft(m,[{s:0,ru:r,rv:r},{s:L*.5,ru:r*1.1,rv:r*1.1},{s:L,ru:r*.35,rv:r*.35}],{axis:'x',seg,paint:()=>t.kind==='short'&&c.rump?rump:col});break;
  case 'brush':
   loft(m,[{s:0,ru:r*.55,rv:r*.55},{s:L*.3,ru:r*1.0,rv:r*1.0},{s:L*.65,ru:r*1.15,rv:r*1.15},{s:L*.9,ru:r*.7,rv:r*.7},{s:L,ru:r*.1,rv:r*.1}],{axis:'x',seg:Math.max(6,seg),paint:(x,y,z,ny,s)=>s>L*.8?tipc:mix(col,mul(col,.6),smooth(0,1,ny*-1+.5)*.4)});break;
  case 'whip':
   loft(m,[{s:0,ru:r,rv:r},{s:L*.6,ru:r*.8,rv:r*.8},{s:L,ru:r*.4,rv:r*.5}],{axis:'x',seg,paint:()=>col});
   if(sp.id==='fallowDeer')for(const sd of [0])void sd;
   break;
  case 'switch':{
   loft(m,[{s:0,ru:r,rv:r},{s:L*.8,ru:r*.7,rv:r*.7}],{axis:'x',seg:5,paint:()=>col});
   loft(m,[{s:L*.78,ru:r*1.8,rv:r*1.4},{s:L*.92,ru:r*3.2,rv:r*2.2},{s:L*1.08,ru:r*1.0,rv:r*.8}],{axis:'x',seg:6,paint:()=>dark});break;}
  case 'curl':along([[0,0,0],[L*.3,.02,0],[L*.6,.0,0.02],[L*.85,-.03,0]],[[r,r],[r,r],[r*.8,r*.8],[r*.4,r*.4]],()=>col);break;
  case 'horsehair':{
   loft(m,[{s:0,ru:r*.7,rv:r*.7},{s:L*.25,ru:r*1.0,rv:r*.9},{s:L*.6,ru:r*1.6,rv:r*1.0},{s:L,ru:r*.7,rv:r*.4}],{axis:'x',seg:Math.max(6,seg),paint:(x,y,z,ny,s)=>mix(col,mul(col,.8),s/L)});break;}
 }
 return m;
}
function neckMesh(sp:QuadSpec,o:Opts,L:number):Mesh{
 const m=newMesh(),n=sp.neck,t=o.tier,seg=segs(t,10),bulk=o.sex==='m'?(sp.id==='redDeer'||sp.id==='fallowDeer'?1.28:sp.id==='aurochs'||sp.id==='cattle'||sp.id==='boar'?1.15:sp.id==='mouflon'||sp.id==='ibex'?1.12:1.05):1;
 const c=sp.coat,back=hex(c.back),belly=hex(c.belly),mane=c.mane?hex(c.mane):null,rutting=o.sex==='m'&&(sp.id==='redDeer'||sp.id==='fallowDeer');
 const secs:Sec[]=[0,.25,.55,.8,1].map(f=>{const r=lerpRS(n.r0,n.r1,f);const sw=f<.25?1+.2*f:1;return {s:f*n.len-(f===0?.14:0),u:(f<.5?.0:0)+r[0]*(rutting?.15*Math.sin(f*Math.PI):0),ru:r[0]*bulk*(f===0?1.18:sw)*(rutting?1+.18*Math.sin(f*Math.PI):1),rv:r[1]*bulk*(f===0?1.25:1)*(rutting?1+.12*Math.sin(f*Math.PI):1),sq:2.2};});
 const ruttingCol=rutting?mul(hex(c.legs),.9):null;
 loft(m,secs,{seg,paint:(x,y,z,ny,s)=>{let col=counter(mix(back,hex(c.flank??c.back),.2),mix(belly,back,.35),ny,.2);if(ruttingCol&&ny<.2)col=mix(col,ruttingCol,.55*smooth(0,n.len,s));if(mane&&ny>.4)col=mix(col,mane,.55);return col;}});
 if(mane&&(sp.id==='horse'||sp.id==='wildHorse'||sp.id==='donkey'||sp.id==='boar'||sp.id==='bear'||sp.id==='wolf')){
  const horse=sp.id==='horse',up=sp.id==='wildHorse'||sp.id==='donkey'||sp.id==='boar'||sp.id==='bear'||sp.id==='wolf',h=up?(sp.id==='boar'?.055:sp.id==='bear'?.05:sp.id==='wolf'?.06:.1):.0;
  const rows=Math.max(5,Math.round(secs.length*(t===0?1.6:1)));
  const ms:Sec[]=[];
  for(let i=0;i<rows;i++){const f=i/(rows-1),r=lerpRS(n.r0,n.r1,f);ms.push({s:f*n.len-.02,u:r[0]*bulk*.92,ru:horse?.075:h*.6+.01,rv:horse?.025:.018,sq:2});}
  if(t<2&&!(sp.id==='horse'&&false))loft(m,ms,{seg:5,paint:()=>mane,capStart:true,capEnd:true});
  if(t===0&&horse){for(let i=0;i<10;i++){const f=i/9,r=lerpRS(n.r0,n.r1,f);tuft(m,[f*n.len,r[0]*bulk*.9+.06,.02],[0,-.5,.8],.14,.02,mane);}}
  if(t===0&&up)for(let i=0;i<9;i++){const f=i/8,r=lerpRS(n.r0,n.r1,f);tuft(m,[f*n.len-.02,r[0]*bulk*.95+h*.7,0],[-.25,1,0],h*1.3,.01,mane,mul(mane,1.5));}
 }
 if(t===0&&!mane&&c.thick>1.2){const r=seededRandom(hashSeed(o.seed,'neckfur')),col=mix(back,belly,.2);for(let i=0;i<12;i++){const f=r(),rr=lerpRS(n.r0,n.r1,f),a=r()*Math.PI*2;tuft(m,[f*n.len,Math.cos(a)*rr[0]*.95,Math.sin(a)*rr[1]*.95],[.2,Math.cos(a),Math.sin(a)],.03*c.thick,.008,col,mul(col,1.2));}}
 return m;
}
function torsoMesh(sp:QuadSpec,o:Opts,L:number):Mesh{
 const m=newMesh(),t=o.tier,seg=segs(t,12),flesh=o.sex==='m'&&(sp.id==='aurochs'||sp.id==='boar')?1.06:1;
 const secs=sections(sp,L,flesh);
 // finer rings between the table rows give the smooth barrel, rump and tuck-up
 const dense:Sec[]=[];
 const rows=t===0?3:1;
 for(let i=0;i<secs.length-1;i++)for(let k=0;k<rows;k++){const f=k/rows,a=secs[i],b=secs[i+1];const sm=f*f*(3-2*f);dense.push({s:lerp(a.s,b.s,f),u:lerp(a.u!,b.u!,sm),ru:lerp(a.ru,b.ru,sm),rv:lerp(a.rv,b.rv,sm),sq:2.4});}
 dense.push(secs[secs.length-1]);
 const sheep=sp.id==='sheep';
 loft(m,dense,{seg,paint:torsoPaint(sp,L)});
 {const pc=mix(hex(sp.coat.back),hex(sp.coat.flank??sp.coat.back),.5);
  for(const sd of [-1,1])for(const [leg,k] of [[sp.fore,.36],[sp.hind,.5]] as const){
   const px=leg.pivot[0]*L+(leg===sp.hind?.02:-.0),py=leg.pivot[1]-leg.len[0]*(leg===sp.hind?.1:.12);
   blob(m,[px,py,sd*leg.z*.92],[leg.len[0]*k*(leg===sp.hind?.95:.85),leg.len[0]*.44,Math.max(leg.r[1]*1.7,leg.z*.5)],pc,{lon:t===0?9:6,lat:t===0?5:3,paint:(x,y,z,ny)=>torsoPaint(sp,L)(x,y,z,ny*.7,0)});
  }}
 if(t===0){
  const r=seededRandom(hashSeed(o.seed,'furt'));const c=sp.coat,col=hex(c.back),belly=hex(c.belly);
  const n=Math.round((sheep?42:20)*c.thick);
  for(let i=0;i<n;i++){
   const f=r(),a=r()*Math.PI*2,k=Math.min(secs.length-2,Math.floor(f*(secs.length-1))),tt=f*(secs.length-1)-k,A=secs[k],B=secs[k+1];
   const s=lerp(A.s,B.s,tt),u=lerp(A.u!,B.u!,tt),ru=lerp(A.ru,B.ru,tt),rv=lerp(A.rv,B.rv,tt);
   const y=u+Math.cos(a)*ru*.98,z=Math.sin(a)*rv*.98,ny=Math.cos(a),base=mix(col,belly,smooth(.2,-.7,ny)),len=(sheep?.05:.026)*c.thick*(sp.real.shoulder>1?1.4:sp.real.shoulder<.5?.6:1);
   tuft(m,[s,y,z],[-.5,Math.cos(a),Math.sin(a)],len,len*.3,base,mul(base,1.12));
  }
  // dorsal mane crest on boar / spine line darker on wolf and bear handled by neck; belly fringe on long-haired animals
  if(sp.id==='boar'){for(let i=0;i<14;i++){const f=i/13,k=Math.min(secs.length-2,Math.floor(f*(secs.length-1))),tt=f*(secs.length-1)-k,A=secs[k],B=secs[k+1];tuft(m,[lerp(A.s,B.s,tt),lerp(A.u!,B.u!,tt)+lerp(A.ru,B.ru,tt)*.97,0],[-.3,1,0],.07,.012,hex(c.mane!),mul(hex(c.mane!),1.6));}}
  if(sp.id==='bear')for(let i=0;i<12;i++)tuft(m,[.25*L-i*.03,.46-i*.004,0],[-.3,1,0],.06,.012,hex(c.mane!));
 }
 return m;
}
function legPart(sp:QuadSpec,part:PartKey,o:Opts):Mesh{
 const fore=part.startsWith('fore'),leg=fore?sp.fore:sp.hind,m=newMesh(),t=o.tier,seg=segs(t,8),top=mix(hex(sp.coat.back),hex(sp.coat.flank??sp.coat.back),.5);
 const [lu,lm,lc,lh]=leg.len,r=leg.r,ps=sp.foot==='plantigrade';
 if(part.endsWith('U'))limb(m,lu,[r[0]*1.25,r[1]*1.3],[r[0]*.8,r[1]*.95],limbPaint(sp,top),seg,.12,0,t);
 else if(part.endsWith('M'))limb(m,lm,[r[0]*.8,r[1]*.95],[r[0]*.5,r[1]*.62],mixLimb(sp),seg,.05,.12,t);
 else if(part.endsWith('C'))limb(m,lc,[r[0]*.5,r[1]*.62],[r[0]*.42,r[1]*.52],()=>hex(sp.coat.legs),seg,.0,.1,t);
 else foot(sp,m,lh,fore,t);
 void ps;return m;
}
const mixLimb=(sp:QuadSpec):Paint=>{const a=mix(hex(sp.coat.back),hex(sp.coat.flank??sp.coat.back),.5),b=hex(sp.coat.legs);return (x,y,z,ny,s)=>mix(a,b,smooth(0,.9,s));};

function partMesh(sp:QuadSpec,part:PartKey,o:Opts,L:number):Mesh|null{
 switch(part){
  case 'torso':{const m=torsoMesh(sp,o,L);return m;}
  case 'neck':return neckMesh(sp,o,L);
  case 'head':return headMesh(sp,o);
  case 'ear':return earMesh(sp,o);
  case 'tail':return tailMesh(sp,o);
  case 'hornL':case 'hornR':{
   const k=hornFactor(sp.id,o.sex);if(k<=0)return null;const m=newMesh();addHorns(m,sp,part==='hornL'?-1:1,o,k,o.tier);return m.pos.length?m:null;}
  default:return legPart(sp,part,o);
 }
}
// ---------------------------------------------------------------------------------------------------------------- assembly
const calCache=new Map<QuadId,QuadSpec>();
/** Scale each limb's bone lengths uniformly so the standing animal has the real shoulder height (ratios between bones, which come from the skeleton, are kept). */
export function calibrate(base:QuadSpec):QuadSpec{
 const hit=calCache.get(base.id);if(hit)return hit;
 const top=Math.max(...base.T.map(r=>r[1])),plant=base.foot==='plantigrade';
 const drop=(leg:QuadSpec['fore'],k:number)=>leg.len.reduce((a,l,i)=>a+(i===3&&plant?.04:l*Math.cos(leg.abs[i]*D)*k),0);
 const kF=(base.real.shoulder-top+base.fore.pivot[1])/drop(base.fore,1);
 const dropF=drop(base.fore,kF)-base.fore.pivot[1],kH=(dropF+base.hind.pivot[1])/drop(base.hind,1);
 const sc=(leg:QuadSpec['fore'],k:number)=>({...leg,len:leg.len.map((l,i)=>i===3&&plant?l:l*k) as unknown as QuadSpec['fore']['len']});
 const out:QuadSpec={...base,fore:sc(base.fore,kF),hind:sc(base.hind,kH)};calCache.set(base.id,out);return out;
}
const cache=new Map<string,QuadModel>();
export function quadModel(id:QuadId,sex:Sex='f',seed=1):QuadModel{
 const key=id+':'+sex+':'+(id==='redDeer'||id==='sheep'?seed%3:0);
 const hit=cache.get(key);if(hit)return hit;
 const sp=calibrate(QUADS[id]),{L,bones}=buildSkeleton(sp),rest=restMatrices(bones);
 const geo={} as Record<PartKey,THREE.BufferGeometry|null>;
 const addRig=(g:THREE.BufferGeometry,m:THREE.Matrix4)=>{
  const p=g.getAttribute('position'),a=new Float32Array(p.count*3),v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);a[i*3]=v.x;a[i*3+1]=v.y;a[i*3+2]=v.z;}
  g.setAttribute('rig',new THREE.BufferAttribute(a,3));return g;
 };
 const near:Record<string,Mesh|null>={};
 for(const part of NEAR_PARTS){
  const m=partMesh(sp,part,{tier:0,sex,seed},L);near[part]=m;
  const bone=bones.find(b=>b.part===part)!;
  geo[part]=m?addRig(toGeometry(m),rest.get(bone.id)!):null;
 }
 // merged tiers: standing pose, geometry transformed by the rest matrices; skip tufts (tier>0 rebuilds without them)
 const mergeSet=(t:Tier,groups:Record<string,string[]>):Record<string,THREE.BufferGeometry>=>{
  const out:Record<string,THREE.BufferGeometry>={};
  for(const [name,ids] of Object.entries(groups)){
   const acc=newMesh();
   for(const bid of ids){const bone=bones.find(b=>b.id===bid)!;const mm=partMesh(sp,bone.part,{tier:t,sex,seed},L);if(!mm)continue;
    const mat=rest.get(bid)!.clone();
    if(name==='fore'||name==='hind'){const root=rest.get(ids[0])!.clone().invert();mat.premultiply(root);}
    if(name==='neckhead'){const root=rest.get('neck')!.clone().invert();mat.premultiply(root);}
    append(acc,mm,mat);}
   const g=toGeometry(acc);addRig(g,new THREE.Matrix4());out[name]=g;
  }
  return out;
 };
 const legIds=(g:string,s:number)=>['U','M','C','H'].map(k=>g+k+s);
 const midG=mergeSet(1,{body:['torso','tail'],neckhead:['neck','head','ear-1','ear1','hornL','hornR'],fore:legIds('fore',1),hind:legIds('hind',1)});
 // rig attribute for mid parts = standing torso-frame position
 const fixRig=(g:THREE.BufferGeometry,m:THREE.Matrix4)=>addRig(g,m);
 fixRig(midG.body,new THREE.Matrix4());fixRig(midG.neckhead,rest.get('neck')!);fixRig(midG.fore,rest.get('foreU1')!);fixRig(midG.hind,rest.get('hindU1')!);
 // foot bottom (standing) per leg for grounding
 const feetY:Record<string,number>={};
 for(const b of bones)if(b.part==='foreH'||b.part==='hindH'){const g=geo[b.part]!;g.computeBoundingBox();const bb=g.boundingBox!;let lo=1e9;
  const inv=rest.get(b.id)!;const m=inv.clone();// g positions are in torso frame (rig) only for 'rig' attr; position attr is local
  for(const x of [bb.min.x,bb.max.x])for(const y of [bb.min.y,bb.max.y])for(const z of [bb.min.z,bb.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(m);lo=Math.min(lo,v.y);}
  feetY[b.id]=lo;}
 const farAll=newMesh();
 const legPart2=(b:Bone)=>b.part.startsWith('fore')||b.part.startsWith('hind');
 for(const b of bones){if(legPart2(b))continue;if(b.part==='ear'&&b.side===1)continue;const mm=partMesh(sp,b.part,{tier:2,sex,seed},L);if(!mm)continue;append(farAll,mm,rest.get(b.id)!);}
 for(const [g,leg] of [['fore',sp.fore],['hind',sp.hind]] as const)for(const sd of [-1,1]){
  const pts:[number,number,number][]=[],v=new THREE.Vector3();
  for(const k of ['U','M','C','H']){v.set(0,0,0).applyMatrix4(rest.get(g+k+sd)!);pts.push([v.x,v.y,v.z]);}
  v.set(0,-leg.len[3],0).applyMatrix4(rest.get(g+'H'+sd)!);pts.push([v.x,Math.min(v.y,feetY[g+'H'+sd]),v.z]);
  const r=leg.r;tube(farAll,pts,[[r[0]*1.2,r[1]*1.3],[r[0]*.7,r[1]*.8],[r[0]*.45,r[1]*.55],[r[0]*.45,r[1]*.55],[r[0]*.5,r[1]*.6]],{seg:4,paint:()=>hex(sp.coat.legs),up:[0,0,1]});
 }
 const far=toGeometry(farAll);addRig(far,new THREE.Matrix4());
 const mid=midG as QuadModel['mid'];
 const model:QuadModel={key,spec:sp,sex,L,bones,geo,mid,far,tris:[0,0,0],feetY};
 const nearTris=NEAR_PARTS.reduce((a,p)=>{
  const mult=p==='ear'||p.startsWith('foreU')||p.startsWith('foreM')||p.startsWith('foreC')||p.startsWith('foreH')||p.startsWith('hindU')||p.startsWith('hindM')||p.startsWith('hindC')||p.startsWith('hindH')?
   (p==='ear'?2:2):1;return a+(geo[p]?triangles(geo[p]!)*mult:0);},0);
 model.tris=[nearTris,triangles(mid.body)+triangles(mid.neckhead)+2*triangles(mid.fore)+2*triangles(mid.hind),triangles(far)];
 cache.set(key,model);return model;
}
void smooth;void xform;void plate;void hex;

/** Adapter for the generic instanced layer. */
export function quadRig(m:QuadModel):RigModel{
 const both=(g:string)=>[g+'U-1',g+'U1'];
 return {key:m.key,bones:m.bones.map(b=>({id:b.id,part:b.part,parent:b.parent})),geo:m.geo,size:m.spec.real.trunk,far:m.far,
  mid:[{name:'body',bones:['torso'],geo:m.mid.body},{name:'neckhead',bones:['neck'],geo:m.mid.neckhead},{name:'fore',bones:both('fore'),geo:m.mid.fore},{name:'hind',bones:both('hind'),geo:m.mid.hind}]};
}
