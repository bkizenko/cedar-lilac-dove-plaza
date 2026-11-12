import type {ReactNode} from 'react';
import {Scroll,Fingerprint,Landmark,Link2,Unlink,Check,Users,Wheat,TreePine,Mountain,Flag,TriangleAlert,Handshake,MapPin,Gavel,Flame,GraduationCap,Briefcase,History,Heart} from 'lucide-react';
import type {CivicModel,CivicLine} from '@/game/societyCivicRuntime';
import {NEGOTIATION,NEGOTIATION_WARNING,INSTITUTION_RULES,type InstitutionKind} from '@/game/societyCivic';
import {GameTooltip} from '../GameTooltip';
import {cx} from './parts';

/** Terse civic read-out: one fact per chip, the reason on hover. Read-only (no proposal dispatch exists yet). */
const pct=(v:number)=>Math.round(v*100);
export const nice=(s:string)=>{const t=s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ').toLowerCase();return t.charAt(0).toUpperCase()+t.slice(1);};
const STAGE_LABEL:Record<string,string>={quiet:'Quiet',murmurs:'Murmurs',demands:'Demands',talks:'Talks',rupture:'Rupture'};
const INST_ICON:Record<string,(p:any)=>ReactNode>={council:p=><Gavel {...p}/>,ritual:p=><Flame {...p}/>,learning:p=><GraduationCap {...p}/>,administration:p=><Briefcase {...p}/>};
const CHAIN_LABEL:Record<string,string>={surplus:'Surplus',access:'Access',exposure:'Exposure',decisions:'Rivals act'};
const CHAIN_TIP:Record<string,string>={surplus:'Food reserve to spare people',access:'More hearths, neighbours or routes',exposure:'Routes seen by others',decisions:'Neighbours act on their own'};
const TRAITS:Record<string,string>={kinship:'Kin',craft:'Craft',faith:'Faith',hospitality:'Welcome',martial:'Martial'};
const WARD:Record<string,string>={open:'Open',accepted:'Accepted',declined:'Declined',kept:'Kept',broken:'Broken'};
const upkeep=(kind:string,level:number)=>{const y=INSTITUTION_RULES[kind as InstitutionKind]?.yearly;return y?{food:y.food*level,wood:y.wood*level,stone:y.stone*level}:{food:0,wood:0,stone:0};};
const cut=(s:string,n:number)=>s.length>n?s.slice(0,n-1)+'…':s;

function Chip({icon,children,tip,tone,sub}:{icon?:ReactNode;children:ReactNode;tip?:string;tone?:'bad'|'good'|'warn';sub?:boolean}){
 const el=<span className={cx('hw-chip',tone&&'t-'+tone,sub&&'hw-chip-soft')} tabIndex={tip?0:undefined}>{icon}{children}</span>;
 return tip?<GameTooltip title={tip}>{el}</GameTooltip>:el;
}
function Row({label,icon,children}:{label:string;icon:ReactNode;children:ReactNode}){return <div className="hw-chips"><span className="hw-row-label">{icon}{label}</span>{children}</div>;}

function Politics({line}:{line:CivicLine}){
 const p=line.politics,i=NEGOTIATION.indexOf(p.stage);
 return <Row label="Politics" icon={<Landmark size={18}/>}>
  <Chip tip={`Government: ${nice(p.level)}`} icon={<Landmark size={16}/>}>{nice(p.level)}</Chip>
  <span className="hw-steps" role="list" aria-label="Negotiation steps">{NEGOTIATION.map((s,k)=><GameTooltip key={s} title={`${STAGE_LABEL[s]}: ${NEGOTIATION_WARNING[s]}`}><span role="listitem" tabIndex={0} className={cx('hw-chip','hw-step',k<i&&'is-past',k===i&&'is-now',k===i&&i>=2&&'t-bad',k===i+1&&i>=1&&'t-warn')} aria-current={k===i?'step':undefined}>{STAGE_LABEL[s]}</span></GameTooltip>)}</span>
  {p.factions>0&&<Chip sub icon={<Users size={16}/>} tip="Factions pressing">{p.factions}</Chip>}
  {p.why.map(w=><Chip key={w} sub tip={w}>{cut(w,18)}</Chip>)}
 </Row>;
}
function Institutions({line}:{line:CivicLine}){
 if(!line.institutions.length)return null;
 return <Row label="Institutions" icon={<Gavel size={18}/>}>{line.institutions.map(i=>{
  const I=INST_ICON[i.kind]??(p=><Gavel {...p}/>),u=upkeep(i.kind,i.level);
  return <Chip key={i.kind} tone={i.lapsed?'bad':undefined} icon={I({size:16})} tip={`${nice(i.kind)} ${i.level}${i.lapsed?' · lapsed':''}: ${i.note}`}>{nice(i.kind)}{i.level>1?` ${i.level}`:''}
   {u.food>0&&<small><Wheat size={13}/>{u.food}</small>}{u.wood>0&&<small><TreePine size={13}/>{u.wood}</small>}{u.stone>0&&<small><Mountain size={13}/>{u.stone}</small>}{i.lapsed&&<small>lapsed</small>}</Chip>;})}</Row>;
}
function Identity({line}:{line:CivicLine}){
 const id=line.identity,top=Object.entries(id.traits).sort((a,b)=>b[1]-a[1]).slice(0,3);
 return <Row label="People" icon={<Fingerprint size={18}/>}>
  <Chip icon={<Heart size={16}/>} tip={`Continuity ${pct(id.continuity)}%: how much of the old ways remain`} tone={id.continuity<.4?'bad':id.continuity>.7?'good':undefined}>{pct(id.continuity)}%</Chip>
  <Chip icon={<Flag size={16}/>} tip={`Pride ${pct(id.pride)}%`}>{pct(id.pride)}%</Chip>
  <Chip icon={<Users size={16}/>} tip={`${id.native} native · ${id.adopted} adopted`}>{id.native}+{id.adopted}</Chip>
  {top.map(([k,v])=><Chip key={k} sub tip={`${TRAITS[k]??k}: ${pct(v)}%`}>{TRAITS[k]??nice(k)} {pct(v)}</Chip>)}
  {id.last&&<Chip sub icon={<History size={16}/>} tip={id.last}>{cut(id.last,26)}</Chip>}
 </Row>;
}
function Proposals({line}:{line:CivicLine}){
 if(!line.proposals.length)return null;
 return <Row label="Proposals" icon={<Scroll size={18}/>}>{line.proposals.map((p,i)=><Chip key={i} tone={p.status==='broken'||p.status==='declined'?'bad':p.status==='kept'||p.status==='accepted'?'good':undefined} tip={`${p.title}${p.inherited?' (from the last ruler)':''}`} icon={p.kind==='agreement'?<Handshake size={16}/>:<Scroll size={16}/>}>{cut(p.title,24)}<small>{WARD[p.status]??p.status}</small></Chip>)}</Row>;
}
function Outposts({line}:{line:CivicLine}){
 if(!line.outposts.length)return null;
 return <Row label="Outposts" icon={<MapPin size={18}/>}>{line.outposts.map(o=>{const g=o.grievance;return <Chip key={o.hall} tone={g>=.6?'bad':g>=.3?'warn':undefined} tip={`Hall ${o.hall}: ${o.distance} m away, decides ${pct(o.localDecisionShare)}% locally, keeps ${o.localFloorFood} food${o.lastRequest?`, last request ${o.lastRequest.obeyed?'obeyed':'refused'}`:''}`} icon={<MapPin size={16}/>}>{o.distance}m<small>{pct(o.localDecisionShare)}%</small><small>{pct(g)}% sore</small></Chip>;})}</Row>;
}
export function CivicLineCard({line,title}:{line:CivicLine;title?:string}){
 return <section className="hw-card hw-civic"><div className="hw-card-head"><h3>{title??line.name}</h3></div>
  <Identity line={line}/><Politics line={line}/><Institutions line={line}/><Proposals line={line}/><Outposts line={line}/>
 </section>;
}
export function ChapterCard({chapter}:{chapter:NonNullable<CivicModel['chapter']>}){
 return <section className="hw-card"><div className="hw-card-head"><h3>Chapter</h3>{chapter.complete&&<Chip tone="good" icon={<Check size={16}/>}>Complete</Chip>}</div>
  <div className="hw-chips hw-chain">{chapter.links.map((l,k)=><span key={l.id} className="hw-chain-link">{k>0&&<Link2 size={16} aria-hidden/>}<Chip tone={l.met?'good':l.id===chapter.broken?'bad':undefined} icon={l.met?<Check size={16}/>:<Unlink size={16}/>} tip={`${CHAIN_TIP[l.id]}: ${l.evidence}`}>{CHAIN_LABEL[l.id]??nice(l.id)}</Chip></span>)}</div>
  {chapter.broken&&<div className="hw-chips"><span className="hw-row-label"><TriangleAlert size={18}/>Next</span><Chip tone="bad" tip={chapter.links.find(l=>l.id===chapter.broken)?.evidence}>{CHAIN_LABEL[chapter.broken]}</Chip></div>}
 </section>;
}
export function CivicPanel({civic}:{civic:CivicModel}){
 if(!civic.enabled)return <p className="hw-empty">Nothing recorded yet.</p>;
 const lines=civic.prehistory?.lines??[];
 return <div className="hw-grid-2">
  {civic.own&&<CivicLineCard line={civic.own} title="Our people"/>}
  {civic.chapter&&<ChapterCard chapter={civic.chapter}/>}
  {lines.length>0&&<section className="hw-card"><div className="hw-card-head"><h3>Before the game</h3></div><ul className="hw-chips">{lines.map((l,i)=><li key={i}><Chip sub icon={<History size={16}/>} tip={l}>{cut(l,46)}</Chip></li>)}</ul></section>}
  {civic.societies.map(s=><CivicLineCard key={s.team} line={s}/>)}
 </div>;
}
