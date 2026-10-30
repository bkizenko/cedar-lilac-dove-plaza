import {staffField} from '../game/fieldWork';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import {BUILDINGS} from '../game/constants';
import {expansionCost,plotArea} from '../game/plots';
import {planExpansion,expansionStatus} from '../game/plotExpansion';
import {fieldProductionReport} from '../game/productionReport';
export function PlotControls({game:g,building:b,refresh}:{game:Game;building:Building;refresh:()=>void}){
 const report=b.type==='farm'?fieldProductionReport(g,b):null;
 return <section className="rounded-lg border border-parchment/20 p-3 text-sm" aria-label="Plot details">
   <div className="flex justify-between gap-2"><strong>{report?report.stage:'Storage capacity'}</strong><span>{report?`${report.staff}/${report.workerSlots} workers`:`${Math.floor(200*plotArea(b))} supplies`}</span></div>
   {report&&<div className="mt-2 grid grid-cols-2 gap-2"><div><span className="block text-parchment-dim">Harvest forecast</span><strong>{report.projected} / {report.potential}</strong><span className="block text-xs text-parchment-dim">{report.kind} · current / full care</span></div><div><span className="block text-parchment-dim">Work remaining</span><strong>{report.workSeconds}s</strong></div></div>}
   {report&&<p className="mt-2 text-sm text-parchment-dim">Soil {report.soil}% · Moisture {report.water}%</p>}
   {report&&<button className="mt-3 w-full rounded-md border border-bronze/40 px-3 py-2" onClick={()=>{staffField(g,b);refresh();}}>Assign farmers</button>}
   {b.expansion?<div className="mt-3 space-y-2"><p>{expansionStatus(g,b)}</p><button className="w-full rounded-md border border-bronze/40 px-3 py-2" onClick={()=>{g.orderConstruction(b);refresh();}}>Assign extension builders</button>{!b.expansion.paid&&<button className="w-full rounded-md border border-parchment/20 px-3 py-2" onClick={()=>{b.expansion=undefined;g.workBoard.reset();refresh();}}>Cancel extension</button>}</div>:<details className="mt-3"><summary className="cursor-pointer py-2 text-base">Expand plot</summary><div className="mt-2 grid grid-cols-2 gap-2">{(['w','d'] as const).map(axis=>{
     const size={w:b.w,d:b.d};size[axis]=Math.min(BUILDINGS[b.type][axis]*3,size[axis]+BUILDINGS[b.type][axis]);const cost=expansionCost(b,size),max=size[axis]<=b[axis]+1e-6;
     return <button key={axis} disabled={max||!!g.state.ended} className="rounded-md border border-bronze/40 px-2 py-2 disabled:opacity-40" onClick={()=>{planExpansion(g,b,axis);refresh();}}>{axis==='w'?'Wider':'Deeper'}<span className="block text-sm text-parchment-dim">{max?'Maximum':cost.seeds!==undefined?`${cost.seeds} seeds`:`${cost.wood} logs`}</span></button>;
   })}</div></details>}
 </section>;
}
