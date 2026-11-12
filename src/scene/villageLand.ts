/** Village grammar: land works and waterfront (farm plot, animal pen, dock, bridge, quarry, cairn, sacred grove, frontier cornerstone).
 * Same rules as villageDefence.ts: pure parts, metres, entrance +Z, nothing outside the footprint (the field, pen and quarry ARE their footprint, so they
 * are built of many thin functional pieces, never one slab). The society's skin chooses the boundary construction (SkinForms.wall) for fields and pens
 * and the stone/timber character of the bridge and dock; everything else follows era, climate, wealth and the settlement's tradition. */
import {beam,chance,far,part,pick,range,type Part,type Rng} from './buildingParts';
import {roofMaterial,wallMaterial,type FamilyContext,type Generator,type WallStyle} from './buildingHelpers';
import {barrel,box,bucket,crate,cyl,doorway,roofGable,sack,woodpile,type V3} from './buildingKit';
import type {CarvedMaterialId as M} from './carvedPalette';

type P=Part[];
const TAU=Math.PI*2;
const style=(ctx:FamilyContext):WallStyle=>ctx.form?.wall??'log';
/** Boundary run (field, pen) along x or z, by wall style: woven hurdle on stakes, dry-stone dyke, mud wall with thorn, or post-and-rail. `skip` leaves a gap (gate). */
function boundary(p:P,st:WallStyle,ctx:FamilyContext,r:Rng,ax:'x'|'z',fixed:number,a0:number,a1:number,H:number){
  const len=a1-a0,c=(a0+a1)/2;if(len<.3)return;const at=(t:number):V3=>ax==='x'?[t,0,fixed]:[fixed,0,t],sz=(l:number,h:number,t:number):V3=>ax==='x'?[l,h,t]:[t,h,l];
  if(st==='drystone'){
    p.push(part('box','stoneDark',sz(len,.3,.62),at(c),1),part('box','stone',sz(len-.04,H-.35,.46),[at(c)[0],.3,at(c)[2]],2),part('box','moss',sz(len,.1,.5),[at(c)[0],H-.05,at(c)[2]],1));
    for(let i=0;i<Math.min(12,Math.floor(len/.8));i++){const o=a0+.4+i*len/Math.min(12,Math.floor(len/.8));p.push(part('box',i%2?'stoneDark':'stone',sz(range(r,.3,.5),range(r,.2,.3),.1),[at(o)[0],range(r,.2,H*.7),at(o)[2]+(ax==='x'?.25:0)*(i%2?1:-1)],0));}
  }else if(st==='mudbrick'){
    p.push(part('box','mud',sz(len,.2,.6),at(c),1),part('box','plaster',sz(len-.02,H-.1,.42),[at(c)[0],.2,at(c)[2]],2),part('box','mud',sz(len,.12,.5),[at(c)[0],H+.1,at(c)[2]],1));
    for(let i=0;i<Math.min(16,Math.floor(len/.55));i++){const o=a0+.28+i*len/Math.min(16,Math.floor(len/.55));p.push(part('cone','woodLight',[.12,.45,.12],[at(o)[0],H+.2,at(o)[2]],0,undefined,4));}
  }else if(st==='ashlar'){
    const n=Math.max(1,Math.round(len/1.6));for(let i=0;i<=n;i++){const t=a0+i*len/n;p.push(part('box','stone',[.22,H+.2,.22],at(t),1),part('pyramid','stoneDark',[.28,.14,.28],[at(t)[0],H+.2,at(t)[2]],0));}
    for(const y of[.32,.68])p.push(part('box','woodMid',sz(len,.08,.08),[at(c)[0],y,at(c)[2]],2));
    p.push(part('box','woodLight',sz(len,.3,.04),[at(c)[0],.1,at(c)[2]],0));
  }else{
    // woven wattle hurdle: stakes at spacing and a weave of withies in alternating courses
    const n=Math.max(2,Math.min(14,Math.round(len/.45)));for(let i=0;i<=n;i++){const t=a0+i*len/n;p.push(part('cylinder','woodDark',[.1,H+.12,.09],at(t),0,undefined,5));}
    p.push(part('box','woodDark',sz(len,H,.08),[at(c)[0],0,at(c)[2]],2));
    for(let i=0;i<4;i++)p.push(part('box',i%2?'woodLight':'straw',sz(len,.12,.1),[at(c)[0],.12+i*H/4.2,at(c)[2]+(ax==='x'?(i%2?.04:-.04):0)],i%2?2:1));
  }
  void ctx;
}

/** Farm plot: ridge-and-furrow strips (Laxton/Midland open fields) with crop rows on the ridges, a field boundary by the society's wall style (wattle hurdle, dry-stone
 * dyke, mud wall with thorn, post-and-rail), a headland and field gate; hill fields add a clearance cairn, arid fields an irrigation ditch with a shaduf, and richer
 * farms a tool shed with roof, a scarecrow, seed baskets and a hay cart. */
