/** Per-culture, per-era, per-season appearance of the gear a unit ACTUALLY has, as pure part
 * specs in the worker body frame (metres, feet at y=0, +Z forward, body capsule r~.16 from y~.15
 * to ~.95, head centre y~1.05 as in src/scene/meshes.ts). Nothing is invented:
 *   - a garment is drawn only for an owned garment (Unit.garment.item, src/game/textiles.ts);
 *   - padded armor only for an owned asset of kind 'paddedTorso' (src/game/armor.ts);
 *   - the weapon comes from the unit's real type (spearman/archer/swordsman); other types carry none;
 *   - headwear is part of the owned garment's cut (a hood is cut from the coat), never free gear;
 *   - there is no shield, helmet or mail in the simulation, so none is drawn (interface request).
 * Culture chooses cut, headwear, dye and trim motif; era only changes trim richness. Individual
 * variation is a 4-way geometry variant (hem, sash) plus an instance tint, so one shared mesh serves
 * many people. Parts carry a `slot` so a renderer can colour them from `slotColors` (vertex/instance
 * colour); `mat` is the nearest Option H palette material for an uncoloured fallback. */
import {hashSeed,part,beam,partTriangles,seededRandom,type LodTier,type Part} from './buildingParts';
import type {CarvedMaterialId} from './carvedPalette';
import {dressFor,type Culture,type GarmentId,type Motif,type Season,type Dress} from './cultureGrammar';

export type UnitKind='worker'|'spearman'|'archer'|'swordsman'|'cavalry'|'leader'|'warden'|'ranger';
export type Slot='garment'|'trim'|'leather'|'padding'|'stitch'|'wood'|'metal'|'hair';
export type UnitPart=Part&{slot:Slot};
/** Mirrors Unit.garment and the game's ArmorAsset (src/game/armor.ts); nothing else is read. */
export type OwnedGear={garment?:{item:GarmentId;condition:number};armor?:{kind:string;condition:number}};
export type UnitAppearanceInput={type:UnitKind;seed:number;gear:OwnedGear;culture:Culture;season:Season;era?:number;/** armorAffiliationColor(g,team) from the game, for the stitching */affiliation?:string};
export type UnitAppearance={parts:UnitPart[];slotColors:Record<Slot,string>;/** shared-geometry key: same key, same mesh */geometryKey:string;tint:[number,number,number];
 brightness:{garment:number;armor:number};/** what was drawn and why */rendered:{garment?:GarmentId;cut?:Dress['cut'];headwear?:Dress['headwear'];insignia?:UnitKind;armor?:'paddedTorso';weapon?:'spear'|'bow'|'blade'};ignored:string[];fit:{scale:[number,number,number];y:number}};

const SLOT_MAT:Record<Slot,CarvedMaterialId>={garment:'cloth',trim:'woodInlay',leather:'woodDark',padding:'woodMid',stitch:'woodEdge',wood:'trunk',metal:'iron',hair:'recess'};
/** Same constants as src/scene/wornGarments.ts / wornArmor.ts so culture styling stays consistent with what is live. */
export const APPEARANCE_RULES={garmentBrightness:.64,armorBrightness:.60,paddedBase:'#a78b55',paddedStitchDefault:'#c2b080',hair:'#3a2a20',wood:'#8a5a2c',metal:'#7a756d',
 /** how much of the culture's dye each garment takes (skins and hides barely dye) */dye:{lightClothes:.85,woolCoat:.8,leatherClothes:.35,skinClothes:.2,hideCoat:.2} as Record<GarmentId,number>,
 baseColor:{lightClothes:'#d6c4a0',woolCoat:'#a9a28d',leatherClothes:'#70462f',skinClothes:'#a88b61',hideCoat:'#654735'} as Record<GarmentId,string>,
 budget:{near:800,mid:340,far:120}} as const;
/** Mirrors wornGarmentFit so culture parts sit on the same body matrix. */
export const unitFit=(t:UnitKind):UnitAppearance['fit']=>t==='cavalry'?{scale:[1,.72,1],y:.68}:t==='leader'?{scale:[1.65,1,1.65],y:0}:t==='swordsman'?{scale:[1.25,1,1.25],y:0}:{scale:[1,1,1],y:0};

const hex=(v:number[])=>'#'+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')).join('');
const rgb=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
export const mix=(a:string,b:string,t:number)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*t));};

