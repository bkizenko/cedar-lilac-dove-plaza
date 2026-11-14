/** Per-civ building generators (pure Part specs; entrance +Z, metres, origin at the footprint base centre). Every civ has
 * its OWN house, civic building, granary and market built from its own materials and its own massing grammar, not a
 * shared form with a tint. Each instance is individually imperfect (seeded size, lean, uneven heights, off-centre doors,
 * add-ons, rubble and patching with wear). Era 0-1 builds the poorest local dwelling; later eras add the signature wall,
 * a civic hall, plinths, storeys and trim. Materials are named `${civ}.${slot}` and resolved through `materials`. */
import type {Heraldry} from './villageIdentity';
import {beam,capMidTier,chance,fitToFootprint,partBounds,part,pick,range,seededRandom,type BuildingSpec,type Part,type Rng,type LodTier} from './buildingParts';
import {ensureCore,ensureNearSupport,ensureTiers} from './buildingFamiliesCivic';
import {dressDwelling,muteTable} from './buildingDetail';
import {getHutVariety,hutPlan,varyHut,type HutPlan} from './hutVariety';
import {CIVS,matId,materialTable,paletteTable,type CivId,type CivLook,type CivMaterials,type Swatch} from './civStyles';
export type CivRole='house'|'civic'|'granary'|'market';
/** eraMode 'morph' (default): the look follows `era`. 'fixed': the look is set by the building's own build-time culture/wealth (`built`, else the era it was first generated at) and never morphs when the world's era advances; only an explicit rebuild (new `built`) or extension (`extensions`) changes it. */
export type EraMode='morph'|'fixed';export const ERA_MODES:EraMode[]=['morph','fixed'];export const DEFAULT_ERA_MODE:EraMode='fixed';
export type CivContext={/** the village's heraldry (villageIdentity.ts): roof finial + rim trim, so same-colour villages differ beyond hue */heraldry?:Heraldry;seed:number;era:number;wealth:number;/** 0 new .. 1 ruined-ish */wear:number;footprint:{w:number;d:number};lit?:boolean;/** a ruler has just died: banners hang at half-mast with a mourning band (original grammar only) */mourning?:boolean;/** a CivSkin's overrides: palette, roof form, granary and banner shape (absent = the civ's own approved bible) */look?:CivLook;eraMode?:EraMode;built?:{era:number;wealth:number};/** later additions, each built with the techniques of its own era */extensions?:{era:number}[]};
export type CivSpec=BuildingSpec&{civ:CivId;role:CivRole;materials:Record<string,Swatch>;banners:{pos:readonly[number,number,number];size:readonly[number,number,number]}[];imperfection:{scale:number;lean:number;offDoor:number;patches:number};eraMode:EraMode;builtEra:number;extensionEras:number[]};
type V=[number,number,number];type Slot=keyof CivMaterials;
type G={civ:CivId;look?:CivLook;r:Rng;w:number;d:number;era:number;wealth:number;wear:number;parts:Part[];
 B:(s:Slot,size:V,pos:V,lod?:LodTier,rot?:V)=>void;Cy:(s:Slot,dia:number,h:number,pos:V,lod?:LodTier,sides?:number,top?:number)=>void;Pr:(shape:Part['shape'],s:Slot,size:V,pos:V,lod?:LodTier,rot?:V,sides?:number)=>void;
 post:(s:Slot,x:number,z:number,h:number,t?:number,lod?:LodTier)=>void;banner:(x:number,z:number,h:number)=>void;door:(x:number,z:number,wd?:number,h?:number)=>void;off:number};
type Out={entry?:{x:number;z:number;width:number}};
/** Per-civ banner shapes (original grammar): each society hangs its cloth its own way so villages read apart at a glance. 'flag' is the first-generation look and stays the legacy default. */
export type BannerStyle='flag'|'swallow'|'hanging'|'streamers'|'pennant'|'twin';
export const BANNER_STYLE:Record<CivId,BannerStyle>={sandrill:'hanging',nilemark:'streamers',tigrane:'swallow',hanrei:'twin',vedara:'streamers',aureline:'pennant',sahelan:'hanging',quillan:'swallow',kaaltun:'twin',mekhari:'streamers',brythen:'pennant',rusvolt:'flag',steppan:'swallow',skoldar:'pennant'};
function bannerFor(parts:Part[],civ:CivId,m:(s:Slot)=>Part['mat'],x:number,z:number,h:number,mourning=false,style?:BannerStyle,wear=0){
 const i0=parts.length;
 const st=style??BANNER_STYLE[civ],T=m('trim'),C=m('cloth'),A=m('accent'),top=h-.15;
 /** pole + main cloth are mid-tier; tails, bars, trim bands and finial are near-only so the mid/far budgets hold */
 parts.push(beam(T,[x,0,z],[x,h,z],.08,1),part('cone',A,[.14,.24,.14],[x,h,z],0,undefined,4));
 switch(st){
  case 'swallow':parts.push(part('box',C,[.78,.66,.03],[x+.42,top-.66,z],1),part('box',C,[.3,.42,.03],[x+.2,top-1.2,z],0),part('box',C,[.3,.42,.03],[x+.64,top-1.2,z],0));break;
  case 'hanging':parts.push(part('box',C,[.58,1.35,.03],[x+.4,top-1.4,z],1),part('box',T,[.78,.07,.07],[x+.4,top,z],0),part('box',A,[.58,.1,.035],[x+.4,top-1.4,z],0),part('box',A,[.34,.1,.035],[x+.4,top-.8,z],0));break;
  case 'streamers':parts.push(part('box',C,[.1,1.0,.03],[x+.14,top-.8,z],1));for(let i=1;i<4;i++)parts.push(part('box',C,[.1,.8+(i%2)*.45,.03],[x+.14+i*.16,top-.8-(i%2)*.2,z+((i%2)?.02:-.02)],0));parts.push(part('box',T,[.74,.05,.06],[x+.36,top,z],0));break;
  case 'pennant':parts.push(part('box',C,[.95,.62,.03],[x+.5,top-.62,z],1),part('box',C,[.62,.22,.03],[x+.67,top-1.04,z],0),part('box',C,[.3,.14,.03],[x+.82,top-1.22,z],0));break;
  case 'twin':parts.push(part('box',C,[.36,1.05,.03],[x+.25,top-.9,z],1),part('box',C,[.36,.8,.03],[x+.66,top-.8,z],0),part('box',A,[.36,.14,.035],[x+.25,top-.9,z],0),part('box',T,[.78,.05,.06],[x+.4,top,z],0));break;
  default:parts.push(part('box',C,[.7,.95,.03],[x+.38,h-1.05,z],1));
 }
 if(mourning){const drop=Math.min(.55,h*.2);for(let i=i0+2;i<parts.length;i++){const q=parts[i];parts[i]={...q,pos:[q.pos[0],q.pos[1]-drop,q.pos[2]]};}parts.push(part('box',T,[.05,.9,.05],[x+.02,top-.8-drop,z+.04],0),part('box',T,[.5,.07,.04],[x+.34,top-drop,z+.03],0));}
 weatherBanner(parts,m,x,z,top-(mourning?Math.min(.55,h*.2):0),wear);
}
/** Weathered banners (original grammar, near-only, cosmetic): from about half wear a faded, torn patch that grows with wear. Deterministic from the pole position. */
function weatherBanner(parts:Part[],m:(s:Slot)=>Part['mat'],x:number,z:number,top:number,wear:number){
 if(!Number.isFinite(wear)||wear<.55)return;
 const w=Math.min(1,(wear-.55)/.45),T=m('trim'),C=m('cloth'),u=(Math.abs(Math.round(x*7+z*13))%7)/7;
 /** one torn/faded patch per banner so the near budget holds on multi-banner halls */
 parts.push(part('box',T,[.1+.08*w+u*.05,.1+.12*w,.036],[x+.2+u*.3,top-.55-u*.4,z+.012],0,[0,0,(u-.5)*.8]));
}

const mk=(civ:CivId,ctx:CivContext,r:Rng):G=>{const parts:Part[]=[],m=(s:Slot)=>matId(civ,s) as Part['mat'];
 const g:G={civ,...(ctx.look?{look:ctx.look}:{}),r,w:ctx.footprint.w,d:ctx.footprint.d,era:ctx.era,wealth:ctx.wealth,wear:ctx.wear,parts,off:range(r,-.35,.35),
  B:(s,size,pos,lod=1,rot)=>void parts.push(part('box',m(s),size,pos,lod,rot)),
  Cy:(s,dia,h,pos,lod=1,sides=10,top)=>void parts.push(part('cylinder',m(s),[dia,h,top??dia],pos,lod,undefined,sides)),
  Pr:(shape,s,size,pos,lod=1,rot,sides)=>void parts.push(part(shape,m(s),size,pos,lod,rot,sides)),
  post:(s,x,z,h,t=.16,lod=2)=>void parts.push(beam(m(s),[x,0,z],[x,h,z],t,lod)),
  banner:(x,z,h)=>{if(grammarSet==='original')return void bannerFor(parts,civ,m,x,z,h,ctx.mourning,ctx.look?.banner,ctx.wear);parts.push(beam(m('trim'),[x,0,z],[x,h,z],.08,1),part('box',m('cloth'),[.7,.95,.03],[x+.38,h-1.05,z],1));},
  door:(x,z,wd=.9,h=1.8)=>void parts.push(part('box',m('accent'),[wd,h,.08],[x,0,z],0))};return g;};
const jit=(r:Rng,a:number)=>1+(r()-.5)*2*a;
/** Poorest local dwelling per civ (era 0-1). Every one must read as a HUT at a glance: a wall, a clearly separate roof mass that overhangs it,
 * and a dark framed doorway 0.95 m wide x 1.65 m tall (a person is ~1.7 m) on the +Z (entry) face. */
const POOR:Record<CivId,string>={sandrill:'cave',nilemark:'hut',tigrane:'dome',hanrei:'hut',vedara:'hut',aureline:'hut',sahelan:'conehut',quillan:'sod',kaaltun:'hut',mekhari:'raft',brythen:'lean',rusvolt:'dugout',steppan:'tent',skoldar:'longhut'};
export const POOR_KIND=POOR;
const lum=(h:string)=>{const n=parseInt(h.slice(1),16);return .2126*(n>>16&255)+.7152*(n>>8&255)+.0722*(n&255);};
/** The darkest of the civ's own swatches: the doorway opening (civ tables have no black slot, so the opening is its darkest tone). */
function darkSlot(g:G):Slot{const t=(g.look?.palette??CIVS[g.civ].materials) as CivMaterials,slots:Slot[]=['wall2','accent','trim','roof','cloth'];return slots.reduce((a,b)=>lum(t[b].hex)<lum(t[a].hex)?b:a,slots[0]);}
/** Framed doorway on the +Z face at x, wall plane z: dark opening, light-contrast posts + lintel, a threshold step. */
/** The plan of the hut being built (door width/height factors and spread), set by poor() just before the base form is drawn. */
const HUT:{plan:HutPlan}={plan:{kx:1,kz:1,apse:false,doorK:[1,1],doorSpread:1}};
function hutDoor(g:G,x:number,z:number,wd=.95,h=1.65){
 const dk=darkSlot(g),fr:Slot=dk==='trim'?'wall':'trim';
 wd*=HUT.plan.doorK[0];h*=HUT.plan.doorK[1];
 g.B(dk,[wd,h,.1],[x,0,z],1);
 for(const s of[-1,1])g.B(fr,[.14,h+.14,.2],[x+s*(wd/2+.07),0,z+.04],1);
 g.B(fr,[wd+.4,.16,.2],[x,h,z+.04],1);g.B('wall2',[wd+.7,.1,.5],[x,0,z+.22],1);}
