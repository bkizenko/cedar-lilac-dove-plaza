import {useState} from 'react';
import type {Engine} from '../game/engine';
import {useOwnerReadModels} from './useOwnerReadModels';
import {CouncilPanelClassic} from './council/CouncilPanelClassic';
import {HandoverCard,FameFeed,FactionsStrip,GloryBars,Card} from './council/CouncilParts';
import {useCouncilLayout} from './council/councilLayout';
const QUERY={kind:'rulers-council'} as const;
const MODE_LABEL:Record<string,string>={stay:'Content to stay',settle:'Looking to settle new ground',migrate:'Pressed to move on',conquer:'Eyeing a neighbour',trade:'Seeking trade',explore:'Itching to explore',mission:'Wanting to spread the faith'};
const STAGE_NOTE:Record<string,string>={household:'A small household. The leader and kin are people, not yet a house.',kingroup:'A growing kin-group. Heirs and fosterage matter.',house:'A ruling house. Marriage alliances and succession now matter.',dynasty:'A dynasty. Claims, regents and factions shape the realm.'};
/** Council (current layout): ruler, handover, factions, renown, chronicle, expansion and neighbours. `classic` layout keeps the archived panel. */
export function CouncilPanel({engine}:{engine:Engine}){
 const [layout,setLayout]=useCouncilLayout();
 const read=useOwnerReadModels(engine,[QUERY]),res=read(QUERY),c=res.model?.council;
 const [feedback,setFeedback]=useState('');
 if(layout==='classic')return <><LayoutToggle layout={layout} set={setLayout}/><CouncilPanelClassic engine={engine}/></>;
 if(!c)return <p className="text-xs text-parchment-dim">{res.issue}</p>;
 if(!c.enabled)return <p className="text-xs text-parchment-dim">This village predates ruling houses.</p>;
 const marry=async(team:number)=>{try{const r=await engine.dispatch({kind:'marry-houses',team});setFeedback(r.reason);}catch(e){setFeedback(e instanceof Error?e.message:'Unavailable');}};
 return <section aria-label="Council" className="mt-2 space-y-2 text-xs">
  <LayoutToggle layout={layout} set={setLayout}/>
  <p className="text-parchment-dim">{STAGE_NOTE[c.stage]}</p>
  {c.ruler&&<Card label="Ruler" title={c.house?`House ${c.house.name} · generation ${c.house.generation+1}`:'Ruler'}>
   <h5 className="text-sm font-semibold text-parchment">{c.ruler.name}, {c.ruler.age}</h5>
   <p>{c.ruler.headline}.{c.ruler.contradiction&&<> {c.ruler.contradiction}.</>}</p>
   {c.ruler.wants.length>0&&<p className="text-parchment-dim">Wants: {c.ruler.wants.join(', ')}. Fears: {c.ruler.fears}.</p>}
   {c.house&&<ul className="grid grid-cols-2 gap-x-3 border-t border-parchment/10 pt-1.5">{c.house.family.map(p=><li key={p.name+p.age}>{p.name} <span className="text-parchment-dim">{p.role}, {p.age}</span></li>)}</ul>}
  </Card>}
  {c.handover&&<HandoverCard h={c.handover}/>}
  {c.showFactions&&<FactionsStrip factions={c.factions} coalitionLoss={c.coalitionLoss}/>}
  <GloryBars glory={c.glory} score={c.gloryScore}/>
  <FameFeed log={c.log}/>
  {c.expansion&&<Card label="Expansion" title={MODE_LABEL[c.expansion.mode]??c.expansion.mode}>
   {c.expansion.why.length>0?<p className="text-parchment-dim">Because {c.expansion.why.join('; ')}.</p>:<p className="text-parchment-dim">Nothing presses the people to leave.</p>}</Card>}
  {c.neighbours.length>0&&<Card label="Neighbours" title="Neighbouring houses">
   <ul>{c.neighbours.map(n=><li key={n.team} className="border-b border-parchment/10 py-1 last:border-0"><div className="flex items-center justify-between gap-2"><span>{n.name}: <b>{n.bond}</b> <span className="text-parchment-dim">trust {n.trust}</span></span>
    {n.canMarry&&<button type="button" className="rounded-md border border-bronze/40 px-2 py-0.5" onClick={()=>void marry(n.team)}>Arrange a marriage</button>}</div>
    {n.means.length>0&&<p className="text-parchment-dim">{n.means.join('; ')}</p>}</li>)}</ul>
   {feedback&&<p role="status">{feedback}</p>}</Card>}
 </section>;
}
function LayoutToggle({layout,set}:{layout:'current'|'classic';set:(l:'current'|'classic')=>void}){
 return <button type="button" className="float-right text-[10px] text-parchment-dim underline" onClick={()=>set(layout==='classic'?'current':'classic')}>{layout==='classic'?'New layout':'Classic layout'}</button>;
}
