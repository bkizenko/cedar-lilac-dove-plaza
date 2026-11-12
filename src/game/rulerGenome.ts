/** Ruler genome: independent traits (no exclusive axes), competences, ambitions and an inner life.
 * Pure and seeded. Traits are sampled with a small shared "temperament" factor so real correlations exist
 * (e.g. ambition and boldness tend to co-occur) without ever forbidding a combination (pious AND innovative is fine). */
import {clamp,hash32,makeRng,normal,pick,round,type Rng} from './rulerCore';

export const TRAITS=['ambition','piety','innovation','tradition','boldness','prudence','cruelty','mercy','generosity','paranoia','charisma','pride','honor'] as const;
export type Trait=(typeof TRAITS)[number];
export const COMPETENCES=['martial','statecraft','diplomacy','stewardship','learning'] as const;
export type Competence=(typeof COMPETENCES)[number];
export const AMBITIONS=['conquest','glory','dynasty','faith','wealth','legacyBuilding','security','reform','knowledge'] as const;
export type Ambition=(typeof AMBITIONS)[number];

export const FEARS=['betrayal','obscurity','plague','defeat','heresy','poverty','succession','humiliation'] as const;
export const WOUNDS=['usurped','lostChild','humiliatedInWar','exiledYouth','famine','betrayedByKin','lowBirth','none'] as const;
export const SPEECH=['blunt','florid','laconic','proverbial','formal','warm','sardonic'] as const;
export type Fear=(typeof FEARS)[number];export type Wound=(typeof WOUNDS)[number];export type Speech=(typeof SPEECH)[number];

export type Ruler={
 id:string;seed:number;name:string;
 traits:Record<Trait,number>;comp:Record<Competence,number>;
 ambitions:Ambition[];fear:Fear;wound:Wound;speech:Speech;
 /** Where this person's drive points, unnormalised 0..100 each, sums to drive-weighted profile. */
 contradiction:{a:Trait;b:Trait;note:string}|null;
 /** Who they owe loyalty to: ids filled by the dynasty layer. */
 loyalties:string[];
 /** How the personality drifts: each key is a trait nudged by life events (see evolve). */
 history:{kind:string;trait:Trait;delta:number}[];
 age:number;
};

/** Drive: how strongly the person personally pushes outward. Ambition dominates; prudence and mercy brake; boldness/pride add. */
export function drive(t:Record<Trait,number>):number{
 return Math.round(clamp(.45*t.ambition+.2*t.boldness+.1*t.pride+.1*t.charisma-.15*t.prudence-.1*t.mercy+.15*50));
}
export function dominantTraits(t:Record<Trait,number>,n=3):Trait[]{
 return [...TRAITS].sort((a,b)=>Math.abs(t[b]-50)-Math.abs(t[a]-50)).slice(0,n);
}
const NAME_A=['Ar','Bel','Cor','Dan','El','Fen','Gor','Hal','Ish','Jar','Kor','Lun','Mar','Nor','Ola','Per','Ras','Sel','Tor','Ul','Vash','Yar','Zen'];
const NAME_B=['an','ek','im','or','us','ath','en','il','ak','ume','ara','os'];
const NAME_C=['','','a','ric','dan','mir','vek','thas','el','gar'];
export function makeName(r:Rng):string{return pick(r,NAME_A)+pick(r,NAME_B)+pick(r,NAME_C);}

