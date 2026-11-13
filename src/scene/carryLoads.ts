/** GEOMETRY OF CARRIED GOODS (owner playtest 11-13: logs were flat brown slabs held against the belly). Pure data and maths, no three.js, no random.
 *
 * Every load is built from round or lumpy shapes in the rig's unit frame (feet y=0, +Z forward, shoulders .86) and mounted on a rig BONE, so it
 * moves with the body: spine for back, shoulder and yoke loads, head for head loads. Logs are round-ended cylinders of varied length and
 * diameter with lighter cut ends and bark ridges; bundles are bound with visible cordage; baskets are tapered woven cylinders with a rim and
 * weft bands; sacks are lumpy with a gathered, tied neck and creases; jars have belly, neck and lip; stones are chunky blocks and boulders on a
 * lashed frame. Nothing is a box slab: a part may be a box only when it is nearly a cube (stones) or a thin cord/strap/crease (`role`).
 * LOD: part.lod 2 = silhouette (every tier), 1 = near and mid, 0 = near only. Budgets in CARRY_BUDGET are tested over every style and fill. */
import {partTriangles,seededRandom,hashSeed,type LodTier} from './buildingParts';
import type {RigBone,RigPart} from './characterRig';
import {Q,shade} from './peopleKit';
import type {CarryChoice,CarryKind} from './carryStyles';

export type LoadRole='body'|'cord'|'strap'|'detail';
export type LoadPart=RigPart&{role:LoadRole};
export type LoadParts=Partial<Record<RigBone,LoadPart[]>>;
export const CARRY_BUDGET={near:820,mid:400,far:180} as const;
type V3=[number,number,number];
const P=(role:LoadRole,col:string,shape:RigPart['shape'],size:V3,pos:V3,lod:LodTier,rot?:V3,sides?:number):LoadPart=>({...Q(col,shape,size,pos,lod,rot,sides),role});
/** A cylinder between two points (the base is at `a`), diameters `d0` at a and `d1` at b. */
function cyl(role:LoadRole,col:string,a:V3,b:V3,d0:number,d1:number,lod:LodTier,sides=7):LoadPart{
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1e-3,pitch=Math.atan2(Math.hypot(dx,dz),dy),yaw=Math.atan2(dx,dz);
 return P(role,col,'cylinder',[d0,len,d1],[a[0],a[1],a[2]],lod,[pitch,yaw,0],sides);
}
const lerp3=(a:V3,b:V3,t:number):V3=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const add=(a:V3,b:readonly number[]):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
/** A rounded lump (barrel of two frustums, base at `c`): cheaper than a sphere, reads as a bulging sack, jar belly or boulder. `sides` 5..8. */
function blob(role:LoadRole,col:string,c:V3,w:number,h:number,d:number,lod:LodTier,sides=7,rot?:V3):LoadPart[]{
 return [P(role,col,'cylinder',[w*.6,h*.46,w],[c[0],c[1],c[2]],lod,rot,sides),P(role,shade(col,1.03),'cylinder',[w,h*.54,w*.5],[c[0],c[1]+h*.46,c[2]],lod,rot,sides)].map(q=>d===w?q:{...q,size:[q.size[0],q.size[1],q.size[2]*(d/w)] as V3});
}

export const LOAD_COL={bark:'#6b4b2e',barkLight:'#85603c',heart:'#d2a96e',heartDark:'#b88c52',cord:'#b9a26e',cordDark:'#8b7447',wicker:'#c8a468',wickerDark:'#8c6a38',wickerLight:'#dfc185',grain:'#d9bf6c',
 sack:'#b7a47c',sackDark:'#8f7d58',hide:'#7d5c40',hideDark:'#5a4029',clay:'#b0643a',clayDark:'#8a4a2a',pad:'#a3845a',stone:'#a2a09a',stoneDark:'#7f7d78',stoneLight:'#bdbab2',copper:'#a8613b',copperGreen:'#5f8a6a',iron:'#6c6f78',ironRust:'#7a5a48',wood:'#9a7446'} as const;
const tone=(hex:string,r:()=>number,amt=.1)=>shade(hex,1+(r()-.5)*amt*2);

