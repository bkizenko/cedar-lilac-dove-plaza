/** Optional save field `state.rulers`. Old saves have none and must load: every reader goes through validRulersState().
 * One wiring line in the sim (behind a switch) would call stepRulersYear(); nothing here imports Game. */
import {generateCast,type CivSeed} from './civGenerator';
import {foundDynasty,stepYear,validateDynasty,type Dynasty} from './dynasty';
import {emptyLedger,validateLedger,type Ledger} from './glory';
import {validatePolity} from './polityModel';
import {validateRuler} from './rulerGenome';
import {rollGreatPerson} from './greatPersons';
import type {Tier} from './fame';
import {familyFeatures} from './familyScale';
import {validDecisionState} from './societyState';
import {cbLegitimacyCost} from './unrest';

export type SocietyRulers={civ:CivSeed;dynasty:Dynasty;ledger:Ledger;greatEmerged:number};
export type Ward={kind:'foster'|'hostage';person:string;from:string;to:string;since:number};
export type WardReturn={kind:'foster'|'hostage';name:string;from:string;to:string;year:number;how:'grown'|'term'|'war'|'died';age:number};
export type RulersState={version:1;/** consecutive dynastic years a society has sat at 'uprising' or worse (domestic-pressure executor) */unrestYears?:Record<string,number>;wards?:Ward[];/** recent ends of fosterage/hostage terms (capped), for the chronicle; optional so old saves load */wardReturns?:WardReturn[];claims?:import('./unrest').Claim[];seed:number;year:number;societies:Record<string,SocietyRulers>;notices:Record<string,Tier>;ties?:Record<string,import('./ties').Ties>;climate?:number;climateT?:number;weary?:Record<string,number>;/** legitimacy strain (0..100) a house carries after citing casus belli; decays yearly; optional so old saves load */cbDebt?:Record<string,number>;decisions?:import('./societyState').DecisionState};

export function initRulers(gameSeed:number,ids:string[]):RulersState{
 const cast=generateCast(gameSeed,ids.length),societies:Record<string,SocietyRulers>={};
 ids.forEach((id,i)=>{const civ=cast[i];societies[id]={civ,dynasty:foundDynasty(civ.ruler.seed,id),ledger:emptyLedger(),greatEmerged:0};});
 return {version:1,seed:gameSeed,year:0,societies,notices:{}};
}
/** Advance one compressed year for every society. Pure: returns a new state. */
/** popOf: living people per society (default 120 = full dynasty mechanics, so tests/headless runs keep prior behaviour). */
export function stepRulersYear(s:RulersState,crisisOf:(id:string)=>number=()=>.3,popOf:(id:string)=>number=()=>120):RulersState{
 const year=s.year+1,societies:Record<string,SocietyRulers>={};
 for(const [id,sr] of Object.entries(s.societies)){
  const p=sr.civ.polity,before=sr.dynasty.generation,ff=familyFeatures(p.tier,popOf(id));
  let dyn=stepYear(sr.dynasty,s.seed,ff.heirs?p.tier:'band',p.succession,year),great=sr.greatEmerged;
  if(dyn.generation>before&&ff.greatPersons){
   const g=rollGreatPerson(s.seed+year,dyn.generation,crisisOf(id),sr.civ.ecology.surplus,p.institutionalization);
   if(g){great++;const cur=dyn.people[dyn.rulerId];if(cur)dyn={...dyn,people:{...dyn.people,[cur.id]:{...cur,ruler:{...g.ruler,id:cur.id},name:g.ruler.name}}};}
  }
  societies[id]={...sr,dynasty:dyn,greatEmerged:great};
 }
 return {...s,year,societies};
}
export function validRulersState(x:unknown):x is RulersState{
 const s=x as RulersState;
 if(!s||s.version!==1||typeof s.seed!=='number'||!s.societies||typeof s.societies!=='object')return false;
 for(const sr of Object.values(s.societies)){
  if(!sr?.civ||!sr.dynasty||!sr.ledger)return false;
  if(validatePolity(sr.civ.polity).length||validateRuler(sr.civ.ruler).length||validateLedger(sr.ledger).length)return false;
  if(validateDynasty(sr.dynasty).length&&sr.dynasty.people[sr.dynasty.rulerId]?.alive)return false;
 }
 if(s.claims!==undefined&&(!Array.isArray(s.claims)||s.claims.some(c=>!c||typeof c.holder!=='string'||typeof c.target!=='string'||c.holder===c.target||!Object.hasOwn(s.societies,c.holder)||!Object.hasOwn(s.societies,c.target)||!Number.isFinite(cbLegitimacyCost(c.kind))||!Number.isFinite(c.strength)||c.strength<0||c.strength>100||!Number.isFinite(c.expiresTick)||c.expiresTick<0)))return false;
 if(s.cbDebt!==undefined&&(!s.cbDebt||typeof s.cbDebt!=='object'||Array.isArray(s.cbDebt)||Object.values(s.cbDebt).some(v=>!Number.isFinite(v)||v<0||v>100)))return false;
 if(s.weary!==undefined&&(!s.weary||typeof s.weary!=='object'||Array.isArray(s.weary)||Object.values(s.weary).some(v=>!Number.isFinite(v)||v<0||v>100)))return false;
 if(s.unrestYears!==undefined&&(!s.unrestYears||typeof s.unrestYears!=='object'||Array.isArray(s.unrestYears)||Object.values(s.unrestYears).some(v=>!Number.isInteger(v)||v<0||v>1000)))return false;
 if(s.wardReturns!==undefined&&(!Array.isArray(s.wardReturns)||s.wardReturns.length>24||s.wardReturns.some(w=>!w||(w.kind!=='foster'&&w.kind!=='hostage')||typeof w.name!=='string'||w.name.length>60||typeof w.from!=='string'||typeof w.to!=='string'||!Number.isFinite(w.year)||!['grown','term','war','died'].includes(w.how)||!Number.isFinite(w.age))))return false;
 if(s.wards!==undefined&&(!Array.isArray(s.wards)||s.wards.some(w=>!w||(w.kind!=='foster'&&w.kind!=='hostage')||typeof w.person!=='string'||typeof w.from!=='string'||typeof w.to!=='string'||!Number.isFinite(w.since))))return false;
 if(s.decisions!==undefined&&!validDecisionState(s.decisions))return false;
 return true;
}
/** Old saves: absent field => feature off, nothing breaks. */
export const rulersOf=(state:{rulers?:unknown}):RulersState|null=>validRulersState(state.rulers)?state.rulers:null;
/** A society founded mid-game (a recognised breakaway): same generators as the opening cast, keyed by its new team id. Deterministic per (seed,id). */
export function addSociety(s:RulersState,id:string,gameSeed:number):void{
 if(s.societies[id])return;
 const n=Object.keys(s.societies).length,civ=generateCast(gameSeed+n*7919,1)[0];
 s.societies[id]={civ,dynasty:foundDynasty(civ.ruler.seed,id),ledger:emptyLedger(),greatEmerged:0};
}
