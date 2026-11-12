/** CivSkin: the ONE contract a village/society carries so it looks like itself (pure data, JSON-safe, no three.js).
 *
 *  A skin names a massing GRAMMAR (the per-civ house / civic / granary / market generators in civBuildings.ts), a seven-swatch PALETTE,
 *  roof form, granary form, BANNER shape + emblem, WONDER signature piece and people GARB. The renderer reads nothing else about a
 *  society's look, so adding a skin never needs code: write one SkinSpec object (civSkinData.ts) and `registerSkin` it.
 *
 *  Sources of a skin (mode):
 *   - 'preset'  one of the approved civ bibles verbatim (the 10 original civs plus 4 more): the look is exactly the approved one.
 *   - 'remix'   a preset's grammar with hue/material/banner/emblem/garb mutated by the generator (kin, not clone).
 *   - 'free'    grammar picked by affinity to the generated materials + silhouette, palette built from the materials.
 *   - 'neutral' no grammar, no palette: the plain Village grammar (the base and the fallback).
 *  Skins are derived from civGenerator output per game and per society slot (`skinFromCiv`) and stored in game state
 *  (src/game/skinState.ts) so they never change mid-game. */
import {hashSeed,seededRandom,type Rng} from './buildingParts';
import {CIVS,CIV_IDS,paletteTable,type CivDress,type CivId,type CivLook,type CivMaterials,type CivStyle,type Emblem,type RoofForm,type Swatch} from './civStyles';
import {BANNER_STYLE,type BannerStyle,type CivRole} from './civBuildings';
import type {CivSeed,Material} from '../game/civGenerator';
import {SKIN_SPECS,AFFINITY,MATERIAL_SWATCH,MATERIAL_ROOF,EXTRA_EMBLEMS} from './civSkinData';

export const SKIN_VERSION=1;
export type SkinMode='preset'|'remix'|'free'|'neutral';
export type Granary=CivStyle['granary'];
export const BANNER_STYLES:BannerStyle[]=['flag','swallow','hanging','streamers','pennant','twin'];
export type GarbMaterial='stone'|'mudbrick'|'timber'|'wattle';
export type SkinGarb={cut:CivDress['cut'];headwear:CivDress['headwear'];body:string;trim:string;motif:string;climate:CivStyle['climate'];coastal:boolean;material:GarbMaterial};
export type CivSkin={v:1;id:string;name:string;mode:SkinMode;
 /** massing grammar (house/civic/granary/market generators); null = neutral Village grammar */grammar:CivId|null;
 /** the preset civ this skin is, or is kin to */preset?:CivId;
 /** wall, wall2, roof, trim, accent, cloth, ground; null = neutral */palette:CivMaterials|null;
 roof:RoofForm;granary:Granary;banner:{style:BannerStyle;emblem:string};
 /** wonder piece style: which civ's signature landmark stands in the wonder, painted with the palette */wonder:{signature:CivId};
 garb:SkinGarb;silhouette:string;hueShift:number;
 /** generator provenance (civ id and society slot), absent for registry skins */origin?:{civ:string;slot:number}};

/** Compact data object for one registry skin: every omitted field inherits from `base` (a civ bible id). One of these per skin is ALL it takes to add one. */
export type SkinSpec={id:string;name:string;base:CivId;
 /** partial palette over the base civ's swatches: a hex string keeps the base roughness/course, or a full swatch */palette?:Partial<Record<keyof CivMaterials,string|Swatch>>;
 roof?:RoofForm;granary?:Granary;banner?:BannerStyle;emblem?:string;dress?:Partial<Pick<CivDress,'cut'|'headwear'|'body'|'trim'|'motif'>>;approved?:boolean;note?:string};

/** Garb material class per civ (people's culture grammar input). */
export const GARB_MATERIAL:Record<CivId,GarbMaterial>={sandrill:'stone',nilemark:'mudbrick',tigrane:'mudbrick',hanrei:'timber',vedara:'stone',aureline:'stone',sahelan:'mudbrick',quillan:'stone',kaaltun:'stone',mekhari:'wattle',brythen:'wattle',rusvolt:'timber',steppan:'wattle',skoldar:'timber'};

// ---------------------------------------------------------------- colour helpers
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
const shade=(hex:string,k:number)=>mixHex(hex,k<1?'#000000':'#ffffff',Math.abs(1-k));
/** Rotate hue by `deg` and nudge saturation/lightness: how a remix keeps kinship while reading as another people. */
const tweak=(hex:string,deg:number,ds=0,dl=0)=>{const [h,s,l]=toHsl(hex);return hslHex(h+deg,s+ds,l+dl);};
const sw=(hex:string,base:Swatch):Swatch=>({...base,hex});

