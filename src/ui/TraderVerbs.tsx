import {useState} from 'react';
import {Swords,Lock,Package,Search,Coins,Home,Flame,Scale,Eye,Shield} from 'lucide-react';
import type {Engine} from '../game/engine';
import {contactActions,performContactAction,type ContactAction} from '../game/encounters';
import type {ConsequenceTag} from '../game/traderInteraction';

const TAG:Record<ConsequenceTag,{Icon:typeof Flame;label:string}>={
 war:{Icon:Flame,label:'Their society turns hostile'},
 grievance:{Icon:Scale,label:'Grievance grows when the news reaches their home'},
 witness:{Icon:Eye,label:'Witnesses will carry the news'},
 loot:{Icon:Package,label:'Takes the cargo they carry'},
 custody:{Icon:Shield,label:'Needs a guard, food and water'},
 ransom:{Icon:Coins,label:'Ransom is carried by real people'},
};
/** Hostile verbs against a foreign person (trader or not): icon first, a reason on hover, consequences as small icons. */
export function TraderVerbs({engine,strangerId,personId}:{engine:Engine;strangerId:number;personId?:number}){
 const g=engine.game,u=g.state.units.find(p=>p.id===strangerId&&p.hp>0),[feedback,setFeedback]=useState('');
 if(!u||u.team===0&&!u.prisoner)return null;
 const a=contactActions(g,strangerId,personId),held=a.prisoner;
 if(u.team===0&&!held)return null;
 const run=(action:ContactAction)=>{const r=performContactAction(g,action,strangerId,personId);setFeedback(r.reason);engine.pushHud();if(r.accepted)engine.canvas.focus();};
 const verbs=held
  ?[{id:'interrogate' as const,label:'Interrogate',Icon:Search,reason:a.interrogate.reason,tags:a.interrogate.consequences},{id:'ransom' as const,label:'Ransom',Icon:Coins,reason:a.ransom.reason,tags:a.ransom.consequences},{id:'release-prisoner' as const,label:'Release',Icon:Home,reason:null,tags:[] as ConsequenceTag[]}]
  :[{id:'attack' as const,label:'Attack',Icon:Swords,reason:a.attack.reason,tags:a.attack.consequences},{id:'capture' as const,label:'Capture',Icon:Lock,reason:a.capture.reason,tags:a.capture.consequences},{id:'rob' as const,label:'Rob',Icon:Package,reason:a.rob.reason,tags:a.rob.consequences}];
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
