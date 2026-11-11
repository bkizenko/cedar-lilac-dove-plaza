/** Per-civ building generators (pure Part specs; entrance +Z, metres, origin at the footprint base centre). Every civ has
 * its OWN house, civic building, granary and market built from its own materials and its own massing grammar, not a
 * shared form with a tint. Each instance is individually imperfect (seeded size, lean, uneven heights, off-centre doors,
 * add-ons, rubble and patching with wear). Era 0-1 builds the poorest local dwelling; later eras add the signature wall,
 * a civic hall, plinths, storeys and trim. Materials are named `${civ}.${slot}` and resolved through `materials`. */
import {beam,chance,fitToFootprint,partBounds,part,pick,range,seededRandom,type BuildingSpec,type Part,type Rng,type LodTier} from './buildingParts';
import {ensureCore,ensureNearSupport,ensureTiers} from './buildingFamiliesCivic';
import {CIVS,matId,materialTable,type CivId,type CivMaterials,type Swatch} from './civStyles';
export type CivRole='house'|'civic'|'granary'|'market';
export type CivContext={seed:number;era:number;wealth:number;/** 0 new .. 1 ruined-ish */wear:number;footprint:{w:number;d:number};lit?:boolean};
export type CivSpec=BuildingSpec&{civ:CivId;role:CivRole;materials:Record<string,Swatch>;banners:{pos:readonly[number,number,number];size:readonly[number,number,number]}[];imperfection:{scale:number;lean:number;offDoor:number;patches:number}};
type V=[number,number,number];type Slot=keyof CivMaterials;
type G={civ:CivId;r:Rng;w:number;d:number;era:number;wealth:number;wear:number;parts:Part[];
 B:(s:Slot,size:V,pos:V,lod?:LodTier,rot?:V)=>void;Cy:(s:Slot,dia:number,h:number,pos:V,lod?:LodTier,sides?:number,top?:number)=>void;Pr:(shape:Part['shape'],s:Slot,size:V,pos:V,lod?:LodTier,rot?:V,sides?:number)=>void;
 post:(s:Slot,x:number,z:number,h:number,t?:number,lod?:LodTier)=>void;banner:(x:number,z:number,h:number)=>void;door:(x:number,z:number,wd?:number,h?:number)=>void;off:number};
type Out={entry?:{x:number;z:number;width:number}};
const mk=(civ:CivId,ctx:CivContext,r:Rng):G=>{const parts:Part[]=[],m=(s:Slot)=>matId(civ,s) as Part['mat'];
 const g:G={civ,r,w:ctx.footprint.w,d:ctx.footprint.d,era:ctx.era,wealth:ctx.wealth,wear:ctx.wear,parts,off:range(r,-.35,.35),
  B:(s,size,pos,lod=1,rot)=>void parts.push(part('box',m(s),size,pos,lod,rot)),
  Cy:(s,dia,h,pos,lod=1,sides=10,top)=>void parts.push(part('cylinder',m(s),[dia,h,top??dia],pos,lod,undefined,sides)),
  Pr:(shape,s,size,pos,lod=1,rot,sides)=>void parts.push(part(shape,m(s),size,pos,lod,rot,sides)),
  post:(s,x,z,h,t=.16,lod=2)=>void parts.push(beam(m(s),[x,0,z],[x,h,z],t,lod)),
  banner:(x,z,h)=>{parts.push(beam(m('trim'),[x,0,z],[x,h,z],.08,1),part('box',m('cloth'),[.7,.95,.03],[x+.38,h-1.05,z],1));},
  door:(x,z,wd=.9,h=1.8)=>void parts.push(part('box',m('accent'),[wd,h,.08],[x,0,z],0))};return g;};
const jit=(r:Rng,a:number)=>1+(r()-.5)*2*a;
/** Poorest local dwelling per civ (era 0-1). */
const POOR:Record<CivId,string>={sandrill:'cave',nilemark:'hut',tigrane:'dome',hanrei:'hut',vedara:'hut',aureline:'hut',sahelan:'conehut',quillan:'sod',kaaltun:'hut',mekhari:'raft',brythen:'lean',rusvolt:'dugout',steppan:'tent',skoldar:'tent'};
function poor(g:G):Out{const {w,d,r}=g,k=POOR[g.civ],W=Math.min(w,d)*range(r,.6,.8),h=range(r,1.6,2.2);
 switch(k){
  case 'cave':g.B('wall',[w*.8,3.2,d*.5],[0,0,-d*.2],2);g.B('accent',[1.1,1.5,.2],[g.off,0,d*.05+.02],0);g.B('wall2',[w*.5,.5,.6],[0,0,d*.12],1);break;
  case 'dome':g.Cy('wall',W,h*.6,[0,0,0],2,10);g.Pr('sphere','wall',[W,h*.8,W],[0,h*.55,0],2);g.door(g.off*.3,W/2+.02,.7,1.2);break;
  case 'conehut':g.Cy('wall',W,1.5,[0,0,0],2,10);g.Pr('cone','roof',[W*1.25,1.6,W*1.25],[0,1.45,0],2,undefined,10);g.door(g.off*.3,W/2+.02,.6,1.2);break;
  case 'sod':g.B('wall',[W*1.1,1.3,W*.9],[0,0,0],2);g.Pr('wedge','roof',[W*1.3,.7,W*1.1],[0,1.3,0],2);g.door(g.off*.3,W*.45+.02,.6,1.1);break;
  case 'lean':g.post('wall',-W/2,-W/2,1.9);g.post('wall',W/2,-W/2,1.9);g.post('wall',-W/2,0,1.1);g.post('wall',W/2,0,1.1);g.Pr('wedge','roof',[W*1.2,.9,W*1.1],[0,1.1,-W*.25],2);g.B('wall2',[W,1,.1],[0,0,-W/2],1);break;
  case 'dugout':g.B('wall',[W*1.2,.5,W],[0,0,0],2);g.Pr('prism','roof',[W*1.2,.9,W*1.1],[0,.5,0],2);g.B('wall2',[.8,.9,.2],[g.off*.3,0,W/2],0);break;
  case 'tent':g.Pr('cone','roof',[W*1.4,h*1.4,W*1.4],[0,0,0],2,undefined,8);g.B('accent',[.7,1.2,.05],[0,0,W*.4],0);g.post('trim',0,0,h*1.5+.3,.07,1);break;
  case 'raft':for(const x of[-1,1])for(const z of[-1,1])g.post('trim',x*W*.4,z*W*.35,.9,.12,2);g.B('wall2',[W,.12,W*.9],[0,.9,0],2);g.B('wall',[W*.8,1.2,W*.7],[0,1.02,0],2);g.Pr('prism','roof',[W*.95,.7,W*.85],[0,2.22,0],2);break;
  default:g.Cy('wall',W,1.3,[0,0,0],2,8);g.Pr('cone','roof',[W*1.2,1.1,W*1.2],[0,1.3,0],2,undefined,8);g.door(g.off*.3,W/2+.02,.6,1.1);}
 return {entry:{x:0,z:Math.min(d/2-.2,W/2+.4),width:.9}};}
