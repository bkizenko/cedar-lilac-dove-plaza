/** Village grammar: workplaces and utilities (craft sheds by trade, hearth, threshing floor, well, cistern). See buildingFamiliesVillage.ts. */
import {beam,chance,part,range,type Part} from './buildingParts';
import {roofPitch,type Generator} from './buildingHelpers';
import {barrel,box,bucket,chimney,crate,cyl,doorway,ladder,post,roofGable,sack,stoneWall,woodpile} from './buildingKit';
import {roofFor} from './villageHomes';
import type {CarvedMaterialId as M} from './carvedPalette';

const TAU=Math.PI*2;

/** Open-fronted craft shed: back and side walls, front posts, a roof in the era's covering and a trade fixture that shows the work:
 * forge (stone stack, hearth, anvil, bellows, quench trough), kiln (domed beehive kiln, stoke hole, fuel stack), pottery (wheel, shelves
 * of pots, clay bin), loom (warp-weighted loom, fibre hanks, baskets), rack (stretched hides on frames, tanning vats), smoke (closed
 * smokehouse with louvre and hanging fish), oven (domed masonry oven, chimney, peel, flour sacks), bench (workbench, hung tools,
 * sawhorses, shavings). Works for the 4 x 4 m small crafts and the 6.4 x 6 m forge alike. */
