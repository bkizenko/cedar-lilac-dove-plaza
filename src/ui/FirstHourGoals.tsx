import type {Engine} from '../game/engine';
import {knownSettlement} from '../game/barter';
import {firstHourGoals} from './firstHourGoals';
/** Quiet strip listing what is still left of the first three goals; hides itself once all are done. */
export function FirstHourGoals({engine,classic=false}:{engine:Engine;classic?:boolean}){
 const g=engine.game,goals=firstHourGoals(g.state,b=>g.finished(b as never),t=>knownSettlement(g,t));
 if(!goals.length)return null;
 return <aside className={classic?'hud-panel text-base leading-snug px-2 py-1':'hw-goals'} aria-label="Next things to do" data-first-hour-goals>
  <strong>Next</strong><ol>{goals.map(x=><li key={x}>{x}</li>)}</ol>
 </aside>;
}
