/** Village grammar: dwellings and halls (roundhouse, cottage, longhouse, quern shelter). See buildingFamiliesVillage.ts. */
import {beam,chance,part,pick,range,type Part} from './buildingParts';
import {roofMaterial,roofPitch,type FamilyContext,type Generator} from './buildingHelpers';
import {barrel,box,bucket,chimney,crate,cyl,doorway,fenceX,ladder,post,quoins,roofGable,sack,stoneWall,timberFrame,window2,woodpile} from './buildingKit';
import type {CarvedMaterialId as M} from './carvedPalette';
import {hallRoof,yurtHall} from './villageHall';

const TAU=Math.PI*2;
/** Roof material in the village palette: straw thatch while poor/early, shingle then tile or slate as wealth and era rise. */
export function roofFor(ctx:FamilyContext):M{
  const m=roofMaterial(ctx);
  if(m==='thatch')return ctx.era<=1?'thatch':'straw';
  return m==='tile'?'tile':ctx.wealth>.7&&ctx.era>=3?'slate':m;
}

/** Iron Age roundhouse (Butser, Castell Henllys): wattle-and-daub drum on a stone kerb, a layered conical thatch roof with a smoke-hole
 * cap, a gabled porch on two posts, a low door, woven bands, staked fence, firewood and a quern by the door. */
export const roundhouse:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w,d)/5.2;
  const R=Math.min(w,d)/2*range(r,.62,.72),wallH=range(r,1.35,1.7)*k,ov=range(r,.34,.46),pitch=Math.max(.7,roofPitch(ctx,r)+.15),roofH=(R+ov)*Math.tan(pitch);
  const cz=-.25*k;
  const wall:M=ctx.material==='wattle'?'mud':ctx.material==='stone'?'stone':'plaster';
  cyl(parts,'stoneDark',2*R+.3,.28,[0,0,cz],1,14); // kerb footing
  cyl(parts,wall,2*R,wallH,[0,.2,cz],2,14);
  // wattle weave: bound bands and vertical hazel rods around the drum
  for(const y of[.55,.95,1.3])if(y<wallH)cyl(parts,'woodDark',2*R+.06,.07,[0,y+.2,cz],0,14);
  for(let i=0;i<14;i++){const a=i/14*TAU;if(Math.abs(a-Math.PI/2)<.34)continue;post(parts,'woodMid',Math.sin(a)*(R+.02),Math.cos(a)*(R+.02)+cz,wallH-.05,.07,0,.2);}
  // layered thatch cone: three stacked cones step out like bundled courses, then the smoke-hole cap and finial
  const base=wallH+.12,span=R+ov;
  parts.push(part('cone','thatch',[2*span,roofH,2*span],[0,base,cz],2,undefined,14));
  for(let i=0;i<3;i++){const t=.2+i*.24,rad=span*(1-t)+.12;cyl(parts,i%2?'thatch':'straw',2*rad,.1,[0,base+roofH*t,cz],0,14);}
  parts.push(part('cone','straw',[.7,.4,.7],[0,base+roofH*.88,cz],1,undefined,8),part('cylinder','woodEdge',[.1,.5,.1],[0,base+roofH*.9+.3,cz],0,undefined,5));
  cyl(parts,'woodDark',2*span+.04,.09,[0,base-.02,cz],0,14); // eave tie ring
  // porch: two posts, tie beam and a little gable, door under it
  const pw=range(r,1.1,1.4)*k,pd=range(r,.6,.85)*k,z0=cz+R-.05;
  for(const sx of[-1,1])post(parts,'woodDark',sx*pw/2,z0+pd,wallH*.98,.13,1);
  box(parts,'woodDark',[pw+.3,.12,.14],[0,wallH*.98,z0+pd],1);
  parts.push(part('prism','thatch',[pw+.5,.5,pd+.2],[0,wallH*.98,z0+pd/2],1));
  doorway(parts,{x:0,z:cz+R+.02,wall:0,w:.78*k,h:Math.min(1.3*k,wallH*.92),leaf:'woodMid',step:true});
  // yard
  woodpile(parts,-R*.8,cz+R*.85,.8,2,.5);
  parts.push(part('cylinder','stone',[.55,.18,.55],[R*.62,0,cz+R+.35],0,undefined,8),part('cylinder','stoneDark',[.46,.14,.46],[R*.62,.18,cz+R+.35],0,undefined,8)); // quern
  sack(parts,R*.62-.6,0,cz+R+.4,1,.3);
  if(chance(r,.5+ctx.wealth*.3)){const lx=R*.95,lw=1.1*k;box(parts,'woodMid',[lw,wallH*.7,1.5*k],[lx+lw/2-.3,0,cz-R*.25],2);parts.push(part('wedge','thatch',[1.7*k,.45,lw+.2],[lx+lw/2-.3,wallH*.7,cz-R*.25],1,[0,-Math.PI/2,0]));}
  // low hurdle fence arc at the back
  for(let i=0;i<7;i++){const a=Math.PI+(i-3)*.28,x=Math.sin(a)*(R+.85),z=Math.cos(a)*(R+.85)+cz;if(Math.abs(x)<w/2-.1&&z>-d/2+.1&&z<d/2-.1)post(parts,'woodDark',x,z,.75,.07,0);}
  return {parts,entry:{x:0,z:cz+R,width:.8}};
};

