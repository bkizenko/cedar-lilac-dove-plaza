import type {ReactNode} from 'react';
import {Crown,Skull,Users,Swords,TriangleAlert,Scroll,Hourglass} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {CouncilModel} from '@/game/rulersView';
import {societyIdentity} from '@/game/societyIdentity';
import {LeaderPortrait} from '../h/LeaderPortrait';
import {GameTooltip} from '../GameTooltip';
import {lawLabel} from '../council/CouncilParts';

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
export function HandoverCard({h}:{h:Handover}){
 const urgent=h.yearlyRisk>=10||h.rulerAge>=55,p=h.pressure,contested=h.heir&&!h.heir.legit;
 const stage=p&&p.stage&&p.stage!=='calm'&&p.stage!=='none'?p.stage:null;
 return <section className={cx('hw-card hw-handover',(urgent||contested||!!stage)&&'is-watch')} aria-label="Handover">
  <div className="hw-card-head"><h3>Successor</h3>
   <GameTooltip title="Chance the seat passes within a year" description={`Ruler aged ${h.rulerAge}. ${lawLabel(h.law)}.`}>
    <span className={cx('hw-chip',urgent&&'t-warn')} tabIndex={0} aria-label={`About ${h.yearlyRisk} percent a year the seat passes`}><Hourglass size={18}/>{h.yearlyRisk}%/y</span>
   </GameTooltip></div>
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
 const items=[...log].reverse().map(l=>l.replace(/^\d+:\s*/,''));
 if(!items.length)return <p className="hw-empty">Nothing has happened to the house yet.</p>;
 return <ol className="hw-fame" aria-label="Chronicle">{items.map((l,i)=><li key={i} className={cx(i===0&&'is-new',i>4&&'is-old')}>{i===0&&<Scroll size={20}/>}<span>{l}</span></li>)}</ol>;
}
