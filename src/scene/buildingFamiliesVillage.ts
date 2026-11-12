/** Village grammar set: rebuilt families with real structure and working details. A family missing here falls through to the legacy
 * generator (buildingFamilies.ts LEGACY_FAMILIES); `setBuildingGrammar('legacy')` selects the originals everywhere.
 * Every generator aims inside its footprint (fitToFootprint is the last guarantee), keeps near/mid/far triangle caps and keeps
 * moving parts (water wheel, sails) as rotor-tagged parts that the layer turns from the live simulation. */
import {beam,far,part,rotor,type Part} from './buildingParts';
import {roofMaterial,roofPitch,type FamilyContext,type FamilyId,type Generator} from './buildingHelpers';
import {barrel,box,bucket,chimney,crate,cyl,doorway,millstoneUpright,post,radialBox,radialBoxZ,roofGable,sack,stoneWall,timberFrame,window2,woodpile,type V3} from './buildingKit';

import {cottage,longhouse,quernShelter,roofFor,roundhouse} from './villageHomes';
import {cistern,hearth,threshing,well,workshop} from './villageWorks';
export type VillageDef={reference:string;generate:Generator};
const TAU=Math.PI*2;

/** Overshot water-powered grain mill kept inside the 6.2 x 5.8 plot: stone-floored mill house with a timber-framed grain loft,
 * hoist and double door; a spoked, shrouded wheel with buckets on the +X gable end (rotor 'wheel' about the X axis, turned by the
 * live river power); stone-lined wheel pit with the tailrace water, and a raised trestle flume (launder) with sluice bringing the
 * millrace over the top of the wheel. Wheel side is +X; the caller turns the whole building so +X faces the river. */