export const fieldPlot:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,PW=w/2*.92,PD=d/2*.92,head=range(r,1.2,1.7),dry=ctx.climate==='arid',st=ctx.form?ctx.form.wall:ctx.era>=2&&(ctx.climate==='cold'||ctx.material==='stone')?'drystone':dry?'mudbrick':'log';
  const chan=dry?.7:0,x0=-PW+.35+chan,x1=PW-.35,rows=Math.max(4,Math.round((x1-x0)/range(r,.95,1.3))),rw=(x1-x0)/rows,z0=-PD+.3,L=PD-head-z0,zc=(z0+PD-head)/2,ridgeH=range(r,.2,.3);
  for(let i=0;i<rows;i++){const x=x0+(i+.5)*rw;
    parts.push(part('box','woodDark',[rw*.66,ridgeH,L],[x,0,zc],1));
    const grain=i%3!==1;parts.push(part('box',grain?'foliage':'foliageDark',[rw*(grain?.4:.3),grain?.2:.34,L*.94],[x,ridgeH,zc],1));
    if(grain)for(let j=0;j<4;j++)parts.push(part('cone','straw',[.1,.18,.1],[x,ridgeH+.2,z0+L*(.12+j*.25)],0,undefined,4));}
  parts.push(far(part('box','woodDark',[x1-x0,ridgeH+.1,L],[(x0+x1)/2,0,zc],2)));
  const H=st==='drystone'?.8:st==='mudbrick'?.85:.9,gate=.85;
  boundary(parts,st,ctx,r,'x',-PD,-PW,PW,H);boundary(parts,st,ctx,r,'z',-PW,-PD,PD,H);boundary(parts,st,ctx,r,'z',PW,-PD,PD,H);
  boundary(parts,st,ctx,r,'x',PD,-PW,-gate,H);boundary(parts,st,ctx,r,'x',PD,gate,PW,H);
  // field gate: posts, one hung leaf and a latch
  for(const s of[-1,1])parts.push(part('cylinder','woodEdge',[.2,H+.4,.18],[s*gate,0,PD],1,undefined,6));
  parts.push(part('box','woodMid',[gate*.95,H*.8,.06],[gate*.5,.05,PD-.1],0,[0,.5,0]),part('box','iron',[.12,.08,.06],[gate-.1,H*.5,PD-.02],0));
  if(dry){const cx=-PW+.45;for(const s of[-1,1])parts.push(part('box','stoneDark',[.14,.22,L],[cx+s*.3,0,zc],1));parts.push(part('box','water',[.46,.1,L],[cx,0,zc],0));
    // shaduf at the ditch head: a pole on a post, bucket on a rope, counterweight of clay
    const sx=cx+.55,sz=PD-head+.6;parts.push(beam('woodDark',[sx,0,sz],[sx,1.7,sz],.12,1),beam('woodMid',[sx-.9,1.35,sz],[sx+.8,1.9,sz],.08,0),part('sphere','mud',[.34,.34,.34],[sx+.85,1.7,sz],0),beam('woodLight',[sx-.9,1.35,sz],[sx-.9,.5,sz],.03,0),part('cylinder','woodDark',[.26,.22,.22],[sx-.9,.3,sz],0,undefined,6));}
  if(ctx.wealth>.4&&ctx.era>=1){const sx=-PW+.95,sz=PD-.75,wm=wallMaterial(ctx);
    parts.push(part('box',wm,[1.3,1.15,1],[sx,0,sz],2),part('wedge',roofMaterial(ctx),[1.5,.5,1.2],[sx,1.15,sz],1,[0,Math.PI,0]),part('box','recess',[.45,.85,.05],[sx+.2,0,sz+.52],0),part('box','woodDark',[1.4,.1,.05],[sx,1.1,sz+.52],0));
    parts.push(part('box','woodMid',[.9,.3,.7],[sx+1.3,.22,sz+.1],1),part('box','woodDark',[.1,.22,.1],[sx+1.3,.02,sz+.1],0),part('cylinder','woodDark',[.5,.1,.5],[sx+.9,.26,sz+.1],0,[0,0,Math.PI/2],8),part('cylinder','woodDark',[.5,.1,.5],[sx+1.7,.26,sz+.1],0,[0,0,Math.PI/2],8));
    for(let i=0;i<5;i++)parts.push(part('cylinder','straw',[.3,.12,.3],[sx+1.3+(i%2)*.15,.5+Math.floor(i/2)*.1,sz+.1+(i%3)*.05],0,undefined,6));}
  if(ctx.era>=1&&chance(r,.7)){const sx=range(r,-PW*.4,PW*.4),sz=zc;parts.push(beam('woodDark',[sx,0,sz],[sx,1.5,sz],.07,1),part('box','woodDark',[.9,.06,.06],[sx,1.2,sz],0),part('box','cloth',[.5,.5,.05],[sx,.65,sz],0),part('sphere','straw',[.26,.26,.26],[sx,1.5,sz],0),part('cone','woodDark',[.34,.2,.34],[sx,1.7,sz],0,undefined,6));}
  if(ctx.era>=1&&chance(r,.4))for(let i=0;i<8;i++)parts.push(part('box','stoneDark',[.4-i*.02,.18,.4-i*.02],[PW-.8+((i*7)%3)*.08,Math.floor(i/3)*.18,-PD+.7+(i%3)*.05],0,[0,i,0]));
  return {parts,entry:{x:0,z:PD,width:gate*2}};
};

