import {dominations,dominationStatus,releaseDomination} from '../game/domination';
import {ContactActions,TradedTeachingActions} from './ContactActions';
import {useState} from 'react';
import type {Engine} from '../game/engine';
import {personName} from '../game/people';
import {isDependent} from '../game/settlement';
import {captureTarget,secureVillage,dominateOccupiedVillage,occupationStatus,integrateOccupiedVillage,withdrawOccupation,type OccupationControl} from '../game/conflictIntent';
import {assignPrisonerGuard,provisionPrisoner,releasePrisoner,type PrisonerUnit} from '../game/captivity';

/** Actions arise from the selected party, encountered people or a living hall. */
export function ConflictControls({engine}:{engine:Engine}){
 const g=engine.game,[feedback,setFeedback]=useState('');
 const selected=g.selectedUnits(),party=selected.filter(u=>!(u as PrisonerUnit).prisoner&&(u.militia||!['worker','leader'].includes(u.type)));
 const hall=g.state.selBld?.type==='townhall'?g.state.selBld:null;
 const controls=(g.state as typeof g.state&{occupations?:OccupationControl[]}).occupations??[];
 const control=hall?controls.find(c=>c.hallId===hall.id&&c.controllerTeam===0&&c.phase!=='withdrawn'&&c.phase!=='integrated'&&c.phase!=='dominated'):undefined;
 const arrangement=hall?dominations(g).find(d=>d.hallId===hall.id&&d.overlord===0&&d.phase==='active'):undefined;
 const subject=arrangement?dominationStatus(g,arrangement.id):null;
 const status=control?occupationStatus(g,control.id):null;
 const targets=party.length?g.state.units.filter(u=>u.hp>0&&u.team!==0&&u.type==='worker'&&!u.militia&&!(u as PrisonerUnit).prisoner&&!isDependent(g,u)&&g.visibleAt(u.x,u.z)&&party.some(p=>Math.hypot(p.x-u.x,p.z-u.z)<=50)).slice(0,6):[];
 const foreign=g.state.units.filter(u=>u.selected&&u.team!==0&&u.hp>0&&g.visibleAt(u.x,u.z));
 const nearby=selected.length?g.state.units.filter(u=>u.team!==0&&u.hp>0&&g.visibleAt(u.x,u.z)&&selected.some(p=>Math.hypot(p.x-u.x,p.z-u.z)<=12)).slice(0,3):[];
 const contactPeople=[...new Map([...foreign,...nearby,...targets].map(u=>[u.id,u])).values()].slice(0,6);
 const lessonTeachers=[...new Set(selected.filter(u=>u.team===0&&u.tradedTeaching).flatMap(u=>{const o=g.state.teachingOffers?.find(o=>o.id===u.tradedTeaching!.offerId&&o.learner.id===u.id&&!['reported','cancelled','lost'].includes(o.phase));return o&&!contactPeople.some(p=>p.id===o.teacher.id)?[o.teacher.id]:[];}))];
 const prisoners=selected.filter(u=>(u as PrisonerUnit).prisoner?.captorTeam===0&&(u as PrisonerUnit).prisoner?.phase!=='released') as PrisonerUnit[];
 if(!contactPeople.length&&!lessonTeachers.length&&!prisoners.length&&!control&&!arrangement&&(!hall||hall.team===0))return null;
 const run=(fn:()=>{accepted:boolean;reason:string})=>{const result=fn();setFeedback(result.reason);g.banner(result.reason,5);engine.pushHud();};
 const button='min-h-11 rounded-md border border-bronze/40 px-3 py-2 text-left text-xs disabled:opacity-50';
 return <section className="mt-2 space-y-2" aria-label="Encounter actions">
  {hall&&hall.team!==0&&!control&&!arrangement&&<button className={button} onClick={()=>run(()=>secureVillage(g,hall.id))}>Secure the living village</button>}
  {control&&status&&<div className="space-y-2 text-xs">
   <p>{status.guards} present guards · {status.defenders} defenders · {status.holdSeconds.toFixed(0)} seconds of control</p>
   {status.reason&&<p className="text-parchment-dim">{status.reason}</p>}
   <button className={button} disabled={!status.accepted} onClick={()=>run(()=>integrateOccupiedVillage(g,control.id))}>Accept local surrender</button>
   <div className="grid grid-cols-2 gap-2" aria-label="Village terms">{(['tribute','puppet','autonomy'] as const).map(terms=><button key={terms} className={button} disabled={!status.accepted} onClick={()=>run(()=>dominateOccupiedVillage(g,control.id,terms))}>{terms==='tribute'?'Require tribute':terms==='puppet'?'Protectorate':'Autonomy'}</button>)}</div>
   <button className={button} onClick={()=>run(()=>{const accepted=withdrawOccupation(g,control.id);return{accepted,reason:accepted?'The garrison is withdrawing with its possessions':'This garrison can no longer withdraw from that control record'};})}>Withdraw garrison</button>
  </div>}
  {arrangement&&subject&&<div className="space-y-2 text-xs" aria-label="Village obligations"><p className="capitalize">{subject.terms==='puppet'?'Protectorate':subject.terms} · {subject.garrison} guards</p><p>{subject.paid} logs delivered · {subject.owed} owed</p><p title={subject.reason}>Leverage {subject.leverage.toFixed(1)} / {subject.required} · Resistance {Math.round(subject.resistance)}%</p><button className={button} onClick={()=>run(()=>{const accepted=releaseDomination(g,arrangement.id);return{accepted,reason:accepted?'Community released; people and carried goods return physically':'This community is no longer under your protection'};})}>Release community</button></div>}
  {contactPeople.map(u=><div key={u.id} className="space-y-2"><p className="text-xs">{personName(u)}</p><ContactActions engine={engine} strangerId={u.id}/></div>)}
  {lessonTeachers.map(teacherId=><TradedTeachingActions key={teacherId} engine={engine} teacherId={teacherId} open={false}/>)}
  {prisoners.map(u=><div key={u.id} className="space-y-2 text-xs">
   <p>{personName(u)} · {u.prisoner!.phase} · {u.prisoner!.food.toFixed(1)} food · {u.prisoner!.waterLiters.toFixed(1)} L carried water</p>
   <button className={button} onClick={()=>run(()=>assignPrisonerGuard(g,u.id))}>Assign an available guard</button>
   <button className={button} onClick={()=>run(()=>{const carriers=g.state.units.filter(p=>p.team===0&&p.hp>0&&p.id!==u.id&&Math.hypot(p.x-u.x,p.z-u.z)<=3);let supplied=false;for(const p of carriers)supplied=provisionPrisoner(g,u.id,p.id)||supplied;return{accepted:supplied,reason:supplied?'Nearby carried provisions transferred':'Bring a carrier with food or water within 3 metres'};})}>Give nearby carried provisions</button>
   <ContactActions engine={engine} strangerId={u.id}/>
  </div>)}
  {feedback&&<p role="status" className="text-xs text-parchment-dim">{feedback}</p>}
 </section>;
}
