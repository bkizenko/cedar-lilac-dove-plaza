/** Houses (families) have personalities of their own, separate from any one ruler. A house biases the sampling of every
 * member born into it, and has internal factions that rule inside the polity (the "internal rule" layer).
 * Pure + seeded. */
import {clamp,hash32,makeRng,normal,pick,round} from './rulerCore';
import {TRAITS,type Trait,type Shift} from './rulerGenome';
import type {Polity} from './polityModel';

export const HOUSE_MOTTOS=['we hold','we remember','first to the field','the long road','bread before blood','none may kneel twice','the river keeps faith','we endure'] as const;
export type House={id:string;name:string;bias:Partial<Record<Trait,number>>;motto:string;reputation:number;cohesion:number;rivalOf?:string};
/** A house bias is mild (±12) so individuals still vary; it is applied as a Shift when generating members. */
export function generateHouse(seed:number,name:string):House{
 const r=makeRng(hash32('house',seed)),bias:Partial<Record<Trait,number>>={};
 const n=2+Math.floor(r()*2),pool=[...TRAITS];
 for(let i=0;i<n;i++){const t=pool.splice(Math.floor(r()*pool.length),1)[0];bias[t]=Math.round((r()<.5?-1:1)*(6+r()*8));}
 return {id:`house-${name}`,name,bias,motto:pick(r,HOUSE_MOTTOS),reputation:Math.round(normal(r,50,12)),cohesion:Math.round(normal(r,60,15))};
}
export const houseShift=(h:House):Shift=>({...h.bias});
/** Reputation moves with deeds; cohesion with disputes and marriages inside the house. Both clamp 0..100. */
export const adjustHouse=(h:House,rep:number,coh:number):House=>({...h,reputation:round(clamp(h.reputation+rep,0,100)),cohesion:round(clamp(h.cohesion+coh,0,100))});

/** Internal rule: who inside the realm holds real power, by polity form. Each faction has a demand and a loyalty. */
export type FactionKind='kin'|'warriors'|'priests'|'elders'|'merchants'|'landholders'|'commons'|'assembly';
export type Faction={kind:FactionKind;power:number;loyalty:number;demand:string};
const FACTIONS_BY_FORM:Record<Polity['form'],FactionKind[]>={
 bigMan:['kin','warriors','elders'],chiefly:['kin','warriors','elders','priests'],monarchy:['landholders','warriors','priests','merchants','kin'],
 oligarchy:['merchants','landholders','assembly','warriors'],republic:['assembly','merchants','commons','landholders'],
 theocracy:['priests','warriors','landholders','commons'],league:['assembly','kin','merchants','warriors'],
};
const DEMAND:Record<FactionKind,string>={kin:'offices for the family',warriors:'war and spoils',priests:'tithes and temples',elders:'a say in every major choice',merchants:'safe roads and low tariffs',landholders:'land and tax relief',commons:'bread and fair courts',assembly:'regular votes and a respected law'};
export function generateFactions(seed:number,p:Polity):Faction[]{
 const r=makeRng(hash32('fac',seed));
 const kinds=FACTIONS_BY_FORM[p.form],raw=kinds.map(()=>.2+r());const s=raw.reduce((a,b)=>a+b,0);
 return kinds.map((k,i)=>({kind:k,power:raw[i]/s,loyalty:Math.round(normal(r,55,15)),demand:DEMAND[k]}));
}
/** Ruler vs factions: how much the ruler's personality pleases each faction (−1..1). Feeds loyalty drift and unrest. */
export function factionPleasure(k:FactionKind,t:Record<Trait,number>):number{
 const v=(x:number)=>(x-50)/50;
 switch(k){
  case 'warriors':return clamp(.6*v(t.boldness)+.4*v(t.cruelty)+.3*v(t.ambition),-1,1);
  case 'priests':return clamp(.9*v(t.piety)+.2*v(t.tradition),-1,1);
  case 'merchants':return clamp(.5*v(t.prudence)+.4*v(t.innovation)+.3*v(t.generosity)-.3*v(t.cruelty),-1,1);
  case 'elders':return clamp(.7*v(t.tradition)+.3*v(t.honor)-.3*v(t.innovation),-1,1);
  case 'commons':return clamp(.6*v(t.mercy)+.4*v(t.generosity)-.3*v(t.pride),-1,1);
  case 'landholders':return clamp(.5*v(t.tradition)+.3*v(t.generosity)-.3*v(t.ambition),-1,1);
  case 'kin':return clamp(.7*v(t.honor)+.4*v(t.generosity),-1,1);
  case 'assembly':return clamp(.5*v(t.mercy)+.4*v(t.honor)-.4*v(t.pride)-.3*v(t.cruelty),-1,1);
 }
}
/** One year of internal politics: loyalty drifts toward the ruler's pleasure and away from unmet demands. Returns new factions. */
export function stepFactions(fs:Faction[],ruler:Record<Trait,number>,satisfied:Partial<Record<FactionKind,boolean>>={}):Faction[]{
 return fs.map(f=>{
  const pull=factionPleasure(f.kind,ruler)*3+(satisfied[f.kind]?2:-1.5);
  return {...f,loyalty:Math.round(clamp(f.loyalty+pull,0,100))};
 });
}
/** Share of internal power that is hostile (loyalty<35), weighted: the input unrest.ts calls coalitionLoss. */
export const coalitionLoss=(fs:Faction[])=>Math.min(100,Math.round(100*fs.reduce((s,f)=>s+(f.loyalty<35?f.power:0),0)));
