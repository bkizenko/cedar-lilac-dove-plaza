import type {Engine} from '../game/engine';
import {beginRiverboat,boardRiverboat,boatCrew,landRiverboat} from '../game/boats';
export function BoatControls({engine,dock}:{engine:Engine;dock?:number}){
 const g=engine.game,selected=g.selectedUnits(),rides=new Set(selected.filter(u=>u.boat).map(u=>u.boat!.id));
 const boats=(g.state.boats||[]).filter(b=>b.team===0&&b.hp>0&&(dock!==undefined?b.dock===dock:rides.has(b.id)||selected.some(u=>Math.hypot(u.x-b.x,u.z-b.z)<24)));
 const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
 if(dock===undefined&&!boats.length)return null;
 return <details className="craft-group" open><summary>Riverboats</summary><div className="craft-options">
 {dock!==undefined&&<button type="button" onClick={()=>run(()=>beginRiverboat(g,dock))}><strong>Build ferry · 5 seats</strong><span>40 logs · 4 stone · 150s work</span></button>}
 {boats.map(b=><div key={b.id}><strong>Ferry {b.id} · {boatCrew(g,b.id).length}/5 aboard</strong>
 {(dock!==undefined||selected.some(u=>!u.boat))&&<button type="button" onClick={()=>run(()=>boardRiverboat(g,b.id,selected.length?selected:g.state.units.filter(u=>u.team===0&&u.hp>0&&Math.hypot(u.x-b.x,u.z-b.z)<24).slice(0,5)))}>Board nearby residents</button>}
 <button type="button" disabled={!b.captain} onClick={()=>run(()=>{g.clearSelect();const u=g.state.units.find(u=>u.id===b.captain);if(u){u.selected=true;engine.view.look.x=b.x;engine.view.look.z=b.z;}})}>Select boat · click water to sail</button>
 <button type="button" disabled={!boatCrew(g,b.id).length} onClick={()=>run(()=>landRiverboat(g,b.id))}>Disembark at this shore</button></div>)}
 </div></details>;
}
