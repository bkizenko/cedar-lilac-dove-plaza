import {useState} from 'react';
import type {Engine} from '../game/engine';
import {knownSettlement} from '../game/barter';
import {firstHourGoals,firstSteps} from './firstHourGoals';
const HIDE_KEY='hw-first-guide-hidden';
const hiddenStored=()=>{try{return typeof localStorage!=='undefined'&&localStorage.getItem(HIDE_KEY)==='1';}catch{return false;}};
/** Quiet first-ten-minutes strip: the next three open steps (collect, shelter, store, neighbour, first child) from live state.
 * Each step hides once done, the strip hides when all are done, and the player can dismiss it for good. Never blocks play. */
export function FirstHourGoals({engine,classic=false}:{engine:Engine;classic?:boolean}){
 const [hidden,setHidden]=useState(hiddenStored);
 const g=engine.game;
 if(hidden)return null;
 const goals=firstHourGoals(g.state,b=>g.finished(b as never),t=>knownSettlement(g,t),firstSteps(g.state,g.state.units));
 if(!goals.length)return null;
 const hide=()=>{try{localStorage.setItem(HIDE_KEY,'1');}catch{/* private mode: hide for this session */}setHidden(true);};
 return <aside className={classic?'hud-panel text-base leading-snug px-2 py-1':'hw-goals'} aria-label="Next things to do" data-first-hour-goals>
  <strong>Next</strong><button type="button" className={classic?"float-right min-h-11 min-w-11 px-2 underline":"hw-goals-hide"} aria-label="Hide the first steps guide" onClick={hide}>Hide</button><ol>{goals.map(x=><li key={x}>{x}</li>)}</ol>
 </aside>;
}
