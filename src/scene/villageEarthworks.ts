/** Village grammar: tiled earthworks and water lines (trench, moat, canal, aqueduct). 4 x 4 m cells that know their neighbours (villageJoin.ts):
 * straight cells run edge to edge, the last cell of a run closes with a bank or a head wall, corners, tees and crosses fill their junction.
 * The revetment follows the society's wall style (SkinForms.wall: timber, dry stone, mud brick, dressed stone), so a Skoldar ditch is not a Hanrei ditch.
 * Cross-sections are FIXED so neighbouring cells meet flush; variety lives in details that stay inside the cell. */
import {beam,chance,far,part,range,type Part} from './buildingParts';
import type {FamilyContext,Generator,WallStyle} from './buildingHelpers';
import {box,cyl,type V3} from './buildingKit';
import {layoutOf,maskOf,type Layout} from './villageJoin';
import type {CarvedMaterialId as M} from './carvedPalette';

type P=Part[];
const DIRS=[{k:'px' as const,x:1,z:0},{k:'nx' as const,x:-1,z:0},{k:'pz' as const,x:0,z:1},{k:'nz' as const,x:0,z:-1}];
type Dir=typeof DIRS[number];
const style=(ctx:FamilyContext):WallStyle=>ctx.form?.wall??'log';
/** Box laid along direction d from `a0` to `a1` out from the centre, `lat` (signed, world axis across the run) off the run axis, width `th`. */
function run(p:P,d:Dir,mat:M,a0:number,a1:number,th:number,h:number,y:number,lat=0,lod:0|1|2=1){
  const len=Math.abs(a1-a0),c=(a0+a1)/2;if(len<.02)return;
  p.push(part('box',mat,d.x?[len,h,th]:[th,h,len],d.x?[d.x*c,y,lat]:[lat,y,d.z*c],lod));
}
/** A ridge-shaped spoil bank along direction d from a0 to a1 (symmetric prism), `lat` off the run axis, width `bw`. */
function bank(p:P,d:Dir,mat:M,a0:number,a1:number,bw:number,bh:number,lat:number,lod:0|1|2=1){
  const len=Math.abs(a1-a0),c=(a0+a1)/2;if(len<.02)return;
  p.push(part('prism',mat,[bw,bh,len],d.x?[d.x*c,0,lat]:[lat,0,d.z*c],lod,d.x?[0,Math.PI/2,0]:undefined));
}
const sideOf=(d:Dir,s:number)=>({lx:-d.z*s,lz:d.x*s,lat:d.x?d.x*s:-d.z*s});
/** Generic cut: floor, revetment faces and banks for every present arm plus the junction. `ww` clear width, `bw` bank width. A lone cell closes both ends. */
function cut(p:P,lay:Layout,w:number,o:{ww:number;bw:number;bh:number;bankMat:M;floor:M;floorH:number;revet?:M;revetH?:number;revetT?:number}){
  const half=w/2,{ww,bw,bh}=o,iso=lay.kind==='isolated',hx=iso?half-bw:half,present=DIRS.filter(d=>lay[d.k]),rt=o.revetT??.1;
  for(const d of present){
    run(p,d,o.floor,0,hx,ww,o.floorH,0,0,2);
    for(const s of[-1,1]){
      const {lx,lz}=sideOf(d,s),latPresent=DIRS.some(q=>lay[q.k]&&q.x===lx&&q.z===lz),opp=DIRS.find(q=>q.x===-d.x&&q.z===-d.z)!,oppPresent=lay[opp.k];
      const side=d.x?lz:lx,c0=latPresent?ww/2+bw:oppPresent?0:-(ww/2+bw);
      bank(p,d,o.bankMat,c0,hx,bw,bh,side*(ww/2+bw/2),1);
      if(o.revet)run(p,d,o.revet,latPresent?ww/2:oppPresent?0:-ww/2,hx,rt,o.revetH??.5,0,side*(ww/2+rt/2),1);
    }
  }
  // inner corner squares where two perpendicular arms meet
  for(const a of present)for(const b of present){
    if(a.x*b.x+a.z*b.z!==0||a.k>b.k)continue;
    p.push(part('box',o.bankMat,[bw,bh*.55,bw],[(a.x+b.x)*(ww/2+bw/2),0,(a.z+b.z)*(ww/2+bw/2)],0));
  }
  // closure: a bank across every open end (the missing side of a run's last cell, and both ends of a lone cell)
  for(const d of present){
    const opp=DIRS.find(q=>q.x===-d.x&&q.z===-d.z)!;
    if(iso){p.push(part('prism',o.bankMat,[bw,bh,ww+2*bw],[d.x*(hx+bw/2),0,0],1));continue;}
    if(!lay[opp.k]){const k=-(ww/2+bw/2);p.push(part('prism',o.bankMat,[bw,bh,ww+2*bw],[d.x*k,0,d.z*k],1,d.x?undefined:[0,Math.PI/2,0]));}
  }
}

