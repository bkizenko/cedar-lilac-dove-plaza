/** Cause and effect for international kinship actions. Every action returns an Effect list the sim applies to the
 * directed society-pair ledger; nothing is hidden or one-way. A marriage strengthens ties NOW and creates risks LATER
 * (claims, divided loyalties); an insult to a spouse's house does the opposite. Pure: (action, context) -> effects. */
import {clamp} from './rulerCore';

export type TieAction='marriage'|'fosterage'|'hostageExchange'|'envoy'|'giftBride'|'repudiate'|'spouseKilled'|'childOfUnionRules'|'tributeMarriage'|'breakPact';
export type Ties={trust:number;grievance:number;bond:number;claimOnA:number;claimOnB:number;ageTicks:number};
export const noTies=():Ties=>({trust:0,grievance:0,bond:0,claimOnA:0,claimOnB:0,ageTicks:0});
export type Ctx={rankGap:number;sameFaith:boolean;culturalGap:number;aRulerHonor:number;bRulerHonor:number;atWar:boolean;childHasClaim?:boolean};

export type Effect={ledger:keyof Ties;delta:number;why:string};
/** Immediate, explainable effects. `why` strings are shown in the UI as the cause chain. */
export function effects(a:TieAction,c:Ctx):Effect[]{
 const out:Effect[]=[];const e=(ledger:keyof Ties,delta:number,why:string)=>out.push({ledger,delta:Math.round(delta*10)/10,why});
 switch(a){
  case 'marriage':
   e('trust',8+(c.sameFaith?4:-2)-c.culturalGap*5,'a marriage binds two houses');
   e('bond',10-Math.abs(c.rankGap)*4,'an unequal match binds less');
   if(c.atWar)e('grievance',-6,'peace sealed by marriage');
   e('claimOnA',c.childHasClaim?0:2,'a child of the union may one day claim');
   e('claimOnB',c.childHasClaim?0:2,'and the other side may claim too');
   break;
  case 'fosterage':e('trust',6,'raised in each other’s hall');e('bond',7,'foster-kin owe each other');e('claimOnA',1,'a foster-son knows the court');break;
  case 'hostageExchange':e('trust',4,'each holds the other’s kin');e('bond',3,'mutual hostages');e('grievance',2,'a hostage resents the keeping');break;
  case 'envoy':e('trust',3,'an envoy carries word both ways');break;
  case 'giftBride':e('bond',5,'a gift of a bride');e('grievance',(c.rankGap>0?-2:3),c.rankGap>0?'honored by the match':'insulted by a lesser gift');break;
  case 'tributeMarriage':e('bond',4,'tribute sealed by blood');e('grievance',5,'the weaker house resents it');break;
  case 'repudiate':e('trust',-14,'a spouse cast off');e('grievance',16,'an insult to a whole house');e('bond',-12,'the bond is cut');e('claimOnA',4,'the cast-off house keeps its claim');break;
  case 'spouseKilled':e('trust',-30,'blood shed within the bond');e('grievance',35,'a vendetta is born');e('bond',-40,'the bond is destroyed');break;
  case 'childOfUnionRules':e('bond',12,'blood now rules both lines');e('trust',6,'the heir is kin to both');break;
  case 'breakPact':e('trust',-10-c.aRulerHonor/10,'an oath broken');e('grievance',12,'betrayal remembered');break;
 }
 return out;
}
export function apply(t:Ties,es:Effect[]):Ties{
 const n={...t};
 for(const x of es)n[x.ledger]=clamp(n[x.ledger]+x.delta,x.ledger==='trust'||x.ledger==='bond'?-100:0,100);
 return n;
}
/** Bonds fade without upkeep (envoys, visits); a living union renews them. Returns decayed ties. */
export function decay(t:Ties,unionAlive:boolean,years=1):Ties{
 const rate=unionAlive?.2:1.2;
 return {...t,bond:clamp(t.bond-rate*years,-100,100),ageTicks:t.ageTicks+years};
}
/** Delayed consequences: what a bond makes more likely. Used by AI and shown to the player as "what this union means". */
export function implications(t:Ties){
 return {
  willJoinDefensiveWar:t.bond>=35&&t.trust>=20,
  willDemandSeatInSuccession:t.claimOnA>=10||t.claimOnB>=10,
  vendettaRisk:t.grievance>=40,
  canBeBrokenCheaply:t.bond<15,
  cbAvailable:t.claimOnA>=12||t.claimOnB>=12?'succession' as const:t.grievance>=40?'vendetta' as const:null,
 };
}
export const bondLabel=(b:number)=>b>=60?'blood-bound':b>=35?'close kin':b>=15?'friendly':b>-15?'acquainted':b>-40?'estranged':'blood-feud';
