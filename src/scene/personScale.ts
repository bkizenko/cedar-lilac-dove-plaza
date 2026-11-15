/** One source of truth for how tall a person is on screen, so doorways and walls can clear them.
 *  Rig frame: head sphere centre y=.93 (radius ~.135) plus hair crown at 1.09 (+.055) => crown ~1.15 in rig metres (characterRig.ts).
 *  World.ts scales an adult by PERSON_SCALE_Y (1.65) times Unit.stature (.86-1.16). Leaders are drawn 1.18x taller still. */
export const RIG_CROWN_M=1.15;
export const PERSON_SCALE_Y=1.65;
/** Adult of stature 1.0, in world metres (~1.9). */
export const ADULT_HEIGHT_M=Math.round(RIG_CROWN_M*PERSON_SCALE_Y*100)/100;
/** Walk-in opening: adult height plus a hand of headroom (taller residents stoop under the lintel). */
export const DOOR_HEIGHT_M=Math.ceil((ADULT_HEIGHT_M+.15)*20)/20;
/** Wall height (eave) of any building people walk into: the door fits beneath it with a lintel. */
export const EAVE_MIN_M=Math.round((DOOR_HEIGHT_M+.15)*100)/100;
/** Openings shorter than this are hatches, hives and bins, not doors: left alone. */
export const HATCH_MAX_M=1.2;
export const doorHeight=(h:number)=>h>=HATCH_MAX_M?Math.max(h,DOOR_HEIGHT_M):h;
export const eaveHeight=(h:number)=>Math.max(h,EAVE_MIN_M);
