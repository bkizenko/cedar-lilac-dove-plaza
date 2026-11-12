import {enableWildCraft} from './wildCraft';
import {draftCartChoices} from './draftCart';
import {ProductionDeliveryChannel,type ProductionDelivery} from './productionDelivery';
import {storedVillageCandidates,chooseStoredVillage,type StoredVillageCandidate} from './simulationLifecycle';
import {SimulationCheckpointSaver} from './simulationCheckpointSave';
import type {AuthoritativeCheckpoint} from './simulationCheckpoint';
import {parseStoredSave,serializeStoredSave} from './storageCodec';
import {applyEngineReadQuery,isEngineReadQuery,ENGINE_READ_MODEL_RULES,type EngineReadQuery,type EngineReadReply,type EngineReadReplyFor} from './engineReadModels';
import {SimulationWorkerHost} from './simulationWorkerHost';
import {applyEngineCommand,type EngineDispatchCommand,type EngineDispatchResult,type EngineSelection} from './engineDispatch';
import {commissionWaterEngineering,previewWaterEngineering,type WaterEngineeringKind,type WaterEngineeringPoint} from './waterEngineering';
import {turnableBuilding} from "./footprints";
import {planFieldArea,placeFieldArea,type FieldAreaPlan} from './fieldArea';
import {fertilityPreview} from './fertilityPreview';
import {surveyReachFish,waterReachAt} from './waterReach';
import { compactGrainWorkplace } from './cerealRules';
import {beginHousingUpgrade,beginHomeUse,setHousingPaused,housingAdoptionIssue} from './housing';
import {AutosaveController} from './autosave';
import {fibreWorkshopPlacementLevel} from '../scene/fibreWorkshop';
import {advanceFrameSimulation} from './frameSimulation';
import {towerBuildConfiguration} from './towerPlatforms';
import {rememberGraphicsQuality,rememberRenderStyle,type RenderStyle} from './graphics';
import {gateFacing as normalizeGateFacing,rotateGateFacing,snapGate,suggestGateSnap,placeFacingGate,type GateFacing} from './gateGeometry';
import {RuntimeProfile,RUNTIME_PROFILE_RULES} from './runtimeProfile';
import {projectedTreeInBox} from './treeDesignation';
import type {WorldRequest} from './worldOptions';
import {linearStructure,joinedConstructionLine,placeConstructionLine} from './linearConstruction';
import {buildingCost} from './construction';
import {dragPlot,plotDragIntent,scalablePlot,maximumPlotAxisMultiple,fieldSeedIssue,type PlotSize} from './plots';
import {planBridge,bridgeHeight,type BridgeSpan} from './transport';
import { soilQuality } from "./ecology";
import { calendar } from "./settlement";
import { cultivationIssue } from "./cultivation";
import { encodeGame, decodeGame,validateGameSave } from "./persistence";
import { KeyboardCommands } from "./keyboard";
import { BUILD_ORDER, BUILDINGS, TILE, SAVE_KEY } from "./constants";
import { Game } from "./sim";
import { GameAudio } from "./audio";
import { probeWorld } from "./audioProbe";
import { saveGame, loadRaw, hasSave, protectGame, exportGame, saveTestLabGame, loadTestLabGame } from "./save";
import type { BldType, HudSnapshot } from "./types";
import { WorldView } from "@/scene/world";

export type VillageSaveResult={saved:boolean;message:string;serialized?:string};
export type VillageImportResult={applied:boolean;saved:boolean;message:string};

type PreparedVillage={game:Game;host:SimulationWorkerHost|null};
type LifecycleToken={sequence:number;game:Game;host:SimulationWorkerHost|null;epoch:number};

type HudFn = (s: HudSnapshot) => void;

/** A queued animation frame can predate expensive synchronous world setup.
 * Never let that stale timestamp create simulation debt or reverse timers. */
export function frameDeltaSeconds(timestamp:number,last:number):number {
  if(!Number.isFinite(timestamp)||!Number.isFinite(last))return 0;
  return last ? Math.max(0,Math.min((timestamp-last)/1000,0.1)) : 0.016;
}

export class Engine {
  private productionDeliveries=new ProductionDeliveryChannel();
  /** Native authoritative owner only while the experimental Worker remains parked. */
  subscribeProductionDeliveries(listener:(delivery:ProductionDelivery)=>void){return this.productionDeliveries.subscribe(listener);}
  get productionDeliveryAvailable(){return this.ownerReady&&!this.workerHost;}
  private bindNativeCallbacks(game:Game){game.onSfx=n=>this.audio.play(n);game.onProductionDelivery=delivery=>{if(this.game===game&&!this.disposed&&!this.closing&&delivery.team===0)this.productionDeliveries.emit(delivery);};}
  private checkpointSaver?:SimulationCheckpointSaver;
  private get checkpointService(){return this.checkpointSaver??=new SimulationCheckpointSaver({checkpoint:()=>this.authoritativeCheckpoint(),currentEpoch:()=>this.dispatchEpoch,allowed:()=>this.ownerReady});}
  private lifecycleSequence=0;
  private lifecycleBusy=false;
  private closing=false;
  private disposal:Promise<void>|null=null;
  private lastLifecycle:{operation:string;mode:'main'|'worker';save?:string}|null=null;
  private get ownerReady(){return !this.disposed&&!this.workerBridgeTransition&&(!this.workerHost||this.workerHost.ready);}
  private beginLifecycle():LifecycleToken{
    if(this.disposed||this.closing)throw new Error('The village is closing');
    const token={sequence:this.lifecycleSequence=(this.lifecycleSequence??0)+1,game:this.game,host:this.workerHost??null,epoch:this.dispatchEpoch};
    this.lifecycleBusy=true;this.autosave.invalidate();return token;
  }
  private currentLifecycle(t:LifecycleToken){return !this.disposed&&!this.closing&&this.lifecycleSequence===t.sequence&&this.game===t.game&&(this.workerHost??null)===t.host&&this.dispatchEpoch===t.epoch;}
  private finishLifecycle(t:LifecycleToken){if(this.lifecycleSequence===t.sequence){this.lifecycleBusy=false;if(!this.disposed&&!this.closing)this.pushHud();}}
  private async pauseLifecycleOwner(t:LifecycleToken){if(!this.currentLifecycle(t))throw new Error('Village changed during transition');if(t.host)await t.host.dispatch({kind:'pause',paused:true});else t.game.state.paused=true;if(!this.currentLifecycle(t))throw new Error('Village changed during transition');}
  private createLifecycleWorker(){const host=new SimulationWorkerHost({onPresentation:()=>{if(this.workerHost===host)this.pushHud();},onFault:error=>console.error(error)});return host;}
  private async prepareVillage(snapshot:unknown,worker:boolean,testMode=false,revealMap=false):Promise<PreparedVillage>{
    if(worker){const host=this.createLifecycleWorker();try{await host.initialize(snapshot,{started:true,awaitingStart:false,testMode,revealMap});host.projection.setDisplaySettings(this.game.quality,this.fps);return{game:host.game,host};}catch(error){host.dispose();throw error;}}
    const game=decodeGame(snapshot);game.testMode=testMode;game.revealMap=testMode&&revealMap;game.state.paused=true;if(testMode)game.updateVision();return{game,host:null};
  }
  private installVillage(next:PreparedVillage,retainPrevious=false){
    const previous={game:this.game,host:this.workerHost??null},quality=this.game.quality,muted=this.game.muted;
    if(next.host)next.host.projection.setDisplaySettings(quality,this.fps);else{next.game.quality=quality;next.game.muted=muted;this.bindNativeCallbacks(next.game);}
    // Renderer preparation may fail. Keep the real paused owner alive until it succeeds.
    try{this.view.rebuild(next.game);const c=next.game.campOf(0);this.view.look.set(c.x,next.game.height(c.x,c.z)+.55,c.z);this.audio.unlock();this.canvas.focus();if(!next.host)this.profile?.personMethods.attach(next.game);}catch(error){if(next.host&&next.host!==previous.host)next.host.dispose();try{this.view.rebuild(previous.game);}catch{/* Existing owner and durable checkpoint remain; never construct a fallback village. */}throw error;}
    this.workerHost=next.host;this.game=next.game;this.workerBridgeTransition=false;this.dispatchGeneration=(this.dispatchGeneration??1)+1;
    this.dispatchObservedState=next.host?undefined:next.game.state;this.dispatchRevision=0;this.dispatchSequence=0;this.readModelCache?.clear();this.presentationFeedback=null;
    this.autosave.invalidate();this.simAccumulator=0;this.keyboard.groups.clear();
    if(!retainPrevious&&previous.host&&previous.host!==next.host)previous.host.dispose();
  }
  private async savedVillage(worker:boolean,protectedOnly=false):Promise<PreparedVillage>{
    if(!worker){const raw=loadRaw(protectedOnly);if(!raw)throw new Error('No compatible save. Older partial saves cannot be restored.');return this.prepareVillage(raw,false);}
    const validated:StoredVillageCandidate[]=[];
    for(const candidate of storedVillageCandidates(protectedOnly)){let probe:PreparedVillage|undefined;try{probe=await this.prepareVillage(candidate.snapshot,true);validated.push(candidate);}catch{/* Match native loadRaw terrain reconstruction fallback. */}finally{probe?.host?.dispose();}}
    const chosen=chooseStoredVillage(validated);if(!chosen)throw new Error('No compatible save. Older partial saves cannot be restored.');return this.prepareVillage(chosen.snapshot,true);
  }
  lifecycleReport(){return{busy:this.lifecycleBusy,closing:this.closing,last:this.lastLifecycle};}
  private presentationFeedback:{message:string;expires:number}|null=null;
  private workerHost:SimulationWorkerHost|null=null;
  private workerBridgeTransition=false;
  private dispatchGeneration=1;
  private dispatchObservedState:Game['state']|undefined;
  /** Main resets can replace state without replacing the Game identity. */
  get dispatchEpoch(){
    this.dispatchGeneration??=1;
    if(this.workerHost||this.workerBridgeTransition)return this.dispatchGeneration;
    if(this.dispatchObservedState!==this.game.state){this.dispatchObservedState=this.game.state;this.dispatchGeneration++;}
    return this.dispatchGeneration;
  }
  get sessionEpoch(){return this.dispatchEpoch;}
  get commandReady(){return this.ownerReady&&!this.lifecycleBusy&&!this.closing;}
  private readModelRequest=0;
  private readModelCache=new Map<string,{epoch:number;at:number;completed:boolean;promise:Promise<EngineReadReply>}>();
  private readModelMeasurements:{kind:EngineReadQuery['kind'];cpuMilliseconds:number}[]=[];
  /** Bounded asynchronous owner reads. Cached results are advisory; commands revalidate. */
  readModel<Q extends EngineReadQuery>(query:Q):Promise<EngineReadReplyFor<Q>>{
    if(!isEngineReadQuery(query))return Promise.reject(new Error('Unsupported or malformed owner read query'));
    if(!this.commandReady)return Promise.reject(new Error('No authoritative session is ready'));
    const captured=structuredClone(query);
    const epoch=this.dispatchEpoch,key=JSON.stringify(captured),cached=this.readModelCache.get(key),now=performance.now();
    if(cached&&cached.epoch===epoch&&(!cached.completed||now-cached.at<ENGINE_READ_MODEL_RULES.cacheMilliseconds))return cached.promise as Promise<EngineReadReplyFor<Q>>;
    const requestId=++this.readModelRequest;
    const entry={epoch,at:now,completed:false,promise:null as unknown as Promise<EngineReadReply>};
    const task=async():Promise<EngineReadReply>=>{
      if(this.workerHost){const result=await this.workerHost.readModel(captured);return{...result,epoch};}
      const start=performance.now(),model=applyEngineReadQuery(this.game,captured),cpuMilliseconds=Math.max(0,performance.now()-start);
      return{model,epoch,requestId,stateRevision:this.dispatchRevision,navigationRevision:this.game.navigationRevision(),cpuMilliseconds};
    };
    entry.promise=task().then(result=>{this.readModelMeasurements.push({kind:query.kind,cpuMilliseconds:result.cpuMilliseconds});if(this.readModelMeasurements.length>ENGINE_READ_MODEL_RULES.maximumMeasurements)this.readModelMeasurements.shift();return result;}).finally(()=>{entry.completed=true;entry.at=performance.now();});
    this.readModelCache.delete(key);this.readModelCache.set(key,entry);
    while(this.readModelCache.size>ENGINE_READ_MODEL_RULES.maximumCacheEntries)this.readModelCache.delete(this.readModelCache.keys().next().value!);
    return entry.promise as Promise<EngineReadReplyFor<Q>>;
  }
  ownerReadModelReport(){return{cacheEntries:this.readModelCache.size,measurements:this.readModelMeasurements.map(m=>({...m}))};}
  private dispatchSequence=0;
  private dispatchRevision=0;
  /** Captures IDs at the click; native handlers revalidate original entities. */
  async dispatch(command:EngineDispatchCommand,selection?:EngineSelection):Promise<EngineDispatchResult>{
    const captured=selection??{selectedUnitIds:this.game.selectedUnits().map(u=>u.id),selectedBuildingId:this.game.state.selBld?.id,selectedBoatId:this.game.selectedBoat??undefined};
    const epoch=this.dispatchEpoch;
    if(!this.commandReady)throw new Error('No authoritative session is ready');
    if(this.workerHost){const result=await this.workerHost.dispatch(command,captured);this.readModelCache.clear();return{...result,epoch};}
    const sequence=++this.dispatchSequence;
    const outcome=applyEngineCommand(this.game,command,captured);
    this.readModelCache.clear();
    const result={...outcome,sequence,stateRevision:++this.dispatchRevision,epoch};
    this.pushHud();return result;
  }

