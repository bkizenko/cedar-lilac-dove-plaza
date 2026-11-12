import {useState} from 'react';
import type {Engine} from '../../game/engine';
import type {CapitulationOutcome} from '../../game/capitulation';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {Card} from './CouncilParts';
const QUERY={kind:'capitulation-offers'} as const;
export const TERMS:{id:CapitulationOutcome;label:string;note:string;harsh?:boolean}[]=[
 {id:'autonomy',label:'Autonomous tributary',note:'They keep their hall and pay while you hold the leverage. Your force stands down.'},
 {id:'tribute',label:'Tribute',note:'They pay; a garrison of yours stays to enforce it.'},
 {id:'puppet',label:'Puppet',note:'They keep a ruler but follow your lead, under garrison.'},
 {id:'occupy',label:'Occupy',note:'Your force holds the community and its hall.'},
 {id:'annex',label:'Annex',note:'The community is folded into yours.'},
 {id:'loot',label:'Take their stores',note:'Carry off what your people can bear, then leave.'},
 {id:'captives',label:'Take captives',note:'Residents are taken as workers. Guards are needed.',harsh:true},
 {id:'raze',label:'Raze it',note:'Buildings are destroyed. Nothing here can be rebuilt by you.',harsh:true}];
/** Shown only while a beaten community is offering terms to the player's force. Each term is a distinct outcome from the engine; refusing hardens them. */
export function CapitulationTerms({engine}:{engine:Engine}){
 const read=useOwnerReadModels(engine,[QUERY]),offers=read(QUERY).model?.offers??[];
 const [msg,setMsg]=useState('');
 if(!offers.length)return null;
 const send=async(command:Parameters<Engine['dispatch']>[0])=>{try{setMsg((await engine.dispatch(command)).reason);}catch(e){setMsg(e instanceof Error?e.message:'Unavailable');}};
 return <section aria-label="Terms offered" className="space-y-2 text-xs">{offers.map(o=><Card key={o.id} label="Terms offered" title={`${o.defenderName} offers terms`}>
  <p className="text-parchment-dim">Their will is broken ({Math.round(o.score*100)}%). The offer lapses in {Math.ceil(o.expiresIn)} s and needs your force to stay.</p>
  <p className="text-parchment-dim">Seen: {o.measured.casualties} fallen, {o.measured.captured} taken, {o.measured.lostArmed} armed lost, {o.measured.buildingLoss} buildings lost.</p>
  <ul className="grid gap-1.5 sm:grid-cols-2">{TERMS.map(t=><li key={t.id}><button type="button" className={'h-full w-full rounded-md border px-2 py-1.5 text-left hover:border-bronze-bright '+(t.harsh?'border-red-400/40':'border-bronze/40')} onClick={()=>void send({kind:'accept-capitulation',frontId:o.id,outcome:t.id})}><span className="block text-parchment">{t.label}</span><span className="block text-[11px] text-parchment-dim">{t.note}</span></button></li>)}</ul>
  <button type="button" className="rounded-md border border-parchment/20 px-2 py-0.5 text-parchment-dim" onClick={()=>void send({kind:'refuse-capitulation',frontId:o.id})}>Refuse; press the attack</button>
 </Card>)}{msg&&<p role="status">{msg}</p>}</section>;
}