// ---------------------------------------------------------------- pieces
/** A log: bark cylinder, bark ridges (near), lighter cut ends (mid and near), a stub of a branch now and then. */
function log(a:V3,b:V3,d:number,r:()=>number,out:LoadPart[],bark:string=LOAD_COL.bark,rich=true){
 const col=tone(bark,r,.08),len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),dir:V3=[(b[0]-a[0])/len,(b[1]-a[1])/len,(b[2]-a[2])/len];
 out.push(cyl('body',col,a,b,d*1.04,d*.96,2,6));
 if(rich)for(let i=0;i<2;i++){const t0=.2+i*.4+r()*.08;out.push(cyl('detail',shade(col,.8),lerp3(a,b,t0),lerp3(a,b,t0+.07),d*1.1,d*1.1,0,6));}
 for(const s of [-1,1] as const){const p=s<0?a:b,e=add(p,[dir[0]*.014*s,dir[1]*.014*s,dir[2]*.014*s]) as V3;
  out.push(cyl('detail',LOAD_COL.heart,s<0?e:p,s<0?p:e,d*.9,d*.9,0,6));}
 if(rich&&r()<.5)out.push(cyl('detail',col,lerp3(a,b,.3+r()*.4),add(lerp3(a,b,.5),[0,d*.8,d*.05]),d*.28,d*.2,0,4));
}
/** Cross-section positions of `n` logs bound in one bundle (centre-out circle packing); radius of the whole cluster in `.R`. */
function pack(n:number,d:number):{pts:[number,number][];R:number}{
 if(n<=1)return {pts:[[0,0]],R:d/2};
 if(n===2)return {pts:[[-d/2,0],[d/2,0]],R:d};
 if(n<=5&&n!==5){const ring=d/(2*Math.sin(Math.PI/n));return {pts:Array.from({length:n},(_,i)=>[Math.sin(i/n*Math.PI*2+Math.PI/n)*ring,Math.cos(i/n*Math.PI*2+Math.PI/n)*ring] as [number,number]),R:ring+d/2};}
 const ringN=n-1,ring=Math.max(d*1.02,d/(2*Math.sin(Math.PI/ringN)));
 return {pts:[[0,0],...Array.from({length:ringN},(_,i)=>[Math.sin(i/ringN*Math.PI*2)*ring,Math.cos(i/ringN*Math.PI*2)*ring] as [number,number])],R:ring+d/2};
}
/** A woven basket standing on y0: tapered wall, weft bands, rim, base, optional contents heaped above the rim. `fill` 0..1. */
function basket(c:V3,dBot:number,dTop:number,h:number,fill:number,kind:CarryKind,r:()=>number,out:LoadPart[],opts:{contents?:boolean}={}){
 const w=tone(LOAD_COL.wicker,r,.07),[x,y,z]=c;
 out.push(P('body',w,'cylinder',[dBot,h,dTop],[x,y,z],2,undefined,10),P('detail',LOAD_COL.wickerDark,'cylinder',[dBot*.82,.02,dBot*.82],[x,y-.004,z],1,undefined,8));
 for(let i=0;i<3;i++){const t=(i+.6)/3.2,dia=dBot+(dTop-dBot)*t;out.push(P('detail',i%2?LOAD_COL.wickerDark:LOAD_COL.wickerLight,'cylinder',[dia*1.04,h*.09,dia*1.04],[x,y+h*t-h*.04,z],0,undefined,8));}
 out.push(P('detail',LOAD_COL.wickerLight,'cylinder',[dTop*1.07,h*.1,dTop*1.07],[x,y+h*.92,z],1,undefined,9));
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;out.push(cyl('detail',LOAD_COL.wickerDark,[x+Math.sin(a)*dBot*.5,y+.01,z+Math.cos(a)*dBot*.5],[x+Math.sin(a)*dTop*.5,y+h*.9,z+Math.cos(a)*dTop*.5],.014,.014,0,3));}
 if(opts.contents!==false)contents(c,dTop,h,fill,kind,r,out);
}
/** What the real cargo looks like heaped in a basket top: grain, stones, ore lumps, split wood. */
function contents(c:V3,dTop:number,h:number,fill:number,kind:CarryKind,r:()=>number,out:LoadPart[]){
 const [x,y,z]=c,top=y+h*.88,mound=.04+.12*fill;
 if(kind==='food'){out.push(P('body',tone(LOAD_COL.grain,r,.06),'cone',[dTop*.96,mound*1.3,dTop*.96],[x,top-mound*.3,z],2,undefined,8));for(let i=0;i<3;i++)out.push(P('detail',shade(LOAD_COL.grain,.88+r()*.2),'cone',[.07,.05,.07],[x+(r()-.5)*dTop*.5,top+mound*.5,z+(r()-.5)*dTop*.5],0,undefined,4));return;}
 const n=2+Math.round(fill*3),col=kind==='stone'?LOAD_COL.stone:kind==='copper'?LOAD_COL.copper:kind==='iron'?LOAD_COL.iron:LOAD_COL.wood;
 if(kind==='wood'){for(let i=0;i<n+2;i++){const a=i/(n+2)*Math.PI*2,rr=dTop*.28*(i%2?1:.55);out.push(cyl('body',tone(LOAD_COL.bark,r,.1),[x+Math.sin(a)*rr,top-.1,z+Math.cos(a)*rr],[x+Math.sin(a)*rr*.8+(r()-.5)*.06,top+.18+r()*.16,z+Math.cos(a)*rr*.8],.07,.06,1,5));}return;}
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2+r(),rr=dTop*(.16+.1*(i%2)),s=.1+r()*.07;out.push(P('body',tone(col,r,.12),'hip',[s*1.15,s,s*1.05] as V3,[x+Math.sin(a)*rr,top-.05+(i%2)*.03,z+Math.cos(a)*rr],i<2?2:1,[0,a,0]));}
 if(kind==='copper')out.push(P('detail',LOAD_COL.copperGreen,'hip',[.06,.04,.06],[x,top+.05,z+.05],0));
}
/** A lumpy sack: overlapping bulges, a gathered neck bound with cord, a few dark creases. */
function sack(c:V3,w:number,h:number,r:()=>number,out:LoadPart[],tied=true,skin=false){
 const [x,y,z]=c,col=tone(skin?LOAD_COL.hide:LOAD_COL.sack,r,.07),dk=skin?LOAD_COL.hideDark:LOAD_COL.sackDark;
 out.push(...blob('body',col,[x,y,z],w,h*.8,w*.8,2,7),...blob('body',shade(col,1.05),[x+w*.14,y+h*.22,z-.01],w*.62,h*.42,w*.5,1,6),...blob('body',shade(col,.93),[x-w*.17,y+h*.04,z+.03],w*.55,h*.36,w*.5,0,5));
 out.push(P('body',col,'cone',[w*.4,h*.2,w*.36],[x,y+h*.7,z],2,undefined,6));
 if(tied)out.push(P('cord',LOAD_COL.cord,'cylinder',[w*.24,.034,w*.22],[x,y+h*.74,z],1,undefined,6));
 for(let i=0;i<3;i++){const a=(i-1)*.7;out.push(cyl('detail',dk,[x+Math.sin(a)*w*.3,y+h*.12,z-w*.36],[x+Math.sin(a)*w*.34,y+h*.58,z-w*.34],.016,.012,0,3));}
}
/** A jar: belly, neck, lip, two small handles; an amphora when `tall`. */
function jar(c:V3,d:number,tall:boolean,r:()=>number,out:LoadPart[]){
 const [x,y,z]=c,col=tone(LOAD_COL.clay,r,.07),h=tall?d*1.35:d;
 out.push(...blob('body',col,[x,y,z],d,h*.86,d,2,8),P('body',shade(col,.95),'cylinder',[d*.45,h*.3,d*.32],[x,y+h*.86,z],2,undefined,7),P('detail',shade(col,1.1),'cylinder',[d*.48,.03,d*.48],[x,y+h*1.14,z],1,undefined,7),
  P('detail',LOAD_COL.clayDark,'cylinder',[d*1.02,.022,d*1.02],[x,y+h*.4,z],0,undefined,8));
 for(const s of [-1,1])out.push(cyl('detail',shade(col,.85),[x+s*d*.16,y+h*1.0,z],[x+s*d*.52,y+h*.74,z],.03,.03,1,4));
}
/** Cord loops over both shoulders to a hand-held end in front: points are the ones a real strap takes. */
function loops(back:V3,front:V3,out:LoadPart[],col:string=LOAD_COL.cord,both=true){
 for(const s of both?[-1,1]:[1]){
  const pts:V3[]=[[s*back[0],back[1],back[2]],[s*.135,.925,-.03],[s*.145,.9,.07],[s*.14,.78,.165],[s*front[0],front[1],front[2]]];
  for(let i=0;i<pts.length-1;i++)out.push(cyl('strap',i%2?shade(col,.92):col,pts[i],pts[i+1],.032,.032,1,3));
 }
}

