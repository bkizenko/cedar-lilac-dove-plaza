import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {nextWelcome,type Arrival} from './newcomerWelcome';
/** How long one welcome line stays, in real milliseconds. */
export const WELCOME_MS=6000;
/** A short line and soft cue when a trader, envoy or refugee family arrives; quiet while the player is mid-command. */
export function NewcomerWelcome({engine}:{engine:Engine|null}){
 const [shown,setShown]=useState<Arrival|null>(null),current=useRef<Arrival|null>(null);
 current.current=shown;
 useEffect(()=>{
  if(!engine)return;
  const id=setInterval(()=>{if(engine.disposed||current.current)return;const next=nextWelcome(engine.game);if(!next)return;current.current=next;engine.game.onSfx?.('trade');setShown(next);},1000);
  return()=>clearInterval(id);
 },[engine]);
 useEffect(()=>{if(!shown)return;const t=setTimeout(()=>setShown(null),WELCOME_MS);return()=>clearTimeout(t);},[shown]);
 return <WelcomeLine arrival={shown}/>;
}
export function WelcomeLine({arrival}:{arrival:Arrival|null}){
 if(!arrival)return null;
 return <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-3" role="status" aria-live="polite">
  <p className="max-w-[min(26rem,calc(100vw-24px))] rounded-lg bg-black/70 px-3 py-2 text-[16px] leading-snug text-parchment shadow" data-newcomer-welcome>{arrival.line}</p>
 </div>;
}