/** Cottage / farmhouse, one grammar for every material and climate: a stone plinth, walls of coursed stone, timber frame over plaster
 * or (arid) mud with protruding roof beams, a gabled roof in the era's covering, end chimney, shuttered windows, a door with hood,
 * a lean-to outshot, front-yard bench, woodpile and a garden fence; richer houses gain a jettied upper storey and a porch. */
export const cottage:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,large=ctx.scale==='large',k=Math.min(w/5.4,d/5.2);
  const prop=ctx.tradition?.proportion??1,L=Math.min(w*.86,w*range(r,large?.7:.6,large?.78:.7)*prop),D=Math.min(d*.66,d*range(r,.46,.56)/prop);
  const arid=ctx.climate==='arid'||ctx.material==='mudbrick',stoneHouse=ctx.material==='stone',two=!arid&&ctx.era>=3&&ctx.wealth>.5&&chance(r,.7);
  const h1=range(r,1.95,2.2)*Math.min(1.1,k+.1),h2=two?1.7:0,eave=h1+h2,cz=-d/2+D/2+.28*k+(arid?0:0);
  const rm=roofFor(ctx),pitch=roofPitch(ctx,r),wallMat:M=arid?'mud':stoneHouse?'stone':'plaster';
  box(parts,'stoneDark',[L+.05,.17,D+.05],[0,0,cz],1);
  if(stoneHouse){stoneWall(parts,{x:0,z:cz,w:L,d:D,h:h1,y0:.15,faces:['+z','-z','+x','-x'],course:.36});if(two)stoneWall(parts,{x:0,z:cz,w:L,d:D,h:h2,y0:h1+.15,faces:['+z'],course:.36});quoins(parts,0,cz,L,D,.15,h1+h2,'stoneDark',4);}
  else{
    box(parts,wallMat,[L,h1+.1,D],[0,.15,cz],2);
    if(two){box(parts,'woodDark',[L+.22,.16,D+.22],[0,h1+.1,cz],1);box(parts,wallMat,[L+.2,h2,D+.2],[0,h1+.26,cz],2);}
    if(!arid){
      const bays=Math.max(2,Math.min(5,Math.round(L/1.55)));
      for(const f of['+z','-z'] as const)timberFrame(parts,{face:f,cx:0,cz,len:L,depth:D,y0:.15,h:h1-.05,bays,brace:ctx.wealth>.35});
      for(const f of['+x','-x'] as const)timberFrame(parts,{face:f,cx:0,cz,len:D,depth:L,y0:.15,h:h1-.05,bays:2,brace:false});
      if(two)for(const f of['+z','-z'] as const)timberFrame(parts,{face:f,cx:0,cz,len:L+.2,depth:D+.2,y0:h1+.26,h:h2-.12,bays,brace:true});
    }else{ // flat roof with parapet, protruding beam ends (vigas) and a blue-washed door lintel
      box(parts,'mud',[L+.2,.34,D+.2],[0,h1+.1,cz],2);box(parts,'stoneDark',[L+.3,.1,D+.3],[0,h1+.44,cz],1);
      for(let i=0;i<5;i++)cyl(parts,'woodMid',.16,.6,[-L/2+.5+i*(L-1)/4,h1+.1,cz+D/2+.04],0,6,[Math.PI/2,0,0]);
      ladder(parts,L/2-.5,cz+D/2+.7,cz+D/2+.05,h1+.3,5);
    }
  }
  const doorBay=pick(r,[-1,1])*L*.2,doorX=doorBay,zf=cz+D/2+(two?.1:0);
  doorway(parts,{x:doorX,z:cz+D/2,wall:0,w:.9*k,h:1.6*k,leaf:'woodMid',step:true});
  // door hood (arid: shade beam) and porch posts for the better-off
  if(ctx.wealth>.45||ctx.era>=2){parts.push(part('wedge',arid?'woodDark':rm,[1.5*k,.35,.6*k],[doorX,1.9*k,zf+.02],1,[0,Math.PI,0]));for(const s of[-1,1])post(parts,'woodDark',doorX+s*.62*k,zf+.55*k,1.9*k,.1,0);}
  const wy=1.05*k;
  for(const x of[-L*.33,L*.33].filter(x=>Math.abs(x-doorX)>.8))window2(parts,{x,y:wy,z:cz,wall:D,w:.5,h:.55,shutters:arid?null:undefined});
  if(two)for(const x of[-L*.3,0,L*.3])window2(parts,{x,y:h1+.26+.6,z:cz,wall:D+.2,w:.5,h:.55});
  window2(parts,{x:-L*.2,y:wy,z:cz,wall:D,w:.45,h:.5,face:'-z'});window2(parts,{x:0,y:wy,z:cz,wall:L,w:.4,h:.45,face:'+x'});
  // roof (flat for arid) + chimney + dormer-less loft vent
  let rise=0;
  if(arid){rise=.22;parts.push(part('prism','mud',[D+.3,rise,L+.3],[0,eave,cz],2,[0,Math.PI/2,0]));}
  if(!arid)rise=roofGable(parts,ctx,{span:D+.15,len:L+.15,eave,pitch,cx:0,cz,axis:'x',over:.26+ctx.wealth*.08,mat:rm});
  const chx=pick(r,[-1,1])*(L/2-.34);
  if(!arid)chimney(parts,chx,cz,eave-.2,eave+rise*.9+.2,.55,stoneHouse||ctx.wealth>.5?'stone':'mud');
  else {cyl(parts,'mud',1.0,.9,[chx*.6,h1+.44,cz-.3],1,8);parts.push(part('cone','mud',[1.0,.4,1.0],[chx*.6,h1+1.34,cz-.3],0,undefined,8));}
  // outshot (cat-slide lean-to) or side shed on the free end
  const room=w/2-L/2-.2;
  if(!arid&&room>.55&&chance(r,.3+ctx.wealth*.4+(ctx.tradition?.annexBias??0))){const side=-Math.sign(chx||1),lw=Math.min(room,1.35),ld=D*.8,lx=side*(L/2+lw/2);
    box(parts,wallMat==='stone'?'stone':'plaster',[lw,h1*.72,ld],[lx,.15,cz],2);parts.push(part('wedge',rm==='straw'?'thatch':rm,[ld+.2,.55,lw+.2],[lx,h1*.72+.15,cz],1,[0,side>0?Math.PI/2:-Math.PI/2,0]));
    doorway(parts,{x:lx,z:cz+ld/2,wall:0,w:.7,h:1.2,leaf:'woodDark',step:false});}
  // front yard
  box(parts,'woodMid',[.9,.4,.4],[doorX+(doorX>0?-1.1:1.1)*k,0,zf+.45*k],0);box(parts,'woodDark',[.9,.07,.4],[doorX+(doorX>0?-1.1:1.1)*k,.4,zf+.45*k],0);
  woodpile(parts,-L/2+.7,zf+.4*k,.9,2,.45);
  if(chance(r,.6))barrel(parts,L/2-.4,0,zf+.45*k,1);
  if(chance(r,.5))bucket(parts,doorX+.8*k,0,zf+.5*k);
  const fz=Math.min(d/2-.12,zf+1.25*k);if(fz>zf+.7)fenceX(parts,-w/2+.35,w/2-.35,fz,.7,0);
  return {parts,entry:{x:doorX,z:cz+D/2,width:.9}};
};