/** Animal pen: wattle-hurdle fold (Butser/Iron Age), dry-stone sheepfold, mud-brick kraal with thorn or post-and-rail by the society's wall style; a gate in the front
 * side with one leaf swung open, a lean-to shelter on the back wall, a trough with water, a hay rack and haystack, feed barrels. Adapts to any dragged size. */
export const pen:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,PW=w/2-.3,PD=d/2-.3,st:WallStyle=ctx.form?ctx.form.wall:ctx.climate==='cold'||(ctx.material==='stone'&&ctx.era>=2)?'drystone':'log',gate=Math.min(1.9,PW*.6),H=st==='drystone'?.95:range(r,1.05,1.25);
  boundary(parts,st,ctx,r,'x',-PD,-PW,PW,H);boundary(parts,st,ctx,r,'z',-PW,-PD,PD,H);boundary(parts,st,ctx,r,'z',PW,-PD,PD,H);
  boundary(parts,st,ctx,r,'x',PD,-PW,-gate/2,H);boundary(parts,st,ctx,r,'x',PD,gate/2,PW,H);
  parts.push(part('box','woodEdge',[gate*.55,H*.85,.07],[gate/2+.3,0,PD-.4],0,[0,.7,0]));
  for(const s of[-1,1])parts.push(part('cylinder','woodEdge',[.2,H+.45,.18],[s*gate/2,0,PD],1,undefined,6));
  const sw=Math.min(3.2,PW*.9),sd=Math.min(1.9,PD*.8),sx=pick(r,[-1,1])*(PW-sw/2-.2),sz=-PD+sd/2+.25;
  for(const px of[-1,1]){parts.push(beam('woodDark',[sx+px*(sw/2-.12),0,sz-sd/2+.1],[sx+px*(sw/2-.12),1.9,sz-sd/2+.1],.14,1),beam('woodDark',[sx+px*(sw/2-.12),0,sz+sd/2-.1],[sx+px*(sw/2-.12),1.35,sz+sd/2-.1],.14,1));}
  parts.push(part('wedge',st==='drystone'||ctx.era>=2?roofMaterial(ctx):'thatch',[sw+.3,.58,sd+.3],[sx,1.35,sz],2));
  parts.push(part('box','woodMid',[sw-.3,.08,.1],[sx,1.3,sz+sd/2-.1],0));
  const tx=-Math.sign(sx||1)*(PW*.35);parts.push(part('box','woodDark',[1.5,.34,.42],[tx,0,0],1),part('box','water',[1.36,.04,.3],[tx,.32,0],0));
  if(PW>2.4){for(const q of[-.55,.55])parts.push(beam('woodDark',[sx+q,0,sz-sd/2+.18],[sx+q,.75,sz-sd/2+.18],.07,0));parts.push(part('box','woodMid',[1.2,.05,.1],[sx,.62,sz-sd/2+.18],0));for(let i=0;i<4;i++)parts.push(part('box','woodLight',[.05,.5,.05],[sx-.45+i*.3,.14,sz-sd/2+.2],0));parts.push(part('cone','straw',[.9,.7,.9],[sx+(sx>0?-1:1)*.4,0,sz+sd/2-.4],1,undefined,7));}
  if(ctx.wealth>.5)parts.push(part('box','woodMid',[sw*.7,.4,.3],[sx,0,sz+sd/2-.5],0));
  return {parts,entry:{x:0,z:PD,width:gate}};
};

/** Pier and boathouse (Viking and Hanseatic quays): a timber jetty on pile bents with X-bracing, planked deck, mooring bollards, a T-head with lantern, a skiff tied alongside, a
 * net hut and drying racks on the shore, barrels and nets, and from the later eras a swing hoist for cargo. Built facing the water at +Z (generateFamily yaws it to the real water side). */
