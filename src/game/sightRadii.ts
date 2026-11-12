import {DOCK_R} from './constants.ts';
import {FORTIFICATIONS} from './fortifications.ts';
import type {Unit,Building} from './types.ts';

/** Single source of team-0 sight radii (metres), used by Game.updateVision and
 * the fog provenance tracer so attribution can never use a divergent table. */
export function unitSightRadius(u:Pick<Unit,'type'>){return u.type==='archer'||u.type==='ranger'?16:u.type==='worker'?11:13;}
export function buildingSightRadius(b:Pick<Building,'type'>,finished:boolean,armyAge:boolean){
 return b.type==='watchtower'?(armyAge?30:22):b.type==='townhall'?18:b.type==='dock'&&finished?DOCK_R+4:FORTIFICATIONS.includes(b.type)?5:12;
}