/** Civs whose poorest dwelling is a plain round hut also build one of two alternative forms, picked per building. */
const POOR_ALT:Partial<Record<CivId,string[]>>={nilemark:['flat','flat','hut'],hanrei:['hipbox','hut','hipbox'],vedara:['hut','hipbox'],aureline:['hut','sod','hut'],kaaltun:['hipbox','hut'],sahelan:['conehut','conehut','flat']};
/** Variety pass: every civ also builds 2 to 3 alternative hut forms (kept recognisably its own). */
const POOR_ALT_RICH:Partial<Record<CivId,string[]>>={sandrill:['cave','cave','flat','hipbox'],tigrane:['dome','dome','hut','flat'],quillan:['sod','sod','lean','hut'],mekhari:['raft','hipbox','hut','longhut'],brythen:['lean','sod','longhut','hut'],rusvolt:['dugout','sod','longhut'],steppan:['tent','tent','conehut','hut'],skoldar:['longhut','sod','hipbox','hut'],nilemark:['flat','flat','hut'],hanrei:['hipbox','hut','hipbox'],vedara:['hut','hipbox'],aureline:['hut','sod','hut'],kaaltun:['hipbox','hut'],sahelan:['conehut','conehut','flat']};
/** Per-building proportions: wall size, height, roof pitch and overhang vary so no two huts in a village share a silhouette. */
function poor(g:G):Out{
 const n0=g.parts.length,pr=seededRandom((g.r()*4294967296)>>>0),RO=range(pr,.9,1.14),RR=range(pr,.78,1.38),on=getHutVariety(),plan=on?hutPlan(pr):HUT.plan;HUT.plan=plan;const out=poorBase(g);
 for(let i=n0;i<g.parts.length;i++){const p=g.parts[i];if(p.lod===2&&!p.ends&&(p.shape==='cone'||p.shape==='prism'||p.shape==='hip'||p.shape==='sphere')&&p.pos[1]>.9)g.parts[i]={...p,size:[p.size[0]*RO,p.size[1]*RR,p.size[2]*RO]};}
 const mm=(s:Slot)=>matId(g.civ,s) as Part['mat'];
 if(on)varyHut(g.parts,n0,{wall:mm('wall'),wall2:mm('wall2'),roof:mm('roof'),trim:mm('trim'),accent:mm('accent'),cloth:mm('cloth'),ground:mm('ground'),dark:mm(darkSlot(g))},pr,{wealth:g.wealth,wear:g.wear,plan,footprint:{w:g.w,d:g.d}});
 HUT.plan={kx:1,kz:1,apse:false,doorK:[1,1],doorSpread:1};
 return out.entry?{...out,entry:{...out.entry,x:out.entry.x,z:out.entry.z*plan.kz}}:out;
}
function poorBase(g:G):Out{const {w,d,r}=g,alt=(getHutVariety()?POOR_ALT_RICH:POOR_ALT)[g.civ],k=alt?alt[Math.min(alt.length-1,Math.floor(r()*alt.length))]:POOR[g.civ],W=Math.min(w,d)*range(r,.64,.88),R=W/2,h=range(r,1.6,2.2),dx=Math.max(-W*.3,Math.min(W*.3,g.off*1.3*HUT.plan.doorSpread));
 switch(k){
  case 'cave':{const bw=w*.86,bd=d*.62,bh=2.5,z0=-d*.12;g.B('wall',[bw,bh,bd],[0,0,z0],2);g.B('roof',[bw+.5,.28,bd+.5],[0,bh,z0],2);g.B('wall2',[bw+.5,.34,.26],[0,bh+.28,z0+bd/2+.12],1);for(const x of[-1,0,1])g.parts.push(part('cylinder',matId(g.civ,'trim') as Part['mat'],[.2,.8,.2],[x*bw*.3,bh-.35,z0+bd/2+.4],1,[Math.PI/2,0,0],6));hutDoor(g,dx,z0+bd/2+.02);return {entry:{x:dx,z:z0+bd/2+.5,width:.95}};}
  case 'flat':{const bw=W*range(r,1,1.25),bd=W*range(r,.85,1.05),wh=range(r,1.8,2.3);g.B('wall',[bw,wh,bd],[0,0,0],2);g.B('wall2',[bw+.12,.26,bd+.12],[0,wh,0],2);g.B('roof',[bw*.84,.08,bd*.84],[0,wh+.2,0],1);
   for(let i=0;i<3;i++)g.parts.push(part('cylinder',matId(g.civ,'trim') as Part['mat'],[.11,bw*.96,.11],[0,wh+.26+i*.0,-bd*.3+i*bd*.3],0,[0,0,Math.PI/2],5));hutDoor(g,dx,bd/2+.02);return {entry:{x:dx,z:bd/2+.5,width:.95}};}
  case 'hipbox':{const bw=W*range(r,1,1.2),bd=W*range(r,.9,1.1),wh=range(r,1.7,2.1);g.B('wall',[bw,wh,bd],[0,0,0],2);g.B('wall2',[bw+.1,.3,bd+.1],[0,0,0],1);g.parts.push({...part('hip',matId(g.civ,'roof') as Part['mat'],[bw*1.3,range(r,1,1.5),bd*1.3],[0,wh-.05,0],2),inset:bd*.3});hutDoor(g,dx,bd/2+.02);return {entry:{x:dx,z:bd/2+.5,width:.95}};}
  case 'dome':{const wh=1.45;g.Cy('wall',W,wh,[0,0,0],2,10);g.Pr('sphere','wall',[W*1.04,W*.85,W*1.04],[0,wh-.1,0],2,undefined,10);g.Cy('wall2',W*1.06,.14,[0,wh-.12,0],1,10);hutDoor(g,dx,R*.951+.03,.9,1.45);return {entry:{x:dx,z:R+.5,width:.9}};}
  case 'conehut':{g.Cy('wall',W,1.55,[0,0,0],2,10);g.Pr('cone','roof',[W*1.45,2.4,W*1.45],[0,1.4,0],2,undefined,10);hutDoor(g,dx,R*.951+.03,.85,1.5);g.Cy('trim',W*1.02,.12,[0,1.1,0],1,10);return {entry:{x:dx,z:R+.5,width:.9}};}
  case 'sod':{const bw=W*1.15,bd=W*.95,wh=1.75;g.B('wall',[bw,wh,bd],[0,0,0],2);g.Pr('prism','roof',[bw+.7,1.5,bd+.7],[0,wh-.05,0],2);g.B('wall2',[bw+.2,.3,bd+.2],[0,0,0],1);hutDoor(g,dx,bd/2+.02);return {entry:{x:dx,z:bd/2+.5,width:.95}};}
  case 'lean':{const bw=W*1.0,bd=W*1.0,wh=1.1;g.B('wall',[bw,wh,bd],[0,0,0],2);g.Pr('prism','roof',[bw+.6,2.2,bd+.8],[0,wh-.05,0],2);g.post('trim',-bw/2,bd/2+.1,wh+.4,.14,1);g.post('trim',bw/2,bd/2+.1,wh+.4,.14,1);hutDoor(g,dx,bd/2+.02,.9,1.0);return {entry:{x:dx,z:bd/2+.5,width:.9}};}
  case 'dugout':{const bw=W*1.15,bd=W*.95,wh=1.85;g.B('wall',[bw,wh,bd],[0,0,0],2);for(let i=0;i<4;i++)g.B('wall2',[bw+.12,.2,.2],[0,.15+i*.45,bd/2+.04],1);g.Pr('prism','roof',[bw+.8,1.5,bd+.8],[0,wh-.05,0],2);g.post('trim',0,0,wh+1.55,.1,1);hutDoor(g,dx,bd/2+.1);return {entry:{x:dx,z:bd/2+.5,width:.95}};}
  case 'tent':{g.Cy('wall',W*1.05,1.35,[0,0,0],2,10);g.Pr('cone','roof',[W*1.35,2.2,W*1.35],[0,1.3,0],2,undefined,10);g.post('trim',0,0,3.8,.07,1);hutDoor(g,dx,R*1.05*.951+.03,.9,1.3);return {entry:{x:dx,z:R+.5,width:.9}};}
  case 'longhut':{const bw=W*1.25,bd=W*.85,wh=1.7;g.B('wall',[bw,wh,bd],[0,0,0],2);g.Pr('prism','roof',[bw+.8,1.4,bd+.8],[0,wh-.05,0],2);g.B('wall2',[bw+.15,.35,bd+.15],[0,0,0],1);hutDoor(g,dx,bd/2+.02);return {entry:{x:dx,z:bd/2+.5,width:.95}};}
  case 'raft':{const bw=W*.95,bd=W*.8,fh=.26;for(const x of[-1,1])for(const z of[-1,1])g.post('trim',x*bw*.46,z*bd*.44,fh,.14,2);g.B('wall2',[bw+.3,.14,bd+.3],[0,fh,0],2);g.B('wall',[bw,1.6,bd],[0,fh+.14,0],2);g.Pr('prism','roof',[bw+.8,1.4,bd+.8],[0,fh+1.7,0],2);
   g.B('trim',[.9,.1,.9],[dx,fh+.04,bd/2+.4],1);g.Pr('wedge','wall2',[.9,fh,.9],[dx,0,bd/2+1.1],1,[0,Math.PI,0]);const dk=darkSlot(g);g.B(dk,[.85,1.35,.1],[dx,fh+.14,bd/2+.02],1);for(const s of[-1,1])g.B('trim',[.12,1.45,.18],[dx+s*.5,fh+.14,bd/2+.04],0);g.B('trim',[1.1,.14,.18],[dx,fh+1.49,bd/2+.04],0);return {entry:{x:dx,z:bd/2+1.2,width:.9}};}
  default:{g.Cy('wall',W,h*.85,[0,0,0],2,8);g.Cy('wall2',W*1.04,.3,[0,0,0],1,8);g.Pr('cone','roof',[W*1.4,2.0,W*1.4],[0,h*.85-.1,0],2,undefined,8);hutDoor(g,dx,R*.924+.03);return {entry:{x:dx,z:R+.5,width:.95}};}}
}
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
function roofFor(g:G,W:number,D:number,y:number,x=0,z=0){const f=g.look?.roof??CIVS[g.civ].roof,r=g.r,rise=range(r,.9,1.4);
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
function granary(g:G):Out{const {w,d,r}=g,k=g.look?.granary??CIVS[g.civ].granary,n=pick(r,[2,3]);
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

/** ARCHIVE: the first-generation per-civ grammars are kept verbatim and selectable (GRAMMAR_SET 'legacy'); never deleted. */
const LEGACY_HOUSE:Record<CivId,(g:G)=>Out>={...HOUSE},LEGACY_CIVIC:Record<CivId,(g:G)=>Out>={...CIVIC};
// ---------------------------------------------------------------- original grammars (Experience lane): not copies of any real tradition
const P=(g:G,shape:Part['shape'],s:Slot,size:V,pos:V,rot?:V,sides?:number,lod:LodTier=2)=>void g.parts.push(part(shape,matId(g.civ,s) as Part['mat'],size,pos,lod,rot,sides));
const yawOf=(x:number,z:number)=>Math.atan2(x,z);
/** Aureline: salt-white crescent terraces under teal shell vaults; the civic hall is an open ring of alternating pillars round a teal pool, a sail-tower at its heart. */
HOUSE.aureline=g=>{const {w,d,r}=g,n=5,R=w*.7,span=1.45,h=range(r,1.7,2.1),ch=2*R*Math.sin(span/(2*(n-1)))*1.06+.15;
 g.B('wall2',[w*.95,.3,d*.8],[0,0,d*.12],2);
 for(let i=0;i<n;i++){const a=(i/(n-1)-.5)*span,cx=Math.sin(a)*R,cz=-Math.cos(a)*R+R*.72,hh=h+(i%2?.4:0),nx=-Math.sin(a),nz=Math.cos(a);
  P(g,'box','wall',[ch,hh,2.3],[cx,.3,cz],[0,-a,0]);P(g,'sphere','roof',[ch*1.04,1.25,2.6],[cx,.3+hh-.45,cz],[0,-a,0]);
  P(g,'box','trim',[ch*.96,.1,2.35],[cx,.3+hh*.55,cz],[0,-a,0],undefined,0);
  P(g,'box','accent',[.8,1.35,.1],[cx+nx*1.17,.3,cz+nz*1.17],[0,-a,0],undefined,0);P(g,'sphere','accent',[.8,.7,.1],[cx+nx*1.17,.3+1.3,cz+nz*1.17],[0,-a,0],undefined,0);
  if(i%2===0)P(g,'box','trim',[.5,.5,.1],[cx+nx*1.17+.9,.3+hh*.55,cz+nz*1.17],[0,-a,0],undefined,0);}
 g.B('wall2',[1.8,.3,.9],[g.off*.3,.3,R*.72-R+.2+2.1],1);P(g,'wedge','wall2',[.5,hh0(h)+1.6,1.4],[w*.46,.3,-d*.25],[0,Math.PI,0],undefined,1);
 return {entry:{x:g.off*.3,z:R*.72-R+2.4,width:1.2}};};
const hh0=(h:number)=>h+.4;
CIVIC.aureline=g=>{const {w,d,r}=g,R=Math.min(w,d)*.48,n=12,gate=.34;
 P(g,'cylinder','wall2',[R*2.2,.35,R*2.2],[0,0,0],undefined,20);P(g,'cylinder','roof',[R*1.4,.1,R*1.4],[0,.35,0],undefined,20,0);P(g,'cylinder','trim',[R*1.5,.12,R*1.5],[0,.33,0],undefined,20,0);
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2,x=Math.sin(a),z=Math.cos(a);if(Math.abs(Math.atan2(x,z))<gate)continue;const ph=i%2?4.4:3.4;
  P(g,'cylinder','wall',[.85,ph,.72],[x*R,.35,z*R],undefined,6,1);P(g,'pyramid','trim',[.95,.55,.95],[x*R,.35+ph,z*R],[0,a,0],undefined,1);
  const b=a+Math.PI/n,len=2*R*Math.sin(Math.PI/n)*1.02;P(g,'box','wall2',[len,.35,.9],[Math.sin(b)*R,.35+3.2,Math.cos(b)*R],[0,b,0],undefined,1);if(i%2)P(g,'box','roof',[len*.9,.9,.12],[Math.sin(b)*R,.35+1.2,Math.cos(b)*R],[0,b,0],undefined,1);}
 P(g,'box','wall',[1.5,2.6,1.5],[0,.35,0]);P(g,'pyramid','wall2',[1.5,6.2,1.5],[0,2.95,0]);P(g,'pyramid','accent',[.7,.9,.7],[0,9.1,0],undefined,undefined,1);
 P(g,'box','cloth',[.05,3,2.4],[0,5.4,0],[0,.5,0],undefined,1);for(let i=0;i<4;i++)g.B('wall2',[1.8,.2,.8],[0,.35+i*.0,R*.55+i*.55-.1],1);
 g.banner(R*.9,R*1.0,4.6);return {entry:{x:0,z:R,width:1.8}};};
/** Hanrei: grounded lattice houses under three folded slate roofs; the civic hall is a peacock fan of radiating gabled wings behind a gate hall. */
HOUSE.hanrei=g=>{const {w,d,r}=g,W=w*.74*jit(r,.05),D=d*.7,h=range(r,2.3,2.7),y=.35+h;
 g.B('wall2',[W+.7,.35,D+.7],[0,0,0],2);g.B('wall',[W*.88,h,D*.8],[0,.35,0],2);
 for(let i=0;i<=5;i++){g.B('wall2',[.07,h*.88,.05],[-W*.4+i*W*.16,.4,D*.4+.03],0);g.B('wall2',[.05,h*.88,.07],[W*.44+.03,.4,-D*.35+i*D*.14],0);}
 for(const k of[.33,.66])g.B('wall2',[W*.82,.07,.05],[0,.35+h*k,D*.4+.03],0);
 P(g,'hip','roof',[W*1.4,.95,D*1.4],[0,y-.7,0],undefined,undefined,2);
 const ra=range(r,1.9,2.2),rb=range(r,1.4,1.7);
 P(g,'prism','roof',[W*1.22,ra,D*.8],[-W*.04,y,-D*.14]);P(g,'prism','roof',[D*.9,rb,W*.72],[W*.2,y-.05,D*.12],[0,Math.PI/2,0]);P(g,'prism','roof',[W*.8,ra*.55,D*.5],[-W*.26,y-.05,D*.22]);
 for(const [x,z,yy] of[[-W*.04,-D*.54,ra],[-W*.04,D*.4,ra],[W*.2+W*.36,D*.12,rb]] as [number,number,number][])P(g,'cone','accent',[.3,.7,.3],[x,y+yy-.1,z],undefined,6,1);
 g.B('accent',[1,1.7,.08],[g.off*.3,.35,D*.4+.05],0);g.B('wall2',[1.6,.18,.9],[g.off*.3,.35,D*.5+.5],1);g.B('wall2',[1.8,.18,.6],[g.off*.3,0,D*.5+.9],1);
 for(const s of[-1,1]){g.post('accent',s*W*.5,D*.5+.1,y-.3,.1,1);P(g,'sphere','accent',[.4,.5,.4],[s*W*.5,y-1.2,D*.5+.1],undefined,undefined,1);}
 return {entry:{x:g.off*.3,z:D*.5+1,width:1.2}};};
CIVIC.hanrei=g=>{const {w,d,r}=g,n=7,hz=d*.18,R=d*.62;
 g.B('accent',[w*.96,.4,d*.96],[0,0,0],2);
 for(let i=0;i<n;i++){const t=i/(n-1)*2-1,a=1-Math.abs(t),th=t*1.2,dx=Math.sin(th),dz=-Math.cos(th),L=R*(.85+.4*a),wh=1.3+a*1.3,rise=1.1+a*1.7,cx=dx*(L/2+1),cz=hz+dz*(L/2+1),yw=yawOf(dx,dz);
  P(g,'box','wall',[1.5,wh,L*.94],[cx,.4,cz],[0,yw,0]);P(g,'prism','roof',[2.0,rise,L*1.04],[cx,.4+wh,cz],[0,yw,0]);P(g,'cone','accent',[.3,.7,.3],[cx+dx*L*.5,.4+wh+rise*.9,cz+dz*L*.5],undefined,6,1);}
 P(g,'box','wall',[R*.8,4,R*.74],[0,.4,hz+.4]);P(g,'hip','roof',[R*1.05,2.2,R*.98],[0,4.4,hz+.4]);P(g,'sphere','accent',[.5,.7,.5],[0,6.5,hz+.4]);
 for(const s of[-1,1]){g.post('wall2',s*2,hz+R*.5,3.4,.18,2);P(g,'sphere','accent',[.6,.8,.6],[s*2,3.2,hz+R*.5],undefined,undefined,1);}
 g.door(0,hz+R*.35,1.3,2.2);g.banner(w*.4,d*.38,4.2);return {entry:{x:0,z:hz+R*.55,width:1.4}};};
/** Steppan: oval felt halls. A timber footing, low felt wall and a flattened felt dome with lashing bands, smoke cap and a cloth-awning porch; the civic hall pairs three domes under one timber porch. */
const feltHall=(g:G,W:number,D:number,h:number,dome:number)=>{
 g.B('wall2',[W+.3,.22,D+.3],[0,0,0],2);g.B('wall',[W,h,D],[0,.22,0],2);
 P(g,'sphere','roof',[W*1.2,dome,D*1.2],[0,.22+h-.3,0]);
 g.B('trim',[W+.06,.16,D+.06],[0,.22+h*.62,0],1);g.B('trim',[W+.06,.1,D+.06],[0,.22+h*.2,0],0);
 for(let i=-1;i<=1;i++)P(g,'box','wall2',[.1,dome*.5,.06],[i*W*.28,.22+h+.05,D*.5+.04],[0,0,i*.35],undefined,0);
 P(g,'box','wall2',[.7,.3,.7],[0,.22+h-.3+dome*.88,0],undefined,undefined,1);P(g,'cone','roof',[.9,.4,.9],[0,.22+h-.3+dome*.88+.3,0],undefined,8,1);};
HOUSE.steppan=g=>{const {w,d,r}=g,W=w*.8*jit(r,.05),D=d*.72,h=range(r,1.2,1.45),y=.22;
 feltHall(g,W,D,h,range(r,1.5,1.9));
 g.B('accent',[.9,1.15,.08],[g.off*.3,y,D*.5+.02],0);g.B('wall2',[1.15,.12,.1],[g.off*.3,y+1.15,D*.5+.04],0);
 for(const s of[-1,1])g.post('wall2',g.off*.3+s*.85,D*.5+1.1,1.9,.1,1);P(g,'wedge','cloth',[2.2,.55,1.3],[g.off*.3,1.9,D*.5+.5],undefined,undefined,1);
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.7;g.post('wall2',Math.sin(a)*W*.78,Math.cos(a)*D*.78,.9,.07,0);}
 return {entry:{x:g.off*.3,z:D*.5+1.1,width:1}};};
