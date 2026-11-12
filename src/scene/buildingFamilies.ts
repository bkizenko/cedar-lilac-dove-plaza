/** Procedural building families for the Option H carved style. Pure
 * TypeScript: each family turns a seeded context into structural parts
 * (buildingParts.ts). Every family has a real-world functional reference and
 * silhouette; variation is structural (bays, roof pitch, storeys, additions,
 * door position, chimneys, wheel side) driven by era, material, climate and
 * wealth, not a recolour of one hut. Bases never exceed the footprint:
 * fitToFootprint is the final guarantee, generators aim at ~85-92% of it. */
import {beam,chance,far,fitToFootprint,part,pick,range,seededRandom,type BuildingSpec,type Part,type Rng} from './buildingParts';
import type {CarvedMaterialId} from './carvedPalette';

import {partBounds,partsAtLod,floatingParts} from './buildingParts';
import {door,windowAt,gableRoof,roofPitch,roofMaterial,wallMaterial,maxStoreys,type FamilyContext,type Generator,type FamilyId,type CoreFamilyId} from './buildingHelpers';
export {roofPitch,roofMaterial,maxStoreys,NEUTRAL_TRADITION} from './buildingHelpers';
export type {BuildMaterial,Climate,Trade,WallAxis,Tradition,FamilyContext,FamilyId,CoreFamilyId,ExtraFamilyId} from './buildingHelpers';

/** Prehistoric/Iron Age roundhouse (e.g. Butser/Castell Henllys reconstructions):
 * wattle-and-daub drum, steep conical thatch, porch, sometimes a store lean-to. */
const roundhouse:Generator=(ctx,r)=>{
 const parts:Part[]=[],R=Math.min(ctx.footprint.w,ctx.footprint.d)/2*range(r,.6,.74),wallH=range(r,1.2,1.75),ov=range(r,.18,.32);
 const pitch=roofPitch(ctx,r),roofH=(R+ov)*Math.tan(pitch);
 parts.push(part('cylinder',ctx.material==='wattle'?'plaster':wallMaterial(ctx),[2*R,wallH,2*R*.98],[0,0,0],2,undefined,12));
 parts.push(part('cone','thatch',[2*(R+ov),roofH,2*(R+ov)],[0,wallH-.12,0],2,undefined,12));
 // Woven wattle courses show as dark bands only near the camera.
 for(const y of[.35,.8])parts.push(part('cylinder','woodDark',[2*R+.03,.07,2*R+.03],[0,y,0],0,undefined,12));
 const porch=chance(r,.55+ctx.wealth*.3+(ctx.tradition?.porchBias??0));
 if(porch){const pw=range(r,.9,1.2),pd=range(r,.55,.8),z0=R-.1;for(const sx of[-1,1])parts.push(beam('woodDark',[sx*pw/2,0,z0+pd],[sx*pw/2,wallH*.95,z0+pd],.12,1));
  parts.push(part('prism','thatch',[pw+.4,.45,pd+.25],[0,wallH*.92,z0+pd/2],1));}
 door(parts,0,R-.02,.8,Math.min(1.5,wallH*.92));
 if(chance(r,.35+ctx.wealth*.2+(ctx.tradition?.annexBias??0))){const lx=-R*.9,lw=range(r,.7,1),ld=range(r,1.2,1.8);parts.push(part('box','woodMid',[lw,wallH*.7,ld],[lx-lw/2+.2,0,-R*.2],2),part('wedge','thatch',[ld+.2,.5,lw+.25],[lx-lw/2+.2,wallH*.7,-R*.2],1,[0,-Math.PI/2,0]));}
 if(chance(r,.5))parts.push(part('cone','thatch',[.5,.35,.5],[0,wallH-.12+roofH*.84,0],0,undefined,6));
 return {parts,entry:{x:0,z:R,width:.8}};
};

/** Gabled cottage / timber-framed house (English cruck and box-frame cottages,
 * Germanic Fachwerk): bays, side door, chimney, optional lean-to and upper floor. */
