import{GameTooltip}from'./GameTooltip';
import{craftingWorkplaceRate}from'../game/crafting';
import{FOOD_NAMES}from'../game/pantry';
import{ITEM_NAMES,PRODUCTION_RECIPES,productionOutputs,type ItemKind}from'../game/production';
import{useState}from'react';import type{Engine}from'../game/engine';import{craftSiteReport,controlCraftSiteJob,type CraftSiteJob}from'../game/craftSiteReport';
export function CraftSiteQueue({engine}:{engine:Engine}){
 const[,setRevision]=useState(0),[feedback,setFeedback]=useState<{text:string;jobId:string;paused:boolean;expires:number}|null>(null),g=engine.game,b=g.state.selBld,report=b?craftSiteReport(g,b):null;if(!b||!report||!report.benches&&!report.slots&&!report.jobs.length)return null;
 const batches = (g.state.production?.projects ?? []).filter(project => {
  const phase = project.phase === 'paused' ? project.resumePhase : project.phase;
  return project.workplace === b.id && project.team === b.team &&
    (phase === 'curing' || phase === 'ready');
 });
 const run=(job:CraftSiteJob,action:'unload'|'pause'|'resume'=job.paused?'resume':'pause')=>{const accepted=controlCraftSiteJob(g,b,job,action),reason=accepted?action==='unload'?'Returning the batch to cache':(job.paused?'Work resumed':'Work paused'):(job.kind==='production'?g.state.production?.projects.find(p=>p.id===job.projectId)?.blockedReason:undefined)||'Work could not change: the maker, workplace or route is not available';setFeedback({text:reason,jobId:job.id,paused:accepted?action==='pause':job.paused,expires:Date.now()+4000});g.banner(reason,4);setRevision(n=>n+1);engine.pushHud();};
 return<section className="mt-2 space-y-2 text-xs" aria-label="Selected workplace queue">{!!report.jobs.length&&<h3 className="font-semibold">Work queue · {report.jobs.length}</h3>}
 {!!report.slots&&<details>
  <summary>Workshop inventory</summary>
  {batches.length ? <ul className="space-y-1">{batches.map(project => {
   const recipe = PRODUCTION_RECIPES[project.recipe];
   const phase = project.phase === 'paused' ? project.resumePhase : project.phase;
   const goods = Object.entries(phase === 'ready' ? productionOutputs(project) : recipe.inputs)
    .filter(([, quantity]) => quantity > 0)
    .map(([kind, quantity]) => `${quantity} ${ITEM_NAMES[kind as ItemKind]}`);
   if (phase === 'ready' && recipe.food > 0) goods.push(`${recipe.food} ${FOOD_NAMES[recipe.foodKind]}`);
   if (phase === 'curing') {
    for (const [kind, quantity] of Object.entries(recipe.foodInputs)) {
     if (quantity > 0) goods.push(`${quantity} ${FOOD_NAMES[kind as keyof typeof FOOD_NAMES]}`);
    }
   }
   return <li key={project.id}>{goods.join(' · ') || recipe.name} · {phase === 'ready' ? 'awaiting pickup' : 'drying'}</li>;
  })}</ul> : <p className="text-parchment-dim">No batches drying or awaiting pickup.</p>}
 </details>}
 <GameTooltip title="Workplace capacity" description="Benches are shared. Loaded, drying and ready batches reserve slots; returning batches release them."><p tabIndex={0} className="text-parchment-dim">{[...(report.benches>0?[`${report.benchesReserved} / ${report.benches} benches${report.benchWaiting?` · ${report.benchWaiting} waiting`:''}`]:[]),...(report.slots>0?[`${report.slotsReserved} / ${report.slots} batch slots`]:[]),...(craftingWorkplaceRate(b)>1?[`+${Math.round((craftingWorkplaceRate(b)-1)*100)}% equipment work`]:[])].join(' · ')}</p></GameTooltip>
 {report.jobs.map(job=><article className="space-y-1 rounded border border-bronze/30 p-2" key={job.id}><strong>{job.label}</strong><p>{job.phase} · {job.actor}</p><progress className="w-full" aria-label={`${job.label} work progress`} value={Math.min(job.required,job.progress)} max={job.required}/><p>{job.progress.toFixed(1)} / {job.required} {job.progressUnit||'work seconds'} · {Math.min(100,Math.floor(job.progress/Math.max(.001,job.required)*100))}%</p><p className="text-parchment-dim">{job.reason}</p>{job.details&&<details><summary>Work details</summary><p>{job.details}</p></details>}{(job.paused||job.canPause)&&<button type="button" className="min-h-11 rounded border border-bronze/40 px-3 py-2" disabled={!!g.state.ended} onClick={()=>run(job)}>{job.paused?'Resume paid work':'Pause paid work'}</button>}{job.canUnload&&<button type="button" className="min-h-11 rounded border border-bronze/40 px-3 py-2" disabled={!!g.state.ended} onClick={()=>run(job,'unload')}>Unload batch at cache</button>}</article>)}
 {feedback&&Date.now()<feedback.expires&&report.jobs.some(job=>job.id===feedback.jobId&&job.paused===feedback.paused)&&<p role="status">{feedback.text}</p>}
 </section>;
}
