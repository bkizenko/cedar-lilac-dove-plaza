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
    if (valid(old)) localStorage.setItem(SAVE_KEY + ":bak", old!);
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}
export function loadRaw() {
  try {
    return valid(localStorage.getItem(SAVE_KEY)) || valid(localStorage.getItem(SAVE_KEY + ":bak"));
  } catch {
    return null;
  }
}
export function hasSave() {
  return [SAVE_KEY, SAVE_KEY + ":bak"].some((k) => {
    try {
      const d = JSON.parse(localStorage.getItem(k) || "null");
      return d?.version === SAVE_VERSION && !!d.state;
    } catch {
      return false;
    }
  });
}
