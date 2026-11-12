import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
/** Wait for the real owner checkpoint; never encode the display projection. */
export function VillageSaveButton({engine,onResult}:{engine:Engine|null;onResult?:(message:string)=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),generation=useRef(0),pending=useRef(false);
 useEffect(()=>{generation.current++;pending.current=false;setBusy(false);setMessage('');return()=>{generation.current++;};},[engine]);
 const save=async()=>{
  if(!engine||engine.disposed||pending.current)return;
  const request=++generation.current,epoch=engine.sessionEpoch;
  const current=()=>generation.current===request&&!engine.disposed&&engine.sessionEpoch===epoch;
  pending.current=true;setBusy(true);setMessage('');
  try{const result=await engine.saveNow();if(current()){setMessage(result.message);onResult?.(result.message);}}
  catch(error){if(current()){const detail=error instanceof Error?error.message:'Could not save';setMessage(detail);onResult?.(detail);}}
  finally{if(generation.current===request){pending.current=false;setBusy(false);}}
 };
 return <span className="inline-flex items-center gap-2"><button type="button" className="px-2 py-2 disabled:opacity-50" disabled={!engine||engine.disposed||!engine.commandReady||busy} aria-busy={busy} onClick={()=>void save()}>{busy?'Saving…':engine?.game.testMode?'Save test run':'Save'}</button>{message&&!onResult&&<span role="status" aria-live="polite" className="text-xs">{message}</span>}</span>;
}
