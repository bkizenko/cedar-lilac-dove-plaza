import type {CouncilModel} from '../../game/rulersView';
import {SocietyFlag} from '../SocietyFlag';
import {Card} from './CouncilParts';
type Neighbour=CouncilModel['neighbours'][number];
import {courtLine} from './courtLine';
export type DiplomacyAction='marry-houses'|'foster-houses'|'exchange-hostages';
/** Inbox line: what across all neighbours wants the player's attention (claims against us, wards coming home within a year, houses at odds). */
export function diplomacyInbox(ns:Neighbour[]):string[]{
 const against=ns.reduce((a,n)=>a+(n.casus?.filter(k=>!k.byUs).length??0),0),home=ns.reduce((a,n)=>a+(n.wards?.filter(w=>!w.endsIn||w.endsIn<=1).length??0),0),odds=ns.filter(n=>n.hostile).length;
 return [against&&`${against} claim${against>1?'s':''} held against us`,home&&`${home} ward${home>1?'s':''} due home within a year`,odds&&`${odds} house${odds>1?'s':''} at odds`].filter(Boolean) as string[];
}
/** How old the dated report behind a card is; stale after 180 s (DIPLOMATIC_KNOWLEDGE_RULES.staleSeconds). Never current private trust. */
export function reportAgeLabel(r?:{ageSec:number;via:string;stale:boolean}):string{if(!r)return '';const a=r.ageSec,t=a<10?'just now':a<90?`${a}s ago`:`${Math.round(a/60)} min ago`;return `Report ${t}${r.stale?' · stale':''}`;}
const mood=(n:Neighbour)=>n.hostile?{word:'At odds',cls:'text-red-300'}:n.atPeace?{word:'At peace',cls:'text-green-200'}:n.trust>=60?{word:'Friendly',cls:'text-green-200'}:n.trust>=25?{word:'Cordial',cls:'text-parchment'}:{word:'Reserved',cls:'text-parchment-dim'};
/** One card per known neighbour: flag, mood, a trust bar over a grievance bar, what the bond implies, and the family-diplomacy actions. */
export function DiplomacySheet({neighbours,onAct,feedback}:{neighbours:Neighbour[];onAct:(team:number,kind:DiplomacyAction)=>void;feedback?:string}){
 if(!neighbours.length)return null;
 const sorted=[...neighbours].sort((a,b)=>Number(!!b.hostile)-Number(!!a.hostile)||b.trust-a.trust);
 return <Card label="Neighbours" title="Neighbouring houses">
  {diplomacyInbox(neighbours).length>0&&<p data-inbox="1" className="mb-2 rounded border border-bronze/40 bg-black/25 px-2 py-1 text-[12px] text-parchment">Needs attention: {diplomacyInbox(neighbours).join(' · ')}</p>}
  <ul className="space-y-2">{sorted.map(n=>{const m=mood(n),g=n.grievance??0;return <li key={n.team} id={`house-${n.team}`} className="rounded border border-parchment/10 bg-black/20 p-2">
   <div className="flex items-center gap-2">{n.identity&&<SocietyFlag identity={n.identity} label={`${n.name} flag`}/>}<div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-parchment">{n.name}</div><div className="text-parchment-dim">{n.bond}</div></div><span className={'text-[10px] font-semibold uppercase tracking-wide '+m.cls}>{m.word}</span></div>
   {n.report&&<div data-report-age="1" data-stale={n.report.stale?'1':'0'} className={'mt-1 text-[12px] '+(n.report.stale?'text-[color:var(--hw-warn,#e0b862)]':'text-parchment-dim')} title={`Received by ${n.report.via}; what we know may have changed.`}>{n.report.stale?'\u25CC ':'\u25CF '}{reportAgeLabel(n.report)}</div>}
   {n.voice&&<blockquote data-manner={n.voice.manner} className="mt-1.5 border-l-2 border-bronze/50 pl-2 text-[12px] italic text-parchment-dim" title={`If refused: ${n.voice.refusal} If they give: ${n.voice.gift}`}>{n.voice.greeting}<span className="ml-1 not-italic uppercase tracking-wide text-[10px]">{n.voice.manner}</span></blockquote>}
   {courtLine(n.court)&&<p className="mt-1.5 text-[12px] text-parchment-dim" data-court="1">{courtLine(n.court)}</p>}
   <div className="mt-1.5 grid grid-cols-[3.5rem_1fr_2rem] items-center gap-x-2 gap-y-1">
    <span className="text-parchment-dim">Trust</span><span role="meter" aria-label={`Trust in ${n.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,n.trust))} className="h-1.5 rounded bg-black/40"><span className="block h-1.5 rounded" style={{width:Math.min(100,n.trust)+'%',background:'var(--hw-good,#a9c98a)'}}/></span><span className="text-right tabular-nums">{n.trust}</span>
    <span className="text-parchment-dim">Grudge</span><span role="meter" aria-label={`Grudge held by ${n.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,g))} className="h-1.5 rounded bg-black/40"><span className="block h-1.5 rounded" style={{width:Math.min(100,g)+'%',background:'var(--hw-bad,#d88a7a)'}}/></span><span className="text-right tabular-nums">{g}</span>
   </div>
   {n.means.length>0&&<ul className="mt-1.5 flex flex-wrap gap-1">{n.means.map(x=><li key={x} className="rounded bg-parchment/10 px-1.5 py-0.5 text-[11px] text-parchment-dim">{x}</li>)}</ul>}
   {!!n.wards?.length&&<div className="mt-2 rounded bg-black/25 p-1.5"><div className="text-[11px] uppercase tracking-wide text-parchment-dim">Kin in each other's halls</div><ul className="mt-1 space-y-1">{n.wards.map(w=><li key={w.name+w.sinceYear} title={w.effect} className="text-[12px]"><span className="font-semibold text-parchment">{w.name}</span>, {w.age}: {w.kind==='foster'?'fostered':'a hostage'} {w.heldByUs?'with us':`in ${n.name}`}; home in {w.endsIn?`${w.endsIn} yr`:'under a year'}. <span className="text-parchment-dim">{w.effect}</span></li>)}</ul></div>}
   {!!n.casus?.length&&<div className="mt-2 rounded bg-black/25 p-1.5"><div className="text-[11px] uppercase tracking-wide text-parchment-dim">Standing grievances</div><ul className="mt-1 space-y-1">{n.casus.map((k,i)=><li key={k.kind+i} className="text-[12px]"><span className={'font-semibold '+(k.byUs?'text-parchment':'text-[color:var(--hw-bad,#d88a7a)]')}>{k.byUs?'We hold':'They hold'}</span> {k.reason.replace(/^(We|They) hold /,'').replace(/;.*$/,'')}; lapses in {k.endsIn?`${k.endsIn} yr`:'under a year'}. <span className="text-parchment-dim">Citing it costs {k.cost} legitimacy.</span></li>)}</ul></div>}
   {!!n.memory?.length&&<div className="mt-2 rounded bg-black/25 p-1.5" data-memory="1"><div className="text-[11px] uppercase tracking-wide text-parchment-dim">What {n.name} remembers</div><ul className="mt-1 space-y-1">{n.memory.map((m,i)=><li key={m.kind+m.year+i} className="text-[12px]" style={{opacity:Math.max(0.45,Math.min(1,m.weight/100))}} title={`Year ${m.year}. Memory fades by half every ten years.`}>{m.text}. <span className="text-parchment-dim">{m.weight>=70?'Fresh in mind':m.weight>=40?'Fading':'Nearly forgotten'}.</span></li>)}</ul></div>}
   {n.canMarry&&<div className="mt-2 flex flex-wrap gap-1.5">{([['marry-houses','Arrange a marriage'],['foster-houses','Foster children'],['exchange-hostages','Exchange hostages']] as const).map(([k,l])=><button key={k} type="button" className="rounded-md border border-bronze/40 px-2 py-0.5 hover:border-bronze-bright" onClick={()=>onAct(n.team,k)}>{l}</button>)}</div>}
  </li>;})}</ul>
  {feedback&&<p role="status" className="text-parchment">{feedback}</p>}
 </Card>;
}
