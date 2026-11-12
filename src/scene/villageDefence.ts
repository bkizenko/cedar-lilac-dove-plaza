/** Village grammar: defensive lines (palisade, gatehouse, stone wall). See buildingFamiliesVillage.ts.
 * Cells run to the cell edge so neighbours join; every run is built along an "arm" (x or z) and corners are two arms plus a post or tower.
 * Near-only detail (lashings, arrow slits, nail heads) is LOD 0; a plank/stone impostor replaces the rows beyond the mid distance. */
import {beam,chance,far,part,pick,range,type Part} from './buildingParts';
import {roofMaterial,type Generator} from './buildingHelpers';
import {cyl,ladder} from './buildingKit';
import type {CarvedMaterialId as M} from './carvedPalette';

type Arm={along:'x'|'z';cx:number;cz:number;len:number};
const arms=(axis:'x'|'z'|'corner',w:number,d:number,t:number):Arm[]=>axis==='corner'
  ?[{along:'x',cx:(w/2-t/2)/2,cz:0,len:w/2+t/2},{along:'z',cx:0,cz:(d/2-t/2)/2,len:d/2+t/2}]
  :axis==='x'?[{along:'x',cx:0,cz:0,len:w}]:[{along:'z',cx:0,cz:0,len:d}];
/** Point on an arm: `off` along the run, `lat` across it (negative lat is the outer, enemy side). */
const at=(a:Arm,off:number,lat:number):[number,number]=>a.along==='x'?[a.cx+off,a.cz+lat]:[a.cx+lat,a.cz+off];
const armBox=(p:Part[],a:Arm,mat:M,len:number,h:number,th:number,off:number,lat:number,y:number,lod:0|1|2=1)=>{
  const [x,z]=at(a,off,lat);p.push(part('box',mat,a.along==='x'?[len,h,th]:[th,h,len],[x,y,z],lod));};

/** Hewn-log stockade: split logs of uneven height set in a trench, adzed faces with sharpened tips, two lashed rails on the inner face, an
 * earth bank on the outside and (from the iron/classical era) a plank wall-walk with a ladder. Corner cells ring a watch post. */
export const palisade:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,axis=ctx.wallAxis??'x',h=range(r,2.5,3.1),walk=ctx.era>=1&&ctx.wealth>.15,t=.5;
  const log=(a:Arm,off:number,lat:number,k:number)=>{
    const [x,z]=at(a,off,lat),sh=h*range(r,.88,1.07)*k,rad=range(r,.2,.27),tone:M=chance(r,.3)?'woodDark':'woodMid';
    parts.push(part('cylinder',tone,[rad*2,sh,rad*2*.92],[x,0,z],1,undefined,6),part('cone','woodLight',[rad*1.9,.42,rad*1.9*.92],[x,sh,z],1,undefined,6));
    // near-only: bark seam and a ground-level trench packing stone
    if(chance(r,.5))parts.push(part('box','woodEdge',[.04,sh*.5,.04],[x+rad*.8,sh*.2,z],0));
  };
  for(const a of arms(axis,w,d,t)){
    const n=Math.max(3,Math.round(a.len/.4));
    for(let i=0;i<n;i++){const off=-a.len/2+.2+i*(a.len-.4)/(n-1);log(a,off,(i%2?.07:-.07),1);}
    // lashed rails on the inside face: long timbers with a binding at every ninth log
    for(const y of[h*.3,h*.7]){armBox(parts,a,'woodDark',a.len-.1,.13,.1,0,.3,y,1);
      for(let i=1;i<n;i+=3){const off=-a.len/2+.2+i*(a.len-.4)/(n-1),[x,z]=at(a,off,.3);parts.push(part('box','cloth',[.14,.16,.14],[x,y-.01,z],0));}}
    // outer earth bank (rampart) and a ditch lip
    {const [x,z]=at(a,0,-.55);parts.push(part('prism','woodDark',[.9,.42,a.len-.04],[x,0,z],0,a.along==='x'?[0,Math.PI/2,0]:undefined));}
    if(walk){
      armBox(parts,a,'woodLight',a.len-.1,.09,.9,0,.62,h*.62,1);                  // wall-walk planking
      for(let i=0;i<=Math.floor(a.len/1.6);i++){const off=-a.len/2+.3+i*(a.len-.6)/Math.max(1,Math.floor(a.len/1.6)),[x,z]=at(a,off,.62);parts.push(beam('woodDark',[x,0,z+(a.along==='x'?.3:0)],[x,h*.62,z+(a.along==='x'?.3:0)],.12,1));}
      const [lx,lz]=at(a,a.len*.3,.62);ladder(parts,lx,lz-.3,lz+.5,h*.62,7,0);
    }
    parts.push(far(armBox2(a,h)));
  }
  if(axis==='corner'){
    // watch post at the angle: thick corner log, small platform, signal pole
    parts.push(part('cylinder','woodDark',[.7,h+.9,.7],[0,0,0],1,undefined,8),part('cone','woodLight',[.7,.7,.7],[0,h+.9,0],1,undefined,8));
    if(walk)parts.push(part('box','woodLight',[1.4,.1,1.4],[0,h*.62,0],1));
  }
  return {parts};
};
function armBox2(a:Arm,h:number):Part{const [x,z]=at(a,0,0);return part('box','woodMid',a.along==='x'?[a.len-.2,h,.3]:[.3,h,a.len-.2],[x,0,z],2);}

