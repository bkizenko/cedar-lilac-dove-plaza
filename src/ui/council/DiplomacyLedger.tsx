import type {CouncilModel} from '../../game/rulersView';
import {diplomacyLedger} from './dipLedger';
/** One folded ledger of pledges, claims owed and grudges per house. Text headings, not colour alone; each house row centres the camera (fog-safe via onFocus). Hidden when nothing is on the books. */
export function DiplomacyLedger({council,onFocus}:{council:CouncilModel|undefined;onFocus?:(team:number)=>void}){
 const rows=diplomacyLedger(council);if(!rows.length)return null;
 const cols=[['pledges','Pledges'],['owed','Owed'],['grudges','Grudges']] as const;
 return <details data-dip-ledger="1" className="rounded border border-parchment/15 bg-black/20">
  <summary className="min-h-11 cursor-pointer px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-parchment-dim">Oaths, debts and grudges · {rows.length} {rows.length===1?'house':'houses'}</summary>
  <ul className="space-y-2 px-2 pb-2">{rows.map(r=><li key={r.team} data-team={r.team}>
   <button type="button" onClick={()=>onFocus?.(r.team)} title="Centre the map on their settlement" className="min-h-11 w-full text-left text-[13px] font-semibold text-parchment">{r.name}</button>
   {cols.map(([k,l])=>r[k].length>0&&<div key={k} className="text-[12px] text-parchment-dim"><span className="text-[10px] font-semibold uppercase tracking-wide">{l}</span><ul className="ml-3 list-disc">{r[k].map((t,i)=><li key={i}>{t}</li>)}</ul></div>)}
  </li>)}</ul>
 </details>;
}