/** Small repeating band at height y round a body of radius r: each motif is a different arrangement of tiny blocks. */
function trimBand(motif:Motif|'none',r:number,y:number,rich:number,slot:Slot='trim'):UnitPart[]{
 if(motif==='none'||rich<=0)return [];
 const n=motif==='dots'||motif==='stepped'||motif==='meander'?10:8,out:UnitPart[]=[];
 for(let i=0;i<n*rich;i++){const a=i/(n*rich)*Math.PI*2,x=Math.sin(a)*r,z=Math.cos(a)*r,up=i%2===0;
  let size:[number,number,number]=[.07,.035,.02],py=y,rot:[number,number,number]=[0,a,0];
  switch(motif){case 'stepped':py=y+(i%4)*.012;break;case 'zigzag':case 'chevron':rot=[0,a,up?.6:-.6];size=[.06,.04,.02];break;case 'dots':case 'knot':case 'radiate':size=[.03,.03,.03];break;case 'wave':case 'scroll':case 'cloud':py=y+Math.sin(i*1.3)*.02;break;case 'lozenge':case 'lattice':rot=[0,a,Math.PI/4];size=[.045,.045,.02];break;default:size=[.07,.03,.02];py=y+(up?0:.03);}
  out.push({...part('box',SLOT_MAT[slot],size,[x,py,z],0,rot),slot});}
 return out;
}
export const P=(slot:Slot,shape:Part['shape'],size:[number,number,number],pos:[number,number,number],lod:LodTier,rot?:[number,number,number],sides?:number):UnitPart=>({...part(shape,SLOT_MAT[slot],size,pos,lod,rot,sides),slot});

export function garmentParts(item:GarmentId,cut:Dress['cut'],v:number,motif:Motif|'none',rich:number):UnitPart[]{
 const out:UnitPart[]=[],long=item==='hideCoat'||item==='woolCoat',hem=(long?.22:item==='lightClothes'?.24:.3)-(v%2?.04:0),top=.88,dia=item==='lightClothes'?.46:item==='skinClothes'?.5:.54,h=top-hem;
 const sash=v>=2;
 switch(cut){
  case 'kilt':{out.push(P('garment','cylinder',[dia*.92,.3,dia*.92],[0,.28,0],2,undefined,8),P('garment','cylinder',[dia*.8,.34,dia*.8],[0,.58,0],2,undefined,8));break;}
  case 'robe':out.push(P('garment','cylinder',[dia*1.05,top-.1,dia*1.05],[0,.1,0],2,undefined,8));break;
  case 'trousers':out.push(P('garment','cylinder',[dia,.46,dia],[0,.42,0],2,undefined,8));for(const x of[-.1,.1])out.push(P('garment','cylinder',[.13,.42,.13],[x,0,.02],1,undefined,6));break;
  case 'poncho':out.push(P('garment','cylinder',[dia*.9,h,dia*.9],[0,hem,0],2,undefined,8),P('garment','cone',[.78,.42,.78],[0,.5,0],1,undefined,8));break;
  case 'cape':out.push(P('garment','cylinder',[dia,h,dia],[0,hem,0],2,undefined,8),P('garment','box',[.42,.6,.05],[0,.3,-.22],1),P('trim','box',[.44,.05,.06],[0,.86,-.22],1));break;
  case 'wrap':out.push(P('garment','cylinder',[dia,h,dia],[0,hem,0],2,undefined,8),P('trim','box',[.5,.05,.04],[0,.62,.2],1,[0,0,.7]),P('garment','box',[.2,.22,.2],[-.2,.66,0],1));break;
  default:out.push(P('garment','cylinder',[dia,h,dia],[0,hem,0],2,undefined,8));}
 if(sash||cut==='tunic')out.push(P('trim','cylinder',[dia*1.02,.05,dia*1.02],[0,.5,0],1,undefined,8));
 // Per-kind signature details (what the live garments already show).
 if(item==='skinClothes')for(let i=0;i<8;i++){const a=i*Math.PI/4;out.push(P('leather','cone',[.07,.1,.07],[Math.sin(a)*dia*.5,hem-.08,Math.cos(a)*dia*.5],0,undefined,3));}
 if(item==='woolCoat')for(const y of[.5,.62,.74])out.push(P('trim','box',[.05,.02,.02],[0,y,dia/2],0));
 if(item==='hideCoat')out.push(P('trim','cylinder',[dia*.86,.06,dia*.86],[0,.84,0],1,undefined,8));
 if(item==='lightClothes')out.push(P('trim','cylinder',[dia*.9,.03,dia*.9],[0,.8,0],1,undefined,8));
 out.push(...trimBand(motif,dia/2+.005,hem+.04,rich));
 return out;
}
export function headwearParts(kind:Dress['headwear'],item:GarmentId,rich=0,v=0):UnitPart[]{
 // Headwear is cut from the owned garment (never free gear); era only adds trim richness, near-LOD only.
 const hood=(item==='hideCoat'||item==='woolCoat'||item==='skinClothes')&&kind==='hood',side=v%2?1:-1;
 switch(kind){
  case 'wrap':return [P('garment','cylinder',[.3,.09,.3],[0,1.07,.02],1,undefined,8),...(rich>=1?[P('garment','cylinder',[.27,.07,.27],[side*.012,1.135,.0],0,[0,.4,0],8)]:[]),...(rich>=2?[P('trim','sphere',[.09,.09,.09],[side*.14,1.08,.1],0),P('trim','cylinder',[.31,.02,.31],[0,1.055,.02],0,undefined,8)]:[])];
  case 'cap':return [P('garment','sphere',[.29,.16,.29],[0,1.1,.02],1),...(rich>=1?[P('trim','cylinder',[.295,.025,.295],[0,1.062,.02],0,undefined,8)]:[]),...(rich>=2?[P('trim','sphere',[.05,.05,.05],[0,1.19,.02],0)]:[])];
  case 'hood':return hood?[P('garment','sphere',[.34,.34,.36],[0,.94,0],1),P('garment','cone',[.22,.2,.22],[0,.82,-.16],0,[.9,0,0],6),...(rich>=1?[P('trim','cylinder',[.31,.025,.31],[0,.8,.0],0,undefined,8)]:[])]:[P('garment','cylinder',[.3,.09,.3],[0,1.07,.02],1,undefined,8)];
  case 'brim':return [P('leather','cylinder',[.5,.02,.5],[0,1.12,.02],1,undefined,10),P('leather','cylinder',[.24,.09,.24],[0,1.12,.02],1,undefined,8),...(rich>=1?[P('trim','cylinder',[.245,.025,.245],[0,1.13,.02],0,undefined,8)]:[]),...(rich>=2?[P('trim','box',[.02,.14,.05],[side*.13,1.2,.0],0,[0,0,side*.5])]:[])];
  case 'band':return [P('trim','cylinder',[.29,.03,.29],[0,1.1,.02],0,undefined,8),...(rich>=2?[P('trim','box',[.045,.06,.02],[0,1.12,.15],0,[0,0,Math.PI/4])]:[])];
  case 'braids':return [-1,1].flatMap(sd=>[P('hair','cylinder',[.05,.32,.05],[sd*.08,.74,-.13],0,undefined,5),...(rich>=1?[P('trim','cylinder',[.065,.03,.065],[sd*.08,.6,-.13],0,undefined,5)]:[])]);
  default:return [];}
}
/** Insignia and banners are cut from the owned garment's cloth (a sash, shoulder cloth, chest patch, a leader's standard);
 * they are never free gear, appear only on a drawn garment, and only at near LOD. Era only adds richness. */
