import type {Game} from './sim';
import type {Building,CritterKind,Unit} from './types';
import {hash32} from './rulerCore';
import {carryingCapacity} from './haulage';
/** Snares: a cheap Stone-age wild structure that takes small and medium prey over time without a chase.
 * Every catch removes one real animal from the wildlife stock near the snare (nothing appears from nowhere); the catch
 * waits in the snare until a worker checks it, spoils if left, and the snare holds only a few at once. Tunable game seconds, not historical. */
export const SNARE_RULES={version:1,radius:14,rollSeconds:90,maxHeld:3,spoilSeconds:900,
 /** chance per roll that an animal in reach is caught; deer are strong and only sometimes held. */
 chance:{bird:.35,goat:.25,sheep:.25,deer:.1} as Partial<Record<CritterKind,number>>,
 meat:{bird:3,goat:16,sheep:16,deer:24} as Partial<Record<CritterKind,number>>} as const;
export type SnareCatch={species:CritterKind;meat:number;at:number};
export type SnareState={catches:SnareCatch[];rolled:number};
export const snareReady=(g:Game,b:Building)=>b.type==='snare'&&b.hp>0&&g.finished(b);
export function snareCatches(g:Game,b:Building):SnareCatch[]{
 const s=b.snare;if(!s)return[];return s.catches.filter(c=>g.state.time-c.at<SNARE_RULES.spoilSeconds);
}
export function snareMeat(g:Game,b:Building){return snareCatches(g,b).reduce((n,c)=>n+c.meat,0);}
/** One deterministic roll for this snare in this window: the nearest eligible living animal in reach, if the dice (a hash of snare, window and animal) allow. */
export function rollSnare(g:Game,b:Building):boolean{
 if(!snareReady(g,b))return false;const s=b.snare??={catches:[],rolled:-1};
 s.catches=snareCatches(g,b);if(s.catches.length>=SNARE_RULES.maxHeld)return false;
 const window=Math.floor(g.state.time/SNARE_RULES.rollSeconds);if(s.rolled>=window)return false;s.rolled=window;
 const R=SNARE_RULES.radius;let best:typeof g.state.wildlife[number]|null=null,bd=Infinity;
 for(const c of g.state.wildlife){if(c.hp<=0||SNARE_RULES.chance[c.species]===undefined)continue;
  const d=Math.hypot(c.x-b.x,c.z-b.z);if(d>R||d>=bd)continue;
  if((hash32('snare',b.id,window,c.id)%1000)/1000>=SNARE_RULES.chance[c.species]!)continue;best=c;bd=d;}
 if(!best)return false;
 const i=g.state.wildlife.indexOf(best);if(i<0)return false;g.state.wildlife.splice(i,1);
 s.catches.push({species:best.species,meat:SNARE_RULES.meat[best.species]!,at:g.state.time});g.workBoard?.reset?.();return true;
}
export function tickSnares(g:Game){
 for(const b of g.state.buildings)if(b.type==='snare')rollSnare(g,b);
}
/** A worker at the snare takes what is held, up to what they can carry; the rest stays set. */
export function collectSnare(g:Game,u:Unit,b:Building){
 const held=snareCatches(g,b),room=Math.max(0,carryingCapacity(u,'food')-u.carry);
 if(!held.length||room<=0){if(!held.length){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='Snare checked, nothing in it';}else u.order='return';return 0;}
 let took=0;const left:SnareCatch[]=[];
 for(const c of held){if(took+c.meat<=room)took+=c.meat;else left.push(c);}
 if(took===0){u.order='return';return 0;}
 b.snare!.catches=left;u.carry+=took;u.carryType='food';u.carryFood='meat';u.workReason='Checked a snare, carrying the catch home';
 if(u.team===0)g.onSfx('rustle');
 u.order='return';u.node=null;return took;
}
export function validSnareState(v:unknown,now:number,type:string):boolean{
 if(v===undefined)return true;if(type!=='snare'||!v||typeof v!=='object'||Array.isArray(v))return false;
 const s=v as SnareState;if(!Number.isSafeInteger(s.rolled)||s.rolled<-1||s.rolled>1e9||!Array.isArray(s.catches)||s.catches.length>SNARE_RULES.maxHeld)return false;
 return s.catches.every(c=>!!c&&SNARE_RULES.meat[c.species]!==undefined&&Number.isFinite(c.meat)&&c.meat>0&&c.meat<=SNARE_RULES.meat[c.species]!&&Number.isFinite(c.at)&&c.at>=0&&c.at<=now);
}
