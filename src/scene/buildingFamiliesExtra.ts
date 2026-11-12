/** Option H carved families for the building types the first batch left on the
 * classic renderer: farm (field plot), pen, dock (pier), bridge, keep, stables,
 * academy (college/stoa), quarry, cairn, sacred grove, frontier outpost,
 * threshing floor and the 4 m earthwork cells (stone wall, trench, moat).
 * Same rules as buildingFamilies.ts: pure parts, metres, entrance +Z, nothing
 * larger than the footprint (the field, pen and quarry ARE their footprint, so
 * they use many thin functional pieces, never one slab), real-world reference
 * for each, structural variation from era/material/climate/wealth/tradition. */
import {beam,chance,far,part,pick,range,type Part} from './buildingParts';
import {door,windowAt,gableRoof,roofPitch,roofMaterial,wallMaterial,maxStoreys,type ExtraFamilyId,type Generator,type WallAxis} from './buildingHelpers';

type Def={reference:string;generate:Generator};
type V3=[number,number,number];
const B=(mat:Part['mat'],size:V3,pos:V3,lod:0|1|2=1,rot?:V3)=>part('box',mat,size,pos,lod,rot);

/** Arms of a 4 m cell element. 'corner' joins +X and +Z neighbours (the adapter
 * yaws it for other corners); every arm runs to the cell edge. */
function arms(axis:WallAxis,w:number,d:number,t:number){
 if(axis==='corner')return [{along:'x' as const,cx:(w/2-t/2)/2,cz:0,len:w/2+t/2},{along:'z' as const,cx:0,cz:(d/2-t/2)/2,len:d/2+t/2}];
 return axis==='x'?[{along:'x' as const,cx:0,cz:0,len:w}]:[{along:'z' as const,cx:0,cz:0,len:d}];
}
type Arm=ReturnType<typeof arms>[number];
/** Box along an arm: `off` along the run, `lat` across it. */
const armBox=(a:Arm,mat:Part['mat'],len:number,h:number,th:number,off:number,lat:number,y:number,lod:0|1|2=1)=>
 B(mat,a.along==='x'?[len,h,th]:[th,h,len],[a.cx+(a.along==='x'?off:lat),y,a.cz+(a.along==='z'?off:lat)],lod);

/** Farm: ridge-and-furrow strips (Laxton/Midland open fields) with crop rows on
 * the ridges, hurdle or dry-stone edging, a headland and field gate; hill
 * fields add a clearance wall, arid fields an irrigation channel. */
const fieldPlot:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,PW=w/2*.92,PD=d/2*.92,head=range(r,1.2,1.7),dry=ctx.climate==='arid',stoneEdge=ctx.era>=2&&(ctx.climate==='cold'||ctx.material==='stone');
 const chan=dry?.7:0,x0=-PW+.35+chan,x1=PW-.35,rows=Math.max(4,Math.round((x1-x0)/range(r,.95,1.3))),rw=(x1-x0)/rows,z0=-PD+.3,L=PD-head-z0,zc=(z0+PD-head)/2;
 const ridgeH=range(r,.2,.3);
 for(let i=0;i<rows;i++){const x=x0+(i+.5)*rw;
  parts.push(B('woodDark',[rw*.66,ridgeH,L],[x,0,zc],1));
  const grain=i%3!==1;if(ctx.era>=0)parts.push(B(grain?'foliage':'foliageDark',[rw*(grain?.4:.3),grain?.2:.34,L*.94],[x,ridgeH,zc],1));}
 parts.push(far(B('woodDark',[x1-x0,ridgeH+.1,L],[(x0+x1)/2,0,zc],2)));
 const spacing=1.5,edgeH=stoneEdge?.75:.85;
 const run=(ax:'x'|'z',fixed:number,a0:number,a1:number)=>{
  const len=a1-a0,c=(a0+a1)/2;if(len<.3)return;
  if(stoneEdge){parts.push(B('stone',ax==='x'?[len,edgeH,.38]:[.38,edgeH,len],ax==='x'?[c,0,fixed]:[fixed,0,c],2),B('stoneDark',ax==='x'?[len,.1,.46]:[.46,.1,len],ax==='x'?[c,edgeH,fixed]:[fixed,edgeH,c],1));return;}
  const n=Math.max(1,Math.round(len/spacing));
  for(let i=0;i<=n;i++){const t=a0+i*len/n;parts.push(part('cylinder','woodDark',[.13,edgeH+.2,.11],ax==='x'?[t,0,fixed]:[fixed,0,t],1,undefined,5));}
  for(const y of[.35,.7])parts.push(B('woodMid',ax==='x'?[len,.08,.08]:[.08,.08,len],ax==='x'?[c,y,fixed]:[fixed,y,c],2));
  parts.push(B('woodLight',ax==='x'?[len,.4,.04]:[.04,.4,len],ax==='x'?[c,.2,fixed]:[fixed,.2,c],0));
 };
 const gate=.85;run('x',-PD,-PW,PW);run('z',-PW,-PD,PD);run('z',PW,-PD,PD);run('x',PD,-PW,-gate);run('x',PD,gate,PW);
 parts.push(B('woodEdge',[gate*2-.1,.7,.06],[0,.1,PD],0));
 if(dry){const cx=-PW+.45;parts.push(B('stoneDark',[.14,.22,L],[cx-.3,0,zc],1),B('stoneDark',[.14,.22,L],[cx+.3,0,zc],1),B('water',[.46,.1,L],[cx,0,zc],0));}
 if(ctx.wealth>.4&&ctx.era>=1){const sx=-PW+.95,sz=PD-.75;parts.push(B(wallMaterial(ctx),[1.3,1.15,1],[sx,0,sz],2),part('wedge',roofMaterial(ctx),[1.5,.5,1.2],[sx,1.15,sz],1,[0,Math.PI,0]),B('woodEdge',[.45,.85,.06],[sx+.2,0,sz+.52],0));}
 if(ctx.era>=1&&chance(r,.7)){const sx=range(r,-PW*.4,PW*.4),sz=zc;parts.push(beam('woodDark',[sx,0,sz],[sx,1.5,sz],.07,0),B('woodDark',[.9,.06,.06],[sx,1.2,sz],0),B('cloth',[.5,.5,.05],[sx,.65,sz],0));}
 if(ctx.era>=1&&chance(r,.4))parts.push(part('cone','stoneDark',[.8,.5,.8],[PW-.8,0,-PD+.7],1,undefined,6));
 return {parts,entry:{x:0,z:PD,width:gate*2}};
};

