import type {Game} from './sim';
import type {Building,GameState,Livestock,Unit} from './types';
import {penHousingCapacity,insidePen,penCareDemand} from './penGeometry';
import {supplyApproach,supplyReached} from './campAnchor';
import {herdRules} from './animalSpecies';
export const PEN_WATER_RULES={litersPerAnimalSecond:.006,litersPerHousingPlace:6,minimumCapacityLiters:12,loadLiters:12,refillBelowSeconds:120,thirstGraceSeconds:180,thirstFatalExposureSeconds:1800,recoverySecondsPerSecond:3,productiveThirstSeconds:30}as const;
export type PenWater={ownerTeam:number;initialLiters:0;liters:number;deliveredLiters:number;consumedLiters:number;lostLiters:number};
export const penWaterCapacity=(b:Pick<Building,'w'|'d'>)=>Math.max(PEN_WATER_RULES.minimumCapacityLiters,penHousingCapacity(b)*PEN_WATER_RULES.litersPerHousingPlace);
export function penWaterState(b:Building):PenWater{const p=b.penWater??={ownerTeam:b.team,initialLiters:0,liters:0,deliveredLiters:0,consumedLiters:0,lostLiters:0};if(p.liters===0)p.ownerTeam=b.team;return p;}
export function herdWaterDemand(g:Game,team:number){if(g.state.survivalVersion!==1||!g.state.livestock?.length)return 0;const pens=new Set(g.state.buildings.filter(b=>b.team===team&&b.type==='pen'&&g.finished(b)).map(b=>b.id));return penCareDemand(g.state.livestock.filter(a=>a.team===team&&a.hp>0&&a.ledBy===undefined&&pens.has(a.pen)))*PEN_WATER_RULES.litersPerAnimalSecond;}
export function penWaterReport(g:Game,b:Building){const herd=(g.state.livestock??[]).filter(a=>a.pen===b.id&&a.hp>0&&a.ledBy===undefined),demand=penCareDemand(herd)*PEN_WATER_RULES.litersPerAnimalSecond,liters=b.penWater?.liters??0;return{enabled:g.state.survivalVersion===1,liters,capacity:penWaterCapacity(b),demand,seconds:demand?liters/demand:Infinity,thirsty:herd.filter(a=>(a.thirstSeconds??0)>0).length,inTransit:g.state.units.filter(u=>u.hp>0&&u.husbandryWork?.pen===b.id).reduce((n,u)=>n+(u.husbandryWork?.waterLiters??0),0)};}
export function herdWaterAccounting(g:Game,team=0){const s=g.tribe(team)?.survival,withdrawn=s?.waterHerdWithdrawnLiters??0,returned=s?.waterHerdReturnedLiters??0,consumed=s?.waterHerdConsumedLiters??0,lost=s?.waterHerdLostLiters??0,transferredIn=s?.waterHerdTransferredInLiters??0,transferredOut=s?.waterHerdTransferredOutLiters??0,stored=g.state.buildings.filter(b=>b.team===team).reduce((n,b)=>n+(b.penWater?.liters??0),0),carried=g.state.units.filter(u=>u.team===team).reduce((n,u)=>n+(u.husbandryWork?.waterLiters??0),0);return{withdrawn,returned,consumed,lost,transferredIn,transferredOut,stored,carried,communalNetTransferLiters:returned-withdrawn,balanceErrorLiters:withdrawn+transferredIn-returned-consumed-lost-transferredOut-stored-carried};}

const keys=['waterHerdWithdrawnLiters','waterHerdReturnedLiters','waterHerdConsumedLiters','waterHerdLostLiters','waterHerdTransferredInLiters','waterHerdTransferredOutLiters']as const;
function metric(g:Game,team:number,key:typeof keys[number],liters:number){const s=g.tribe(team)?.survival;if(s)s[key]=(s[key]??0)+liters;}
const contexts=new WeakMap<Game,{state:GameState;pens:Set<Building>;loads:Map<Unit,{work:NonNullable<Unit['husbandryWork']>;team:number}>}>();
function context(g:Game){let c=contexts.get(g);if(!c||c.state!==g.state){c={state:g.state,pens:new Set(g.state.buildings.filter(b=>(b.penWater?.liters??0)>0)),loads:new Map(g.state.units.filter(u=>(u.husbandryWork?.waterLiters??0)>0).map(u=>[u,{work:u.husbandryWork!,team:u.husbandryWork!.waterTeam??u.team}]))};contexts.set(g,c);}return c;}
/** Reconcile before the herd early-return, while dead actors still exist.
 * Retained references also account a removed actor/site without refunding it. */
