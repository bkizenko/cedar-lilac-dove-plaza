import {useMemo,useState} from 'react';
import {BookOpen,ChevronDown,ChevronRight,FlaskConical,Wheat,Hammer,Ship,House,Leaf,Shield} from 'lucide-react';
import type {Engine} from '../game/engine';
import {knowledgeReport,runKnowledgeAction,type KnowledgeStage,type KnowledgeTopic,type KnowledgeAction} from '../game/knowledge';
import {GameTooltip} from './GameTooltip';
const STAGE_LABELS:Record<KnowledgeStage,string>={need:'Unexplored',observation:'Observed',experiment:'In progress',proven:'Established',adoption:'In use'};
export function primaryKnowledgeAction(topic:KnowledgeTopic){
 const available=topic.actions.filter(action=>!action.blockedReason);
 // With samples already observed, the seed trial is the next step. Exploration
 // remains available in Details rather than displacing the practical action.
 return (topic.stage!=='need'&&available.find(action=>action.id.startsWith('trial:')))||(['proven','adoption'].includes(topic.stage)&&topic.id.startsWith('crop:')&&available.find(action=>action.id==='place:farm'))||available[0]||topic.actions[0];
}
function topicIcon(topic:KnowledgeTopic){return topic.id.startsWith('crop:')?Wheat:/boat|transport|haul/i.test(topic.id)?Ship:/house|housing|shelter/i.test(topic.id)?House:/copper|tool|craft/i.test(topic.id)?Hammer:/fibre|plant|pasture/i.test(topic.id)?Leaf:/war|defen/i.test(topic.id)?Shield:topic.stage==='experiment'?FlaskConical:BookOpen;}
function shortAction(label:string){return label.replace(/^Try /,'Make ').replace(/^Choose (?:a )?/,'Place ').replace(/ site$/,'');}
export function KnowledgeTopicRow({topic,onAction}:{topic:KnowledgeTopic;onAction:(id:string)=>void}){
 const [details,setDetails]=useState(false),primary=primaryKnowledgeAction(topic),progress=topic.progress,Icon=topicIcon(topic);
 const button=(action:KnowledgeAction)=> <GameTooltip key={action.id} title={action.label} description={action.blockedReason||undefined}><button type="button" className="max-w-36 truncate rounded-md border border-bronze/40 px-2 py-1.5 text-xs disabled:opacity-50" disabled={!!action.blockedReason} onClick={()=>onAction(action.id)}>{shortAction(action.label)}</button></GameTooltip>;
 return <article className="border-b border-parchment/10 py-1.5" aria-label={topic.title}>
  <div className="flex items-center gap-2">
   <Icon size={18} className="shrink-0 text-bronze" aria-hidden="true"/>
   <div className="min-w-0 flex-1"><h4 className="text-sm font-medium">{topic.title}</h4>
    <div className="mt-0.5 flex items-center gap-2 text-xs text-parchment-dim"><span>{STAGE_LABELS[topic.stage]}</span>{progress&&<><progress className="h-1.5 w-24" aria-label={`${topic.title} — ${progress.unit}`} max={progress.required} value={Math.min(progress.required,Math.max(0,progress.completed))}/><span>{Math.round(Math.min(100,Math.max(0,progress.completed/Math.max(1,progress.required)*100)))}%</span></>}</div>
   </div>
   {primary&&button(primary)}
   <button type="button" className="rounded p-1 text-parchment-dim" aria-label={`Details: ${topic.title}`} aria-expanded={details} onClick={()=>setDetails(value=>!value)}>{details?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
  </div>
  {details&&<div className="mt-2 space-y-2 border-l border-parchment/15 pl-3 text-xs text-parchment-dim">
   <p>{topic.need}</p><dl className="space-y-1">{[['Evidence',topic.observation],['Practice',topic.experiment],['Results',topic.result],['Use',topic.adoption]].map(([label,value])=><div key={label}><dt className="font-medium text-parchment">{label}</dt><dd>{value}</dd></div>)}</dl>
   {progress&&<p>{progress.completed.toFixed(1)} / {progress.required} {progress.unit}</p>}
   {primary?.blockedReason&&<p>{primary.blockedReason}</p>}
   {topic.actions.some(action=>action.id!==primary?.id)&&<div className="flex flex-wrap gap-2">{topic.actions.filter(action=>action.id!==primary?.id).map(button)}</div>}
   {topic.limitation&&<p>{topic.limitation}</p>}
  </div>}
 </article>;
}
/** Knowledge is visible evidence and actual work, never a passive science queue. */
export function KnowledgePanel({engine,expanded=false,onChooseSite}:{engine:Engine;expanded?:boolean;onChooseSite?:()=>void}){
 const [open,setOpen]=useState(false),[feedback,setFeedback]=useState(''),[revision,setRevision]=useState(0),[search,setSearch]=useState(''),[activeOnly,setActiveOnly]=useState(false);
 const g=engine.game,show=expanded||open;
 const report=useMemo(()=>show?knowledgeReport(g):null,[g,g.state,Math.floor(g.state.time),show,revision]);
 const act=(id:string)=>{const result=runKnowledgeAction(g,id);if(result.accepted&&result.placement){if(g.state.placing!==result.placement)engine.setPlacing(result.placement);onChooseSite?.();}setFeedback(result.reason);setRevision(n=>n+1);g.banner(result.reason,5);engine.pushHud();};
 const topics=report?.topics.filter(topic=>(!activeOnly||topic.stage==='experiment')&&`${topic.title} ${topic.id}`.toLowerCase().includes(search.trim().toLowerCase()))||[];
 const content=report&&<div className="space-y-2 py-2 text-parchment">
  <label className="block"><span className="sr-only">Find a skill</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find a skill…" className="w-full rounded-md border border-parchment/20 bg-ink-soft px-3 py-2 text-sm"/></label>
  <div className="flex items-center gap-2 text-xs"><button type="button" className="rounded px-2 py-1 aria-pressed:bg-parchment/10" aria-pressed={!activeOnly} onClick={()=>setActiveOnly(false)}>All skills</button><button type="button" className="rounded px-2 py-1 aria-pressed:bg-parchment/10" aria-pressed={activeOnly} onClick={()=>setActiveOnly(true)}>In progress · {report.topics.filter(topic=>topic.stage==='experiment').length}</button></div>
  <div>{topics.map(topic=><KnowledgeTopicRow key={topic.id} topic={topic} onAction={act}/>)}</div>
  {!topics.length&&<p className="text-xs text-parchment-dim">No matching skills.</p>}
  {g.state.paused&&<p className="text-xs text-parchment-dim">Paused · resume to continue work.</p>}
  {feedback&&<p role="status" aria-live="polite" className="text-xs">{feedback}</p>}
 </div>;
 if(expanded)return <section aria-label="Knowledge through practice"><h3 className="mt-3 flex items-center gap-2 text-sm"><BookOpen className="size-4"/>Learning through practice</h3>{content}</section>;
 return <details className="hud-panel max-w-full" aria-label="Knowledge through practice" onToggle={event=>setOpen(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-xs"><BookOpen className="size-4"/><span>Knowledge</span><ChevronDown className="ml-auto size-3" aria-hidden="true"/></summary>{content}</details>;
}
