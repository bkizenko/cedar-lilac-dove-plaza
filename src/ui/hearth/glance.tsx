import {useEffect,useMemo,useReducer,useRef,useState,type ReactNode} from 'react';
import {ArrowUp,ArrowDown,ArrowRight,Minus,Swords,Droplets,Wheat,Snowflake,Package,ClipboardList,Users,Flame,Home,BookOpen,Bell,ChevronRight,X,Flag,Radar,Gem,Footprints,Coins,TriangleAlert,Newspaper} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {HudSnapshot} from '@/game/types';
import {readyFoodStock} from '../FoodStoreReadout';
import {GameTooltip} from '../GameTooltip';
import {SocietyFlag} from '../SocietyFlag';
import {cx,IconBtn} from './kit';
import {FoldHandle,FoldMin,useFold} from './fold';
import {RES_ICON,RES_NAME} from './icons';
import {SUPPLY_RULES,TrendTracker,supplyFill,supplyLevel,daysText,rankAlerts,pinSet,isKeyTip,infoVisible,projectToScreen,edgeArrow,avoidPinControls,PIN_LAYOUT_RULES,type PinRect,type Alert,type AlertKind,type Trend,type SupplyLevel} from './glanceModel';
import {detectAlerts,foodDays,waterDays,workloadOf,winterOutlook} from './glanceReads';
import {firstNeeds,firstNeedsVisible,type FirstNeed,type FirstNeedKind} from './firstNeeds';
import {OVERLAY_KEYS,paintOverlays,type OverlayKey} from './overlayModel';
import {hasInfluenceGradient,overlaySourcesOf} from './overlayReads';
import {simulationDaySeconds} from '@/game/calendarPacing';
import {MINIMAP_RULES} from '../minimapModel';

