/** Optional save field `state.wonders`: wonders standing or rising in the world. The wonder construction lane writes these records
 * (see wonderFounding.ts, wonderSites.ts, wonderEarthworks.ts); the renderer (scene/wonderLayer.ts) only reads them and draws each through
 * its owner's CivSkin. `family` is a registry id (wonderDefs.ts). Old saves have none; records written before the registry carry one of the
 * six original ids and load unchanged (every field added since is optional). */
import type {WonderKind} from '../scene/wonderKit';
import {WONDER_IDS} from './wonderDefs';
export const WONDER_FAMILIES:readonly string[]=WONDER_IDS;
/** A saved look: the kit choices the player pinned (or copied from a preset) for this wonder; unpinned ones come from the seed. */
export type WonderLook={crown?:string;axis?:'processional'|'cross'|'radial'|'linear'|'spiral';enclosure?:'wall'|'colonnade'|'none';water?:boolean;density?:number};
/** Paid labour of a wonder that is still rising (src/game/wonderFounding.ts). Goods come out of the stock stage by stage when a crew member stands at the site
 * (`delivered` stages are paid); the labour is real crew seconds. Records from before staging have no `delivered` and count as fully paid. */
export type WonderPaid={wood:number;stone:number;food:number;copper?:number;iron?:number};
export type WonderProject={labour:number;need:number;crewIds:number[];started:number;paid:WonderPaid;delivered?:number};
export type WonderRecord={id:number;team:number;family:WonderKind;x:number;z:number;w:number;d:number;/** radians about +Y */yaw:number;seed:number;/** 0..1 build progress */progress:number;era?:number;wealth?:number;
 /** present while crews are still raising it */project?:WonderProject;founded?:number;done?:number;waiting?:string;look?:WonderLook;/** game time it fell into ruin (its society is gone); the ruin site lives in state.ruins */fallen?:number};
const fin=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const opt=(v:unknown)=>v===undefined||fin(v);
const validProject=(p:unknown)=>{if(p===undefined)return true;const q=p as WonderProject;return !!q&&fin(q.labour)&&fin(q.need)&&q.need>0&&fin(q.started)&&Array.isArray(q.crewIds)&&q.crewIds.length<=8&&q.crewIds.every(Number.isSafeInteger)&&!!q.paid&&fin(q.paid.wood)&&fin(q.paid.stone)&&fin(q.paid.food)&&opt(q.paid.copper)&&opt(q.paid.iron)&&(q.delivered===undefined||Number.isInteger(q.delivered)&&q.delivered>=0&&q.delivered<=4);};
export const validLook=(l:unknown)=>{if(l===undefined)return true;const o=l as WonderLook;if(!o||typeof o!=='object'||Array.isArray(o))return false;
 if(Object.keys(o).some(k=>!['crown','axis','enclosure','water','density'].includes(k)))return false;
 return(o.crown===undefined||typeof o.crown==='string'&&/^[a-zA-Z]{2,20}$/.test(o.crown))&&(o.axis===undefined||['processional','cross','radial','linear','spiral'].includes(o.axis))&&(o.enclosure===undefined||['wall','colonnade','none'].includes(o.enclosure))&&(o.water===undefined||typeof o.water==='boolean')&&(o.density===undefined||typeof o.density==='number'&&o.density>=0&&o.density<=1);};
export const validWonderRecord=(r:unknown):r is WonderRecord=>{const w=r as WonderRecord;return !!w&&Number.isInteger(w.id)&&Number.isInteger(w.team)&&typeof w.family==='string'&&[w.x,w.z,w.w,w.d,w.yaw,w.seed,w.progress].every(Number.isFinite)&&w.w>=16&&w.w<=80&&w.d>=16&&w.d<=80&&w.progress>=0&&w.progress<=1&&WONDER_FAMILIES.includes(w.family)&&validProject(w.project)&&validLook(w.look)&&opt(w.fallen);};