const cottage:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,large=ctx.scale==='large';
 const prop=ctx.tradition?.proportion??1,L=Math.min(w*.84,w*range(r,large?.66:.58,large?.8:.72)*prop),D=Math.min(d*.7,d*range(r,.46,.6)/prop),bays=Math.max(2,Math.min(4,Math.round(L/range(r,1.5,2.1))));
 const storeys=Math.min(maxStoreys(ctx.material,ctx.era),ctx.era>=3&&ctx.wealth>.62?2:1),wallH=range(r,1.75,2.25),eave=wallH*storeys;
 const wm=wallMaterial(ctx),cz=range(r,-.3,.05)*d*.2,pitch=roofPitch(ctx,r);
 if(ctx.material==='stone'||ctx.era>=2)parts.push(part('box','stoneDark',[L+.12,.25,D+.12],[0,0,cz],1));
 parts.push(part('box',wm,[L,eave,D],[0,0,cz],2));
 if(storeys>1&&ctx.material==='timber')parts.push(part('box','woodDark',[L+.1,.14,D+.1],[0,wallH,cz],1)); // jetty beam
 // Timber framing at bay lines (box frame); stone houses show quoins instead.
 const bayW=L/bays;
 for(let i=0;i<=bays;i++){const x=-L/2+i*bayW;for(const s of[-1,1])parts.push(part('box',ctx.material==='stone'?'stoneDark':'woodDark',[.13,eave,.06],[x,0,cz+s*(D/2+.02)],ctx.material==='stone'&&i>0&&i<bays?0:1));}
 const doorBay=Math.floor(r()*bays),doorX=-L/2+(doorBay+.5)*bayW;door(parts,doorX,cz+D/2+.03);
 for(let i=0;i<bays;i++){if(i===doorBay)continue;windowAt(parts,-L/2+(i+.5)*bayW,1,cz+D/2+.04,'z');if(storeys>1)windowAt(parts,-L/2+(i+.5)*bayW,wallH+.9,cz+D/2+.04,'z');}
 for(let i=0;i<bays;i++)if(chance(r,.5))windowAt(parts,-L/2+(i+.5)*bayW,1,cz-D/2-.04,'z');
 const rise=gableRoof(parts,ctx,D,L,eave,pitch,0,cz,'x',range(r,.16,.3));
 if(ctx.era>=1&&ctx.climate!=='arid'||chance(r,.3)){const end=pick(r,[-1,1]),onRidge=chance(r,.35),cw=range(r,.45,.65);
  const cx=onRidge?range(r,-L/4,L/4):end*(L/2-cw/2-.05);parts.push(part('box',ctx.era>=1?'stone':'plaster',[cw,eave+rise+.55,cw],[cx,0,cz],2));}
 if(chance(r,.25+ctx.wealth*.45+(ctx.tradition?.annexBias??0))){const side=pick(r,[-1,1]),room=(w/2-L/2)-.15;
  if(room>.6){const lw=Math.min(room,range(r,.9,1.5)),ld=D*range(r,.55,.85),lx=side*(L/2+lw/2);parts.push(part('box',wm,[lw,wallH*.72,ld],[lx,0,cz-(D-ld)/2],2),part('wedge',roofMaterial(ctx),[ld+.2,.55,lw+.15],[lx,wallH*.72,cz-(D-ld)/2],1,[0,side>0?Math.PI/2:-Math.PI/2,0]));}
  else{const ld=Math.min(d/2+cz-D/2-.15,range(r,.8,1.2)),back=cz-D/2-ld/2;if(ld>.5)parts.push(part('box',wm,[L*.55,wallH*.7,ld],[0,0,back],2),part('wedge',roofMaterial(ctx),[L*.55+.2,.5,ld+.15],[0,wallH*.7,back],1,[0,Math.PI,0]));}}
 if(chance(r,.4))parts.push(part('box','woodMid',[.9,.45,.5],[doorX+(doorX>0?-1:1)*.9,0,cz+D/2+.35],0)); // bench by the door
 return {parts,entry:{x:doorX,z:cz+D/2,width:.85}};
};

/** Norse/Saxon longhouse and early halls (Lofotr, West Stow): long low walls,
 * steep roof nearly to the ground with hipped ends, side doors. */
const longhouse:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,large=ctx.scale==='large',L=w*range(r,.78,.88),D=d*range(r,large?.5:.42,large?.62:.52);
 const wallH=range(r,1.1,1.6)*(large?1.25:1),pitch=roofPitch(ctx,r)+.06,hip=range(r,.6,1.1),wm=ctx.material==='stone'?'stone':'woodMid';
 // Bowed walls: the longhouse is wider amidships than at the ends.
 parts.push(part('box',wm,[L,wallH,D],[0,0,0],2),part('box',wm,[L*.62,wallH,D+.24],[0,0,0],1));
 const rise=D/2*Math.tan(pitch),ridge=L-2*hip;
 // One true hipped roof: sloped ends come down nearly as low as the eaves.
 parts.push({...part('hip',roofMaterial(ctx),[D+.6,rise,L+.6],[0,wallH,0],2,[0,Math.PI/2,0]),inset:hip+.3});
 parts.push(part('box','woodEdge',[ridge,.14,.16],[0,wallH+rise-.05,0],1));
 const doors=large?2:pick(r,[1,2]);const dx=doors===1?range(r,-L/4,L/4):L*.28;
 for(let i=0;i<doors;i++){const x=doors===1?dx:(i?dx:-dx);door(parts,x,D/2+.15,.9,Math.min(1.5,wallH));parts.push(part('prism',roofMaterial(ctx),[1.2,.4,.7],[x,wallH*.9,D/2+.15],1));}
 if(large){const pz=D/2+.3,pd=Math.min(d/2-pz-.2,range(r,1,1.6));if(pd>.5){const posts=pick(r,[3,4,5,6]);for(let i=0;i<posts;i++){const x=-L*.38+i*L*.76/(posts-1);parts.push(beam('woodDark',[x,0,pz+pd],[x,wallH*.95,pz+pd],.16,1));}
  parts.push(part('wedge',roofMaterial(ctx),[L*.8,.45,pd+.1],[0,wallH*.95,pz+pd/2],1));}
  // Crossed gable finials (assembly-hall signature).
  for(const s of[-1,1])parts.push(beam('woodEdge',[s*(ridge/2),wallH+rise-.1,-.25],[s*(ridge/2),wallH+rise+.55,.25],.09,0),beam('woodEdge',[s*(ridge/2),wallH+rise-.1,.25],[s*(ridge/2),wallH+rise+.55,-.25],.09,0));}
 for(let i=0,n=pick(r,[1,2]);i<n;i++)parts.push(part('box','woodEdge',[.5,.25,.5],[n===1?range(r,-L/5,L/5):(i?1:-1)*L*.2,wallH+rise-.15,0],0)); // smoke louvers
 return {parts,entry:{x:doors===1?dx:-dx,z:D/2,width:.9}};
};

/** Staddle-stone granary (English staddle barns, Iberian hórreo): body raised
 * on mushroom stones against damp and rodents, ladder, thatch or shingle. */
