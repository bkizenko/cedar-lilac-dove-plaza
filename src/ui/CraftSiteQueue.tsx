import{Hammer,Pause,Play,Package,ChevronDown}from'lucide-react';
import{GameTooltip}from'./GameTooltip';
import{craftingWorkplaceRate}from'../game/crafting';
import{FOOD_NAMES}from'../game/pantry';
import{ITEM_NAMES,PRODUCTION_RECIPES,productionOutputs,productionFoodOutput,type ItemKind}from'../game/production';
import{useEffect,useRef,useState}from'react';import type{Engine}from'../game/engine';import{craftSiteReport,type CraftSiteJob}from'../game/craftSiteReport';
import type{EngineDispatchCommand}from'../game/engineDispatch';
export function CraftSiteQueue({engine}:{engine:Engine}){
 const[,setRevision]=useState(0),[feedback,setFeedback]=useState<{text:string;buildingId:number;expires:number}|null>(null),g=engine.game,b=g.state.selBld,report=b?craftSiteReport(g,b):null;
 const mounted=useRef(true),latestRequest=useRef(0),epoch=engine.dispatchEpoch;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;latestRequest.current++;};},[engine]);
 if(!b||!report||!report.benches&&!report.slots&&!report.jobs.length)return null;
 const batches = (g.state.production?.projects ?? []).filter(project => {
  const phase = project.phase === 'paused' ? project.resumePhase : project.phase;
  return project.workplace === b.id && project.team === b.team &&
    (phase === 'curing' || phase === 'ready');
 });
 const send=async(command:EngineDispatchCommand)=>{
  if(engine.disposed||engine.dispatchEpoch!==epoch)return;
  const request=++latestRequest.current,buildingId=b.id;
  const current=()=>mounted.current&&!engine.disposed&&engine.dispatchEpoch===epoch&&latestRequest.current===request;
  try{const result=await engine.dispatch(command);if(!current()||result.epoch!==engine.dispatchEpoch)return;setFeedback({text:result.reason,buildingId,expires:Date.now()+4000});setRevision(n=>n+1);engine.pushHud();}
  catch(error){if(current())setFeedback({text:error instanceof Error?error.message:'The workplace request could not be completed',buildingId,expires:Date.now()+4000});}
 };
 const run=(job:CraftSiteJob,action:'unload'|'pause'|'resume'=job.paused?'resume':'pause')=>send({kind:'craft-site-control',buildingId:b.id,jobKind:job.kind,projectId:job.projectId,actorId:job.actorId,action});
 return<section className="mt-2 space-y-2 text-xs" aria-label="Selected workplace queue">{!!report.jobs.length&&<h3 className="font-semibold">Work queue · {report.jobs.length}</h3>}
 {!!report.slots&&<details>
  <summary>Workshop inventory</summary>
  {batches.length ? <ul className="space-y-1">{batches.map(project => {
   const recipe = PRODUCTION_RECIPES[project.recipe];
   const phase = project.phase === 'paused' ? project.resumePhase : project.phase;
   const goods = Object.entries(phase === 'ready' ? productionOutputs(project) : recipe.inputs)
    .filter(([, quantity]) => quantity > 0)
    .map(([kind, quantity]) => `${quantity} ${ITEM_NAMES[kind as ItemKind]}`);
   if (phase === 'ready' && productionFoodOutput(project) > 0) goods.push(`${productionFoodOutput(project)} ${FOOD_NAMES[recipe.foodKind]}`);
   if (phase === 'curing') {
    for (const [kind, quantity] of Object.entries(recipe.foodInputs)) {
     if (quantity > 0) goods.push(`${quantity} ${FOOD_NAMES[kind as keyof typeof FOOD_NAMES]}`);
    }
   }
   return <li key={project.id}>{goods.join(' · ') || recipe.name} · {phase === 'ready' ? 'awaiting pickup' : project.dairy ? 'fermenting in held vessel' : 'drying'}</li>;
  })}</ul> : <p className="text-parchment-dim">No passive batches or goods awaiting pickup.</p>}
 </details>}
 <GameTooltip title="Workplace capacity" description="Benches are shared. Loaded, drying and ready batches reserve slots; returning batches release them."><p tabIndex={0} className="text-parchment-dim">{[...(report.benches>0?[`${report.benchesReserved} / ${report.benches} benches${report.benchWaiting?` · ${report.benchWaiting} waiting`:''}`]:[]),...(report.slots>0?[`${report.slotsReserved} / ${report.slots} batch slots`]:[]),...(craftingWorkplaceRate(b)>1?[`+${Math.round((craftingWorkplaceRate(b)-1)*100)}% equipment work`]:[])].join(' · ')}</p></GameTooltip>
 <div className="grid gap-2" style={{gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,170px),1fr))'}}>{report.jobs.map(job=>{
 const percent=Math.min(100,Math.floor(job.progress/Math.max(.001,job.required)*100));
 return <article className="min-w-0 space-y-1 rounded-md border border-parchment/15 p-2" key={job.id} aria-label={job.label}>
  <div className="flex items-start gap-2"><Hammer size={16} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true"/><strong className="min-w-0 flex-1 font-medium">{job.label}</strong><span className="text-parchment-dim">{percent}%</span></div>
  <GameTooltip title={job.phase} description={`${job.actor} · ${job.reason}`}><span tabIndex={0} className="block max-w-full truncate text-parchment-dim">{job.phase}</span></GameTooltip>
  <progress className="h-1.5 w-full" aria-label={`${job.label} work progress`} value={Math.min(job.required,job.progress)} max={job.required}/>
  <p className="truncate text-parchment-dim">{job.actor}</p>
  <div className="flex flex-wrap items-center gap-2">
   {(job.paused||job.canPause)&&<GameTooltip title={job.paused?'Resume paid work':'Pause paid work'} description="Paid materials and completed work remain with this batch."><button type="button" aria-label={job.paused?'Resume paid work':'Pause paid work'} className="flex items-center gap-1 rounded border border-bronze/40 px-2 py-1" disabled={!!g.state.ended} onClick={()=>run(job)}>{job.paused?<Play size={11} aria-hidden="true"/>:<Pause size={11} aria-hidden="true"/>}{job.paused?'Resume':'Pause'}</button></GameTooltip>}
   {job.canUnload&&<GameTooltip title="Unload batch at cache" description="Carry the paid inputs to storage and free this worker. The same paid batch can be resumed later."><button type="button" aria-label="Unload batch at cache" className="flex items-center gap-1 rounded border border-bronze/40 px-2 py-1" disabled={!!g.state.ended} onClick={()=>run(job,'unload')}><Package size={11} aria-hidden="true"/>Store batch</button></GameTooltip>}
   {job.kind==='production'&&g.state.production?.projects.some(p=>p.id===job.projectId&&p.dairy?.recovery&&p.phase==='paused')&&<button type="button" className="rounded border border-bronze/40 px-2 py-1" onClick={()=>send({kind:'dairy-clean',projectId:job.projectId!})}>Clean and recover vessel</button>}
   {job.kind==='production'&&g.state.production?.projects.some(p=>p.id===job.projectId&&p.dairy)&&<button type="button" className="rounded border border-bronze/40 px-2 py-1" onClick={()=>send({kind:'dairy-discard',projectId:job.projectId!})}>{g.state.production?.projects.find(p=>p.id===job.projectId)?.dairy?.recovery?'Discard vessel permanently':'Discard milk; keep vessel for cleaning'}</button>}
  </div>
  <details><summary className="flex cursor-pointer items-center gap-1 text-parchment-dim"><ChevronDown size={11} aria-hidden="true"/>Details</summary><div className="mt-1 space-y-1">
   <p>{job.progress.toFixed(1)} / {job.required} {job.progressUnit||'work seconds'}</p><p>{job.reason}</p>{job.details&&<p>{job.details}</p>}
   {job.cacheLocation&&<><p>{job.cacheLocation.name}{job.cacheLocation.contents&&` · ${job.cacheLocation.contents}`}</p><button type="button" className="rounded border border-bronze/40 px-2 py-1" onClick={()=>{const cache=job.cacheLocation!;engine.focusMinimap(cache.x,cache.z);engine.canvas?.focus();}}>Show cache on map</button></>}
  </div></details>
 </article>;
 })}</div>

 {feedback&&Date.now()<feedback.expires&&feedback.buildingId===b.id&&<p role="status">{feedback.text}</p>}
 </section>;
}
