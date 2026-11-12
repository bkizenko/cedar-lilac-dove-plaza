import type {ReactNode} from 'react';
import './theme.css';
import {queueView,quantityView,tooltipView,type Blocker,type CostLine,type QueueEntry} from './compactModel';
/** Option H compact shared UI parts. Opt-in: wrap a region in
 * <HThemeScope> (data-hw-theme="h"); the current HUD is not replaced. */
export function HThemeScope({children}:{children:ReactNode}){return <div data-hw-theme="h">{children}</div>;}

/** Icon + quantity chip with optional capacity; red edge only when short. */
export function QuantityChip({icon,label,amount,capacity,need}:{icon:ReactNode;label:string;amount:number;capacity?:number;need?:number}){
 const v=quantityView(label,amount,capacity,need);
 return <span className="h-chip" data-state={v.state} title={v.title} aria-label={v.title}>{icon}<span>{v.value}</span>{v.cap&&<span className="h-cap">/{v.cap}</span>}</span>;
}

/** Short queue/progress box: a few rows, then "+N more". */
export function QueueBox({title,entries,limit=3}:{title:string;entries:readonly QueueEntry[];limit?:number}){
 const v=queueView(entries,limit);
 return <div className="h-queue" role="group" aria-label={title}>
  {v.rows.length===0&&<span>Nothing queued</span>}
  {v.rows.map((r,i)=><div key={i}><div className="h-queue-row" data-paused={r.paused}><span>{r.label}</span><span>{r.percent}%</span></div>
   <div className="h-bar" role="progressbar" aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.label} progress`}><span style={{width:`${r.percent}%`}}/></div>
   <div className="h-queue-row"><span className="h-cap">{r.detail}</span></div></div>)}
  {v.more>0&&<span className="h-cap">+{v.more} more</span>}
 </div>;
}

/** Tooltip body: purpose, cost, and exactly one blocking reason with remedy. */
export function PurposeTooltip({title,purpose,cost,blockers}:{title:string;purpose:string;cost:readonly CostLine[];blockers:readonly Blocker[]}){
 const v=tooltipView(title,purpose,cost,blockers);
 return <div className="h-tip" role="tooltip">
  <strong>{v.title}</strong><span>{v.purpose}</span>
  {v.cost.length>0&&<span className="h-cost">{v.cost.map(c=><span key={c.label} data-short={c.short}>{c.label} {c.text}</span>)}</span>}
  {v.blocker&&<span className="h-blocker">{v.blocker.reason}{v.blocker.remedy&&<span className="h-remedy"> — {v.blocker.remedy}</span>}</span>}
 </div>;
}

/** Minimal white outline icon button (board H controls). */
export function HIconButton({label,onClick,children}:{label:string;onClick:()=>void;children:ReactNode}){
 return <button type="button" className="h-icon-btn" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}