const granary:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,round=ctx.era<=1&&chance(r,.4),nx=pick(r,[2,3]),nz=pick(r,[2,3]);
 const BW=w*range(r,.5,.66),BD=d*range(r,.46,.62),lift=range(r,.55,.75),bodyH=range(r,1.3,1.9);
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=-BW/2+.2+i*(BW-.4)/(nx-1),z=-BD/2+.2+j*(BD-.4)/(nz-1);
  parts.push(part('cylinder','stone',[.42,lift-.1,.2],[x,0,z],2,undefined,6),part('cylinder','stone',[.58,.1,.58],[x,lift-.1,z],1,undefined,8));}
 parts.push(part('box','woodDark',[BW+.15,.14,BD+.15],[0,lift,0],2));
 const top=lift+.14;
 if(round){const R=Math.min(BW,BD)/2;parts.push(part('cylinder','woodMid',[2*R,bodyH,2*R],[0,top,0],2,undefined,10),part('cone','thatch',[2*R+.5,R*1.2,2*R+.5],[0,top+bodyH-.05,0],2,undefined,10));}
 else{parts.push(part('box','woodMid',[BW,bodyH,BD],[0,top,0],2));
  for(let i=1;i<6;i++)parts.push(part('box','woodDark',[.05,bodyH,.04],[-BW/2+i*BW/6,top,BD/2+.02],0));
  gableRoof(parts,ctx,BD,BW,top+bodyH,roofPitch(ctx,r),0,0,'x',.2);}
 // Ladder to the door (removable in reality, so it never touches the stones).
 const lz=BD/2+.55;parts.push(beam('woodDark',[-.25,0,lz],[-.25,top+.9,BD/2+.05],.07,0),beam('woodDark',[.25,0,lz],[.25,top+.9,BD/2+.05],.07,0));
 door(parts,0,BD/2+.02,.6,.9);parts[parts.length-1]={...parts[parts.length-1],pos:[0,top,BD/2+.02]};
 return {parts,entry:{x:0,z:BD/2+.5,width:.6}};
};

/** Later storehouse (medieval tithe barn/warehouse): masonry ground floor,
 * timber upper, wide cart door and hoist beam. */
const storehouse:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,L=w*range(r,.7,.84),D=d*range(r,.55,.7),h1=range(r,2,2.6),h2=chance(r,.5+ctx.wealth*.3)?range(r,1.4,1.9):0;
 parts.push(part('box','stone',[L,h1,D],[0,0,0],2));if(h2)parts.push(part('box','woodMid',[L,h2,D],[0,h1,0],2),part('box','woodDark',[L+.1,.14,D+.1],[0,h1,0],1));
 const eave=h1+h2;gableRoof(parts,ctx,L,D,eave,roofPitch(ctx,r),0,0,'z',.22);
 const dw=range(r,1.6,2.2);door(parts,0,D/2+.03,dw,Math.min(2.1,h1-.15));
 if(h2){parts.push(part('box','woodEdge',[.8,.9,.06],[0,h1+.3,D/2+.03],0),beam('woodDark',[0,eave-.05,D/2-.3],[0,eave-.05,D/2+.45],.14,0));}
 for(const x of[-L/2,L/2])for(const z of[-D/2,D/2])parts.push(part('box','stoneDark',[.3,h1,.3],[x*(1-.3/L),0,z*(1-.3/D)],0));
 if(h2)for(let i=0,n=pick(r,[1,2,3]);i<n;i++)windowAt(parts,-L/2+(i+.5)*L/n,h1+h2*.5,-D/2-.03,'z');
 // Open cart shed against one side wall when the plot leaves room.
 const room=w/2-L/2-.15;if(room>.5&&chance(r,.6)){const side=pick(r,[-1,1]),sw=Math.min(room,1.1),sx=side*(L/2+sw/2);
  for(const z of[-D/2+.2,D/2-.2])parts.push(beam('woodDark',[sx+side*(sw/2-.08),0,z],[sx+side*(sw/2-.08),h1*.65,z],.1,1));
  parts.push(part('wedge',roofMaterial(ctx),[D,.45,sw+.1],[sx,h1*.65,0],2,[0,side>0?Math.PI/2:-Math.PI/2,0]));}
 return {parts,entry:{x:0,z:D/2,width:dw}};
};

/** Vertical undershot watermill (Roman/medieval mills, e.g. Barbegal/Domesday
 * mills): mill house with the wheel on the water side and a feed flume. Built
 * with the wheel on +X, then rotated to ctx.waterSide by the caller. */
const watermill:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,wheelD=Math.min(d*.72,range(r,1.5,2)),wheelT=range(r,.2,.3);
 const HW=w-wheelT-.55,HD=d*range(r,.6,.75),hx=-(w/2)+HW/2+.05,lower=range(r,.8,1.1),upper=range(r,.9,1.3);
 parts.push(part('box','stone',[HW,lower,HD],[hx,0,0],2),part('box',ctx.material==='stone'?'stone':'woodMid',[HW,upper,HD],[hx,lower,0],2));
 gableRoof(parts,ctx,HD,HW,lower+upper,roofPitch(ctx,r),hx,0,'x',.14);
 const wx=hx+HW/2+wheelT/2+.1;
 // Wheel: rim + hub as cylinders turned onto the X axis; paddles near and mid.
 parts.push(part('cylinder','woodDark',[wheelD,wheelT,wheelD],[wx-wheelT/2,wheelD/2,0],2,[0,0,-Math.PI/2],12));
 parts.push(part('cylinder','woodEdge',[.22,HW*.35+wheelT,.22],[hx+HW/2-.2,wheelD/2,0],1,[0,0,-Math.PI/2],6));
 const paddles=pick(r,[8,10,12]);
 for(let i=0;i<paddles;i++){const a=i/paddles*Math.PI*2,py=wheelD/2+Math.sin(a)*(wheelD/2-.05),pz=Math.cos(a)*(wheelD/2-.05);
  /* the lowest paddles dip into the race, below the modelled ground */if(py-.32<0)continue;parts.push(part('box','woodMid',[wheelT+.06,.24,.05],[wx,py-.12,pz],1,[a,0,0]));}
 // Flume (leat) feeding the wheel from upstream (-Z), with water in it near the camera.
 const fl=d/2-.1;parts.push(part('box','woodMid',[wheelT+.2,.18,fl],[wx,wheelD*.55,-fl/2],1),part('box','water',[wheelT+.05,.05,fl],[wx,wheelD*.55+.13,-fl/2],0));
 parts.push(beam('woodDark',[wx,0,-fl+.15],[wx,wheelD*.55,-fl+.15],.12,1));
 door(parts,hx-HW*.2,HD/2+.03,.75,Math.min(1.5,lower+upper-.2));
 return {parts,entry:{x:hx-HW*.2,z:HD/2,width:.75}};
};

