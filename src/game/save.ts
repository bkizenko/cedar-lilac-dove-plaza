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
export function saveGame(g: Game) {
  if (!g.started || g.awaitingStart) return false;
  try {
    const data = JSON.stringify(encodeGame(g)),
      old = localStorage.getItem(SAVE_KEY);
    if (!localStorage.getItem(SAVE_KEY + ":protected")) localStorage.setItem(SAVE_KEY + ":protected", valid(old) ? old! : data);
    if (valid(old)) localStorage.setItem(SAVE_KEY + ":bak", old!);
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}
export function loadRaw(protectedOnly=false) {
  try {
    if(protectedOnly)return valid(localStorage.getItem(SAVE_KEY+":protected"));
    return valid(localStorage.getItem(SAVE_KEY)) || valid(localStorage.getItem(SAVE_KEY + ":bak")) || valid(localStorage.getItem(SAVE_KEY + ":protected"));
  } catch {
    return null;
  }
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
  try {localStorage.setItem(SAVE_KEY+":protected",JSON.stringify(encodeGame(g)));return true;} catch {return false;}
}
export function exportGame(g: Game) {
  const blob=new Blob([JSON.stringify(encodeGame(g))],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download=`hearthwild-village-${g.state.seed}-${Math.floor(g.state.time)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
