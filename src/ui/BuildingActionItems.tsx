import {useMemo} from 'react';
import type {Engine} from '../game/engine';
import {measureVillageWorkload} from '../game/villageWorkload';
import {workloadTime} from './WorkloadPanel';
/** The village's open work for the selected building, shown right in the selection panel so nobody has to open the Workload drawer.
 * Read-only: tasks whose label names this building first, then the most blocked work. */
export function BuildingActionItems({engine,buildingName}:{engine:Engine;buildingName:string}){
 const g=engine.game,tick=Math.floor(performance.now()/1000);
 const report=useMemo(()=>measureVillageWorkload(g),[g,g.state,g.world,tick]);
 const name=buildingName.toLowerCase();
 const open=report.tasks.filter(t=>t.status!=='paused');
 const mine=open.filter(t=>t.label.toLowerCase().includes(name));
 const rows=(mine.length?mine:open.filter(t=>t.status==='blocked')).slice(0,4);
 if(!rows.length)return null;
 return <section className="mt-2 rounded-md border border-bronze/30 p-2 text-xs" aria-label="Action items">
  <strong>{mine.length?`Open work · ${buildingName}`:'Needs attention'}</strong>
  <ul className="mt-1 space-y-1">{rows.map(t=><li key={t.id}><div className="flex justify-between gap-2"><span>{t.label}</span><span>{workloadTime(t.personSeconds)} · {t.status}</span></div>{t.blocker&&<p className="text-parchment-dim">{t.blocker}</p>}</li>)}</ul>
 </section>;
}
