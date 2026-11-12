/** Civic and economic Option H families: roles the first two batches left as a generic workshop or a
 * longhouse. Each family reads as its function and cites a real-world reference. Pure part specs in metres,
 * origin at footprint base centre, entrance +Z, every part inside the footprint (the generic pipeline in
 * `generateCivic` fits, then guarantees each LOD tier is supported). Variation: era, prosperity (ctx.wealth),
 * material, climate, tradition and, for shrines and courts, the culture's architectural habit; structure varies
 * by seed (bays, roof form, additions, door counts), not paint.
 *
 * Roles with a simulation building id are mapped to it; roles with none carry a PROPOSED id in CIVIC_ROLES
 * for Codex to add (nothing here edits the sim or the existing style map). */
import {beam,chance,fitToFootprint,floatingParts,partsAtLod,partBounds,part,pick,range,seededRandom,type BuildingSpec,type Part,type Rng} from './buildingParts';
import {door,gableRoof,roofMaterial,roofPitch,wallMaterial,windowAt,type FamilyContext,type Generator} from './buildingHelpers';
import type {Culture} from './cultureGrammar';
import {hashSeed} from './buildingParts';

export type CivicFamilyId='marketHall'|'shrine'|'archive'|'lyceum'|'fortBarracks'|'smithy'|'kilnYard'|'storeBarn'|'dryingYard'|'tannery'|'loomHouse'|'bakeryOven'|'windmill'|'horseMill'|'harborStore'|'shipyard'|'beacon'|'gatehouse'|'townHall';
export type CivicContext=FamilyContext&{culture?:Culture;/** fort gate leaves: open by default */gateOpen?:boolean;/** keep ctx.material/climate even when a culture is given */pinned?:boolean};
export type Grammar='terrace'|'colonnade'|'pavilion';
type V3=[number,number,number];
const B=(mat:Part['mat'],size:V3,pos:V3,lod:0|1|2=1,rot?:V3)=>part('box',mat,size,pos,lod,rot);
const Cy=(mat:Part['mat'],dia:number,h:number,pos:V3,lod:0|1|2=1,sides=8)=>part('cylinder',mat,[dia,h,dia],pos,lod,undefined,sides);
const post=(parts:Part[],x:number,z:number,h:number,t=.16,lod:0|1|2=2)=>parts.push(beam('woodDark',[x,0,z],[x,h,z],t,lod));
const stoneOf=(ctx:CivicContext)=>ctx.material==='stone'||ctx.era>=3;
/** Neutral grammar a culture builds shrines in: a stable choice from its key, never a named people. */
export function grammarOf(ctx:CivicContext):Grammar{const h=ctx.culture?hashSeed(ctx.culture.key,'shrine'):ctx.seed;return (['terrace','colonnade','pavilion'] as const)[h%3];}
const ornaments=(ctx:CivicContext)=>ctx.culture&&ctx.culture.architecture.ornament!=='none'?1:0;
/** Closed wall box ring with a gap (front door) of width dw centred on x=0 at +Z. */
function ring(parts:Part[],mat:Part['mat'],cx:number,cz:number,W:number,D:number,h:number,t:number,dw:number,lod:0|1|2=2){
 parts.push(B(mat,[W,h,t],[cx,0,cz-D/2+t/2],lod));
 for(const s of[-1,1])parts.push(B(mat,[t,h,D-2*t],[cx+s*(W/2-t/2),0,cz],lod));
 const seg=(W-dw)/2;for(const s of[-1,1])parts.push(B(mat,[seg,h,t],[cx+s*(dw/2+seg/2),0,cz+D/2-t/2],lod));
}

// ---- Market hall with stalls ring.
const marketHall:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,area=w*d,size=area<70?'small':area<150?'medium':'large';
 const Wh=w*(size==='small'?.7:.5),Dh=d*(size==='small'?.6:.42),h=range(r,3,3.8),zc=-d/2+Dh/2+(size==='small'?.5:1.4),px=range(r,.8,1.3);
 const upper=ctx.era>=3&&ctx.wealth>.45&&size!=='small',stone=stoneOf(ctx);
 // Open hall: plinth, post grid, roof; a solid upper meeting room on late-era halls.
 parts.push(B(stone?'stoneDark':'woodDark',[Wh,.25,Dh],[0,0,zc],2));
 const nx=pick(r,[3,4,5]),nz=pick(r,[2,3]);for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){if(i>0&&i<nx-1&&j>0&&j<nz-1)continue;const x=-Wh/2+.25+i*(Wh-.5)/(nx-1),z=zc-Dh/2+.25+j*(Dh-.5)/(nz-1);parts.push(beam(stone?'stone':'woodDark',[x,.25,z],[x,h,z],stone?.28:.2,2));}
 if(upper){parts.push(B(wallMaterial(ctx),[Wh*.96,1.8,Dh*.96],[0,h,zc],2));for(const x of[-Wh*.3,0,Wh*.3])windowAt(parts,x,h+1,zc+Dh*.48+.03,'z');}
 const eave=h+(upper?1.8:0),pitch=roofPitch(ctx,r),roofMat=roofMaterial(ctx);
 if(chance(r,.5))gableRoof(parts,ctx,Dh,Wh,eave,pitch,0,zc,'x',.2);else parts.push(part('hip',roofMat,[Wh+.5,Math.max(.6,Dh*Math.tan(pitch)*.5),Dh+.5],[0,eave,zc],2,undefined,undefined));
 if(ctx.era>=2&&chance(r,.6)){const cz=zc;parts.push(B('woodDark',[.9,.9,.9],[0,eave+Dh*Math.tan(pitch)*.5-.1,cz],1),part('pyramid',roofMat,[1.1,.8,1.1],[0,eave+Dh*Math.tan(pitch)*.5+.8,cz],1));}
 // Stalls ring: counters with awnings along back and sides, leaving the front gap and the hall clear.
 const nSt=size==='small'?0:size==='medium'?pick(r,[4,5,6]):pick(r,[8,10,12]),sw=1.9,sd=1,placed:{x:number;z:number}[]=[];
 const back=-d/2+sd/2+.2;const slots:V3[]=[];
 for(let x=-w/2+sw/2+.2;x<=w/2-sw/2-.2+1e-6;x+=sw+.25)slots.push([x,0,back]);
 for(let z=back+sd+.5;z<d/2-1.9;z+=sw+.25){slots.push([-w/2+sd/2+.2,0,z],[w/2-sd/2-.2,0,z]);}
 for(const [x,,z] of slots){if(placed.length>=nSt)break;if(Math.abs(x)<Wh/2+.4&&z>zc-Dh/2-.9&&z<zc+Dh/2+.5&&z>back+.1)continue;
  const side=Math.abs(x)>w/2-sd-.3&&z>back+.1;const sx=side?sd:sw,sz=side?sw:sd;parts.push(B('woodMid',[sx,.9,sz*.45],[x,0,z+(side?0:sd*.2)],1),part('wedge',chance(r,.5)?'cloth':'woodLight',[sx+.2,.4,sz+.1],[x,1.9,z],1));
  for(const dx of[-1,1])for(const dz of[-1,1])parts.push(beam('woodDark',[x+dx*(sx/2-.07),0,z+dz*(sz/2-.07)],[x+dx*(sx/2-.07),1.9,z+dz*(sz/2-.07)],.07,0));placed.push({x,z});}
 if(size==='large'){parts.push(Cy('stone',1.1,.9,[0,0,d/2-2.6],2,10));parts.push(Cy('stoneDark',.5,.5,[0,.9,d/2-2.6],1,8));}
 return {parts,entry:{x:0,z:d/2-.2,width:Math.min(w*.5,3)}};
};