const millHouse:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w/6.2,d/5.8);
  const L=3.55*k,D=3.45*k,cx=-w/2+.12*k+L/2,cz=.2*k,h1=1.5*k,h2=1.3*k,eave=h1+h2;
  const R=1.55*k,cy=R+.1,ww=.8*k,wx=cx+L/2+.45*k+ww/2,east=cx+L/2;
  const rm=roofFor(ctx),pitch=Math.max(.5,roofPitch(ctx,r)),upper=ctx.material==='stone'&&ctx.era>=3?'stone':'plaster';
  // --- house: stone mill floor (millstones live here), timber-framed grain loft with a slight jetty
  stoneWall(parts,{x:cx,z:cz,w:L,d:D,h:h1,mat:'stone',faces:['+z','-z','-x'],course:.42});
  box(parts,'stoneDark',[L+.16,.22,D+.16],[cx,0,cz],1);
  box(parts,'woodDark',[L+.2,.14,D+.2],[cx,h1,cz],1); // jetty plate
  box(parts,upper,[L+.1,h2,D+.1],[cx,h1+.14,cz],2);
  for(const f of['+z','-z'] as const)timberFrame(parts,{face:f,cx,cz,len:L,depth:D+.1,y0:h1+.14,h:h2-.14,bays:4,brace:true});
  timberFrame(parts,{face:'-x',cx,cz,len:D,depth:L+.1,y0:h1+.14,h:h2-.14,bays:3,brace:true});
  const rise=roofGable(parts,ctx,{span:D+.1,len:L+.1,eave,pitch,cx,cz,axis:'x',over:.3,mat:rm});
  // --- openings: double door on the entrance side, loft door with hoist, shuttered windows, grindstone-floor slits
  const doorX=cx-.55*k;
  doorway(parts,{x:doorX,z:cz+D/2,wall:0,w:1.1*k,h:1.5*k,double:true});
  doorway(parts,{x:cx+.9*k,z:cz+D/2+.05,wall:0,w:.7*k,h:.95*k,double:true,step:false,leaf:'woodMid'});
  window2(parts,{x:cx-1.2*k,y:h1+.55*k,z:cz,wall:D+.1,w:.45,h:.55});
  window2(parts,{x:cx+.15*k,y:h1+.55*k,z:cz,wall:D+.1,w:.45,h:.55});
  window2(parts,{x:cx-.2*k,y:h1+.55*k,z:cz,wall:D+.1,w:.45,h:.5,face:'-z'});
  window2(parts,{x:cx,y:.6*k,z:cz,wall:L,w:.3,h:.5,face:'-x',shutters:null});
  // hoist: loft door, projecting beam under the eave, rope and a sack
  const hx=cx+.9*k,hz=cz+D/2+.15;
  box(parts,'woodEdge',[.14,.16,.95*k],[hx,eave-.2,hz+.35*k],1);
  box(parts,'iron',[.1,.1,.1],[hx,eave-.28,hz+.78*k],0);
  box(parts,'woodLight',[.03,.8*k,.03],[hx,eave-1.08*k,hz+.78*k],0);
  sack(parts,hx,eave-1.42*k,hz+.78*k,1);
  // --- chimney at the west gable (the kiln-drying hearth) and a roof louvre
  chimney(parts,cx-L/2+.4*k,cz,eave-.15,eave+rise*.88,.55*k);
  box(parts,'woodEdge',[.5*k,.28*k,.5*k],[cx+.5*k,eave+rise-.1,cz],0);
  // --- yard: sacks, barrels, spare stone, cart-width plank walk to the door
  millstoneUpright(parts,cx+1.2*k,cz+D/2+.5*k,.95*k,.2*k,.3);
  sack(parts,doorX-.9*k,0,cz+D/2+.45*k,1,.4);sack(parts,doorX-.9*k,.34*k,cz+D/2+.45*k,1,.2);sack(parts,doorX-.5*k,0,cz+D/2+.55*k,1,-.3);
  barrel(parts,cx-L/2+.4*k,0,cz+D/2+.45*k,1);
  bucket(parts,doorX+.7*k,0,cz+D/2+.45*k);
  box(parts,'woodMid',[1.5*k,.06,.7*k],[doorX,0,cz+D/2+.45*k],0);
  // --- wheel pit and tailrace: stone cheeks either side of the wheel, water sheet in the race
  const px0=east+.02,px1=wx+ww/2+.32*k,pz0=-1.85*k,pz1=Math.min(d/2-.15,2.75*k);
  // east cheek: tall end walls and a low middle rail so the wheel stays visible; a stone pier carries the axle bearing
  const e1=pz0+.55*k,e2=Math.min(pz1-.3,1.45*k);
  box(parts,'stoneDark',[.24*k,.9*k,e1-pz0],[px1,0,(pz0+e1)/2],1);box(parts,'stoneDark',[.24*k,.9*k,pz1-e2],[px1,0,(e2+pz1)/2],1);
  box(parts,'stoneDark',[.24*k,.34*k,e2-e1],[px1,0,(e1+e2)/2],1);
  box(parts,'stone',[.28*k,.1,pz1-pz0+.04],[px1,.9*k,(pz0+pz1)/2],0);
  box(parts,'stone',[.34*k,cy-.32*k,.5*k],[px1-.1*k,0,0],1);
  box(parts,'water',[px1-px0-.12,.12,pz1-pz0-.1],[(px0+px1)/2-.02,0,(pz0+pz1)/2],1);
  for(const z of[pz0+.1,pz1-.1])box(parts,'stoneDark',[px1-px0,.3*k,.22*k],[(px0+px1)/2,0,z],0);
  // axle bearing block on the outer cheek
  box(parts,'woodEdge',[.3*k,.24*k,.5*k],[px1-.12*k,cy-.32*k,0],1);
  // --- trestle flume (launder) from the upstream edge down onto the top of the wheel
  const zTop=-.12*k,yTop=cy+R+.1,zUp=-d/2+.2,slope=.14,yAt=(z:number)=>yTop+(zTop-z)*slope,len=zTop-zUp,zMid=(zTop+zUp)/2,th=Math.atan(slope);
  const rotX:V3=[th,0,0];
  box(parts,'woodMid',[ww*.95,.1,len+.3],[wx,yAt(zMid)-.05,zMid],1,rotX);
  for(const s of[-1,1])box(parts,'woodDark',[.08,.3,len+.3],[wx+s*(ww*.95/2-.04),yAt(zMid)-.03,zMid],1,rotX);
  box(parts,'water',[ww*.95-.16,.05,len+.1],[wx,yAt(zMid)+.04,zMid],0,rotX);
  // two ground bents clear of the wheel, a cheek post and header at the wheel, knee braces carrying the cantilevered last span
  const bz=[zUp+.45*k,-(R+.3*k)];
  for(const z of bz){
    for(const s of[-1,1])post(parts,'woodDark',wx+s*ww*.42,z,yAt(z)-.12,.15,1);
    box(parts,'woodDark',[ww*1.1,.14,.16],[wx,yAt(z)-.24,z],1);
    for(const s of[-1,1])parts.push(beam('woodMid',[wx+s*ww*.42,.25,z+.04],[wx+s*ww*.42,yAt(z)-.3,z+.7*k],.07,0));
  }
  const fz=zTop-.5*k;
  post(parts,"woodDark",wx+ww/2+.22*k,fz,yAt(fz)-.1-.9*k,.16,1,.9*k);
  box(parts,"woodDark",[ww*1.15,.14,.16],[wx,yAt(fz)-.24,fz],1);
  for(const s of[-1,1])parts.push(beam('woodMid',[wx+s*ww*.42,yAt(bz[1])-.55,bz[1]+.05],[wx+s*ww*.42,yAt(fz)-.3,fz-.02],.08,0));
  // spout over the wheel and the falling sheet
  box(parts,'woodMid',[ww*.7,.09,.55*k],[wx,yTop-.12,zTop+.1],1);
  box(parts,'water',[ww*.5,.46,.05],[wx,cy+R-.5,zTop+.42*k],0);
  // sluice gate at the upstream end: frame, board and a small winch
  for(const s of[-1,1])post(parts,'woodEdge',wx+s*(ww*.5+.05),zUp+.12,yAt(zUp)+.7,.1,1);
  box(parts,'woodEdge',[ww+.3,.1,.1],[wx,yAt(zUp)+.65,zUp+.12],1);
  box(parts,'woodLight',[ww*.8,.4,.04],[wx,yAt(zUp)+.14,zUp+.14],0);
  cyl(parts,'woodDark',.16,ww+.2,[wx-ww/2-.1,yAt(zUp)+.7,zUp+.12],0,6,[0,0,-Math.PI/2]);
  // --- the wheel (rotor): rims, spokes, hub, buckets; far tier is one disc
  const wp:Part[]=[],rimR=R,n=16,seg=2*(R-.07)*Math.sin(Math.PI/n)+.03;
  for(const sx of[-1,1]){
    const x=wx+sx*(ww/2-.05);
    for(let i=0;i<n;i++)radialBox(wp,'woodDark',x,cy,rimR,i/n*TAU,[.1,.14,seg],sx>0?0:1);
    for(let i=0;i<8;i++)radialBox(wp,'woodMid',wx+sx*(ww/2-.2),cy,R-.12,i/8*TAU+.1,[.1,R-.28,.1],sx>0?0:1);
  }
  for(let i=0;i<n;i++)radialBox(wp,'woodLight',wx,cy,R-.02,(i+.5)/n*TAU,[ww-.1,.26,.06],1,.45);
  cyl(wp,'woodEdge',.3,wx+ww/2+.25*k-(east-.1),[east-.1,cy,0],1,8,[0,0,-Math.PI/2]);
  wp.push(far(part('cylinder','woodDark',[2*R,ww*.6,2*R],[wx-ww*.3,cy,0],2,[0,0,-Math.PI/2],12)));
  parts.push(...rotor(wp,{id:'wheel',kind:'wheel',pivot:[wx,cy,0],axis:[1,0,0]}));
  return {parts,entry:{x:doorX,z:cz+D/2,width:1}};
};

