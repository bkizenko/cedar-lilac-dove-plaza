import type {Unit} from '../game/types';
type RenderPerson=Pick<Unit,'id'|'hp'|'team'|'shelterId'|'selected'|'x'|'z'>;
/** Hidden/sheltered people never consume a finite body slot. Feedback targets
 * retain priority without changing simulation order or revealing unknown people. */
export function admitVisibleUnits<T extends RenderPerson>(units:readonly T[],capacity:number,visible:(unit:T)=>boolean,hovered:number|null=null):T[]{
 const hover:T[]=[],selected:T[]=[],others:T[]=[];
 for(const u of units){
  if(u.hp<=0||u.shelterId||!visible(u))continue;
  if(u.id===hovered)hover.push(u);else if(u.selected)selected.push(u);else others.push(u);
 }
 return [...hover,...selected,...others].slice(0,Math.max(0,Math.floor(capacity)));
}
