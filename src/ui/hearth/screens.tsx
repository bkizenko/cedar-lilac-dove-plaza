import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X,Crown,Users,Heart,Handshake,Shield,BookOpen,Settings,Swords,Route,Skull,TriangleAlert,Target,Clock,Eye,Home,Scroll,Scale,Hammer,Wheat,Package,Landmark,Check} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {HudSnapshot} from '@/game/types';
import {AGES,BUILDINGS,BUILD_ORDER} from '@/game/constants';
import {YEAR_SECONDS} from '@/game/settlement';
import {DIFFICULTIES,difficultyEffects} from '@/game/difficulty';
import {foodExperienceReport} from '@/game/foodExperience';
import {STAGES} from '@/game/breakaways';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {useActionFeedback,FeedbackList} from '../council/useActionFeedback';
import {CivicPanel} from './civicPanel';
import {HearthCaptiveCard,HearthCapitulationTerms,HandoverCard,RulerPortrait,FameFeed,FactionsCard,RenownCard} from './councilCards';
const nice=(s:string)=>{const t=s.replace(/([a-z])([A-Z])/g,"$1 $2").toLowerCase();return t.charAt(0).toUpperCase()+t.slice(1);};
import {FACTION_LABEL,lawLabel,loyaltyWord} from '../council/CouncilParts';
import {SocietyFlag} from '../SocietyFlag';
import {GameTooltip} from '../GameTooltip';
import {GameDisclosure} from '../GameDisclosure';
import {FoodStoreReadout} from '../FoodStoreReadout';
import {PrestigeReadout} from '../PrestigeReadout';
import {NeedsPanel} from '../NeedsPanel';
import {WorkloadPanel} from '../WorkloadPanel';
import {FarmingProgress} from '../FarmingProgress';
import {CraftingAndBuildings} from '../CraftingAndBuildings';
import {NomadicCampControl} from '../NomadicCampControl';
import {SocietyIdentityEditor} from '../SocietyIdentityEditor';
import {KnowledgePanel} from '../KnowledgePanel';
import {AgeReadiness} from '../AgeReadiness';
import {PerformanceReadout} from '../PerformanceReadout';
import {VillageSaveButton} from '../VillageSaveButton';
import {SaveStatus} from './SaveStatus';
import {VillageFileTransfer} from '../VillageFileTransfer';
import {WaterEngineeringControls} from '../WaterEngineeringControls';
import {WorldSetup} from '../WorldSetup';
import {UiThemeToggle} from '../uiTheme';
import {TradeBlock} from '../Hud';
import {IconBtn,cx} from './parts';
import {loadMapStyle,rememberMapStyle,MAP_STYLE_KEY,type MapStyle} from '@/scene/mapStyle';
import {PLAN_ICON,PLAN_NAME,POSTURE_ICON,POSTURE_NAME,AGREEMENT_ICON,AGREEMENT_NAME,ROUTE_ICON,ago,freshness} from './icons';

/** Full-height screen: one title, tabs, one close. Esc closes; focus moves in and returns. */
export function Screen({title,icon,onClose,tabs,tab,setTab,children,wide}:{title:string;icon:ReactNode;onClose:()=>void;tabs?:{id:string;label:string;icon?:ReactNode;badge?:number}[];tab?:string;setTab?:(t:string)=>void;children:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const prev=document.activeElement as HTMLElement|null;ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();onClose();}
   if(e.key!=='Tab'||!ref.current)return;const f=Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]')).filter(n=>n.getClientRects().length);
   if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}};
  window.addEventListener('keydown',key,true);return()=>{window.removeEventListener('keydown',key,true);prev?.focus();};
 },[onClose]);
 return <div className="hw-scrim" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div ref={ref} className={cx('hw-screen',wide&&'is-wide')} role="dialog" aria-modal="true" aria-label={title}>
   <header className="hw-screen-head"><span className="hw-medal">{icon}</span><h1>{title}</h1><IconBtn label="Close" tip="Esc" onClick={onClose} className="hw-close"><X size={26}/></IconBtn></header>
   {tabs&&<div className="hw-tabs hw-screen-tabs" role="tablist">{tabs.map(t=><button key={t.id} role="tab" type="button" aria-selected={tab===t.id} data-autofocus={tab===t.id?'':undefined} onClick={()=>setTab?.(t.id)}>{t.icon}<span>{t.label}</span>{!!t.badge&&<i className="hw-badge">{t.badge}</i>}</button>)}</div>}
   <div className="hw-screen-body">{children}</div>
  </div></div>;
}

