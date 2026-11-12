/** Village grammar: trade and storage (market square, stables, granary/storehouse). See buildingFamiliesVillage.ts. Entrance +Z. */
import {beam,chance,part,range,type Part} from './buildingParts';
import {roofPitch,type Generator} from './buildingHelpers';
import {barrel,box,bucket,crate,cyl,doorway,fenceX,ladder,post,roofGable,sack,stoneWall,timberFrame,window2} from './buildingKit';
import {roofFor} from './villageHomes';
import type {CarvedMaterialId as M} from './carvedPalette';

const TAU=Math.PI*2;

/** Market square: a stepped market cross (or well) in the middle, four stalls with striped awnings on corner posts (counter, hanging goods, crates,
 * baskets of produce, barrels, scales), a hand cart and a bench. Stall goods differ per stall so no two read the same. */
export const marketStalls:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w,d)/7;
  // paved square + central cross
  box(parts,'stoneDark',[w*.84,.1,d*.84],[0,0,0],1);
  box(parts,'stone',[1.5*k,.2,1.5*k],[0,.1,0],1);box(parts,'stone',[1.0*k,.2,1.0*k],[0,.3,0],1);
  if(ctx.era>=2){cyl(parts,'stone',.5,1.9*k,[0,.5,0],2,6);box(parts,'stone',[1.0,.18,.18],[0,.5+1.4*k,0],0);parts.push(part('pyramid','stoneDark',[.7,.4,.7],[0,.5+1.9*k,0],1));}
  else{cyl(parts,'stoneDark',1.0*k,.7,[0,.5,0],2,8);box(parts,'water',[.7*k,.05,.7*k],[0,1.18,0],0);post(parts,'woodDark',0,0,1.7*k,.12,1,.5);}
  const kinds=['produce','cloth','goods','fish'].sort(()=>r()-.5),all:[number,number][]=[[-1,-1],[1,-1],[-1,1],[1,1]],drop=chance(r,.4)?Math.floor(r()*4):-1;
  const palette:M[][]=[['clothRed','clothBlue','straw','clothRed'],['clothBlue','straw','clothRed','clothBlue'],['straw','clothRed','clothBlue','straw']],cols=palette[Math.floor(r()*3)];
  all.forEach(([sx,sz],i)=>{if(i===drop)return;const kind=kinds[i];
    const cx=sx*w*.3,cz=sz*d*.3,sw=2.3*k,sd=1.5*k,h=2.0*k,face=-sz; // awning faces the centre
    for(const ax of[-1,1])for(const az of[-1,1])post(parts,'woodDark',cx+ax*sw/2,cz+az*sd/2,h+(az===-face?.1:0)+(az===face?.0:0),.11,1);
    // sloped striped awning
    const stripes=5;for(let j=0;j<stripes;j++)box(parts,j%2?'plaster':cols[i],[sw/stripes,.07,sd+.5],[cx-sw/2+(j+.5)*sw/stripes,h+.02,cz-face*.05],1,[face*.12,0,0]);
    box(parts,'woodDark',[sw+.2,.1,.1],[cx,h-.04,cz+face*(sd/2+.2)],0);
    // counter facing the square, back shelf
    box(parts,'woodMid',[sw-.2,.85,.5],[cx,0,cz+face*(sd/2-.25)],1);box(parts,'woodLight',[sw-.1,.06,.62],[cx,.85,cz+face*(sd/2-.25)],0);
    box(parts,'woodMid',[sw-.2,1.1,.12],[cx,0,cz-face*(sd/2-.06)],1);
    switch(kind){
      case 'produce':for(let j=0;j<4;j++){cyl(parts,'woodMid',.5,.24,[cx-.8*k+j*.5*k,.9,cz+face*(sd/2-.25)],0,8);parts.push(part('sphere',j%2?'foliage':'clothRed',[.4,.22,.4],[cx-.8*k+j*.5*k,1.1,cz+face*(sd/2-.25)],0));}break;
      case 'cloth':for(let j=0;j<5;j++)box(parts,[cols[0],cols[1],'straw','cloth','clothBlue'][j] as M,[.3,.8,.06],[cx-.8*k+j*.4*k,1.0,cz-face*(sd/2-.18)],0);box(parts,'woodDark',[sw-.4,.06,.06],[cx,1.82,cz-face*(sd/2-.18)],0);break;
      case 'goods':for(let j=0;j<3;j++)crate(parts,cx-.7*k+j*.7*k,.85,cz+face*(sd/2-.25),1);barrel(parts,cx+sw/2+.35,0,cz+face*.3,1);sack(parts,cx-sw/2-.3,0,cz+face*.4,1,.3);break;
      default:for(let j=0;j<3;j++)parts.push(part('wedge','iron',[.5,.1,.16],[cx-.6*k+j*.6*k,.93,cz+face*(sd/2-.25)],0,[0,Math.PI/2,0]));box(parts,'water',[.9,.05,.4],[cx,.9,cz+face*(sd/2-.3)],0);bucket(parts,cx+sw/2+.3,0,cz+face*.3,0);
    }
    // hanging scale / lantern on the front header
    parts.push(beam('iron',[cx,h-.1,cz+face*(sd/2+.15)],[cx,h-.5,cz+face*(sd/2+.15)],.03,0));
  });
  // hand cart and bench in the open aisles
  box(parts,'woodMid',[1.1,.1,.7],[0,.5,d*.34],1);for(const s of[-1,1])cyl(parts,'woodDark',.7,.08,[s*.6-.04,.36,d*.34],0,10,[0,0,Math.PI/2]);
  parts.push(beam('woodDark',[-.55,.55,d*.34],[-1.3,.45,d*.34],.06,0),beam('woodDark',[.55,.55,d*.34],[1.3,.45,d*.34],.06,0));
  void range;
  return {parts,entry:{x:0,z:d/2*.9,width:3.0}};
};

