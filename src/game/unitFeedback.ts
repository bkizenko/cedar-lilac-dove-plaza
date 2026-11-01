import type {Unit} from './types';
export function unitFeedbackVisible(u:Pick<Unit,'id'|'hp'|'shelterId'|'selected'>,hovered:number|null,persistent:boolean){return u.hp>0&&!u.shelterId&&(u.id===hovered||persistent&&u.selected);}
type Point={x:number;y:number;behind?:boolean};
/** Cheap screen-space prefilter: detailed scene picking runs only near a visible body. */
export function pointerNearPerson(cx:number,cy:number,units:Unit[],project:(x:number,y:number,z:number)=>Point,visible:(u:Unit)=>boolean){
 for(const u of units){if(u.hp<=0||u.shelterId||!visible(u))continue;const feet=project(u.x,u.y,u.z),head=project(u.x,u.y+2*(u.stature||1),u.z);if(feet.behind||head.behind)continue;
 const dx=head.x-feet.x,dy=head.y-feet.y,t=Math.max(0,Math.min(1,((cx-feet.x)*dx+(cy-feet.y)*dy)/(dx*dx+dy*dy||1))),radius=Math.max(7,Math.min(20,Math.hypot(dx,dy)*.3));if(Math.hypot(cx-feet.x-dx*t,cy-feet.y-dy*t)<=radius)return true;
 }return false;
}
