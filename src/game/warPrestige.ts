import type {GameState,Unit} from './types';
import type {Game} from './sim';
import type {RaidIntent,RaidIntentHistory} from './raidIntent';
import {CAPITULATION_RULES,type CapitulationState,type CapitulationOutcome} from './capitulation';
import {DOMINATION_RULES,type DominationState} from './domination';

export const WAR_PRESTIGE_RULES={version:1,heldAim:1,weights:{raze:.5,loot:.5,captives:.6,tribute:.8,autonomy:.8,puppet:1,occupy:1,annex:1.2}} as const;
type WarState=Pick<GameState,'time'|'buildings'|'raidDefense'>&{capitulation?:CapitulationState;dominations?:DominationState};
export type SettledWarPrestige={value:number;achieved:number;held:number;frontIds:number[]};
const arrangementKey=(hall:number,attacker:number,defender:number,terms:string,at:number)=>`${hall}:${attacker}:${defender}:${terms}:${at}`;
/** Authoritative own-party settled outcomes only. Rival display must use separate
 * returned witness receipts; looking at a hall does not reveal its war history.
 * The retained bounded front ledger is recomputed, never incremented on reads. */
export function settledWarPrestige(state:WarState,team=0):SettledWarPrestige{
 const result:SettledWarPrestige={value:0,achieved:0,held:0,frontIds:[]};
 const raidValue=team===0?raidDefensePrestige(state).value:0;
 result.held=raidValue;result.value=raidValue;
 if(!Number.isSafeInteger(team)||team<0||!Number.isFinite(state.time)||!state.capitulation)return result;
 const fronts=state.capitulation.fronts;if(!fronts.length)return result;
 const settled=fronts.slice(0,CAPITULATION_RULES.maximumFronts).filter(f=>
  (f.attackerTeam===team||f.defenderTeam===team)&&f.attackerTeam!==3&&f.defenderTeam!==3&&Number.isSafeInteger(f.id)&&f.id>0&&f.attackerTeam!==f.defenderTeam&&
  Number.isFinite(f.openedAt)&&f.openedAt>=0&&f.resolvedAt!==undefined&&Number.isFinite(f.resolvedAt)&&f.resolvedAt>=f.openedAt&&f.resolvedAt<=state.time&&
  (f.phase==='accepted'||f.phase==='relieved'));
 if(!settled.length)return result;
 const halls=new Map(state.buildings.map(b=>[b.id,b])),arrangements=new Map<string,NonNullable<WarState['dominations']>['list']>();
 for(const d of (state.dominations?.list||[]).slice(0,DOMINATION_RULES.maximum)){
  if(d.origin!=='capitulation')continue;const key=arrangementKey(d.hallId,d.overlord,d.subject,d.terms,d.createdAt),list=arrangements.get(key)||[];list.push(d);arrangements.set(key,list);
 }
 const seen=new Set<number>();
 for(const f of settled){
  if(seen.has(f.id))continue;seen.add(f.id);const hall=halls.get(f.hallId);
  if(f.phase==='relieved'){
   // A refusal is not relief. The actual relief writer waits for 120 seconds of
   // absent pressure; a lost or destroyed hall cannot claim a retained objective.
   if(f.defenderTeam!==team||!hall||hall.hp<=0||hall.team!==f.defenderTeam)continue;
   result.held+=WAR_PRESTIGE_RULES.heldAim;result.frontIds.push(f.id);continue;
  }
  if(f.attackerTeam!==team||!f.outcome||!Object.hasOwn(WAR_PRESTIGE_RULES.weights,f.outcome))continue;
  if(['tribute','puppet','autonomy'].includes(f.outcome)){
   // createDomination and resolution are synchronous in acceptCapitulation.
   // A later arrangement must not revive an older failed or released claim.
   const matches=arrangements.get(arrangementKey(f.hallId,f.attackerTeam,f.defenderTeam,f.outcome,f.resolvedAt!));
   if(matches?.length!==1||matches[0].phase!=='active'||!hall||hall.hp<=0||hall.team!==f.defenderTeam)continue;
  }
  result.achieved+=WAR_PRESTIGE_RULES.weights[f.outcome as CapitulationOutcome];result.frontIds.push(f.id);
 }
 result.value=result.achieved+result.held;return result;
}


/** A bounded, non-evicting identity ledger. Saturation stops new receipts rather
 * than allowing old histories to farm credit after eviction. No foreign totals. */
