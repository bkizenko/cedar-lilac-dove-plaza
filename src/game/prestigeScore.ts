/** Pure evidence scoring. Gameplay weights/units, not historical measurements.
 * No Game access, caches, stock queries, discovery updates or saved migrations. */
export const PRESTIGE_COMPONENTS=['usableArea','resourcesAndChokepoints','healthyPopulation','foodSecurity','demonstratedPractices','usefulTrade','defendedWarAims','civicWorks'] as const;
export type PrestigeComponent=typeof PRESTIGE_COMPONENTS[number];
export const PRESTIGE_SCORE_RULES={version:1,components:{
 usableArea:{cap:100,half:10000,unit:'dry useful square metres'},
 resourcesAndChokepoints:{cap:100,half:30,unit:'cached land-value points'},
 healthyPopulation:{cap:200,half:50,unit:'healthy resident equivalents'},
 foodSecurity:{cap:120,half:8,unit:'simulation days of actual edible reserve'},
 demonstratedPractices:{cap:140,half:12,unit:'distinct demonstrated methods'},
 usefulTrade:{cap:100,half:10,unit:'distinct paid and delivered offers'},
 defendedWarAims:{cap:120,half:3,unit:'weighted settled war aims'},
 civicWorks:{cap:120,half:50,unit:'condition-weighted civic points'},
}} as const;
export type PrestigeFacts={usableArea?:number;resourcesAndChokepoints?:number;healthyPopulation:number;foodSecurity:number;demonstratedPractices:readonly string[];usefulTrade:number;defendedWarAims?:number;civicWorks:number};
export type PrestigeScoreRow={component:PrestigeComponent;value:number;points:number;cap:number;available:boolean};
export type PrestigeScore={version:1;total:number;components:PrestigeScoreRow[]};
const finite=(n:number)=>Number.isFinite(n)&&n>0?Math.min(n,1e15):0;
/** The ratio form avoids overflow; finite goods never buy the entire cap. */
export function prestigeCurve(value:number,cap:number,half:number){const x=finite(value);return x&&Number.isFinite(cap)&&cap>0&&Number.isFinite(half)&&half>0?cap/(1+half/x):0;}
export function scorePrestige(facts:PrestigeFacts):PrestigeScore{
 const components=PRESTIGE_COMPONENTS.map(component=>{
  const rule=PRESTIGE_SCORE_RULES.components[component],available=facts[component]!==undefined;
  const value=component==='demonstratedPractices'?new Set(facts.demonstratedPractices.filter(id=>typeof id==='string'&&id.trim().length>0)).size:finite(facts[component]??0);
  return{component,value,points:available?prestigeCurve(value,rule.cap,rule.half):0,cap:rule.cap,available};
 });
 return{version:1,total:components.reduce((n,row)=>n+row.points,0),components};
}
/** A completed trade is one offer, not a payment flag plus another delivery point.
 * Receipts are already physical native events; offers lost/refunded only do not count.
 * Caller supplies the society's authorized receipt history, never hidden rival stocks. */
export type PrestigeTradeOffer={id:number;from:number;to:number;get:{kind:string};needAmount?:number};
export type PrestigeTradeReceipt={id:number;offerId:number;stage:string;team:number;amount:number;kind?:string;fairAmount?:number};
export function usefulTradeCount(receipts:readonly PrestigeTradeReceipt[],team:number,offers:readonly PrestigeTradeOffer[]=[]){
 const seen=new Set<number>(),paid=new Set<number>(),delivered=new Set<number>(),byOffer=new Map(offers.map(o=>[o.id,o]));
 for(const r of receipts){
  if(seen.has(r.id)||!Number.isSafeInteger(r.id)||r.id<1||!Number.isSafeInteger(r.offerId)||r.offerId<1||!Number.isFinite(r.amount)||r.amount<=0)continue;seen.add(r.id);
  const offer=byOffer.get(r.offerId);
  // An available native needs quote is evidence, not an extra score source.
  // Never ignore an explicit zero/invalid need or credit the wrong return good.
  if(offer&&(offer.from!==team||offer.needAmount!==undefined&&(!Number.isFinite(offer.needAmount)||offer.needAmount<=0)))continue;
  if(r.stage==='paid'&&r.team!==team&&(!offer||r.team===offer.to))paid.add(r.offerId);
  if(r.stage==='delivered'&&r.team===team&&(!offer||r.kind===offer.get.kind)&&
    (r.fairAmount===undefined||Number.isFinite(r.fairAmount)&&r.fairAmount>0))delivered.add(r.offerId);
 }
 return[...delivered].filter(id=>paid.has(id)).length;
}
/** One cell can contain many physical spans/path samples, but infrastructure
 * prestige values connectivity here once. Resource mass has its separate cap. */
export function prestigeCellInfrastructure(trailWear:number,crossings:number,trailValue:number,crossingValue:number){
 return Math.min(1,finite(trailWear))*finite(trailValue)+Math.min(1,finite(crossings))*finite(crossingValue);
}

export type PrestigeObservation={observer:number;subject:number;observedAt:number;components:Partial<Record<PrestigeComponent,number>>};
export type PrestigeView={version:1;subject:number;knowledge:'own'|'observed'|'unknown';observedAt:number|null;total:number|null;knownSubtotal:number;components:{component:PrestigeComponent;points:number|null;available:boolean;value?:number;cap?:number}[]};
/** Rival view never accepts full authority facts. An explicit dated observation
 * is the entire permitted input; partial components cannot manufacture a total. */
export function observedPrestigeView(viewer:number,subject:number,now:number,observations:readonly PrestigeObservation[]):PrestigeView{
 const observation=Number.isFinite(now)?observations.filter(o=>o.observer===viewer&&o.subject===subject&&Number.isFinite(o.observedAt)&&o.observedAt>=0&&o.observedAt<=now).reduce<PrestigeObservation|undefined>((last,o)=>!last||o.observedAt>last.observedAt?o:last,undefined):undefined;
 const components=PRESTIGE_COMPONENTS.map(component=>{const value=observation?.components[component],available=typeof value==='number'&&Number.isFinite(value)&&value>=0,rule=PRESTIGE_SCORE_RULES.components[component];return{component,points:available?prestigeCurve(value,rule.cap,rule.half):null,available};});
 return{version:1,subject,knowledge:observation?'observed':'unknown',observedAt:observation?.observedAt??null,total:null,knownSubtotal:components.reduce((n,row)=>n+(row.points??0),0),components};
}
export function ownPrestigeView(subject:number,facts:PrestigeFacts):PrestigeView{const score=scorePrestige(facts);return{version:1,subject,knowledge:'own',observedAt:null,total:score.total,knownSubtotal:score.total,components:score.components.map(({component,points,available,value,cap})=>({component,points,available,value,cap}))};}
