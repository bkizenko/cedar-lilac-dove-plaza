/** Runtime glue for the rulers lane. One call from Game.step. Off unless worldOptions.rulersVersion===1 (set for new games).
 * Old saves have no `rulers` field and no option: nothing happens. Pure state in/out lives in rulersState.ts. */
import type {Game} from './sim';
import {initRulers,stepRulersYear,rulersOf,type RulersState} from './rulersState';
import {familyStage} from './familyScale';

/** Compressed clock: one dynastic year per this many sim seconds (an 80-year life is about two hours of play). */
export const RULERS_YEAR_SECONDS=90;
type S={rulers?:RulersState;worldOptions?:{rulersVersion?:1};time:number;seed:number;tribes:unknown[];units:{team:number;hp:number}[]};
const st=(g:Game)=>g.state as unknown as S;
export const rulersEnabled=(g:Game)=>st(g).worldOptions?.rulersVersion===1;
export function livingPeople(g:Game,team:number){let n=0;for(const u of st(g).units)if(u.team===team&&u.hp>0)n++;return n;}
export function ensureRulers(g:Game):RulersState|null{
 if(!rulersEnabled(g))return null;const s=st(g);
 if(!s.rulers)s.rulers=initRulers(s.seed,s.tribes.map((_,i)=>String(i)));
 return s.rulers;
}
/** Advance whole dynastic years that have elapsed. Cheap: one comparison per call. */
export function advanceRulers(g:Game){
 const r=ensureRulers(g);if(!r)return;const s=st(g),target=Math.floor(s.time/RULERS_YEAR_SECONDS);
 let guard=0;
 while(r.year<target&&guard++<4){s.rulers=stepRulersYear(s.rulers!,()=>.3,id=>livingPeople(g,Number(id)));}
 if(s.rulers&&s.rulers.year<target)s.rulers={...s.rulers,year:target};
}
/** Read-only view for UI: ruling house of a society with its stage (household..dynasty). */
export function rulerOf(g:Game,team:number){
 const r=rulersOf(st(g));if(!r)return null;const sr=r.societies[String(team)];if(!sr)return null;
 const person=sr.dynasty.people[sr.dynasty.rulerId];
 return person?{name:person.name,age:person.age,ruler:person.ruler,house:sr.dynasty.house,stage:familyStage(livingPeople(g,team)),generation:sr.dynasty.generation,civ:sr.civ,ledger:sr.ledger}:null;
}
