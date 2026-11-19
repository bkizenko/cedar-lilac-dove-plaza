import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {saveStorage} from '../game/saveStore';
import {readSlots} from './hearth/SaveStatus';
import {ageText,loadedSlot,type SaveSlotInfo} from './saveStatus';
import {oldSaveNote} from './hearth/oldSaveNote';

export type LoadedSaveFacts={copy:string;age:string;rollback:string|null;repaired:string[]};
/** Pure: what to say right after a load, from stored slot headers and the loaded village only. */
export function loadedSaveFacts(slots:readonly SaveSlotInfo[],loadedTime:number,worldOptions:Parameters<typeof oldSaveNote>[0],now:number,imported:boolean):LoadedSaveFacts{
 const slot=imported?null:loadedSlot(slots,loadedTime),prot=slots.find(s=>s.kind==='protected');
 return{copy:imported?'Imported village file':slot?`${slot.label} save`:'Saved village',age:slot?ageText(slot.savedAt,now):imported?'just imported':'time unknown',
  rollback:prot&&prot!==slot?`Rollback point: Protected copy, ${ageText(prot.savedAt,now)}`:null,repaired:oldSaveNote(worldOptions)?.items.slice(0,-1)??[]};
}
/** After Load, Restore checkpoint or Import: one dismissible card naming the copy that loaded, its age, the rollback
 * point and any systems an older save started without. Presentation only. */
export function LoadedSaveCard({engine,classic=false}:{engine:Engine;classic?:boolean}){
 const seen=useRef(engine.game),[facts,setFacts]=useState<LoadedSaveFacts|null>(null);
 const game=engine.game;
 useEffect(()=>{
  if(seen.current===game)return;seen.current=game;
  let last:{operation:string}|null=null;try{last=engine.lifecycleReport().last;}catch{last=null;}
  if(!last||!['restore','import'].includes(last.operation)){setFacts(null);return;}
  let slots:SaveSlotInfo[]=[];try{slots=readSlots(saveStorage);}catch{slots=[];}
  setFacts(loadedSaveFacts(slots,game.state.time,game.state.worldOptions,Date.now(),last.operation==='import'));
 },[game,engine]);
 if(!facts)return null;
 return <section className={classic?'hud-panel text-base leading-snug':'hw-prev hw-loaded'} role="status" aria-label="Village loaded" data-loaded-save>
  <h3>Loaded: {facts.copy}</h3>
  <p className="hw-prev-tally">Saved {facts.age}.{facts.rollback?` ${facts.rollback}.`:''}</p>
  {facts.repaired.length>0&&<details><summary>Started fresh in this older save ({facts.repaired.length})</summary><ul>{facts.repaired.map((l,i)=><li key={i}>{l}</li>)}</ul></details>}
  <button type="button" className="hw-prev-x" aria-label="Dismiss load note" onClick={()=>setFacts(null)}>×</button>
 </section>;
}