/** Great hall / barracks (Lofotr, West Stow, Trelleborg long halls): bowed timber walls on a stone plinth with buttress posts, a steep
 * hipped roof with smoke louvres and gable finials, porch with carved posts and a hanging shield, banner pole, benches and weapon racks. */
export const longhouse:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,large=ctx.scale==='large',k=Math.min(w,d)/(large?10:8.2);
  if(ctx.form?.hall==='felt'){const y=yurtHall(parts,ctx,r,{w,d,large,k});return {parts,entry:y.entry};}
  const L=w*range(r,.78,.86),D=d*range(r,large?.5:.42,large?.58:.5),cz=-d/2+D/2+.9*k,wallH=range(r,1.55,1.9)*(large?1.2:1);
  const stone=ctx.material==='stone',pitch=roofPitch(ctx,r)+.05,rm=roofFor(ctx),wall:M=stone?'stone':'woodMid';
  box(parts,'stoneDark',[L+.06,.2,D+.06],[0,0,cz],1);
  if(stone)stoneWall(parts,{x:0,z:cz,w:L,d:D,h:wallH,y0:.2,course:.4});else box(parts,wall,[L,wallH,D],[0,.2,cz],2);
  // bowed middle bays and plank siding lines
  box(parts,wall,[L*.6,wallH,D+.26],[0,.2,cz],1);
  if(!stone)for(const s of[-1,1])for(let i=0;i<9;i++)box(parts,'woodDark',[.05,wallH,.04],[-L*.3+i*L*.6/8,.2,cz+s*(D/2+.14)],0);
  // buttress posts along both long sides and a tie-beam course
  for(const s of[-1,1])for(let i=0;i<7;i++){const x=-L/2+.35+i*(L-.7)/6;post(parts,'woodDark',x,cz+s*(D/2+.06),wallH+.1,.18,1,.2);parts.push(beam('woodMid',[x,.2,cz+s*(D/2+.55)],[x,wallH*.75,cz+s*(D/2+.08)],.1,0));}
  box(parts,'woodDark',[L+.2,.14,D+.3],[0,wallH+.2,cz],1);
  // roof: the society's hall form (villageHall.ts): plain hip/gable by default, thatch hip, terrace, vault, stave, turf, upturned or saddle from the skin
  const hip=range(r,.7,1.1),form=ctx.form?.hall??'gable',rise=hallRoof(parts,ctx,r,form,{L,D,cz,eave:wallH+.2,pitch,mat:rm,large,span:D+.8,len:L+.8,hip,k});
  void rise;
  // porch with carved posts, steps and shield; door(s)
  const dx=large?0:range(r,-L*.2,L*.2),pz=cz+D/2+.15,pw=large?3.2:2.0,pd=Math.min(d/2-pz-.1,large?1.6:1.1);
  doorway(parts,{x:dx,z:cz+D/2+.12,wall:0,w:large?1.5:1.0,h:Math.min(1.9,wallH*1.1),double:large,leaf:'woodMid',step:true});
  for(const s of[-1,1])post(parts,'woodDark',dx+s*pw/2,pz+pd,wallH+.1,.2,1);
  box(parts,'woodDark',[pw+.4,.18,.2],[dx,wallH+.12,pz+pd],1);parts.push(part('prism',rm==='straw'?'thatch':rm,[pw+.7,.7,pd+.2],[dx,wallH+.3,pz+pd/2],1));
  for(const s of[-1,1]){box(parts,'woodEdge',[.14,.36,.14],[dx+s*pw/2,wallH-.5,pz+pd],0);parts.push(part('cone','woodLight',[.2,.28,.2],[dx+s*pw/2,wallH-.14,pz+pd],0,undefined,4));}
  parts.push(part('cylinder','clothRed',[.7,.06,.7],[dx,wallH*.55+.2,cz+D/2+.2],0,[Math.PI/2,0,0],10),part('cylinder','woodDark',[.74,.05,.74],[dx,wallH*.55+.2,cz+D/2+.17],0,[Math.PI/2,0,0],10)); // shield above the door
  // yard: banner pole, benches, weapon rack or wood stack
  const bx=L/2-.3;post(parts,'woodDark',bx,cz+D/2+.7*k,wallH+2.2*k,.14,1);box(parts,'clothRed',[.08,.9,.7],[bx,wallH+1.2*k,cz+D/2+.7*k+.38],1);
  if(large){for(const s of[-1,1]){box(parts,'woodMid',[1.4,.1,.4],[s*(pw/2+1.6),.4,pz+pd+.2],0);post(parts,'woodDark',s*(pw/2+1.1),pz+pd+.2,.4,.08,0);post(parts,'woodDark',s*(pw/2+2.1),pz+pd+.2,.4,.08,0);}
    barrel(parts,-L/2+.6,0,pz+.8,1);crate(parts,-L/2+1.2,0,pz+.7,1,.2);}
  else{box(parts,'woodDark',[1.8,.09,.12],[-L*.28,.95,pz+.9],0);for(const s of[-1,1])post(parts,'woodDark',-L*.28+s*.8,pz+.9,.95,.08,0);for(let i=0;i<4;i++)parts.push(beam('woodLight',[-L*.28-.6+i*.4,.1,pz+.88],[-L*.28-.6+i*.4,1.6,pz+.88],.05,0));}
  for(const [sx] of[[-1],[1]])window2(parts,{x:sx*L*.3,y:wallH*.55,z:cz,wall:D,w:.4,h:.4,shutters:null,face:'-z'});
  return {parts,entry:{x:dx,z:cz+D/2,width:large?1.5:1}};
};

