/** Glory ledger: nine independent streams that reward expansion AND other ways to be great.
 * Pure accounting over events. Hooks to the Codex-owned prestige model are by event name only (no import of its state).
 * Diminishing returns per stream (sqrt-ish) so no single stream wins by grinding; breadth earns a bonus. */
import {clamp,round} from './rulerCore';
import {drive,type Ruler,type Ambition} from './rulerGenome';

export const STREAMS=['land','surplus','trade','alliance','military','building','conquest','faith','culture'] as const;
export type Stream=(typeof STREAMS)[number];
export type Ledger=Record<Stream,number>;
export const emptyLedger=():Ledger=>({land:0,surplus:0,trade:0,alliance:0,military:0,building:0,conquest:0,faith:0,culture:0});

/** Raw gain per event kind. Values are intentionally small; accrual is capped per tick by the caller. */
export const EVENT_VALUE:Record<string,[Stream,number]>={
 claimLand:['land',4],settleCity:['land',6],surplusMilestone:['surplus',3],newTradeRoute:['trade',3],tradeVolumeMilestone:['trade',2],
 allianceFormed:['alliance',4],marriageAlliance:['alliance',5],battleWon:['military',3],battleLostSmall:['military',.5],
 buildingComplete:['building',1.5],wonderComplete:['building',12],capitulation:['conquest',8],tributeImposed:['conquest',4],annex:['conquest',10],
 templeFounded:['faith',3],converted:['faith',2],schismWon:['faith',6],artPatronage:['culture',3],scholarHosted:['culture',3],festival:['culture',1],
};
export function award(l:Ledger,event:string,mult=1):Ledger{
 const e=EVENT_VALUE[event];if(!e)return l;
 return {...l,[e[0]]:round(l[e[0]]+e[1]*mult)};
}
/** Display score: sqrt per stream (diminishing returns) plus a breadth bonus for 4+ active streams. */
export function score(l:Ledger):number{
 let s=0,active=0;for(const k of STREAMS){s+=Math.sqrt(Math.max(0,l[k]))*10;if(l[k]>=4)active++;}
 return Math.round(s*(1+Math.max(0,active-3)*.05));
}
const WANT:Record<Ambition,Stream[]>={conquest:['conquest','military','land'],glory:['military','culture','building'],dynasty:['alliance','land'],faith:['faith','culture'],wealth:['trade','surplus'],legacyBuilding:['building','culture'],security:['alliance','surplus'],reform:['culture','surplus'],knowledge:['culture','trade']};
/** How much a ruler personally values each stream (1 = neutral). The player sees this as "what drives them". */
export function appetite(r:Ruler):Record<Stream,number>{
 const a={} as Record<Stream,number>;for(const s of STREAMS)a[s]=1;
 for(const amb of r.ambitions)for(const s of WANT[amb])a[s]+=.6;
 a.conquest+=(r.traits.cruelty-50)/150;a.alliance+=(r.traits.mercy-50)/150;a.faith+=(r.traits.piety-50)/80;a.culture+=(r.traits.innovation-50)/120;
 for(const s of STREAMS)a[s]=round(clamp(a[s],.3,3));
 return a;
}
/** The ruler's weighted utility for an action that yields glory events. Used by AI to choose among candidate actions. */
export function utility(r:Ruler,gains:Partial<Record<Stream,number>>,risk:number):number{
 const ap=appetite(r);let u=0;for(const k of STREAMS)u+=(gains[k]??0)*ap[k];
 const braking=1+(r.traits.prudence-50)/100-(r.traits.boldness-50)/150;
 return round(u*(drive(r.traits)/50)-risk*Math.max(.3,braking));
}
export function validateLedger(l:Ledger):string[]{return STREAMS.filter(k=>!(l[k]>=0&&Number.isFinite(l[k]))).map(k=>`ledger ${k} invalid`);}