export const workshop:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,trade=ctx.trade??'bench',k=Math.min(w,d)/4.8;
  const closed=trade==='smoke',stoneShed=trade==='forge'||trade==='oven'||trade==='kiln'||ctx.material==='stone';
  const W=w*range(r,.8,.9),D=d*range(r,.56,.66),h=range(r,2.05,2.4)*Math.min(1.2,k+.15),z0=-d/2+.18+D/2;
  const wall:M=stoneShed?'stone':'woodMid',rm=trade==='forge'||trade==='oven'?(ctx.era>=2?'shingle':'thatch'):roofFor(ctx),zb=z0-D/2,zf=z0+D/2;
  // footing, back wall, side walls (full for smokehouse, half-open elsewhere)
  box(parts,'stone',[W+.14,.22,D+.14],[0,0,z0],1);box(parts,'woodLight',[W-.1,.04,D-.1],[0,.22,z0],0);
  if(stoneShed)stoneWall(parts,{x:0,z:zb+.12,w:W,d:.24,h:h,y0:.1,faces:['+z'],course:.4});else{box(parts,wall,[W,h,.22],[0,.1,zb+.11],2);for(let i=0;i<8;i++)box(parts,'woodDark',[.04,h,.03],[-W/2+.3+i*(W-.6)/7,.1,zb+.24],0);}
  for(const s of[-1,1]){
    const sd=closed?D:D*.62;
    if(stoneShed)stoneWall(parts,{x:s*(W/2-.1),z:z0+(closed?0:-D*.19),w:.2,d:sd,h:closed?h:h*.62,y0:.1,faces:['+x','-x'],course:.4});
    else box(parts,wall,[.2,closed?h:h*.62,sd],[s*(W/2-.1),.1,z0+(closed?0:-D*.19)],2);
  }
  // front posts, header beam
  const pf=zf-.12;for(const s of[-1,1])post(parts,'woodDark',s*(W/2-.1),pf,h+.1,.16,2,.1);
  if(W>3.2)post(parts,'woodDark',0,pf,h,.13,1,.1);
  box(parts,'woodDark',[W+.1,.14,.16],[0,h+.1,pf],1);
  if(closed){box(parts,wall,[W,h,.2],[0,.1,zf-.1],2);doorway(parts,{x:0,z:zf,wall:0,w:.85*k,h:1.6*k,leaf:'woodMid',step:true});}
  // roof
  const pitch=Math.max(.45,roofPitch(ctx,r)*.8),rise=roofGable(parts,ctx,{span:D+.1,len:W,eave:h+.2,pitch,cx:0,cz:z0,axis:'x',over:.34,mat:rm});
  // trade fixtures (only what the trade really uses)
  const fz=z0-D*.12,lit=ctx.lit!==false;
  switch(trade){
    case 'forge':{
      const sx=-W*.2;box(parts,'stoneDark',[1.5*k,.85*k,1.1*k],[sx,.1,zb+.85],2);box(parts,'stone',[1.0*k,.12,.8*k],[sx,.95*k,zb+.85],1);
      chimney(parts,sx,zb+.55,.95*k,h+rise*.9,.8*k,'stone');
      parts.push(part('pyramid','stoneDark',[1.5*k,.6,1.1*k],[sx,.95*k+.1,zb+.85],1));
      if(lit){box(parts,'fire',[.55*k,.14,.45*k],[sx,.95*k,zb+.95],0);
        // working-forge stage (lit only): tall ember cones in the pan, a glowing stoke mouth on the hearth face, a hot bloom on the anvil
        parts.push(part('cone','fire',[.42*k,.5*k,.34*k],[sx,.98*k,zb+.95],1,undefined,6),part('cone','fire',[.2*k,.34*k,.2*k],[sx+.2*k,.98*k,zb+.82],0,undefined,5));
        box(parts,'fire',[.5*k,.2*k,.05],[sx,.5*k,zb+.85+.55*k],0);box(parts,'fire',[.22*k,.07*k,.14*k],[W*.2-.12*k,.72*k,fz+.1],0);}
      box(parts,'stoneDark',[.55*k,.16*k,.4*k],[sx-1.0*k,.1,zb+.95],0);box(parts,'woodDark',[.35*k,.1*k,.3*k],[sx+.2*k,.1,zb+1.65*k],0); // charcoal heap and slag scale
      box(parts,'woodDark',[.5*k,.42*k,.5*k],[W*.2,.1,fz+.1],1);box(parts,'iron',[.62*k,.2*k,.26*k],[W*.2,.52*k,fz+.1],0);parts.push(part('wedge','iron',[.3*k,.14,.22*k],[W*.2+.4*k,.52*k,fz+.1],0,[0,Math.PI/2,0]));
      box(parts,'woodMid',[1.0*k,.36*k,.5*k],[W*.4,.1,fz+.4],1);box(parts,'water',[.85*k,.05,.36*k],[W*.4,.46*k,fz+.4],0);
      box(parts,'woodEdge',[.5*k,.3*k,.7*k],[sx+1.05*k,.5*k,zb+.95],0);parts.push(part('wedge','woodLight',[.5*k,.3*k,.5*k],[sx+1.05*k,.8*k,zb+.95],0,[0,Math.PI/2,0])); // bellows
      for(let i=0;i<4;i++)parts.push(beam('woodDark',[sx-.7*k+i*.3,h*.55,zb+.3],[sx-.7*k+i*.3,h*.55+.55,zb+.3],.04,0)); // tool rack
      box(parts,'stoneDark',[.6,.4,.5],[-W/2+.5,0,zf+.25],0);
      break;}
    case 'kiln':case 'pottery':{
      // one pottery works for both the shaping shelter and the firing kiln: wheel, drying shelves and pots on the left, the domed kiln with its stoke hole and a chimney through the roof on the right
      const kx=W*.24,kz=z0-.05,R=Math.min(W,D)*.34*k;
      cyl(parts,'plaster',2*R,.9*k,[kx,.1,kz],2,12);parts.push(part('sphere','plaster',[2*R,1.0*k,2*R],[kx,.9*k,kz],2));
      for(const y of[.35,.75])cyl(parts,'stoneDark',2*R+.08,.06,[kx,y*k+.1,kz],0,12);
      box(parts,'recess',[.5*k,.4*k,.1],[kx,.12,kz+R-.04],1);if(lit)box(parts,'fire',[.34*k,.18*k,.06],[kx,.14,kz+R-.0],0);
      chimney(parts,kx,kz-R*.2,1.7*k,h+rise*.9,.46*k,'stoneDark');
      woodpile(parts,W/2-.45,zf-.3,.7,3,.5);
      cyl(parts,'woodDark',.5,.45,[-W*.3,.1,fz+.2],1,8);cyl(parts,'woodMid',.62,.07,[-W*.3,.55,fz+.2],0,10);cyl(parts,'tile',.26,.2,[-W*.3,.62,fz+.2],0,8,undefined,.14);
      for(const y of[.55,1.1]){box(parts,'woodMid',[1.2*k,.06,.4],[-W*.2,y,zb+.4],0);for(let i=0;i<3;i++)cyl(parts,'tile',.3,.3,[-W*.2-.4+i*.4,y+.06,zb+.4],0,6,undefined,.22);}
      for(let i=0;i<4;i++)cyl(parts,'tile',.34,.4,[-W*.38+i*.3,0,zf-.35],0,6,undefined,.26); // finished pots in the yard
      break;}
    case 'loom':{
      const lx=-W*.12;
      for(const s of[-1,1])parts.push(beam('woodDark',[lx+s*.65*k,.1,fz+.15],[lx+s*.65*k,1.85*k,fz-.05],.09,1));
      box(parts,'woodDark',[1.5*k,.09,.09],[lx,1.85*k,fz-.05],1);box(parts,'woodMid',[1.4*k,.08,.08],[lx,.7*k,fz+.08],0);
      for(let i=0;i<9;i++)box(parts,'cloth',[.04,1.0*k,.02],[lx-.56*k+i*.14*k,.74*k,fz+.04],0);
      for(let i=0;i<5;i++)box(parts,'stoneDark',[.1,.14,.08],[lx-.5*k+i*.25*k,.55*k,fz+.06],0);
      box(parts,'clothBlue',[1.2*k,.4*k,.03],[lx,.35*k,fz+.1],0);
      for(let i=0;i<4;i++)box(parts,'cloth',[.14,.5,.14],[W*.3+i*.1,.0+i*.0,zb+.4+i*.12],0);
      cyl(parts,'woodMid',.5,.4,[W*.32,0,zf-.4],0,8);cyl(parts,'woodMid',.46,.34,[W*.18,0,zf-.35],0,8);
      box(parts,'woodMid',[.4,.4,.4],[-W*.38,0,zf-.35],0);
      break;}
    case 'rack':{
      for(let i=0;i<2;i++){const x=-W*.2+i*W*.4;
        for(const s of[-1,1])post(parts,'woodDark',x+s*.55*k,fz,1.7*k,.08,1,.1);box(parts,'woodDark',[1.2*k,.07,.07],[x,1.7*k+.05,fz],1);box(parts,'woodDark',[1.2*k,.07,.07],[x,.45,fz],0);
        box(parts,i?'clothRed':'shingle',[.95*k,1.1*k,.04],[x,.6,fz],1);}
      for(let i=0;i<6;i++)box(parts,'woodLight',[.07,.5+(i%2)*.2,.05],[W*.38-.3+i*.14,1.0,zb+.35],0);
      box(parts,'woodMid',[.9,.5,.5],[W*.35,.1,fz+.5],0);box(parts,'water',[.78,.05,.38],[W*.35,.6,fz+.5],0);
      box(parts,'woodMid',[.9,.5,.5],[W*.15,.1,fz+.65],0);box(parts,'mud',[.78,.05,.38],[W*.15,.6,fz+.65],0);
      break;}
    case 'smoke':{
      box(parts,'woodEdge',[.8*k,.5*k,.8*k],[0,h+rise*.82,z0],1);parts.push(part('pyramid','woodDark',[1.0*k,.35,1.0*k],[0,h+rise*.82+.5*k,z0],0));
      for(let i=0;i<4;i++)parts.push(beam('woodMid',[-.7*k+i*.46*k,h*.9,zf+.08],[-.7*k+i*.46*k,h*.9-.7,zf+.08],.03,0));
      for(let i=0;i<4;i++)box(parts,'cloth',[.16,.34,.06],[-.7*k+i*.46*k,h*.9-1.0,zf+.1],0,[0,0,.1]);
      box(parts,'woodDark',[W,.1,.1],[0,h*.9,zf+.08],0);
      woodpile(parts,-W/2+.65,zf+.4,.9,3,.5);
      break;}
    case 'oven':{
      const ox=-W*.05,oz=z0-.15,R=Math.min(W,D)*.34*k;
      box(parts,'stoneDark',[2*R+.2,.7*k,2*R+.1],[ox,.1,oz],2);parts.push(part('sphere','plaster',[2*R+.1,1.0*k,2*R],[ox,.8*k,oz],2));
      box(parts,'recess',[.6*k,.4*k,.1],[ox,.95*k,oz+R-.02],1);if(lit)box(parts,'fire',[.4*k,.18*k,.06],[ox,.98*k,oz+R+.02],0);
      chimney(parts,ox,oz-.2,1.0*k,h+rise*.7,.5*k,'stoneDark');
      box(parts,'woodDark',[.1,.1,1.3],[ox+.9*k,.55,zf-.7],0);box(parts,'woodLight',[.4,.04,.35],[ox+.9*k,.55,zf-.05],0); // peel
      sack(parts,W*.34,0,zf-.4,1,.2);sack(parts,W*.36,.34,zf-.4,1,.5);crate(parts,W*.18,0,zf-.4,1);
      woodpile(parts,-W/2+.65,zf-.2,.8,3,.45);
      box(parts,'woodMid',[1.0,.88,.4],[W*.3,0,zf-.25],1);for(let i=0;i<3;i++)cyl(parts,'tile',.3,.14,[W*.3-.3+i*.3,.88,zf-.25],0,8,undefined,.26);
      break;}
    case 'saw':{
      // saw trestles with a log on them and a pit saw, plank stacks, a log pile and a chopping block
      for(const x of[-W*.3,W*.02])for(const sz of[-1,1]){parts.push(beam('woodDark',[x+sz*.34,0,fz-.3],[x,.95,fz-.1],.12,1),beam('woodDark',[x+sz*.34,0,fz+.3],[x,.95,fz+.1],.12,1));}
      parts.push(part('cylinder','woodLight',[.55,W*.55,.55],[W*.12,1.0,fz+.0],1,[0,0,Math.PI/2],8));
      parts.push(beam('iron',[-W*.2,1.55,fz-.28],[-W*.2,.55,fz-.28],.05,0),part('box','woodDark',[.06,.8,.06],[-W*.2+.4,.5,fz-.28],0));
      for(let i=0;i<5;i++)box(parts,'woodLight',[1.3*k,.07,.3],[W*.3,.08+i*.1,zb+.55],0);
      for(let i=0;i<4;i++)box(parts,'woodMid',[1.3*k,.07,.3],[W*.3,.08+i*.1,zb+.95],0);
      for(let r2=0;r2<3;r2++)for(let i=0;i<3-r2;i++)parts.push(part('cylinder',(i+r2)%2?'woodMid':'woodLight',[.34,1.5*k,.34],[-W*.36+i*.36+r2*.18,.17+r2*.3,zf-.4-1.5*k],0,[Math.PI/2,0,0],6));
      cyl(parts,'woodMid',.5,.4,[W*.4,0,zf-.3],0,6);box(parts,'iron',[.1,.5,.06],[W*.4,.4,zf-.3],0,[0,0,.5]);
      break;}
    default:{ // bench: carpenter/tailor/general workshop
      box(parts,'woodMid',[1.8*k,.1,.65*k],[-W*.18,.82,fz],1);for(const x of[-W*.18-.8*k,-W*.18+.8*k])for(const z of[fz-.22,fz+.22])post(parts,'woodDark',x,z,.82,.08,0);
      box(parts,'iron',[.5,.05,.15],[-W*.18+.2,.92,fz],0);box(parts,'woodLight',[.9,.05,.3],[-W*.18-.4,.92,fz+.1],0);
      for(const s of[-1,1]){parts.push(beam('woodDark',[W*.3+s*.4,.1,fz-.25],[W*.3+s*.15,.9,fz],.07,0),beam('woodDark',[W*.3+s*.4,.1,fz+.25],[W*.3+s*.15,.9,fz],.07,0));}
      box(parts,'woodDark',[1.1,.1,.1],[W*.3,.88,fz],0);
      for(let i=0;i<5;i++)box(parts,i%2?'iron':'woodLight',[.06,.4,.04],[-W*.4+i*.2,h*.55,zb+.28],0);box(parts,'woodDark',[1.2,.06,.06],[-W*.4+.4,h*.55+.38,zb+.28],0);
      box(parts,'woodLight',[.5,.12,.5],[W*.15,0,zf-.4],0);cyl(parts,'woodMid',.5,.55,[W*.42,0,zf-.4],0,6);
      ladder(parts,-W/2+.3,zb+.5,zb+.3,h*.9,4);
    }
  }
  // trade emblem on the ridge so each craft reads from the camera, not only up close: a pot, a pennant, a hide, a saw blade, a hammer
  {const ey=h+rise+.05,ex=-W*.28;
   const pole=(hgt:number)=>parts.push(beam('woodDark',[ex,ey-.1,z0],[ex,ey+hgt,z0],.07,1));
   if(trade==='pottery'||trade==='kiln'){pole(.5);cyl(parts,'tile',.62,.5,[ex,ey+.5,z0],1,8,undefined,.36);cyl(parts,'tile',.4,.1,[ex,ey+1.0,z0],1,8);}
   else if(trade==='loom'){pole(1.5);box(parts,'clothBlue',[.7,.4,.05],[ex+.4,ey+1.05,z0],1);box(parts,'clothRed',[.55,.3,.05],[ex+.34,ey+.7,z0],1);}
   else if(trade==='rack'){pole(1.4);box(parts,'woodDark',[.7,.06,.06],[ex,ey+1.4,z0],1);box(parts,'clothRed',[.6,.8,.05],[ex,ey+.6,z0],1);}
   else if(trade==='saw'){pole(.4);box(parts,'iron',[1.3,.3,.05],[ex,ey+.55,z0],1);for(let i=0;i<5;i++)box(parts,'iron',[.1,.12,.05],[ex-.55+i*.27,ey+.74,z0],0);}
   else if(trade==='bench'){pole(1.0);box(parts,'woodDark',[.1,.7,.1],[ex,ey+.6,z0],1);box(parts,'iron',[.55,.22,.2],[ex,ey+1.0,z0],1);}}
  // work-yard clutter that every shed shares
  if(chance(r,.6))barrel(parts,-W/2+.3,0,zf+.3,1);
  if(chance(r,.5))bucket(parts,W/2-.4,0,zf+.3);
  return {parts,entry:{x:0,z:zf,width:W*.6}};
};