export const pier:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,Ld=d*.72,zEnd=d/2-.1,z0=zEnd-Ld,dw=1.8,xo=range(r,-w*.1,w*.1),deckY=.55,stone=ctx.material==='stone'&&ctx.era>=3;
  parts.push(part('box','woodMid',[dw,.12,Ld],[xo,deckY,z0+Ld/2],2));
  const bents=Math.max(3,Math.round(Ld/1.5));
  for(let i=0;i<bents;i++){const z=z0+.3+i*(Ld-.6)/(bents-1);
    for(const s of[-1,1])parts.push(part('cylinder','woodDark',[.26,deckY,.22],[xo+s*(dw/2-.12),0,z],1,undefined,6));
    parts.push(part('box','woodEdge',[dw,.1,.16],[xo,deckY-.1,z],1));
    if(i<bents-1){const z2=z0+.3+(i+1)*(Ld-.6)/(bents-1);parts.push(beam('woodMid',[xo-dw/2+.12,.05,z],[xo+dw/2-.12,deckY-.12,(z+z2)/2],.05,0),beam('woodMid',[xo+dw/2-.12,.05,z],[xo-dw/2+.12,deckY-.12,(z+z2)/2],.05,0));}}
  for(const s of[-1,1])parts.push(part('box','woodDark',[.14,.2,Ld],[xo+s*(dw/2-.12),deckY-.2,z0+Ld/2],1));
  for(let i=0;i<Math.round(Ld/.4);i++)parts.push(part('box','woodLight',[dw+.06,.03,.3],[xo,deckY+.12,z0+.2+i*(Ld-.4)/Math.round(Ld/.4)],0));
  const th=Math.min(w*.5,dw+2),tz=zEnd-.5;
  parts.push(part('box','woodMid',[th,.12,1],[xo,deckY,tz],2));
  for(const s of[-1,1])for(const z of[tz-.4,tz+.4])parts.push(part('cylinder','woodDark',[.26,deckY,.22],[xo+s*(th/2-.14),0,z],1,undefined,6));
  for(const s of[-1,1])parts.push(part('cylinder','woodEdge',[.24,.5,.2],[xo+s*(th/2-.2),deckY+.12,tz],1,undefined,6));
  for(const z of[z0+Ld*.35,z0+Ld*.7])parts.push(part('cylinder','woodEdge',[.22,.4,.2],[xo-dw/2+.14,deckY+.12,z],0,undefined,6));
  // lantern post at the head
  parts.push(beam('woodDark',[xo+th/2-.25,deckY,tz-.4],[xo+th/2-.25,deckY+1.9,tz-.4],.1,1),beam('woodDark',[xo+th/2-.25,deckY+1.85,tz-.4],[xo+th/2-.7,deckY+1.85,tz-.4],.06,0),part('box','fire',[.18,.24,.18],[xo+th/2-.7,deckY+1.45,tz-.4],0),beam('iron',[xo+th/2-.7,deckY+1.85,tz-.4],[xo+th/2-.7,deckY+1.65,tz-.4],.02,0));
  // skiff tied alongside: rounded hull of two wedges and a box, thwarts, oars
  {const bx=xo-dw/2-.75,bz=z0+Ld*.55,len=2.3;
   parts.push(part('box','woodDark',[.9,.32,len-.9],[bx,.02,bz],1),part('wedge','woodDark',[.9,.32,.55],[bx,.02,bz+(len-.9)/2+.27],1,[0,Math.PI,0]),part('wedge','woodDark',[.9,.32,.55],[bx,.02,bz-(len-.9)/2-.27],1));
   parts.push(part('box','woodLight',[.74,.04,len-.7],[bx,.3,bz],0));for(const t of[-.5,.4])parts.push(part('box','woodMid',[.84,.05,.18],[bx,.4,bz+t],0));
   parts.push(beam('woodLight',[bx-.2,.45,bz+.1],[bx-.8,.35,bz+.5],.04,0),beam('iron',[xo-dw/2+.1,deckY+.1,bz+.35],[bx+.4,.35,bz+.5],.015,0));}
  // shore: net hut, drying rack, steps
  parts.push(part('box','stoneDark',[dw*.9,.28,.45],[xo,0,z0-.7],1),part('box','stone',[dw*.9,.5,.45],[xo,0,z0-.25],1));
  if(ctx.era>=1){const hx=-w/2+1.35,hz=-d/2+1.15,hw=1.9,hd=1.5,h=1.55;
    parts.push(part('box',wallMaterial(ctx),[hw,h,hd],[hx,0,hz],2));roofGable(parts,ctx,{span:hd,len:hw,eave:h,pitch:.75,cx:hx,cz:hz,axis:'x',over:.16,mat:roofMaterial(ctx)});
    doorway(parts,{x:hx,z:hz+hd/2,wall:0,w:.75,h:1.3,double:false});
    for(let i=0;i<3;i++)parts.push(part('box','woodMid',[.14,.14,.22],[hx-hw/2+.35+i*.6,h*.6,hz-hd/2-.1],0));
    barrel(parts,hx+hw/2+.4,0,hz+.2,1);barrel(parts,hx+hw/2+.45,0,hz+.75,.9);crate(parts,hx+hw/2+.1,0,hz+hd/2+.45,1,.3);}
  {const rx=w/2-1.3,rz=-d/2+1.25;for(const s of[-1,1])parts.push(beam('woodDark',[rx+s*.8,0,rz],[rx+s*.8,1.55,rz],.09,1));
   parts.push(part('box','woodMid',[1.7,.07,.07],[rx,1.45,rz],1),part('box','cloth',[1.4,.85,.04],[rx,.6,rz],0),part('box','woodMid',[1.7,.07,.07],[rx,.9,rz],0));}
  if(ctx.era>=3&&ctx.wealth>.4){// swing hoist: post, jib and tackle over the T-head
    parts.push(beam('woodDark',[xo-th/2+.3,deckY,tz+.25],[xo-th/2+.3,deckY+2.5,tz+.25],.16,1),beam('woodDark',[xo-th/2+.3,deckY+2.4,tz+.25],[xo-th/2+1.5,deckY+2.4,tz+.25],.1,1),beam('woodMid',[xo-th/2+.3,deckY+.9,tz+.25],[xo-th/2+1.2,deckY+2.35,tz+.25],.07,0),beam('woodLight',[xo-th/2+1.5,deckY+2.35,tz+.25],[xo-th/2+1.5,deckY+1.1,tz+.25],.025,0),part('box','woodLight',[.4,.4,.4],[xo-th/2+1.5,deckY+.7,tz+.25],0));}
  else{crate(parts,xo-th/2+.5,deckY+.1,tz+.2,1,.3);sack(parts,xo-th/2+1.0,deckY+.1,tz+.1,1,.4);}
  void stone;
  return {parts,entry:{x:xo,z:z0-.9,width:dw}};
};

