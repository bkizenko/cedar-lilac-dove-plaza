import type {Unit} from './types';
/** Ground ring under the player's own people: only while selected, hovered or inside the live drag-box preview. Never always-on; independent of the old persistent-ring option. */
export const UNIT_RINGS_ON=true;
export const MAX_SELECTION_RINGS=200;
export function unitFeedbackVisible(u:Pick<Unit,'id'|'hp'|'shelterId'|'selected'>&{team?:number},hovered:number|null,_persistent?:boolean,preview?:ReadonlySet<number>|null){return u.hp>0&&!u.shelterId&&(u.team===undefined||u.team===0)&&(u.id===hovered||!!u.selected||!!preview?.has(u.id));}
/** Ring list for a frame: ids (capped) with hover/preview marked bright. */
export function selectionRingList(units:Array<Pick<Unit,'id'|'hp'|'shelterId'|'selected'>&{team?:number}>,hovered:number|null,preview?:ReadonlySet<number>|null,cap=MAX_SELECTION_RINGS){const out:Array<{id:number;bright:boolean}>=[];for(const u of units){if(out.length>=cap)break;if(unitFeedbackVisible(u,hovered,true,preview))out.push({id:u.id,bright:u.id===hovered||!!preview?.has(u.id)});}return out;}
type Point={x:number;y:number;behind?:boolean};
/** Cheap screen-space prefilter: detailed scene picking runs only near a visible body. */
export function pointerNearPerson(cx:number,cy:number,units:Unit[],project:(x:number,y:number,z:number)=>Point,visible:(u:Unit)=>boolean){
 for(const u of units){if(u.hp<=0||u.shelterId||!visible(u))continue;const feet=project(u.x,u.y,u.z),head=project(u.x,u.y+2*(u.stature||1),u.z);if(feet.behind||head.behind)continue;
 const dx=head.x-feet.x,dy=head.y-feet.y,t=Math.max(0,Math.min(1,((cx-feet.x)*dx+(cy-feet.y)*dy)/(dx*dx+dy*dy||1))),radius=Math.max(7,Math.min(20,Math.hypot(dx,dy)*.3));if(Math.hypot(cx-feet.x-dx*t,cy-feet.y-dy*t)<=radius)return true;
 }return false;
}