export function reconcilePenWater(g:Game){if(g.state.survivalVersion!==1)return;const c=context(g);if(!c.loads.size&&!c.pens.size)return;const people=c.loads.size?new Set(g.state.units):null,buildings=c.pens.size?new Set(g.state.buildings):null;
 for(const [u,load]of c.loads){const w=load.work;if(w.waterLiters&&(!people?.has(u)||u.hp<=0||u.husbandryWork!==w||u.team!==load.team)){metric(g,load.team,'waterHerdLostLiters',w.waterLiters);w.waterLiters=0;delete w.waterTeam;if(u.team!==load.team&&u.husbandryWork===w)u.husbandryWork=undefined;}if(!w.waterLiters)c.loads.delete(u);}
 for(const b of c.pens){const p=b.penWater;if(p&&p.ownerTeam!==b.team){metric(g,p.ownerTeam,'waterHerdTransferredOutLiters',p.liters);metric(g,b.team,'waterHerdTransferredInLiters',p.liters);p.ownerTeam=b.team;}if(p&&p.liters>0&&(!buildings?.has(b)||b.hp<=0)){metric(g,b.team,'waterHerdLostLiters',p.liters);p.lostLiters+=p.liters;p.liters=0;}if(!buildings?.has(b)||!p?.liters)c.pens.delete(b);}
}
export function drinkPenWater(g:Game,b:Building,a:Livestock,dt:number){if(g.state.survivalVersion!==1)return true;const p=penWaterState(b),need=PEN_WATER_RULES.litersPerAnimalSecond*herdRules(a.species).careMultiplier*dt,used=a.ledBy===undefined&&insidePen(b,a.x,a.z)?Math.min(need,p.liters):0;p.liters-=used;p.consumedLiters+=used;metric(g,b.team,'waterHerdConsumedLiters',used);if(p.liters>0)context(g).pens.add(b);
 const fraction=need>0?used/need:1,before=a.thirstSeconds??0;a.thirstSeconds=Math.max(0,before+dt*(fraction<1?1-fraction:-PEN_WATER_RULES.recoverySecondsPerSecond));
 const exposure=Math.max(0,a.thirstSeconds-PEN_WATER_RULES.thirstGraceSeconds)-Math.max(0,before-PEN_WATER_RULES.thirstGraceSeconds);if(exposure>0)a.hp=Math.max(0,a.hp-exposure*a.maxHp/PEN_WATER_RULES.thirstFatalExposureSeconds);
 return fraction>=1-1e-8&&a.thirstSeconds<PEN_WATER_RULES.productiveThirstSeconds;
}
export function penNeedsWater(g:Game,b:Building){const r=penWaterReport(g,b);return r.enabled&&r.demand>0&&r.liters+r.inTransit<Math.min(r.capacity,r.demand*PEN_WATER_RULES.refillBelowSeconds);}
/** Water remains in saved husbandry work until a physical entrance delivery. */
export function penWaterWorkAI(g:Game,u:Unit,dt:number){const w=u.husbandryWork;if(g.state.survivalVersion!==1||!w)return false;
 if(w.waterTeam!==undefined&&w.waterTeam!==u.team)return false;
 const pen=g.state.buildings.find(b=>b.id===w.pen&&b.team===u.team&&b.type==='pen'&&g.finished(b));
 if((w.waterLiters??0)>0&&!pen){w.phase='waterReturn';w.releaseAfterWater=true;}
 if(!['waterFetch','waterDeliver','waterReturn'].includes(w.phase))return false;
 if(w.paused||u.order!=='hold'||u.emergency)return false;
 const returning=w.phase==='waterReturn',drop=w.phase==='waterDeliver'?pen:g.nearestDrop(u.x,u.z,u.team);
 if(!drop){u.workReason='Carried herd water waits for a reachable store';return true;}const spot=supplyApproach(g,u,drop);
 if(!spot){u.workReason='No clear entrance for the herd water load';return true;}u.tx=spot.x;u.tz=spot.z;
 if(!supplyReached(g,u,drop,spot)){g.steer(u,dt);u.workReason=w.phase==='waterFetch'?'Walking to collect herd drinking water':returning?'Returning unused herd water to stores':'Carrying drinking water to the pen';return true;}
 const stock=g.tribe(u.team).survival;if(!stock){u.workReason='Communal drinking water is unavailable';return true;}
 if(w.phase==='waterFetch'){
  if(!pen){w.phase='pen';return true;}const p=penWaterState(pen),r=penWaterReport(g,pen),room=Math.max(0,r.capacity-p.liters-r.inTransit),n=Math.min(PEN_WATER_RULES.loadLiters,room,stock.waterLiters);
  if(n<=0){u.workReason=stock.waterLiters<=0?'No communal water for the herd — collect freshwater': 'Another keeper already carries the needed water';if(room<=0)w.phase='pen';return true;}
  stock.waterLiters-=n;metric(g,u.team,'waterHerdWithdrawnLiters',n);w.waterLiters=n;w.waterTeam=u.team;w.phase='waterDeliver';context(g).loads.set(u,{work:w,team:u.team});context(g).pens.add(pen);return true;
 }
 if(returning){const n=w.waterLiters??0;stock.waterLiters+=n;metric(g,u.team,'waterHerdReturnedLiters',n);w.waterLiters=0;delete w.waterTeam;if(w.releaseAfterWater||!pen){u.husbandryWork=undefined;u.order='idle';g.workBoard.reset();}else w.phase='pen';return true;}
 if(pen){const p=penWaterState(pen),n=Math.min(w.waterLiters??0,Math.max(0,penWaterCapacity(pen)-p.liters));p.liters+=n;p.deliveredLiters+=n;context(g).pens.add(pen);w.waterLiters=Math.max(0,(w.waterLiters??0)-n);w.phase=w.waterLiters>1e-8?'waterReturn':'pen';if(!w.waterLiters)delete w.waterTeam;}return true;
}
/** An accepted intact surrender keeps the same water parcel with its resident.
 * Violent capture still uses the loss path in reconcilePenWater. */
