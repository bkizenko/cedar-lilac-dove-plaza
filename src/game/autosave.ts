import type {Game} from './sim';
import {encodeGame} from './persistence';
import {SAVE_KEY} from './constants';
import {saveGame,currentSaveGeneration,invalidateAutosaveWrites,readSaveSlots,matchingSaveSlots,commitPreparedAutosave,type SaveStorage} from './save';
import type {SaveSlots,AutosavePreflight,AutosaveSerialize,AutosaveResult} from './autosaveProtocol';
export const AUTOSAVE_RULES=Object.freeze({timeoutMilliseconds:8000,maximumMeasurements:240});
type Port=Pick<Worker,'postMessage'|'terminate'|'onmessage'|'onerror'|'onmessageerror'>;
type Request={game:Game;state:Game['state'];generation:number;seed:number;time:number;requestedAt:number;measurement:number};
type Active=Request&{id:number;expected:SaveSlots;dispatchCpuMs:number;workerCpuMs:number;phase:'preflight'|'serialize';timer?:ReturnType<typeof setTimeout>};
type Work={mode:'worker'|'sync';outcome:'committed'|'superseded'|'failed';dispatchCpuMs:number;commitCpuMs:number;workerCpuMs?:number;mainCpuMs:number;wallLatencyMs:number};
type Options={getGame:()=>Game;allowed?:()=>boolean;createWorker?:()=>Port;storage?:SaveStorage;now?:()=>number;wallNow?:()=>number;encode?:(game:Game)=>unknown;syncSave?:(game:Game)=>boolean;listenToStorage?:boolean;timeoutMilliseconds?:number};
export class AutosaveController {
 private worker:Port|null=null;private disabled=false;private disposed=false;private confirmed=false;private nextId=0;
 private active:Active|null=null;private pending:Request|null=null;private measurement=0;private work:Work[]=[];
 private counts={requests:0,workerJobs:0,committed:0,superseded:0,failed:0,fallbacks:0,coalesced:0};
 private now:()=>number;private storage:SaveStorage;private createWorker:()=>Port;private encode:(g:Game)=>unknown;private synchronous:(g:Game)=>boolean;
 private options:Options;
 constructor(options:Options){this.options=options;this.now=options.now??(()=>performance.now());this.storage=options.storage??localStorage;this.createWorker=options.createWorker??(()=>new Worker(new URL('./autosave.worker.ts',import.meta.url),{type:'module'}));this.encode=options.encode??encodeGame;this.synchronous=options.syncSave??saveGame;if(options.listenToStorage!==false&&typeof window!=='undefined')window.addEventListener('storage',this.storageChanged);}
 private eligible(g:Game){return !this.disposed&&this.options.allowed?.()!==false&&g.started&&!g.awaitingStart&&!g.testMode;}
 private current(r:Request){return this.eligible(r.game)&&this.options.getGame()===r.game&&r.game.state===r.state&&r.generation===currentSaveGeneration()&&r.game.state.seed===r.seed&&r.game.state.time>=r.time;}
 private requestState(g:Game):Request{return{game:g,state:g.state,generation:currentSaveGeneration(),seed:g.state.seed,time:g.state.time,requestedAt:this.now(),measurement:this.measurement};}
 request(){const g=this.options.getGame();if(!this.eligible(g))return false;const r=this.requestState(g);this.counts.requests++;if(this.active){if(this.pending)this.counts.coalesced++;this.pending=r;return true;}this.dispatch(r);return true;}
 private storageChanged=(event:StorageEvent)=>{if(event.key===null||[SAVE_KEY,SAVE_KEY+':bak',SAVE_KEY+':protected'].includes(event.key))this.invalidate();};
 invalidate(){invalidateAutosaveWrites();this.pending=null;}
 private port(){if(this.worker)return this.worker;const p=this.createWorker();p.onmessage=event=>this.receive(p,event.data);p.onerror=event=>{event.preventDefault?.();this.transportFailed(p);};p.onmessageerror=()=>this.transportFailed(p);this.worker=p;return p;}
 private dispatch(r:Request){if(!this.current(r))return;r={...r,time:r.game.state.time};const start=this.now();let expected:SaveSlots;
  try{expected=readSaveSlots(this.storage);}catch{this.fallback(r,this.now()-start);return;}
  const job:Active={...r,id:++this.nextId,expected,dispatchCpuMs:0,workerCpuMs:0,phase:'preflight'};
  if(this.disabled){this.fallback(job,this.now()-start);return;}
  try{const port=this.port();this.active=job;
   job.timer=setTimeout(()=>this.transportFailed(port),this.options.timeoutMilliseconds??AUTOSAVE_RULES.timeoutMilliseconds);
   port.postMessage({id:job.id,phase:'preflight',seed:r.seed,time:r.time,expected} satisfies AutosavePreflight);job.dispatchCpuMs=this.now()-start;if(r.measurement===this.measurement)this.counts.workerJobs++;
  }catch{job.dispatchCpuMs=this.now()-start;if(this.active===job)this.clearActive(job);this.disable();this.fallback(job,job.dispatchCpuMs);}
 }
 private clearActive(job:Active){if(job.timer!==undefined)clearTimeout(job.timer);if(this.active===job)this.active=null;}
 private disable(){this.disabled=true;this.worker?.terminate();this.worker=null;}
 private transportFailed(port:Port){if(port!==this.worker||this.disposed)return;const job=this.active;this.disable();if(job){this.clearActive(job);this.fallback(job,job.dispatchCpuMs);}this.drain();}
 private record(r:Request,result:Work){if(r.measurement!==this.measurement)return;this.work.push(result);if(this.work.length>AUTOSAVE_RULES.maximumMeasurements)this.work.shift();this.counts[result.outcome]++;}
 private fallback(r:Request,preparationCpuMs:number){if(!this.current(r)){this.record(r,{mode:'sync',outcome:'superseded',dispatchCpuMs:preparationCpuMs,commitCpuMs:0,mainCpuMs:preparationCpuMs,wallLatencyMs:this.now()-r.requestedAt});return;}
  if('expected'in r){try{if(!matchingSaveSlots((r as Active).expected,readSaveSlots(this.storage))){this.record(r,{mode:'sync',outcome:'superseded',dispatchCpuMs:preparationCpuMs,commitCpuMs:0,mainCpuMs:preparationCpuMs,wallLatencyMs:this.now()-r.requestedAt});return;}}catch{/* original synchronous save handles unavailable storage */}}
  if(r.measurement===this.measurement)this.counts.fallbacks++;const start=this.now();let ok=false,unchanged=false;let before:string|null|undefined;try{before=this.storage.getItem(SAVE_KEY);}catch{/* unavailable storage is handled by the original save */}try{ok=this.synchronous(r.game);}catch{/* preserve original failed-save result */}if(ok&&before!==undefined)try{unchanged=this.storage.getItem(SAVE_KEY)===before;}catch{/* the successful primary remains durable */}const commitCpuMs=this.now()-start;
  this.record(r,{mode:'sync',outcome:ok?(unchanged?'superseded':'committed'):'failed',dispatchCpuMs:preparationCpuMs,commitCpuMs,mainCpuMs:preparationCpuMs+commitCpuMs,wallLatencyMs:this.now()-r.requestedAt});
 }
 private receive(port:Port,value:unknown){if(port!==this.worker||this.disposed||!this.active)return;const result=value as Partial<AutosaveResult>,job=this.active;if(result?.id!==job.id)return;
  if(!['preflight','ready','stale','invalid'].includes(result.status??'')||typeof result.workerCpuMs!=='number'||!Number.isFinite(result.workerCpuMs)||result.workerCpuMs<0||typeof result.previousPrimaryValid!=='boolean'||result.status==='ready'&&typeof result.serialized!=='string'){this.transportFailed(port);return;}
  if(result.status==='preflight'&&job.phase!=='preflight')return;
  this.confirmed=true;job.workerCpuMs+=result.workerCpuMs;
  if(result.status==='preflight'){
   if(job.phase!=='preflight'){this.transportFailed(port);return;}
   const start=this.now();try{if(this.current(job)&&matchingSaveSlots(job.expected,readSaveSlots(this.storage))){const snapshot={...(this.encode(job.game) as object),savedAt:(this.options.wallNow??Date.now)()};job.time=job.game.state.time;job.phase='serialize';port.postMessage({id:job.id,phase:'serialize',snapshot} satisfies AutosaveSerialize);job.dispatchCpuMs+=this.now()-start;return;}}
   catch{job.dispatchCpuMs+=this.now()-start;this.clearActive(job);this.disable();this.fallback(job,job.dispatchCpuMs);this.drain();return;}
   job.dispatchCpuMs+=this.now()-start;this.clearActive(job);this.record(job,{mode:'worker',outcome:'superseded',dispatchCpuMs:job.dispatchCpuMs,commitCpuMs:0,workerCpuMs:job.workerCpuMs,mainCpuMs:job.dispatchCpuMs,wallLatencyMs:this.now()-job.requestedAt});this.drain();return;
  }
  if(result.status==='ready'&&job.phase!=='serialize'){this.transportFailed(port);return;}
  this.clearActive(job);const start=this.now();let outcome:Work['outcome']='superseded';
  if(this.current(job)){if(result.status==='ready')outcome=commitPreparedAutosave(job.expected,job.generation,result.serialized!,result.previousPrimaryValid,this.storage);else if(result.status==='invalid')outcome='failed';}
  const commitCpuMs=this.now()-start;this.record(job,{mode:'worker',outcome,dispatchCpuMs:job.dispatchCpuMs,commitCpuMs,workerCpuMs:job.workerCpuMs,mainCpuMs:job.dispatchCpuMs+commitCpuMs,wallLatencyMs:this.now()-job.requestedAt});this.drain();
 }
 private drain(){const pending=this.pending;this.pending=null;if(pending&&this.current(pending))this.dispatch(pending);}
 resetMeasurements(){this.measurement++;this.work=[];this.counts={requests:0,workerJobs:0,committed:0,superseded:0,failed:0,fallbacks:0,coalesced:0};}
 report(){const summary=(key:'dispatchCpuMs'|'commitCpuMs'|'workerCpuMs'|'mainCpuMs'|'wallLatencyMs')=>{const values=this.work.map(w=>w[key]).filter((n):n is number=>n!==undefined),sorted=[...values].sort((a,b)=>a-b);return{samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??0,maxMs:sorted.at(-1)??0};};return{mode:this.disabled?'synchronous fallback':this.confirmed?'worker confirmed':this.worker?'worker pending':'not started',active:!!this.active,pending:!!this.pending,counts:{...this.counts},last:this.work.at(-1)?{...this.work.at(-1)!}:null,dispatchCpu:summary('dispatchCpuMs'),commitCpu:summary('commitCpuMs'),workerCpu:summary('workerCpuMs'),mainCpu:summary('mainCpuMs'),wallLatency:summary('wallLatencyMs')};}
 dispose(){if(this.disposed)return;this.invalidate();this.disposed=true;if(this.active)this.clearActive(this.active);this.worker?.terminate();this.worker=null;if(this.options.listenToStorage!==false&&typeof window!=='undefined')window.removeEventListener('storage',this.storageChanged);}
}
export type AutosaveReport=ReturnType<AutosaveController['report']>;
