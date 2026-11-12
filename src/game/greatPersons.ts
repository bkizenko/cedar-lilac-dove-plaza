/** Great-person templates: archetype shifts to ruler sampling, drawn from history but never fixed.
 * Emergence depends on crisis + opportunity + institutionalisation: weak institutions let one person matter more. */
import {clamp01,hash32,makeRng,pick} from './rulerCore';
import {generateRuler,type Ruler,type Shift} from './rulerGenome';

export type Archetype={id:string;label:string;shift:Shift;crisis:number;needs:string};
export const ARCHETYPES:readonly Archetype[]=[
 {id:'worldConqueror',label:'World-conqueror',shift:{ambition:28,boldness:25,charisma:20,prudence:-12,pride:15,comp:{martial:28,diplomacy:6}},crisis:.3,needs:'a strong army and a fractured neighbourhood'},
 {id:'founderPrinceps',label:'Founder-princeps',shift:{prudence:18,charisma:15,ambition:18,tradition:12,comp:{statecraft:28,stewardship:10}},crisis:.7,needs:'civil strife that exhausts the old order'},
 {id:'ironChancellor',label:'Iron chancellor',shift:{prudence:25,cruelty:8,ambition:12,innovation:8,comp:{statecraft:30,diplomacy:22}},crisis:.5,needs:'a fragmented people and a patient sovereign'},
 {id:'westernizer',label:'Forced modernizer',shift:{innovation:30,cruelty:15,ambition:15,tradition:-25,comp:{stewardship:20,learning:15,martial:8}},crisis:.5,needs:'visible backwardness against rivals'},
 {id:'citizenFounder',label:'Reluctant founder',shift:{honor:25,prudence:15,ambition:-8,mercy:12,tradition:6,comp:{statecraft:15,diplomacy:18}},crisis:.6,needs:'a revolutionary moment and a broad coalition'},
 {id:'empireBuilderSage',label:'Tolerant emperor',shift:{mercy:20,generosity:15,ambition:18,prudence:10,innovation:10,comp:{diplomacy:25,statecraft:18,martial:10}},crisis:.4,needs:'diverse subject peoples and room to grow'},
 {id:'prophetKing',label:'Prophet-king',shift:{piety:35,charisma:25,boldness:12,tradition:-5,comp:{diplomacy:10,martial:10}},crisis:.6,needs:'spiritual crisis or foreign oppression'},
 {id:'lawgiver',label:'Lawgiver',shift:{prudence:20,honor:20,tradition:10,innovation:12,comp:{statecraft:25,learning:15}},crisis:.5,needs:'tangled customary law and a stable court'},
 {id:'merchantPrince',label:'Merchant-prince',shift:{generosity:6,prudence:15,innovation:15,paranoia:8,ambition:10,comp:{stewardship:28,diplomacy:15}},crisis:.2,needs:'strong trade networks and open ports'},
 {id:'queenRegnant',label:'Long-reigning sovereign',shift:{prudence:20,charisma:15,honor:10,mercy:5,comp:{statecraft:20,diplomacy:20,stewardship:10}},crisis:.3,needs:'a succession ending in the one capable heir'},
];
/** Chance per generation that a great person emerges. Crisis and opportunity raise it; institutions dampen it. */
export function emergenceChance(crisis:number,opportunity:number,institutionalization:number,archetype:Archetype):number{
 const fit=1-Math.abs(crisis-archetype.crisis);
 const base=.04+.22*clamp01(crisis)*clamp01(opportunity)*fit;
 return clamp01(base*(1.25-institutionalization/100));
}
/** Does one emerge this generation? If yes, which archetype and what ruler. Pure of its inputs. */
export function rollGreatPerson(seed:number,gen:number,crisis:number,opportunity:number,inst:number):{archetype:Archetype;ruler:Ruler}|null{
 const r=makeRng(hash32('great',seed,gen));
 const cands=ARCHETYPES.map(a=>[a,emergenceChance(crisis,opportunity,inst,a)] as const);
 const total=cands.reduce((s,c)=>s+c[1],0);
 const peak=Math.max(...cands.map(c=>c[1]));
 if(r()>=Math.min(.18,peak*1.15))return null;
 let x=r()*total,chosen=cands[0][0];for(const [a,p] of cands){x-=p;if(x<=0){chosen=a;break;}}
 return {archetype:chosen,ruler:generateRuler(hash32('great-ruler',seed,gen),{shift:chosen.shift,age:22+Math.floor(r()*12)})};
}
/** Reign shadow: how much the polity depends on one person. High when institutionalisation is low. */
export const keyPersonRisk=(inst:number,rulerCompAvg:number)=>Math.round(100*clamp01((1-inst/100)*(rulerCompAvg/100)*1.4));
/** After a great ruler dies, the gap between their reign and the system they built. Positive = routinised (survives). */
export const successionShock=(inst:number,keyRisk:number)=>Math.round(keyRisk-inst*.6);
export {pick};