// ---------------------------------------------------------------- registry
const HEX=/^#[0-9a-f]{6}$/i;
const validSwatch=(s:unknown)=>!!s&&typeof s==='object'&&HEX.test((s as Swatch).hex)&&Number.isFinite((s as Swatch).roughness);
const REGISTRY=new Map<string,CivSkin>();
const APPROVED=new Set<string>();
const EMBLEM_BY_ID=new Map<string,Emblem>();
for(const id of CIV_IDS)EMBLEM_BY_ID.set(CIVS[id].emblem.id,CIVS[id].emblem);
for(const e of EXTRA_EMBLEMS)EMBLEM_BY_ID.set(e.id,e);
export const emblemById=(id:string)=>EMBLEM_BY_ID.get(id)??CIVS.aureline.emblem;
export const EMBLEM_IDS=()=>[...EMBLEM_BY_ID.keys()];
export const isCivId=(x:unknown):x is CivId=>typeof x==='string'&&(CIV_IDS as string[]).includes(x);

/** The approved civ bibles as skins: palette, roof, granary, banner, emblem and dress copied verbatim so the look is exactly the approved one. */
function civPresetSkin(id:CivId):CivSkin{
 const c=CIVS[id];
 return {v:1,id:`civ:${id}`,name:c.name,mode:'preset',grammar:id,preset:id,palette:{...c.materials},roof:c.roof,granary:c.granary,banner:{style:BANNER_STYLE[id],emblem:c.emblem.id},wonder:{signature:id},
  garb:{cut:c.dress.cut,headwear:c.dress.headwear,body:c.dress.body,trim:c.dress.trim,motif:c.dress.motif,climate:c.climate,coastal:c.coastal,material:GARB_MATERIAL[id]},silhouette:c.plan,hueShift:0};
}
/** Build a skin from a compact SkinSpec (inherits everything it omits from the base civ). */
export function skinFromSpec(spec:SkinSpec):CivSkin{
 const base=civPresetSkin(spec.base),pal={...base.palette!};
 for(const [k,v] of Object.entries(spec.palette??{}) as [keyof CivMaterials,string|Swatch][])pal[k]=typeof v==='string'?sw(v,pal[k]):v;
 const d=spec.dress??{};
 return {...base,id:spec.id,name:spec.name,mode:'preset',palette:pal,roof:spec.roof??base.roof,granary:spec.granary??base.granary,banner:{style:spec.banner??base.banner.style,emblem:spec.emblem??base.banner.emblem},
  garb:{...base.garb,...d}};
}
export function registerSkin(skin:CivSkin|SkinSpec,approved=false):CivSkin{
 const s=(skin as SkinSpec).base!==undefined?skinFromSpec(skin as SkinSpec):skin as CivSkin;
 if(!validSkin(s))throw new Error('registerSkin: invalid skin '+(s as CivSkin).id);
 REGISTRY.set(s.id,s);if(approved||(skin as SkinSpec).approved)APPROVED.add(s.id);return s;
}
export const NEUTRAL_SKIN:CivSkin=Object.freeze({v:1,id:'neutral',name:'Village',mode:'neutral',grammar:null,palette:null,roof:'terracottaGable',granary:'raised',banner:{style:'flag',emblem:'laurelColumn'},wonder:{signature:'aureline'},
 garb:{cut:'tunic',headwear:'none',body:'#d8c9a6',trim:'#8a6a3a',motif:'knot',climate:'temperate',coastal:false,material:'timber'},silhouette:'clustered',hueShift:0}) as CivSkin;
REGISTRY.set(NEUTRAL_SKIN.id,NEUTRAL_SKIN);
/** The 10 originals Boris approved (the generator's PRESETS) keep their look byte for byte; the other four bibles ride along as extra presets. */
export const APPROVED_CIVS:CivId[]=['aureline','hanrei','steppan','sandrill','kaaltun','mekhari','skoldar','nilemark','tigrane','rusvolt'];
for(const id of CIV_IDS)registerSkin(civPresetSkin(id),(APPROVED_CIVS as string[]).includes(id));
for(const spec of SKIN_SPECS)registerSkin(spec);

