import {useState} from 'react';
import type {Engine} from '../game/engine';
import {campRelocationIssue} from '../game/nomadicCamp';
import {personName} from '../game/people';
export function NomadicCampControl({engine}:{engine:Engine}){
 const [feedback,setFeedback]=useState(''),g=engine.game,status=g.campMoveStatus(),scout=g.selectedUnits().find(u=>u.team===0&&u.hp>0),active=status&&!['complete','cancelled'].includes(status.phase);
 if(!active&&g.state.buildings.some(b=>b.team===0&&b.hp>0))return null;
 const issue=scout?campRelocationIssue(g,scout.x,scout.z):'Select a resident at the campsite you have explored';
 const act=(run:()=>boolean)=>{const okay=run();setFeedback(okay?'':g.state.campMove?.blockedReason||g.state.banner);engine.pushHud();engine.canvas.focus();};
 const sum=(bag:Record<string,number>)=>Object.values(bag).reduce((n,v)=>n+v,0),button='min-h-11 rounded-md border border-bronze/40 px-3 py-2 text-sm disabled:opacity-50';
 return <section className="hud-panel mt-3 space-y-2" aria-label="Move nomadic camp"><h3 className="text-sm font-semibold">Nomadic camp</h3>{active?<>
  <p className="text-xs text-parchment-dim">{status.phase==='paused'?'Paused':status.phase==='cancelling'?'Bringing the cache back':'Moving household and cache'} · {status.peopleArrived}/{status.livingPeople} residents arrived</p>
  <p className="text-xs text-parchment-dim">{sum(status.sourceGoods).toFixed(1)} supplies at old camp · {sum(status.carriedGoods).toFixed(1)} carried · {sum(status.cache).toFixed(1)} delivered</p>
  <p className="text-xs text-parchment-dim">{status.metrics.loadsDelivered} loads delivered · {Math.round(status.metrics.distanceMeters)} metres walked</p>
  <div className="flex flex-wrap gap-2">{status.phase==='paused'?<button className={button} onClick={()=>act(()=>g.resumeCampMove())}>Resume camp move</button>:<button className={button} onClick={()=>act(()=>g.pauseCampMove())}>Pause camp move</button>}<button className={button} onClick={()=>act(()=>g.cancelCampMove())}>Carry supplies back</button></div>
  {(feedback||status.blockedReason)&&<p role="status" className="text-xs text-parchment-dim">{feedback||status.blockedReason}</p>}
 </>:<><p className="text-xs text-parchment-dim">Walk a resident to a discovered campsite, then move the household there. People carry the existing supplies; the old cache stays in place until collected.</p><button className={button} disabled={!!issue} onClick={()=>scout&&act(()=>g.relocateCamp(scout.x,scout.z))}>{scout?`Move camp to ${personName(scout)}’s position`:'Move camp'}</button>{issue&&<p className="text-xs text-parchment-dim">{issue}</p>}</>}</section>;
}
