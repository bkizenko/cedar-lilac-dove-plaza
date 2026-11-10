import {useState} from 'react';
import type {Game} from '../game/sim';
import {SEASON_METRICS,SEASON_NAMES} from '../game/seasonReports';

const labels = {food:'Food received',wood:'Logs delivered',stone:'Stone delivered',
 copper:'Copper delivered',iron:'Iron delivered',weapons:'Weapons made'};
const period = (season:number) => `${SEASON_NAMES[season%4]}, Year ${Math.floor(season/4)+1}`;
const units = (n:number) => Math.round(n).toLocaleString();

export function SeasonReport({game}:{game:Game}) {
 const history=game.state.seasonReports?.history ?? [];
 const latest=history.at(-1);
 const [closed,setClosed]=useState<number>();
 const [metric,setMetric]=useState<typeof SEASON_METRICS[number]>('food');
 if(!latest)return null;
 const earlier=history.find(row=>row.season===latest.season-4&&!row.partial);
 const stockLabel = metric === 'weapons' ? 'Weapons in stores' : 'Stock at season end';
 const maximum = Math.max(1,...history.map(row=>row.totals[metric]));
 if(closed===latest.season)return <button type="button" className="hud-panel px-3 py-2 text-xs" onClick={()=>setClosed(undefined)}>Season report</button>;
 return <aside className="hud-panel rounded-lg p-3 space-y-2 text-xs" aria-label="Village seasonal report">
  <div className="flex items-center justify-between gap-3"><strong>{period(latest.season)} report</strong>
   <button type="button" className="px-2 py-1" onClick={()=>setClosed(latest.season)}>Close</button></div>
  {latest.partial&&<p>Recording began partway through this season.</p>}
  <label className="flex justify-between gap-3">Track <select value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>
   {SEASON_METRICS.map(key=><option key={key} value={key}>{labels[key]}</option>)}
  </select></label>
  <p>{labels[metric]} <strong>{units(latest.totals[metric])}</strong> · {stockLabel} {units(latest.stock[metric])}</p>
  {earlier&&!latest.partial&&<p>{period(earlier.season)} recorded {units(earlier.totals[metric])}.</p>}
  <ol className="space-y-1 max-h-40 overflow-auto" aria-label={`${labels[metric]} by season`}>
   {history.slice(-8).map(row=><li key={row.season} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2">
    <span>{period(row.season)}{row.partial?'*':''}</span>
    <progress className="w-full" aria-label={period(row.season)} max={maximum} value={row.totals[metric]}/>
    <span className="text-right">{units(row.totals[metric])}</span>
   </li>)}
  </ol>
 </aside>;
}
