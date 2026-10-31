import type {Engine} from '../game/engine';
import {farmingProgress} from '../game/farmingProgress';
export function FarmingProgress({engine,onKnowledge}:{engine:Engine;onKnowledge:()=>void}){
 const report=farmingProgress(engine.game);
 return <details className="hud-panel max-w-full text-xs" aria-label="Farming progress"><summary className="cursor-pointer px-3 py-2">{report.stage}</summary><div className="space-y-2 px-3 pb-3"><p>{report.detail}</p>{report.required!==undefined&&<progress className="w-full" aria-label="Farming progress" value={report.completed} max={report.required}/>}<button className="rounded border border-bronze/40 px-3 py-2" onClick={()=>report.action==='field'?engine.setPlacing('farm'):onKnowledge()}>{report.action==='field'?'Choose field site':'Review knowledge and next steps'}</button></div></details>;
}