/** Cooking hearth: kerbed stone ring, fire on bedded ash, a tripod and hung pot, a spit on forked posts, log seats, a woodpile and a water pail. */
export const hearth:Generator=(ctx,r)=>{
  const parts:Part[]=[],n=9+Math.floor(r()*3),R=range(r,.4,.46),lit=ctx.lit!==false;
  cyl(parts,'stoneDark',2*R+.5,.05,[0,0,0],1,10);
  for(let i=0;i<n;i++){const a=i/n*TAU+range(r,-.1,.1),s=range(r,.24,.32);parts.push(part('box',i%3?'stone':'stoneDark',[s,range(r,.16,.26),s*range(r,.8,1.1)],[Math.cos(a)*R,.03,Math.sin(a)*R],2,[0,a,0]));}
  cyl(parts,'recess',2*R-.35,.05,[0,.04,0],1,10);
  if(lit){parts.push(part('cone','fire',[.5,range(r,.5,.7),.5],[0,.06,0],2,undefined,6),part('cone','fire',[.26,.5,.26],[.12,.06,.08],0,undefined,5));}
  for(const a of[.4,2,3.6])parts.push(part('cylinder','woodEdge',[.1,.65,.1],[-.34*Math.sin(a),.08,-.34*Math.cos(a)],1,[Math.PI/2,a,0],5));
  // tripod with a hung cooking pot
  const tx=R+.38;for(const a of[0,2.1,4.2])parts.push(beam('woodDark',[tx+Math.sin(a)*.28,0,Math.cos(a)*.28],[tx,1.2,0],.06,1));
  parts.push(part('sphere','iron',[.44,.34,.44],[tx,.62,0],1),part('cylinder','iron',[.4,.04,.4],[tx,.92,0],0,undefined,8));
  parts.push(beam('iron',[tx,1.15,0],[tx,.95,0],.025,0));
  if(lit)parts.push(part('cone','fire',[.34,.28,.34],[tx,.04,0],1,undefined,5));
  for(const s of[-1,1])parts.push(beam('woodDark',[s*(R+.2),0,-.7],[s*(R+.2),.95,-.7],.07,0));
  box(parts,'woodDark',[2*R+.5,.05,.05],[0,.92,-.7],0);
  parts.push(part('cylinder','trunk',[.32,1.05,.32],[0,.16,R+.38],0,[0,0,Math.PI/2],6),part('cylinder','trunk',[.3,.9,.3],[-R-.3,.15,.1],0,[Math.PI/2,0,0],6));
  woodpile(parts,-.5,-R-.5,.7,2,.45);bucket(parts,R+.4,0,-.45);
  return {parts};
};