/* ---------- council ---------- */
const bar=(v:number,cls='')=><span className={cx('hw-meter',cls)}><i style={{width:Math.max(0,Math.min(100,v))+'%'}}/></span>;
const tone=(n:number)=>n<35?'bad':n>65?'good':'mid';
function Fresh({seconds,label,icon}:{seconds:number|null;label:string;icon:ReactNode}){
 const f=freshness(seconds);
 return <GameTooltip title={label} description={seconds===null?'Never seen':`Last report ${ago(seconds)} ago`}><span className={cx('hw-chip','f-'+f)} tabIndex={0} aria-label={`${label}: ${seconds===null?'never':ago(seconds)+' ago'}`}>{icon}{ago(seconds)}</span></GameTooltip>;
}
const FORM_NAME:Record<string,string>={bigMan:'Big-man',chiefly:'Chiefdom',monarchy:'Monarchy',oligarchy:'Oligarchy',republic:'Republic',theocracy:'Theocracy'};
const STAGE_NAME:Record<string,string>={loyal:'Loyal',restive:'Restive',autonomous:'Autonomous',breakaway:'Breakaway'};
function StageMeter({stage,label}:{stage:string;label:string}){
 const i=STAGES.indexOf(stage as never);
 return <GameTooltip title={`${label}: ${STAGE_NAME[stage]}`}><span className={cx('hw-stages','s-'+stage)} role="img" aria-label={`${label}: ${STAGE_NAME[stage]}`}>{STAGES.map((s,k)=><i key={s} className={k<=i?'on':''}/>)}</span></GameTooltip>;
}
const CASUS_NAME:Record<string,string>={claim:'a land claim',tribute:'unpaid tribute',holy:'a sacred grievance',reconquest:'lost lands',defence:'a defence wrong',raid:'raid grudge',succession:'a disputed succession',liberation:'kin held captive'};
function NeighbourCard({n,soc,route,send}:{n:any;soc?:any;route?:any;send:(team:number,kind:'marry-houses'|'foster-houses'|'exchange-hostages')=>void}){
 const mood=n.hostile?['At odds','bad']:n.atPeace?['At peace','good']:n.trust>=60?['Friendly','good']:n.trust>=25?['Cordial','']:['Reserved',''];
 const PI=soc?.plan?PLAN_ICON[soc.plan.kind]:null,PO=soc?.posture?POSTURE_ICON[soc.posture.kind]:null;
 return <li className="hw-card hw-neighbour">
  <div className="hw-card-head">{n.identity&&<SocietyFlag identity={n.identity} label={`${n.name} flag`}/>}<h3>{n.name}</h3><span className={cx('hw-chip','t-'+mood[1])}>{mood[0]}</span></div>
  <div className="hw-meters"><GameTooltip title="Trust"><span className="hw-meter-row"><Handshake size={20}/>{bar(n.trust,'good')}<b>{n.trust}</b></span></GameTooltip><GameTooltip title="Grudge"><span className="hw-meter-row"><Swords size={20}/>{bar(n.grievance??0,'bad')}<b>{n.grievance??0}</b></span></GameTooltip></div>
  {soc&&<div className="hw-chips" aria-label={`What ${n.name} is doing`}>
   {soc.plan&&PI&&<GameTooltip title={`Plan: ${PLAN_NAME[soc.plan.kind]}${soc.plan.target?` → ${soc.plan.target}`:''}`} description={soc.plan.why.join(' · ')||undefined}><span className={cx('hw-chip',soc.plan.kind==='raid'&&soc.plan.target==='you'&&'t-bad')} tabIndex={0} aria-label={`Plan ${PLAN_NAME[soc.plan.kind]}${soc.plan.target?` against ${soc.plan.target}`:''}, ends in ${ago(soc.plan.endsInSeconds)}`}>{PI({size:20})}{PLAN_NAME[soc.plan.kind]}{soc.plan.target&&<em>→ {soc.plan.target}</em>}<small><Clock size={14}/>{ago(soc.plan.endsInSeconds)}</small></span></GameTooltip>}
   {soc.posture&&PO&&<GameTooltip title={`Posture: ${POSTURE_NAME[soc.posture.kind]}`} description={soc.posture.why.join(' · ')||undefined}><span className={cx('hw-chip',soc.posture.kind==='raid'&&'t-bad')} tabIndex={0} aria-label={`Posture ${POSTURE_NAME[soc.posture.kind]}`}>{PO({size:20})}{POSTURE_NAME[soc.posture.kind]}</span></GameTooltip>}
   <Fresh seconds={soc.known.contactAgeSeconds} label="Last contact" icon={<Eye size={18}/>}/>
   {soc.known.sightingAgeSeconds!==null&&<Fresh seconds={soc.known.sightingAgeSeconds} label={`Our sighting: ${soc.known.structures} structures, ${soc.known.defenders} defenders`} icon={<Landmark size={18}/>}/>}
   {soc.theyKnowUs&&<Fresh seconds={soc.theyKnowUs.sightingAgeSeconds} label={`Their picture of us: ${soc.theyKnowUs.structures} structures`} icon={<Target size={18}/>}/>}
   {soc.agreements.map((a:any)=>{const AI=AGREEMENT_ICON[a.kind];return <GameTooltip key={a.kind} title={`${AGREEMENT_NAME[a.kind]} (${a.status})`}><span className={cx('hw-chip',a.status==='strained'&&'t-warn')} tabIndex={0} aria-label={`${AGREEMENT_NAME[a.kind]}, ${a.status}`}>{AI({size:20})}{AGREEMENT_NAME[a.kind]}</span></GameTooltip>;})}
   {soc.breakaways.map((b:any,i:number)=><span key={i} className="hw-chip"><StageMeter stage={b.stage} label="Their outlying hall"/>{b.resolution?<em>{b.resolution}</em>:<small>{b.pressure}%</small>}</span>)}
  </div>}
  {route&&route.mode!=='open'&&<div className="hw-chips"><GameTooltip title={`Route: ${route.reason}`}><span className={cx('hw-chip',route.mode==='blocked'&&'t-bad',route.abandoned&&'t-bad')} tabIndex={0} aria-label={`Route ${route.mode}. ${route.reason}`}>{ROUTE_ICON({size:20})}{route.mode==='agreement'?'Passage agreed':route.mode==='escort'?`Escort ×${route.guards||2}`:'Blocked'}{route.expiresIn!==undefined&&<small><Clock size={14}/>{ago(route.expiresIn)}</small>}</span></GameTooltip></div>}
  {n.means.length>0&&<ul className="hw-chips">{n.means.map((x:string)=><li key={x} className="hw-chip hw-chip-soft">{x}</li>)}</ul>}
  {!!n.wards?.length&&<ul className="hw-chips">{n.wards.map((w:any)=><li key={w.name+w.sinceYear} className="hw-chip hw-chip-soft" title={w.effect}><Heart size={16}/>{w.name} · {w.kind==='foster'?'fostered':'hostage'} · {w.endsIn?`${w.endsIn}y`:'<1y'}</li>)}</ul>}
  {!!n.casus?.length&&<ul className="hw-chips" aria-label={`Grievances between us and ${n.name}`}>{n.casus.map((k:any,i:number)=><li key={k.kind+i} className={cx('hw-chip',k.byUs?'hw-chip-soft':'t-bad')} title={k.reason}><Swords size={16}/>{k.byUs?'We hold':'They hold'} {CASUS_NAME[k.kind]??k.kind} · {k.endsIn?`${k.endsIn}y`:'<1y'}</li>)}</ul>}
  {n.canMarry&&<div className="hw-row">{([['marry-houses','Marry',<Heart size={22} key="m"/>],['foster-houses','Foster',<Users size={22} key="f"/>],['exchange-hostages','Hostages',<Shield size={22} key="h"/>]] as const).map(([k,l,i])=><button key={k} type="button" className="hw-btn-wide" onClick={()=>send(n.team,k)}>{i}{l}</button>)}</div>}
 </li>;
}
/** Captives remain reachable even when nobody has offered capitulation terms. */
export function councilTermsTab(offers:number,captives:number){
 const count=offers+captives;return count?{id:'terms',label:offers?'Terms':'Captives',icon:<Swords size={20}/>,badge:count}:null;
}
export function CouncilWithoutHouse({onClose,terms,captives}:{onClose:()=>void;terms:ReactNode;captives:ReactNode}){
 return <Screen title="Council" icon={<Crown size={32}/>} onClose={onClose}><p className="hw-empty">No ruling house yet.</p>{terms}{captives}</Screen>;
}
export function CouncilScreen({engine,onClose,initial}:{engine:Engine;onClose:()=>void;initial?:string}){
 const QC={kind:'rulers-council'} as const,QS={kind:'society-decisions'} as const,QB={kind:'combat-doctrine'} as const,QV={kind:'society-civic'} as const,QO={kind:'capitulation-offers'} as const,QP={kind:'captives'} as const;
 const read=useOwnerReadModels(engine,[QC,QS,QB,QV,QO,QP]),c=read(QC).model?.council,s=read(QS).model?.societies,b=read(QB).model?.combat,civic=read(QV).model?.civic;
 const fb=useActionFeedback(engine);
 const [tab,setTab]=useState(initial||'ruler');
 const terms=read(QO).model?.offers??[],captives=read(QP).model?.captives??[],termsTab=councilTermsTab(terms.length,captives.length);
 if(!c)return <Screen title="Council" icon={<Crown size={32}/>} onClose={onClose}><p className="hw-empty">Reading the council…</p></Screen>;
 if(!c.enabled)return <CouncilWithoutHouse onClose={onClose} terms={<HearthCapitulationTerms engine={engine}/>} captives={<HearthCaptiveCard engine={engine}/>}/>;
 const tabs=[{id:'ruler',label:'Ruler',icon:<Crown size={20}/>},{id:'realm',label:'Realm',icon:<Scale size={20}/>},{id:'neighbours',label:'Neighbours',icon:<Handshake size={20}/>,badge:c.neighbours.length||undefined},...(civic?.enabled?[{id:'society',label:'Society',icon:<Landmark size={20}/>,badge:civic.warnings.length||undefined}]:[]),{id:'chronicle',label:'Chronicle',icon:<Scroll size={20}/>},...(termsTab?[termsTab]:[])];
 return <Screen title={c.house?`House ${c.house.name}`:'Council'} icon={<Crown size={32}/>} onClose={onClose} tabs={tabs} tab={tab} setTab={setTab} wide>
  {tab==='ruler'&&<div className="hw-grid-2">
   {c.ruler&&<section className="hw-card hw-ruler"><div className="hw-card-head"><RulerPortrait engine={engine} name={c.ruler.name} fallback={<span className="hw-medal hw-medal-l"><Crown size={40}/></span>}/><div><h2>{c.ruler.name}</h2><p className="hw-sub">Age {c.ruler.age}{c.house?` · generation ${c.house.generation+1}`:''}{c.polity?` · ${FORM_NAME[c.polity.form]??nice(c.polity.form)}`:''}</p></div></div>
    <p className="hw-quote">{c.ruler.headline}{c.ruler.contradiction?`. ${c.ruler.contradiction}`:''}</p>
    {c.ruler.wants.length>0&&<div className="hw-chips"><span className="hw-row-label"><Target size={18}/>Wants</span>{c.ruler.wants.map(w=><span key={w} className="hw-chip">{w}</span>)}</div>}
    <div className="hw-chips"><span className="hw-row-label"><TriangleAlert size={18}/>Fears</span><span className="hw-chip t-warn">{c.ruler.fears}</span></div>
    <div className="hw-chips">{Object.entries(c.ruler.competences).map(([k,v])=><span key={k} className="hw-chip hw-chip-soft">{nice(k)} {v}</span>)}</div>
   </section>}
   {c.handover&&<HandoverCard h={c.handover}/>}
   {c.house&&<section className="hw-card"><div className="hw-card-head"><h3>House</h3></div><ul className="hw-chips">{c.house.family.map(p=><li key={p.name+p.age} className="hw-chip hw-chip-soft"><Users size={16}/>{p.name} · {p.role} · {p.age}</li>)}</ul></section>}
  </div>}
  {tab==='realm'&&<div className="hw-grid-2">
   {c.showFactions&&c.factions.length>0&&<FactionsCard factions={c.factions} coalitionLoss={c.coalitionLoss}/>}
   <RenownCard glory={c.glory} score={c.gloryScore}/>
   {c.expansion&&<section className="hw-card"><div className="hw-card-head"><h3>Expansion</h3><span className="hw-chip">{nice(c.expansion.mode)}</span></div>{c.expansion.why.length>0&&<ul className="hw-chips">{c.expansion.why.map(w=><li key={w} className="hw-chip hw-chip-soft">{w}</li>)}</ul>}</section>}
   {(s?.own.length||0)>0&&<section className="hw-card"><div className="hw-card-head"><h3>Our outlying halls</h3></div><ul className="hw-chips">{s!.own.map((o,i)=><li key={i} className="hw-chip"><StageMeter stage={o.stage} label="Outlying hall"/>{o.resolution?<em>{o.resolution}</em>:<small>{o.pressure}%</small>}</li>)}</ul></section>}
   {b?.enabled&&b.routes.length>0&&<section className="hw-card"><div className="hw-card-head"><h3>Routes</h3></div><ul className="hw-list">{b.routes.map(r=><li key={r.team}><span className="hw-meter-row"><b className="hw-lbl">{r.name}</b><span className={cx('hw-chip',r.mode==='blocked'&&'t-bad')}>{ROUTE_ICON({size:18})}{r.mode==='open'?'Open':r.mode==='agreement'?'Agreed':r.mode==='escort'?`Escort ×${r.guards||2}`:'Blocked'}</span></span></li>)}</ul></section>}
  </div>}
  {tab==='neighbours'&&<>{c.neighbours.length===0?<p className="hw-empty">No neighbours met yet. Explore to find them.</p>:<ul className="hw-grid-2 hw-plain">{[...c.neighbours].sort((a,b)=>Number(!!b.hostile)-Number(!!a.hostile)||b.trust-a.trust).map(n=><NeighbourCard key={n.team} n={n} soc={s?.societies.find(x=>x.team===n.team)} route={b?.routes.find(r=>r.team===n.team)} send={(t,k)=>void fb.send({kind:k,team:t})}/>)}</ul>}<FeedbackList items={fb.items}/></>}
  {tab==='society'&&civic&&<CivicPanel civic={civic}/>}
  {tab==='chronicle'&&<FameFeed log={c.log}/>}
  {tab==='terms'&&<><HearthCapitulationTerms engine={engine}/><HearthCaptiveCard engine={engine}/></>}
 </Screen>;
}