/** Stables: low stone/timber range with a row of half doors (horse heads looking out), a hayloft with a hoist beam and sack, a gabled roof with
 * eave posts, a trough and hitching rail in front, a haystack and a small fenced paddock. */
export const stables:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w/8.4,d/8),stone=ctx.material==='stone',rm=roofFor(ctx);
  const L=w*.9,D=d*.5,wh=2.2*k,cz=-.3;
  box(parts,'stoneDark',[L+.3,.5,D+.3],[0,0,cz],1);
  if(stone)stoneWall(parts,{x:0,z:cz,w:L,d:D,y0:.4,h:wh,course:.38,faces:['+z']});else{box(parts,'plaster',[L,wh,D],[0,.4,cz],2);timberFrame(parts,{face:'+z',cx:0,cz,len:L,depth:D,y0:.4,h:wh,bays:6,brace:false});}
  const pitch=roofPitch(ctx,r)*.9,rise=roofGable(parts,ctx,{span:D,len:L,eave:.4+wh,pitch,cx:0,cz,axis:'x',over:.45,mat:rm});
  // half doors with heads
  const n=4;for(let i=0;i<n;i++){const x=-L/2+L*(i+.5)/n;
    box(parts,'recess',[1.0*k,1.5*k,.08],[x,.45,cz+D/2+.015],1);box(parts,'woodDark',[.95*k,.8*k,.06],[x,.45,cz+D/2+.05],1);box(parts,'woodMid',[.95*k,.7*k,.05],[x,1.3*k,cz+D/2+.03],0);
    box(parts,'woodDark',[.14,.6,.1],[x-.5*k-.1,.5,cz+D/2+.03],0);
    if(i!==2){box(parts,i%2?'woodDark':'woodLight',[.3,.42,.5],[x,1.3*k+.5,cz+D/2+.2],0);parts.push(part('wedge',i%2?'woodDark':'woodLight',[.22,.2,.32],[x,1.3*k+.62,cz+D/2+.5],0,[0,Math.PI,0]));}
  }
  // hayloft door + hoist
  box(parts,'recess',[1.0,.9,.07],[L*.3,.4+wh+.2,cz+D/2+.015],0);parts.push(beam('woodDark',[L*.3,.4+wh+rise*.45,cz+D/2-.1],[L*.3,.4+wh+rise*.45,cz+D/2+.95],.1,0));parts.push(beam('woodLight',[L*.3,.4+wh+rise*.45,cz+D/2+.85],[L*.3,.4+wh*.62+.34,cz+D/2+.85],.03,0));sack(parts,L*.3,.4+wh*.62,cz+D/2+.85,1,.3);
  // trough, hitching rail, haystack, paddock
  box(parts,'woodMid',[1.8,.4,.45],[-L*.15,0,cz+D/2+1.1],1);box(parts,'water',[1.6,.05,.3],[-L*.15,.36,cz+D/2+1.1],0);
  for(const s of[-1,1])post(parts,'woodDark',L*.28+s*.9,cz+D/2+1.2,.95,.1,0);box(parts,'woodDark',[1.9,.08,.08],[L*.28,.85,cz+D/2+1.2],0);
  parts.push(part('cone','straw',[1.5,1.2,1.5],[-L/2+.9,0,cz-D/2-.9],1,undefined,9));
  fenceX(parts,-L/2,-L/2+2.4,cz+D/2+2.0,.9,0);
  void chance;void bucket;void ladder;void window2;
  return {parts,entry:{x:0,z:cz+D/2+1.2,width:3}};
};