/** Circular threshing floor (Mediterranean aloni): beaten-earth floor with a stone kerb, a central post and tether, a threshing sledge,
 * winnowing fan and fork, a heap of grain and straw, and baskets. */
export const threshing:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,R=Math.min(w,d)/2*.94;
  cyl(parts,'mud',2*R,.1,[0,0,0],2,18);cyl(parts,'stone',2*R-.7,.04,[0,.1,0],1,18);
  const nk=15+Math.floor(r()*7);for(let i=0;i<nk;i++){const a=i/nk*TAU;box(parts,i%2?'stone':'stoneDark',[.62,.22,.3],[Math.cos(a)*(R-.12),0,Math.sin(a)*(R-.12)],1,[0,-a+Math.PI/2,0]);}
  post(parts,'woodDark',0,0,1.7,.2,2,.08);cyl(parts,'iron',.3,.06,[0,1.2,0],0,6);
  for(const a of[.5]){parts.push(beam('woodMid',[0,1.3,0],[Math.sin(a)*R*.62,.52,Math.cos(a)*R*.62],.05,0));}
  // threshing sledge (planks with flint teeth) and the driven ox yoke
  const sx=Math.sin(.5)*R*.62,sz=Math.cos(.5)*R*.62;
  box(parts,'woodMid',[1.1,.1,.7],[sx,.12,sz],1,[0,.5,0]);for(let i=0;i<4;i++)box(parts,'woodDark',[.9,.1,.06],[sx,.22,sz],0,[0,.5,0]);
  box(parts,'woodLight',[.9,.1,.1],[sx+.2,.24,sz-.2],0,[0,.5,0]);
  // grain and straw heaps, fan, fork, baskets
  parts.push(part('cone','straw',[1.5,.7,1.5],[-R*.5,.08,R*.1],1,undefined,9),part('cone','straw',[.9,.45,.9],[-R*.28,.08,-R*.35],0,undefined,7));
  parts.push(part('cone','thatch',[.9,.4,.9],[R*.45,.08,-R*.45],1,undefined,8));
  for(const [x,z] of([[R*.2,R*.7],[R*.35,R*.72],[-R*.1,-R*.75],[R*.6,R*.3]] as [number,number][]).slice(0,1+Math.floor(r()*4))) {cyl(parts,'woodMid',.46,.34,[x,.08,z],0,8);cyl(parts,'straw',.4,.04,[x,.38,z],0,8);}
  parts.push(part('cylinder','woodLight',[.6,.05,.6],[R*.1,.14,R*.5],0,[.22,0,0],8));
  parts.push(beam('woodDark',[R*.55,.1,R*.4],[R*.62,1.3,R*.45],.05,0));
  return {parts};
};