/* ---------- village ---------- */
export function VillageScreen({hud,engine,onClose,initial,onKnowledge,onOffer}:{hud:HudSnapshot;engine:Engine;onClose:()=>void;initial?:string;onKnowledge:()=>void;onOffer:(t:number)=>void}){
 const [tab,setTab]=useState(initial||'stores');
 const tabs=[{id:'stores',label:'Stores',icon:<Package size={20}/>},{id:'work',label:'Work',icon:<Hammer size={20}/>},{id:'food',label:'Food',icon:<Wheat size={20}/>},{id:'craft',label:'Craft',icon:<Hammer size={20}/>},{id:'camp',label:'Camp',icon:<Home size={20}/>},...(hud.trade?[{id:'trade',label:'Trade',icon:<Handshake size={20}/>}]:[]),{id:'history',label:'History',icon:<Scroll size={20}/>}];
 const history=(engine.game.state.lifeHistory??[]).filter(e=>e.team===0).slice().reverse();
 return <Screen title="Village" icon={<Users size={32}/>} onClose={onClose} tabs={tabs} tab={tab} setTab={setTab} wide>
  <div className="hw-legacy">
   {tab==='stores'&&<><FoodStoreReadout stock={hud} items={engine.game.tribe(0).items} experience={foodExperienceReport(engine.game.tribe(0),engine.game.state.time)}/>{(hud.age>=1||hud.copper>0||hud.iron>0)&&<p>Copper {hud.copper} · Iron {hud.iron}</p>}<NeedsPanel engine={engine} expanded/></>}
   {tab==='work'&&<WorkloadPanel engine={engine}/>}
   {tab==='food'&&<FarmingProgress engine={engine} onKnowledge={onKnowledge}/>}
   {tab==='craft'&&<CraftingAndBuildings engine={engine}/>}
   {tab==='camp'&&<><NomadicCampControl engine={engine}/><SocietyIdentityEditor engine={engine}/><PrestigeReadout view={hud.prestigeBreakdown} rivals={hud.prestigeRivals}/></>}
   {tab==='trade'&&<TradeBlock hud={hud} engine={engine} onOffer={onOffer}/>}
   {tab==='history'&&(history.length===0?<p className="hw-empty">Nothing recorded yet.</p>:<ol className="hw-chron">{history.map((e,i)=><li key={i}><b>Y{Math.floor(e.time/YEAR_SECONDS)+1}</b> {e.text.replace(/^\[Contact \d+\] /,'')}</li>)}</ol>)}
  </div>
 </Screen>;
}

