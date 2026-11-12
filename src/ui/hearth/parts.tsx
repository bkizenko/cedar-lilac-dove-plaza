import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {X,Pause,Play,FastForward,Sun,Moon,Menu as MenuIcon,Hammer,Repeat,BookOpen,Crown,Home,Users,Heart,Swords,Package,Droplets,Snowflake,ClipboardList,Compass,Hand,Sword,Skull,Flame,Shield,Check,Info,Wheat,Axe,Recycle,ChevronLeft,ChevronRight,Map as MapIcon,Bell,TriangleAlert,Footprints} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {HudSnapshot} from '@/game/types';
import {BUILDINGS} from '@/game/constants';
import {YEAR_SECONDS} from '@/game/settlement';
import {SURVIVAL_RULES} from '@/game/survivalNeeds';
import {exposedHarvestUnits} from '@/game/production';
import {harvestBacklogAlert} from '@/game/cerealProcessing';
import {measureVillageWorkload} from '@/game/villageWorkload';
import {readyFoodStock} from '../FoodStoreReadout';
import {GameTooltip} from '../GameTooltip';
import {SocietyFlag} from '../SocietyFlag';
import {WorldMinimap} from '../WorldMinimap';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {RulerEventToast} from '../RulerEventToast';
import {WorkDeliveryCue} from '../WorkDeliveryCue';
import {SeasonReport} from '../SeasonReport';
import {housingAdoptionIssue,HOUSING_RULES} from '../../game/housing';
import {buildingHelp} from '../buildingHelp';
import {shortName,SelectionDetails,resWord} from '../Hud';
import {RES_ICON,RES_NAME,bldIcon,PLAN_ICON,PLAN_NAME,POSTURE_ICON,POSTURE_NAME,FORMATION_ICON,ago,freshness} from './icons';

export const cx=(...a:(string|false|null|undefined)[])=>a.filter(Boolean).join(' ');

/** Round or square icon button, 44px minimum hit area; label is always available to assistive tech and hover. */
export function IconBtn({label,tip,onClick,active,children,className,disabled,small}:{label:string;tip?:string;onClick:()=>void;active?:boolean;children:ReactNode;className?:string;disabled?:boolean;small?:boolean}){
 return <GameTooltip title={label} description={tip}><button type="button" className={cx('hw-btn',small&&'hw-btn-s',active&&'is-on',className)} aria-label={label} aria-pressed={active===undefined?undefined:active} disabled={disabled} onClick={onClick}>{children}</button></GameTooltip>;
}
/** Icon + number pill. */
export function Stat({icon,value,label,tone,className}:{icon:ReactNode;value:ReactNode;label:string;tone?:'bad'|'good'|'warn';className?:string}){
 return <GameTooltip title={label}><span className={cx('hw-stat',tone&&'t-'+tone,className)} role="img" aria-label={`${label} ${typeof value==='string'||typeof value==='number'?value:''}`}>{icon}<b>{value}</b></span></GameTooltip>;
}

