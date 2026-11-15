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
import {queueConstruction} from "./constructionQueue";
import {turnableBuilding,orientableBuilding} from "./footprints";
import {planFieldArea,fieldRefusalSummary,placeFieldArea,type FieldAreaPlan} from './fieldArea';
import {snapFieldRect,snapFieldPoint,type SnapResult} from './fieldSnap';
import {fertilityPreview} from './fertilityPreview';
import {advanceTide} from './tides';
import {weatherWaterLevel} from './hydrology';
import {seaSurfaceY} from './localWater';
import {surveyReachFish,waterReachAt} from './waterReach';
import { compactGrainWorkplace } from './cerealRules';
import {isWorkplaceTarget,orderWorkAtBuilding} from './workAtBuilding';
import {beginHousingUpgrade,beginHomeUse,setHousingPaused,housingAdoptionIssue} from './housing';
import {AutosaveController} from './autosave';
import {fibreWorkshopPlacementLevel} from '../scene/fibreWorkshop';
import {advanceFrameSimulation} from './frameSimulation';
import {towerBuildConfiguration} from './towerPlatforms';
import {rememberRenderStyle,type RenderStyle} from './graphics';
import type {DrawDistance} from './drawDistance';
import {GraphicsSettings,type Effective,type GraphicsChoice,type DrawChoice,type TreeChoice,type Knob} from './graphicsSettings';
import {rememberDetailLevel,type DetailLevel} from './detailLevel';
import {gateFacing as normalizeGateFacing,rotateGateFacing,snapGate,suggestGateSnap,placeFacingGate,type GateFacing} from './gateGeometry';
import {RuntimeProfile,RUNTIME_PROFILE_RULES} from './runtimeProfile';
import {projectedTreeInBox} from './treeDesignation';
import {orderGatherTargets} from './treeDesignation';
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
import { buildingHoverText } from "./buildingHoverText";
import {slopeClassOf} from "./slopeTiers";
import {turnedFootprint} from "./footprints";
import { Game } from "./sim";
import { GameAudio } from "./audio";
import { probeWorld } from "./audioProbe";
import { saveGame, loadRaw, hasSave, protectGame, exportGame, saveTestLabGame, loadTestLabGame } from "./save";
import type { BldType, HudSnapshot } from "./types";
import { WorldView } from "@/scene/world";
import { cameraOwnsWheel, wheelZoomFactor } from "./cameraInput";
import {newPossession,chooseVillager,liveUnit,followOrder,followSent,taskGiven,takeOver,eyeTowardUnit,handBack,isArmed,meleeTarget,heldLabel,crosshairVerb,type Possession} from "./firstPersonActions";
import {FIRST_PERSON_RULES,FIRST_PERSON_PREF_KEY,parseFirstPersonPrefs,newMode as newFirstPerson,enter as enterFirstPersonMode,exit as exitFirstPersonMode,stepBody as stepFirstPersonBody,eyePose as firstPersonEye,lookDelta as firstPersonLook,forwardOf as firstPersonForward,walkingDrawLevel,type FirstPersonWorld,type FirstPersonMode} from "./firstPerson";

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
    const game=decodeGame(snapshot);game.testMode=testMode;game.revealMap=testMode&&revealMap;game.state.paused=testMode;if(testMode)game.updateVision();return{game,host:null};
  }
  private installVillage(next:PreparedVillage,retainPrevious=false){
    const previous={game:this.game,host:this.workerHost??null},quality=this.game.quality,muted=this.game.muted;
    if(next.host)next.host.projection.setDisplaySettings(quality,this.fps);else{next.game.quality=quality;next.game.muted=muted;this.bindNativeCallbacks(next.game);}
    // Renderer preparation may fail. Keep the real paused owner alive until it succeeds.
    try{this.gfx?.hold();this.view.rebuild(next.game);const c=next.game.campOf(0);this.view.look.set(c.x,next.game.height(c.x,c.z)+.55,c.z);this.audio.unlock();this.canvas.focus();if(!next.host)this.profile?.personMethods.attach(next.game);}catch(error){if(next.host&&next.host!==previous.host)next.host.dispose();try{this.gfx?.hold();this.view.rebuild(previous.game);}catch{/* Existing owner and durable checkpoint remain; never construct a fallback village. */}throw error;}
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
  async dispatch(command:EngineDispatchCommand,selection?:EngineSelection,opts?:{notice?:boolean}):Promise<EngineDispatchResult>{
    const result=await this.dispatchRaw(command,selection);
    /* A refused order is never silent: one visible banner with the reason plus the refusal cue. Callers with their own feedback list (council) pass notice:false. */
    if(!result.accepted&&opts?.notice!==false&&result.reason&&!this.disposed){this.presentationNotice(result.reason,4);try{this.audio?.play('invalid');}catch{/* cue is optional */}}
    return result;
  }
  private async dispatchRaw(command:EngineDispatchCommand,selection?:EngineSelection):Promise<EngineDispatchResult>{
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
      this.simAccumulator=0;this.gfx?.hold();this.view.rebuild(this.game);this.view.resize();
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
  /** Field Water mode: irrigated and rain-fed plots tinted on the map. Display only. */
  fieldWaterMode=false;
  setFieldWaterMode(on:boolean){this.fieldWaterMode=on;this.view.setFieldWaterMode(on);this.pushHud();}
  /** Planned irrigation ditch drawn on the terrain while the player reads the quote. */
  previewDitch(plan:{from:{x:number;z:number};to:{x:number;z:number};ok:boolean;length:number}|null){this.view.setDitchPreview(plan&&plan.length>0?{x0:plan.from.x,z0:plan.from.z,x1:plan.to.x,z1:plan.to.z,ok:plan.ok}:null);}
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
  setWorldFeature(feature:'flow'|'tides',enabled:boolean){
    const options=this.game.state.worldOptions??this.game.world.options;if(!options)return;
    const next={...options};if(feature==='flow'){if(enabled)next.flowFieldVersion=1;else delete next.flowFieldVersion;}else{if(enabled)next.tideVersion=2;else delete next.tideVersion;}
    this.game.state.worldOptions=next;this.game.world.options=next;this.game.configureFlowFields();
    if(feature==='tides'&&!enabled){this.game.world.seaTideY=0;this.game.world.waterY=weatherWaterLevel(this.game.world.baseWaterY,this.game.state.weather);this.game.rebuildWalk();}
    else if(feature==='tides')advanceTide(this.game);this.pushHud();
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
  /** First-person mode (src/game/firstPerson.ts). Presentation only: nothing here is saved, the sim keeps running, orders go through leftClick/rightClick at the crosshair. */
  firstPerson:FirstPersonMode={...newFirstPerson(),bobEnabled:(()=>{try{return parseFirstPersonPrefs(localStorage.getItem(FIRST_PERSON_PREF_KEY)).bob;}catch{return false;}})()};
  /** What the crosshair is on (person, animal or building), refreshed a few times a second while walking. */
  firstPersonLabel="";
  /** The villager the walker controls (null = bodiless witness). It follows the avatar through ordinary move orders; the village AI resumes on exit. */
  possession:Possession=newPossession();
  /** What the controlled villager holds or carries, and what a right-click would do at the crosshair. */
  firstPersonHeld="";
  private fpLockHeld=false;
  private fpSolids:{at:number;list:{x:number;z:number;w:number;d:number}[];circles:{x:number;z:number;r:number}[]}={at:-1,list:[],circles:[]};
  private fpHoverAt=0;
  private fpFpsAt=0;
  private fpLevelEased=false;
  private simAccumulator = 0;
  moveMode = false;
  loggingMode = false;
  pointer = { x: 0, y: 0 };
  private nextHoverAt=0;
  /** Hover card for a building under the cursor (era, condition, repair) via the plain `title`; empty when none. */
  private hoverBuildingTitle(x:number,y:number){const hit=this.view.pickEntity(x,y,this.game);const b=hit?.kind==='building'?this.game.state.buildings.find(v=>v.id===hit.id):undefined;return b&&b.hp>0?buildingHoverText(b as never,BUILDINGS[b.type]?.name):"";}
  private updateDragPreview(){const d=this.drag;if(!d||Math.hypot(d.x-d.sx,d.y-d.sy)<=8){this.view.previewUnitIds=null;return;}const x0=Math.min(d.sx,d.x),x1=Math.max(d.sx,d.x),y0=Math.min(d.sy,d.y),y1=Math.max(d.sy,d.y),ids=new Set<number>();for(const u of this.game.state.units){if(u.team!==0||u.hp<=0||u.shelterId)continue;const q=this.view.project(u.x,u.y+.6,u.z);if(!q.behind&&q.x>=x0&&q.x<=x1&&q.y>=y0&&q.y<=y1)ids.add(u.id);}this.view.previewUnitIds=ids;}
  private onPointerLeave=()=>{this.view.hoveredUnitId=null;this.canvas.title="";};
  gateFacing:GateFacing="north";
  /** GW-08 / T8 (Grok): quarter-turn for the current placement; preview and commit both read it. */
  quarterTurn=false;turnCount=0;
  /** GW-02 / T9 (Grok): a farm drag wider than one field becomes several fields with headlands. */
  fieldArea:FieldAreaPlan|null=null;
  fieldSnap:SnapResult|null=null;
  private fertilityKey='';private fertilityCellsKey='';
  /** Toggle the quarter turn for a turnable building (R key or the Rotate button). */
  rotatePlacement(dir:1|-1=1){const t=this.game.state.placing;if(!t||!orientableBuilding(t)||(scalablePlot(t)&&this.plotSize))return false;this.turnCount=(this.turnCount+dir+4)%4;this.quarterTurn=this.turnCount%2===1&&turnableBuilding(t);this.updateGhost(true);this.pushHud();return true;}
  /** True while a gate or any turnable building is being placed: the rotate buttons and R/Q/E keys act. */
  canRotateAnyPlacement(){return this.game.state.placing==='gate'||this.canRotatePlacement();}
  /** One explicit step: -1 left (Q), +1 right (E or R). Gates step their four facings; other buildings flip the quarter turn. */
  rotatePlacementBy(dir:1|-1){
    if(this.game.state.placing==='gate'){this.setGateFacing(rotateGateFacing(this.gateFacing,dir));return true;}
    return this.rotatePlacement(dir);
  }
  canRotatePlacement(){const t=this.game.state.placing;return !!t&&t!=='gate'&&orientableBuilding(t);}
  private gateFacingExplicit=false;
  ghostPos = { x: 0, z: 0 };
  plotStart: {x:number;z:number}|null=null;
  plotPointerStart:{x:number;y:number}|null=null;
  plotSize: PlotSize|undefined;
  bridgeSpan: BridgeSpan|undefined;
  plotWidth=1;plotDepth=1;
  plotPreviewKey="";
  slopeNoteKey="";
  private nextFieldPreviewAt=0;
  resizePlot(delta:number,depth=false){
    if(depth)this.plotDepth=Math.max(1,Math.min(maximumPlotAxisMultiple(this.game.state.placing??"farm"),this.plotDepth+delta));else this.plotWidth=Math.max(1,Math.min(maximumPlotAxisMultiple(this.game.state.placing??"farm"),this.plotWidth+delta));
    this.updateGhost(true);this.game.banner(`Plot ${this.plotWidth} × ${this.plotDepth} · [ ] width · Shift+[ ] depth`,3);this.pushHud();
  }
  private importSequence = 0;
  disposed = false;
  ro: ResizeObserver | null = null;
  failFrames = 0;
  /** Display settings: what the player chose and what is in force. The only thing that may lower the picture automatically, and only for knobs left on Auto. */
  gfx!: GraphicsSettings;

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
    this.gfx = new GraphicsSettings((e, changed) => this.applyEffective(e, changed));
    this.gfx.start();
    this.view.onContextLost = () => { this.safetyLower('the graphics context was lost'); };
    this.view.onContextRestored = () => {
      try {
        this.gfx?.hold();this.view.rebuild(this.game);
        this.view.resize();
        this.game.banner("The island steadies", 2);
        this.pushHud();
      } catch {
        this.safetyLower('the scene could not be rebuilt');
        try {
          this.gfx?.hold();this.view.rebuild(this.game);
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
      this.game.state.paused = false; // the village starts running; pausing is the player's choice
      // Music on from the first moment: browsers only allow audio after a gesture, so unlock now and again on the first click/key.
      try{this.audio.unlock();}catch{/* audio unavailable */}
      const firstGesture=()=>{try{this.audio.unlock();}catch{/* audio unavailable */}window.removeEventListener('pointerdown',firstGesture);window.removeEventListener('keydown',firstGesture);};
      window.addEventListener('pointerdown',firstGesture);window.addEventListener('keydown',firstGesture);
      this.gfx?.hold();this.view.rebuild(this.game);
      this.homeLook();
      this.view.resize();
    } catch (err) {
      console.error(err);
      if(storedVillage)throw err;
      this.safetyLower('the scene could not be built');
      try {
        this.game.reset();
        this.game.enterIsland();
        this.game.state.paused = false;
        this.gfx?.hold();this.view.rebuild(this.game);
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
    return this.restart({...request,geologyVersion:1,forestEcologyVersion:1},previewRiverbanks&&this.game.testMode?19:21,wildCraft); // fresh worlds carry the geology layer; saved v21 worlds without the flag regenerate unchanged
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
      const game=new Game();game.reset(undefined,generation,{...request,difficulty:request?.difficulty??t.game.state.difficulty??'normal'});game.enterIsland();game.state.paused=!!t.game.testMode;game.testMode=t.game.testMode;if(wildCraft===true)enableWildCraft(game);
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
    document.addEventListener("pointerlockchange", this.onLockChange);
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
    const rot=e.code==='KeyR'?(e.shiftKey?-1:1):e.code==='KeyQ'?-1:e.code==='KeyE'?1:0;
    if(rot&&this.canRotateAnyPlacement()&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!target?.closest?.('input,textarea,select,[contenteditable=true],dialog[open],[role=dialog]')){
      e.preventDefault();if(!e.repeat)this.rotatePlacementBy(rot);return;
    }
    this.keyboard.key(e);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onWheel = (e: WheelEvent) => {
    // UI scrolls itself: never preventDefault or zoom for events that start inside interface chrome.
    // Only the bare canvas (or empty page) owns the wheel: any other element, known HUD class or not, scrolls itself.
    if (!cameraOwnsWheel(e.target, this.canvas)) return;
    e.preventDefault();
    if(this.firstPerson.active)return;
    this.view.dist *= wheelZoomFactor(e);
  };

  private canvasXY(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    if(this.firstPerson.active){this.firstPersonPointerDown(e);return;}
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
    if(this.firstPerson.active){
      if(document.pointerLockElement===this.canvas||e.buttons&3)this.firstPersonLook(e.movementX,e.movementY);
      return;
    }
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    const now=performance.now();
    if(!this.drag&&this.view.previewUnitIds)this.view.previewUnitIds=null;
    if(this.game.state.placing||this.loggingMode||this.drag||this.panDrag||this.rotDrag)this.view.hoveredUnitId=null;
    else if(now>=this.nextHoverAt){this.nextHoverAt=now+80;this.view.hoveredUnitId=this.view.hoverPerson(p.x,p.y,this.game);const animal=this.view.hoveredUnitId===null?this.view.pickWildlife(p.x,p.y,this.game):null;this.canvas.title=animal?(animal.hp>0?`Wild ${animal.species} · right-click with hunters to hunt`:`${animal.species} carcass · ${Math.ceil(animal.carcass?.meat||0)} raw meat remains`):(this.view.hoveredUnitId===null?this.hoverBuildingTitle(p.x,p.y):"");}
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
      this.updateDragPreview();
    }
    this.updateGhost();
  };

  private onPointerUp = (e: PointerEvent) => {
    if(this.firstPerson.active){try{this.canvas.releasePointerCapture(e.pointerId);}catch{/* already released */}return;}
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
    this.view.previewUnitIds=null;
    if (this.drag && e.button === 0) {
      this.drag.x=p.x;this.drag.y=p.y;
      const dx = this.drag.x - this.drag.sx;
      const dy = this.drag.y - this.drag.sy;
      if (Math.hypot(dx, dy) > 8) {
        if(this.workerHost){
          const ids=e.shiftKey?this.game.selectedUnits().map(u=>u.id):[];
          for(const u of this.game.state.units){if(u.team!==0||u.hp<=0)continue;const point=this.view.project(u.x,u.y+.6,u.z);if(!point.behind&&point.x>=Math.min(this.drag.sx,this.drag.x)&&point.x<=Math.max(this.drag.sx,this.drag.x)&&point.y>=Math.min(this.drag.sy,this.drag.y)&&point.y<=Math.max(this.drag.sy,this.drag.y)&&!ids.includes(u.id))ids.push(u.id);}
          if(!ids.length){
            const box={minx:Math.min(this.drag.sx,this.drag.x),maxx:Math.max(this.drag.sx,this.drag.x),miny:Math.min(this.drag.sy,this.drag.y),maxy:Math.max(this.drag.sy,this.drag.y)},treeIds:number[]=[];
            for(const tree of this.game.state.trees){if(tree.amount<=0||!this.game.visibleAt(tree.x,tree.z))continue;if(projectedTreeInBox((x,y,z)=>this.view.project(x,y,z),tree,box))treeIds.push(tree.id);}
            if(treeIds.length){this.markTrees(treeIds);this.drag=null;this.pushHud();return;}
            if(this.gatherInBox(box)){this.drag=null;this.pushHud();return;}
          }
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
          if (ids.length) this.markTrees(ids);
          else if(!this.loggingMode&&this.gatherInBox({minx,maxx,miny,maxy})){/* stone / animal order issued */}
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
    const water = this.view.waterAt(cx,cy,seaSurfaceY(this.game.world));
    return water && this.game.height(water.x,water.z) < this.game.waterAt(water.x,water.z) ? water : ground;
  }

  /** Box-select of stone or huntable animals orders extraction through Game.issueGather (worker mode: a command). */
  gatherInBox(box:{minx:number;maxx:number;miny:number;maxy:number}):boolean{
    const inBox=(n:{x:number;z:number},y:number)=>{const p=this.view.project(n.x,y+.6,n.z);return !p.behind&&p.x>=box.minx&&p.x<=box.maxx&&p.y>=box.miny&&p.y<=box.maxy;};
    const stoneIds=this.game.state.stones.filter(n=>n.amount>0&&this.game.exploredAt(n.x,n.z)&&inBox(n,this.game.height(n.x,n.z))).map(n=>n.id).slice(0,512);
    const animalIds=this.game.state.wildlife.filter(c=>c.hp>0&&this.game.visibleAt(c.x,c.z)&&inBox(c,this.game.height(c.x,c.z))).map(c=>c.id).slice(0,512);
    if(!stoneIds.length&&!animalIds.length)return false;
    if(this.workerHost){void this.dispatch({kind:'gather-targets',stoneIds,animalIds}).catch(console.error);return true;}
    return orderGatherTargets(this.game,stoneIds,animalIds)>0||true;
  }

  /** Fell marks: in worker mode the real simulation owns them, so the order is sent as a command; otherwise the game takes it directly. */
  markTrees(ids:number[],clear=true){
    if(this.workerHost){void this.dispatch({kind:'mark-chop',treeIds:ids.slice(0,1024),clear}).catch(console.error);return;}
    this.game.markChop(ids,clear);
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
    const g = boatOrder ? this.view.waterAt(cx,cy,seaSurfaceY(this.game.world)) : this.view.groundAt(cx, cy);
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
        const plan=planFieldArea(this.game,this.fieldStart()??this.plotStart,g,0,{merge:true}),placed=placeFieldArea(this.game,plan,0);
        this.fieldArea=null;this.view.setLinePreview([]);
        this.game.banner(placed.length?`${placed.length} field${placed.length>1?'s':''} laid out${placed.length<plan.valid?' · ran short of seeds':''}`:'No field could be laid out there',3);
        this.updateGhost();this.pushHud();return;
      }
      if(this.game.state.placing==='gate')placeFacingGate(this.game,this.ghostPos,this.gateFacing);
      else{const before=new Set(this.game.state.buildings.map(b=>b.id));if(this.game.placeBuilding(this.game.state.placing, this.ghostPos.x, this.ghostPos.z, 0,this.plotSize,this.bridgeSpan,this.placementTurn(),this.placementTurns())){const site=this.game.state.buildings.find(b=>!before.has(b.id)&&b.team===0);if(site)queueConstruction(this.game,site,[]);}} // a laid-out site is built: the two nearest free adults are given it, manual or auto
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.loggingMode) {
      const tree = this.game.state.trees.filter(t => t.amount > 0 && this.game.visibleAt(t.x, t.z))
        .filter(t => Math.hypot(t.x - g.x, t.z - g.z) < 8)
        .sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z))[0];
      if (tree) this.markTrees([tree.id]);
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
    if(boat&&boat.team!==0){this.game.selectForeignBoat(boat.id);this.pushHud();return;}
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
        const surface=this.view.waterAt(cx,cy,seaSurfaceY(this.game.world));
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
    const g = this.game.selectedBoat!==null ? this.view.waterAt(cx,cy,seaSurfaceY(this.game.world)) : this.view.groundAt(cx, cy);
    if (!g) return;
    if (this.game.state.placing) {
      this.game.state.placing = null;
      this.view.setGhost(null, 0, 0, 0, false);
      return;
    }
    if(this.game.selectedBoat!==null){
      // right-click on a visible foreign hull names it as the target; anywhere else on water it is a sailing order
      const target=this.view.pickBoat(cx,cy,this.game),own=this.game.selectedBoat;
      if(target&&target.team!==0){const original=this.game;void this.dispatch({kind:'naval-order',action:'attack',boatId:own,targetBoatId:target.id}).then(r=>{if(this.game===original)if(r.accepted)this.presentationNotice(r.reason,2);}).catch(er=>this.presentationNotice(er instanceof Error?er.message:String(er),4));this.pushHud();return;}
      this.game.issueMove(g.x,g.z);this.pushHud();return;
    }
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
    else if(ent?.kind==="building"&&this.game.selectedUnits().length&&isWorkplaceTarget(this.game,ent)){orderWorkAtBuilding(this.game,ent,this.game.selectedUnits());this.pushHud();}
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
    this.view.setLinePreview([]);this.view.setFieldSnap([]);
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
    const dragStart=type==='farm'?this.fieldStart()??this.plotStart:this.plotStart;
    if(dragStart&&scalablePlot(type)&&plotDragIntent(this.plotPointerStart,this.pointer,dragStart,g)){
      const plot=dragPlot(type,dragStart,g);x=plot.x;z=plot.z;this.plotSize={w:plot.w,d:plot.d};
    }
    this.fieldArea=null;
    if(type==='farm'&&this.plotStart&&plotDragIntent(this.plotPointerStart,this.pointer,this.plotStart,g)&&(Math.abs(g.x-this.plotStart.x)>BUILDINGS.farm.w*3||Math.abs(g.z-this.plotStart.z)>BUILDINGS.farm.d*3||this.dragNeedsTrim(dragStart!,g))){
      const plan=planFieldArea(this.game,dragStart!,g,0,{merge:true});
      if(plan.tiles.length>1){
        this.fieldArea=plan;this.fertilityCellsKey='';this.view.setLinePreview(plan.tiles.map(t=>({x:t.x,z:t.z,y:this.game.height(t.x,t.z),ok:!t.issue,w:t.w,d:t.d,green:t.fertility??undefined,reason:t.issue??undefined})));
        const fert=fertilityPreview(this.game,{x:(this.plotStart.x+g.x)/2,z:(this.plotStart.z+g.z)/2,w:Math.abs(g.x-this.plotStart.x),d:Math.abs(g.z-this.plotStart.z)});
        const key=`area${plan.valid}/${plan.tiles.length}/${plan.seeds}/${fieldRefusalSummary(plan)}`;
        if(key!==this.plotPreviewKey){this.plotPreviewKey=key;this.game.banner(`${plan.valid}/${plan.tiles.length} fields · ${plan.seeds} seeds${plan.trimmed?' · blocked ground trimmed':''}${fert.summary?` · ${fertilityText(fert)}`:''}${plan.valid<plan.tiles.length?` · red plots: ${fieldRefusalSummary(plan)}`:''}`,4);}
      }
    }
    this.fieldSnap=null;
    const dragging=!!dragStart&&plotDragIntent(this.plotPointerStart,this.pointer,dragStart,g);
    if(type==='farm'&&!this.fieldArea){
      const size=this.plotSize??{w:BUILDINGS.farm.w,d:BUILDINGS.farm.d};
      // Grid: put the plot's own corner (not its centre) on the tile grid so edges, not middles, line up.
      if(!dragging){x=Math.round((x-size.w/2)/snap)*snap+size.w/2;z=Math.round((z-size.d/2)/snap)*snap+size.d/2;}
      // Neighbours: flush against an adjacent field; a dragged plot keeps its size and is only nudged flush.
      const fs=snapFieldRect(this.game,{x,z,w:size.w,d:size.d},0);
      if(fs.snapped){x=fs.rect.x;z=fs.rect.z;this.fieldSnap=fs;}
    }
    this.view.setFieldSnap(this.fieldSnap?this.fieldSnap.edges:[]);
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
    // Graded slope: say what the ground costs (tier word, goods, labour, foundation) once per change, like the field/pen cost line.
    if(this.game.state.slopeModel==='graded'&&type!=='bridge'&&!this.plotStart&&(!issue||(!!this.game.state.terrainModel&&/^(Too steep|Bare rock|Stone|Drystone|Terrace|Needs terraces)/.test(issue)))){
      // Terrain model v2 also names level sites that carry a nuance (Natural shelf, Sun slope...), points at a nearby shelf when the ground is refused, and says what a terrace field still needs.
      const dims=this.plotSize??(this.placementTurn()?turnedFootprint(type):BUILDINGS[type]),v2=!!this.game.state.terrainModel,sa=slopeClassOf(type)==='exempt'?null:this.game.siteAssessment(type,x,z,dims.w,dims.d,v2),note=sa?(issue&&!sa.ok?`${issue}${sa.shelfHint?` · ${sa.shelfHint}`:''}`:`${sa.label} · ${sa.detail}`):'';
      if(note!==this.slopeNoteKey){this.slopeNoteKey=note;if(sa&&(sa.tier!=='level'||!sa.ok||(v2&&(sa.tags?.length||sa.terrace?.k&&sa.terrace.k!=='none'))))this.game.banner(note,3);}
    }
    if(type==='farm'&&!this.fieldArea){
      // fertility gradient: each 2 m cell of the plot is greener the more fertile it is; the whole plot goes red only when it is refused (the banner says why)
      const size=this.plotSize??{w:BUILDINGS.farm.w,d:BUILDINGS.farm.d},key=`${x.toFixed(1)}|${z.toFixed(1)}|${size.w}|${size.d}|${issue?1:0}|${this.game.state.paused?1:0}`;
      if(key!==this.fertilityCellsKey){
       this.fertilityCellsKey=key;const fp=fertilityPreview(this.game,{x,z,w:size.w,d:size.d}),cw=size.w/fp.columns,cd=size.d/fp.rows,pts:{x:number;z:number;y:number;ok:boolean;w:number;d:number;green?:number;reason?:string}[]=[];
       fp.cells.forEach((c,k)=>{if(!c)return;const px=x+(((k%fp.columns)+.5)/fp.columns-.5)*size.w,pz=z+((Math.floor(k/fp.columns)+.5)/fp.rows-.5)*size.d;pts.push({x:px,z:pz,y:this.game.height(px,pz),ok:!issue,w:cw,d:cd,green:c.greenness,reason:issue??undefined});});
       this.view.setLinePreview(pts);
      }
    }
    this.ghostPos.x = x;
    this.ghostPos.z = z;
    const bridge=type==="bridge"?(this.bridgeSpan??planBridge(this.game,x,z)):null;
    this.view.setGhost(type, x, z, bridge?bridgeHeight(this.game,bridge,x,z):type==='fibreWorkshop'?fibreWorkshopPlacementLevel(this.game,x,z):this.game.height(x, z), !issue, type === "farm" ? soilQuality(this.game,x,z) : undefined,bridge,this.plotSize,type==='gate'?this.gateFacing:undefined,type==='watchtower'?towerBuildConfiguration(this.game,0):undefined,this.placementTurn(),this.placementTurns());
  }
  /** A dragged field that would be refused whole is planned as an area instead, so only its blocked pieces are trimmed away. */
  private dragNeedsTrim(a:{x:number;z:number},b:{x:number;z:number}){const plot=dragPlot('farm',a,b);return !!this.game.placementIssue('farm',plot.x,plot.z,0,{w:plot.w,d:plot.d});}
  /** Field drags start from a neighbouring field's edge or corner when pressed close to it. */
  private fieldStart(){return this.plotStart&&this.game.state.placing==='farm'?snapFieldPoint(this.game,this.plotStart,0):null;}
  /** The quarter turn only applies to turnable, unsized placements (same rule as placementIssue). */
  private placementTurns(){const t=this.game.state.placing;return t&&!this.plotSize&&orientableBuilding(t)?this.turnCount:0;}
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
    if(type!==this.game.state.placing){this.quarterTurn=false;this.turnCount=0;}
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

  /** The player's explicit picks (or Auto). Persisted as chosen; never overridden by the governor; picking anything clears an earlier automatic easing. */
  chooseGraphics(v: GraphicsChoice) { this.gfx.choose('graphics', v); this.noticeBanner(); this.pushHud(); }
  chooseDrawDistance(v: DrawChoice) { this.gfx.choose('draw', v); this.noticeBanner(); this.pushHud(); }
  chooseTreeDetail(v: TreeChoice) { this.gfx.choose('trees', v); this.noticeBanner(); this.pushHud(); }
  /** "Restore my setting": undo every automatic or safety lowering. */
  restoreGraphics() { this.gfx.restore(); this.pushHud(); }
  /** Kept for callers that set the draw distance directly: same as choosing it. */
  setDrawDistance(level: DrawDistance) { this.chooseDrawDistance(level); }
  /** Lower the picture because it cannot run (not because the player asked): not persisted, shown with Restore. */
  private safetyLower(reason: string) {
    const n = this.gfx.safetyDowngrade(reason);
    if (n) { try { this.game.banner(n.text, 4); } catch { /* the banner is a courtesy */ } }
  }
  private noticeBanner() { if (this.gfx.notice) { try { this.game.banner(this.gfx.notice.text, 4); } catch { /* courtesy */ } } }
  /** Put the effective tiers in force. Never stores anything: persistence belongs to chooseX only. */
  private applyEffective(e: Effective, changed: readonly Knob[]) {
    if (changed.includes('draw')) this.view.setEffectiveDrawDistance(e.draw);
    if (changed.includes('trees')) this.view.setTreeDetail(e.trees);
    if (changed.includes('graphics') && e.graphics !== this.view.quality) this.setQuality(e.graphics);
  }
  /** Apply a graphics tier to the renderer (no persistence; also re-applies the current tier after a shadow toggle). */

  /** Detail (model-tier distances and High/Ultra fidelity): render-only, browser preference, never part of a save. */
  setDetailLevel(level: DetailLevel) {
    this.view.setDetailLevel(level);
    rememberDetailLevel(level);
  }

  setQuality(q: "low" | "med" | "high") {
    if(this.workerHost)this.workerHost.projection.setDisplaySettings(q,this.fps);else this.game.quality = q;
    this.view.applyQuality(q);
  }

  focusMinimap(nx: number, nz: number) {
    this.view.look.x = nx;
    this.view.look.z = nz;
    this.view.look.y = this.game.height(nx, nz) + 0.4;
  }

  /** Walk mode toggle (key Y, Rail button). Enters as the first selected villager, else at the view centre, facing the way the strategic camera looked. */
  toggleFirstPerson(){if(this.firstPerson.active)this.exitFirstPerson();else this.enterFirstPerson();this.pushHud();}
  get firstPersonActive(){return this.firstPerson.active;}
  setFirstPersonBob(on:boolean){this.firstPerson={...this.firstPerson,bobEnabled:on};try{localStorage.setItem(FIRST_PERSON_PREF_KEY,JSON.stringify({bob:on}));}catch{/* preference only */}this.pushHud();}
  get firstPersonBobEnabled(){return this.firstPerson.bobEnabled;}
  /** Keep the controlled villager the one selected, so the ordinary select/order paths act for it. Never throws: no selection, dead unit and worker mode are all quiet no-ops. */
  private selectControlled(){
    try{
      const u=liveUnit(this.possession,this.game.state.units);if(!u)return;
      if(this.workerHost){this.setWorkerSelection({selectedUnitIds:[u.id]});return;}
      if(!(this.game.selectedUnits().length===1&&this.game.selectedUnits()[0].id===u.id)){this.game.clearSelect();const real=this.game.state.units.find(x=>x.id===u.id);if(real)real.selected=true;}
    }catch(error){console.error(error);}
  }
  /** Hand the villager back: a bare follow-move is stopped where it stands; a real task is left to finish; the village AI takes over either way. */
  private releaseControlled(){
    try{
      const u=liveUnit(this.possession,this.game.state.units);
      if(u&&handBack(this.possession,u)==='stop'){void Promise.resolve(this.dispatch({kind:'move',unitIds:[u.id],x:u.x,z:u.z})).catch(()=>{});}
    }catch(error){console.error(error);}
    this.possession=newPossession();
  }
  /** Left-click while walking: an armed villager swings at a hostile in reach (the existing attack order); anything else selects what the crosshair is on. */
  private firstPersonPrimary(cx:number,cy:number,shift:boolean){
    try{
      const u=liveUnit(this.possession,this.game.state.units);
      if(u&&isArmed(u)&&!this.workerHost){
        const foes=this.game.state.units.filter(f=>f.team!==0&&f.hp>0&&this.game.isFoe(0,f.team)&&this.game.visibleAt(f.x,f.z));
        const foe=meleeTarget(this.firstPerson.body,foes);
        if(foe){this.selectControlled();this.game.issueAttack(foe);this.possession=taskGiven(this.possession);this.pushHud();return;}
      }
    }catch(error){console.error(error);}
    this.leftClick(cx,cy,shift);
  }
  private firstPersonOrder(cx:number,cy:number,shift:boolean){
    this.selectControlled();
    const had=liveUnit(this.possession,this.game.state.units)!==null;
    this.rightClick(cx,cy,shift);
    if(had)this.possession=taskGiven(this.possession);
  }
  private firstPersonWorld():FirstPersonWorld{
    const g=this.game,now=performance.now();
    if(now-this.fpSolids.at>250){
      const bx=this.firstPerson.body.x,bz=this.firstPerson.body.z,near=(o:{x:number;z:number;amount:number})=>o.amount>0&&Math.abs(o.x-bx)<48&&Math.abs(o.z-bz)<48;
      const st=g.state,circles:{x:number;z:number;r:number}[]=[];
      for(const o of st.trees||[])if(near(o))circles.push({x:o.x,z:o.z,r:.45});
      for(const list of [st.stones,st.copper,st.iron])for(const o of list||[])if(near(o))circles.push({x:o.x,z:o.z,r:.9});
      this.fpSolids={at:now,list:g.state.buildings.filter(b=>g.solidBuilding(b)).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d})),circles};
    }
    return{circles:this.fpSolids.circles,height:(x,z)=>g.travelHeight(x,z),water:(x,z)=>g.waterAt(x,z),solids:this.fpSolids.list,half:(g.world?.size??this.view.mapSize)/2};
  }
  enterFirstPerson(){
    if(this.firstPerson.active||!this.game.started||this.game.awaitingStart||this.view.lost)return false;
    const g=this.game,v=this.view;
    let unit=null as ReturnType<typeof chooseVillager>;
    try{unit=chooseVillager(g.state.units,g.selectedUnits().map(u=>u.id),{x:v.look.x,z:v.look.z});}catch(error){console.error(error);}
    const at={x:unit?.x??v.look.x,z:unit?.z??v.look.z,yaw:v.yaw};
    try{
      const prefs=parseFirstPersonPrefs(localStorage.getItem(FIRST_PERSON_PREF_KEY));
      const next=enterFirstPersonMode({...this.firstPerson,bobEnabled:prefs.bob},this.firstPersonWorld(),at,{lookX:v.look.x,lookY:v.look.y,lookZ:v.look.z,yaw:v.yaw,pitch:v.pitch,dist:v.dist,drawLevel:v.getEffectiveDrawDistance()});
      if(!next){g.banner("No open ground to walk on here",3);return false;}
      this.firstPerson=next;
    }catch(error){console.error(error);return false;}
    this.possession={...newPossession(),unitId:unit?.id??null};this.fpSolids={at:-1,list:[],circles:[]};
    this.view.hiddenUnitId=unit?.id??null;this.selectControlled();
    this.keyboard.mode=true;this.moveMode=false;this.drag=null;this.panDrag=null;this.rotDrag=null;
    this.view.dist=14;this.view.hoveredUnitId=null;this.fpLevelEased=false;this.firstPersonLabel="";
    this.requestFirstPersonLock();
    g.banner("Walking · WASD move · mouse look · Shift run · click select · right-click order · Y or Esc return",5);
    return true;
  }
  exitFirstPerson(){
    if(!this.firstPerson.active)return;
    this.releaseControlled();
    const r=exitFirstPersonMode(this.firstPerson);this.firstPerson=r.mode;this.fpLockHeld=false;this.view.hiddenUnitId=null;this.firstPersonHeld="";
    try{if(document.pointerLockElement===this.canvas)document.exitPointerLock();}catch{/* already free */}
    const s=r.restore,v=this.view;
    v.setEyePose(null);
    if(s){v.look.set(s.lookX,s.lookY,s.lookZ);v.yaw=s.yaw;v.pitch=s.pitch;v.dist=s.dist;if(s.drawLevel&&this.fpLevelEased)v.setEffectiveDrawDistance(s.drawLevel);}
    this.fpLevelEased=false;this.keyboard.mode=false;this.view.hoveredUnitId=null;this.firstPersonLabel="";this.canvas.title="";
    this.keys.clear();
  }
  private requestFirstPersonLock(){
    try{const r=this.canvas.requestPointerLock?.() as unknown;if(r&&typeof (r as Promise<void>).catch==="function")(r as Promise<void>).catch(()=>{this.fpLockHeld=false;});}catch{/* drag-look fallback */}
  }
  private onLockChange=()=>{
    if(document.pointerLockElement===this.canvas){this.fpLockHeld=true;return;}
    // Escape (or the browser) released the mouse: that is the way out.
    if(this.firstPerson.active&&this.fpLockHeld){this.fpLockHeld=false;this.exitFirstPerson();this.pushHud();}
  };
  private firstPersonLook(dx:number,dy:number){
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
    const b=this.firstPerson.body,l=firstPersonLook(b,dx,dy);
    this.firstPerson={...this.firstPerson,body:{...b,yaw:l.yaw,pitch:l.pitch}};
  }
  private firstPersonPointerDown(e:PointerEvent){
    this.canvas.focus();
    if(document.pointerLockElement!==this.canvas){this.requestFirstPersonLock();}
    const cx=this.canvas.clientWidth/2,cy=this.canvas.clientHeight/2;
    this.pointer.x=cx;this.pointer.y=cy;
    if(e.button===0)this.firstPersonPrimary(cx,cy,e.shiftKey);
    else if(e.button===2)this.firstPersonOrder(cx,cy,e.shiftKey);
  }
  /** Per frame: integrate the body from held keys, draw from the eye, name what the crosshair is on, and ease draw distance when frames run slow. */
  private updateFirstPerson(dt:number){
    const fp=this.firstPerson;
    if(!fp.active){if(this.view.inFirstPerson)this.view.setEyePose(null);return;}
    const k=this.keys,down=(a:string,b?:string)=>k.has(a)||(b?k.has(b):false);
    const input={forward:(down("KeyW","ArrowUp")?1:0)-(down("KeyS","ArrowDown")?1:0),strafe:(down("KeyD","ArrowRight")?1:0)-(down("KeyA","ArrowLeft")?1:0),turn:(k.has("KeyE")?1:0)-(k.has("KeyQ")?1:0),run:k.has("ShiftLeft")||k.has("ShiftRight")};
    // The mouse is handed to the meeting dialog; the walker stands still until it closes (a click re-captures the mouse).
    const meeting=!!this.game.state.encounter;
    if(meeting&&document.pointerLockElement===this.canvas){this.fpLockHeld=false;try{document.exitPointerLock();}catch{/* already free */}}
    const unit=liveUnit(this.possession,this.game.state.units);
    if(this.possession.unitId!==null&&!unit){this.possession=newPossession();this.view.hiddenUnitId=null;this.firstPersonHeld="";this.game.banner("Your villager is gone. You walk on as a witness.",4);}
    const moving=input.forward!==0||input.strafe!==0;
    if(meeting)input.forward=input.strafe=input.turn=0;
    let body=stepFirstPersonBody(fp.body,meeting?{...input,run:false}:input,dt,this.firstPersonWorld(),fp.bobEnabled);
    if(unit){
      this.possession=takeOver(this.possession,moving&&!meeting);
      if(this.possession.working){const e=eyeTowardUnit(body,unit,dt);body={...body,x:e.x,z:e.z};}
      else{
        const to=followOrder(this.possession,unit,body,performance.now()/1000);
        if(to){this.possession=followSent(this.possession,to,performance.now()/1000);try{void Promise.resolve(this.dispatch({kind:'move',unitIds:[unit.id],x:to.x,z:to.z})).catch(()=>{});}catch(error){console.error(error);}}
      }
    }
    this.firstPerson={...fp,body};
    this.view.setEyePose(firstPersonEye(body,fp.bobEnabled));
    this.pointer.x=this.canvas.clientWidth/2;this.pointer.y=this.canvas.clientHeight/2;
    const now=performance.now();
    if(now>=this.fpHoverAt&&!this.game.state.placing){
      this.fpHoverAt=now+160;
      const {x,y}=this.pointer;this.view.updateCamera(0);
      this.view.hoveredUnitId=this.view.hoverPerson(x,y,this.game);
      const animal=this.view.hoveredUnitId===null?this.view.pickWildlife(x,y,this.game):null;
      const what=animal?(animal.hp>0?`Wild ${animal.species}`:`${animal.species} carcass`):(this.view.hoveredUnitId===null?this.hoverBuildingTitle(x,y):this.personLabel(this.view.hoveredUnitId));
      let verb="";
      try{
        const g=this.game,hu=this.view.hoveredUnitId===null?undefined:g.state.units.find(q=>q.id===this.view.hoveredUnitId);
        const kind=animal?'animal':hu?'unit':what?'building':'ground';
        verb=crosshairVerb({kind,hostile:!!hu&&hu.team!==0&&g.isFoe(0,hu.team),stranger:!!hu&&hu.team!==0,workplace:kind==='building'},!!unit&&isArmed(unit));
      }catch{/* label only */}
      this.firstPersonLabel=[what,verb&&`right-click: ${verb}`].filter(Boolean).join(" · ");
      this.firstPersonHeld=heldLabel(unit);
    }
    if(now>=this.fpFpsAt){
      this.fpFpsAt=now+2000;
      const chosen=this.view.getDrawDistance(),want=walkingDrawLevel(chosen,this.fps);
      if(want!==this.view.getEffectiveDrawDistance()&&(want!==chosen||this.fpLevelEased)){this.view.setEffectiveDrawDistance(want);this.fpLevelEased=want!==chosen||this.fpLevelEased;}
    }
  }
  private personLabel(id:number){const u=this.game.state.units.find(x=>x.id===id);return u?`${u.name||u.type}`:"";}

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
      if(this.firstPerson.active){this.view.pan.x=0;this.view.pan.z=0;}
      else{
      if (this.keys.has("KeyQ")) this.view.yaw += 0.9 * dt;
      if (this.keys.has("KeyE")) this.view.yaw -= 0.9 * dt;
      }

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
      if(!this.firstPerson.active){
      if (this.keys.has("PageUp")) this.view.dist *= Math.exp(-dt);
      if (this.keys.has("PageDown")) this.view.dist *= Math.exp(dt);
      }
      this.updateFirstPerson(dt);
      this.view.updateCamera(dt);
      if (this.keyboard.mode) this.keyboard.center();
      this.updateGhost();
      this.profile.measure('scene',()=>this.view.sync(this.game, dt));
      this.profile.measure('draw',()=>this.view.render());
      this.profile.recordRenderer(this.view.latestRenderMetrics);
      if(!this.workerHost){const n=this.gfx.observe(frameGap);if(n){try{this.game.banner(n.text,5);}catch{/* courtesy */}}}

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
        this.safetyLower('the renderer reported errors');
      }
    }
  };

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
    document.removeEventListener("pointerlockchange", this.onLockChange);
    if(this.firstPerson.active)this.exitFirstPerson();
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