CIVIC.steppan=g=>{const {w,d,r}=g,W=w*.5,D=d*.6;
 g.B('wall2',[w*.95,.35,d*.92],[0,0,0],2);
 for(const s of[-1,1]){const k=.62;g.B('wall2',[W*k+.3,.2,D*k+.3],[s*W*.95,.35,-d*.02],1);g.B('wall',[W*k,1.0,D*k],[s*W*.95,.55,-d*.02],2);P(g,'sphere','roof',[W*k*1.2,1.5,D*k*1.2],[s*W*.95,.55+.75,-d*.02]);g.B('trim',[W*k+.05,.12,D*k+.05],[s*W*.95,.55+.6,-d*.02],1);}
 g.B('wall',[W,2.0,D],[0,.35,-d*.02],2);P(g,'sphere','roof',[W*1.2,3.0,D*1.2],[0,.35+1.7,-d*.02]);g.B('trim',[W+.06,.18,D+.06],[0,.35+1.3,-d*.02],1);g.B('trim',[W+.06,.12,D+.06],[0,.35+.4,-d*.02],0);
 P(g,'box','wall2',[.8,.4,.8],[0,.35+4.25,-d*.02],undefined,undefined,1);P(g,'cone','accent',[1,.5,1],[0,.35+4.6,-d*.02],undefined,8,1);
 for(let i=0;i<4;i++)g.post('wall2',-w*.32+i*w*.213,d*.36,3.2,.2,2);g.B('wall2',[w*.72,.25,.35],[0,3.2,d*.36],1);P(g,'wedge','cloth',[w*.72,.9,1.6],[0,3.15,d*.34],[0,0,0],undefined,1);
 g.B('accent',[1.3,1.9,.08],[0,.35,D*.5-d*.02+.02],0);for(let i=0;i<3;i++)g.B('wall2',[2.4,.18,.6],[0,.35+i*.0,d*.4+.3+i*.5-.5],1);
 for(const s of[-1,1]){g.post('trim',s*w*.42,d*.4,5,.1,1);P(g,'box','cloth',[.04,1.2,.7],[s*w*.42+.38,4.2,d*.4],undefined,undefined,1);}
 g.B('wall2',[w*.5,.5,.1],[0,0,d*.45],1);return {entry:{x:0,z:d*.42,width:1.6}};};
