/** Optional save field `state.wonders`: wonders standing or rising in the world. The wonder construction lane writes these records
 * (see wonderEarthworks.ts / wonderSites.ts for sites and cuts); the renderer (scene/wonderLayer.ts) only reads them and draws each through
 * its owner's CivSkin. Old saves have none. */
import type {WonderFunction} from '../scene/wonderKit';
export const WONDER_FAMILIES=['observatory','terraceGarden','harbor','millMarket','cistern','assembly'] as const;
/** Paid labour of a wonder that is still rising (src/game/wonderFounding.ts). Goods are spent when work starts; the labour is real crew seconds. */
export type WonderProject={labour:number;need:number;crewIds:number[];started:number;paid:{wood:number;stone:number;food:number}};
export type WonderRecord={id:number;team:number;family:WonderFunction;x:number;z:number;w:number;d:number;/** radians about +Y */yaw:number;seed:number;/** 0..1 build progress */progress:number;era?:number;wealth?:number;
 /** present while crews are still raising it */project?:WonderProject;founded?:number;done?:number;waiting?:string};
const fin=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const validProject=(p:unknown)=>{if(p===undefined)return true;const q=p as WonderProject;return !!q&&fin(q.labour)&&fin(q.need)&&q.need>0&&fin(q.started)&&Array.isArray(q.crewIds)&&q.crewIds.length<=8&&q.crewIds.every(Number.isSafeInteger)&&!!q.paid&&fin(q.paid.wood)&&fin(q.paid.stone)&&fin(q.paid.food);};
export const validWonderRecord=(r:unknown):r is WonderRecord=>{const w=r as WonderRecord;return !!w&&Number.isInteger(w.id)&&Number.isInteger(w.team)&&typeof w.family==='string'&&[w.x,w.z,w.w,w.d,w.yaw,w.seed,w.progress].every(Number.isFinite)&&w.w>=16&&w.w<=80&&w.d>=16&&w.d<=80&&w.progress>=0&&w.progress<=1&&(WONDER_FAMILIES as readonly string[]).includes(w.family)&&validProject(w.project);};