/** Animal pen: wattle-hurdle fold (Butser/Iron Age) or dry-stone sheepfold,
 * a gate in the front side, a lean-to shelter on the back wall and a trough.
 * Adapts to any dragged size; post spacing widens on big pens. */
const pen:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,PW=w/2-.3,PD=d/2-.3,stone=ctx.climate==='cold'||(ctx.material==='stone'&&ctx.era>=2),gate=Math.min(1.9,PW*.6),H=stone?.95:range(r,1.05,1.3);
 const run=(ax:'x'|'z',fixed:number,a0:number,a1:number)=>{
  const len=a1-a0,c=(a0+a1)/2;if(len<.3)return;const at=(t:number):V3=>ax==='x'?[t,0,fixed]:[fixed,0,t];
  if(stone){parts.push(B('stone',ax==='x'?[len,H,.45]:[.45,H,len],at(c),2),B('stoneDark',ax==='x'?[len,.12,.56]:[.56,.12,len],[at(c)[0],H,at(c)[2]],1));return;}
  const n=Math.max(1,Math.min(12,Math.round(len/range(r,1.4,1.8))));
  for(let i=0;i<=n;i++){const t=a0+i*len/n;parts.push(part('cylinder','woodDark',[.15,H+.15,.12],at(t),1,undefined,6));}
  for(const y of[.4,H*.8])parts.push(B('woodMid',ax==='x'?[len,.09,.09]:[.09,.09,len],[at(c)[0],y,at(c)[2]],2));
  parts.push(B('woodLight',ax==='x'?[len,H*.55,.05]:[.05,H*.55,len],[at(c)[0],.15,at(c)[2]],0));
 };
 run('x',-PD,-PW,PW);run('z',-PW,-PD,PD);run('z',PW,-PD,PD);run('x',PD,-PW,-gate/2);run('x',PD,gate/2,PW);
 // Gate leaf swung open against the front-right post, finials on the posts for rich keepers.
 parts.push(B('woodEdge',[gate*.55,H*.85,.07],[gate/2+.3,0,PD-.4],0,[0,.7,0]));
 for(const s of[-1,1])parts.push(part('cylinder','woodEdge',[.2,H+.45,.18],[s*gate/2,0,PD],1,undefined,6));
 const sw=Math.min(3.2,PW*.9),sd=Math.min(1.9,PD*.8),sx=pick(r,[-1,1])*(PW-sw/2-.2),sz=-PD+sd/2+.25;
 for(const px of[-1,1]){parts.push(beam('woodDark',[sx+px*(sw/2-.12),0,sz-sd/2+.1],[sx+px*(sw/2-.12),1.9,sz-sd/2+.1],.14,1),beam('woodDark',[sx+px*(sw/2-.12),0,sz+sd/2-.1],[sx+px*(sw/2-.12),1.35,sz+sd/2-.1],.14,1));}
 parts.push(part('wedge',stone||ctx.era>=2?roofMaterial(ctx):'thatch',[sw+.3,.58,sd+.3],[sx,1.35,sz],2));
 const tx=-Math.sign(sx||1)*(PW*.35);parts.push(B('woodDark',[1.5,.34,.42],[tx,0,0],1),B('water',[1.36,.04,.3],[tx,.32,0],0));
 if(ctx.wealth>.5)parts.push(B('woodMid',[sw*.7,.4,.3],[sx,0,sz+sd/2-.5],0));
 return {parts,entry:{x:0,z:PD,width:gate}};
};

/** Fishing dock: timber pier on pile bents with deck planks and a T-head,
 * bollards, a shore ladder/steps, a fisher's hut and a net-drying rack. Built
 * facing the water at +Z (generateFamily yaws it to the real water side). */
const pier:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,Ld=d*range(r,.6,.72),zEnd=d/2-.1,z0=zEnd-Ld,dw=range(r,1.7,2.2),xo=range(r,-w*.12,w*.12),deckY=.5;
 parts.push(B('woodMid',[dw,.12,Ld],[xo,deckY,z0+Ld/2],2));
 const bents=Math.max(3,Math.round(Ld/1.6));
 for(let i=0;i<bents;i++){const z=z0+.3+i*(Ld-.6)/(bents-1);for(const s of[-1,1])parts.push(part('cylinder','woodDark',[.26,deckY,.22],[xo+s*(dw/2-.12),0,z],1,undefined,6));
  parts.push(B('woodEdge',[dw,.1,.16],[xo,deckY-.1,z],1));}
 for(const s of[-1,1])parts.push(B('woodDark',[.14,.2,Ld],[xo+s*(dw/2-.12),deckY-.2,z0+Ld/2],1));
 for(let i=0;i<Math.round(Ld/.4);i++)parts.push(B('woodLight',[dw+.06,.03,.3],[xo,deckY+.12,z0+.2+i*(Ld-.4)/Math.round(Ld/.4)],0));
 const th=Math.min(w*.5,dw+range(r,1.4,2.4)),tz=zEnd-.5;
 parts.push(B('woodMid',[th,.12,1],[xo,deckY,tz],2));
 for(const s of[-1,1])for(const z of[tz-.4,tz+.4])parts.push(part('cylinder','woodDark',[.26,deckY,.22],[xo+s*(th/2-.14),0,z],1,undefined,6));
 for(const s of[-1,1])parts.push(part('cylinder','woodEdge',[.24,.5,.2],[xo+s*(th/2-.2),deckY+.12,tz],1,undefined,6));
 parts.push(beam('woodLight',[xo+dw/2-.2,0,tz+.45],[xo+dw/2-.2,deckY,tz+.45],.07,0)); // boat ladder
 // Shore steps rising onto the deck.
 parts.push(B('stoneDark',[dw*.9,.28,.45],[xo,0,z0-.7],1),B('stone',[dw*.9,.5,.45],[xo,0,z0-.25],1));
 if(ctx.era>=1){const hx=-w/2+1.15,hz=-d/2+1,hw=1.6,hd=1.3,h=1.5;parts.push(B(wallMaterial(ctx),[hw,h,hd],[hx,0,hz],2));gableRoof(parts,ctx,hd,hw,h,roofPitch(ctx,r),hx,hz,'x',.12);door(parts,hx,hz+hd/2+.03,.7,1.25);}
 const rx=w/2-1.3,rz=-d/2+1.2;for(const s of[-1,1])parts.push(beam('woodDark',[rx+s*.8,0,rz],[rx+s*.8,1.5,rz],.09,1));
 parts.push(B('woodMid',[1.7,.07,.07],[rx,1.4,rz],1),B('cloth',[1.4,.8,.04],[rx,.65,rz],0));
 if(ctx.era>=3&&ctx.wealth>.45){parts.push(beam('woodDark',[xo-dw/2+.1,deckY,tz-.3],[xo-dw/2+.1,2.4,tz-.3],.16,1),beam('woodDark',[xo-dw/2+.1,2.3,tz-.3],[xo+dw/2+.3,2.3,tz-.3],.1,1),beam('iron',[xo+dw/2+.2,2.3,tz-.3],[xo+dw/2+.2,1.5,tz-.3],.03,0));} // hoist crane
 return {parts,entry:{x:xo,z:z0-.9,width:dw}};
};