// ---- Shrine in three neutral grammars.
const shrine:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,g=grammarOf(ctx),ornament=ornaments(ctx),stone=ctx.material!=='wattle'||ctx.era>=2,sm=wallMaterial(ctx);
 if(g==='terrace'){
  const tiers=Math.min(4,1+Math.floor(ctx.era/2)+(ctx.wealth>.6?1:0)+(chance(r,.4)?1:0)),th=range(r,.6,.9);let tw=w*.88,td=d*.84,y=0,z=-d/2+td/2+.1;
  for(let i=0;i<tiers;i++){parts.push(B(i%2?'stone':'stoneDark',[tw,th,td],[0,y,z],2));y+=th;tw*=.72;td*=.72;z-=(d*.84-td)*.1;}
  const sw=Math.min(2.2,tw*.8+1);const n=Math.ceil(th*tiers/.18);for(let k=0;k<n-1;k++)parts.push(B('stone',[sw,th*tiers-(th*tiers/n)*(k+1),.3],[0,0,d/2-.15-k*.3+(k<0?0:0)],1));
  parts.push(B(sm,[tw*.8,2,td*.7],[0,y,z],2),part('box','recess',[.9,1.4,.06],[0,y,z+td*.35+.03],0));
  for(const s of[-1,1])parts.push(B('stoneDark',[.6,3+ornament,.6],[s*(tw*.5+.3),y,z+td*.45],2));
  parts.push(B('stoneDark',[tw*.85,.25,td*.75],[0,y+2,z],2));
  return {parts,entry:{x:0,z:d/2-.2,width:Math.min(sw,2)}};}
 if(g==='colonnade'){
  const sty=.45,Wc=w*.78,Dc=d*.8,z0=-d/2+Dc/2+.15,cella=Wc*.6,cd=Dc*.62,colH=range(r,2.8,3.6),nCol=pick(r,[4,5,6]),nSide=pick(r,[3,4]);
  parts.push(B('stone',[Wc,.25,Dc],[0,0,z0],2),B('stoneDark',[Wc*.92,.2,Dc*.92],[0,.25,z0],2));
  parts.push(B(sm,[cella,colH,cd],[0,sty,z0-Dc*.1],2),part('box','recess',[1,1.7,.06],[0,sty,z0-Dc*.1+cd/2+.03],0));
  for(let i=0;i<nCol;i++){const x=-Wc*.42+i*Wc*.84/(nCol-1);parts.push(Cy('stone',.5,colH,[x,sty,z0+Dc*.4],2,8));}
  for(let j=0;j<nSide;j++){const z=z0-Dc*.38+j*Dc*.72/(nSide-1);for(const s of[-1,1])parts.push(Cy('stone',.46,colH,[s*Wc*.42,sty,z],2,8));}
  parts.push(B('stoneDark',[Wc*.94,.4,Dc*.86],[0,sty+colH,z0],2));
  const pitch=roofPitch(ctx,r)*.55;gableRoof(parts,ctx,Wc*.94,Dc*.86,sty+colH+.4,pitch,0,z0,'z',.12,stone?'tile':undefined);
  parts.push(B('stone',[1.1,.9,.8],[0,0,d/2-.7],1));
  return {parts,entry:{x:0,z:z0+Dc/2,width:Wc*.4}};}
 // pavilion: raised base, post grid, double-eave hip roof
 const bh=range(r,.7,1.1),Wp=w*.8,Dp=d*.78,z0=-d/2+Dp/2+.2,nx=pick(r,[3,4,5]),nz=pick(r,[3,4]),ph=range(r,2.6,3.2);
 parts.push(B('stone',[Wp,bh,Dp],[0,0,z0],2));
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){if(i>0&&i<nx-1&&j>0&&j<nz-1)continue;const x=-Wp*.4+i*Wp*.8/(nx-1),z=z0-Dp*.38+j*Dp*.76/(nz-1);parts.push(beam('woodEdge',[x,bh,z],[x,bh+ph,z],.2,2));}
 parts.push(B('woodDark',[Wp*.82,.3,Dp*.8],[0,bh+ph,z0],2),B(wallMaterial(ctx),[Wp*.5,ph*.8,Dp*.4],[0,bh,z0-Dp*.15],2),part('box','recess',[.9,1.5,.06],[0,bh,z0-Dp*.15+Dp*.2+.03],0));
 const rm=ctx.era>=2?'tile':'thatch';parts.push(part('hip',rm,[Wp*1.0,Wp*.2,Dp*1.0],[0,bh+ph+.3,z0],2),part('hip',rm,[Wp*.7,Wp*.22,Dp*.7],[0,bh+ph+.3+Wp*.18,z0],2));
 if(ornament)for(const s of[-1,1])parts.push(part('cone','woodInlay',[.3,.7,.3],[s*Wp*.33,bh+ph+.3+Wp*.38,z0],0,undefined,5));
 const n=Math.ceil(bh/.18);for(let k=0;k<n-1;k++)parts.push(B('stone',[1.8,bh-(bh/n)*(k+1),.3],[0,0,z0+Dp/2+.15+k*.3],1));
 return {parts,entry:{x:0,z:z0+Dp/2+n*.3,width:1.8}};
};

// ---- Archive / library.
const archive:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,W=w*range(r,.7,.84),D=d*range(r,.6,.7),h=range(r,3,4),z0=-d/2+D/2+.2,t=.4,wm=ctx.material==='mudbrick'?'plaster':'stone';
 parts.push(B('stoneDark',[W+.3,.3,D+.3],[0,0,z0],2));ring(parts,wm,0,z0,W,D,h,t,1.4);
 const bays=pick(r,[2,3,4]);for(let i=0;i<bays;i++){const z=z0-D/2+(i+.5)*D/bays;for(const s of[-1,1]){parts.push(B('stoneDark',[.3,h,.45],[s*(W/2+.1),0,z-D/2/bays],1));windowAt(parts,s*(W/2+.03),h-.8,z,'x');}}
 if(ctx.era>=2){parts.push(B(wm,[W*.7,1,D*.8],[0,h,z0-D*.05],2));for(let i=0;i<5;i++)windowAt(parts,-W*.3+i*W*.15,h+.55,z0-D*.05+D*.4+.03,'z');}
 const top=h+(ctx.era>=2?1:0),pitch=roofPitch(ctx,r)*.8;gableRoof(parts,ctx,D,W,top,pitch,0,z0,'x',.2,ctx.climate==='arid'?'tile':undefined);
 if(chance(r,.6)){const pd=Math.min(1.5,d/2-(z0+D/2)-.12);if(pd>.6){const n=pick(r,[2,3]);for(let i=0;i<n;i++)parts.push(Cy('stone',.38,h*.85,[-W*.2+i*W*.4/(Math.max(1,n-1)),0,z0+D/2+pd-.3],2,8));parts.push(B('stoneDark',[W*.5,.25,pd],[0,h*.85,z0+D/2+pd/2-.1],2));}}
 if(ctx.era>=3&&chance(r,.5))parts.push(B(wm,[1.6,h+2.4,1.6],[W/2-1,0,z0-D/2+1],2),part('pyramid',roofMaterial(ctx),[1.9,1.2,1.9],[W/2-1,h+2.4,z0-D/2+1],2));
 return {parts,entry:{x:0,z:z0+D/2,width:1.4}};
};

// ---- Lyceum: cloister quadrangle with a lecture hall.
const lyceum:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,Q=Math.min(w*.86,d*.7+2),qd=d*.62,z0=-d/2+qd/2+.2,aw=1.6,colH=2.6,bays=pick(r,[3,4,5]);
 const wm=ctx.material==='stone'?'stone':'plaster';
 for(const s of[-1,1]){for(let i=0;i<=bays;i++){const z=z0-qd/2+aw/2+i*(qd-aw)/bays;parts.push(Cy('stone',.34,colH,[s*(Q/2-aw/2),0,z],2,8));}parts.push(B('woodDark',[aw,.25,qd],[s*(Q/2-aw/2),colH,z0],2));parts.push(part('wedge',roofMaterial(ctx),[aw+.3,.6,qd],[s*(Q/2-aw/2),colH+.25,z0],1,[0,s>0?Math.PI/2*0:0,0]));}
 for(let i=0;i<=bays;i++){const x=-Q/2+aw/2+i*(Q-aw)/bays;parts.push(Cy('stone',.34,colH,[x,0,z0+qd/2-aw/2],2,8));}parts.push(B('woodDark',[Q,.25,aw],[0,colH,z0+qd/2-aw/2],2));
 // Lecture hall (rectangular or apsidal exedra) closing the back.
 const hall=Q*.6,hd=qd*.36,hh=3.4;parts.push(B(wm,[hall,hh,hd],[0,0,z0-qd/2+hd/2],2));gableRoof(parts,ctx,hd,hall,hh,roofPitch(ctx,r)*.9,0,z0-qd/2+hd/2,'x',.2);
 if(chance(r,.55)){parts.push(part('cylinder',wm,[hd*.9,hh*.85,hd*.9],[0,0,z0-qd/2-hd*.1],2,undefined,10),part('cone',roofMaterial(ctx),[hd,hd*.3,hd],[0,hh*.85,z0-qd/2-hd*.1],1,undefined,10));}
 windowAt(parts,-hall*.25,hh*.6,z0-qd/2+hd+.03,'z');windowAt(parts,hall*.25,hh*.6,z0-qd/2+hd+.03,'z');
 // Garden: hedge boxes, a well or tree.
 const gx=0,gz=z0+qd*.05;if(chance(r,.5))parts.push(Cy('stone',.9,.7,[gx,0,gz],1,8));else{parts.push(Cy('trunk',.2,1.4,[gx,0,gz],1,5),part('sphere','foliage',[1.5,1.1,1.5],[gx,1.2,gz],1));}
 for(const s of[-1,1])parts.push(B('foliageDark',[.5,.5,qd*.35],[s*(Q/2-aw-.4),0,gz],0));
 return {parts,entry:{x:0,z:z0+qd/2,width:2}};
};

// ---- Fortified barracks: walled yard, gatehouse, barrack ranges, towers.
const fortBarracks:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,W=w-.4,D=d-.4,wh=range(r,2.4,3.2),t=.5,gw=Math.min(2.4,W*.3),stone=ctx.material==='stone'||ctx.era>=2,wm=stone?'stone':'woodDark';
 ring(parts,wm,0,0,W,D,wh,t,gw,2);
 parts.push(B('woodDark',[W,.14,.5],[0,wh,-D/2+.25],1),...[-1,1].map(s=>B('woodDark',[.5,.14,D-1],[s*(W/2-.25),wh,0],1)));
 // Gatehouse over the gap: lintel, flanking towers, gate leaves (open: swung back against the inner wall; closed: across the gap).
 const gz=D/2-t/2,tw=1.6;for(const s of[-1,1])parts.push(B(stone?'stoneDark':'woodDark',[tw,wh+1.4,tw],[s*(gw/2+tw/2),0,gz],2),part('pyramid',roofMaterial(ctx),[tw+.3,.9,tw+.3],[s*(gw/2+tw/2),wh+1.4,gz],2));
 parts.push(B(wm,[gw+.4,.8,t],[0,wh-.2,gz],2));
 if(ctx.gateOpen===false)for(const s of[-1,1])parts.push(B('woodEdge',[gw/2,wh-.4,.12],[s*gw/4,0,gz],1));else for(const s of[-1,1])parts.push(B('woodEdge',[.12,wh-.4,gw/2],[s*(gw/2-.1),0,gz-t/2-gw/4],1));
 // Corner towers on the back corners (and front when richer).
 const ct=pick(r,[2,4]);const cs=[[-1,-1],[1,-1],[-1,1],[1,1]].slice(0,ct===2?2:4);for(const [sx,sz] of cs){if(sz>0&&Math.abs(sx)*(W/2)<gw/2+tw+.2)continue;parts.push(B('stoneDark',[1.5,wh+1.2,1.5],[sx*(W/2-.75),0,sz*(D/2-.75)],2),part('pyramid',roofMaterial(ctx),[1.8,.9,1.8],[sx*(W/2-.75),wh+1.2,sz*(D/2-.75)],2));}
 // Barrack ranges along the inner side walls: bunk halls with their own gable roofs.
 const rangeW=Math.min(2.6,W*.28),L=D*.6,rh=2.2,n=ctx.wealth>.5||W>8?2:1;
 for(let i=0;i<n;i++){const s=i?1:-1,x=s*(W/2-t-rangeW/2-.1);parts.push(B(stone?'plaster':'woodMid',[rangeW,rh,L],[x,0,-D/2+t+L/2+.4],2));gableRoof(parts,ctx,rangeW,L,rh,roofPitch(ctx,r)*.9,x,-D/2+t+L/2+.4,'z',.15);door(parts,x-s*rangeW*.2,-D/2+t+.4+L+.03,.8,1.6);windowAt(parts,x,1.3,-D/2+t+.4+L*.5,'x');}
 // Parade yard fixtures: weapon rack and a drill post.
 parts.push(B('woodDark',[1.4,.1,.1],[0,1.1,-D*.1],1),beam('woodDark',[-.7,0,-D*.1],[-.7,1.2,-D*.1],.08,0),beam('woodDark',[.7,0,-D*.1],[.7,1.2,-D*.1],.08,0),beam('woodDark',[0,0,D*.1],[0,1.6,D*.1],.2,0));
 return {parts,entry:{x:0,z:D/2,width:gw}};
};

