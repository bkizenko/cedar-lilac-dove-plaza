import{useState}from'react';
import{BOAT_CLASSES,boatClass,boatServiceProject,type BoatClass}from'../game/boatClasses';
import{beginBoatExploration}from'../game/boatExploration';
import{vesselLoad}from'../game/carriedLoad';
import type {Engine} from '../game/engine';
import {beginRiverboat,boardRiverboat,boatCrew,riverboatRowers,landRiverboat,boatConstructionIssue,beginBoatService,abandonBoatService,hullServicePhysicalIssue,boatServiceQuote} from '../game/boats';

export function BoatControls({engine,dock}:{engine:Engine;dock?:number}) {
  const [kind,setKind]=useState<BoatClass>('riverboat');
  const g=engine.game, selected=g.selectedUnits();
  const rides=new Set(selected.filter(u=>u.boat).map(u=>u.boat!.id));
  const boats=(g.state.boats||[]).filter(b=>b.team===0&&b.hp>0&&
    (dock!==undefined?b.dock===dock:b.id===g.selectedBoat||rides.has(b.id)||selected.some(u=>Math.hypot(u.x-b.x,u.z-b.z)<24)));
  const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
  const personalCanoes=dock===undefined&&selected.length>0&&selected.every(u=>u.haulage==='canoe'&&!u.boat&&!u.prisoner);
  if(dock===undefined&&!boats.length&&!personalCanoes)return null;
  const hullIssue=dock===undefined?null:boatConstructionIssue(g,kind,dock);
  const orphaned=dock===undefined?[]:(g.state.haulageProjects??[]).filter(p=>p.team===0&&p.work.workplace===dock&&p.work.hullOrder?.mode==='service'&&!g.state.boats?.some(b=>b.id===p.work.hullOrder!.boatId&&b.team===0&&b.hp>0));
  const controls=<div className="craft-options">
      {personalCanoes&&<button type="button" onClick={()=>run(()=>{engine.moveMode=true;engine.canvas.focus();g.banner('Click connected water to paddle, or dry ground to carry the canoe ashore',4);})}>Paddle dugout</button>}
      {orphaned.map(p=><div key={p.id}><small>The original service hull is lost; paid materials remain spent.</small><button type="button" onClick={()=>run(()=>abandonBoatService(g,p.work.hullOrder!.boatId!))}>Abandon lost hull service · no refund</button></div>)}
      {dock!==undefined&&<><label>Hull type<select value={kind} onChange={e=>setKind(e.target.value as BoatClass)}>{Object.entries(BOAT_CLASSES).map(([id,s])=><option key={id} value={id}>{s.name} · {s.seats} seats</option>)}</select></label><button type="button" disabled={!!hullIssue} onClick={()=>run(()=>beginRiverboat(g,dock,0,undefined,kind==='riverboat'?undefined:kind))}><strong>Build {BOAT_CLASSES[kind].name.toLowerCase()} · {BOAT_CLASSES[kind].seats} seats</strong><span>{BOAT_CLASSES[kind].wood} logs · {BOAT_CLASSES[kind].stone} stone{BOAT_CLASSES[kind].cordage?` · ${BOAT_CLASSES[kind].cordage} cordage`:''} · {BOAT_CLASSES[kind].seconds}s work</span></button>{hullIssue&&<small>{hullIssue}</small>}</>}
      {boats.map(b=>{
        const crew=boatCrew(g,b.id), free=b.capacity-crew.length,load=vesselLoad(b,crew.filter(u=>u.boat?.phase==='aboard'));
        const people=(selected.length?selected:g.state.units).filter(u=>u.team===0&&u.hp>0&&!u.boat&&!u.haulage&&Math.hypot(u.x-b.x,u.z-b.z)<=24);
        const quote=boatServiceQuote(b),serviceMaterials=quote&&g.tribe(0).wood>=quote.wood&&(g.tribe(0).items?.cordage??0)>=quote.cordage,focused=g.selectedBoat===b.id,service=boatServiceProject(g,b.id),serviceDock=g.state.buildings.find(d=>d.type==='dock'&&d.team===b.team&&g.finished(d)&&!hullServicePhysicalIssue(g,b.id,d,b.team));
        return <section className="boat-card" key={b.id}>
          <div className="boat-status"><strong>{b.hullClass?`${boatClass(b).name} · `:""}{crew.length}/{b.capacity} seats</strong><span>{crew.some(u=>u.boat?.phase==='boarding')?'Boarding':b.exploration?'Exploring':b.captain?'Ready to row':'Moored'}</span></div>
          <span title="People and actual carried goods slow this hull.">{riverboatRowers(g,crew)} rowers · Load {Math.round(load.fraction*100)}%</span>
          {b.hullClass&&<span>Hull {b.hp.toFixed(1)}/{boatClass(b).maxHp} · Paid service needs this boat moored at a real dock</span>}
          {b.hullClass&&b.hp<boatClass(b).maxHp-1e-8&&!service&&<button type="button" disabled={!serviceDock||!serviceMaterials} onClick={()=>run(()=>serviceDock&&beginBoatService(g,b.id,serviceDock.id))}>Service this hull<span>{quote?.wood} logs · {quote?.cordage} cordage · 60 work seconds</span></button>}
          {service&&<><span>{service.work.paused?'Paused paid service':'Hull reserved for dock service'} · {Math.floor(service.work.progress/service.work.duration*100)}%</span>{service.work.paused&&<button type="button" disabled={!serviceDock} onClick={()=>run(()=>serviceDock&&beginBoatService(g,b.id,serviceDock.id))}>Resume paid service</button>}<button type="button" onClick={()=>run(()=>abandonBoatService(g,b.id))}>Abandon service · no refund</button></>}
          {!b.captain&&<p>Bring residents close, then board.</p>}
          <div className="boat-actions">
            <button type="button" disabled={!free||!people.length} onClick={()=>run(()=>boardRiverboat(g,b.id,people.slice(0,free)))}>
              Board {Math.min(free,people.length)||''}
            </button>
            {!focused&&<button type="button" onClick={()=>run(()=>{g.selectBoat(b.id);engine.view.look.x=b.x;engine.view.look.z=b.z;})}>Select boat</button>}
            {focused&&<button type="button" disabled={!b.captain} onClick={()=>{engine.moveMode=true;engine.canvas.focus();g.banner('Click connected water to row',3);engine.pushHud();}}>Row</button>}
            <button type="button" disabled={!b.captain||!!b.exploration} onClick={()=>run(()=>{const issue=beginBoatExploration(g,b.id);if(issue)g.banner(issue,4);})}>Explore water</button>
            <button type="button" disabled={!crew.length} onClick={()=>run(()=>{engine.moveMode=false;landRiverboat(g,b.id);})}>Land</button>
            {b.captain&&<button type="button" onClick={()=>run(()=>{engine.moveMode=false;delete b.exploration;const captain=crew.find(u=>u.id===b.captain);if(captain){captain.order='hold';g.invalidateRoute(captain);}})}>Stop</button>}
          </div>
          {!!crew.length&&<details><summary>Passengers</summary><ul className="boat-passengers">{crew.map(u=><li key={u.id}>{u.name||'Resident'}{u.id===b.captain?' · Helm':u.boat?.phase==='boarding'?' · Boarding':u.boat?.phase==='landing'?' · Landing':''}</li>)}</ul></details>}
        </section>;
      })}
    </div>;
  return dock!==undefined?<details className="craft-group" open><summary>Riverboats</summary>{controls}</details>:controls;
}
