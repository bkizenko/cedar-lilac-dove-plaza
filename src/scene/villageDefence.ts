/** Village grammar: defensive lines (palisade, gatehouse, stone wall). See buildingFamiliesVillage.ts.
 * Every cell is 4 x 4 m, knows its neighbours (villageJoin.ts) and runs to the cell edge so a line of cells tiles into one wall: end caps,
 * corners, tees and crosses get their own hub. Heights and thicknesses are FIXED per style (no per-cell steps); variety is in details.
 * The society's skin chooses the WALL STYLE (SkinForms.wall: log stockade / dry stone / mud brick / ashlar), the GATE SHAPE (stockade towers,
 * round arch, trabeated lintel, battered pylon, tiled pavilion) and the coping (SkinForms.cap). Near-only detail is LOD 0; a plank/stone
 * impostor replaces the rows beyond the mid distance. */
import {beam,chance,far,part,pick,range,type Part,type Rng} from './buildingParts';
import {roofMaterial,type FamilyContext,type Generator,type WallStyle} from './buildingHelpers';
import {box,cyl,ladder,type V3} from './buildingKit';
import {armAt,layoutOf,maskOf,type Arm,type Layout} from './villageJoin';
import type {CarvedMaterialId as M} from './carvedPalette';

const TAU=Math.PI*2;
type P=Part[];
const armBox=(p:P,a:Arm,mat:M,len:number,h:number,th:number,off:number,lat:number,y:number,lod:0|1|2=1,rot=0)=>{
  const [x,z]=armAt(a,off,lat);p.push(part('box',mat,a.along==='x'?[len,h,th]:[th,h,len],[x,y,z],lod,rot?[0,rot,0]:undefined));};
const ALONG=(a:Arm):V3|undefined=>a.along==='x'?[0,Math.PI/2,0]:undefined;
/** Coping laid along an arm: flat cap, tile ridge, thatch roll or turf, per the society's SkinForms.cap. */
function coping(p:P,a:Arm,cap:'plain'|'tile'|'thatch'|'turf',len:number,t:number,y:number,plainMat:M='stoneDark'){
  const [x,z]=armAt(a,0,0);
  if(cap==='tile')p.push(part('prism','tile',[t+.5,.34,len],[x,y,z],1,ALONG(a)),part('box','stoneDark',a.along==='x'?[len,.07,.12]:[.12,.07,len],[x,y+.33,z],0));
  else if(cap==='thatch')p.push(part('cylinder','thatch',[t+.34,len,t*.5+.2],[x,y+.12,z],1,a.along==='x'?[0,0,Math.PI/2]:[Math.PI/2,0,0],6));
  else if(cap==='turf')p.push(part('box','moss',a.along==='x'?[len,.2,t+.12]:[t+.12,.2,len],[x,y,z],1),part('prism','moss',[t+.1,.22,len],[x,y+.2,z],0,ALONG(a)));
  else armBox(p,a,plainMat,len,.16,t+.14,0,0,y,1);
}
const wallStyle=(ctx:FamilyContext):WallStyle=>ctx.form?.wall??'log';

// ---------------------------------------------------------------- palisade
/** Light barrier by the society's wall style. log: hewn-log stockade (Trelleborg, Biskupin) with lashed rails, outer bank and a wall-walk;
 * ashlar: the same stockade set on a dressed-stone footing; dry stone: a rubble dyke topped with a woven hurdle and thorn bundles; mud brick:
 * an adobe boma wall, battered, plastered, studded with sharpened stakes along a rounded coping. */