export const RAID_DEFENSE_RULES={version:1,maximumBands:128,maximumActors:36,heldWeight:.5,maximumCredit:4} as const;
export type RaidDefenseTerminal={actorId:number;outcome:'returned'|'lost';cargo:number;captives:number};
export type RaidDefenseBand={bandId:number;startedAt:number;witnessAt:number;intent:RaidIntent;expectedActors:number;actorIds:number[];terminals:RaidDefenseTerminal[];taken:number;recovered:number;escaped:number;buildingsLost:number;captivesLost:number;settledAt?:number;attempted:boolean;resisted:boolean;outcome?:'held'|'escaped'|'damaged'|'withdrawn'};
export type RaidDefenseState={version:1;bands:RaidDefenseBand[]};
/** Witness the actual body only at a player objective it has locally observed.
 * A remote death, scout, private rival raid or formal hall retreat is no proof. */
export function witnessRaidDefense(g:Game,u:Unit){
 const p=u.seaRaid?.plan;if(u.team!==3||!p||p.intent==='scout'||!g.visibleAt(u.x,u.z))return;
 if(!p.seenSites.some(id=>g.state.buildings.some(b=>b.id===id&&b.team===0)))return;
 const s=g.state.raidDefense??={version:1,bands:[]};let b=s.bands.find(b=>b.bandId===p.bandId);
 if(!b){if(s.bands.length>=RAID_DEFENSE_RULES.maximumBands)return;b={bandId:p.bandId,startedAt:p.selectedAt,witnessAt:g.state.time,intent:p.intent,expectedActors:p.initialBand,actorIds:[],terminals:[],taken:0,recovered:0,escaped:0,buildingsLost:0,captivesLost:0,attempted:false,resisted:false};s.bands.push(b);}
 if(!b.actorIds.includes(u.id)&&b.actorIds.length<RAID_DEFENSE_RULES.maximumActors)b.actorIds.push(u.id);
}
/** Evidence comes from real damage application, not kills/withdrawal totals. */
export function noteRaidDefenseDamage(g:Game,source:Unit|undefined,target:Unit|import('./types').Building,died:boolean){
 if(source?.team===3&&target.kind==='building'&&target.team===0){
  witnessRaidDefense(g,source);const b=g.state.raidDefense?.bands.find(b=>b.bandId===source.seaRaid?.plan?.bandId);
  if(b&&b.settledAt===undefined){b.attempted=true;if(died)b.buildingsLost++;}
 }else if(source?.team===0&&target.kind==='unit'&&target.team===3){
  witnessRaidDefense(g,target);const b=g.state.raidDefense?.bands.find(b=>b.bandId===target.seaRaid?.plan?.bandId);
  if(b&&b.settledAt===undefined)b.resisted=true;
 }
}
export function noteRaidDefenseAttempt(g:Game,u:Unit,defender:number){
 if(defender!==0)return;witnessRaidDefense(g,u);const b=g.state.raidDefense?.bands.find(b=>b.bandId===u.seaRaid?.plan?.bandId);if(b&&b.settledAt===undefined)b.attempted=true;
}
export function noteRaidDefenseRecovery(g:Game,bandId:number|undefined,owner:number,receiver:number,amount:number){
 if(bandId===undefined||owner!==0||receiver!==0||!(amount>0))return;
 const b=g.state.raidDefense?.bands.find(b=>b.bandId===bandId);if(b&&b.settledAt===undefined)b.recovered+=amount;
}
/** Called after actual return/death histories and real parcel deliveries. A
 * stranded body remains an unsettled objective, regardless of quiet timers. */
