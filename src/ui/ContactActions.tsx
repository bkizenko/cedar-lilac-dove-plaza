import {useState} from 'react';
import type {Engine} from '../game/engine';
import {contactActions,performContactAction,type ContactAction} from '../game/encounters';
import {personName} from '../game/people';

/** One controller backs first contact, selected strangers and custody. */
export function ContactActions({engine,strangerId,personId}:{engine:Engine;strangerId:number;personId?:number}){
 const [feedback,setFeedback]=useState(''),[trading,setTrading]=useState(false),[conversing,setConversing]=useState(false);
 const g=engine.game,actions=contactActions(g,strangerId,personId);
 const run=(action:ContactAction,offer?:string)=>{const result=performContactAction(g,action,strangerId,personId,offer);setFeedback(result.report||result.reason);if(result.accepted)setTrading(false);engine.pushHud();if(result.accepted&&action!=='question'&&action!=='trade')engine.canvas.focus();};
 const button='min-h-11 w-full rounded-md border border-bronze/40 px-3 py-2 text-left text-sm disabled:opacity-50';
 const hint='text-xs text-parchment-dim';
 return <section className="mt-3 space-y-3" aria-label="Contact actions">
  {!actions.prisoner&&<div><button type="button" className={button} disabled={!!actions.capture.reason} onClick={()=>run('capture')}>Capture</button><p className={hint}>{actions.capture.reason||'Nearby armed adults approach to obtain surrender, then must guard and escort the same person.'}</p></div>}
  {!actions.prisoner&&<div><button type="button" className={button} disabled={!!actions.attack.reason} onClick={()=>run('attack')}>Attack</button><p className={hint}>{actions.attack.reason||'Orders an actual attack on this person; they can resist or seek shelter.'}</p></div>}
  {!actions.prisoner&&<div><button type="button" className={button} disabled={!!actions.demand.reason} onClick={()=>run('demand')}>Demand carried goods</button><p className={hint}>{actions.demand.reason||'Armed adults approach; nearby defenders may refuse. Yielded goods still need a real carrier.'}</p></div>}
  <div><button type="button" className={button} disabled={actions.conversation.every(topic=>!!topic.reason)} onClick={()=>setConversing(!conversing)}>Question</button><p className={hint}>{actions.conversation.every(topic=>!!topic.reason)?actions.question.reason:'Ask about this person’s own experience. Their account is recorded in village history.'}</p>{conversing&&<div className="mt-2 space-y-2">{actions.conversation.map(topic=><div key={topic.id}><button type="button" className={button} disabled={!!topic.reason} onClick={()=>run('question',topic.id)}>{topic.label}</button>{topic.reason&&<p className={hint}>{topic.reason}</p>}</div>)}</div>}</div>
  <div><button type="button" className={button} disabled={!actions.trade.options.length} onClick={()=>setTrading(!trading)}>Trade carried goods</button>{actions.trade.reason&&<p className={hint}>{actions.trade.reason}</p>}
   {trading&&<div className="mt-2 space-y-2">{actions.trade.options.map(offer=><button type="button" key={offer.id} className={button} onClick={()=>run('trade',offer.id)}>{offer.label}</button>)}</div>}
  </div>
  {actions.prisoner?<button type="button" className={button} onClick={()=>run('release-prisoner')}>Release prisoner to return home</button>:<div><button type="button" className={button} disabled={!!actions.leave.reason} onClick={()=>run('ask-visitor-leave')}>Ask visitor to leave</button>{actions.leave.reason&&<p className={hint}>{actions.leave.reason}</p>}</div>}
  {actions.scout&&<button type="button" className={button} onClick={()=>run('send-scout-home')}>Send {personName(actions.scout)} home</button>}
  {(feedback||actions.question.report)&&<p className={hint} role="status">{feedback||actions.question.report}</p>}
 </section>;
}