/** Bridge: a timber trestle bridge on pile bents with X-bracing, plank deck, post-and-rail parapets with lantern posts and stone abutments (Iron Age and Roman river
 * crossings), or from the stone era a segmental-arched bridge with cutwater piers, coped parapets and corner pillars (medieval packhorse bridges). The span runs along Z. */
export const bridge:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,Bw=Math.min(w*.62,range(r,2.4,3.0)),stone=(ctx.material==='stone'||ctx.climate==='cold')&&ctx.era>=2,H=stone?1.6:.95,Lc=d,ramp=1.4,n=3;
  const dz0=-Lc/2+ramp,dz1=Lc/2-ramp,Ld=dz1-dz0,topH=stone?H-.3:H-.14;
  for(const s of[-1,1])for(let i=0;i<n;i++)parts.push(part('box',stone?'stone':'woodDark',[Bw*.9,topH*(i+1)/n,ramp/n],[0,0,s*(Lc/2-(i+.5)*ramp/n)],1));
  for(const s of[-1,1]){const zz=s*(Lc/2-.12);parts.push(part('box','stoneDark',[Bw+.5,.5,.3],[0,0,zz],1));}
  if(stone){
    const spans=Math.max(2,Math.round(Ld/3.6)),sl=Ld/spans,y0=.5;
    for(let i=0;i<=spans;i++){const z=Math.min(dz1-.35,Math.max(dz0+.35,dz0+i*sl));
      parts.push(part('box','stoneDark',[Bw*.95,H-.3,.7],[0,0,z],2));
      if(i>0&&i<spans)parts.push(part('wedge','stoneDark',[Bw*.8,.55,.5],[0,0,z+.6],0,[0,Math.PI,0]),part('wedge','stoneDark',[Bw*.8,.55,.5],[0,0,z-.6],0));}
    for(let i=0;i<spans;i++){const zc=dz0+(i+.5)*sl,ar=sl/2-.35,rise=Math.min(.45,ar*.3),crown=y0+rise+.34;
      parts.push(part('box','stone',[Bw,.3,sl+.04],[0,H-.3,zc],2));
      // voussoir ring (segmental arch) with a keystone, and haunch fill above it up to the crown line
      for(let k=0;k<7;k++){const phi=(k+.5)/7*Math.PI,zz=zc+Math.cos(phi)*ar,yy=y0+Math.sin(phi)*rise,th=Math.atan2(-rise*Math.cos(phi),-ar*Math.sin(phi));
        parts.push(part('box',k===3?'stone':k%2?'stoneDark':'stone',[Bw+.04,.3,ar*Math.PI/7+.06],[0,yy-.15,zz],1,[th,0,0]));
        const fill=crown-(yy+.2);if(fill>.05)parts.push(part('box','stone',[Bw,fill,ar*Math.PI/7+.02],[0,yy+.2,zz],0));}
      parts.push(part('box','stone',[Bw,H-.3-crown,sl],[0,crown,zc],2),part('box','stoneDark',[Bw+.04,.04,.06],[0,H-.3,zc-sl/2],0));}
    for(const s of[-1,1])parts.push(part('box','stone',[.28,.62,Ld],[s*(Bw/2-.14),H,(dz0+dz1)/2],1),part('box','stoneDark',[.38,.1,Ld],[s*(Bw/2-.14),H+.62,(dz0+dz1)/2],0));
    for(const s of[-1,1])for(const e of[-1,1])parts.push(part('box','stone',[.46,.5,.46],[s*(Bw/2-.14),H+.62,e*(Ld/2-.1)],0),part('pyramid','stoneDark',[.5,.3,.5],[s*(Bw/2-.14),H+1.12,e*(Ld/2-.1)],0));
  }else{
    const bents=Math.max(2,Math.round(Ld/3)+1);
    for(let i=0;i<bents;i++){const z=dz0+.3+i*(Ld-.6)/(bents-1);
      for(const s of[-1,1])parts.push(part('cylinder','woodDark',[.32,H-.5,.28],[s*(Bw/2-.3),0,z],1,undefined,6));
      parts.push(part('box','woodEdge',[Bw,.15,.3],[0,H-.5,z],1));
      if(i<bents-1){const z2=dz0+.3+(i+1)*(Ld-.6)/(bents-1);for(const s of[-1,1])parts.push(beam('woodMid',[s*(Bw/2-.3),.08,z],[s*(Bw/2-.3),H-.5,z2],.06,0));}}
    for(const x of[-Bw/2+.3,0,Bw/2-.3])parts.push(part('box','woodDark',[.22,.21,Ld],[x,H-.35,(dz0+dz1)/2],1));
    parts.push(part('box','woodMid',[Bw,.14,Ld],[0,H-.14,(dz0+dz1)/2],2));
    for(let i=0;i<Math.round(Ld/.45);i++)parts.push(part('box','woodLight',[Bw+.04,.03,.36],[0,H,dz0+.22+i*(Ld-.44)/Math.round(Ld/.45)],0));
    const posts=Math.max(2,Math.round(Ld/1.5)+1);
    for(const s of[-1,1]){for(let i=0;i<posts;i++)parts.push(part('cylinder','woodDark',[.13,1,.11],[s*(Bw/2-.1),H,dz0+.1+i*(Ld-.2)/(posts-1)],1,undefined,5));
      parts.push(part('box','woodMid',[.09,.09,Ld],[s*(Bw/2-.1),H+.9,(dz0+dz1)/2],1),part('box','woodMid',[.07,.07,Ld],[s*(Bw/2-.1),H+.5,(dz0+dz1)/2],0));}
    for(const e of[-1,1]){parts.push(beam('woodDark',[Bw/2-.1,H,e*(Ld/2-.1)],[Bw/2-.1,H+1.9,e*(Ld/2-.1)],.14,1),part('box','fire',[.16,.22,.16],[Bw/2-.1,H+1.55,e*(Ld/2-.1)+.14*e],0));}
  }
  return {parts,entry:{x:0,z:Lc/2,width:Bw}};
};

