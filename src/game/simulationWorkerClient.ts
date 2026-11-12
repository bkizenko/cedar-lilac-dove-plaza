import type {EngineReadQuery} from './engineReadModels';
import type {EngineSelection} from './engineDispatch';
import {SIMULATION_WORKER_RULES,type SimulationCommand,type SimulationSessionContext,type SimulationPoseFrame,type SimulationWorkerRequest,type SimulationWorkerResponse} from './simulationWorkerProtocol';

type Port=Pick<Worker,'postMessage'|'terminate'|'onmessage'|'onerror'|'onmessageerror'>;
type Kind=SimulationWorkerResponse['type'];
type WithoutRequest<T>=T extends unknown?Omit<T,'epoch'|'requestId'>:never;
type Payload=WithoutRequest<SimulationWorkerRequest>;
type Result<K extends Kind>=Extract<SimulationWorkerResponse,{type:K}>;
type Pending={expected:Kind;resolve:(message:SimulationWorkerResponse)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
type Options={createWorker?:()=>Port;timeoutMilliseconds?:number};
export class SimulationWorkerError extends Error {readonly code:string;constructor(code:string,message:string){super(message);this.name='SimulationWorkerError';this.code=code;}}
/** Transport only: never imports Game or executes/serializes simulation on main. */
export class SimulationWorkerClient {
 private worker:Port;private epoch=0;private requestId=0;private sequence=0;private disposed=false;private faulted=false;
 private pending=new Map<number,Pending>();private timeout:number;
 private advanceToken:object|null=null;private releasedFrames=new WeakSet<object>();
 constructor(options:Options={}){
  this.timeout=options.timeoutMilliseconds??30000;
  if(!Number.isFinite(this.timeout)||this.timeout<=0)throw new RangeError('Invalid simulation worker timeout');
  this.worker=(options.createWorker??(()=>new Worker(new URL('./simulation.worker.ts',import.meta.url),{type:'module'})))();
  this.worker.onmessage=event=>this.receive(event.data);
  this.worker.onerror=event=>{event.preventDefault();this.fail('worker-error','Authoritative worker failed; no stale main-thread fallback was attempted');};
  this.worker.onmessageerror=()=>this.fail('message-error','Authoritative worker response could not be decoded');
 }
 initialize(snapshot:unknown,context?:SimulationSessionContext){
  if(this.disposed)return Promise.reject(new SimulationWorkerError('disposed','Simulation worker client is disposed'));
  this.rejectPending(new SimulationWorkerError('session-replaced','A new session superseded this request'));
  this.epoch++;this.requestId=0;this.sequence=0;this.faulted=false;this.advanceToken=null;this.releasedFrames=new WeakSet();
  return this.send({type:'initialize',protocolVersion:1,snapshot,rngMode:'legacy-worker-random',context},'ready');
 }
 command(command:SimulationCommand,selection?:EngineSelection){const blocked=this.admissionError();if(blocked)return Promise.reject(blocked);return this.send({type:'command',sequence:++this.sequence,command,selection},'command-result');}
 /** Retry the identical existing sequence; worker returns its bounded prior outcome without replay. */
 retryCommand(sequence:number,command:SimulationCommand,selection?:EngineSelection){return this.send({type:'command',sequence,command,selection},'command-result');}
 /** The host retains unsubmitted tick debt when this rejects with backpressure. */
 advance(ticks:number,afterSequence=this.sequence,selection?:EngineSelection){
  if(this.advanceToken)return Promise.reject(new SimulationWorkerError('advance-busy','One authoritative advance is already pending; retain host tick debt'));
  const blocked=this.admissionError();if(blocked)return Promise.reject(blocked);
  const token={};this.advanceToken=token;
  return this.send({type:'advance',ticks,afterSequence,selection},'advanced').finally(()=>{if(this.advanceToken===token)this.advanceToken=null;});
 }
 readModel(query:EngineReadQuery){return this.send({type:'read-model',query},'read-model-result');}
 presentation(includeWorld=false,selection?:EngineSelection){return this.send({type:'presentation',afterSequence:this.sequence,includeWorld,selection},'presentation');}
 checkpoint(afterSequence=this.sequence){return this.send({type:'checkpoint',afterSequence},'checkpoint');}
 inspect(query:Extract<SimulationWorkerRequest,{type:'inspect'}>['query']){return this.send({type:'inspect',query},'inspection');}
 recycle(frame:SimulationPoseFrame){
  if(frame.epoch!==this.epoch)return Promise.reject(new SimulationWorkerError('stale-frame','A prior session frame cannot recycle current buffer custody'));
  if(this.releasedFrames.has(frame)||frame.ids.byteLength===0||frame.poses.byteLength===0)return Promise.reject(new SimulationWorkerError('buffer-custody','This pose frame was already released'));
  const blocked=this.admissionError();if(blocked)return Promise.reject(blocked);
  this.releasedFrames.add(frame);
  return this.send({type:'recycle',frameId:frame.frameId,ids:frame.ids.buffer as ArrayBuffer,poses:frame.poses.buffer as ArrayBuffer},'recycled',[frame.ids.buffer as ArrayBuffer,frame.poses.buffer as ArrayBuffer]);
 }
 /** Bounded batch size is exported to hosts; no worker tick scheduling is hidden in the client. */
 get maximumTicksPerRequest(){return SIMULATION_WORKER_RULES.maximumTicksPerRequest;}
 private admissionError(){
  if(this.disposed||this.faulted)return new SimulationWorkerError(this.disposed?'disposed':'faulted','No active authoritative worker transport');
  if(this.epoch===0)return new SimulationWorkerError('not-initialized','Initialize a saved village first');
  if(this.pending.size>=SIMULATION_WORKER_RULES.maximumPendingRequests)return new SimulationWorkerError('backpressure','Pending request bound reached; request was not admitted');
  return null;
 }
 private send<K extends Kind>(payload:Payload,expected:K,transfer:Transferable[]=[]):Promise<Result<K>>{
  const blocked=this.admissionError();if(blocked)return Promise.reject(blocked);
  const requestId=++this.requestId,epoch=this.epoch;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>this.fail('timeout','Authoritative outcome is unknown; transport paused instead of replaying or saving stale main state'),this.timeout);
   this.pending.set(requestId,{expected,resolve:message=>resolve(message as Result<K>),reject,timer});
   try{this.worker.postMessage({...payload,epoch,requestId},transfer);}catch(error){clearTimeout(timer);this.pending.delete(requestId);this.fail('dispatch-error','Could not dispatch an authoritative request');reject(error instanceof Error?error:new Error('Worker dispatch failed'));}
  });
 }
 private receive(message:unknown){
  if(!message||typeof message!=='object')return;
  const result=message as SimulationWorkerResponse;if(result.epoch!==this.epoch)return;
  const pending=this.pending.get(result.requestId);if(!pending)return;clearTimeout(pending.timer);this.pending.delete(result.requestId);
  if(result.type==='error'){const error=new SimulationWorkerError(result.code,result.message);pending.reject(error);if(result.code==='runtime-error'||pending.expected==='ready')this.fail(result.code,result.message);return;}
  if(result.type!==pending.expected){pending.reject(new SimulationWorkerError('response-type','Unexpected authoritative response'));this.fail('response-type','Unexpected authoritative response');return;}
  if(result.type==='ready'&&result.protocolVersion!==SIMULATION_WORKER_RULES.version){pending.reject(new SimulationWorkerError('protocol-version','Worker protocol version differs'));this.fail('protocol-version','Worker protocol version differs');return;}
  pending.resolve(result);
 }
 private rejectPending(error:Error){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();}
 private fail(code:string,message:string){this.faulted=true;this.advanceToken=null;this.rejectPending(new SimulationWorkerError(code,message));}
 dispose(){if(this.disposed)return;this.disposed=true;this.advanceToken=null;this.rejectPending(new SimulationWorkerError('disposed','Simulation worker client disposed'));this.worker.terminate();}
}