/* ---------- top bar ---------- */
export function ResourceBar({hud,engine,onOpen}:{hud:HudSnapshot;engine:Engine|null;onOpen:(s:'council'|'stores')=>void}){
 const water=Math.floor(engine?.game.tribe(0).survival?.waterLiters||0);
 const food=Math.floor(readyFoodStock(hud));
 const rows:{k:keyof typeof RES_ICON;v:string|number;tip:string;bad?:boolean}[]=[
  {k:'food',v:food,tip:'Food ready to eat. Raw supplies are in Village, Stores.',bad:food<20},
  {k:'wood',v:hud.wood,tip:'Logs in stores.'},
  {k:'stone',v:hud.stone,tip:'Stone in stores.'},
  {k:'water',v:`${water}`,tip:`${water} litres of collected water.`,bad:water<10},
  {k:'people',v:`${hud.pop}/${hud.popCap}`,tip:`${hud.pop} people, housing for ${hud.popCap}.`},
  ...(hud.age>=1||hud.copper>0?[{k:'copper' as const,v:hud.copper,tip:'Copper in stores.'}]:[]),
  ...(hud.age>=2||hud.iron>0?[{k:'iron' as const,v:hud.iron,tip:'Iron in stores.'}]:[]),
 ];
 return <div className="hw-top-left">
  {engine&&<button type="button" className="hw-flag" aria-label={`Council of ${engine.game.tribe(0).name}`} onClick={()=>onOpen('council')}><SocietyFlag game={engine.game} team={0}/><span>{engine.game.tribe(0).name}</span></button>}
  <ul className="hw-res" aria-label="Village stores">{rows.map(r=>{const I=RES_ICON[r.k];return <li key={r.k}><GameTooltip title={RES_NAME[r.k]} description={r.tip}><button type="button" className={cx('hw-res-cell',r.bad&&'t-bad')} aria-label={`${RES_NAME[r.k]} ${r.v}`} onClick={()=>onOpen('stores')}><I size={28}/><b>{r.v}</b></button></GameTooltip></li>;})}</ul>
 </div>;
}
export function TimeCard({hud,engine,onAges,onMenu}:{hud:HudSnapshot;engine:Engine|null;onAges:()=>void;onMenu:()=>void}){
 const bits=hud.weather.split(' · '),temp=bits[1]||'',speed=hud.speed>=3?4:hud.speed===2?2:1;
 return <div className="hw-top-right">
  <div className="hw-time" role="group" aria-label="Time">
   <span className="hw-time-icon">{hud.night?<Moon size={28}/>:<Sun size={28}/>}</span>
   <div className="hw-time-text"><b>{hud.clock}</b><span>{hud.season} · Y{Math.floor(hud.time/YEAR_SECONDS)+1}{temp?` · ${temp}`:''}</span></div>
   <GameTooltip title={hud.ages[hud.age]+' Age'} description={hud.canAge&&hud.nextAge?`Ready for ${hud.nextAge}`:undefined}><button type="button" className={cx('hw-era',hud.canAge&&'is-ready')} aria-label={`${hud.ages[hud.age]} Age. Open ages`} onClick={onAges}><BookOpen size={20}/><span>{hud.ages[hud.age]}</span></button></GameTooltip>
  </div>
  <div className="hw-speed" role="group" aria-label="Game speed">
   <IconBtn label={hud.paused?'Resume':'Pause'} tip="Space" active={hud.paused} onClick={()=>engine?.setPaused(!hud.paused)}><Pause size={24}/></IconBtn>
   <IconBtn label="Normal speed" active={!hud.paused&&speed===1} onClick={()=>engine?.setSpeed(1)}><Play size={24}/></IconBtn>
   <IconBtn label="Double speed" tip="The day runs twice as fast" active={!hud.paused&&speed===2} onClick={()=>engine?.setSpeed(2)}><FastForward size={24}/></IconBtn>
   <IconBtn label="Four times speed" active={!hud.paused&&speed===4} onClick={()=>engine?.setSpeed(4)}><span className="hw-x4">4×</span></IconBtn>
   <IconBtn label="Menu" onClick={onMenu}><MenuIcon size={26}/></IconBtn>
  </div>
 </div>;
}

/* ---------- left rail ---------- */
export function Rail({hud,engine,workOpen,onWork}:{hud:HudSnapshot;engine:Engine|null;workOpen:boolean;onWork:()=>void}){
 const auto=engine?.game.state.autoWorkEnabled!==false;
 return <nav className="hw-rail" aria-label="Village commands">
  <IconBtn label={auto?'Auto work on':'Auto work off'} tip="Residents follow village priorities. Direct orders and paid work stay protected." active={auto} onClick={()=>{if(engine){engine.game.setAutoWork(!auto);engine.pushHud();}}}><Repeat size={26}/></IconBtn>
  <IconBtn label="Workload" tip="Planned work, capacity, blocked tasks" active={workOpen} onClick={onWork}><ClipboardList size={26}/></IconBtn>
  <IconBtn label="Mark trees" tip="Drag over trees to mark them for felling (N)" active={!!engine?.loggingMode} onClick={()=>engine?.toggleLogging()}><Axe size={26}/></IconBtn>
  <IconBtn label="Recall" tip="Call everyone home (V)" onClick={()=>{engine?.game.soundRecall();engine?.pushHud();}}><Home size={26}/></IconBtn>
  <IconBtn label="Defense horn" tip="Call nearby adults to arms" onClick={()=>{engine?.game.soundDefenseHorn();engine?.pushHud();}}><Shield size={26}/></IconBtn>
  <IconBtn label="Explore" tip="Scout unknown ground until stopped (X)" onClick={()=>engine?.explore()}><Compass size={26}/></IconBtn>
 </nav>;
}

