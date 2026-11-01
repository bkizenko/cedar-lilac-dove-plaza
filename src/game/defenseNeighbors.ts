import type {Game} from './sim';
import type {Unit} from './types';

export const DEFENSE_NEIGHBOR_RULES = {cellMeters:64, radiusMeters:65, minimumIndexedUnits:64} as const;
type Entry = {unit:Unit; ordinal:number; key:number};
type Index = {state:Game['state']; units:Unit[]; time:number; active:boolean; valid:boolean; buckets:Map<number,Entry[]>; entries:Map<Unit,Entry>};
const indexes = new WeakMap<Game,Index>();
function keyAt(x:number,z:number) {
  const cx=Math.floor(x/DEFENSE_NEIGHBOR_RULES.cellMeters),cz=Math.floor(z/DEFENSE_NEIGHBOR_RULES.cellMeters);
  // Legal worlds are far smaller. Unexpected/nonfinite coordinates use the
  // original scan instead of risking a key collision or an incomplete query.
  return Number.isFinite(cx)&&Number.isFinite(cz)&&Math.abs(cx)<32768&&Math.abs(cz)<32768?cx+cz*65536:null;
}
/** Active only inside Game.step's sequential actor loop. All ordinary actor
 * movement is committed by updateDefenseNeighbors in that actor's finally.
 * Separation, boat-passenger synchronization, births and contact-order motion
 * run outside this scope and are freshly indexed on the next step. */
export function beginDefenseNeighbors(g:Game) {
  let index=indexes.get(g);
  if(!index){index={state:g.state,units:g.state.units,time:g.state.time,active:false,valid:false,buckets:new Map(),entries:new Map()};indexes.set(g,index);}
  index.state=g.state;index.units=g.state.units;index.time=g.state.time;index.active=true;
  index.valid=g.state.units.length>=DEFENSE_NEIGHBOR_RULES.minimumIndexedUnits;
  index.buckets.clear();index.entries.clear();
  if(!index.valid)return;
  for(let ordinal=0;ordinal<index.units.length;ordinal++) {
    const unit=index.units[ordinal],key=keyAt(unit.x,unit.z);
    if(key===null){index.valid=false;return;}
    const entry={unit,ordinal,key},bucket=index.buckets.get(key);
    if(bucket)bucket.push(entry);else index.buckets.set(key,[entry]);
    index.entries.set(unit,entry);
  }
}
function usable(g:Game,index:Index) {
  if(index.state!==g.state||index.units!==g.state.units||index.time!==g.state.time||index.entries.size!==g.state.units.length)index.valid=false;
  return index.active&&index.valid;
}
export function updateDefenseNeighbors(g:Game,u:Unit) {
  const index=indexes.get(g);if(!index||!usable(g,index))return;
  const entry=index.entries.get(u),key=keyAt(u.x,u.z);
  if(!entry||key===null){index.valid=false;return;}
  if(key===entry.key)return;
  const old=index.buckets.get(entry.key),at=old?.indexOf(entry)??-1;
  if(!old||at<0){index.valid=false;return;}
  old[at]=old[old.length-1];old.pop();
  if(!old.length)index.buckets.delete(entry.key);
  entry.key=key;const next=index.buckets.get(key);
  if(next)next.push(entry);else index.buckets.set(key,[entry]);
}
export function endDefenseNeighbors(g:Game) {const index=indexes.get(g);if(index)index.active=false;}
/** Conservative spatial candidates in original array order. The caller retains
 * every exact distance, diplomacy, visibility and protection predicate. Outside
 * the audited loop (including direct calls), uncertainty always means full scan. */
export function defenseNeighbors(g:Game,u:Unit):Unit[] {
  const index=indexes.get(g);if(!index||!usable(g,index)||keyAt(u.x,u.z)===null)return g.state.units;
  const cell=DEFENSE_NEIGHBOR_RULES.cellMeters,radius=DEFENSE_NEIGHBOR_RULES.radiusMeters,found:Entry[]=[];
  for(let cz=Math.floor((u.z-radius)/cell);cz<=Math.floor((u.z+radius)/cell);cz++)
    for(let cx=Math.floor((u.x-radius)/cell);cx<=Math.floor((u.x+radius)/cell);cx++) {
      const bucket=index.buckets.get(cx+cz*65536);if(bucket)for(const entry of bucket)found.push(entry);
    }
  found.sort((a,b)=>a.ordinal-b.ordinal);
  return found.map(entry=>entry.unit);
}
