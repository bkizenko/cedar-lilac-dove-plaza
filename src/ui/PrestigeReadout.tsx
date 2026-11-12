import {SIM_CALENDAR_RULES} from '../game/calendarPacing';
import type {GamePrestigeView} from '../game/prestigeGame';
import {PRESTIGE_SCORE_RULES,type PrestigeComponent} from '../game/prestigeScore';
const labels:Record<PrestigeComponent,string>={usableArea:'Useful land',resourcesAndChokepoints:'Resources & crossings',healthyPopulation:'Healthy people',foodSecurity:'Food security',demonstratedPractices:'Practiced skills',usefulTrade:'Recent trade',defendedWarAims:'War aims',civicWorks:'Civic works'};
/** Presentation only: every number comes from the authorized HUD snapshot. */
const observationDate=(time:number)=>`${['Spring','Summer','Autumn','Winter'][Math.floor((time%SIM_CALENDAR_RULES.yearSeconds)/(SIM_CALENDAR_RULES.yearSeconds/4))]} · Year ${Math.floor(time/SIM_CALENDAR_RULES.yearSeconds)+1}`;
export function PrestigeReadout({view,rivals=[]}:{view?:GamePrestigeView;rivals?:GamePrestigeView[]}){
 return <section aria-label="Prestige breakdown" className="space-y-2">
  <div className="flex items-center justify-between"><h3>Prestige</h3><strong aria-label="Your prestige">{view?.total===null||view?.total===undefined?'—':Math.round(view.total)}</strong></div>
  {!view?<p className="text-xs text-parchment-dim">Measuring…</p>:<dl className="space-y-1">
   {view.components.map(row=>{const rule=PRESTIGE_SCORE_RULES.components[row.component],points=row.points??0;
    const detail=!row.available?(row.component==='defendedWarAims'?'No verified objective outcome recorded':'Measurement pending'):`${row.value===undefined?'':`${row.value.toLocaleString(undefined,{maximumFractionDigits:1})} ${rule.unit} · `}${points.toFixed(1)} / ${rule.cap} points. Diminishing returns.`;
    return <div key={row.component} title={detail} className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-center gap-2 text-xs">
     <dt>{labels[row.component]}</dt><dd><meter className="h-1.5 w-full" min={0} max={rule.cap} value={points} aria-label={`${labels[row.component]} prestige`} title={detail}/></dd><dd className="text-right tabular-nums">{row.available?points.toFixed(0):'—'}</dd>
    </div>;
   })}
  </dl>}
  {view?.territoryUpdating&&<p className="text-xs text-parchment-dim">Land survey updating</p>}
  {!!rivals.length&&<details><summary className="text-xs">Other communities</summary><ul className="mt-2 space-y-1 text-xs" aria-label="Observed community prestige">
   {rivals.map(r=><li key={r.subject} className="flex justify-between gap-3" title={r.knowledge==='unknown'?'No returned observations':'Partial dated observations only; total and private stores remain unknown'}>
    <span>{r.knowledge==='unknown'&&!r.identityKnown?'Unknown community':r.communityName||`Community ${r.subject}`}{r.knowledge==='observed'&&r.observedAt!==null&&<small className="ml-2 text-parchment-dim">{observationDate(r.observedAt)}</small>}</span>
    <span>{r.knowledge==='unknown'?'—':`${Math.round(r.knownSubtotal)}+ observed`}</span>
   </li>)}
  </ul></details>}
 </section>;
}