/** Sandrill: strata stacks. Offset sandstone slabs with deep overhangs and wind-fins; the civic hall is a split monolith with a sun-slot and cantilever fins. */
HOUSE.sandrill=g=>{const {w,d,r}=g;
 for(let i=0;i<3;i++){const s=1-.24*i,ox=(r()-.5)*.9,oz=(r()-.5)*.6,sw=w*.82*s,sd=d*.7*s;
  // wind-worn strata: a 10-sided drum (rounded corners) under each ledge, a talus skirt at the foot and a domed cap, so the stack reads as eroded stone not stacked crates
  P(g,'cylinder',i%2?'wall2':'wall',[sw*1.08,1.4,sd*1.08],[ox,i*1.5,oz],[0,(r()-.5)*.35,0],10);P(g,'cylinder','trim',[sw*1.08+.5,.16,sd*1.08+.5],[ox,i*1.5+1.4,oz],[0,(r()-.5)*.2,0],10,1);
  if(i===0)P(g,'hip','wall2',[sw*1.3,.55,sd*1.3],[ox,0,oz],undefined,undefined,1);
  if(i===2)P(g,'sphere','wall',[sw*.9,.7,sd*.9],[ox,i*1.5+1.5,oz],undefined,undefined,1);}
 P(g,'cylinder','wall2',[1.3,4.4,1.3],[-w*.28,0,-d*.2],[0,.3,0],10);P(g,'sphere','wall',[1.25,.6,1.25],[-w*.28,4.4,-d*.2],undefined,undefined,1); // wind-worn gnomon stack replaces the spike fins as the tall cliff mass
 g.B('accent',[.95,1.5,.12],[g.off*.4,0,d*.35+.04],0);P(g,'box','accent',[1.3,.2,.5],[g.off*.4,1.55,d*.35+.1],undefined,undefined,1);
 for(const s of[-1,1]){const fh=range(r,2.4,2.8);P(g,'wedge','roof',[1.1,fh,1.9],[s*w*.2,2.4,-d*.05],[0,Math.PI/2*s,0],undefined,1);P(g,'hip','wall2',[1.5,.5,1.5],[s*w*.2,2.1,-d*.05],undefined,undefined,1);}
 for(let i=0;i<4;i++)g.B('wall2',[1.1,.3,.6],[w*.36,i*.3,d*.1+i*.0-i*.55],1);return {entry:{x:g.off*.4,z:d*.35+.6,width:1}};};
CIVIC.sandrill=g=>{const {w,d,r}=g,gap=1.3;
 // split monolith as two wind-worn 10-sided drums (not crates) with a talus skirt each; the slot between them still catches the sun
 for(const s of[-1,1]){const mh=s<0?7:5.9,cx=s*(w*.17+gap/2);P(g,'cylinder','wall',[w*.34*1.12,mh,d*.7*1.12],[cx,0,-d*.05],[0,s*.18,0],10);
  P(g,'cylinder','trim',[w*.34*1.12+.5,.18,d*.7*1.12+.5],[cx,mh*.55,-d*.05],[0,s*.18,0],10,1);P(g,'hip','wall2',[w*.34*1.5,.7,d*.7*1.5],[cx,0,-d*.05],undefined,undefined,1);
  P(g,'sphere','wall2',[w*.34*1.0,.9,d*.7*1.0],[cx,mh,-d*.05],undefined,undefined,1);}
 // near-only carved window niches in two rows on each drum (dark slot, lintel slab above), original Sandrill cliff-dwelling grammar
 for(const s of[-1,1]){const mh=s<0?7:5.9,rx=w*.17*1.12,rz=d*.7*.56,cx=s*(w*.17+gap/2);
  for(const row of[.3,.62])for(let k=-1;k<=1;k++){const u=k*.5*rx*.9,zz=-d*.05+rz*Math.sqrt(1-(u/rx)**2)*.93,y=mh*row;
   g.B('wall2',[.62,.12,.3],[cx+u,y+.62,zz],0);g.B(darkSlot(g),[.4,.7,.34],[cx+u,y,zz],0);}}
 P(g,'box','wall2',[gap+.4,1.4,d*.7],[0,0,-d*.05]);P(g,'cylinder','accent',[1.5,.18,1.5],[0,4.2,-d*.05],[Math.PI/2,0,0],14);
 for(let i=0;i<5;i++)P(g,'cylinder',i%2?'wall2':'wall',[w*(.9-i*.1),.35,1.4+i*.1],[(i%2?1:-1)*i*.3,5.9+i*.4+(i<1?1.1:0),-d*.05+((i%3)-1)*.5],[0,(i-2)*.22,0],10,1);
 for(let i=0;i<9;i++)g.B('trim',[2.2,.3,.6],[-w*.36-.6,i*.65,d*.34-i*.0-i*.55*(d/9/.55)*.5],1);
 P(g,'box','trim',[w*.9,.4,.8],[0,0,d*.32],undefined,undefined,1);g.B('accent',[1,2,.1],[-gap/2-w*.17,0,d*.3+.03],0);g.banner(w*.4,d*.34,6.4);return {entry:{x:-w*.2,z:d*.34,width:1.3}};};
/** Kaaltun: plaster-platform houses under palm-thatch gables with carved lintels; the civic hall is a terraced plaster platform carrying a thatched hall, flanked by stelae. */
HOUSE.kaaltun=g=>{const {w,d,r}=g,W=w*.8*jit(r,.05),D=d*.72,ph=range(r,.8,1.1),h=range(r,1.9,2.3);
 g.B('wall',[W,ph,D],[0,0,0],2);g.B('wall2',[W+.2,.14,D+.2],[0,ph,0],1);g.B('wall2',[W+.2,.14,D+.2],[0,0,0],0);
 for(let i=0;i<3;i++)g.B('wall',[2.0-i*.0,.28,.5],[g.off*.3,i*.28*(ph/.85),D*.5+.25+(2-i)*.45],1);
 g.B('wall',[W*.86,h,D*.78],[0,ph,0],2);for(const s of[-1,1])g.post('wall2',s*W*.43,D*.39,h+ph,.2,1);
 g.B('wall2',[W*.88,.28,.2],[0,ph+h-.28,D*.39+.05],1);g.B('accent',[.9,1.55,.08],[g.off*.3,ph,D*.39+.03],0);
 const rh=range(r,1.7,2.1);P(g,'prism','roof',[W*1.2,rh,D*1.12],[0,ph+h,0]);P(g,'cone','accent',[.3,.6,.3],[0,ph+h+1.8,D*.56],undefined,6,1);P(g,'cone','accent',[.3,.6,.3],[0,ph+h+1.8,-D*.56],undefined,6,1);
 // carved lintel frieze, corner stelae, stepped roof-comb and a lit doorway, all original Kaaltun grammar
 g.B('accent',[W*.8,.22,.1],[0,ph+h*.78,D*.39+.07],0);for(let i=0;i<5;i++)g.B('trim',[.2,.14,.12],[-W*.32+i*W*.16,ph+h*.78+.04,D*.39+.1],0);
 for(const s of[-1,1]){g.B('wall2',[.3,h*.9,.3],[s*W*.47,ph,-D*.39],1);g.B('accent',[.4,.2,.4],[s*W*.47,ph+h*.9,-D*.39],0);g.B('accent',[.7,.5,.1],[s*W*.3,ph+h*.45,D*.39+.04],0);}
 for(let i=0;i<3;i++)g.B('wall2',[W*.3-i*.07,.2,.3],[0,ph+h+rh-.1+i*.2,0],0);
 // near-only flared palm-thatch eave: a wider, flatter second pitch under the main roof so the gable reads as layered fronds, not a hard pyramid
 P(g,'prism','roof',[W*1.42,rh*.4,D*1.34],[0,ph+h-.12,0],undefined,undefined,0);
 return {entry:{x:g.off*.3,z:D*.5+1,width:1.2}};};