/** Quarry: stepped benches cut into a rock face (Roman and medieval quarries): each bench shows jointed blocks with drill-and-wedge lines, a stone-and-timber crane with a
 * treadwheel and rope, a sledge with a dressed block, stacked cut stone, rubble kerb, a tool lean-to and water barrels. */
export const quarry:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,steps=pick(r,[3,4]),stepD=range(r,.75,.9),stepH=range(r,.55,.7);
  for(let i=0;i<steps;i++){const bw=w*(.92-i*.06),z=-d/2+stepD*(i+.5)+.1,h=stepH*(steps-i);
    parts.push(part('box',i%2?'stoneDark':'stone',[bw,h,stepD],[0,0,z],2));
    const blocks=Math.max(2,Math.round(bw/1.25));for(let b=1;b<blocks;b++)parts.push(part('box','recess',[.05,h*.9,.05],[-bw/2+b*bw/blocks,h*.05,z+stepD/2],0));
    for(let b=0;b<blocks;b++)for(let k=0;k<3;k++)parts.push(part('box','iron',[.06,.04,.04],[-bw/2+(b+.5)*bw/blocks+(k-1)*.12,h*.7,z+stepD/2+.01],0));
    parts.push(part('box','stoneDark',[bw,.06,.08],[0,h,z+stepD/2],0));}
  const frontZ=-d/2+stepD*steps+.1;
  for(let i=0;i<6;i++){const s=range(r,.4,.7);parts.push(part('box','stoneDark',[s,s*.7,s],[-w/2+.8+i*(w-1.6)/5,0,frontZ+.2+range(r,0,.4)],0,[0,range(r,0,1.5),0]));}
  // sledge on rollers with a dressed block
  parts.push(part('wedge','woodMid',[1.5,.5,2.2],[w/2-1.2,0,frontZ+.3],1,[0,Math.PI,0]));
  parts.push(part('box','stone',[.9,.6,1.2],[w/2-1.2,.52,frontZ+.9],1),part('box','stoneDark',[.92,.05,1.22],[w/2-1.2,.5,frontZ+.9],0));
  for(let i=0;i<3;i++)parts.push(part('cylinder','woodDark',[.2,1.1,.2],[w/2-1.2,.1,frontZ+.3+i*.7],0,[0,0,Math.PI/2],6));
  for(let i=0;i<3;i++)parts.push(part('box','stone',[.8,.38,.55],[w/2-2.4,i*.38,frontZ+1.7],1));
  if(ctx.era>=1){const cx=-w/2+1.1,cz2=frontZ+.1;
    for(const s of[-1,1])parts.push(beam('woodDark',[cx+s*.55,0,cz2+.2],[cx,2.6,cz2],.14,1));
    parts.push(part('box','woodDark',[1.5,.14,.14],[cx,2.6,cz2],1),part('cylinder','woodMid',[1.4,.3,1.4],[cx,.7,cz2+.02],1,[0,0,Math.PI/2],10));
    for(let i=0;i<8;i++){const a=i/8*TAU;parts.push(part('box','woodLight',[.32,.06,.08],[cx+Math.sin(a)*.0,.7+Math.cos(a)*.6,cz2+.02+Math.sin(a)*.6],0,[a,0,0]));}
    parts.push(beam('woodLight',[cx,2.6,cz2],[cx+1.4,2,cz2+.5],.08,0),beam('iron',[cx+1.4,2,cz2+.5],[cx+1.4,1.2,cz2+.5],.02,0),part('box','iron',[.18,.2,.1],[cx+1.4,1.0,cz2+.5],0));}
  {const hx=w/2-1.0,hz=-d/2+.9;void hx;void hz;}
  barrel(parts,-w/2+.5,0,d/2-.5,1);bucket(parts,-w/2+1.0,0,d/2-.5);
  return {parts,entry:{x:0,z:Math.min(d/2-.2,frontZ+1),width:2}};
};

