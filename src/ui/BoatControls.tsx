import type {Engine} from '../game/engine';
import {beginRiverboat,boardRiverboat,boatCrew,landRiverboat} from '../game/boats';

export function BoatControls({engine,dock}:{engine:Engine;dock?:number}) {
  const g=engine.game, selected=g.selectedUnits();
  const rides=new Set(selected.filter(u=>u.boat).map(u=>u.boat!.id));
  const boats=(g.state.boats||[]).filter(b=>b.team===0&&b.hp>0&&
    (dock!==undefined?b.dock===dock:b.id===g.selectedBoat||rides.has(b.id)||selected.some(u=>Math.hypot(u.x-b.x,u.z-b.z)<24)));
  const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
  if(dock===undefined&&!boats.length)return null;
  return <details className="craft-group" open><summary>{g.selectedBoat!==null?'Boat controls':'Riverboats'}</summary>
    <div className="craft-options">
      {dock!==undefined&&<button type="button" onClick={()=>run(()=>beginRiverboat(g,dock))}>
        <strong>Build ferry · 5 seats</strong><span>40 logs · 4 stone · 150s work</span>
      </button>}
      {boats.map(b=>{
        const crew=boatCrew(g,b.id), free=b.capacity-crew.length;
        const people=(selected.length?selected:g.state.units).filter(u=>u.team===0&&u.hp>0&&!u.boat&&!u.haulage&&Math.hypot(u.x-b.x,u.z-b.z)<=24);
        const focused=g.selectedBoat===b.id;
        return <section className="boat-card" key={b.id}>
          <div className="boat-status"><strong>{crew.length}/{b.capacity} seats</strong><span>{crew.some(u=>u.boat?.phase==='boarding')?'Boarding':b.captain?'Ready to sail':'Moored'}</span></div>
          <p>{b.captain?'Click water to sail. Land beside a gentle shore.':'Bring residents close, then board to take the helm.'}</p>
          <div className="boat-actions">
            <button type="button" disabled={!free||!people.length} onClick={()=>run(()=>boardRiverboat(g,b.id,people.slice(0,free)))}>
              Board {Math.min(free,people.length)||''}
            </button>
            {!focused&&<button type="button" onClick={()=>run(()=>{g.selectBoat(b.id);engine.view.look.x=b.x;engine.view.look.z=b.z;})}>Select boat</button>}
            {focused&&<button type="button" disabled={!b.captain} onClick={()=>{engine.moveMode=true;engine.canvas.focus();g.banner('Click water to sail',3);engine.pushHud();}}>Sail</button>}
            <button type="button" disabled={!crew.length} onClick={()=>run(()=>{engine.moveMode=false;landRiverboat(g,b.id);})}>Land</button>
            {b.captain&&<button type="button" onClick={()=>run(()=>{engine.moveMode=false;const captain=crew.find(u=>u.id===b.captain);if(captain){captain.order='hold';g.invalidateRoute(captain);}})}>Stop</button>}
          </div>
          {!!crew.length&&<details><summary>Passengers</summary><ul className="boat-passengers">{crew.map(u=><li key={u.id}>{u.name||'Resident'}{u.id===b.captain?' · Helm':u.boat?.phase==='boarding'?' · Boarding':u.boat?.phase==='landing'?' · Landing':''}</li>)}</ul></details>}
        </section>;
      })}
    </div>
  </details>;
}
