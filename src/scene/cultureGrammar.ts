/** Seeded culture grammar. A culture is a COMBINATION of grammar choices driven by a
 * seed plus the local climate, building material and craft focus; it is not an ethnicity
 * and no output is keyed to a modern people. The elements are drawn from many material
 * traditions as neutral technique tokens (river-terrace stepping, canyon-wall banding, brush
 * scroll, wave-spiral, reed weave, bark-cloth blocks, woven lattice, comb impressing...), so
 * the same climate yields many different cultures.
 *
 * Pure data: palette, flag grammar, pottery profile, seasonal dress (real GarmentKind ids from
 * src/game/textiles.ts) and an architectural habit bias compatible with FamilyContext.tradition.
 * It invents no gear and changes no game state. `toSocietyIdentity` projects the flag onto the
 * existing SocietyIdentity shape (src/game/societyIdentity.ts) for adoption by Societies. */
import {hashSeed,seededRandom,type Rng} from './buildingParts';

export type CultureClimate='arid'|'temperate'|'cold'|'wet';
export type CultureMaterial='wattle'|'timber'|'stone'|'mudbrick';
export type CultureCraft='weaving'|'pottery'|'metal'|'carving'|'basketry'|'boatwork';
export type Season='spring'|'summer'|'autumn'|'winter';
export type GarmentId='skinClothes'|'leatherClothes'|'lightClothes'|'hideCoat'|'woolCoat';
export const SEASONS:readonly Season[]=['spring','summer','autumn','winter'];
export const GARMENT_HEAT:Readonly<Record<GarmentId,number>>={lightClothes:.1,skinClothes:.65,leatherClothes:1,hideCoat:1.35,woolCoat:1.05};
/** Neutral technique tokens; none names a people. */
export const MOTIFS=['stepped','meander','spiral','wave','lozenge','zigzag','dots','comb','scroll','lattice','chevron','radiate','knot','cloud','reed','feather'] as const;
export type Motif=typeof MOTIFS[number];
export type CultureInput={seed:number;climate?:CultureClimate;material?:CultureMaterial;craft?:CultureCraft;coastal?:boolean};

const PIGMENTS:Record<string,{hex:string;where:readonly (CultureClimate|'coast'|'any')[]}>={
 limeWhite:{hex:'#eee6d2',where:['any']},soot:{hex:'#2c2723',where:['any']},charcoal:{hex:'#55524e',where:['any']},umber:{hex:'#6b4a32',where:['any']},
 redOchre:{hex:'#b5532e',where:['arid','temperate','cold']},yellowOchre:{hex:'#d1a03a',where:['arid','temperate']},clayPink:{hex:'#c98f78',where:['arid','temperate','wet']},
 cinnabar:{hex:'#c0432b',where:['arid']},malachite:{hex:'#3f8a6c',where:['arid','temperate']},lapis:{hex:'#27408b',where:['arid']},
 woad:{hex:'#4c6ea0',where:['temperate','cold','wet']},indigo:{hex:'#2f4a7c',where:['wet','temperate','coast']},madder:{hex:'#a63a3a',where:['temperate','cold','wet']},
 weld:{hex:'#e0b82e',where:['temperate','wet','cold']},leafGreen:{hex:'#5f8a45',where:['wet','temperate']},lichen:{hex:'#9aa36a',where:['cold','wet']},
 murex:{hex:'#6a2f68',where:['coast']},verdigris:{hex:'#4b9a8a',where:['coast','arid']},seaSlate:{hex:'#52707a',where:['coast','cold']},bark:{hex:'#7a5236',where:['wet','cold']}};