/* ---------- ages ---------- */
export function AgesScreen({hud,engine,onClose}:{hud:HudSnapshot;engine:Engine|null;onClose:()=>void}){
 const next=AGES[hud.age+1];
 return <Screen title="Ages" icon={<BookOpen size={32}/>} onClose={onClose} wide>
  <section className="hw-card hw-age-hero"><div className="hw-age-steps" role="list">{AGES.map((a,i)=><span key={a} role="listitem" className={cx('hw-age-step',i<hud.age&&'done',i===hud.age&&'now')} aria-current={i===hud.age?'step':undefined}>{i<hud.age?<Check size={18}/>:<i/>}<b>{a}</b></span>)}</div>
   <div className="hw-card-head"><h2>{AGES[hud.age]}</h2>{next&&<button type="button" className="hw-primary" disabled={!hud.canAge||!!hud.ended} onClick={()=>{engine?.ageUp();onClose();}}><BookOpen size={22}/>{hud.canAge?`Advance to ${next}`:`${next} not ready`}</button>}</div>
   {hud.ageIssue&&<p className="hw-sub t-warn"><TriangleAlert size={18}/> {hud.ageIssue}</p>}
  </section>
  <div className="hw-legacy"><AgeReadiness hud={hud} engine={engine} onAdvance={onClose}/>{engine&&<KnowledgePanel engine={engine} expanded onChooseSite={onClose}/>}
   <GameDisclosure label="Buildings by age"><div className="hw-grid-3">{AGES.map((name,age)=><div key={name} className={cx('hw-card',age===hud.age&&'is-now',age>hud.age&&'is-later')}><h4>{name}</h4><ul>{BUILD_ORDER.filter(t=>BUILDINGS[t].age===age).map(t=><li key={t}><button type="button" disabled={age!==hud.age||!!hud.ended} onClick={()=>{engine?.setPlacing(t);onClose();}}>{BUILDINGS[t].name}</button></li>)}</ul></div>)}</div></GameDisclosure></div>
 </Screen>;
}

