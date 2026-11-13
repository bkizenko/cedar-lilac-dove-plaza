import {useEffect,useState} from 'react';
import {Tent,Home,Hotel,Hammer,Flame} from 'lucide-react';
import type {Engine} from '../../game/engine';
import {stationViews,stationsOf,type StationView} from '../../game/waystations';
import './roads.css';

/** Hearth card for road stops: one short row per stop on the player's long routes. No paragraphs: what it is, what is in the store, who used it. */
const ICON=[Hammer,Tent,Home,Hotel];
export function roadsRows(engine:Engine|null):StationView[]{
 try{const g=engine?.game;if(!g||!stationsOf(g).length)return [];return stationViews(g,0).slice(0,12);}catch{return [];}
}
export function RoadsCard({engine}:{engine:Engine|null}){
 const [rows,setRows]=useState<StationView[]>(()=>roadsRows(engine));
 useEffect(()=>{const id=globalThis.setInterval(()=>setRows(roadsRows(engine)),1000);setRows(roadsRows(engine));return()=>globalThis.clearInterval(id);},[engine]);
 if(!rows.length)return null;
 const shown=rows.slice(0,3);
 return <section className="hw-roads" aria-label="Road stops">
  <h3>Road stops</h3>
  {shown.map(r=>{const Icon=ICON[Math.max(0,Math.min(3,r.stage))]||Tent;
   return <button key={r.id} type="button" className={'hw-road'+(r.raided?' is-raided':'')} onClick={()=>{if(engine){engine.focusMinimap(r.x,r.z);engine.pushHud();}}} title="Look at this stop">
    <span className="hw-road-ico"><Icon size={24}/></span>
    <span className="hw-road-main"><b>{r.label}</b>
     {r.progress!==null?<span className="hw-road-bar" aria-label={`Building ${Math.round(r.progress*100)} percent`}><i style={{width:`${Math.round(r.progress*100)}%`}}/></span>
      :<span className="hw-road-chips">{r.stage>=2&&<span><Flame size={14}/>{r.food} food</span>}<span>{r.visits} stops</span>{r.nights>0&&<span>{r.nights} nights</span>}{r.income>0&&<span>+{r.income} toll</span>}{r.raided>0&&<span className="t-bad">raided x{r.raided}</span>}</span>}
     {r.waiting&&<small>{r.waiting}</small>}
    </span>
   </button>;})}
  {rows.length>shown.length&&<small className="hw-road-more">and {rows.length-shown.length} more</small>}
 </section>;
}