/** Bridge: spans along Z (generateFamily turns it when the footprint is wider
 * than deep). Early/forest: log-stringer trestle with plank deck and rails;
 * stone/hill: Dartmoor-style clapper bridge (slabs on piers) with parapets.
 * Piers/piles stand on y=0 (bank level); the renderer extends them to the bed. */
const bridge:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,Bw=Math.min(w*.62,range(r,2.4,3.2)),stone=(ctx.material==='stone'||ctx.climate==='cold')&&ctx.era>=2,H=stone?range(r,1.1,1.4):range(r,.8,1.1),Lc=d,ramp=1.2,n=3;
 const dz0=-Lc/2+ramp,dz1=Lc/2-ramp,Ld=dz1-dz0;
 const topH=stone?H-.3:H-.14;
 for(const s of[-1,1])for(let i=0;i<n;i++)parts.push(B(stone?'stone':'woodDark',[Bw*.9,topH*(i+1)/n,ramp/n],[0,0,s*(Lc/2-(i+.5)*ramp/n)],1));
 if(stone){
  const spans=Math.max(1,Math.round(Ld/range(r,3.2,4.2))),sl=Ld/spans;
  for(let i=0;i<=spans;i++){const z=dz0+i*sl;parts.push(B('stoneDark',[Bw*.95,H-.3,.7],[0,0,Math.min(dz1-.35,Math.max(dz0+.35,z))],2));}
  for(let i=0;i<spans;i++){const z=dz0+(i+.5)*sl;parts.push(B('stone',[Bw,.3,sl+.04],[0,H-.3,z],2));parts.push(B('stoneDark',[Bw+.04,.04,.06],[0,H-.3,z-sl/2],0));}
  for(const s of[-1,1])parts.push(B('stone',[.28,.62,Ld],[s*(Bw/2-.14),H,(dz0+dz1)/2],1),B('stoneDark',[.38,.1,Ld],[s*(Bw/2-.14),H+.62,(dz0+dz1)/2],0));
  if(ctx.wealth>.5)for(const s of[-1,1])parts.push(part('pyramid','stoneDark',[.5,.45,.5],[s*(Bw/2-.14),H+.62,dz1-.1],0));
 }else{
  const bents=Math.max(2,Math.round(Ld/range(r,2.6,3.4))+1);
  for(let i=0;i<bents;i++){const z=dz0+.3+i*(Ld-.6)/(bents-1);for(const s of[-1,1])parts.push(part('cylinder','woodDark',[.32,H-.5,.28],[s*(Bw/2-.3),0,z],1,undefined,6));parts.push(B('woodEdge',[Bw,.15,.3],[0,H-.5,z],1));}
  for(const x of[-Bw/2+.3,0,Bw/2-.3])parts.push(B('woodDark',[.22,.21,Ld],[x,H-.35,(dz0+dz1)/2],1));
  parts.push(B('woodMid',[Bw,.14,Ld],[0,H-.14,(dz0+dz1)/2],2));
  for(let i=0;i<Math.round(Ld/.45);i++)parts.push(B('woodLight',[Bw+.04,.03,.36],[0,H,dz0+.22+i*(Ld-.44)/Math.round(Ld/.45)],0));
  if(ctx.era>=1||ctx.wealth>.3){const posts=Math.max(2,Math.round(Ld/1.5)+1);for(const s of[-1,1]){for(let i=0;i<posts;i++)parts.push(part('cylinder','woodDark',[.13,1,.11],[s*(Bw/2-.1),H,dz0+.1+i*(Ld-.2)/(posts-1)],1,undefined,5));parts.push(B('woodMid',[.09,.09,Ld],[s*(Bw/2-.1),H+.9,(dz0+dz1)/2],1),B('woodMid',[.07,.07,Ld],[s*(Bw/2-.1),H+.5,(dz0+dz1)/2],0));}}
 }
 return {parts,entry:{x:0,z:Lc/2,width:Bw}};
};

/** Keep: Norman rectangular donjon (Hedingham/Rochester: plinth, corner
 * turrets, arrow slits, crenellated parapet, first-floor door by an external
 * stair), a round shell keep in cold uplands (Restormel) or, in early/timber
 * settlements, a jettied timber tower. */
