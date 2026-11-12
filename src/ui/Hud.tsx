import {useLifecycleAction} from './useLifecycleAction';
import {VillageSaveButton} from './VillageSaveButton';
import {SiegeRamControls} from './SiegeRamControls';
import {SocietyFlag} from './SocietyFlag';
import {SocietyIdentityEditor} from './SocietyIdentityEditor';
import {TradeProposal} from './TradeProposal';
import {tradeJourney} from '../game/caravans';
import {WaterReachPanel} from './WaterReachPanel';
import {SeasonReport} from './SeasonReport';
import { ResidentInventory } from './ResidentInventory';
import { VillageAlerts } from './VillageAlerts';
import { VillageHistory } from './VillageHistory';
import {HousingControls} from './HousingControls';
import {housingAdoptionIssue,HOUSING_RULES} from '../game/housing';
import{BuildingMaintenanceControls}from'./BuildingMaintenanceControls';
import {WorldSetup} from './WorldSetup';
import {VillageFileTransfer} from './VillageFileTransfer';
import{FarmToolRepairControls}from'./FarmToolRepairControls';
import {GameTooltip} from './GameTooltip';
import {GameDisclosure} from './GameDisclosure';
import {buildingHelp} from './buildingHelp';
import {ConstructionSiteControls,BuilderQueueControls} from './ConstructionQueueControls';
import {ExcavationControls,ExcavationReadout} from './ExcavationControls';
import {TowerPlatformControls,TowerPlatformReadout} from './TowerPlatformControls';
import {CraftingAndBuildings} from './CraftingAndBuildings';
import {ProductionControls} from './ProductionControls';
import {StorehouseInventory} from './StorehouseInventory';
import {GateRotationControl} from './GateRotationControl';
import {WorkloadPanel} from './WorkloadPanel';
import {NomadicCampControl} from './NomadicCampControl';
import {PerformanceReadout} from './PerformanceReadout';
import {DIFFICULTIES,difficultyEffects} from '../game/difficulty';
import {FarmingProgress} from './FarmingProgress';
import {ConflictControls} from './ConflictControls';
import {KnowledgePanel} from './KnowledgePanel';
import {PaidProjects} from './PaidProjects';
import {NeedsPanel} from './NeedsPanel';
import {HusbandryControls} from './HusbandryControls';
import {BoatControls} from './BoatControls';
import {CopperStudyControl} from './CopperStudyControl';
import {AgeReadiness} from './AgeReadiness';
import {WorldMinimap} from './WorldMinimap';
import {PlotControls} from './PlotControls';
import {expandablePlot} from '../game/plots';
import {beginPackTaming} from "@/game/packAnimals";
import {TestPanel} from "./TestPanel";
import {replantStand} from "@/game/cultivation";
import {guardFrontier} from "@/game/frontiers";
import {massRaid} from '@/game/massRaid';
import {staffQuarry} from "@/game/mining";
import {setGateMode} from "../game/fortifications";
import {FARM_TOOLS,farmToolRequirement,farmToolWorkplace} from "@/game/farmTools";
import {HAULAGE,haulageRequirement} from "@/game/haulage";
import {staffDock} from "@/game/fishing";
import { WEAPONS } from "@/game/warfare";
import { FoodStoreReadout, readyFoodStock } from "./FoodStoreReadout";
import { VisitingTrader } from "./VisitingTrader";
import { knownSettlement, reportedQuote, tradeCarrier } from "@/game/barter";
import { useEffect, useState, type ReactNode } from "react";
import {
  X,
  Pause,
  Play,
  FastForward,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  Home,
  Wheat,
  TreePine,
  Mountain,
  Users,
  Sword,
  Hammer,
  Warehouse,
  Shield,
  Landmark,
  GraduationCap,
  Castle,
  Church,
  Store,
  Pickaxe,
  Axe,
  Eye,
  PawPrint,
  Sun,
  Hand,
  Swords,
  Recycle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  Settings,
  BookOpen,
  ClipboardList,
  Droplets,
  Flame,
  Scissors,
  CookingPot,
  Package,
  Layers,
  Fish,
  Coins,
} from "lucide-react";
import type { Engine } from "@/game/engine";
import type { HudSnapshot, ResKind, TradeDeal } from "@/game/types";
import { AGES, BUILDINGS, BUILD_ORDER, UNITS } from "@/game/constants";
import { YEAR_SECONDS } from "@/game/settlement";

const BLD_ICON: Record<string, ReactNode> = {
  hearth: <Flame className="size-4" />, butcher: <Scissors className="size-4" />,
  dryrack: <Layers className="size-4" />, tanner: <Layers className="size-4" />, tailor: <Scissors className="size-4" />,
  potter: <CookingPot className="size-4" />, kiln: <Flame className="size-4" />, fibreWorkshop: <Package className="size-4" />,
  hut: <Home className="size-4" />, house: <Home className="size-4" />,
  cornerstone: <Compass className="size-4" />,
  townhall: <Landmark className="size-4" />,
  smokehouse: <Fish className="size-4" />,
  threshingFloor: <Wheat className="size-4" />, grindingStone: <Wheat className="size-4" />, oven: <Wheat className="size-4" />,
  farm: <Wheat className="size-4" />,
  lumber: <Axe className="size-4" />,
  quarry: <Pickaxe className="size-4" />,
  dock: <Fish className="size-4" />,
  bridge: <Hammer className="size-4" />,
  warehouse: <Warehouse className="size-4" />,
  barracks: <Shield className="size-4" />,
  palisade: <Shield className="size-4" />, gate: <Castle className="size-4" />, stonewall: <Castle className="size-4" />, trench: <Hammer className="size-4" />, moat: <Shield className="size-4" />,
  workshop: <Hammer className="size-4" />,
  forge: <Hammer className="size-4" />,
  watchtower: <Eye className="size-4" />,
  temple: <Church className="size-4" />,
  market: <Store className="size-4" />,
  keep: <Castle className="size-4" />,
  pen: <PawPrint className="size-4" />,
  stables: <PawPrint className="size-4" />,
  university: <GraduationCap className="size-4" />,
};

function resWord(k: ResKind) {
  if (k === "food") return "food";
  if (k === "wood") return "logs";
  if (k === "copper") return "copper";
  if (k === "iron") return "iron";
  return "stone";
}

