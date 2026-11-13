/** TASTE ENVELOPE: the "lowest common denominator of good taste" every generated civ must sit inside. Pure, seeded (no Math.random, no Date.now, no three.js).
 *
 *  BLUF: one StyleGenome per civ (climate, materials, roof, proportions, palette, ornament, garb, banner, wonder) drives every building, garment, flag and wonder so a civ is
 *  coherent. `validateGenome` scores it against the data in tasteData.ts; `repairGenome` clamps then (if needed) rerolls deterministically; `castGenomes` deals a game's civs so
 *  they are far enough apart to tell apart; `eraView` says what the civ can make at era 0..5 (huts first). The 14 presets are exemplar points validated with the 'exemplar'
 *  profile (same rules, limits widened just enough to contain them). Everything is opt-in: nothing in the shipped presets or saved skins calls this unless the switch is on
 *  or the civ's mode is 'generated'. Design values only; see docs/TASTE_ENVELOPE.md. */
import {hash32,makeRng,type Rng} from '../game/rulerCore';
import type {Material} from '../game/civGenerator';
import {CIVS,CIV_IDS,type CivId,type RoofForm} from './civStyles';
import {MATERIAL_SWATCH,MATERIAL_ROOF,AFFINITY,EXTRA_EMBLEMS,SKIN_SPECS} from './civSkinData';
import {CLIMATES,DISTANCE,EARLY_FALLBACK,EARTH_HUES,FORBIDDEN_PAIRS,GARB,GARB_MAX_HUES,HUT_MATERIAL,LIMITS,MADE_ROLES,MATERIAL_BY_CLIMATE,MATERIAL_ERA,MOTIFS,ORNAMENT,ORNAMENT_MAX_DENSITY_BY_ERA,ORNAMENT_MAX_MOTIFS,ORNAMENT_MAX_ZONES,
 PIGMENTS,PIGMENT_BY_ID,PROPORTIONS,PURPLE_HUES,ROLES,ROOFS_BY_CLIMATE,ROOF_MATERIALS,ROOF_PITCH,ROOF_PITCH_TOL,SATURATION_CAP_BY_ERA,WALL_THICK_BY_MATERIAL,
 type Climate,type Cut,type Fibre,type Head,type Limits,type OrnamentFamily,type Pigment,type Proportions,type Role,type Symmetry,type Zone} from './tasteData';
export {CLIMATES,ROLES};export type {Climate,Role,Limits};

export type Profile='generated'|'exemplar';
export type BannerStyleName='flag'|'swallow'|'hanging'|'streamers'|'pennant'|'twin';
export const BANNER_STYLE_NAMES:BannerStyleName[]=['flag','swallow','hanging','streamers','pennant','twin'];
export const EMBLEM_NAMES=[...CIV_IDS.map(i=>CIVS[i].emblem.id),...EXTRA_EMBLEMS.map(e=>e.id)];
export const GRANARIES=['bins','raised','cone','cellar'] as const;
export type StyleGenome={v:1;seed:number;salt:number;climate:Climate;coastal:boolean;grammar:CivId;silhouette:string;
 materials:{wall:Material;wall2:Material;roof:Material};roofForm:RoofForm;granary:typeof GRANARIES[number];proportions:Proportions;
 pigments:{accent:string;cloth:string;trim:string};palette:Record<Role,string>;
 ornament:{family:OrnamentFamily;motifs:string[];density:number;symmetry:Symmetry;zones:Zone[];repeat:number};
 garb:{cut:Cut;headwear:Head;fibre:Fibre;body:string;trim:string;motif:string};banner:{style:BannerStyleName;emblem:string};wonder:{signature:CivId}};
export type Violation={rule:string;detail:string;weight:number;role?:string};
export type Verdict={ok:boolean;score:number;violations:Violation[]};

// ------------------------------------------------------------------ colour maths (local copies so this module needs no scene imports)
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
const rgbOf=(h:string):[number,number,number]=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
const hexOf=(r:number,g:number,b:number)=>'#'+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
export function toHsl(hex:string):[number,number,number]{
 const [r,g,b]=rgbOf(hex).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;if(!d)return [0,0,l];
 const s=d/(1-Math.abs(2*l-1)),h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4;return [h*60,s,l];
}
export function hslHex(h:number,s:number,l:number){
 h=((h%360)+360)%360;s=clamp(s);l=clamp(l);const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
 const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return hexOf((r+m)*255,(g+m)*255,(b+m)*255);
}
export const mixHex=(a:string,b:string,t:number)=>{const p=rgbOf(a),q=rgbOf(b);return hexOf(p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,p[2]+(q[2]-p[2])*t);};
export function oklab(hex:string):[number,number,number]{
 const [r,g,b]=rgbOf(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
/** Perceptual colour distance (OKLab euclid; black to white is 1). */
export const deltaE=(a:string,b:string)=>{const p=oklab(a),q=oklab(b);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);};
const hueGap=(a:number,b:number)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d;};
const inBand=(h:number,[lo,hi]:[number,number])=>h>=lo&&h<=hi;
const isEarthHue=(h:number)=>inBand(h,EARTH_HUES)||h>=350;
const setHsl=(hex:string,f:(h:number,s:number,l:number)=>[number,number,number])=>{const [h,s,l]=toHsl(hex);const o=f(h,s,l);return hslHex(o[0],o[1],o[2]);};
const CHROMATIC=.22;
const chromatic=(hex:string)=>{const [,s,l]=toHsl(hex);return s>=CHROMATIC&&l>.1&&l<.94;};

/** Hue families of a set of colours: all earth hues are one family; the rest merge when within 40 degrees. Returns representative hues (earth reported as 30). */
export function hueFamilies(hexes:string[]):{hue:number;earth:boolean}[]{
 const out:{hue:number;earth:boolean}[]=[];let earth=false;const rest:number[]=[];
 for(const x of hexes){if(!chromatic(x))continue;const h=toHsl(x)[0];if(isEarthHue(h))earth=true;else rest.push(h);}
 if(earth)out.push({hue:30,earth:true});
 rest.sort((a,b)=>a-b);let cur:number[]=[];
 const flush=()=>{if(cur.length)out.push({hue:cur.reduce((a,b)=>a+b,0)/cur.length,earth:false});cur=[];};
 for(const h of rest){if(cur.length&&h-cur[cur.length-1]>40)flush();cur.push(h);}flush();
 return out;
}