/** Rotary-quern shelter (Roman and Iron Age domestic milling): a four-post lean-to roof over a saddle and a rotary quern on a plank
 * table with a hopper, grain sacks, and the sieve rack. */
export const quernShelter:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,W=w*range(r,.72,.84),D=d*range(r,.6,.74),h=range(r,1.9,2.2),rm=roofFor(ctx);
  const x0=-W/2+.1,x1=W/2-.1,z0=-D/2+.1,z1=D/2-.1;
  for(const x of[x0,x1])for(const z of[z0,z1])post(parts,'woodDark',x,z,z<0?h:h-.45,.13,2);
  box(parts,'woodDark',[W,.12,.12],[0,h-.12,z0],1);box(parts,'woodDark',[W,.12,.12],[0,h-.6,z1],1);
  parts.push(part('wedge',rm==='straw'?'thatch':rm,[W+.3,.6,D+.3],[0,h-.6,0],2));
  box(parts,'woodMid',[W-.1,.9,.12],[0,0,z0+.06],2); // back plank wall
  box(parts,'stoneDark',[1.0,.5,.9],[-W*.15,0,0],2);
  cyl(parts,'stone',.82,.14,[-W*.15,.5,0],1,12);cyl(parts,'stoneDark',.74,.12,[-W*.15,.64,0],1,12);
  box(parts,'woodEdge',[.1,.34,.1],[-W*.15+.28,.76,0],0);
  parts.push(part('cone','woodLight',[.3,.3,.3],[-W*.15,.76,0],0,undefined,6));
  box(parts,'woodMid',[.8,.08,.5],[W*.28,.5,.1],1);post(parts,'woodDark',W*.28-.32,.1,.5,.07,0);post(parts,'woodDark',W*.28+.32,.1,.5,.07,0);
  sack(parts,W*.28-.15,.58,.1,1,.2);sack(parts,W*.3,0,-.5,1,-.3);sack(parts,W*.4,0,.5,1,.5);
  parts.push(part('cylinder','woodLight',[.5,.06,.5],[W*.25,.7,-.55],0,[Math.PI/2,0,0],10));
  barrel(parts,x1-.15,0,z1+.35,1);
  return {parts,entry:{x:0,z:z1,width:W*.6}};
};