export function insigniaParts(type:UnitKind,rich:number,v:number):UnitPart[]{
 const side=v%2?1:-1;
 switch(type){
  case 'worker':return rich>=1?[P('trim','box',[.5,.05,.03],[0,.7,.19],0,[0,0,side*.65])]:[];
  case 'spearman':case 'archer':case 'ranger':return [P('trim','box',[.17,.04,.2],[-side*.2,.82,0],0),...(rich>=2?[P('trim','box',[.17,.015,.21],[-side*.2,.86,0],0)]:[])];
  case 'swordsman':case 'warden':return [P('trim','box',[.15,.15,.02],[0,.72,.265],0)];
  case 'leader':return [P('trim','box',[.17,.17,.02],[0,.72,.265],0),P('wood','cylinder',[.035,1.7,.035],[-.3,.85,-.1],0,undefined,5),P('garment','box',[.42,.34,.02],[-.3+.21,1.55,-.1],0),P('trim','box',[.42,.05,.022],[-.3+.21,1.7,-.1],0),...(rich>=1?[P('trim','box',[.2,.2,.024],[-.3+.21,1.52,-.1],0,[0,0,Math.PI/4])]:[]),...(rich>=2?[P('trim','sphere',[.07,.07,.07],[-.3,1.72,-.1],0)]:[])];
  default:return [];}
}
export function armorParts(motif:Motif|'none',rich:number):UnitPart[]{
 // Sleeveless quilted torso, as in wornArmor.ts: shell, quilting rows, shoulder pads, belt.
 const out:UnitPart[]=[P('padding','cylinder',[.56,.49,.5],[0,.34,0],2,undefined,8),P('stitch','cylinder',[.58,.04,.52],[0,.34,0],1,undefined,8),P('stitch','box',[.08,.07,.03],[0,.36,.27],0)];
 for(const y of[.46,.57,.68,.79])out.push(P('stitch','box',[.4,.025,.02],[0,y,.255],0));
 for(const s of[-1,1])out.push(P('padding','box',[.07,.11,.24],[s*.205,.74,0],1));
 return [...out,...trimBand(motif==='none'?'none':motif,.285,.8,Math.min(1,rich))];
}
export function weaponParts(type:UnitKind):{parts:UnitPart[];weapon?:'spear'|'bow'|'blade'}{
 if(type==='spearman')return {weapon:'spear',parts:[{...beam('trunk',[.22,.1,.1],[.3,1.9,.7],.05,2),slot:'wood'},P('metal','pyramid',[.09,.2,.09],[.3,1.9,.7],1,[0,0,0],undefined)]};
 if(type==='archer')return {weapon:'bow',parts:[{...beam('trunk',[.22,.5,.05],[.22,.8,.2],.04,1),slot:'wood'},{...beam('trunk',[.22,.8,.2],[.22,1.1,.05],.04,1),slot:'wood'},{...beam('woodInlay',[.22,.5,.05],[.22,1.1,.05],.015,0),slot:'trim'}]};
 if(type==='swordsman')return {weapon:'blade',parts:[P('metal','box',[.06,.7,.04],[.25,.55,.1],2,[0,0,-.4]),P('wood','box',[.14,.04,.05],[.25,.5,.1],1,[0,0,-.4]),P('wood','box',[.05,.14,.05],[.23,.42,.1],0,[0,0,-.4])]};
 return {parts:[]};
}
export function unitAppearance(input:UnitAppearanceInput):UnitAppearance{
 const {type,gear,culture,season}=input,era=input.era??1,rich=era>=3?2:era>=2?1:0,ignored:string[]=[],parts:UnitPart[]=[],rendered:UnitAppearance['rendered']={};
 const v=hashSeed(input.seed,'variant')%4,tr=seededRandom(hashSeed(input.seed,'tint'));
 const g=gear.garment&&Number.isFinite(gear.garment.condition)&&gear.garment.condition>0?gear.garment:undefined;
 const dress=g?dressFor(culture,season,g.item):dressFor(culture,season);
 if(g){rendered.garment=g.item;rendered.cut=dress.cut;parts.push(...garmentParts(g.item,dress.cut,v,dress.trimMotif,rich));const hw=headwearParts(dress.headwear,g.item,rich,v);if(hw.length){rendered.headwear=dress.headwear;parts.push(...hw);}const ins=insigniaParts(type,rich,v);if(ins.length){rendered.insignia=type;parts.push(...ins);}}
 else if(gear.garment)ignored.push('garment with no condition left is not drawn');
 if(gear.armor){if(gear.armor.kind==='paddedTorso'&&gear.armor.condition>0){rendered.armor='paddedTorso';parts.push(...armorParts(culture.flag.border,rich));}else ignored.push(`armor kind '${gear.armor.kind}' is not a known asset kind`);}
 const w=weaponParts(type);if(w.weapon){rendered.weapon=w.weapon;parts.push(...w.parts);}
 const base=g?APPEARANCE_RULES.baseColor[g.item]:'#a88b61',dye=g?APPEARANCE_RULES.dye[g.item]:0,garmentColor=mix(base,dress.body,dye),trimColor=mix(garmentColor,dress.trim,.9);
 const slotColors:Record<Slot,string>={garment:garmentColor,trim:trimColor,leather:mix(APPEARANCE_RULES.baseColor.leatherClothes,culture.palette.shadow,.25),padding:mix(APPEARANCE_RULES.paddedBase,culture.palette.field,.22),stitch:input.affiliation??APPEARANCE_RULES.paddedStitchDefault,wood:APPEARANCE_RULES.wood,metal:APPEARANCE_RULES.metal,hair:APPEARANCE_RULES.hair};
 const tint:[number,number,number]=[1+(tr()-.5)*.1,1+(tr()-.5)*.1,1+(tr()-.5)*.1],bright=(base:number,c:number)=>Math.round((base+(1-base)*Math.max(0,Math.min(1,c)))*1000)/1000;
 return {parts,slotColors,geometryKey:[type,rendered.garment??'-',rendered.cut??'-',rendered.headwear??'-',rendered.insignia??'-',rendered.armor??'-',dress.trimMotif,rich,v,rendered.armor?culture.flag.border:'-'].join('|'),tint,
  brightness:{garment:bright(APPEARANCE_RULES.garmentBrightness,g?.condition??0),armor:bright(APPEARANCE_RULES.armorBrightness,gear.armor?.condition??0)},rendered,ignored,fit:unitFit(type)};
}
export const appearanceTriangles=(a:UnitAppearance,tier:LodTier)=>a.parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier).reduce((s,p)=>s+partTriangles(p),0);
