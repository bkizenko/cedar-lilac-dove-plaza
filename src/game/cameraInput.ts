/**
 * Camera input gating. The world camera owns wheel/trackpad/touch gestures only when they start on the world canvas (or on empty
 * page chrome). Anything inside the interface (Hearth `.hw`, classic HUD panels, dialogs, lists, form controls) scrolls itself and
 * never zooms or rotates the camera.
 */
export const UI_EVENT_SELECTOR='.hw,.hud-panel,.hud,dialog,[role=dialog],[role=menu],[role=listbox],[role=tablist],[data-ui],input,select,textarea,button,a,summary,[contenteditable=true]';
type Closest={closest?:(s:string)=>unknown}|null|undefined;
/** True when the event target is inside interface chrome, so the camera must ignore it. */
export function eventInsideUi(target:unknown):boolean{
 const t=target as Closest;
 return !!t&&typeof t.closest==='function'&&!!t.closest(UI_EVENT_SELECTOR);
}
/**
 * Zoom multiplier for one wheel event. Proportional to the delta so a trackpad (many tiny pixel deltas) and a mouse wheel
 * (one 100 px or 3 line step) both feel steady; clamped so one event never jumps far. Positive deltaY zooms out.
 */
export function wheelZoomFactor(e:{deltaY:number;deltaMode?:number}):number{
 const px=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?400:1);
 if(!Number.isFinite(px)||px===0)return 1;
 return Math.exp(Math.max(-1,Math.min(1,px/100))*0.08);
}
