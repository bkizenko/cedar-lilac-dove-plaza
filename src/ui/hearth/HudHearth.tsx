import {useEffect,useState} from 'react';
import {Landmark,Pause,TriangleAlert,Handshake} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {HudSnapshot} from '@/game/types';
import {knownSettlement} from '@/game/barter';
import {useLifecycleAction} from '../useLifecycleAction';
import {TestPanel} from '../TestPanel';
import {VisitingTrader} from '../VisitingTrader';
import {TradeProposal} from '../TradeProposal';
import {ExcavationControls} from '../ExcavationControls';
import {TowerPlatformControls} from '../TowerPlatformControls';
import {GateRotationControl} from '../GateRotationControl';
import {RotateButtons} from './RotateButtons';
import {TradeBlock} from '../Hud';
import {UiThemeBoot} from '../uiTheme';
import {StartupHint} from './StartupHint';
import {PreviouslyCard} from './PreviouslyCard';
import {OldSaveNote} from './OldSaveNote';
import {AlertPins,useGlanceAlerts} from './glance';
import {HelpScreen} from './helpScreen';
import {RoadsCard} from './roadsCard';
import {ResourceBar,TimeCard,Rail,Dock,BuildTray,PlacementCard,SelectionCard,NotesStack,MinimapCard,IconBtn,cx,type DockKey} from './parts';
import {MinimapReopen,useMinimapCollapsed} from './minimapToggle';
import {useHudHotkeys,Foldable} from './fold';
import {layout,PANELS} from './hudLayout';
import {useTestLabButton} from './useTestLabButton';
import {FlaskConical} from 'lucide-react';
import {CouncilScreen,VillageScreen,AgesScreen,MenuScreen,Screen} from './screens';
import {WondersScreen} from './wondersScreen';
import './hearth.css';
import './glance.css';
import './palette.css';
import './wildPanel.css';