// ------------------------------------------------------------------ palette rules
export type Palette=Record<Role,string>;
const darkBrown=(hex:string,lim:Limits)=>{const [h,s,l]=toHsl(hex);return h>=5&&h<=50&&s>=.15&&l<lim.darkBrownL;};
const greenish=(hex:string)=>{const [h,s]=toHsl(hex);return h>=70&&h<=170&&s>=.2;};
const purple=(hex:string)=>{const [h,s,l]=toHsl(hex);return inBand(h,PURPLE_HUES)&&s>=CHROMATIC&&l>.1;};
/** Check a seven-role palette against a profile. `satCap` (optional) lowers the saturation caps (era views). */
export function checkPalette(p:Palette,profile:Profile='generated',satCapScale?:number):Violation[]{
 const L=LIMITS[profile],v:Violation[]=[],add=(rule:string,detail:string,weight=1,role?:string)=>v.push({rule,detail,weight,role});
 let sSum=0,sN=0;
 for(const role of ROLES){
  const [h,s,l]=toHsl(p[role]),cap=Math.min(L.satCap[role],satCapScale??1),[lo,hi]=L.lBand[role];
  if(s>cap+1e-3)add('saturation-cap',`${role} sat ${s.toFixed(2)} > ${cap.toFixed(2)}`,1,role);
  if(l<lo-1e-3||l>hi+1e-3)add('lightness-band',`${role} l ${l.toFixed(2)} outside ${lo}-${hi}`,1,role);
  if(l<L.floorL)add('near-black',`${role} l ${l.toFixed(2)}`,1.5,role);
  if(l>L.ceilL)add('blown-white',`${role} l ${l.toFixed(2)}`,1,role);
  if(s>=.75&&l>=.42&&l<=.78)add('neon',`${role} ${p[role]} sat ${s.toFixed(2)}`,2,role);
  if(s>=.65&&l>=.3&&l<=.72&&[0,120,240].some(c=>hueGap(h,c)<=14))add('pure-primary',`${role} ${p[role]} hue ${Math.round(h)}`,2,role);
  if(role!=='ground'){sSum+=s;sN++;}
 }
 if(sSum/sN>L.meanSatCap)add('mean-saturation',`mean sat ${(sSum/sN).toFixed(2)} > ${L.meanSatCap}`,.75);
 const made=MADE_ROLES.map(r=>p[r]),fam=hueFamilies(made);
 if(fam.length>L.maxFamilies)add('hue-count',`${fam.length} hue families > ${L.maxFamilies}`,1.5);
 const other=fam.filter(f=>!f.earth);
 for(let i=0;i<other.length;i++)for(let j=i+1;j<other.length;j++){const g=hueGap(other[i].hue,other[j].hue);if(g>L.analogGap&&!(g>=L.complementGap[0]&&g<=L.complementGap[1]))add('harmony',`hue gap ${Math.round(g)} is neither analogous nor complementary`,1);}
 const pr=MADE_ROLES.filter(r=>purple(p[r]));
 if(pr.length>L.purple.maxRoles)add('purple-rare',`${pr.length} purple roles (rare dye: at most ${L.purple.maxRoles})`,1.5);
 for(const r of pr){const [,s,l]=toHsl(p[r]);if(s>L.purple.satCap||l>L.purple.lMax)add('purple-rare',`${r} purple too bright`,1,r);}
 const brown=MADE_ROLES.filter(r=>darkBrown(p[r],L)),green=MADE_ROLES.filter(r=>greenish(p[r]));
 if(brown.length&&green.length)add('dark-brown-with-green',`${brown.join('+')} dark brown beside ${green.join('+')} green`,2);
 const c=L.contrast;
 if(deltaE(p.wall,p.roof)<c.wallRoof)add('contrast',`wall vs roof dE ${deltaE(p.wall,p.roof).toFixed(3)}`,1);
 if(deltaE(p.wall,p.trim)<c.wallTrim)add('contrast',`wall vs trim dE ${deltaE(p.wall,p.trim).toFixed(3)}`,.75);
 if(deltaE(p.wall,p.accent)<c.wallAccent)add('contrast',`wall vs accent dE ${deltaE(p.wall,p.accent).toFixed(3)}`,.75);
 if(deltaE(p.cloth,p.trim)<c.clothTrim&&deltaE(p.cloth,p.accent)<c.clothTrim)add('contrast',`cloth vs trim/accent dE too small`,.5);
 return v;
}
const ROLE_W:Record<Role,number>={wall:3,wall2:1,roof:2.5,trim:1,accent:1.5,cloth:1.5,ground:0};
/** Deterministic palette repair: clamps saturation and lightness, collapses extra hue families, fixes harmony, purple, dark-brown-green and contrast. No randomness. */
export function repairPalette(input:Palette,profile:Profile='generated',satCapScale?:number):Palette{
 const L=LIMITS[profile],p:Palette={...input};
 if(checkPalette(input,profile,satCapScale).length===0)return p;
 const clampRole=(r:Role)=>{p[r]=setHsl(p[r],(h,s,l)=>{const cap=Math.min(L.satCap[r],satCapScale??1)-.005,[lo,hi]=L.lBand[r];let ns=Math.min(s,cap),nl=clamp(l,lo+.005,hi-.005);
  nl=clamp(nl,L.floorL+.01,L.ceilL-.01);
  if(ns>=.65&&nl>=.3&&nl<=.72&&[0,120,240].some(c=>hueGap(h,c)<=14)){h+=18;ns=Math.min(ns,.55);}
  if(ns>=.74&&nl>=.42&&nl<=.78)ns=.6;return [h,ns,nl];});};
 const nearestHue=(h:number,hs:number[])=>hs.reduce((b,x)=>hueGap(h,x)<hueGap(h,b)?x:b,hs[0]);
 for(let pass=0;pass<6;pass++){
  for(const r of ROLES)clampRole(r);
  // collapse extra hue families (smallest weight first): rotate into the nearest kept family, else neutralise
  let fam=hueFamilies(MADE_ROLES.map(r=>p[r]));
  while(fam.length>L.maxFamilies){
   const weight=(f:{hue:number;earth:boolean})=>MADE_ROLES.filter(r=>chromatic(p[r])&&(f.earth?isEarthHue(toHsl(p[r])[0]):!isEarthHue(toHsl(p[r])[0])&&hueGap(toHsl(p[r])[0],f.hue)<=40)).reduce((s,r)=>s+ROLE_W[r],0);
   const drop=fam.reduce((b,f)=>weight(f)<weight(b)?f:b,fam[0]),keep=fam.filter(f=>f!==drop).map(f=>f.hue);
   for(const r of MADE_ROLES){const [h]=toHsl(p[r]);if(!chromatic(p[r]))continue;const inDrop=drop.earth?isEarthHue(h):(!isEarthHue(h)&&hueGap(h,drop.hue)<=40);if(!inDrop)continue;
    const t=nearestHue(h,keep);p[r]=hueGap(h,t)<=70?setHsl(p[r],(_h,s,l)=>[t,s,l]):setHsl(p[r],(hh,_s,l)=>[hh,.12,l]);}
   fam=hueFamilies(MADE_ROLES.map(r=>p[r]));
  }
  // harmony: non-earth families must be analogous or complementary
  const other=fam.filter(f=>!f.earth);
  for(let i=0;i<other.length;i++)for(let j=i+1;j<other.length;j++){const g=hueGap(other[i].hue,other[j].hue);
   if(g>L.analogGap&&!(g>=L.complementGap[0]&&g<=L.complementGap[1])){
    const tgt=g<(L.analogGap+L.complementGap[0])/2?other[i].hue+(((other[j].hue-other[i].hue+540)%360)-180>0?1:-1)*L.analogGap*.6:other[i].hue+180;
    for(const r of MADE_ROLES){const [h]=toHsl(p[r]);if(chromatic(p[r])&&!isEarthHue(h)&&hueGap(h,other[j].hue)<=40)p[r]=setHsl(p[r],(_h,s,l)=>[tgt,s,l]);}}}
  // purple is rare: keep the heaviest role, move the rest to madder red
  const pr=MADE_ROLES.filter(r=>purple(p[r])).sort((a,b)=>ROLE_W[b]-ROLE_W[a]);
  pr.forEach((r,i)=>{p[r]=i<L.purple.maxRoles?setHsl(p[r],(h,s,l)=>[h,Math.min(s,L.purple.satCap-.02),Math.min(l,L.purple.lMax-.02)]):setHsl(p[r],(_h,s,l)=>[8,Math.min(s,.5),l]);});
  // dark brown beside green: lighten the brown
  if(MADE_ROLES.some(r=>darkBrown(p[r],L))&&MADE_ROLES.some(r=>greenish(p[r])))for(const r of MADE_ROLES)if(darkBrown(p[r],L))p[r]=setHsl(p[r],(h,s,l)=>[h,s,Math.min(L.lBand[r][1]-.01,L.darkBrownL+.05)]);
  // contrast: push the dependent role away from the wall (or the trim from the cloth) in lightness
  const sep=(r:Role,ref:Role,min:number)=>{for(let k=0;k<30&&deltaE(p[r],p[ref])<min;k++){const [,,lr]=toHsl(p[r]),[,,lf]=toHsl(p[ref]);const dir=(lr>=lf?1:-1)*(k<15?1:-1);const nl=clamp(lr+dir*.03,L.lBand[r][0]+.005,L.lBand[r][1]-.005);p[r]=setHsl(p[r],(h,s)=>[h,s,nl]);}};
  sep('roof','wall',L.contrast.wallRoof+.01);sep('trim','wall',L.contrast.wallTrim+.01);sep('accent','wall',L.contrast.wallAccent+.01);
  if(deltaE(p.cloth,p.trim)<L.contrast.clothTrim&&deltaE(p.cloth,p.accent)<L.contrast.clothTrim)sep('cloth','accent',L.contrast.clothTrim+.01);
  // mean saturation
  for(let k=0;k<8;k++){const m=MADE_ROLES.reduce((s,r)=>s+toHsl(p[r])[1],0)/MADE_ROLES.length;if(m<=L.meanSatCap-.01)break;for(const r of ROLES)p[r]=setHsl(p[r],(h,s,l)=>[h,s*.92,l]);}
  if(checkPalette(p,profile,satCapScale).length===0)break;
 }
 return p;
}