/** Timber gatehouse: two hewn-log towers with a hoarded gallery, a lintel walkway with rail and a hanging lantern, double plank leaves with
 * iron straps, hinges and a drop bar (or a raised portcullis on rich gates), flanking stockade logs to the cell edge. The passage opens
 * on the cell centre along x; `entry` stays at z=.5 as before. */
export const gate:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w}=ctx.footprint,towers=ctx.era>=1&&chance(r,.5+ctx.wealth*.3),h=range(r,3.2,3.7),open=range(r,1.9,2.2),cl=ctx.era>=3&&ctx.wealth>.45;
  const roof=roofMaterial(ctx),tw=.95;
  for(const s of[-1,1]){const x=s*(open/2+tw/2);
    if(towers){
      parts.push(part('box','woodMid',[tw,h+.6,1.05],[x,0,0],2),part('box','woodDark',[tw+.12,.14,1.17],[x,h*.5,0],1));       // shaft with a girth rail
      parts.push(part('box','woodDark',[tw+.4,.14,1.5],[x,h+.6,0],1),part('box','woodMid',[tw+.3,.62,1.4],[x,h+.74,0],1));       // hoarding gallery
      for(const f of[-1,1])parts.push(part('box','woodDark',[.14,.3,.06],[x+f*.2,h+.9,.72],0));                                  // arrow slits
      parts.push(part('pyramid',roof,[tw+.7,1.05,1.7],[x,h+1.36,0],2));
      // corner brace logs
      parts.push(beam('woodLight',[x+s*(tw/2+.05),.2,-.5],[x+s*(tw/2+.05),h*.5,-.5],.1,0));
    }else{
      parts.push(part('cylinder','woodDark',[.62,h+.4,.56],[x,0,0],2,undefined,8),part('cone','woodLight',[.64,.7,.58],[x,h+.4,0],1,undefined,8));
      parts.push(part('box','woodMid',[tw*.5,.12,.9],[x,h*.5,0],0));
    }
    // flanking stockade logs run to the cell edge
    const stub=w/2-(open/2+tw+.05);
    if(stub>.25){const n=Math.max(2,Math.round(stub/.38));for(let i=0;i<n;i++){const xx=s*(open/2+tw+.05+(i+.5)*stub/n),sh=h*.82*range(r,.92,1.06);
      parts.push(part('cylinder',i%3?'woodMid':'woodDark',[.4,sh,.38],[xx,0,(i%2?.06:-.06)],1,undefined,6),part('cone','woodLight',[.38,.4,.36],[xx,sh,(i%2?.06:-.06)],1,undefined,6));}
      parts.push(far(part('box','woodMid',[stub,h*.82,.3],[s*(open/2+tw+.05+stub/2),0,0],2)));}
  }
  // lintel walkway across the top: deck, front fascia and a rail
  const deck=open+2*tw;
  parts.push(part('box','woodDark',[deck,.32,1.0],[0,h-.3,0],2),part('box','woodMid',[deck+.1,.55,.1],[0,h,.5],1),part('box','woodMid',[deck+.1,.55,.1],[0,h,-.5],1));
  for(let i=0;i<=4;i++)parts.push(part('box','woodDark',[.1,.55,.12],[-deck/2+.05+i*(deck-.1)/4,h,.5],0));
  // hanging lantern on the outer face: bracket, chain, glass body
  parts.push(beam('iron',[0,h-.35,.5],[0,h-.35,.9],.05,0),part('box','iron',[.04,.3,.04],[0,h-.67,.9],0),part('box','fire',[.2,.26,.2],[0,h-.96,.9],0));
  // leaves: two plank doors with an iron strap, hinge and bar, or a raised portcullis
  if(cl){
    for(let i=0;i<5;i++)parts.push(part('box','iron',[.07,h-.7,.07],[-open/2+.2+i*(open-.4)/4,.5,.12],1));
    for(const y of[.7,1.6,2.5])parts.push(part('box','iron',[open-.1,.06,.08],[0,y,.12],0));
  }else{
    for(const s of[-1,1]){
      parts.push(part('box','woodMid',[open/2-.06,h-.55,.1],[s*open/4,0,-.08],1));
      for(const y of[.55,h-1.2])parts.push(part('box','iron',[open/2-.14,.1,.04],[s*open/4,y,.0],0),part('box','iron',[.1,.14,.08],[s*(open/2-.12),y,-.03],0));
      for(let i=1;i<4;i++)parts.push(part('box','woodDark',[.03,h-.6,.02],[s*(i*open/8),.02,.0],0));    // plank seams
    }
    parts.push(part('box','woodEdge',[open+.3,.12,.1],[0,h*.52,-.12],0));                              // drop bar
  }
  return {parts,entry:{x:0,z:.5,width:open}};
};

