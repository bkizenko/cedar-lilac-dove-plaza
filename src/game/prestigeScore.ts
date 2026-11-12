/** Pure evidence scoring. Gameplay weights/units, not historical measurements.
 * No Game access, caches, stock queries, discovery updates or saved migrations. */
export const PRESTIGE_COMPONENTS=['usableArea','resourcesAndChokepoints','healthyPopulation','foodSecurity','demonstratedPractices','usefulTrade','defendedWarAims','civicWorks'] as const;
export type PrestigeComponent=typeof PRESTIGE_COMPONENTS[number];
export const PRESTIGE_SCORE_RULES={version:1,components:{
 usableArea:{cap:100,half:10000,unit:'dry useful square metres'},
 resourcesAndChokepoints:{cap:100,half:30,unit:'cached land-value points'},
 healthyPopulation:{cap:200,half:50,unit:'healthy resident equivalents'},
 foodSecurity:{cap:120,half:2,unit:'days of actual edible reserve'},
 demonstratedPractices:{cap:140,half:12,unit:'distinct demonstrated methods'},
 usefulTrade:{cap:100,half:10,unit:'distinct paid and delivered offers'},
 defendedWarAims:{cap:120,half:3,unit:'documented defended aims'},
 civicWorks:{cap:120,half:50,unit:'condition-weighted civic points'},
}} as const;
export type PrestigeFacts={usableArea:number;resourcesAndChokepoints:number;healthyPopulation:number;foodSecurity:number;demonstratedPractices:readonly string[];usefulTrade:number;defendedWarAims?:number;civicWorks:number};
export type PrestigeScoreRow={component:PrestigeComponent;value:number;points:number;cap:number;available:boolean};
export type PrestigeScore={version:1;total:number;components:PrestigeScoreRow[]};
const finite=(n:number)=>Number.isFinite(n)&&n>0?Math.min(n,1e15):0;
/** The ratio form avoids overflow; finite goods never buy the entire cap. */
export function prestigeCurve(value:number,cap:number,half:number){const x=finite(value);return x&&Number.isFinite(cap)&&cap>0&&Number.isFinite(half)&&half>0?cap/(1+half/x):0;}
export function scorePrestige(facts:PrestigeFacts):PrestigeScore{
 const components=PRESTIGE_COMPONENTS.map(component=>{
  const rule=PRESTIGE_SCORE_RULES.components[component],available=component!=='defendedWarAims'||facts.defendedWarAims!==undefined;
  const value=component==='demonstratedPractices'?new Set(facts.demonstratedPractices.filter(id=>typeof id==='string'&&id.trim().length>0)).size:finite(facts[component]??0);
  return{component,value,points:available?prestigeCurve(value,rule.cap,rule.half):0,cap:rule.cap,available};
 });
 return{version:1,total:components.reduce((n,row)=>n+row.points,0),components};
}
/** A completed trade is one offer, not a payment flag plus another delivery point.
 * Receipts are already physical native events; offers lost/refunded only do not count.
 * Caller supplies the society's authorized receipt history, never hidden rival stocks. */
export function usefulTradeCount(receipts:readonly {id:number;offerId:number;stage:string;team:number;amount:number}[],team:number){
 const seen=new Set<number>(),paid=new Set<number>(),delivered=new Set<number>();
 for(const r of receipts){if(seen.has(r.id)||!Number.isSafeInteger(r.id)||r.id<1||!Number.isSafeInteger(r.offerId)||r.offerId<1||!Number.isFinite(r.amount)||r.amount<=0)continue;seen.add(r.id);
  if(r.stage==='paid')paid.add(r.offerId);if(r.stage==='delivered'&&r.team===team)delivered.add(r.offerId);
 }
 return[...delivered].filter(id=>paid.has(id)).length;
}
export type PrestigeObservation={observer:number;subject:number;observedAt:number;components:Partial<Record<PrestigeComponent,number>>};
export type PrestigeView={version:1;subject:number;knowledge:'own'|'observed'|'unknown';observedAt:number|null;total:number|null;knownSubtotal:number;components:{component:PrestigeComponent;points:number|null;available:boolean}[]};
/** Rival view never accepts full authority facts. An explicit dated observation
 * is the entire permitted input; partial components cannot manufacture a total. */
export function observedPrestigeView(viewer:number,subject:number,now:number,observations:readonly PrestigeObservation[]):PrestigeView{
 const observation=Number.isFinite(now)?observations.filter(o=>o.observer===viewer&&o.subject===subject&&Number.isFinite(o.observedAt)&&o.observedAt>=0&&o.observedAt<=now).reduce<PrestigeObservation|undefined>((last,o)=>!last||o.observedAt>last.observedAt?o:last,undefined):undefined;
 const components=PRESTIGE_COMPONENTS.map(component=>{const value=observation?.components[component],available=typeof value==='number'&&Number.isFinite(value)&&value>=0,rule=PRESTIGE_SCORE_RULES.components[component];return{component,points:available?prestigeCurve(value,rule.cap,rule.half):null,available};});
 return{version:1,subject,knowledge:observation?'observed':'unknown',observedAt:observation?.observedAt??null,total:null,knownSubtotal:components.reduce((n,row)=>n+(row.points??0),0),components};
}
export function ownPrestigeView(subject:number,facts:PrestigeFacts):PrestigeView{const score=scorePrestige(facts);return{version:1,subject,knowledge:'own',observedAt:null,total:score.total,knownSubtotal:score.total,components:score.components.map(({component,points,available})=>({component,points,available}))};}