// ------------------------------------------------------------------ genome checks
const pairForbidden=(a:Material,b:Material)=>a!==b&&FORBIDDEN_PAIRS.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
const within=(x:number,[lo,hi]:[number,number],eps=1e-6)=>x>=lo-eps&&x<=hi+eps;
const climateOfGrammar=(g:CivId)=>CIVS[g].climate;
/** All taste checks for one genome. 'generated' is the strict profile; 'exemplar' relaxes colour limits and the climate-only roof list. */
export function validateGenome(g:StyleGenome,profile:Profile=g.seed<0?'exemplar':'generated'):Verdict{
 const v:Violation[]=[...checkPalette(g.palette,profile)],add=(rule:string,detail:string,weight=1)=>v.push({rule,detail,weight});
 const m=g.materials,mats=[m.wall,m.wall2,m.roof],avail=MATERIAL_BY_CLIMATE[g.climate];
 if(profile==='generated')for(const x of mats)if(!(avail[x]&&avail[x]!>0))add('material-availability',`${x} is not locally available in a ${g.climate} biome`);
 for(const [a,b] of [[m.wall,m.wall2],[m.wall,m.roof],[m.wall2,m.roof]] as [Material,Material][])if(pairForbidden(a,b))add('material-compat',`${a} + ${b} never share a building`);
 if(profile==='generated'&&!ROOFS_BY_CLIMATE[g.climate].includes(g.roofForm))add('roof-climate',`${g.roofForm} is not a ${g.climate} roof`);
 const rm=ROOF_MATERIALS[g.roofForm];if(!rm.includes(m.wall)&&!rm.includes(m.roof))add('roof-material',`${g.roofForm} cannot sit on ${m.wall}/${m.roof}`);
 const P=PROPORTIONS[g.climate],pr=g.proportions;
 for(const k of Object.keys(P) as (keyof Proportions)[])if(!within(pr[k],P[k]))add('proportion',`${k} ${pr[k].toFixed(3)} outside ${P[k].join('-')} for ${g.climate}`);
 if(Math.abs(pr.pitch-ROOF_PITCH[g.roofForm])>ROOF_PITCH_TOL+1e-6)add('roof-pitch',`pitch ${pr.pitch.toFixed(0)} too far from ${g.roofForm} (${ROOF_PITCH[g.roofForm]})`);
 if(!within(pr.wallThick,WALL_THICK_BY_MATERIAL[m.wall]))add('wall-thickness',`wall thickness ${pr.wallThick.toFixed(3)} not buildable in ${m.wall}`,.75);
 const o=g.ornament,F=ORNAMENT[o.family];
 if(o.density>ORNAMENT_MAX_DENSITY_BY_ERA[5]+1e-6)add('ornament-density',`density ${o.density.toFixed(2)} > ${ORNAMENT_MAX_DENSITY_BY_ERA[5]}`);
 if(o.motifs.length<1||o.motifs.length>ORNAMENT_MAX_MOTIFS)add('ornament-motifs',`${o.motifs.length} motifs (1-${ORNAMENT_MAX_MOTIFS})`);
 for(const mo of o.motifs)if(!F.motifs.includes(mo))add('ornament-motif-family',`${mo} is not a ${o.family} motif`);
 if(o.zones.length<1||o.zones.length>ORNAMENT_MAX_ZONES)add('ornament-zones',`${o.zones.length} zones (1-${ORNAMENT_MAX_ZONES})`);
 for(const z of o.zones)if(!F.zones.includes(z))add('ornament-zone-family',`${z} is not a ${o.family} zone`);
 if(!F.symmetry.includes(o.symmetry))add('ornament-symmetry',`${o.symmetry} not used by ${o.family}`);
 if(!within(o.repeat,F.repeat))add('ornament-repeat',`repeat ${o.repeat} outside ${F.repeat.join('-')}`);
 if(profile==='generated'&&!F.materials.includes(m.wall)&&!F.materials.includes(m.wall2))add('ornament-material',`${o.family} cannot be made on ${m.wall}/${m.wall2}`);
 const G=GARB[g.climate],gb=g.garb;
 if(!G.cuts.includes(gb.cut))add('garb-cut',`${gb.cut} is not worn in a ${g.climate} climate`);
 if(!G.heads.includes(gb.headwear))add('garb-headwear',`${gb.headwear} is not worn in a ${g.climate} climate`);
 if(!G.fibres.includes(gb.fibre))add('garb-fibre',`${gb.fibre} is not spun in a ${g.climate} climate`);
 const gf=hueFamilies([gb.body,gb.trim]).length;if(gf>GARB_MAX_HUES)add('garb-hues',`${gf} garment hues`);
 const gl=toHsl(gb.body)[2];if(gl<LIMITS[profile].floorL)add('near-black',`garb body l ${gl.toFixed(2)}`,1.5,);
 if(profile==='generated'&&(![g.palette.wall,g.palette.wall2,g.palette.roof,g.palette.trim,g.palette.accent,g.palette.cloth].some(c=>deltaE(c,gb.body)<=LIMITS[profile].minCoherence)||![g.palette.accent,g.palette.trim,g.palette.cloth].some(c=>deltaE(c,gb.trim)<=LIMITS[profile].minCoherence)))add('garb-coherence','garment colours are not drawn from the civ palette');
 if(!o.motifs.includes(gb.motif)&&gb.motif!=='')add('garb-motif',`garment motif ${gb.motif} not in the civ's ornament motifs`,.5);
 if(!BANNER_STYLE_NAMES.includes(g.banner.style)||!EMBLEM_NAMES.includes(g.banner.emblem))add('banner','unknown banner style or emblem');
 if(climateOfGrammar(g.wonder.signature)!==g.climate&&g.wonder.signature!==g.grammar&&profile==='generated')add('wonder-signature',`wonder piece ${g.wonder.signature} is a ${climateOfGrammar(g.wonder.signature)} civ's`,.75);
 if(profile==='generated'&&climateOfGrammar(g.grammar)!==g.climate)add('grammar-climate',`grammar ${g.grammar} is for a ${climateOfGrammar(g.grammar)} climate`);
 const bad=v.reduce((s,x)=>s+x.weight,0);
 return {ok:v.length===0,score:Math.max(0,+(1-bad/10).toFixed(3)),violations:v};
}