/* ---------- menu ---------- */
function AudioSliders({engine}:{engine:Engine|null}){
 const [,bump]=useState(0);const st=engine?.audio.settings;if(!engine||!st)return null;
 return <>{(['master','music','sfx','ambience'] as const).map(b=><label key={b}>{b==='sfx'?'Effects':b[0].toUpperCase()+b.slice(1)}<input type="range" min={0} max={100} value={Math.round(st[b]*100)} aria-label={b+' volume'} onChange={e=>{engine.audio.setVolume(b,+e.target.value/100);bump(n=>n+1);}}/></label>)}</>;
}
/** Map look switch. Terrain is built once, so the choice is remembered and applies after a reload. */
function MapStyleToggle({engine}:{engine:Engine|null}){
 const live:MapStyle=engine?.view.getMapStyle?.()??loadMapStyle();
 const [pick,setPick]=useState<MapStyle>(()=>{try{return (localStorage.getItem(MAP_STYLE_KEY) as MapStyle|null)??live;}catch{return live;}});
 const pending=pick!==live;
 const go=(m:MapStyle)=>{rememberMapStyle(m);setPick(m);};
 const reload=()=>{try{const u=new URL(location.href);u.searchParams.delete('map');location.replace(u.toString());}catch{location.reload();}};
 return <div className="hw-row hw-map-style" role="group" aria-label="Map style"><span className="hw-row-label"><Route size={18}/>Map</span>
  {([['painterly','Painterly'],['classic','Classic']] as const).map(([m,l])=><button key={m} type="button" className="hw-btn-wide" aria-pressed={pick===m} onClick={()=>go(m)}>{l}</button>)}
  {pending&&<button type="button" className="hw-chip t-warn" onClick={reload} title="Save first. The map is rebuilt on reload."><TriangleAlert size={16}/>Reload to apply</button>}</div>;
}
export function MenuScreen({hud,engine,onClose,lifecycle,onTest,onHide,onTrade}:{hud:HudSnapshot;engine:Engine|null;onClose:()=>void;lifecycle:{busy:boolean;error?:string|null;run:(f:()=>Promise<unknown>,after?:(r:any)=>void)=>unknown};onTest:()=>void;onHide:()=>void;onTrade?:()=>void}){
 const d=engine?.game.state.difficulty??'normal';
 const [tab,setTab]=useState('play');
 const tabs=[{id:'play',label:'Game',icon:<Settings size={20}/>},{id:'world',label:'World',icon:<Route size={20}/>},{id:'tools',label:'Tools',icon:<Hammer size={20}/>}];
 return <Screen title="Menu" icon={<Settings size={32}/>} onClose={onClose} tabs={tabs} tab={tab} setTab={setTab}>
  {tab==='play'&&<div className="hw-stack">
   <section className="hw-card"><h3>Interface</h3><div className="hw-legacy hw-ui-switch"><UiThemeToggle/></div><MapStyleToggle engine={engine}/></section>
   <section className="hw-card"><h3>Save</h3><div className="hw-legacy hw-row"><VillageSaveButton engine={engine}/><button type="button" disabled={!engine||lifecycle.busy} onClick={()=>void lifecycle.run(()=>engine!.resumeSaved())}>Load</button><button type="button" disabled={!engine||lifecycle.busy||engine.game.testMode} title="Restore the last protected village; save the current run first." onClick={()=>void lifecycle.run(()=>engine!.resumeSaved(true))}>Restore checkpoint</button></div><div className="hw-legacy"><VillageFileTransfer engine={engine}/></div>{lifecycle.error&&<p role="status" className="t-bad">{lifecycle.error}</p>}<SaveStatus engine={engine} refresh={lifecycle.busy?0:1}/></section>
   <section className="hw-card"><h3>Display</h3><div className="hw-form">
    <label>Graphics<select aria-label="Graphics quality" value={hud.quality} onChange={e=>{engine?.setQuality(e.target.value as 'low'|'med'|'high');engine?.pushHud();}}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select></label>
    <label>World style<select aria-label="World visual style" value={engine?.view.getStyle()??'village'} onChange={e=>{engine?.setRenderStyle(e.target.value as 'current'|'optionH'|'village');engine?.pushHud();}}><option value="village">Village (new buildings)</option><option value="optionH">Carved honey (legacy)</option><option value="current">Original blocks (legacy)</option></select></label>
    <label className="hw-check"><input type="checkbox" checked={!!engine?.view.shadowsEnabled} onChange={e=>{if(engine){engine.view.shadowsEnabled=e.target.checked;engine.setQuality(engine.game.quality);engine.pushHud();}}}/>Shadows</label>
    <label className="hw-check"><input type="checkbox" checked={!!engine?.view.unitRingsEnabled} onChange={e=>{if(engine){engine.view.unitRingsEnabled=e.target.checked;engine.pushHud();}}}/>Selection rings</label>
    <label className="hw-check"><input type="checkbox" checked={!hud.muted} onChange={()=>engine?.toggleMute()}/>Sound</label>
    <AudioSliders engine={engine}/></div>
    <div className="hw-row"><button type="button" className="hw-btn-wide" onClick={()=>{engine?.audio.score.skip();engine?.pushHud();}}>Skip music</button><button type="button" className="hw-btn-wide" onClick={()=>{if(engine){engine.keyboard.help=true;engine.pushHud();}onClose();}}>Controls · H</button><button type="button" className="hw-btn-wide" onClick={()=>{if(engine){engine.keyboard.ledger=true;engine.pushHud();}onClose();}}>Ledger · L</button></div></section>
  </div>}
  {tab==='world'&&<div className="hw-stack">
   <section className="hw-card"><h3>This world</h3><div className="hw-chips"><span className="hw-chip">Seed {engine?.game.state.seed}</span><span className="hw-chip">Gen {engine?.game.state.worldgenVersion??1}</span><GameTooltip title={DIFFICULTIES[d].name} description={`${DIFFICULTIES[d].description} ${difficultyEffects(d)}`}><span className="hw-chip" tabIndex={0}>{DIFFICULTIES[d].name}</span></GameTooltip></div>{engine&&<div className="hw-legacy"><PerformanceReadout engine={engine}/></div>}</section>
   {engine&&<section className="hw-card"><h3>New world</h3><div className="hw-legacy"><WorldSetup engine={engine}/></div></section>}
   {engine&&<section className="hw-card"><h3>Water works</h3><div className="hw-legacy"><WaterEngineeringControls engine={engine}/></div></section>}
  </div>}
  {tab==='tools'&&<div className="hw-stack"><section className="hw-card"><div className="hw-row">
   <button type="button" className="hw-btn-wide" disabled={!engine||lifecycle.busy} onClick={()=>void lifecycle.run(()=>engine!.startTestSession(),(o:unknown)=>{if(o){onClose();onTest();}})}>Test lab</button>
   <button type="button" className="hw-btn-wide" onClick={()=>{onClose();onHide();}}>Hide interface</button>
   <button type="button" className="hw-btn-wide" onClick={()=>{engine?.game.planReturnCrossing();engine?.pushHud();}} title="Plan a bridge on explored banks for cut-off residents">Return crossing</button>
   <button type="button" className="hw-btn-wide" onClick={()=>void lifecycle.run(()=>engine!.restart())}>Restart</button></div></section></div>}
 </Screen>;
}
