import {useEffect,useRef} from 'react';
import type {Engine} from '@/game/engine';
import {answerEncounter} from '@/game/encounters';
import {FirstContact} from './hearth/FirstContact';
/** The meeting: an inscription-style ledger, not a form. All verbs live in FirstContact; Escape still means "observe". */
export function EncounterDialog({engine}:{engine:Engine|null}){
 const ref=useRef<HTMLDialogElement>(null),encounter=engine?.game.state.encounter;
 useEffect(()=>{if(encounter)ref.current?.showModal();else ref.current?.close();return()=>ref.current?.close();},[encounter]);
 if(!engine||!encounter)return null;
 return <dialog ref={ref} className="play-guide encounter-dialog fc" aria-labelledby="encounter-heading" onCancel={e=>{e.preventDefault();answerEncounter(engine.game,'observe');engine.canvas.focus();engine.pushHud();}}>
  <FirstContact key={`${encounter.person}:${encounter.stranger}`} engine={engine}/>
 </dialog>;
}
