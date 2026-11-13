import {useState} from 'react';
import type {Engine} from '../../game/engine';
import {useOwnerReadModels} from '../useOwnerReadModels';
const QUERY={kind:'rulers-council'} as const;
const FACTION_LABEL:Record<string,string>={kin:'Kin',warriors:'War-leaders',priests:'Priests',elders:'Elders',merchants:'Merchants',landholders:'Landholders',commons:'Common folk',assembly:'Assembly'};
const MODE_LABEL:Record<string,string>={stay:'Content to stay',settle:'Looking to settle new ground',migrate:'Pressed to move on',conquer:'Eyeing a neighbour',trade:'Seeking trade',explore:'Itching to explore',mission:'Wanting to spread the faith'};
const STAGE_NOTE:Record<string,string>={household:'A small household. The leader and kin are people, not yet a house.',kingroup:'A growing kin-group. Heirs and fosterage matter.',house:'A ruling house. Marriage alliances and succession now matter.',dynasty:'A dynasty. Claims, regents and factions shape the realm.'};
/** Council: who leads, who their family is, what the factions want, why the people want to expand, and who you can marry into. */
export function CouncilPanelClassic({engine}:{engine:Engine}){
 const read=useOwnerReadModels(engine,[QUERY]),res=read(QUERY),c=res.model?.council;
 const [feedback,setFeedback]=useState('');
 if(!c)return <p className="text-xs text-parchment-dim">{res.issue}</p>;
 if(!c.enabled)return <p className="text-xs text-parchment-dim">This village predates ruling houses.</p>;
 const marry=async(team:number)=>{try{const r=await engine.dispatch({kind:'marry-houses',team},undefined,{notice:false});setFeedback(r.reason);}catch(e){setFeedback(e instanceof Error?e.message:'Unavailable');}};
 return <section aria-label="Council" className="mt-2 space-y-3 text-xs">
  <p className="text-parchment-dim">{STAGE_NOTE[c.stage]}</p>
  {c.ruler&&<article aria-label="Ruler">
   <h4 className="font-semibold text-parchment">{c.ruler.name}, {c.ruler.age}</h4>
   <p>{c.ruler.headline}.{c.ruler.contradiction&&<> {c.ruler.contradiction}.</>}</p>
   {c.ruler.wants.length>0&&<p className="text-parchment-dim">Wants: {c.ruler.wants.join(', ')}. Fears: {c.ruler.fears}.</p>}
  </article>}
  {c.house&&<article aria-label="House"><h4 className="font-semibold text-parchment">House {c.house.name}, generation {c.house.generation+1}</h4>
   <ul className="grid grid-cols-2 gap-x-3">{c.house.family.map(p=><li key={p.name+p.age}>{p.name} <span className="text-parchment-dim">{p.role}, {p.age}</span></li>)}</ul></article>}
  {c.showFactions&&c.factions.length>0&&<article aria-label="Factions"><h4 className="font-semibold text-parchment">Who must be kept content</h4>
   <ul>{c.factions.map(f=><li key={f.kind} className="flex justify-between gap-2"><span>{FACTION_LABEL[f.kind]??f.kind} <span className="text-parchment-dim">want {f.demand}</span></span><span className={f.loyalty<35?'text-red-300':f.loyalty>65?'text-green-300':''}>{f.loyalty<35?'restless':f.loyalty>65?'loyal':'wavering'}</span></li>)}</ul>
   {c.coalitionLoss>0&&<p className="text-red-300">{c.coalitionLoss}% of the realm's weight is restless.</p>}</article>}
  {c.expansion&&<article aria-label="Expansion"><h4 className="font-semibold text-parchment">{MODE_LABEL[c.expansion.mode]??c.expansion.mode}</h4>
   {c.expansion.why.length>0?<p className="text-parchment-dim">Because {c.expansion.why.join('; ')}.</p>:<p className="text-parchment-dim">Nothing presses the people to leave.</p>}</article>}
  {c.glory.some(g=>g.value>0)&&<article aria-label="Renown"><h4 className="font-semibold text-parchment">Renown</h4>
   <ul>{c.glory.filter(g=>g.value>0).map(g=><li key={g.stream} className="flex items-center gap-2"><span className="w-16 capitalize">{g.stream}</span><span className="h-1.5 rounded bg-bronze" style={{width:Math.min(100,g.value)+'%'}}/></li>)}</ul></article>}
  {c.neighbours.length>0&&<article aria-label="Neighbours"><h4 className="font-semibold text-parchment">Neighbouring houses</h4>
   <ul>{c.neighbours.map(n=><li key={n.team} className="border-b border-parchment/10 py-1"><div className="flex items-center justify-between gap-2"><span>{n.name}: <b>{n.bond}</b></span>
    {n.canMarry&&<button type="button" className="rounded-md border border-bronze/40 px-2 py-0.5" onClick={()=>void marry(n.team)}>Arrange a marriage</button>}</div>
    {n.means.length>0&&<p className="text-parchment-dim">{n.means.join('; ')}</p>}</li>)}</ul>
   {feedback&&<p role="status">{feedback}</p>}</article>}
 </section>;
}