const keep:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,timber=ctx.material==='timber'||ctx.material==='wattle'||ctx.era<2,round=!timber&&ctx.climate==='cold'&&chance(r,.6);
 const K=w*range(r,.7,.76),Kd=d*range(r,.66,.72),cz=-.55,h=timber?range(r,5,6.2):range(r,6.8,8.6)*(ctx.era>=3?1.1:1),doorY=range(r,2.8,3.4),front=cz+Kd/2;
 const wm=timber?'woodMid':'stone';
 if(round){const R=Math.min(K,Kd);parts.push(part('cylinder','stoneDark',[R+.5,.7,R+.5],[0,0,cz],1,undefined,14),part('cylinder','stone',[R,h,R*.98],[0,0,cz],2,undefined,14));
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;parts.push(B('stoneDark',[.6,.5,.36],[Math.sin(a)*(R/2-.12),h+.18,cz+Math.cos(a)*(R/2-.12)],1,[0,a,0]));}
  parts.push(part('cylinder','stoneDark',[R+.3,.2,R+.3],[0,h,cz],1,undefined,14));
  const fz=cz+R/2;for(let i=0;i<7;i++)parts.push(B('stone',[.55,doorY*(i+1)/7,.9],[-R*.22+i*.55,0,fz+.35],1));
  parts.push(B('woodEdge',[.8,1.5,.08],[-R*.22+3.85+.2,doorY,fz+.05],0));
  for(const a of[.5,2.1,3.6,5.2])parts.push(B('recess',[.12,.7,.12],[Math.sin(a)*R/2,h*.55,cz+Math.cos(a)*R/2],0,[0,a,0]));
  parts.push(part('cone',roofMaterial(ctx),[R*.7,1.5,R*.7],[0,h+.2,cz],1,undefined,12));
  return {parts,entry:{x:-R*.22,z:fz+.8,width:.9}};}
 if(timber){
  parts.push(B('stoneDark',[K+.2,.5,Kd+.2],[0,0,cz],1),B(wm,[K,h,Kd],[0,.5,cz],2),B('woodDark',[K+.3,.25,Kd+.3],[0,h+.5,cz],1),B('woodMid',[K+.55,1.9,Kd+.55],[0,h+.75,cz],2));
  parts.push(part('pyramid',roofMaterial(ctx),[K+.9,range(r,1.8,2.6),Kd+.9],[0,h+2.65,cz],2));
  for(let i=0;i<4;i++){const x=-K/2+(i+.5)*K/4;windowAt(parts,x,h+1.3,cz+Kd/2+.3,'z');parts.push(beam('woodDark',[x-K/8,h+.75,cz+Kd/2+.3],[x-K/8,h+2.65,cz+Kd/2+.3],.1,0));}
  for(let i=0;i<8;i++)parts.push(B('woodDark',[.14,h,.08],[-K/2+i*K/7,.5,front+.02],0));
  const st=7,sx0=-K/2+1.6;for(let i=0;i<st;i++)parts.push(B('woodDark',[.6,doorY*(i+1)/st,.9],[sx0+i*.6,.5,front+.5],1));
  parts.push(B('woodEdge',[.9,1.6,.08],[sx0+st*.6+.3,.5+doorY,front+.05],0));
  return {parts,entry:{x:sx0+1.5,z:front+1,width:.9}};}
 parts.push(B('stoneDark',[K+.3,.6,Kd+.3],[0,0,cz],1),B(wm,[K,h,Kd],[0,.6,cz],2));
 for(const sx of[-1,1])for(const sz of[-1,1]){parts.push(B('stone',[1.1,h+.9,1.1],[sx*(K/2-.15),.6,cz+sz*(Kd/2-.15)],2));
  if(ctx.era>=3)parts.push(part('pyramid',roofMaterial(ctx),[1.3,1.1,1.3],[sx*(K/2-.15),h+1.5,cz+sz*(Kd/2-.15)],1));}
 const ph=h+.6;parts.push(B('stoneDark',[K+.2,.3,Kd+.2],[0,ph,cz],1));
 for(const [len,ax,pos] of[[K,'x',front],[K,'x',cz-Kd/2],[Kd,'z',K/2],[Kd,'z',-K/2]] as const){const n=Math.floor(len/.95);
  for(let i=0;i<n;i++){const t=-len/2+(i+.5)*len/n;parts.push(B('stoneDark',ax==='x'?[.5,.5,.34]:[.34,.5,.5],ax==='x'?[t,ph+.3,pos]:[pos,ph+.3,cz+t],0));}}
 if(ctx.era>=3)parts.push({...part('hip',roofMaterial(ctx),[K-1.2,1.4,Kd-1.2],[0,ph+.3,cz],1),inset:.7});
 for(let i=0;i<3;i++){const x=-K/2+1.4*i+1.2;parts.push(B('recess',[.12,.7,.06],[x+.4,h*.55,cz-Kd/2-.04],0),B('recess',[.12,.7,.06],[-x-.4,h*.55,front+.04],0));}
 const st=7,sx0=-K/2+1.6;for(let i=0;i<st;i++)parts.push(B('stone',[.6,doorY*(i+1)/st,.9],[sx0+i*.6,.6,front+.5],1));
 parts.push(B('woodEdge',[.9,1.6,.08],[sx0+st*.6+.3,.6+doorY,front+.05],0));
 if(ctx.wealth>.6)parts.push(beam('woodDark',[K/2-.5,ph+.3,cz],[K/2-.5,ph+3,cz],.1,1),B('cloth',[.9,.55,.04],[K/2-.05,ph+2.3,cz],0));
 return {parts,entry:{x:sx0+1.5,z:front+1,width:.9}};
};

/** Stables: long gabled horse range (medieval stable blocks): Dutch half-doors,
 * hay hatch, hitching rail, water trough and mounting block in the yard. */
