import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {foodDays} from './hearth/glanceReads';
import {readyFoodStock} from './FoodStoreReadout';
import {hearthIsQuiet} from './hearthStories';
import {newHarvestWatch,watchFirstHarvest,type FirstHarvest} from './firstHarvest';
const key=(seed:number)=>`hw-first-harvest:${seed}`;
const already=(seed:number)=>{try{return typeof localStorage!=='undefined'&&localStorage.getItem(key(seed))==='1';}catch{return false;}};
/** Real days of food one unit of stock buys at today's appetite, or null when nobody eats yet. */
export function daysPerFoodUnit(food:number,days:number|null){return days!==null&&food>0&&Number.isFinite(days)?days/food:null;}
/** Once per save: the first real harvest brings a short glance at the field, a soft cue and one line naming who brought it in. */
export function FirstHarvestMoment({engine}:{engine:Engine|null}){
 const [shown,setShown]=useState<FirstHarvest|null>(null),watch=useRef(newHarvestWatch());
 useEffect(()=>{
  if(!engine)return;watch.current=newHarvestWatch();
  const id=setInterval(()=>{
   const g=engine.game;if(engine.disposed||watch.current.fired||already(g.state.seed))return;
   const t=g.tribe(0),food=readyFoodStock({food:t.food,foodLots:t.foodLots} as never);
   const hit=watchFirstHarvest(g,watch.current,daysPerFoodUnit(food,foodDays(g)));if(!hit)return;
   try{localStorage.setItem(key(g.state.seed),'1');}catch{/* private mode: once per session */}
   g.onSfx?.('birth');if(hearthIsQuiet(g))engine.focusMinimap(hit.x,hit.z);setShown(hit);
  },1000);
  return()=>clearInterval(id);
 },[engine]);
 useEffect(()=>{if(!shown)return;const t=setTimeout(()=>setShown(null),8000);return()=>clearTimeout(t);},[shown]);
 return <HarvestCard harvest={shown} onLook={shown&&engine?()=>engine.focusMinimap(shown.x,shown.z):undefined}/>;
}
export function HarvestCard({harvest,onLook}:{harvest:FirstHarvest|null;onLook?:()=>void}){
 if(!harvest)return null;
 return <div className="pointer-events-none fixed inset-x-0 top-28 z-40 flex justify-center px-3" role="status" aria-live="polite">
  <div className="pointer-events-auto flex max-w-[min(26rem,calc(100vw-24px))] items-center gap-2 rounded-lg border border-bronze/50 bg-black/75 px-3 py-2 text-[16px] leading-snug text-parchment shadow" data-first-harvest>
   <span>{harvest.line}</span>{onLook&&<button type="button" className="min-h-11 min-w-11 shrink-0 rounded border px-2" onClick={onLook}>See field</button>}
  </div>
 </div>;
}
