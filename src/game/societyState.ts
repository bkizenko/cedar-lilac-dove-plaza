/** Optional save field `rulers.decisions` for the society decision layer (worldOptions.rulersVersion===2). Old saves have none: every reader goes
 * through validDecisionState(). Everything is bounded so a long game cannot grow the save without limit. Types only plus validators. */
import {KINDS,type Kind,type Plan} from './societyDecisions';
import {validDirector,type Director} from './strategicDirector';
import {validIntel,type IntelRecord} from './societyIntel';
import {validBreakaway,type Breakaway} from './breakaways';
import {validAgreement,validHistory,HISTORY_CAP,type Agreement,type HistoryEntry} from './succession';

export type Outcome={plans:number;completed:number;abandoned:number;expired:number;interrupted:number;switched:number;raids:number;settles:number;pacts:number;held:Record<Kind,number>};
export type LastDecision={t:number;kind:Kind;change:string;why:string[];alternatives:{kind:Kind;score:number;feasible:boolean;blocked?:string;reasons:string[];target?:number}[]};
export type DecisionState={version:1;nextId:number;reviewAt:Record<string,number>;plans:Record<string,Plan>;director:Record<string,Director>;last:Record<string,LastDecision>;
 intel:IntelRecord[];agreements:Agreement[];history:Record<string,HistoryEntry[]>;outcomes:Record<string,Outcome>;breakaways:Breakaway[];lastRuler?:Record<string,string>};
export const DECISION_LIMITS={intel:64,agreements:64,breakaways:32,history:HISTORY_CAP} as const;
export const emptyOutcome=():Outcome=>({plans:0,completed:0,abandoned:0,expired:0,interrupted:0,switched:0,raids:0,settles:0,pacts:0,held:Object.fromEntries(KINDS.map(k=>[k,0])) as Record<Kind,number>});
export const emptyDecisions=():DecisionState=>({version:1,nextId:1,reviewAt:{},plans:{},director:{},last:{},intel:[],agreements:[],history:{},outcomes:{},breakaways:[]});
const num=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const rec=(o:unknown)=>!!o&&typeof o==='object'&&!Array.isArray(o);
function validPlan(p:unknown):p is Plan{
 const x=p as Plan;return !!x&&Number.isInteger(x.id)&&(KINDS as readonly string[]).includes(x.kind)&&num(x.since)&&num(x.until)&&x.until>=x.since&&!!x.reserve&&num(x.reserve.food)&&num(x.reserve.wood)&&num(x.reserve.stone)&&num(x.people)&&Number.isFinite(x.score)&&Array.isArray(x.reasons)&&(x.target===undefined||Number.isInteger(x.target));
}
export function validDecisionState(x:unknown):x is DecisionState{
 const s=x as DecisionState;if(!s||s.version!==1||!Number.isInteger(s.nextId)||s.nextId<1)return false;
 if(!rec(s.reviewAt)||!rec(s.plans)||!rec(s.director)||!rec(s.last)||!rec(s.history)||!rec(s.outcomes))return false;
 if(Object.values(s.reviewAt).some(v=>!num(v)))return false;
 if(Object.values(s.plans).some(p=>!validPlan(p)))return false;
 if(Object.values(s.director).some(d=>!validDirector(d)))return false;
 if(Object.values(s.last).some(l=>!l||!num(l.t)||!(KINDS as readonly string[]).includes(l.kind)||!Array.isArray(l.why)||!Array.isArray(l.alternatives)||l.alternatives.length>KINDS.length))return false;
 if(!Array.isArray(s.intel)||s.intel.length>DECISION_LIMITS.intel||s.intel.some(r=>!validIntel(r)))return false;
 if(!Array.isArray(s.agreements)||s.agreements.length>DECISION_LIMITS.agreements||s.agreements.some(a=>!validAgreement(a)))return false;
 if(!Array.isArray(s.breakaways)||s.breakaways.length>DECISION_LIMITS.breakaways||s.breakaways.some(b=>!validBreakaway(b)))return false;
 for(const h of Object.values(s.history))if(!Array.isArray(h)||h.length>DECISION_LIMITS.history||h.some(e=>!validHistory(e)))return false;
 for(const o of Object.values(s.outcomes))if(!o||![o.plans,o.completed,o.abandoned,o.expired,o.interrupted,o.switched,o.raids,o.settles,o.pacts].every(num)||!rec(o.held))return false;
 if(s.lastRuler!==undefined&&!rec(s.lastRuler))return false;
 return true;
}