CIVIC.kaaltun=g=>{const {w,d,r}=g;let y=0;
 for(let i=0;i<3;i++){const k=1-i*.2;g.B(i%2?'wall':'wall2',[w*.92*k,1.0,d*.88*k],[0,y,-d*.02*i],2);g.B('trim',[w*.92*k+.12,.12,d*.88*k+.12],[0,y+1.0,-d*.02*i],1);y+=1.12;}
 for(let i=0;i<8;i++)g.B('wall',[w*.26,.25,.5],[0,i*.4*(3.3/3.2),d*.44+.2+(8-i)*.35-.35],1);
 const W=w*.44,D=d*.4,h=2.2,zc=-d*.06;for(const sx of[-1,1])for(const sz of[-1,1])g.post('wall2',sx*W*.46,zc+sz*D*.46,y+h,.22,2);
 g.B('wall',[W*.9,h,D*.84],[0,y,zc],2);g.B('accent',[1.1,1.7,.08],[0,y,zc+D*.42+.02],0);g.B('wall2',[W,.3,D*.96],[0,y+h-.3,zc],1);
 P(g,'prism','roof',[W*1.3,2.5,D*1.3],[0,y+h,zc]);P(g,'prism','roof',[W*1.62,1.0,D*1.56],[0,y+h-.2,zc],undefined,undefined,0);P(g,'cone','accent',[.35,.8,.35],[0,y+h+2.4,zc+D*.65],undefined,6,1);P(g,'cone','accent',[.35,.8,.35],[0,y+h+2.4,zc-D*.65],undefined,6,1);
 for(const s of[-1,1]){g.B('wall2',[.5,4.2,.45],[s*w*.43,0,d*.3],2);g.B('accent',[.7,.5,.5],[s*w*.43,4.2,d*.3],1);g.B('cloth',[.04,1.4,.7],[s*w*.43+.4*s,3.1,d*.3],1);}
 // carved lintel frieze with notched teeth above the hall door and a stepped roof-comb, original Kaaltun grammar (near-only teeth)
 g.B('accent',[W*.8,.2,.1],[0,y+h*.72,zc+D*.42+.07],0);for(let i=0;i<7;i++)g.B('trim',[.18,.13,.12],[-W*.34+i*W*.113,y+h*.72+.03,zc+D*.42+.1],0);
 for(let i=0;i<3;i++)g.B('wall2',[W*.5-i*.12,.2,.3],[0,y+h+2.5-.1+i*.2,zc],0);
 g.banner(w*.1,d*.42,2.4);return {entry:{x:0,z:d*.47,width:2}};};
/** Mekhari: stilt-house river folk. Woven houses on posts with a plank deck, ladder and upturned saddle roofs; the civic hall is a long stilt longhouse with tall upswept gable ends and a gangway. */
const saddle=(g:G,W:number,D:number,y:number,rise:number,up:number)=>{
 // rounded thatch hull (a flattened dome under the ridge) so the roof sags like a woven saddle, then the upswept horns and a bound ridge pole
 P(g,'sphere','roof',[W*1.1,rise*1.15,D*1.06],[0,y-rise*.12,0],undefined,8);g.B('trim',[W*.98,.1,.12],[0,y+rise*.86,0],1);
 for(const s of[-1,1]){P(g,'cone','accent',[.22,.8+up*.6,.22],[0,y+rise*.42,s*(D*.5+.12)],[s*.55,0,0],6,1);}};
/** woven round-pole stilt: tapered 8-sided pile with a lashed collar */
const pile=(g:G,x:number,z:number,h:number,t:number)=>{P(g,'cylinder','trim',[t*2.2,h,t*2.2],[x,0,z],undefined,6);};
HOUSE.mekhari=g=>{const {w,d,r}=g,W=w*.76*jit(r,.05),D=d*.68,st=range(r,1.5,1.9),y=st+.2,h=range(r,1.9,2.2);
 for(let i=0;i<3;i++)for(const sz of[-1,1])pile(g,-W*.46+i*W*.46,sz*D*.46,st,.09);
 g.B('wall2',[W+.4,.2,D+.8],[0,st,.1],2);
 // woven drum wall (12-sided, belly-bulged by a trim band) instead of a crate
 P(g,'cylinder','wall',[W*.9,h,D*.78],[0,y,-D*.04],undefined,10);P(g,'cylinder','trim',[W*.93,.1,D*.81],[0,y+h*.5,-D*.04],undefined,10,1);
 for(let i=1;i<5;i++)g.B('wall2',[.05,h*.9,.05],[-W*.38+i*W*.152,y+.05,D*.34+.02],0);
 g.B('accent',[.85,1.5,.08],[g.off*.3,y,D*.36+.03],0);for(const s of[-1,1])g.B('accent',[.55,.6,.06],[s*W*.3,y+1.0,D*.35+.03],0);
 const srise=range(r,1.4,1.7),sup=range(r,.5,.8);saddle(g,W,D,y+h,srise,sup);
 // near-only stilt-house structure (original grammar): lashed diagonal bracing between piles, a deck rail, a reed-bundle ridge crest and a fish-drying rack on the ground beside the piles
 for(const sz of[-1,1])for(let i=0;i<2;i++){const x0=-W*.46+i*W*.46,x1=x0+W*.46;g.parts.push(beam(matId(g.civ,'wall2') as Part['mat'],[x0,.15,sz*D*.46],[x1,st-.1,sz*D*.46],.05,1));g.parts.push(beam(matId(g.civ,'wall2') as Part['mat'],[x1,.15,sz*D*.46],[x0,st-.1,sz*D*.46],.05,1));}
 for(const s of[-1,1])for(let i=0;i<4;i++)P(g,'cylinder','trim',[.1,.8,.1],[s*(W*.5+.18),st+.2,-D*.34+i*D*.3],undefined,5,0);
 for(const s of[-1,1])g.B('trim',[.07,.07,D*.9],[s*(W*.5+.18),st+.95,.0],0);
 for(let k=-3;k<=3;k++){const rx=k*W*.15,e=Math.max(0,1-(rx/(W*.55))**2),ry=y+h-srise*.12+srise*.575*Math.sqrt(e)-.08;P(g,'cone','roof',[.34,.55,.34],[rx,ry,0],undefined,6,0);}
 {const rx=-(W*.5+1.5);for(const s of[-1,1])P(g,'cylinder','trim',[.12,1.7,.12],[rx,0,s*.85],undefined,5,0);g.B('trim',[.08,.08,1.9],[rx,1.6,0],0);for(let f=0;f<5;f++)g.B('accent',[.07,.5+(f%2)*.12,.2],[rx+.04,1.55-.5-(f%2)*.12,-.72+f*.36],0);}
 // near-only thatch fringe: a shaggy eave skirt hanging below the roof hull so the saddle reads as bundled reed, not a lid
 P(g,'cylinder','roof',[W*1.02,.3,D*.99],[0,y+h-.22,0],undefined,10,1);
 g.B('wall2',[W+.4,.7,.07],[0,y,D*.5+.5],1);for(const s of[-1,1])pile(g,s*(W*.5+.1),D*.5+.5,y+.9,.05);
 P(g,'box','trim',[.5,st+.7,.08],[g.off*.3+W*.28,.03,D*.5+.9],[-.5,0,0],undefined,1);P(g,'sphere','wall2',[2.6,.5,.85],[-W*.8,0,D*.5+1.3],[0,.3,0],undefined,0);
 return {entry:{x:g.off*.3,z:D*.5+1,width:1}};};
CIVIC.mekhari=g=>{const {w,d,r}=g,W=w*.86,D=d*.44,st=2.1,y=st+.25,h=2.5;
 for(let i=0;i<5;i++)for(const sz of[-1,1])pile(g,-W*.46+i*W*.23,sz*D*.46,st,.12);
 g.B('wall2',[W+.6,.25,D+1.2],[0,st,.2],2);
 // long woven drum hall with a bound waist and sill band
 P(g,'cylinder','wall',[W*.94,h,D*.88],[0,y,-D*.04],undefined,12);P(g,'cylinder','trim',[W*.97,.12,D*.91],[0,y+h*.3,-D*.04],undefined,12,1);P(g,'cylinder','roof',[W*1.0,.5,D*.98],[0,y+h-.4,-D*.04],undefined,12,1);
 for(let i=1;i<9;i++)g.B('wall2',[.06,h*.88,.06],[-W*.4+i*W*.1,y+.05,D*.4+.03],0);
 g.B('accent',[1.3,1.9,.1],[0,y,D*.4+.04],0);saddle(g,W,D*1.15,y+h,1.75,1.3);
 g.B('wall2',[W+.6,.8,.08],[0,y,D*.5+.8],1);for(let i=0;i<=4;i++)pile(g,-W*.5+i*W*.25,D*.5+.8,y+.9,.06);
 for(let i=0;i<9;i++)g.B('wall2',[1.6,.14,.6],[W*.16,i*.0+i*st/9*.9,D*.5+1.1+(9-i)*.58],1);
 g.banner(-W*.42,D*.5+.8,y+3.6);return {entry:{x:0,z:D*.5+2,width:1.6}};};
/** Skoldar: turf longhouses. A fieldstone footing, timber stud wall and a low, thick turf-sod hip roof with a ridge beam, smoke vent and lean-to porch; the civic hall adds a gabled porch, carved posts and a shield-hung wall. */
const sod=(g:G,W:number,D:number,y:number,rise:number)=>{const q=g.r(),rs:'roof'|'trim'|'wall'=q<.5?'roof':q<.8?'trim':'wall';P(g,'hip',rs,[W*1.14,rise,D*1.22],[0,y-.12,0]);const i=g.parts.length-1;g.parts[i]={...g.parts[i],inset:D*.3};g.B(rs,[W*1.16,.2,D*1.24],[0,y-.18,0],1);
 g.B('wall2',[.16,.16,D*.62],[0,y+rise-.04,0],1);for(const s of[-1,1])P(g,'cone','accent',[.2,.5,.2],[0,y+rise,s*D*.34],[s*.9,0,0],6,1);return rs;};
HOUSE.skoldar=g=>{const {w,d,r}=g,W=w*.84*jit(r,.05),D=d*.7,fh=.5,h=range(r,1.0,1.3),rise=range(r,1.1,1.4),y=fh+h;
 g.B('wall',[W+.4,fh,D+.4],[0,0,0],2);g.B('wall2',[W*.96,h,D*.94],[0,fh,0],2);
 for(let i=0;i<9;i++)g.B('wall',[.09,h*.96,.06],[-W*.42+i*W*.105,fh,D*.47+.04],0);
 const rs=sod(g,W,D,y,rise);g.B('wall2',[.5,.55,.5],[W*.18,y+rise*.7,-D*.05],1);P(g,'cone',rs,[.7,.35,.7],[W*.18,y+rise*.7+.55,-D*.05],undefined,6,1);
 g.B('accent',[.85,1.25,.1],[g.off*.3,fh,D*.47+.05],0);for(const s of[-1,1])g.post('wall2',g.off*.3+s*.6,D*.5+.6,fh+1.45,.1,1);P(g,'wedge',rs,[1.6,.45,.8],[g.off*.3,fh+1.45,D*.5+.25],undefined,undefined,1);
 for(let i=0;i<3;i++)g.B('wall2',[.9,.14,.14],[-W*.5-.2,fh+i*.15,D*.2],0,[0,0,0]);return {entry:{x:g.off*.3,z:D*.5+.6,width:1}};};
CIVIC.skoldar=g=>{const {w,d,r}=g,W=w*.88,D=d*.6,fh=.7,h=1.6,rise=2.1,y=fh+h;
 g.B('wall',[W+.5,fh,D+.5],[0,0,0],2);g.B('wall2',[W,h,D],[0,fh,0],2);
 for(let i=0;i<14;i++)g.B('wall',[.1,h*.96,.07],[-W*.46+i*W*.07,fh,D*.5+.04],0);
 const rs=sod(g,W,D,y,rise);
 g.B('wall2',[3.2,h+.5,1.7],[0,fh,D*.5+.7],2);P(g,'prism',rs,[3.7,1.3,2.1],[0,y+.45,D*.5+.7]);g.B('accent',[1.25,1.8,.1],[0,fh,D*.5+1.56],0);
 for(const s of[-1,1]){g.B('wall2',[.28,2.9,.28],[s*2.2,fh,D*.5+1.5],1);P(g,'sphere','accent',[.5,.55,.5],[s*2.2,fh+2.9,D*.5+1.5],undefined,undefined,1);}
 for(let i=0;i<7;i++)P(g,'cylinder',i%2?'accent':'cloth',[.6,.08,.6],[-W*.44+i*W*.14,fh+h*.5,-D*.5-.05],[Math.PI/2,0,0],10,0);
 g.B('wall2',[.6,.7,.6],[W*.22,y+rise*.7,0],1);g.banner(W*.42,D*.62,5);return {entry:{x:0,z:D*.5+1.9,width:1.5}};};