const stables:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,W=w*range(r,.84,.9),D=d*range(r,.5,.58),cz=-d/2+D/2+.25,wh=range(r,2.2,2.7),front=cz+D/2,wm=wallMaterial(ctx),stalls=Math.max(3,Math.min(5,Math.round(W/2.1)));
 if(ctx.material==='stone'||ctx.era>=2)parts.push(B('stoneDark',[W+.1,.3,D+.1],[0,0,cz],1));
 parts.push(B(wm,[W,wh,D],[0,0,cz],2));
 const rise=gableRoof(parts,ctx,D,W,wh,roofPitch(ctx,r),0,cz,'x',range(r,.25,.4));
 const bw=W/stalls;for(let i=0;i<stalls;i++){const x=-W/2+(i+.5)*bw;parts.push(B('woodEdge',[bw*.5,1.15,.08],[x,0,front+.03],1),B('recess',[bw*.42,.65,.06],[x,1.2,front+.04],0),B('woodDark',[.1,wh,.1],[x-bw/2,0,front+.04],1));}
 parts.push(B('woodDark',[.1,wh,.1],[W/2,0,front+.04],1));
 if(ctx.wealth>.35||ctx.era>=2){parts.push(B('recess',[.9,.8,.06],[(chance(r,.5)?-1:1)*W*.28,wh-.9,front+.04],0));parts.push(beam('woodDark',[W*.28,wh+rise*.6,front+.2],[W*.28,wh+rise*.6,front+.9],.08,0));}
 const yz=front+1.3;for(const s of[-1,1])parts.push(beam('woodDark',[s*W*.3,0,yz],[s*W*.3,1.1,yz],.12,1));parts.push(B('woodMid',[W*.6+.12,.1,.1],[0,1,yz],1));
 const tx=-W*.36;parts.push(B('woodDark',[1.6,.38,.46],[tx,0,yz+.65],1),B('water',[1.46,.04,.34],[tx,.36,yz+.65],0));
 parts.push(B('stone',[.7,.4,.5],[W*.34,0,yz+.65],0),B('stone',[.5,.2,.4],[W*.34,.4,yz+.65],0));
 if(ctx.era>=3&&ctx.wealth>.55)parts.push(B('woodMid',[.7,.55,.7],[0,wh+rise*.7,cz],1),part('pyramid',roofMaterial(ctx),[.95,.6,.95],[0,wh+rise*.7+.55,cz],1));
 door(parts,-W/2+.05,cz,.9,1.8,'-x');
 return {parts,entry:{x:0,z:yz+1.3,width:W*.5}};
};

/** Academy: early eras raise a Greek stoa/lyceum colonnade with a back wall;
 * later eras a collegiate hall range with a gate tower and a cloister walk
 * (Merton/Oxford), both opening on a court at +Z. */
const college:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,W=w*range(r,.82,.9);
 if(ctx.era<3){
  const D=d*range(r,.3,.38),cz=-d/2+D/2+.35,wh=range(r,3,3.5),cols=Math.max(5,Math.round(W/1.5)),front=cz+D/2;
  parts.push(B('stoneDark',[W,.22,D],[0,0,cz],1),B('plaster',[W,wh,.4],[0,.22,cz-D/2+.2],2));
  for(const s of[-1,1])parts.push(B('plaster',[.4,wh,D],[s*(W/2-.2),.22,cz],2));
  for(let i=0;i<cols;i++)parts.push(part('cylinder','stone',[.5,wh-.1,.42],[-W/2+.6+i*(W-1.2)/(cols-1),.22,front-.3],2,undefined,10));
  parts.push(B('stone',[W,.34,.6],[0,.22+wh-.1,front-.3],2),part('prism',roofMaterial(ctx),[D+.5,Math.min(1.4,D*.3),W+.5],[0,.22+wh+.24,cz],2,[0,Math.PI/2,0]));
  for(let i=0;i<4;i++)parts.push(B('stoneDark',[.7,.4,.35],[-W*.3+i*W*.2,0,front+.55],0)); // seats for teaching
  parts.push(part('cylinder','stone',[.9,.6,.9],[0,0,d/2-1.2],1,undefined,10),part('cylinder','water',[.7,.04,.7],[0,.58,d/2-1.2],0,undefined,10));
  return {parts,entry:{x:0,z:front+.5,width:W*.6}};}
 const D=d*range(r,.4,.46),cz=-d/2+D/2+.3,wh=range(r,4,4.8),front=cz+D/2,wm=ctx.material==='stone'?'stone':'plaster';
 parts.push(B('stoneDark',[W+.2,.4,D+.2],[0,0,cz],1),B(wm,[W,wh,D],[0,.4,cz],2));
 const rise=gableRoof(parts,ctx,D,W,wh+.4,roofPitch(ctx,r),0,cz,'x',.3);
 const bays=Math.max(4,Math.round(W/1.7));for(let i=0;i<bays;i++){const x=-W/2+(i+.5)*W/bays;if(Math.abs(x)<1.4)continue;parts.push(B('recess',[.5,1.3,.06],[x,1.6,front+.04],0),B('recess',[.5,1.3,.06],[x,wh-1.6,front+.04],0));if(i%2)parts.push(B('stoneDark',[.14,wh,.1],[x+W/bays/2,.4,front+.05],0));}
 const tw=range(r,2.1,2.6),th=wh+range(r,1.8,2.8),tz=front+.55-.1;
 parts.push(B('stone',[tw,th,1.6],[0,.4,tz],2),B('woodEdge',[1.1,2.1,.1],[0,.4,tz+.82],1),part('pyramid',roofMaterial(ctx),[tw+.3,1.7,1.9],[0,.4+th,tz],2));
 parts.push(part('sphere','iron',[.5,.55,.5],[0,.4+th-1.3,tz+.78],0));
 const cx0=1.7,cols=Math.max(2,Math.floor((W/2-cx0)/1.3));
 for(const s of[-1,1])for(let i=0;i<=cols;i++)parts.push(part('cylinder','stone',[.34,2.3,.3],[s*(cx0+.5+i*1.3),.2,front+1.45],1,undefined,8));
 for(const s of[-1,1]){const L=cols*1.3+.5+.35,xc=s*(cx0+.5+(cols*1.3)/2);parts.push(B('stoneDark',[L,.2,.4],[xc,2.5,front+1.45],1),part('wedge',roofMaterial(ctx),[L,.7,1.7],[xc,2.7,front+.75],2,[0,0,0]));}
 parts.push(part('cylinder','stone',[1,.7,1],[0,0,d/2-1.1],1,undefined,10),part('cylinder','water',[.8,.04,.8],[0,.68,d/2-1.1],0,undefined,10));
 return {parts,entry:{x:0,z:tz+.9,width:1.1}};
};