/** Far-tier silhouette of a cut: the floor strip and the two bank ridges of every arm (never one slab over the whole cell). */
function farCut(p:P,lay:Layout,w:number,ww:number,bw:number,bh:number,floor:M,bankMat:M){
  const half=w/2;
  for(const d of DIRS.filter(q=>lay[q.k])){
    run(p,d,floor,0,half,ww,floor==='water'?.12:bh,0,0,2);p[p.length-1]=far(p[p.length-1]);
    for(const s of[-1,1]){run(p,d,bankMat,0,half,bw,bh,0,s*(ww/2+bw/2),2);p[p.length-1]=far(p[p.length-1]);}
  }
}
/** Trench: spoil banks either side of a duckboarded cut, revetted by the society's wall style (timber planks, dry stone, mud, dressed stone), sharpened
 * stakes on the outer lip, a plank crossing on some straight cells. Corners, tees, run ends and isolated pits close properly. */
export const trench:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,lay=layoutOf(maskOf(ctx),w,d,1.5),st=style(ctx),ww=1.5,bw=1.15,bh=.7;
  const rev:M=st==='log'?'woodLight':st==='drystone'?'stone':st==='mudbrick'?'mud':'stoneDark';
  cut(parts,lay,w,{ww,bw,bh,bankMat:st==='mudbrick'?'mud':'woodDark',floor:'woodMid',floorH:.06,revet:rev,revetH:.55,revetT:.08});
  for(const dir of DIRS.filter(q=>lay[q.k])){
    for(let i=0;i<4;i++){const c=.3+i*.45;parts.push(part('box','woodLight',dir.x?[.12,.04,ww-.14]:[ww-.14,.04,.12],[dir.x*c,.06,dir.z*c],0));}
    if(ctx.era>=1&&ctx.wealth>.1)for(const s of[-1,1]){for(let i=0;i<4;i++){const c=.25+i*.42,lat=s*(ww/2+bw*.8);parts.push(part('cone','woodLight',[.12,.5,.12],[dir.x?dir.x*c:lat,bh*.45,dir.z?dir.z*c:lat],0,undefined,4));}}
  }
  if(lay.kind==='straight'&&chance(r,.3)){const horiz=lay.px,c=range(r,-.7,.7);parts.push(part('box','woodLight',horiz?[.8,.12,ww+1.2]:[ww+1.2,.12,.8],horiz?[c,bh*.7,0]:[0,bh*.7,c],1));}
  farCut(parts,lay,w,ww,bw,bh*.8,'woodDark','woodDark');
  void box;
  return {parts};
};

/** Moat: a water-filled cut between kerbs and grassy banks (Bodiam, moated manors). Kerb is timber, dry stone, mud brick or dressed stone by wall style;
 * reeds in the shallows, a stone mooring post on some straight cells, a bank across where a run stops. */
export const moat:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,lay=layoutOf(maskOf(ctx),w,d,2),st=style(ctx),ww=1.8,bw=.7,bh=.42;
  const kerb:M=st==='log'?'woodDark':st==='mudbrick'?'mud':ctx.era>=3?'stone':'stoneDark';
  cut(parts,lay,w,{ww,bw,bh,bankMat:'moss',floor:'water',floorH:.14,revet:kerb,revetH:.4,revetT:.28});
  for(const dir of DIRS.filter(q=>lay[q.k]))for(let i=0;i<3;i++){const c=.4+i*.55,s=i%2?1:-1,lat=s*(ww/2-.1);parts.push(part('cone','foliage',[.1,.55,.1],[dir.x?dir.x*c:lat,.1,dir.z?dir.z*c:lat],0,undefined,4));}
  if(lay.kind==='straight'&&chance(r,.3)){const horiz=lay.px,c=range(r,-.8,.8);cyl(parts,'stoneDark',.3,.7,horiz?[c,0,ww/2+.35]:[ww/2+.35,0,c],0,6);}
  farCut(parts,lay,w,ww,bw,bh,'water','moss');
  return {parts};
};

/** Canal: kerbed water channel with a towpath on one bank and mooring bollards (Roman fossa, English narrow-boat canals); a run ends at a plank stop-gate with
 * a windlass; some straight cells carry a small footbridge. Kerb by wall style. */