/** Quern shelter (saddle/rotary quern under a lean-to) when no water is beside the site. */
const quernShelter:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,W=w*range(r,.66,.8),D=d*range(r,.5,.66),h=range(r,1.7,2.1);
 for(const x of[-W/2+.1,W/2-.1])for(const z of[-D/2+.1,D/2-.1])parts.push(beam('woodDark',[x,0,z],[x,z<0?h:h-.5,z],.12,2));
 parts.push(part('wedge',roofMaterial(ctx),[W+.25,.55,D+.25],[0,h-.55,0],2));
 parts.push(part('box','stoneDark',[.8,.4,.8],[0,0,0],2),part('cylinder','stone',[.7,.16,.7],[0,.4,0],1,undefined,10),part('cylinder','stone',[.66,.14,.66],[0,.56,0],1,undefined,10),beam('woodEdge',[.22,.7,0],[.22,1.05,0],.05,0));
 return {parts};
};

/** Open-bay craft shelter (medieval workshop fronts, Roman tabernae): back wall,
 * open front, awning, with a trade-specific fixture that shows its function. */
const workshop:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,trade=ctx.trade??'bench',W=w*range(r,.7,.84),D=d*range(r,.55,.68),h=range(r,2.1,2.6);
 const closed=trade==='smoke',stone=trade==='forge'||trade==='oven'||ctx.material==='stone',wm=stone?'stone':wallMaterial(ctx),z0=-d/2+D/2+.15;
 parts.push(part('box',wm,[W,h,.2],[0,0,z0-D/2+.1],2));
 for(const s of[-1,1])parts.push(part('box',wm,[.18,closed?h:h*.55,D*(closed?1:.55)],[s*(W/2-.09),0,z0-D*(closed?0:.225)],2));
 if(closed)parts.push(part('box',wm,[W,h,.2],[0,0,z0+D/2-.1],2));
 for(const s of[-1,1])parts.push(beam('woodDark',[s*(W/2-.1),0,z0+D/2-.08],[s*(W/2-.1),h,z0+D/2-.08],.15,closed?0:2));
 if(!closed&&W>3.2)parts.push(beam('woodDark',[0,0,z0+D/2-.08],[0,h,z0+D/2-.08],.13,1));
 const pitch=roofPitch(ctx,r);
 if(chance(r,.5)||closed)gableRoof(parts,ctx,D,W,h,pitch,0,z0,'x',.2);
 else parts.push(part('wedge',roofMaterial(ctx),[W+.35,Math.max(.5,D*Math.tan(pitch)*.45),D+.35],[0,h,z0],2));
 // Front awning: cloth or boards over the work apron.
 const apron=Math.min(d/2-(z0+D/2)-.12,range(r,.8,1.3));
 if(apron>.4&&!closed){parts.push(part('wedge',chance(r,.5)?'cloth':'woodLight',[W*.8,.35,apron],[0,h-.45,z0+D/2+apron/2],1));
  for(const s of[-1,1])parts.push(beam('woodDark',[s*W*.38,0,z0+D/2+apron-.08],[s*W*.38,h-.45,z0+D/2+apron-.08],.08,0));}
 const fz=z0-D*.1;
 switch(trade){
  case 'forge':{parts.push(part('box','stoneDark',[1.1,.8,.9],[-W*.22,0,fz],2),part('box','stone',[.6,h+1.4,.6],[-W*.22,0,z0-D/2+.4],2),part('box','fire',[.5,.12,.4],[-W*.22,.8,fz],0),part('box','iron',[.45,.3,.22],[W*.2,.55,fz+.3],0),part('cylinder','woodDark',[.45,.55,.45],[W*.2,0,fz+.3],0,undefined,8),part('box','woodEdge',[.6,.3,.4],[-W*.22-.75,.4,fz],0));break;}
  case 'kiln':{const kx=W*.18;parts.push(part('cylinder','plaster',[1.5,1,1.5],[kx,0,fz],2,undefined,10),part('sphere','plaster',[1.5,.9,1.5],[kx,.85,fz],2),part('box','woodEdge',[.45,.4,.06],[kx,0,fz+.74],1),part('box','fire',[.3,.15,.05],[kx,.05,fz+.77],0));break;}
  case 'pottery':{parts.push(part('cylinder','woodDark',[.55,.5,.55],[-W*.2,0,fz],1,undefined,10),part('cylinder','woodMid',[.6,.06,.6],[-W*.2,.5,fz],0,undefined,10),part('box','woodMid',[1.4,.08,.45],[W*.2,.8,z0-D/2+.4],1),beam('woodDark',[W*.2-.6,0,z0-D/2+.4],[W*.2-.6,.8,z0-D/2+.4],.06,0),beam('woodDark',[W*.2+.6,0,z0-D/2+.4],[W*.2+.6,.8,z0-D/2+.4],.06,0));break;}
  case 'loom':{const lx=range(r,-W*.2,W*.2);parts.push(beam('woodDark',[lx-.6,0,fz],[lx-.6,1.8,fz-.25],.09,1),beam('woodDark',[lx+.6,0,fz],[lx+.6,1.8,fz-.25],.09,1),part('box','woodDark',[1.35,.08,.08],[lx,1.75,fz-.24],1),part('box','cloth',[1.1,1.2,.03],[lx,.45,fz-.12],0,[-.14,0,0]));break;}
  case 'rack':{for(let i=0;i<pick(r,[2,3]);i++){const x=-W*.3+i*W*.3;parts.push(beam('woodDark',[x-.5,0,fz],[x-.5,1.6,fz],.07,1),beam('woodDark',[x+.5,0,fz],[x+.5,1.6,fz],.07,1),part('box','woodDark',[1.1,.07,.07],[x,1.55,fz],1),part('box','cloth',[.8,.9,.03],[x,.62,fz],0));}break;}
  case 'saw':{parts.push(beam('woodDark',[-.5,0,fz-.3],[-.5,.85,fz],.09,1),beam('woodDark',[-.5,0,fz+.3],[-.5,.85,fz],.09,1),beam('woodDark',[.5,0,fz-.3],[.5,.85,fz],.09,1),beam('woodDark',[.5,0,fz+.3],[.5,.85,fz],.09,1),part('box','woodDark',[1.2,.1,.1],[0,.8,fz],1),part('cylinder','woodEdge',[.6,.5,.6],[W*.3,0,fz+.4],0,undefined,8));break;}
  case 'smoke':{parts.push(part('box','woodEdge',[.5,.35,.5],[0,h+D/2*Math.tan(pitch)-.05,z0],1),part('box','woodEdge',[.8,1.6,.06],[0,0,z0+D/2+.02],1));break;}
  case 'oven':{parts.push(part('box','stoneDark',[1.6,.6,1.4],[0,0,fz],2),part('sphere','plaster',[1.4,.9,1.2],[0,.6,fz],2),part('box','woodEdge',[.45,.35,.06],[0,.62,fz+.6],1));break;}
  default:{parts.push(part('box','woodMid',[1.5,.1,.6],[-W*.2,.8,fz],1),part('box','woodMid',[1.2,.1,.6],[W*.22,.8,fz],1));for(const x of[-W*.2-.6,-W*.2+.6,W*.22-.45,W*.22+.45])parts.push(beam('woodDark',[x,0,fz],[x,.8,fz],.07,0));parts.push(part('cylinder','woodEdge',[.5,.55,.5],[0,0,z0+D/2+.3],0,undefined,8));}
 }
 return {parts,entry:{x:0,z:z0+D/2,width:W*.6}};
};