/** Tower windmill (Dutch/English stone tower mills, e.g. Dutch polder and Norfolk mills): tapering stone tower with coursing and a
 * door, a gallery stage with rail, a rotating cap with a long tail pole and winch post, and four latticed sails on the windshaft
 * (rotor 'sails' about Z, turned by the live wind power). Sails face +Z, the entrance side. */
const windmill:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w,d)/5.2;
  const R0=1.15*k,R1=.78*k,H=3.9*k,rm=roofFor(ctx);
  // tower: tapered stone drum with coursing rings
  cyl(parts,'stone',2*R0,H,[0,0,0],2,12,undefined,2*R1);
  cyl(parts,'stoneDark',2*R0+.12,.3,[0,0,0],1,12,undefined,2*R0+.12);
  for(let i=1;i<5;i++){const t=i/5,rad=R0+(R1-R0)*t;cyl(parts,'stoneDark',2*rad+.05,.05,[0,H*t,0],0,12);}
  // gallery stage with rail
  const gy=1.2*k,gr=R0+.5*k;
  cyl(parts,'woodDark',2*gr,.12,[0,gy,0],1,12);
  for(let i=0;i<12;i++){const a=i/12*TAU;post(parts,'woodMid',Math.sin(a)*(gr-.07),Math.cos(a)*(gr-.07),.62*k,.07,0,gy+.12);}
  cyl(parts,'woodMid',2*gr-.05,.07,[0,gy+.12+.58*k,0],0,12);
  for(let i=0;i<6;i++){const a=i/6*TAU+.26,rad=R0+(R1-R0)*(gy/H);parts.push(beam('woodDark',[Math.sin(a)*(rad+.04),gy-.7*k,Math.cos(a)*(rad+.04)],[Math.sin(a)*(gr-.15),gy,Math.cos(a)*(gr-.15)],.08,0));}
  // door under the gallery, windows above
  doorway(parts,{x:0,z:R0-.04,wall:0,w:.85*k,h:1.35*k,double:false,step:true});
  for(const [y,a] of[[1.95,.55],[2.55,-.5],[2.95,.2]] as [number,number][]){const rad=R0+(R1-R0)*(y*k/H)-.02;parts.push(part('box','recess',[.3,.42,.08],[Math.sin(a)*rad,y*k,Math.cos(a)*rad],0,[0,a,0]));}
  // cap: shingled/thatched dome, ridge and the windshaft bearing
  const capY=H;
  cyl(parts,'woodDark',2*R1+.16,.2,[0,capY,0],2,12);
  parts.push(part('cone',rm==='slate'?'slate':rm,[2*R1+.5,1.15*k,2*R1+.5],[0,capY+.18,0],2,undefined,12));
  box(parts,'woodEdge',[.12,.14,2*R1+.4],[0,capY+1.0*k,0],1);
  // tail pole to the winch post on the ground behind
  const hubY=capY+.8*k,hubZ=R1+.62*k;
  parts.push(beam('woodDark',[0,capY+.45*k,-R1],[0,.55*k,-(d/2-.35)],.12,1));
  post(parts,'woodEdge',0,-(d/2-.35),1.0*k,.2,1);
  cyl(parts,'woodMid',.34,.16,[0,1.0*k,-(d/2-.35)],0,8);
  for(const s of[-1,1])parts.push(beam('woodMid',[s*.4,0,-(d/2-.5)],[0,1.0*k,-(d/2-.35)],.06,0));
  // windshaft
  cyl(parts,'woodDark',.24,hubZ-R1+.1,[0,hubY,R1-.2],1,8,[Math.PI/2,0,0]);
  // sails (rotor): four stocks with a leading rail, cloth boards and battens; far tier keeps the stocks
  const sp:Part[]=[],SL=Math.min(d,w)/2-.14,r0=.18;
  cyl(sp,'woodEdge',.42,.22,[0,hubY,hubZ-.11],1,8,[Math.PI/2,0,0]);
  cyl(sp,'iron',.2,.14,[0,hubY,hubZ+.1],0,6,[Math.PI/2,0,0]);
  for(let k2=0;k2<4;k2++){
    const a=k2*Math.PI/2+.38,len=SL-r0;
    radialBoxZ(sp,'woodDark',0,hubY,hubZ,r0,a,[.13,len,.11],2);
    radialBoxZ(sp,'woodMid',0,hubY,hubZ,r0+.55,a,[.05,len-.55,.06],1,.5);
    radialBoxZ(sp,'cloth',0,hubY,hubZ,r0+.55,a,[.46,len-.6,.035],1,.28);
    for(let i=0;i<4;i++)radialBoxZ(sp,'woodDark',0,hubY,hubZ,r0+.75+i*(len-1)/4,a,[.52,.045,.06],0,.27);
  }
  parts.push(...rotor(sp,{id:'sails',kind:'sails',pivot:[0,hubY,hubZ],axis:[0,0,1]}));
  // yard
  sack(parts,.9*k,0,R0+.5*k,1,.3);sack(parts,1.15*k,0,R0+.45*k,1,-.4);barrel(parts,-1.0*k,0,R0+.55*k,1);crate(parts,-1.3*k,0,R0+.9*k,.9,.3);
  woodpile(parts,-1.1*k,-R0-.2*k,.9,2,.5);
  return {parts,entry:{x:0,z:R0,width:.85}};
};

