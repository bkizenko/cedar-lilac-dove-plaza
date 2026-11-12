import {parseStoredSave} from './storageCodec';
import {validateGameSave} from './persistence';
import {readSaveSlots,type SaveStorage} from './save';
/** Structural candidates only. The actual target owner must still reconstruct terrain.
 * Keep slot priority, seed grouping and timestamp/time tie rules identical to loadRaw. */
export type StoredVillageCandidate={snapshot:ReturnType<typeof parseStoredSave>;priority:number;seed:number;time:number;savedAt:number};
export function storedVillageCandidates(protectedOnly=false,storage:SaveStorage=localStorage):StoredVillageCandidate[]{
 const slots=readSaveSlots(storage),raw=protectedOnly?[slots.protected]:[slots.primary,slots.backup,slots.protected];
 const candidates:StoredVillageCandidate[]=[];
 for(let priority=0;priority<raw.length;priority++)try{if(!raw[priority])continue;const snapshot=parseStoredSave(raw[priority]!);validateGameSave(snapshot);const data=snapshot as {state:{seed:number;time:number};savedAt?:number};candidates.push({snapshot,priority,seed:data.state.seed,time:data.state.time,savedAt:typeof data.savedAt==='number'&&Number.isFinite(data.savedAt)?data.savedAt:0});}catch{/* Opaque/corrupt durable bytes remain untouched. */}
 return candidates;
}
export function chooseStoredVillage(candidates:StoredVillageCandidate[]){
 const active=candidates[0];if(!active)return undefined;
 return candidates.filter(c=>c.seed===active.seed).reduce((best,c)=>(c.savedAt||best.savedAt?c.savedAt>best.savedAt:c.time>best.time)?c:best,active);
}
