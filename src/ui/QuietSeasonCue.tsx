import {useState} from 'react';
import type {Engine} from '../game/engine';
import {quietSeasonCue} from './quietSeason';
/** Soft cue in a slow stretch: names how many have no work and offers ×4 speed. Dismissed until the next season. */
export function QuietSeasonCue({engine,season,classic=false}:{engine:Engine;season:string;classic?:boolean}){
 const [hidden,setHidden]=useState<string|null>(null),key=season;
 const cue=hidden===key?null:quietSeasonCue(engine.game.state,season);
 if(!cue)return null;
 return <aside className={classic?'hud-panel text-base leading-snug px-2 py-1':'hw-goals hw-quiet'} role="status" aria-label="Quiet season" data-quiet-season>
  <p>{cue.line}</p>
  <button type="button" className="min-h-11 rounded border px-2" onClick={()=>engine.setSpeed(4)}>Speed up ×4</button>
  <button type="button" className="min-h-11 px-2" onClick={()=>setHidden(key)}>Not now</button>
 </aside>;
}