// ---------------------------------------------------------------- houses
const HOUSE:Record<CivId,(g:G)=>Out>={
 sandrill:g=>{const {w,d,r}=g,mh=range(r,4,5.4);g.B('wall2',[w*.95,mh,d*.45],[0,0,-d*.3],2);const fw=w*.62*jit(r,.06),fh=range(r,3,3.6);g.B('wall',[fw,fh,.7],[g.off*.4,0,-d*.04],2);
  for(const s of[-1,1]){g.B('trim',[.35,fh,.3],[g.off*.4+s*fw*.46,0,-d*.04+.4],1);}g.B('accent',[1,1.8,.1],[g.off*.4,0,-d*.04+.38],0);g.B('trim',[fw*.9,.35,.5],[g.off*.4,fh,-d*.04+.1],1);
  for(let i=0;i<pick(r,[2,3]);i++)for(const s of[-1,1])g.B('wall',[fw*.5-i*.35,.35,.5],[g.off*.4+s*(fw*.25-i*.17)*.0,fh+.35+i*.35,-d*.04],1);g.Cy('trim',.5,.7,[g.off*.4,fh+.35*3,-d*.04],1,8);
  g.B('wall2',[fw*1.1,.25,1],[g.off*.4,0,d*.12],1);if(g.wealth>.5)g.banner(w*.38,d*.2,3.4);return {entry:{x:g.off*.4,z:d*.12+.6,width:1}};},
 nilemark:g=>{const {w,d,r}=g,W=w*.78*jit(r,.06),D=d*.7,h=range(r,2.6,3.2),z0=-d*.1;g.Cy('wall',Math.max(W,D)*1.3,h,[0,0,z0],2,4,Math.max(W,D)*1.05);g.parts[g.parts.length-1]={...g.parts[g.parts.length-1],rot:[0,Math.PI/4,0]};
  g.B('wall2',[W*1.0,.22,D*1],[0,h,z0],2);for(let i=0;i<7;i++)g.Cy('roof',.12,D*.95,[-W*.42+i*W*.14,h+.22,z0+D*.47],1,5);for(const s of[-1,1])g.parts.push(part('cylinder',matId(g.civ,'roof') as Part['mat'],[.12,W*.9,.12],[-W*.45,h+.34,z0+s*D*.35],1,[0,0,Math.PI/2],5));
  g.B('trim',[.9,.3,.12],[g.off*.3,1.9,z0+D*.5],0);g.door(g.off*.3,z0+D*.5+.02,.9,1.8);g.B('wall2',[.8,.2,1.4],[W*.38,h,z0],0);g.Pr('wedge','wall',[.9,h,1.6],[W*.5+.1,0,z0-D*.1],1,[0,Math.PI/2,0]);return {entry:{x:g.off*.3,z:z0+D*.5,width:.9}};},
 tigrane:g=>{const {w,d,r}=g,W=w*.88,D=d*.88,h=range(r,3,3.6),t=.45,cw=Math.min(W,D)*.36;
  for(const [x,z,sx,sz] of[[0,-D/2+t/2,W,t],[-W/2+t/2,0,t,D-2*t],[W/2-t/2,0,t,D-2*t]] as [number,number,number,number][])g.B('wall',[sx,h,sz],[x,0,z],2);
  for(const s of[-1,1])g.B('wall',[(W-cw)/2,h,t],[s*(cw/2+(W-cw)/4),0,D/2-t/2],2);for(let i=0;i<4;i++)g.B('wall2',[W*.96,.07,t+.02],[0,.6+i*.8,-D/2+t/2],0);
  g.parts.push(part('cylinder',matId(g.civ,'roof') as Part['mat'],[W*.28,W*.9,W*.28],[-W*.45,h+W*.14,-D*.25],2,[0,0,Math.PI/2],10));g.parts.push(part('cylinder',matId(g.civ,'roof') as Part['mat'],[W*.28,W*.9,W*.28],[-W*.45,h+W*.14,D*.1],2,[0,0,Math.PI/2],10));
  g.B('trim',[cw+.5,.3,t+.1],[0,h-.1,D/2-t/2],1);g.B('wall2',[1.3,.9,1.3],[0,0,0],0);g.banner(W/2-.5,D/2-.5,h+2);return {entry:{x:0,z:D/2,width:cw}};},
 hanrei:g=>{const {w,d,r}=g,W=w*.76*jit(r,.05),D=d*.7,h=range(r,2.6,3.1),z0=-d*.08,pl=.45;g.B('accent',[W+.5,pl,D+.5],[0,0,z0],2);g.B('wall',[W*.9,h,D*.82],[0,pl,z0],2);
  for(let i=0;i<=4;i++)for(const s of[-1,1])g.post('wall2',-W*.45+i*W*.225,z0+s*D*.41,h,.2,2);for(let i=0;i<3;i++)g.B('wall2',[.06,h*.75,D*.8],[-W*.3+i*W*.3,pl+.1,z0],0);
  const rise=range(r,1.2,1.7);g.Pr('hip','roof',[W*1.28,rise,D*1.28],[0,pl+h,z0],2);for(const sx of[-1,1])for(const sz of[-1,1])g.Pr('wedge','roof',[.9,.5,.9],[sx*W*.63,pl+h+.1,z0+sz*D*.63],0,[0,Math.atan2(sx,sz)+Math.PI,0]);
  g.Pr('box','wall2',[.25,.3,.25],[0,pl+h+rise,z0],1);g.door(g.off*.3,z0+D*.41+.05,1.1,1.9);for(const s of[-1,1])g.post('wall2',s*W*.3,z0+D*.5+.8,h*.9,.15,1);g.B('wall2',[W*.7,.18,.2],[0,pl+h*.9,z0+D*.5+.8],1);return {entry:{x:g.off*.3,z:z0+D*.5+.8,width:1.2}};},
 vedara:g=>{const {w,d,r}=g,W=w*.9,D=d*.9,rw=Math.min(2.4,W*.3),h=range(r,3,3.8);
  g.B('wall',[W,h,rw],[0,0,-D/2+rw/2],2);for(const s of[-1,1])g.B('wall',[rw,h,D-rw],[s*(W/2-rw/2),0,-rw/2+0],2);g.B('wall',[(W-1.8)/2,h*.85,rw*.6],[-(W-1.8)/4-.9,0,D/2-rw*.3],2);g.B('wall',[(W-1.8)/2,h*.85,rw*.6],[(W-1.8)/4+.9,0,D/2-rw*.3],2);
  g.B('trim',[W,.18,rw+.1],[0,h,-D/2+rw/2],1);for(const [sx,sz] of[[-1,-1],[1,-1]] as [number,number][]){const x=sx*(W/2-.9),z=sz*(D/2-.9);for(const a of[-1,1])for(const b of[-1,1])g.post('trim',x+a*.45,z+b*.45,1.7,.1,1);g.parts.push(part('box',matId(g.civ,'trim') as Part['mat'],[1.1,.15,1.1],[x,h+1.6,z],1));g.Pr('sphere','roof',[1.1,.9,1.1],[x,h+1.7,z],2);}
  g.B('wall2',[1.5,.45,1.5],[0,0,0],1);g.Cy('accent',.3,.8,[0,.45,0],0,6);g.door(0,D/2-rw*.3+rw*.3+.02,1.4,2);return {entry:{x:0,z:D/2,width:1.8}};},
 aureline:g=>{const {w,d,r}=g,W=w*.9,D=d*.9,h=range(r,2.6,3.2),t=.35,rh=range(r,.8,1.1);
  for(const [x,z,sx,sz] of[[0,-D/2+t/2,W,t],[-W/2+t/2,0,t,D-2*t],[W/2-t/2,0,t,D-2*t]] as [number,number,number,number][])g.B('wall',[sx,h,sz],[x,0,z],2);
  for(const s of[-1,1])g.B('wall',[(W-1.6)/2,h,t],[s*(.8+(W-1.6)/4),0,D/2-t/2],2);g.Pr('prism','roof',[W*.52,rh,W*.9*.5],[-W*.24,h,-D*.28],2,[0,Math.PI/2,0]);g.Pr('prism','roof',[W*.52,rh,D*.45],[W*.24,h,-D*.22],2,[0,Math.PI/2,0]);
  g.Pr('hip','roof',[W,rh*.8,t*2.2],[0,h,D/2-t],1);g.Cy('trim',.35,h*.9,[-W*.18,0,-D*.02],1,8);g.Cy('trim',.35,h*.9,[W*.18,0,-D*.02],1,8);g.parts.push(part('box',matId(g.civ,'accent') as Part['mat'],[W*.22,.1,D*.22],[0,0,-D*.02],0));g.door(g.off*.2,D/2-t+.02,1,2);
  g.Cy('wall2',.8,1,[W*.3,0,-D*.3],0,8);return {entry:{x:g.off*.2,z:D/2,width:1.6}};},
 sahelan:g=>{const {w,d,r}=g,W=w*.76*jit(r,.06),D=d*.7,h=range(r,3.4,4.4);g.B('wall',[W,h,D],[0,0,-d*.05],2);g.B('wall2',[W*1.02,.5,D*1.02],[0,h,-d*.05],2);
  for(let i=0;i<=pick(r,[2,3]);i++)g.B('wall',[.5,h*.8,.55],[-W/2+.4+i*(W-.8)/3,0,-d*.05+D/2+.28],1);
  for(let i=0;i<4;i++)for(const s of[-1,1])g.parts.push(part('cylinder',matId(g.civ,'trim') as Part['mat'],[.16,.7,.16],[s*(W/2)+s*.28,h*.55+i*.5,-d*.05-D*.3+i*D*.18],0,[0,0,s*Math.PI/2],5));
  for(const sx of[-1,1])for(const sz of[-1,1])g.Pr('cone','wall',[.55,.9,.55],[sx*(W/2-.3),h+.5,-d*.05+sz*(D/2-.3)],1,undefined,5);g.B('accent',[.9,1.8,.1],[g.off*.3,0,-d*.05+D/2+.02],0);
  const bx=W/2+1.2;if(bx<w/2-.3){g.Cy('wall2',1.5,1.1,[bx,0,d*.1],1,10);g.Pr('cone','roof',[1.8,1.1,1.8],[bx,1.1,d*.1],1,undefined,10);}return {entry:{x:g.off*.3,z:-d*.05+D/2+.5,width:1}};},
 quillan:g=>{const {w,d,r}=g,W=w*.7*jit(r,.06),D=d*.62,h=range(r,1.9,2.4),z0=-d*.05;for(let i=0;i<3;i++)g.B('wall2',[w*.95,.6,.6],[0,i*.6,-d/2+.3+i*.0],1);
  g.B('wall',[W,h,D],[0,0,z0],2);const rise=W*.78;g.Pr('prism','roof',[W*1.18,rise,D*1.2],[0,h,z0],2,[0,Math.PI/2,0]);
  g.B('accent',[.55,1.2,.1],[g.off*.25,0,z0+D/2+.04],0);g.B('accent',[.4,.5,.1],[g.off*.25,1.2,z0+D/2+.04],0);for(let i=0;i<3;i++)g.B('accent',[.3,.5,.08],[-W*.35+i*W*.35,.9+((i+1)%2)*.4,z0+D/2+.04],0);
  g.B('wall2',[W*1.25,.4,1],[0,0,z0+D/2+.5],1);return {entry:{x:g.off*.25,z:z0+D/2+.9,width:.9}};},
 kaaltun:g=>{const {w,d,r}=g,pw=w*.86,pd=d*.86,ph=range(r,.5,.9),W=pw*.7,D=pd*.6,h=range(r,2,2.5);g.B('wall',[pw,ph,pd],[0,0,0],2);g.B('wall2',[pw*.55,ph*.5,.8],[0,0,pd/2+.4],1);
  for(const [x,z] of[[-1,-1],[1,-1],[-1,1],[1,1]] as [number,number][])g.post('trim',x*W*.45,z*D*.45,h,.18,2);g.B('wall',[W*.9,h*.85,D*.82],[0,ph,-D*.04],2);g.parts.push(part('hip',matId(g.civ,'roof') as Part['mat'],[W*1.3,h*.85,D*1.3],[0,ph+h*.85,-D*.04],2));
  g.Pr('pyramid','roof',[.4,.5,.4],[0,ph+h*1.6,-D*.04],0);g.door(g.off*.2,ph+0,.9,1.6);g.parts[g.parts.length-1]={...g.parts[g.parts.length-1],pos:[g.off*.2,ph,-D*.04+D*.41+.02]};return {entry:{x:0,z:pd/2+.8,width:1}};},
 mekhari:g=>{const {w,d,r}=g,W=w*.76*jit(r,.06),D=d*.62,lift=range(r,1.4,1.9),h=range(r,1.9,2.3);
  for(let i=0;i<4;i++)for(const s of[-1,1])g.post('trim',-W*.45+i*W*.3,s*D*.45,lift,.14,2);g.B('wall2',[W,.16,D],[0,lift,0],2);g.B('wall',[W*.92,h,D*.9],[0,lift+.16,0],2);
  const rise=range(r,1.6,2.3);g.Pr('prism','roof',[W*1.2,rise,D*1.5],[0,lift+.16+h,0],2,[0,Math.PI/2,0]);for(const s of[-1,1]){g.parts.push(part('cone',matId(g.civ,'roof') as Part['mat'],[.45,1,.45],[s*W*.6,lift+h+rise*.55,0],1,[0,0,-s*.7],5));}
  g.B('wall2',[1,.1,D*.6],[0,lift,D*.5+.6],1);g.parts.push(beam(matId(g.civ,'trim') as Part['mat'],[W*.35,0,D/2+1.6],[W*.35,lift,D/2+.5],.09,1));g.parts.push(beam(matId(g.civ,'trim') as Part['mat'],[W*.35+.5,0,D/2+1.6],[W*.35+.5,lift,D/2+.5],.09,1));return {entry:{x:W*.4,z:D/2+1.5,width:.9}};},
 brythen:g=>{const {w,d,r}=g,R=Math.min(w,d)*.36*jit(r,.07),h=range(r,1.6,2.1);g.Cy('wall',2*R,h,[0,0,0],2,12);const rise=R*range(r,1.1,1.5);g.Pr('cone','roof',[2*R*1.3,rise,2*R*1.3],[0,h,0],2,undefined,12);g.B('accent',[.9,1.6,.1],[g.off*.3,0,R+.0],0);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;if(Math.sin(a)>.82)continue;g.post('trim',Math.cos(a)*(R*1.55),Math.sin(a)*(R*1.55),1.3+((i*7)%3)*.2,.12,1);}
  g.Pr('cone','accent',[.3,.5,.3],[0,h+rise,0],0,undefined,6);if(g.wealth>.5)g.banner(R*1.2,R*1.2,h+1.6);return {entry:{x:g.off*.3,z:R+.3,width:.9}};},
 rusvolt:g=>{const {w,d,r}=g,W=w*.74*jit(r,.05),D=d*.66,courses=pick(r,[7,8,9]),ch=.3,h=courses*ch,z0=-d*.04;g.B('wall',[W-.3,h,D-.3],[0,0,z0],2);
  for(let i=0;i<courses;i++)for(const s of[-1,1]){const ext=(i%2?.17:0);g.parts.push(part('cylinder',matId(g.civ,'wall') as Part['mat'],[ch*.95,W+.3+ext,ch*.95],[W/2+.15+ext,i*ch+ch*.5,z0+s*(D/2-.1)],1,[0,0,Math.PI/2],6));}
  for(let i=0;i<courses;i+=2)for(const s of[-1,1])g.parts.push(part('cylinder',matId(g.civ,'wall') as Part['mat'],[ch*.95,D+.3,ch*.95],[s*(W/2-.1),i*ch+ch*.5,z0-D/2-.15],0,[Math.PI/2,0,0],6));
  const rise=W*.42;g.Pr('prism','roof',[D*1.2,rise,W*1.15],[0,h,z0],2,[0,0,0]);g.B('trim',[1.3,.2,.12],[g.off*.2,1.95,z0+D/2+.12],0);g.door(g.off*.2,z0+D/2-.05,.8,1.7);g.Cy('wall2',.45,1.5,[W*.3,h,z0-D*.2],1,6);return {entry:{x:g.off*.2,z:z0+D/2+.1,width:.9}};},
 steppan:g=>{const {w,d,r}=g,R=Math.min(w,d)*.38*jit(r,.06),h=range(r,1.5,1.8);g.Cy('wall',2*R,h,[0,0,0],2,14);g.Pr('sphere','roof',[2*R*1.08,R*.95,2*R*1.08],[0,h*.9,0],2);g.Cy('trim',R*.5,.18,[0,h*.9+R*.9,0],1,10);g.B('accent',[.9,1.4,.08],[g.off*.2,0,R+.0],0);
  g.Cy('trim',2*R*1.02,.12,[0,h*.8,0],0,14);if(g.wealth>.4)g.banner(R*1.4,R*.2,3.2);g.Pr('box','wall2',[.8,.5,.5],[-R*1.2,0,R*.3],0);return {entry:{x:g.off*.2,z:R+.3,width:.9}};},
 skoldar:g=>{const {w,d,r}=g,W=w*.88,D=d*.5*jit(r,.07),h=range(r,1.4,1.8),z0=-d*.1;g.B('wall',[W*1.05,h*.8,D*1.3],[0,0,z0],2);g.B('wall2',[W*.9,h,D*.95],[0,0,z0],2);g.Pr('prism','roof',[D*1.3,range(r,1.2,1.7),W*1.05],[0,h*.8,z0],2,[0,0,0]);
  for(let i=0;i<pick(r,[6,8]);i++)g.B('wall2',[.1,h*.9,.1],[-W*.45+i*W*.9/7,0,z0+D*.5+.02],0);g.B('accent',[.9,1.4,.1],[g.off*.3,0,z0+D*.5+.04],0);for(const s of[-1,1])g.Pr('cone','trim',[.3,.9,.3],[s*W*.5,h*.8+.9,z0],0,[0,0,-s*.5],5);
  g.Pr('cone','wall2',[.25,.7,.25],[0,h*.8+1.3,z0],0,undefined,5);return {entry:{x:g.off*.3,z:z0+D*.5+.5,width:.9}};},
};
// ---------------------------------------------------------------- civic buildings
const CIVIC:Record<CivId,(g:G)=>Out>={
 sandrill:g=>{const {w,d,r}=g,mh=range(r,6,8);g.B('wall2',[w*.98,mh,d*.5],[0,0,-d*.25],2);const fw=w*.8,fh=range(r,4.6,5.6),zf=-d*.02;g.B('wall',[fw,fh,1],[0,0,zf],2);
  const n=pick(r,[4,4,6]);for(let i=0;i<n;i++)g.Cy('trim',.62,fh*.82,[-fw*.4+i*fw*.8/(n-1),0,zf+.75],2,8);g.B('trim',[fw*1.02,.55,1.1],[0,fh*.82,zf+.55],2);g.Pr('prism','wall',[fw*.94,fh*.2,.9],[0,fh*.82+.55,zf+.3],1);
  g.B('accent',[1.5,2.6,.15],[0,0,zf+.55],0);g.Cy('trim',.9,1.2,[0,fh*1.02+.8,zf],1,8);for(let i=0;i<5;i++)g.B('wall2',[fw*.9,.3,2.4-i*.25],[0,0,zf+.6+i*.0+1.3+(4-i)*.0],0);for(let i=0;i<4;i++)g.B('wall2',[fw*.55,.2*(i+1),.4],[0,0,d/2-.3-i*.4],1);
  if(g.era>=4)g.B('wall',[fw*.5,1.2,.9],[0,fh+.4,zf-.1],1);g.banner(w*.44,d*.3,5);return {entry:{x:0,z:d/2-.8,width:1.5}};},
 nilemark:g=>{const {w,d,r}=g,tw=w*.3,th=range(r,6,7.6),gw=w*.18,zf=-d*.1;
  for(const s of[-1,1]){g.Cy('wall',tw*1.2,th,[s*(gw/2+tw/2),0,zf],2,4,tw*.9);g.parts[g.parts.length-1]={...g.parts[g.parts.length-1],rot:[0,Math.PI/4,0]};g.B('trim',[tw*1.05,.3,tw*.5],[s*(gw/2+tw/2),th,zf],1);g.B('accent',[.3,th*.7,.1],[s*(gw/2+tw/2),th*.1,zf+tw*.55],0);g.banner(s*(gw/2+tw/2),zf+tw*.6,th*.9);}
  g.B('wall2',[gw+.4,th*.3,tw*.8],[0,th*.7,zf],2);g.B('accent',[gw*.9,th*.65,.1],[0,0,zf+tw*.4],0);
  for(let i=0;i<pick(r,[4,6]);i++){const x=-w*.3+i*w*.6/5;g.Cy('wall',.45,3.4,[x,0,d*.22],1,10,.7);g.Pr('sphere','trim',[.7,.45,.7],[x,3.4,d*.22],1);}g.B('wall2',[w*.9,.35,d*.3],[0,0,d*.3],1);g.B('wall2',[w*.7,3.6,d*.12],[0,.35,d*.42-.0],1);
  g.B('wall',[w*.6,3.8,d*.28],[0,0,-d*.4],2);return {entry:{x:0,z:d/2-.3,width:gw}};},
 tigrane:g=>{const {w,d,r}=g,tiers=pick(r,[3,4]);let W=w*.92,D=d*.9,y=0,z=0;const th=range(r,1.3,1.7);for(let i=0;i<tiers;i++){g.B(i%2?'wall2':'wall',[W,th,D],[0,y,z],2);for(let k=0;k<3;k++)g.B('wall2',[W+.02,.06,D+.02],[0,y+.3+k*.4,z],0);y+=th;W*=.72;D*=.72;z-=(d*.9-D)*.04;}
  g.B('wall',[W*.8,th*1.3,D*.7],[0,y,z],2);g.Pr('hip','roof',[W*.95,.5,D*.8],[0,y+th*1.3,z],1);for(const s of[-1,1])g.Pr('cone','accent',[.35,.9,.35],[s*W*.4,y+th*1.3,z+D*.3],0,undefined,5);
  const rw=Math.min(w*.2,2.2);for(let i=0;i<tiers;i++)g.Pr('wedge','wall2',[rw,th*(tiers-i),d*.9/tiers],[0,0,d*.45-i*d*.9/tiers*.5],1,[0,0,0]);g.banner(w*.44,d*.42,th*tiers+1.4);return {entry:{x:0,z:d/2-.3,width:rw}};},
 hanrei:g=>{const {w,d,r}=g,tiers=pick(r,[3,4,5]);let W=Math.min(w,d)*.8,y=.5;g.B('accent',[W*1.3,.5,W*1.3],[0,0,0],2);for(let i=0;i<tiers;i++){const h=2.2-i*.1,rise=.9;g.B(i%2?'wall':'wall',[W*.78,h,W*.78],[0,y,0],2);for(const sx of[-1,1])for(const sz of[-1,1])g.post('wall2',sx*W*.37,sz*W*.37,h,.16,1);g.Pr('hip','roof',[W*1.28,rise,W*1.28],[0,y+h,0],2);for(const sx of[-1,1])for(const sz of[-1,1])g.Pr('wedge','roof',[.7,.35,.7],[sx*W*.62,y+h+.05,sz*W*.62],0,[0,Math.atan2(sx,sz)+Math.PI,0]);y+=h+rise*.7;W*=.82;}
  g.Pr('cone','accent',[.35,1.6,.35],[0,y,0],1,undefined,6);g.door(0,W*.39/.82/1.0+.8,1.2,2);g.parts[g.parts.length-1]={...g.parts[g.parts.length-1],pos:[0,.5,Math.min(w,d)*.8*.39+.02]};g.banner(w*.42,d*.4,5);return {entry:{x:0,z:Math.min(w,d)*.65,width:1.4}};},
 vedara:g=>{const {w,d,r}=g,sw=w*.4,sh=range(r,2.6,3.2),zs=-d*.2;g.B('wall',[sw,sh,sw],[0,0,zs],2);let y=sh,s=sw*.9;const n=pick(r,[5,6,7]);for(let i=0;i<n;i++){const hh=1.1-i*.07;g.Cy('wall2',s,hh,[0,y,zs],2,4,s*.86);g.parts[g.parts.length-1]={...g.parts[g.parts.length-1],rot:[0,Math.PI/4,0]};y+=hh;s*=.8;}
  g.Cy('trim',s*1.6,.35,[0,y,zs],1,10);g.Pr('sphere','accent',[s*1.1,.5,s*1.1],[0,y+.35,zs],1);g.Cy('accent',.1,.8,[0,y+.8,zs],0,5);
  g.B('wall',[sw*.8,2.4,sw*.6],[0,0,zs+sw*.7],2);g.Pr('pyramid','roof',[sw*.9,1.4,sw*.7],[0,2.4,zs+sw*.7],2);for(let i=0;i<4;i++)g.B('wall2',[w*.5+i*.9,.2,.5],[0,i*.2,d*.2+(3-i)*.5],1);g.B('wall2',[w*.9,.2,d*.12],[0,0,d*.42],1);if(g.wealth>.4)g.banner(w*.4,d*.3,4.6);return {entry:{x:0,z:d*.35,width:2.2}};},
 aureline:g=>{const {w,d,r}=g,W=w*.84,D=d*.84,n=pick(r,[4,6]),colH=range(r,3.4,4.2),sty=.2*3,z0=-d*.02;for(let i=0;i<3;i++)g.B('wall2',[W+.4-i*.3,.22,D+.4-i*.3],[0,i*.22,z0],2);
  g.B('wall',[W*.62,colH,D*.62],[0,sty*.7,z0-D*.06],2);for(let i=0;i<n;i++){const x=-W*.42+i*W*.84/(n-1);g.Cy('wall',.5,colH,[x,sty*.7,z0+D*.4],2,10,.4);g.B('trim',[.7,.18,.7],[x,sty*.7+colH,z0+D*.4],1);}
  for(let j=1;j<4;j++)for(const s of[-1,1])g.Cy('wall',.46,colH,[s*W*.42,sty*.7,z0+D*.4-j*D*.26],2,10,.4);g.B('trim',[W*.96,.5,D*.9],[0,sty*.7+colH+.18,z0],2);g.Pr('prism','roof',[W*.96,colH*.22,D*.9],[0,sty*.7+colH+.68,z0],2,[0,0,0]);
  g.Pr('prism','wall',[W*.9,colH*.16,.3],[0,sty*.7+colH+.7,z0+D*.46],1);for(const s of[-1,1])g.Pr('cone','accent',[.35,.5,.35],[s*W*.46,sty*.7+colH+.7,z0+D*.46],0,undefined,5);g.banner(W*.55,D*.5,colH+2.4);if(g.era>=3)g.B('wall2',[W*.7,.4,1.2],[0,0,d/2-.7],1);return {entry:{x:0,z:z0+D/2+.2,width:W*.3}};},
 sahelan:g=>{const {w,d,r}=g,W=w*.6,D=d*.6,tiers=pick(r,[2,3]);let y=0,cw=W;const h0=range(r,3,3.8);for(let i=0;i<tiers;i++){g.B(i?'wall2':'wall',[cw,h0*(1-i*.15),cw*D/W],[0,y,-d*.08],2);for(let k=0;k<3;k++)for(const s of[-1,1])g.parts.push(part('cylinder',matId(g.civ,'trim') as Part['mat'],[.18,.9,.18],[s*cw/2+s*.3,y+h0*.2+k*.8,-d*.08-.2+k*.4],0,[0,0,s*Math.PI/2],5));y+=h0*(1-i*.15);cw*=.72;}
  for(const sx of[-1,1])for(const sz of[-1,1])g.Pr('cone','wall',[.7,1.6,.7],[sx*(W/2-.4),h0-.2,-d*.08+sz*(D/2-.4)],1,undefined,5);for(let i=0;i<4;i++)g.B('wall',[.6,h0*.85,.7],[-W/2+.45+i*(W-.9)/3,0,-d*.08+D/2+.35],1);g.Pr('cone','wall',[1,2.2,1],[0,y,-d*.08],1,undefined,5);
  g.B('accent',[1.4,2.4,.15],[0,0,-d*.08+D/2+.04],0);g.B('wall2',[w*.8,.4,d*.25],[0,0,d*.32],1);for(let i=0;i<3;i++)g.Cy('wall',1.5,1.1,[-w*.3+i*w*.3,0,d*.38],1,10);return {entry:{x:0,z:d*.3,width:1.4}};},
 quillan:g=>{const {w,d,r}=g,W=w*.84,D=d*.5,h=range(r,2.6,3.2);for(let i=0;i<3;i++)g.B('wall2',[W*(1-i*.04)+.6,.7,d*.9-i*.0],[0,i*.7,0],2);const z0=-d*.18;g.B('wall',[W*.8,h,D],[0,2.1,z0],2);
  g.Pr('prism','roof',[D*1.15,W*.3,W*.85],[0,2.1+h,z0],2,[0,0,0]);for(let i=0;i<5;i++){g.B('accent',[.55,1.2,.1],[-W*.35+i*W*.175,2.1+.4,z0+D/2+.04],0);g.B('accent',[.42,.5,.1],[-W*.35+i*W*.175,2.1+1.6,z0+D/2+.04],0);}g.B('wall2',[W*.5,.3,2],[0,.0,d*.32],1);
  for(let i=0;i<4;i++)g.B('wall',[W*.45,.2+i*.2,.6],[0,0,d/2-.35-i*.35],1);g.banner(w*.4,d*.3,5);return {entry:{x:0,z:d/2-.3,width:W*.4}};},
 kaaltun:g=>{const {w,d,r}=g,tiers=pick(r,[4,5,6]);let W=w*.94,D=d*.94,y=0;const th=range(r,.9,1.2);for(let i=0;i<tiers;i++){g.B(i%2?'wall2':'wall',[W,th,D],[0,y,0],2);y+=th;W*=.8;D*=.8;}
  g.B('wall',[W*.7,2.4,D*.55],[0,y,-D*.05],2);g.Pr('hip','roof',[W*.85,.9,D*.7],[0,y+2.4,-D*.05],1);g.B('wall2',[W*.5,2.6,.35],[0,y+2.5,-D*.05],1);g.B('accent',[.9,1.4,.1],[0,y,D*.22],0);
  const sw=w*.18;for(let i=0;i<tiers;i++)g.Pr('wedge','wall',[sw,th,d*.94/tiers*1.0],[0,i*th,d*.47-i*d*.94/tiers*.8],1,[0,0,0]);g.B('wall',[sw*1.1,.4,.9],[0,0,d/2-.5],1);g.banner(w*.43,d*.43,y+3);return {entry:{x:0,z:d/2-.3,width:sw}};},
 mekhari:g=>{const {w,d,r}=g,W=w*.82,D=d*.7,lift=range(r,1.6,2.1),tiers=pick(r,[2,3]);for(let i=0;i<5;i++)for(const s of[-1,1])g.post('trim',-W*.46+i*W*.23,s*D*.42,lift,.16,2);g.B('wall2',[W,.18,D],[0,lift,0],2);let y=lift+.18,cw=W*.9;
  for(let i=0;i<tiers;i++){const h=2-i*.2,rise=range(r,1.7,2.4);g.B('wall',[cw*.9,h,D*(.8-i*.08)],[0,y,0],2);g.Pr('prism','roof',[cw*1.15,rise,D*(1.5-i*.1)],[0,y+h,0],2,[0,Math.PI/2,0]);for(const s of[-1,1])g.parts.push(part('cone',matId(g.civ,'roof') as Part['mat'],[.5,1.2,.5],[s*cw*.57,y+h+rise*.55,0],1,[0,0,-s*.8],5));y+=h+rise*.55;cw*=.7;}
  g.B('wall2',[1.8,.12,w*.18],[0,0,0],0);g.B('wall2',[1.6,.1,d*.18],[0,lift,D/2+d*.1],1);g.banner(W*.5,D*.5,y+1.5);return {entry:{x:0,z:D/2+d*.15,width:1.4}};},
 brythen:g=>{const {w,d,r}=g,R=Math.min(w,d)*.3,h=range(r,2.4,3),zo=-d*.05;g.Cy('wall',2*R,h,[0,0,zo],2,16);const rise=R*1.15;g.Pr('cone','roof',[2*R*1.25,rise,2*R*1.25],[0,h,zo],2,undefined,16);g.Cy('accent',R*.4,.5,[0,h+rise-.05,zo],1,8);
  g.B('trim',[1.6,2.2,.2],[0,0,zo+R],0);for(let i=0;i<14;i++){const a=i/14*Math.PI*2;if(Math.sin(a)>.86)continue;g.Pr('box','wall2',[1,.9+((i*5)%3)*.25,.55],[Math.cos(a)*R*1.9*Math.min(1,(w/2-.6)/(R*1.9)),0,zo+Math.sin(a)*R*1.9*Math.min(1,(d/2-.6)/(R*1.9))],1,[0,-a+Math.PI/2,0]);}
  g.banner(R*1.3,R*1.2,h+2.4);for(let i=0;i<3;i++)g.post('trim',-R*1.3+i*.7,R*1.2,1.6,.1,0);return {entry:{x:0,z:zo+R+.3,width:1.4}};},
 rusvolt:g=>{const {w,d,r}=g,S=Math.min(w,d)*.62,tiers=pick(r,[3,4]);let s=S,y=0;const h0=range(r,2.4,3);g.B('wall2',[S*1.25,.5,S*1.25],[0,0,0],2);y=.5;
  for(let i=0;i<tiers;i++){const h=h0*(1-i*.18);g.Cy('wall',s,h,[0,y,0],2,8);for(let k=0;k<4;k++)g.Cy('wall2',s*1.02,.07,[0,y+.35+k*.5,0],0,8);g.Cy('roof',s*1.3,.7,[0,y+h,0],2,8,s*.7);y+=h+.5;s*=.72;}
  g.Pr('sphere','accent',[s*1.5,s*2.1,s*1.5],[0,y,0],1);g.Pr('cone','accent',[s*.5,s*1.2,s*.5],[0,y+s*1.9,0],1,undefined,6);g.Cy('trim',.06,.9,[0,y+s*3,0],0,4);
  for(const sx of[-1,1]){g.Cy('wall',S*.3,h0*.7,[sx*S*.55,.5,S*.4],2,8);g.Pr('sphere','accent',[S*.34,S*.46,S*.34],[sx*S*.55,.5+h0*.7,S*.4],1);}g.B('trim',[1.2,.15,.9],[0,.5,S*.55],1);g.banner(w*.4,d*.4,y+1);return {entry:{x:0,z:S*.65,width:1.2}};},
 steppan:g=>{const {w,d,r}=g,R=Math.min(w,d)*.26,h=range(r,2.2,2.7),zo=-d*.12;g.Cy('wall',2*R,h,[0,0,zo],2,16);g.Pr('sphere','roof',[2*R*1.06,R*1.2,2*R*1.06],[0,h*.9,zo],2);g.Cy('trim',R*.6,.3,[0,h*.9+R*1.15,zo],1,10);g.Pr('cone','accent',[.4,.8,.4],[0,h*.9+R*1.45,zo],0,undefined,6);
  g.B('accent',[1.5,2,.1],[0,0,zo+R],0);for(let i=0;i<pick(r,[3,5]);i++){const x=-w*.38+i*w*.76/4;g.post('wall2',x,d*.4,3.6+(i%2)*.7,.1,1);g.B('cloth',[.8,1.1,.03],[x+.42,2.4+(i%2)*.7,d*.4],1);}
  if(g.era>=4){g.B('wall2',[w*.94,1.2,.5],[0,0,d*.46],1);g.B('wall2',[.5,1.2,d*.5],[-w*.46,0,d*.2],1);g.B('wall2',[.5,1.2,d*.5],[w*.46,0,d*.2],1);}
  g.Pr('wedge','roof',[w*.5,.5,2],[0,2.4,d*.25],0);for(const s of[-1,1])g.post('trim',s*w*.22,d*.25+1,2.4,.1,1);return {entry:{x:0,z:d*.3,width:1.6}};},
 skoldar:g=>{const {w,d,r}=g,W=w*.84,D=d*.46,h=range(r,2.4,3),z0=-d*.1;g.B('wall',[W*1.04,h*.4,D*1.3],[0,0,z0],2);g.B('wall2',[W*.92,h,D*.95],[0,0,z0],2);
  for(let i=0;i<14;i++)g.B('wall2',[.14,h*1.05,.16],[-W*.46+i*W*.92/13,0,z0+D*.5+.04],0);g.Pr('prism','roof',[D*1.3,range(r,1.5,2),W*1.04],[0,h,z0],2);g.Pr('prism','trim',[D*.9,1.1,W*.82],[0,h+1.2,z0],1);
  for(const s of[-1,1]){g.Pr('cone','trim',[.4,1.4,.4],[s*W*.5,h+1.4,z0],1,[0,0,-s*.6],5);g.Pr('cone','accent',[.3,.6,.3],[s*W*.56,h+2,z0],0,[0,0,-s*1.0],5);}g.B('accent',[1.4,2.2,.14],[g.off*.3,0,z0+D*.5+.04],0);g.B('wall2',[W*.5,.3,1.2],[0,0,z0+D*.5+.7],1);g.banner(W*.45,D*.5+.9,5);return {entry:{x:g.off*.3,z:z0+D*.5+.8,width:1.4}};},
};
/** Roof over a W x D plan at height y: each civ's own roof form (so storehouses and markets read as that civ too). */
function roofFor(g:G,W:number,D:number,y:number,x=0,z=0){const f=CIVS[g.civ].roof,r=g.r,rise=range(r,.9,1.4);
 switch(f){
  case 'flatParapet':g.B('roof',[W*1.02,.25,D*1.02],[x,y,z],2);for(const sx of[-1,1])for(const sz of[-1,1])g.B('wall',[.4,.55+(sx>0?.15:0),.4],[x+sx*(W/2-.2),y+.25,z+sz*(D/2-.2)],1);break;
  case 'flatSpiked':g.B('roof',[W*1.02,.25,D*1.02],[x,y,z],2);for(const sx of[-1,1])for(const sz of[-1,1])g.Pr('cone','wall',[.4,.9,.4],[x+sx*(W/2-.2),y+.25,z+sz*(D/2-.2)],1,undefined,5);break;
  case 'flatPalm':g.B('roof',[W,.15,D],[x,y,z],2);for(let i=0;i<6;i++)g.Cy('roof',.1,D*.95,[x-W*.42+i*W*.17,y+.15,z+D*.47],1,5);break;
  case 'vault':g.parts.push(part('cylinder',matId(g.civ,'roof') as Part['mat'],[Math.min(W,D)*.8,W,Math.min(W,D)*.8],[x-W/2,y+Math.min(W,D)*.4,z],2,[0,0,Math.PI/2],10));break;
  case 'upturnedHip':g.Pr('hip','roof',[W*1.25,rise,D*1.25],[x,y,z],2);for(const sx of[-1,1])for(const sz of[-1,1])g.Pr('wedge','roof',[.7,.35,.7],[x+sx*W*.62,y+.05,z+sz*D*.62],0,[0,Math.atan2(sx,sz)+Math.PI,0]);break;
  case 'chhatri':g.B('roof',[W,.2,D],[x,y,z],2);g.Pr('sphere','roof',[Math.min(W,D)*.5,.9,Math.min(W,D)*.5],[x,y+.2,z],1);break;
  case 'terracottaGable':g.Pr('prism','roof',[D*1.1,rise*.6,W*1.05],[x,y,z],2);break;
  case 'conicalThatch':case 'roundCone':g.Pr('cone','roof',[Math.max(W,D)*1.3,rise*1.4,Math.max(W,D)*1.3],[x,y,z],2,undefined,10);break;
  case 'steepThatch':g.Pr('prism','roof',[D*1.15,W*.7,W*1.15],[x,y,z],2);break;
  case 'palmGable':g.Pr('hip','roof',[W*1.3,rise*1.2,D*1.3],[x,y,z],2);g.Pr('box','trim',[.2,.3,D*.5],[x,y+rise*1.2,z],0);break;
  case 'saddle':g.Pr('prism','roof',[D*1.4,rise*1.4,W*1.2],[x,y,z],2,[0,Math.PI/2,0]);for(const s of[-1,1])g.parts.push(part('cone',matId(g.civ,'roof') as Part['mat'],[.4,1,.4],[x+s*W*.6,y+rise*.7,z],1,[0,0,-s*.8],5));break;
  case 'plankGable':g.Pr('prism','roof',[D*1.15,rise*1.1,W*1.1],[x,y,z],2);g.Cy('trim',.14,W*.9,[x,y+rise*1.1,z],0,5);g.parts[g.parts.length-1]={...g.parts[g.parts.length-1],rot:[0,0,Math.PI/2],pos:[x+W*.45,y+rise*1.1+.07,z]};break;
  case 'feltDome':g.Pr('sphere','roof',[W*1.05,W*.7,D*1.05],[x,y,z],2);break;
  default:g.Pr('prism','roof',[D*1.2,rise*.5,W*1.15],[x,y,z],2);for(let i=0;i<4;i++)g.B('wall',[.5,.12,.5],[x-W*.3+i*W*.2,y+rise*.5,z],0);}
}
// ---------------------------------------------------------------- granary and market
function granary(g:G):Out{const {w,d,r}=g,k=CIVS[g.civ].granary,n=pick(r,[2,3]);
 if(k==='cone'||k==='bins'){const bd=Math.min(1.8,(w-.6)/n);for(let i=0;i<n;i++){const x=-((n-1)*(bd+.25))/2+i*(bd+.25),h=range(r,1.5,2.1);g.Cy(k==='bins'?'wall':'wall2',bd,h,[x,0,-d*.15],2,k==='bins'?4:10,k==='bins'?bd*.8:bd);g.Pr(k==='bins'?'sphere':'cone',k==='bins'?'wall':'roof',[bd*1.1,k==='bins'?bd*.5:1.1,bd*1.1],[x,h,-d*.15],2,undefined,10);}return {entry:{x:0,z:d*.2,width:1.4}};}
 if(k==='cellar'){g.B('wall2',[w*.8,.6,d*.6],[0,0,-d*.1],2);roofFor(g,w*.8,d*.6,.6,0,-d*.1);g.B('accent',[.9,.7,.1],[g.off*.3,0,d*.2+.02],0);for(let i=0;i<4;i++)g.Cy('wall',.5,.5,[-w*.3+i*.4,0,d*.3],0,8);return {entry:{x:0,z:d*.2,width:.9}};}
 const W=w*.66,D=d*.6,fl=range(r,.7,1.1),h=range(r,1.6,2);for(let i=0;i<3;i++)for(const s of[-1,1])g.post('trim',-W*.42+i*W*.42,s*D*.4,fl,.16,2);g.B('wall2',[W,.16,D],[0,fl,0],2);g.B('wall',[W*.9,h,D*.88],[0,fl+.16,0],2);roofFor(g,W*.95,D*.95,fl+.16+h);g.B('wall2',[.8,.1,1.2],[0,fl,D/2+.6],0);return {entry:{x:0,z:D/2+1,width:.9}};}