/** Hand-dug well (Near Eastern and European farm wells): stone kerb with a coping ring, timber A-frame with a windlass crank, rope and bucket, a gabled hood, trough and pail. */
export const well:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,R=Math.min(w,d)*.2,rm=roofFor(ctx);
  cyl(parts,'stoneDark',2*R+.5,.12,[0,0,0],1,12);
  cyl(parts,'stone',2*R+.2,.75,[0,.1,0],2,12);for(const y of[.3,.55])cyl(parts,'stoneDark',2*R+.24,.04,[0,y+.1,0],0,12);
  cyl(parts,'stoneDark',2*R+.3,.12,[0,.85,0],1,12);cyl(parts,'water',2*R-.1,.04,[0,.88,0],0,12);
  const px=R+.12;for(const s of[-1,1]){post(parts,'woodDark',s*px,0,1.9,.14,2,.85);parts.push(beam('woodMid',[s*(px+.35),.85,.3],[s*px,1.6,0],.08,0),beam('woodMid',[s*(px+.35),.85,-.3],[s*px,1.6,0],.08,0));}
  box(parts,'woodDark',[2*px+.3,.14,.14],[0,2.65,0],1);
  parts.push(part('prism',rm==='straw'?'thatch':rm,[2*px+.9,.7,1.3],[0,2.7,0],2,[0,0,0]));
  cyl(parts,'woodMid',.2,2*px,[px,2.0,0],1,6,[0,0,Math.PI/2]);
  parts.push(beam('woodLight',[-px-.28,2.0,0],[-px-.28,1.5,.1],.04,0),part('cylinder','woodLight',[.07,.4,.07],[-px-.28,1.45,.1],0,[Math.PI/2,0,0],5));
  parts.push(beam('woodLight',[0,2.0,0],[0,1.0,0],.025,0));cyl(parts,'woodDark',.3,.24,[0,.76,0],0,6,undefined,.24);
  box(parts,'woodMid',[1.0,.34,.34],[R+.55,0,R*.9],1);box(parts,'water',[.88,.05,.24],[R+.55,.3,R*.9],0);bucket(parts,-R-.5,0,R+.3);
  return {parts,entry:{x:0,z:R+.4,width:.8}};
};

