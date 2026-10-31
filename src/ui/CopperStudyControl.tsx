import type {Engine} from '@/game/engine';
import {beginCopperStudy,copperStudyIssue,COPPER_STUDY_RULES} from '@/game/materialStudy';
export function CopperStudyControl({engine,workplace}:{engine:Engine;workplace:number}){
 const g=engine.game,t=g.tribe(0),person=g.state.units.find(u=>u.team===0&&u.hp>0&&u.copperStudy),work=person?.copperStudy;
 if(t.copperExperiment)return <p className="text-sm text-parchment">Copper prototype established · {g.state.units.filter(u=>u.team===0&&u.hp>0&&u.farmTool==='copperTools').length} residents equipped</p>;
 const issue=copperStudyIssue(g,workplace);
 const start=()=>{beginCopperStudy(g,workplace);engine.pushHud();};
 if(work)return <div className="copper-study-control">
  <strong>Copper trial · {Math.floor(work.progress/COPPER_STUDY_RULES.workSeconds*100)}%</strong>
  <progress aria-label="Copper prototype work" max={COPPER_STUDY_RULES.workSeconds} value={work.progress}/>
  {work.paused?<button type="button" disabled={!!issue} onClick={start}>Resume trial · inputs already paid</button>:<span>One resident testing a prototype</span>}
  {work.paused&&issue&&<span>{issue}</span>}
 </div>;
 return <div className="copper-study-control">
  <button type="button" disabled={!!issue} onClick={start} title={issue||'One resident takes materials to the shelter and tests a prototype at a real bench.'}>Test a copper tool</button>
  <span>{COPPER_STUDY_RULES.copperUnits} copper · {COPPER_STUDY_RULES.woodLogs} logs · {COPPER_STUDY_RULES.workSeconds} work seconds</span>
  {issue&&<span>{issue}</span>}
 </div>;
}
