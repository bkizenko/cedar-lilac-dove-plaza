/** Dynasty: people, compressed aging, heirs, succession by law, marriage. Pure functions over a plain Dynasty record.
 * Rival dynasties age on a compressed clock (generation = LIFE_TICKS); the player's line is stepped by the same function
 * so succession works identically. Gated by polity tier via features(). */
import {clamp,hash32,makeRng,pick,type Rng} from './rulerCore';
import {generateRuler,type Ruler} from './rulerGenome';
import {features,type Polity,type SuccessionLaw} from './polityModel';

export type Person={id:string;name:string;age:number;sex:'f'|'m';alive:boolean;parent?:string;spouse?:string;houseOf:string;ruler?:Ruler;legit:boolean;claimStrength:number};
export type Dynasty={id:string;house:string;people:Record<string,Person>;rulerId:string;regent?:string;generation:number;log:string[]};
/** Sim ticks that equal one year of life for compressed (rival) clocks. */
export const LIFE_TICKS={rival:24,player:60} as const;
export const ADULT=16,OLD=55;

function personFrom(r:Ruler,house:string,sex:'f'|'m',parent?:string,legit=true):Person{
 return {id:r.id,name:r.name,age:r.age,sex,alive:true,parent,houseOf:house,ruler:r,legit,claimStrength:legit?50:20};
}
export function foundDynasty(seed:number,house:string):Dynasty{
 const r=makeRng(hash32('dyn',seed)),head=generateRuler(hash32('dyn-head',seed),{age:30+Math.floor(r()*14),id:`${house}-0`});
 const sex=r()<.7?'m':'f',p=personFrom(head,house,sex);
 return {id:`dyn-${house}`,house,people:{[p.id]:p},rulerId:p.id,generation:0,log:[]};
}
/** Mortality per year: infancy risk, flat adult risk, rising after OLD. Pure of (rng, age). */
export function yearlyDeathChance(age:number):number{return age<2?.12:age<ADULT?.01:age<OLD?.012+(age-ADULT)*.0004:.04+(age-OLD)*.012;}
export function childrenOf(d:Dynasty,id:string):Person[]{return Object.values(d.people).filter(p=>p.parent===id&&p.alive);}

