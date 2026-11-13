import {useEffect,useMemo} from 'react';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import type {Engine} from '../game/engine';
import {enableIrrigation,irrigationEnabled,fieldWater,planDitch,digDitch,irrigationSummary,diggingRate,ditchesOf,ditchComplete,IRRIGATION_RULES} from '../game/irrigation';
/** Water section of the field card: Water mode (irrigated and rain-fed plots on the map) and the Dig ditch tool.
 * Hearth sizing: tap targets 52 px, text 16 px. Everything is a real quote from game rules; nothing is paid until Dig ditch. */
const LIFT_NAME={none:'no lift needed',shaduf:'needs a shaduf',wheel:'needs a water wheel'} as const;
const costText=(c:{food?:number;wood?:number;stone?:number})=>[c.food?`${c.food} food`:'',c.wood?`${c.wood} logs`:'',c.stone?`${c.stone} stone`:''].filter(Boolean).join(' · ')||'free';
const btn='min-h-[52px] w-full rounded-md border border-bronze/40 px-3 py-2 text-base disabled:opacity-40';
export function WaterControls({game:g,building:b,engine,refresh}:{game:Game;building:Building;engine?:Engine|null;refresh:()=>void}){
 const on=irrigationEnabled(g),water=on?fieldWater(g,b):null;
 const plan=useMemo(()=>on&&b.type==='farm'?planDitch(g,0,b):null,[on,g,b,b.x,b.z,b.w,b.d,g.state.time>>3]);
 useEffect(()=>{engine?.previewDitch(plan&&plan.length>0&&!ditchesOf(g).some(d=>d.fieldId===b.id)?plan:null);return()=>engine?.previewDitch(null);},[engine,plan,b.id,g]);
 const sum=on?irrigationSummary(g,0):null,mine=on?ditchesOf(g).find(d=>d.fieldId===b.id&&d.team===0):undefined,mode=!!engine?.fieldWaterMode;
 return <details className="craft-group mt-3" open={mode||undefined}><summary style={{minHeight:52,fontSize:16}}>Water</summary><div className="craft-options" style={{fontSize:16}}>
  {!on&&<><p>Plots live on rain alone. Irrigation rules add river water by ditch, shaduf and water wheel; fields near water take a little more rain.</p>
   <button type="button" className={btn} onClick={()=>{enableIrrigation(g);refresh();}}>Use irrigation rules</button></>}
  {on&&water&&<>
   <p><strong>{water.label}</strong>{sum?` · ${sum.wet} of ${sum.fields} plots watered, ${sum.dry} rain-fed`:''}</p>
   <button type="button" aria-pressed={mode} className={btn} onClick={()=>engine?.setFieldWaterMode(!mode)}>{mode?'Hide water on the map':'Show water on the map'}</button>
   {mode&&<p className="text-parchment-dim">Cool dark plots are watered. Pale sandy plots are rain-fed.</p>}
   {mine&&!ditchComplete(mine)&&<p>Ditch {Math.round(mine.done/mine.length*100)}% dug · {diggingRate(g,0)>0?'diggers at work':'paused (harvest or no workers)'}</p>}
   {!mine&&plan&&<div>
    <p>{plan.length>0?`Ditch: ${plan.length.toFixed(0)} m from the water · ${LIFT_NAME[plan.lift]} · ${costText(plan.cost)} · about ${Math.round(plan.diggingSeconds/60)} min of digging`:plan.issue}</p>
    {plan.length>0&&plan.issue&&<p className="t-bad">{plan.issue}</p>}
    <button type="button" className={btn} disabled={!plan.ok||!!g.state.ended} onClick={()=>{const r=digDitch(g,0,b.id);if(!r.ok)g.banner(r.reason,3);else g.banner('Ditch marked — diggers work outside harvest',3);refresh();}}>Dig ditch</button>
    <p className="text-parchment-dim">Longest ditch {IRRIGATION_RULES.maximumLengthMetres} m. A shaduf lifts water about {IRRIGATION_RULES.liftHeadMetres.shaduf} m, a water wheel about {IRRIGATION_RULES.liftHeadMetres.wheel} m.</p></div>}
  </>}
 </div></details>;
}
