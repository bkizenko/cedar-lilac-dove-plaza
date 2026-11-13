import {useEffect,useRef,useState} from 'react';
import {useOwnerReadModels} from './useOwnerReadModels';
import type {EngineDispatchCommand} from '../game/engineDispatch';
import {PRODUCTION_RECIPES} from '../game/production';
import type {Engine} from '../game/engine';
import {contactActions,performContactAction,type ContactAction} from '../game/encounters';
import {personName} from '../game/people';
import {carryingCapacity} from '../game/haulage';
import {TraderVerbs} from './TraderVerbs';
import {voiceOf} from '../game/leaderDialogue';

/** Conversation stays in the meeting; travel and exchanges use real actors. */
export function ContactActions({engine,strangerId,personId,conversation=true}:{engine:Engine;strangerId:number;personId?:number;conversation?:boolean}){
 const [feedback,setFeedback]=useState(''),[branch,setBranch]=useState<'talk'|'trade'|null>(null);
 const g=engine.game,actions=contactActions(g,strangerId,personId);
 const stranger=g.state.units.find(u=>u.id===strangerId),vo=voiceOf(g,stranger,stranger?.team);
 const run=(action:ContactAction,offer?:string)=>{const result=performContactAction(g,action,strangerId,personId,offer);setFeedback(result.report||result.reason);engine.pushHud();if(result.accepted&&!['question','approach-trade'].includes(action))engine.canvas.focus();};
 const button='min-h-11 w-full rounded-md border border-bronze/40 px-3 py-2 text-left text-sm';
 const hint='text-xs text-parchment-dim';
 return <section className="mt-3 space-y-3" aria-label="Contact actions">
  <TraderVerbs engine={engine} strangerId={strangerId} personId={personId}/>
  <div className="grid grid-cols-2 gap-2">
   {conversation&&<button type="button" className={button} aria-expanded={branch==='talk'} onClick={()=>{setBranch(branch==='talk'?null:'talk');setFeedback('');}}>Talk</button>}
   <button type="button" className={button} aria-expanded={branch==='trade'} onClick={()=>{setBranch(branch==='trade'?null:'trade');setFeedback('');}}>Trade</button>
  </div>
  {conversation&&branch==='talk'&&<div className="space-y-2" aria-label="Conversation topics">{actions.conversation.map(topic=><button type="button" key={topic.id} className={button} onClick={()=>run('question',topic.id)}>{topic.label}</button>)}</div>}
  {branch==='trade'&&<div className="space-y-2" aria-label="Trade offers">
   <p className={hint}>{stranger?.carryType&&stranger.carry>0?vo.trader.offers(Math.floor(stranger.carry),stranger.carryType):vo.trader.empty}</p>
   {actions.trade.options.map(offer=><button type="button" key={offer.id} className={button} onClick={()=>run('trade',offer.id)}>{offer.label}</button>)}
   {!actions.trade.options.length&&(actions.approach.reason===null?<button type="button" className={button} onClick={()=>run('approach-trade')}>Walk closer to exchange</button>:<p className={hint}>{actions.trade.reason}</p>)}
   {actions.trade.options.some(o=>o.kind==='visitor')?<p className={hint}>Purchases go into village stores.</p>:actions.scout&&stranger?.carryType&&<p className={hint}>{personName(actions.scout)} can carry {carryingCapacity(actions.scout,stranger.carryType)} {stranger.carryType} with their current equipment.</p>}
   <p className={hint}>{actions.safety}</p>
   {stranger?.visit?.phase==='waiting'&&stranger.visit.team===undefined&&<button type="button" className={button} onClick={()=>run('decline-trade')} title="Return the goods and take your answer home; repeated unchanged offers stop.">{vo.trader.decline}</button>}
  </div>}
  {!actions.prisoner&&stranger&&stranger.team!==0&&<TradedTeachingActions engine={engine} teacherId={strangerId} personId={personId} open={branch==='trade'}/>}
  {(feedback||conversation&&actions.question.report)&&<div className="rounded-md border border-bronze/30 p-3" role="status" aria-live="polite"><p className={hint}>{feedback||actions.question.report}</p>{branch==='talk'&&stranger?.carryType&&stranger.carry>0&&<button type="button" className={button} onClick={()=>{setBranch('trade');setFeedback('');}}>Discuss their offer</button>}</div>}
  <details><summary className="cursor-pointer text-sm text-parchment-dim">Other choices</summary><div className="mt-2 space-y-2">
   {!actions.prisoner&&<button type="button" className={button} onClick={()=>run('demand')}>{vo.trader.demand}</button>}
   {actions.prisoner?<button type="button" className={button} onClick={()=>run('release-prisoner')}>{vo.force.labels['release-prisoner']}</button>:<button type="button" className={button} onClick={()=>run('ask-visitor-leave')}>{vo.trader.leave}</button>}
   {actions.scout&&<button type="button" className={button} onClick={()=>run('send-scout-home')}>Send {personName(actions.scout)} home</button>}
  </div></details>
 </section>;
}