// ------------------------------------------------------------------ sampling
const pickOf=<T,>(r:Rng,a:readonly T[])=>a[Math.min(a.length-1,Math.floor(r()*a.length))];
const wpick=<T,>(r:Rng,items:readonly (readonly [T,number])[]):T=>{let t=0;for(const i of items)t+=i[1];let x=r()*t;for(const [v,w] of items){x-=w;if(x<=0)return v;}return items[items.length-1][0];};
const rangeOf=(r:Rng,[lo,hi]:[number,number])=>lo+(hi-lo)*r();
const jit=(hex:string,r:Rng,dh=5,ds=.04,dl=.03)=>setHsl(hex,(h,s,l)=>[h+(r()-.5)*2*dh,s+(r()-.5)*2*ds,l+(r()-.5)*2*dl]);
const pigmentsFor=(c:Climate,kinds:Pigment['kind'][],era=5)=>PIGMENTS.filter(p=>kinds.includes(p.kind)&&p.minEra<=era&&(p.climates==='all'||p.climates.includes(c)));
const GROUND:Record<Climate,string>={arid:'#c9a574',temperate:'#7d8a52',cold:'#9aa08a',wet:'#6f8a4a'};
function makeGrammar(r:Rng,climate:Climate,form:RoofForm,mats:Material[]):CivId{
 let best:CivId='aureline',top=-1;
 for(const id of CIV_IDS){const a=AFFINITY[id];let sc=r()*.8+(CIVS[id].climate===climate?3:0)+(CIVS[id].roof===form?1.2:0);mats.forEach((m,i)=>{if(a.mat.includes(m))sc+=[1,.6,.4][i]??.3;});if(sc>top){top=sc;best=id;}}
 return best;
}
/** Envelope-aware sampler: biome first, then roof, then the materials that can carry it, then pigments the biome can make. Mostly valid by construction; repair does the rest. */
export function sampleGenome(seed:number,salt=0):StyleGenome{
 const r=makeRng(hash32('taste',seed,salt)),climate=pickOf(r,CLIMATES),coastal=r()<(climate==='wet'?.5:.25);
 const forms=ROOFS_BY_CLIMATE[climate],avail=Object.entries(MATERIAL_BY_CLIMATE[climate]) as [Material,number][];
 let form=pickOf(r,forms);for(let k=0;k<6&&!avail.some(([m])=>ROOF_MATERIALS[form].includes(m));k++)form=pickOf(r,forms);
 const wallPool=avail.filter(([m])=>ROOF_MATERIALS[form].includes(m)),wall=wpick(r,wallPool.length?wallPool:avail);
 const w2Pool=avail.filter(([m])=>!pairForbidden(wall,m)),wall2=r()<.35?wall:wpick(r,w2Pool.length?w2Pool:[[wall,1] as [Material,number]]);
 const rPool=avail.filter(([m])=>ROOF_MATERIALS[form].includes(m)&&!pairForbidden(wall,m)&&!pairForbidden(wall2,m)),roof=r()<.4?wall:wpick(r,rPool.length?rPool:[[wall,1] as [Material,number]]);
 const grammar=makeGrammar(r,climate,form,[wall,wall2,roof]),silhouette=r()<.7?pickOf(r,AFFINITY[grammar].sil):pickOf(r,['terraced','radial','linear','courtyard','stilted','clustered','walled','scattered']);
 const P=PROPORTIONS[climate],th=WALL_THICK_BY_MATERIAL[wall];
 const proportions:Proportions={widthHeight:rangeOf(r,P.widthHeight),pitch:clamp(ROOF_PITCH[form]+(r()-.5)*2*ROOF_PITCH_TOL*.7,P.pitch[0],P.pitch[1]),overhang:rangeOf(r,P.overhang),wallThick:rangeOf(r,[Math.max(th[0],P.wallThick[0]),Math.min(th[1],P.wallThick[1])]),door:rangeOf(r,P.door),window:rangeOf(r,P.window)};
 if(proportions.wallThick<Math.max(th[0],P.wallThick[0])||proportions.wallThick>Math.min(th[1],P.wallThick[1]))proportions.wallThick=th[0];
 // pigments
 const dyes=pigmentsFor(climate,['earth','dye','mineral','rare']),neutrals=pigmentsFor(climate,['neutral']);
 const wp=(a:Pigment[])=>wpick(r,a.map(p=>[p,p.weight] as const));
 const accentP=wp(dyes),clothP=r()<.35?wp(neutrals.filter(p=>p.id!=='ironGall'&&p.id!=='limeWhite')):wp(dyes),
  trimP=r()<.7?PIGMENT_BY_ID[r()<.6?'umber':'ironGall']:PIGMENT_BY_ID.limeWhite,wallTint=wp(pigmentsFor(climate,['earth','neutral']).filter(p=>p.id!=='ironGall'));
 const wallBase=MATERIAL_SWATCH[wall].hex,wallHex=mixHex(wallBase,wallTint.hex,.3),roofHex=mixHex(MATERIAL_ROOF[roof].hex,wp(pigmentsFor(climate,['earth','neutral']).filter(p=>p.id!=='limeWhite'&&p.id!=='bleachedLinen')).hex,.28);
 const wall2Hex=mixHex(MATERIAL_SWATCH[wall2].hex,wallTint.hex,.3);
 const lightWall=toHsl(wallHex)[2]>.6,trimHex=lightWall&&trimP.id==='limeWhite'?mixHex(trimP.hex,'#6b5139',.5):trimP.hex;
 const palette:Palette={wall:jit(wallHex,r,3,.03,.02),wall2:jit(setHsl(wall2Hex,(h,s,l)=>[h,s,l+(lightWall?-.1:.08)]),r,3,.03,.02),roof:jit(roofHex,r,4,.04,.03),trim:jit(trimHex,r,3,.03,.03),accent:jit(accentP.hex,r),cloth:jit(clothP.hex,r),ground:mixHex(wallHex,GROUND[climate],.5)};
 // ornament
 const fams=(Object.keys(ORNAMENT) as OrnamentFamily[]).filter(f=>ORNAMENT[f].materials.includes(wall)||ORNAMENT[f].materials.includes(wall2)),family=pickOf(r,fams.length?fams:['incised' as OrnamentFamily]),F=ORNAMENT[family];
 const motifs=[...new Set([pickOf(r,F.motifs),...(r()<.4?[pickOf(r,F.motifs)]:[])])],nz=1+Math.floor(r()*ORNAMENT_MAX_ZONES);
 const zones=[...new Set(Array.from({length:nz},()=>pickOf(r,F.zones)))],ornament={family,motifs,density:+rangeOf(r,[.1,.55]).toFixed(2),symmetry:pickOf(r,F.symmetry),zones,repeat:Math.round(rangeOf(r,F.repeat))};
 // garb: body is the civ's cloth, trim its accent or trim colour
 const G=GARB[climate],body=palette.cloth,gtrim=r()<.6?palette.accent:palette.trim;
 const garb={cut:pickOf(r,G.cuts),headwear:pickOf(r,G.heads),fibre:pickOf(r,G.fibres),body,trim:gtrim,motif:motifs[0]};
 const sameClimate=CIV_IDS.filter(i=>CIVS[i].climate===climate);
 return {v:1,seed,salt,climate,coastal,grammar,silhouette,materials:{wall,wall2,roof},roofForm:form,granary:r()<.6?CIVS[grammar].granary:pickOf(r,GRANARIES),proportions,pigments:{accent:accentP.id,cloth:clothP.id,trim:trimP.id},palette,ornament,garb,
  banner:{style:pickOf(r,BANNER_STYLE_NAMES),emblem:pickOf(r,EMBLEM_NAMES)},wonder:{signature:r()<.6?grammar:pickOf(r,sameClimate.length?sameClimate:CIV_IDS)}};
}
/** UNCONSTRAINED sampler: models the status quo "any seed picks anything" (any hue, any material mix, any cut). Used to prove the validator catches weirdness and repair fixes it. */
export function rawGenome(seed:number):StyleGenome{
 const r=makeRng(hash32('taste-raw',seed)),climate=pickOf(r,CLIMATES),mats=['wood','stone','brick','mudbrick','felt','thatch','turf','bamboo','plaster','timberFrame'] as Material[];
 const forms=Object.keys(ROOF_PITCH) as RoofForm[],form=pickOf(r,forms),rc=()=>hslHex(r()*360,.2+r()*.8,.1+r()*.85);
 const fams=Object.keys(ORNAMENT) as OrnamentFamily[],family=pickOf(r,fams),allZones=Object.values(ORNAMENT).flatMap(f=>f.zones);
 const grammar=pickOf(r,CIV_IDS),palette:Palette={wall:rc(),wall2:rc(),roof:rc(),trim:rc(),accent:rc(),cloth:rc(),ground:rc()};
 const allCuts=['wrap','tunic','poncho','robe','kilt','cape','trousers'] as Cut[],allHeads=['none','wrap','cap','hood','brim','band','braids'] as Head[],allFibres=['linen','wool','felt','hide','fur','cotton','bark','feather','silk','leather'] as Fibre[];
 return {v:1,seed,salt:0,climate,coastal:r()<.3,grammar,silhouette:pickOf(r,['terraced','radial','linear','courtyard','stilted','clustered','walled','scattered']),materials:{wall:pickOf(r,mats),wall2:pickOf(r,mats),roof:pickOf(r,mats)},roofForm:form,granary:pickOf(r,GRANARIES),
  proportions:{widthHeight:.4+r()*2.4,pitch:r()*70,overhang:r()*.7,wallThick:.01+r()*.3,door:.3+r()*.6,window:r()*.3},pigments:{accent:'',cloth:'',trim:''},palette,
  ornament:{family,motifs:Array.from({length:1+Math.floor(r()*3)},()=>pickOf(r,MOTIFS)),density:r(),symmetry:pickOf(r,['bilateral','radial','translational'] as Symmetry[]),zones:Array.from({length:1+Math.floor(r()*5)},()=>pickOf(r,allZones)),repeat:1+Math.floor(r()*40)},
  garb:{cut:pickOf(r,allCuts),headwear:pickOf(r,allHeads),fibre:pickOf(r,allFibres),body:palette.cloth,trim:rc(),motif:pickOf(r,MOTIFS)},banner:{style:pickOf(r,BANNER_STYLE_NAMES),emblem:pickOf(r,EMBLEM_NAMES)},wonder:{signature:pickOf(r,CIV_IDS)}};
}

