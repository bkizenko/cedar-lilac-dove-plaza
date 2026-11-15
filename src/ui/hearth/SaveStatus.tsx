import {useEffect,useState} from 'react';
import {parseStoredSave} from '../../game/storageCodec';
import {SAVE_KEY} from '../../game/constants';
import {saveStorage,saveStorageStatus} from '../../game/saveStore';
import type {Engine} from '../../game/engine';
import {ageText,autosaveLine,slotInfo,type SaveSlotInfo,type SaveSlotKind} from '../saveStatus';
/** Menu > Game save trust: saved copies with age and generator version, plus plain autosave health. Reads storage headers only. */
const SLOTS:[SaveSlotKind,string][]=[['latest',SAVE_KEY],['backup',SAVE_KEY+':bak'],['protected',SAVE_KEY+':protected']];
export function readSlots(storage:Pick<Storage,'getItem'>):SaveSlotInfo[]{
 const out:SaveSlotInfo[]=[];
 for(const [kind,key] of SLOTS){try{const raw=storage.getItem(key);if(!raw)continue;const info=slotInfo(kind,parseStoredSave(raw));if(info)out.push(info);}catch{/* unreadable copy is simply not listed */}}
 return out;
}
export function SaveStatus({engine,refresh=0}:{engine:Engine|null;refresh?:number}){
 const [slots,setSlots]=useState<SaveSlotInfo[]>([]),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{try{setSlots(readSlots(saveStorage));}catch{setSlots([]);}setNow(Date.now());},[refresh,engine]);
 useEffect(()=>{const t=setInterval(()=>{setNow(Date.now());try{setSlots(readSlots(saveStorage));}catch{/* keep last */}},20000);return()=>clearInterval(t);},[]);
 let auto:ReturnType<typeof autosaveLine>|null=null;
 try{if(engine){const r=engine.autosave.report();auto=autosaveLine({mode:r.mode,failure:r.lastFailure,failedCommits:r.counts.failed,nextAttemptMs:r.recovery.nextAttemptInMilliseconds,testMode:engine.game.testMode});}}catch{auto=null;}
 let storageNote:string|undefined;
 try{const st=saveStorageStatus();storageNote=st.failures.length?`Large-save storage problem: ${st.failures[st.failures.length-1].kind.replace(/-/g,' ')}. Your last good copy is kept; use Export village to keep a file.`:st.idbKeys.length?'Large village saves are kept in browser database storage.':undefined;}catch{storageNote=undefined;}
 return <SaveStatusView slots={slots} now={now} auto={auto} storageNote={storageNote}/>;
}
export function SaveStatusView({slots,now,auto,storageNote}:{slots:SaveSlotInfo[];now:number;auto:ReturnType<typeof autosaveLine>|null;storageNote?:string}){
 return <div className="hw-save-status" aria-label="Save status">
  {auto&&<p role="status" className={`hw-save-line t-${auto.tone}`}><strong>{auto.text}</strong>{auto.detail&&<span>{auto.detail}</span>}</p>}
  {slots.length>0?<ul className="hw-save-slots">{slots.map(s=><li key={s.kind}><b>{s.label}</b><span>{ageText(s.savedAt,now)}</span><span>Seed {s.seed??'?'}</span><span>Gen {s.generation??1}</span></li>)}</ul>:<p className="hw-save-empty">No saved copy yet. Press Save to keep this village.</p>}
  {storageNote&&<p className="hw-save-note" role="status">{storageNote}</p>}
  <p className="hw-save-note">Loading an older village never changes its terrain.</p>
 </div>;
}