export function adoptHerdWaterLoad(g:Game,u:Unit){const w=u.husbandryWork,origin=w?.waterTeam;if(!w||origin===undefined||origin===u.team||!(w.waterLiters!>0))return;metric(g,origin,'waterHerdTransferredOutLiters',w.waterLiters!);metric(g,u.team,'waterHerdTransferredInLiters',w.waterLiters!);w.waterTeam=u.team;context(g).loads.set(u,{work:w,team:u.team});}
export function releaseHusbandryKeeper(g:Game,u:Unit){g.interruptMission(u);const w=u.husbandryWork;if(w&&(w.waterLiters??0)>0){w.phase='waterReturn';w.releaseAfterWater=true;w.paused=false;u.order='hold';u.node=null;u.workReason='Returning the real herd water load before leaving care';}else{u.husbandryWork=undefined;u.order=u.carry>0?'return':'idle';}g.workBoard.reset();}
export function validPenWaterState(s:GameState){const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e12;const totals=new Map<number,number>();
 for(const b of s.buildings)if(b.penWater!==undefined){const p=b.penWater;if(b.type!=='pen'||!p||typeof p!=='object'||!Number.isSafeInteger(p.ownerTeam)||p.ownerTeam<0||p.ownerTeam>=s.tribes.length||p.liters>0&&p.ownerTeam!==b.team||p.initialLiters!==0||!['liters','deliveredLiters','consumedLiters','lostLiters'].every(k=>finite(p[k as keyof PenWater]))||p.liters>penWaterCapacity(b)+1e-7||Math.abs(p.deliveredLiters-p.consumedLiters-p.lostLiters-p.liters)>1e-7*Math.max(1,p.deliveredLiters))return false;totals.set(b.team,(totals.get(b.team)??0)+p.liters);}
 for(const a of s.livestock??[])if(a.thirstSeconds!==undefined&&!finite(a.thirstSeconds))return false;
 for(const u of s.units){const w=u.husbandryWork;if(!w)continue;if(w.releaseAfterWater!==undefined&&w.releaseAfterWater!==true||w.waterLiters!==undefined&&(!finite(w.waterLiters)||w.waterLiters>PEN_WATER_RULES.loadLiters+1e-7))return false;if(w.waterTeam!==undefined&&(!Number.isSafeInteger(w.waterTeam)||w.waterTeam<0||w.waterTeam>=s.tribes.length))return false;if((w.waterLiters??0)>0&&(w.waterTeam!==u.team||!['waterDeliver','waterReturn'].includes(w.phase)))return false;totals.set(u.team,(totals.get(u.team)??0)+(w.waterLiters??0));}
 for(const t of s.tribes){const p=t.survival;if(!p){if(totals.get(t.id))return false;continue;}if(keys.some(k=>p[k]!==undefined&&!finite(p[k])))return false;const held=(p.waterHerdWithdrawnLiters??0)+(p.waterHerdTransferredInLiters??0)-(p.waterHerdTransferredOutLiters??0)-(p.waterHerdReturnedLiters??0)-(p.waterHerdConsumedLiters??0)-(p.waterHerdLostLiters??0);if(Math.abs(held-(totals.get(t.id)??0))>1e-7*Math.max(1,p.waterHerdWithdrawnLiters??0))return false;}
 return true;
}
