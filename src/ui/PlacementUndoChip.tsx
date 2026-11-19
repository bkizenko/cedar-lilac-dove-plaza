import {useEffect,useState} from 'react';
import type {Engine} from '../game/engine';
import {UNDO_WINDOW_SECONDS,undoIssue,type PlacementUndo} from './commandUndo';
type UndoEngine=Pick<Engine,'game'|'undoLastPlacement'>&{lastPlacement:PlacementUndo|null};
/** Live seconds left on the undo window, or 0 when the chip should be hidden. */
export function undoSecondsLeft(engine:UndoEngine,now:number){const u=engine.lastPlacement;if(!u||undoIssue(engine.game,u))return 0;return Math.max(0,UNDO_WINDOW_SECONDS-(now-u.placedAt)/1000);}
/** A short undo chip after a build placement: refunds exactly what the placement took, never work already done. */
export function PlacementUndoChip({engine,now}:{engine:UndoEngine|null;now?:number}){
 const [,tick]=useState(0);
 const left=engine?undoSecondsLeft(engine,now??performance.now()):0;
 useEffect(()=>{if(left<=0||now!==undefined)return;const t=setTimeout(()=>tick(n=>n+1),250);return()=>clearTimeout(t);});
 if(!engine||left<=0)return null;
 return <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-3" role="status">
  <button type="button" className="pointer-events-auto min-h-11 min-w-11 max-w-[360px] rounded-full border border-bronze/60 bg-black/80 px-4 text-[16px] text-parchment shadow-lg" onClick={()=>{engine.undoLastPlacement();tick(n=>n+1);}}>
   ↶ Undo placement <span className="text-[13px] text-parchment-dim">{Math.ceil(left)}s</span>
  </button>
 </div>;
}
