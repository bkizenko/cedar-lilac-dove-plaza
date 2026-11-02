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
/** A primary setItem is atomic. Optional copies remain best effort; browser
 * localStorage does not provide a multi-key transaction or cross-tab CAS. */
export function commitPreparedAutosave(expected:SaveSlots,generation:number,serialized:string,previousPrimaryValid:boolean,storage:SaveStorage=localStorage):'committed'|'superseded'|'failed'{
 try{const current=readSaveSlots(storage);if(!matchingSaveSlots(expected,current)||generation!==currentSaveGeneration())return'superseded';storage.setItem(SAVE_KEY,serialized);
  try{if(previousPrimaryValid&&expected.primary)storage.setItem(SAVE_KEY+':bak',expected.primary);}catch{/* primary is durable */}
  try{if(!expected.protected)storage.setItem(SAVE_KEY+':protected',previousPrimaryValid?expected.primary!:serialized);}catch{/* primary is durable */}
  return'committed';
 }catch{return'failed';}
}
function valid(raw: string | null,reconstruct=true) {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if(reconstruct)decodeGame(d);else validateGameSave(d);
    return d;
  } catch {
    return null;
  }
}
export function saveGame(g: Game, deliberate=false) {
  invalidateAutosaveWrites();
  if (g.testMode || !g.started || g.awaitingStart) return false;
  try {
    const old=localStorage.getItem(SAVE_KEY),previous=valid(old,false);
    // A stale tab/engine must not roll the active village backwards on autosave.
    if(!deliberate&&previous?.state.seed===g.state.seed&&previous.state.time>g.state.time)return true;
    const data=JSON.stringify({...encodeGame(g),savedAt:Date.now()});
    // Primary is the essential write. Optional copies cannot block it at quota.
    localStorage.setItem(SAVE_KEY,data);
    try {if(previous)localStorage.setItem(SAVE_KEY+":bak",old!);} catch {/* primary is durable */}
    try {if(!localStorage.getItem(SAVE_KEY+":protected"))localStorage.setItem(SAVE_KEY+":protected",previous?old!:data);} catch {/* primary is durable */}
    return true;
  } catch {return false;}
}
export function loadRaw(protectedOnly=false) {
  try {
    if(protectedOnly)return valid(localStorage.getItem(SAVE_KEY+":protected"));
    const copies=[SAVE_KEY,SAVE_KEY+":bak",SAVE_KEY+":protected"].map(k=>valid(localStorage.getItem(k))).filter(Boolean);
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
      return d?.version === SAVE_VERSION && !!d.state;
    } catch {
      return false;
    }
  });
}

/** Explicit durable checkpoint; autosaves never replace this slot. */
export function protectGame(g: Game) {
  invalidateAutosaveWrites();
  if (g.testMode || !g.started || g.awaitingStart) return false;
  try {localStorage.setItem(SAVE_KEY+":protected",JSON.stringify({...encodeGame(g),savedAt:Date.now()}));return true;} catch {return false;}
}
export function exportGame(g: Game) {
  const blob=new Blob([JSON.stringify(encodeGame(g))],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download=`hearthwild-village-${g.state.seed}-${Math.floor(g.state.time)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
