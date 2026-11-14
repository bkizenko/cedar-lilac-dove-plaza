import type {ReactNode} from 'react';
import {Crown,Skull,Unlock,Home,Shield,Users,Swords,TriangleAlert,Scroll,Hourglass,Handshake} from 'lucide-react';
import type {Engine} from '../../game/engine';
import type {CouncilModel} from '../../game/rulersView';
import {societyIdentity} from '../../game/societyIdentity';
import {LeaderPortrait} from '../h/LeaderPortrait';
import {GameTooltip} from '../GameTooltip';
import {lawLabel} from '../council/CouncilParts';
import {factionReason} from '../council/factionReason';
import type {CapitulationOutcome} from '../../game/capitulation';
import {TERMS} from '../council/CapitulationTerms';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {useActionFeedback,FeedbackList} from '../council/useActionFeedback';
import {mourningText} from '../council/mourningText';
import {dedupeFeed} from '../council/feedDedupe';

const cx=(...a:(string|false|undefined|null)[])=>a.filter(Boolean).join(' ');
const sentence=(s:string)=>{const t=s.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();return t.charAt(0).toUpperCase()+t.slice(1);};

/** Seeded bust of the sitting ruler using the same LeaderPortrait the encounter dialog uses. Presentation only; a missing
 * projection (worker boot, old save) simply falls back to the crown medal. */
export function RulerPortrait({engine,name,fallback}:{engine:Engine;name:string;fallback:ReactNode}){
 try{
  const g=engine.game,id=societyIdentity(g,0);
  return <div className="hw-portrait"><LeaderPortrait leaderId={g.state.units.find(u=>u.team===0)?.id??1} worldSeed={g.state.seed} era={g.tribe(0).age??0} name={name} society={g.tribe(0).name} colors={{primary:id.primary,secondary:id.secondary}} relation={undefined}/></div>;
 }catch{return <>{fallback}</>;}
}

type Handover=NonNullable<CouncilModel['handover']>;
/** The handover card as a story in four beats: who is next, how soon, what could go wrong, who else might rise. Succession is
 * the one place the player cannot act directly, so the card says plainly what will happen and what pushes on it. */
export function HandoverCard({h,mourning}:{h:Handover;mourning?:CouncilModel['mourning']}){
 const urgent=h.yearlyRisk>=10||h.rulerAge>=55,p=h.pressure,contested=h.heir&&!h.heir.legit,m=mourning?mourningText(mourning):null;
 const stage=p&&p.stage&&p.stage!=='calm'&&p.stage!=='none'?p.stage:null;
 return <section className={cx('hw-card hw-handover',(urgent||contested||!!stage)&&'is-watch')} aria-label="Handover">
  <div className="hw-card-head"><h3>{m?'The seat has passed':'Successor'}</h3>
   <GameTooltip title="Chance the seat passes within a year" description={`Ruler aged ${h.rulerAge}. ${lawLabel(h.law)}.`}>
    <span className={cx('hw-chip',urgent&&'t-warn')} tabIndex={0} aria-label={`About ${h.yearlyRisk} percent a year the seat passes`}><Hourglass size={18}/>{h.yearlyRisk}%/y</span>
   </GameTooltip></div>
  {m&&<div className="hw-mourn" role="status"><span className="hw-chip hw-chip-soft"><Scroll size={16}/>{m.kind}</span><p className="hw-sub">{m.headline}</p>{m.contested&&<p className="hw-sub t-warn"><TriangleAlert size={16}/> The succession is contested.</p>}<p className="hw-sub">{m.left}.{m.pacts&&<> {m.pacts}</>}</p></div>}
  {h.extinct?<p className="t-bad hw-sub"><Skull size={18}/> No living kin. The line ends unless a claimant rises.</p>
   :h.heir?<div className="hw-heir"><span className="hw-medal hw-medal-s"><Crown size={22}/></span><div><h4>{h.heir.name}</h4><p className="hw-sub">{sentence(h.heir.role)}, {h.heir.age}. {h.heir.headline}</p></div></div>
   :<p className="hw-sub">A regent will hold the seat{h.regent?`: ${h.regent}`:''}.</p>}
  {h.heir&&<div className="hw-chips"><span className={cx('hw-chip',h.heir.adult?'t-good':'t-warn')}>{h.heir.adult?'Of age':'Too young: a regency would govern'}</span>{contested&&<span className="hw-chip t-warn"><TriangleAlert size={16}/>Claim contested · {h.heir.claim}</span>}</div>}
  <p className="hw-sub">{sentence(lawLabel(h.law))}.</p>
  {p&&(stage||p.claimsAgainst>0||p.unrest>0)&&<div className="hw-pressure"><span className="hw-row-label"><TriangleAlert size={18}/>Pressure</span>
   <span className={cx('hw-meter',p.unrest>=60?'bad':p.unrest>=30?'mid':'good')} role="img" aria-label={`Unrest ${p.unrest} percent`}><i style={{width:Math.min(100,p.unrest)+'%'}}/></span>
   {stage&&<span className="hw-chip t-warn">{sentence(stage)}</span>}{p.claimsAgainst>0&&<span className="hw-chip t-bad"><Swords size={16}/>{p.claimsAgainst} claim{p.claimsAgainst>1?'s':''} against us</span>}
   {p.why.length>0&&<ul className="hw-why">{p.why.map(w=><li key={w}>{w}</li>)}</ul>}</div>}
  {!!h.rivals?.length&&<div className="hw-chips"><span className="hw-row-label"><Swords size={18}/>Rival claims</span>{h.rivals.map(r=><span key={r.name} className={cx('hw-chip',!r.legit&&'t-warn')} title={`${r.role}, ${r.age}`}>{r.name} · {r.claim}{r.legit?'':' · irregular'}</span>)}</div>}
  {h.others.length>0&&<div className="hw-chips"><span className="hw-row-label"><Users size={18}/>Also in line</span>{h.others.map(o=><span key={o.name} className="hw-chip hw-chip-soft">{o.name} · {o.age}</span>)}</div>}
 </section>;
}

