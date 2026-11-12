import {ENGINE_READ_MODEL_RULES,type EngineReadQuery,type EngineReadReply} from './engineReadModels';
import {SimulationWorkerClient,SimulationWorkerError} from './simulationWorkerClient';
import {SimulationRenderProjection} from './simulationRenderProjection';
import {SIMULATION_WORKER_RULES as R,type SimulationClock,type SimulationSessionContext} from './simulationWorkerProtocol';
import type {EngineDispatchCommand,EngineDispatchResult,EngineSelection} from './engineDispatch';

export const SIMULATION_HOST_RULES={maximumQueuedOperations:128,presentationIntervalSeconds:.2} as const;
type Options={client?:SimulationWorkerClient;onPresentation?:()=>void;onFault?:(error:Error)=>void};
/** Experimental owner bridge. No main Game exists or steps here. Not a public option. */
export class SimulationWorkerHost{
 readonly projection=new SimulationRenderProjection();
 private client:SimulationWorkerClient;private onPresentation:()=>void;private onFault:(error:Error)=>void;
 private tail:Promise<unknown>=Promise.resolve();private queued=0;private advancing=false;private presenting=false;
 private disposed=false;private failed=false;private initialized=false;private generation=0;
 private debt=0;private presentationDebt=0;private clock:SimulationClock|null=null;
 private measurements:{stage:'owner-query'|'presentation-capture'|'presentation-dispatch';cpuMilliseconds:number;stateRevision:number}[]=[];
 private measure(stage:'owner-query'|'presentation-capture'|'presentation-dispatch',cpuMilliseconds:number,stateRevision:number){this.measurements.push({stage,cpuMilliseconds,stateRevision});if(this.measurements.length>ENGINE_READ_MODEL_RULES.maximumMeasurements)this.measurements.shift();}
 private recordPresentation(result:Awaited<ReturnType<SimulationWorkerClient['presentation']>>){this.measure('presentation-capture',result.captureMilliseconds,result.clock.stateRevision);if(result.previousDispatch)this.measure('presentation-dispatch',result.previousDispatch.cpuMilliseconds,result.previousDispatch.stateRevision);}
 private selection:EngineSelection={selectedUnitIds:[]};
 constructor(options:Options={}){this.client=options.client??new SimulationWorkerClient();this.onPresentation=options.onPresentation??(()=>{});this.onFault=options.onFault??(()=>{});}
 get epoch(){return this.generation;}
 get ready(){return this.initialized&&!this.disposed&&!this.failed;}
 get game(){return this.projection.game;}
 get hud(){return this.projection.hud;}
 /** Retained debt is observable and NEVER discarded as a performance optimization. */
 get report(){return{epoch:this.epoch,ready:this.ready,pendingOperations:this.queued,pendingSimulationSeconds:this.debt,clock:this.clock,measurements:this.measurements.map(m=>({...m}))};}
 async initialize(snapshot:unknown,context?:SimulationSessionContext){
  if(this.disposed)throw new Error('Worker host is disposed');
  if(this.initialized||this.queued)throw new Error('Replace the host for a new village; never mix session operations');
  const epoch=++this.generation;
  const result=await this.client.initialize(snapshot,context);if(epoch!==this.generation)throw new Error('Worker session superseded');
  this.clock=result.clock;
  const presentation=await this.client.presentation(true,this.selection);
  this.recordPresentation(presentation);this.projection.apply(presentation.presentation,presentation.clock);this.clock=presentation.clock;this.initialized=true;this.onPresentation();
 }
 select(selection:EngineSelection){
  this.selection={selectedUnitIds:[...selection.selectedUnitIds],selectedBuildingId:selection.selectedBuildingId,selectedBoatId:selection.selectedBoatId};
  this.projection.select(selection.selectedUnitIds,selection.selectedBuildingId,selection.selectedBoatId);
  if(this.ready)this.requestPresentation();
 }
 dispatch(command:EngineDispatchCommand,selection:EngineSelection=this.selection):Promise<EngineDispatchResult>{
  const epoch=this.epoch,captured={...selection,selectedUnitIds:[...selection.selectedUnitIds]};
  return this.enqueue(async()=>{
   let result;
   try{result=await this.client.command(command,captured);}catch(error){this.handleError(error);throw error;}
   this.clock=result.clock;
   // Refresh membership/goods only after the native handler has acknowledged the actual mutation.
   try{
    const presentation=await this.client.presentation(false,this.selection);this.clock=presentation.clock;
    this.recordPresentation(presentation);this.projection.apply(presentation.presentation,presentation.clock);this.onPresentation();
   }catch(error){this.handleError(error);/* Native acknowledgement is already known; never misreport paid admission as unexecuted. */}
   return{accepted:result.outcome.accepted,reason:result.outcome.reason,projectId:result.outcome.projectId,sequence:result.outcome.sequence,stateRevision:result.clock.stateRevision,epoch};
  });
 }
 /** Frame supplies wall time only; actual ticks execute exclusively inside WorkerRuntime. */
 advanceWallTime(seconds:number){
  if(!this.ready)return;
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Invalid host frame interval');
  if(!this.clock?.paused)this.debt+=seconds;
  this.presentationDebt+=seconds;this.pump();
  if(this.presentationDebt>=SIMULATION_HOST_RULES.presentationIntervalSeconds)this.requestPresentation();
 }
 readModel(query:EngineReadQuery):Promise<EngineReadReply>{
  const epoch=this.epoch,captured=structuredClone(query);
  return this.enqueue(async()=>{const result=await this.client.readModel(captured);if(result.model.kind!==query.kind)throw new Error('Owner returned the wrong read model');this.clock=result.clock;this.measure('owner-query',result.cpuMilliseconds,result.clock.stateRevision);return{model:result.model,epoch,requestId:result.requestId,stateRevision:result.clock.stateRevision,navigationRevision:result.navigationRevision,cpuMilliseconds:result.cpuMilliseconds};});
 }
 checkpoint(){return this.enqueue(async()=>{const result=await this.client.checkpoint();this.clock=result.clock;return result;});}
 private enqueue<T>(run:()=>Promise<T>):Promise<T>{
  if(!this.ready)return Promise.reject(new SimulationWorkerError('host-unavailable','No authoritative host is ready'));
  if(this.queued>=SIMULATION_HOST_RULES.maximumQueuedOperations)return Promise.reject(new SimulationWorkerError('backpressure','Host queue is full; command not admitted'));
  this.queued++;
  const operation=this.tail.then(()=>{if(!this.ready)throw new SimulationWorkerError('host-unavailable','Authoritative host stopped');return run();});
  this.tail=operation.catch(()=>{});return operation.finally(()=>{this.queued--;if(!this.advancing)this.pump();});
 }
 private pump(){
  if(!this.ready||this.advancing||this.debt+1e-12<R.stepSeconds||this.clock?.paused||this.queued>=SIMULATION_HOST_RULES.maximumQueuedOperations)return;
  const ticks=Math.min(R.maximumTicksPerRequest,Math.floor((this.debt+1e-12)/R.stepSeconds));this.advancing=true;
  this.enqueue(async()=>{
   const result=await this.client.advance(ticks,undefined,this.selection);this.clock=result.clock;
   // Debit only acknowledged ticks. Backpressure leaves every unsubmitted tick owed.
   this.debt=Math.max(0,this.debt-result.ticks*R.stepSeconds);
   if(result.frame){this.projection.applyPose(result.frame);await this.client.recycle(result.frame);}
  }).catch(error=>this.handleError(error)).finally(()=>{this.advancing=false;this.pump();});
 }
 private requestPresentation(){
  if(!this.ready||this.presenting)return;this.presenting=true;
  this.enqueue(async()=>{const result=await this.client.presentation(false,this.selection);this.clock=result.clock;this.recordPresentation(result);this.projection.apply(result.presentation,result.clock);this.presentationDebt=0;this.onPresentation();})
   .catch(error=>this.handleError(error)).finally(()=>{this.presenting=false;});
 }
 private handleError(error:unknown){
  if(error instanceof SimulationWorkerError&&(error.code==='backpressure'||error.code==='advance-busy'))return;
  this.failed=true;this.onFault(error instanceof Error?error:new Error(String(error)));
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.generation++;this.initialized=false;this.client.dispose();}
}