export function tickRaidDefense(g:Game){
 const bands=g.state.raidDefense?.bands;if(!bands?.length)return;
 for(const b of bands){
  if(b.settledAt!==undefined)continue;
  const histories=new Map<number,RaidIntentHistory>();
  for(const h of g.state.raidIntentHistory||[])if(h.plan.bandId===b.bandId&&h.outcome!=='stranded')histories.set(h.actorId,h);
  // Include every original member, including one which was out of sight.
  for(const h of histories.values())if(!b.actorIds.includes(h.actorId)&&b.actorIds.length<RAID_DEFENSE_RULES.maximumActors)b.actorIds.push(h.actorId);
  if(b.actorIds.length!==b.expectedActors||b.actorIds.some(id=>!histories.has(id))||g.state.units.some(u=>u.hp>0&&u.seaRaid?.plan?.bandId===b.bandId))continue;
  const hs=[...histories.values()];if(hs.length!==b.expectedActors)continue;
  b.taken=hs.reduce((n,h)=>n+h.plan.metrics.lootTaken,0);
  b.terminals=hs.map(h=>({actorId:h.actorId,outcome:h.outcome as 'returned'|'lost',cargo:h.cargo,captives:h.deliveredCaptives||0}));
  b.escaped=hs.reduce((n,h)=>n+(h.outcome==='returned'?Math.min(h.cargo,h.plan.metrics.lootTaken):0),0);
  // A capture is not foiled while its original resident remains in captivity,
  // even if the original guard died before reaching camp.
  const captiveStillHeld=g.state.units.some(u=>u.hp>0&&u.prisoner?.originTeam===0&&u.prisoner.captorTeam===3&&u.prisoner.guardId!==undefined&&b.actorIds.includes(u.prisoner.guardId));
  b.captivesLost=Number(captiveStillHeld||b.terminals.some(t=>t.captives>0));
  const captiveTaken=hs.some(h=>h.plan.metrics.captives>0);
  if(captiveStillHeld||b.terminals.some(t=>t.captives>0)||b.escaped>0){b.outcome='escaped';}
  else if(b.buildingsLost>0)b.outcome='damaged';
  else if(captiveTaken||b.recovered+1e-6<b.taken)continue; // released captives need a separate witnessed return receipt
  else b.outcome=b.taken>0||b.attempted&&b.resisted?'held':'withdrawn';
  b.settledAt=g.state.time;
 }
}
/** Read-only compact evidence, already restricted to witnessed player defense. */
export function raidDefensePrestige(state:Pick<GameState,'raidDefense'>){
 const bands=state.raidDefense?.bands||[],held=bands.filter(b=>b.outcome==='held'&&b.settledAt!==undefined).length;
 return{value:Math.min(RAID_DEFENSE_RULES.maximumCredit,held*RAID_DEFENSE_RULES.heldWeight),held,escaped:bands.filter(b=>b.outcome==='escaped').length,damaged:bands.filter(b=>b.outcome==='damaged').length,pending:bands.filter(b=>b.settledAt===undefined).length,saturated:bands.length>=RAID_DEFENSE_RULES.maximumBands};
}
export function validRaidDefense(s:GameState){
 const v=s.raidDefense;if(v===undefined)return true;
 const id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0&&Number(n)<s.nextId;
 const fin=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 const exact=(o:object,ks:string[])=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>ks.includes(k));
 if(!exact(v,['version','bands'])||v.version!==1||!Array.isArray(v.bands)||v.bands.length>RAID_DEFENSE_RULES.maximumBands)return false;
 const seen=new Set<number>();for(const b of v.bands){
  if(!exact(b,['bandId','startedAt','witnessAt','intent','expectedActors','actorIds','terminals','taken','recovered','escaped','buildingsLost','captivesLost','settledAt','attempted','resisted','outcome'])||!id(b.bandId)||seen.has(b.bandId)||!fin(b.startedAt,s.time)||!fin(b.witnessAt,s.time)||b.witnessAt<b.startedAt||!['loot','capture','destructive','annihilation'].includes(b.intent)||typeof b.attempted!=='boolean'||typeof b.resisted!=='boolean'||!Number.isInteger(b.expectedActors)||b.expectedActors<1||b.expectedActors>RAID_DEFENSE_RULES.maximumActors||!Array.isArray(b.actorIds)||b.actorIds.length>b.expectedActors||new Set(b.actorIds).size!==b.actorIds.length||!b.actorIds.every(id)||!Array.isArray(b.terminals)||b.terminals.length>b.expectedActors||![b.taken,b.recovered,b.escaped,b.buildingsLost,b.captivesLost].every(n=>fin(n))||!Number.isInteger(b.buildingsLost)||!Number.isInteger(b.captivesLost)||b.captivesLost>b.expectedActors||b.escaped>b.taken+1e-6)return false;
  seen.add(b.bandId);const ts=new Set<number>();for(const t of b.terminals){if(!exact(t,['actorId','outcome','cargo','captives'])||!b.actorIds.includes(t.actorId)||ts.has(t.actorId)||!['returned','lost'].includes(t.outcome)||!fin(t.cargo,24)||!Number.isInteger(t.captives)||t.captives<0||t.captives>1||t.outcome==='lost'&&t.captives>0)return false;ts.add(t.actorId);}
  if((b.outcome===undefined)!==(b.settledAt===undefined))return false;
  if(b.settledAt!==undefined&&(!fin(b.settledAt,s.time)||b.settledAt<b.witnessAt||b.terminals.length!==b.expectedActors||!['held','escaped','damaged','withdrawn'].includes(b.outcome!)||b.outcome==='held'&&(!(b.taken>0||b.attempted&&b.resisted)||b.escaped>0||b.buildingsLost>0||b.captivesLost>0||b.recovered+1e-6<b.taken||b.terminals.some(t=>t.captives>0))||b.outcome==='damaged'&&b.buildingsLost===0||b.outcome==='escaped'&&b.escaped===0&&b.captivesLost===0))return false;
 }
 return true;
}
