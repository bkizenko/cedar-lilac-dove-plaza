import {SAVE_KEY} from './constants';
import {parseStoredSave,SAVE_CODEC_RULES} from './storageCodec';
import {validateGameSave} from './persistence';
import {commitPreparedAutosave,currentSaveGeneration,invalidateAutosaveWrites,matchingSaveSlots,readSaveSlots,type SaveStorage} from './save';
import type {AuthoritativeCheckpoint,CheckpointAuthority} from './simulationCheckpoint';

export type CheckpointSaveResult={status:'committed'|'superseded'|'failed';reason:string;checkpoint?:AuthoritativeCheckpoint};
export type CheckpointSaveDestination='village'|'protected'|'test-lab'|'export';
/** Save only a completed owner barrier, never serialize the renderer projection.
 * Each operation captures session, write generation and original durable slots
 * before awaiting the owner. Later sessions/manual saves/other tabs win. */
export class SimulationCheckpointSaver{
 private authority:CheckpointAuthority;private storage:SaveStorage;
 constructor(authority:CheckpointAuthority,storage:SaveStorage=localStorage){this.authority=authority;this.storage=storage;}
 async save(destination:CheckpointSaveDestination='village',deliberate=true):Promise<CheckpointSaveResult>{
  const no=(status:'superseded'|'failed',reason:string):CheckpointSaveResult=>({status,reason});
  if(!this.authority.allowed())return no('superseded','No active authoritative village');
  const epoch=this.authority.currentEpoch(),generation=invalidateAutosaveWrites();
  let expected:ReturnType<typeof readSaveSlots>={primary:null,backup:null,protected:null},labBefore:string|null=null;
  try{if(destination!=='export'){expected=readSaveSlots(this.storage);labBefore=this.storage.getItem(SAVE_KEY+':test-lab');}}catch{return no('failed','Village storage is unavailable');}
  const current=()=>this.authority.allowed()&&this.authority.currentEpoch()===epoch&&currentSaveGeneration()===generation;
  try{
   const checkpoint=await this.authority.checkpoint();
   if(!current()||checkpoint.sessionEpoch!==epoch)return no('superseded','Village changed before checkpoint completed');
   if(typeof checkpoint.serialized!=='string'||checkpoint.serialized.length>SAVE_CODEC_RULES.maximumDecodedBytes*2)return no('failed','Invalid checkpoint size');
   const parsed=parseStoredSave(checkpoint.serialized);validateGameSave(parsed);
   const raw=parsed as {savedAt?:number;state:{time:number;seed:number}};
   const context=checkpoint.context;
   if(!context.started||context.awaitingStart)return no('failed','The village has not started');
   if(context.testMode&&destination!=='test-lab'&&destination!=='export')return no('failed','Test Lab checkpoints cannot replace village saves');
   if(!context.testMode&&destination==='test-lab')return no('failed','Only Test Lab checkpoints use the lab slot');
   if(typeof raw.savedAt!=='number'||!Number.isFinite(raw.savedAt)||raw.savedAt<0)return no('failed','Owner checkpoint must include its save timestamp');
   if(raw.state.time!==checkpoint.clock.time)return no('failed','Checkpoint clock does not match authoritative state');
   // Validation can be expensive; recheck after it before every durable write.
   if(!current()||destination!=='export'&&(!matchingSaveSlots(expected,readSaveSlots(this.storage))||this.storage.getItem(SAVE_KEY+':test-lab')!==labBefore))return no('superseded','A newer durable checkpoint exists');
   if(destination==='export')return{status:'committed',reason:'Authoritative export prepared',checkpoint};
   if(destination==='test-lab'){
    this.storage.setItem(SAVE_KEY+':test-lab',checkpoint.serialized);
    return{status:'committed',reason:'Test Lab checkpoint saved',checkpoint};
   }
   if(destination==='protected'){
    this.storage.setItem(SAVE_KEY+':protected',checkpoint.serialized);
    return{status:'committed',reason:'Protected checkpoint saved',checkpoint};
   }
   let previousPrimaryValid=false;
   if(expected.primary)try{const parsedOld=parseStoredSave(expected.primary);validateGameSave(parsedOld);const old=parsedOld as {state:{seed:number;time:number}};previousPrimaryValid=true;
    if(!deliberate&&old.state.seed===raw.state.seed&&old.state.time>raw.state.time)return no('superseded','A later village state is already saved');
   }catch{/* Preserve opaque/corrupt held copies; never rotate them as valid. */}
   if(!current())return no('superseded','Checkpoint superseded during validation');
   const status=commitPreparedAutosave(expected,generation,checkpoint.serialized,previousPrimaryValid,this.storage);
   return{status,reason:status==='committed'?'Authoritative village saved':status==='superseded'?'A newer checkpoint won':'Storage could not accept the village',...(status==='committed'?{checkpoint}:{})};
  }catch(error){return no(current()?'failed':'superseded',error instanceof Error?error.message:'Checkpoint failed');}
 }
}