function hslToHex(h:number,s:number,l:number){h=((h%360)+360)%360;const a=s*Math.min(l,1-l),f=(n:number)=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};return '#'+[f(0),f(8),f(4)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');}
function hexToHsl(hex:string):[number,number,number]{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;if(!d)return[0,0,l];const s=d/(1-Math.abs(2*l-1)),h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return[(h*60+360)%360,s,l];}
const lum=(hex:string)=>{const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2];};
export const contrast=(a:string,b:string)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const pick=<T,>(r:Rng,a:readonly T[]):T=>a[Math.floor(r()*a.length)%a.length];
const range=(r:Rng,a:number,b:number)=>a+(b-a)*r();
const jitter=(r:Rng,hex:string,hue=7,lt=.05)=>{const [h,s,l]=hexToHsl(hex);return hslToHex(h+range(r,-hue,hue),Math.max(0,Math.min(1,s*range(r,.9,1.1))),Math.max(.06,Math.min(.95,l+range(r,-lt,lt))));};

export type CulturePalette={ground:string;field:string;accent:string;trim:string;shadow:string;scheme:'earth'|'complement'|'triad'|'analogue';sources:string[]};
export type FlagDivision='plain'|'vertical'|'horizontal'|'triband-v'|'triband-h'|'quarters'|'diagonal'|'chevron'|'saltire'|'canton'|'pall'|'checker';
export type FlagGrammar={division:FlagDivision;/** colour slots from the palette, in paint order */fields:string[];charge:Motif|'none';placement:'centre'|'hoist'|'canton'|'repeat';chargeColor:string;border:Motif|'none';borderColor:string;key:string};
export type PotteryForm='amphora'|'jar'|'bowl'|'ewer'|'bottle'|'beaker'|'tripod'|'plate'|'pithos'|'spouted'|'lidded'|'krater';
export type Pottery={form:PotteryForm;/** lathe profile, radius/height in [0,1], base to rim */profile:[number,number][];handles:'none'|'loop2'|'lugs'|'spout'|'ring';decoration:Motif|'none';technique:'incised'|'comb'|'slip'|'burnished'|'painted'|'stamped';firing:'oxidised'|'reduced'|'buff';body:string;paint:string;key:string};
export type Dress={garment:GarmentId;cut:'wrap'|'tunic'|'poncho'|'robe'|'kilt'|'cape'|'trousers';headwear:'none'|'wrap'|'cap'|'hood'|'brim'|'band'|'braids';body:string;trim:string;trimMotif:Motif|'none'};
export type ArchitecturalHabit={material:CultureMaterial;climate:CultureClimate;/** FamilyContext.tradition-compatible */tradition:{pitchBiasDeg:number;annexBias:number;proportion:number;porchBias:number};courtyard:boolean;stilts:boolean;ornament:Motif|'none';roofTone:string};
export type Culture={version:1;seed:number;climate:CultureClimate;coastal:boolean;material:CultureMaterial;craft:CultureCraft;motifs:Motif[];palette:CulturePalette;flag:FlagGrammar;pottery:Pottery;dress:Record<Season,Dress>;architecture:ArchitecturalHabit;key:string};

const DIVISIONS:readonly FlagDivision[]=['plain','vertical','horizontal','triband-v','triband-h','quarters','diagonal','chevron','saltire','canton','pall','checker'];
const FORMS:readonly PotteryForm[]=['amphora','jar','bowl','ewer','bottle','beaker','tripod','plate','pithos','spouted','lidded','krater'];
const HANDLES:Record<PotteryForm,readonly Pottery['handles'][]>={amphora:['loop2','lugs'],jar:['none','lugs','loop2'],bowl:['none','ring'],ewer:['loop2','spout'],bottle:['none','ring'],beaker:['none'],tripod:['lugs','none'],plate:['none'],pithos:['lugs','ring'],spouted:['spout'],lidded:['none','lugs','ring'],krater:['loop2','lugs']};
const CUTS:Record<CultureClimate,readonly Dress['cut'][]>={arid:['wrap','robe','tunic','kilt'],temperate:['tunic','wrap','robe','cape','trousers','poncho'],cold:['tunic','cape','trousers','poncho','robe'],wet:['wrap','kilt','poncho','tunic','cape']};
const HEADS:Record<CultureClimate,readonly Dress['headwear'][]>={arid:['wrap','brim','hood','none','band'],temperate:['cap','none','band','braids','brim'],cold:['hood','cap','braids','wrap'],wet:['brim','band','none','braids','hood']};
/** Garments a society of this climate can plausibly wear in a season (real garment ids only; heat ordering from textiles.ts). */
export const SEASON_GARMENTS:Record<CultureClimate,Record<Season,readonly GarmentId[]>>={
 arid:{spring:['lightClothes'],summer:['lightClothes'],autumn:['lightClothes','skinClothes'],winter:['skinClothes','leatherClothes','woolCoat']},
 temperate:{spring:['skinClothes','leatherClothes','woolCoat'],summer:['lightClothes','skinClothes'],autumn:['leatherClothes','woolCoat'],winter:['woolCoat','hideCoat']},
 cold:{spring:['leatherClothes','woolCoat'],summer:['skinClothes','leatherClothes'],autumn:['woolCoat','hideCoat'],winter:['hideCoat']},
 wet:{spring:['skinClothes','leatherClothes'],summer:['lightClothes','skinClothes'],autumn:['leatherClothes','woolCoat'],winter:['woolCoat','hideCoat']}};