/** Quarry: stepped benches cut into a rock face, blocks still bonded at the
 * joints (no loose stockpile), a wedge-and-sledge ramp and, from the early
 * historic era, a treadwheel crane (Roman/medieval quarries). */
const quarry:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,steps=pick(r,[3,4]),stepD=range(r,.75,.95),stepH=range(r,.55,.75);
 for(let i=0;i<steps;i++){const bw=w*(.92-i*.06),z=-d/2+stepD*(i+.5)+.1,h=stepH*(steps-i);
  parts.push(B(i%2?'stoneDark':'stone',[bw,h,stepD],[0,0,z],2));
  const blocks=Math.max(2,Math.round(bw/1.25));for(let b=1;b<blocks;b++)parts.push(B('recess',[.05,h*.9,.05],[-bw/2+b*bw/blocks,h*.05,z+stepD/2],0)); // joints between uncut blocks
  parts.push(B('stoneDark',[bw,.06,.08],[0,h,z+stepD/2],0));}
 const frontZ=-d/2+stepD*steps+.1,fy=range(r,.5,.9);
 // Working floor edge: a low kerb of rejected rubble stones.
 for(let i=0;i<6;i++){const s=range(r,.4,.7);parts.push(B('stoneDark',[s,s*.7,s],[-w/2+.8+i*(w-1.6)/5,0,frontZ+.2+range(r,0,.4)],0,[0,range(r,0,1.5),0]));}
 parts.push(part('wedge','woodMid',[1.5,.5,2.2],[w/2-1.2,0,frontZ+.3],1,[0,Math.PI,0]));
 if(ctx.era>=1){const cx=-w/2+1.1,cz2=frontZ+.1;
  for(const s of[-1,1])parts.push(beam('woodDark',[cx+s*.55,0,cz2+.2],[cx,2.6,cz2],.14,1));
  parts.push(B('woodDark',[1.5,.14,.14],[cx,2.6,cz2],1),part('cylinder','woodMid',[1.4,.3,1.4],[cx,.7,cz2+.02],1,[0,0,Math.PI/2],10));
  parts.push(beam('woodLight',[cx,2.6,cz2],[cx+1.4,2,cz2+.5],.08,0));void fy;}
 return {parts,entry:{x:0,z:Math.min(d/2-.2,frontZ+1),width:2}};
};

/** Cairn: kerbed dry-stone mound with a passage and lintel (Maeshowe/Clava
 * chambered cairns) and a capstone; later eras raise a memorial cross. */
const cairn:Generator=(ctx,r)=>{
 const parts:Part[]=[],R=Math.min(ctx.footprint.w,ctx.footprint.d)/2*range(r,.78,.88),layers=pick(r,[3,4,5]),lh=range(r,.38,.5);
 for(let i=0;i<layers;i++){const k=1-i*(.7/layers),dd=2*R*k;parts.push(part('cylinder',i%2?'stoneDark':'stone',[dd,lh,dd*.96],[0,i*lh,0],2,undefined,12));}
 const top=layers*lh,kerb=Math.round(2*Math.PI*R/.75);
 for(let i=0;i<kerb;i++){const a=i/kerb*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.32)continue;parts.push(B('stoneDark',[.55,.45,.35],[Math.cos(a)*(R-.15),0,Math.sin(a)*(R-.15)],0,[0,-a-Math.PI/2,0]));}
 parts.push(part('cone','stone',[R*.5,.5,R*.5],[0,top,0],1,undefined,8));
 if(ctx.era<=2){parts.push(B('stoneDark',[.35,.9,.45],[-.5,0,R-.3],1),B('stoneDark',[.35,.9,.45],[.5,0,R-.3],1),B('stone',[1.5,.3,.6],[0,.9,R-.3],1),B('recess',[.65,.8,.1],[0,0,R-.05],0));}
 const cap=chance(r,.55)||ctx.era<3;
 if(ctx.era>=3){parts.push(B('stone',[.28,1.5,.28],[0,top+.4,0],1),B('stone',[.85,.26,.26],[0,top+1.1,0],1));}
 else if(cap)parts.push(B('stone',[.55,range(r,.9,1.4),.35],[0,top+.45,0],1,[0,range(r,0,1),0]));
 return {parts,entry:{x:0,z:R,width:.9}};
};

/** Sacred grove: a ring of old trees (broadleaf, conifer or olive by climate)
 * round a plain altar stone, carved boundary posts with cloth ribbons at the
 * entrance (Celtic nemeton / Germanic holy grove). Lollipop canopies. */
const grove:Generator=(ctx,r)=>{
 const parts:Part[]=[],half=Math.min(ctx.footprint.w,ctx.footprint.d)/2,n=pick(r,[5,6,7]),cr=range(r,.75,.9),ring=half-cr-.3,kind=ctx.climate==='cold'?'conifer':ctx.climate==='arid'?'olive':'broadleaf';
 for(let i=0;i<n;i++){const a=Math.PI/2+(i+.5)/n*Math.PI*2+range(r,-.12,.12);if(Math.sin(a)>.75&&Math.abs(Math.cos(a))<.55)continue;
  const x=Math.cos(a)*ring,z=Math.sin(a)*ring,th=range(r,1.3,2),rad=cr*range(r,.8,1);
  if(kind==='conifer'){parts.push(part('cylinder','trunk',[.3,th*.5,.22],[x,0,z],2,undefined,6),part('cone','foliageDark',[rad*2,th,rad*2],[x,th*.35,z],2,undefined,8),part('cone','foliage',[rad*1.4,th*.7,rad*1.4],[x,th*.9,z],1,undefined,8));}
  else{const t=kind==='olive'?th*.6:th;parts.push(part('cylinder','trunk',[.36,t,.26],[x,0,z],2,undefined,6),part('sphere',i%2?'foliageDark':'foliage',[rad*2,rad*1.5,rad*2],[x,t-.2,z],2));}}
 parts.push(B('stone',[1,.55,.65],[0,0,0],2),B('stoneDark',[1.2,.14,.8],[0,.55,0],1),part('cylinder','iron',[.4,.1,.4],[0,.69,0],0,undefined,6));
 for(const s of[-1,1]){const x=s*.95,z=half-.35;parts.push(part('cylinder','woodDark',[.26,1.9,.22],[x,0,z],1,undefined,6),part('sphere','woodLight',[.34,.34,.3],[x,1.9,z],0),B('cloth',[.06,.6,.28],[x+s*.12,1.15,z],0));}
 const stones=Math.round(2*Math.PI*(ring-cr*.6)/1.1);for(let i=0;i<stones;i++){const a=i/stones*Math.PI*2;if(Math.sin(a)>.7)continue;parts.push(B('stoneDark',[.3,.3,.3],[Math.cos(a)*(ring-cr-.1),0,Math.sin(a)*(ring-cr-.1)],0,[0,a,0]));}
 return {parts,entry:{x:0,z:half-.3,width:1.7}};
};

