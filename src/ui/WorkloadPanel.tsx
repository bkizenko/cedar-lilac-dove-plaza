import {useMemo,useState} from 'react';
import {Users,Clock3,ChevronDown} from 'lucide-react';
import type {Engine} from '../game/engine';
import {measureVillageWorkload} from '../game/villageWorkload';
export function workloadTime(seconds:number){if(seconds<60)return`${Math.ceil(seconds)}s`;return`${Math.floor(seconds/60)}m ${Math.ceil(seconds%60)}s`;}
/** Read-only workload view. No assignment, inventory or speed changes occur. */
export function WorkloadPanel({engine,expanded=false}:{engine:Engine;expanded?:boolean}){
 const [open,setOpen]=useState(false),g=engine.game;
 // Wall time keeps4x play from multiplying report work; replaced saves/worlds
 // invalidate immediately even inside the same500ms refresh window.
 const refreshWindow=Math.floor(performance.now()/500);
 const report=useMemo(()=>measureVillageWorkload(g),[g,g.state,g.world,refreshWindow]);
 const percent=report.workloadPercent,label=percent===null?'No available hands':`~${Math.round(percent)}%`,over=percent!==null&&percent>100;
 const details=(expanded||open)&&<div className="space-y-3 px-3 pb-3 text-xs text-parchment">
  <p>{workloadTime(report.demandPersonSeconds)} of work / {workloadTime(report.capacityPersonSeconds)} of adult labor in the next {Math.round(report.horizonSeconds/60)} minutes.</p>
  <div className="h-1.5 overflow-hidden rounded bg-ink-soft" aria-hidden="true"><div className={over?'h-full bg-blood':'h-full bg-bronze'} style={{width:`${Math.min(100,percent??0)}%`}}/></div>
  <p>{report.civilianAdults} civilian adults · {report.effectiveAdults.toFixed(1)} available after expected rest · {report.dependents} growing up · {report.freeNow} awaiting an assignment.</p>
  {report.manual&&<p className="text-parchment-dim">Manual work is on. This view shows needs and queued work; it does not start jobs.</p>}
  {report.warnings.map(w=><p className={over?'text-blood':'text-parchment-dim'} key={w}>{w}</p>)}
  <div><strong>Current priorities</strong><ul className="mt-1 space-y-2">{report.tasks.filter(t=>t.status!=='paused').slice(0,8).map(t=><li key={t.id}><div className="flex justify-between gap-2"><span>{t.label}</span><span>{workloadTime(t.personSeconds)} · {t.status}</span></div>{t.blocker&&<p className="text-parchment-dim">{t.blocker}</p>}{t.deadlineSeconds!==undefined&&<p className="text-parchment-dim">{workloadTime(t.deadlineSeconds)} left this season</p>}</li>)}</ul>{!report.tasks.length&&<p className="text-parchment-dim">No current jobs or near-term supply deficits.</p>}</div>
  {!!report.timedQueues.length&&<p className="text-parchment-dim">{report.timedQueues.length} training queue(s) use elapsed timers; adults are needed when training completes. These timers are excluded from labor totals.</p>}
  {!!report.waiting.length&&<div><strong>Why people are waiting</strong><ul className="mt-1 space-y-1">{report.waiting.slice(0,6).map(w=><li key={w.actorId}>{w.name}: {w.reason}</li>)}</ul></div>}
  <p className="text-parchment-dim">{workloadTime(report.blockedPersonSeconds)} blocked · {workloadTime(report.pausedPersonSeconds)} paused and excluded. Tools, practice and better carrying equipment reduce real work. Above 100% means a longer queue, not random mistakes or a new speed penalty.</p>
  <details><summary className="cursor-pointer">People and estimate</summary><ul className="mt-2 space-y-1">{report.people.map(p=><li key={p.id}>{p.name} · {p.role} · {workloadTime(p.capacitySeconds)} available · fatigue {Math.round(p.fatigue*100)}%{p.carrying?` · carrying ${p.carrying.toFixed(0)}`:''}{p.activeTask?` · ${p.activeTask}`:''}</li>)}</ul><p className="mt-2 text-parchment-dim">{report.estimate}</p></details>
 </div>;
 if(expanded)return<section aria-label="Village workload"><h3>Village workload · {label}</h3>{details}</section>;
 return<details className="hud-panel max-w-full" aria-label="Village workload" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-xs"><Users className="size-3"/><span className={over?'text-blood':'text-bronze-bright'}>Workload {label}</span><Clock3 className="ml-auto size-3"/><span>{Math.round(report.horizonSeconds/60)}m plan</span><ChevronDown className="size-3" aria-hidden="true"/></summary>{open&&details}</details>;
}