const MATERIALS:Record<CultureClimate,readonly CultureMaterial[]>={arid:['mudbrick','stone','mudbrick','wattle'],temperate:['timber','stone','wattle','mudbrick'],cold:['timber','stone','timber'],wet:['wattle','timber','wattle','stone']};
const CRAFT_MOTIFS:Record<CultureCraft,readonly Motif[]>={weaving:['lattice','zigzag','lozenge','stepped','chevron'],pottery:['meander','spiral','dots','comb','wave'],metal:['radiate','knot','scroll','chevron','feather'],carving:['knot','scroll','spiral','cloud','feather'],basketry:['reed','lattice','zigzag','stepped','dots'],boatwork:['wave','spiral','scroll','cloud','comb']};

function makePalette(r:Rng,climate:CultureClimate,coastal:boolean):CulturePalette{
 const avail=Object.entries(PIGMENTS).filter(([,p])=>p.where.includes('any')||p.where.includes(climate)||(coastal&&p.where.includes('coast'))).map(([k])=>k);
 const chroma=avail.filter(k=>!['limeWhite','soot','charcoal','umber','bark'].includes(k)),scheme=pick(r,['earth','complement','triad','analogue'] as const);
 const base=pick(r,chroma);let accent=pick(r,chroma.filter(k=>k!==base));
 if(scheme==='complement'){const [h]=hexToHsl(PIGMENTS[base].hex);accent=chroma.slice().sort((a,b)=>Math.abs(((hexToHsl(PIGMENTS[b].hex)[0]-h+540)%360)-180)-Math.abs(((hexToHsl(PIGMENTS[a].hex)[0]-h+540)%360)-180))[Math.floor(r()*2)];}
 const ground=pick(r,['limeWhite','limeWhite','clayPink','yellowOchre','umber'].filter(k=>avail.includes(k))),shadow=pick(r,['soot','charcoal','umber','indigo','bark'].filter(k=>avail.includes(k)));
 const trim=scheme==='earth'?pick(r,['yellowOchre','redOchre','limeWhite','weld'].filter(k=>avail.includes(k))):pick(r,chroma.filter(k=>k!==base&&k!==accent).length?chroma.filter(k=>k!==base&&k!==accent):chroma);
 const f=(k:string)=>jitter(r,PIGMENTS[k].hex);
 return {ground:f(ground),field:f(scheme==='earth'?pick(r,avail.filter(k=>['redOchre','umber','yellowOchre','clayPink','bark'].includes(k))):base),accent:f(accent),trim:f(trim),shadow:f(shadow),scheme,sources:[...new Set([ground,base,accent,trim,shadow])]};
}
/** Contrasting ink for a background: the lightest or darkest palette colour that reaches 3:1, else pure light/dark. */
function ink(bg:string,options:string[]){const ok=options.filter(c=>contrast(bg,c)>=3).sort((a,b)=>contrast(bg,b)-contrast(bg,a));return ok[0]??(contrast(bg,'#1e1a17')>=contrast(bg,'#f4ecd8')?'#1e1a17':'#f4ecd8');}
function makeFlag(r:Rng,p:CulturePalette,motifs:Motif[]):FlagGrammar{
 const division=pick(r,DIVISIONS),slots=[p.field,p.accent,p.ground,p.trim,p.shadow];
 const need=division==='plain'?1:division==='triband-v'||division==='triband-h'||division==='pall'?3:2;
 const order=[...slots].sort(()=>r()-.5);const base=order[0];
 const fields=[base];for(const c of order.slice(1)){if(fields.length>=need)break;if(fields.every(f=>contrast(f,c)>=1.5))fields.push(c);}
 while(fields.length<need)fields.push(ink(fields[fields.length-1],slots));
 const charge:FlagGrammar['charge']=r()<.78?pick(r,motifs):'none',border:FlagGrammar['border']=r()<.4?pick(r,motifs):'none';
 const chargeColor=ink(fields[0],slots),borderColor=ink(fields[0],slots.filter(c=>c!==chargeColor).length?slots.filter(c=>c!==chargeColor):slots);
 const placement=pick(r,['centre','hoist','canton','repeat'] as const);
 return {division,fields,charge,placement,chargeColor,borderColor,border,key:[division,fields.join(''),charge,placement,border].join('|')};
}
function makePottery(r:Rng,p:CulturePalette,craft:CultureCraft,motifs:Motif[]):Pottery{
 const form=pick(r,craft==='pottery'?FORMS:FORMS.filter((_,i)=>i%2===(r()<.5?0:1)||i<4));
 const belly=Math.round(range(r,.25,.8)*20)/20,neck=Math.round(range(r,.2,.7)*20)/20,foot=Math.round(range(r,.25,.55)*20)/20,lip=Math.round(range(r,.0,.18)*50)/50;
 const rmax=form==='plate'?1:form==='bowl'||form==='krater'?.9:form==='bottle'||form==='beaker'?.45:form==='pithos'?.85:.7;
 const profile:[number,number][]=form==='plate'?[[0,0],[foot*.9,0],[1,.12],[1+lip,.14]]:[[0,0],[foot*rmax,0],[rmax,belly*.55],[rmax*(form==='bowl'?1:.85),belly],[neck*rmax*(form==='bowl'?3.2:1),form==='bowl'?.78:.8],[neck*rmax*(1+lip*2),1]];
 const clean=profile.map(([a,b])=>[Math.round(Math.min(1.2,a)*100)/100,Math.round(b*100)/100] as [number,number]);
 const firing=pick(r,['oxidised','reduced','buff'] as const),technique=pick(r,['incised','comb','slip','burnished','painted','stamped'] as const);
 const body=jitter(r,firing==='oxidised'?'#b36a45':firing==='reduced'?'#4a4540':'#cdb48a',6,.04),deco=r()<.85?pick(r,motifs):'none';
 const paint=ink(body,[p.ground,p.accent,p.trim,p.shadow,p.field]),handles=pick(r,HANDLES[form]);
 return {form,profile:clean,handles,decoration:deco,technique,firing,body,paint,key:[form,belly,neck,foot,lip,handles,deco,technique,firing].join('|')};
}
function makeDress(r:Rng,climate:CultureClimate,p:CulturePalette,motifs:Motif[]):Record<Season,Dress>{
 const cut=pick(r,CUTS[climate]),head=pick(r,HEADS[climate]),out={} as Record<Season,Dress>;
 const body=[p.field,p.ground,p.accent],trimM=r()<.8?pick(r,motifs):'none' as const;
 SEASONS.forEach((s,i)=>{const garment=pick(r,SEASON_GARMENTS[climate][s]),bc=body[(i+Math.floor(r()*3))%3];out[s]={garment,cut:s==='winter'&&cut==='kilt'?'cape':cut,headwear:s==='summer'&&head==='hood'?'wrap':s==='winter'&&head==='none'?'cap':head,body:bc,trim:ink(bc,[p.trim,p.accent,p.ground,p.shadow]),trimMotif:trimM};});
 return out;
}
function makeArchitecture(r:Rng,climate:CultureClimate,material:CultureMaterial,p:CulturePalette,motifs:Motif[],coastal:boolean):ArchitecturalHabit{
 return {material,climate,tradition:{pitchBiasDeg:Math.round(range(r,-8,8)*10)/10,annexBias:Math.round(range(r,-.3,.4)*100)/100,proportion:Math.round(range(r,.9,1.15)*100)/100,porchBias:Math.round(range(r,-.2,.5)*100)/100},
  courtyard:climate==='arid'?r()<.7:r()<.25,stilts:(climate==='wet'||coastal)&&r()<.5,ornament:r()<.6?pick(r,motifs):'none',roofTone:jitter(r,climate==='arid'?p.ground:p.shadow,5,.04)};
}
export function generateCulture(input:CultureInput):Culture{
 const r=seededRandom(hashSeed(input.seed,'culture',1)),climate=input.climate??pick(r,['arid','temperate','cold','wet'] as const),coastal=input.coastal??r()<.25,material=input.material??pick(r,MATERIALS[climate]),craft=input.craft??pick(r,['weaving','pottery','metal','carving','basketry','boatwork'] as const);
 const pool=[...CRAFT_MOTIFS[craft],...MOTIFS.filter(()=>r()<.25)],motifs=[...new Set([pick(r,pool),pick(r,pool),pick(r,pool)])] as Motif[];
 const palette=makePalette(r,climate,coastal),flag=makeFlag(r,palette,motifs),pottery=makePottery(r,palette,craft,motifs),dress=makeDress(r,climate,palette,motifs),architecture=makeArchitecture(r,climate,material,palette,motifs,coastal);
 return {version:1,seed:input.seed,climate,coastal,material,craft,motifs,palette,flag,pottery,dress,architecture,key:[palette.field,palette.accent,flag.key,pottery.key].join('#')};
}
/** Dress for the current season; `garmentOwned` lets the caller pass the unit's real garment so the culture only styles what is actually worn. */
export function dressFor(c:Culture,season:Season,garmentOwned?:GarmentId):Dress{const d=c.dress[season];return garmentOwned?{...d,garment:garmentOwned}:d;}
/** Projection onto the existing flag identity (symbol/pattern/colours) so Societies can adopt it without a new shape. */
export const IDENTITY_FROM_MOTIF:Record<Motif,'sun'|'river'|'mountain'|'sprout'|'star'>={stepped:'mountain',meander:'river',spiral:'sun',wave:'river',lozenge:'star',zigzag:'mountain',dots:'star',comb:'sprout',scroll:'river',lattice:'sprout',chevron:'mountain',radiate:'sun',knot:'star',cloud:'sun',reed:'sprout',feather:'sprout'};
export function toSocietyIdentity(c:Culture){
 // The identity rules need one emblem colour reaching 3:1 against BOTH flag colours, so the second colour
 // is the palette colour closest in lightness to the first that still admits such an emblem.
 const f=c.flag,primary=f.fields[0],inks=[f.chargeColor,c.palette.ground,c.palette.shadow,'#f4ecd8','#1e1a17'];
 const fits=(sec:string)=>inks.find(e=>contrast(primary,e)>=3&&contrast(sec,e)>=3);
 const cands=[f.fields[1],c.palette.accent,c.palette.trim,c.palette.field,c.palette.ground,c.palette.shadow].filter((x):x is string=>!!x&&x!==primary&&!!fits(x)).sort((a,b)=>Math.abs(lum(a)-lum(primary))-Math.abs(lum(b)-lum(primary)));
 let secondary=cands[0];
 if(!secondary){const [h,sat,l]=hexToHsl(primary);secondary=hslToHex(h+24,sat,Math.max(.08,Math.min(.92,l+(l>.5?-.08:.08))));}
 const emblem=fits(secondary)??(contrast(primary,'#f4ecd8')>=contrast(primary,'#1e1a17')?'#f4ecd8':'#1e1a17');
 const pattern=f.division==='plain'?'plain':f.division==='triband-h'||f.division==='horizontal'?'band':'split';
 return {version:1 as const,symbol:IDENTITY_FROM_MOTIF[f.charge==='none'?c.motifs[0]:f.charge],pattern:pattern as 'plain'|'split'|'band',primary,secondary,emblem};
}