export const palisade:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,st=wallStyle(ctx),cap=ctx.form?.cap??'plain';
  const h=st==='drystone'?2.0:st==='mudbrick'?2.15:2.85,walk=ctx.era>=1&&ctx.wealth>.15&&(st==='log'||st==='ashlar'),t=st==='mudbrick'?.7:st==='drystone'?.85:.5;
  const lay=layoutOf(maskOf(ctx),w,d,t);
  for(const a of lay.arms){
    if(st==='drystone'){
      // dyke: battered rubble 1.05 high, a hurdle fence of withy stakes and weave on top, thorn bundles, through-stones
      armBox(parts,a,'stoneDark',a.len,.34,t+.2,0,0,0,1);armBox(parts,a,'stone',a.len-.04,.72,t-.08,0,0,.34,2);
      armBox(parts,a,'moss',a.len-.02,.1,t*.7,0,0,1.06,1);
      const n=Math.max(4,Math.round(a.len/.5));
      for(let i=0;i<n;i++){const off=-a.len/2+.25+i*(a.len-.5)/(n-1),[x,z]=armAt(a,off,0),hh=range(r,.95,1.15);parts.push(beam('woodLight',[x,1.06,z],[x,1.06+hh,z],.07,1));}
      for(const y of[1.42,1.78])armBox(parts,a,'straw',a.len-.06,.14,.2,0,0,y,1);
      for(let i=0;i<Math.floor(a.len/.7);i++){const off=-a.len/2+.35+i*.7,[x,z]=armAt(a,off,(i%2?.1:-.1));parts.push(part('box',i%3?'stoneDark':'stone',[range(r,.3,.46),range(r,.2,.3),.2],[x,range(r,.1,.55),z+(a.along==='x'?(i%2?t/2:-t/2):0)],0,[0,range(r,-.3,.3),0]));}
      for(let i=0;i<Math.floor(a.len/1.1);i++){const [x,z]=armAt(a,-a.len/2+.55+i*1.1,0);parts.push(part('cone','foliageDark',[.3,.4,.3],[x,2.1+(i%2)*.04,z+(a.along==='x'?(i%2?.06:-.06):0)],0,undefined,5));}
      {const [fx,fz]=armAt(a,0,0);parts.push(far(part('box','stone',a.along==='x'?[a.len,h,t]:[t,h,a.len],[fx,0,fz],2)));}
    }else if(st==='mudbrick'){
      // adobe boma: sloped footing, plastered body with pilasters, rounded coping and sharpened stakes along the crown
      armBox(parts,a,'mud',a.len,.3,t+.24,0,0,0,1);armBox(parts,a,'plaster',a.len-.02,h-.3,t,0,0,.3,2);
      coping(parts,a,cap==='plain'?'plain':cap,a.len,t,h,'plaster');
      if(cap==='plain'){const n=Math.max(4,Math.round(a.len/.55));for(let i=0;i<n;i++){const off=-a.len/2+.28+i*(a.len-.56)/(n-1),[x,z]=armAt(a,off,0);parts.push(part('cone','woodLight',[.16,.62,.16],[x,h+.16,z],1,undefined,4));}}
      const np=Math.max(1,Math.floor(a.len/1.9));for(let i=0;i<np;i++){const off=-a.len/2+(i+.5)*a.len/np;for(const s of[-1,1])armBox(parts,a,'mud',.34,h-.3,.16,off,s*(t/2+.07),.3,1);}
      for(let i=0;i<Math.floor(a.len/.8);i++){const off=-a.len/2+.4+i*.8,[x,z]=armAt(a,off,0),zz=a.along==='x'?t/2+.02:0;parts.push(part('box','woodDark',a.along==='x'?[.1,.1,.34]:[.34,.1,.1],[x+(a.along==='z'?t/2+.02:0),h*.72+(i%2)*.1,z+zz*(i%2?1:-1)],0));}
      {const [fx,fz]=armAt(a,0,0);parts.push(far(part('box','plaster',a.along==='x'?[a.len,h,t]:[t,h,a.len],[fx,0,fz],2)));}
    }else{
      // log stockade (also the ashlar society's light wall, on a stone footing)
      const foot=st==='ashlar';
      const log=(a:Arm,off:number,lat:number)=>{
        const [x,z]=armAt(a,off,lat),sh=h*range(r,.9,1.06),rad=range(r,.2,.27),tone:M=chance(r,.3)?'woodDark':'woodMid',y0=foot?.45:0;
        parts.push(part('cylinder',tone,[rad*2,sh,rad*2*.92],[x,y0,z],1,undefined,6),part('cone','woodLight',[rad*1.9,.42,rad*1.9*.92],[x,y0+sh,z],1,undefined,6));
        if(chance(r,.5))parts.push(part('box','woodEdge',[.04,sh*.5,.04],[x+rad*.8,y0+sh*.2,z],0));
      };
      if(foot){armBox(parts,a,'stoneDark',a.len,.2,t+.3,0,0,0,1);armBox(parts,a,'stone',a.len-.04,.3,t+.1,0,0,.2,2);}
      const n=Math.max(3,Math.round(a.len/.4));
      for(let i=0;i<n;i++){const off=-a.len/2+.2+i*(a.len-.4)/(n-1);log(a,off,(i%2?.07:-.07));}
      const y0=foot?.45:0;
      for(const y of[h*.3,h*.7]){armBox(parts,a,'woodDark',a.len-.1,.13,.1,0,.3,y0+y,1);
        for(let i=1;i<n;i+=3){const off=-a.len/2+.2+i*(a.len-.4)/(n-1),[x,z]=armAt(a,off,.3);parts.push(part('box','cloth',[.14,.16,.14],[x,y0+y-.01,z],0));}}
      {const [x,z]=armAt(a,0,-.55);if(!foot)parts.push(part('prism','woodDark',[.9,.42,a.len-.04],[x,0,z],0,ALONG(a)));}
      if(walk){
        armBox(parts,a,'woodLight',a.len-.1,.09,.9,0,.62,y0+h*.62,1);
        for(let i=0;i<=Math.floor(a.len/1.6);i++){const off=-a.len/2+.3+i*(a.len-.6)/Math.max(1,Math.floor(a.len/1.6)),[x,z]=armAt(a,off,.62);parts.push(beam('woodDark',[x,0,z+(a.along==='x'?.3:0)],[x,y0+h*.62,z+(a.along==='x'?.3:0)],.12,1));}
        const [lx,lz]=armAt(a,a.len*.3,.62);ladder(parts,lx,lz-.3,lz+.5,y0+h*.62,7,0);
      }
      const [fx,fz]=armAt(a,0,0);parts.push(far(part('box','woodMid',a.along==='x'?[a.len-.2,h+y0,.3]:[.3,h+y0,a.len-.2],[fx,0,fz],2)));
    }
  }
  // hubs and end caps: a thick watch post at corners, tees, crosses and the open end of a run; a lone cell is capped at both ends
  const post=(x:number,z:number,big:boolean)=>{
    if(st==='drystone'||st==='mudbrick'){
      const m:M=st==='drystone'?'stone':'plaster',hh=h+(big?.9:.35);cyl(parts,m,t*1.55,hh,[x,0,z],2,8);cyl(parts,'stoneDark',t*1.55+.16,.18,[x,hh,z],1,8);
      parts.push(part('cone',cap==='tile'?'tile':cap==='thatch'?'thatch':cap==='turf'?'moss':'stoneDark',[t*1.7,.7,t*1.7],[x,hh+.12,z],1,undefined,8));return;}
    parts.push(part('cylinder','woodDark',[.7,h+.9,.7],[x,0,z],1,undefined,8),part('cone','woodLight',[.7,.7,.7],[x,h+.9,z],1,undefined,8));
    if(big&&walk)parts.push(part('box','woodLight',[1.4,.1,1.4],[x,h*.62,z],1));
  };
  if(lay.hub)post(0,0,true);
  if(lay.kind==='isolated')for(const s of[-1,1])post(s*(w/2-(st==='drystone'||st==='mudbrick'?t*1.55+.16:.7)/2-.04),0,false);
  return {parts};
};

