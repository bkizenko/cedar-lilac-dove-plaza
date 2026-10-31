import {useState} from 'react';
import {Droplets,Flame,Wind,ChevronDown} from 'lucide-react';
import type {Engine} from '../game/engine';
import {isDependent} from '../game/settlement';
import {survivalStatus,beginWaterCollection,waterCollectionIssue} from '../game/survivalNeeds';

export function reserveLabel(seconds:number){
 if(!Number.isFinite(seconds))return 'No current demand';
 if(seconds<=0)return 'Empty';
 if(seconds<60)return `${Math.max(1,Math.floor(seconds))}s left`;
 return `${Math.floor(seconds/60)}m ${Math.floor(seconds%60)}s left`;
}
/** A compact disclosure in the HUD; the same real inventory and commands appear
 * in the ledger. Actions schedule physical work rather than crediting goods. */
export function NeedsPanel({engine,expanded=false}:{engine:Engine;expanded?:boolean}){
 const [feedback,setFeedback]=useState('');
 const [open,setOpen]=useState(false);
 const g=engine.game,status=survivalStatus(g);
 if(!status.enabled)return null;
 const blocked=g.state.ended?'The chapter has ended':null;
 const waterIssue=blocked||((expanded||open)?waterCollectionIssue(g):null);
 const fuelIssue=blocked||(!g.state.units.some(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!isDependent(g,u))?'No adult gatherers available':null);
 const collectWater=()=>{
  const result=beginWaterCollection(g);setFeedback(result.reason);g.banner(result.reason,4);engine.pushHud();
 };
 const gatherFuel=()=>{
  if(fuelIssue){setFeedback(fuelIssue);return;}
  g.setLaborPriority('wood');
  const gathering=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.job==='wood'&&u.order==='gather').length;
  const reason=`Timber focus set · ${gathering} gathering now. Other residents finish deliveries or committed work first.`;
  setFeedback(reason);g.banner(reason,5);engine.pushHud();
 };
 const content=<div className="space-y-3 px-3 pb-3 text-xs text-parchment">
  <dl className="grid grid-cols-2 gap-3">
   <div><dt className="text-parchment-dim">Drinking water</dt><dd className="font-medium">{Math.floor(status.water)} L · {reserveLabel(status.waterSeconds)}</dd><dd>{status.waterWorkers} collecting</dd></div>
   <div><dt className="text-parchment-dim">Fuel in stores</dt><dd className="font-medium">{Math.floor(status.fuel)} logs · {reserveLabel(status.fuelSeconds)}</dd><dd>{status.fuelWorkers} gathering timber</dd></div>
  </dl>
  <p>{status.coldResidents?`${status.coldResidents} residents affected by cold. Shelter and fuel help recovery.`:'No residents currently affected by cold.'}</p>
  <p className="text-parchment-dim">{status.temp}°C · {status.sheltered} residents near shelter</p>
  {status.warnings.length>0&&<ul className="space-y-1 text-blood" aria-label="Survival warnings">{status.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul>}
  <div className="grid grid-cols-2 gap-2">
   <div><button type="button" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-bronze/40 bg-ink-soft px-2 py-2 disabled:opacity-50" disabled={!!waterIssue} title={waterIssue||'Send a resident to collect and carry water home'} onClick={collectWater}><Droplets className="size-4"/>Collect water</button>{waterIssue&&<p className="mt-1 text-parchment-dim">{waterIssue}</p>}</div>
   <div><button type="button" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-bronze/40 bg-ink-soft px-2 py-2 disabled:opacity-50" disabled={!!fuelIssue} title={fuelIssue||'Switch village focus to timber gathering'} onClick={gatherFuel}><Flame className="size-4"/>Gather fuel</button>{fuelIssue&&<p className="mt-1 text-parchment-dim">{fuelIssue}</p>}</div>
  </div>
  <p className="text-parchment-dim">Water must reach home before it can be used. Fuel uses the same logs as building. Timber focus may reduce food gathering.</p>
  {g.state.paused&&<p className="text-parchment-dim">Resume play to let residents travel and work.</p>}
  {expanded&&status.metrics&&<details><summary className="cursor-pointer">Since settling</summary><p>Water delivered {status.metrics.waterDeliveredLiters.toFixed(1)} L · consumed {status.metrics.waterConsumedLiters.toFixed(1)} L · lost cargo {status.metrics.waterLostLiters.toFixed(1)} L. Fuel burned {status.metrics.fuelBurnedWood.toFixed(1)} logs.</p><p>Water shortage {Math.floor(status.metrics.waterShortageSeconds)}s · cold exposure {Math.floor(status.metrics.coldExposurePersonSeconds)} person-seconds.</p></details>}
  {feedback&&<p role="status" aria-live="polite">{feedback}</p>}
 </div>;
 if(expanded)return <section aria-label="Water and warmth"><h3>Water and warmth</h3>{content}</section>;
 return <details className="hud-panel max-w-full" aria-label="Water and warmth" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
   <span className="inline-flex items-center gap-1"><Droplets className="size-3"/>{Math.floor(status.water)} L</span>
   <span className="inline-flex items-center gap-1"><Flame className="size-3"/>{Math.floor(status.fuel)} logs</span>
   <span className={status.coldResidents?'inline-flex items-center gap-1 text-blood':'inline-flex items-center gap-1 text-parchment-dim'}><Wind className="size-3"/>{status.coldResidents?`${status.coldResidents} cold`:'Warmth steady'}</span>
   <span className="ml-auto text-bronze-bright">{status.warnings[0]||'Water & warmth'}</span><ChevronDown className="size-3" aria-hidden="true"/>
  </summary>
  {content}
 </details>;
}
