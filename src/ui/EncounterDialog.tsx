import {useEffect,useRef} from 'react';
import type {Engine} from '@/game/engine';
import {answerEncounter} from '@/game/encounters';
import {personName} from '@/game/people';
import {ContactActions} from './ContactActions';
import {LeaderConversation} from './LeaderConversation';
import {EncounterPortrait} from './council/EncounterPortrait';
export function EncounterDialog({engine}:{engine:Engine|null}){
 const ref=useRef<HTMLDialogElement>(null),encounter=engine?.game.state.encounter;
 useEffect(()=>{if(encounter)ref.current?.showModal();else ref.current?.close();return()=>ref.current?.close();},[encounter]);
 if(!engine||!encounter)return null;
 const g=engine.game,t=g.tribe(encounter.team),stranger=g.state.units.find(u=>u.id===encounter.stranger),person=g.state.units.find(u=>u.id===encounter.person);
 const hostile=g.isFoe(0,t.id);
 const reply=(r:'greet'|'observe')=>{answerEncounter(g,r);engine.canvas.focus();engine.pushHud();};
 return <dialog ref={ref} className="play-guide encounter-dialog" aria-labelledby="encounter-heading" onCancel={e=>{e.preventDefault();reply('observe');}}>
  <span className="encounter-eyebrow">{hostile?'Hostile encounter':'First contact'}</span>
  <h2 id="encounter-heading">{t.name}</h2>
  <p className="encounter-who">{person?personName(person):'Explorer'} · {stranger?personName(stranger):'Stranger'}</p>
  {stranger&&person&&<div className="encounter-talk"><EncounterPortrait engine={engine} strangerId={stranger.id}/><LeaderConversation key={`${person.id}:${stranger.id}`} engine={engine} personId={person.id} strangerId={stranger.id}/></div>}
  {stranger?.carryType&&stranger.carry>0&&<p>Carrying {Math.floor(stranger.carry)} {stranger.carryType}</p>}
  <ContactActions key={encounter.stranger} engine={engine} strangerId={encounter.stranger} personId={encounter.person} conversation={false}/>
  <div className="encounter-actions">
   {!hostile&&<button type="button" onClick={()=>reply('greet')}>Part in peace</button>}
   <button type="button" onClick={()=>reply('observe')}>Leave</button>
  </div>
 </dialog>;
}
