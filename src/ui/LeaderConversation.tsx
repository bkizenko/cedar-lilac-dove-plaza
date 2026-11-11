import {SocietyFlag} from './SocietyFlag';
import {useState} from 'react';
import type {Engine} from '../game/engine';
import {leaderDialogue,chooseLeaderDialogue,type LeaderTopic} from '../game/leaderDialogue';

/** This transcript belongs to this physical meeting, not a world-history dump. */
export function LeaderConversation({engine,personId,strangerId}:{engine:Engine;personId:number;strangerId:number}){
 const [topic,setTopic]=useState<LeaderTopic>('welcome');
 const [turns,setTurns]=useState<{question:string;reply:string}[]>([]);
 const view=leaderDialogue(engine.game,personId,strangerId,topic);
 const choose=(id:string,label:string)=>{
  const result=chooseLeaderDialogue(engine.game,personId,strangerId,topic,id);
  setTurns(previous=>[...previous,{question:label,reply:result.reply}].slice(-6));
  setTopic(result.view.topic);engine.pushHud();
 };
 return <section className="space-y-3" aria-label="Conversation">
  <p className="text-sm text-parchment-dim"><SocietyFlag game={engine.game} team={engine.game.state.units.find(u=>u.id===strangerId)?.team}/>{" "}{view.name} · {view.role==='leader'?'Community leader':'Community representative'}</p>
  <div className="max-h-56 space-y-3 overflow-y-auto rounded-md border border-bronze/30 p-3" role="log" aria-label="Meeting conversation" aria-live="polite">
   {turns.length?turns.map((turn,index)=><div key={index}><p className="mb-1 text-xs text-parchment-dim">You: {turn.question}</p><p className="text-sm">{view.name}: {turn.reply}</p></div>):<p className="text-sm">{view.name}: {view.issue||view.reply}</p>}
  </div>
  {view.issue&&turns.length>0&&<p className="text-xs text-parchment-dim" role="status">{view.issue}</p>}
  <div className="grid gap-2 sm:grid-cols-2" aria-label="Reply choices">{view.choices.map(choice=><button key={choice.id} type="button" className="min-h-10 rounded-md border border-bronze/40 px-3 py-2 text-left text-sm" onClick={()=>choose(choice.id,choice.label)}>{choice.label}</button>)}</div>
 </section>;
}
