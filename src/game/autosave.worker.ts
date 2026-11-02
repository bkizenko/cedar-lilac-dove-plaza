import {prepareAutosave,preflightAutosave,type PrimaryMetadata} from './autosavePayload';
import type {AutosaveMessage,AutosaveResult,SaveSlots} from './autosaveProtocol';
const scope=globalThis as unknown as {onmessage:((event:MessageEvent<AutosaveMessage>)=>void)|null;postMessage:(result:AutosaveResult)=>void};
let pending:{id:number;expected:SaveSlots;primary:PrimaryMetadata}|null=null;
scope.onmessage=event=>{const job=event.data;if(job.phase==='preflight'){const preflight=preflightAutosave(job);pending=preflight.result.status==='preflight'?{id:job.id,expected:job.expected,primary:preflight.primary}:null;scope.postMessage(preflight.result);return;}
 const old=pending;pending=null;if(!old||old.id!==job.id){scope.postMessage({id:job.id,status:'invalid',previousPrimaryValid:false,validCandidates:0,workerCpuMs:0});return;}
 scope.postMessage(prepareAutosave({id:job.id,snapshot:job.snapshot,expected:old.expected},undefined,{primary:old.primary}));
};