/** Granary (and the later storehouse): plank bin raised on staddle stones with mouse caps, a stair or ladder to a double door, steep roof with
 * ventilation louvre and sacks; the storehouse keeps a stone ground floor with a wide loading door and a timber loft with a hoist beam. */
export const granary:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,k=Math.min(w/6.6,d/6),rm=roofFor(ctx),store=ctx.era>=3&&ctx.wealth>.35;
  const W=w*.72,D=d*.72,lift=store?0:.7*k,wh=(store?2.4:1.9)*k;
  if(store){
    stoneWall(parts,{x:0,z:0,w:W,d:D,y0:0,h:1.5,course:.38,faces:['+z','-z','+x','-x']});
    doorway(parts,{x:0,z:D/2,wall:0,w:1.7*k,h:1.3,double:true,leaf:'woodMid',frame:'woodDark',step:true});
    box(parts,'woodMid',[W,wh-1.0,D],[0,1.5,0],2);timberFrame(parts,{face:'+z',cx:0,cz:0,len:W,depth:D,y0:1.5,h:wh-1.0,bays:5,brace:true});
  }else{
    for(const sx of[-1,1])for(const sz of[-1,1]){const x=sx*(W/2-.4),z=sz*(D/2-.4);cyl(parts,'stone',.5,lift,[x,0,z],1,7,undefined,.38);cyl(parts,'stoneDark',.9,.16,[x,lift-.1,z],1,8);}
    for(const [x,z] of[[0,0],[0,-(D/2-.4)],[0,D/2-.4],[-(W/2-.4),0],[W/2-.4,0]])cyl(parts,'stone',.5,lift,[x,0,z],x||z?1:0,7,undefined,.38);
    box(parts,'woodDark',[W+.1,.2,D+.1],[0,lift,0],1);
    box(parts,'woodMid',[W,wh,D],[0,lift+.2,0],2);
    for(let i=0;i<10;i++)for(const f of[-1,1])box(parts,'woodDark',[.05,wh,.04],[-W/2+.2+i*(W-.4)/9,lift+.2,f*(D/2+.015)],0);
    box(parts,'woodDark',[W+.06,.08,.06],[0,lift+.2+wh*.5,D/2+.03],0);
    doorway(parts,{x:0,z:D/2,wall:0,w:1.1*k,h:1.4*k,double:true,leaf:'woodLight',step:false});
    // stair/ladder up to the door
    for(let i=0;i<4;i++)box(parts,'woodMid',[1.0,.1,.28],[0,i*lift/4,D/2+.9-i*.2],0);
    box(parts,'woodDark',[.1,.5,.9],[-.55,.1,D/2+.55],0);
  }
  const pitch=Math.max(.8,roofPitch(ctx,r)),eave=(store?1.5:lift+.2)+(store?wh-1.0:wh);
  const rise=roofGable(parts,ctx,{span:D,len:W,eave,pitch,cx:0,cz:0,axis:'x',over:.35,mat:rm});
  box(parts,'woodDark',[.5,.35,.5],[W*.25,eave+rise*.55,0],0);
  if(store){parts.push(beam('woodDark',[-W/2+.8,eave-.1,D/2],[-W/2+.8,eave-.1,D/2+1.0],.12,0));parts.push(beam('woodLight',[-W/2+.8,eave-.1,D/2+.9],[-W/2+.8,eave-.46,D/2+.9],.03,0));sack(parts,-W/2+.8,eave-.8,D/2+.9,1,.3);box(parts,'recess',[.9,.9,.07],[-W/2+.8,eave-1.2,D/2+.02],0);}
  for(let i=0;i<3;i++)sack(parts,W/2+.45,0,D/2-.4-i*.4,1,.2+i*.3);
  barrel(parts,-W/2-.45,0,D/2-.4,1);
  void chance;void range;void TAU;void bucket;void ladder;void window2;void crate;void post;
  return {parts,entry:{x:0,z:D/2+1.1,width:1.3}};
};