/** Cairn: kerbed dry-stone mound with a passage and lintel (Maeshowe, Clava chambered cairns), built of rings of rotated stones narrowing to a capstone, a ring of kerb stones,
 * a standing stone and offering cloth strips; the later eras raise a memorial cross, then a stepped marker cairn with a tablet. */
export const cairn:Generator=(ctx,r)=>{
  const parts:P=[],R=Math.min(ctx.footprint.w,ctx.footprint.d)/2*range(r,.8,.88),layers=pick(r,[4,5]),lh=range(r,.34,.42);
  for(let i=0;i<layers;i++){const k=1-i*(.72/layers),dd=2*R*k;parts.push(part('cylinder',i%2?'stoneDark':'stone',[dd,lh,dd*.96],[0,i*lh,0],2,undefined,12));
    const n=Math.round(TAU*R*k/.6);for(let j=0;j<n;j++){const a=j/n*TAU+i*.4;if(i<2&&Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.5)continue;
      parts.push(part('box',(i+j)%3?'stone':'stoneDark',[range(r,.3,.46),lh*.9,range(r,.24,.34)],[Math.cos(a)*(R*k-.05),i*lh+lh*.45,Math.sin(a)*(R*k-.05)],0,[0,-a+range(r,-.3,.3),0]));}}
  const top=layers*lh,kerb=Math.round(TAU*R/.75);
  for(let i=0;i<kerb;i++){const a=i/kerb*TAU;if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.32)continue;parts.push(part('box','stoneDark',[.55,.45,.35],[Math.cos(a)*(R-.15),0,Math.sin(a)*(R-.15)],0,[0,-a-Math.PI/2,0]));}
  parts.push(part('cone','stone',[R*.5,.5,R*.5],[0,top,0],1,undefined,8));
  if(ctx.era<=2){parts.push(part('box','stoneDark',[.35,.9,.45],[-.5,0,R-.3],1),part('box','stoneDark',[.35,.9,.45],[.5,0,R-.3],1),part('box','stone',[1.5,.3,.6],[0,.9,R-.3],1),part('box','recess',[.65,.8,.1],[0,0,R-.05],0));}
  if(ctx.era>=4){// stepped marker cairn with a carved tablet
    parts.push(part('box','stoneDark',[1.1,.3,1.1],[0,top+.5,0],1),part('box','stone',[.78,.36,.78],[0,top+.8,0],1),part('box','stone',[.34,1.5,.34],[0,top+1.16,0],1),part('box','stoneDark',[.4,.12,.4],[0,top+2.66,0],0),part('box','cloth',[.04,.5,.28],[.2,top+1.8,0],0));}
  else if(ctx.era>=3){parts.push(part('box','stone',[.28,1.5,.28],[0,top+.4,0],1),part('box','stone',[.85,.26,.26],[0,top+1.1,0],1));}
  else parts.push(part('box','stone',[.55,range(r,.9,1.4),.35],[0,top+.45,0],1,[0,range(r,0,1),0]));
  for(let i=0;i<3;i++){const a=i*2.1+.3;parts.push(beam('woodLight',[Math.cos(a)*(R-.05),.4,Math.sin(a)*(R-.05)],[Math.cos(a)*(R-.05),1.2,Math.sin(a)*(R-.05)],.04,0),part('box',i%2?'clothRed':'cloth',[.05,.4,.2],[Math.cos(a)*(R-.05)+.1,.85,Math.sin(a)*(R-.05)],0));}
  return {parts,entry:{x:0,z:R,width:.9}};
};

/** Sacred grove: a ring of old trees (broadleaf, conifer or olive by climate) round a plain altar stone with an offering bowl and a small fire, carved boundary posts with cloth
 * ribbons at the entrance, charms hung from the boughs, a ring of waymark stones (Celtic nemeton, Germanic holy grove). Lollipop canopies. */
