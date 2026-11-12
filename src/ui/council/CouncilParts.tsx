import type {CouncilModel} from '../../game/rulersView';
/** Lane B council parts: each one reads only the plain council model, so they survive the worker boundary. */
type Faction=CouncilModel['factions'][number];
export const FACTION_LABEL:Record<string,string>={kin:'Kin',warriors:'War-leaders',priests:'Priests',elders:'Elders',merchants:'Merchants',landholders:'Landholders',commons:'Common folk',assembly:'Assembly'};
const LAW_LABEL:Record<string,string>={primogenitureMale:'eldest son inherits',primogenitureAny:'eldest child inherits',ultimogeniture:'youngest child inherits',partible:'eldest holds the title; lands are shared',agnaticSeniority:'eldest male of the house',tanistry:'the ablest kinsman is chosen',electiveAssembly:'the assembly chooses',councilElders:'the elders choose',designated:'the ruler names a successor'};
export const lawLabel=(l:string)=>LAW_LABEL[l]??l;
export const loyaltyWord=(n:number)=>n<35?'restless':n>65?'loyal':'wavering';
const tone=(n:number)=>n<35?'var(--hw-bad,#d88a7a)':n>65?'var(--hw-good,#a9c98a)':'var(--hw-mid,#d8c37a)';
const Heading=({children}:{children:React.ReactNode})=><h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bronze-bright">{children}</h4>;
export const Card=({label,title,children}:{label:string;title:string;children:React.ReactNode})=><article aria-label={label} className="rounded-md border border-parchment/10 bg-black/20 p-2"><Heading>{title}</Heading><div className="mt-1.5 space-y-1.5">{children}</div></article>;

/** Who takes over, why, and how soon it may matter. Only shown once the polity has a line of succession. */
export function HandoverCard({h}:{h:NonNullable<CouncilModel['handover']>}){
 const risk=h.yearlyRisk,urgent=risk>=10||h.rulerAge>=55;
 return <Card label="Handover" title="If the ruler falls">
  {h.extinct?<p className="text-red-300">No living kin. The line ends unless a claimant rises.</p>:h.heir?<div className="flex items-baseline justify-between gap-2"><div><div className="text-sm font-semibold text-parchment">{h.heir.name}</div>
    <div className="text-parchment-dim">{h.heir.role}, {h.heir.age}. {h.heir.headline}</div></div>
    <span className={'rounded px-1.5 py-0.5 text-[10px] uppercase '+(h.heir.adult?'bg-green-900/40 text-green-200':'bg-amber-900/40 text-amber-200')}>{h.heir.adult?'of age':'too young'}</span></div>:<p>A regent will hold the seat{h.regent?`: ${h.regent}`:''}.</p>}
  {h.heir&&!h.heir.adult&&<p className="text-amber-200">A regency would govern until they come of age.</p>}
  {h.heir&&!h.heir.legit&&<p className="text-amber-200">Their claim is contested (strength {h.heir.claim}).</p>}
  <p className="text-parchment-dim">By custom, {lawLabel(h.law)}.</p>
  <p className={urgent?'text-amber-200':'text-parchment-dim'}>Ruler aged {h.rulerAge}; about {risk}% a year the seat passes.</p>
  {h.others.length>0&&<p className="text-parchment-dim">Also in line: {h.others.map(o=>`${o.name} (${o.age})`).join(', ')}.</p>}
 </Card>;
}

/** The last few things the house did or suffered, newest first. */
export function FameFeed({log}:{log:string[]}){
 if(!log.length)return null;
 return <Card label="Chronicle" title="Chronicle"><ol className="space-y-1">{[...log].reverse().map((l,i)=><li key={i} className={'border-l-2 pl-2 '+(i===0?'border-bronze-bright text-parchment':'border-parchment/15 text-parchment-dim')}>{l}</li>)}</ol></Card>;
}

/** One bar per faction: width is its weight in the realm, colour is its mood. Demands read on tap/hover and below. */
export function FactionsStrip({factions,coalitionLoss}:{factions:Faction[];coalitionLoss:number}){
 if(!factions.length)return null;
 return <Card label="Factions" title="Who must be kept content">
  <div role="img" aria-label="Faction weight and mood" className="flex h-3 overflow-hidden rounded">{factions.map(f=><span key={f.kind} title={`${FACTION_LABEL[f.kind]??f.kind}: ${loyaltyWord(f.loyalty)}`} style={{flexGrow:Math.max(4,f.power),background:tone(f.loyalty),borderRight:'1px solid rgba(0,0,0,.45)'}}/>)}</div>
  <ul className="space-y-0.5">{factions.map(f=><li key={f.kind} className="grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-2"><span className="text-parchment">{FACTION_LABEL[f.kind]??f.kind}</span><span className="text-parchment-dim">wants {f.demand}</span><span className="text-[10px] uppercase" style={{color:tone(f.loyalty)}}>{loyaltyWord(f.loyalty)}</span></li>)}</ul>
  {coalitionLoss>0&&<p className="text-red-300">{coalitionLoss}% of the realm's weight is restless.</p>}
 </Card>;
}

/** Renown by stream, strongest first, with the total. Bars scale to the strongest stream so small houses still read. */
export function GloryBars({glory,score}:{glory:{stream:string;value:number}[];score:number}){
 const rows=glory.filter(g=>g.value>0).sort((a,b)=>b.value-a.value);if(!rows.length)return null;const top=Math.max(20,rows[0].value);
 return <Card label="Renown" title={`Renown ${score}`}><ul className="space-y-1">{rows.map(g=><li key={g.stream} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2"><span className="capitalize text-parchment">{g.stream}</span>
  <span className="h-2 rounded bg-black/40"><span className="block h-2 rounded bg-bronze-bright" style={{width:Math.round(100*g.value/top)+'%'}}/></span><span className="text-right tabular-nums text-parchment-dim">{g.value}</span></li>)}</ul></Card>;
}