// ---- Smithy: open-front forge with chimney, anvil, bellows, quench, charcoal bunker.
const smithy:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,W=w*range(r,.78,.9),D=d*range(r,.65,.78),h=range(r,2.4,3),z0=-d/2+D/2+.15,wm=ctx.material==='timber'?'woodMid':'stone',left=chance(r,.5)?-1:1;
 parts.push(B(wm,[W,h,.25],[0,0,z0-D/2+.125],2));for(const s of[-1,1])parts.push(B(wm,[.22,h*.7,D*.7],[s*(W/2-.11),0,z0-D*.15],2));
 parts.push(B('stoneDark',[1.4,.8,1.1],[left*W*.22,0,z0-D*.25],2),part('box','fire',[.7,.12,.5],[left*W*.22,.8,z0-D*.25],0),B('stone',[.9,h+1.6,.8],[left*W*.22,0,z0-D/2+.5],2),B('stoneDark',[1.1,.35,1],[left*W*.22,h+1.6,z0-D/2+.5],1));
 parts.push(Cy('woodDark',.45,.6,[-left*W*.15,0,z0-D*.1],1,8),B('iron',[.5,.18,.22],[-left*W*.15,.6,z0-D*.1],0),part('wedge','woodMid',[.5,.3,.7],[left*W*.22+left*.8,.5,z0-D*.2],0));
 parts.push(B('woodDark',[1,.5,.5],[-left*W*.38,0,z0-D*.3],1),part('box','water',[.85,.08,.35],[-left*W*.38,.5,z0-D*.3],0));
 parts.push(B('woodDark',[.9,.7,.6],[left*W*.33,0,z0+D*.1],1));if(ctx.wealth>.55)parts.push(Cy('woodDark',.4,.5,[-left*W*.3,0,z0+D*.15],0,6),B('iron',[.4,.16,.2],[-left*W*.3,.5,z0+D*.15],0));
 const pitch=roofPitch(ctx,r)*.8;if(chance(r,.5))gableRoof(parts,ctx,D,W,h,pitch,0,z0,'x',.2);else parts.push(part('wedge',roofMaterial(ctx),[W+.4,Math.max(.5,D*Math.tan(pitch)*.5),D+.4],[0,h,z0],2));
 for(const s of[-1,1])parts.push(beam('woodDark',[s*(W/2-.1),0,z0+D/2-.1],[s*(W/2-.1),h,z0+D/2-.1],.16,2));
 return {parts,entry:{x:0,z:z0+D/2,width:W*.6}};
};

// ---- Kiln yard: pottery updraft kilns or brick clamp with drying hacks.
const kilnYard:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,brick=ctx.era>=2&&chance(r,.5)||ctx.trade==='kiln'&&chance(r,.3),zb=-d/2;
 if(!brick){const n=pick(r,[1,2]);for(let i=0;i<n;i++){const x=n===1?0:(i?1:-1)*w*.22,dia=Math.min(w*.4,range(r,1.6,2.2)),z=zb+dia/2+.3;parts.push(Cy('plaster',dia,1.1,[x,0,z],2,10),part('sphere','plaster',[dia,dia*.6,dia],[x,1,z],2),B('woodEdge',[.5,.45,.06],[x,0,z+dia/2],1),part('box','fire',[.3,.18,.05],[x,.05,z+dia/2+.03],0),Cy('plaster',.4,.6,[x,1.55,z],1,6));}
  const sw=w*.7,sd=d*.28,sz=d/2-sd/2-.6;for(const s of[-1,1])post(parts,s*sw/2,sz+sd/2-.1,2.1,.12,1),post(parts,s*sw/2,sz-sd/2+.1,2.6,.12,1);parts.push(part('wedge','woodLight',[sw+.3,.4,sd+.3],[0,2.15,sz],1),B('woodMid',[sw*.8,.7,.5],[0,0,sz],0),Cy('plaster',.5,.3,[w*.3,0,sz+sd*.2],0,6));}
 else{const rows=pick(r,[3,4]),rw=w*.5,ch=range(r,1.1,1.5),cz=zb+(rows*.5+.6);parts.push(B('stoneDark',[rw,.2,rows*.6+.4],[-w*.12,0,zb+.3+rows*.3+.2],2));for(let i=0;i<rows;i++)parts.push(B('tile',[rw,ch,.5],[-w*.12,.2,zb+.5+i*.6],2));parts.push(B('plaster',[rw+.2,.3,rows*.6+.4],[-w*.12,.2+ch,zb+.3+rows*.3+.2],1),part('box','fire',[.4,.2,.05],[-w*.12-rw/2+.4,.25,zb+.2],0));
  for(let k=0;k<pick(r,[2,3]);k++){const x=w*.3,z=cz+1.4+k*.9;if(z<d/2-.6){parts.push(B('woodDark',[1.4,.08,.5],[x,.28,z],0),B('tile',[1.2,.18,.4],[x,.36,z],0),beam('woodDark',[x-.6,0,z],[x-.6,.28,z],.08,0),beam('woodDark',[x+.6,0,z],[x+.6,.28,z],.08,0));}}
  parts.push(Cy('woodDark',w*.18,.6,[w*.32,0,d/2-.9],1,6));}
 parts.push(B('woodMid',[.9,.5,.6],[-w*.35,0,d/2-.7],0));
 return {parts,entry:{x:0,z:d/2-.2,width:Math.min(2.4,w*.5)}};
};

// ---- Store barn: raised granary, domed clay bins, pit store, slatted crib.
type StoreKind='raised'|'domed'|'pit'|'crib';
const storeBarn:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,kind:StoreKind=ctx.climate==='arid'?pick(r,['domed','domed','pit'] as const):ctx.era<=1&&chance(r,.35)?'pit':ctx.climate==='cold'?pick(r,['crib','raised'] as const):pick(r,['raised','crib','domed'] as const);
 if(kind==='raised'){const W=w*.72,D=d*.68,h=range(r,2,2.6),z0=-d/2+D/2+.3,fl=.6+range(r,0,.3),nx=3;
  for(let i=0;i<nx;i++)for(let j=0;j<2;j++){const x=-W/2+.3+i*(W-.6)/(nx-1),z=z0-D/2+.3+j*(D-.6);parts.push(Cy('stoneDark',.42,fl*.55,[x,0,z],2,6),beam('woodDark',[x,fl*.55,z],[x,fl,z],.22,2));}
  parts.push(B('woodDark',[W,.2,D],[0,fl,z0],2),B('woodMid',[W-.1,h,D-.1],[0,fl+.2,z0],2));gableRoof(parts,ctx,D,W,fl+.2+h,roofPitch(ctx,r),0,z0,'x',.25);door(parts,0,z0+D/2,.8,1.5);
  const n=Math.ceil((fl+.2)/.2);for(let k=0;k<n-1;k++)parts.push(B('woodLight',[.9,fl+.2-(fl+.2)/n*(k+1),.28],[0,0,z0+D/2+.2+k*.28],1));return {parts,entry:{x:0,z:z0+D/2+n*.28,width:.9}};}
 if(kind==='domed'){const n=pick(r,[2,3,4]),bd=Math.min(1.9,(w-.6)/n),bh=range(r,1.6,2.3),z=-d/2+bd/2+.4;
  for(let i=0;i<n;i++){const x=-((n-1)*(bd+.2))/2+i*(bd+.2);parts.push(Cy('plaster',bd,bh,[x,0,z],2,10),part('sphere','plaster',[bd,bd*.7,bd],[x,bh-.05,z],2),B('woodEdge',[.35,.35,.08],[x,bh*.55,z+bd/2],0),Cy('woodMid',.3,.18,[x,bh+bd*.7-.15,z],1,6));}
  parts.push(B('stoneDark',[(bd+.2)*n+.4,.2,bd+.5],[0,0,z],2));const cz=d/2-1.2;parts.push(B('woodMid',[w*.6,1,1.2],[0,0,cz],1),part('wedge','thatch',[w*.65,.4,1.5],[0,1.9,cz],1));for(const s of[-1,1])post(parts,s*w*.28,cz+.5,1.9,.12,1);
  return {parts,entry:{x:0,z:d/2-.3,width:1.6}};}
 if(kind==='pit'){const R=Math.min(w,d)*.4,z=-d/2+R+.4;parts.push(Cy('plaster',R*2,.45,[0,0,z],2,12),Cy('woodDark',R*1.2,.12,[0,.45,z],2,10),part('cone',ctx.era>=2?'shingle':'thatch',[R*1.5,.7,R*1.5],[0,.55,z],2,undefined,10));
  for(let i=0;i<pick(r,[3,4,5]);i++){const a=i*Math.PI*2/5,x=Math.cos(a)*(R+.5),zz=z+Math.sin(a)*(R+.5);if(Math.abs(x)<w/2-.3&&zz<d/2-.3&&zz>-d/2+.3)parts.push(B('woodDark',[.5,.28,.5],[x,0,zz],0));}
  const pw=w*.6;for(const s of[-1,1])post(parts,s*pw/2,d/2-1,1.9,.12,1);parts.push(part('wedge','thatch',[pw+.3,.4,1.4],[0,1.9,d/2-1],1));return {parts,entry:{x:0,z:d/2-.2,width:1.4}};}
 // crib: slatted bins in a frame, ventilated, gable roof
 const W=w*.7,D=d*.5,h=range(r,2,2.5),z0=-d/2+D/2+.4,sl=pick(r,[5,6,7]);parts.push(B('stoneDark',[W,.35,D],[0,0,z0],2));
 for(const s of[-1,1])for(let i=0;i<=3;i++)post(parts,-W/2+.1+i*(W-.2)/3,z0+s*(D/2-.1),h+.35,.14,2);
 for(const s of[-1,1])for(let k=0;k<sl;k++)parts.push(B('woodMid',[W-.1,(h-.1)/sl*.5,.05],[0,.35+k*(h-.1)/sl,z0+s*(D/2-.04)],1));parts.push(B('woodLight',[W-.2,h,D-.2],[0,.35,z0],2));
 gableRoof(parts,ctx,D,W,h+.35,roofPitch(ctx,r),0,z0,'x',.25);return {parts,entry:{x:0,z:z0+D/2,width:1.6}};
};