/* ====================== top bar: supply meters ====================== */
const TREND_ICON:Record<Trend,typeof ArrowUp>={up:ArrowUp,down:ArrowDown,flat:Minus};
const TREND_WORD:Record<Trend,string>={up:'rising',down:'falling',flat:'steady'};
type Cell={k:keyof typeof RES_ICON;value:string|number;stock:number;days:number|null;fill:number|null;level:SupplyLevel;tip:string;trackTrend:boolean;warn?:boolean};
/** Days of supply for food and water, stock and trend for materials, people against housing. Sentences live only in tooltips. */
export function SupplyBar({hud,engine,onOpen}:{hud:HudSnapshot;engine:Engine|null;onOpen:(s:'council'|'stores')=>void}){
 const trackers=useRef(new Map<string,TrendTracker>());
 const game=engine?.game;
 const water=Math.floor(game?.tribe(0).survival?.waterLiters||0),food=Math.floor(readyFoodStock(hud));
 const fd=game?foodDays(game):null,wd=game?waterDays(game):null,winter=game?winterOutlook(game):null;
 const cells:Cell[]=[
  {k:'food',value:food,stock:food,days:fd,fill:supplyFill(fd),level:supplyLevel(fd),trackTrend:true,tip:`Food ready to eat.${fd!==null?` About ${daysText(fd)} days at today's appetite.`:''} Raw supplies are in Village, Stores.`},
  {k:'wood',value:hud.wood,stock:hud.wood,days:null,fill:null,level:'unknown',trackTrend:true,tip:'Logs in stores.'},
  {k:'stone',value:hud.stone,stock:hud.stone,days:null,fill:null,level:'unknown',trackTrend:true,tip:'Stone in stores.'},
  {k:'water',value:water,stock:water,days:wd,fill:supplyFill(wd),level:wd===null?(water<10?'critical':'unknown'):supplyLevel(wd),trackTrend:true,tip:`${water} litres of collected water.${wd!==null?` About ${daysText(wd)} days at today's use.`:''}`},
  {k:'people',value:`${hud.pop}/${hud.popCap}`,stock:hud.pop,days:null,fill:hud.popCap>0?Math.max(0,Math.min(1,hud.pop/hud.popCap)):null,level:hud.pop>=hud.popCap&&hud.popCap>0?'low':'ok',trackTrend:false,warn:hud.pop>=hud.popCap&&hud.popCap>0,tip:`${hud.pop} people, housing for ${hud.popCap}.${hud.pop>=hud.popCap?' Housing is full.':''}`},
  ...(hud.age>=1||hud.copper>0?[{k:'copper' as const,value:hud.copper,stock:hud.copper,days:null,fill:null,level:'unknown' as const,trackTrend:true,tip:'Copper in stores.'}]:[]),
  ...(hud.age>=2||hud.iron>0?[{k:'iron' as const,value:hud.iron,stock:hud.iron,days:null,fill:null,level:'unknown' as const,trackTrend:true,tip:'Iron in stores.'}]:[]),
 ];
 for(const c of cells){if(!c.trackTrend)continue;let t=trackers.current.get(c.k);if(!t){t=new TrendTracker(simulationDaySeconds);trackers.current.set(c.k,t);}t.push(hud.time,c.stock,game?.state);}
 const f=useFold('resources');
 if(!f.showPanel)return <FoldHandle f={f} icon={<Coins size={24}/>} tone={cells.some(c=>c.level==='critical')?'bad':undefined}/>;
 return <div className={cx('hw-top-left',f.cls)}>
  <FoldMin f={f}/>
  {engine&&<button type="button" className="hw-flag" aria-label={`Council of ${engine.game.tribe(0).name}`} onClick={()=>onOpen('council')}><SocietyFlag game={engine.game} team={0}/><span>{engine.game.tribe(0).name}</span></button>}
  {winter&&<GameTooltip title="Winter food" description={`Food lasts about ${daysText(winter.foodDays)} days at today's appetite; the thaw is ${daysText(winter.thawDays)} days away${winter.phase==='autumn'?`, and winter starts in ${daysText(winter.winterStartDays)}`:''}. Short by about ${daysText(winter.shortfallDays)} days: gather, hunt or ration.`}><button type="button" className={cx('hw-winter',`s-${winter.level}`)} aria-label={`Winter: food for ${daysText(winter.foodDays)} days, thaw in ${daysText(winter.thawDays)} days`} onClick={()=>onOpen('stores')}><Snowflake size={22}/><b>{daysText(winter.foodDays)}d</b><span>food</span><i aria-hidden="true">/</i><b>{daysText(winter.thawDays)}d</b><span>to thaw</span></button></GameTooltip>}
  <ul className="hw-res hw-supply" aria-label="Village stores">{cells.map(c=>{
   const I=RES_ICON[c.k],trend=c.trackTrend?trackers.current.get(c.k)?.trend()??null:null,T=trend&&trend!=='flat'?TREND_ICON[trend]:null;
   const tip=`${c.tip}${trend?` ${TREND_WORD[trend][0].toUpperCase()+TREND_WORD[trend].slice(1)} over the last day.`:''}`;
   const label=`${RES_NAME[c.k]} ${c.value}${c.days!==null?`, ${daysText(c.days)} days`:''}${trend?`, ${TREND_WORD[trend]}`:''}`;
   return <li key={c.k}><GameTooltip title={RES_NAME[c.k]} description={tip}><button type="button" className={cx('hw-res-cell hw-supply-cell',`s-${c.level}`,c.warn&&'is-warn',T&&'has-trend')} aria-label={label} onClick={()=>onOpen('stores')}>
    <span className="hw-supply-row"><I size={34}/><b>{c.value}</b>{T&&<i className={cx('hw-trend','tr-'+trend)} aria-hidden="true"><T size={24}/></i>}</span>
    <span className={cx('hw-meter-s',c.fill===null&&'is-none')} role={c.fill===null?undefined:'meter'} aria-label={c.fill===null?undefined:`${RES_NAME[c.k]} supply`} aria-valuemin={0} aria-valuemax={SUPPLY_RULES.fullDays} aria-valuenow={c.days!==null?Math.round(c.days*10)/10:undefined}><i style={{width:`${Math.round((c.fill??0)*100)}%`}}/></span>
   </button></GameTooltip></li>;})}</ul>
 </div>;
}

/* ====================== alerts: detection hook, priority stack ====================== */
export const ALERT_ICON:Record<AlertKind,(p:{size:number})=>ReactNode>={
 raiders:p=><Swords {...p}/>,thirsty:p=><Droplets {...p}/>,starving:p=><Wheat {...p}/>,freezing:p=><Snowflake {...p}/>,
 full:p=><Package {...p}/>,exposed:p=><Droplets {...p}/>,harvest:p=><Wheat {...p}/>,backlog:p=><ClipboardList {...p}/>,wild:p=><Footprints {...p}/>,
};
/** Visible words on each world pin: the icon alone (a crate for full stores) never has to be guessed. */
export const ALERT_LABEL:Record<AlertKind,string>={raiders:'Raiders',thirsty:'Thirsty',starving:'Hungry',freezing:'Cold',full:'Stores full',exposed:'Spoiling',harvest:'Harvest',backlog:'Work backlog',wild:'Wild craft'};
const CRIT_TITLE:Partial<Record<AlertKind,string>>={raiders:'Raiders near',thirsty:'Thirsty',starving:'Starving',freezing:'Freezing'};
/** Alerts for this frame's HUD render. Positions refresh about twice a second; the workload sum about every two. */
export function useGlanceAlerts(engine:Engine|null):Alert[]{
 const game=engine?.game,fast=Math.floor(performance.now()/500),slow=Math.floor(performance.now()/2000);
 const workload=useMemo(()=>game?workloadOf(game):null,[game,game?.state,slow]);
 return useMemo(()=>game?detectAlerts(game,workload):[],[game,game?.state,fast,workload]);
}
/** Go to the place an alert is about, or sound the horn for raiders. */
export function alertAction(a:Alert,engine:Engine|null){
 if(!engine)return;
 if(a.kind==='raiders'&&!a.at){engine.game.soundDefenseHorn();engine.pushHud();return;}
 if(a.at){engine.focusMinimap(a.at.x,a.at.z);engine.pushHud();}
}
type InfoNote={id:string;sticky:boolean;icon:ReactNode;title:string;chips?:ReactNode;action?:{label:string;onClick:()=>void};dismiss?:()=>void;tone?:'good'|'bad'};
/** Remembers when each info card first appeared; ones that are not sticky fade after INFO_RULES.ttlSeconds and stay hidden until they clear and return. */
function useInfoClock(notes:readonly InfoNote[]){
 const seen=useRef(new Map<string,number>()),[,tick]=useReducer((n:number)=>n+1,0);
 const now=performance.now()/1000,ids=new Set(notes.map(n=>n.id));
 for(const id of [...seen.current.keys()])if(!ids.has(id))seen.current.delete(id);
 for(const n of notes)if(!seen.current.has(n.id))seen.current.set(n.id,now);
 const visible=notes.map(n=>({n,...infoVisible(seen.current.get(n.id)!,now,n.sticky)})).filter(x=>x.show);
 const timed=visible.some(x=>!x.n.sticky);
 useEffect(()=>{if(!timed)return;const t=setInterval(tick,500);return()=>clearInterval(t);},[timed]);
 return visible;
}
function InfoCard({n,fading}:{n:InfoNote;fading:boolean}){
 return <article className={cx('hw-note hw-info',n.tone&&'n-'+n.tone,fading&&'is-fading')} role="status" aria-label={n.title}>
  <span className="hw-medal hw-medal-s">{n.icon}</span>
  <div className="hw-note-main"><b>{n.title}</b>{n.chips&&<div className="hw-note-chips">{n.chips}</div>}</div>
  {n.action&&<button type="button" className="hw-note-act" onClick={n.action.onClick}>{n.action.label}</button>}
  {n.dismiss&&<button type="button" className="hw-note-x" aria-label="Dismiss" onClick={n.dismiss}><X size={24}/></button>}
 </article>;
}
/**
 * One sticky critical card (the highest-ranked life-or-death problem, one button), a row of icon chips for everything else that is wrong,
 * and timed info cards for news. `extra` carries the older raid-result and ruler toasts.
 */
export function PriorityStack({hud,engine,alerts,onOpen,hidden,extra}:{hud:HudSnapshot;engine:Engine|null;alerts:readonly Alert[];onOpen:(k:'ages')=>void;hidden:boolean;extra?:ReactNode}){
 const {critical,chips}=rankAlerts(alerts);
 const [gone,setGone]=useState<string[]>([]);
 const info:InfoNote[]=[];
 if(hud.canAge&&hud.nextAge)info.push({id:'age',sticky:false,tone:'good',icon:<BookOpen size={26}/>,title:`${hud.nextAge} ready`,action:{label:'Open',onClick:()=>onOpen('ages')}});
 if(hud.routeOffer&&!hud.pendingAge){const o=hud.routeOffer,G=RES_ICON[o.give as keyof typeof RES_ICON],T=RES_ICON[o.get as keyof typeof RES_ICON];
  info.push({id:'route',sticky:true,icon:<Package size={26}/>,title:o.rival,chips:<><span className="hw-chip" title={`Give ${o.giveAmt}`}><G size={24}/>{o.giveAmt}</span><ChevronRight size={24}/><span className="hw-chip" title={`Get ${o.getAmt}`}><T size={24}/>{o.getAmt}</span></>,action:{label:'Accept',onClick:()=>engine?.acceptRoute()},dismiss:()=>engine?.declineRoute()});}
 if(hud.banner&&!hud.placing&&!isKeyTip(hud.banner))info.push({id:'banner:'+hud.banner,sticky:false,icon:<Bell size={26}/>,title:hud.banner,dismiss:()=>setGone(g=>[...g,'banner:'+hud.banner])});
 const shown=useInfoClock(info.filter(n=>!gone.includes(n.id)));
 const idle=hud.idleWorkers>0&&hud.selection.kind==='none';
 const fa=useFold('alerts'),fn=useFold('notes');
 const alertCount=(critical?1:0)+chips.length+(idle?1:0);
 return <aside className={cx('hw-notes hw-prio',hidden&&'is-hidden')} aria-label="Notifications">
  <div className="hw-fold-bar">
   {fa.showHandle?<FoldHandle f={fa} icon={<TriangleAlert size={24}/>} badge={alertCount} tone={critical?'bad':alertCount?'warn':undefined}/>:alertCount>0&&<FoldMin f={fa} text/>}
   {fn.showHandle?<FoldHandle f={fn} icon={<Newspaper size={24}/>} badge={shown.length}/>:shown.length>0&&<FoldMin f={fn} text/>}
  </div>
  {fa.showPanel&&<div className={cx('hw-fold-group',fa.cls)} data-fold="alerts">
   {critical&&<article className="hw-note hw-crit" role="alert" aria-label={critical.tip}>
    <span className="hw-medal hw-medal-s">{ALERT_ICON[critical.kind]({size:30})}</span>
    <div className="hw-note-main"><b>{CRIT_TITLE[critical.kind]??critical.tip}</b></div>
    <span className="hw-chip t-bad" title={critical.tip}>{critical.count}</span>
    <button type="button" className="hw-note-act" onClick={()=>critical.kind==='raiders'?(engine?.game.soundDefenseHorn(),engine?.pushHud()):alertAction(critical,engine)}>{critical.kind==='raiders'?'Horn':'Find'}</button>
   </article>}
   <FirstNeedsStrip engine={engine}/>
   {(chips.length>0||idle)&&<div className="hw-chiprow" role="group" aria-label="Needs attention">
    {chips.map(a=><GameTooltip key={a.kind} title={a.tip}><button type="button" className={cx('hw-chip hw-chip-btn',a.severity==='critical'?'t-bad':'t-warn')} aria-label={a.tip} onClick={()=>alertAction(a,engine)}>{ALERT_ICON[a.kind]({size:24})}{a.kind==='harvest'?'':a.count}</button></GameTooltip>)}
    {idle&&<GameTooltip title={`${hud.idleWorkers} idle`} description="Jump to the next idle resident"><button type="button" className="hw-chip hw-chip-btn" aria-label={`${hud.idleWorkers} idle`} onClick={()=>engine?.focusIdle()}><Users size={24}/>{hud.idleWorkers}</button></GameTooltip>}
   </div>}
  </div>}
  {fn.showPanel&&<div className={cx('hw-fold-group',fn.cls)} data-fold="notes">
   {shown.map(({n,fading})=><InfoCard key={n.id} n={n} fading={fading}/>)}
   {extra}
  </div>}
 </aside>;
}


/* ====================== first five minutes: the four starting needs ====================== */
const NEED_ICON:Record<FirstNeedKind,(p:{size:number})=>ReactNode>={water:p=><Droplets {...p}/>,fire:p=><Flame {...p}/>,shelter:p=><Home {...p}/>,food:p=><Wheat {...p}/>};
/** Soft-priority strip for a new village: water, fire, shelter, food. Each chip has icon, word and a tooltip reason; a met need retires for the session. */
export function FirstNeedsStrip({engine}:{engine:Engine|null}){
 const game=engine?.game,retired=useRef(new Set<FirstNeedKind>()),slow=Math.floor(performance.now()/1000);
 const show=useMemo<FirstNeed[]>(()=>{
  if(!game)return [];
  const r=firstNeedsVisible(firstNeeds(game),retired.current);retired.current=r.retired;return r.show;
 },[game,game?.state,slow]);
 if(!show.length)return null;
 return <div className="hw-chiprow hw-firstneeds" role="group" aria-label="First needs">
  <span className="hw-fn-label">First needs</span>
  {show.map(n=><GameTooltip key={n.kind} title={n.label} description={n.hint}><button type="button" className="hw-chip hw-chip-btn t-warn" aria-label={`${n.label}: ${n.hint}`} onClick={()=>{if(engine&&n.at){engine.focusMinimap(n.at.x,n.at.z);engine.pushHud();}}}>{NEED_ICON[n.kind]({size:24})}{n.label}</button></GameTooltip>)}
 </div>;
}

/* ====================== world pins and edge arrows ====================== */
// Room for a chip (about 100 px wide) and its arrow on every side.
const pinInset=(w:number)=>w<760?{left:76,top:176,right:64,bottom:120}:{left:132,top:130,right:72,bottom:130};
/**
 * Pins for up to five problems, drawn where they are. A problem on screen gets a dashed ring and an icon chip; one off screen (or behind the camera)
 * gets the same chip on the viewport edge with an arrow toward it. The layer never takes a click except on a chip itself.
 */
export function AlertPins({engine,alerts}:{engine:Engine|null;alerts:readonly Alert[]}){
 const pins=useMemo(()=>pinSet(alerts),[alerts]);
 const box=useRef<HTMLDivElement>(null),els=useRef(new Map<AlertKind,HTMLButtonElement>()),arrows=useRef(new Map<AlertKind,HTMLElement>());
 useEffect(()=>{
  if(!engine||!pins.length)return;let raf=0,nextMeasure=0,lastWidth=0,lastHeight=0;let controls:PinRect[]=[];const sizes=new Map<AlertKind,{width:number;height:number}>();
  const frame=()=>{
   raf=requestAnimationFrame(frame);
   const host=box.current,cam=engine.view?.camera as any;if(!host||!cam?.projectionMatrix?.elements||!cam.matrixWorldInverse?.elements)return;
   const r=host.getBoundingClientRect(),W=r.width,H=r.height;if(!W||!H)return;const inset=pinInset(W);
   // Measure the explicit HUD panels/chips once per layout interval, never a
   // full DOM scan for each pin/frame. Resize invalidates this small cache.
   const now=performance.now();if(now>=nextMeasure||W!==lastWidth||H!==lastHeight){
    controls=[];const root=host.closest('[data-hw="hearth"]');
    for(const panel of root?.querySelectorAll<HTMLElement>('.hw-top,.hw-rail,.hw-notes,.hw-map,.hw-sel,.hw-tray,.hw-place,.hw-dock,.hw-hint,.hw-paused')??[]){if(controls.length>=PIN_LAYOUT_RULES.maximumBlockers-5)break;const b=panel.getBoundingClientRect();if(b.width>0&&b.height>0)controls.push({x:b.left-r.left,y:b.top-r.top,width:b.width,height:b.height});}
    for(const a of pins){const chip=els.current.get(a.kind)?.querySelector<HTMLElement>('.hw-pin-chip'),b=chip?.getBoundingClientRect();if(b&&b.width>0&&b.height>0)sizes.set(a.kind,{width:b.width,height:b.height});}
    nextMeasure=now+PIN_LAYOUT_RULES.measureMilliseconds;lastWidth=W;lastHeight=H;
   }
   const placed:{x:number;y:number}[]=[],placedChips:PinRect[]=[];
   for(const a of pins){
    const el=els.current.get(a.kind);if(!el||!a.at)continue;
    const p=projectToScreen(cam,{x:a.at.x,y:a.at.y+1.2,z:a.at.z},W,H);
    let x=p.x,y=p.y,angle=0,edge=false;
    if(p.onScreen){x=Math.max(inset.left-30,Math.min(W-inset.right+30,x));y=Math.max(inset.top-60,Math.min(H-inset.bottom+60,y));}
    else{const e=edgeArrow(p,W,H,inset);x=e.x;y=e.y;angle=e.angle;edge=true;}
    el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;el.classList.toggle('is-edge',edge);el.style.visibility='visible';
    let lift=0;for(const q of placed)if(Math.abs(q.x-x)<84&&Math.abs(q.y-y)<60)lift+=54;
    placed.push({x,y});el.style.setProperty('--lift',`${lift}px`);
    const size=sizes.get(a.kind)??{width:80,height:52},desired={x:x-size.width/2,y:edge?y-size.height/2:y-size.height-38-lift,...size},safe=avoidPinControls(desired,W,H,[...controls,...placedChips]);
    if(!safe){el.style.setProperty('--pin-chip-visible','hidden');const ar=arrows.current.get(a.kind);if(ar)ar.style.visibility='hidden';continue;}
    el.style.setProperty('--pin-chip-visible','visible');const ax=safe.x-desired.x,ay=safe.y-desired.y;placedChips.push(safe);el.style.setProperty('--avoid-x',`${ax.toFixed(1)}px`);el.style.setProperty('--avoid-y',`${ay.toFixed(1)}px`);
    const ar=arrows.current.get(a.kind);if(ar){ar.style.visibility='visible';ar.style.transform=`translate(${ax.toFixed(1)}px,${ay.toFixed(1)}px) rotate(${angle.toFixed(3)}rad) translateX(46px)`;}
   }
  };
  frame();return()=>cancelAnimationFrame(raf);
 },[engine,pins]);
 if(!pins.length)return null;
 return <div ref={box} className="hw-pins" aria-hidden={false}>
  {pins.map(a=><button key={a.kind} ref={el=>{if(el)els.current.set(a.kind,el);else els.current.delete(a.kind);}} type="button" className={cx('hw-pin','k-'+a.kind,a.severity==='critical'&&'is-crit')} style={{visibility:'hidden'}} aria-label={`${a.tip}. Go there`} title={a.tip} onClick={()=>alertAction(a,engine)}>
   <span className="hw-pin-ring" aria-hidden="true"/>
   <span className="hw-pin-chip">{ALERT_ICON[a.kind]({size:26})}<span className="hw-pin-label">{ALERT_LABEL[a.kind]}</span><b>{a.count}</b></span>
   <i className="hw-pin-arrow" aria-hidden="true" ref={el=>{if(el)arrows.current.set(a.kind,el);else arrows.current.delete(a.kind);}}><ArrowRight size={26}/></i>
  </button>)}
 </div>;
}

/* ====================== minimap overlays ====================== */
const OVERLAY_STORE_KEY='hearthwild.ui.mapOverlays';
const overlayListeners=new Set<()=>void>();
let overlayActive:Set<OverlayKey>|null=null;
const loadOverlays=():Set<OverlayKey>=>{
 if(overlayActive)return overlayActive;
 try{const raw=globalThis.localStorage?.getItem(OVERLAY_STORE_KEY);overlayActive=new Set((raw?JSON.parse(raw):[]).filter((k:string)=>(OVERLAY_KEYS as readonly string[]).includes(k)));}catch{overlayActive=new Set();}
 return overlayActive!;
};
export function toggleOverlay(k:OverlayKey){
 const next=new Set(loadOverlays());next.has(k)?next.delete(k):next.add(k);overlayActive=next;
 try{globalThis.localStorage?.setItem(OVERLAY_STORE_KEY,JSON.stringify([...next]));}catch{/* a remembered convenience only */}
 overlayListeners.forEach(f=>f());
}
export function useOverlays(){
 const [,bump]=useReducer((n:number)=>n+1,0);
 useEffect(()=>{overlayListeners.add(bump);return()=>{overlayListeners.delete(bump);};},[]);
 return loadOverlays();
}
const OVERLAY_META:Record<OverlayKey,{label:string;tip:string;icon:ReactNode}>={
 territory:{label:'Territory',tip:'Borders of every society you have met, on ground you have explored',icon:<Flag size={26}/>},
 influence:{label:'Influence',tip:'How strongly each society holds the land: solid at home, fading with distance and rough ground',icon:<Radar size={26}/>},
 resources:{label:'Resources',tip:'Trees, forage, stone, copper, iron and fish you have already found',icon:<Gem size={26}/>},
 water:{label:'Water',tip:'Rivers, lakes and sea you have explored',icon:<Droplets size={26}/>},
};
export function OverlayToggles({engine}:{engine:Engine|null}){
 const active=useOverlays(),influence=engine?hasInfluenceGradient(engine.game):false;
 return <div className="hw-overlays" role="group" aria-label="Map layers">
  {OVERLAY_KEYS.filter(k=>k!=='influence'||influence).map(k=><IconBtn key={k} label={OVERLAY_META[k].label} tip={OVERLAY_META[k].tip} active={active.has(k)} small onClick={()=>toggleOverlay(k)}>{OVERLAY_META[k].icon}</IconBtn>)}
 </div>;
}
/** Transparent canvas laid over the minimap; repainted at the minimap's own cadence and whenever a layer is toggled. */
export function OverlayCanvas({hud,engine}:{hud:HudSnapshot;engine:Engine|null}){
 const active=useOverlays(),ref=useRef<HTMLCanvasElement>(null),latest=useRef(hud);latest.current=hud;
 const on=OVERLAY_KEYS.filter(k=>active.has(k)).join();
 useEffect(()=>{
  const cv=ref.current;if(!engine||!cv||!on)return;const ctx=cv.getContext('2d');if(!ctx)return;
  const N=MINIMAP_RULES.pixels,img=ctx.createImageData(N,N),set=new Set(on.split(',')) as Set<OverlayKey>;
  const draw=()=>{const src=overlaySourcesOf(engine.game,latest.current,set);paintOverlays(src,set,img.data as unknown as Uint8ClampedArray);ctx.putImageData(img,0,0);};
  draw();const t=setInterval(draw,MINIMAP_RULES.terrainRefreshMilliseconds);return()=>clearInterval(t);
 },[engine,on]);
 if(!on)return null;
 return <canvas ref={ref} className="hw-map-overlay" width={MINIMAP_RULES.pixels} height={MINIMAP_RULES.pixels} aria-hidden="true"/>;
}