/** Timber palisade (Iron Age/Slavic gorod stockades): staggered sharpened stakes
 * with a rail, along the wall axis; corners form a ring. */
const palisade:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,axis=ctx.wallAxis??'x',h=range(r,2.4,3.1);
 const stake=(x:number,z:number)=>{const sh=h*range(r,.9,1.08),rad=range(r,.24,.32);parts.push(part('cylinder','woodMid',[rad,sh,rad*.9],[x,0,z],1,undefined,6),part('cone','woodLight',[rad*.9,.4,rad*.9],[x,sh,z],0,undefined,6));};
 if(axis==='corner'){for(let i=0;i<10;i++){const a=i/10*Math.PI*2;stake(Math.cos(a)*(w/2-.4),Math.sin(a)*(d/2-.4));}parts.push(far(part('cylinder','woodMid',[w-.6,h,d-.6],[0,0,0],2,undefined,8)));return {parts};}
 const len=axis==='x'?w:d,n=Math.round(len/.36);
 for(let i=0;i<n;i++){const t=-len/2+.18+i*(len-.36)/(n-1),off=(i%2?.08:-.08);axis==='x'?stake(t,off):stake(off,t);}
 for(const y of[.9,h*.72])parts.push(part('box','woodDark',axis==='x'?[len-.2,.12,.12]:[.12,.12,len-.2],axis==='x'?[0,y,-.25]:[-.25,y,0],1));
 // Far impostor: one plank wall replaces the stakes beyond the mid LOD distance.
 parts.push(far(part('box','woodMid',axis==='x'?[len-.2,h,.3]:[.3,h,len-.2],[0,0,0],2)));
 // Earth bank at the foot of the stakes (rampart), never wider than the cell.
 parts.push(part('box','woodDark',axis==='x'?[len-.1,.3,1.2]:[1.2,.3,len-.1],[0,0,0],0));
 return {parts};
};

/** Timber gatehouse: two stout posts or towers, a lintel walkway, plank leaves. */
const gate:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w}=ctx.footprint,towers=ctx.era>=1&&chance(r,.5+ctx.wealth*.3),h=range(r,3,3.6),open=range(r,1.8,2.2);
 for(const s of[-1,1]){const x=s*(open/2+.35);
  if(towers){parts.push(part('box','woodMid',[.75,h+1.2,.9],[x,0,0],2),part('pyramid',roofMaterial(ctx),[1.05,.9,1.2],[x,h+1.2,0],2));}
  else parts.push(part('cylinder','woodDark',[.5,h+.3,.45],[x,0,0],2,undefined,8));
  // Flanking palisade stubs to the cell edge.
  const stub=w/2-(open/2+.75);if(stub>.2)parts.push(part('box','woodMid',[stub,h*.85,.3],[s*(open/2+.75+stub/2),0,0],2));}
 parts.push(part('box','woodDark',[open+1.1,.3,.9],[0,h-.3,0],2),part('box','woodMid',[open+1.3,.6,.12],[0,h,.42],1));
 for(const s of[-1,1])parts.push(part('box','woodMid',[open/2-.05,h-.5,.1],[s*open/4,0,-.1],1));
 return {parts,entry:{x:0,z:.5,width:open}};
};

/** Watch/bell tower: splayed four-post timber tower with platform and pyramid
 * cap (early), or tapering masonry tower with crenels (stone, era 2+). */