/** Coursed stone curtain: battered footing, irregular courses with a few through-stones, projecting buttress piers, weep spouts, a coping
 * and (classical onward) a wall-walk with merlons and arrow slits. Corner cells end in a round tower with a conical cap. Mudbrick
 * settlements get a plastered body and a plain parapet. */
export const stoneWall:Generator=(ctx,r)=>{
  const parts:Part[]=[],{w,d}=ctx.footprint,axis=ctx.wallAxis??'x',t=range(r,.85,1.05),h=range(r,2.5,3.1)*(ctx.era>=3?1.12:1);
  const wm:M=ctx.material==='mudbrick'?'plaster':'stone',merlon=ctx.era>=2&&chance(r,.4+ctx.wealth*.5),courses=pick(r,[5,6,7]);
  for(const a of arms(axis,w,d,t)){
    armBox(parts,a,'stoneDark',a.len,.32,t+.24,0,0,0,1);                                           // battered footing
    armBox(parts,a,wm,a.len,h-.32,t,0,0,.32,2);
    for(let i=1;i<courses;i++){const y=.32+(h-.32)*i/courses,off=((i*37)%7)/7*.4;
      armBox(parts,a,'stoneDark',a.len,.035,t+.035,0,0,y,0);
      // staggered course joints: short vertical ticks on the face
      for(let j=0;j<Math.floor(a.len/.9);j++){const o=-a.len/2+.45+j*.9+(i%2?.45:0)+off*0;if(Math.abs(o)<a.len/2-.1){for(const f of[-1,1]){const [x,z]=at(a,o,f*(t/2+.01));parts.push(part('box','stoneDark',a.along==='x'?[.035,(h-.32)/courses,.03]:[.03,(h-.32)/courses,.035],[x,y,z],0));}}}
    }
    // buttress piers every ~3 m on the outer face
    const nb=Math.max(0,Math.floor(a.len/3.2));
    for(let i=0;i<nb;i++){const off=-a.len/2+(i+.5)*a.len/nb,[x,z]=at(a,off,-(t/2+.12));parts.push(part('box','stone',a.along==='x'?[.5,h*.78,.3]:[.3,h*.78,.5],[x,0,z],1),part('prism','stoneDark',a.along==='x'?[.56,.3,.34]:[.34,.3,.56],[x,h*.78,z],0));}
    armBox(parts,a,'stoneDark',a.len,.18,t+.18,0,0,h,1);                                           // coping
    // weep spouts / drip course near
    for(let i=0;i<Math.floor(a.len/1.7);i++){const [x,z]=at(a,-a.len/2+.9+i*1.7,t/2+.1);if(Math.abs(-a.len/2+.9+i*1.7)<a.len/2-.2)parts.push(part('box','stoneDark',[.1,.1,.18],[x,h-.28,z],0));}
    if(merlon){
      const n=Math.max(2,Math.floor(a.len/.95));
      for(let i=0;i<n;i++){const off=-a.len/2+(i+.5)*a.len/n;armBox(parts,a,'stoneDark',a.along==='x'?.5:.5,.55,t*.62,off,-t*.12,h+.18,1);
        // arrow slit below each other merlon
        if(i%2===0){const [x,z]=at(a,off,-t/2-.01);parts.push(part('box','iron',a.along==='x'?[.07,.3,.04]:[.04,.3,.07],[x,h*.55,z],0));}}
    }
    parts.push(far(armBox2s(a,h,t,wm)));
  }
  if(axis==='corner'){
    // round corner tower: drum, corbel ring, conical cap
    const dr=t+.55;
    cyl(parts,wm,dr*1.5,h+.8,[0,0,0],2,10);cyl(parts,'stoneDark',dr*1.5+.3,.25,[0,0,0],1,10);cyl(parts,'stoneDark',dr*1.5+.2,.22,[0,h+.8,0],1,10);
    parts.push(part('cone',roofMaterial(ctx),[dr*1.5+.5,1.4,dr*1.5+.5],[0,h+1.02,0],1,undefined,10));
  }
  return {parts};
};
function armBox2s(a:Arm,h:number,t:number,m:M):Part{const [x,z]=at(a,0,0);return part('box',m,a.along==='x'?[a.len,h,t]:[t,h,a.len],[x,0,z],2);}