// ---------------------------------------------------------------- styles
/** The parts for one carried load on the bones that carry it. `c.pieces`, `c.load` and `c.variety` (all stable per unit) vary count, length, diameter and fill. */
export function carryLoadParts(c:CarryChoice,seed:number):LoadParts{
 const r=seededRandom(hashSeed(seed,'load',c.style,c.kind)),out:LoadPart[]=[],head:LoadPart[]=[],fill=Math.max(.12,c.load),v=c.variety;
 switch(c.style){
  case 'shoulderLog':{
   const n=c.pieces,d=.11+.03*v,len=1.0+.35*v,{pts}=pack(n,d*1.02);
   pts.forEach(([px,py],i)=>{const l=len*(1-.12*i)*(.92+r()*.16),shift=(r()-.5)*.14,z0=-.14+shift,x=.15+px*.9,y=.985+py*.9;log([x,y,z0-l*.58],[x,y+.012*i,z0+l*.42],d*(.9+r()*.2),r,out);});
   if(n>1)for(const t of [.3,.62])out.push(P('cord',LOAD_COL.cord,'cylinder',[d*2.6,.03,d*2.1],[.15,.985+.0,-.14+(t-.5)*len*.9],1,[Math.PI/2,0,0],8));
   break;}
  case 'poleFront':case 'poleRear':{
   const d=.15+.03*v,len=2.7+.3*v,rear=c.style==='poleRear',z0=rear?-.55:-(len-.55);
   log([.15,.99,z0],[.15,.99,z0+len],d,r,out);
   out.push(P('cord',LOAD_COL.cord,'cylinder',[d*1.25,.035,d*1.25],[.15,.99,rear?.1:-.1],1,[Math.PI/2,0,0],8));
   break;}
  case 'bundleBack':{
   const n=Math.min(6,c.pieces),d=.085+.03*v,len=.78+.18*v,{pts,R}=pack(n,d*1.02),cy=.72,cz=-.31;
   pts.forEach(([px,py],i)=>{const l=len*(.86+r()*.28);log([-l/2+(r()-.5)*.06,cy+py,cz+px],[l/2+(r()-.5)*.06,cy+py,cz+px],d*(.88+r()*.24),r,out,LOAD_COL.bark,n<=4);});
   for(const x of [-len*.3,len*.3])out.push(P('cord',LOAD_COL.cord,'cylinder',[R*2.18,.04,R*2.18],[x,cy,cz],1,[0,0,Math.PI/2],10),P('detail',LOAD_COL.cordDark,'cylinder',[R*2.28,.012,R*2.28],[x,cy,cz],0,[0,0,Math.PI/2],10));
   loops([.12,cy+R*.55,cz+R*.4],[.115,.6,.205],out);
   // a leaf-bearing twig or two sticking out, so a load of brushwood does not look machined
   if(r()<.7)out.push(cyl('detail',LOAD_COL.barkLight,[len*.3,cy+R*.5,cz],[len*.58,cy+R*1.1,cz-.04],.03,.012,0,4));
   break;}
  case 'tumplineBasket':{
   const h=.4+.1*v,dB=.3,dT=.44,y0=.5,cz=-.33;
   basket([0,y0,cz],dB,dT,h,fill,c.kind,r,out);
   // forehead band on the head bone, cords from the band to the basket rim
   head.push(P('strap',LOAD_COL.pad,'cylinder',[.292,.05,.29],[0,1.0,-.005],1,undefined,9),P('detail',LOAD_COL.cordDark,'cylinder',[.298,.012,.296],[0,1.022,-.005],0,undefined,9));
   for(const s of [-1,1]){out.push(cyl('strap',LOAD_COL.cord,[s*.2,y0+h*.9,cz+.04],[s*.145,1.01,-.045],.026,.026,1,3));}
   out.push(P('cord',LOAD_COL.cordDark,'cylinder',[dT*1.0,.02,dT*1.0],[0,y0+h*.5,cz],0,undefined,10));
   break;}
  case 'headLoad':{
   const y0=1.205;
   head.push(P('detail',LOAD_COL.pad,'cylinder',[.25,.055,.25],[0,y0-.045,-.005],1,undefined,8),P('detail',shade(LOAD_COL.pad,.8),'cylinder',[.255,.02,.255],[0,y0-.03,-.005],0,undefined,8));
   const tmp:LoadPart[]=[];
   if(c.kind==='food'&&v<.5)jar([0,y0,0],.3+.04*v,v<.22,r,tmp);
   else basket([0,y0,0],.3,.46+.04*v,.2,fill,c.kind,r,tmp);
   // the load sits on the pad and rocks with the head
   for(const q of tmp)head.push(q);
   break;}
  case 'yoke':{
   const poleY=.905,pz=-.02,half=.7;
   out.push(cyl('body',LOAD_COL.wood,[-half-.06,poleY,pz],[half+.06,poleY,pz],.052,.052,2,6),cyl('detail',LOAD_COL.barkLight,[-half-.06,poleY,pz],[-half+.02,poleY,pz],.065,.065,0,6),cyl('detail',LOAD_COL.barkLight,[half-.02,poleY,pz],[half+.06,poleY,pz],.065,.065,0,6));
   for(const s of [-1,1]){
    const x=s*half;
    out.push(cyl('cord',LOAD_COL.cord,[x-.09,poleY-.02,pz],[x-.12,.62,pz],.016,.016,1,3),cyl('cord',LOAD_COL.cord,[x+.09,poleY-.02,pz],[x+.12,.62,pz],.016,.016,1,3));
    if(c.kind==='wood'){const n=3,d=.075,{pts}=pack(n,d);pts.forEach(([px,py],i)=>{log([x+px,.3+i*.02,pz+py],[x+px,.74+i*.04,pz+py],d*(.9+r()*.2),r,out,LOAD_COL.bark,false);});out.push(P('cord',LOAD_COL.cord,'cylinder',[.24,.035,.24],[x,.56,pz],1,undefined,8));}
    else basket([x,.34,pz],.26,.36,.3,fill*(.85+.3*r()),c.kind,r,out);
   }
   break;}
  case 'sackBack':{
   const w=.34+.08*c.load+.03*v,h=.46+.14*c.load;
   sack([.0,.52,-.27],w,h,r,out,true,c.kind!=='food'||v>.55);
   // the strap over the right shoulder to the hand that holds it
   loops([.0,.9,-.26],[.095,.62,.2],out,LOAD_COL.cordDark,false);
   break;}
  case 'stoneFrame':{
   const n=c.pieces,cz=-.27,col=c.kind==='stone'?LOAD_COL.stone:c.kind==='copper'?LOAD_COL.copper:LOAD_COL.iron;
   for(const s of [-1,1])out.push(cyl('body',LOAD_COL.wood,[s*.15,.3,cz+.03],[s*.15,1.0,cz-.02],.05,.045,2,6));
   for(const y of [.36,.62,.9])out.push(cyl('body',LOAD_COL.wood,[-.19,y,cz],[.19,y,cz],.042,.042,1,6));
   for(let i=0;i<n;i++){const col2=tone(col,r,.12),w=.19+.06*r(),h=.14+.04*r(),dz=.17+.04*r(),x=((i%2)-.5)*.1*(n>2?1:0),y=.38+i*.12+(i%2)*.01;
    out.push(P('body',col2,c.kind==='stone'?'box':'hip',[w,h,dz],[x,y,cz-.2],2,[0,(r()-.5)*.35,0],6));}
   if(c.kind==='stone')for(let i=0;i<n;i++)out.push(P('detail',shade(LOAD_COL.stoneLight,.9+r()*.15),'hip',[.07,.04,.06],[((i%2)-.5)*.08,.45+i*.12,cz-.32],0));
   for(const y of [.5,.78])out.push(P('cord',LOAD_COL.cord,'cylinder',[.42,.03,.2],[0,y,cz-.18],1,undefined,8));
   loops([.13,.92,cz+.02],[.115,.6,.205],out);
   break;}
 }
 const res:LoadParts={};if(out.length)res.spine=out;if(head.length)res.head=head;
 return res;
}
const trisOf=(parts:readonly RigPart[],tier:LodTier)=>parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier).reduce((n,p)=>n+partTriangles(p),0);
/** Triangles a load costs at a tier (all bones). */
export const loadTriangles=(l:LoadParts,tier:LodTier)=>Object.values(l).reduce((n,p)=>n+trisOf(p!,tier),0);