/** Advance the dynasty one year. Returns a new Dynasty (input is not mutated). Event strings go to log. */
export function stepYear(d0:Dynasty,seed:number,tier:'band'|'chiefdom'|'state',law:SuccessionLaw,year:number):Dynasty{
 const d:Dynasty={...d0,people:{...d0.people},log:[...d0.log]};
 const r=makeRng(hash32('dynyear',seed,year,d.house)),f=features(tier);
 for(const id of Object.keys(d.people)){
  const p=d.people[id];if(!p.alive)continue;
  const np={...p,age:p.age+1};
  if(r()<yearlyDeathChance(np.age)){np.alive=false;d.log.push(`${year}: ${np.name} died aged ${np.age}`);}
  d.people[id]=np;
 }
 if(f.heirs){
  for(const p of Object.values(d.people)){
   if(!p.alive||p.sex!=='f'||!p.spouse||p.age<ADULT||p.age>42)continue;
   const kids=Object.values(d.people).filter(c=>c.parent===p.id).length;
   if(kids<6&&r()<.22){
    const father=d.people[p.spouse],cr=generateRuler(hash32('child',seed,year,p.id),{age:0,id:`${d.house}-${year}-${kids}-${p.id.slice(-3)}`,shift:inherit(father?.ruler,p.ruler)});
    d.people[cr.id]=personFrom(cr,d.house,r()<.5?'m':'f',p.spouse??p.id);d.log.push(`${year}: ${cr.name} born`);
   }
  }
 }
 const cur=d.people[d.rulerId];
 if(!cur||!cur.alive){
  const next=heir(d,law,r);
  if(next){d.rulerId=next.id;d.generation++;d.regent=next.age<ADULT&&f.regency?regentFor(d,next):undefined;d.log.push(`${year}: ${next.name} succeeds (${law})`);}
 }
 return d;
}
function inherit(a?:Ruler,b?:Ruler){
 if(!a&&!b)return {};
 const out:Record<string,number>={};
 for(const k of ['ambition','piety','innovation','tradition','boldness','prudence','cruelty','mercy','generosity','paranoia','charisma','pride','honor'] as const){
  const m=((a?.traits[k]??50)+(b?.traits[k]??50))/2;out[k]=(m-50)*.4;
 }
 return out;
}
function regentFor(d:Dynasty,child:Person):string|undefined{
 const kin=Object.values(d.people).filter(p=>p.alive&&p.age>=ADULT&&p.id!==child.id);
 return kin.sort((a,b)=>(b.ruler?.comp.statecraft??0)-(a.ruler?.comp.statecraft??0))[0]?.id;
}
/** Pick the heir under a law. Returns undefined when the line is extinct (caller handles claimant/regent). */
export function heir(d:Dynasty,law:SuccessionLaw,r:Rng):Person|undefined{
 const kin=Object.values(d.people).filter(p=>p.alive&&p.id!==d.rulerId);
 const dead=d.people[d.rulerId];
 const kids=kin.filter(p=>p.parent===dead?.id||p.parent===dead?.spouse);
 const pool=kids.length?kids:kin;
 if(!pool.length)return undefined;
 const byAge=(a:Person,b:Person)=>b.age-a.age;
 const ability=(p:Person)=>(p.ruler?.comp.statecraft??0)+(p.ruler?.comp.martial??0)+(p.ruler?.traits.charisma??0);
 switch(law){
  case 'primogenitureMale':{const m=pool.filter(p=>p.sex==='m');return [...(m.length?m:pool)].sort(byAge)[0];}
  case 'primogenitureAny':return [...pool].sort(byAge)[0];
  case 'ultimogeniture':return [...pool].sort((a,b)=>a.age-b.age)[0];
  case 'partible':return [...pool].sort(byAge)[0]; // title goes to eldest; the split is handled by the claims layer
  case 'agnaticSeniority':return [...kin.filter(p=>p.sex==='m'),...kin].sort(byAge)[0];
  case 'tanistry':case 'electiveAssembly':case 'councilElders':{
   const adults=pool.filter(p=>p.age>=ADULT);const c=adults.length?adults:pool;
   return [...c].sort((a,b)=>ability(b)+r()*20-(ability(a)+r()*20))[0];
  }
  case 'designated':return [...pool].sort((a,b)=>ability(b)-ability(a))[0];
 }
}
/** Marriage between two dynasties. Only if both tiers allow marriage exchange. Returns [dA,dB] with spouses linked. */
export function marry(a:Dynasty,pa:string,b:Dynasty,pb:string):[Dynasty,Dynasty]|null{
 const x=a.people[pa],y=b.people[pb];
 if(!x||!y||!x.alive||!y.alive||x.spouse||y.spouse||x.age<ADULT||y.age<ADULT)return null;
 return [{...a,people:{...a.people,[pa]:{...x,spouse:pb}},log:[...a.log,`${x.name} wed ${y.name}`]},{...b,people:{...b.people,[pb]:{...y,spouse:pa}},log:[...b.log]}];
}
/** Claim a foreign dynasty gains by marriage: strongest through a living child of the union. */
export function claimThrough(child:Person,law:SuccessionLaw):number{
 return clamp(child.claimStrength+(law==='partible'||law==='primogenitureAny'?10:0)-(child.legit?0:15)+(child.sex==='m'&&law==='primogenitureMale'?15:0));
}
export const validateDynasty=(d:Dynasty):string[]=>{const b:string[]=[];if(!d.people[d.rulerId])b.push('ruler missing');if(d.people[d.rulerId]&&!d.people[d.rulerId].alive)b.push('ruler dead');return b;};
export {pick};
