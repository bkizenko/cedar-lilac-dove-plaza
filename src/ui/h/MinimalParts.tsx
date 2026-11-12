import {knowledgeCards,craftingBoxes,ledgerView,notificationsView,type TopicLike,type CraftEntry,type LedgerInput,type Signal} from './minimalModels';
/** Option H minimal components over the pure models in minimalModels.ts. Not wired into the HUD; nothing here
 * has been executed in a browser. Text comes only from the clipped view models. */
export function KnowledgeCards({topics,onAction,limit}:{topics:readonly TopicLike[];onAction:(id:string)=>void;limit?:number}){
 const v=knowledgeCards(topics,limit);
 return <div className="h-queue" role="list" aria-label="Methods">
  {v.cards.map(c=><article key={c.id} role="listitem" className="h-card" data-stage={c.stage}><div className="h-queue-row"><strong>{c.title}</strong><span className="h-cap">{c.stageText}</span></div>
   <div className="h-cap">{c.method}</div>
   <div className="h-queue-row">{c.evidence.map((e,i)=><span key={i} className="h-chip" data-state={e.tone==='warn'?'short':'ok'}>{e.label}: {e.value}</span>)}</div>
   {c.action&&<button type="button" disabled={!c.action.enabled} title={c.action.why} onClick={()=>onAction(c.action!.id)}>{c.action.label}</button>}</article>)}
  {v.more>0&&<span className="h-cap">+{v.more} more</span>}
 </div>;
}
export function CraftingBoxes({entries,limit}:{entries:readonly CraftEntry[];limit?:number}){
 const v=craftingBoxes(entries,limit);
 return <div className="h-queue" role="group" aria-label="Crafting">
  {v.boxes.length===0&&<span>Nothing queued</span>}
  {v.boxes.map((b,i)=><div key={i} data-state={b.state}><div className="h-queue-row"><span data-icon={b.icon} aria-hidden="true"/><span>{b.label}</span><span>{b.percent}%</span></div>
   <div className="h-bar" role="progressbar" aria-valuenow={b.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.label} progress`}><span style={{width:`${b.percent}%`}}/></div>
   {b.cause&&<span className="h-cap">{b.cause}</span>}</div>)}
  {v.more>0&&<span className="h-cap">+{v.more} more</span>}
 </div>;
}
export function LedgerTabs({input,tab,onTab}:{input:LedgerInput;tab:'production'|'history'|'seasons';onTab:(t:'production'|'history'|'seasons')=>void}){
 const v=ledgerView(tab,input);
 return <div className="h-queue"><div role="tablist" className="h-queue-row">{(['production','history','seasons'] as const).map(t=><button key={t} role="tab" aria-selected={t===tab} onClick={()=>onTab(t)}>{t==='seasons'?'Compare':t[0].toUpperCase()+t.slice(1)}</button>)}</div>
  <strong>{v.title}</strong>{v.rows.map((r,i)=><div key={i} className="h-queue-row"><span>{r.label}</span><span>{r.value}{r.delta?` (${r.delta})`:''}</span></div>)}{v.note&&<span className="h-cap">{v.note}</span>}</div>;
}
export function NotificationStack({signals,shown,now}:{signals:readonly Signal[];shown:Record<string,number>;now:number}){
 const v=notificationsView(signals,shown,now);
 return <div role="status" aria-live="polite">{v.items.map(n=><div key={n.id} className="h-chip" data-state={n.tone==='urgent'?'short':'ok'}>{n.line}</div>)}</div>;
}