// ---- Drying yard: fish and meat frames, a windbreak and a small smoke hut.
const dryingYard:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,hut=ctx.trade==='smoke'||chance(r,.5),nF=pick(r,[2,3,4]);
 const fw=Math.min(1.6,(w-.8)/nF);for(let i=0;i<nF;i++){const x=-w/2+.6+fw/2+i*(w-1.2)/nF,z=hut?d*.12:-d*.1,hh=range(r,1.6,2);
  for(const s of[-1,1]){parts.push(beam('woodDark',[x+s*fw/2,0,z+.35],[x+s*fw*.35,hh,z],.08,1),beam('woodDark',[x+s*fw/2,0,z-.35],[x+s*fw*.35,hh,z],.08,1));}
  parts.push(B('woodDark',[fw*.8,.07,.07],[x,hh,z],1));for(let k=0;k<pick(r,[3,4]);k++)parts.push(B(chance(r,.5)?'woodLight':'cloth',[.09,.5,.04],[x-fw*.3+k*fw*.2,hh-.5,z],0));}
 parts.push(B('woodMid',[w*.8,.9,.1],[0,0,-d/2+.2],1));for(let i=0;i<5;i++)post(parts,-w*.4+i*w*.2,-d/2+.2,1.2,.07,0);
 if(hut){const hw=w*.45,hd=d*.34,hh=2.2,x=chance(r,.5)?-w*.2:w*.2,z=-d/2+hd/2+.35;parts.push(B(ctx.material==='stone'?'stone':'woodDark',[hw,hh,hd],[x,0,z],2),B('woodEdge',[.7,1.5,.06],[x,0,z+hd/2+.02],1),part('wedge',roofMaterial(ctx),[hw+.3,.5,hd+.3],[x,hh,z],2),B('woodEdge',[.5,.5,.5],[x,hh+.3,z-hd*.2],1));}
 return {parts,entry:{x:0,z:d/2-.2,width:Math.min(2.4,w*.5)}};
};

// ---- Tannery: round vats, lime pit, stretching frames, bark stack, lean-to.
const tannery:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,nV=pick(r,[2,3,4]),vd=Math.min(1.3,(w-.8)/nV-.1),z=-d/2+vd/2+.5;
 for(let i=0;i<nV;i++){const x=-((nV-1)*(vd+.15))/2+i*(vd+.15);parts.push(Cy('woodDark',vd,.8,[x,0,z],2,10),part('cylinder','water',[vd*.82,.06,vd*.82],[x,.74,z],0,undefined,10),Cy('woodEdge',vd*1.03,.08,[x,.78,z],0,10));}
 const pw=w*.4,pdp=d*.2,pz=z+vd/2+pdp/2+.5;for(const [dx,dz,sx,sz] of[[0,-pdp/2,pw,.18],[0,pdp/2,pw,.18],[-pw/2,0,.18,pdp],[pw/2,0,.18,pdp]] as const)parts.push(B('stone',[sx,.5,sz],[-w*.2+dx,0,pz+dz],1));parts.push(part('box','water',[pw-.2,.05,pdp-.2],[-w*.2,.35,pz],0));
 for(let k=0;k<pick(r,[1,2]);k++){const x=w*.25+k*.9,zz=pz;parts.push(beam('woodDark',[x-.4,0,zz],[x-.4,1.5,zz],.08,1),beam('woodDark',[x+.4,0,zz],[x+.4,1.5,zz],.08,1),B('woodDark',[.9,.06,.06],[x,1.45,zz],1),B('woodLight',[.8,1,.03],[x,.5,zz],0),B('woodDark',[.9,.06,.06],[x,.45,zz],0));}
 const lz=d/2-1.1;for(const s of[-1,1])post(parts,s*(w/2-.5),lz,2.2,.12,1),post(parts,s*(w/2-.5),lz-1.4,2.7,.12,1);parts.push(part('wedge',roofMaterial(ctx),[w-.8,.5,1.8],[0,2.25,lz-.7],1),B('woodMid',[1.4,.8,.8],[w*.2,0,lz-.5],0));
 parts.push(Cy('trunk',.5,.45,[-w/2+.8,0,lz-.4],0,6),Cy('trunk',.5,.45,[-w/2+1.1,.45,lz-.4],0,6));
 return {parts,entry:{x:0,z:d/2-.2,width:Math.min(2.4,w*.5)}};
};

// ---- Loom house: long shed with warp-weighted looms, dye vats and a drying line.
const loomHouse:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,W=w*.86,D=d*range(r,.5,.6),h=range(r,2.2,2.7),z0=-d/2+D/2+.2,wm=wallMaterial(ctx),nL=pick(r,[2,3,4]);
 parts.push(B(wm,[W,h,.2],[0,0,z0-D/2+.1],2));for(const s of[-1,1])parts.push(B(wm,[.18,h,D],[s*(W/2-.09),0,z0],2));
 for(let i=0;i<=nL;i++)parts.push(beam('woodDark',[-W/2+.2+i*(W-.4)/nL,0,z0+D/2-.08],[-W/2+.2+i*(W-.4)/nL,h,z0+D/2-.08],.14,i%2?1:2));
 gableRoof(parts,ctx,D,W,h,roofPitch(ctx,r),0,z0,'x',.2);
 for(let i=0;i<nL;i++){const x=-W/2+.6+(i+.5)*(W-1.2)/nL,zz=z0-D*.1;parts.push(beam('woodDark',[x-.55,0,zz],[x-.55,1.8,zz-.2],.09,1),beam('woodDark',[x+.55,0,zz],[x+.55,1.8,zz-.2],.09,1),B('woodDark',[1.2,.08,.08],[x,1.75,zz-.2],1),B('cloth',[1,1.1,.03],[x,.35,zz-.1],0));for(const dx of[-.35,0,.35])parts.push(Cy('stone',.1,.14,[x+dx,.2,zz-.05],0,5));}
 const nv=pick(r,[2,3]);for(let i=0;i<nv;i++)parts.push(Cy('woodDark',.8,.7,[-W*.3+i*.95,0,d/2-.7],1,8),part('cylinder',pick(r,['cloth','tile','foliageDark'] as const),[.66,.05,.66],[-W*.3+i*.95,.66,d/2-.7],0,undefined,8));
 if(chance(r,.6)){for(const s of[-1,1])post(parts,s*W*.38+W*.1,d/2-.9,1.9,.07,0);parts.push(B('cloth',[W*.7,.5,.03],[W*.1,1.35,d/2-.9],0),B('woodDark',[W*.78,.05,.05],[W*.1,1.9,d/2-.9],0));}
 return {parts,entry:{x:0,z:z0+D/2,width:W*.5}};
};

// ---- Bakery oven house.
const bakeryOven:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,W=w*.84,D=d*.8,h=range(r,2.2,2.7),z0=-d/2+D/2+.15,stone=ctx.material!=='wattle',wm=stone?'stone':'plaster';
 parts.push(B(wm,[W,h,.22],[0,0,z0-D/2+.11],2));for(const s of[-1,1])parts.push(B(wm,[.2,h,D*.8],[s*(W/2-.1),0,z0-D*.1],2));
 const ox=chance(r,.5)?-W*.15:W*.15,oz=z0-D*.2;parts.push(B('stoneDark',[1.7,.7,1.5],[ox,0,oz],2),part('sphere','plaster',[1.5,1,1.3],[ox,.7,oz],2),B('woodEdge',[.5,.35,.06],[ox,.75,oz+.68],1),part('box','fire',[.3,.16,.05],[ox,.8,oz+.71],0),B('stone',[.5,h+1.1,.5],[ox,0,z0-D/2+.5],2));
 parts.push(B('woodMid',[1.3,.1,.6],[-ox*.9,.85,z0+D*.1],1),beam('woodDark',[-ox*.9-.55,0,z0+D*.1],[-ox*.9-.55,.85,z0+D*.1],.08,0),beam('woodDark',[-ox*.9+.55,0,z0+D*.1],[-ox*.9+.55,.85,z0+D*.1],.08,0),B('woodDark',[.7,.8,.5],[-ox*1.5,0,oz],0),B('woodMid',[1.2,.5,.4],[ox,0,z0+D*.38],0));
 if(ctx.wealth>.5)parts.push(B('woodDark',[1.5,.06,.4],[0,1.6,z0-D/2+.3],0));
 gableRoof(parts,ctx,D*.9,W,h,roofPitch(ctx,r)*.85,0,z0,'x',.2);for(const s of[-1,1])parts.push(beam('woodDark',[s*(W/2-.1),0,z0+D*.4],[s*(W/2-.1),h,z0+D*.4],.16,2));
 return {parts,entry:{x:0,z:z0+D/2,width:W*.6}};
};