// ------------------------------------------------------------------ repair
const nearestIn=<T extends string>(x:T,allowed:readonly T[],seed:string)=>allowed.includes(x)?x:allowed[hash32(seed,x)%allowed.length];
/** Clamp a genome inside the envelope without randomness: pick the nearest allowed choice for every categorical field, clamp every ratio, repair the palette, re-tie the garment colours. */
export function clampGenome(g0:StyleGenome,profile:Profile='generated'):StyleGenome{
 const g:StyleGenome=JSON.parse(JSON.stringify(g0)),key=`${g.seed}:${g.salt}`,avail=MATERIAL_BY_CLIMATE[g.climate],availList=(Object.keys(avail) as Material[]).filter(m=>(avail[m]??0)>0);
 if(profile==='generated'){
  for(const k of ['wall','wall2','roof'] as const)if(!availList.includes(g.materials[k]))g.materials[k]=nearestIn(g.materials[k],availList,key+k);
  if(!ROOFS_BY_CLIMATE[g.climate].includes(g.roofForm)){const ok=ROOFS_BY_CLIMATE[g.climate].filter(f=>ROOF_MATERIALS[f].some(m=>availList.includes(m)));g.roofForm=nearestIn(g.roofForm,ok.length?ok:ROOFS_BY_CLIMATE[g.climate],key+'form');}
 }
 if(!ROOF_MATERIALS[g.roofForm].includes(g.materials.wall)&&!ROOF_MATERIALS[g.roofForm].includes(g.materials.roof)){const c=availList.filter(m=>ROOF_MATERIALS[g.roofForm].includes(m));if(c.length)g.materials.wall=nearestIn(g.materials.wall,c,key+'wallroof');}
 if(pairForbidden(g.materials.wall,g.materials.wall2))g.materials.wall2=g.materials.wall;
 if(pairForbidden(g.materials.wall,g.materials.roof)||pairForbidden(g.materials.wall2,g.materials.roof)){const c=availList.filter(m=>!pairForbidden(g.materials.wall,m)&&!pairForbidden(g.materials.wall2,m)&&ROOF_MATERIALS[g.roofForm].includes(m));g.materials.roof=c.length?nearestIn(g.materials.roof,c,key+'roofmat'):g.materials.wall;}
 const P=PROPORTIONS[g.climate],pr=g.proportions;
 for(const k of Object.keys(P) as (keyof Proportions)[])pr[k]=clamp(pr[k],P[k][0],P[k][1]);
 pr.pitch=clamp(pr.pitch,Math.max(P.pitch[0],ROOF_PITCH[g.roofForm]-ROOF_PITCH_TOL),Math.min(P.pitch[1],ROOF_PITCH[g.roofForm]+ROOF_PITCH_TOL));
 const th=WALL_THICK_BY_MATERIAL[g.materials.wall],tlo=Math.max(th[0],P.wallThick[0]),thi=Math.min(th[1],P.wallThick[1]);pr.wallThick=tlo<=thi?clamp(pr.wallThick,tlo,thi):clamp(pr.wallThick,th[0],th[1]);
 const o=g.ornament;
 if(!ORNAMENT[o.family]){o.family='incised';}
 if(profile==='generated'&&!ORNAMENT[o.family].materials.includes(g.materials.wall)&&!ORNAMENT[o.family].materials.includes(g.materials.wall2)){const f=(Object.keys(ORNAMENT) as OrnamentFamily[]).filter(x=>ORNAMENT[x].materials.includes(g.materials.wall)||ORNAMENT[x].materials.includes(g.materials.wall2));o.family=f.length?nearestIn(o.family,f,key+'fam'):'incised';}
 const F=ORNAMENT[o.family];
 o.motifs=[...new Set(o.motifs.map(m=>nearestIn(m,F.motifs,key+'mo')))].slice(0,ORNAMENT_MAX_MOTIFS);if(!o.motifs.length)o.motifs=[F.motifs[0]];
 o.zones=[...new Set(o.zones.map(z=>nearestIn(z,F.zones,key+'zo')))].slice(0,ORNAMENT_MAX_ZONES);if(!o.zones.length)o.zones=[F.zones[0]];
 o.density=clamp(o.density,0,ORNAMENT_MAX_DENSITY_BY_ERA[5]);o.symmetry=nearestIn(o.symmetry,F.symmetry,key+'sy');o.repeat=Math.round(clamp(o.repeat,F.repeat[0],F.repeat[1]));
 g.palette=repairPalette(g.palette,profile);
 const G=GARB[g.climate];g.garb.cut=nearestIn(g.garb.cut,G.cuts,key+'cut');g.garb.headwear=nearestIn(g.garb.headwear,G.heads,key+'head');g.garb.fibre=nearestIn(g.garb.fibre,G.fibres,key+'fib');
 g.garb.body=g.palette.cloth;{const opts=[g.palette.accent,g.palette.trim,g.palette.cloth],near=opts.reduce((b,c)=>deltaE(c,g0.garb.trim)<deltaE(b,g0.garb.trim)?c:b,opts[0]);g.garb.trim=near;}
 if(deltaE(g.garb.trim,g.garb.body)<.06)g.garb.trim=g.palette.trim;
 g.garb.motif=g.ornament.motifs[0];
 if(!BANNER_STYLE_NAMES.includes(g.banner.style))g.banner.style=nearestIn(g.banner.style,BANNER_STYLE_NAMES,key+'bs');
 if(!EMBLEM_NAMES.includes(g.banner.emblem))g.banner.emblem=nearestIn(g.banner.emblem,EMBLEM_NAMES,key+'em');
 if(profile==='generated'){
  if(climateOfGrammar(g.grammar)!==g.climate){const c=CIV_IDS.filter(i=>CIVS[i].climate===g.climate);g.grammar=nearestIn(g.grammar,c,key+'gr');}
  if(climateOfGrammar(g.wonder.signature)!==g.climate&&g.wonder.signature!==g.grammar)g.wonder.signature=g.grammar;
 }
 return g;
}
/** Repair = clamp; if the clamped genome still fails (rare), reroll the same seed with the next salt (deterministic), up to 8 times, and keep the best scorer. */
export function repairGenome(g:StyleGenome,profile:Profile='generated',maxRerolls=8):{genome:StyleGenome;verdict:Verdict;rerolls:number;clamped:boolean}{
 let cur=clampGenome(g,profile),v=validateGenome(cur,profile),best={genome:cur,verdict:v,rerolls:0,clamped:true};
 for(let k=1;v.violations.length&&k<=maxRerolls;k++){cur=clampGenome(sampleGenome(g.seed,g.salt+k),profile);v=validateGenome(cur,profile);if(v.score>best.verdict.score)best={genome:cur,verdict:v,rerolls:k,clamped:true};if(!v.violations.length){best={genome:cur,verdict:v,rerolls:k,clamped:true};break;}}
 return best;
}
/** The standard generated genome for a seed: sample, then repair. Pure and deterministic. */
export function generateGenome(seed:number,salt=0):StyleGenome{return repairGenome(sampleGenome(seed,salt),'generated').genome;}

