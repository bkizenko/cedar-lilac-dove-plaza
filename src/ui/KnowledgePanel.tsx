import {useMemo,useState} from 'react';
import {BookOpen,ChevronDown} from 'lucide-react';
import type {Engine} from '../game/engine';
import {knowledgeReport,runKnowledgeAction,type KnowledgeStage} from '../game/knowledge';
const STAGE_LABELS:Record<KnowledgeStage,string>={need:'Need to explore',observation:'Evidence available',experiment:'Practical work',proven:'Practice established',adoption:'In use'};
/** Knowledge is visible evidence and actual work, never a passive science queue. */
export function KnowledgePanel({engine,expanded=false,onChooseSite}:{engine:Engine;expanded?:boolean;onChooseSite?:()=>void}){
 const [open,setOpen]=useState(false),[feedback,setFeedback]=useState(''),[revision,setRevision]=useState(0);
 const g=engine.game,show=expanded||open;
 // Navigation feasibility can be expensive; evaluate only while open and at most
 // once per simulated second, with immediate refresh after this panel's commands.
 const report=useMemo(()=>show?knowledgeReport(g):null,[g,g.state,Math.floor(g.state.time),show,revision]);
 const act=(id:string)=>{const result=runKnowledgeAction(g,id);if(result.accepted&&result.placement){if(g.state.placing!==result.placement)engine.setPlacing(result.placement);onChooseSite?.();}setFeedback(result.reason);setRevision(n=>n+1);g.banner(result.reason,5);engine.pushHud();};
 const content=report&&<div className="space-y-4 p-3 text-sm text-parchment">
  <p className="text-parchment-dim">People learn by bringing materials home, testing an idea, making something useful and using it. Priority buttons assign real residents; travel and work still take time.</p>
  {report.topics.map(topic=><article key={topic.id} className="space-y-3 rounded-md border border-bronze/30 bg-ink-soft p-3" aria-label={topic.title}>
   <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-semibold">{topic.title}</h4><span className="text-xs text-bronze-bright">{STAGE_LABELS[topic.stage]}</span></div>
   <p>{topic.need}</p>
   <dl className="space-y-2 text-xs">
    <div><dt className="font-medium text-parchment-dim">Observed or sampled</dt><dd>{topic.observation}</dd></div>
    <div><dt className="font-medium text-parchment-dim">Experiment or practice</dt><dd>{topic.experiment}</dd></div>
    <div><dt className="font-medium text-parchment-dim">Demonstrated result</dt><dd>{topic.result}</dd></div>
    <div><dt className="font-medium text-parchment-dim">Use and adoption</dt><dd>{topic.adoption}</dd></div>
   </dl>
   {topic.progress&&<div className="space-y-1 text-xs"><progress className="w-full" aria-label={`${topic.title} — ${topic.progress.unit}`} max={topic.progress.required} value={Math.min(topic.progress.required,Math.max(0,topic.progress.completed))}/><p>{topic.progress.completed.toFixed(1)} / {topic.progress.required} {topic.progress.unit}</p></div>}
   <div className="flex flex-wrap gap-2">{topic.actions.map(action=><div key={`${topic.id}:${action.id}`} className="min-w-0 flex-1">
    <button type="button" className="min-h-11 w-full rounded-md border border-bronze/40 px-3 py-2 text-left text-xs disabled:opacity-50" disabled={!!action.blockedReason} title={action.blockedReason||action.label} onClick={()=>act(action.id)}>{action.label}</button>
    {action.blockedReason&&<p className="mt-1 text-xs text-parchment-dim">{action.blockedReason}</p>}
   </div>)}</div>
   {topic.limitation&&<p className="text-xs text-parchment-dim">{topic.limitation}</p>}
  </article>)}
  {g.state.paused&&<p className="text-xs text-parchment-dim">Resume play to let assigned people travel and work.</p>}
  <p className="text-xs text-parchment-dim">Teaching networks and exchange of techniques are still future work. Current counts describe saved evidence and living residents, rather than an assumed history.</p>
  {feedback&&<p role="status" aria-live="polite">{feedback}</p>}
 </div>;
 if(expanded)return <section aria-label="Knowledge through practice"><h3 className="flex items-center gap-2"><BookOpen className="size-4"/>Knowledge through practice</h3>{content}</section>;
 return <details className="hud-panel max-w-full" aria-label="Knowledge through practice" onToggle={event=>setOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-xs"><BookOpen className="size-4"/><span>Knowledge through practice</span><ChevronDown className="ml-auto size-3" aria-hidden="true"/></summary>{content}</details>;
}
