import type { Building } from "./types";
/** A completed home remains a useful shelter while its paid renovation is pending. */
export function hasConstructionWork(b: Building) {
  return b.hp > 0 && (b.build < 1 || !!b.expansion || !!b.renovation);
}
