import {useMemo,useState} from 'react';
import type {Engine} from '../game/engine';
import {fishWaterReach,waterReachReport,workReachClay,type WaterReach} from '../game/waterReach';

function Stock({name,amount,capacity}:{name:string;amount:number;capacity:number}){
 return <div className="space-y-1">
  <div className="flex justify-between gap-3"><strong>{name}</strong><span className="tabular-nums">{Math.floor(amount)} / {Math.round(capacity)}</span></div>
  <progress aria-label={name} className="h-1.5 w-full accent-bronze" max={capacity} value={amount}/>
 </div>;
}

export function WaterReachPanel({engine,reach}:{engine:Engine;reach:WaterReach}){
 const game=engine.game,second=Math.floor(game.state.time);
 const [revision,setRevision]=useState(0);
 const report=useMemo(()=>waterReachReport(game,reach),[game,reach,second,revision]);
 const refresh=(action:()=>unknown)=>{action();setRevision(n=>n+1);engine.pushHud();};
 const button="min-h-10 rounded-md border border-bronze/40 px-2 disabled:opacity-50";
 return <div className="mt-2 space-y-3 text-xs">
  <section aria-label="Local fishing">
   {report.fishCapacity>0?<Stock name="Fish" amount={report.fishCount} capacity={report.fishCapacity}/>:<p>No known fish in this reach.</p>}
   {report.fishRecovery>0&&<p className="text-parchment-dim">Next catch in about {Math.max(1,Math.ceil(report.fishRecovery/60))} game min if rested.</p>}
   <button className={button} disabled={!report.fisher} onClick={()=>refresh(()=>fishWaterReach(game,reach))}>Fish from bank</button>
   {!report.fisher&&report.fishCount>=1&&<p className="text-parchment-dim">Needs a free adult and a reachable bank with room.</p>}
  </section>
  <section aria-label="Local clay deposits">
   {report.clayCapacity>0?<Stock name="Clay" amount={report.clayCount} capacity={report.clayCapacity}/>:<p>Clay bank unsurveyed.</p>}
   <div className="flex flex-wrap gap-2">
    <button className={button} disabled={!report.surveyor} onClick={()=>refresh(()=>workReachClay(game,reach,true))}>Survey bank</button>
    {report.clayCapacity>0&&<button className={button} disabled={!report.digger} onClick={()=>refresh(()=>workReachClay(game,reach,false))}>Dig clay</button>}
   </div>
   {report.clayCapacity>0&&report.clayCount===0?<p className="text-parchment-dim">Exhausted clay does not replenish.</p>:
    !report.surveyor&&<p className="text-parchment-dim">Bring a free adult near this bank to survey it.</p>}
  </section>
 </div>;
}
