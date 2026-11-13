/** ITEM STYLE: how one society makes its tools and weapons. Wood it prefers, how it binds, what it hangs from a haft, the form of its pommels,
 *  guards, blade outlines, pots and baskets, its decoration and the maker's mark of the workshop.
 *
 *  BLUF: `itemStyleFor(skinId)` is a pure function of the registry skin (preset civ, palette, people look). Every civ bible has a hand-set
 *  row; remixed and free skins inherit the row of their base civ and shift colours from their own palette, so no two skins look alike. */
import {hash32,mixHexColour} from './itemMesh';
import type {MatId} from './itemMaterials';
import {skinById} from './civSkin';
import {CIVS} from './civStyles';
import {LOOKS,lookForSkin,type ShieldShape,type HelmStyle} from './peopleLook';
import type {CivId} from './civStyles';

export type Pommel='disc'|'ball'|'crescent'|'wheel'|'antenna'|'none';
export type Guard='straight'|'down'|'disc'|'none'|'knuckle';
export type Tassel='horsehair'|'feather'|'ribbon'|'wool'|'shells'|'none';
export type Decor='bands'|'chevron'|'dots'|'spiral'|'notches'|'steps'|'none';
export type BladeForm='leaf'|'straight'|'curved'|'sickle';
export type PotForm='round'|'amphora'|'bowl'|'tall';
export type WrapKind='sinew'|'leather'|'cord'|'rattan'|'wire';
export type ItemStyle={
 civ:string;/** the banner emblem id of this society (painted on shields) */emblem:string;/** preferred hafting wood and a second, harder wood for limbs and handles */wood:MatId;wood2:MatId;
 wrapKind:WrapKind;wrap:MatId;/** hex of dyed cord/ribbon/felt */cordColour:string;trim:string;accent:string;field:string;
 pommel:Pommel;guard:Guard;tassel:Tassel;decor:Decor;bladeForm:BladeForm;potForm:PotForm;shield:ShieldShape;helm:HelmStyle;
 /** the knapping stone this society works first */stone:MatId;/** metal warmth: -1 cool/greyer .. +1 warm/redder */metalWarmth:number;
 /** workshop maker's mark: 0..3 stamped dots/notches, and a mark shape index */maker:number;markShape:number;/** feather colours for fletching and tassels */fletch:[string,string];
};
const ROW:Record<CivId|string,Partial<ItemStyle>&{wood:MatId}>={
 aureline:{wood:'ash',wood2:'oak',wrapKind:'leather',wrap:'leather',cordColour:'#9a2f26',pommel:'disc',guard:'straight',tassel:'horsehair',decor:'bands',bladeForm:'leaf',potForm:'amphora',stone:'chert',metalWarmth:.2},
 hanrei:{wood:'bamboo',wood2:'bamboo',wrapKind:'cord',wrap:'linen',cordColour:'#a3342a',pommel:'ball',guard:'disc',tassel:'ribbon',decor:'steps',bladeForm:'straight',potForm:'tall',stone:'flint',metalWarmth:-.1},
 steppan:{wood:'birch',wood2:'yew',wrapKind:'sinew',wrap:'sinew',cordColour:'#7a2d1e',pommel:'crescent',guard:'none',tassel:'horsehair',decor:'chevron',bladeForm:'curved',potForm:'bowl',stone:'flint',metalWarmth:.05},
 sandrill:{wood:'elm',wood2:'ebony',wrapKind:'leather',wrap:'rawhide',cordColour:'#b3552e',pommel:'none',guard:'down',tassel:'none',decor:'dots',bladeForm:'curved',potForm:'round',stone:'obsidian',metalWarmth:.3},
 kaaltun:{wood:'cedar',wood2:'ebony',wrapKind:'cord',wrap:'cord',cordColour:'#2d6a5a',pommel:'none',guard:'none',tassel:'feather',decor:'spiral',bladeForm:'leaf',potForm:'round',stone:'obsidian',metalWarmth:.1},
 mekhari:{wood:'bamboo',wood2:'willow',wrapKind:'rattan',wrap:'wicker',cordColour:'#2f6c82',pommel:'none',guard:'none',tassel:'shells',decor:'chevron',bladeForm:'leaf',potForm:'bowl',stone:'chert',metalWarmth:.1},
 skoldar:{wood:'ash',wood2:'oak',wrapKind:'leather',wrap:'leather',cordColour:'#3d5d86',pommel:'ball',guard:'straight',tassel:'none',decor:'notches',bladeForm:'leaf',potForm:'round',stone:'flint',metalWarmth:-.25},
 nilemark:{wood:'willow',wood2:'elm',wrapKind:'cord',wrap:'linen',cordColour:'#c8a23a',pommel:'disc',guard:'none',tassel:'feather',decor:'bands',bladeForm:'sickle',potForm:'tall',stone:'chert',metalWarmth:.35},
 tigrane:{wood:'cedar',wood2:'oak',wrapKind:'wire',wrap:'cord',cordColour:'#2a4f8f',pommel:'disc',guard:'straight',tassel:'ribbon',decor:'chevron',bladeForm:'leaf',potForm:'amphora',stone:'flint',metalWarmth:.25},
 rusvolt:{wood:'pine',wood2:'birch',wrapKind:'leather',wrap:'leather',cordColour:'#8a2a2a',pommel:'wheel',guard:'straight',tassel:'wool',decor:'notches',bladeForm:'straight',potForm:'round',stone:'flint',metalWarmth:-.15},
 vedara:{wood:'cedar',wood2:'ebony',wrapKind:'cord',wrap:'cord',cordColour:'#b5392a',pommel:'disc',guard:'disc',tassel:'ribbon',decor:'spiral',bladeForm:'curved',potForm:'amphora',stone:'chert',metalWarmth:.3},
 sahelan:{wood:'ebony',wood2:'elm',wrapKind:'leather',wrap:'leather',cordColour:'#c28b2a',pommel:'none',guard:'none',tassel:'shells',decor:'dots',bladeForm:'leaf',potForm:'round',stone:'obsidian',metalWarmth:.2},
 quillan:{wood:'cedar',wood2:'pine',wrapKind:'cord',wrap:'wool',cordColour:'#b53a3a',pommel:'ball',guard:'none',tassel:'wool',decor:'steps',bladeForm:'leaf',potForm:'bowl',stone:'obsidian',metalWarmth:.15},
 brythen:{wood:'yew',wood2:'ash',wrapKind:'leather',wrap:'leather',cordColour:'#2f6a45',pommel:'antenna',guard:'down',tassel:'none',decor:'spiral',bladeForm:'leaf',potForm:'round',stone:'flint',metalWarmth:.15},
};
const FALLBACK_CIV='aureline';
const cache=new Map<string,ItemStyle>();
/** The style of one skin (registry id, `civ:` id, or none for the neutral village). */
export function itemStyleFor(skinId?:string|null):ItemStyle{
 const key=skinId??'neutral';const hit=cache.get(key);if(hit)return hit;
 const skin=skinId?skinById(skinId)??skinById('civ:'+skinId)??skinById(String(skinId).replace(/^civ:/,'')):undefined;
 const civ=((skin?.preset??skin?.grammar)||(ROW[String(skinId??'').replace(/^civ:/,'')]?String(skinId).replace(/^civ:/,''):FALLBACK_CIV)) as string,row=ROW[civ]??ROW[FALLBACK_CIV];
 const look=skin?lookForSkin(skin):LOOKS[civ as CivId]??LOOKS.aureline,h=hash32('item-style',skin?.id??'neutral'),acc=skin?.palette?.accent.hex??'#c9a23c',field=skin?.garb?.body??'#8a7a5a',trim=skin?.garb?.trim??'#c9a23c';
 const remix=!!skin&&(skin.mode==='remix'||skin.mode==='free'||skin.mode==='generated');
 const woods:MatId[]=['ash','oak','yew','birch','bamboo','cedar','pine','elm','willow'];
 const s:ItemStyle={
  civ,emblem:skin?.banner?.emblem??CIVS[civ as CivId]?.emblem?.id??'sunDisc',wood:remix&&h%3===0?woods[(h>>>3)%woods.length]:row.wood,wood2:row.wood2??row.wood,wrapKind:row.wrapKind??'leather',wrap:row.wrap??'leather',
  cordColour:remix?mixHexColour(row.cordColour??'#9a2f26',acc,.55):row.cordColour??'#9a2f26',trim,accent:acc,field,
  pommel:row.pommel??'ball',guard:row.guard??'straight',tassel:row.tassel??'none',decor:row.decor??'bands',bladeForm:row.bladeForm??'leaf',potForm:row.potForm??'round',
  shield:look.shield,helm:look.helm,stone:row.stone??'flint',metalWarmth:row.metalWarmth??0,maker:h%4,markShape:(h>>>5)%6,
  fletch:[mixHexColour('#e6e0cf',acc,.1),mixHexColour('#3d3d3a',acc,.5)],
 };
 if(remix&&h%5===0)s.pommel=(['disc','ball','crescent','wheel','none'] as Pommel[])[(h>>>9)%5];
 if(remix&&h%7===0)s.decor=(['bands','chevron','dots','spiral','notches','steps'] as Decor[])[(h>>>11)%6];
 cache.set(key,s);return s;
}
export const NEUTRAL_STYLE=()=>itemStyleFor(null);