/* ---------- dock ---------- */
export type DockKey='build'|'village'|'ages'|'council'|'map';
export function Dock({active,onPick,onHome,hasMap,alerts}:{active:DockKey|null;onPick:(k:DockKey)=>void;onHome:()=>void;hasMap:boolean;alerts:Partial<Record<DockKey,number>>}){
 const items:{k:DockKey;label:string;icon:ReactNode;tip:string}[]=[
  {k:'build',label:'Build',icon:<Hammer size={30}/>,tip:'Place buildings and fields'},
  {k:'village',label:'Village',icon:<Users size={30}/>,tip:'Stores, work, food, craft, camp (L)'},
  {k:'ages',label:'Ages',icon:<BookOpen size={30}/>,tip:'Knowledge and the next age'},
  {k:'council',label:'Council',icon:<Crown size={30}/>,tip:'Ruler, house, neighbours'},
 ];
 return <nav className="hw-dock" aria-label="Main menu">
  {items.map(i=><GameTooltip key={i.k} title={i.label} description={i.tip}><button type="button" className={cx('hw-dock-btn',active===i.k&&'is-on')} aria-pressed={active===i.k} aria-label={i.label} onClick={()=>onPick(i.k)}>{i.icon}<span>{i.label}</span>{!!alerts[i.k]&&<i className="hw-badge">{alerts[i.k]}</i>}</button></GameTooltip>)}
  <GameTooltip title="Home" description="Centre the view on your village (F)"><button type="button" className="hw-dock-btn" aria-label="Home" onClick={onHome}><Home size={30}/><span>Home</span></button></GameTooltip>
  {hasMap&&<button type="button" className={cx('hw-dock-btn hw-dock-map',active==='map'&&'is-on')} aria-pressed={active==='map'} aria-label="Map" onClick={()=>onPick('map')}><MapIcon size={30}/><span>Map</span></button>}
 </nav>;
}

/* ---------- build tray ---------- */
const CATS=['Village','Food','Industry','Defense'] as const;
const CAT_ICON:Record<string,ReactNode>={Village:<Home size={22}/>,Food:<Wheat size={22}/>,Industry:<Hammer size={22}/>,Defense:<Shield size={22}/>};
const catOf=(t:string)=>['farm','pen','dock','grove','hearth','butcher','threshingFloor','grindingStone','oven','smokehouse'].includes(t)?'Food':['lumber','quarry','workshop','forge','stables','dryrack','tanner','tailor','potter','kiln','fibreWorkshop'].includes(t)?'Industry':['barracks','palisade','gate','stonewall','trench','moat','watchtower','keep'].includes(t)?'Defense':'Village';
const COSTS=[['seeds','seeds'],['wood','wood'],['stone','stone'],['food','food'],['copper','copper'],['iron','iron']] as const;
export function CostChips({cost,have,extra}:{cost:Record<string,number|undefined>;have:Record<string,number>;extra?:{fibre?:number}}){
 return <span className="hw-cost">{COSTS.filter(([k])=>cost[k]).map(([k,icon])=>{const I=RES_ICON[icon as keyof typeof RES_ICON];const short=(have[k]??0)<(cost[k]||0);return <span key={k} className={cx(short&&'t-bad')} title={`${cost[k]} ${RES_NAME[icon]}`}><I size={16}/>{cost[k]}</span>;})}{!!extra?.fibre&&<span title="Plant fibre"><Package size={16}/>{extra.fibre}</span>}</span>;
}
export function BuildTray({hud,engine,tab,setTab,onPick}:{hud:HudSnapshot;engine:Engine|null;tab:string;setTab:(t:string)=>void;onPick:()=>void}){
 const have={seeds:engine?.game.tribe(0).seeds||0,wood:hud.wood,stone:hud.stone,food:hud.food,copper:hud.copper,iron:hud.iron};
 return <section className="hw-tray" aria-label="Build">
  <div className="hw-tabs" role="tablist" aria-label="Building categories">{CATS.map(c=><button key={c} role="tab" type="button" aria-selected={tab===c} onClick={()=>setTab(c)}>{CAT_ICON[c]}<span>{c}</span></button>)}</div>
  <div className="hw-tiles">
   {hud.buildOptions.filter(b=>catOf(b.type)===tab).map(b=>{
    const home=b.type==='house'&&engine?housingAdoptionIssue(engine.game):null;
    const lack=COSTS.some(([k])=>(have[k]??0)<(b.cost[k]||0));
    const costText=COSTS.filter(([k])=>b.cost[k]).map(([k,l])=>`${b.cost[k]} ${RES_NAME[l]}`).join(' · ');
    const name=b.type==='farm'?'Field':shortName(b.name);
    return <GameTooltip key={b.type} title={b.type==='farm'?'Plant field':b.name} description={`${home||buildingHelp(b.type,b.hint)} ${b.type==='house'?`${HOUSING_RULES.plantFibre>0?`${HOUSING_RULES.plantFibre} plant fibre · `:''}${HOUSING_RULES.workSeconds}s actual work + hauling. `:''}${costText}${lack?' Supplies are not ready yet.':''}`}>
     <button type="button" className={cx('hw-tile',hud.placing===b.type&&'is-on',lack&&'is-short')} disabled={!!hud.ended||!!home} aria-label={b.type==='farm'?'Plant field':b.name} onClick={()=>{engine?.setPlacing(b.type);onPick();}}>
      <span className="hw-tile-icon">{bldIcon(b.type,32)}</span><span className="hw-tile-name">{name}</span>
      <CostChips cost={b.cost as Record<string,number|undefined>} have={have} extra={{fibre:b.type==='house'?HOUSING_RULES.plantFibre:0}}/>
     </button></GameTooltip>;})}
   {tab==='Defense'&&hud.trainOptions.filter(u=>u.type!=='worker'&&hud.age>=u.age).map(u=><GameTooltip key={u.type} title={u.name} description="Equip an adult. Needs spare food; one fewer gatherer."><button type="button" className="hw-tile" disabled={!!hud.ended} aria-label={`Equip adult as ${u.name}`} onClick={()=>engine?.train(u.type)}><span className="hw-tile-icon"><Sword size={32}/></span><span className="hw-tile-name">{u.name}</span><CostChips cost={u.cost as Record<string,number|undefined>} have={have}/></button></GameTooltip>)}
  </div>
 </section>;
}

