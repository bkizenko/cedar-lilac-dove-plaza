/** People and insignia per civ (pure). `cultureForCiv` produces a Culture whose dress (cut, headwear, dye, trim motif),
 * palette and flag come from the civ bible, so unitAppearance (which renders only owned gear) shows each civ's people
 * differently without inventing equipment. `emblemSvg` draws the civ's banner emblem; `civShowcase` lays out a review
 * scene (the civ's houses by era, civic hall, granary, market on its own biome) for the render worker. */
import {generateCulture,type Culture,type Season,type Motif,type CultureMaterial} from './cultureGrammar';
import {CIVS,type CivId,type CivMaterials,type Emblem} from './civStyles';
import {emblemById,presetSkin,type CivSkin} from './civSkin';
import type {CivRole} from './civBuildings';
import type {TerrainBiome} from './biomeTerrain';
const MAT:Record<CivId,CultureMaterial>={sandrill:'stone',nilemark:'mudbrick',tigrane:'mudbrick',hanrei:'timber',vedara:'stone',aureline:'stone',sahelan:'mudbrick',quillan:'stone',kaaltun:'stone',mekhari:'wattle',brythen:'wattle',rusvolt:'timber',steppan:'wattle',skoldar:'timber'};
const lin=(v:number)=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};
export const lum=(h:string)=>{const n=parseInt(h.slice(1),16);return .2126*lin(n>>16&255)+.7152*lin(n>>8&255)+.0722*lin(n&255);};
export const contrast=(a:string,b:string)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
/** Ink for the emblem: the skin's accent or trim when it reads on the cloth (3:1), otherwise the better of light and dark. */
export function emblemInkFor(pal:CivMaterials,emblem:Emblem){const cloth=pal.cloth.hex,order=[pal[emblem.ink].hex,pal.accent.hex,pal.trim.hex,'#f4ecd8','#1e1a17'];
 return order.find(i=>contrast(cloth,i)>=3)??(contrast(cloth,'#f4ecd8')>=contrast(cloth,'#1e1a17')?'#f4ecd8':'#1e1a17');}
export const emblemInk=(civ:CivId)=>emblemInkFor(CIVS[civ].materials,CIVS[civ].emblem);
/** People of a society, from its CivSkin (garb, palette, emblem): the same culture builder the civ bibles always used, so a preset skin dresses people exactly as its civ did. */
export function cultureForSkin(skin:CivSkin,seed=1):Culture{
 const pal=skin.palette??CIVS.aureline.materials,g=skin.garb,em=emblemById(skin.banner.emblem),base=generateCulture({seed,climate:g.climate,material:g.material,coastal:g.coastal}),ink=emblemInkFor(pal,em),motif=g.motif as Motif;
 const dress=Object.fromEntries((Object.keys(base.dress) as Season[]).map(s=>[s,{...base.dress[s],cut:g.cut,headwear:g.headwear,body:g.body,trim:g.trim,trimMotif:motif}])) as Culture['dress'];
 return {...base,dress,motifs:[motif,...base.motifs.filter(m=>m!==motif)],palette:{...base.palette,field:g.body,accent:pal.accent.hex,trim:g.trim,ground:pal.ground.hex},
  flag:{...base.flag,fields:[pal.cloth.hex,pal.accent.hex] as typeof base.flag.fields,chargeColor:ink},architecture:{...base.architecture,material:g.material,climate:g.climate},key:`${skin.id.startsWith('civ:')?skin.id.slice(4):skin.id}#${seed}#${g.body}#${em.id}`};
}
export const cultureForCiv=(civ:CivId,seed=1):Culture=>cultureForSkin(presetSkin(civ),seed);
const INSIGNIA_PLACEMENT:Record<string,string>={worker:'sash',spearman:'shoulder',archer:'shoulder',swordsman:'chest',cavalry:'saddle cloth',leader:'chest and banner',warden:'chest',ranger:'shoulder'};
export const insigniaFor=(skin:CivSkin)=>{const pal=skin.palette??CIVS.aureline.materials,em=emblemById(skin.banner.emblem);return {emblem:em,ink:emblemInkFor(pal,em),cloth:pal.cloth.hex,placement:INSIGNIA_PLACEMENT};};
export const insignia=(civ:CivId)=>insigniaFor(presetSkin(civ));
const f=(n:number)=>+n.toFixed(3);
export function emblemSvgFor(skin:CivSkin,size=64):string{const pal=skin.palette??CIVS.aureline.materials,em=emblemById(skin.banner.emblem),ink=emblemInkFor(pal,em),cloth=pal.cloth.hex;
 const body=em.prims.map(p=>p.k==='poly'?`<polygon points="${p.pts.map(q=>q.map(f).join(',')).join(' ')}" fill="${ink}"/>`:p.k==='circle'?`<circle cx="${f(p.c[0])}" cy="${f(p.c[1])}" r="${f(p.r)}" fill="${ink}"/>`:`<polyline points="${p.pts.map(q=>q.map(f).join(',')).join(' ')}" fill="none" stroke="${ink}" stroke-width="${p.w}" stroke-linecap="round"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size*1.25}" viewBox="0 0 1 1.25"><rect width="1" height="1.25" fill="${cloth}"/><g transform="translate(0,.125)">${body}</g></svg>`;}
export const emblemSvg=(civ:CivId,size=64)=>emblemSvgFor(presetSkin(civ),size);
export type ShowcaseItem={role:CivRole;era:number;wealth:number;wear:number;seed:number;x:number;z:number;rotY:number;footprint:{w:number;d:number}};
/** Review scene: houses at era 1/3/5, civic hall at era 2/4, granary and market, on the civ's biome. Deterministic, no overlaps. */
export function civShowcase(civ:CivId,seed=1):{civ:CivId;biome:TerrainBiome;items:ShowcaseItem[];emblemSvg:string;culture:Culture}{
 const spec:[CivRole,number,number,number,{w:number;d:number}][]=[['house',1,.1,.6,{w:5,d:5}],['house',3,.4,.3,{w:7,d:6.5}],['house',5,.8,.1,{w:9,d:8}],['civic',2,.3,.4,{w:10,d:9}],['civic',4,.9,.1,{w:13,d:11}],['granary',3,.4,.3,{w:6,d:5.5}],['market',3,.5,.3,{w:9,d:7}]];
 let x=0;const items=spec.map(([role,era,wealth,wear,footprint],i)=>{const half=footprint.w/2;x+=half+(i?3:0);const it={role,era,wealth,wear,seed:seed*131+i*17,x,z:0,rotY:((i*37)%11-5)*.02,footprint};x+=half;return it;});
 const mid=x/2;return {civ,biome:CIVS[civ].biome,items:items.map(i=>({...i,x:i.x-mid})),emblemSvg:emblemSvg(civ),culture:cultureForCiv(civ,seed)};
}
