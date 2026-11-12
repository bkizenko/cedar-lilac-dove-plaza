import './theme.css';
import {tradeDialogView,type TradeDialogInput,type ChipRow} from './tradeModel';
/** Option H trade dialog. UNEXECUTED (no node_modules here); presents tradeDialogView only.
 * Icons render as `<span class="h-good h-good-<icon>">`; the art/CSS for those icons is not drawn yet. */
const Chips=({row,empty}:{row:ChipRow;empty?:string})=><span className="h-chips">
 {row.chips.length===0&&<span className="h-cap">{empty??'nothing'}</span>}
 {row.chips.map(c=><span key={c.kind} className="h-chip" data-state={c.state} title={c.title} aria-label={c.title}><span className={`h-good h-good-${c.icon}`} aria-hidden="true"/><span>{c.label}</span><span>{c.value}</span></span>)}
 {row.more>0&&<span className="h-cap">+{row.more} more</span>}</span>;
export function TradeDialog({input,onAccept,onCounter,onDecline}:{input:TradeDialogInput;onAccept:()=>void;onCounter:()=>void;onDecline:()=>void}){
 const v=tradeDialogView(input);
 return <div className="h-tip" role="dialog" aria-label={`Trade with ${v.leader.society}`}>
  <strong>{v.leader.name} of {v.leader.society}</strong><span>{v.leader.stanceText} <span className="h-cap">{v.leader.relationText}</span></span>
  <div><strong>{v.player.name}</strong> holds <Chips row={v.player.held}/></div>
  <div><strong>{v.partner.name}</strong> {v.partner.heldNote.toLowerCase()} <Chips row={v.partner.held} empty="unknown"/></div>
  <div>They offer <Chips row={v.partner.offers}/> and want <Chips row={v.partner.wants}/></div>
  {v.proposal&&<div>You give <Chips row={v.proposal.give}/> for <Chips row={v.proposal.get}/></div>}
  {v.blocker&&<span className="h-blocker">{v.blocker.reason}{v.blocker.remedy&&<span className="h-remedy"> — {v.blocker.remedy}</span>}</span>}
  <div>
   <button type="button" disabled={!v.accept.enabled} title={v.accept.reason} onClick={onAccept}>Accept</button>
   <button type="button" disabled={!v.counter.enabled} title={v.counter.reason} onClick={onCounter}>Counter</button>
   <button type="button" onClick={onDecline}>Decline</button>
  </div>
 </div>;
}
