/** What each good looks like when carried, stocked or dropped (Option H carved
 * style). Pure data + part builders, shared by caravan models, market stalls,
 * dropped parcels and the trade dialog icons. Only goods the simulation
 * actually holds are drawn; nothing here invents stock. Kinds follow
 * src/game/types.ts ResKind/FoodKind plus common crafted goods; an unknown
 * kind falls back to a plain crate so new goods never crash the renderer. */
import {part,type Part} from './buildingParts';
import type {CarvedMaterialId} from './carvedPalette';

export type LoadStyle='sack'|'basket'|'logs'|'block'|'ingots'|'pots'|'jug'|'coil'|'bundle'|'crate';
export type GoodVisual={icon:string;style:LoadStyle;mat:CarvedMaterialId;/** amount one carried unit stands for */unit:number};
export const GOODS_VISUAL:Record<string,GoodVisual>={
 grain:{icon:'grain',style:'sack',mat:'cloth',unit:20},pulses:{icon:'pulses',style:'sack',mat:'woodLight',unit:20},tubers:{icon:'tubers',style:'basket',mat:'thatch',unit:15},
 berries:{icon:'berries',style:'basket',mat:'thatch',unit:10},provisions:{icon:'provisions',style:'basket',mat:'woodLight',unit:12},bread:{icon:'bread',style:'basket',mat:'plaster',unit:10},porridge:{icon:'porridge',style:'pots',mat:'tile',unit:8},
 fish:{icon:'fish',style:'basket',mat:'plaster',unit:10},driedFish:{icon:'fish',style:'bundle',mat:'woodLight',unit:12},smokedFish:{icon:'fish',style:'bundle',mat:'woodDark',unit:12},cookedFish:{icon:'fish',style:'basket',mat:'plaster',unit:8},
 meat:{icon:'meat',style:'bundle',mat:'woodDark',unit:10},driedMeat:{icon:'meat',style:'bundle',mat:'woodDark',unit:12},smokedMeat:{icon:'meat',style:'bundle',mat:'woodEdge',unit:12},milk:{icon:'milk',style:'jug',mat:'plaster',unit:8},
 wood:{icon:'wood',style:'logs',mat:'trunk',unit:10},stone:{icon:'stone',style:'block',mat:'stone',unit:8},copper:{icon:'copper',style:'ingots',mat:'tile',unit:6},iron:{icon:'iron',style:'ingots',mat:'iron',unit:6},
 cordage:{icon:'cordage',style:'coil',mat:'thatch',unit:6},pottery:{icon:'pot',style:'pots',mat:'tile',unit:6},hides:{icon:'hide',style:'bundle',mat:'woodMid',unit:6},cloth:{icon:'cloth',style:'bundle',mat:'cloth',unit:8},
};
const FALLBACK:GoodVisual={icon:'parcel',style:'crate',mat:'woodLight',unit:10};
export const goodVisual=(kind:string):GoodVisual=>GOODS_VISUAL[kind]??FALLBACK;
export const goodIconId=(kind:string)=>goodVisual(kind).icon;

/** Parts for ONE carried unit with its base centre at (x,y,z); `rotY` turns it. Each is <= ~0.5 m and rests on y. */
export function loadUnitParts(kind:string,x:number,y:number,z:number,lod:0|1|2=0,rotY=0):Part[]{
 const v=goodVisual(kind),R:[number,number,number]=[0,rotY,0];
 switch(v.style){
  case 'sack':return [part('box',v.mat,[.46,.32,.3],[x,y,z],lod,R),part('box','woodEdge',[.12,.08,.12],[x,y+.32,z],0,R)];
  case 'basket':return [part('cylinder','thatch',[.4,.26,.34],[x,y,z],lod,undefined,6),part('box',v.mat,[.3,.1,.26],[x,y+.24,z],0,R)];
  case 'logs':return [part('cylinder',v.mat,[.14,.9,.12],[x-.45,y+.07,z-.1],lod,[0,rotY,-Math.PI/2],5),part('cylinder',v.mat,[.14,.9,.12],[x-.45,y+.07,z+.1],lod,[0,rotY,-Math.PI/2],5),part('cylinder',v.mat,[.14,.9,.12],[x-.45,y+.2,z],0,[0,rotY,-Math.PI/2],5)];
  case 'block':return [part('box',v.mat,[.4,.3,.34],[x,y,z],lod,R),part('box','stoneDark',[.4,.04,.34],[x,y+.3,z],0,R)];
  case 'ingots':return [part('box',v.mat,[.32,.12,.15],[x,y,z-.09],lod,R),part('box',v.mat,[.32,.12,.15],[x,y,z+.09],lod,R),part('box',v.mat,[.32,.12,.15],[x,y+.12,z],0,R)];
  case 'pots':return [part('cylinder',v.mat,[.3,.3,.18],[x-.12,y,z],lod,undefined,6),part('cylinder',v.mat,[.26,.26,.16],[x+.14,y,z+.04],0,undefined,6)];
  case 'jug':return [part('cylinder',v.mat,[.24,.38,.16],[x-.1,y,z],lod,undefined,6),part('cylinder',v.mat,[.22,.34,.14],[x+.12,y,z],0,undefined,6)];
  case 'coil':return [part('cylinder',v.mat,[.42,.16,.42],[x,y,z],lod,undefined,8),part('cylinder','woodDark',[.16,.18,.16],[x,y,z],0,undefined,5)];
  case 'bundle':return [part('box',v.mat,[.5,.2,.3],[x,y,z],lod,R),part('box','woodEdge',[.06,.22,.32],[x,y,z],0,R)];
  default:return [part('box',v.mat,[.4,.3,.4],[x,y,z],lod,R),part('box','woodEdge',[.42,.04,.06],[x,y+.12,z],0,R)];
 }
}