  /** Isolated Test Lab harness only. No public worker option until all UI/save bridges qualify. */
  async startWorkerBridgeForTestLab(){
    if(!this.originalGame||!this.game.testMode)throw new Error('Worker experiment requires an isolated Test Lab session');
    if(this.workerHost||this.workerBridgeTransition)throw new Error('A worker session already exists');
    const original=this.game,snapshot=encodeGame(original),context={started:original.started,awaitingStart:original.awaitingStart,testMode:original.testMode,revealMap:original.revealMap};this.autosave.invalidate();
    this.dispatchEpoch;this.workerBridgeTransition=true;this.dispatchGeneration++;const transitionEpoch=this.dispatchGeneration;
    const host=new SimulationWorkerHost({onPresentation:()=>{if(this.workerHost===host)this.pushHud();},onFault:error=>console.error(error)});
    try{
      await host.initialize(snapshot,context);if(this.disposed||this.closing||this.game!==original||this.dispatchGeneration!==transitionEpoch)throw new Error('Worker startup was superseded by a village transition');
      host.projection.setDisplaySettings(this.view.quality,this.fps);this.workerHost=host;this.game=host.game;
      this.simAccumulator=0;this.view.rebuild(this.game);this.view.resize();
      this.workerBridgeTransition=false;this.pushHud();return host.report;
    }catch(error){host.dispose();if(this.game===original&&this.dispatchGeneration===transitionEpoch){this.workerHost=null;this.workerBridgeTransition=false;}throw error;}
  }
  workerBridgeReport(){return this.workerHost?.report??null;}
  get isWorkerSession(){return !!this.workerHost;}
  presentationNotice(message:string,seconds=2){
    if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Invalid notice duration');
    if(this.workerHost)this.presentationFeedback={message,expires:performance.now()+seconds*1000};
    else this.game.banner(message,seconds);this.pushHud();
  }
  cancelPresentationInteraction(){
    this.moveMode=false;this.loggingMode=false;this.plotStart=null;this.plotPointerStart=null;
    this.view.setGhost(null,0,0,0,false);this.view.setLinePreview([]);
    if(this.workerHost)this.workerHost.select({selectedUnitIds:[]});
    void this.dispatch({kind:'cancel-interaction'}).catch(error=>this.presentationNotice(error instanceof Error?error.message:String(error),4));
  }
  async authoritativeCheckpoint():Promise<AuthoritativeCheckpoint>{
    if(!this.ownerReady)throw new Error('No authoritative session is ready');
    const sessionEpoch=this.dispatchEpoch;
    if(this.workerHost){const result=await this.workerHost.checkpoint();return{source:'worker',sessionEpoch,serialized:result.serialized,clock:result.clock,rng:result.rng,context:result.context};}
    const g=this.game,context={started:g.started,awaitingStart:g.awaitingStart,testMode:g.testMode,revealMap:g.revealMap};
    const snapshot={...encodeGame(g),savedAt:Date.now(),...(g.testMode?{testLabRevealMap:g.revealMap}:{})};validateGameSave(snapshot);
    return{source:'main',sessionEpoch,serialized:serializeStoredSave(snapshot),clock:{tick:0,time:g.state.time,paused:g.state.paused,speed:g.state.speed,stateRevision:this.dispatchRevision,appliedSequence:this.dispatchSequence},rng:null,context};
  }
  checkpointWorker(){if(!this.workerHost)throw new Error('No authoritative worker');return this.workerHost.checkpoint();}
  /** Selection is local presentation plus validated digest before worker ticks. */
  setWorkerSelection(selection:EngineSelection){if(!this.workerHost)throw new Error('No authoritative worker');this.workerHost.select(selection);}

