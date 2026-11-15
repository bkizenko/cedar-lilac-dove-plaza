import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent,reserveSeconds} from './settlement';
import {releaseTreeWorker} from './workAllocation';
import {releaseConstructionWorker} from './constructionOwnership';

/** Starvation guard. Runtime-only: it is recomputed from live state every few
 * game seconds, so nothing here is saved or needs persistence validation. */
export const FOOD_GUARD_RULES={engageSeconds:600,releaseSeconds:900,workerShare:.4,recomputeSeconds:3} as const;
type Cache={state:Game['state'];at:number;active:boolean;held:Set<number>;blocked:string[]};
const caches=new WeakMap<Game,Cache>();

const civilian=(g:Game,u:Unit)=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&!u.boat&&!u.emergency&&!u.expedition&&!u.envoy&&!u.recalled;
/** Already doing food work (field, forage, fish, hunt, search, food-role kitchen hand). */
const doingFood=(u:Unit)=>u.foodRole===true||u.order==='gather'&&u.job==='food'||u.order==='explore'&&(u.searchJob==='food'||u.searchJob==='hunt')||u.huntOnly===true&&u.order!=='idle';
const committed=(u:Unit)=>u.productionProjectId!==undefined||u.buildOrder!==undefined||u.carry>0||u.order==='build'||u.order==='trade';

function compute(g:Game):Cache{
  const prior=caches.get(g),wasActive=prior?.state===g.state?prior.active:false;
  const reserve=reserveSeconds(g,0);
  const active=wasActive?reserve<FOOD_GUARD_RULES.releaseSeconds:reserve<FOOD_GUARD_RULES.engageSeconds;
  const held=new Set<number>();
  const blocked:string[]=[];
  const civ=g.state.units.filter(u=>civilian(g,u));
  for(const u of civ){
    const r=u.workReason||'';
    if(/route blocked|cannot reach|no reachable|unreachable/i.test(r)&&(u.job==='food'||u.huntOnly||/hunt|food|catch|forag|fish|field/i.test(r)))blocked.push(r);
  }
  if(active&&civ.length){
    const need=Math.ceil(civ.length*FOOD_GUARD_RULES.workerShare);
    for(const u of civ)if(doingFood(u))held.add(u.id);
    if(held.size<need){
      const rest=civ.filter(u=>!held.has(u.id)).sort((a,b)=>Number(committed(a))-Number(committed(b))||a.id-b.id);
      for(const u of rest){if(held.size>=need)break;held.add(u.id);}
    }
  }
  const next={state:g.state,at:g.state.time,active,held,blocked};caches.set(g,next);return next;
}
function cache(g:Game){
  const c=caches.get(g);
  return c&&c.state===g.state&&g.state.time>=c.at&&g.state.time-c.at<FOOD_GUARD_RULES.recomputeSeconds?c:compute(g);
}
export const foodGuardActive=(g:Game)=>cache(g).active;
/** True when this person is part of the minimum food crew while the guard is on. */
export const foodGuardHolds=(g:Game,u:Unit)=>u.team===0&&cache(g).held.has(u.id);
export const foodGuardLabel=(g:Game)=>foodGuardActive(g)?`Food guard active · reserve under ${Math.round(FOOD_GUARD_RULES.releaseSeconds/60)} min, about ${Math.round(FOOD_GUARD_RULES.workerShare*100)}% of free hands held to food work`:null;
/** Distinct reasons food workers are blocked, so the alert strip can show them. */
export const foodBlockedReasons=(g:Game)=>[...new Set(cache(g).blocked)];
export function foodAlerts(g:Game){const out:string[]=[];const l=foodGuardActive(g)?'Food guard active':null;if(l)out.push(l);const b=foodBlockedReasons(g);if(b.length)out.push(b[0]+(b.length>1?` (+${b.length-1} more)`:''));return out;}

/** Auto-assigned (board) timber, stone, ore and building work. Player-directed work is never touched:
 * explicit job locks, ordered builds (buildOrder), paid production projects, carried goods and journeys all stay. */
const autoNonFood=(u:Unit)=>u.buildOrder===undefined&&u.productionProjectId===undefined&&!u.jobLock&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&
  (u.order==='gather'&&!!u.job&&u.job!=='food'&&!(u.node&&'species' in u.node)||u.order==='build'&&u.job!=='food');
const pulls=new WeakMap<Game,{state:Game['state'];next:number}>();
/** While the guard is on, move held people off auto-assigned non-food work so the board re-offers them food work. Returns how many were moved. */
export function foodGuardPullHands(g:Game){
  const p=pulls.get(g);if(p&&p.state===g.state&&g.state.time<p.next)return 0;
  pulls.set(g,{state:g.state,next:g.state.time+FOOD_GUARD_RULES.recomputeSeconds});
  const c=cache(g);if(!c.active)return 0;
  let n=0;
  for(const u of g.state.units){
    if(!c.held.has(u.id)||!civilian(g,u)||!autoNonFood(u))continue;
    if(u.order==='build')releaseConstructionWorker(g,u);else releaseTreeWorker(g,u);
    u.node=null;u.job=null;u.order='idle';u.gatherT=0;u.workCheckAt=0;u.workReason='Food guard: reserves are low, moving to food work';n++;
  }
  if(n){g.workBoard.invalidateTasks();}
  return n;
}