// ---- Windmill (post or tower) and horse mill.
const windmill:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,tower=ctx.era>=3?chance(r,.6):ctx.material==='stone'&&ctx.wealth>.5,L=Math.min((w-.4)/2*.95,range(r,1.6,2.2)),blades=ctx.wealth>.6?6:pick(r,[4,4,5]);
 let hubY:number,hubZ:number;
 if(!tower){const bw=Math.min(w*.5,1.8),bd=Math.min(d*.45,2.2),legH=range(r,.9,1.2),bh=range(r,2.2,2.8);hubZ=bd/2+.05;hubY=legH+bh*.7;
  for(const sx of[-1,1])for(const sz of[-1,1])parts.push(beam('woodDark',[sx*bw*.45,0,sz*bd*.3],[0,legH,0],.14,2));
  parts.push(Cy('woodDark',.28,legH+.1,[0,0,0],2,6),B('woodMid',[bw,bh,bd],[0,legH,0],2),part('prism',ctx.era>=2?'shingle':'thatch',[bw+.3,bw*.55,bd+.3],[0,legH+bh,0],2,[0,Math.PI/2,0]));
  parts.push(beam('woodDark',[0,.3,-bd*.5],[0,legH+.5,-bd*.5-1.2],.08,1));const n=Math.ceil(legH/.18);for(let k=0;k<n-1;k++)parts.push(B('woodLight',[.6,legH-legH/n*(k+1),.25],[0,0,-bd/2-.2-k*.25],0));
  parts.push(...[-1,1].map(s=>B('stoneDark',[.35,.3,.35],[s*bw*.45,0,s*bd*.3],1)));}
 else{const R=Math.min(w,d)*.36,H=range(r,3.4,4.4);hubY=H*.78;hubZ=R*.8;let y=0;const segs=3;for(let i=0;i<segs;i++){const sr=R*(1-i*.12),sh=H/segs;parts.push(part('cylinder',ctx.material==='mudbrick'?'plaster':'stone',[2*sr,sh,2*sr],[0,y,0],2,undefined,12));y+=sh;}
  parts.push(part('cone',ctx.era>=2?'shingle':'thatch',[2*R*.9,R*.8,2*R*.9],[0,H,0],2,undefined,12),B('stoneDark',[1,1.6,.1],[0,0,R*.98],0));if(ctx.wealth>.4)parts.push(Cy('woodDark',2*R+.6,.12,[0,H*.42,0],1,12));if(chance(r,.5))parts.push(beam('woodDark',[0,H,0],[0,H+1.3,0],.08,1));hubZ=R*.88+.1;}
 // Sails in the XY plane at the hub (rotated so none digs into the ground).
 const Ls=Math.min(L,hubY-.3);parts.push(part('cylinder','woodEdge',[.3,.4,.3],[0,hubY-.2,hubZ],2,[Math.PI/2,0,0],6));
 for(let i=0;i<blades;i++){const a=i*Math.PI*2/blades+Math.PI/8,ex=Math.sin(a)*Ls,ey=Math.cos(a)*Ls;parts.push(beam('woodDark',[0,hubY,hubZ+.22],[ex,hubY+ey,hubZ+.22],.1,2),B('cloth',[.5,.12,.04],[ex*.62-.0,hubY+ey*.62,hubZ+.26],0,[0,0,-a]));}
 return {parts,entry:{x:0,z:Math.min(d/2-.2,hubZ+.5),width:.9}};
};
const horseMill:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,R=Math.min(w,d)/2-.3,h=range(r,2.6,3.2),n=pick(r,[6,8]);
 parts.push(Cy('stoneDark',2*R,.2,[0,0,0],2,16),Cy('stone',1.1,.5,[0,.2,0],2,10),Cy('woodDark',.3,h,[0,.2,0],2,6));
 for(let i=0;i<n;i++){const a=i*Math.PI*2/n;if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a))-Math.PI/2)<.4)continue;if(ctx.material==='stone'||ctx.era>=3)parts.push(Cy('stone',.42,h,[Math.cos(a)*(R-.3),0,Math.sin(a)*(R-.3)],2,8));else post(parts,Math.cos(a)*(R-.3),Math.sin(a)*(R-.3),h,.16,2);}
 if(ctx.wealth>.5)parts.push(B('woodMid',[.9,.8,.9],[-R*.6,0,-R*.6],1),part('pyramid','woodDark',[1,.5,1],[-R*.6,.8,-R*.6],1));if(ctx.era>=3)parts.push(Cy('woodMid',R*1.1,.14,[0,h*.6,0],1,12));
 parts.push(part('cone',roofMaterial(ctx),[2*R+.5,R*.5,2*R+.5],[0,h,0],2,undefined,16),beam('woodDark',[0,1.1,0],[R-.4,1.1,0],.14,1),beam('woodDark',[0,1.1,0],[-R+.4,1.1,0],.14,1),B('woodMid',[.3,.15,.5],[R-.5,.15,0],0));
 return {parts,entry:{x:0,z:R,width:2}};
};

// ---- Harbour store.
const harborStore:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,W=w*.88,D=d*.58,h=range(r,3,3.8),z0=-d/2+D/2+.15,stone=ctx.era>=2&&ctx.material!=='wattle',wm=stone?'stone':'woodMid';
 parts.push(B('stoneDark',[W+.2,.3,D+.2],[0,0,z0],2),B(wm,[W,h,D],[0,.3,z0],2));gableRoof(parts,ctx,D,W,h+.3,roofPitch(ctx,r)*.9,0,z0,'x',.2);
 const nd=pick(r,[2,3]);for(let i=0;i<nd;i++){const x=-W/2+(i+.5)*W/nd;parts.push(B('woodEdge',[Math.min(1.8,W/nd*.6),2.4,.08],[x,.3,z0+D/2+.04],1));}
 if(ctx.wealth>.4)for(let i=0;i<3;i++)windowAt(parts,-W*.3+i*W*.3,h*.75,z0+D/2+.03,'z');
 const cx=chance(r,.5)?-W*.3:W*.3,ph=Math.min(1.4,d/2-(z0+D/2)-.1);parts.push(B('woodDark',[.3,.3,.3],[cx,h+.5,z0+D/2-.1],1),beam('woodDark',[cx,h+.3,z0+D/2-.1],[cx,h+.3,z0+D/2+ph-.1],.12,1),beam('woodDark',[cx,h+.3,z0+D/2+ph-.1],[cx,h-.5,z0+D/2+ph-.1],.04,0));
 for(let i=0;i<pick(r,[3,5]);i++)parts.push(Cy('woodMid',.5,.65,[-W*.35+i*.55,.3,z0+D/2+.45],0,8));for(let i=0;i<2;i++)parts.push(B('woodLight',[.7,.5,.5],[W*.25+i*.8,.3,z0+D/2+.45],0));
 return {parts,entry:{x:0,z:z0+D/2,width:1.8}};
};

// ---- Shipyard slip: keel blocks, half-built hull, cradles, shed, sawpit.
const shipyard:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,L=d*.7,z0=d/2-L/2-.3,ribs=pick(r,[5,6,7,8]);
 for(let i=0;i<ribs+2;i++)parts.push(B('woodDark',[.5,.35,.5],[0,0,z0-L/2+.3+i*(L-.6)/(ribs+1)],2));
 parts.push(B('woodEdge',[.28,.3,L],[0,.35,z0],2));
 for(let i=0;i<ribs;i++){const z=z0-L/2+.7+i*(L-1.4)/(ribs-1),sw=Math.min(1.5,w*.3)*(1-Math.abs(i/(ribs-1)-.5)*1.1),hh=1.3+(1-Math.abs(i/(ribs-1)-.5)*1.6);for(const s of[-1,1])parts.push(beam('woodMid',[s*.14,.65,z],[s*sw,.65+hh,z],.1,1));}
 for(const s of[-1,1])parts.push(B('woodDark',[.08,.06,L*.9],[s*Math.min(1.1,w*.25),1.4,z0],0));
 for(const s of[-1,1])for(let i=0;i<3;i++){const z=z0-L*.3+i*L*.3;parts.push(beam('woodDark',[s*(Math.min(1.8,w*.35)),0,z],[s*.4,.55,z],.12,1));}
 const shed=chance(r,.6);if(shed){const sw=w*.34,sd=d*.3,sx=-w/2+sw/2+.3,sz=-d/2+sd/2+.3;for(const dx of[-1,1])for(const dz of[-1,1])post(parts,sx+dx*(sw/2-.1),sz+dz*(sd/2-.1),2.6,.14,1);parts.push(part('wedge',roofMaterial(ctx),[sw+.3,.7,sd+.3],[sx,2.6,sz],1),B('woodMid',[sw*.8,.8,.5],[sx,0,sz],0));}
 const px=w/2-1,pz=-d*.1;for(const [dx,dz,sx,sz] of[[0,-.5,1.8,.15],[0,.5,1.8,.15],[-.9,0,.15,1.1],[.9,0,.15,1.1]] as const)parts.push(B('woodDark',[sx,.3,sz],[px+dx,0,pz+dz],0));
 if(ctx.wealth>.5){const cx=w/2-.8,cz=z0-L*.1;parts.push(beam('woodDark',[cx,0,cz],[cx,3.4,cz],.2,1),beam('woodDark',[cx,3.4,cz],[cx-1.8,3.0,cz],.12,1),beam('woodDark',[cx,.3,cz+.6],[cx,2.6,cz],.08,0));}
 if(ctx.era>=3)parts.push(B('stoneDark',[Math.min(3,w*.5),.3,1.2],[0,0,d/2-.7],1));if(ctx.material==='stone'||ctx.climate==='cold')parts.push(B('stone',[w*.3,.5,.5],[w*.1,0,-d/2+.4],0));
 for(let i=0;i<pick(r,[2,3]);i++)parts.push(B('woodLight',[1.6,.18,.28],[w/2-1.2,.18*i,z0-L/2-.4+0],0));
 return {parts,entry:{x:0,z:d/2-.2,width:Math.min(3,w*.5)}};
};

