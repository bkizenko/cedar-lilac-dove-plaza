import type {Engine} from '../../game/engine';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {useActionFeedback,FeedbackList} from './useActionFeedback';
import {Card} from './CouncilParts';
const QUERY={kind:'governance'} as const;
const pct=(m:number)=>m===1?'':`${m<1?'-':'+'}${Math.round(Math.abs(1-m)*100)}%`;
/** Compact governance card: government type, policies and governors. Reads one model, sends one `governance` command. */
export function GovernanceCard({engine}:{engine:Engine}){
 const read=useOwnerReadModels(engine,[QUERY]),res=read(QUERY),m=res.model?.governance,fb=useActionFeedback(engine);
 if(!m)return null;const send=(action:'adopt'|'policy-on'|'policy-off'|'appoint'|'dismiss',extra:{id?:string;hallId?:number;unitId?:number}={})=>void fb.send({kind:'governance',action,...extra});
 const fx=[['food',m.effects.jobTime.food],['wood',m.effects.jobTime.wood],['stone',m.effects.jobTime.stone]].filter(([,v])=>v!==1).map(([k,v])=>`${k} work ${pct(v as number)}`);
 if(m.effects.dmg!==1)fx.push(`damage ${m.effects.dmg>1?'+':'-'}${Math.round(Math.abs(m.effects.dmg-1)*100)}%`);
 if(m.effects.legitimacy)fx.push(`standing ${m.effects.legitimacy>0?'+':''}${Math.round(m.effects.legitimacy)}`);if(m.effects.tax)fx.push(`tax burden ${m.effects.tax>0?'+':''}${Math.round(m.effects.tax)}`);
 return <Card label="Government" title={m.label}>
  <p className="text-parchment-dim">{m.note} {m.pop} people, {m.age} Age.{m.cooldown>0&&` Settling after a change (${m.cooldown}s).`}</p>
  {fx.length>0&&<p>Effects: {fx.join(', ')}.</p>}
  <ul className="space-y-0.5">{m.governments.filter(g=>!g.current).map(g=><li key={g.id} className="flex items-center justify-between gap-2"><span className={g.open?'':'text-parchment-dim'}>{g.label} <span className="text-parchment-dim">({g.open?g.cost:`${g.minAge} Age, ${g.minPop} people`})</span></span>
   <button type="button" disabled={!g.open||m.cooldown>0} className="rounded border border-parchment/30 px-1.5 disabled:opacity-40" title={g.note} onClick={()=>send('adopt',{id:g.id})}>Adopt</button></li>)}</ul>
  <p className="border-t border-parchment/10 pt-1 text-parchment-dim">Policies ({m.policies.filter(p=>p.on).length}/{m.slots})</p>
  <ul className="space-y-0.5">{m.policies.filter(p=>p.open||p.on).map(p=><li key={p.id} className="flex items-center justify-between gap-2"><span title={p.note}>{p.label} <span className="text-parchment-dim">({p.on?'in force':p.cost})</span></span>
   <button type="button" className="rounded border border-parchment/30 px-1.5" onClick={()=>send(p.on?'policy-off':'policy-on',{id:p.id})}>{p.on?'End':'Proclaim'}</button></li>)}</ul>
  {m.maxGovernors>0&&<><p className="border-t border-parchment/10 pt-1 text-parchment-dim">Governors ({m.halls.filter(h=>h.governor!==null).length}/{m.maxGovernors})</p>
   <ul className="space-y-0.5">{m.halls.map(h=><li key={h.hall} className="flex items-center justify-between gap-2"><span>Hall {h.hall}: {h.governor!==null?`person ${h.governor} (skill ${h.quality}%)`:'no governor'}</span>
    {h.governor!==null?<button type="button" className="rounded border border-parchment/30 px-1.5" onClick={()=>send('dismiss',{hallId:h.hall})}>Release</button>
    :<select aria-label="Appoint governor" className="rounded border border-parchment/30 bg-transparent px-1" value="" onChange={e=>{if(e.target.value)send('appoint',{hallId:h.hall,unitId:Number(e.target.value)});}}><option value="">Appoint…</option>{m.candidates.map(c=><option key={c.id} value={c.id}>Person {c.id} ({c.quality}%)</option>)}</select>}</li>)}</ul></>}
  <FeedbackList items={fb.items}/>
 </Card>;
}