export const skinById=(id:string):CivSkin|undefined=>REGISTRY.get(id);
export const listSkins=()=>[...REGISTRY.values()];
export const isApprovedSkin=(id:string)=>APPROVED.has(id);
/** The approved preset skin for a civ id. */
export const presetSkin=(civ:CivId):CivSkin=>REGISTRY.get(`civ:${civ}`)!;

// ---------------------------------------------------------------- validation (persistence uses this)
export function validSkin(x:unknown):x is CivSkin{
 const s=x as CivSkin;if(!s||typeof s!=='object'||s.v!==1||typeof s.id!=='string'||!s.id||typeof s.name!=='string')return false;
 if(!['preset','remix','free','neutral'].includes(s.mode))return false;
 if(s.mode==='neutral')return s.grammar===null&&s.palette===null;
 if(!isCivId(s.grammar)||!s.palette)return false;
 for(const k of ['wall','wall2','roof','trim','accent','cloth','ground'] as const)if(!validSwatch(s.palette[k]))return false;
 if(!s.banner||!BANNER_STYLES.includes(s.banner.style)||typeof s.banner.emblem!=='string')return false;
 if(!s.wonder||!isCivId(s.wonder.signature)||!s.garb||!HEX.test(s.garb.body)||!HEX.test(s.garb.trim))return false;
 return typeof s.roof==='string'&&typeof s.granary==='string';
}

// ---------------------------------------------------------------- what the renderer reads
/** Overrides handed to generateCivBuilding (ctx.look). Undefined for the neutral skin. */
export function lookOf(skin:CivSkin|null|undefined):CivLook|undefined{
 if(!skin||!skin.grammar||!skin.palette)return undefined;
 return {palette:skin.palette,roof:skin.roof,granary:skin.granary,banner:skin.banner.style};
}
/** Which per-civ building role a live building type is drawn as under a skin; other types keep their Village family, repainted. */
export const ROLE_OF_TYPE:Record<string,CivRole>={hut:'house',house:'house',barracks:'house',townhall:'civic',temple:'civic',university:'civic',market:'market'};
export const roleForType=(type:string):CivRole|null=>ROLE_OF_TYPE[type]??null;

type Table=Record<string,{hex:string;roughness:number;grain?:number;course?:string}>;
const cached=new Map<string,Table>();
/** The Village grammar's material ids repainted from a skin palette: limewash/stone/mud take the walls, timbers the trim, roofing the roof, cloth the cloth.
 * Iron, water, fire, foliage, trunk and recess are not people-made colour and stay. Same shapes, the society's own colours. */
export function villageRetint(skin:CivSkin|null|undefined):Table|undefined{
 if(!skin||!skin.palette)return undefined;
 const hit=cached.get(skin.id+':'+skin.palette.wall.hex+skin.palette.roof.hex+skin.palette.trim.hex);if(hit)return hit;
 const p=skin.palette,s=(x:Swatch,k=1,grain?:number)=>({hex:k===1?x.hex:shade(x.hex,k),roughness:x.roughness,...(grain!==undefined?{grain}:{course:x.course})});
 const t:Table={
  plaster:s(p.wall,1,.2),mud:s(p.wall,.92,.3),stone:s(p.wall2,1,.25),stoneDark:s(p.wall2,.74,.25),
  woodLight:s(p.trim,1.12,1),woodMid:s(p.trim,1,1),woodDark:s(p.trim,.76,1),woodEdge:s(p.trim,.55,.7),woodInlay:s(p.trim,1.25,.6),
  thatch:s(p.roof,1,.8),straw:s(p.roof,1.1,.8),shingle:s(p.roof,.9,1),tile:s(p.roof,1,.5),slate:s(p.roof,.8,.3),
  cloth:s(p.cloth,1,0),clothRed:s(p.accent,1,0),clothBlue:s(p.cloth,.9,0),
 };
 cached.set(skin.id+':'+skin.palette.wall.hex+skin.palette.roof.hex+skin.palette.trim.hex,t);return t;
}
export function skinMaterials(skin:CivSkin|null|undefined,grammar:CivId){return skin?.palette?paletteTable(grammar,skin.palette):undefined;}
/** Four swatches that read as the skin at a glance (picker chips, minimap, debug). */
/** Stable cache key for a skin's look: id plus the fields that change the geometry or colours. */
export const skinSignature=(skin:CivSkin)=>skin.id+'~'+(hashSeed(skin.grammar??'-',skin.roof,skin.granary,skin.banner.style,skin.palette?(['wall','wall2','roof','trim','accent','cloth'] as const).map(k=>skin.palette![k].hex).join(''):'')>>>0).toString(36);
export const skinChips=(skin:CivSkin):string[]=>skin.palette?[skin.palette.wall.hex,skin.palette.roof.hex,skin.palette.accent.hex,skin.palette.cloth.hex]:['#e3d6b8','#b79a52','#6b4a2d','#a8a396'];