/** Quillan (original grammar): fitted-stone terraces. Walls are battered courses (each course steps in) over a terrace plinth, the doorway and niches are trapezoids, the roof is a steep hip of bundled thatch with a ridge cap; the civic hall climbs three terrace tiers to a long thatched hall. Legacy wedge-and-slab set stays archived. */
const stoneCourses=(g:G,W:number,D:number,y0:number,n:number,ch:number,z0:number,inset=.14)=>{let w=W,d=D,y=y0;for(let i=0;i<n;i++){g.B(i%2?'wall2':'wall',[w,ch,d],[0,y,z0],2);y+=ch;w-=inset;d-=inset;}return {y,w,d};};
const trapezoidDoor=(g:G,x:number,z:number,y:number,h:number,wd:number)=>{g.B('accent',[wd,h,.1],[x,y,z],0);for(const s of[-1,1])P(g,'wedge','wall2',[.14,h,.16],[x+s*(wd*.5+.04),y,z],[0,s>0?0:Math.PI,0],undefined,1);g.B('trim',[wd+.5,.16,.2],[x,y+h,z],1);};
HOUSE.quillan=g=>{const {w,d,r}=g,W=w*.74*jit(r,.05),D=d*.66,z0=-d*.04,ph=range(r,.5,.7),ch=range(r,.5,.62),rise=range(r,2.0,2.5);
 g.B('wall2',[W+.9,ph,D+.9],[0,0,z0],2);g.B('wall',[W+.6,.14,D+.6],[0,ph,z0],1);
 const top=stoneCourses(g,W,D,ph+.14,4,ch,z0,.16);
 for(let i=0;i<4;i++)for(let j=-1;j<=1;j+=2)g.B('trim',[.05,ch*.9,.05],[j*(W*.5-i*.08)*.98,ph+.14+i*ch,D*.5-i*.08+z0],0);
 for(let i=0;i<3;i++)g.B('accent',[.34,.5,.06],[-W*.32+i*W*.3,ph+.14+ch*1.4,z0+D*.5-.3],0);
 trapezoidDoor(g,g.off*.25,z0+D*.5-.2,ph+.14,1.5,.78);
 g.Pr('hip','roof',[W*1.32,rise,D*1.28],[0,top.y,z0],2);
 P(g,'cylinder','roof',[W*1.1,.32,D*1.08],[0,top.y-.2,z0],undefined,10,1);g.B('trim',[.22,.3,D*.5],[0,top.y+rise-.1,z0],1);
 for(let i=0;i<4;i++)g.B('wall2',[W*.4,.2+i*.2,.5],[g.off*.25,0,z0+D*.5+.6+(3-i)*.32],1);
 return {entry:{x:g.off*.25,z:z0+D*.5+1.7,width:.9}};};
CIVIC.quillan=g=>{const {w,d,r}=g,W=w*.84,D=d*.56,z0=-d*.14;let y=0;
 for(let i=0;i<3;i++){const k=1-i*.1;g.B(i%2?'wall':'wall2',[w*.94*k,.7,d*.9*k],[0,y,-d*.02*i],2);g.B('trim',[w*.94*k+.1,.1,d*.9*k+.1],[0,y+.7,-d*.02*i],1);y+=.8;}
 const top=stoneCourses(g,W*.9,D,y,5,.62,z0,.18),h=top.y-y,hall=top.y;
 for(let i=0;i<6;i++)trapezoidDoor(g,-W*.34+i*W*.136,z0+D*.5-.1,y,i===2||i===3?1.4:.9,i===2||i===3?.64:.4);
 for(let i=0;i<8;i++)g.B('wall',[W*.3,.25,.5],[0,i*(y/8),d*.42+.2+(8-i)*.28-.25],1);
 g.Pr('hip','roof',[W*1.18,range(r,2.8,3.2),D*1.3],[0,hall,z0],2);P(g,'cylinder','roof',[W*.98,.36,D*1.14],[0,hall-.22,z0],undefined,10,1);
 g.B('trim',[W*.7,.28,.3],[0,hall+2.7,z0],1);for(const s of[-1,1]){g.B('wall2',[.4,3.6,.4],[s*w*.43,0,d*.3],2);P(g,'wedge','accent',[.5,.5,.5],[s*w*.43,3.6,d*.3],undefined,undefined,1);}
 // near-only carved gnomon stone (stepped, notched) on the front terrace and rope-bound twin ridge finials, original Quillan grammar
 for(let i=0;i<3;i++)g.B(i%2?'wall':'wall2',[1.5-i*.35,.34,1.5-i*.35],[-w*.3,y*.55+i*.34,d*.36],0);g.B('trim',[.3,.9,.3],[-w*.3,y*.55+1.02,d*.36],0);g.Pr('wedge','accent',[.34,.5,.34],[-w*.3,y*.55+1.92,d*.36],0);
 for(const s of[-1,1]){g.B('trim',[.3,.26,.3],[s*W*.56,hall+2.62,z0],0);g.B('accent',[.2,.34,.2],[s*W*.56,hall+2.88,z0],0);}
 g.banner(w*.4,d*.3,6.2);return {entry:{x:0,z:d*.42+.6,width:W*.3}};};
/** Nilemark: whitewashed mudbrick blocks with parapets, roof stairs and palm pergolas; the civic hall is a gate of two battered towers before a columned court. */
HOUSE.nilemark=g=>{const {w,d,r}=g,W=w*.8*jit(r,.05),D=d*.72,h=range(r,2.5,3);
 g.B('wall2',[W+.2,.3,D+.2],[0,0,0],2);g.B('wall',[W,h,D],[0,.3,0],2);
 for(const [x,z,sx,sz] of[[0,D/2-.12,W+.1,.25],[0,-D/2+.12,W+.1,.25],[W/2-.12,0,.25,D],[-W/2+.12,0,.25,D]] as number[][])g.B('wall',[sx,.4,sz],[x,.3+h,z],1);
 P(g,'wedge','wall',[1.0,h*.95,2.4],[W*.5+.55,.3,-D*.1],[0,Math.PI/2,0],undefined,1);
 // near-only mud-brick detail: vertical corner torus rolls, a flared cavetto cornice and palm-log ends poking through the front parapet
 for(const sx of[-1,1])for(const sz of[-1,1])P(g,'cylinder','wall2',[.3,h+.35,.3],[sx*(W/2+.02),.3,sz*(D/2+.02)],undefined,8,0);
 g.B('wall2',[W+.5,.12,D+.5],[0,.3+h+.4,0],0);g.B('trim',[W+.3,.1,D+.3],[0,.3+h+.34,0],0);
 for(let i=0;i<7;i++)g.B('trim',[.17,.17,.55],[-W*.42+i*W*.14,.3+h-.28,D*.5+.02],0);
 for(const sx of[-1,1])for(const sz of[-1,1])g.post('wall2',sx*W*.28,sz*D*.25,h+1.9,.12,1);g.B('roof',[W*.7,.12,D*.62],[0,.3+h+1.85,0],1);
 g.B('trim',[1.15,.14,.14],[g.off*.3,.3+1.75,D*.5+.04],0);for(const s of[-1,1])g.B('trim',[.14,1.8,.14],[g.off*.3+s*.53,.3,D*.5+.04],0);g.B('accent',[.92,1.65,.08],[g.off*.3,.3,D*.5+.03],0);
 for(let i=0;i<3;i++)g.B('accent',[.3,.34,.06],[-W*.3+i*W*.3,.3+h*.72,D*.5+.03],0);for(const s of[-1,1])g.Cy('wall2',.5,.7,[g.off*.3+s*1.2,.3,D*.5+.4],0,8,.35);
 return {entry:{x:g.off*.3,z:D*.5+.5,width:1}};};
CIVIC.nilemark=g=>{const {w,d,r}=g,tw=w*.26,td=d*.34,zf=d*.28;
 g.B('wall2',[w*.96,.35,d*.96],[0,0,0],2);
 for(const s of[-1,1]){const x=s*w*.3;g.B('wall',[tw,3.8,td],[x,.35,zf],2);g.B('wall',[tw*.9,2.4,td*.9],[x,4.15,zf],2);g.B('trim',[tw*.95,.25,td*.95],[x,6.55,zf],1);g.B('wall2',[tw*.7,.5,.2],[x,6.8,zf+td*.45],0);g.post('trim',x,zf+td*.5,9.2,.1,1);P(g,'box','cloth',[.04,1.2,.8],[x+.42,8.1,zf+td*.5],undefined,undefined,1);}
 g.B('wall',[w*.34,2.9,td*.8],[0,.35,zf],2);g.B('trim',[w*.34,.22,td*.8],[0,3.25,zf],1);g.B('accent',[1.5,2.3,.1],[0,.35,zf+td*.4+.03],0);g.B('trim',[2,.2,.14],[0,2.7,zf+td*.4+.05],0);
 for(let i=0;i<6;i++)for(const s of[-1,1]){const x=s*(w*.12+(i%3)*w*.14),z=-d*.1-Math.floor(i/3)*d*.18;if(i<3||true){g.Cy('wall2',.62,2.8,[x,.35,z],1,8,.52);g.Cy('trim',.82,.22,[x,3.15,z],0,8);}}
 g.B('wall',[w*.78,.3,d*.4],[0,3.37,-d*.14],1);g.B('wall',[w*.7,2.9,.3],[0,.35,-d*.34],2);for(let i=0;i<3;i++)g.B('wall2',[1.6,.2,.6],[0,i*.0,zf+td*.5+.3+(2-i)*.4],1);
 return {entry:{x:0,z:zf+td*.5+1,width:1.6}};};
