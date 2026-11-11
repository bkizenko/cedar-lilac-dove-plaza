import {parseStoredSave,serializeStoredSave,isStoredSaveEnvelope,encodeStoredJson} from './storageCodec';
import { SAVE_KEY, SAVE_VERSION } from "./constants";
import type { Game } from "./sim";
import type {SaveSlots} from "./autosaveProtocol";
import { encodeGame, decodeGame, validateGameSave } from "./persistence";
let autosaveGeneration=0;
export const currentSaveGeneration=()=>autosaveGeneration;
/** Explicit synchronous checkpoints supersede every older in-flight job. */
export function invalidateAutosaveWrites(){return ++autosaveGeneration;}
export type SaveStorage=Pick<Storage,'getItem'|'setItem'>;
export function readSaveSlots(storage:SaveStorage=localStorage):SaveSlots{return{primary:storage.getItem(SAVE_KEY),backup:storage.getItem(SAVE_KEY+':bak'),protected:storage.getItem(SAVE_KEY+':protected')};}
export function matchingSaveSlots(a:SaveSlots,b:SaveSlots){return a.primary===b.primary&&a.backup===b.backup&&a.protected===b.protected;}
function quotaExceeded(error:unknown){return !!error&&typeof error==='object'&&'name'in error&&error.name==='QuotaExceededError';}
export type SaveCompaction={status:'unchanged'|'compacted'|'superseded'|'failed';changed:boolean};
/** Encoding-only quota recovery. Exact original text (including savedAt and
 * whitespace) is retained; unsupported/corrupt/opaque slots are never touched.
 * Web Storage has no cross-tab atomic CAS; every write rechecks all raw slots. */
export function compactLegacySaveSlots(storage:SaveStorage,expected:SaveSlots,generation:number):SaveCompaction{
 const candidates:{slot:keyof SaveSlots;key:string;encoded:string}[]=[];
 for(const [slot,key] of [['primary',SAVE_KEY],['backup',SAVE_KEY+':bak'],['protected',SAVE_KEY+':protected']] as const){const raw=expected[slot];if(!raw)continue;try{const parsed:unknown=JSON.parse(raw);if(isStoredSaveEnvelope(parsed))continue;validateGameSave(parsed);const encoded=encodeStoredJson(raw);if(encoded!==raw)candidates.push({slot,key,encoded});}catch{/* unknown data remains a held checkpoint */}}
 if(!candidates.length){try{if(currentSaveGeneration()!==generation||!matchingSaveSlots(expected,readSaveSlots(storage)))return{status:'superseded',changed:false};}catch{return{status:'failed',changed:false};}return{status:'unchanged',changed:false};}
 const ownExpected={...expected};let ownGeneration=generation,changed=false,invalidated=false;
 for(const candidate of candidates){
  try{if(currentSaveGeneration()!==ownGeneration||!matchingSaveSlots(ownExpected,readSaveSlots(storage)))return{status:'superseded',changed};
   if(!invalidated){ownGeneration=invalidateAutosaveWrites();invalidated=true;}
   if(currentSaveGeneration()!==ownGeneration||!matchingSaveSlots(ownExpected,readSaveSlots(storage)))return{status:'superseded',changed};
   storage.setItem(candidate.key,candidate.encoded);ownExpected[candidate.slot]=candidate.encoded;changed=true;
  }catch{return{status:'failed',changed};}
 }
 return{status:'compacted',changed};
}
/** A primary setItem is atomic. Optional copies remain best effort; browser
 * localStorage does not provide a multi-key transaction or cross-tab CAS. */
export function commitPreparedAutosave(expected:SaveSlots,generation:number,serialized:string,previousPrimaryValid:boolean,storage:SaveStorage=localStorage):'committed'|'superseded'|'failed'{
 try{const current=readSaveSlots(storage);if(!matchingSaveSlots(expected,current)||generation!==currentSaveGeneration())return'superseded';storage.setItem(SAVE_KEY,serialized);
  try{if(previousPrimaryValid&&expected.primary)storage.setItem(SAVE_KEY+':bak',expected.primary);}catch{/* primary is durable */}
  try{if(!expected.protected)storage.setItem(SAVE_KEY+':protected',previousPrimaryValid?expected.primary!:serialized);}catch{/* primary is durable */}
  return'committed';
 }catch(error){if(quotaExceeded(error)){const recovery=compactLegacySaveSlots(storage,expected,generation);if(recovery.changed||recovery.status==='superseded')return'superseded';}return'failed';}
}
function valid(raw: string | null,reconstruct=true) {
  if (!raw) return null;
  try {
    const d = parseStoredSave(raw);
    if(reconstruct)decodeGame(d);else validateGameSave(d);
    return d as ReturnType<typeof encodeGame>&{savedAt?:number};
  } catch {
    return null;
  }
}
const TEST_SAVE_KEY = SAVE_KEY + ":test-lab";

