import {validateGameSave} from './persistence';
import type {AutosaveJob,AutosavePreflight,AutosaveResult} from './autosaveProtocol';
/** Runs on a Worker-owned immutable clone. Validation never creates a Game or
 * reconstructs terrain, and now consumes no gameplay randomness. */
export type PrimaryMetadata={seed:number;time:number}|null;
export function preflightAutosave(job:AutosavePreflight,now=()=>performance.now()){const start=now();let primary:PrimaryMetadata=null;try{if(job.expected.primary){const data=JSON.parse(job.expected.primary);validateGameSave(data);primary={seed:data.state.seed,time:data.state.time};}}catch{/* corrupt primary is not a stale guard */}
 const stale=primary?.seed===job.seed&&primary.time>job.time;return{primary,result:{id:job.id,status:stale?'stale':'preflight',previousPrimaryValid:!!primary,validCandidates:primary?1:0,workerCpuMs:now()-start} satisfies AutosaveResult};}
export function prepareAutosave(job:AutosaveJob,now=()=>performance.now(),prevalidated?:{primary:PrimaryMetadata}):AutosaveResult{
 const start=now();let previousPrimaryValid=false,validCandidates=0;
 const valid=(raw:string|null)=>{if(!raw)return null;try{const data=JSON.parse(raw);validateGameSave(data);validCandidates++;return data as {state:{seed:number;time:number}};}catch{return null;}};
 const primary=prevalidated?(prevalidated.primary?{state:prevalidated.primary}:null):valid(job.expected.primary);if(prevalidated&&primary)validCandidates++;previousPrimaryValid=!!primary;valid(job.expected.backup);valid(job.expected.protected);
 try{validateGameSave(job.snapshot);const snapshot=job.snapshot as {state:{seed:number;time:number}};
  // Deliberate restores can be older than their protected checkpoint. Match the
  // existing primary-only stale guard; protected bytes are never overwritten.
  if(primary?.state.seed===snapshot.state.seed&&primary.state.time>snapshot.state.time)return{id:job.id,status:'stale',previousPrimaryValid,validCandidates,workerCpuMs:now()-start};
  const serialized=JSON.stringify(job.snapshot);return{id:job.id,status:'ready',serialized,previousPrimaryValid,validCandidates,workerCpuMs:now()-start};
 }catch{return{id:job.id,status:'invalid',previousPrimaryValid,validCandidates,workerCpuMs:now()-start};}
}