// ------------------------------------------------------------------ distance, and dealing a cast
const dist01=(x:number)=>clamp(x);
export function genomeDistance(a:StyleGenome,b:StyleGenome){
 const roleW:Record<Role,number>={wall:.3,wall2:.05,roof:.22,trim:.08,accent:.2,cloth:.15,ground:0};
 const pal=dist01(ROLES.reduce((s,r)=>s+roleW[r]*deltaE(a.palette[r],b.palette[r]),0)/DISTANCE.paletteScale);
 const pa=a.proportions,pb=b.proportions;
 const prop=(Math.abs(pa.widthHeight-pb.widthHeight)/1.2+Math.abs(pa.pitch-pb.pitch)/45+Math.abs(pa.overhang-pb.overhang)/.4)/3;
 const form=dist01((a.grammar!==b.grammar?.34:0)+(a.roofForm!==b.roofForm?.2:0)+(a.silhouette!==b.silhouette?.14:0)+(a.materials.wall!==b.materials.wall?.16:0)+dist01(prop)*.16);
 const za=new Set(a.ornament.zones),zb=new Set(b.ornament.zones),inter=[...za].filter(z=>zb.has(z)).length,union=new Set([...za,...zb]).size||1;
 const orn=dist01((a.ornament.family!==b.ornament.family?.4:0)+(a.ornament.motifs[0]!==b.ornament.motifs[0]?.22:0)+(a.ornament.symmetry!==b.ornament.symmetry?.08:0)+(1-inter/union)*.12+(a.banner.style!==b.banner.style?.09:0)+(a.banner.emblem!==b.banner.emblem?.09:0));
 const W=DISTANCE.weights;return {palette:pal,form,ornament:orn,total:W.palette*pal+W.silhouette*form+W.ornament*orn};
}
export const pairOk=(d:ReturnType<typeof genomeDistance>)=>d.total>=DISTANCE.minPair&&d.palette>=DISTANCE.minPalette&&(d.form+d.ornament)/2>=DISTANCE.minForm*.5&&d.form>=.2;
/** Deal `n` genomes for one game: slot i depends only on slots < i (prefix-stable), each at least the pairwise distance from every earlier one; falls back to the farthest candidate. */
export function castGenomes(gameSeed:number,n:number,withPresetGap=true):StyleGenome[]{
 const out:StyleGenome[]=[],ex=withPresetGap?PRESET_EXEMPLARS:[];
 for(let i=0;i<n;i++){
  let best:StyleGenome|null=null,bestScore=-1;
  for(let salt=0;salt<40;salt++){
   const g=generateGenome(hash32('cast',gameSeed,i),salt);let ok=true,m=1;
   for(const o of out){const d=genomeDistance(g,o);m=Math.min(m,d.total);if(!pairOk(d))ok=false;}
   for(const e of ex){const d=exemplarDistance(g,e);m=Math.min(m,d+.12);if(d<DISTANCE.minFromPreset)ok=false;}
   if(ok){best=g;break;}if(m>bestScore){bestScore=m;best=g;}
  }
  out.push(best!);
 }
 return out;
}
/** Distance to a preset exemplar: palette and form only (presets carry no ornament genome). */
export function exemplarDistance(g:StyleGenome,e:StyleGenome){const d=genomeDistance(g,e);return d.palette*.6+d.form*.4;}