export function hasTestLabSave(storage: SaveStorage = localStorage) {
  try { return storage.getItem(TEST_SAVE_KEY) !== null; }
  catch { return false; }
}

export function saveTestLabGame(g: Game, storage: SaveStorage = localStorage) {
  if (!g.testMode || !g.started || g.awaitingStart) return false;
  try {
    const data = serializeStoredSave({...encodeGame(g), testLabRevealMap: g.revealMap});
    storage.setItem(TEST_SAVE_KEY, data);
    return true;
  } catch { return false; }
}

export function loadTestLabGame(storage: SaveStorage = localStorage) {
  const raw = storage.getItem(TEST_SAVE_KEY);
  if (!raw) throw new Error("There is no saved Test Lab run");
  const data = parseStoredSave(raw);
  const game = decodeGame(data);
  game.testMode = true;
  game.revealMap = (data as {testLabRevealMap?: boolean}).testLabRevealMap === true;
  // A paused restored lab displays the overlay immediately; saved fog stays real.
  game.updateVision(0);
  game.state.paused = true;
  return game;
}

export function saveGame(g: Game, deliberate=false) {return saveGameAttempt(g,deliberate,true);}
function saveGameAttempt(g:Game,deliberate:boolean,allowCompaction:boolean):boolean {
  invalidateAutosaveWrites();
  if (g.testMode || !g.started || g.awaitingStart) return false;
  let expected:SaveSlots|undefined;const generation=currentSaveGeneration();
  try {
    expected=readSaveSlots();
    const old=expected.primary,previous=valid(old,false);
    // A stale tab/engine must not roll the active village backwards on autosave.
    if(!deliberate&&previous?.state.seed===g.state.seed&&previous.state.time>g.state.time)return true;
    const data=serializeStoredSave({...encodeGame(g),savedAt:Date.now()});
    // Primary is the essential write. Optional copies cannot block it at quota.
    localStorage.setItem(SAVE_KEY,data);
    try {if(previous)localStorage.setItem(SAVE_KEY+":bak",old!);} catch {/* primary is durable */}
    try {if(!localStorage.getItem(SAVE_KEY+":protected"))localStorage.setItem(SAVE_KEY+":protected",previous?old!:data);} catch {/* primary is durable */}
    return true;
  } catch(error) {if(allowCompaction&&expected&&quotaExceeded(error)){const result=compactLegacySaveSlots(localStorage,expected,generation);if(result.changed&&result.status!=='superseded')return saveGameAttempt(g,deliberate,false);}return false;}
}
export function loadRaw(protectedOnly=false) {
  try {
    if(protectedOnly)return valid(localStorage.getItem(SAVE_KEY+":protected"));
    const copies=[SAVE_KEY,SAVE_KEY+":bak",SAVE_KEY+":protected"].map(k=>valid(localStorage.getItem(k))).filter(d=>d!==null);
    const active=copies[0];if(!active)return null;
    const same=copies.filter(d=>d.state.seed===active.state.seed);
    return same.reduce((best,d)=>{
      const stamp=(v:typeof d)=>typeof v.savedAt==="number"&&Number.isFinite(v.savedAt)?v.savedAt:0;
      const newer=stamp(d)||stamp(best)?stamp(d)>stamp(best):d.state.time>best.state.time;
      return newer?d:best;
    },active);
  } catch {return null;}
}
export function hasSave() {
  return [SAVE_KEY, SAVE_KEY + ":bak", SAVE_KEY + ":protected"].some((k) => {
    try {
      const d = JSON.parse(localStorage.getItem(k) || "null");
      return isStoredSaveEnvelope(d)||(d?.version === SAVE_VERSION && !!d.state);
    } catch {
      return false;
    }
  });
}

/** Explicit durable checkpoint; autosaves never replace this slot. */
export function protectGame(g: Game) {return protectGameAttempt(g,true);}
function protectGameAttempt(g:Game,allowCompaction:boolean):boolean {
  invalidateAutosaveWrites();
  if (g.testMode || !g.started || g.awaitingStart) return false;
  let expected:SaveSlots|undefined;const generation=currentSaveGeneration();
  try {expected=readSaveSlots();localStorage.setItem(SAVE_KEY+":protected",serializeStoredSave({...encodeGame(g),savedAt:Date.now()}));return true;}
  catch(error){if(allowCompaction&&expected&&quotaExceeded(error)){const result=compactLegacySaveSlots(localStorage,expected,generation);if(result.changed&&result.status!=='superseded')return protectGameAttempt(g,false);}return false;}
}
export function exportGame(g: Game) {
  const blob=new Blob([JSON.stringify(encodeGame(g))],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download=`hearthwild-village-${g.state.seed}-${Math.floor(g.state.time)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
