import {useEffect,useState} from 'react';
import type {Engine} from '../game/engine';
import {hearthStoryAt} from './hearthStories';
/** Real seconds each idle story line stays before the next. */
export const STORY_ROTATE_MS=12000;
/** When nothing needs the player, one short true line about the village, rotating slowly. */
export function HearthIdleStory({engine,season}:{engine:Engine|null;season?:string}){
 const [step,setStep]=useState(0);
 useEffect(()=>{const t=setInterval(()=>setStep(n=>n+1),STORY_ROTATE_MS);return()=>clearInterval(t);},[]);
 const line=engine&&!engine.disposed?hearthStoryAt(engine.game,step,season):null;
 return <StoryLine line={line}/>;
}
export function StoryLine({line}:{line:string|null}){
 if(!line)return null;
 return <div className="pointer-events-none fixed inset-x-0 bottom-44 z-20 flex justify-center px-3" aria-live="off">
  <p className="max-w-[min(24rem,calc(100vw-24px))] truncate rounded-md bg-black/45 px-3 py-1 text-[16px] italic leading-snug text-parchment/90" data-hearth-story title={line}>{line}</p>
 </div>;
}
