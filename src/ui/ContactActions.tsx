import {useState} from 'react';
import type {Engine} from '../game/engine';
import {contactActions,performContactAction,type ContactAction} from '../game/encounters';
import {personName} from '../game/people';
import {carryingCapacity} from '../game/haulage';

/** Conversation stays in the meeting; travel and exchanges use real actors. */
export function ContactActions({engine,strangerId,personId}:{engine:Engine;strangerId:number;personId?:number}){
 const [feedback,setFeedback]=useState(''),[branch,setBranch]=useState<'talk'|'trade'|null>(null);
 const g=engine.game,actions=contactActions(g,strangerId,personId);
 const stranger=g.state.units.find(u=>u.id===strangerId);
 const run=(action:ContactAction,offer?:string)=>{const result=performContactAction(g,action,strangerId,personId,offer);setFeedback(result.report||result.reason);engine.pushHud();if(result.accepted&&!['question','approach-trade'].includes(action))engine.canvas.focus();};
 const button='min-h-11 w-full rounded-md border border-bronze/40 px-3 py-2 text-left text-sm';
 const hint='text-xs text-parchment-dim';
 return <section className="mt-3 space-y-3" aria-label="Contact actions">
  <div className="grid grid-cols-2 gap-2">
   <button type="button" className={button} aria-expanded={branch==='talk'} onClick={()=>{setBranch(branch==='talk'?null:'talk');setFeedback('');}}>Talk</button>
   <button type="button" className={button} aria-expanded={branch==='trade'} onClick={()=>{setBranch(branch==='trade'?null:'trade');setFeedback('');}}>Trade carried goods</button>
  </div>
  {branch==='talk'&&<div className="space-y-2" aria-label="Conversation topics">{actions.conversation.map(topic=><button type="button" key={topic.id} className={button} onClick={()=>run('question',topic.id)}>{topic.label}</button>)}</div>}
  {branch==='trade'&&<div className="space-y-2" aria-label="Trade offers">
   <p className={hint}>{stranger?.carryType&&stranger.carry>0?`They offer ${Math.floor(stranger.carry)} ${stranger.carryType}.`:'They have no bundle to offer.'}</p>
   {actions.trade.options.map(offer=><button type="button" key={offer.id} className={button} onClick={()=>run('trade',offer.id)}>{offer.label}</button>)}
   {!actions.trade.options.length&&(actions.approach.reason===null?<button type="button" className={button} onClick={()=>run('approach-trade')}>Walk closer to exchange</button>:<p className={hint}>{actions.trade.reason}</p>)}
   {actions.scout&&stranger?.carryType&&<p className={hint}>{personName(actions.scout)} can carry {carryingCapacity(actions.scout,stranger.carryType)} {stranger.carryType} with their current equipment.</p>}
   <p className={hint}>{actions.safety}</p>
   {stranger?.visit?.phase==='waiting'&&stranger.visit.team===undefined&&<button type="button" className={button} onClick={()=>run('decline-trade')} title="Return the goods and take your answer home; repeated unchanged offers stop.">Decline this offer</button>}
  </div>}
  {(feedback||actions.question.report)&&<div className="rounded-md border border-bronze/30 p-3" role="status" aria-live="polite"><p className={hint}>{feedback||actions.question.report}</p>{branch==='talk'&&stranger?.carryType&&stranger.carry>0&&<button type="button" className={button} onClick={()=>{setBranch('trade');setFeedback('');}}>Discuss their offer</button>}</div>}
  <details><summary className="cursor-pointer text-sm text-parchment-dim">Other choices</summary><div className="mt-2 space-y-2">
   {!actions.prisoner&&<><button type="button" className={button} onClick={()=>run('demand')}>Demand carried goods</button><button type="button" className={button} onClick={()=>run('capture')}>Capture</button><button type="button" className={button} onClick={()=>run('attack')}>Attack</button></>}
   {actions.prisoner?<button type="button" className={button} onClick={()=>run('release-prisoner')}>Release prisoner to return home</button>:<button type="button" className={button} onClick={()=>run('ask-visitor-leave')}>Ask visitor to leave</button>}
   {actions.scout&&<button type="button" className={button} onClick={()=>run('send-scout-home')}>Send {personName(actions.scout)} home</button>}
  </div></details>
 </section>;
}