/** Contact trade controls offer only authoritative local demonstrations and
 * payment carried by an explicitly chosen or nearby available owned person. */
export function TradedTeachingActions({engine,teacherId,personId,open}:{engine:Engine;teacherId:number;personId?:number;open:boolean}){
 const g=engine.game,selected=g.selectedUnits(),learnerIds=[...new Set([...(personId===undefined?[]:[personId]),...selected.map(u=>u.id)])],query=open?{kind:'traded-teaching-offers' as const,teacherId,learnerIds}:null,read=useOwnerReadModels(engine,query?[query]:[]),availability=read(query),model=availability.model;
 const [feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),mounted=useRef(true),requestId=useRef(0),epoch=engine.dispatchEpoch;
 useEffect(()=>{mounted.current=true;setFeedback('');setBusy(false);return()=>{mounted.current=false;requestId.current++;};},[engine,teacherId,epoch]);
 const lessons=(g.state.teachingOffers||[]).filter(o=>o.teacher.id===teacherId&&o.learner.team===0&&g.state.units.some(u=>u.team===0&&u.hp>0&&u.id===o.learner.id&&u.tradedTeaching?.offerId===o.id)&&!['reported','cancelled','lost'].includes(o.phase));
 const send=async(command:EngineDispatchCommand)=>{
  if(engine.disposed||engine.dispatchEpoch!==epoch)return;const request=++requestId.current;setBusy(true);
  const current=()=>mounted.current&&!engine.disposed&&engine.dispatchEpoch===epoch&&requestId.current===request;
  try{const result=await engine.dispatch(command,{selectedUnitIds:learnerIds});if(!current()||result.epoch!==epoch)return;setFeedback(result.reason);engine.pushHud();}
  catch(error){if(current())setFeedback(error instanceof Error?error.message:'The lesson request could not be completed');}
  finally{if(current())setBusy(false);}
 };
 if(!open&&!lessons.length&&!feedback)return null;
 const carrier=model?.learner,carrierPerson=carrier?g.state.units.find(u=>u.id===carrier.id&&u.team===0):undefined,offers=model?.offers||[],hint='text-xs text-parchment-dim';
 return <div className="space-y-1 text-xs" aria-label="Practical teaching">
  {open&&<>{offers.map(offer=><button key={`${offer.methodId}:${offer.siteId}`} type="button" className="w-full rounded border border-bronze/40 px-3 py-2 text-left disabled:opacity-50" disabled={!carrier||!!offer.issue||busy||!!g.state.ended} title={offer.issue||model?.issue||'Payment transfers at the workshop. Observe useful work, then bring the method home.'} onClick={()=>carrier&&send({kind:'begin-traded-teaching',learnerId:carrier.id,teacherId:offer.teacherId,siteId:offer.siteId,methodId:offer.methodId,good:carrier.good,qty:1})}><span>{offer.name}</span><span className="block text-parchment-dim">{carrier?`Learn · 1 ${carrier.good}`:'Bring a payment carrier nearby'}{carrierPerson&&<span className="block">{personName(carrierPerson)}</span>}</span></button>)}
   {!model?<p className={hint}>{availability.issue}</p>:!offers.length?<p className={hint}>Meet a qualified artisan while they demonstrate a method.</p>:model.issue&&<p className={hint}>{model.issue}</p>}
  </>}
  {lessons.map(o=><div key={o.id} className="space-y-1"><p>{PRODUCTION_RECIPES[o.methodId].name} · {o.reason||(o.phase==='traveling'?'Taking carried payment to the artisan':o.phase==='armed'?'Waiting for the agreed method':o.phase==='observing'?`Observing · ${o.observedSeconds.toFixed(1)}s`:'Bringing the observed method home')}</p><button type="button" className="rounded border border-bronze/40 px-2 py-1 disabled:opacity-50" disabled={busy||!!g.state.ended} title="Undelivered cargo stays with its carrier; delivered payment is not refunded" onClick={()=>send({kind:'cancel-traded-teaching',learnerId:o.learner.id})}>Cancel lesson</button></div>)}
  {feedback&&<p className={hint} role="status">{feedback}</p>}
 </div>;
}
