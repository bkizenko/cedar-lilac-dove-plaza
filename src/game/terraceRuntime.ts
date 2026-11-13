/** Sim-side glue for terrain models v2 and v3 (state.terrainModel): what the settlement can build, harvest effect of the terrace record, yearly soil loss.
 *  Reads only; the one write (soil loss at the year turn) is done by settlement.crop(). Deterministic. */
import type {Game} from './sim';
import type {Building} from './types';
import {geologyAt} from './mapgen/geology/read';
import {irrigationEnabled,ditchesOf,ditchComplete} from './irrigation';
import {surveySite} from './slopeTiers';
import {ordinaryErosion,coverFactor,planTerraceUpgrade,terracePreference,terracePressure,leansToTerrace,type TerraceUpgradePlan} from './hillFarming';
import {terraceKindFor,terraceYield,erosionPerYear,soilLossFactor,soilLossAfter,type TerraceCapability,type CropLike} from './terraceFarming';
import {WATER_Y} from './constants';

/** Terrain nuance, terrace records and soil loss are on (model v2 or v3). */
export const terrainV2=(g:Pick<Game,'state'>)=>(g.state.terrainModel==='v2'||g.state.terrainModel==='v3')&&g.state.slopeModel==='graded';
/** v3: hillside farming is ordinary and terraces are an optional upgrade; v2 saves keep terraces assigned by slope. */
export const terrainV3=(g:Pick<Game,'state'>)=>g.state.terrainModel==='v3'&&g.state.slopeModel==='graded';
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
export function fieldErosionPerYear(g:Game,b:Building,planted=true,resting=false){
 const v3=terrainV3(g),cover=v3?coverFactor(planted,resting):planted?1:1.25;
 const rec=b.site?.terrace;if(rec)return rec.k==='none'?(v3?Math.round(rec.eros*cover*10000)/10000:0):Math.round(rec.eros*(v3?cover:planted?1:1.25)*10000)/10000;
 const key=`${b.x}/${b.z}/${b.w}/${b.d}/${v3}`,old=slopeCache.get(b);if(old?.key===key)return old.rate*cover;
 const s=surveySite((x,z)=>g.height(x,z),b.x,b.z,b.w,b.d),ground=groundAt(g,b.x,b.z),rate=terraceKindFor(s.meanSlopeDeg)===null?0:v3?ordinaryErosion(s.meanSlopeDeg,ground?.rockName):erosionPerYear(s.meanSlopeDeg,null,ground?.rockName,true);
 slopeCache.set(b,{key,rate});return rate*cover;
}
/** Year turn for one field: add the soil it lost. Called by settlement.crop(); nothing happens on v1 saves. */
export function applyYearErosion(g:Game,b:Building,planted:boolean){
 if(!terrainV2(g)||b.type!=='farm')return;
 const loss=soilLossAfter(b.soilLoss,fieldErosionPerYear(g,b,planted,b.crop!==undefined&&b.fallowYear===b.crop.year));if(loss>0)b.soilLoss=Math.round(loss*10000)/10000;
}
export const altitudeAt=(g:Game,x:number,z:number)=>g.height(x,z)-WATER_Y;

// ---- terrain model v3: the optional 'Terrace this field' investment ---------------------------------------------------------------------------
const siteGround=(g:Game,b:Building)=>{const r=groundAt(g,b.x,b.z);return r?{rockName:r.rockName,hardness:r.hardness,soilDepthMeters:r.soilDepthMeters,landformTag:r.landformTag}:undefined;};
/** What 'Terrace this field' would do now and cost (a quote; nothing is spent). Only fields of a v3 village that are finished and not yet fully terraced. */
export function terraceUpgradeQuote(g:Game,b:Building):TerraceUpgradePlan|null{
 if(!terrainV3(g)||b.type!=='farm'||!b.site?.terrace)return null;
 const none=(issue:string):TerraceUpgradePlan=>({ok:false,from:b.site!.terrace!.k,to:null,issue,wood:0,stone:0,work:0,label:'Terrace this field',detail:issue});
 if(b.hp<=0||b.build<1)return none('Finish the field first');
 return planTerraceUpgrade((x,z)=>g.height(x,z),{x:b.x,z:b.z,w:b.w,d:b.d},b.site.terrace,terraceCapability(g,b.team),{ground:siteGround(g,b)});
}
export function terraceUpgradeIssue(g:Game,b:Building):string|null{
 const q=terraceUpgradeQuote(g,b);if(!q)return 'This village keeps its terraces as laid out';
 if(!q.ok)return q.issue;if(!g.canAfford(b.team,{wood:q.wood,stone:q.stone}))return `Needs ${[q.wood?`${q.wood} wood`:'',q.stone?`${q.stone} stone`:''].filter(Boolean).join(' and ')}`;return null;
}
/** The action: spend the goods, rebuild the field's record as bunds (or stone-faced strips), and give back half the lost soil (hauled fill). Never called by the sim on its own. */
export function terraceField(g:Game,b:Building):{ok:boolean;reason:string|null}{
 const issue=terraceUpgradeIssue(g,b);if(issue){if(b.team===0)g.banner(issue,3);return{ok:false,reason:issue};}
 const q=terraceUpgradeQuote(g,b)!;g.spend(b.team,{wood:q.wood,stone:q.stone});
 const site=b.site!,tier=q.to==='bund'?'moderate' as const:'steep' as const;
 b.site={...site,tier,foundation:'strips',extraWork:Math.round((site.extraWork+q.work)*10)/10,wood:site.wood+q.wood,stone:site.stone+q.stone,terrace:q.record};
 if(b.soilLoss)b.soilLoss=Math.round(b.soilLoss*.5*10000)/10000;
 if(b.team===0){g.banner(`${b.type==='farm'?'Field':'Plot'} terraced: ${q.detail}`,4);g.addBurst(b.x,b.y+1,b.z,'#c4b494',10);g.onSfx('place');}
 return{ok:true,reason:null};
}
/** Does this people lean toward terracing this field? Advisory only: it highlights the action, it never builds anything. */
export function terraceLean(g:Game,b:Building){
 const rec=b.site?.terrace;if(!terrainV3(g)||!rec||rec.k!=='none'&&rec.k!=='bund')return{preference:0,pressure:0,leans:false};
 const cap=terraceCapability(g,b.team),pref=terracePreference({mountain:cap.mountain,altitude:rec.alt,irrigationKnown:cap.irrigationKnown}),pressure=terracePressure(rec.eros,rec.slope);
 return{preference:pref,pressure,leans:rec.k==='none'&&leansToTerrace(pref,pressure,b.id)};
}
