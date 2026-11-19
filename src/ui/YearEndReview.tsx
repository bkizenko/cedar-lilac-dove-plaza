import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {yearSecondsOf} from '../game/calendarPacing';
import {yearReview} from './sessionRecap';

const KEY='hearthwild.ui.yearReview';
const off=()=>{try{return globalThis.localStorage?.getItem(KEY)==='off';}catch{return false;}};
/** At the turn of each in-game year, one dismissible card with real counts for the year just ended (births, deaths,
 * arrivals, finished works, losses, harvests, raids, treaties) from the village chronicle. Can be switched off. */
export function YearEndReview({engine,classic=false}:{engine:Engine;classic?:boolean}){
 const st=engine.game.state,len=yearSecondsOf(st),year=Math.floor(st.time/len);
 const seen=useRef<{game:unknown;year:number}|null>(null),[card,setCard]=useState<ReturnType<typeof yearReview>>(null);
 useEffect(()=>{
  const prev=seen.current;seen.current={game:engine.game,year};
  if(!prev||prev.game!==engine.game||year!==prev.year+1||off())return;
  setCard(yearReview(engine.game.state.lifeHistory,prev.year,len));
 },[engine,year,len]);
 if(!card)return null;
 return <section className={classic?'hud-panel text-base leading-snug':'hw-prev hw-year'} role="status" aria-label="Year in review" data-year-review>
  <h3>Year {card.year} in review</h3>
  <p className="hw-prev-tally">{card.summary}</p>
  {card.latest.length>0&&<details><summary>What happened</summary><ul>{card.latest.map((l,i)=><li key={i}>{l}</li>)}</ul></details>}
  <button type="button" className="min-h-11 px-2" onClick={()=>{try{globalThis.localStorage?.setItem(KEY,'off');}catch{/* preference only */}setCard(null);}}>Don't show yearly reviews</button>
  <button type="button" className="hw-prev-x" aria-label="Dismiss year review" onClick={()=>setCard(null)}>×</button>
 </section>;
}
