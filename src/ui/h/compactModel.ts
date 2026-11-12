/** Pure view models for the Option H compact UI components. They format
 * values the simulation already owns; they never create resources or decide
 * game rules. Codex owns queue/inventory behaviour; these only present it. */
export type QuantityView={label:string;value:string;cap?:string;state:'ok'|'short'|'full';title:string};
/** Compact number: 999, 1.2k, 12k, 1.2M. Never rounds a shortage up to "enough". */
export function compactNumber(n:number){
 if(!Number.isFinite(n))return '–';const a=Math.abs(n),sign=n<0?'-':'';
 if(a<1000)return sign+(a<10&&a%1?a.toFixed(1):String(Math.floor(a)));
 if(a<1e4)return sign+(Math.floor(a/100)/10).toFixed(1).replace(/\.0$/,'')+'k';
 if(a<1e6)return sign+Math.floor(a/1000)+'k';
 return sign+(Math.floor(a/1e5)/10).toFixed(1).replace(/\.0$/,'')+'M';
}
export function quantityView(label:string,amount:number,capacity?:number,need?:number):QuantityView{
 const state:QuantityView['state']=need!==undefined&&amount<need?'short':capacity!==undefined&&capacity>0&&amount>=capacity?'full':'ok';
 const title=`${label}: ${Math.floor(amount)}`+(capacity!==undefined?` of ${Math.floor(capacity)} capacity`:'')+(need!==undefined&&amount<need?` (needs ${Math.ceil(need)})`:'');
 return {label,value:compactNumber(amount),...(capacity!==undefined?{cap:compactNumber(capacity)}:{}),state,title};
}

export type QueueEntry={label:string;progress:number;paused?:boolean;worker?:string;next?:string};
export type QueueRowView={label:string;percent:number;paused:boolean;detail:string};
/** Short paid queue: at most `limit` rows plus a "+N more" count. */
export function queueView(entries:readonly QueueEntry[],limit=3){
 const rows:QueueRowView[]=entries.slice(0,limit).map(e=>({label:e.label,percent:Math.round(Math.max(0,Math.min(1,Number.isFinite(e.progress)?e.progress:0))*100),paused:!!e.paused,
  detail:e.paused?'paused':[e.worker,e.next].filter(Boolean).join(' · ')||'waiting for a worker'}));
 return {rows,more:Math.max(0,entries.length-limit)};
}

/** Candidate blockers in the simulation's own words. `severity` orders them:
 * the tooltip shows exactly ONE — the one that must be fixed first. */
export type Blocker={reason:string;remedy?:string;severity:number};
export type CostLine={label:string;need:number;have:number};
export type TooltipView={title:string;purpose:string;cost:{label:string;text:string;short:boolean}[];blocker?:{reason:string;remedy?:string}};
export function tooltipView(title:string,purpose:string,cost:readonly CostLine[],blockers:readonly Blocker[]):TooltipView{
 const costView=cost.map(c=>({label:c.label,text:`${compactNumber(c.need)}${c.have<c.need?` (${compactNumber(c.have)})`:''}`,short:c.have<c.need}));
 // A missing material is itself a blocker when the caller supplied none.
 const derived:Blocker[]=cost.filter(c=>c.have<c.need).map(c=>({reason:`Needs ${Math.ceil(c.need-c.have)} more ${c.label}`,remedy:`Gather or deliver ${c.label}`,severity:50}));
 const all=[...blockers,...derived].sort((a,b)=>b.severity-a.severity||a.reason.localeCompare(b.reason));
 const top=all[0];
 return {title,purpose:purpose.length>140?purpose.slice(0,137).trimEnd()+'…':purpose,cost:costView,...(top?{blocker:{reason:top.reason,...(top.remedy?{remedy:top.remedy}:{})}}:{})};
}