function market(g:G):Out{const {w,d,r}=g,n=pick(r,[3,4]),W=w*.88,D=d*.5,h=range(r,2.6,3.2),z0=-d*.1;for(let i=0;i<n;i++)for(const s of[-1,1])g.post('trim',-W/2+.2+i*(W-.4)/(n-1),z0+s*D/2,h+(i%2)*.15*(g.wear),.16,2);roofFor(g,W+.4,D+.4,h+.1,0,z0);g.B('cloth',[W*.9,.06,D*.9],[0,h-.1,z0],0);for(let i=0;i<pick(r,[2,3,4]);i++)g.B('wall2',[1.3,.8,.7],[-W*.3+i*W*.3,0,z0-D*.2],1);for(let i=0;i<3;i++)g.Cy('accent',.55,.6,[-W*.3+i*.7,0,d*.3],0,8);g.banner(W/2,d*.35,3.6);return {entry:{x:0,z:d*.3,width:W*.5}};}
const BUILD:Record<Exclude<CivRole,'house'|'civic'>,(g:G)=>Out>={granary,market};
/** Seeded add-ons every real building accumulates: lean-to, chimney or stack, steps, jars. Independent of the main builder's rng. */
function addons(g:G,r:Rng){const {w,d}=g;
 if(chance(r,.45)){const sx=chance(r,.5)?1:-1;g.B('wall2',[1.6,range(r,1.1,1.6),2.2],[sx*(w/2-1),0,d*.12],1);g.Pr('wedge','roof',[1.9,.5,2.5],[sx*(w/2-1),1.4,d*.12],1);}
 if(chance(r,.35)){const sx=chance(r,.5)?1:-1;g.B('wall',[.5,range(r,2.8,4),.5],[sx*(w/2-.5),0,-d/2+.6],1);}
 if(chance(r,.4)){g.B('wall2',[range(r,1.8,2.8),.2,.6],[0,0,d/2-.4],1);g.B('wall2',[range(r,1.2,1.8),.4,.5],[0,.2,d/2-.9],1);}
 if(chance(r,.3))for(let i=0;i<pick(r,[2,3]);i++)g.Cy('accent',.4,.5,[-w*.3+i*.5,0,d/2-.5],0,8);
}
export const ROLE_LIST:CivRole[]=['house','civic','granary','market'];
/** Seeded individual imperfection: wall lean, uneven heights, size jitter, rubble and patches by wear. */
function imperfect(g:G,parts:Part[],wear:number,r:Rng){
 const lean=Math.min(.026,.004+wear*.02),leanDeg=lean*180/Math.PI;let patches=0;
 const out=parts.map(p=>{const tall=p.shape==='box'&&p.size[1]>1.2&&p.lod>=1&&!p.rot;if(!tall)return p;const rx=(r()-.5)*2*lean,rz=(r()-.5)*2*lean,hs=jit(r,.03);const q={...p,size:[p.size[0],p.size[1]*hs,p.size[2]] as V,rot:[rx,0,rz] as V},dip=partBounds(q).minY;return dip<0?{...q,pos:[p.pos[0],p.pos[1]-dip,p.pos[2]] as V}:q;});
 for(let i=0;i<Math.round(wear*6);i++){const a=r()*Math.PI*2,rr=Math.min(g.w,g.d)*.32+r()*.5;out.push(part('box',matId(g.civ,'wall2') as Part['mat'],[.3+r()*.3,.2+r()*.2,.3+r()*.3],[Math.cos(a)*rr*.9,0,Math.sin(a)*rr*.9],0,[0,r()*3,0]));patches++;}
 return {parts:out,lean:leanDeg,patches};
}
export function generateCivBuilding(civ:CivId,role:CivRole,ctx:CivContext,variantKey=''):CivSpec{
 const r=seededRandom(ctx.seed),g=mk(civ,ctx,r),sc=jit(r,.06);
 // builders read g.w/g.d, so run them on a view scaled by the instance's size jitter (still fitted back into the footprint below)
 const view:G={...g,w:ctx.footprint.w*Math.min(1,sc),d:ctx.footprint.d*Math.min(1,sc)};
 const out=role==='house'?(ctx.era<=1?poor(view):HOUSE[civ](view)):role==='civic'?(ctx.era<=1?poor(view):CIVIC[civ](view)):BUILD[role](view);
 if(ctx.era>1&&role!=='market')addons(view,seededRandom(ctx.seed^0x51ed270b));
 const im=imperfect(view,g.parts,ctx.wear,seededRandom(ctx.seed^0x9e3779b1));
 const ref=`${CIVS[civ].name}: ${CIVS[civ].inspiration}`,e=out.entry;
 const fit=fitToFootprint({family:`civ.${civ}.${role}`,variantKey,footprint:{...ctx.footprint},parts:im.parts,...(e?{entry:e}:{}),notes:{reference:ref}},.1);
 const {w,d}=fit.footprint,entry=fit.entry?{...fit.entry,x:Math.max(-w/2,Math.min(w/2,fit.entry.x)),z:Math.max(-d/2,Math.min(d/2,fit.entry.z))}:undefined;
 const own=new Set(Object.keys(materialTable(civ))),parts=ensureTiers(ensureNearSupport(ensureCore(fit.parts),fit.footprint),fit.footprint).map(p=>own.has(p.mat)?p:{...p,mat:matId(civ,'wall2') as Part['mat']}),cloth=matId(civ,'cloth');
 return {...fit,...(entry?{entry}:{}),parts,civ,role,materials:materialTable(civ),banners:parts.filter(p=>p.mat===cloth&&p.size[2]<.1&&p.size[1]>.6).map(p=>({pos:p.pos,size:p.size})),imperfection:{scale:sc,lean:im.lean,offDoor:g.off,patches:im.patches}};
}