// ------------------------------------------------------------------ era progression (huts first)
export type EraView={era:number;materials:{wall:Material;wall2:Material;roof:Material};palette:Palette;satCap:number;ornamentDensity:number;ornamentFamily:OrnamentFamily;dyesKnown:string[]};
const hutOr=(m:Material,c:Climate,era:number)=>MATERIAL_ERA[m]<=era?m:HUT_MATERIAL[c];
/** What the civ can build and wear at an era (0 huts .. 5): hut materials until the signature wall is learned, dyes it cannot make yet replaced by ochre/undyed stand-ins, saturation and ornament capped by age. */
export function eraView(g:StyleGenome,era:number):EraView{
 const e=Math.max(0,Math.min(5,Math.round(era))),mats={wall:hutOr(g.materials.wall,g.climate,e),wall2:hutOr(g.materials.wall2,g.climate,e),roof:hutOr(g.materials.roof,g.climate,e)};
 const stand=(id:string,hex:string)=>{const p=PIGMENT_BY_ID[id];if(!p||p.minEra<=e)return hex;return mixHex(PIGMENT_BY_ID[EARLY_FALLBACK[p.kind]].hex,hex,.25);};
 const pal:Palette={...g.palette};
 pal.accent=stand(g.pigments.accent,pal.accent);pal.cloth=stand(g.pigments.cloth,pal.cloth);pal.trim=stand(g.pigments.trim,pal.trim);
 const hutW=MATERIAL_SWATCH[mats.wall].hex,hutW2=MATERIAL_SWATCH[mats.wall2].hex,hutR=MATERIAL_ROOF[mats.roof].hex;
 if(mats.wall!==g.materials.wall)pal.wall=mixHex(hutW,g.palette.wall,.45);if(mats.wall2!==g.materials.wall2)pal.wall2=mixHex(hutW2,g.palette.wall2,.45);if(mats.roof!==g.materials.roof)pal.roof=mixHex(hutR,g.palette.roof,.45);
 const sc=SATURATION_CAP_BY_ERA[e];
 for(const r of ROLES)pal[r]=setHsl(pal[r],(h,s,l)=>[h,Math.min(s,sc),l]);
 const fam=ORNAMENT[g.ornament.family].era<=e?g.ornament.family:'incised' as OrnamentFamily;
 return {era:e,materials:mats,palette:repairPalette(pal,'generated',sc/LIMITS.generated.satCap.accent),satCap:sc,ornamentDensity:Math.min(g.ornament.density,ORNAMENT_MAX_DENSITY_BY_ERA[e]),ornamentFamily:fam,dyesKnown:PIGMENTS.filter(p=>p.minEra<=e&&(p.climates==='all'||p.climates.includes(g.climate))&&p.kind!=='neutral').map(p=>p.id)};
}
/** Style development must be gradual: consecutive eras differ by a bounded palette step, never lose dyes or ornament headroom, and every era stays inside the envelope. */
export function checkEraProgression(g:StyleGenome,maxStep=.16):Violation[]{
 const v:Violation[]=[];let prev:EraView|null=null;
 for(let e=0;e<=5;e++){
  const cur=eraView(g,e),sc=cur.satCap/LIMITS.generated.satCap.accent;
  for(const x of checkPalette(cur.palette,'generated',sc))v.push({...x,rule:'era-'+x.rule,detail:`era ${e}: ${x.detail}`});
  if(prev){
   const step=ROLES.reduce((s,r)=>s+deltaE(prev!.palette[r],cur.palette[r]),0)/ROLES.length;if(step>maxStep)v.push({rule:'era-step',detail:`era ${e-1}->${e} palette step ${step.toFixed(3)} > ${maxStep}`,weight:1});
   if(cur.dyesKnown.length<prev.dyesKnown.length)v.push({rule:'era-regress',detail:`dyes lost at era ${e}`,weight:1});
   if(cur.ornamentDensity+1e-9<prev.ornamentDensity)v.push({rule:'era-regress',detail:`ornament fell at era ${e}`,weight:1});
  }
  prev=cur;
 }
 const e0=eraView(g,0);if(Object.values(e0.materials).some(m=>MATERIAL_ERA[m]>0))v.push({rule:'era-huts',detail:'era 0 uses non-hut materials',weight:1});
 return v;
}