/** The Hearth interface: calm parchment-and-wood chrome, big icons and numbers, a contextual command card and a small number of full screens. */
export function HudHearth({hud,engine}:{hud:HudSnapshot;engine:Engine|null}){
 const lifecycle=useLifecycleAction(engine);
 const [screen,setScreen]=useState<null|{k:'village'|'council'|'ages'|'wonders'|'menu'|'trade'|'help';tab?:string}>(null);
 const [tray,setTray]=useState(false),[tab,setTab]=useState('Village'),[map,setMap]=useState(false),[test,setTest]=useState(false),[hidden,setHidden]=useState(false),[trade,setTrade]=useState<number|null>(null);
 const [mapCollapsed,setMapCollapsed]=useMinimapCollapsed();
 const [showTestLab,setShowTestLab]=useTestLabButton();
 const founding=hud.founding;
 const alerts=useGlanceAlerts(hud.started&&!hud.awaitingStart?engine:null);
 useEffect(()=>{if(hud.placing)setTray(false);},[hud.placing]);
 useEffect(()=>{if(!tray)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented){setTray(false);}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[tray]);
 // O: sound effects, U: hide or show the interface, Shift+U: minimise or show every panel. M (mute) and Shift+M (map) are handled elsewhere.
 useHudHotkeys({
  sfx:()=>{engine?.audio?.toggleSfxOff();engine?.pushHud?.();},
  hide:()=>setHidden(v=>!v),
  allPanels:()=>{const shown=PANELS.some(p=>!layout.isCollapsed(p.id)&&!['testlab','wonders','skills'].includes(p.id));layout.setAll(shown,PANELS.filter(p=>!['testlab','wonders','skills'].includes(p.id)).map(p=>p.id));},
 },hud.started&&!hud.awaitingStart);
 if(!hud.started||hud.awaitingStart)return null;
 if(hidden)return <button type="button" className="hw hw-restore" onClick={()=>setHidden(false)}>Show interface</button>;
 const close=()=>setScreen(null);
 const open=(k:DockKey)=>{
  if(k==='build'){setTray(v=>!v);setMap(false);return;}
  if(k==='map'){setMap(v=>!v);setTray(false);return;}
  setTray(false);setMap(false);setScreen({k});
 };
 const sel=hud.selection.kind!=='none';
 return <div className="hw" data-hw="hearth">
  <UiThemeBoot/>
  {!founding&&!screen&&<AlertPins engine={engine} alerts={alerts}/>}
  {!founding&&!screen&&engine&&<OldSaveNote engine={engine}/>}
  {!founding&&!screen&&engine&&<PreviouslyCard engine={engine}/>}
  {!founding&&!screen&&<StartupHint onOpenMenu={()=>setScreen({k:'menu'})} onOpenHelp={()=>setScreen({k:'help'})}/>}
  <header className="hw-top"><ResourceBar hud={hud} engine={engine} onOpen={k=>setScreen(k==='council'?{k:'council'}:{k:'village',tab:'stores'})}/><TimeCard hud={hud} engine={engine} onAges={()=>setScreen({k:'ages'})} onMenu={()=>setScreen({k:'menu'})}/></header>
  {!founding&&showTestLab&&<Foldable id="testlab" icon={<FlaskConical size={24}/>} className="hw-testlab-fold"><button type="button" className="hw-testlab" aria-label="Test lab" title="Open the Test lab" disabled={!engine||lifecycle.busy} onClick={()=>void lifecycle.run(()=>engine!.startTestSession(),(o:unknown)=>{if(o)setTest(true);})}><FlaskConical size={24}/><span>Test lab</span></button></Foldable>}
  {!founding&&<Rail hud={hud} engine={engine} workOpen={screen?.k==='village'&&screen.tab==='work'} onWork={()=>setScreen({k:'village',tab:'work'})}/>}
  <NotesStack hud={hud} engine={engine} onOpen={open} hidden={false} alerts={alerts}/>
  {!founding&&!screen&&<RoadsCard engine={engine}/>}
  {hud.paused&&!hud.ended&&<div className="hw-paused" role="status"><Pause size={22}/>Paused</div>}

  <div className="hw-bottom">
   {founding?<section className="hw-place" role="status"><span className="hw-tile-icon"><Landmark size={32}/></span><div className="hw-place-main"><b>Plant the hall</b><span>Pick open ground by food and timber. The first is free.</span>{hud.placeIssue&&<span className="hw-issue"><TriangleAlert size={18}/>{hud.placeIssue}</span>}</div></section>
   :<>
    {hud.placing?<PlacementCard hud={hud} engine={engine} extra={<>
      {hud.placing==='trench'&&engine&&<ExcavationControls engine={engine}/>}
      {hud.placing==='watchtower'&&engine&&<TowerPlatformControls engine={engine}/>}
      {hud.placing==='gate'&&engine&&<GateRotationControl facing={engine.gateFacing} onChange={f=>engine.setGateFacing(f)}/>}
      {engine?.canRotateAnyPlacement()&&<RotateButtons engine={engine} gate={hud.placing==='gate'}/>}</>}/>
     :tray&&<BuildTray hud={hud} engine={engine} tab={tab} setTab={setTab} onPick={()=>setTray(false)} onClose={()=>setTray(false)}/>}
    <SelectionCard hud={hud} engine={engine} onOffer={t=>setTrade(t)}/>
    <Dock active={screen?.k==='village'?'village':screen?.k==='ages'?'ages':screen?.k==='council'?'council':screen?.k==='wonders'?'wonders':tray?'build':map?'map':null} onPick={open} onHome={()=>engine?.focusHome()} hasMap alerts={{}}/>
   </>}
  </div>
  <div className={cx('hw-map-wrap',mapCollapsed&&'is-collapsed')}>{mapCollapsed?<MinimapReopen onClick={()=>setMapCollapsed(false)}/>:<MinimapCard hud={hud} engine={engine} onNeighbours={()=>setScreen({k:'council',tab:'neighbours'})} onCollapse={()=>setMapCollapsed(true)}/>}
   {map&&<MinimapCard phone hud={hud} engine={engine} onNeighbours={()=>{setMap(false);setScreen({k:'council',tab:'neighbours'});}} onClose={()=>setMap(false)}/>}</div>

  {engine&&<VisitingTrader engine={engine}/>}
  {test&&engine&&<TestPanel engine={engine} close={()=>setTest(false)}/>}
  {screen?.k==='village'&&engine&&<VillageScreen hud={hud} engine={engine} initial={screen.tab} onClose={close} onKnowledge={()=>setScreen({k:'ages'})} onOffer={t=>setTrade(t)}/>}
  {screen?.k==='council'&&engine&&<CouncilScreen engine={engine} initial={screen.tab} onClose={close}/>}
  {screen?.k==='wonders'&&engine&&<WondersScreen engine={engine} initial={screen.tab} onClose={close}/>}
  {screen?.k==='ages'&&<AgesScreen hud={hud} engine={engine} onClose={close}/>}
  {screen?.k==='help'&&<HelpScreen onClose={close}/>}
  {screen?.k==='menu'&&<MenuScreen hud={hud} engine={engine} lifecycle={lifecycle as never} onClose={close} onTest={()=>setTest(true)} showTestLab={showTestLab} onShowTestLab={setShowTestLab} onHide={()=>setHidden(true)}/>}
  {trade!==null&&engine&&<Screen title={`Trade · ${engine.game.tribe(trade)?.name??''}`} icon={<Handshake size={32}/>} onClose={()=>setTrade(null)}><div className="hw-legacy">{knownSettlement(engine.game,trade)?<TradeProposal key={trade} engine={engine} team={trade} expanded/>:<p>Find their settlement before sending a shipment.</p>}</div></Screen>}

  {hud.pendingAge&&<div className="hw-scrim"><div className="hw-screen hw-choice" role="dialog" aria-modal="true" aria-label={`Enter the ${hud.pendingAge.next} Age`}>
   <header className="hw-screen-head"><h1>{hud.pendingAge.next} Age</h1></header>
   <div className="hw-screen-body"><div className="hw-grid-2">
    <button type="button" className="hw-card hw-pick t-good" onClick={()=>engine?.pickAge('econ')}><h3>{hud.pendingAge.econ.name}</h3><p>{hud.pendingAge.econ.hint}</p></button>
    <button type="button" className="hw-card hw-pick t-bad" onClick={()=>engine?.pickAge('army')}><h3>{hud.pendingAge.army.name}</h3><p>{hud.pendingAge.army.hint}</p></button></div>
    <button type="button" className="hw-btn-wide" onClick={()=>engine?.cancelAge()}>Wait</button></div></div></div>}
  {hud.ended&&<div className="hw-scrim"><div className="hw-screen hw-choice" role="dialog" aria-modal="true" aria-label={hud.ended==='win'?'Victory':'Defeat'}>
   <header className="hw-screen-head"><h1>{hud.ended==='win'?'Victory':'Defeat'}</h1></header><div className="hw-screen-body"><p className="hw-quote">{hud.endReason}</p><button type="button" className="hw-primary" onClick={()=>void lifecycle.run(()=>engine!.restart(undefined,21,true))}>Begin again</button></div></div></div>}
 </div>;
}