// ---------------------------------------------------------------- generation from civGenerator output
const ROOFS_BY_CLIMATE:Record<CivStyle['climate'],RoofForm[]>={arid:['flatParapet','flatPalm','vault','flatSpiked'],temperate:['terracottaGable','roundCone','saddle','conicalThatch'],cold:['plankGable','turfLow','steepThatch','feltDome'],wet:['upturnedHip','palmGable','chhatri','saddle']};
const CUTS:CivDress['cut'][]=['wrap','tunic','poncho','robe','kilt','cape','trousers'];
const HEADS:CivDress['headwear'][]=['none','wrap','cap','hood','brim','band','braids'];
const MOTIFS=['stepped','lozenge','meander','wave','zigzag','spiral','knot','lattice','chevron'];
const SILHOUETTES=['terraced','radial','linear','courtyard','stilted','clustered','walled','scattered'];
/** Dye hues people can plausibly make (madder, ochre, weld, woad, indigo, verdigris, a rare plum): free skins pick from these, never from the whole wheel. */
const DYE_HUES=[6,18,36,48,92,140,172,200,222,262];
const pickOf=<T,>(r:Rng,a:readonly T[])=>a[Math.min(a.length-1,Math.floor(r()*a.length))];

/** Best grammar for a generated civ: the civ whose materials and plan shape match, with seeded jitter so equals do not always tie the same way. */
export function grammarFor(civ:Pick<CivSeed,'materials'|'silhouette'|'id'>,exclude:readonly CivId[]=[]):CivId{
 const r=seededRandom(hashSeed('skin-grammar',civ.id));let best:CivId='aureline',top=-1;
 for(const id of CIV_IDS){
  if(exclude.includes(id))continue;const a=AFFINITY[id];let sc=r()*.6;
  civ.materials.forEach((m,i)=>{if(a.mat.includes(m))sc+=[1,.6,.4][i]??.3;});
  if(a.sil.includes(civ.silhouette))sc+=1.2;
  if(sc>top){top=sc;best=id;}
 }
 return best;
}
const garbFor=(r:Rng,g:CivId,pal:CivMaterials,keep?:SkinGarb):SkinGarb=>{
 const c=CIVS[g];return {cut:keep?.cut??pickOf(r,CUTS),headwear:keep?.headwear??pickOf(r,HEADS),body:pal.cloth.hex,trim:r()<.5?pal.accent.hex:pal.trim.hex,motif:keep?.motif??pickOf(r,MOTIFS),climate:c.climate,coastal:c.coastal,material:GARB_MATERIAL[g]};
};