const tower:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,base=Math.min(w,d)*range(r,.62,.78),h=range(r,5.5,8);
 if(ctx.material==='stone'&&ctx.era>=2){const top=base*range(r,.78,.9);parts.push(part('box','stone',[base,h*.5,base],[0,0,0],2),part('box','stone',[top,h*.5,top],[0,h*.5,0],2));
  // Either a crenellated fighting top with a small turret cap, or a tall pyramid roof (bell/watch).
  const crenel=chance(r,.5),cap=top*(crenel?range(r,.35,.55):range(r,.8,1.25));
  if(crenel)for(let i=0;i<4;i++)for(const s of[-1,1])parts.push(part('box','stone',i<2?[.4,.45,.3]:[.3,.45,.4],i<2?[s*top*.3,h,(i?1:-1)*(top/2-.15)]:[(i===2?1:-1)*(top/2-.15),h,s*top*.3],0));
  parts.push(part('pyramid',roofMaterial(ctx),crenel?[top*.45,cap,top*.45]:[top*1.08,cap,top*1.08],[0,h,0],2));
  windowAt(parts,0,h*.35,base/2+.02,'z');windowAt(parts,0,h*.75,top/2+.02,'z');door(parts,0,base/2+.03,.8,1.7);return {parts,entry:{x:0,z:base/2,width:.8}};}
 const top=base*range(r,.55,.7),plat=h*range(r,.72,.8);
 for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('woodDark',[sx*base/2,0,sz*base/2],[sx*top/2,plat,sz*top/2],.18,2));
 for(const y of[plat*.33,plat*.66]){const k=y/plat,half=base/2+(top/2-base/2)*k;parts.push(part('box','woodMid',[2*half,.1,.1],[0,y,half],1),part('box','woodMid',[2*half,.1,.1],[0,y,-half],1),part('box','woodMid',[.1,.1,2*half],[half,y,0],1),part('box','woodMid',[.1,.1,2*half],[-half,y,0],1));}
 parts.push(part('box','woodMid',[top+.5,.18,top+.5],[0,plat,0],2));
 for(const s of[-1,1])parts.push(part('box','woodLight',[top+.5,.55,.06],[0,plat+.18,s*(top/2+.22)],0),part('box','woodLight',[.06,.55,top+.5],[s*(top/2+.22),plat+.18,0],0));
 const capH=h-plat;for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('woodDark',[sx*top/2,plat+.18,sz*top/2],[sx*top/2,plat+capH*.55,sz*top/2],.1,1));
 parts.push(part('pyramid',roofMaterial(ctx),[top+.7,capH*.7,top+.7],[0,plat+capH*.55,0],2));
 if(chance(r,.4))parts.push(part('sphere','iron',[.35,.4,.35],[0,plat+capH*.55-.45,0],0)); // alarm bell
 parts.push(beam('woodLight',[.2,0,base/2-.05],[.2,plat,top/2],.07,0),beam('woodLight',[-.2,0,base/2-.05],[-.2,plat,top/2],.07,0));
 return {parts};
};

/** Bell-tower church / temple: nave, square bell tower with pyramid spire,
 * optional apse (Romanesque parish churches); early eras get a timber shrine
 * hall with a bell frame. */
const church:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,stone=ctx.era>=2;
 const NW=w*range(r,.4,.5),towerW=Math.min(w*.3,range(r,1.7,2.3)),apse=stone&&chance(r,.6),apseD=apse?NW*.5:0;
 const ND=d*range(r,.6,.72)-apseD,towerSide=pick(r,['front','corner'] as const),wallH=range(r,2.6,3.4),pitch=roofPitch(ctx,r)+.05;
 const wm=stone?(ctx.material==='timber'?'plaster':'stone'):'woodMid';
 const towerFront=towerSide==='front',frontZ=d/2-.15-(towerFront?towerW:0),nz=frontZ-ND/2;
 parts.push(part('box',wm,[NW,wallH,ND],[0,0,nz],2));
 gableRoof(parts,ctx,NW,ND,wallH,pitch,0,nz,'z',.2,stone?roofMaterial(ctx):'thatch');
 if(apse)parts.push(part('cylinder',wm,[NW*.9,wallH*.85,NW*.9],[0,0,nz-ND/2],2,undefined,10),part('cone',roofMaterial(ctx),[NW,NW*.35,NW],[0,wallH*.85,nz-ND/2],1,undefined,10));
 for(let i=0;i<pick(r,[3,4]);i++){const z=nz-ND/2+(i+.5)*ND/4;windowAt(parts,NW/2+.03,wallH*.6,z,'x');windowAt(parts,-NW/2-.03,wallH*.6,z,'x');if(stone)for(const s of[-1,1])parts.push(part('box',wm,[.3,wallH*.7,.4],[s*(NW/2+.15),0,z+ND/8],0));}
 if(stone){const th=wallH+range(r,2.8,4.2),tx=towerFront?0:NW/2+towerW/2-.05,tz=towerFront?frontZ+towerW/2:frontZ-towerW/2;
  parts.push(part('box',wm,[towerW,th,towerW],[tx,0,tz],2));
  for(const [fx,fz] of[[0,1],[0,-1],[1,0],[-1,0]])parts.push(part('box','woodEdge',fx?[.06,.7,.45]:[.45,.7,.06],[tx+fx*(towerW/2+.02),th-1.1,tz+fz*(towerW/2+.02)],0));
  parts.push(part('pyramid',roofMaterial(ctx),[towerW*1.1,range(r,1.6,2.6),towerW*1.1],[tx,th,tz],2));
  door(parts,towerFront?0:0,towerFront?tz+towerW/2+.03:frontZ+.03,1,2);return {parts,entry:{x:0,z:towerFront?tz+towerW/2:frontZ,width:1}};}
 // Timber shrine: porch gable and a freestanding bell frame.
 const pz=frontZ,pd=Math.min(1.2,d/2-pz-.1);for(const s of[-1,1])parts.push(beam('woodDark',[s*NW*.35,0,pz+pd-.1],[s*NW*.35,wallH*.9,pz+pd-.1],.16,1));
 parts.push(part('prism','thatch',[NW*.85,.8,pd+.1],[0,wallH*.9,pz+pd/2-.05],1));door(parts,0,frontZ+.03,1,1.9);
 const bx=NW/2+(w/2-NW/2)/2;if(w/2-NW/2>1){parts.push(beam('woodDark',[bx,0,-.5],[bx,3.6,-.5],.16,2),beam('woodDark',[bx,0,.5],[bx,3.6,.5],.16,2),part('box','woodDark',[.2,.2,1.25],[bx,3.5,0],1),part('sphere','iron',[.45,.5,.45],[bx,3.05,0],0));}
 return {parts,entry:{x:0,z:frontZ,width:1}};
};

