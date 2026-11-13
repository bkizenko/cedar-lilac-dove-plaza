import type {CouncilModel} from '../../game/rulersView';
import {SocietyFlag} from '../SocietyFlag';
import {societyChips,type SocietyChip} from './societiesModel';
type Neighbour=CouncilModel['neighbours'][number];
const TONE:Record<SocietyChip['mood'],string>={war:'text-red-300',wary:'text-red-200',cool:'text-parchment-dim',cordial:'text-parchment',friend:'text-green-200',peace:'text-green-200'};
/** One row of chips, one per known house: flag, name, mood, and badges for claims against us (!), claims we hold, and wards. Tap jumps to its card. */
export function SocietiesStrip({neighbours,identityOf}:{neighbours:Neighbour[];identityOf?:(n:Neighbour)=>Neighbour['identity']}){
 const chips=societyChips(neighbours);
 if(!chips.length)return null;
 return <nav aria-label="Societies at a glance" data-societies-strip="1" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
  {chips.map(c=>{const n=neighbours.find(x=>x.team===c.team)!,id=identityOf?identityOf(n):n.identity;
   return <a key={c.team} href={`#house-${c.team}`} onClick={e=>{const el=document.getElementById(`house-${c.team}`);if(el){e.preventDefault();el.scrollIntoView({block:'nearest',behavior:'smooth'});}}} className="flex min-w-[8.5rem] shrink-0 items-center gap-1.5 rounded border border-parchment/15 bg-black/25 px-2 py-1 text-[12px]" data-mood={c.mood}>
    {id&&<SocietyFlag identity={id} label={`${c.name} flag`}/>}
    <span className="min-w-0"><span className="block truncate font-semibold text-parchment">{c.name}</span><span className={'block text-[10px] uppercase tracking-wide '+TONE[c.mood]}>{c.word}</span></span>
    <span className="ml-auto flex gap-1 text-[10px] tabular-nums">
     {c.claimsAgainst>0&&<span title={`${c.claimsAgainst} claim(s) held against us`} className="rounded bg-red-900/50 px-1 text-red-200">⚑{c.claimsAgainst}</span>}
     {c.claimsByUs>0&&<span title={`${c.claimsByUs} claim(s) we hold`} className="rounded bg-bronze/30 px-1 text-parchment">⚑{c.claimsByUs}</span>}
     {c.wards>0&&<span title={c.wardsHome?`${c.wardsHome} due home within a year`:'Kin in each other\'s halls'} className="rounded bg-parchment/10 px-1">{c.wardsHome?'⌂':'♙'}{c.wards}</span>}
    </span>
   </a>;})}
 </nav>;
}