/** Tigrane: baked-brick courtyard houses with vaulted rooms and pilasters; the civic hall is a three-tier brick terrace with a pilastered face, grand ramp and a vaulted shrine under a glazed band. */
HOUSE.tigrane=g=>{const {w,d,r}=g,W=w*.88,D=d*.86,h=range(r,2.7,3.2),t=.42,rd=D*.46;
 g.B('wall',[W,h,rd],[0,0,-D/2+rd/2],2);{const zc=-D/2+rd/2,vh=range(r,.8,1.0),cy=Math.max(h,W*.5+.02);P(g,'cylinder','wall',[W*.98,rd*1.02,vh*2],[0,cy,zc],[Math.PI/2,0,0],14);for(let i=0;i<4;i++)P(g,'cylinder','trim',[W*1.0,.12,vh*2.05],[0,cy,zc-rd*.36+i*rd*.24],[Math.PI/2,0,0],14,0);}g.B('trim',[W*.98,.1,rd*.2],[0,h+.1,-D/2+rd*.5],0);
 for(const s of[-1,1])g.B('wall',[t,h*.62,D-rd],[s*(W/2-t/2),0,D/2-(D-rd)/2],2);g.B('wall',[W*.34,h*.62,t],[-W*.33,0,D/2-t/2],2);g.B('wall',[W*.34,h*.62,t],[W*.33,0,D/2-t/2],2);
 for(let i=0;i<5;i++)g.B('wall2',[.26,h,.22],[-W*.4+i*W*.2,0,-D/2+rd+.1],1);
 g.B('trim',[W,.18,rd+.1],[0,h*.55,-D/2+rd/2],1);g.B('accent',[1.0,1.7,.1],[0,0,-D/2+rd+.04],0);g.B('wall2',[1.6,.3,.9],[0,0,0],0);
 g.B('wall2',[W*.5,.14,.14],[0,h*.62,D/2-t/2],1);return {entry:{x:0,z:D/2,width:W*.3}};};
CIVIC.tigrane=g=>{const {w,d,r}=g;let y=0;
 // stacked discs: three round baked-brick terraces (elliptical drums, each smaller than the last) with a trim ring and a ring of pilasters on the lower two
 for(let i=0;i<3;i++){const k=1-i*.22,tw=w*.94*k,td=d*.9*k,zo=-d*.04*i;P(g,'cylinder',i%2?'wall2':'wall',[tw,1.5,td],[0,y,zo],undefined,14,2);P(g,'cylinder','trim',[tw+.2,.16,td+.2],[0,y+1.5,zo],undefined,14,1);
  if(i<2)for(let j=0;j<6;j++){const a=Math.PI*(.14+j*.145);g.B('wall2',[.34,1.5,.3],[Math.cos(a)*tw*.5*1.0,y,zo+Math.sin(a)*td*.5],1,[0,-a,0]);}y+=1.66;}
 for(let i=0;i<10;i++)g.B('wall',[w*.22,.3,.55],[0,i*.5*(3.1/4.9)*1.0,d*.44+.1+(10-i)*.34],1);
 const W=w*.4,D=d*.4,h=1.7,vh=1.6,zc=-d*.1;g.B('wall',[W,h,D],[0,y,zc],2);
 // true barrel vault: an elliptical drum on its side (axis along the hall), springing from the walls, with glazed-band rib hoops and a lit arched mouth
 P(g,'cylinder','wall',[W*1.02,D*1.04,vh*2],[0,y+h,zc-D*.52],[Math.PI/2,0,0],14);for(let i=0;i<5;i++)P(g,'cylinder','trim',[W*1.05,.14,vh*2.06],[0,y+h,zc-D*.42+i*D*.21],[Math.PI/2,0,0],14,0);
 g.B('trim',[W+.06,.28,D+.06],[0,y+h*.5,zc],1);g.B('accent',[1.3,1.9,.1],[0,y,zc+D*.5+.03],0);P(g,'cylinder','accent',[1.3,.12,1.7],[0,y+1.5,zc+D*.52+.02],[Math.PI/2,0,0],10,0);
 for(const s of[-1,1]){g.B('wall',[1.1,4,1.1],[s*w*.44,0,d*.36],2);g.B('trim',[1.3,.25,1.3],[s*w*.44,4,d*.36],1);g.banner(s*w*.44,d*.36,6);}
 // near-only glazed tile band (three tiles) on the front of the top drum, original Tigrane grammar; budget-tight so only three boxes
 for(let j=0;j<3;j++){const a=Math.PI*(.32+j*.18),tw=w*.94*.56,td=d*.9*.56;g.B(j%2?'accent':'trim',[.4,.34,.2],[Math.cos(a)*tw*.5,y-1.1,-d*.08+Math.sin(a)*td*.5],0,[0,-a,0]);}
 return {entry:{x:0,z:d*.46,width:1.8}};};
/** Rusvolt: crossed-gable log halls with carved vermilion ridge-tips; the civic hall is a spruce-tier tent: stacked log tiers, each turned 45 degrees under a steep pyramid cap, ringed by horn spikes. */
HOUSE.rusvolt=g=>{const {w,d,r}=g,W=w*.74*jit(r,.05),D=d*.7,h=range(r,2.1,2.6),rise=range(r,1.9,2.4);
 g.B('wall',[W,h,D],[0,0,0],2);for(const x of[-1,1])for(const z of[-1,1])g.B('wall2',[.34,h+.15,.34],[x*W*.5,0,z*D*.5],1);
 for(let i=1;i<4;i++)g.B('wall2',[W+.1,.07,D+.1],[0,i*h/4,0],0);
 P(g,'prism','roof',[W*1.12,rise,D*1.1],[0,h,0]);P(g,'prism','roof',[D*1.12,rise*.88,W*1.1],[0,h,0],[0,Math.PI/2,0]);
 for(const s of[-1,1]){P(g,'cone','accent',[.34,.8,.34],[0,h+rise-.1,s*D*.56],undefined,6,1);P(g,'cone','accent',[.34,.8,.34],[s*W*.56,h+rise*.88-.1,0],undefined,6,1);}
 g.B('accent',[.9,1.7,.08],[g.off*.3,0,D*.5+.02],0);g.post('wall2',-.9,D*.5+.7,h,.16,1);g.post('wall2',.9,D*.5+.7,h,.16,1);P(g,'wedge','roof',[2.2,.7,1.4],[0,h,D*.5+.4],undefined,undefined,1);
 for(const x of[-1,1])for(const z of[-1,1])for(let j=0;j<3;j++)P(g,'cylinder','wall2',[.3,.5,.3],[x*W*.5,.3+j*(h-.5)/2.4,z*D*.5+(z>0?-.02:.02)],[z>0?Math.PI/2:-Math.PI/2,0,0],6,0);
 return {entry:{x:g.off*.3,z:D*.5+.8,width:1}};};
CIVIC.rusvolt=g=>{const {w,d,r}=g,b=Math.min(w,d)*.82;
 g.B('wall',[b,2.3,b],[0,0,0],2);for(const x of[-1,1])for(const z of[-1,1])P(g,'cone','accent',[.5,2.2,.5],[x*b*.52,.2,z*b*.52],[x*.35,0,-z*.35],6,1);
 let y=2.3;for(let i=0;i<4;i++){const s=b*.8*(.8**i),rot:V=[0,i%2?Math.PI/4:0,0];g.parts.push(part('box',matId(g.civ,'wall2') as Part['mat'],[s,1.3,s],[0,y,0],2,rot));g.B('wall',[s*1.04,.1,s*1.04],[0,y+.5,0],0,rot);
  P(g,'pyramid','roof',[s*1.38,1.9,s*1.38],[0,y+1.3,0],rot);y+=1.3+.95;}
 P(g,'cone','accent',[.5,2.2,.5],[0,y,0],undefined,6);P(g,'sphere','trim',[.5,.5,.5],[0,y+2.1,0],undefined,undefined,1);
 g.door(0,b*.5+.02,1.3,2);g.banner(b*.55,b*.55,4.2);return {entry:{x:0,z:b*.5,width:1.4}};};
const ORIGINAL_HOUSE:Record<CivId,(g:G)=>Out>={...HOUSE},ORIGINAL_CIVIC:Record<CivId,(g:G)=>Out>={...CIVIC};
export type GrammarSet='original'|'legacy';export const GRAMMAR_SETS:GrammarSet[]=['original','legacy'];let grammarSet:GrammarSet='original';
export const setGrammarSet=(g:GrammarSet)=>{grammarSet=g;};export const getGrammarSet=()=>grammarSet;
export const ROLE_LIST:CivRole[]=['house','civic','granary','market'];
/** Seeded individual imperfection: wall lean, uneven heights, size jitter, rubble and patches by wear. */
function imperfect(g:G,parts:Part[],wear:number,r:Rng){
 const lean=Math.min(.026,.004+wear*.02),leanDeg=lean*180/Math.PI;let patches=0;
 const out=parts.map(p=>{const tall=p.shape==='box'&&p.size[1]>1.2&&p.lod>=1&&!p.rot;if(!tall)return p;const rx=(r()-.5)*2*lean,rz=(r()-.5)*2*lean,hs=jit(r,.03);const q={...p,size:[p.size[0],p.size[1]*hs,p.size[2]] as V,rot:[rx,0,rz] as V},dip=partBounds(q).minY;return dip<0?{...q,pos:[p.pos[0],p.pos[1]-dip,p.pos[2]] as V}:q;});
 for(let i=0;i<Math.round(wear*6);i++){const a=r()*Math.PI*2,rr=Math.min(g.w,g.d)*.32+r()*.5;out.push(part('box',matId(g.civ,'wall2') as Part['mat'],[.3+r()*.3,.2+r()*.2,.3+r()*.3],[Math.cos(a)*rr*.9,0,Math.sin(a)*rr*.9],0,[0,r()*3,0]));patches++;}
 return {parts:out,lean:leanDeg,patches};
}
/** Era marks for the original grammars: the same hall reads older or richer by what its builders could afford, never by a global era swap.
 * era>=3 a proud plinth course; era>=4 gate posts at the front corners; era>=5 pennants on them. Sized from the parts already built. */
