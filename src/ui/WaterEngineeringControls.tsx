import{useState}from'react';
import type{Engine}from'../game/engine';
import{GameTooltip}from'./GameTooltip';
/** Plans queue ordinary work; the Engine revalidates the actual two world points. */
export function WaterEngineeringControls({engine}:{engine:Engine}){
 const[,refresh]=useState(0),[feedback,setFeedback]=useState(''),status=engine.waterEngineeringStatus();
 const choose=(kind:'canal'|'aqueduct')=>{engine.beginWaterEngineering(kind);setFeedback('');refresh(n=>n+1);};
 const cancel=()=>{engine.cancelWaterEngineering();setFeedback('');refresh(n=>n+1);};
 const commit=()=>{const result=engine.commitWaterEngineering();setFeedback(result.ok?'Works laid out; excavation still needs builders.':result.reason||'The works could not be laid out');refresh(n=>n+1);};
 const button='min-h-8 rounded-md border border-bronze/40 px-2 text-xs disabled:opacity-40';
 return<section aria-label="Water engineering" className="space-y-2 text-xs">
  <div className="flex flex-wrap gap-2"><button type="button" className={button} aria-pressed={status.kind==='canal'} onClick={()=>choose('canal')}>Canal</button><button type="button" className={button} aria-pressed={status.kind==='aqueduct'} onClick={()=>choose('aqueduct')}>Aqueduct</button>
   <GameTooltip title="Lay out works" description={status.issue||'Queue the planned excavation work.'}><span tabIndex={status.issue?0:undefined}><button type="button" className={button} disabled={!status.kind||!status.canCommit||!!status.issue} onClick={commit}>Lay out works</button></span></GameTooltip>
   <button type="button" className={button} disabled={!status.kind} onClick={cancel}>Cancel</button>
  </div>
  <p role="status">{feedback||status.summary}</p>
  {status.kind&&<details><summary>Plan details</summary><p>{status.issue||status.summary}</p></details>}
 </section>;
}