  private waterDraft:{state:Game['state'];kind:WaterEngineeringKind;source:WaterEngineeringPoint|null;target:WaterEngineeringPoint|null;plan:ReturnType<typeof previewWaterEngineering>|null}|null=null;
  /** Grok World T3: canal/aqueduct tool. Two world clicks; preview and commit share one planner. */
  beginWaterEngineering(kind:WaterEngineeringKind){
    this.game.state.placing=null;this.loggingMode=false;this.moveMode=false;
    this.waterDraft={state:this.game.state,kind,source:null,target:null,plan:null};this.updateGhost();this.pushHud();
  }
  cancelWaterEngineering(){this.waterDraft=null;this.pushHud();}
  waterEngineeringStatus(){
    if(this.waterDraft&&this.waterDraft.state!==this.game.state)this.waterDraft=null;
    const d=this.waterDraft,p=d?.plan,issue=p?.issues[0]??null;
    return{kind:d?.kind??null,source:d?.source??null,issue,canCommit:!!p&&!issue,
      summary:!d?'Choose a water project.':!d.source?'Click the water source.':!d.target?'Click the destination.':issue??`${Math.round(p!.lengthMetres)} m · ${p!.stages.length} digs · ${Math.round(p!.workSeconds)} work-s${d.kind==='aqueduct'?' · channel earthworks only':''}`};
  }
  chooseWaterEngineeringPoint(point:WaterEngineeringPoint){
    const d=this.waterDraft;if(!d||d.state!==this.game.state)return false;
    if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>this.game.world.size/2||Math.abs(point.z)>this.game.world.size/2||!this.game.exploredAt(point.x,point.z)){this.game.banner('Explore the project site first',3);this.pushHud();return false;}
    if(!d.source||d.target){d.source={...point};d.target=null;d.plan=null;}
    else{d.target={...point};d.plan=previewWaterEngineering(this.game,d.kind,d.source,d.target);}
    this.pushHud();return true;
  }
  commitWaterEngineering(){
    const d=this.waterDraft;if(!d?.source||!d.target||d.state!==this.game.state)return{ok:false,reason:'Choose the source and destination first'};
    const result=commissionWaterEngineering(this.game,d.kind,d.source,d.target);
    if(result.ok)this.waterDraft=null;else d.plan=previewWaterEngineering(this.game,d.kind,d.source,d.target);this.pushHud();return result;
  }

  readonly profile = new RuntimeProfile();
  entityFrustumCensus(){return this.view.entityFrustumCensus(this.game);}
  setPerformanceExpanded(open:boolean){this.profile.simulationPhases.enabled=open;this.profile.personMethods.setEnabled(open,this.game);}
  game: Game;
  readonly autosave:AutosaveController;
  private originalGame: Game | null = null;
  private originalWorkerHost:SimulationWorkerHost|null=null;
  async startTestSession():Promise<boolean>{
    if(this.originalGame)return true;const t=this.beginLifecycle();let next:PreparedVillage|undefined;
    try{
      await this.pauseLifecycleOwner(t);const saved=await this.checkpointService.save('village',true);
      if(!this.currentLifecycle(t))return false;if(saved.status!=='committed'||!saved.checkpoint)throw new Error('Save your village successfully before entering test mode');
      next=await this.prepareVillage(parseStoredSave(saved.checkpoint.serialized),!!t.host,true,false);if(!this.currentLifecycle(t)){next.host?.dispose();return false;}
      this.installVillage(next,true);this.originalGame=t.game;this.originalWorkerHost=t.host;this.lastLifecycle={operation:'enter-lab',mode:next.host?'worker':'main'};this.pushHud();return true;
    }catch(error){if(this.currentLifecycle(t))this.presentationNotice(error instanceof Error?error.message:String(error),5);return false;}finally{this.finishLifecycle(t);}
  }
  async loadTestSession():Promise<string>{
    if(!this.originalGame||!this.game.testMode)return 'Open the Test Lab first.';const t=this.beginLifecycle();let next:PreparedVillage|undefined;
    try{const raw=localStorage.getItem(SAVE_KEY+':test-lab');if(!raw)throw new Error('There is no saved Test Lab run');const snapshot=parseStoredSave(raw);validateGameSave(snapshot);const reveal=(snapshot as {testLabRevealMap?:boolean}).testLabRevealMap===true;
      await this.pauseLifecycleOwner(t);next=await this.prepareVillage(snapshot,!!t.host,true,reveal);if(!this.currentLifecycle(t)){next.host?.dispose();return 'Test Lab load cancelled: village changed';}
      this.installVillage(next);this.lastLifecycle={operation:'load-lab',mode:next.host?'worker':'main'};this.pushHud();return 'Test Lab run loaded.';
    }catch(error){return error instanceof Error?error.message:'Could not load the Test Lab run.';}finally{this.finishLifecycle(t);}
  }
  async endTestSession():Promise<void>{
    if(!this.originalGame)return;const t=this.beginLifecycle(),original={game:this.originalGame,host:this.originalWorkerHost??null};
    try{await this.pauseLifecycleOwner(t);if(!this.currentLifecycle(t))throw new Error('Return cancelled: active village changed');
      if(original.host)await original.host.dispatch({kind:'pause',paused:true});else original.game.state.paused=true;
      if(!this.currentLifecycle(t))throw new Error('Return cancelled: active village changed');this.installVillage(original);this.originalGame=null;this.originalWorkerHost=null;this.lastLifecycle={operation:'return-from-lab',mode:original.host?'worker':'main'};this.pushHud();
    }finally{this.finishLifecycle(t);}
  }
  view: WorldView;
  audio: GameAudio;
  canvas: HTMLCanvasElement;
  keys = new Set<string>();
  hud: HudFn;
  running = false;
  last = 0;
  hudAcc = 0;
  saveAcc = 0;
  fpsAcc = 0;
  frames = 0;
  fps = 60;
  drag: { sx: number; sy: number; x: number; y: number } | null = null;
  panDrag: { x: number; y: number } | null = null;
  rotDrag: { x: number; y: number; sx: number; sy: number } | null = null;
  pinch: { d: number; dist: number } | null = null;
  keyboard = new KeyboardCommands(this);
  private simAccumulator = 0;
  moveMode = false;
  loggingMode = false;
  pointer = { x: 0, y: 0 };
  private nextHoverAt=0;
  private onPointerLeave=()=>{this.view.hoveredUnitId=null;this.canvas.title="";};
  gateFacing:GateFacing="north";
  /** GW-08 / T8 (Grok): quarter-turn for the current placement; preview and commit both read it. */
  quarterTurn=false;
  /** GW-02 / T9 (Grok): a farm drag wider than one field becomes several fields with headlands. */
  fieldArea:FieldAreaPlan|null=null;
  private fertilityKey='';
  /** Toggle the quarter turn for a turnable building (R key or the Rotate button). */
  rotatePlacement(){const t=this.game.state.placing;if(!t||!turnableBuilding(t)||(scalablePlot(t)&&this.plotSize))return false;this.quarterTurn=!this.quarterTurn;this.updateGhost(true);this.pushHud();return true;}
  canRotatePlacement(){const t=this.game.state.placing;return !!t&&t!=='gate'&&turnableBuilding(t);}
  private gateFacingExplicit=false;
  ghostPos = { x: 0, z: 0 };
  plotStart: {x:number;z:number}|null=null;
  plotPointerStart:{x:number;y:number}|null=null;
  plotSize: PlotSize|undefined;
  bridgeSpan: BridgeSpan|undefined;
  plotWidth=1;plotDepth=1;
  plotPreviewKey="";
  private nextFieldPreviewAt=0;
  resizePlot(delta:number,depth=false){
    if(depth)this.plotDepth=Math.max(1,Math.min(maximumPlotAxisMultiple(this.game.state.placing??"farm"),this.plotDepth+delta));else this.plotWidth=Math.max(1,Math.min(maximumPlotAxisMultiple(this.game.state.placing??"farm"),this.plotWidth+delta));
    this.updateGhost(true);this.game.banner(`Plot ${this.plotWidth} × ${this.plotDepth} · [ ] width · Shift+[ ] depth`,3);this.pushHud();
  }
  private importSequence = 0;
  disposed = false;
  ro: ResizeObserver | null = null;
  failFrames = 0;
  slowFps = 0;

  constructor(canvas: HTMLCanvasElement, hud: HudFn) {
    this.canvas = canvas;
    this.hud = hud;
    this.game = new Game();
    this.view = new WorldView(canvas);
    this.audio = new GameAudio();
    this.game.muted = this.audio.settings.muted;
    this.autosave=new AutosaveController({getGame:()=>this.game,allowed:()=>!this.disposed&&!this.workerHost&&!this.workerBridgeTransition&&!this.lifecycleBusy&&!this.closing,onMainThreadWork:work=>this.profile.recordMainThreadWork(work)});
    this.profile.setAutosaveReporter(()=>this.autosave.report(),()=>this.autosave.resetMeasurements());
    this.game.quality = this.view.quality;
    this.bindNativeCallbacks(this.game);
    this.view.onContextLost = () => {
      if (this.game.quality !== "low")
        this.setQuality(this.game.quality === "high" ? "med" : "low");
    };
    this.view.onContextRestored = () => {
      try {
        this.view.rebuild(this.game);
        this.view.resize();
        this.game.banner("The island steadies", 2);
        this.pushHud();
      } catch {
        this.setQuality("low");
        try {
          this.view.rebuild(this.game);
        } catch {
          /* stay paused on lost context */
        }
      }
    };
    this.bind();
    this.view.resize();
    this.ro = new ResizeObserver(() => this.view.resize());
    this.ro.observe(canvas.parentElement || canvas);
    // begin() publishes the first HUD after the tribes and world exist.
    this.installProbe();
    (window as unknown as { __engine?: Engine }).__engine = this;
  }

  begin() {
    if (this.running && this.game.started && !this.game.awaitingStart) {
      this.pushHud();
      return;
    }
    const saved=loadRaw(),storedVillage=hasSave();
    try {
      if(!saved&&storedVillage)throw new Error('Your saved village could not be restored. Its saved copies have been kept.');
      if(saved){this.game=decodeGame(saved);this.profile.personMethods.attach(this.game);this.game.quality=this.view.quality;this.bindNativeCallbacks(this.game);}
      else {this.game.reset();this.game.awaitingStart = true;}
      if(this.game.awaitingStart)this.game.enterIsland();
      this.game.state.paused = true;
      this.view.rebuild(this.game);
      this.homeLook();
      this.view.resize();
    } catch (err) {
      console.error(err);
      if(storedVillage)throw err;
      this.setQuality("low");
      try {
        this.game.reset();
        this.game.enterIsland();
        this.game.state.paused = true;
        this.view.rebuild(this.game);
        this.homeLook();
        this.view.resize();
      } catch (err2) {
        console.error(err2);
        this.running = false;
        throw err2 instanceof Error ? err2 : new Error("The camp could not be raised.");
      }
    }
    this.running = true;
    this.last = performance.now();
    this.view.renderer.setAnimationLoop((t) => this.frame(t));
    this.pushHud();
  }

  async configureNewWorld(request:WorldRequest,previewRiverbanks=false,wildCraft=false):Promise<boolean>{
    if(this.originalGame&&!this.game.testMode)return false;
    return this.restart({...request,geologyVersion:1},previewRiverbanks&&this.game.testMode?19:21,wildCraft); // fresh worlds carry the geology layer; saved v21 worlds without the flag regenerate unchanged
  }

  enterIsland() {
    this.audio.unlock();
    this.game.enterIsland();
    this.canvas.focus();
    this.pushHud();
  }

  enterAsBand() {
    this.audio.unlock();
    this.game.enterAsBand();
    this.canvas.focus();
    this.pushHud();
  }

  hasSavedGame() {
    return hasSave();
  }
  async saveNow():Promise<VillageSaveResult>{
    if(!this.commandReady)return{saved:false,message:'Village transition is still in progress'};
    const epoch=this.dispatchEpoch,lab=this.game.testMode;
    const result=await this.checkpointService.save(lab?'test-lab':'village',true);
    if(this.disposed||this.dispatchEpoch!==epoch)return{saved:false,message:'Village changed before saving finished'};
    let saved=result.status==='committed',message=saved?(lab?'Test Lab run saved':'Village saved'):result.reason;
    if(saved&&!lab){const protectedCopy=await this.checkpointService.save('protected',true);if(this.disposed||this.dispatchEpoch!==epoch)return{saved:false,message:'Village changed before saving finished'};if(protectedCopy.status!=='committed')message+=' · extra copy unavailable';}
    if(!this.workerHost){this.game.banner(message,5);this.pushHud();}
    return{saved,message};
  }
  async protectVillage():Promise<VillageSaveResult>{
    if(!this.commandReady)return{saved:false,message:'Village transition is still in progress'};
    const epoch=this.dispatchEpoch,result=await this.checkpointService.save('protected',true);
    if(this.disposed||this.dispatchEpoch!==epoch)return{saved:false,message:'Village changed before protection finished'};
    return{saved:result.status==='committed',message:result.status==='committed'?'Protected village saved':result.reason};
  }
  async exportVillage():Promise<VillageSaveResult>{
    if(!this.commandReady)return{saved:false,message:'Village transition is still in progress'};
    const epoch=this.dispatchEpoch;
    // Export remains available for storage recovery; its payload comes from the owner.
    const result=await this.checkpointService.save('export',true);
    if(this.disposed||this.dispatchEpoch!==epoch)return{saved:false,message:'Village changed before export finished'};
    return{saved:result.status==='committed',message:result.status==='committed'?'Village file prepared':result.reason,...(result.checkpoint?{serialized:result.checkpoint.serialized}:{})};
  }
  async importVillage(file:File):Promise<VillageImportResult>{
    const cancelled=():VillageImportResult=>({applied:false,saved:false,message:'Import cancelled — the active village changed.'});
    if(this.disposed||this.closing)return cancelled();
    if(this.originalGame){const message='Leave test mode before importing a village';this.presentationNotice(message,4);return{applied:false,saved:false,message};}
    const t=this.beginLifecycle();let next:PreparedVillage|undefined,applied=false;
    try{
      const text=await file.text();if(!this.currentLifecycle(t))return cancelled();const raw=JSON.parse(text);validateGameSave(raw);
      next=await this.prepareVillage(raw,!!t.host);if(!this.currentLifecycle(t)){next.host?.dispose();return cancelled();}
      await this.pauseLifecycleOwner(t);
      if(t.game.started&&!t.game.awaitingStart){const protectedCopy=await this.checkpointService.save('protected',true);if(!this.currentLifecycle(t))return cancelled();if(protectedCopy.status!=='committed')throw new Error('Could not protect your current village. Download it before importing another save.');}
      // Keep the outgoing village's recoverable primary too; never encode a projection.
      if(t.game.started&&!t.game.awaitingStart){await this.checkpointService.save('village',true);if(!this.currentLifecycle(t))return cancelled();}
      this.installVillage(next);applied=true;const appliedEpoch=this.dispatchEpoch;
      const saved=await this.checkpointService.save('village',true);if(this.lifecycleSequence!==t.sequence||this.disposed||this.closing||this.game!==next.game||this.dispatchEpoch!==appliedEpoch)return{applied:true,saved:false,message:'Import completed; a newer village transition superseded saving'};const message=saved.status==='committed'?'Village imported; previous village kept as a protected checkpoint':'Village imported but local saving failed. Keep the original file.';
      this.lastLifecycle={operation:'import',mode:next.host?'worker':'main',save:saved.status};this.presentationNotice(message,5);return{applied:true,saved:saved.status==='committed',message};
    }catch(error){if(!applied&&!this.currentLifecycle(t))return cancelled();const detail=error instanceof Error?error.message:'Invalid village backup';this.presentationNotice(detail,5);return{applied,saved:false,message:detail};}
    finally{if(!applied&&next?.host)next.host.dispose();this.finishLifecycle(t);}
  }
  private restoreVillage(restored:Game){this.installVillage({game:restored,host:null});}
  async resumeSaved(protectedOnly=false):Promise<void>{
    if(this.originalGame){await this.endTestSession();return;}const t=this.beginLifecycle();let next:PreparedVillage|undefined,applied=false;
    try{await this.pauseLifecycleOwner(t);next=await this.savedVillage(!!t.host,protectedOnly);if(!this.currentLifecycle(t)){next.host?.dispose();throw new Error('Restore cancelled: active village changed');}
      if(protectedOnly&&t.game.started&&!t.game.awaitingStart){const saved=await this.checkpointService.save('village',true);if(!this.currentLifecycle(t))throw new Error('Restore cancelled: active village changed');if(saved.status!=='committed')throw new Error('Could not save the current village before restoring. Download it first.');}
      this.installVillage(next);applied=true;const appliedEpoch=this.dispatchEpoch;if(protectedOnly)await this.checkpointService.save('village',true);
      if(this.lifecycleSequence!==t.sequence||this.disposed||this.closing||this.game!==next.game||this.dispatchEpoch!==appliedEpoch)throw new Error('Restore superseded by a newer transition');
      this.lastLifecycle={operation:'restore',mode:next.host?'worker':'main'};this.presentationNotice('Village restored · P to resume',4);
    }catch(error){if(this.currentLifecycle(t))this.presentationNotice(error instanceof Error?error.message:'Cannot restore save',4);throw error;}finally{if(!applied)next?.host?.dispose();this.finishLifecycle(t);}
  }
  async restart(request?:WorldRequest,generation:18|19|20|21=21,wildCraft=false):Promise<boolean>{
    const t=this.beginLifecycle();let applied=false;
    try{await this.pauseLifecycleOwner(t);
      if(t.game.started&&!t.game.awaitingStart){const saved=await this.checkpointService.save(t.game.testMode?'test-lab':'protected',true);if(!this.currentLifecycle(t))return false;if(saved.status!=='committed')throw new Error('Could not protect this village. Export it before starting another world.');}
      const game=new Game();game.reset(undefined,generation,{...request,difficulty:request?.difficulty??t.game.state.difficulty??'normal'});game.enterIsland();game.state.paused=true;game.testMode=t.game.testMode;if(wildCraft===true)enableWildCraft(game);
      if(!this.currentLifecycle(t))return false;
      // Explicit fresh-world MAIN-mode replacement. Worker world creation is not implemented.
      this.installVillage({game,host:null});applied=true;this.lastLifecycle={operation:'new-world',mode:'main'};this.pushHud();return true;
    }catch(error){if(this.currentLifecycle(t))this.presentationNotice(error instanceof Error?error.message:'Could not create world',5);return false;}finally{this.finishLifecycle(t);}
  }

  private homeLook() {
    const c = this.game.campOf(0);
    this.view.look.set(c.x, this.game.height(c.x, c.z) + 0.55, c.z);
  }

  private bind() {
    const c = this.canvas;
    c.style.touchAction = "none";
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("pagehide",this.onPageHide);
    window.addEventListener("beforeunload",this.onPageHide);
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerleave",this.onPointerLeave);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("visibilitychange", this.onVis);
  }

  private onResize = () => this.view.resize();
  private onBlur = () => {
    this.keys.clear();
    this.simAccumulator = 0;
  };
  private backgroundCheckpoint:Promise<void>|null=null;
  private requestBackgroundCheckpoint(){
    if(this.disposed||this.closing||this.lifecycleBusy||this.workerBridgeTransition)return;
    if(!this.workerHost){if(this.game.testMode)void this.checkpointService.save('test-lab',false);else saveGame(this.game);return;}
    if(this.backgroundCheckpoint)return;
    const owner=this.workerHost,epoch=this.dispatchEpoch;
    this.backgroundCheckpoint=(async()=>{const saved=await this.checkpointService.save(this.game.testMode?'test-lab':'village',false);if(this.workerHost===owner&&this.dispatchEpoch===epoch)this.lastLifecycle={operation:'background-checkpoint',mode:'worker',save:saved.status};})().catch(error=>console.error(error)).finally(()=>{this.backgroundCheckpoint=null;});
  }
  private onPageHide=()=>{this.requestBackgroundCheckpoint();};
  private onVis=()=>{
    this.keys.clear();this.simAccumulator=0;this.last=0;
    if(document.visibilityState==='hidden')this.requestBackgroundCheckpoint();
    if(document.visibilityState==='visible'){this.view.resize();if(this.audio.ctx?.state==='suspended')void this.audio.ctx.resume();}
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if(e.code==='Escape'&&this.waterDraft)this.cancelWaterEngineering();
    const target=e.target as HTMLElement|null;
    if(e.code==='KeyR'&&this.game.state.placing==='gate'&&!e.metaKey&&!e.ctrlKey&&!target?.closest?.('input,textarea,select,[contenteditable=true],button,a,summary,dialog[open],[role=dialog]')){
      e.preventDefault();if(!e.repeat)this.setGateFacing(rotateGateFacing(this.gateFacing,e.shiftKey?-1:1));return;
    }
    if(e.code==='KeyR'&&this.canRotatePlacement()&&!e.metaKey&&!e.ctrlKey&&!target?.closest?.('input,textarea,select,[contenteditable=true],button,a,summary,dialog[open],[role=dialog]')){
      e.preventDefault();if(!e.repeat)this.rotatePlacement();return;
    }
    this.keyboard.key(e);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onWheel = (e: WheelEvent) => {
    if ((e.target as HTMLElement | null)?.closest("dialog, input, select, textarea, .hud-panel")) return;
    e.preventDefault();
    const s = Math.sign(e.deltaY);
    this.view.dist *= s > 0 ? 1.08 : 0.92;
  };

  private canvasXY(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    this.keyboard.mode = false;
    this.canvas.focus();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    if (e.button === 1 || e.buttons === 4) {
      this.panDrag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button === 2) {
      this.rotDrag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
      return;
    }
    if (e.button === 0) {
      if(this.waterDraft){this.drag=null;return;}
      if (this.game.state.placing) {
        this.plotPointerStart={x:p.x,y:p.y};
        this.plotStart=(scalablePlot(this.game.state.placing)||this.game.state.placing==="bridge"||linearStructure(this.game.state.placing))?this.view.groundAt(p.x,p.y):null;
        this.drag = null;
        return;
      }
      this.drag = { sx: p.x, sy: p.y, x: p.x, y: p.y };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    const now=performance.now();
    if(this.game.state.placing||this.loggingMode||this.drag||this.panDrag||this.rotDrag)this.view.hoveredUnitId=null;
    else if(now>=this.nextHoverAt){this.nextHoverAt=now+80;this.view.hoveredUnitId=this.view.hoverPerson(p.x,p.y,this.game);const animal=this.view.hoveredUnitId===null?this.view.pickWildlife(p.x,p.y,this.game):null;this.canvas.title=animal?(animal.hp>0?`Wild ${animal.species} · right-click with hunters to hunt`:`${animal.species} carcass · ${Math.ceil(animal.carcass?.meat||0)} raw meat remains`):"";}
    if (this.panDrag) {
      const dx = e.clientX - this.panDrag.x;
      const dy = e.clientY - this.panDrag.y;
      this.panDrag.x = e.clientX;
      this.panDrag.y = e.clientY;
      const sp = 0.04 * (this.view.dist / 30);
      const fx = -Math.sin(this.view.yaw);
      const fz = -Math.cos(this.view.yaw);
      const rx = Math.cos(this.view.yaw);
      const rz = -Math.sin(this.view.yaw);
      this.view.look.x += -rx * dx * sp + fx * dy * sp;
      this.view.look.z += -rz * dx * sp + fz * dy * sp;
      return;
    }
    if (this.rotDrag) {
      const dx = e.clientX - this.rotDrag.x;
      const dy = e.clientY - this.rotDrag.y;
      this.rotDrag.x = e.clientX;
      this.rotDrag.y = e.clientY;
      this.view.yaw -= dx * 0.005;
      this.view.pitch += dy * 0.004;
      return;
    }
    if (this.drag) {
      this.drag.x = p.x;
      this.drag.y = p.y;
    }
    this.updateGhost();
  };

  private onPointerUp = (e: PointerEvent) => {
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    if(e.button===0&&this.waterDraft){this.leftClick(p.x,p.y,false);this.drag=null;return;}
    if (this.rotDrag && e.button === 2) {
      const moved = Math.hypot(e.clientX - this.rotDrag.sx, e.clientY - this.rotDrag.sy);
      this.rotDrag = null;
      if (moved < 6) this.rightClick(p.x, p.y,e.shiftKey);
      return;
    }
    this.rotDrag = null;
    this.panDrag = null;
    if (e.button === 0 && this.game.state.placing) {
      this.leftClick(p.x, p.y, e.shiftKey);
      this.plotStart=null;this.plotPointerStart=null;this.plotSize=undefined;
      this.drag = null;
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.drag && e.button === 0) {
      this.drag.x=p.x;this.drag.y=p.y;
      const dx = this.drag.x - this.drag.sx;
      const dy = this.drag.y - this.drag.sy;
      if (Math.hypot(dx, dy) > 8) {
        if(this.workerHost){
          const ids=e.shiftKey?this.game.selectedUnits().map(u=>u.id):[];
          for(const u of this.game.state.units){if(u.team!==0||u.hp<=0)continue;const point=this.view.project(u.x,u.y+.6,u.z);if(!point.behind&&point.x>=Math.min(this.drag.sx,this.drag.x)&&point.x<=Math.max(this.drag.sx,this.drag.x)&&point.y>=Math.min(this.drag.sy,this.drag.y)&&point.y<=Math.max(this.drag.sy,this.drag.y)&&!ids.includes(u.id))ids.push(u.id);}
          this.workerHost.select({selectedUnitIds:ids});this.drag=null;this.pushHud();return;
        }
        if (!e.shiftKey && !this.loggingMode) this.game.clearSelect();
        const minx = Math.min(this.drag.sx, this.drag.x),
          maxx = Math.max(this.drag.sx, this.drag.x);
        const miny = Math.min(this.drag.sy, this.drag.y),
          maxy = Math.max(this.drag.sy, this.drag.y);
        let picked = 0;
        for (const u of this.game.state.units) {
          if (this.loggingMode || u.team !== 0 || u.hp <= 0) continue;
          const p = this.view.project(u.x, u.y + 0.6, u.z);
          if (p.behind) continue;
          if (p.x >= minx && p.x <= maxx && p.y >= miny && p.y <= maxy) {
            u.selected = true;
            picked++;
          }
        }
        if (picked === 0) {
          const ids: number[] = [];
          for (const tree of this.game.state.trees) {
            if (tree.amount <= 0 || !this.game.visibleAt(tree.x, tree.z)) continue;
            if (projectedTreeInBox((x,y,z)=>this.view.project(x,y,z),tree,{minx,maxx,miny,maxy})) ids.push(tree.id);
          }
          if (ids.length) this.game.markChop(ids);
          else if(this.loggingMode)this.game.banner("No visible trees in the box — drag across the trunks or crowns",3);
        }
      } else {
        this.leftClick(p.x, p.y, e.shiftKey);
      }
      this.drag = null;
      this.pushHud();
    }
  };

  private residentMovePoint(cx:number,cy:number,ground:{x:number;z:number}) {
    const people = this.game.selectedUnits();
    if (!people.length || !people.every(u => u.haulage === 'canoe') ||
      this.game.height(ground.x,ground.z) >= this.game.waterAt(ground.x,ground.z)) return ground;
    const water = this.view.waterAt(cx,cy,this.game.world.waterY);
    return water && this.game.height(water.x,water.z) < this.game.waterAt(water.x,water.z) ? water : ground;
  }

  leftClick(cx: number, cy: number, additive: boolean) {
    if(this.workerHost){
      const entity=this.view.pickEntity(cx,cy,this.game);
      if(entity?.kind==='building'){this.workerHost.select({selectedUnitIds:[],selectedBuildingId:entity.id});return;}
      if(entity&&entity.team===0){
        const ids=additive?this.game.selectedUnits().map(u=>u.id):[];
        this.workerHost.select({selectedUnitIds:ids.includes(entity.id)?ids.filter(id=>id!==entity.id):[...ids,entity.id]});return;
      }
      const point=this.view.groundAt(cx,cy);if(point&&this.game.selectedUnits().length){void this.dispatch({kind:'move',unitIds:this.game.selectedUnits().map(u=>u.id),x:point.x,z:point.z}).catch(console.error);}
      return;
    }
    if(this.waterDraft){const point=this.view.groundAt(cx,cy);if(point)this.chooseWaterEngineeringPoint(point);return;}
    const boatOrder=this.game.selectedBoat!==null&&!this.game.state.placing;
    const g = boatOrder ? this.view.waterAt(cx,cy,this.game.world.waterY) : this.view.groundAt(cx, cy);
    if (!g) {
      if (this.game.state.placing) this.game.banner("Aim at the valley floor", 1.2);
      return;
    }
    if (this.game.state.placing) {
      this.updateGhost(true);
      if(linearStructure(this.game.state.placing)&&this.plotStart){
        placeConstructionLine(this.game,this.game.state.placing,this.plotStart,g);
        this.pushHud();return;
      }
      if(this.game.state.placing==='farm'&&this.fieldArea&&this.plotStart){
        const plan=planFieldArea(this.game,this.plotStart,g,0),placed=placeFieldArea(this.game,plan,0);
        this.fieldArea=null;this.view.setLinePreview([]);
        this.game.banner(placed.length?`${placed.length} field${placed.length>1?'s':''} laid out${placed.length<plan.valid?' · ran short of seeds':''}`:'No field could be laid out there',3);
        this.updateGhost();this.pushHud();return;
      }
      if(this.game.state.placing==='gate')placeFacingGate(this.game,this.ghostPos,this.gateFacing);
      else this.game.placeBuilding(this.game.state.placing, this.ghostPos.x, this.ghostPos.z, 0,this.plotSize,this.bridgeSpan,this.placementTurn());
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.loggingMode) {
      const tree = this.game.state.trees.filter(t => t.amount > 0 && this.game.visibleAt(t.x, t.z))
        .filter(t => Math.hypot(t.x - g.x, t.z - g.z) < 8)
        .sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z))[0];
      if (tree) this.game.markChop([tree.id]);
      else this.game.banner("Aim at a visible tree, or drag over a stand", 1.8);
      this.pushHud();
      return;
    }
    if (this.moveMode) {
      const target = boatOrder ? g : this.residentMovePoint(cx,cy,g);
      this.game.issueMove(target.x,target.z);
      this.moveMode = false;
      return;
    }
    const boat=this.view.pickBoat(cx,cy,this.game);
    if(boat&&boat.team===0){this.game.selectBoat(boat.id);this.pushHud();return;}
    const entity = this.view.pickEntity(cx, cy, this.game);
    if(entity?.kind==="building"&&entity.team===0&&!this.game.finished(entity)&&!additive&&this.game.selectedUnits().length)this.game.orderConstruction(entity);
    else if (entity) this.game.selectEntity(entity, additive, true);
    else {
      const animal=this.view.pickWildlife(cx,cy,this.game);
      const resource=animal?null:this.view.pickResource(cx,cy,this.game);
      if(animal)this.game.selectCritter(animal,additive);
      else if(resource){if(!additive)this.game.clearSelect();this.game.selectedResource=resource;}
      else if(!additive&&(this.game.selectedUnits().length||this.game.selectedBoat!==null)){
        const target = boatOrder ? g : this.residentMovePoint(cx,cy,g);
        this.game.issueMove(target.x,target.z);
      }
      else {
        const surface=this.view.waterAt(cx,cy,this.game.world.waterY);
        const camera=this.view.camera.position;
        const reach=surface&&surface.distanceTo(camera)<=g.distanceTo(camera)+.2?waterReachAt(this.game,surface):null;
        if(reach){this.game.clearSelect();this.game.selectedWaterReach=reach;surveyReachFish(this.game,reach);}
        else this.game.selectAt(g.x,g.z,additive);
      }
    }
    this.pushHud();
  }

  rightClick(cx: number, cy: number,queue=false) {
    if(this.workerHost){const point=this.view.groundAt(cx,cy);if(point&&this.game.selectedUnits().length)void this.dispatch({kind:'move',unitIds:this.game.selectedUnits().map(u=>u.id),x:point.x,z:point.z}).catch(console.error);return;}
    const g = this.game.selectedBoat!==null ? this.view.waterAt(cx,cy,this.game.world.waterY) : this.view.groundAt(cx, cy);
    if (!g) return;
    if (this.game.state.placing) {
      this.game.state.placing = null;
      this.view.setGhost(null, 0, 0, 0, false);
      return;
    }
    if(this.game.selectedBoat!==null){this.game.issueMove(g.x,g.z);this.pushHud();return;}
    const record=this.view.pickMethodRecord?.(cx,cy,this.game);
    if(record){
      const actor=this.game.selectedUnits().find(u=>u.team===0&&u.hp>0);
      if(!actor){this.presentationNotice('Select a resident to collect this method record',3);return;}
      const original=this.game,epoch=this.sessionEpoch;void this.dispatch({kind:'method-record-pickup',unitId:actor.id,recordId:record.id},{selectedUnitIds:[actor.id]}).then(result=>{if(this.game===original&&this.sessionEpoch===epoch&&!this.disposed)this.presentationNotice(result.reason,result.accepted?2:4);}).catch(error=>{if(this.game===original&&this.sessionEpoch===epoch&&!this.disposed)this.presentationNotice(error instanceof Error?error.message:String(error),4);});return;
    }
    const looseCart=this.view.pickDraftCart?.(cx,cy,this.game);
    if(looseCart){
      const selected=this.game.selectedUnits().filter(u=>u.team===0&&u.hp>0),actor=selected.find(u=>draftCartChoices(this.game,u.id).loose.some(c=>c.id===looseCart.cart.id&&!c.issue))??selected[0];
      if(!actor){this.presentationNotice('Select a nearby resident to recover this cart',3);return;}
      const original=this.game;void this.dispatch({kind:'recover-draft-cart',unitId:actor.id,cartId:looseCart.cart.id}).then(result=>{if(this.game===original)this.presentationNotice(result.reason,result.accepted?2:4);}).catch(error=>this.presentationNotice(error instanceof Error?error.message:String(error),4));return;
    }
    const ent = this.view.pickEntity(cx, cy, this.game) || this.game.entityAt(g.x, g.z);
    if (ent && ent.team !== 0 && this.game.visibleAt(ent.x, ent.z)) this.game.issueAttack(ent);
    else if(ent?.kind==="building"&&ent.team===0&&(!this.game.finished(ent)||ent.expansion)){if(queue)this.game.queueConstruction(ent);else this.game.orderConstruction(ent);}
    else {
      const node = this.view.pickWildlife(cx,cy,this.game) || this.view.pickResource(cx,cy,this.game) || (this.game.exploredAt(g.x, g.z) ? this.game.resourceAt(g.x, g.z) : null);
      if (node) this.game.issueGather(node);
      else {
        const target = this.residentMovePoint(cx,cy,g);
        this.game.issueMove(target.x,target.z);
      }
    }
  }

  private updateGhost(force=false) {
    // A 131m field has 4,489 full-footprint survey points. Preview at most 5Hz;
    // clicks always refresh the exact pointer and validate again in placeBuilding.
    if(this.game.state.placing==='farm'){const now=performance.now();if(!force&&now<this.nextFieldPreviewAt)return;this.nextFieldPreviewAt=now+200;}
    this.view.setLinePreview([]);
    const type = this.game.state.placing;
    if (!type) {
      const b=this.game.state.selBld;
      if(b?.expansion){this.view.setGhost(b.type,b.x,b.z,b.y,true,undefined,null,b.expansion);return;}
      this.view.setGhost(null, 0, 0, 0, false);
      return;
    }
    const g = this.view.groundAt(this.pointer.x, this.pointer.y);
    if (!g) return;
    const snap = compactGrainWorkplace(type) ? 0.25 : TILE;
    let x = Math.round(g.x / snap) * snap;
    let z = Math.round(g.z / snap) * snap;
    if (type === "dock") {
      const site = this.game.nearestDockSite(g.x, g.z, 14);
      if (site) {
        x = site.x;
        z = site.z;
      }
    }
    this.plotSize=scalablePlot(type)&&(this.plotWidth>1||this.plotDepth>1)?{w:BUILDINGS[type].w*this.plotWidth,d:BUILDINGS[type].d*this.plotDepth}:undefined;
    if(this.plotStart&&scalablePlot(type)&&plotDragIntent(this.plotPointerStart,this.pointer,this.plotStart,g)){
      const plot=dragPlot(type,this.plotStart,g);x=plot.x;z=plot.z;this.plotSize={w:plot.w,d:plot.d};
    }
    this.fieldArea=null;
    if(type==='farm'&&this.plotStart&&plotDragIntent(this.plotPointerStart,this.pointer,this.plotStart,g)&&(Math.abs(g.x-this.plotStart.x)>BUILDINGS.farm.w*3||Math.abs(g.z-this.plotStart.z)>BUILDINGS.farm.d*3)){
      const plan=planFieldArea(this.game,this.plotStart,g,0);
      if(plan.tiles.length>1){
        this.fieldArea=plan;this.view.setLinePreview(plan.tiles.map(t=>({x:t.x,z:t.z,y:this.game.height(t.x,t.z),ok:!t.issue})));
        const fert=fertilityPreview(this.game,{x:(this.plotStart.x+g.x)/2,z:(this.plotStart.z+g.z)/2,w:Math.abs(g.x-this.plotStart.x),d:Math.abs(g.z-this.plotStart.z)});
        const key=`area${plan.valid}/${plan.tiles.length}/${plan.seeds}`;
        if(key!==this.plotPreviewKey){this.plotPreviewKey=key;this.game.banner(`${plan.valid}/${plan.tiles.length} fields · ${plan.seeds} seeds · headlands between${fert.summary?` · ${fertilityText(fert)}`:''}${plan.valid<plan.tiles.length?' · red plots blocked':''}`,4);}
      }
    }
    if(type==='farm'&&!this.fieldArea){
      const fert=fertilityPreview(this.game,{x,z,w:this.plotSize?.w,d:this.plotSize?.d}),key=fert.summary?fertilityText(fert):'';
      if(key&&key!==this.fertilityKey&&!this.plotStart){this.fertilityKey=key;this.game.banner(`Field · ${key}`,2);}
    }
    if(scalablePlot(type)&&!this.fieldArea){
      const key=type+JSON.stringify(this.plotSize);
      if(key!==this.plotPreviewKey){this.plotPreviewKey=key;const cost=buildingCost(type,this.game,0,this.plotSize);this.game.banner(type==="farm"?`Field · ${cost.seeds} seeds · drag to size`:`${type==='pen'?'Pen':'Store'} · ${cost.wood} logs · drag to size`,4);}
    }
    if(linearStructure(type)&&this.plotStart){
      const line=joinedConstructionLine(this.game.state.buildings,type,this.plotStart,g),end=line[line.length-1];
      if(!end)return;
      x=end.x;z=end.z;
      let blocked=false;
      this.view.setLinePreview(line.map(p=>{blocked=blocked||!this.game.placementValid(type,p.x,p.z,0);return {...p,y:this.game.height(p.x,p.z),ok:!blocked};}));
      const unitCost=buildingCost(type,this.game),costs=[unitCost.wood?`${(unitCost.wood||0)*line.length} logs`:'',unitCost.stone?`${(unitCost.stone||0)*line.length} stone`:''].filter(Boolean).join(' · ');
      this.game.banner(`${line.length} sections${costs?' · '+costs:''}${blocked?' · red sections blocked':' · leave a gate'}`,2);
    }
    this.bridgeSpan=undefined;
    if(type==='bridge'&&this.plotStart&&Math.hypot(g.x-this.plotStart.x,g.z-this.plotStart.z)>2){
      this.bridgeSpan={ax:this.plotStart.x,az:this.plotStart.z,bx:g.x,bz:g.z};
      x=(this.plotStart.x+g.x)/2;z=(this.plotStart.z+g.z)/2;
      const cost=buildingCost(type,this.game,0,undefined,this.bridgeSpan);
      this.game.banner(`Bridge · ${Math.hypot(g.x-this.plotStart.x,g.z-this.plotStart.z).toFixed(0)} m · ${cost.wood} logs · ${cost.stone} stone`,2);
    }
    if(type==='gate'){
      const snap=this.gateFacingExplicit?snapGate(this.game.state.buildings,{x,z},this.gateFacing):suggestGateSnap(this.game.state.buildings,{x,z},this.gateFacing);
      if(snap){x=snap.x;z=snap.z;this.gateFacing=snap.facing;}
    }
    const geometryIssue = this.game.placementIssue(type, x, z, 0,this.plotSize,undefined,this.bridgeSpan,this.placementTurn());
    const issue = geometryIssue ?? (type==='farm'?fieldSeedIssue(this.game.tribe(0).seeds||0,buildingCost(type,this.game,0,this.plotSize).seeds||0):null);
    this.game.state.placeIssue = issue;
    this.ghostPos.x = x;
    this.ghostPos.z = z;
    const bridge=type==="bridge"?(this.bridgeSpan??planBridge(this.game,x,z)):null;
    this.view.setGhost(type, x, z, bridge?bridgeHeight(this.game,bridge,x,z):type==='fibreWorkshop'?fibreWorkshopPlacementLevel(this.game,x,z):this.game.height(x, z), !issue, type === "farm" ? soilQuality(this.game,x,z) : undefined,bridge,this.plotSize,type==='gate'?this.gateFacing:undefined,type==='watchtower'?towerBuildConfiguration(this.game,0):undefined,this.placementTurn());
  }
  /** The quarter turn only applies to turnable, unsized placements (same rule as placementIssue). */
  private placementTurn(){const t=this.game.state.placing;return this.quarterTurn&&!!t&&!this.plotSize&&turnableBuilding(t);}

  setGateFacing(facing:GateFacing){
    this.gateFacing=normalizeGateFacing(facing);this.gateFacingExplicit=true;this.updateGhost();this.pushHud();
  }

  toggleLogging() {
    this.loggingMode = !this.loggingMode;
    this.game.state.placing = null;
    this.moveMode = false;
    this.game.banner(this.loggingMode ? "Mark trees: drag over a stand, or aim and press Enter. Repeat to clear marks. Esc to finish." : "Tree marking finished", 3);
    this.canvas.focus();
    this.pushHud();
  }

  upgradeHome(id:number){const r=beginHousingUpgrade(this.game,id);this.game.banner(r.reason,5);this.pushHud();return r;}
  tryHome(id:number){const r=beginHomeUse(this.game,id);this.game.banner(r.reason,5);this.pushHud();return r;}
  pauseHome(id:number,paused:boolean){const accepted=setHousingPaused(this.game,id,paused);this.pushHud();return accepted;}

  setPlacing(type: BldType | null) {
    this.nextFieldPreviewAt=0;this.waterDraft=null;
    this.bridgeSpan=undefined;this.plotStart=null;this.plotPointerStart=null;this.plotSize=undefined;this.plotWidth=1;this.plotDepth=1;
    if(type==='gate')this.gateFacingExplicit=false;
    if(type!==this.game.state.placing)this.quarterTurn=false;
    this.loggingMode = false;
    if (type && this.game.state.ended) return;
    if(type==="house"&&housingAdoptionIssue(this.game)){this.game.banner(housingAdoptionIssue(this.game)!,5);this.pushHud();return;}
    if(type==="farm"&&cultivationIssue(this.game)){
      this.game.banner(cultivationIssue(this.game)!,5);this.pushHud();return;
    }
    this.game.state.placing = this.game.state.placing === type ? null : type;
    if (this.game.state.placing) {
      const t = this.game.state.placing;
      const d = BUILDINGS[t];
      this.game.banner(
        t === "cornerstone"
          ? "Outpost — choose explored dry ground at least 64m from your halls and other outposts. Costs 70 logs; plans can wait for materials."
          : t === "dock"
          ? "Fishing Dock — click the white posts by the water"
          : t === "farm"
            ? "Farm — drag a rectangle. Larger fields need more seeds and workers."
            : t === "warehouse" ? "Storehouse — drag a rectangle. Larger stores cost more and hold more." : t === "quarry"
              ? "Quarry — choose a stone outcrop or gentle mountain slope. Two miners dig and haul stone."
              : t === "bridge"
                ? "Bridge — drag bank to bank (5–28 m), or click a narrow river for an automatic crossing."
              : linearStructure(t) ? "Drag a defensive line. Each section needs materials and builders. Leave room for a gate."
              : "Click the valley to raise a " + d.name + "  ·  Esc cancel",
        2.6,
      );
    }
    this.updateGhost();
    this.audio.play("click");
    this.pushHud();
  }

  recycle() {
    this.game.recycleSelected();
    this.pushHud();
  }

  craftFarmTool(kind: Parameters<Game["craftFarmTool"]>[0], workplaceId?:number) {
    this.game.craftFarmTool(kind,workplaceId);
    this.pushHud();
  }

  craftHaulage(kind: "sled" | "cart" | "canoe" | "pack", workplaceId?:number) {
    this.game.craftHaulage(kind,workplaceId);
    this.pushHud();
  }

  craftWeapon(kind: "spear" | "bow" | "blade", workplaceId?:number) {
    this.game.craftWeapon(kind,workplaceId);
    this.pushHud();
  }

  callToArms() {
    this.game.callToArms(0);
    this.pushHud();
  }

  standDown() {
    this.game.standDown(0);
    this.pushHud();
  }

  train(type: Parameters<Game["trainSelected"]>[0]) {
    this.game.trainSelected(type);
    this.pushHud();
  }

  clearSelection() {
    this.game.clearSelect();
    this.moveMode=false;
    this.pushHud();
  }

  assignJob(job: Parameters<Game["assignJob"]>[0]) {
    this.game.assignJob(job);
    this.pushHud();
  }

  trade(deal: Parameters<Game["tryTrade"]>[0]) {
    this.game.tryTrade(deal);
    this.pushHud();
  }

  bankTrade(give: Parameters<Game["bankTrade"]>[0], get: Parameters<Game["bankTrade"]>[1]) {
    this.game.bankTrade(give, get);
    this.pushHud();
  }

  cycleTrade() {
    this.game.cycleTrade();
    this.pushHud();
  }

  focusTribe(id: number) {
    const camp = this.game.world.camps.find((c) => c.team === id);
    if (!camp) return;
    if (id !== 0 && !this.game.exploredAt(camp.x, camp.z)) {
      this.game.banner("That shore is still in fog. Send someone to explore.", 1.8);
      this.pushHud();
      return;
    }
    if (id !== 0) this.game.setTradeTeam(id);
    this.view.look.set(camp.x, this.game.height(camp.x, camp.z) + 0.5, camp.z);
    this.pushHud();
  }

  raidRival() {
    this.game.raidRival();
    this.pushHud();
  }

  offerPact() {
    this.game.offerPact();
    this.pushHud();
  }

  acceptRoute() {
    this.game.acceptRoute();
    this.pushHud();
  }

  declineRoute() {
    this.game.declineRoute();
    this.pushHud();
  }

  halt() {
    this.game.haltSelected();
    this.pushHud();
  }

  ageUp() {
    this.game.tryAgeUp(0);
    this.pushHud();
  }

  pickAge(which: "econ" | "army") {
    this.game.commitAge(0, which);
    this.pushHud();
  }

  cancelAge() {
    this.game.state.pendingAge = false;
    this.pushHud();
  }

  trainPeople() {
    this.game.assignJob("drill");
    this.pushHud();
  }

  focusIdle() {
    const u = this.game.focusIdleWorker();
    if (u) this.view.look.set(u.x, u.y + 0.5, u.z);
    this.pushHud();
  }

  cycleVillager(direction=1) {
    const u=this.game.cycleVillager(direction);
    if(u)this.view.look.set(u.x,u.y+0.5,u.z);
    this.canvas.focus();this.pushHud();
  }

  focusHome() {
    const c = this.game.campOf(0);
    this.view.look.set(c.x, this.game.height(c.x, c.z) + 0.5, c.z);
    this.canvas.focus();
  }

  explore() {
    this.game.issueExplore();
    this.pushHud();
  }

  setPaused(p: boolean) {
    if(this.workerHost)return this.dispatch({kind:'pause',paused:p});
    this.game.state.paused = p;
    if(p)saveGame(this.game);
    this.pushHud();
  }

  setSpeed(s: number) {
    if(this.workerHost)return this.dispatch({kind:'speed',speed:s===4||s===3?4:s===2?2:1,resume:true});
    this.game.state.speed = s === 4 || s === 3 ? 4 : s === 2 ? 2 : 1;
    this.game.state.paused = false;
    this.pushHud();
  }

  private audioProbeAt = 0;
  private audioWorld: ReturnType<typeof probeWorld> | null = null;
  /** Procedural score and environment: probe real state at ~2 Hz, feed the mixer every frame. Fails silent. */
  private updateProceduralAudio(dt: number) {
    if (!this.audio.proc.active) return;
    try {
      const now = performance.now();
      const paused = !!this.game.state.paused;
      if (!this.audioWorld || now - this.audioProbeAt > 500) {
        this.audioProbeAt = now;
        this.audioWorld = probeWorld(this.game, { x: this.view.look.x, z: this.view.look.z, yaw: this.view.yaw, dist: this.view.dist }, this.game.state.seed, paused, this.game.musicMood(), false);
      }
      this.audio.updateWorld(dt, { ...this.audioWorld, paused });
    } catch {
      /* audio must never break the frame */
    }
  }

  toggleMute() {
    this.game.muted = !this.game.muted;
    this.audio.setMuted(this.game.muted);
    this.pushHud();
  }

  setRenderStyle(style:RenderStyle) {
    if(style!=='current'&&style!=='optionH'&&style!=='village')return;
    this.view.setStyle(style);
    rememberRenderStyle(style);
  }

  setQuality(q: "low" | "med" | "high") {
    if(this.workerHost)this.workerHost.projection.setDisplaySettings(q,this.fps);else this.game.quality = q;
    this.view.applyQuality(q);
    rememberGraphicsQuality(q);
  }

  focusMinimap(nx: number, nz: number) {
    this.view.look.x = nx;
    this.view.look.z = nz;
    this.view.look.y = this.game.height(nx, nz) + 0.4;
  }

  private frame = (t: number) => {
    if (this.disposed) return;
    try {
      const frameGap=this.profile.frame(t);
      const workerWallDt=Number.isFinite(t)&&Number.isFinite(this.last)&&this.last>0?Math.max(0,(t-this.last)/1000):0;
      const dt = frameDeltaSeconds(t,this.last);
      this.last = t;
      this.frames++;
      this.fpsAcc += frameGap/1000;
      if (this.fpsAcc >= 0.4) {
        this.fps = this.profile.frameRate(RUNTIME_PROFILE_RULES.displayRateWindowMilliseconds);
        if(this.workerHost)this.workerHost.projection.setDisplaySettings(this.view.quality,Math.round(this.fps));else this.game.fps = Math.round(this.fps);
        this.frames = 0;
        this.fpsAcc = 0;
      }

      this.view.pan.x = 0;
      this.view.pan.z = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.view.pan.z += 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.view.pan.z -= 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.view.pan.x -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.view.pan.x += 1;
      if (this.keys.has("KeyQ")) this.view.yaw += 0.9 * dt;
      if (this.keys.has("KeyE")) this.view.yaw -= 0.9 * dt;

      if (this.view.lost) {
        this.hudAcc += dt;
        if (this.hudAcc > 0.3) {
          this.hudAcc = 0;
          this.pushHud();
        }
        return;
      }

      if(this.workerHost){if(!document.hidden&&!this.lifecycleBusy&&!this.closing)this.workerHost.advanceWallTime(workerWallDt);}
      else if(this.workerBridgeTransition||this.lifecycleBusy||this.closing){/* Sole authority is transferring; main never steps. */}
      else if (document.hidden) {
        this.simAccumulator = 0;
      } else {
        if(this.profile.personMethods.enabled)this.profile.personMethods.attach(this.game);
        const scheduling=advanceFrameSimulation(this.simAccumulator,dt,
          step=>this.profile.measure('simulation',()=>this.game.step(step,this.profile.simulationPhases)));
        this.simAccumulator=scheduling.pendingSeconds;
        this.profile.recordScheduling(scheduling);
      }
      this.audio.setMood(
        this.game.musicMood(),
        this.game.tribe(0).age,
        this.game.popNow(),
        dt,
        this.game.state.paused,
        this.game.seasonMix().name,
      );
      this.updateProceduralAudio(dt);
      if (this.keys.has("PageUp")) this.view.dist *= Math.exp(-dt);
      if (this.keys.has("PageDown")) this.view.dist *= Math.exp(dt);
      this.view.updateCamera(dt);
      if (this.keyboard.mode) this.keyboard.center();
      this.updateGhost();
      this.profile.measure('scene',()=>this.view.sync(this.game, dt));
      this.profile.measure('draw',()=>this.view.render());
      this.profile.recordRenderer(this.view.latestRenderMetrics);
      if(!this.workerHost)this.tuneQuality(dt);

      this.hudAcc += dt;
      if (this.hudAcc > 0.12) {
        this.hudAcc = 0;
        this.profile.measure('interface',()=>this.pushHud());
      }
      this.saveAcc += dt;
      if (this.saveAcc > 18) {
        this.saveAcc = 0;
        this.profile.measure('save',()=>this.autosave.request());
      }
      this.failFrames = 0;
    } catch (err) {
      console.error(err);
      this.failFrames++;
      if (this.failFrames >= 2 && this.game.quality !== "low") {
        this.failFrames = 0;
        this.setQuality(this.game.quality === "high" ? "med" : "low");
        if(!this.workerHost)this.game.banner("The valley eases", 1.8);
      }
    }
  };

  private tuneQuality(dt: number) {
    if (this.game.quality === "low") {
      this.slowFps = 0;
      return;
    }
    if (this.fps > 0 && this.fps < 18 && this.frames + this.fpsAcc > 0) {
      this.slowFps += dt;
      if (this.slowFps > 3.2) {
        this.slowFps = 0;
        this.setQuality(this.game.quality === "high" ? "med" : "low");
        this.game.banner("Graphics reduced to keep the village responsive", 3);
      }
    } else {
      this.slowFps = Math.max(0, this.slowFps - dt * 0.5);
    }
  }

  pushHud() {
    if(this.workerHost){if(this.workerHost.ready){const notice=this.presentationFeedback&&this.presentationFeedback.expires>performance.now()?this.presentationFeedback.message:this.workerHost.hud.banner;this.hud({...this.workerHost.hud,fps:this.fps,banner:notice});}return;}
    try {
      const type=this.game.state.placing;
      const cost=type?buildingCost(type,this.game,0,this.plotSize,this.bridgeSpan):null;
      const sections=type&&linearStructure(type)&&this.plotStart?joinedConstructionLine(this.game.state.buildings,type,this.plotStart,this.ghostPos).length:1;
      const materials=cost?Object.entries(cost).filter(([,amount])=>amount>0).map(([kind,amount])=>`${amount*sections} ${kind==='wood'?'logs':kind}`).join(' · '):'';
      const summary=type?`${sections>1?sections+' sections · ':''}${materials||'Labor only'}`:undefined;
      this.hud({...this.game.snapshot(),plotSummary:summary});
    } catch (err) {
      console.error(err);
    }
  }

  getDragRect() {
    if (!this.drag) return null;
    if (Math.hypot(this.drag.x - this.drag.sx, this.drag.y - this.drag.sy) < 8) return null;
    return this.drag;
  }

  private installProbe() {
    window.__controlsTest = {
      getYaw: () => this.view.yaw,
      getSpeed: () =>
        Math.hypot(this.view.pan.x, this.view.pan.z) + (this.running ? this.view.dist * 0.001 : 0),
      setKeys: (codes: string[]) => {
        this.keys.clear();
        for (const c of codes) this.keys.add(c);
      },
    };
    (window as unknown as { __engine?: Engine }).__engine = this;
  }

  dispose():Promise<void>{
    if(this.disposal)return this.disposal;if(this.disposed)return Promise.resolve();
    const source=this.game,owner=this.workerHost??null,retained=this.originalWorkerHost??null;
    this.closing=true;this.lifecycleBusy=true;this.lifecycleSequence=(this.lifecycleSequence??0)+1;this.dispatchGeneration=(this.dispatchGeneration??1)+1;
    this.productionDeliveries?.clear();
    this.running=false;this.profile?.personMethods.dispose();if(this.profile)this.profile.simulationPhases.enabled=false;this.autosave.dispose();
    this.view.renderer.setAnimationLoop(null);
    this.ro?.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("pagehide",this.onPageHide);
    window.removeEventListener("beforeunload",this.onPageHide);
    document.removeEventListener("visibilitychange", this.onVis);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave",this.onPointerLeave);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("wheel", this.onWheel);
    this.view.dispose();
    this.audio.dispose();

    this.disposal=(async()=>{
      try{
        if(owner?.ready)await owner.dispatch({kind:'pause',paused:true});
        const saved=await this.checkpointService.save(source.testMode?'test-lab':'village',false);
        this.lastLifecycle={operation:'dispose',mode:owner?'worker':'main',save:saved.status};
      }catch(error){this.lastLifecycle={operation:'dispose',mode:owner?'worker':'main',save:'failed'};console.error(error);}
      finally{owner?.dispose();if(retained&&retained!==owner)retained.dispose();this.workerHost=null;this.originalWorkerHost=null;this.disposed=true;this.lifecycleBusy=false;}
    })();return this.disposal;
  }

}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}

/** T9 (Grok): fertility words for the field-placement banner, from fertilityPreview (fieldTerrain when fully explored). */
function fertilityText(f:ReturnType<typeof fertilityPreview>){const s=f.summary;if(!s)return '';const soil=s.soil>=.7?'rich soil':s.soil>=.45?'fair soil':'poor soil';return `${soil} · grain ×${s.grainYieldFactor.toFixed(2)}${f.state==='partial'?' (partly explored)':''}`;}