function eraMarks(g:G,era:number,wealth:number){
 let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of g.parts){if(p.lod<1)continue;const q=partBounds(p);a=Math.min(a,q.minX);b=Math.max(b,q.maxX);c=Math.min(c,q.minZ);d=Math.max(d,q.maxZ);}
 if(!(b>a&&d>c))return;const cx=(a+b)/2,cz=(c+d)/2;
 g.B('wall2',[b-a+.16,.14,d-c+.16],[cx,0,cz],1);
 if(era>=4)for(const sx of[a-.05,b+.05]){g.post('trim',sx,d+.35,1.5+wealth*.5,.09,1);if(era>=5)g.banner(sx,d+.35,1.5+wealth*.5);}
}
/** Village heraldry marks on a dwelling: a finial on the highest mass and a trim pattern along the roof rim. Adds a few near/mid parts, never changes the footprint. */
function villageMarks(g:G,h:Heraldry){
 const roofId=matId(g.civ,'roof'),cloth=matId(g.civ,'cloth');
 const solid=g.parts.filter(p=>!p.ends&&p.mat!==cloth&&Math.max(p.size[0],p.size[2])>=1&&p.lod>=1);if(!solid.length)return;
 let top=solid[0],ty=-1e9;for(const p of solid){const y=partBounds(p).maxY;if(y>ty){ty=y;top=p;}}
 const tb=partBounds(top),cx=(tb.minX+tb.maxX)/2,cz=(tb.minZ+tb.maxZ)/2,A=matId(g.civ,'accent') as Part['mat'],T=matId(g.civ,'trim') as Part['mat'];
 switch(h.shape){
  case 0:g.parts.push(part('cone',A,[.34,.9,.34],[cx,ty,cz],1,undefined,6));break;
  case 1:g.parts.push(part('sphere',A,[.46,.46,.46],[cx,ty,cz],1,undefined,8));break;
  case 2:g.parts.push(part('box',A,[.38,.38,.38],[cx,ty,cz],1,[0,.5,0]));break;
  case 3:g.parts.push(part('cylinder',A,[.46,.32,.46],[cx,ty,cz],1,undefined,8),part('cone',A,[.3,.4,.3],[cx,ty+.32,cz],1,undefined,6));break;
  default:g.parts.push(part('box',A,[.09,.95,.09],[cx,ty,cz],1,[0,0,.55]),part('box',A,[.09,.95,.09],[cx,ty,cz],1,[0,0,-.55]));}
 const roofs=g.parts.filter(p=>p.mat===roofId&&p.lod>=1&&['cone','prism','wedge','hip','pyramid'].includes(p.shape));if(!roofs.length)return;
 let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,y0=1e9,round=false;for(const p of roofs){const b=partBounds(p);x0=Math.min(x0,b.minX);x1=Math.max(x1,b.maxX);z0=Math.min(z0,b.minZ);z1=Math.max(z1,b.maxZ);y0=Math.min(y0,b.minY);if(p.shape==='cone')round=true;}
 const y=y0+.03,L=(x1-x0)*.9,R=Math.min(x1-x0,z1-z0)/2*.94,ccx=(x0+x1)/2,ccz=(z0+z1)/2;
 const piece=(px:number,pz:number,yaw:number,len:number,hh:number,py=y)=>g.parts.push(part('box',T,[len,hh,.1],[px,py,pz],1,[0,yaw,0]));
 if(round){const n=h.trim===1||h.trim===3?12:20;for(let i=0;i<n;i++){if(h.trim===3&&i%2)continue;const a=i/n*Math.PI*2,chord=2*R*Math.sin(Math.PI/n)*(h.trim===1?.45:1.05);
   piece(ccx+Math.sin(a)*R,ccz+Math.cos(a)*R,a,chord,h.trim===3?.26:.1);if(h.trim===2)piece(ccx+Math.sin(a)*R,ccz+Math.cos(a)*R,a,chord,.07,y+.16);}}
 else{const zf=z1-.12;if(h.trim===0)piece(ccx,zf,0,L,.1);
  if(h.trim===1)for(let i=0;i<Math.floor(L/.5);i++)piece(x0+(x1-x0)*.05+.25+i*.5,zf,0,.16,.14);
  if(h.trim===2){piece(ccx,zf,0,L,.06);piece(ccx,zf,0,L,.06,y+.17);}
  if(h.trim===3)for(let i=0;i<Math.floor(L/.4);i+=2)piece(x0+(x1-x0)*.05+.2+i*.4,zf,0,.24,.26);}
}
export function generateCivBuilding(civ:CivId,role:CivRole,ctx:CivContext,variantKey=''):CivSpec{
 const look=ctx.eraMode==='fixed'?{era:ctx.built?.era??ctx.era,wealth:ctx.built?.wealth??ctx.wealth}:{era:ctx.era,wealth:ctx.wealth},fp0=ctx.footprint,ext=ctx.extensions??[],c2:CivContext={...ctx,...look,footprint:ext.length?{w:fp0.w*.7,d:fp0.d}:fp0};
 const r=seededRandom(ctx.seed),g=mk(civ,c2,r),sc=jit(r,.06);
 // builders read g.w/g.d, so run them on a view scaled by the instance's size jitter (still fitted back into the footprint below)
 const view:G={...g,w:c2.footprint.w*Math.min(1,sc),d:c2.footprint.d*Math.min(1,sc)};
 const out=role==='house'?(c2.era<=1?poor(view):(grammarSet==='legacy'?LEGACY_HOUSE:ORIGINAL_HOUSE)[civ](view)):role==='civic'?(c2.era<=1?poor(view):(grammarSet==='legacy'?LEGACY_CIVIC:ORIGINAL_CIVIC)[civ](view)):BUILD[role](view);
 if(grammarSet==='original'&&role==='civic'&&!view.parts.some(p=>p.mat===matId(civ,'cloth')&&p.size[2]<.1&&p.size[1]>.6))view.banner(view.w*.36,view.d*.46,3.2);
 if(grammarSet==='original'&&(role==='house'||role==='civic')&&c2.era>=3)eraMarks(view,c2.era,c2.wealth);
 if(c2.era>1&&role!=='market')addons(view,seededRandom(ctx.seed^0x51ed270b));
 if(ctx.heraldry&&(role==='house'||role==='granary'))villageMarks(view,ctx.heraldry);
 if(role!=='market')techniques(view,c2.era);
 if(grammarSet==='original'&&(role==='house'||role==='granary')){const mm=(sl:Slot)=>matId(civ,sl) as Part['mat'];dressDwelling(view.parts,{wall:mm('wall'),wall2:mm('wall2'),roof:mm('roof'),trim:mm('trim'),accent:mm('accent'),cloth:mm('cloth'),ground:mm('ground'),dark:mm(darkSlot(view))},seededRandom(ctx.seed^0x7f4a7c15),{wear:ctx.wear,wealth:c2.wealth,era:c2.era,footprint:c2.footprint,kind:role==='granary'?'granary':'house'});}
 const im=imperfect(view,g.parts,ctx.wear,seededRandom(ctx.seed^0x9e3779b1));
 const ref=`${CIVS[civ].name}: ${CIVS[civ].inspiration}`,e=out.entry;
 const fit=fitToFootprint({family:`civ.${civ}.${role}`,variantKey,footprint:{...c2.footprint},parts:im.parts,...(e?{entry:e}:{}),notes:{reference:ref}},.1);
 const {w,d}=fit.footprint,entry=fit.entry?{...fit.entry,x:Math.max(-w/2,Math.min(w/2,fit.entry.x)),z:Math.max(-d/2,Math.min(d/2,fit.entry.z))}:undefined;
 const own=new Set(Object.keys(materialTable(civ))),parts=ensureTiers(ensureNearSupport(ensureCore(fit.parts),fit.footprint),fit.footprint).map(p=>own.has(p.mat)?p:{...p,mat:matId(civ,'wall2') as Part['mat']}),cloth=matId(civ,'cloth');
 const sh=ext.length?-fp0.w*.15:0,shifted=sh?parts.map(p=>({...p,pos:[p.pos[0]+sh,p.pos[1],p.pos[2]] as V,...(p.ends?{ends:[[p.ends[0][0]+sh,p.ends[0][1],p.ends[0][2]],[p.ends[1][0]+sh,p.ends[1][1],p.ends[1][2]]] as const}:{})})):parts;
 const annexParts:Part[]=[];ext.slice(0,2).forEach((e,i)=>{const vg=mk(civ,{...ctx,era:e.era,wealth:look.wealth,footprint:fp0},seededRandom(ctx.seed+i*7+1)),aw=fp0.w*.26,ad=fp0.d*(.45-i*.1),x=fp0.w*.355,z=-fp0.d*.1+i*fp0.d*.34,h=range(vg.r,2.2,3);vg.B(e.era>=3?'wall':'wall2',[aw,h,ad],[x,0,z],2);roofFor(vg,Math.min(aw,ad)*.8,Math.min(aw,ad)*.8,h,x,z);vg.door(x,z+ad/2+.02,.8,1.7);annexParts.push(...vg.parts.filter(q=>{const b=partBounds(q);return b.minX>=-fp0.w/2&&b.maxX<=fp0.w/2&&b.minZ>=-fp0.d/2&&b.maxZ<=fp0.d/2;}));});
 const outParts=capMidTier(ext.length?ensureTiers(ensureNearSupport([...shifted,...annexParts],fp0),fp0):parts);
 return {...fit,footprint:{...fp0},...(entry?{entry:{...entry,x:entry.x+sh}}:{}),parts:outParts,eraMode:ctx.eraMode??DEFAULT_ERA_MODE,builtEra:look.era,extensionEras:ext.map(e=>e.era),civ,role,materials:muteTable(ctx.look?.palette?paletteTable(civ,ctx.look.palette):materialTable(civ)),banners:outParts.filter(p=>p.mat===cloth&&p.size[2]<.1&&p.size[1]>.6).map(p=>({pos:p.pos,size:p.size})),imperfection:{scale:sc,lean:im.lean,offDoor:g.off,patches:im.patches}};
}

/** Techniques a builder of this era commands (applied once, at build time): era 3 dressed plinth and door frame, era 4 corner quoins, era 5 cornice band. */
function techniques(g:G,era:number){
 const walls=g.parts.filter(p=>p.shape==='box'&&p.size[1]>1.4&&p.lod===2&&!p.rot);if(!walls.length||era<3)return;
 const bs=walls.map(partBounds),x0=Math.min(...bs.map(b=>b.minX)),x1=Math.max(...bs.map(b=>b.maxX)),z0=Math.min(...bs.map(b=>b.minZ)),z1=Math.max(...bs.map(b=>b.maxZ)),h=Math.max(...bs.map(b=>b.maxY));
 g.B('wall2',[x1-x0+.1,.3,z1-z0+.1],[(x0+x1)/2,0,(z0+z1)/2],2);
 g.B('trim',[.12,1.9,.1],[-.55,0,z1+.02],0);g.B('trim',[.12,1.9,.1],[.55,0,z1+.02],0);g.B('trim',[1.3,.14,.12],[0,1.9,z1+.02],0);
 if(era>=4)for(const x of[x0,x1])for(const z of[z0,z1])g.B('trim',[.3,h*.9,.3],[x+(x<0?.1:-.1),.3,z+(z<0?.1:-.1)],1);
 if(era>=5)g.B('trim',[x1-x0+.2,.22,z1-z0+.2],[(x0+x1)/2,h*.9,(z0+z1)/2],1);
}
/** Layered village: each building keeps the era it was built in. Older eras stay standing next to newer ones; the newest buildings use the current techniques. Returns per-building `built` (feed with eraMode 'fixed'). */
export function villageLayers(seed:number,currentEra:number,count:number):{built:{era:number;wealth:number}}[]{
 const r=seededRandom(seed^0x2545f491),out:{built:{era:number;wealth:number}}[]=[];
 for(let i=0;i<count;i++){const age=Math.floor(Math.pow(r(),1.6)*(currentEra+1));out.push({built:{era:Math.max(0,currentEra-age),wealth:Math.round((.15+r()*.7)*100)/100}});}
 if(count>=4&&currentEra>=2){out[0].built.era=currentEra;out[count-1].built.era=Math.max(0,currentEra-2);}
 return out;
}
/** Explicit rebuild: the only way a building's base look changes. */
export const rebuild=(ctx:CivContext,era:number,wealth=ctx.built?.wealth??ctx.wealth):CivContext=>({...ctx,eraMode:'fixed',built:{era,wealth},extensions:[]});
/** Explicit extension: adds a wing built with its own era's techniques; the base is untouched. */
export const extend=(ctx:CivContext,era:number):CivContext=>({...ctx,eraMode:'fixed',built:ctx.built??{era:ctx.era,wealth:ctx.wealth},extensions:[...(ctx.extensions??[]),{era}].slice(0,2)});