export function Hud({ hud, engine }: { hud: HudSnapshot; engine: Engine | null }) {
  const lifecycle=useLifecycleAction(engine);
  const compact = () => false;
  const [interfaceHidden,setInterfaceHidden]=useState(false);
  const [selMin, setSelMin] = useState(true);
  const [clockMin, setClockMin] = useState(true);
  const [buildMin, setBuildMin] = useState(compact);
  const [mapMin, setMapMin] = useState(compact);
  const [toolsMin,setToolsMin]=useState(true);
  const [statusPane,setStatusPane]=useState<"stores"|"work"|"food"|"craft"|"camp"|null>(null);
  const [testOpen,setTestOpen]=useState(false);
  const [buildTab,setBuildTab]=useState("Village");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [tradeOpen,setTradeOpen]=useState<number|null>(null);
  useEffect(()=>{
    if(tradeOpen===null)return;
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.querySelector<HTMLElement>('[data-trade-dialog]');
    dialog?.querySelector<HTMLElement>('button,input,select')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setTradeOpen(null);return;}
      if(e.key!=='Tab'||!dialog)return;
      const choices=Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]')).filter(node=>node.getClientRects().length>0);
      const first=choices[0],last=choices.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown',key,true);
    return()=>{window.removeEventListener('keydown',key,true);previous?.focus();};
  },[tradeOpen]);
  useEffect(() => {
    if (hud.selection.kind !== "none") setSelMin(false);
  }, [hud.selection.kind, hud.selection.name]);
  if (!hud.started || hud.awaitingStart) return null;
  if(interfaceHidden)return <button className="fixed bottom-3 right-3 z-50 hud-panel rounded-xl px-3 py-2" onClick={()=>setInterfaceHidden(false)}>Restore interface</button>;
  const sel = hud.selection;
  const hpPct = sel.maxHp > 0 ? Math.round((100 * sel.hp) / sel.maxHp) : 0;
  const weatherBits = hud.weather.split(" · ");
  const weatherName = weatherBits[0] || hud.weather;
  const weatherTemp = weatherBits[1] || "";
  const showJobs = !selMin && hud.workerSelected > 0;
  const showFight = !selMin && (hud.militarySelected > 0 || hud.workerSelected > 0);
  const speed = hud.speed >= 3 ? 4 : hud.speed === 2 ? 2 : 1;
  const founding = hud.founding;
  const rate = hud.port ? 3 : 4;
  const readyFood = Math.floor(readyFoodStock(hud));
  const stocks = (
    [
      ["food", hud.food],
      ["wood", hud.wood],
      ["stone", hud.stone],
    ] as const
  ).slice();
  const rich = stocks.filter(([, n]) => n >= rate).sort((a, b) => b[1] - a[1])[0];
  const poor = rich
    ? stocks.filter(([k]) => k !== rich[0]).sort((a, b) => a[1] - b[1])[0]
    : null;
  const bank = rich && poor ? { give: rich[0], get: poor[0] } : null;

  return (
    <div className="hud-shell font-sans text-parchment">
      <div className="hud-res">
        <div className="hud-panel resource-strip">
          {engine&&<GameTooltip title={engine.game.tribe(0).name} description="Your community flag. Edit it in Camp or the village ledger."><span aria-label={`Community: ${engine.game.tribe(0).name}`}><SocietyFlag game={engine.game} team={0}/><span className="ml-1 hidden max-w-24 truncate text-xs xl:inline">{engine.game.tribe(0).name}</span></span></GameTooltip>}
          {[["Food",readyFood,<Wheat key="f"/>],["Logs",hud.wood,<TreePine key="w"/>],["Stone",hud.stone,<Mountain key="s"/>],["Water",`${Math.floor(engine?.game.tribe(0).survival?.waterLiters||0)} L`,<Droplets key="water"/>],["People",`${hud.pop}/${hud.popCap}`,<Users key="p"/>]].map(([label,value,icon])=><div className="resource-cell" key={String(label)} title={label==="Food"?"Food ready to eat · open Stores for raw supplies":String(label)}>{icon}<div><span>{label}</span><strong>{value}</strong></div></div>)}
          <button aria-label="Expand resource details" aria-expanded={statusPane==='stores'} onClick={()=>setStatusPane(v=>v==='stores'?null:'stores')}>{statusPane==='stores'?<ChevronUp/>:<ChevronDown/>}</button>
        </div>

        {statusPane&&engine&&!founding&&<div className="hud-status-drawer hud-panel" aria-label="Village details">
          <header><span>Village</span><button aria-label="Close village details" onClick={()=>setStatusPane(null)}><X size={14}/></button></header>
          <nav aria-label="Village detail tabs">{([['stores','Stores'],['work','Work'],['food','Food'],['craft','Craft'],['camp','Camp']] as const).map(([key,label])=><button key={key} aria-pressed={statusPane===key} onClick={()=>setStatusPane(key)}>{label}</button>)}</nav>
          {statusPane==='stores'&&<><div className="resource-details"><FoodStoreReadout stock={hud} items={engine.game.tribe(0).items}/>{(hud.age>=1||hud.copper>0||hud.iron>0)&&<p>Copper {hud.copper} · Iron {hud.iron}</p>}</div><NeedsPanel engine={engine} expanded/></>}{statusPane==='work'&&<WorkloadPanel engine={engine}/>} {statusPane==='food'&&<FarmingProgress engine={engine} onKnowledge={()=>{setStatusPane(null);setTechOpen(true);}}/>}{statusPane==='craft'&&<CraftingAndBuildings engine={engine}/>} {statusPane==='camp'&&<><NomadicCampControl engine={engine}/><SocietyIdentityEditor engine={engine}/></>}
        </div>}
        {!founding&&<div className="quick-actions compact-actions" aria-label="Village commands">
          <GameTooltip title="Village" description="Open residents, priorities and settlement details (L)."><button aria-label="Village" onClick={()=>{if(engine){engine.keyboard.ledger=true;engine.pushHud();}}}><Users/></button></GameTooltip>
          <GameTooltip title="Village history" description="Read the village’s recorded events.">
            <button type="button" aria-label="Village history" aria-expanded={historyOpen} onClick={()=>setHistoryOpen(open=>!open)}><ClipboardList/></button>
          </GameTooltip>
          <GameTooltip title={engine?.game.state.autoWorkEnabled===false?'Enable Auto work':'Pause Auto work'} description="Village-wide Auto work. Available residents follow village priorities; direct orders and paid work stay protected."><button className="village-auto-work" aria-label="Auto work" aria-pressed={engine?.game.state.autoWorkEnabled!==false} onClick={()=>{if(engine){engine.game.setAutoWork(engine.game.state.autoWorkEnabled===false);engine.pushHud();}}}><Hammer/><span>Auto work: {engine?.game.state.autoWorkEnabled===false?'Off':'On'}</span></button></GameTooltip>
          <GameTooltip title="Workload" description="See planned work, capacity and blocked tasks."><button aria-label="Workload" aria-pressed={statusPane==='work'} onClick={()=>setStatusPane(v=>v==='work'?null:'work')}><ClipboardList/></button></GameTooltip>
          <GameTooltip title="Mark trees" description="Drag over trees to mark them for felling (N)."><button aria-label="Mark trees" aria-pressed={!!engine?.loggingMode} onClick={()=>engine?.toggleLogging()}><TreePine/></button></GameTooltip>
          <GameTooltip title="Home" description="Return the camera to your settlement (F)."><button aria-label="Home" onClick={()=>engine?.focusHome()}><Home/></button></GameTooltip>
          <GameTooltip title="Defense horn" description="Call nearby adults to take up their available weapons."><button aria-label="Defense horn" onClick={()=>{engine?.game.soundDefenseHorn();engine?.pushHud();}}><Shield/></button></GameTooltip>
          <GameTooltip title="Recall" description="Call people home (V)."><button aria-label="Recall" onClick={()=>{engine?.game.soundRecall();engine?.pushHud();}}><Compass/></button></GameTooltip>
          <GameTooltip title="Knowledge" description={hud.objective}><button aria-label="Knowledge" onClick={()=>setTechOpen(v=>!v)}><BookOpen/></button></GameTooltip>
        </div>}

      </div>
      {testOpen&&engine&&<TestPanel engine={engine} close={()=>setTestOpen(false)}/>}
      <div className="hud-clock">
        {founding ? null : (
        <div className="hud-panel rounded-xl p-2 text-xs">
          <button type="button" aria-expanded={!toolsMin} aria-controls="village-controls" className="flex w-full items-center justify-between px-2 py-1.5" onClick={()=>setToolsMin(v=>!v)}>
            <Settings aria-hidden="true" className="size-3.5"/><span>Menu</span> {toolsMin?<ChevronDown className="size-4"/>:<ChevronUp className="size-4"/>}
          </button>
          {!toolsMin&&<div id="village-controls" className="flex flex-wrap gap-2">
          {engine&&<PerformanceReadout engine={engine}/>}
          {engine&&<p className="px-2 py-2 select-text">World seed {engine.game.state.seed} · generation {engine.game.state.worldgenVersion??1}</p>}
          <p className="px-2 py-2 text-xs" title={difficultyEffects(engine?.game.state.difficulty??'normal')}>Difficulty: {DIFFICULTIES[engine?.game.state.difficulty??'normal'].name} · {DIFFICULTIES[engine?.game.state.difficulty??'normal'].description}</p>
          <label className="px-2 py-2">Graphics <select aria-label="Graphics quality" value={hud.quality} onChange={e=>{engine?.setQuality(e.target.value as 'low'|'med'|'high');engine?.pushHud();}}><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select></label>
          <label className="px-2 py-2"><input type="checkbox" checked={!!engine?.view.shadowsEnabled} onChange={e=>{if(engine){engine.view.shadowsEnabled=e.target.checked;engine.setQuality(engine.game.quality);engine.pushHud();}}}/> Shadows</label>
          <label className="px-2 py-2"><input type="checkbox" checked={!!engine?.view.unitRingsEnabled} onChange={e=>{if(engine){engine.view.unitRingsEnabled=e.target.checked;engine.pushHud();}}}/> Selected person circles</label>
          <button className="px-2 py-2" disabled={!engine||lifecycle.busy} onClick={()=>void lifecycle.run(()=>engine!.startTestSession(),opened=>{if(opened)setTestOpen(true);})}>Test lab</button>
          <button className="px-2 py-2" onClick={()=>setInterfaceHidden(true)} aria-label="Minimize game interface">Hide interface</button>
          <button
            className="px-2 py-2"
            onClick={() => {
              if (engine) {
                engine.keyboard.help = true;
                engine.pushHud();
              }
            }}
          >
            Controls & music · H
          </button>
          <button
            className="px-2 py-2"
            onClick={() => {
              if (engine) {
                engine.keyboard.ledger = true;
                engine.pushHud();
              }
            }}
          >
            Village · L
          </button>
            <button type="button" aria-pressed={!!engine?.loggingMode}
              className="text-[11px] text-parchment hover:text-bronze-bright"
              onClick={() => engine?.toggleLogging()}>
              {engine?.loggingMode ? "Finish tree marks · N" : "Mark trees · N"}
            </button>
          <button className="px-2 py-2" onClick={() => engine?.focusHome()}>
            Focus village · F
          </button>
          <VillageSaveButton engine={engine}/>
          <VillageFileTransfer engine={engine}/>
          {lifecycle.error&&<p role="status" className="text-xs">{lifecycle.error}</p>}
          {engine&&<details className="hud-world-setup"><summary className="px-2 py-2 cursor-pointer">New world</summary><WorldSetup engine={engine}/></details>}
          <button className="px-2 py-2" onClick={()=>{engine?.game.soundDefenseHorn();engine?.pushHud();}}>Defense horn · arm the village</button>
          <button className="px-2 py-2" onClick={()=>{engine?.game.soundRecall();engine?.pushHud();}}>Recall horn · V</button>
          <button className="px-2 py-2" title="Plan a bridge on explored banks for recalled or loaded residents cut off by water. Requires materials and builders." onClick={()=>{engine?.game.planReturnCrossing();engine?.pushHud();}}>Plan return crossing</button>
          <button className="px-2 py-2" disabled={!engine||lifecycle.busy} onClick={() => void lifecycle.run(()=>engine!.resumeSaved())}>
            Load
          </button>
          <button className="px-2 py-2" disabled={!engine||lifecycle.busy||engine.game.testMode} title="Restore the last protected village; save the current run first." onClick={() => void lifecycle.run(()=>engine!.resumeSaved(true))}>
            Restore checkpoint
          </button>
          </div>}
        </div>
        )}
        <div className="hud-panel game-clock rounded-xl px-3 py-2 text-right">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-end gap-1.5">
                <Sun className="size-3.5 text-bronze-bright" />
                <div className="font-display text-lg leading-none tracking-wide text-bronze-bright">
                  {hud.period}
                </div>
              </div>
              <div className="mt-1 text-xs text-parchment-dim tabular">
                {hud.clock}{" "}
                <span className="text-parchment-dim/70">
                  (Year {Math.floor(hud.time / YEAR_SECONDS) + 1})
                </span>
                {speed > 1 ? <span className="ml-1 text-bronze-bright">{speed}×</span> : null}
              </div>
              {!clockMin ? (
                <>
                  <div className="mt-0.5 font-display text-sm text-bronze">{hud.season}</div>
                  <div className="mt-1 text-[10px] text-parchment-dim tabular" title="Local solar time at 45° north">{hud.daylight}</div>
                  <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px] text-parchment-dim/85">
                    <span className="tabular">{weatherTemp}</span>
                    <span>{weatherName}</span>
                  </div>
                  <div className="mt-2 font-display text-sm text-bronze">{hud.ages[hud.age]}</div>
                </>
              ) : (
                <div className="mt-0.5 text-[11px] text-bronze">{hud.season}</div>
              )}
            </div>
            <MinToggle open={!clockMin} onClick={() => setClockMin((v) => !v)} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 clock-playback">
            <IconBtn
              active={hud.paused}
              title={hud.paused ? "Resume" : "Pause"}
              onClick={() => engine?.setPaused(!hud.paused)}
            >
              <Pause className="size-3.5" />
            </IconBtn>
            <IconBtn
              active={!hud.paused && speed === 1}
              title="1×"
              onClick={() => engine?.setSpeed(1)}
            >
              <Play className="size-3.5" />
            </IconBtn>
            <IconBtn
              active={!hud.paused && speed === 2}
              title="2× — the day runs twice as fast"
              onClick={() => engine?.setSpeed(2)}
            >
              <FastForward className="size-3.5" />
            </IconBtn>
            <IconBtn
              active={!hud.paused && speed === 4}
              title="4× — skip through the day"
              onClick={() => engine?.setSpeed(4)}
            >
              <span className="text-[10px] font-semibold">4×</span>
            </IconBtn>
          </div>
            {!clockMin ? (
              <div className="mt-1 flex justify-end gap-1 clock-audio">
                <IconBtn title={hud.muted ? "Unmute" : "Mute"} onClick={() => engine?.toggleMute()}>
                  {hud.muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </IconBtn>
                <IconBtn title="Skip music" onClick={()=>{engine?.audio.score.skip();engine?.pushHud();}}><SkipForward className="size-3.5"/></IconBtn>
                <IconBtn title="Restart" onClick={() => void lifecycle.run(()=>engine!.restart())}>
                  <RotateCcw className="size-3.5" />
                </IconBtn>
              </div>
            ) : null}
        </div>
        {!clockMin && !founding ? (
          <>
            {hud.nextAge ? (
              <button
                type="button"
                disabled={!hud.canAge || hud.paused || !!hud.ended}
                onClick={() => engine?.ageUp()}
                className="hud-panel w-full rounded-xl px-3 py-2 text-xs font-medium text-bronze-bright hover:bg-ink-soft"
              >
                {hud.canAge ? "Advance to" : "Preparing for"} {hud.nextAge}
                {hud.ageIssue ? <span className="mt-1 block text-[11px] font-normal text-parchment">{hud.ageIssue}</span> : null}
                {hud.ageCost ? (
                  <span className="mt-0.5 block text-[10px] font-normal text-parchment">
                    Reserves kept · {hud.ageCost.food ?? 0} food · {hud.ageCost.wood ?? 0} logs · {hud.ageCost.stone ?? 0}{" "}
                    stone
                    {hud.ageCost.pop ? ` · ${hud.ageCost.pop} people` : ""}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTechOpen((v) => !v)}
              className="hud-panel w-full rounded-xl px-3 py-1.5 text-[11px] text-parchment hover:bg-ink-soft"
            >
              {techOpen ? "Hide the ages" : `${AGES[hud.age]} Age · what you can raise`}
            </button>
          </>
        ) : null}
      </div>

      {historyOpen && engine && <VillageHistory engine={engine} close={()=>setHistoryOpen(false)}/>}
      <div className="hud-banner">
        {engine && <VillageAlerts engine={engine}/>}
        {engine&&<SeasonReport game={engine.game} hidden={!!hud.placing}/>}
        {hud.placing ? (
          <div className="hud-toast hud-placement" role="status">
            <div>
              <strong>{BUILDINGS[hud.placing].name}</strong>
              {hud.placing==='trench'&&engine&&<ExcavationControls engine={engine}/>}
              {hud.placing==='watchtower'&&engine&&<TowerPlatformControls engine={engine}/>}
              {hud.placing==='gate'&&engine&&<><GateRotationControl facing={engine.gateFacing} onChange={facing=>engine.setGateFacing(facing)}/><span className="text-xs text-parchment-dim">R rotates · Shift+R reverses</span></>}
              <div>{founding ? "Choose open ground near food and timber."
                : hud.placing === "bridge" ? "Drag bank to bank · 5–28 m · Esc cancels"
                : ["palisade","stonewall","trench","moat"].includes(hud.placing) ? "Drag a joined line · leave space for a gate"
                : ["farm","warehouse","pen"].includes(hud.placing) ? "Drag to size · [ ] width · Shift+[ ] depth"
                : "Click to build or plan · Esc cancels"}</div>
              {hud.placeIssue ? <div className="text-blood">{hud.placeIssue}</div> : hud.plotSummary ? <div className="text-ok">{hud.plotSummary}</div> : hud.banner ? <div>{hud.banner}</div> : null}
            </div>
            <button type="button" aria-label="Cancel building placement" title="Cancel · Escape" onClick={()=>engine?.setPlacing(null)}><X className="size-4" /></button>
          </div>
        ) : hud.banner ? (
          <div className="hud-toast">{hud.banner}</div>
        ) : null}
      </div>

      {hud.paused && !hud.ended && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="font-display text-2xl tracking-[0.4em] text-bronze-bright">PAUSED</div>
        </div>
      )}

      {hud.pendingAge ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-ink/55 px-4">
          <div className="hud-panel w-full max-w-md rounded-2xl p-5">
            <div className="font-display text-xl text-bronze-bright">
              Enter the {hud.pendingAge.next} Age
            </div>
            <p className="mt-1 text-xs text-parchment-dim">
              Pick one. The other is gone this play.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => engine?.pickAge("econ")}
                className="rounded-xl border border-ok/40 bg-ink-soft px-3 py-3 text-left hover:border-ok"
              >
                <div className="font-display text-sm text-ok">{hud.pendingAge.econ.name}</div>
                <div className="mt-1 text-[11px] text-parchment-dim">
                  {hud.pendingAge.econ.hint}
                </div>
              </button>
              <button
                type="button"
                onClick={() => engine?.pickAge("army")}
                className="rounded-xl border border-blood/40 bg-ink-soft px-3 py-3 text-left hover:border-blood"
              >
                <div className="font-display text-sm text-blood">{hud.pendingAge.army.name}</div>
                <div className="mt-1 text-[11px] text-parchment-dim">
                  {hud.pendingAge.army.hint}
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => engine?.cancelAge()}
              className="mt-3 w-full text-[11px] text-parchment-dim hover:text-parchment"
            >
              Wait
            </button>
          </div>
        </div>
      ) : null}

      {engine && <VisitingTrader engine={engine}/>}
      {hud.routeOffer && !hud.pendingAge && !founding ? (
        <div className="pointer-events-none absolute bottom-28 right-4 z-20 flex max-w-[calc(100%-2rem)] justify-end">
          <div className="hud-panel pointer-events-auto w-full max-w-xs rounded-xl px-3 py-2">
            <p className="text-[12px] leading-snug text-parchment">
              {hud.routeOffer.rival}: {hud.routeOffer.giveAmt} {resWord(hud.routeOffer.give)} for{" "}
              {hud.routeOffer.getAmt} {resWord(hud.routeOffer.get)}.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => engine?.acceptRoute()}
                className="min-h-8 flex-1 rounded-md border border-ok/40 bg-ink-soft text-[11px] text-ok hover:border-ok"
              >
                Take it
              </button>
              <button
                type="button"
                onClick={() => engine?.declineRoute()}
                className="min-h-8 rounded-md border border-parchment/20 px-3 text-[11px] text-parchment-dim hover:text-parchment"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {founding ? (
        <div className="hud-sel hud-panel rounded-xl p-3">
          <div className="font-display text-base text-bronze-bright">Plant the hall</div>
          <p className="mt-1 text-[12px] leading-snug text-parchment-dim">
            Beside a clump of berries or timber. The first one is free.
          </p>
        </div>
      ) : (
      <div className={`hud-sel hud-panel rounded-xl p-2.5 w-full ${sel.kind==='none'?'selection-empty':''}`} style={sel.kind==='boat'?{maxHeight:'min(60vh, 420px)'}:undefined}>
        <div className="selection-header flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl leading-tight text-bronze-bright">
              {sel.name}
            </div>
          </div>
          {sel.kind !== "none" && <button type="button" title="Deselect · Escape" aria-label="Deselect"
            onClick={() => engine?.clearSelection()}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40">
            <X className="size-4" />
          </button>}
          <button
            type="button"
            title={selMin ? "Expand" : "Minimize"}
            onClick={() => setSelMin((v) => !v)}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
          >
            {selMin ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
            {!selMin&&sel.kind!=='boat'&&sel.type!=='waterReach' ? (
              <details className="selection-info mt-1"><summary>Details</summary><p>{sel.info}</p></details>
            ) : null}
        {sel.kind==='building'&&sel.type==='townhall'&&sel.team!==0&&sel.buildingId&&<div className="mt-2">
          <button type="button" className="min-h-11 w-full rounded-md border border-bronze/40 px-3 py-2 text-left" onClick={()=>{if(engine){massRaid(engine.game,sel.buildingId!);engine.pushHud();}}}>Mass raid · send all armed residents</button>
          {!selMin&&<p className="text-xs text-parchment-dim">Carriers unload first. Unarmed workers stay home. Civilian militia return to work when their raid ends.</p>}
        </div>}
        {!selMin&&engine&&sel.kind!=='none'&&sel.kind!=='boat'&&sel.type!=='waterReach'&&<GameDisclosure label="Contact & orders"><ConflictControls engine={engine}/></GameDisclosure>}
        {!selMin&&engine&&sel.kind!=='none'&&sel.kind!=='boat'&&sel.type!=='waterReach'&&(sel.kind==='building'?<ProductionControls engine={engine}/>:<GameDisclosure label="Equipment & gathering"><ProductionControls engine={engine}/></GameDisclosure>)}
        {!selMin&&engine&&sel.kind!=='none'&&<SiegeRamControls engine={engine}/>}
        {!selMin && engine && sel.kind==='unit' && sel.team===0 &&
          <GameDisclosure label="Inventory & activity"><ResidentInventory game={engine.game} residents={engine.game.selectedUnits().filter(u=>u.team===0)}/></GameDisclosure>}
        {!selMin&&engine&&sel.kind==='building'&&sel.team===0&&sel.type==='warehouse'&&<GameDisclosure label="Inventory"><StorehouseInventory engine={engine}/></GameDisclosure>}
        {sel.type==='waterReach' ? (!selMin&&engine?.game.selectedWaterReach&&
          <WaterReachPanel engine={engine} reach={engine.game.selectedWaterReach}/>) : selMin ? (
          sel.kind !== "none" ? (
            <div className="mt-1.5 h-1 rounded-full bg-ink overflow-hidden border border-parchment/10">
              <div className="h-full rounded-full bg-ok" style={{ width: `${hpPct}%` }} />
            </div>
          ) : null
        ) : (
          <>
            {sel.carry ? <div className="text-[11px] text-dawn mt-1">{sel.carry}</div> : null}
            {sel.kind !== "none" ? (
              <>
                <div className="mt-1.5 text-[11px] text-parchment-dim">{sel.kind==="resource"&&sel.type==="fish"?`${sel.hp} / ${sel.maxHp} fish`:`Condition ${hpPct}%`}</div>
                <div className="mt-1 h-1.5 rounded-full bg-ink overflow-hidden border border-parchment/10">
                  <div className="h-full rounded-full bg-ok" style={{ width: `${hpPct}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] leading-snug text-parchment-dim">
                People join through birth or migration. Select adults to drill; right-click an enemy to fight.
              </p>
            )}
            {sel.kind==="resource"&&sel.type==="tree"&&engine&&<button className="mt-2 min-h-11 rounded-md border border-bronze/40 px-3" onClick={()=>{
              const tree=engine.game.selectedResource;
              if(tree?.kind==="tree"){engine.game.markChop([tree.id],false);engine.pushHud();}
            }}>Fell tree</button>}
            {sel.kind==='building'&&typeof sel.team==='number'&&sel.team!==0&&sel.team!==3&&engine&&knownSettlement(engine.game,sel.team)&&<button className="mt-2 min-h-9 rounded-md border border-bronze/40 px-3" onClick={()=>setTradeOpen(sel.team!)}>Offer trade</button>}
            {sel.kind === "building" && sel.team === 0 && (
              <div className="building-actions mt-2 flex flex-col gap-2">
                {sel.type==='trench'&&engine&&sel.buildingId&&<ExcavationReadout engine={engine} buildingId={sel.buildingId}/>}
                {sel.type==='watchtower'&&engine&&<TowerPlatformReadout engine={engine}/>}
                {sel.completed&&engine?.game.state.selBld&&expandablePlot(engine.game.state.selBld.type)&&<PlotControls game={engine.game} building={engine.game.state.selBld} refresh={()=>engine.pushHud()}/>}
                {!sel.completed&&engine?.game.state.selBld&&<button className="min-h-11 rounded-md border border-bronze/40 px-2" onClick={()=>{engine.game.orderConstruction(engine.game.state.selBld!);engine.pushHud();}}>Build now</button>}
                {engine&&sel.buildingId&&<HousingControls engine={engine} buildingId={sel.buildingId}/>}
                {engine&&sel.buildingId&&<BuildingMaintenanceControls engine={engine} buildingId={sel.buildingId}/>}
                {engine&&sel.buildingId&&<ConstructionSiteControls engine={engine} buildingId={sel.buildingId}/>}
                {sel.completed&&sel.type==="workshop"&&engine&&sel.buildingId&&<CopperStudyControl engine={engine} workplace={sel.buildingId}/>}
                {sel.completed&&sel.type==="dock"&&<GameTooltip title="Boat orders" description="Select a boat or its captain, then choose a reachable point on the water."><span className="text-xs text-parchment-dim">Boats &amp; fishing</span></GameTooltip>}
                {sel.completed&&["lumber","townhall"].includes(sel.type||"")&&<button onClick={()=>{if(engine&&sel.buildingId){replantStand(engine.game,sel.buildingId);engine.pushHud();}}}>Replant nearby trees · 1 seed basket each</button>}
                {sel.completed&&sel.type==="gate"&&<><p className="text-xs">Gate: {engine?.game.state.buildings.find(b=>b.id===sel.buildingId)?.gateMode||"auto"} · {engine?.game.state.buildings.find(b=>b.id===sel.buildingId)?.gateOpen?"open":"closed"}</p>{(["auto","open","closed"] as const).map(mode=><button key={mode} className="rounded-md border border-bronze/40 p-2 text-xs" onClick={()=>{const b=engine?.game.state.buildings.find(b=>b.id===sel.buildingId);if(engine&&b){setGateMode(engine.game,b,mode);engine.pushHud();}}}>{mode==="auto"?"Open in peace, close for enemies":mode==="open"?"Hold open":"Lock gate"}</button>)}</>}
                {sel.completed&&sel.type==="cornerstone"&&<button type="button" className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs" onClick={()=>{if(engine&&sel.buildingId){guardFrontier(engine.game,sel.buildingId);engine.pushHud();}}}>Post guards</button>}
                {sel.completed&&sel.type==="quarry"&&<button type="button" className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs" onClick={()=>{if(engine&&sel.buildingId){staffQuarry(engine.game,sel.buildingId);engine.pushHud();}}}>Mine stone</button>}
                {sel.completed&&sel.type==="quarry"&&(["copper","iron"] as const).map(kind=><button key={kind} type="button" className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs" onClick={()=>{if(engine&&sel.buildingId){staffQuarry(engine.game,sel.buildingId,kind);engine.pushHud();}}}>Mine exposed {kind}</button>)}
                {sel.completed&&sel.type==='pen'&&engine&&<HusbandryControls engine={engine} pen={sel.buildingId!}/>}
                {sel.completed&&sel.type==='dock'&&engine&&<BoatControls engine={engine} dock={sel.buildingId}/>}
                {sel.completed&&sel.type==="townhall"&&engine&&<button type="button"
                  className="min-h-10 rounded-md border border-bronze/40 px-2 py-2 text-left text-xs disabled:opacity-40"
                  disabled={!engine.game.state.units.some(u=>u.team===0&&u.hp>0&&u.militia&&!u.prisoner)}
                  onClick={()=>engine.standDown()}>Stand down militia</button>}
                {sel.completed&&sel.type==="dock"&&<button type="button" className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs" onClick={()=>{if(engine&&sel.buildingId){staffDock(engine.game,sel.buildingId);engine.pushHud();}}}>Assign 2 fishers</button>}
                {sel.completed&&["townhall","workshop","dock"].includes(sel.type||"")&&<details className="craft-group" key={`transport-${sel.buildingId}`} open={sel.type==="dock"}><summary>Transport</summary><div className="craft-options">
                {engine&&sel.buildingId&&sel.completed&&sel.team===0&&["townhall","workshop","dock"].includes(sel.type||"")&&<PaidProjects engine={engine} workplaceId={sel.buildingId}/>}
                {sel.completed&&["townhall","workshop"].includes(sel.type||"")&&<button className="rounded-md border border-bronze/40 p-2 text-left text-xs" onClick={()=>{if(engine&&sel.buildingId){beginPackTaming(engine.game,sel.buildingId);engine.pushHud();}}}>Tame pack goat · 10 food + 2 logs</button>}
                {sel.completed&&["townhall","workshop","dock"].includes(sel.type||"")&&Object.entries(HAULAGE).filter(([kind])=>kind==="pack"?false:kind==="canoe"?sel.type==="dock":sel.type!=="dock"&&(kind==="sled"||sel.type==="workshop")).map(([kind,h])=>{
                  const issue=engine?haulageRequirement(engine.game,kind as keyof typeof HAULAGE):null;
                  return <div key={kind}><button type="button" className="w-full rounded-md border border-bronze/40 px-2 py-2 text-left text-xs disabled:opacity-40" disabled={!!issue||hud.wood<h.wood||hud.stone<h.stone||!!hud.ended} onClick={()=>engine?.craftHaulage(kind as keyof typeof HAULAGE,sel.buildingId)}>
                    <strong>{h.name}</strong><span>{h.wood} logs · {h.stone} stone · ×{h.capacity} load</span>
                  </button>{issue&&<p className="text-[11px] text-parchment-dim">{issue}</p>}</div>;
                })}
                </div></details>}
                {sel.completed&&["hearth","townhall","workshop","forge"].includes(sel.type||"")&&<details className="craft-group" key={`tools-${sel.buildingId}`}><summary>Farm tools</summary><div className="craft-options">
                {sel.completed&&Object.entries(FARM_TOOLS).filter(([kind])=>!!sel.type&&farmToolWorkplace(kind as keyof typeof FARM_TOOLS,sel.type,!!engine?.game.tribe(0).copperExperiment)).map(([kind,f])=>{
                  const issue=engine?farmToolRequirement(engine.game,kind as keyof typeof FARM_TOOLS):null;
                  return <div key={kind}><button type="button" className="w-full rounded-md border border-bronze/40 px-2 py-2 text-left text-xs disabled:opacity-40" disabled={!!issue||hud.wood<f.wood||hud.stone<f.stone||hud.copper<f.copper||hud.iron<f.iron||!!hud.ended} onClick={()=>engine?.craftFarmTool(kind as keyof typeof FARM_TOOLS,sel.buildingId)}>
                    <strong>{f.name}</strong><span>{f.wood} logs{f.stone?` · ${f.stone} stone`:""}{f.copper?` · ${f.copper} copper`:""}{f.iron?` · ${f.iron} iron`:""} · +{Math.round((f.harvest-1)*100)}% harvest</span>
                  </button>{issue&&<p className="text-[11px] text-parchment-dim">{issue}</p>}</div>;
                })}
                {engine&&<FarmToolRepairControls engine={engine} workplaceId={sel.buildingId}/>}
                </div></details>}
                {sel.completed&&["townhall","workshop","forge","barracks"].includes(sel.type||"")&&<details className="craft-group" key={`weapons-${sel.buildingId}`} open={sel.type==="barracks"}><summary>Weapons</summary><div className="craft-options">
                {sel.completed&&Object.entries(WEAPONS).filter(([kind])=>kind==="blade"?sel.type==="forge":["townhall","barracks","workshop"].includes(sel.type||"")).map(([kind,w])=>(
                  <button key={kind} type="button" className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs disabled:opacity-40" disabled={hud.age<w.age||hud.wood<w.wood||hud.stone<w.stone||hud.copper<w.copper||!!hud.ended} onClick={()=>engine?.craftWeapon(kind as keyof typeof WEAPONS,sel.buildingId)}>
                    <strong>{w.name}</strong><span>{w.wood} logs{w.stone?` · ${w.stone} stone`:""}{w.copper?` · ${w.copper} copper`:""} · {w.seconds*(sel.type==="townhall"?3:sel.type==="barracks"?2:1)}s</span>
                  </button>
                ))}
                {sel.completed&&["townhall","barracks","workshop"].includes(sel.type||"")?<button className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs" onClick={()=>engine?.callToArms()}>Arm villagers</button>:null}
                </div></details>}
                {hud.trainOptions
                  .filter((option) => UNITS[option.type].from === sel.type)
                  .map((option) => (
                    <button
                      key={option.type}
                      className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs disabled:opacity-40"
                      disabled={hud.age < option.age || !!hud.ended}
                      onClick={() => engine?.train(option.type)}
                    >
                      Equip adult as {option.name} · {option.cost.food || 0} food
                      {option.cost.wood ? ` · ${option.cost.wood} logs` : ""}
                      {hud.age < option.age ? " · later age required" : ""}
                    </button>
                  ))}
                {sel.queue && <p className="text-xs">Queue: {sel.queue}</p>}

              </div>
            )}
            {sel.canRecycle ? (
              <button
                type="button"
                onClick={() => engine?.recycle()}
                className="mt-1.5 min-h-8 w-full rounded-md border border-parchment/25 bg-ink-soft px-2 text-[11px] text-parchment hover:border-bronze"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Recycle className="size-3.5" />
                  {sel.planned ? "Cancel plan" : "Recycle building"}
                </span>
              </button>
            ) : null}
            {(sel.kind === "unit" || hud.workerSelected > 0 || hud.militarySelected > 0) && <div className="mt-1.5 flex gap-1">
              <button className="min-h-8 flex-1" aria-label="Previous villager" title="Previous villager (Shift+,)" onClick={()=>engine?.cycleVillager(-1)}>←</button>
              <button className="min-h-8 flex-1" aria-label="Next villager" title="Next villager (,)" onClick={()=>engine?.cycleVillager(1)}>→</button>
            </div>}
            {hud.idleWorkers > 0&&sel.kind!=='boat' ? (
              <button
                type="button"
                onClick={() => engine?.focusIdle()}
                className="mt-1.5 min-h-8 w-full rounded-md border border-bronze/30 bg-ink-soft px-2 text-[11px] text-bronze-bright hover:border-bronze"
              >
                {hud.idleWorkers} idle · cycle to them (I)
              </button>
            ) : null}
            {engine&&!selMin&&sel.kind!=='building'&&<BuilderQueueControls engine={engine}/>}
            {engine&&!selMin&&sel.kind!=='building'&&<BoatControls engine={engine}/>}
            {showJobs ? (
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                <JobBtn
                  active={hud.job === "food"}
                  label="Food"
                  title="Gather berries and fish"
                  onClick={() => engine?.assignJob("food")}
                >
                  <Wheat className="size-3.5 text-blood" />
                </JobBtn>
                <JobBtn
                  active={hud.job === "wood"}
                  label="Logs"
                  title="Cut logs"
                  onClick={() => engine?.assignJob("wood")}
                >
                  <TreePine className="size-3.5 text-ok" />
                </JobBtn>
                <JobBtn
                  active={hud.job === "stone"}
                  label="Stone"
                  title="Quarry stone"
                  onClick={() => engine?.assignJob("stone")}
                >
                  <Mountain className="size-3.5 text-parchment-dim" />
                </JobBtn>
                {(hud.age >= 1||engine?.game.state.copper.some(n=>n.amount>0&&engine.game.exploredAt(n.x,n.z))) ? (
                  <JobBtn
                    active={hud.job === "copper"}
                    label="Copper"
                    title="Gather discovered copper for tools and experiments"
                    onClick={() => engine?.assignJob("copper")}
                  >
                    <Coins className="size-3.5 text-bronze" />
                  </JobBtn>
                ) : null}
                {hud.age >= 2 ? (
                  <JobBtn
                    active={hud.job === "iron"}
                    label="Iron"
                    title="Gather iron (Iron Age)"
                    onClick={() => engine?.assignJob("iron")}
                  >
                    <Mountain className="size-3.5 text-parchment" />
                  </JobBtn>
                ) : null}
                <JobBtn
                  active={hud.job === "hunt"}
                  label="Hunt"
                  title="Hunt deer, boar, and goats for food"
                  onClick={() => engine?.assignJob("hunt")}
                >
                  <PawPrint className="size-3.5 text-blood" />
                </JobBtn>
                {hud.age >= 1 && <JobBtn
                  active={hud.job === "drill"}
                  label="Drill"
                  title="Practice at a completed barracks: improves this adult’s combat skill and takes time away from work."
                  onClick={() => engine?.assignJob("drill")}
                >
                  <Sword className="size-3.5 text-bronze" />
                </JobBtn>}
                <JobBtn active={false} label="Auto work" title="Enable village-wide Auto work and release the selected workers’ job locks" onClick={() => engine?.assignJob("auto")}>
                  <Play className="size-3.5 text-parchment" />
                </JobBtn>
                <JobBtn
                  active={false}
                  label="Rest"
                  title="Recover fatigue, then automatically resume village work"
                  onClick={() => engine?.assignJob("rest")}
                >
                  <Hand className="size-3.5 text-parchment-dim" />
                </JobBtn>
              </div>
            ) : null}
            {hud.militiaSelected>0 && hud.workerSelected===0 && <button type="button"
              className="mt-2 min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-2 text-sm"
              title="Armed villagers hunt with their spears or bows, butcher the catch and carry meat home"
              onClick={()=>engine?.assignJob("hunt")}>Hunt with weapons</button>}
            {sel.kind!=='boat'&&(hud.workerSelected > 0 || hud.idleWorkers > 0 || sel.kind === "none") ? (
              <button
                type="button"
                title="Keep scouting unknown ground until stopped, blocked or threatened. Select scouts and press period to stop. (X)"
                onClick={() => engine?.explore()}
                className="mt-1.5 flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dawn/30 bg-ink-soft px-2 text-[11px] text-dawn hover:border-dawn"
              >
                <Compass className="size-3.5" />
                Explore (X)
              </button>
            ) : null}
            {showFight && hud.workerSelected>0 ? <button className="mt-2 min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-2 text-sm" onClick={()=>engine?.callToArms()}>Arm selected adults · {hud.spears+hud.bows+hud.blades} weapons</button> : null}
            {showFight ? (
              <div className="mt-1.5 flex gap-1">
                <button
                  type="button"
                  title={
                    hud.raidName
                      ? `Raid ${hud.raidName} with the selected adults. Move or stop to withdraw.`
                      : "Explore a rival settlement and select adults with empty hands to raid."
                  }
                  onClick={() => engine?.raidRival()}
                  className="flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-blood/40 bg-ink-soft px-2 py-1.5 text-[11px] text-parchment hover:border-blood"
                >
                  <Swords className="size-3.5 text-blood" />
                  {hud.raidName ? `Pillage ${hud.raidName}` : "Pillage camp"}
                </button>
                <button
                  type="button"
                  title="Halt"
                  onClick={() => engine?.halt()}
                  className="min-h-8 rounded-md border border-parchment/20 bg-ink-soft px-2 py-1.5 text-[11px] text-parchment hover:border-bronze/40"
                >
                  Halt
                </button>
              </div>
            ) : null}
            {sel.kind === "none" ? (
              <div className="hud-trade-mobile mt-1.5">
                <TradeBlock hud={hud} engine={engine} onOffer={setTradeOpen} />
              </div>
            ) : null}
          </>
        )}
      </div>
      )}

      {founding ? null : (
      <div className="hud-build hud-panel rounded-xl p-2 flex gap-1.5 items-center">
        {buildMin ? (
          <button
            type="button"
            onClick={() => setBuildMin(false)}
            className="flex min-h-8 flex-1 items-center px-2 text-[11px] text-parchment-dim hover:text-parchment"
          >
            {AGES[hud.age]} buildings
          </button>
        ) : (
          <div><div className="build-tabs" role="tablist" aria-label="Building categories">{["Village","Food","Industry","Defense"].map(tab=><button key={tab} role="tab" aria-selected={buildTab===tab} onClick={()=>setBuildTab(tab)}>{tab}</button>)}</div><div className="hud-build-row">
            {hud.buildOptions.map((b, i) => {
              const category=["farm","pen","dock","grove","hearth","butcher","threshingFloor","grindingStone","oven","smokehouse"].includes(b.type)?"Food":["lumber","quarry","workshop","forge","stables","dryrack","tanner","tailor","potter","kiln","fibreWorkshop"].includes(b.type)?"Industry":["barracks","palisade","gate","stonewall","trench","moat","watchtower","keep"].includes(b.type)?"Defense":"Village";
              if(category!==buildTab)return null;
              const active = hud.placing === b.type;
              const homeIssue=b.type==='house'&&engine?housingAdoptionIssue(engine.game):null;
              const unaffordable =
                (engine?.game.tribe(0).seeds||0)<(b.cost.seeds||0) ||
                hud.wood < (b.cost.wood || 0) ||
                hud.stone < (b.cost.stone || 0) ||
                hud.food < (b.cost.food || 0) ||
                hud.copper < (b.cost.copper || 0) ||
                hud.iron < (b.cost.iron || 0);
              return (
                <GameTooltip key={b.type} title={b.type==='farm'?'Plant field':b.name} description={`${homeIssue||buildingHelp(b.type,b.hint)} ${b.type==='house'?`${HOUSING_RULES.plantFibre>0?`${HOUSING_RULES.plantFibre} plant fibre · `:''}${HOUSING_RULES.workSeconds}s actual work + hauling. `:''}${([['seeds','seeds'],['wood','logs'],['stone','stone'],['food','food'],['copper','copper'],['iron','iron']] as const).filter(([key])=>b.cost[key]).map(([key,label])=>`${b.cost[key]} ${label}`).join(' · ')}${unaffordable?' Supplies are not ready yet.':''}`}><button
                  key={b.type}
                  type="button"
                  disabled={!!hud.ended||!!homeIssue}
                  aria-label={b.type==='farm'?'Plant field':b.name}
                  onClick={() => engine?.setPlacing(b.type)}
                  className={`w-24 shrink-0 rounded-lg border px-2 py-2 text-center transition-colors ${
                    active
                      ? "border-bronze bg-bronze/20"
                      : "border-parchment/15 bg-ink-soft hover:border-bronze/40"
                  } ${unaffordable ? "border-dawn/30" : ""}`}
                >
                  <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-md bg-ink text-bronze">
                    {BLD_ICON[b.type] || <Landmark className="size-4" />}
                  </div>
                  <div className="text-sm font-medium leading-tight text-parchment">
                    {b.type==='farm'?'Plant field':shortName(b.name)}
                  </div>
                  <div className="build-tile-cost mt-1 text-xs leading-snug text-parchment tabular">
                    {([['seeds','seeds'],['wood','logs'],['stone','stone'],['copper','copper'],['iron','iron']] as const).filter(([key])=>b.cost[key]).map(([key,label])=>`${b.cost[key]} ${label}`).join(' · ')}{b.type==='house'&&HOUSING_RULES.plantFibre>0?` · ${HOUSING_RULES.plantFibre} fibre`:''}
                  </div>
                </button></GameTooltip>
              );
            })}
            {hud.trainOptions
              .filter((u) => buildTab==="Defense" && u.type !== "worker" && hud.age >= u.age)
              .map((u) => (
                <button
                  key={u.type}
                  type="button"
                  disabled={!!hud.ended}
                  title={`Equip an adult as a ${u.name}. Needs spare food. One fewer gatherer.`}
                  onClick={() => engine?.train(u.type)}
                  className="w-16 shrink-0 rounded-lg border border-parchment/15 bg-ink-soft px-1 py-1.5 text-center hover:border-bronze/40 disabled:opacity-40"
                >
                  <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-md bg-ink">
                    <Sword className="size-4 text-bronze" />
                  </div>
                  <div className="text-[10px] text-parchment">{u.name}</div>
                  <div className="text-[9px] text-parchment tabular">
                    {u.cost.food || 0} food
                  </div>
                </button>
              ))}
          </div></div>
        )}
        <MinToggle open={!buildMin} onClick={() => setBuildMin((v) => !v)} />
      </div>
      )}
      <div className="hud-map hud-panel rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-2 pt-1.5">
          <div className="text-[10px] uppercase tracking-wide text-parchment-dim">Island</div>
          <MinToggle open={!mapMin} onClick={() => setMapMin((v) => !v)} />
        </div>
        {mapMin ? (
          <button
            type="button"
            onClick={() => setMapMin(false)}
            className="flex w-full items-center gap-1.5 px-2 pb-2 text-[10px] text-parchment-dim"
          >
            {hud.tribes.filter(t=>t.id===0||hud.camps?.some(c=>c.team===t.id&&c.known)).map((t) => (
              <span
                key={t.name}
                className="size-1.5 rounded-full"
                style={{ background: t.alive ? t.color : "#4a4038" }}
              />
            ))}
            <span className="ml-auto tabular">{hud.fps} fps</span>
          </button>
        ) : (
          <div>
            <WorldMinimap hud={hud} engine={engine} />
            <details className="neighbor-details"><summary>Neighbors & trade</summary>
            {founding ? null : (
            <div className="px-2 py-1.5 space-y-1">
              {hud.tribes
                .filter((t) => t.id !== 0 && hud.camps?.some((c) => c.team === t.id && c.known))
                .map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => engine?.focusTribe(t.id)}
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] hover:bg-ink-soft"
                    style={{ borderLeft: `3px solid ${t.alive ? t.color : "#4a4038"}` }}
                  >
                    <span className={t.alive ? "text-parchment" : "line-through opacity-50"}>
                      {t.name}
                    </span>
                    <span className="ml-auto tabular text-parchment">
                      {!t.relationKnown ? "Unknown" : t.relationStale ? "Last contact stale" : !t.alive
                        ? "Fallen"
                        : t.hostile
                          ? "War"
                          : t.ally
                            ? "Pact"
                            : (t.tension || 0) > 0.52
                              ? "Tense"
                              : "Peace"}
                    </span>
                  </button>
                ))}
              <p className="text-[10px] leading-snug text-parchment">Explore to discover other communities.</p>
              {(hud.clusters || [])
                .filter((c) => c.held)
                .map((c) => (
                  <div key={c.name} className="text-[10px] text-ok">
                    {c.name} — {c.bonus}
                  </div>
                ))}
            </div>
            )}
            {hud.trade && !founding ? (
              <div className="px-2 pb-2">
                <TradeBlock hud={hud} engine={engine} onOffer={setTradeOpen} />
              </div>
            ) : null}
            </details>
          </div>
        )}
      </div>

      {tradeOpen!==null&&engine&&!founding&&<div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-ink/70 px-3">
        <div data-trade-dialog role="dialog" aria-modal="true" aria-label="Offer trade" className="hud-panel max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-2xl p-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg">Trade · {engine.game.tribe(tradeOpen)?.name}</h2><button type="button" className="rounded border border-parchment/30 px-3 py-1" onClick={()=>setTradeOpen(null)}>Close</button></div>
          {knownSettlement(engine.game,tradeOpen)?<TradeProposal key={tradeOpen} engine={engine} team={tradeOpen} expanded/>:<p>Find their settlement before sending a shipment.</p>}
        </div>
      </div>}
      {techOpen && !founding ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-start justify-start bg-ink/45 p-3 pt-28">
          <div className="hud-panel max-h-[70dvh] w-full max-w-[30rem] overflow-y-auto rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-lg text-parchment">Knowledge &amp; ages</div>
              <button
                type="button"
                onClick={() => setTechOpen(false)}
                className="rounded-md border border-parchment/30 px-2 py-1 text-[11px] text-parchment"
              >
                Close
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-b border-parchment/15 pb-2 text-sm">
              <span>{AGES[hud.age]}{AGES[hud.age+1]&&<span className="text-parchment-dim"> → {AGES[hud.age+1]}</span>}</span>
              {AGES[hud.age+1]&&<GameTooltip title={`Advance to ${AGES[hud.age+1]}`} description={hud.ageIssue||'Requirements met'}><button type="button" className="rounded-md border border-bronze/40 px-3 py-1.5 text-xs disabled:opacity-50" disabled={!hud.canAge||!!hud.ended} onClick={()=>{engine?.ageUp();setTechOpen(false);}}>Advance</button></GameTooltip>}
            </div>
            <GameDisclosure label="Next age requirements"><AgeReadiness hud={hud} engine={engine} onAdvance={()=>setTechOpen(false)}/></GameDisclosure>
            {engine&&<KnowledgePanel engine={engine} expanded onChooseSite={()=>setTechOpen(false)}/>}
            <GameDisclosure label="Buildings by age"><div className="mt-3 grid gap-2 sm:grid-cols-3">
              {AGES.map((name, age) => (
                <div
                  key={name}
                  className={`rounded-xl border p-2 ${
                    age === hud.age
                      ? "border-bronze bg-bronze/15"
                      : age < hud.age
                        ? "border-parchment/20"
                        : "border-parchment/10 opacity-50"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wide text-parchment">
                    {name}
                    {age === hud.age ? " · now" : age > hud.age ? " · later" : ""}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {BUILD_ORDER.filter((type) => BUILDINGS[type].age === age).map((type) => (
                      <li key={type}>
                        <button
                          type="button"
                          disabled={age !== hud.age || !!hud.ended}
                          onClick={() => {
                            engine?.setPlacing(type);
                            setTechOpen(false);
                          }}
                          className="w-full rounded px-1 py-0.5 text-left text-[12px] text-parchment hover:bg-ink-soft disabled:hover:bg-transparent"
                        >
                          {BUILDINGS[type].name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div></GameDisclosure>
          </div>
        </div>
      ) : null}

      {hud.ended && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink/70">
          <h2 className="font-display text-5xl text-bronze-bright">
            {hud.ended === "win" ? "Victory" : "Defeat"}
          </h2>
          <p className="text-parchment max-w-md text-center px-6">{hud.endReason}</p>
          <button
            type="button"
            onClick={() => void lifecycle.run(()=>engine!.restart())}
            className="rounded-lg border border-bronze/40 bg-ink-soft px-5 py-2 text-sm text-bronze-bright hover:bg-ink"
          >
            Begin again
          </button>
        </div>
      )}
    </div>
  );
}

function TradeBlock({ hud, engine, onOffer }: { hud: HudSnapshot; engine: Engine | null; onOffer:(team:number)=>void }) {
  const t = hud.trade;
  const rival=engine?.game.pickTradeRival();
  const journeys=rival?engine!.game.state.units.filter(u=>u.team===0&&u.hp>0&&u.tradeTeam===rival.id&&tradeJourney(u)):[];
  if (!t) return null;
  if (!t.alive) return null;
  if (t.hostile) {
    return (
      <div className="space-y-1">
        <TradeHead hud={hud} engine={engine} />
        <p className="text-[10px] leading-snug text-blood">{t.relationStale?'Last contact reported war with':'War with'} {t.rival}. Send a delegation for current terms.</p>
        <button
          className="rounded border border-bronze/40 px-2 py-2 text-xs"
          onClick={() => {
            if (!engine) return;
            const rival = engine.game.pickTradeRival();
            if (rival) engine.game.sendDelegation(rival.id,"peace");
            engine.pushHud();
          }}
        >
          Send peace delegation
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <TradeHead hud={hud} engine={engine} />
      {rival&&engine&&knownSettlement(engine.game,rival.id)&&<button type="button" className="w-full rounded border border-bronze/40 px-2 py-2 text-xs" onClick={()=>onOffer(rival.id)}>Offer trade</button>}
      {!!journeys.length&&<p className="text-xs text-parchment-dim">{journeys.length} trader{journeys.length===1?'':'s'} travelling</p>}
      {t.cd > 0 ? (
        <p className="text-[10px] text-parchment-dim">Reported deals refresh in {Math.ceil(t.cd)}s</p>
      ) : t.offers.length ? (
        t.offers.map((o) => (
          <TradeBtn key={o.give + o.get + o.giveAmt} deal={o} hud={hud} engine={engine} />
        ))
      ) : (
        <p className="text-[10px] text-parchment-dim">Nothing spare to trade.</p>
      )}
    </div>
  );
}

function TradeHead({ hud, engine }: { hud: HudSnapshot; engine: Engine | null }) {
  const t = hud.trade;
  if (!t) return null;
  return (
    <div className="flex items-center gap-1">
      {t.canCycle ? (
        <button
          type="button"
          title="Previous tribe (T)"
          onClick={() => engine?.cycleTrade()}
          className="grid size-7 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1 text-center text-[10px] uppercase tracking-wide text-parchment-dim">
        Trade {t.rival}
      </div>
      {t.canCycle ? (
        <button
          type="button"
          title="Next tribe (T)"
          onClick={() => engine?.cycleTrade()}
          className="grid size-7 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
        >
          <ChevronRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function TradeBtn({
  deal,
  hud,
  engine,
}: {
  deal: TradeDeal;
  hud: HudSnapshot;
  engine: Engine | null;
}) {
  const have =
    deal.give === "food"
      ? hud.food
      : deal.give === "wood"
        ? hud.wood
        : deal.give === "copper"
          ? hud.copper
          : deal.give === "iron"
            ? hud.iron
            : hud.stone;
  const ok = have >= deal.giveAmt && !hud.paused && !hud.ended;
  return (
    <button
      type="button"
      disabled={!ok}
      onClick={() => engine?.trade(deal)}
      className="flex min-h-8 w-full items-center justify-between rounded-md border border-parchment/15 bg-ink-soft px-2 py-1 text-[10px] text-parchment hover:border-bronze/40 disabled:opacity-40"
    >
      <span>
        Give {deal.giveAmt} {resWord(deal.give)}
      </span>
      <span className="text-bronze-bright">
        {deal.getAmt} {resWord(deal.get)}
      </span>
    </button>
  );
}

function BankBtn({
  give,
  get,
  hud,
  engine,
}: {
  give: ResKind;
  get: ResKind;
  hud: HudSnapshot;
  engine: Engine | null;
}) {
  const g = engine?.game, partner = g?.pickTradeRival();
  const quote = g && partner ? reportedQuote(g, partner.id, give, get, 20) : null;
  const available = g && !!tradeCarrier(g);
  return (
    <button
      type="button"
      disabled={!quote?.deal || !available || hud.paused || !!hud.ended}
      title={quote?.reason || "Explore to find trading partners"}
      onClick={() => engine?.bankTrade(give, get)}
      className="rounded border border-parchment/15 bg-ink-soft px-1.5 py-0.5 text-[9px] text-parchment hover:border-bronze/40 disabled:opacity-40"
    >
      {quote?.deal ? `Trade 20 ${resWord(give)} for ${quote.deal.getAmt} ${resWord(get)} · carrier` : "Find a trade partner"}
    </button>
  );
}

function JobBtn({
  children,
  label,
  title,
  onClick,
  active,
}: {
  children: ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex min-h-8 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[9px] ${
        active
          ? "border-bronze bg-bronze/20 text-bronze-bright"
          : "border-parchment/15 bg-ink-soft text-parchment hover:border-bronze/40"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function ResRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm leading-7">
      {icon}
      <span className="flex-1 text-parchment-dim text-[13px]">{label}</span>
      <span className="tabular min-w-10 text-right text-parchment">{value}</span>
    </div>
  );
}

function MinToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={open ? "Minimize" : "Expand"}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
    >
      {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-md border text-parchment ${
        active ? "border-bronze text-bronze-bright" : "border-parchment/20 hover:border-bronze/40"
      }`}
    >
      {children}
    </button>
  );
}

function shortName(n: string) {
  if (n === "Frontier outpost") return "Outpost";
  if (n === "Town Hall") return "Town Hall";
  if (n === "Lumber Camp") return "Lumber";
  if (n === "Watchtower") return "Tower";
  if (n === "University") return "Univ.";
  if (n === "Storehouse") return "Store";
  return n;
}