/** A templated archetype shifts the sampling mean; it never fixes a trait. */
export type Shift=Partial<Record<Trait,number>>&{comp?:Partial<Record<Competence,number>>};
export function generateRuler(seed:number,opts:{shift?:Shift;age?:number;traditionalism?:number;id?:string}={}):Ruler{
 const r=makeRng(hash32('ruler',seed));
 const temper=(r()-.5)*2;               // shared factor: restless (+) vs settled (-)
 const warm=(r()-.5)*2;                 // shared factor: warm (+) vs hard (-)
 const sh=opts.shift??{};
 const base:Record<Trait,number>={
  ambition:50+temper*14,boldness:50+temper*12,prudence:50-temper*10,innovation:50+temper*8-((opts.traditionalism??50)-50)*.2,
  tradition:50-temper*6+((opts.traditionalism??50)-50)*.3,mercy:50+warm*14,generosity:50+warm*12,cruelty:50-warm*14,
  paranoia:50-warm*6,charisma:50+warm*4,piety:50,pride:50+temper*6,honor:50+warm*5,
 };
 const traits={} as Record<Trait,number>;
 for(const k of TRAITS)traits[k]=Math.round(normal(r,base[k]+(sh[k]??0),17));
 const comp={} as Record<Competence,number>;
 for(const k of COMPETENCES)comp[k]=Math.round(normal(r,50+(sh.comp?.[k]??0),18));
 const amb=[...AMBITIONS].map(a=>[a,weightAmb(a,traits)+r()*25] as const).sort((x,y)=>y[1]-x[1]).slice(0,2).map(x=>x[0]);
 // contradiction: the pair of traits most "in tension" that are both high — a real person holds both.
 const pairs:[Trait,Trait,string][]=[['piety','cruelty','prays and kills'],['mercy','ambition','merciful but will not stop'],['innovation','tradition','reforms in the name of the old ways'],['generosity','paranoia','gives freely, trusts no one'],['honor','ambition','keeps his word until it costs a province'],['prudence','boldness','cautious for years, then reckless once']];
 let contradiction:Ruler['contradiction']=null,best=0;
 for(const [a,b,note] of pairs){const s=Math.min(traits[a],traits[b]);if(s>best&&s>=62){best=s;contradiction={a,b,note};}}
 return {id:opts.id??`r${seed}`,seed,name:makeName(r),traits,comp,ambitions:amb,fear:pick(r,FEARS),wound:pick(r,WOUNDS),speech:pick(r,SPEECH),contradiction,loyalties:[],history:[],age:opts.age??Math.round(normal(r,34,9,18,70))};
}
function weightAmb(a:Ambition,t:Record<Trait,number>):number{
 switch(a){
  case 'conquest':return t.ambition*.5+t.boldness*.3+t.cruelty*.2;
  case 'glory':return t.pride*.5+t.charisma*.3+t.ambition*.2;
  case 'dynasty':return t.honor*.3+t.tradition*.3+t.ambition*.2+t.paranoia*.2;
  case 'faith':return t.piety*.8+t.tradition*.2;
  case 'wealth':return (100-t.generosity)*.4+t.prudence*.3+t.ambition*.3;
  case 'legacyBuilding':return t.pride*.4+t.innovation*.3+t.generosity*.3;
  case 'security':return t.paranoia*.5+t.prudence*.5;
  case 'reform':return t.innovation*.6+t.ambition*.2+t.charisma*.2;
  case 'knowledge':return t.innovation*.4+t.prudence*.2+t.mercy*.2+t.piety*.2;
 }
}
/** Life shapes people. Deterministic: same event on the same ruler gives the same drift. */
export type LifeEvent='victory'|'defeat'|'betrayal'|'plague'|'childBorn'|'childDied'|'conquest'|'faithCrisis'|'famine'|'peaceLong';
const DRIFT:Record<LifeEvent,[Trait,number][]>={
 victory:[['pride',3],['boldness',2]],defeat:[['prudence',3],['paranoia',2],['pride',-2]],betrayal:[['paranoia',5],['mercy',-3],['honor',-2]],
 plague:[['piety',3],['prudence',2]],childBorn:[['honor',2],['tradition',1],['ambition',1]],childDied:[['piety',3],['mercy',2],['ambition',-2]],
 conquest:[['ambition',3],['cruelty',2],['pride',2]],faithCrisis:[['piety',4],['tradition',2]],famine:[['generosity',2],['prudence',3]],peaceLong:[['prudence',2],['ambition',-2],['innovation',1]],
};
export function evolve(r:Ruler,ev:LifeEvent):Ruler{
 const t={...r.traits},h=[...r.history];
 for(const [k,d] of DRIFT[ev]){const before=t[k];t[k]=clamp(before+d,0,100);if(t[k]!==before)h.push({kind:ev,trait:k,delta:t[k]-before});}
 return {...r,traits:t,history:h.slice(-40)};
}
export function validateRuler(r:Ruler):string[]{
 const bad:string[]=[];
 for(const k of TRAITS)if(!(r.traits[k]>=0&&r.traits[k]<=100))bad.push(`trait ${k} out of range`);
 for(const k of COMPETENCES)if(!(r.comp[k]>=0&&r.comp[k]<=100))bad.push(`comp ${k} out of range`);
 if(!r.ambitions.every(a=>AMBITIONS.includes(a)))bad.push('unknown ambition');
 if(!(r.age>=0&&r.age<=120))bad.push('age out of range');
 return bad;
}
export const describe=(r:Ruler)=>`${r.name} (${r.age}) ${dominantTraits(r.traits).map(t=>`${r.traits[t]>=50?'high':'low'} ${t}`).join(', ')}; drive ${drive(r.traits)}; wants ${r.ambitions.join('+')}`;
export {round};