// ---- Beacon: signal tower with brazier platform, or a hilltop cairn beacon.
const beacon:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,tower=ctx.era>=2&&ctx.material!=='wattle'||ctx.wealth>.6,bm:Part['mat']=ctx.material==='stone'?'stone':ctx.material==='mudbrick'?'plaster':'woodMid';
 if(tower){const S=Math.min(w,d)*.62,H=range(r,6,8.5),tiers=pick(r,[2,3]);let s=S,y=0;for(let i=0;i<tiers;i++){const h=H/tiers;parts.push(B(i?bm:'stoneDark',[s,h,s],[0,y,0],2));y+=h;s*=.88;}
  parts.push(B('stoneDark',[s+.6,.35,s+.6],[0,y,0],2));for(const [dx,dz,sx,sz] of[[0,-1,s+.6,.2],[0,1,s+.6,.2],[-1,0,.2,s+.6],[1,0,.2,s+.6]] as const)parts.push(B('stone',[sx,.7,sz],[dx*(s/2+.2),y+.35,dz*(s/2+.2)],1));
  parts.push(Cy('iron',.7,.4,[0,y+.35,0],1,8),part('box','fire',[.5,.5,.5],[0,y+.75,0],0),beam('woodDark',[s*.35,y+.35,s*.35],[s*.35,y+3,s*.35],.1,1));
  if(chance(r,.5))parts.push(B('stoneDark',[.8,y*.5,2.2*0+.7],[S*.35,0,S/2+.35],1));if(chance(r,.5))parts.push(beam('woodDark',[-s*.35,y+.35,-s*.35],[-s*.35,y+2.2,-s*.35],.08,1),B('cloth',[.6,.5,.03],[-s*.35+.3,y+1.6,-s*.35],1));parts.push(B('woodEdge',[.9,1.8,.08],[0,0,S/2+.04],1));parts.push(B('woodDark',[.9,.5,.6],[S*.6,0,S/2+.3],0));return {parts,entry:{x:0,z:S/2,width:.9}};}
 const R=Math.min(w,d)*.4;if(chance(r,.5))parts.push(B('woodDark',[1.3,1.6,1.2],[-R*.5,0,R*.7],1),part('wedge','thatch',[1.5,.4,1.4],[-R*.5,1.6,R*.7],1));for(let i=0;i<pick(r,[0,3,5]);i++)parts.push(B('stoneDark',[.5,.4,.5],[Math.cos(i*1.3)*R*.95,0,Math.sin(i*1.3)*R*.95],0));if(chance(r,.5))parts.push(beam('woodMid',[R*.5,0,-R*.5],[R*.5,3.4,-R*.5],.08,1),B('cloth',[.5,.6,.03],[R*.5+.3,2.7,-R*.5],1));parts.push(Cy(ctx.material==='stone'?'stone':ctx.material==='mudbrick'?'plaster':'trunk',2*R,.8,[0,0,0],2,10),Cy('stoneDark',2*R*.7,.7,[0,.8,0],2,10),beam('woodDark',[0,1.5,0],[0,5.2,0],.18,2),Cy('iron',.8,.35,[0,5.2,0],1,8),part('box','fire',[.5,.5,.5],[0,5.5,0],0),B('woodLight',[.9,.5,.6],[R*.9,0,R*.5],0));
 for(let i=0;i<pick(r,[3,4]);i++)parts.push(beam('woodDark',[Math.cos(i*1.7)*R*.6,.8,Math.sin(i*1.7)*R*.6],[0,3.2,0],.08,1));
 return {parts,entry:{x:0,z:R,width:1}};
};

// ---- Gatehouse: twin towers, passage with lintel and portcullis slot, wall stubs.
const gatehouse:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,gw=Math.min(2.6,w*.3),tw=Math.min(w*.26,2.6),D=d*.92,H=range(r,4.6,6),stone=ctx.material!=='wattle'&&(ctx.era>=1),wm:Part['mat']=stone?(ctx.material==='mudbrick'?'plaster':'stone'):'woodDark',round=chance(r,.45)&&stone;
 for(const s of[-1,1]){const x=s*(gw/2+tw/2);if(round)parts.push(Cy(wm,tw*1.05,H,[x,0,0],2,12),part('cone',roofMaterial(ctx),[tw*1.2,tw*.8,tw*1.2],[x,H,0],2,undefined,12));else parts.push(B(wm,[tw,H,D],[x,0,0],2),part('pyramid',roofMaterial(ctx),[tw+.3,1.1,D+.3],[x,H,0],2));
  const stub=(w-gw-2*tw)/2;if(stub>.3)parts.push(B(wm,[stub,H*.62,.7],[s*(gw/2+tw+stub/2),0,0],2),B('woodDark',[stub,.12,.9],[s*(gw/2+tw+stub/2),H*.62,0],1));
  for(const z of[-1,1])windowAt(parts,x,H*.7,z*(round?tw*.5:D/2)+z*.03,'z');}
 const ch=H*.55;parts.push(B(wm,[gw,H-ch,round?tw:D],[0,ch,0],2),B('woodDark',[gw+.2,.3,D*.9],[0,ch-.3,0],1));
 for(let i=0;i<3;i++)parts.push(B('stoneDark',[gw/3+.1,.3,.5],[(i-1)*gw/3,ch-.5,D/2-.3],1));
 for(const s of[-1,1])parts.push(B('woodEdge',[.1,ch-.6,.7],[s*(gw/2-.1),0,-.2],1));
 if(ctx.wealth>.5)for(let i=0;i<4;i++)parts.push(B('stoneDark',[gw/4-.1,.5,.4],[(i-1.5)*gw/4,H,D/2-.3],1));if(ctx.era>=3)parts.push(B('stoneDark',[gw+.6,.25,.5],[0,ch+.2,D/2-.1],1));
 if(ctx.gateOpen===false)parts.push(B('woodEdge',[gw,ch-.4,.12],[0,0,0],1));
 parts.push(part('prism',roofMaterial(ctx),[gw+.4,gw*.5,round?tw:D],[0,H,0],2,[0,Math.PI/2*0,0]));
 return {parts,entry:{x:0,z:d/2,width:gw}};
};

// ---- Town hall by era.
const townHall:Generator=(c,r)=>{
 const ctx=c as CivicContext,parts:Part[]=[],{w,d}=ctx.footprint,e=ctx.era;
 if(e<=1){const W=w*.78,D=d*.5,h=range(r,2.3,2.8),z0=-d/2+D/2+.2;parts.push(B(wallMaterial(ctx),[W,h,.22],[0,0,z0-D/2+.11],2));for(const s of[-1,1])parts.push(B(wallMaterial(ctx),[.2,h,D],[s*(W/2-.1),0,z0],2));
  for(const s of[-1,1])parts.push(B(wallMaterial(ctx),[(W-1.6)/2,h,.2],[s*(.8+(W-1.6)/4),0,z0+D/2-.1],2));gableRoof(parts,ctx,D,W,h,roofPitch(ctx,r)+.04,0,z0,'x',.3);
  const rr=Math.min(d/2-(z0+D/2)-.3,2.4);if(rr>1){parts.push(Cy('stone',2*rr*.85,.12,[0,0,z0+D/2+rr],1,12));for(let i=0;i<6;i++){const a=i*Math.PI/3;parts.push(B('stone',[.5,.45,.5],[Math.cos(a)*rr*.8,0,z0+D/2+rr+Math.sin(a)*rr*.8],0));}parts.push(Cy('stoneDark',.6,.9,[0,.12,z0+D/2+rr],1,8));}
  parts.push(B('fire',[.4,.1,.4],[0,0,z0],0));return {parts,entry:{x:0,z:z0+D/2,width:1.6}};}
 if(e===2){const W=w*.8,D=d*.62,h=range(r,2.8,3.4),z0=-d/2+D/2+.2,wm=ctx.material==='stone'?'stone':'woodMid';parts.push(B(wm,[W,h,D],[0,0,z0],2));gableRoof(parts,ctx,D,W,h,roofPitch(ctx,r),0,z0,'x',.25);
  const pw=W*.5,pd=Math.min(1.8,d/2-(z0+D/2)-.1);for(const s of[-1,1])parts.push(beam('woodDark',[s*pw/2,0,z0+D/2+pd-.1],[s*pw/2,h*.85,z0+D/2+pd-.1],.18,2));parts.push(part('prism','shingle',[pw+.3,.9,pd+.1],[0,h*.85,z0+D/2+pd/2-.05],2),B('stone',[pw,.3,pd],[0,0,z0+D/2+pd/2],1));
  for(let i=0;i<4;i++)windowAt(parts,-W*.38+i*W*.25,h*.6,z0+D/2+.03,'z');
  parts.push(beam('woodDark',[W/2-.4,h,z0],[W/2-.4,h+2.2,z0],.16,1),beam('woodDark',[W/2-.4,h+2,z0],[W/2-.4+.01,h+2.01,z0],.06,0),B('woodDark',[.8,.1,.1],[W/2-.4,h+2.2,z0],1));
  return {parts,entry:{x:0,z:z0+D/2+pd,width:pw*.6}};}
 // era >= 3: arcaded stone hall; era >= 5: palace with wings and a clock tower.
 const palace=e>=5,W=w*.9,D=d*.7,z0=-d/2+D/2+.2,gh=3,uh=3.2,wm='stone';
 parts.push(B('stoneDark',[W,.3,D],[0,0,z0],2));
 const arches=pick(r,[4,5,6]);for(let i=0;i<=arches;i++){const x=-W/2+.35+i*(W-.7)/arches;parts.push(Cy('stone',.5,gh,[x,.3,z0+D/2-.4],2,8));}
 parts.push(B('stoneDark',[W,.35,.9],[0,.3+gh,z0+D/2-.4],2),B(wm,[W*.96,gh,D-.9],[0,.3,z0-.45],2),B(wm,[W*.96,uh,D],[0,.3+gh+.35,z0],2));
 for(let i=0;i<arches;i++){windowAt(parts,-W/2+(i+.5)*W/arches,.3+gh+1.9,z0+D/2+.03,'z');}
 const top=.3+gh+.35+uh;gableRoof(parts,ctx,D,W,top,roofPitch(ctx,r)*.8,0,z0,'x',.3,'tile');
 if(palace){const wing=W*.2;for(const s of[-1,1])parts.push(B(wm,[wing,uh+gh,D*.6],[s*(W/2-wing/2),.3,z0-D*.2],2));}
 const tt=palace?2.4:1.8,th=palace?9:6;parts.push(B(wm,[tt,th,tt],[0,top-uh*.2,z0-D*.1],2),B('woodDark',[tt*.8,.7,tt*.8],[0,top-uh*.2+th,z0-D*.1],1),part('pyramid',roofMaterial(ctx),[tt+.3,2.2,tt+.3],[0,top-uh*.2+th+.7,z0-D*.1],2));
 if(palace)for(const [dx,dz] of[[0,1],[0,-1],[1,0],[-1,0]] as const)parts.push(part('cylinder','plaster',[.9,.06,.9],[dx*(tt/2+.03),top-uh*.2+th-1.6,z0-D*.1+dz*(tt/2+.03)],0,[dz?Math.PI/2:0,0,dx?Math.PI/2:0],10));
 const n=Math.ceil(.3/.18);void n;parts.push(B('stone',[W*.3,.15,.5],[0,0,z0+D/2+.3],1));
 return {parts,entry:{x:0,z:z0+D/2+.5,width:W*.3}};
};