/** Frontier outpost: a marker mast with banner on a stacked-stone base ring and
 * an iron beacon basket (Roman limes signal posts, Hadrian's Wall turrets). */
const outpost:Generator=(ctx,r)=>{
 const parts:Part[]=[],R=Math.min(ctx.footprint.w,ctx.footprint.d)/2*range(r,.62,.74),mast=range(r,4.2,5.4);
 parts.push(part('cylinder','stoneDark',[2*R,.4,2*R*.96],[0,0,0],2,undefined,10),part('cylinder','stone',[2*R*.72,.4,2*R*.7],[0,.4,0],2,undefined,10));
 parts.push(part('cylinder','woodDark',[.3,mast,.24],[0,.8,0],2,undefined,6));
 for(const s of[-1,1])parts.push(beam('woodMid',[s*R*.8,.4,0],[s*.1,2.2,0],.12,1),beam('woodMid',[0,.4,s*R*.8],[0,2.2,s*.1],.12,1));
 parts.push(B('woodMid',[1.5,.12,.12],[0,.8+mast-.9,0],1),B(ctx.wealth>.5?'cloth':'thatch',[1.1,.8,.05],[0,.8+mast-1.7,.1],1));
 parts.push(part('cone','iron',[.8,.45,.8],[0,.8+mast,0],1,undefined,8),part('cylinder','iron',[.7,.15,.7],[0,.8+mast,0],0,undefined,8));
 if(ctx.era>=1)for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;parts.push(beam('woodLight',[Math.cos(a)*R*.95,.4,Math.sin(a)*R*.95],[Math.cos(a)*R*.95,1.5,Math.sin(a)*R*.95],.1,0));}
 return {parts,entry:{x:0,z:R,width:1}};
};

/** Threshing floor: a ring-kerbed circle of beaten earth with a central post for
 * the oxen, a threshing sledge at rest, a winnowing tripod with fan screen and
 * a wattle windbreak (Mediterranean and Anatolian threshing floors). */
const threshing:Generator=(ctx,r)=>{
 const parts:Part[]=[],R=Math.min(ctx.footprint.w,ctx.footprint.d)/2*range(r,.8,.9),n=Math.round(2*Math.PI*R/.7);
 parts.push(part('cylinder','woodInlay',[2*R-.3,.05,2*R-.3],[0,0,0],2,undefined,16));
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2;parts.push(B('stoneDark',[.5,.2,.3],[Math.cos(a)*(R-.15),0,Math.sin(a)*(R-.15)],1,[0,-a-Math.PI/2,0]));}
 parts.push(part('cylinder','woodDark',[.25,1.5,.2],[0,0,0],1,undefined,6),part('cylinder','woodDark',[.5,.12,.4],[0,0,0],0,undefined,6));
 const sa=range(r,0,6.28),sx=Math.cos(sa)*R*.55,sz=Math.sin(sa)*R*.55;
 parts.push(B('woodMid',[1.2,.12,.8],[sx,.05,sz],1,[0,sa,0]),B('woodDark',[.9,.1,.1],[sx,.17,sz],0,[0,sa,0]),B('iron',[.9,.04,.06],[sx,.02,sz],0,[0,sa,0]));
 const wa=sa+Math.PI*range(r,.7,1.3),wx=Math.cos(wa)*R*.6,wz=Math.sin(wa)*R*.6;
 for(const s of[-1,1])parts.push(beam('woodLight',[wx+s*.4,0,wz],[wx,1.7,wz],.08,1));parts.push(beam('woodLight',[wx,0,wz+.4],[wx,1.7,wz],.08,1),B('thatch',[.7,.06,.5],[wx,1.6,wz],0));
 const ang=range(r,0,6.28),wl=Math.round(R*1.6/.45);for(let i=0;i<wl;i++){const a=ang+(i/wl-.5)*1.5,x=Math.cos(a)*(R+.15),z=Math.sin(a)*(R+.15);if(Math.hypot(x,z)>Math.min(ctx.footprint.w,ctx.footprint.d)/2-.1)continue;parts.push(part('cylinder','woodLight',[.1,1.2,.1],[x,0,z],0,undefined,5));}

 return {parts,entry:{x:0,z:R,width:2}};
};

/** Stone wall cell: battered footing, coursed body with course lines, coping
 * and (from the classical era) crenellation; corner cells take a pier. */
const stoneWall:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,axis=ctx.wallAxis??'x',t=range(r,.8,1.05),h=range(r,2.4,3.1)*(ctx.era>=3?1.12:1),wm=ctx.material==='mudbrick'?'plaster':'stone',merlon=ctx.era>=2&&chance(r,.4+ctx.wealth*.5),courses=pick(r,[4,5,6]);
 for(const a of arms(axis,w,d,t)){
  parts.push(armBox(a,'stoneDark',a.len,.35,t+.2,0,0,0,1),armBox(a,wm,a.len,h-.35,t,0,0,.35,2));
  for(let i=1;i<courses;i++)parts.push(armBox(a,'stoneDark',a.len,.04,t+.03,0,0,.35+(h-.35)*i/courses,0));
  parts.push(armBox(a,'stoneDark',a.len,.18,t+.16,0,0,h,1));
  if(merlon){const n=Math.max(2,Math.floor(a.len/.95));for(let i=0;i<n;i++){const off=-a.len/2+(i+.5)*a.len/n;parts.push(armBox(a,'stoneDark',.5,.5,t*.7,off,0,h+.18,1));}}}
 if(axis==='corner'){parts.push(B('stone',[t+.5,h+.3,t+.5],[0,0,0],2));parts.push(part('pyramid',roofMaterial(ctx),[t+.75,.9,t+.75],[0,h+.3,0],1));}
 return {parts};
};

