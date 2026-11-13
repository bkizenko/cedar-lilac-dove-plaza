/** Sim-side glue for terrain model v2 (state.terrainModel==='v2'): what the settlement can build, harvest effect of the terrace record, yearly soil loss.
 *  Reads only; the one write (soil loss at the year turn) is done by settlement.crop(). Deterministic. */
import type {Game} from './sim';
import type {Building} from './types';
import {geologyAt} from './mapgen/geology/read';
import {irrigationEnabled,ditchesOf,ditchComplete} from './irrigation';
import {surveySite} from './slopeTiers';
import {terraceKindFor,terraceYield,erosionPerYear,soilLossFactor,soilLossAfter,type TerraceCapability,type CropLike} from './terraceFarming';
import {WATER_Y} from './constants';

export const terrainV2=(g:Pick<Game,'state'>)=>g.state.terrainModel==='v2'&&g.state.slopeModel==='graded';
/** Stone-working: a finished quarry or a metal age. Labour: adults (not children). Irrigation: the opt-in model, a finished ditch, or the Iron Age. */
export function terraceCapability(g:Game,team=0):TerraceCapability{
 const t=g.tribe(team),age=t?.age??0,quarry=g.state.buildings.some(b=>b.team===team&&b.type==='quarry'&&b.hp>0&&b.build>=1);
 const labour=g.state.units.filter(u=>u.team===team&&u.hp>0&&!(u.maturesAt!==undefined&&u.maturesAt>g.state.time)).length;
 const irrigationKnown=irrigationEnabled(g)||age>=2||ditchesOf(g).some(d=>d.team===team&&ditchComplete(d));
 return{age,stonework:age>=1||quarry,labour,irrigationKnown,mountain:g.state.tribes?.[team]?.identity?.symbol==='mountain'};
}
export function groundAt(g:Game,x:number,z:number){
 try{const r=geologyAt({size:g.world.size,mapgen:g.world.mapgen as never},x,z);if(r)return{rockName:r.rockName,hardness:r.hardness,soilDepthMeters:r.soilDepthMeters,landformTag:r.landformTag};}catch{/* no geology on this world */}
 return null;
}
/** Harvest multiplier from the field's terrace record (1 on v1 saves and for fields without one). */
export function terraceYieldFor(g:Game,b:Building,crop:CropLike){
 if(!terrainV2(g))return 1;
 return terraceYield(b.site?.terrace,crop,g.state.weather==='frost')*soilLossFactor(b.soilLoss);
}
const slopeCache=new WeakMap<Building,{key:string;rate:number}>();
/** Share of the soil this field loses in a year of cropping. Terraced fields use the rate stored at layout; a field without a record is treated as unterraced (rival farms are never surveyed). */
export function fieldErosionPerYear(g:Game,b:Building,planted=true){
 const rec=b.site?.terrace;if(rec)return rec.k==='none'?0:Math.round(rec.eros*(planted?1:1.25)*10000)/10000;
 const key=`${b.x}/${b.z}/${b.w}/${b.d}`,old=slopeCache.get(b);if(old?.key===key)return old.rate*(planted?1:1.25);
 const s=surveySite((x,z)=>g.height(x,z),b.x,b.z,b.w,b.d),ground=groundAt(g,b.x,b.z),rate=terraceKindFor(s.meanSlopeDeg)===null?0:erosionPerYear(s.meanSlopeDeg,null,ground?.rockName,true);
 slopeCache.set(b,{key,rate});return rate*(planted?1:1.25);
}
/** Year turn for one field: add the soil it lost. Called by settlement.crop(); nothing happens on v1 saves. */
export function applyYearErosion(g:Game,b:Building,planted:boolean){
 if(!terrainV2(g)||b.type!=='farm')return;
 const loss=soilLossAfter(b.soilLoss,fieldErosionPerYear(g,b,planted));if(loss>0)b.soilLoss=Math.round(loss*10000)/10000;
}
export const altitudeAt=(g:Game,x:number,z:number)=>g.height(x,z)-WATER_Y;