/* ---------- placement ---------- */
export function PlacementCard({hud,engine,extra}:{hud:HudSnapshot;engine:Engine|null;extra?:ReactNode}){
 const p=hud.placing!;
 const hint=hud.founding?'Pick open ground by food and timber':p==='bridge'?'Drag bank to bank · 5–28 m':['palisade','stonewall','trench','moat'].includes(p)?'Drag a line · leave a gap for a gate':['farm','warehouse','pen'].includes(p)?'Drag to size · [ ] width':'Click to place';
 return <section className="hw-place" role="status" aria-label="Placing">
  <span className="hw-tile-icon">{bldIcon(p,32)}</span>
  <div className="hw-place-main"><b>{BUILDINGS[p].name}</b><span>{hint}</span>
   {hud.placeIssue?<span className="hw-issue"><TriangleAlert size={18}/>{hud.placeIssue}</span>:hud.plotSummary?<span className="t-good">{hud.plotSummary}</span>:null}
   {extra}</div>
  <IconBtn label="Cancel placing" tip="Esc" onClick={()=>engine?.setPlacing(null)}><X size={26}/></IconBtn>
 </section>;
}

/* ---------- selection ---------- */
const JOBS:{id:string;label:string;icon:ReactNode;need?:(h:HudSnapshot)=>boolean}[]=[
 {id:'food',label:'Food',icon:<Wheat size={28}/>},{id:'wood',label:'Logs',icon:<RES_ICON.wood size={28}/>},{id:'stone',label:'Stone',icon:<RES_ICON.stone size={28}/>},
 {id:'copper',label:'Copper',icon:<RES_ICON.copper size={28}/>,need:h=>h.age>=1||h.copper>0},{id:'iron',label:'Iron',icon:<RES_ICON.iron size={28}/>,need:h=>h.age>=2},
 {id:'hunt',label:'Hunt',icon:<Footprints size={28}/>},{id:'drill',label:'Drill',icon:<Sword size={28}/>,need:h=>h.age>=1},
 {id:'rest',label:'Rest',icon:<Hand size={28}/>},{id:'auto',label:'Auto',icon:<Play size={28}/>},
];
const JOB_TIP:Record<string,string>={food:'Gather berries and fish',wood:'Cut logs',stone:'Quarry stone',copper:'Gather discovered copper',iron:'Gather iron',hunt:'Hunt deer, boar and goats',drill:'Practise at a barracks: better fighting, less work',rest:'Recover, then resume work',auto:'Release the job lock; follow village priorities'};
function MatchupChip({engine,hud}:{engine:Engine;hud:HudSnapshot}){
 const g=engine.game,mine=g.selectedUnits().find(u=>u.team===0&&u.hp>0&&u.militia);
 const foe=mine?g.state.units.filter(u=>u.team!==0&&u.hp>0&&g.isFoe(0,u.team)).map(u=>({u,d:Math.hypot(u.x-mine.x,u.z-mine.z)})).sort((a,b)=>a.d-b.d)[0]:undefined;
 const q=useMemo(()=>mine&&foe&&foe.d<80?{kind:'combat-matchup' as const,attackerId:mine.id,targetId:foe.u.id}:null,[mine?.id,foe?.u.id,foe&&foe.d<80]);
 const read=useOwnerReadModels(engine,q?[q]:[]),mm=q?read(q).model:undefined,m=mm&&mm.kind==="combat-matchup"?mm:undefined;
 if(!q||!m)return null;
 const tone=m.multiplier>1.02?'t-good':m.multiplier<.98?'t-bad':'';
 return <GameTooltip title={`Against nearest foe ×${m.multiplier.toFixed(2)}`} description={m.reasons.length?m.reasons.join(' · '):'No edge either way'}><span className={cx('hw-chip',tone)} tabIndex={0} aria-label={`Matchup ×${m.multiplier.toFixed(2)}. ${m.reasons.join('. ')}`}><Swords size={18}/>×{m.multiplier.toFixed(2)}</span></GameTooltip>;
}
function MilitaryPanel({hud,engine}:{hud:HudSnapshot;engine:Engine}){
 const Q={kind:'combat-doctrine'} as const;
 const read=useOwnerReadModels(engine,[Q]),c=read(Q).model?.combat;
 const send=(command:Parameters<Engine['dispatch']>[0])=>{void engine.dispatch(command).then(()=>engine.pushHud());};
 const units=engine.game.selectedUnits().filter(u=>u.team===0&&u.hp>0&&u.militia&&!u.prisoner);
 const duty=(id:number)=>c?.duties.find(d=>d.unitId===id)?.kind;
 return <div className="hw-mil">
  <div className="hw-row"><MatchupChip engine={engine} hud={hud}/>
   <IconBtn label={hud.raidName?`Raid ${hud.raidName}`:'Raid a camp'} tip="Move or stop to withdraw" onClick={()=>engine.raidRival()}><Swords size={26}/></IconBtn>
   <IconBtn label="Halt" onClick={()=>engine.halt()}><Hand size={26}/></IconBtn>
   <IconBtn label="Arm adults" tip={`${hud.spears+hud.bows+hud.blades} weapons ready`} onClick={()=>engine.callToArms()}><Sword size={26}/></IconBtn></div>
  {c?.enabled&&c.flags.formations&&<div className="hw-row" role="group" aria-label="Formation"><span className="hw-row-label">Formation</span>
   {c.formations.map(f=>{const I=FORMATION_ICON[f.kind];return <IconBtn key={f.kind} label={f.name} tip={`hit ×${f.offense.toFixed(2)} · pace ×${f.pace.toFixed(2)} · melee taken ×${f.melee.toFixed(2)} · arrows taken ×${f.ranged.toFixed(2)}`} active={c.preferred===f.kind} onClick={()=>send({kind:'set-formation',formation:f.kind})}>{I({size:24})}</IconBtn>;})}</div>}
  {c?.enabled&&c.flags.guardDuty&&units.length>0&&<div className="hw-row" role="group" aria-label="Guard duty"><span className="hw-row-label">Guard</span>
   <IconBtn label="Stand watch here" tip="Armed adults hold this spot" active={units.every(u=>duty(u.id)==='post')} onClick={()=>units.forEach(u=>send({kind:'guard-duty',unitId:u.id,duty:'post'}))}><Shield size={24}/></IconBtn>
   <IconBtn label="Patrol here" tip="Walk a loop around this spot" active={units.every(u=>duty(u.id)==='patrol')} onClick={()=>units.forEach(u=>send({kind:'guard-duty',unitId:u.id,duty:'patrol'}))}><Footprints size={24}/></IconBtn>
   <IconBtn label="Stand down" tip="Back to ordinary work" disabled={!units.some(u=>duty(u.id))} onClick={()=>units.forEach(u=>send({kind:'release-guard',unitId:u.id}))}><X size={24}/></IconBtn>
   {units.some(u=>duty(u.id)==='escort')&&<span className="hw-chip">Escort</span>}</div>}
 </div>;
}
export function SelectionCard({hud,engine,onOffer}:{hud:HudSnapshot;engine:Engine|null;onOffer:(t:number)=>void}){
 const sel=hud.selection,[more,setMore]=useState(false),[info,setInfo]=useState(false);
 useEffect(()=>{setMore(false);setInfo(false);},[sel.kind,sel.name,sel.buildingId]);
 if(sel.kind==='none')return null;
 const hp=sel.maxHp>0?Math.round(100*sel.hp/sel.maxHp):0;
 const person=sel.kind==='unit'||sel.kind==='units';
 const icon=sel.kind==='building'?bldIcon(sel.type,36):sel.kind==='resource'?(sel.type==='tree'?<RES_ICON.wood size={36}/>:sel.type==='fish'?bldIcon('dock',36):<RES_ICON.stone size={36}/>):sel.kind==='boat'?bldIcon('dock',36):<Users size={36}/>;
 const own=sel.team===0;
 const showJobs=person&&hud.workerSelected>0;
 return <section className={cx('hw-sel',more&&'is-open')} aria-label={`Selected: ${sel.name}`}>
  <header className="hw-sel-head">
   <span className="hw-medal">{icon}</span>
   <div className="hw-sel-title"><h2>{sel.name}</h2>
    <div className="hw-sel-meta">
     <span className={cx('hw-chip',hp<35&&'t-bad')} title="Condition"><Heart size={18}/>{sel.kind==='resource'&&sel.type==='fish'?`${sel.hp}/${sel.maxHp}`:`${hp}%`}</span>
     {sel.carry&&<span className="hw-chip"><Package size={18}/>{sel.carry.replace(/^Carrying\s*/i,'')}</span>}
     {sel.queue&&<span className="hw-chip" title="Queue"><ClipboardList size={18}/>{sel.queue}</span>}
     {!!hud.workerSelected&&hud.job&&<span className="hw-chip">{hud.job}</span>}
    </div>
   </div>
   <IconBtn label="Details" tip={sel.info} active={info} onClick={()=>setInfo(v=>!v)} small><Info size={22}/></IconBtn>
   <IconBtn label="Deselect" tip="Esc" onClick={()=>engine?.clearSelection()} small><X size={22}/></IconBtn>
  </header>
  <div className="hw-bar" role="progressbar" aria-label="Condition" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${hp}%`}} className={hp<35?'t-bad':''}/></div>
  {info&&<p className="hw-info">{sel.info}</p>}
  {showJobs&&<div className="hw-jobs" role="group" aria-label="Assign work">{JOBS.filter(j=>!j.need||j.need(hud)).map(j=><GameTooltip key={j.id} title={j.label} description={JOB_TIP[j.id]}><button type="button" className={cx('hw-job',hud.job===j.id&&'is-on')} aria-pressed={hud.job===j.id} aria-label={j.label} onClick={()=>engine?.assignJob(j.id as never)}>{j.icon}<span>{j.label}</span></button></GameTooltip>)}</div>}
  {engine&&person&&(hud.militarySelected>0||hud.militiaSelected>0)&&<MilitaryPanel hud={hud} engine={engine}/>}
  <div className="hw-actions">
   {sel.kind==='building'&&own&&!sel.completed&&engine?.game.state.selBld&&<button type="button" className="hw-primary" onClick={()=>{engine.game.orderConstruction(engine.game.state.selBld!);engine.pushHud();}}><Hammer size={22}/>Build now</button>}
   {sel.kind==='resource'&&sel.type==='tree'&&engine&&<button type="button" className="hw-primary" onClick={()=>{const t=engine.game.selectedResource;if(t?.kind==='tree'){engine.game.markChop([t.id],false);engine.pushHud();}}}><Axe size={22}/>Fell tree</button>}
   {hud.idleWorkers>0&&sel.kind!=='boat'&&<button type="button" className="hw-btn-wide" onClick={()=>engine?.focusIdle()}><Users size={22}/>{hud.idleWorkers} idle</button>}
   {sel.canRecycle&&<button type="button" className="hw-btn-wide" onClick={()=>engine?.recycle()}><Recycle size={22}/>{sel.planned?'Cancel plan':'Recycle'}</button>}
   {person&&<><IconBtn label="Previous person" tip="Shift+," onClick={()=>engine?.cycleVillager(-1)}><ChevronLeft size={24}/></IconBtn><IconBtn label="Next person" tip="," onClick={()=>engine?.cycleVillager(1)}><ChevronRight size={24}/></IconBtn></>}
   <button type="button" className="hw-btn-wide hw-more" aria-expanded={more} onClick={()=>setMore(v=>!v)}><ClipboardList size={22}/>{more?'Less':'More orders'}</button>
  </div>
  {more&&<div className="hw-legacy hw-sel-more"><SelectionDetails hud={hud} engine={engine} selMin={false} onOffer={onOffer} hideJobs/></div>}
 </section>;
}

/* ---------- notifications ---------- */
export type Note={id:string;icon:ReactNode;title:string;chips?:ReactNode;action?:{label:string;onClick:()=>void};dismiss?:()=>void;tone?:'bad'|'warn'|'good'|'info'};
export function NoteCard({n}:{n:Note}){
 return <article className={cx('hw-note',n.tone&&'n-'+n.tone)} role="status">
  <span className="hw-medal hw-medal-s">{n.icon}</span>
  <div className="hw-note-main"><b>{n.title}</b>{n.chips&&<div className="hw-note-chips">{n.chips}</div>}</div>
  {n.action&&<button type="button" className="hw-note-act" onClick={n.action.onClick}>{n.action.label}</button>}
  {n.dismiss&&<button type="button" className="hw-note-x" aria-label="Dismiss" onClick={n.dismiss}><X size={20}/></button>}
 </article>;
}
export function useAlerts(engine:Engine|null){
 const game=engine?.game,win=Math.floor(performance.now()/2000);
 const workload=useMemo(()=>game?measureVillageWorkload(game).workloadPercent:null,[game,game?.state,win]);
 if(!game)return [];
 let starving=0,thirsty=0,freezing=0,full=0;
 for(const r of game.state.units){if(r.team!==0||r.hp<=0)continue;if(r.workReason?.includes('cache full'))full++;if((r.hunger??0)>=60)starving++;if((r.thirstSeconds??0)>=SURVIVAL_RULES.thirstGraceSeconds)thirsty++;if((r.coldSeconds??0)>=SURVIVAL_RULES.coldGraceSeconds)freezing++;}
 const harvest=harvestBacklogAlert(game),exposed=harvest?0:exposedHarvestUnits(game,0);
 return [
  starving>0&&{k:'starving',icon:<Wheat size={20}/>,n:starving,tip:`${starving} starving`},
  thirsty>0&&{k:'thirsty',icon:<Droplets size={20}/>,n:thirsty,tip:`${thirsty} dangerously thirsty`},
  freezing>0&&{k:'freezing',icon:<Snowflake size={20}/>,n:freezing,tip:`${freezing} freezing`},
  full>0&&{k:'full',icon:<Package size={20}/>,n:full,tip:`${full} blocked by full material stores`},
  exposed>=8&&{k:'exposed',icon:<Droplets size={20}/>,n:Math.floor(exposed),tip:`${Math.floor(exposed)} harvest units exposed to spoilage`},
  harvest?{k:'harvest',icon:<Wheat size={20}/>,n:'!',tip:harvest}:false,
  workload!==null&&workload>100&&{k:'work',icon:<ClipboardList size={20}/>,n:`${Math.ceil(workload)}%`,tip:`Work backlog · ${Math.ceil(workload)}% of capacity`},
 ].filter(Boolean) as {k:string;icon:ReactNode;n:string|number;tip:string}[];
}
const LOOT=['food','wood','stone','copper','iron'] as const;
function RaidNote({engine}:{engine:Engine}){
 const Q={kind:'combat-doctrine'} as const,read=useOwnerReadModels(engine,[Q]),r=read(Q).model?.combat.raid;
 const [gone,setGone]=useState<number>(-1);
 if(!r||r.phase==='fighting'||gone===r.id)return null;
 const total=LOOT.reduce((t,k)=>t+(r.carried[k]||0),0),title=r.outcome==='sacked'?(r.ours==='attacker'?'Camp sacked':'Village sacked'):r.outcome==='repelled'?(r.ours==='defender'?'Raid repelled':'Raid failed'):r.outcome==='destroyed'?(r.ours==='attacker'?'Raiders lost':'Raiders destroyed'):'Raid ended';
 const tone=(r.outcome==='sacked'&&r.ours==='defender')||(r.outcome==='destroyed'&&r.ours==='attacker')||(r.outcome==='repelled'&&r.ours==='attacker')?'bad':'good';
 const lootText=LOOT.filter(k=>r.carried[k]).map(k=>`${r.carried[k]} ${RES_NAME[k==='wood'?'wood':k]}`).join(' · ');
 return <NoteCard n={{id:'raid'+r.id,tone,icon:<Swords size={24}/>,title:title,dismiss:()=>setGone(r.id),chips:<>
  <span className="hw-chip" title="Our losses"><Skull size={18}/>{r.lostOurs}</span>
  <span className="hw-chip" title="Their losses"><Swords size={18}/>{r.lostTheirs}</span>
  {r.civiliansLost>0&&<span className="hw-chip t-bad" title="Civilians lost"><Users size={18}/>{r.civiliansLost}</span>}
  {r.burned>0&&<span className="hw-chip t-bad" title="Buildings burned"><Flame size={18}/>{r.burned}</span>}
  <span className="hw-chip" title={lootText||'Nothing carried off'}><Package size={18}/>{total}</span></>}}/>;
}
export function NotesStack({hud,engine,onOpen,hidden}:{hud:HudSnapshot;engine:Engine|null;onOpen:(k:DockKey)=>void;hidden:boolean}){
 const alerts=useAlerts(engine);
 const notes:Note[]=[];
 if(alerts.length)notes.push({id:'alerts',tone:'bad',icon:<TriangleAlert size={24}/>,title:'Needs attention',chips:alerts.map(a=><GameTooltip key={a.k} title={a.tip}><span className="hw-chip t-bad" tabIndex={0} aria-label={a.tip}>{a.icon}{a.n}</span></GameTooltip>)});
 if(hud.idleWorkers>0&&hud.selection.kind==='none')notes.push({id:'idle',icon:<Users size={24}/>,title:`${hud.idleWorkers} idle`,action:{label:'Find',onClick:()=>engine?.focusIdle()}});
 if(hud.canAge&&hud.nextAge)notes.push({id:'age',tone:'good',icon:<BookOpen size={24}/>,title:`${hud.nextAge} ready`,action:{label:'Open',onClick:()=>onOpen('ages')}});
 if(hud.routeOffer&&!hud.pendingAge){const o=hud.routeOffer,G=RES_ICON[o.give==='wood'?'wood':o.give==='food'?'food':o.give==='stone'?'stone':o.give],T=RES_ICON[o.get==='wood'?'wood':o.get==='food'?'food':o.get==='stone'?'stone':o.get];
  notes.push({id:'route',icon:<Package size={24}/>,title:o.rival,chips:<><span className="hw-chip" title={`Give ${o.giveAmt} ${resWord(o.give)}`}><G size={18}/>{o.giveAmt}</span><ChevronRight size={18}/><span className="hw-chip" title={`Get ${o.getAmt} ${resWord(o.get)}`}><T size={18}/>{o.getAmt}</span></>,action:{label:'Accept',onClick:()=>engine?.acceptRoute()},dismiss:()=>engine?.declineRoute()});}
 if(hud.threat>=.5)notes.push({id:'threat',tone:'bad',icon:<Shield size={24}/>,title:'Raiders near',action:{label:'Horn',onClick:()=>{engine?.game.soundDefenseHorn();engine?.pushHud();}}});
 if(hud.banner&&!hud.placing)notes.push({id:'banner',icon:<Bell size={24}/>,title:hud.banner});
 return <aside className={cx('hw-notes',hidden&&'is-hidden')} aria-label="Notifications">
  {notes.map(n=><NoteCard key={n.id} n={n}/>)}
  {engine&&<RaidNote engine={engine}/>}
  {engine&&<div className="hw-legacy-note"><RulerEventToast engine={engine}/><WorkDeliveryCue engine={engine}/><SeasonReport game={engine.game} hidden={!!hud.placing}/></div>}
 </aside>;
}

/* ---------- minimap + neighbours ---------- */
export function MinimapCard({hud,engine,onNeighbours,phone,onClose}:{hud:HudSnapshot;engine:Engine|null;onNeighbours:()=>void;phone?:boolean;onClose?:()=>void}){
 const Q={kind:'society-decisions'} as const;
 const known=hud.tribes.filter(t=>t.id!==0&&hud.camps?.some(c=>c.team===t.id&&c.known));
 return <section className={cx('hw-map',phone&&'is-phone')} aria-label="Map">
  {phone&&<IconBtn label="Close map" onClick={onClose!} small className="hw-map-x"><X size={22}/></IconBtn>}
  <div className="hw-map-frame"><WorldMinimap hud={hud} engine={engine}/></div>
  {known.length>0&&<button type="button" className="hw-map-neigh" aria-label="Neighbours" onClick={onNeighbours}>{known.map(t=>{const w=!t.alive?'Fallen':t.hostile?'War':t.ally?'Pact':(t.tension||0)>.52?'Tense':'Peace';return <span key={t.id} className="hw-neigh" title={`${t.name}: ${w}`}><i style={{background:t.alive?t.color:'#6b6256'}}/><b>{t.name}</b><em className={cx(t.hostile&&'t-bad',t.ally&&'t-good')}>{w}</em></span>;})}</button>}
 </section>;
}