/** Trench: spoil banks either side of a duckboarded cut with plank revetment
 * and sharpened stakes on the outer lip (field fortification ditches). */
const trench:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,axis=ctx.wallAxis??'x',ww=range(r,1.4,1.7),bw=range(r,.95,1.1),bh=range(r,.55,.8),t=ww+2*bw;
 for(const a of arms(axis,w,d,t)){
  const rot:V3|undefined=a.along==='x'?[0,Math.PI/2,0]:undefined;
  for(const s of[-1,1]){const lat=s*(ww/2+bw/2);parts.push(part('prism','woodDark',[bw*2*.5+.0,bh,a.len],[a.cx+(a.along==='z'?lat:0),0,a.cz+(a.along==='x'?lat:0)],2,rot));
   {const ins=s*(ww/2-.03);parts.push(armBox(a,'woodLight',a.len,.5,.06,0,ins,0,0));}
   if(ctx.era>=1&&ctx.wealth>.2){const n=Math.max(2,Math.floor(a.len/.7));for(let i=0;i<n;i++)parts.push(part('cone','woodLight',[.12,.5,.12],a.along==='x'?[a.cx-a.len/2+(i+.5)*a.len/n,bh*.5,a.cz+s*(ww/2+bw*.8)]:[a.cx+s*(ww/2+bw*.8),bh*.5,a.cz-a.len/2+(i+.5)*a.len/n],0,undefined,4));}}
  parts.push(armBox(a,'woodMid',a.len,.06,ww*.5,0,0,0,1),far(armBox(a,'woodDark',a.len,bh*.9,t*.8,0,0,0,2)));}
 return {parts};
};

/** Moat: water-filled cut between stone kerbs and grassy banks (Bodiam, moated
 * manors); a dry approach is left by the player, not drawn here. */
const moat:Generator=(ctx,r)=>{
 const parts:Part[]=[],{w,d}=ctx.footprint,axis=ctx.wallAxis??'x',ww=range(r,1.3,1.6),bw=range(r,.6,.75),t=ww+2*bw+.3;
 for(const a of arms(axis,w,d,t)){
  const rot:V3|undefined=a.along==='x'?[0,Math.PI/2,0]:undefined;
  parts.push(armBox(a,'water',a.len,.14,ww,0,0,0,2));
  for(const s of[-1,1]){parts.push(armBox(a,ctx.era>=3?'stone':'stoneDark',a.len,.42,.3,0,s*(ww/2+.15),0,1),part('prism','foliageDark',[bw,.4,a.len],[a.cx+(a.along==='z'?s*(ww/2+.3+bw/2):0),0,a.cz+(a.along==='x'?s*(ww/2+.3+bw/2):0)],1,rot));
   if(ctx.era>=3&&ctx.wealth>.4)parts.push(armBox(a,'stone',a.len,.04,.36,0,s*(ww/2+.15),.42,0));
   const n=Math.floor(a.len/1.1);for(let i=0;i<n;i++)if(chance(r,.4))parts.push(part('cone','foliage',[.14,.5,.14],a.along==='x'?[a.cx-a.len/2+(i+.5)*a.len/n,.12,a.cz+s*(ww/2-.1)]:[a.cx+s*(ww/2-.1),.12,a.cz-a.len/2+(i+.5)*a.len/n],0,undefined,4));}}
 return {parts};
};

export const EXTRA_FAMILIES:Record<ExtraFamilyId,Def>={
 fieldPlot:{reference:'Midland open-field ridge-and-furrow strips (Laxton) with headland, hurdle or clearance-stone edging, scarecrow and tool shed; irrigated plots in arid lands',generate:fieldPlot},
 pen:{reference:'Wattle-hurdle folds (Butser) and dry-stone sheepfolds: gate, lean-to shelter on the back wall, trough',generate:pen},
 pier:{reference:'Timber fishing jetty on pile bents (Baltic and North Sea harbours): deck on stringers, T-head, bollards, net-drying rack, shore hut',generate:pier},
 bridge:{reference:'Timber trestle footbridge on pile bents with rails, and Dartmoor clapper bridges (slabs on stone piers)',generate:bridge},
 keep:{reference:'Norman rectangular keeps (Hedingham, Rochester) with forebuilding stair and corner turrets; shell keeps (Restormel); early jettied timber towers',generate:keep},
 stables:{reference:'Medieval stable ranges with Dutch half-doors, hay hatch, hitching rail and trough in the yard',generate:stables},
 college:{reference:'Greek stoa/lyceum colonnades (Athens) in early eras; Oxford-style college hall with gate tower and cloister walk later',generate:college},
 quarry:{reference:'Roman and medieval stepped quarry benches with uncut block joints and a treadwheel crane (Roman Carrara/Mons Claudianus)',generate:quarry},
 cairn:{reference:'Kerbed chambered cairns (Maeshowe, Clava) with lintelled passage; later memorial cairns with crosses',generate:cairn},
 grove:{reference:'Celtic nemeton and Germanic holy groves: ring of old trees, altar stone, carved entrance posts',generate:grove},
 outpost:{reference:'Roman limes signal posts and frontier turrets: banner mast, stacked-stone base, beacon basket',generate:outpost},
 threshing:{reference:'Mediterranean and Anatolian circular threshing floors (aloni) with kerb, central post, threshing sledge and winnowing fan',generate:threshing},
 stoneWall:{reference:'Coursed curtain walls (Roman and medieval town walls): batter, courses, coping, crenellation',generate:stoneWall},
 trench:{reference:'Field-fortification ditches with spoil banks, plank revetment and sharpened stakes',generate:trench},
 moat:{reference:'Stone-kerbed water-filled moats (Bodiam, moated manors) with grassed banks',generate:moat},
};
void maxStoreys;
