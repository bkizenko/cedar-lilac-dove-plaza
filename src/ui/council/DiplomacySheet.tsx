import type {CouncilModel} from '../../game/rulersView';
import {SocietyFlag} from '../SocietyFlag';
import {Card} from './CouncilParts';
type Neighbour=CouncilModel['neighbours'][number];
export type DiplomacyAction='marry-houses'|'foster-houses'|'exchange-hostages';
const mood=(n:Neighbour)=>n.hostile?{word:'At odds',cls:'text-red-300'}:n.atPeace?{word:'At peace',cls:'text-green-200'}:n.trust>=60?{word:'Friendly',cls:'text-green-200'}:n.trust>=25?{word:'Cordial',cls:'text-parchment'}:{word:'Reserved',cls:'text-parchment-dim'};
/** One card per known neighbour: flag, mood, a trust bar over a grievance bar, what the bond implies, and the family-diplomacy actions. */
export function DiplomacySheet({neighbours,onAct,feedback}:{neighbours:Neighbour[];onAct:(team:number,kind:DiplomacyAction)=>void;feedback?:string}){
 if(!neighbours.length)return null;
 const sorted=[...neighbours].sort((a,b)=>Number(!!b.hostile)-Number(!!a.hostile)||b.trust-a.trust);
 return <Card label="Neighbours" title="Neighbouring houses">
  <ul className="space-y-2">{sorted.map(n=>{const m=mood(n),g=n.grievance??0;return <li key={n.team} className="rounded border border-parchment/10 bg-black/20 p-2">
   <div className="flex items-center gap-2">{n.identity&&<SocietyFlag identity={n.identity} label={`${n.name} flag`}/>}<div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-parchment">{n.name}</div><div className="text-parchment-dim">{n.bond}</div></div><span className={'text-[10px] font-semibold uppercase tracking-wide '+m.cls}>{m.word}</span></div>
   <div className="mt-1.5 grid grid-cols-[3.5rem_1fr_2rem] items-center gap-x-2 gap-y-1">
    <span className="text-parchment-dim">Trust</span><span className="h-1.5 rounded bg-black/40"><span className="block h-1.5 rounded" style={{width:Math.min(100,n.trust)+'%',background:'var(--hw-good,#a9c98a)'}}/></span><span className="text-right tabular-nums">{n.trust}</span>
    <span className="text-parchment-dim">Grudge</span><span className="h-1.5 rounded bg-black/40"><span className="block h-1.5 rounded" style={{width:Math.min(100,g)+'%',background:'var(--hw-bad,#d88a7a)'}}/></span><span className="text-right tabular-nums">{g}</span>
   </div>
   {n.means.length>0&&<ul className="mt-1.5 flex flex-wrap gap-1">{n.means.map(x=><li key={x} className="rounded bg-parchment/10 px-1.5 py-0.5 text-[11px] text-parchment-dim">{x}</li>)}</ul>}
   {!!n.wards?.length&&<div className="mt-2 rounded bg-black/25 p-1.5"><div className="text-[11px] uppercase tracking-wide text-parchment-dim">Kin in each other's halls</div><ul className="mt-1 space-y-1">{n.wards.map(w=><li key={w.name+w.sinceYear} title={w.effect} className="text-[12px]"><span className="font-semibold text-parchment">{w.name}</span>, {w.age}: {w.kind==='foster'?'fostered':'a hostage'} {w.heldByUs?'with us':`in ${n.name}`}; home in {w.endsIn?`${w.endsIn} yr`:'under a year'}. <span className="text-parchment-dim">{w.effect}</span></li>)}</ul></div>}
   {!!n.casus?.length&&<div className="mt-2 rounded bg-black/25 p-1.5"><div className="text-[11px] uppercase tracking-wide text-parchment-dim">Standing grievances</div><ul className="mt-1 space-y-1">{n.casus.map((k,i)=><li key={k.kind+i} className="text-[12px]"><span className={'font-semibold '+(k.byUs?'text-parchment':'text-[color:var(--hw-bad,#d88a7a)]')}>{k.byUs?'We hold':'They hold'}</span> {k.reason.replace(/^(We|They) hold /,'').replace(/;.*$/,'')}; lapses in {k.endsIn?`${k.endsIn} yr`:'under a year'}. <span className="text-parchment-dim">Citing it costs {k.cost} legitimacy.</span></li>)}</ul></div>}
   {n.canMarry&&<div className="mt-2 flex flex-wrap gap-1.5">{([['marry-houses','Arrange a marriage'],['foster-houses','Foster children'],['exchange-hostages','Exchange hostages']] as const).map(([k,l])=><button key={k} type="button" className="rounded-md border border-bronze/40 px-2 py-0.5 hover:border-bronze-bright" onClick={()=>onAct(n.team,k)}>{l}</button>)}</div>}
  </li>;})}</ul>
  {feedback&&<p role="status" className="text-parchment">{feedback}</p>}
 </Card>;
}
