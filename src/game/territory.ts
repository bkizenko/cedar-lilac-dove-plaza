import type {BldType} from './types';
import {CORNERSTONE_R} from './constants';
const RADII:Partial<Record<BldType,number>>={townhall:34,cornerstone:CORNERSTONE_R,hut:16,farm:14,lumber:18,workshop:16,quarry:16,dock:12,warehouse:22,barracks:18,forge:15,watchtower:28,temple:20,market:18,keep:30,stables:16,university:20,cairn:18,grove:18};
export function influenceRadius(type:BldType){return RADII[type]??14;}
/** Full control through the inner 75%; a continuous sphere fades to zero. */
export function influenceStrength(distance:number,radius:number,strength=1){
 return Math.max(0,Math.min(1,(1-distance/radius)/.25))*strength;
}
