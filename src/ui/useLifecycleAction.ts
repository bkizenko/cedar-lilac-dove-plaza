import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
/** Lifecycle methods may intentionally change epoch. The Engine validates the
 * transition; UI waits for that outcome and ignores unmounted/other-engine replies. */
export function useLifecycleAction(engine:Engine|null){
 const generation=useRef(0),pending=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{generation.current++;pending.current=false;setBusy(false);setError('');return()=>{generation.current++;};},[engine]);
 async function run<T>(action:()=>T|Promise<T>,complete?:(value:T)=>void):Promise<void>{
  if(!engine||engine.disposed||pending.current)return;
  const request=++generation.current;pending.current=true;setBusy(true);setError('');
  const current=()=>generation.current===request&&!engine.disposed;
  try{const value=await action();if(current()){if(value===false)setError('The village was not changed.');else complete?.(value);}}
  catch(cause){if(current())setError(cause instanceof Error?cause.message:'Could not change the active village');}
  finally{if(generation.current===request){pending.current=false;setBusy(false);}}
 }
 return{busy,error,run};
}