/** Fame feed: the house's recent deeds and losses, newest first and larger, older ones fading, so a death or a coup reads as an event. */
export function FameFeed({log}:{log:string[]}){
 const items=dedupeFeed([...log].reverse());
 if(!items.length)return <p className="hw-empty">Nothing has happened to the house yet.</p>;
 return <ol className="hw-fame" aria-label="Chronicle">{items.map((l,i)=><li key={i} className={cx(i===0&&'is-new',i>4&&'is-old')}>{i===0&&<Scroll size={20}/>}<span>{l.text}{l.count>1&&<b className="hw-count" title={`${l.count} times`}> ×{l.count}</b>}</span></li>)}</ol>;
}

/** Neighbour news: agreements the player is party to, in plain lines under the chronicle. Nothing the player could not know. */
export function NeighbourNewsFeed({news,nameOf}:{news:{time:number;kind:string;with:number;text:string}[];nameOf:(team:number)=>string}){
 if(!news.length)return null;
 return <section className="hw-news" aria-label="Neighbour news"><h3 className="hw-row-label"><Handshake size={18}/>Neighbour news</h3><ul className="hw-fame">{news.map((n,i)=><li key={i} className={cx(i===0&&'is-new')}><span><b>{nameOf(n.with)}</b> · {n.text.replace(/^\d+:\s*/,'')}</span></li>)}</ul></section>;
}

const mood=(n:number)=>n<35?'bad':n>65?'good':'mid';
const MOOD_COLOR={bad:'var(--hw-bad)',mid:'var(--hw-warn)',good:'var(--hw-good)'} as const;
const FACTION_NAME:Record<string,string>={kin:'Kin',warriors:'War-leaders',priests:'Priests',elders:'Elders',merchants:'Merchants',landholders:'Landholders',commons:'Common folk',assembly:'Assembly'};
/** Factions: one segmented strip (width = weight in the realm, colour = mood) so the whole court reads at a glance, then a row per
 * faction with what it wants stated outright rather than hidden in a tooltip. Colour is never the only cue: each row names the mood. */
