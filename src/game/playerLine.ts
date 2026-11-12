/** The player always controls their own civ. Rulers change; the player's agency does not. When the ruler dies the next
 * of the line takes over and the player gets a HANDOVER summary: what changed in personality, which factions are pleased
 * or angered, which claimants exist. If the line fails entirely, a claimant (weaker, illegitimate) is raised. */
import {TRAITS,type Ruler,type Trait} from './rulerGenome';
import {FACTION_VIEW,type Faction} from './playerLineView';
import {factionPleasure} from './houses';

export type Handover={from:string;to:string;traitShifts:{trait:Trait;from:number;to:number}[];factionMood:{kind:string;before:number;after:number;note:string}[];legit:boolean;headline:string};
export function handover(prev:Ruler,next:Ruler,factions:Faction[],legit:boolean):Handover{
 const shifts=TRAITS.map(t=>({trait:t,from:prev.traits[t],to:next.traits[t]})).filter(x=>Math.abs(x.to-x.from)>=15).sort((a,b)=>Math.abs(b.to-b.from)-Math.abs(a.to-a.from)).slice(0,4);
 const mood=factions.map(f=>{const b=factionPleasure(f.kind,prev.traits),a=factionPleasure(f.kind,next.traits);return {kind:f.kind,before:Math.round(b*100)/100,after:Math.round(a*100)/100,note:a>b+.15?FACTION_VIEW.pleased(f.kind):a<b-.15?FACTION_VIEW.angered(f.kind):FACTION_VIEW.same(f.kind)};}).filter(m=>m.note!=='');
 const top=shifts[0];
 return {from:prev.name,to:next.name,traitShifts:shifts,factionMood:mood,legit,headline:`${next.name} takes up the rule${legit?'':' by weaker claim'}${top?`: ${top.to>top.from?'more':'less'} ${top.trait} than ${prev.name}`:''}.`};
}