export const VILLAGE_FAMILIES:Partial<Record<FamilyId,VillageDef>>={
  roundhouse:{reference:'Iron Age roundhouse reconstructions (Butser Ancient Farm, Castell Henllys): wattle-and-daub drum on a stone kerb, layered conical thatch with smoke-hole cap, gabled porch',generate:roundhouse},
  cottage:{reference:'English cruck/box-frame cottages, Germanic Fachwerk houses, Pueblo-style mud houses with vigas: stone plinth, framed or coursed walls, gabled or flat roof, end chimney, outshot, jettied upper storey',generate:cottage},
  longhouse:{reference:'Norse/Saxon long halls (Lofotr, West Stow, Trelleborg): bowed timber walls with buttress posts, steep hipped roof, smoke louvres, carved porch with shield, banner pole',generate:longhouse},
  quernShelter:{reference:'Rotary quern under a lean-to (Iron Age/Roman domestic milling): posts, plank back wall, quern on a plinth, sieve and grain sacks',generate:quernShelter},
  workshop:{reference:'Open-front craft sheds by trade (Roman tabernae, medieval smithies and potteries): back and side walls, posts and header beam, covered roof and a trade fixture that shows the work: forge stack and anvil, domed kiln, potters wheel, warp loom, hide racks, smokehouse, bread oven, workbench',generate:workshop},
  hearth:{reference:'Open cooking hearth: kerbed stone ring, tripod and pot, spit on forked posts, log seats',generate:hearth},
  threshing:{reference:'Mediterranean threshing floor (aloni): paved circle with kerb, centre post, sledge, straw heaps, baskets',generate:threshing},
  well:{reference:'Farm well: stone kerb, A-frame windlass with rope and bucket, gabled hood, trough',generate:well},
  cistern:{reference:'Open stone cistern: dressed rim, step stair, plank cover over half, bucket windlass',generate:cistern},
  millHouse:{reference:'Overshot timber-and-stone water mills (Barbegal, English Domesday and Cotswold mills): stone mill floor, timber grain loft with sack hoist, spoked bucket wheel in a stone wheel pit, trestle launder and sluice',generate:millHouse},
  windmill:{reference:'Stone tower windmills (Dutch polder and Norfolk tower mills): tapered tower with coursing, gallery stage, rotating cap with tail pole, four latticed sails on a windshaft',generate:windmill},
};
