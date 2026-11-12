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

export type SocietyRulers={civ:CivSeed;dynasty:Dynasty;ledger:Ledger;greatEmerged:number};
export type Ward={kind:'foster'|'hostage';person:string;from:string;to:string;since:number};
export type RulersState={version:1;wards?:Ward[];claims?:import('./unrest').Claim[];seed:number;year:number;societies:Record<string,SocietyRulers>;notices:Record<string,Tier>;ties?:Record<string,import('./ties').Ties>;climate?:number;climateT?:number};

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
 if(s.claims!==undefined&&(!Array.isArray(s.claims)||s.claims.some(c=>!c||typeof c.holder!=='string'||typeof c.target!=='string'||!Number.isFinite(c.strength)||!Number.isFinite(c.expiresTick))))return false;
 if(s.wards!==undefined&&(!Array.isArray(s.wards)||s.wards.some(w=>!w||(w.kind!=='foster'&&w.kind!=='hostage')||typeof w.person!=='string'||typeof w.from!=='string'||typeof w.to!=='string'||!Number.isFinite(w.since))))return false;
 return true;
}
/** Old saves: absent field => feature off, nothing breaks. */
export const rulersOf=(state:{rulers?:unknown}):RulersState|null=>validRulersState(state.rulers)?state.rulers:null;
