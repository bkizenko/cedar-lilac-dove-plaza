import type {Game} from './sim';
import {CROPS,cropTrialWorkplace} from './cultivation';
import {calendar,YEAR_SECONDS} from './settlement';
export type FarmingProgress={stage:string;detail:string;completed?:number;required?:number;action:'knowledge'|'field'};
/** Read-only summary: never initializes crops, advances work or promises an arrival time. */
export function farmingProgress(g:Game):FarmingProgress {
 const t=g.tribe(0),trial=t.cropTrial,paused=g.state.paused?' Paused — resume play for travel and work.':'';
 if(trial){const person=g.state.units.find(u=>u.team===0&&u.hp>0&&u.studyCrop===trial.kind),remaining=Math.max(0,trial.duration-trial.progress);
  return {stage:`${trial.kind} seed trial · ${Math.round(100*trial.progress/trial.duration)}%`,detail:`${remaining.toFixed(0)} work seconds remain. ${person?(person.workReason||`${person.name||'Resident'} assigned`):'No experimenter assigned; resume the trial in Knowledge.'}${paused}`,completed:trial.progress,required:trial.duration,action:'knowledge'};}
 if(!t.cultivated?.length){
  const kind=CROPS.find(k=>(t.cropSamples?.[k]||0)>=4),samples=Math.max(0,...CROPS.map(k=>t.cropSamples?.[k]||0));
  const carried=g.state.units.filter(u=>u.team===0&&u.hp>0).reduce((sum,u)=>sum+Object.values(u.seedSamples||{}).reduce((n,v)=>n+(v||0),0),0);
  const workplace=cropTrialWorkplace(g,0),place=workplace?.kind==='camp'?'camp seed patch':'hearth';
  return {stage:kind?'Seeds ready for a trial':'Learning cultivation',detail:`${samples.toFixed(1)}/4 samples of one crop delivered${carried?` · ${carried.toFixed(1)} still carried`:''}. ${!workplace?'No active camp or hearth is available.':kind?(g.state.autoWorkEnabled===false?'Choose Test seeds in Knowledge; Auto work is off.':`An available adult must reach the ${place} and test seeds.`):'Gather wild crop plants and bring the harvest home.'}${paused}`,completed:Math.min(4,samples),required:4,action:'knowledge'};
 }
 const fields=g.state.buildings.filter(b=>b.team===0&&b.type==='farm'&&b.hp>0),finished=fields.filter(b=>g.finished(b));
 if(!finished.length)return {stage:'Cultivation learned',detail:fields.length?'A field is marked; ground preparation must finish before sowing.':`Learned ${t.cultivated.join(', ')}. Mark a field site; keep 4 seed baskets for planting.`,action:'field'};
 const raw=g.tribe(0).items?.grainSheaves||0,rough=g.tribe(0).items?.roughGrain||0;if(raw||rough)return{stage:'Cereal harvest needs processing',detail:`${raw.toFixed(0)} sheaves · ${rough.toFixed(0)} grain with chaff. Choose threshing/winnowing at a hearth or prepared floor, or enable Auto work. These materials are not edible grain.${paused}`,action:'knowledge'};
 const cal=calendar(g),current=finished.filter(b=>b.crop?.year===cal.year),planted=current.filter(b=>(b.crop?.planted||0)>0),workers=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.order==='gather'&&u.node&&finished.includes(u.node as typeof finished[number])).length;
 if(cal.phase===0){const progress=finished.reduce((sum,b)=>sum+(b.crop?.year===cal.year?b.crop.planted:0),0)/finished.length;
  return {stage:`Spring sowing · ${Math.round(progress*100)}%`,detail:`${workers} farmers assigned · ${finished.length} fields. ${workers?'Assigned farmers must reach and sow each plot.':'Assign residents to fields, or enable Auto work.'}${paused}`,completed:progress,required:1,action:'knowledge'};}
 if(!planted.length){const until=YEAR_SECONDS-g.state.time%YEAR_SECONDS;return {stage:'Waiting for spring sowing',detail:`${Math.ceil(until)} simulation seconds until spring. ${finished.length} fields ready; no crop was sown this year.${paused}`,action:'knowledge'};}
 const remaining=current.reduce((sum,b)=>sum+(b.crop?.remaining||0),0);
 return {stage:cal.phase===1?'Crops growing':cal.phase===2?'Autumn harvest':'Winter field rest',detail:`${planted.length}/${finished.length} fields sown · ${workers} farmers assigned${cal.phase===2?` · ${Math.floor(remaining)} harvest units still in fields`:''}.${paused}`,action:'knowledge'};
}