/** Market square stalls (medieval market booths, agora stoa stalls): empty
 * counters under awnings around an open centre; a well or market cross. No
 * decorative free goods. */
const marketStalls:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,count=pick(r,[3,4,5,6]),sw=range(r,1.4,1.8),sd=range(r,.9,1.2),h=range(r,1.9,2.2);
 const slots:[number,number,number][]=[[0,-d/2+sd/2+.2,0],[-w/2+sd/2+.2,0,Math.PI/2],[w/2-sd/2-.2,0,-Math.PI/2],[-w*.26,-d/2+sd/2+.2,0],[w*.26,-d/2+sd/2+.2,0],[-w/2+sd/2+.2,d*.28,Math.PI/2]];
 for(let i=0;i<count;i++){const [x,z,yaw]=slots[i],c=Math.cos(yaw),s=Math.sin(yaw),at=(lx:number,lz:number):[number,number,number]=>[x+lx*c+lz*s,0,z-lx*s+lz*c];
  for(const lx of[-sw/2+.06,sw/2-.06])for(const lz of[-sd/2+.06,sd/2-.06]){const p=at(lx,lz);parts.push(beam('woodDark',p,[p[0],lz<0?h+.25:h,p[2]],.08,1));}
  parts.push(part('box','woodMid',[sw,.8,.35],at(0,sd/2-.2),2,[0,yaw,0]));
  const p=at(0,0);parts.push(part('wedge',i%2?'cloth':'woodLight',[sw+.2,.35,sd+.2],[p[0],h-.05,p[2]],2,[0,yaw,0]));}
 if(chance(r,.55)){parts.push(part('cylinder','stone',[1,.7,1],[0,0,d*.12],2,undefined,10),part('cylinder','water',[.75,.05,.75],[0,.66,d*.12],0,undefined,10),beam('woodDark',[-.45,.7,d*.12],[-.45,1.8,d*.12],.08,1),beam('woodDark',[.45,.7,d*.12],[.45,1.8,d*.12],.08,1),part('box','woodDark',[1.05,.1,.1],[0,1.75,d*.12],1));}
 else parts.push(part('box','stone',[.7,.5,.7],[0,0,d*.12],2),part('box','stone',[.22,1.8,.22],[0,.5,d*.12],2),part('box','stone',[.7,.18,.18],[0,1.9,d*.12],1));
 return {parts,entry:{x:0,z:d/2,width:w*.5}};
};

/** Cooking hearth: a ring of stones and a fire, maybe a spit. Small by design:
 * nothing like a building base, it occupies ~1.6 m of a 3 m footprint. */
const hearth:Generator=(ctx,r)=>{
 const parts:Part[]=[],n=7+Math.floor(r()*5),R=range(r,.5,.66);
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2+range(r,-.12,.12),s=range(r,.22,.32);parts.push(part('box',i%3?'stone':'stoneDark',[s,range(r,.14,.24),s*range(r,.8,1.2)],[Math.cos(a)*R,0,Math.sin(a)*R],2,[0,a,0]));}
 parts.push(part('cone','fire',[.55,range(r,.45,.7),.55],[0,.05,0],2,undefined,6));
 for(const a of[.4,2])parts.push(part('cylinder','woodEdge',[.12,.8,.12],[-.4*Math.sin(a),.07,-.4*Math.cos(a)],1,[Math.PI/2,a,0],5));
 if(chance(r,.5)){for(const s of[-1,1])parts.push(beam('woodDark',[s*(R+.25),0,0],[s*(R+.25),.95,0],.07,0));parts.push(part('box','woodDark',[2*R+.6,.06,.06],[0,.92,0],0));}
 if(chance(r,.5))parts.push(part('cylinder','trunk',[.32,1.1,.32],[0,.16,R+.45],0,[0,0,Math.PI/2],6)); // sitting log
 return {parts};
};

import {EXTRA_FAMILIES} from './buildingFamiliesExtra';
import {VILLAGE_FAMILIES} from './buildingFamiliesVillage';
const CORE_FAMILIES:Record<CoreFamilyId,{reference:string;generate:Generator}>={
 roundhouse:{reference:'Iron Age roundhouse reconstructions (Butser Ancient Farm, Castell Henllys): wattle-and-daub drum, conical thatch, porch',generate:roundhouse},
 cottage:{reference:'English cruck/box-frame cottages and Germanic Fachwerk houses: bays, side door, chimney, lean-to outshot',generate:cottage},
 longhouse:{reference:'Norse/Saxon longhouses and halls (Lofotr, West Stow): bowed low walls, steep hipped roof, side doors',generate:longhouse},
 granary:{reference:'English staddle-stone granaries and Iberian horreos: body raised on mushroom stones, ladder',generate:granary},
 storehouse:{reference:'Medieval tithe barns and town warehouses: masonry ground floor, timber loft, cart door and hoist beam',generate:storehouse},
 watermill:{reference:'Undershot vertical watermills (Roman Barbegal, Domesday-era mills): mill house, wheel on the water side, flume',generate:watermill},
 quernShelter:{reference:'Rotary quern under a lean-to (Iron Age/Roman domestic milling)',generate:quernShelter},
 workshop:{reference:'Medieval open-front workshops and Roman tabernae: back wall, open bay, awning, trade fixture (forge, kiln, loom, racks)',generate:workshop},
 palisade:{reference:'Iron Age and Slavic gorod stockades: staggered sharpened stakes, rails, earth bank',generate:palisade},
 gate:{reference:'Timber stockade gatehouses (Trelleborg, motte-and-bailey gates): posts or towers, walkway lintel, plank leaves',generate:gate},
 tower:{reference:'Timber watchtowers (Roman limes towers) and masonry keeps/bell towers',generate:tower},
 church:{reference:'Romanesque parish churches with west bell towers and apses; early timber shrine halls with bell frames',generate:church},
 marketStalls:{reference:'Medieval market-square booths and agora stalls around a well or market cross',generate:marketStalls},
 hearth:{reference:'Open cooking hearth: stone ring, fire, spit',generate:hearth},
};

