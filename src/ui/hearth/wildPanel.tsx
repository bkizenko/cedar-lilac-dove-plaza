import {useState,type ReactNode} from 'react';
import {Hammer,Footprints,Package,Plus,Users} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {WildCraftRow} from '@/game/wildCraftView';
import type {WildPlan} from '@/game/wildCraftControl';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {useLifecycleAction} from '../useLifecycleAction';
import {GameTooltip} from '../GameTooltip';
import {cx} from './kit';

/** Icon-first hunting, hides and preserving panel for the Hearth Village sheet. Reads the `wild-craft` owner read model and sends the
 * existing typed commands only (wild-work-control, wild-begin, wild-collect). Big icons carry the meaning; words live in hover and
 * screen-reader labels. Every refusal is the engine's own sentence. Hidden on saves without wild-craft. */
const Q={kind:'wild-craft'} as const;
type Tone='bad'|'warn'|'good';
type Cmd={kind:'wild-work-control';projectId:number;paused:boolean}|{kind:'wild-begin';recipe:string;critterId?:number;x?:number;z?:number}|{kind:'wild-collect';projectId?:number};

function Glyph({icon}:{icon:string}){return <span className="hw-emoji" aria-hidden="true">{icon}</span>;}
/** Read-only tile: icon, optional count, optional progress bar. */
function Info({icon,label,tip,badge,tone,pct}:{icon:string;label:string;tip?:string;badge?:string|number;tone?:Tone;pct?:number}){
 return <GameTooltip title={label} description={tip}><span className={cx('hw-wtile',tone&&'t-'+tone)} role="img" aria-label={tip?`${label}. ${tip}`:label}><Glyph icon={icon}/>
  {badge!==undefined&&<i className="hw-btn-badge">{badge}</i>}{pct!==undefined&&<span className="hw-wbar" aria-hidden="true"><i style={{width:`${Math.max(0,Math.min(100,pct))}%`}}/></span>}</span></GameTooltip>;
}
/** Tile that sends a command. Disabled tiles keep the refusal as their hover text. */
function Act({icon,label,tip,badge,tone,pct,disabled,onClick,on}:{icon:string;label:string;tip?:string;badge?:string|number;tone?:Tone;pct?:number;disabled?:boolean;onClick:()=>void;on?:boolean}){
 return <GameTooltip title={label} description={tip}><button type="button" className={cx('hw-wtile','is-act',tone&&'t-'+tone,on&&'is-on')} aria-label={tip?`${label}. ${tip}`:label} aria-disabled={disabled||undefined} onClick={()=>{if(!disabled)onClick();}}><Glyph icon={icon}/>
  {badge!==undefined&&<i className="hw-btn-badge">{badge}</i>}{pct!==undefined&&<span className="hw-wbar" aria-hidden="true"><i style={{width:`${Math.max(0,Math.min(100,pct))}%`}}/></span>}</button></GameTooltip>;
}
const Row=({icon,label,children}:{icon:ReactNode;label:string;children:ReactNode})=><div className="hw-wrow" role="group" aria-label={label}><span className="hw-wrow-label" title={label}>{icon}</span><div className="hw-wtiles">{children}</div></div>;
const percent=(t:string)=>{const m=/(\d+)%/.exec(t);return m?+m[1]:undefined;};

