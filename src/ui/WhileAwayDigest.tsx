import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {awayDigest} from './sessionRecap';

/** "While you were away": after the tab was hidden for a while, one dismissible card counting what the village
 * chronicle recorded meanwhile. Presentation only; reads state.lifeHistory, writes nothing. */
export function WhileAwayDigest({engine,classic=false}:{engine:Engine;classic?:boolean}){
 const left=useRef<{ms:number;time:number}|null>(null);
 const [digest,setDigest]=useState<{summary:string;latest:string[]}|null>(null);
 useEffect(()=>{
  const vis=()=>{
   if(document.visibilityState==='hidden'){left.current={ms:Date.now(),time:engine.game.state.time};return;}
   const l=left.current;left.current=null;if(!l)return;
   const d=awayDigest(engine.game.state.lifeHistory,l.time,Date.now()-l.ms);if(d)setDigest(d);
  };
  document.addEventListener('visibilitychange',vis);return()=>document.removeEventListener('visibilitychange',vis);
 },[engine]);
 if(!digest)return null;
 return <section className={classic?'hud-panel text-base leading-snug':'hw-prev hw-away'} role="status" aria-label="While you were away" data-away-digest>
  <h3>While you were away</h3>
  <p className="hw-prev-tally">{digest.summary}</p>
  {digest.latest.length>0&&<ul>{digest.latest.map((l,i)=><li key={i}>{l}</li>)}</ul>}
  <button type="button" className="hw-prev-x" aria-label="Dismiss digest" onClick={()=>setDigest(null)}>×</button>
 </section>;
}
