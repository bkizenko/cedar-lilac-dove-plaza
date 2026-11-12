import{rawCerealField,CEREAL_RULES}from'./cerealRules';
import {fieldTerrain} from './fieldTerrain';
import {plotArea,fieldCrewSlots} from './plots';
import type {Game} from './sim';
import type {Building} from './types';
import {calendar,farmHarvestEstimate} from './settlement';
import {GATHER_WORK_RATE} from './constants';

/** Estimates use current soil/water and never credit food before a delivery. */
export function fieldProductionReport(g:Game,b:Building){
  const cal=calendar(g),c=b.crop?.year===cal.year?b.crop:undefined;
  const fallow=b.fallowYear===cal.year;
  const planted=c?.planted||0,tended=c?.tended||0;
  const pace=GATHER_WORK_RATE*(b.team===0&&g.state.agePicks[3]==='econ'?1.4:1);
  const work=cal.phase===0?(1-planted)*180/pace:cal.phase===1&&planted>0?(1-tended)*220/pace:0;
  const stage=fallow?'Fallow':cal.phase===0?'Sow now':cal.phase===1?(planted>0?'Tend now':'Spring sowing missed'):cal.phase===2?'Harvest now':'Winter — prepare for spring';
  const potential=farmHarvestEstimate(g,b,1,1,c?.water??1),harvest=fallow||cal.phase===3?0:cal.phase===2?(c?.remaining||0):farmHarvestEstimate(g,b,planted,tended,c?.water??1),processing=rawCerealField(b),edible=processing?1-CEREAL_RULES.seedFraction:1;
  const areaSquareMetres=b.w*b.d;
  const sowSeconds=180*plotArea(b)/pace,tendSeconds=220*plotArea(b)/pace;
  const harvestSeconds=Math.ceil(potential/2)*.8/pace;
  return {
    areaSquareMetres,sowSeconds,tendSeconds,harvestSeconds,
    harvestUnitsPerSquareMetre:potential/Math.max(1,areaSquareMetres),
    requiresProcessing:processing,sheaves:processing?harvest*CEREAL_RULES.sheavesPerPotentialGrain:0,
    soil:Math.round(fieldTerrain(g,b).soil*100),water:Math.round((c?.water??1)*100),
    stage,kind:c?.kind||b.cropType||'grain',
    staff:g.state.units.filter(u=>u.hp>0&&u.node===b&&u.order==='gather').length,
    projected:harvest*edible,
    potential:potential*edible,
    workSeconds:fallow?0:Math.ceil(work*plotArea(b)),
    workerSlots:fieldCrewSlots(b),
  };
}

export function fieldProductionSummary(g:Game,b:Building){
  const r=fieldProductionReport(g,b);
  if(r.requiresProcessing)return `${r.stage} · ${r.staff}/${r.workerSlots} workers · ${r.sheaves.toFixed(0)} unthreshed sheaves ${calendar(g).phase===2?'left in field':'projected'} · ${r.projected.toFixed(1)} clean grain after threshing/winnowing, with 8% reserved as seeds${r.workSeconds?` · ${r.workSeconds}s field work remaining`:''}`;
  return `${r.stage} · ${r.staff}/${r.workerSlots} workers · ${r.projected} ${r.kind} ${calendar(g).phase===2?'left to carry home':'projected'} · up to ${r.potential} per harvest with full care at current conditions${r.workSeconds?` · ${r.workSeconds}s hands-on work remaining before tool bonuses`:''}`;
}