type Def={reference:string;generate:Generator;/** nominal footprints (m) per size class this family is tested at */sizes:{w:number;d:number}[]};
export const CIVIC_FAMILIES:Record<CivicFamilyId,Def>={
 marketHall:{reference:'Medieval market halls (open-arcade halls with an upper moot room) and the booth ring of a market square',generate:marketHall,sizes:[{w:7.4,d:7},{w:12,d:10},{w:18,d:14}]},
 shrine:{reference:'Stepped terrace temples (mastaba and ziggurat grammar), peripteral colonnade temples, raised timber pavilion halls',generate:shrine,sizes:[{w:8.4,d:8},{w:6,d:6},{w:12,d:10}]},
 archive:{reference:'Library of Celsus, monastic scriptoria and stone record houses with high light and a reading porch',generate:archive,sizes:[{w:7,d:7},{w:10,d:8},{w:6,d:6}]},
 lyceum:{reference:'Aristotle\'s Lyceum peripatos and medieval cloister garths with an apsidal lecture hall',generate:lyceum,sizes:[{w:10,d:8.6},{w:12,d:10},{w:8,d:8}]},
 fortBarracks:{reference:'Roman auxiliary fort barracks: walled yard, gatehouse, bunk ranges and corner towers',generate:fortBarracks,sizes:[{w:8.8,d:8.2},{w:12,d:10},{w:7,d:7}]},
 smithy:{reference:'Open-front village smithies (Viking and medieval forges): hearth, bellows, anvil, quench trough, chimney',generate:smithy,sizes:[{w:6.4,d:6},{w:5,d:5},{w:8,d:7}]},
 kilnYard:{reference:'Updraft pottery kilns (Greek and Roman) and Roman brick clamps with drying hacks',generate:kilnYard,sizes:[{w:4,d:4},{w:6,d:6},{w:8,d:7}]},
 storeBarn:{reference:'Staddle-stone granaries, Egyptian domed clay bins, Iron Age grain pits and slatted corn cribs',generate:storeBarn,sizes:[{w:6.6,d:6},{w:5,d:5},{w:8,d:7}]},
 dryingYard:{reference:'Scandinavian stockfish racks, smoke huts and wind-dried meat frames',generate:dryingYard,sizes:[{w:4,d:3},{w:5,d:4},{w:6,d:5}]},
 tannery:{reference:'Medieval tanneries (Fez-style vats, lime pits, stretching frames, bark stacks)',generate:tannery,sizes:[{w:4,d:4},{w:6,d:5},{w:7,d:6}]},
 loomHouse:{reference:'Warp-weighted loom sheds (Greek and Norse) with dye vats and a drying line',generate:loomHouse,sizes:[{w:4,d:4},{w:6,d:5},{w:8,d:6}]},
 bakeryOven:{reference:'Roman and medieval bakeries: domed communal bread oven, kneading table, flour bins',generate:bakeryOven,sizes:[{w:4,d:4},{w:5.4,d:5},{w:7,d:6}]},
 windmill:{reference:'Post mills (medieval Europe) and tower mills with rotating caps and sails',generate:windmill,sizes:[{w:5,d:5},{w:6,d:6},{w:8,d:8}]},
 horseMill:{reference:'Horse gin and capstan mills: a round shed with a central shaft turned by walking animals',generate:horseMill,sizes:[{w:5,d:5},{w:6,d:6},{w:8,d:8}]},
 harborStore:{reference:'Hanseatic quayside warehouses (Speicher) with loading doors, hoist beam and barrels',generate:harborStore,sizes:[{w:6.6,d:6},{w:9,d:8},{w:12,d:10}]},
 shipyard:{reference:'Open slipways with keel blocks, half-framed hulls, cradles, a sawpit and a covered shed (cf. Viking boat building)',generate:shipyard,sizes:[{w:6,d:12},{w:8,d:14},{w:10,d:16}]},
 beacon:{reference:'Roman signal towers (Trajan\'s Column watchtowers) and Tudor hilltop beacon poles with fire baskets',generate:beacon,sizes:[{w:4.6,d:4.6},{w:6,d:6},{w:5,d:5}]},
 gatehouse:{reference:'Castle and city gatehouses: flanking towers, vaulted passage, portcullis slot, wall stubs',generate:gatehouse,sizes:[{w:8,d:4},{w:10,d:5},{w:12,d:6}]},
 townHall:{reference:'Longhall council ring, timber moot halls with bell frames, arcaded stone town halls and civic palaces with clock towers',generate:townHall,sizes:[{w:10,d:10},{w:8,d:8},{w:14,d:12}]},
};
/** Simulation roles. `sim` = existing BldType; otherwise a PROPOSED id Codex must add (nothing here edits the sim). */
export const CIVIC_ROLES:Record<string,{family:CivicFamilyId;sim:boolean;note:string;trade?:string}>={
 market:{family:'marketHall',sim:true,note:'replaces the booth-only market with hall plus stall ring'},temple:{family:'shrine',sim:true,note:'three cultural grammars via culture habit'},
 university:{family:'lyceum',sim:true,note:'cloister and lecture hall'},barracks:{family:'fortBarracks',sim:true,note:'walled yard with gatehouse'},forge:{family:'smithy',sim:true,note:'real forge layout'},
 kiln:{family:'kilnYard',sim:true,note:'pottery or brick'},warehouse:{family:'harborStore',sim:true,note:'quayside store; inland warehouse can use storeBarn'},smokehouse:{family:'dryingYard',sim:true,note:'smoke hut with frames',trade:'smoke'},
 dryrack:{family:'dryingYard',sim:true,note:'frames and windbreak'},tanner:{family:'tannery',sim:true,note:'vats and pits'},fibreWorkshop:{family:'loomHouse',sim:true,note:'looms and dye vats'},oven:{family:'bakeryOven',sim:true,note:'bread oven house'},
 townhall:{family:'townHall',sim:true,note:'by era'},watchtower:{family:'beacon',sim:true,note:'signal tower; existing tower family stays for plain lookout'},
 archive:{family:'archive',sim:false,note:'records and learning; proposed id'},granary:{family:'storeBarn',sim:false,note:'raised, domed, pit and crib stores; proposed id (warehouse covers stores today)'},
 windmill:{family:'windmill',sim:true,note:'post or tower mill; real water-works building'},horsemill:{family:'horseMill',sim:false,note:'animal-powered mill; proposed id'},shipyard:{family:'shipyard',sim:false,note:'slipway; proposed id'},
 gatehouse:{family:'gatehouse',sim:false,note:'stone gatehouse; the existing gate is a palisade gap; proposed id'},beacon:{family:'beacon',sim:false,note:'fire signal; proposed id'},
};

/** Culture is the DEFAULT path: a culture's architectural habit sets material, climate and tradition unless the caller
 * pinned them, and `dress` adds the roof, trim, banner, doorway and stilt habits that make one civ's village read as its own. */