/** Open stone cistern (Nabataean rock tanks, farm cisterns): dressed rim walls with a step stair down, water, timber cover beams over half, and a bucket windlass. */
export const cistern:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,W=w*.86,D=d*.86,t=.36;
  box(parts,'stone',[W,.55,t],[0,0,-D/2+t/2],2);box(parts,'stone',[W,.55,t],[0,0,D/2-t/2],2);box(parts,'stone',[t,.55,D-2*t],[-W/2+t/2,0,0],2);box(parts,'stone',[t,.55,D-2*t],[W/2-t/2,0,0],2);
  for(const [x,z,sx,sz] of[[0,-D/2+t/2,W,t],[0,D/2-t/2,W,t],[-W/2+t/2,0,t,D-2*t],[W/2-t/2,0,t,D-2*t]] as [number,number,number,number][])box(parts,'stoneDark',[sx+.08,.1,sz+.08],[x,.55,z],0);
  box(parts,'water',[W-2*t,.06,D-2*t],[0,.12,0],1);box(parts,'stoneDark',[W-2*t,.14,D-2*t],[0,0,0],1);
  for(let i=0;i<3;i++)box(parts,'stone',[1.1,.14,.3],[-W/2+t+.55,.14+i*.14,-D/2+t+.18+(2-i)*.0],0);
  for(let i=0;i<5;i++)box(parts,'woodMid',[.3,.12,D-2*t+.2],[-W/2+t+1.2+i*.42,.5,0],1);
  post(parts,'woodDark',W/2-t-.25,D/2-t,1.5,.14,1,.55);post(parts,'woodDark',W/2-t-.25,D/2-t-.9,1.5,.14,1,.55);box(parts,'woodDark',[.12,.12,1.0],[W/2-t-.25,2.05,D/2-t-.45],1);
  parts.push(beam('woodLight',[W/2-t-.25,2.0,D/2-t-.45],[W/2-t-.25,.9,D/2-t-.45],.025,0));bucket(parts,W/2-t-.25,.75,D/2-t-.45);
  return {parts,entry:{x:0,z:D/2,width:.8}};
};
