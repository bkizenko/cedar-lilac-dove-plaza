import {useEffect,useRef,useState} from 'react';
import type {Game} from '../game/sim';
import {currentSeasonReport,SEASON_METRICS,SEASON_NAMES,type SeasonMetric} from '../game/seasonReports';

const labels: Record<SeasonMetric,string> = {
 food:'Food into stores',wood:'Logs delivered',stone:'Stone delivered',
 copper:'Copper delivered',iron:'Iron delivered',weapons:'Weapons made',
};
const period = (season:number) => `${SEASON_NAMES[season%4]}, Year ${Math.floor(season/4)+1}`;
const units = (n:number) => Math.round(n).toLocaleString();
const change = (now:number,prior:number) => {
 const delta=Math.round(now-prior);
 return delta===0?'0':`${delta>0?'+':'−'}${units(Math.abs(delta))}`;
};
type ReportRow=NonNullable<ReturnType<typeof currentSeasonReport>>;
type HistoryMetric=SeasonMetric|'eaten'|'spoiled';
const historyLabels:Record<HistoryMetric,string>={...labels,eaten:'Food eaten',spoiled:'Food spoiled in pantry'};
const historyMetrics=[...SEASON_METRICS,'eaten','spoiled'] as const;
function historyValue(row:ReportRow,metric:HistoryMetric){
 return metric==='eaten'||metric==='spoiled'?row.foodFlow?.[metric]:row.totals[metric];
}

function FoodFlow({row}:{row:ReportRow}){
 const flow=row.foodFlow;
 if(!flow)return null;
 return <p className="text-xs text-parchment-dim">
  Food eaten <strong>{units(flow.eaten)}</strong> · Spoiled in pantry <strong>{units(flow.spoiled)}</strong>
  {flow.partial&&' · partial record'}
 </p>;
}

function Totals({row,prior}:{row:ReportRow;prior?:ReportRow}){
 return <table className="w-full text-left text-xs tabular-nums">
  <thead className="text-parchment-dim"><tr><th scope="col">Resource</th><th scope="col" className="text-right">Added</th>
   <th scope="col" className="text-right">In stock</th>{prior&&<th scope="col" className="text-right">Change</th>}</tr></thead>
  <tbody>{SEASON_METRICS.map(key=><tr key={key} className="border-t border-parchment/10">
   <th scope="row" className="py-1.5 pr-3 font-normal">{labels[key]}</th>
   <td className="text-right">{units(row.totals[key])}</td><td className="pl-3 text-right">{units(row.stock[key])}</td>
   {prior&&<td className="pl-3 text-right">{change(row.totals[key],prior.totals[key])}</td>}
  </tr>)}</tbody>
 </table>;
}

export function SeasonReport({game,hidden=false}:{game:Game;hidden?:boolean}) {
 const history=game.state.seasonReports?.history;
 const latest=history?.at(-1);
 const seen=useRef({game,season:latest?.season});
 const [notice,setNotice]=useState<{game:Game;season:number}>();
 useEffect(()=>{
  const previous=seen.current;
  seen.current={game,season:latest?.season};
  if(previous.game===game&&latest&&(previous.season===undefined||latest.season>previous.season)){
   setNotice({game,season:latest.season});
  }
 },[game,latest?.season]);
 if(hidden||!latest||!notice||notice.game!==game||notice.season!==latest.season)return null;
 const prior=!latest.partial?history?.find(row=>row.season===latest.season-4&&!row.partial):undefined;
 return <aside className="hud-panel w-[23rem] max-w-full rounded-lg p-3 space-y-2 text-xs" aria-label="Village seasonal report">
  <div className="flex items-center justify-between gap-3"><strong>{period(latest.season)} ended</strong>
   <button type="button" className="px-2 py-1" onClick={()=>setNotice(undefined)}>Dismiss</button></div>
  {latest.partial&&<p>Recording started partway through the season.</p>}
  {prior&&<p className="text-parchment-dim">Change from {period(prior.season)}</p>}
  <Totals row={latest} prior={prior}/>
  <FoodFlow row={latest}/>
 </aside>;
}

export function SeasonLedger({game}:{game:Game}){
 const [metric,setMetric]=useState<HistoryMetric>('food');
 const current=currentSeasonReport(game);
 if(!current)return null;
 const rows=game.state.seasonReports?.history.slice(-8)??[];
 const maximum=Math.max(1,...rows.map(row=>historyValue(row,metric)??0));
 return <section className="space-y-2">
  <h3>Production</h3>
  <p>{period(current.season)} so far</p>
  <Totals row={current}/>
  <FoodFlow row={current}/>
  {rows.length>0&&<>
   <label className="flex justify-between gap-3">Completed seasons <select aria-label="Production history resource" value={metric} onChange={e=>setMetric(e.target.value as HistoryMetric)}>
    {historyMetrics.map(key=><option key={key} value={key}>{historyLabels[key]}</option>)}
   </select></label>
   <ol className="space-y-1" aria-label={`${historyLabels[metric]} by season`}>
    {rows.map(row=>{
     const value=historyValue(row,metric);
     const partial=metric==='eaten'||metric==='spoiled'?row.foodFlow?.partial:row.partial;
     return <li key={row.season} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-2 text-xs">
      <span>{period(row.season)}{partial?' · partial':''}</span>
      <div className="h-1.5 rounded-full bg-parchment/15" aria-hidden="true">{value!==undefined&&<div className="h-full rounded-full bg-bronze" style={{width:`${value/maximum*100}%`}}/>}</div>
      <span className="text-right tabular-nums">{value===undefined?'Unrecorded':units(value)}</span>
     </li>;
    })}
   </ol>
  </>}
  <p className="text-xs text-parchment-dim">Food into stores includes deliveries and finished batches. Stock reflects what is on hand.</p>
 </section>;
}
