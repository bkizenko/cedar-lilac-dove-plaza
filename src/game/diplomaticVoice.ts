/** Diplomatic voice: how a rival's ruler greets, refuses and gives, derived read-only from the ruler's existing traits.
 * Pure text; no state, no random draws, no goods. Same traits give the same voice, so saves and old villages are untouched. */
import {TRAITS,type Trait} from './rulerGenome';
export type Traits=Partial<Record<Trait,number>>;
export type DiplomaticVoice={manner:'warm'|'stern'|'guarded'|'proud'|'plain';greeting:string;refusal:string;gift:string};
const hi=(t:Traits,k:Trait)=>(t[k]??50)>=60,lo=(t:Traits,k:Trait)=>(t[k]??50)<=40;
export function diplomaticVoice(traits:Traits|undefined,name:string):DiplomaticVoice{
 const t:Traits={};for(const k of TRAITS)t[k]=Math.max(0,Math.min(100,Math.round(traits?.[k]??50)));
 if(hi(t,'paranoia')&&!hi(t,'generosity'))return {manner:'guarded',greeting:`${name}'s envoys keep their hands where you can see them and name no one they travelled with.`,refusal:`${name} sends no answer you can hold them to, only that the matter will be weighed.`,gift:`${name} offers a small token and watches what you do with it.`};
 if(hi(t,'pride')||hi(t,'ambition')&&lo(t,'mercy'))return {manner:'proud',greeting:`${name} receives you as an equal at best, seated and in no hurry.`,refusal:`${name} refuses plainly and does not explain.`,gift:`${name} gives as a patron gives, and expects it to be remembered.`};
 if(hi(t,'cruelty')||lo(t,'mercy')&&hi(t,'boldness'))return {manner:'stern',greeting:`${name}'s hall is quiet when you enter; the guard stays armed.`,refusal:`${name} refuses and reminds you what happened to the last who pressed.`,gift:`${name} gives little, and names the price.`};
 if(hi(t,'generosity')||hi(t,'charisma')&&hi(t,'mercy'))return {manner:'warm',greeting:`${name} meets you at the door and has the fire built up before you speak.`,refusal:`${name} declines kindly and offers what they can in place of it.`,gift:`${name} gives freely and asks only that you come again.`};
 return {manner:'plain',greeting:`${name} hears you out and answers in few words.`,refusal:`${name} says no, and says it once.`,gift:`${name} gives what custom requires.`};
}
