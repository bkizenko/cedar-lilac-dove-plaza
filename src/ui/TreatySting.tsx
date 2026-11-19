import {useEffect} from 'react';
import type {Engine} from '../game/engine';
import {newTreatyWatch,watchTreaties} from './treatySting';
/** Alliance, truce, war and capitulation each get a short distinct line and sound, only when the real state changes. */
export function TreatySting({engine}:{engine:Engine|null}){
 useEffect(()=>{
  if(!engine)return;const w=newTreatyWatch();
  const id=setInterval(()=>{if(engine.disposed)return;const g=engine.game,stings=watchTreaties(g,w);if(!stings.length)return;g.onSfx?.(stings[0].sfx);g.banner(stings.map(s=>s.line).join(' · '),5);engine.pushHud();},1000);
  return()=>clearInterval(id);
 },[engine]);
 return null;
}