/** LEGACY grammar set: the original Option H generators, kept exactly as authored (never deleted). */
export const LEGACY_FAMILIES:Record<FamilyId,{reference:string;generate:Generator}>={...CORE_FAMILIES,...EXTRA_FAMILIES};
/** Grammar sets: 'village' (default, buildingFamiliesVillage.ts, detailed machines and structure) overrides the families it
 * rebuilds and falls through to the legacy generator for the rest; 'legacy' is the original look, selectable in the world style menu. */
export type BuildingGrammar='village'|'legacy';
let grammar:BuildingGrammar='village';
export function setBuildingGrammar(g:BuildingGrammar){grammar=g==='legacy'?'legacy':'village';}
export function getBuildingGrammar():BuildingGrammar{return grammar;}
function activeDef(family:FamilyId):{reference:string;generate:Generator}{return (grammar==='village'&&VILLAGE_FAMILIES[family])||LEGACY_FAMILIES[family];}
/** Registry of the ACTIVE grammar (entries resolve at access time, so switching the grammar switches every consumer). */
export const BUILDING_FAMILIES=Object.fromEntries((Object.keys(LEGACY_FAMILIES) as FamilyId[]).map(k=>[k,{get reference(){return activeDef(k).reference;},get generate(){return activeDef(k).generate;}}])) as Record<FamilyId,{reference:string;generate:Generator}>;

/** Rotate every part of a spec about Y by quarter turns (used for waterSide).
 * Beam endpoints are rotated too, so a later fitToFootprint rebuilds them in place. */
export function rotateParts(parts:Part[],quarterTurns:number):Part[]{
 const q=((quarterTurns%4)+4)%4;if(!q)return parts;const a=q*Math.PI/2,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));
 const rp=(v:readonly [number,number,number]):[number,number,number]=>[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c];
 return parts.map(p=>{const rot=p.rot??[0,0,0];return {...p,...(p.anim?{anim:{...p.anim,pivot:rp(p.anim.pivot),axis:rp(p.anim.axis)}}:{}),pos:rp(p.pos),rot:[rot[0],rot[1]+a,rot[2]] as [number,number,number],...(p.ends?{ends:[rp(p.ends[0]),rp(p.ends[1])] as const}:{})};});
}
const waterTurns={'+x':0,'-z':1,'-x':2,'+z':3} as const;
/** Piers are authored facing +Z water; quarter turns that bring +Z onto the real side. */
const pierTurns={'+z':0,'+x':1,'-z':2,'-x':3} as const;

/** Coarser LOD tiers drop supports (e.g. staddle stones) but keep what they carried.
 * For each tier, any part left floating gets a stout far-tier pier from the ground
 * to its underside, so every retained LOD is a supported silhouette. */
export function ensureTierSupport(parts:Part[],footprint:{w:number;d:number}):Part[]{
 let out=parts;
 for(const tier of[1,2] as const)for(let guard=0;guard<8;guard++){
  const sub=partsAtLod({family:'',variantKey:'',footprint,parts:out,notes:{reference:''}},tier),fl=floatingParts({family:'',variantKey:'',footprint,parts:sub,notes:{reference:''}});
  if(!fl.length)break;
  let low=sub[fl[0]],lowY=Infinity;for(const i of fl){const b=partBounds(sub[i]);if(b.minY<lowY){lowY=b.minY;low=sub[i];}}
  const b=partBounds(low),sx=(b.maxX-b.minX)*.7,sz=(b.maxZ-b.minZ)*.7;
  out=[...out,{...part('box','stoneDark',[sx,lowY,sz],[(b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2],2),onlyFrom:tier}];
 }
 return out;
}

export function generateFamily(family:FamilyId,ctx:FamilyContext,variantKey:string):BuildingSpec{
 const def=activeDef(family),r=seededRandom(ctx.seed);
 // Families authored along one axis: turn them to the real water side / span axis.
 let q=0,gctx=ctx;
 if(family==='watermill'&&ctx.waterSide)q=waterTurns[ctx.waterSide];
 if(family==='pier')q=pierTurns[ctx.waterSide??'+z'];
 if(family==='bridge'&&ctx.footprint.w>ctx.footprint.d)q=1;
 if((family==='pier'||family==='bridge')&&q%2)gctx={...ctx,footprint:{w:ctx.footprint.d,d:ctx.footprint.w}};
 const out=def.generate(gctx,r);
 let parts=ctx.lit===false?out.parts.filter(p=>p.mat!=='fire'):out.parts,entry=out.entry;
 if(q){parts=rotateParts(parts,q);
  if(entry){const a=q*Math.PI/2,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));entry={x:entry.x*c+entry.z*s,z:-entry.x*s+entry.z*c,width:entry.width};}}
 // Wall segments, gates, earthwork cells and bridges run to the cell edge so neighbours join
 // without gaps; everything else keeps a 10 cm clearance inside its footprint.
 const margin=family==='palisade'||family==='gate'||family==='stoneWall'||family==='trench'||family==='moat'||family==='bridge'?.02:.1;
 // Fit first (it can lift tilted parts off the ground), then guarantee every LOD tier is supported.
 const fit=fitToFootprint({family,variantKey,footprint:{...ctx.footprint},parts,...(entry?{entry}:{}),notes:{reference:def.reference}},margin);
 return {...fit,parts:ensureTierSupport(fit.parts,fit.footprint)};
}