function remixSkin(civ:CivSeed,base:CivSkin):CivSkin{
 const r=seededRandom(hashSeed('skin-remix',civ.id)),g=base.grammar!,deg=civ.hueShift*2+(r()<.5?-1:1)*(18+r()*20),ds=(r()-.5)*.16,dl=(r()-.5)*.1;
 const pal={...base.palette!} as CivMaterials;
 (Object.keys(pal) as (keyof CivMaterials)[]).forEach(k=>{const dye=k==='accent'||k==='cloth',roofy=k==='roof',d=dye?deg:roofy?deg*1.15:k==='ground'?deg*.3:deg*.45;pal[k]=sw(tweak(pal[k].hex,d,dye||roofy?ds*1.6:ds*.5,dye||roofy?dl:dl*.7),pal[k]);});
 // a different local material changes the main wall (and sometimes its second course) while the grammar stays
 const prior=new Set(AFFINITY[g].mat);civ.materials.forEach((m,i)=>{if(i>1||prior.has(m))return;const ms=MATERIAL_SWATCH[m];pal[i?'wall2':'wall']={hex:mixHex(pal[i?'wall2':'wall'].hex,ms.hex,.55),roughness:ms.roughness,course:ms.course};});
 if(r()<.55){const m=r()<.6?civ.materials[civ.materials.length-1]:pickOf(r,Object.keys(MATERIAL_ROOF) as Material[]),rs=MATERIAL_ROOF[m];if(rs)pal.roof={hex:mixHex(pal.roof.hex,rs.hex,.6),roughness:rs.roughness,course:rs.course};}
 const style=r()<.55?pickOf(r,BANNER_STYLES.filter(s=>s!==base.banner.style)):base.banner.style,emblem=r()<.5?pickOf(r,EMBLEM_IDS().filter(e=>e!==base.banner.emblem)):base.banner.emblem;
 const roof=r()<.3?pickOf(r,ROOFS_BY_CLIMATE[CIVS[g].climate]):base.roof;
 const garb=garbFor(r,g,pal,{...base.garb,...(r()<.4?{cut:pickOf(r,CUTS)}:{}),...(r()<.4?{headwear:pickOf(r,HEADS)}:{})} as SkinGarb);
 return {v:1,id:'gen:'+civ.id,name:civ.name,mode:'remix',grammar:g,preset:g,palette:pal,roof,granary:base.granary,banner:{style,emblem},wonder:{signature:g},garb,silhouette:civ.silhouette,hueShift:civ.hueShift,origin:{civ:civ.id,slot:slotOf(civ.id)}};
}
function freeSkin(civ:CivSeed):CivSkin{
 const r=seededRandom(hashSeed('skin-free',civ.id)),g=grammarFor(civ),c=CIVS[g],[m0,m1,m2]=[civ.materials[0],civ.materials[1],civ.materials[2]];
 const W0=MATERIAL_SWATCH[m0],W1=m1?MATERIAL_SWATCH[m1]:null,R0=MATERIAL_ROOF[m2??m1??m0],h=pickOf(r,DYE_HUES)+(r()-.5)*14,sat=.42+r()*.16,shift=civ.hueShift*.5;
 const wall:Swatch={hex:tweak(W0.hex,shift*.5),roughness:W0.roughness,course:W0.course};
 const wall2:Swatch=W1?{hex:tweak(W1.hex,shift*.5),roughness:W1.roughness,course:W1.course}:{hex:shade(wall.hex,.8),roughness:wall.roughness,course:W0.course};
 const roof:Swatch={hex:tweak(R0.hex,shift),roughness:R0.roughness,course:R0.course};
 const accent:Swatch={hex:hslHex(h+shift,sat+.1,.46+r()*.08),roughness:.6},cloth:Swatch={hex:hslHex(h+pickOf(r,[0,0,24,180,-30]),sat,.4+r()*.06),roughness:.9,course:'cloth'};
 const trim:Swatch={hex:mixHex(shade(wall2.hex,.78),accent.hex,.18),roughness:.75,course:c.materials.trim.course},ground:Swatch={hex:mixHex(wall.hex,'#6f7a4a',.5),roughness:1};
 if(Math.abs(toHsl(roof.hex)[2]-toHsl(wall.hex)[2])<.14&&Math.abs(toHsl(roof.hex)[0]-toHsl(wall.hex)[0])<40)roof.hex=shade(roof.hex,toHsl(roof.hex)[2]>.45?.7:1.35);
 const pal:CivMaterials={wall,wall2,roof,trim,accent,cloth,ground};
 const garb=garbFor(r,g,pal);
 return {v:1,id:'gen:'+civ.id,name:civ.name,mode:'free',grammar:g,preset:g,palette:pal,roof:r()<.65?c.roof:pickOf(r,ROOFS_BY_CLIMATE[c.climate]),granary:r()<.6?c.granary:pickOf(r,['bins','raised','cone','cellar'] as Granary[]),
  banner:{style:pickOf(r,BANNER_STYLES),emblem:pickOf(r,EMBLEM_IDS())},wonder:{signature:r()<.5?g:pickOf(r,CIV_IDS)},garb,silhouette:civ.silhouette,hueShift:civ.hueShift,origin:{civ:civ.id,slot:slotOf(civ.id)}};
}
const slotOf=(id:string)=>{const n=Number(id.split('-').pop());return Number.isFinite(n)?n:0;};
/** Derive the skin a generated civ wears. `preset` mode is the approved civ verbatim; remix and free build from the civ's own materials, silhouette and hueShift. Pure and deterministic. */
export function skinFromCiv(civ:CivSeed):CivSkin{
 const origin={civ:civ.id,slot:slotOf(civ.id)};
 if(civ.mode==='preset'&&isCivId(civ.preset))return {...presetSkin(civ.preset),origin};
 if(civ.mode==='remix'&&isCivId(civ.preset))return remixSkin(civ,presetSkin(civ.preset));
 return freeSkin(civ);
}
export {SILHOUETTES,MATERIAL_SWATCH};
export type {Material};
