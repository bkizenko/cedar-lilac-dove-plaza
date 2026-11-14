import {useState} from 'react';
import {Archive,X} from 'lucide-react';
import type {Engine} from '@/game/engine';
import {oldSaveNote,oldSaveNoteDismissed,dismissOldSaveNote} from './oldSaveNote';

/** One dismissible card when an older save is loaded, listing the systems that start fresh. Read-only; never blocks play. */
export function OldSaveNote({engine}:{engine:Engine}){
 const key=`${engine.game.state.seed}:${engine.game.tribe(0).name}`,note=oldSaveNote(engine.game.state.worldOptions);
 const [gone,setGone]=useState(()=>oldSaveNoteDismissed(key));
 if(!note||gone)return null;
 return <section className="hw-prev hw-oldsave" role="status" aria-label="Older save">
  <h3><Archive size={20}/>{note.title}</h3>
  <ul>{note.items.map((l,i)=><li key={i}>{l}</li>)}</ul>
  <button type="button" className="hw-prev-x" aria-label="Dismiss note" onClick={()=>{dismissOldSaveNote(key);setGone(true);}}><X size={20}/></button>
 </section>;
}