export function FactionsCard({factions,coalitionLoss}:{factions:CouncilModel['factions'];coalitionLoss:number}){
 const word=(n:number)=>n<20?'Hostile':n<35?'Restless':n<50?'Uneasy':n<65?'Steady':n<85?'Content':'Devoted';
 const sorted=[...factions].sort((a,b)=>b.power-a.power);
 return <section className="hw-card hw-factions" aria-label="Factions"><div className="hw-card-head"><h3>Who must be kept content</h3>{coalitionLoss>0&&<span className="hw-chip t-bad"><TriangleAlert size={16}/>{coalitionLoss}% restless</span>}</div>
  <div className="hw-strip" role="img" aria-label={'Faction weight and mood: '+sorted.map(f=>`${FACTION_NAME[f.kind]??f.kind} ${word(f.loyalty)}`).join(', ')}>{sorted.map(f=><span key={f.kind} title={`${FACTION_NAME[f.kind]??f.kind}: ${word(f.loyalty)}. ${factionReason(f.kind,f.demand,f.loyalty)}`} style={{flexGrow:Math.max(4,f.power),background:MOOD_COLOR[mood(f.loyalty)]}}/>)}</div>
  <ul className="hw-list">{sorted.map(f=><li key={f.kind} className="hw-faction" title={factionReason(f.kind,f.demand,f.loyalty)}><span className={cx('hw-dot','d-'+mood(f.loyalty))} aria-hidden/><b>{FACTION_NAME[f.kind]??f.kind}</b><em className={'t-'+mood(f.loyalty)}>{word(f.loyalty)}</em><span className="hw-sub">wants {f.demand}</span></li>)}</ul></section>;
}

/** Renown: bars share one scale (the largest stream fills it) and are ranked, so the player sees what the house is actually famous for. */
export function RenownCard({glory,score}:{glory:CouncilModel['glory'];score:number}){
 const rows=glory.filter(g=>g.value>0).sort((a,b)=>b.value-a.value);if(!rows.length)return null;const top=rows[0].value;
 return <section className="hw-card hw-renown" aria-label="Renown"><div className="hw-card-head"><h3>Renown</h3><span className="hw-chip"><Crown size={18}/>{score}</span></div>
  <ul className="hw-list">{rows.map((g,i)=><li key={g.stream}><span className="hw-meter-row"><b className="hw-lbl">{g.stream}</b><span className={cx('hw-meter',i===0&&'is-top')} role="img" aria-label={`${g.stream} ${g.value}`}><i style={{width:Math.max(6,g.value/top*100)+'%'}}/></span><b>{g.value}</b></span></li>)}</ul></section>;
}

/** Capitulation terms in the Hearth style: a beaten community's offer, its clock and will, and the eight outcomes grouped by
 * how hard they bear on the defeated (gentle / firm / ruinous). Same engine commands as the classic picker; the harsh tier is
 * set apart and marked so it is never one mis-tap away from "tribute". */
const TIERS:{key:string;label:string;ids:CapitulationOutcome[]}[]=[
 {key:'gentle',label:'Keep them as a people',ids:['autonomy','tribute','puppet']},
 {key:'firm',label:'Hold or take what they have',ids:['occupy','annex','loot']},
 {key:'ruinous',label:'Ruinous',ids:['captives','raze']}];
type Offer={id:number;defenderName:string;score:number;expiresIn:number;measured:{casualties:number;captured:number;lostArmed:number;buildingLoss:number}};
export function HearthCapitulationTerms({engine}:{engine:Engine}){
 const QUERY={kind:'capitulation-offers'} as const,read=useOwnerReadModels(engine,[QUERY]),offers=read(QUERY).model?.offers??[];
 const fb=useActionFeedback(engine);
 return <TermsOffers offers={offers} send={c=>void fb.send(c)} feedback={fb.items}/>;
}
export function TermsOffers({offers,send,feedback}:{offers:Offer[];send:(c:{kind:'accept-capitulation';frontId:number;outcome:CapitulationOutcome}|{kind:'refuse-capitulation';frontId:number})=>void;feedback:Parameters<typeof FeedbackList>[0]['items']}){
 if(!offers.length)return null;
 return <section aria-label="Terms offered" className="hw-terms">{offers.map(o=>{
  const will=Math.round(o.score*100),left=Math.max(0,Math.ceil(o.expiresIn)),m=o.measured;
  return <article key={o.id} className="hw-card hw-terms-card is-now">
   <div className="hw-card-head"><Scroll size={26}/><h3>{o.defenderName} offers terms</h3><span className={cx('hw-chip',left<=10?'t-bad':'t-warn')}><Hourglass size={16}/>{left}s</span></div>
   <div className="hw-meter-row"><span className="hw-lbl">Their will</span><span className="hw-bar" style={{flex:1}} role="img" aria-label={`Will broken ${will}%`}><i className="t-bad" style={{width:Math.min(100,will)+'%'}}/></span><b>{will}%</b></div>
   <ul className="hw-chips"><li className="hw-chip hw-chip-soft"><Skull size={16}/>{m.casualties} fallen</li><li className="hw-chip hw-chip-soft"><Users size={16}/>{m.captured} taken</li><li className="hw-chip hw-chip-soft"><Swords size={16}/>{m.lostArmed} armed lost</li><li className="hw-chip hw-chip-soft">{m.buildingLoss} {m.buildingLoss===1?"building":"buildings"} lost</li></ul>
   <p className="hw-sub">The offer lapses if your force leaves. Refusing hardens them.</p>
   {TIERS.map(t=><div key={t.key} className={cx('hw-term-tier','tier-'+t.key)}><h4>{t.label}</h4>
    <ul>{t.ids.map(id=>{const term=TERMS.find(x=>x.id===id)!;return <li key={id}><button type="button" className="hw-term" onClick={()=>send({kind:'accept-capitulation',frontId:o.id,outcome:id})}><b>{term.label}</b><span>{term.note}</span></button></li>;})}</ul></div>)}
   <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'refuse-capitulation',frontId:o.id})}><Swords size={18}/>Refuse and press the attack</button>
  </article>;})}<FeedbackList items={feedback}/></section>;
}