// ---------------------------------------------------------------- stone curtain
/** Heavy wall by the society's style. ashlar: battered footing, staggered courses, buttress piers, weep spouts, coping, merlons and slits
 * (Hadrian, Conwy, Carcassonne). dry stone: a thick rubble wall of fitted stones with through-stones, turf or thatch coping and a stepped
 * round bastion (broch, hillfort ramparts, Inca terraces). mud brick: tall plastered rammed-earth wall with pilasters, putlog holes, spouts and
 * a rounded parapet (Sahel, Mesopotamian and Egyptian town walls). Heights are fixed per style so cells meet flush. */
export const stoneWall:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,st0=wallStyle(ctx),st:WallStyle=st0==='log'?'drystone':st0,cap=ctx.form?.cap??'plain';
  const t=st==='drystone'?1.05:st==='mudbrick'?.95:.95,h=(st==='mudbrick'?3.1:st==='drystone'?2.7:2.8)*(ctx.era>=3?1.12:1),lay=layoutOf(maskOf(ctx),w,d,t);
  const wm:M=st==='mudbrick'?'plaster':'stone',merlon=st==='ashlar'&&ctx.era>=2&&ctx.wealth>.2||st==='mudbrick'&&cap==='plain',courses=7;
  for(const a of lay.arms){
    if(st==='ashlar'){
      armBox(parts,a,'stoneDark',a.len,.32,t+.24,0,0,0,1);armBox(parts,a,wm,a.len,h-.32,t,0,0,.32,2);
      for(let i=1;i<courses;i++){const y=.32+(h-.32)*i/courses;
        armBox(parts,a,'stoneDark',a.len,.035,t+.035,0,0,y,0);
        for(let j=0;j<Math.floor(a.len/.9);j++){const o=-a.len/2+.45+j*.9+(i%2?.45:0);if(Math.abs(o)<a.len/2-.1){for(const f of[-1,1]){const [x,z]=armAt(a,o,f*(t/2+.01));parts.push(part('box','stoneDark',a.along==='x'?[.035,(h-.32)/courses,.03]:[.03,(h-.32)/courses,.035],[x,y,z],0));}}}}
      const nb=Math.max(0,Math.floor(a.len/3.2));
      for(let i=0;i<nb;i++){const off=-a.len/2+(i+.5)*a.len/nb,[x,z]=armAt(a,off,-(t/2+.12));parts.push(part('box','stone',a.along==='x'?[.5,h*.78,.3]:[.3,h*.78,.5],[x,0,z],1),part('prism','stoneDark',a.along==='x'?[.56,.3,.34]:[.34,.3,.56],[x,h*.78,z],0));}
      coping(parts,a,cap,a.len,t,h,'stoneDark');
      for(let i=0;i<Math.floor(a.len/1.7);i++){const o=-a.len/2+.9+i*1.7,[x,z]=armAt(a,o,t/2+.1);if(Math.abs(o)<a.len/2-.2)parts.push(part('box','stoneDark',[.1,.1,.18],[x,h-.28,z],0));}
      if(merlon&&cap==='plain'){const n=Math.max(2,Math.floor(a.len/.95));
        for(let i=0;i<n;i++){const off=-a.len/2+(i+.5)*a.len/n;armBox(parts,a,'stoneDark',.5,.55,t*.62,off,-t*.12,h+.18,1);
          if(i%2===0){const [x,z]=armAt(a,off,-t/2-.01);parts.push(part('box','iron',a.along==='x'?[.07,.3,.04]:[.04,.3,.07],[x,h*.55,z],0));}}}
    }else if(st==='drystone'){
      // fitted rubble: a battered core, then rows of irregular blocks proud of the face, a few through-stones, capped with turf or thatch
      armBox(parts,a,'stoneDark',a.len,.4,t+.3,0,0,0,1);armBox(parts,a,'stone',a.len,h-.4,t,0,0,.4,2);armBox(parts,a,'stone',a.len-.02,h*.6,t+.14,0,0,.4,1);
      const rows=6;for(let i=0;i<rows;i++){const y=.45+i*(h-.7)/rows,hh=(h-.7)/rows*.86;let off=-a.len/2+.1+((i*37)%5)*.08;
        while(off<a.len/2-.3){const bw=Math.min(range(r,.45,.95),a.len/2-off-.02);for(const f of[-1,1]){const [x,z]=armAt(a,off+bw/2,f*(t/2+.03));parts.push(part('box',(i+Math.floor(off*3))%3?'stone':'stoneDark',a.along==='x'?[bw-.05,hh,.12]:[.12,hh,bw-.05],[x,y,z],0,[0,range(r,-.04,.04),0]));}off+=bw;}}
      for(let i=0;i<Math.floor(a.len/1.3);i++){const o=-a.len/2+.6+i*1.3,[x,z]=armAt(a,o,0);parts.push(part('box','stoneDark',a.along==='x'?[.26,.2,t+.22]:[t+.22,.2,.26],[x,h*.5,z],0));}
      coping(parts,a,cap==='plain'?'turf':cap,a.len,t,h,'moss');
      if(cap==='plain'||cap==='turf')for(let i=0;i<Math.floor(a.len/.9);i++){const [x,z]=armAt(a,-a.len/2+.45+i*.9,(i%2?.15:-.15));parts.push(part('cone','foliageDark',[.2,.3,.2],[x,h+.34,z],0,undefined,4));}
    }else{
      // mud brick / rammed earth: battered plastered body, pilasters, putlog holes, spouts, rounded parapet
      armBox(parts,a,'mud',a.len,.38,t+.3,0,0,0,1);armBox(parts,a,'plaster',a.len,h-.38,t,0,0,.38,2);armBox(parts,a,'plaster',a.len-.02,h*.5,t+.1,0,0,.38,1);
      const np=Math.max(1,Math.floor(a.len/2));for(let i=0;i<np;i++){const off=-a.len/2+(i+.5)*a.len/np;for(const f of[-1,1])armBox(parts,a,'mud',.5,h-.5,.2,off,f*(t/2+.1),.38,1);}
      for(let i=0;i<Math.floor(a.len/.8);i++){const o=-a.len/2+.4+i*.8,[x,z]=armAt(a,o,0);for(const y of[h*.45,h*.72]){parts.push(part('box','recess',a.along==='x'?[.1,.1,t+.04]:[t+.04,.1,.1],[x+(i%2?.2:0),y,z],0));}}
      for(let i=0;i<Math.floor(a.len/2);i++){const o=-a.len/2+.9+i*2,[x,z]=armAt(a,o,t/2+.12);parts.push(part('box','woodDark',[.14,.14,.3],[x,h-.4,z+(a.along==='x'?0:0)],0));}
      armBox(parts,a,'plaster',a.len,.2,t+.16,0,0,h,1);
      if(cap!=='plain')coping(parts,a,cap,a.len,t,h+.2,'plaster');
      else{const n=Math.max(2,Math.floor(a.len/.8));for(let i=0;i<n;i++){const off=-a.len/2+(i+.5)*a.len/n;armBox(parts,a,'plaster',.42,.5,t*.55,off,-t*.18,h+.2,1);parts.push(part('sphere','plaster',a.along==='x'?[.42,.3,t*.55]:[t*.55,.3,.42],[...(()=>{const [x,z]=armAt(a,off,-t*.18);return [x,h+.62,z] as V3;})()],0));}}
    }
    const [fx,fz]=armAt(a,0,0);parts.push(far(part('box',wm,a.along==='x'?[a.len,h,t]:[t,h,a.len],[fx,0,fz],2)));
  }
  // hubs: a round bastion at corners, tees and crosses; a squat end tower at the open end of a run; lone cells get a tower at each end
  const bastion=(x:number,z:number,big:boolean)=>{
    const dr=(st==='drystone'?t+.65:t+.55)*1.5,hh=h+(big?.9:.5);
    cyl(parts,wm,dr,hh,[x,0,z],2,10);cyl(parts,'stoneDark',dr+.3,.25,[x,0,z],1,10);cyl(parts,'stoneDark',dr+.2,.22,[x,hh,z],1,10);
    if(st==='drystone'){for(let i=1;i<4;i++)cyl(parts,'stoneDark',dr+.06,.05,[x,hh*i/4,z],0,10);parts.push(part('cone',cap==='thatch'||cap==='plain'?'thatch':cap==='turf'?'moss':'tile',[dr+.7,1.5,dr+.7],[x,hh+.2,z],1,undefined,10));}
    else if(st==='mudbrick'){for(let i=0;i<8;i++){const a2=i/8*TAU;parts.push(part('sphere','plaster',[.5,.34,.5],[x+Math.cos(a2)*(dr/2-.06),hh+.5,z+Math.sin(a2)*(dr/2-.06)],0));}for(let i=0;i<2;i++)parts.push(part('box','recess',[.07,.32,.07],[x+(i?.4:-.4)*0,h*.6,z+dr/2],0));}
    else parts.push(part('cone',roofMaterial(ctx),[dr+.5,1.4,dr+.5],[x,hh+.22,z],1,undefined,10));
  };
  if(lay.hub)bastion(0,0,lay.kind!=='end');
  if(lay.kind==='isolated')for(const s of[-1,1])bastion(s*(w/2-(((st==='drystone'?t+.65:t+.55)*1.5)+.3)/2-.04),0,false);
  void pick;void box;
  return {parts};
};

