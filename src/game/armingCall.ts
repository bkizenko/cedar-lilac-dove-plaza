import type {Game} from './sim';
import type {Unit,UnitType} from './types';
import {UNITS,AGE_STAT} from './constants';
import {isDependent} from './settlement';
import {militiaStoresReached} from './demobilization';
import {supplyDrops} from './campAnchor';
import {interruptCampRelocation} from './nomadicCamp';
/** Call to arms that finishes itself: adults who had to walk to the stores are remembered and take their weapon on arrival,
 * so the player presses Arm once instead of once per trip. Stock is only ever moved from the tribe store to a person. */
export type ArmingCall={team:number;ids:number[];since:number;until:number};
export const ARMING_CALL_RULES={version:1,reviewSeconds:.5,maximumSeconds:240,maximumIds:200} as const;
type S=Game['state']&{armingCall?:ArmingCall};
const st=(g:Game)=>g.state as S;
const lastReview=new WeakMap<Game,number>();
export function armEligible(g:Game,u:Unit,team:number,needStores=true){
 return u.team===team&&u.hp>0&&!u.prisoner&&u.type==='worker'&&!u.militia&&!u.societyMissionId&&!u.coastalVoyageId&&!u.coastalCommissionId&&!isDependent(g,u)&&
  u.carry===0&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.waterWork&&!u.boat&&(!needStores||militiaStoresReached(g,u));
}
/** Wider than the strict cache frontage, so a crowd that was sent to the stores does not jam on one spot. */
export const nearStores=(g:Game,u:Unit)=>militiaStoresReached(g,u)||supplyDrops(g,u.team).some(d=>d.kind==='camp'&&Math.hypot(u.x-d.x,u.z-d.z)<=d.radius+6);
export const weaponStockTotal=(g:Game,team:number)=>{const t=g.tribe(team);return t?(t.blades||0)+(t.bows||0)+(t.spears||0):0;};
/** Take the best available weapon from the tribe store and equip this person. False when the stock is empty. */
export function armFromStock(g:Game,u:Unit,team=u.team){
 const t=g.tribe(team);if(!t)return false;let kind:UnitType|null=null;
 if((t.blades||0)>0){t.blades--;kind='swordsman';}else if((t.bows||0)>0){t.bows--;kind='archer';}else if((t.spears||0)>0){t.spears--;kind='spearman';}
 if(!kind)return false;
 interruptCampRelocation(g,u);const d=UNITS[kind];
 u.type=kind;u.militia=true;u.range=d.range;u.dmg=d.dmg*AGE_STAT[t.age];u.rof=d.rof;
 u.order='hold';u.job=null;u.node=null;u.target=null;u.emergency=undefined;u.workReason='Armed civilian — ready to defend or raid';
 return true;
}
/** Remember walkers so they arm themselves on arrival (merges with an existing call of the same team). */
export function rememberArmingCall(g:Game,team:number,ids:readonly number[]){
 const s=st(g),now=g.state.time,R=ARMING_CALL_RULES,cur=s.armingCall&&s.armingCall.team===team&&s.armingCall.until>now?s.armingCall:undefined;
 const merged=[...new Set([...(cur?.ids??[]),...ids])].slice(0,R.maximumIds);
 s.armingCall={team,ids:merged,since:cur?.since??now,until:now+R.maximumSeconds};
}
export const armingCallStatus=(g:Game,team=0)=>{const c=st(g).armingCall;return c&&c.team===team&&c.until>g.state.time?{waiting:c.ids.length,until:c.until}:{waiting:0,until:0};};
export function cancelArmingCall(g:Game){delete st(g).armingCall;}
export function tickArmingCall(g:Game){
 const s=st(g),c=s.armingCall;if(!c)return;
 if(g.state.time<(lastReview.get(g)??0))return;lastReview.set(g,g.state.time+ARMING_CALL_RULES.reviewSeconds);
 if(g.state.time>=c.until||!weaponStockTotal(g,c.team)){delete s.armingCall;return;}
 const live=new Map(g.state.units.map(u=>[u.id,u]));let armed=0;const keep:number[]=[];
 for(const id of c.ids){
  const u=live.get(id);if(!u||u.hp<=0||u.team!==c.team||u.militia||u.prisoner||u.expedition||u.boat)continue;
  if(armEligible(g,u,c.team,false)&&nearStores(g,u)&&armFromStock(g,u,c.team)){armed++;continue;}
  keep.push(id);
 }
 if(armed&&c.team===0)g.banner(`${armed} ${armed===1?'adult takes':'adults take'} up arms at the stores`,2);
 if(keep.length)c.ids=keep;else delete s.armingCall;
}
export function validArmingCall(s:any){
 const c=s.armingCall;if(c===undefined)return true;
 if(!c||typeof c!=='object'||!Number.isInteger(c.team)||c.team<0||c.team>=s.tribes.length||!Array.isArray(c.ids)||c.ids.length>ARMING_CALL_RULES.maximumIds)return false;
 if(![c.since,c.until].every(Number.isFinite))return false;
 return c.ids.every((id:unknown)=>Number.isInteger(id)&&(id as number)>=0&&(id as number)<s.nextId);
}
/** Read-only military stock for barracks, town hall and store panels: weapons in stores, people carrying them, adults still unarmed. */
export function weaponStockReport(g:Game,team=0){
 const t=g.tribe(team),armed={spearman:0,archer:0,swordsman:0,other:0};let free=0;
 for(const u of g.state.units){
  if(u.team!==team||u.hp<=0||u.prisoner)continue;
  if(u.militia){if(u.type==='spearman')armed.spearman++;else if(u.type==='archer')armed.archer++;else if(u.type==='swordsman')armed.swordsman++;else armed.other++;}
  else if(armEligible(g,u,team,false))free++;
 }
 const spears=t?.spears||0,bows=t?.bows||0,blades=t?.blades||0;
 return {spears,bows,blades,stored:spears+bows+blades,armed,armedTotal:armed.spearman+armed.archer+armed.swordsman+armed.other,unarmedAdults:free,waiting:armingCallStatus(g,team).waiting};
}
export const weaponStockText=(r:ReturnType<typeof weaponStockReport>)=>`In stores: ${r.spears} spears · ${r.bows} bows · ${r.blades} blades. Under arms: ${r.armedTotal} (${r.armed.spearman} spear · ${r.armed.archer} bow · ${r.armed.swordsman} blade). Unarmed adults: ${r.unarmedAdults}${r.waiting?` · ${r.waiting} on their way to arm`:''}.`;