type Captive={id:number;name:string;fromTeam:number;fromName:string;resistance:number;guarded:boolean;canEscort:boolean;custody?:'escorting'|'custody';food?:number;waterLiters?:number};
/** Display owner-reported physical custody or legacy captivity. Actions stay
 * typed owner commands; rendering never assigns guards, supplies or work. */
export function HearthCaptiveCard({engine}:{engine:Engine}){
 const Q={kind:'captives'} as const,read=useOwnerReadModels(engine,[Q]),list=read(Q).model?.captives??[],fb=useActionFeedback(engine);
 return <CaptiveList captives={list} send={c=>void fb.send(c)} feedback={fb.items}/>;
}
export function CaptiveList({captives,send,feedback}:{captives:Captive[];send:(c:{kind:'free-captives';team:number}|{kind:'repatriate-captive';unitId:number}|{kind:'escort-captive';unitId:number})=>void;feedback:Parameters<typeof FeedbackList>[0]['items']}){
 if(!captives.length)return feedback.length?<FeedbackList items={feedback}/>:null;
 const teams=[...new Map(captives.map(c=>[c.fromTeam,c.fromName])).entries()];
 return <section className="hw-card hw-captives" aria-label="Captives">
  <div className="hw-card-head"><h3>Held captive</h3><span className="hw-chip hw-chip-soft"><Users size={16}/>{captives.length}</span></div>
  <p className="hw-sub">{captives.some(c=>c.custody)?'People in custody need guards, food and water. Release sends them walking home.':'Unguarded people may escape. A guard can watch up to three.'}</p>
  <ul className="hw-captive-list">{captives.map(c=>{const tone=c.resistance>=70?'bad':c.resistance>=40?'mid':'good',modern=c.custody!==undefined;return <li key={c.id}>
   <div className="hw-captive-name"><b>{c.name}</b><span className="hw-sub">from {c.fromName}</span></div>
   <span className={cx('hw-meter',tone)} role="img" aria-label={`${modern?'Escape risk':'Resistance'} ${c.resistance} percent`}><i style={{width:Math.min(100,c.resistance)+'%'}}/></span>
   <span className={cx('hw-chip',c.guarded?'t-good':'t-warn')}><Shield size={16}/>{c.guarded?'Guarded':'Unguarded'}</span>
   {modern&&<span className="hw-chip hw-chip-soft">{c.custody==='escorting'?'Under escort':'In custody'}{typeof c.food==='number'&&` · Food ${Number(c.food.toFixed(1))}`}{typeof c.waterLiters==='number'&&` · Water ${Number(c.waterLiters.toFixed(1))} L`}</span>}
   <span className="hw-captive-acts">{c.canEscort&&<button type="button" className="hw-btn-wide" onClick={()=>send({kind:'escort-captive',unitId:c.id})}><Shield size={18}/>{modern?(c.guarded?'Replace guard':'Assign guard'):'Escort'}</button>}
    <button type="button" className="hw-btn-wide" onClick={()=>send({kind:'repatriate-captive',unitId:c.id})}><Home size={18}/>{modern?'Release to walk home':'Send home'}</button></span></li>;})}</ul>
  {teams.map(([t,n])=><button key={t} type="button" className="hw-btn-wide" onClick={()=>send({kind:'free-captives',team:t})}><Unlock size={18}/>Free everyone from {n}</button>)}
  <FeedbackList items={feedback}/></section>;
}