// ---------------------------------------------------------------- gates
const leafPair=(p:P,open:boolean,span:number,hh:number,y0:number,z:number,mat:M='woodMid')=>{
  if(open){for(const s of[-1,1])p.push(part('box',mat,[.1,hh,span/2-.1],[s*(span/2+.06),y0,z+.1],1),part('box','iron',[.12,.1,span/2-.2],[s*(span/2+.06),y0+hh*.3,z+.1],0),part('box','iron',[.12,.1,span/2-.2],[s*(span/2+.06),y0+hh*.75,z+.1],0));return;}
  for(const s of[-1,1]){
    p.push(part('box',mat,[span/2-.06,hh,.1],[s*span/4,y0,z],1));
    for(const y of[.3,hh*.45,hh-.4])p.push(part('box','iron',[span/2-.12,.1,.04],[s*span/4,y0+y,z+.06],0));
    for(let i=1;i<4;i++)p.push(part('box','woodDark',[.03,hh-.1,.02],[s*(i*span/8),y0+.02,z+.06],0));
  }
  p.push(part('box','woodEdge',[span+.3,.12,.1],[0,y0+hh*.52,z-.1],0));
};
/** Gate by the society's gate shape. Passage opens through the cell centre along Z, walls run along X (the live game yaws it with the gate's
 * facing); `ctx.gateOpen` swings the leaves back against the towers and raises the portcullis. */