export function applyCulture(ctx:CivicContext):CivicContext{
 const a=ctx.culture?.architecture;if(!a)return ctx;
 return {...ctx,material:(ctx.pinned?ctx.material:a.material) as CivicContext['material'],climate:(ctx.pinned?ctx.climate:a.climate) as CivicContext['climate'],tradition:ctx.tradition??a.tradition as CivicContext['tradition']};
}
export type CultureHabit={roofScale:number;finials:0|2|4;banner:boolean;doorway:'post'|'arch'|'gable';stilts:boolean;courtyard:boolean;eaveKick:boolean};
export function habitOf(culture:Culture):CultureHabit{
 const a=culture.architecture,h=(k:string)=>hashSeed(culture.key,k);
 return {roofScale:.72+(h('roof')%70)/100,finials:a.ornament==='none'?0:(h('fin')%2?4:2),banner:h('ban')%3!==0,doorway:(['post','arch','gable'] as const)[h('door')%3],stilts:a.stilts,courtyard:a.courtyard,eaveKick:h('kick')%2===0};
}
const ROOFS=new Set(['thatch','shingle','tile']);
/** Culture dress: pure post-process on generated parts (before fit). Roof parts rescale about their own base, so nothing detaches. */
function dress(parts:Part[],ctx:CivicContext,entry:{x:number;z:number;width:number}|undefined,fp:{w:number;d:number},fam:CivicFamilyId):Part[]{
 if(!ctx.culture)return parts;const hb=habitOf(ctx.culture),{w,d}=fp;let out=parts.map(p=>ROOFS.has(p.mat)&&['prism','hip','pyramid','cone','wedge'].includes(p.shape)?{...p,size:[p.size[0],p.size[1]*hb.roofScale,p.size[2]] as V3}:p);
 const top=Math.max(...out.map(p=>p.pos[1]+(p.size[1]??0)),3),wall=fam==='fortBarracks'||fam==='gatehouse'||fam==='shipyard'||fam==='beacon';
 if(hb.finials&&!wall){const n=hb.finials,roofTop=Math.max(...out.filter(p=>ROOFS.has(p.mat)).map(p=>p.pos[1]+p.size[1]),top*.7);for(let i=0;i<n;i++){const x=(i-(n-1)/2)*Math.min(w*.3,1.2);out.push(part('cone','woodInlay',[.22,.5,.22],[x,roofTop,-d*.1],0,undefined,5),part('cylinder','woodInlay',[.1,.02,.1],[x,roofTop-.02,-d*.1],0,undefined,5));}}
 if(wall){const n=1+hashSeed(ctx.culture.key,'poles')%3;for(let i=0;i<n;i++){const x=Math.min(w/2-.3,(entry?.width??2)/2+.7)*(i%2?1:-1),z=d/2-.3-Math.floor(i/2)*.5;out.push(beam('woodDark',[x,0,z],[x,3+(i%2)*.8,z],.09,1),B('cloth',[.6,.7,.03],[x+.34,2.3+(i%2)*.8,z],1));}}
 else if(hb.banner){const x=Math.min(w/2-.3,(entry?.width??2)/2+.8)*(hashSeed(ctx.culture.key,'side')%2?1:-1),z=d/2-.35;out.push(beam('woodDark',[x,0,z],[x,3.6,z],.09,1),B('cloth',[.7,.9,.03],[x+.38,2.6,z],1));}
 if(entry&&!wall){const ew=Math.min(entry.width*.5,w/2-.3,1.1),ez=Math.min(entry.z,d/2-.25);if(hb.doorway==='arch')out.push(part('cylinder','woodInlay',[.16,ew*2,.16],[0,2.1,ez],0,[0,0,Math.PI/2],6));else if(hb.doorway==='gable')out.push(part('prism','woodEdge',[ew*2+.3,.45,.2],[0,2.1,ez],0,[0,Math.PI/2,0]));else for(const s of[-1,1])out.push(beam('woodEdge',[s*ew,0,ez],[s*ew,2.1,ez],.12,0));}
 if(hb.courtyard&&!wall){const h=.7;out.push(B('stoneDark',[w-.3,h,.22],[0,0,-d/2+.2],0));for(const s of[-1,1])out.push(B('stoneDark',[.22,h,d*.5],[s*(w/2-.2),0,-d/4],0));}
 if(hb.stilts&&!wall){const lift=.6,bases=out.filter(p=>partBoundsY0(p)<.1&&p.size[0]*p.size[2]>.8&&!['foliage','water'].includes(p.mat)).slice(0,10);
  const lifted=out.map(p=>p.shape==='box'||p.shape==='cylinder'||true?{...p,pos:[p.pos[0],p.pos[1]+lift,p.pos[2]] as V3}:p);out=lifted;
  for(const b of bases){const x=b.pos[0],z=b.pos[2],e=Math.min(b.size[0],b.size[2])*.35;for(const [dx,dz] of[[-1,-1],[1,1],[1,-1],[-1,1]] as const)out.push(beam('woodDark',[x+dx*e,0,z+dz*e],[x+dx*e,lift+.05,z+dz*e],.14,2));}}
 return out;
}
const partBoundsY0=(p:Part)=>p.pos[1];
/** Seeded structural additions (porch, chimney stack, woodpile, fence run, prosperity banner), identical whatever the family draws. */
function additions(parts:Part[],ctx:CivicContext,entry:{x:number;z:number;width:number}|undefined,fp:{w:number;d:number},fam:CivicFamilyId):Part[]{
 if(['fortBarracks','gatehouse','shipyard','beacon','windmill','horseMill'].includes(fam))return parts;
 const r=seededRandom(ctx.seed^0x5bd1e995),{w,d}=fp,out=[...parts];
 if(entry&&chance(r,.45)){const pw=Math.min(Math.max(.8,entry.width*.5),w/2-.5),z=Math.min(entry.z,d/2-.55);out.push(part('wedge',roofMaterial(ctx),[pw*2+.3,.4,.9],[entry.x,2.3,z],1),...[-1,1].map(s=>beam('woodDark',[entry.x+s*pw,0,z+.3],[entry.x+s*pw,2.3,z+.3],.12,1)));}
 if(chance(r,.4)){const sx=chance(r,.5)?1:-1;out.push(B(ctx.material==='timber'?'stone':'stoneDark',[.55,range(r,3.4,4.6),.55],[sx*(w/2-.4),0,-d/2+.4],1));}
 if(chance(r,.4)){const sx=chance(r,.5)?1:-1,n=pick(r,[2,3]);for(let i=0;i<n;i++)out.push(Cy('trunk',.32,.9,[sx*(w/2-.4),i*.3,d/2-.9-i*.02],0,6));}
 if(chance(r,.3)){const n=pick(r,[2,3]);for(let i=0;i<n;i++)out.push(beam('woodMid',[-w/2+.3+i*.6,0,d/2-.3],[-w/2+.3+i*.6,.9,d/2-.3],.07,0));}
 if(ctx.wealth>.55&&chance(r,.7))out.push(beam('woodDark',[-w/2+.4,0,d/2-.4],[-w/2+.4,3.2,d/2-.4],.09,1),B('cloth',[.6,.8,.03],[-w/2+.7,2.4,d/2-.4],1));
 return out;
}
/** Tier-0 grounding: a near-only part with nothing beneath it gets a short post (the far tiers are handled by ensureTierSupport). */
export function ensureNearSupport(parts:Part[],footprint:{w:number;d:number}):Part[]{
 let out=parts;for(let g=0;g<40;g++){const spec={family:'',variantKey:'',footprint,parts:out,notes:{reference:''}},fl=floatingParts(spec);if(!fl.length)break;
  let low=out[fl[0]],ly=Infinity;for(const i of fl){const b=partBounds(out[i]);if(b.minY<ly){ly=b.minY;low=out[i];}}
  const b=partBounds(low);out=[...out,part('box','woodDark',[Math.max(.15,(b.maxX-b.minX)*.2),ly,Math.max(.15,(b.maxZ-b.minZ)*.2)],[(b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2],0)];}
 return out;
}
/** Tiers 1 and 2: a far-tier part with nothing beneath gets a pier that exists only from that tier (same rule as the live pipeline, with a deeper guard). */
export function ensureTiers(parts:Part[],footprint:{w:number;d:number}):Part[]{
 let out=parts;const mk=(ps:Part[])=>({family:'',variantKey:'',footprint,parts:ps,notes:{reference:''}});
 for(const tier of[1,2] as const)for(let g=0;g<80;g++){const sub=partsAtLod(mk(out),tier),fl=floatingParts(mk(sub));if(!fl.length)break;
  let low=sub[fl[0]],ly=Infinity;for(const i of fl){const b=partBounds(sub[i]);if(b.minY<ly){ly=b.minY;low=sub[i];}}
  const b=partBounds(low);out=[...out,{...part('box','stoneDark',[Math.max(.15,(b.maxX-b.minX)*.7),ly,Math.max(.15,(b.maxZ-b.minZ)*.7)],[(b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2],2),onlyFrom:tier}];}
 return out;
}
/** A tier must draw something: when no part is marked core, promote the heaviest. */
export function ensureCore(parts:Part[]):Part[]{
 if(parts.some(p=>p.lod===2&&!p.onlyFrom))return parts;let k=0,best=-1;parts.forEach((p,i)=>{const v=p.size[0]*p.size[1]*p.size[2];if(v>best){best=v;k=i;}});return parts.map((p,i)=>i===k?{...p,lod:2 as const}:p);
}
/** Same pipeline as generateFamily plus culture dress and additions: generate, dress, fit inside the footprint, ground every LOD tier. */
export function generateCivic(family:CivicFamilyId,input:CivicContext,variantKey:string):BuildingSpec{
 const ctx=applyCulture(input),def=CIVIC_FAMILIES[family],r=seededRandom(ctx.seed),out=def.generate(ctx,r);
 let parts=ctx.lit===false?out.parts.filter(p=>p.mat!=='fire'):out.parts;
 parts=additions(parts,ctx,out.entry,ctx.footprint,family);parts=dress(parts,ctx,out.entry,ctx.footprint,family);parts=ensureCore(parts);
 const margin=family==='gatehouse'?.02:.1,e=out.entry;
 const fit=fitToFootprint({family,variantKey,footprint:{...ctx.footprint},parts,...(e?{entry:e}:{}),notes:{reference:def.reference,...(ctx.culture?{culture:ctx.culture.key}:{})}},margin);
 const {w,d}=fit.footprint,entry=fit.entry?{...fit.entry,x:Math.max(-w/2,Math.min(w/2,fit.entry.x)),z:Math.max(-d/2,Math.min(d/2,fit.entry.z))}:undefined;
 const grounded=ensureNearSupport(fit.parts,fit.footprint);
 return {...fit,...(entry?{entry}:{}),parts:ensureTiers(grounded,fit.footprint)};
}
void door;
