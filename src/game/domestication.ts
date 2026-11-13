import type {Game} from './sim';
import type {GameState,Critter,Unit,Tribe} from './types';
import {herdRules} from './animalSpecies';
export type DomesticationSpecies='goat'|'sheep'|'horse'|'cattle';
/** Tunable game probabilities and seconds, not measured historical rates. */
export const DOMESTICATION_RULES={baseChance:{goat:.82,sheep:.78,horse:.58,cattle:.48},temperamentSpread:.24,minimumChance:.2,maximumChance:.95,familiarityPerRefusal:.04,maximumFamiliarity:.16,practicePerCompleted:.005,maximumPracticeBonus:.1,cooldownSeconds:30,maximumSearchTrials:2,maximumHistory:16,maximumAnimalHistory:4,maximumCounter:1e6,maximumHandlingSeconds:1e9} as const;
export type DomesticationMemory={version:1;temperament:number;attempts:number;familiarity:number;cooldownUntil:number;recent:{attempt:number;handlerId:number;at:number;outcome:DomesticationOutcome['outcome']}[]};
export type DomesticationTrial={version:1;purpose:'pen'|'pack';team:number;paidWood:number;species:DomesticationSpecies;attempt:number;paidFood:number;startedAt:number;chance:number;roll:number;handlingSeconds:number;resolved?:'success'};
export type DomesticationPractice={version:1;handlingSeconds:number;completed:number;successes:number;refusals:number};
export type DomesticationOutcome={purpose:'pen'|'pack';paidWood:number;animalId:number;handlerId:number;species:DomesticationSpecies;attempt:number;paidFood:number;at:number;outcome:'success'|'refused'|'abandoned'};
export type DomesticationHistory={version:1;paidAttempts:number;baitSpent:number;woodSpent:number;successes:number;refusals:number;abandoned:number;arrivals:number;recent:DomesticationOutcome[]};
const R=DOMESTICATION_RULES;
function sample(seed:number,id:number,index:number){let n=(seed^Math.imul(id,0x45d9f3b)^Math.imul(index,0x27d4eb2d))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296;}
const species=(s:string):s is DomesticationSpecies=>Object.hasOwn(R.baseChance,s);
export const domesticationReady=(g:Game,a:Critter,team=0)=>(!a.domestication||a.domestication.cooldownUntil<=g.state.time&&a.domestication.attempts<R.maximumCounter)&&(g.tribe(team).domestication?.paidAttempts||0)<R.maximumCounter;
function history(t:Tribe){return t.domestication??={version:1,paidAttempts:0,baitSpent:0,woodSpent:0,successes:0,refusals:0,abandoned:0,arrivals:0,recent:[]};}
/** Call only AFTER the ordinary exact bait debit succeeds. No read initializes state. */
export function beginDomesticationTrial(g:Game,u:Unit,a:Critter,purpose:'pen'|'pack'='pen'):DomesticationTrial{
 if(!species(a.species))throw new Error('Unsupported domestication species');
 const m=a.domestication??={version:1,temperament:sample(g.state.seed,a.id,0),attempts:0,familiarity:0,cooldownUntil:0,recent:[]};
 const attempt=++m.attempts,practice=Math.min(R.maximumPracticeBonus,(u.domesticationPractice?.completed||0)*R.practicePerCompleted);
 const chance=Math.max(R.minimumChance,Math.min(R.maximumChance,R.baseChance[a.species]+(m.temperament-.5)*R.temperamentSpread+m.familiarity+practice));
 const h=history(g.tribe(u.team)),paidFood=purpose==='pack'?10:herdRules(a.species).tamingFood,paidWood=purpose==='pack'?2:0;h.paidAttempts++;h.baitSpent+=paidFood;h.woodSpent+=paidWood;
 return{version:1,purpose,team:u.team,paidWood,species:a.species,attempt,paidFood,startedAt:g.state.time,chance,roll:sample(g.state.seed,a.id,attempt),handlingSeconds:0};
}
export function practiceDomestication(u:Unit,trial:DomesticationTrial,seconds:number){
 if(!(seconds>0))return;trial.handlingSeconds+=seconds;
 const p=u.domesticationPractice??={version:1,handlingSeconds:0,completed:0,successes:0,refusals:0};p.handlingSeconds=Math.min(R.maximumHandlingSeconds,p.handlingSeconds+seconds);
}
export function finishDomesticationTrial(g:Game,u:Unit,outcome:DomesticationOutcome['outcome']){
 const w=u.tamingWork,t=w?.trial;if(!w||!t||t.resolved)return;
 const h=history(g.tribe(t.team));if(outcome==='success'){h.successes++;t.resolved='success';}else if(outcome==='refused')h.refusals++;else h.abandoned++;
 h.recent.push({purpose:t.purpose,paidWood:t.paidWood,animalId:w.animal,handlerId:u.id,species:t.species,attempt:t.attempt,paidFood:t.paidFood,at:g.state.time,outcome});if(h.recent.length>R.maximumHistory)h.recent.shift();
 if(outcome!=='abandoned'){
  const p=u.domesticationPractice??={version:1,handlingSeconds:0,completed:0,successes:0,refusals:0};p.completed++;if(outcome==='success')p.successes++;else p.refusals++;
 }
 const a=g.state.wildlife.find(a=>a.id===w.animal)||g.state.livestock?.find(a=>a.id===w.animal);if(a?.domestication){a.domestication.recent.push({attempt:t.attempt,handlerId:u.id,at:g.state.time,outcome});if(a.domestication.recent.length>R.maximumAnimalHistory)a.domestication.recent.shift();}
 if(a?.domestication&&outcome!=='success'){
  a.domestication.cooldownUntil=g.state.time+R.cooldownSeconds;
  if(outcome==='refused')a.domestication.familiarity=Math.min(R.maximumFamiliarity,a.domestication.familiarity+R.familiarityPerRefusal);
 }
}
export function noteDomesticationArrival(g:Game,u:Unit){if(u.tamingWork?.trial?.resolved==='success'&&u.tamingWork.trial.purpose==='pen')history(g.tribe(u.tamingWork.trial.team)).arrivals++;}
/** Invalid actors lose the failed attempt reservation; actual paid bait is never refunded. Valid paused work remains paid. */
export function reconcileDomestication(g:Game){if(!g.state.tribes.some(t=>t.domestication))return;for(const u of g.state.units){const w=u.tamingWork;if(!w?.trial)continue;const t=w.trial,pen=t.purpose==='pack'||g.state.buildings.some(b=>b.id===w.pen&&b.team===t.team&&b.type==='pen'&&g.finished(b)),animal=g.state.wildlife.find(a=>a.id===w.animal&&a.hp>0)||g.state.livestock?.find(a=>a.id===w.animal&&a.hp>0);
 if(u.hp>0&&u.team===t.team&&!u.prisoner&&u.enslavedFrom===undefined&&pen&&animal)continue;
 finishDomesticationTrial(g,u,'abandoned');delete u.tamingWork;delete u.goatSearchPen;g.workBoard.reset();if(u.hp>0){u.order='return';u.recalled=true;u.workReason='Taming attempt ended; actual carried supplies return home';}
}}
/** Own outcomes only. No hidden locations, individual temperament or unresolved odds/rolls. */
export function domesticationReport(g:Game,team=0){const h=g.state.tribes.find(t=>t.id===team)?.domestication;return{paidAttempts:h?.paidAttempts||0,baitSpent:h?.baitSpent||0,woodSpent:h?.woodSpent||0,successes:h?.successes||0,refusals:h?.refusals||0,abandoned:h?.abandoned||0,arrivals:h?.arrivals||0,recent:(h?.recent||[]).map(r=>({...r}))};}
const object=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const shape=(v:any,keys:string[])=>object(v)&&Object.keys(v).every(k=>keys.includes(k));
const finite=(v:any,lo=0,hi=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const integer=(v:any,lo:number=0,hi:number=R.maximumCounter)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
export function validDomesticationState(s:GameState){
 for(const a of [...s.wildlife,...s.livestock||[],...s.units.flatMap(u=>u.packAnimal?[u.packAnimal]:[])]){const m=a.domestication;if(m===undefined)continue;if(!a.species||!species(a.species)||!shape(m,['version','temperament','attempts','familiarity','cooldownUntil','recent'])||m.version!==1||!finite(m.temperament,0,1)||m.temperament!==sample(s.seed,a.id,0)||!integer(m.attempts,1)||!finite(m.familiarity,0,R.maximumFamiliarity)||!finite(m.cooldownUntil,0,s.time+R.cooldownSeconds+1e-6))return false;if(!Array.isArray(m.recent)||m.recent.length>R.maximumAnimalHistory)return false;let previous=0;for(const r of m.recent){if(!shape(r,['attempt','handlerId','at','outcome'])||!integer(r.attempt,1,m.attempts)||r.attempt<=previous||!integer(r.handlerId,1,s.nextId-1)||!finite(r.at,0,s.time)||!['success','refused','abandoned'].includes(r.outcome))return false;previous=r.attempt;}}
 const claims=new Set<number>(),pending=new Map<number,number>();
 for(const u of s.units){const p=u.domesticationPractice;if(p!==undefined&&(!shape(p,['version','handlingSeconds','completed','successes','refusals'])||p.version!==1||!finite(p.handlingSeconds,0,R.maximumHandlingSeconds)||!integer(p.completed)||!integer(p.successes)||!integer(p.refusals)||p.completed!==p.successes+p.refusals))return false;
  const w=u.tamingWork,t=w?.trial;if(t===undefined)continue;if(!w||!shape(t,['version','purpose','team','paidWood','species','attempt','paidFood','startedAt','chance','roll','handlingSeconds','resolved'])||t.version!==1||!['pen','pack'].includes(t.purpose)||!s.tribes.some(v=>v.id===t.team)||t.purpose==='pack'&&(w.pen!==undefined||t.species!=='goat')||t.purpose==='pen'&&w.pen===undefined||!species(t.species)||!integer(t.attempt,1)||t.paidFood!==(t.purpose==='pack'?10:herdRules(t.species).tamingFood)||t.paidWood!==(t.purpose==='pack'?2:0)||!finite(t.startedAt,0,s.time)||!finite(t.chance,R.minimumChance,R.maximumChance)||t.roll!==sample(s.seed,w.animal,t.attempt)||!finite(t.handlingSeconds,0,(t.purpose==='pack'?60:herdRules(t.species).tamingSeconds)+1e-6)||t.handlingSeconds>w.progress+1e-6||t.resolved!==undefined&&t.resolved!=='success'||claims.has(w.animal))return false;
  if(!t.resolved)pending.set(t.team,(pending.get(t.team)||0)+1);
  claims.add(w.animal);const a=s.wildlife.find(a=>a.id===w.animal)||s.livestock?.find(a=>a.id===w.animal);if(a&&(!a.domestication||a.domestication.attempts!==t.attempt||a.species!==t.species))return false;
  if(t.resolved==='success'&&(t.roll>=t.chance||t.purpose!=='pen'||!s.livestock?.some(a=>a.id===w.animal)))return false;
 }
 for(const tribe of s.tribes){const h=tribe.domestication;if(h===undefined)continue;if(!shape(h,['version','paidAttempts','baitSpent','woodSpent','successes','refusals','abandoned','arrivals','recent'])||h.version!==1||!['paidAttempts','successes','refusals','abandoned','arrivals'].every(k=>integer((h as any)[k]))||!finite(h.baitSpent,0,R.maximumCounter*18)||!finite(h.woodSpent,0,h.paidAttempts*2)||h.successes+h.refusals+h.abandoned+(pending.get(tribe.id)||0)>h.paidAttempts||h.baitSpent<h.paidAttempts*6||h.baitSpent>h.paidAttempts*18||h.arrivals>h.successes||!Array.isArray(h.recent)||h.recent.length>R.maximumHistory)return false;
  let last=0;for(const r of h.recent){if(!shape(r,['purpose','paidWood','animalId','handlerId','species','attempt','paidFood','at','outcome'])||!['pen','pack'].includes(r.purpose)||r.purpose==='pack'&&r.species!=='goat'||r.paidWood!==(r.purpose==='pack'?2:0)||!integer(r.animalId,1,s.nextId-1)||!integer(r.handlerId,1,s.nextId-1)||!species(r.species)||!integer(r.attempt,1)||r.paidFood!==(r.purpose==='pack'?10:herdRules(r.species).tamingFood)||!finite(r.at,last,s.time)||!['success','refused','abandoned'].includes(r.outcome))return false;last=r.at;}
 }for(const team of pending.keys())if(!s.tribes.find(t=>t.id===team)?.domestication)return false;return true;
}