export const canal:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,lay=layoutOf(maskOf(ctx),w,d,2),st=style(ctx),ww=1.7,bw=.62,bh=.3;
  const kerb:M=st==='log'?'woodDark':st==='mudbrick'?'mud':'stoneDark';
  cut(parts,lay,w,{ww,bw,bh,bankMat:'foliageDark',floor:'water',floorH:.12,revet:kerb,revetH:.42,revetT:.22});
  for(const dir of DIRS.filter(q=>lay[q.k])){
    const side=dir.x?1:1,lat=side*(ww/2+.22+.26);
    run(parts,dir,'woodInlay',.1,w/2-.02,.46,.05,.3,dir.x?lat:lat,0);
    if(ctx.era>=1){const c=1.0;parts.push(part('cylinder','woodDark',[.16,.3,.16],[dir.x?dir.x*c:lat,.34,dir.z?dir.z*c:lat],0,undefined,6));}
  }
  if(lay.kind==='end'&&lay.capDir){const cd=lay.capDir,k=ww/2*.9;
    box(parts,'woodDark',[cd.x?.18:ww+.3,.5,cd.z?.18:ww+.3],[cd.x*k,0,cd.z*k],1);
    cyl(parts,'woodMid',.14,ww+.2,[cd.x*k,.5,cd.z*k],0,6,cd.x?[Math.PI/2,0,0]:[0,0,Math.PI/2]);}
  if(lay.kind==='straight'&&ctx.era>=2&&chance(r,.18)){const horiz=lay.px;
    for(const s of[-1,1])parts.push(part('box','stone',horiz?[.8,.55,.4]:[.4,.55,.8],horiz?[0,.3,s*(ww/2+.3)]:[s*(ww/2+.3),.3,0],1));
    parts.push(part('box','stone',horiz?[.8,.2,ww+1.1]:[ww+1.1,.2,.8],[0,.85,0],1),part('box','stoneDark',horiz?[.9,.1,ww+1.2]:[ww+1.2,.1,.9],[0,1.05,0],0));}
  farCut(parts,lay,w,ww,bw,bh,'water','foliageDark');
  return {parts};
};

/** Aqueduct: an arcade carrying a stone trough (Pont du Gard, Segovia). A pier stands at each cell centre and half-arches spring to the cell edge, where
 * neighbouring half-arches meet at the crown, so cells tile into a continuous arcade. Corners, tees and crosses share one pier; the last cell of a line
 * ends in a header tank. Piers and ring are dressed stone, or plastered brick under a mud-brick society. */
export const aqueduct:Generator=(ctx,r)=>{
  const parts:P=[],{w,d}=ctx.footprint,lay=layoutOf(maskOf(ctx),w,d,1.2),st=style(ctx),mat:M=st==='mudbrick'?'plaster':'stone',dk:M=st==='mudbrick'?'mud':'stoneDark';
  const pw=.95,tw=1.25,arch=w/2-pw/2,spring=1.15,H=spring+arch+.62,len=w/2;void r;void d;
  box(parts,dk,[pw+.3,.35,pw+.3],[0,0,0],1);box(parts,mat,[pw,H-.35,pw],[0,.35,0],2);
  const n=5;
  for(const dir of DIRS.filter(q=>lay[q.k])){
    for(let i=0;i<n;i++){
      const phi=(i+.5)/n*(Math.PI/2),along=len-arch*Math.cos(phi),y=spring+arch*Math.sin(phi),alpha=Math.PI/2-phi;
      const rot:V3=dir.x?[0,0,dir.x*alpha*1]:[-dir.z*alpha,0,0];
      parts.push(part('box',i%2?mat:dk,dir.x?[arch/n*1.05,.5,tw]:[tw,.5,arch/n*1.05],[dir.x*along,y-.1,dir.z*along],1,rot));
      // spandrel block above the voussoir up to the crown line
      const topY=spring+arch+.4,low=y+.34;
      if(topY-low>.08)parts.push(part('box',mat,dir.x?[arch/n+.02,topY-low,tw]:[tw,topY-low,arch/n+.02],[dir.x*along,low,dir.z*along],0));
    }
    parts.push(part('box',mat,dir.x?[len,H-(spring+arch+.4),tw]:[tw,H-(spring+arch+.4),len],[dir.x*len/2,spring+arch+.4,dir.z*len/2],2));
    // trough: floor, two coursed walls, water; the stone course under it
    parts.push(part('box',mat,dir.x?[len,.14,tw]:[tw,.14,len],[dir.x*len/2,H,dir.z*len/2],2));
    for(const s of[-1,1]){const lat=s*(tw/2-.08);parts.push(part('box',dk,dir.x?[len,.46,.16]:[.16,.46,len],[dir.x?dir.x*len/2:lat,H+.1,dir.z?dir.z*len/2:lat],1));}
    parts.push(part('box','water',dir.x?[len,.07,tw-.3]:[tw-.3,.07,len],[dir.x*len/2,H+.14,dir.z*len/2],2));
    parts.push(far(part('box',mat,dir.x?[len,H,tw]:[tw,H,len],[dir.x*len/2,0,dir.z*len/2],2)));
  }
  box(parts,mat,[tw,.14,tw],[0,H,0],2);box(parts,'water',[tw-.3,.07,tw-.3],[0,H+.14,0],2);
  for(const s of[-1,1]){box(parts,dk,[.16,.46,tw],[s*(tw/2-.08),H+.1,0],0);}
  if(lay.kind==='end'||lay.kind==='isolated'){
    // header tank / outfall closing the run: a raised cistern with a rim, a sluice post and a spout
    const cd=lay.capDir??{x:-1,z:0},cx=cd.x*.15,cz=cd.z*.15;
    box(parts,mat,[tw+.5,.9,tw+.5],[cx,H,cz],2);box(parts,'water',[tw+.2,.06,tw+.2],[cx,H+.9,cz],1);box(parts,dk,[tw+.62,.14,tw+.62],[cx,H+.9,cz],1);
    parts.push(beam('woodDark',[cx,H+.95,cz+.2],[cx,H+1.5,cz+.2],.1,0));
  }
  return {parts};
};