export const gate:Generator=(ctx,r)=>{
  const parts:P=[],{w}=ctx.footprint,shape=ctx.form?.gate??'stockade',open=!!ctx.gateOpen,st=wallStyle(ctx),cap=ctx.form?.cap??'plain';
  const rich=ctx.era>=3&&ctx.wealth>.45;
  // flanking wall stubs in the society's own style run to the cell edge from tower to edge
  const stubs=(inner:number,hgt:number,mat:M,matDark:M,thick:number)=>{
    const stub=w/2-inner;if(stub<.2)return;
    for(const s of[-1,1]){const xx=s*(inner+stub/2);
      parts.push(part('box',mat,[stub,hgt,thick],[xx,0,0],2),part('box',matDark,[stub,.28,thick+.18],[xx,0,0],1),part('box',matDark,[stub,.16,thick+.14],[xx,hgt,0],1));
      for(let i=1;i<5;i++)parts.push(part('box',matDark,[stub,.03,thick+.03],[xx,hgt*i/5,0],0));}
  };
  if(shape==='stockade'){
    const towers=ctx.era>=1&&(ctx.wealth>.3||ctx.era>=2),h=3.45,opening=2.0,roof=roofMaterial(ctx),tw=.95;
    for(const s of[-1,1]){const x=s*(opening/2+tw/2);
      if(towers){
        parts.push(part('box','woodMid',[tw,h+.6,1.05],[x,0,0],2),part('box','woodDark',[tw+.12,.14,1.17],[x,h*.5,0],1));
        parts.push(part('box','woodDark',[tw+.4,.14,1.5],[x,h+.6,0],1),part('box','woodMid',[tw+.3,.62,1.4],[x,h+.74,0],1));
        for(const f of[-1,1])parts.push(part('box','woodDark',[.14,.3,.06],[x+f*.2,h+.9,.72],0));
        parts.push(part('pyramid',roof,[tw+.7,1.05,1.7],[x,h+1.36,0],2));
        parts.push(beam('woodLight',[x+s*(tw/2+.05),.2,-.5],[x+s*(tw/2+.05),h*.5,-.5],.1,0));
      }else{parts.push(part('cylinder','woodDark',[.62,h+.4,.56],[x,0,0],2,undefined,8),part('cone','woodLight',[.64,.7,.58],[x,h+.4,0],1,undefined,8));parts.push(part('box','woodMid',[tw*.5,.12,.9],[x,h*.5,0],0));}
      const stub=w/2-(opening/2+tw+.05);
      if(stub>.25){const n=Math.max(2,Math.round(stub/.38));for(let i=0;i<n;i++){const xx=s*(opening/2+tw+.05+(i+.5)*stub/n),sh=h*.82*(.94+((i*7)%5)*.025);
        parts.push(part('cylinder',i%3?'woodMid':'woodDark',[.4,sh,.38],[xx,0,(i%2?.06:-.06)],1,undefined,6),part('cone','woodLight',[.38,.4,.36],[xx,sh,(i%2?.06:-.06)],1,undefined,6));}
        parts.push(far(part('box','woodMid',[stub,h*.82,.3],[s*(opening/2+tw+.05+stub/2),0,0],2)));}
    }
    const deck=opening+2*tw;
    parts.push(part('box','woodDark',[deck,.32,1.0],[0,h-.3,0],2),part('box','woodMid',[deck+.1,.55,.1],[0,h,.5],1),part('box','woodMid',[deck+.1,.55,.1],[0,h,-.5],1));
    for(let i=0;i<=4;i++)parts.push(part('box','woodDark',[.1,.55,.12],[-deck/2+.05+i*(deck-.1)/4,h,.5],0));
    parts.push(beam('iron',[0,h-.35,.5],[0,h-.35,.9],.05,0),part('box','iron',[.04,.3,.04],[0,h-.67,.9],0),part('box','fire',[.2,.26,.2],[0,h-.96,.9],0));
    if(rich&&!open){for(let i=0;i<5;i++)parts.push(part('box','iron',[.07,h-.7,.07],[-opening/2+.2+i*(opening-.4)/4,.5,.12],1));for(const y of[.7,1.6,2.5])parts.push(part('box','iron',[opening-.1,.06,.08],[0,y,.12],0));}
    else leafPair(parts,open,opening,h-.55,0,-.08);
    if(rich&&open)for(let i=0;i<5;i++)parts.push(part('box','iron',[.07,.9,.07],[-opening/2+.2+i*(opening-.4)/4,h-1.6,.12],0));
    return {parts,entry:{x:0,z:.5,width:opening}};
  }
  const op=shape==='lintel'?1.7:shape==='pylon'?1.6:shape==='arch'?1.8:2.0,mat:M=shape==='pavilion'||st==='mudbrick'&&shape==='pylon'?'plaster':'stone',dk:M=mat==='plaster'?'mud':'stoneDark';
  if(shape==='arch'){
    // round-arched stone gatehouse: battered towers with crenels, voussoir arch with keystone, portcullis slot and a deck over the passage
    const H=4.1,tw=1.05,springY=2.2,ar=op/2;
    for(const s of[-1,1]){const x=s*(op/2+tw/2);
      parts.push(part('box',dk,[tw+.2,.4,1.5],[x,0,0],1),part('box',mat,[tw,H+.2,1.3],[x,.4,0],2));
      for(let i=1;i<7;i++)parts.push(part('box',dk,[tw+.03,.035,1.33],[x,.4+(H-.2)*i/7,0],0));
      parts.push(part('box',dk,[tw+.3,.2,1.6],[x,H+.6,0],1));
      for(let i=0;i<3;i++)parts.push(part('box',dk,[.3,.5,.4],[x-.38+i*.38,H+.8,.55],1),part('box',dk,[.3,.5,.4],[x-.38+i*.38,H+.8,-.55],1));
      parts.push(part('box','iron',[.07,.34,.04],[x,H*.6,.67],0),part('box','iron',[.07,.34,.04],[x,H*.6,-.67],0));}
    const n=9;for(let i=0;i<n;i++){const a=Math.PI*i/(n-1),cx=Math.cos(a)*(ar+.14),cy=springY+Math.sin(a)*(ar+.14);parts.push(part('box',i===(n-1)/2?'stone':dk,[.34,.52,1.34],[cx,cy-.12,0],1,[0,0,a-Math.PI/2]));}
    parts.push(part('box','stone',[op+2*tw,H-springY-ar-.1+.6,1.3],[0,springY+ar+.4,0],2));
    parts.push(part('box',dk,[op+2*tw+.3,.22,1.6],[0,H+.5,0],1));
    parts.push(part('box',dk,[op+2*tw+.1,.55,.1],[0,H+.7,.55],1),part('box',dk,[op+2*tw+.1,.55,.1],[0,H+.7,-.55],1));
    for(const s of[-1,1])parts.push(part('box',dk,[.4,springY+.1,1.34],[s*(op/2+.1),.3,0],1));
    if(!open)leafPair(parts,false,op,springY+ar*.5,0,-.2);else leafPair(parts,true,op,springY,0,-.2);
    parts.push(part('box','iron',[.1,.1,.2],[0,springY+ar-.15,.7],0),part('box','fire',[.18,.24,.18],[0,springY+ar-.45,.8],0));
    stubs(op/2+tw,H*.72,mat,dk,1.0);
    return {parts,entry:{x:0,z:.5,width:op}};
  }
  if(shape==='lintel'){
    // trabeated megalithic gate: stepped-battered piers, tapering jambs, monolithic lintel and cornice stones, wall-walk above (Inca doorways, Mycenae)
    const H=3.2,pw=1.1;
    for(const s of[-1,1]){const x=s*(op/2+pw/2);
      parts.push(part('box',dk,[pw+.3,.5,1.5],[x,0,0],1));
      for(let i=0;i<4;i++){const bw=pw-i*.1;parts.push(part('box',i%2?'stone':dk,[bw,(H-.5)/4,1.3-i*.05],[x+s*i*.05,.5+i*(H-.5)/4,0],2));}
      parts.push(beam('stoneDark',[s*(op/2+.02),.1,.66],[s*(op/2-.34),H-.1,.66],.18,0),beam('stoneDark',[s*(op/2+.02),.1,-.66],[s*(op/2-.34),H-.1,-.66],.18,0));}
    parts.push(part('box','stone',[op+2*pw+.4,.55,1.4],[0,H,0],2),part('box',dk,[op+2*pw+.6,.3,1.5],[0,H+.55,0],1));
    parts.push(part('box','stone',[op+2*pw,.95,1.2],[0,H+.85,0],2));
    for(let i=0;i<5;i++)parts.push(part('box',dk,[.5,.28,.34],[-op/2-pw+.35+i*(op+2*pw-.7)/4,H+1.8,.4],1),part('box',dk,[.5,.28,.34],[-op/2-pw+.35+i*(op+2*pw-.7)/4,H+1.8,-.4],1));
    for(let i=0;i<3;i++)parts.push(part('box','stoneDark',[.18,.5,.5],[(i-1)*.7,H+.1,.72],0));
    if(!open)leafPair(parts,false,op-.5,H-.6,0,-.1,'woodDark');else leafPair(parts,true,op-.5,H-.8,0,-.1,'woodDark');
    stubs(op/2+pw,H*.78,mat,dk,1.0);
    return {parts,entry:{x:0,z:.5,width:op}};
  }
  if(shape==='pylon'){
    // battered twin-tower pylon: square-frustum towers (rotated diamond cross-section), cavetto cornice, flag-mast niches, a lintel and a studded leaf
    const H=4.4,bs=1.2,ts=.9,mud=mat==='plaster';
    for(const s of[-1,1]){const x=s*(op/2+bs/2);
      parts.push(part('box',dk,[bs+.3,.3,1.8],[x,0,0],1),part('cylinder',mat,[bs*1.414,H,ts*1.414],[x,.3,0],2,[0,Math.PI/4,0],4));
      parts.push(part('box',dk,[ts+.55,.3,ts+.65],[x,H+.28,0],1),part('box',mat,[ts+.3,.22,ts+.4],[x,H+.58,0],1));
      for(const f of[-1,1]){parts.push(part('box','recess',[.18,H*.55,.07],[x+f*.3,H*.28,.78],0),beam('woodDark',[x+f*.3,H*.3,.84],[x+f*.3,H*.9,.84],.07,0),part('box','clothRed',[.4,.5,.03],[x+f*.3+.22,H*.84,.86],0));}
      if(mud)for(let i=0;i<5;i++)parts.push(beam('woodDark',[x+(i-2)*.25,H*.62+(i%2)*.4,.7],[x+(i-2)*.25,H*.62+(i%2)*.4,1.1],.09,0));
    }
    parts.push(part('box',mat,[op+bs,.9,1.25],[0,H*.62,0],2),part('box',dk,[op+bs*2-.3,.28,1.6],[0,H+.28,0],1));
    parts.push(part('box',dk,[op+bs,.2,1.4],[0,H*.62+.88,0],1));
    if(!open)leafPair(parts,false,op,H*.62,0,-.15,'woodDark');else leafPair(parts,true,op,H*.62,0,-.15,'woodDark');
    stubs(op/2+bs*.95,H*.52,mat,dk,.95);
    return {parts,entry:{x:0,z:.5,width:op}};
  }
  {// pavilion: rammed-earth gate base with a stepped passage, a timber gate hall above with red posts, bracketed two-tier tiled roof with swept eaves
    const base=2.2,hall=1.55,bw=op+1.5;
    parts.push(part('box','stoneDark',[bw+.5,.3,2.0],[0,0,0],1),part('box','plaster',[bw,base,1.7],[0,.3,0],2));
    parts.push(part('box','recess',[op,base-.35,.1],[0,.3,.86],0));
    for(let i=1;i<6;i++)parts.push(part('box','mud',[bw+.02,.03,1.72],[0,.3+base*i/6,0],0));
    for(const s of[-1,1]){parts.push(part('box','stoneDark',[.3,base,1.74],[s*(op/2+.15),.3,0],1));}
    parts.push(part('box','stoneDark',[bw+.3,.26,1.9],[0,.3+base,0],1));
    const y0=.3+base+.26;
    for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('woodMid',[sx*(bw/2-.35),y0,sz*.6],[sx*(bw/2-.35),y0+hall,sz*.6],.2,1));
    for(const x of[-op/3,op/3])for(const sz of[-1,1])parts.push(beam('woodMid',[x,y0,sz*.6],[x,y0+hall,sz*.6],.16,1));
    for(const sz of[-1,1])parts.push(part('box','woodDark',[bw-.5,.22,.2],[0,y0+hall-.2,sz*.6],1),part('box','woodDark',[bw-.5,.12,.14],[0,y0+hall*.5,sz*.6],0));
    parts.push(part('box','woodDark',[bw-.6,.1,1.3],[0,y0,0],1),part('box','woodInlay',[bw-.8,.9,.05],[0,y0+.1,.62],0),part('box','woodInlay',[bw-.8,.9,.05],[0,y0+.1,-.62],0));
    const rh=1.25,s1=bw+.5,l1=2.7;
    parts.push({...part('hip','tile',[l1,rh,s1],[0,y0+hall,0],2,[0,Math.PI/2,0]),inset:s1*.28});
    for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('stoneDark',[sx*(s1/2-.5),y0+hall,sz*(l1/2-.3)],[sx*(s1/2+.14),y0+hall+.32,sz*(l1/2+.1)],.1,0));
    parts.push(part('box','stoneDark',[s1*.55,.14,.2],[0,y0+hall+rh-.05,0],1));
    for(const sx of[-1,1])parts.push(beam('stoneDark',[sx*s1*.27,y0+hall+rh,0],[sx*(s1*.27+.12),y0+hall+rh+.45,0],.1,0));
    if(!open)leafPair(parts,false,op,base-.3,.3,.74,'woodMid');else leafPair(parts,true,op,base-.3,.3,.74,'woodMid');
    parts.push(beam('iron',[0,y0+hall-.25,.65],[0,y0+hall-.55,.8],.04,0),part('box','fire',[.2,.26,.2],[0,y0+hall-.85,.8],0));
    stubs(bw/2,2.1,'plaster','mud',.8);
    void cap;
    return {parts,entry:{x:0,z:.5,width:op}};
  }
};
export type {Layout};
