/** Optional save field `state.wonders`: wonders standing or rising in the world. The wonder construction lane writes these records
 * (see wonderEarthworks.ts / wonderSites.ts for sites and cuts); the renderer (scene/wonderLayer.ts) only reads them and draws each through
 * its owner's CivSkin. Old saves have none. */
import type {WonderFunction} from '../scene/wonderKit';
export type WonderRecord={id:number;team:number;family:WonderFunction;x:number;z:number;w:number;d:number;/** radians about +Y */yaw:number;seed:number;/** 0..1 build progress */progress:number;era?:number;wealth?:number};
export const validWonderRecord=(r:unknown):r is WonderRecord=>{const w=r as WonderRecord;return !!w&&Number.isInteger(w.id)&&Number.isInteger(w.team)&&typeof w.family==='string'&&[w.x,w.z,w.w,w.d,w.yaw,w.seed,w.progress].every(Number.isFinite)&&w.w>=16&&w.w<=80&&w.d>=16&&w.d<=80;};