export function WildGlance({rows,plan,busy=false,onCommand,note}:{rows:WildCraftRow[];plan?:WildPlan;busy?:boolean;onCommand?:(c:Cmd)=>void;note?:string}){
 const work=rows.filter(r=>r.kind==='work'),afield=rows.filter(r=>r.section==='afield'),stores=rows.filter(r=>r.section==='stores');
 const send=(c:Cmd)=>()=>onCommand?.(c);
 const startable=plan?.recipes.filter(r=>!r.issue||r.stations.length>0)??[];
 const empty=!work.length&&!afield.length&&!stores.length&&!plan?.carcasses.length&&!plan?.ready.length;
 return <div className="hw-wild" aria-label="Hunting and hides">
  {plan&&<div className="hw-wrow-head"><Info icon="🧑" label={plan.hands.length?`${plan.hands.length} free hand${plan.hands.length===1?'':'s'}`:'No free hands'} tip={plan.hands.length?plan.hands.join(', '):'Everyone is busy or committed elsewhere'} badge={plan.hands.length} tone={plan.hands.length?undefined:'warn'}/><span className="hw-wtitle">Hunt &amp; hides</span></div>}
  {work.length>0&&<Row icon={<Hammer/>} label="Under way">{work.map((r,i)=>{const paused=!!r.paused;return r.projectId!==undefined&&onCommand
   ?<Act key={i} icon={r.icon} label={`${r.why??'Work'}${r.who?` · ${r.who}`:''}`} tip={`${r.text}. ${paused?'Click to resume.':'Click to pause.'}`} badge={paused?'⏸':r.text.startsWith('ready')?'✋':undefined} tone={paused?'warn':undefined} pct={percent(r.text)} disabled={busy} onClick={send({kind:'wild-work-control',projectId:r.projectId,paused:!paused})}/>
   :<Info key={i} icon={r.icon} label={`${r.why??'Work'}${r.who?` · ${r.who}`:''}`} tip={r.text} pct={percent(r.text)} badge={r.paused?'⏸':undefined}/>;})}</Row>}
  {afield.length>0&&<Row icon={<Footprints/>} label="Out in the wild">{afield.map((r,i)=><Info key={i} icon={r.icon} label={r.kind==='wound'?`Blood trail: ${r.text}`:`${r.why??'Trap'}`} tip={r.kind==='wound'?`Follow it before it bleeds out and the carcass spoils. ${r.amount??0} marks seen.`:r.text} tone={r.urgent?'bad':undefined} badge={r.kind==='trap'?r.text.split(' ')[0]:undefined}/>)}</Row>}
  {stores.length>0&&<Row icon={<Package/>} label="Hides, fat and what is rotting">{stores.map((r,i)=><Info key={i} icon={r.icon} label={`${r.text} in store`} tip={r.why} tone={r.urgent?'warn':undefined} badge={Number.isFinite(+r.text)?Math.round(+r.text):r.text}/>)}</Row>}
  {plan&&(startable.length>0||plan.carcasses.length>0||plan.ready.length>0||plan.trails.length>0||plan.sites.length>0||plan.pens.length>0)&&<Row icon={<Plus/>} label="Start work">
   {plan.ready.map(b=><Act key={'r'+b.projectId} icon="✋" label={`Collect: ${b.name}`} tip="A finished batch is waiting on its rack. A free adult will carry it home." tone="good" on badge="✓" disabled={busy||!plan.hands.length} onClick={send({kind:'wild-collect',projectId:b.projectId})}/>)}
   {plan.carcasses.map(c=><Act key={'c'+c.id} icon="🔪" label={`Dress the ${c.species}`} tip={`Take fat, sinew, brain and horn: ${c.parts} left on the carcass. One trip carries six.`} badge={c.parts} disabled={busy||!plan.hands.length} onClick={send({kind:'wild-begin',recipe:'dressParts',critterId:c.id})}/>)}
   {plan.trails.map(t=><Act key={'t'+t.id} icon="🩸" label={`Track the ${t.species}`} tip="Follow the blood trail to the wounded animal." tone="bad" disabled={busy||!plan.hands.length} onClick={send({kind:'wild-begin',recipe:'trackWounded',critterId:t.id})}/>)}
   {plan.sites.map(x=><Act key={'s'+x.id} icon={x.icon} label={x.name} tip={x.left<1?'Spent for now. It renews only in warm weather.':`${x.left} of ${x.cap} left. One trip carries ${x.recipe==='cutHay'?4:2}.`} badge={x.left} tone={x.left<1?'warn':undefined} disabled={busy||!plan.hands.length||x.left<1} onClick={send({kind:'wild-begin',recipe:x.recipe,x:x.x,z:x.z})}/>)}
   {plan.pens.map(x=><Act key={'p'+x.id} icon={x.icon} label="Fork hay to the herd" tip={x.issue??'Feeds this pen from the hay store. Left-over hay is carried back.'} disabled={busy||!plan.hands.length||!!x.issue} onClick={send({kind:'wild-begin',recipe:'forkHay',x:x.x,z:x.z})}/>)}
   {startable.map(r=><Act key={r.id} icon={r.icon} label={r.name} tip={r.issue??`Needs a free ${r.station}${r.stations.length>1?` (${r.stations.length} available)`:''}`} disabled={busy||!!r.issue} onClick={send({kind:'wild-begin',recipe:r.id})}/>)}
  </Row>}
  {empty&&<p className="hw-empty"><Users size={20}/> Nothing is being hunted, tanned or stored.</p>}
  {note&&<p className="hw-feedback" role="status">{note}</p>}
 </div>;
}

export function HearthWildPanel({engine}:{engine:Engine}){
 const action=useLifecycleAction(engine),[note,setNote]=useState(''),epoch=engine.dispatchEpoch;
 const read=useOwnerReadModels(engine,[Q]),m=read(Q).model?.wild;
 if(!m?.enabled)return null;
 const run=(command:Cmd)=>{if(engine.disposed||engine.dispatchEpoch!==epoch)return;void action.run(()=>engine.dispatch(command),r=>{if(r.epoch===epoch&&engine.dispatchEpoch===epoch){setNote(r.reason||'Started');engine.pushHud();}});};
 return <section className="hw-card" aria-label="Wild craft"><WildGlance rows={m.rows} plan={m.plan} busy={action.busy} onCommand={run} note={action.error||note}/></section>;
}
