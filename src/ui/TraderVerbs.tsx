import type React from 'react';
import {useState} from 'react';
import {Swords,Lock,Package,Search,Coins,Home,Flame,Scale,Eye,Shield} from 'lucide-react';
import type {Engine} from '../game/engine';
import {contactActions,performContactAction,type ContactAction} from '../game/encounters';
import type {ConsequenceTag} from '../game/traderInteraction';
import {voiceOf} from '../game/leaderDialogue';
import {LedgerRow} from './hearth/LedgerRow';

const TAG_ICON:Record<ConsequenceTag,typeof Flame>={war:Flame,grievance:Scale,witness:Eye,loot:Package,custody:Shield,ransom:Coins};
/** Hostile verbs against a foreign person (trader or not): icon first, a reason on hover, consequences as small icons. */
export function TraderVerbs({engine,strangerId,personId,variant='chips',extra,noLegend}:{engine:Engine;strangerId:number;personId?:number;variant?:'chips'|'ledger';extra?:React.ReactNode;noLegend?:boolean}){
 const g=engine.game,u=g.state.units.find(p=>p.id===strangerId&&p.hp>0),[feedback,setFeedback]=useState('');
 if(!u||u.team===0&&!u.prisoner)return null;
 const a=contactActions(g,strangerId,personId),held=a.prisoner,voice=voiceOf(g,u,u.team),TAG=Object.fromEntries((Object.keys(TAG_ICON) as ConsequenceTag[]).map(k=>[k,{Icon:TAG_ICON[k],label:voice.force.tags[k]}])) as Record<ConsequenceTag,{Icon:typeof Flame;label:string}>,L=voice.force.labels,N=voice.force.lines;
 if(u.team===0&&!held)return null;
 const run=(action:ContactAction)=>{const r=performContactAction(g,action,strangerId,personId);setFeedback(r.reason);engine.pushHud();if(r.accepted)engine.canvas.focus();};
 const verbs=held
  ?[{id:'interrogate' as const,label:L.interrogate,line:N.interrogate,Icon:Search,reason:a.interrogate.reason,tags:a.interrogate.consequences},{id:'ransom' as const,label:L.ransom,line:N.ransom,Icon:Coins,reason:a.ransom.reason,tags:a.ransom.consequences},{id:'release-prisoner' as const,label:L['release-prisoner'],line:N['release-prisoner'],Icon:Home,reason:null,tags:[] as ConsequenceTag[]}]
  :[{id:'attack' as const,label:L.attack,line:N.attack,Icon:Swords,reason:a.attack.reason,tags:a.attack.consequences},{id:'capture' as const,label:L.capture,line:N.capture,Icon:Lock,reason:a.capture.reason,tags:a.capture.consequences},{id:'rob' as const,label:L.rob,line:N.rob,Icon:Package,reason:a.rob.reason,tags:a.rob.consequences}];
 if(variant==='ledger')return <>
  <ul className="fc-list" aria-label={held?'Prisoner orders':'Hostile orders'}>
   {verbs.map(v=><LedgerRow key={v.id} icon={<v.Icon size={24} aria-hidden="true"/>} label={v.label} line={v.line} blocked={v.reason!==null} reason={v.reason} onClick={()=>run(v.id)}>
    {v.tags.length>0&&<span className="fc-tags" role="img" aria-label={v.tags.map(t=>TAG[t].label).join('; ')}>{v.tags.map(t=>{const {Icon,label}=TAG[t];return <span key={t} title={label}><Icon size={24} aria-hidden="true"/></span>;})}</span>}
   </LedgerRow>)}
   {extra}
  </ul>
  {held&&a.interrogate.report.length>0&&<ul className="fc-know" aria-label="What they told you">{a.interrogate.report.map(line=><li key={line}>{line}</li>)}</ul>}
  {feedback&&<p className="fc-note" role="status" aria-live="polite">{feedback}</p>}
  {!noLegend&&v_legend(verbs,TAG)}
 </>;
 const button='inline-flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-md border border-bronze/40 px-3 py-2 text-sm aria-disabled:opacity-50';
 return <section className="mt-3 space-y-2" aria-label={held?'Prisoner orders':'Hostile orders'}>
  <div className="flex gap-2" role="group">
   {verbs.map(v=><button key={v.id} type="button" className={button} aria-disabled={v.reason!==null} title={v.reason??v.label} onClick={()=>run(v.id)}>
    <span className="inline-flex items-center gap-1"><v.Icon size={18} aria-hidden="true"/>{v.label}</span>
    {v.tags.length>0&&<span className="inline-flex gap-1 text-parchment-dim" role="img" aria-label={v.tags.map(t=>TAG[t].label).join('; ')}>{v.tags.map(t=>{const {Icon,label}=TAG[t];return <span key={t} title={label}><Icon size={14} aria-hidden="true"/></span>;})}</span>}
   </button>)}
  </div>
  {held&&a.interrogate.report.length>0&&<ul className="space-y-1 text-xs text-parchment-dim" aria-label="What they told you">{a.interrogate.report.map(line=><li key={line}>{line}</li>)}</ul>}
  {feedback&&<p role="status" aria-live="polite" className="text-xs text-parchment-dim">{feedback}</p>}
 </section>;
}

/** What the small marks on Force verbs mean, in the speaker's voice. Shown beside the portrait in the meeting. */
export function ConsequenceLegend({tags,tagText}:{tags:ConsequenceTag[];tagText:Record<ConsequenceTag,string>}){const used=[...new Set(tags)];return used.length?<ul className="fc-legend" aria-label="What the marks mean">{used.map(t=>{const Icon=TAG_ICON[t];return <li key={t}><Icon size={24} aria-hidden="true"/>{tagText[t]}</li>;})}</ul>:null;}
function v_legend(verbs:{tags:ConsequenceTag[]}[],TAG:Record<ConsequenceTag,{Icon:typeof Flame;label:string}>){const used=[...new Set(verbs.flatMap(v=>v.tags))];return used.length?<ul className="fc-legend" aria-label="What the marks mean">{used.map(t=>{const {Icon,label}=TAG[t];return <li key={t}><Icon size={24} aria-hidden="true"/>{label}</li>;})}</ul>:null;}
