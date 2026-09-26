import { SAVE_KEY, SAVE_VERSION } from "./constants";
import type { Game } from "./sim";

export function saveGame(game: Game) {
  if (!game.started) return;
  try {
    const blob = JSON.stringify({ ...game.serialize(), version: SAVE_VERSION });
    localStorage.setItem(SAVE_KEY + ":bak", localStorage.getItem(SAVE_KEY) || "");
    localStorage.setItem(SAVE_KEY, blob);
  } catch {
    /* quota / private mode */
  }
}

export function loadRaw() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { version?: number };
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return !!loadRaw();
}
