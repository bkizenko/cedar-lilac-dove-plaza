import type {Game} from './sim';
import type {Unit} from './types';
import {hasTaskCommitment} from './workCommitments';
import {beginWeaponWork,resumeWeaponWork} from './warfare';
import {reserveSeconds} from './settlement';
import {isDependent} from './settlement';
import {assignGuardDuty,dutyOf} from './guardDuty';
import {squadOfUnit} from './squads';
/** Optional town focus. It only acts on adults who are free (no direct order, no job lock, no paid task) and never overrides a player order.
 * craft: finish paused weapon work and keep a small weapon stock made.  war: the same with a larger stock, plus drill at the barracks and
 * armed adults standing watch. Off by default; absent in old saves. */
export type FocusMode='none'|'craft'|'war';
export const FOCUS_MODES:readonly FocusMode[]=['none','craft','war'];
export const FOCUS_RULES={version:1,reviewSeconds:3,failCooldownSeconds:30,craftStock:4,warStockPerAdult:.5,drillShare:.25,minimumReserveSeconds:420,maxWeaponJobs:2} as const;
type S=Game['state']&{focusMode?:FocusMode};
const st=(g:Game)=>g.state as S;
const next=new WeakMap<Game,number>(),failUntil=new WeakMap<Game,number>();
export const focusModeOf=(g:Game):FocusMode=>st(g).focusMode??'none';
export function setFocusMode(g:Game,mode:FocusMode){
 if(!FOCUS_MODES.includes(mode))return false;
 if(mode==='none')delete st(g).focusMode;else st(g).focusMode=mode;
 next.delete(g);failUntil.delete(g);
 g.banner(mode==='none'?'Town focus: normal':mode==='war'?'Town focus: war footing; free adults make arms, drill and stand watch':'Town focus: crafting; free adults make and finish equipment',4);
 return true;
}
const freeAdult=(g:Game,u:Unit)=>u.team===0&&u.hp>0&&!u.prisoner&&!u.boat&&!isDependent(g,u)&&!u.jobLock&&!u.emergency&&!u.recalled&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.selected&&!hasTaskCommitment(u)&&u.drill==null&&u.carry===0;
export function tickFocusMode(g:Game){
 const mode=focusModeOf(g);if(mode==='none')return;
 if(g.state.time<(next.get(g)??0))return;next.set(g,g.state.time+FOCUS_RULES.reviewSeconds);
 const t=g.tribe(0);if(!t)return;
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&!isDependent(g,u)&&!u.prisoner);
 // 1. finish paused weapon work
 for(const u of adults)if(u.weaponWork?.paused&&!u.selected)resumeWeaponWork(g,u);
 // 2. keep a weapon stock made (never starves the village: needs a food reserve)
 const stock=(t.spears||0)+(t.bows||0)+(t.blades||0),target=mode==='war'?Math.ceil(adults.length*FOCUS_RULES.warStockPerAdult):FOCUS_RULES.craftStock;
 const jobs=adults.filter(u=>u.weaponWork&&!u.weaponWork.paused).length;
 if(stock+jobs<target&&jobs<FOCUS_RULES.maxWeaponJobs&&reserveSeconds(g,0)>=FOCUS_RULES.minimumReserveSeconds&&g.state.time>=(failUntil.get(g)??0)&&adults.some(u=>freeAdult(g,u)&&u.type==='worker')){
  const wantBlade=t.age>=1&&(t.copper||0)>=6&&g.state.buildings.some(b=>b.team===0&&b.type==='forge'&&g.finished(b));
  const ok=beginWeaponWork(g,wantBlade?'blade':(t.bows||0)<(t.spears||0)&&t.age>=0&&(t.wood||0)>=3&&(t.stone||0)>=1?'bow':'spear',0,undefined,u=>freeAdult(g,u)&&u.type==='worker');
  if(!ok)failUntil.set(g,g.state.time+FOCUS_RULES.failCooldownSeconds);
 }
 if(mode!=='war')return;
 // 3. drill a share of free workers at the barracks (drillAI checks food and a reachable barracks itself)
 const drilling=adults.filter(u=>u.drill!=null).length,cap=Math.floor(adults.length*FOCUS_RULES.drillShare);
 if(t.age>=1&&drilling<cap&&reserveSeconds(g,0)>=FOCUS_RULES.minimumReserveSeconds&&g.state.buildings.some(b=>b.team===0&&b.type==='barracks'&&g.finished(b))){
  const u=adults.find(p=>freeAdult(g,p)&&p.type==='worker'&&!p.weaponWork);
  if(u){u.drill=0;u.job=null;u.jobLock=false;u.huntOnly=false;u.node=null;u.target=null;u.order='hold';u.workReason='War footing — drilling';}
 }
 // 4. armed adults without a squad or post stand watch where they are
 for(const u of adults){if(u.militia&&!u.selected&&!dutyOf(g,u)&&!squadOfUnit(g,u.id)&&u.escortId===undefined&&u.order==='hold'&&!u.stationOnArrival){assignGuardDuty(g,u.id,'post',u.x,u.z);break;}}
}
export function validFocusMode(s:any){return s.focusMode===undefined||s.focusMode==='craft'||s.focusMode==='war';}