// ------------------------------------------------------------------ presets as exemplar points
const CLIMATE_GARB_OK=(c:Climate,cut:string)=>(GARB[c].cuts as string[]).includes(cut);
const exemplarFrom=(id:string,civ:CivId,pal:Palette,roof:RoofForm,dress:{cut:string;headwear:string;body:string;trim:string;motif:string},emblem:string,banner:BannerStyleName):StyleGenome=>{
 const c=CIVS[civ],a=AFFINITY[civ],mats=a.mat,P=PROPORTIONS[c.climate],th=WALL_THICK_BY_MATERIAL[mats[0]],fam=(Object.keys(ORNAMENT) as OrnamentFamily[]).find(f=>ORNAMENT[f].motifs.includes(dress.motif))??'paintedBand',F=ORNAMENT[fam],motif=F.motifs.includes(dress.motif)?dress.motif:F.motifs[0];
 return {v:1,seed:-1-hash32('exemplar',id)%1e6,salt:0,climate:c.climate,coastal:c.coastal,grammar:civ,silhouette:a.sil[0],materials:{wall:mats[0],wall2:mats[1]??mats[0],roof:mats[2]??mats[1]??mats[0]},roofForm:roof,granary:c.granary,
  proportions:{widthHeight:(P.widthHeight[0]+P.widthHeight[1])/2,pitch:ROOF_PITCH[roof],overhang:(P.overhang[0]+P.overhang[1])/2,wallThick:clamp((P.wallThick[0]+P.wallThick[1])/2,Math.max(th[0],P.wallThick[0]),Math.min(th[1],P.wallThick[1])),door:(P.door[0]+P.door[1])/2,window:(P.window[0]+P.window[1])/2},pigments:{accent:'',cloth:'',trim:''},palette:pal,
  ornament:{family:fam,motifs:[motif],density:.3,symmetry:F.symmetry[0],zones:[F.zones[0]],repeat:Math.round((F.repeat[0]+F.repeat[1])/2)},garb:{cut:dress.cut as Cut,headwear:dress.headwear as Head,fibre:GARB[c.climate].fibres[0],body:dress.body,trim:dress.trim,motif},banner:{style:banner,emblem},wonder:{signature:civ}};
};
const BANNER_OF:Record<string,BannerStyleName>={sandrill:'hanging',nilemark:'streamers',tigrane:'swallow',hanrei:'twin',vedara:'streamers',aureline:'pennant',sahelan:'hanging',quillan:'swallow',kaaltun:'twin',mekhari:'streamers',brythen:'streamers',rusvolt:'flag',steppan:'streamers',skoldar:'pennant'};
export const presetPalette=(id:CivId):Palette=>{const m=CIVS[id].materials;return {wall:m.wall.hex,wall2:m.wall2.hex,roof:m.roof.hex,trim:m.trim.hex,accent:m.accent.hex,cloth:m.cloth.hex,ground:m.ground.hex};};
/** The 14 civ bibles as genomes: exemplar points the envelope is calibrated to contain. */
export const PRESET_EXEMPLARS:StyleGenome[]=CIV_IDS.map(id=>exemplarFrom(id,id,presetPalette(id),CIVS[id].roof,CIVS[id].dress,CIVS[id].emblem.id,BANNER_OF[id]??'flag'));
/** Palette/garb/roof check for a plain skin-shaped record (used for presets, registry skins and the optional repair hook). */
export function checkSkinData(s:{palette:Palette;climate:Climate;garb:{cut:string;headwear:string;body:string;trim:string};roof:string},profile:Profile='exemplar'):Violation[]{
 const v=checkPalette(s.palette,profile);
 if(!CLIMATE_GARB_OK(s.climate,s.garb.cut)&&profile==='generated')v.push({rule:'garb-cut',detail:`${s.garb.cut} in ${s.climate}`,weight:1});
 if(profile==='generated'&&!(GARB[s.climate].heads as string[]).includes(s.garb.headwear))v.push({rule:'garb-headwear',detail:`${s.garb.headwear} in ${s.climate}`,weight:1});
 if(profile==='generated'&&!(ROOFS_BY_CLIMATE[s.climate] as string[]).includes(s.roof))v.push({rule:'roof-climate',detail:`${s.roof} in ${s.climate}`,weight:1});
 return v;
}
/** Repair a skin-shaped record in place of the free/remix generators' output: palette clamped, garment colours re-tied, cut/headwear/roof moved to the climate's set. Deterministic. */
export function repairSkinData<T extends {palette:Palette;climate:Climate;garb:{cut:string;headwear:string;body:string;trim:string};roof:string}>(s:T,key:string):T{
 const pal=repairPalette(s.palette,'generated'),out:T={...s,palette:pal,garb:{...s.garb}};
 const wasBody=s.garb.body===s.palette.cloth,wasTrimAccent=s.garb.trim===s.palette.accent;
 out.garb.body=wasBody?pal.cloth:repairPalette({...pal,cloth:s.garb.body},'generated').cloth;
 out.garb.trim=wasTrimAccent?pal.accent:s.garb.trim===s.palette.trim?pal.trim:repairPalette({...pal,accent:s.garb.trim},'generated').accent;
 out.garb.cut=nearestIn(s.garb.cut,GARB[s.climate].cuts as string[],key+'cut');out.garb.headwear=nearestIn(s.garb.headwear,GARB[s.climate].heads as string[],key+'head');
 out.roof=nearestIn(s.roof,ROOFS_BY_CLIMATE[s.climate] as string[],key+'roof');
 return out;
}
export const SKIN_SPEC_COUNT=SKIN_SPECS.length;

// ------------------------------------------------------------------ the switch (default OFF: saves and presets unchanged)
let enabled=false;
export const setTasteEnvelope=(on:boolean)=>{enabled=on;};
export const tasteEnvelopeEnabled=()=>enabled;
/** Genome of a 'generated' civ: its id is `civ-<gameSeed>-<slot>`; slot i is dealt in a prefix-stable cast so civs of one game stay apart. */
export function genomeForCivId(id:string):StyleGenome{
 const m=/^civ-(-?\d+)-(\d+)$/.exec(id);const gameSeed=m?Number(m[1]):hash32('civ-id',id),slot=m?Number(m[2]):0;
 if(slot>=32)return generateGenome(hash32('cast-far',gameSeed,slot));
 return castGenomes(gameSeed,slot+1)[slot];
}
