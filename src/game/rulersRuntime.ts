/** Runtime glue for the rulers lane. One call from Game.step. Off unless worldOptions.rulersVersion===1 (set for new games).
 * Old saves have no `rulers` field and no option: nothing happens. Pure state in/out lives in rulersState.ts. */
import type {Game} from './sim';
import {initRulers,stepRulersYear,rulersOf,type RulersState} from './rulersState';
import {familyStage,familyFeatures,kinshipEffectScale} from './familyScale';
import {marry} from './dynasty';
import {effects,apply,noTies,type Ties,type Effect} from './ties';
import {nudgeSocietyRelation,societyRelation} from './societyRelations';

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

const tieKey=(a:number,b:number)=>a<b?`${a}|${b}`:`${b}|${a}`;
export const tiesBetween=(g:Game,a:number,b:number):Ties=>rulersOf(st(g))?.ties?.[tieKey(a,b)]??noTies();
const freeAdult=(d:import('./dynasty').Dynasty)=>Object.values(d.people).filter(p=>p.alive&&!p.spouse&&p.age>=16).sort((x,y)=>(y.id===d.rulerId?1:0)-(x.id===d.rulerId?1:0)||y.claimStrength-x.claimStrength)[0];
/** Marriage between two societies' ruling houses. Both must be able to exchange spouses at their scale. Applies the signed
 * effects (scaled by the smaller society) to the tie ledger and the directed trust/grievance. Returns the cause chain, or null. */
export function marryHouses(g:Game,a:number,b:number):{why:string[];bond:number}|null{
 const r=ensureRulers(g);if(!r||a===b)return null;
 const sa=r.societies[String(a)],sb=r.societies[String(b)];if(!sa||!sb)return null;
 const pa=livingPeople(g,a),pb=livingPeople(g,b);
 if(!familyFeatures(sa.civ.polity.tier,pa).marriageExchange||!familyFeatures(sb.civ.polity.tier,pb).marriageExchange)return null;
 const x=freeAdult(sa.dynasty),y=freeAdult(sb.dynasty);if(!x||!y)return null;
 const wed=marry(sa.dynasty,x.id,sb.dynasty,y.id);if(!wed)return null;
 const atWar=societyRelation(g,a,b).hostile;
 const es:Effect[]=effects('marriage',{rankGap:Math.sign(pa-pb)*Math.min(1,Math.abs(pa-pb)/Math.max(pa,pb,1)),sameFaith:sa.civ.faith.id===sb.civ.faith.id,culturalGap:sa.civ.silhouette===sb.civ.silhouette?0:.5,aRulerHonor:sa.civ.ruler.traits.honor,bRulerHonor:sb.civ.ruler.traits.honor,atWar});
 const k=Math.min(kinshipEffectScale(pa),kinshipEffectScale(pb)),scaled=es.map(e=>({...e,delta:e.delta*k}));
 const key=tieKey(a,b),next=apply(r.ties?.[key]??noTies(),scaled);
 st(g).rulers={...r,societies:{...r.societies,[String(a)]:{...sa,dynasty:wed[0]},[String(b)]:{...sb,dynasty:wed[1]}},ties:{...(r.ties??{}),[key]:next}};
 const sum=(l:keyof Ties)=>scaled.filter(e=>e.ledger===l).reduce((t,e)=>t+e.delta,0)/100;
 for(const [f,t] of [[a,b],[b,a]]){nudgeSocietyRelation(g,f,t,{trust:sum('trust'),grievance:sum('grievance')});}
 return {why:es.map(e=>e.why),bond:next.bond};
}