export const grove:Generator=(ctx,r)=>{
  const parts:P=[],half=Math.min(ctx.footprint.w,ctx.footprint.d)/2,n=pick(r,[6,7,8]),cr=range(r,.75,.9),ring=half-cr-.3,kind=ctx.climate==='cold'?'conifer':ctx.climate==='arid'?'olive':'broadleaf';
  for(let i=0;i<n;i++){const a=Math.PI/2+(i+.5)/n*TAU+range(r,-.12,.12);if(Math.sin(a)>.75&&Math.abs(Math.cos(a))<.55)continue;
    const x=Math.cos(a)*ring,z=Math.sin(a)*ring,th=range(r,1.3,2),rad=cr*range(r,.8,1);
    if(kind==='conifer'){parts.push(part('cylinder','trunk',[.3,th*.5,.22],[x,0,z],2,undefined,6),part('cone','foliageDark',[rad*2,th,rad*2],[x,th*.35,z],2,undefined,8),part('cone','foliage',[rad*1.4,th*.7,rad*1.4],[x,th*.9,z],1,undefined,8));}
    else{const t=kind==='olive'?th*.6:th;parts.push(part('cylinder','trunk',[.36,t,.26],[x,0,z],2,undefined,6),part('sphere',i%2?'foliageDark':'foliage',[rad*2,rad*1.5,rad*2],[x,t-.2,z],2));
      parts.push(beam('trunk',[x,t*.5,z],[x-Math.cos(a)*.5,t*.9,z-Math.sin(a)*.5],.1,0));}
    if(i%2===0)parts.push(beam('woodLight',[x*.78,1.5,z*.78],[x*.78,1.05,z*.78],.02,0),part('box',i%4?'clothRed':'cloth',[.05,.3,.12],[x*.78,.95,z*.78],0));}
  parts.push(part('box','stone',[1,.55,.65],[0,0,0],2),part('box','stoneDark',[1.2,.14,.8],[0,.55,0],1),part('cylinder','iron',[.4,.1,.4],[0,.69,0],0,undefined,6),part('box','fire',[.18,.2,.18],[0,.79,0],0));
  for(const s of[-1,1]){const x=s*.95,z=half-.35;parts.push(part('cylinder','woodDark',[.26,1.9,.22],[x,0,z],1,undefined,6),part('sphere','woodLight',[.34,.34,.3],[x,1.9,z],0),part('box','cloth',[.06,.6,.28],[x+s*.12,1.15,z],0),part('box','woodEdge',[.4,.06,.06],[x,1.45,z],0));}
  const stones=Math.round(TAU*(ring-cr*.6)/1.1);for(let i=0;i<stones;i++){const a=i/stones*TAU;if(Math.sin(a)>.7)continue;parts.push(part('box','stoneDark',[.3,.3+(i%3)*.1,.3],[Math.cos(a)*(ring-cr-.1),0,Math.sin(a)*(ring-cr-.1)],0,[0,a,0]));}
  return {parts,entry:{x:0,z:half-.3,width:1.7}};
};

/** Frontier cornerstone: a marker mast with banner on a stacked-stone base ring and an iron beacon basket (Roman limes signal posts, Hadrian's Wall turrets), a carved boundary
 * stone, a tripod hoist for the fire basket and a rubble apron. */
export const outpost:Generator=(ctx,r)=>{
  const parts:P=[],R=Math.min(ctx.footprint.w,ctx.footprint.d)/2*range(r,.62,.74),mast=range(r,4.2,5.2);
  parts.push(part('cylinder','stoneDark',[2*R,.4,2*R*.96],[0,0,0],2,undefined,10),part('cylinder','stone',[2*R*.72,.4,2*R*.7],[0,.4,0],2,undefined,10));
  for(let i=0;i<8;i++){const a=i/8*TAU;parts.push(part('box',i%2?'stone':'stoneDark',[.36,.3,.26],[Math.cos(a)*(R-.05),0,Math.sin(a)*(R-.05)],0,[0,-a-Math.PI/2,0]));}
  parts.push(part('cylinder','woodDark',[.3,mast,.24],[0,.8,0],2,undefined,6));
  for(const s of[-1,1])parts.push(beam('woodMid',[s*R*.8,.4,0],[s*.1,2.2,0],.12,1),beam('woodMid',[0,.4,s*R*.8],[0,2.2,s*.1],.12,1));
  parts.push(part('box','woodMid',[1.5,.12,.12],[0,.8+mast-.9,0],1),part('box',ctx.wealth>.5?'clothRed':'cloth',[1.1,.8,.05],[0,.8+mast-1.7,.1],1));
  parts.push(part('cone','iron',[.8,.45,.8],[0,.8+mast,0],1,undefined,8),part('cylinder','iron',[.7,.15,.7],[0,.8+mast,0],0,undefined,8),part('box','fire',[.3,.3,.3],[0,.8+mast+.15,0],0));
  parts.push(beam('woodLight',[.55,.8+mast-.9,0],[.55,.8+mast-.1,0],.03,0));
  if(ctx.era>=1)for(let i=0;i<4;i++){const a=i/4*TAU+.4;parts.push(beam('woodLight',[Math.cos(a)*R*.95,.4,Math.sin(a)*R*.95],[Math.cos(a)*R*.95,1.5,Math.sin(a)*R*.95],.1,0));}
  parts.push(part('box','stone',[.34,.9,.2],[R*.55,.4,R*.5],1,[0,.5,0]),part('box','recess',[.18,.4,.03],[R*.55+.05,.8,R*.5+.07],0,[0,.5,0]));
  return {parts,entry:{x:0,z:R,width:1}};
};
void far;void woodpile;
