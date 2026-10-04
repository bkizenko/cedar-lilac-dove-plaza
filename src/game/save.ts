import { SAVE_KEY, SAVE_VERSION } from "./constants";
import type { Game } from "./sim";
import { encodeGame, decodeGame } from "./persistence";
function valid(raw: string | null) {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    decodeGame(d);
    return d;
  } catch {
    return null;
  }
}
export function saveGame(g: Game, deliberate=false) {
  if (!g.started || g.awaitingStart) return false;
  try {
    const old=localStorage.getItem(SAVE_KEY),previous=valid(old);
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
  if (!g.started || g.awaitingStart) return false;
  try {localStorage.setItem(SAVE_KEY+":protected",JSON.stringify({...encodeGame(g),savedAt:Date.now()}));return true;} catch {return false;}
}
export function exportGame(g: Game) {
  const blob=new Blob([JSON.stringify(encodeGame(g))],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download=`hearthwild-village-${g.state.seed}-${Math.floor(g.state.time)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
