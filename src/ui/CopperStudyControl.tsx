import {beginCopperHelper,copperHelperIssue,practicalHelperReport,pausePracticalHelper,resumePracticalHelper} from '../game/practicalHelpers';
import {GameTooltip} from './GameTooltip';
import type {Engine} from '@/game/engine';
import {beginCopperStudy,copperStudyIssue,COPPER_STUDY_RULES} from '@/game/materialStudy';
export function CopperStudyControl({engine,workplace}:{engine:Engine;workplace:number}){
 const g=engine.game,t=g.tribe(0),person=g.state.units.find(u=>u.team===0&&u.hp>0&&u.copperStudy),work=person?.copperStudy;
 if(t.copperExperiment)return <p className="text-sm text-parchment">Copper prototype established · {g.state.units.filter(u=>u.team===0&&u.hp>0&&u.farmTool==='copperTools').length} residents equipped</p>;
 const issue=copperStudyIssue(g,workplace),helpers=person?practicalHelperReport(g,person.id):null,helperIssue=person?copperHelperIssue(g,person.id):'Start a paid trial first';
 const help=()=>{if(person){const result=beginCopperHelper(g,person.id);g.banner(result.reason,4);engine.pushHud();}};
 const start=()=>{beginCopperStudy(g,workplace);engine.pushHud();};
 if(work&&work.workplace!==workplace)return <span>Copper trial underway at another shelter.</span>;
 if(work)return <div className="copper-study-control">
  <strong>Copper trial · {Math.floor(work.progress/COPPER_STUDY_RULES.workSeconds*100)}%</strong>
  <progress aria-label="Copper prototype work" max={COPPER_STUDY_RULES.workSeconds} value={work.progress}/>
  {work.paused?<button type="button" disabled={!!issue} onClick={start}>Resume trial · inputs already paid</button>:<span>1 maker · {helpers?.helpers.filter(h=>h.phase!=='paused').length||0} helpers</span>}
  {work.paused&&issue&&<span>{issue}</span>}
  {person&&work.workplace===workplace&&<><GameTooltip title="Hands-on helpers" description="Two extra adults can assist at real benches beside the maker. First helper contributes 45% and the second 25% of their actual crafting work; materials remain paid once. Cultivation helpers are assigned separately at the hearth."><button type="button" disabled={!!helperIssue} title={helperIssue||'Assign a real adult to an available bench'} onClick={help}>Add helper</button></GameTooltip>{helpers?.helpers.map(h=><div key={h.id}><span>{h.name} · {h.phase==='paused'?'Paused':h.phase==='traveling'?'Walking to bench':'Helping'}</span><button type="button" onClick={()=>{const u=g.state.units.find(u=>u.id===h.id);if(!u)return;if(h.phase==='paused'){const r=resumePracticalHelper(g,u.id);g.banner(r.reason,4);}else pausePracticalHelper(g,u);engine.pushHud();}}>{h.phase==='paused'?'Resume helper':'Pause helper'}</button></div>)}</>}

 </div>;
 return <div className="copper-study-control">
  <button type="button" disabled={!!issue} onClick={start} title={issue||'One resident takes materials to the shelter and tests a prototype at a real bench.'}>Test a copper tool</button>
  <span>{COPPER_STUDY_RULES.copperUnits} copper · {COPPER_STUDY_RULES.woodLogs} logs · {COPPER_STUDY_RULES.workSeconds} work seconds</span>
  {issue&&<span>{issue}</span>}
 </div>;
}
