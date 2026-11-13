/** Runtime glue for the society decision layer (worldOptions.rulersVersion===2). One call per rival society from rivalTick: observe (dated intel only),
 * measure needs from the society's own stores and sight, set the 30-minute posture, enumerate and score alternatives, keep or change the committed plan,
 * and apply it through the parties that already exist (permits, reserves, military target). Nothing is spawned, handed out or teleported; the only
 * writes to the world are placing a watchtower the society can pay for, a recovery pause, and relation/unrest nudges through the existing ledgers.
 * Old saves (no option, no field) skip every entry point and behave exactly as before. */
import type {Game} from './sim';
import {ensureRulers,livingPeople,expansionOf,expansionInputs,expansionParty,RULERS_YEAR_SECONDS,unrestOf,wearinessOf} from './rulersRuntime';
import {societyRelation,nudgeSocietyRelation,agreeSocietyTruce} from './societyRelations';
import {knownStructures} from './structureKnowledge';
import {reserveSeconds,foodDemand,isDependent} from './settlement';
import {buildingCost} from './construction';
import {lifeEvent} from './communities';
import {BUILDINGS} from './constants';
import {rivalCanInvest} from './rivalDevelopment';
import {clamp01} from './rulerCore';
import {DECISION_RULES,enumerate,decide,planFrom,maySpend,type Needs,type Plan,type TargetView,type Decision} from './societyDecisions';
import {direct,type Director} from './strategicDirector';
import {recordFromSightings,targetView,exposure,type IntelRecord,type Sighting} from './societyIntel';
import {emptyDecisions,emptyOutcome,DECISION_LIMITS,HALL_EVENT_CAP,type DecisionState,type LastDecision,type HallEvent} from './societyState';
import {STAGES,BREAKAWAY_RULES,pressureOf,stageStep,options as breakawayOptions,pickOption,coerceSucceeds,type Breakaway,type SettlementView} from './breakaways';
import {foundSocietyFromBreakaway} from './societyBreakaway';
import {noteDepartures,civicLegitimacy,politicsLoss,outpostGrievance,civicEffects} from './societyCivicRuntime';
import {inherit,inheritGrievance,addHistory,boundTo,kinCloseness,type Agreement,type AgreementKind,type HistoryKind} from './succession';

type S={rulers?:{seed:number;year:number;societies:Record<string,{civ:{polity:{legitimacy:Record<string,number>}};dynasty:import('./dynasty').Dynasty}>;weary?:Record<string,number>;decisions?:DecisionState};worldOptions?:{rulersVersion?:number};time:number;seed:number};
const st=(g:Game)=>g.state as unknown as S;
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export const decisionsEnabled=(g:Game)=>st(g).worldOptions?.rulersVersion===2;
export function ensureDecisions(g:Game):DecisionState|null{
 if(!decisionsEnabled(g))return null;const r=ensureRulers(g);if(!r)return null;
 const x=r as unknown as {decisions?:DecisionState};return x.decisions??(x.decisions=emptyDecisions());
}
const peek=(g:Game)=>decisionsEnabled(g)?st(g).rulers?.decisions:undefined;
export const planOf=(g:Game,team:number):Plan|undefined=>peek(g)?.plans[String(team)];
export const directorOf=(g:Game,team:number):Director|undefined=>peek(g)?.director[String(team)];
export const lastDecisionOf=(g:Game,team:number):LastDecision|undefined=>peek(g)?.last[String(team)];
export const intelOf=(g:Game,observer:number):IntelRecord[]=>(peek(g)?.intel??[]).filter(r=>r.observer===observer);
export const outcomesOf=(g:Game,team:number)=>peek(g)?.outcomes[String(team)];
export const historyOf=(g:Game,team:number)=>peek(g)?.history[String(team)]??[];
export const agreementsOf=(g:Game,team?:number):Agreement[]=>(peek(g)?.agreements??[]).filter(a=>team===undefined||a.a===team||a.b===team);
export const breakawaysOf=(g:Game,team?:number):Breakaway[]=>(peek(g)?.breakaways??[]).filter(b=>team===undefined||b.parent===team);

export function remember(g:Game,team:number,kind:HistoryKind,text:string,withTeam?:number){
 const d=ensureDecisions(g);if(!d)return;const key=String(team);
 d.history[key]=addHistory(d.history[key],{year:st(g).rulers?.year??0,kind,text,...(withTeam!==undefined?{with:withTeam}:{})});
}
const outcome=(d:DecisionState,team:number)=>d.outcomes[String(team)]??(d.outcomes[String(team)]=emptyOutcome());

// ---------- gates the existing parties consult (all return "no opinion" when the layer is off) ----------
/** May this society pay for `type` without eating another commitment's reserve? True when the layer is off. */
export function societyMaySpend(g:Game,team:number,type:string):boolean{
 const plan=planOf(g,team);if(!plan)return true;const t=g.tribe(team);
 const cost=buildingCost(type as import('./types').BldType,g,team);
 return maySpend(plan,{food:t.food,wood:t.wood,stone:t.stone},{food:0,wood:cost.wood||0,stone:cost.stone||0},type);
}
/** Founding parties leave only under a settle plan. Null = layer off (old rules). */
export function settleGate(g:Game,team:number):{allow:boolean;why:string}|null{
 if(!decisionsEnabled(g))return null;const p=planOf(g,team);
 return p?.kind==='settle'?{allow:true,why:'the council has resolved to found a new hearth'}:{allow:false,why:p?`the council's plan is to ${p.kind}, not to settle`:'the council has not yet decided'};
}
/** Raids leave only under a raid plan and only against the planned target. Null = layer off. */
export function raidGate(g:Game,team:number):{allow:boolean;target?:number;why:string}|null{
 if(!decisionsEnabled(g))return null;const p=planOf(g,team);
 return p?.kind==='raid'&&p.target!==undefined?{allow:true,target:p.target,why:'the council has resolved to strike '+p.target}:{allow:false,why:p?`the council's plan is to ${p.kind}, not to raid`:'the council has not yet decided'};
}
/** Multiplier on the housing/expansion roll. 1 when the layer is off. */
export function growthBias(g:Game,team:number):number{
 const p=planOf(g,team);if(!p)return 1;return p.kind==='grow'?1.4:p.kind==='stockpile'||p.kind==='recover'||p.kind==='fortify'?.4:1;
}
/** Extra armed residents a fortify plan or a defend posture asks for (count, added to the military target). 0 when the layer is off. */
export function militaryBonus(g:Game,team:number):number{
 const p=planOf(g,team);if(!p)return 0;const pop=g.popNow(team);
 return (p.kind==='fortify'?Math.ceil(pop*.1)+1:0)+(directorOf(g,team)?.posture==='defend'?1:0);
}
/** Explorers and traders keep working under any plan; a trade plan reviews barter twice as often. */
export const tradeCadenceBias=(g:Game,team:number)=>planOf(g,team)?.kind==='trade'?.5:1;

// ---------- intel: dated reports only ----------
export function observeSociety(g:Game,team:number){
 const d=ensureDecisions(g);if(!d)return;
 for(let j=0;j<g.state.tribes.length;j++){
  if(j===team||j===3||!g.tribe(j))continue;
  const rel=societyRelation(g,team,j),reports=knownStructures(g,team,j);
  const sightings:Sighting[]=reports.map(r=>({id:r.site.id,observedAt:r.observedAt,type:r.site.type,defenders:r.defenders,defensePower:r.defensePower,x:r.site.x,z:r.site.z}));
  const known=rel.known||sightings.length>0;if(!known)continue;
  const at=d.intel.findIndex(r=>r.observer===team&&r.subject===j),prior=at>=0?d.intel[at]:undefined;
  const rec=recordFromSightings(team,j,sightings,rel.lastContactSeconds,prior);
  if(!rec)continue;
  if(at>=0)d.intel[at]=rec;else if(d.intel.length<DECISION_LIMITS.intel)d.intel.push(rec);
 }
}

// ---------- measurement: only what the society could know ----------
const FORTS=['watchtower','barracks','keep'];
const armedReady=(g:Game,u:import('./types').Unit)=>u.hp>=u.maxHp*.6&&(u.militia||!['worker','leader'].includes(u.type))&&u.type!=='leader'&&!isDependent(g,u)&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.prisoner;
export function measureNeeds(g:Game,team:number):Needs|null{
 const d=ensureDecisions(g);if(!d)return null;const t=g.tribe(team),s=g.state,time=s.time,home=g.campOf(team);
 const pop=Math.max(1,livingPeople(g,team)),cap=Math.max(1,g.popCap(team)),mine=s.units.filter(u=>u.team===team&&u.hp>0);
 const foes=s.units.filter(u=>u.hp>0&&u.team!==team&&dist(u,home)<55&&(u.team===3||g.isFoe(team,u.team))).length;
 let hostileKnown=0;const contacts:{lastContact:number;hostile:boolean}[]=[];
 for(let j=0;j<s.tribes.length;j++){if(j===team||j===3||!g.tribe(j))continue;const r=societyRelation(g,team,j);if(r.known){contacts.push({lastContact:r.lastContactSeconds,hostile:r.hostile});if(r.hostile)hostileKnown++;}}
 const armed=mine.filter(u=>armedReady(g,u)).length,forts=s.buildings.filter(b=>b.team===team&&b.hp>0&&FORTS.includes(b.type)&&g.finished(b)).length;
 const target=Math.max(2,Math.ceil(pop*(.12+.14*t.aggro)));
 const defence=clamp01(.7*clamp01(armed/target)+.3*clamp01(forts/2));
 const threat=clamp01(.55*clamp01(foes/4)+.25*(hostileKnown?1:0)+.2*clamp01(t.tension||0));
 const wealth=clamp01(g.tribeFortune(team)/4),ex=expansionInputs(g,team),drv=expansionOf(g,team),raw=expansionParty(g,team,true);
 let planned=0,plannedStone=0;for(const b of s.buildings)if(b.team===team&&b.hp>0&&!b.planPaused){planned+=b.plannedCost?.wood||0;plannedStone+=b.plannedCost?.stone||0;}
 const halls=s.buildings.filter(b=>b.team===team&&b.type==='townhall'&&b.hp>0).length,fs=reserveSeconds(g,team);
 let block:string|undefined;
 if(!raw)block='no expansion drivers';else if(!raw.allow)block='the drivers do not point to a new hearth';
 else if(halls>=5)block='the society already holds five hearths';else if(g.popNow(team)<12)block='too few people to spare a founding party';
 else if(fs<raw.minReserve)block='food reserve is below the founding minimum';else if(t.wood<100)block='not enough timber';
 else if(time-(t.lastSettlement||0)<raw.cooldown)block='the last founding party left too recently';
 const un=unrestOf(g,team);
 const targets:TargetView[]=[];
 for(const r of d.intel.filter(r=>r.observer===team)){
  if(!g.tribe(r.subject)?.alive)continue;
  const rel=societyRelation(g,team,r.subject),allied=d.agreements.some(a=>a.kind==='pact'&&a.status!=='lapsed'&&((a.a===team&&a.b===r.subject)||(a.b===team&&a.a===r.subject)));
  targets.push(targetView(r,time,home,{hostile:rel.hostile,trust:rel.trust,grievance:rel.grievance},allied));
 }
 targets.sort((a,b)=>a.id-b.id);
 return {time,foodSeconds:fs,food:t.food,foodPerSecond:foodDemand(g,team),housing:pop/cap,pop,adults:mine.filter(u=>!isDependent(g,u)).length,wood:t.wood,stone:t.stone,
  wealth,defence,threat,unrest:un?.value??0,weariness:wearinessOf(g,team),recoveryLeft:Math.max(0,(t.recoveryUntil||0)-time),openLand:ex?.openLand??0,climate:ex?.climate??0,aggro:t.aggro,
  exposure:exposure(wealth,contacts,time),expansion:{drive:drv?.drive??0,mode:drv?.mode??'stay',allow:!block,block},readyFighters:armed,targets,reserved:{food:0,wood:planned,stone:plannedStone}};
}

// ---------- plan completion and the review ----------
function completed(g:Game,p:Plan,n:Needs,team:number):boolean{
 const t=g.tribe(team);
 switch(p.kind){
  case 'grow':return g.popCap(team)-g.popNow(team)>=4;
  case 'stockpile':return n.foodSeconds>=1200;
  case 'settle':return (t.lastSettlement||0)>=p.since;
  case 'raid':return (t.lastRaid||0)>0&&(t.recoveryUntil||0)>p.since;
  case 'trade':return false;
  case 'ally':return p.target!==undefined&&agreementsOf(g,team).some(a=>a.kind==='pact'&&a.status!=='lapsed'&&(a.a===p.target||a.b===p.target));
  case 'fortify':return n.defence>=.8;
  case 'recover':return n.recoveryLeft<=0&&n.weariness<30&&n.unrest<35&&n.foodSeconds>=450;
 }
}
const summary=(dec:Decision,time:number):LastDecision=>({t:time,kind:dec.choice.kind,change:dec.change,why:dec.why.slice(0,5),
 alternatives:dec.alternatives.map(a=>({kind:a.kind,score:a.score,feasible:a.feasible,...(a.blocked?{blocked:a.blocked}:{}),reasons:a.reasons,...(a.target!==undefined?{target:a.target}:{})}))});
/** Called by the sim for each rival every tick; acts once per review interval. Returns the decision when one was made. */
export function reviewSociety(g:Game,team:number):Decision|null{
 const d=ensureDecisions(g);if(!d||team===0||team===3||!g.tribe(team)?.alive)return null;
 const key=String(team),time=g.state.time;if((d.reviewAt[key]??0)>time)return null;
 d.reviewAt[key]=time+DECISION_RULES.reviewSeconds*civicEffects(g,team).decisionDelay;
 observeSociety(g,team);
 const n=measureNeeds(g,team);if(!n)return null;
 const o=outcome(d,team),seed=st(g).seed;
 let inc:Plan|undefined=d.plans[key];
 if(inc&&completed(g,inc,n,team)){o.completed++;remember(g,team,'plan',`finished its plan to ${inc.kind}`,inc.target);delete d.plans[key];inc=undefined;}
 const dir=direct(n,seed,team,d.director[key]);
 if(d.director[key]?.posture!==dir.posture)remember(g,team,'plan',`set a ${dir.posture} posture: ${dir.reasons[0]??''}`);
 d.director[key]=dir;
 const dec=decide(enumerate(n,dir.posture),n,inc,seed,team);
 d.last[key]=summary(dec,time);
 if(dec.change==='start'||dec.change==='switch'||dec.change==='interrupt'||dec.change==='expire'||dec.change==='drop'){
  if(dec.dropped){if(dec.change==='interrupt')o.interrupted++;else if(dec.change==='switch')o.switched++;else if(dec.change!=='expire')o.abandoned++;else o.expired++;}
  const plan=planFrom(dec.choice,d.nextId++,time);d.plans[key]=plan;o.plans++;
  if(dec.change==='interrupt'||dec.change==='switch')remember(g,team,'plan',`${dec.change==='interrupt'?'broke off':'changed'} its plan to ${inc?.kind} for ${plan.kind}: ${dec.why[0]}`,plan.target);
  applyOnStart(g,team,plan,n);
 }else if(inc)d.plans[key]={...inc,score:dec.choice.score,reasons:dec.choice.reasons};
 const cur=d.plans[key];if(cur){o.held[cur.kind]=(o.held[cur.kind]||0)+1;applyEachReview(g,team,cur,n);}
 reviewBreakaways(g,team,n);
 return dec;
}
function applyOnStart(g:Game,team:number,p:Plan,n:Needs){
 const t=g.tribe(team);
 if(p.kind==='recover')t.recoveryUntil=Math.max(t.recoveryUntil||0,p.until); // existing flag: stops raid dispatch until the plan ends
 void n;
}
function applyEachReview(g:Game,team:number,p:Plan,n:Needs){
 if(p.kind==='fortify')fortify(g,team);
 if(p.kind==='ally'&&p.target!==undefined)treat(g,team,p.target);
}
/** Fortify: one watchtower the society can pay for, near its hall, when it has none or too few for its numbers. */
function fortify(g:Game,team:number){
 const towers=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.type==='watchtower').length,want=1+Math.floor(g.popNow(team)/24);
 if(towers>=want||!(BUILDINGS as Record<string,unknown>).watchtower)return;
 const hall=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0);if(!hall||!rivalCanInvest(g,team,'watchtower' as import('./types').BldType))return;
 const spot=g.findOpenSpot(hall.x,hall.z,'watchtower' as import('./types').BldType,team);if(spot)g.placeBuilding('watchtower' as import('./types').BldType,spot.x,spot.z,team);
}
/** Treat with a warm neighbour: needs recent real contact (a messenger or route), then trust grows both ways; a pact is signed once both are warm. No goods move. */
function treat(g:Game,team:number,other:number){
 const d=ensureDecisions(g);if(!d||!g.tribe(other)?.alive)return;
 const r=societyRelation(g,team,other),rr=societyRelation(g,other,team);
 if(!r.known||g.state.time-r.lastContactSeconds>DECISION_RULES.contactFreshSeconds||r.hostile||rr.hostile)return;
 nudgeSocietyRelation(g,team,other,{trust:.04,grievance:-.01});nudgeSocietyRelation(g,other,team,{trust:.04,grievance:-.01});
 if(societyRelation(g,team,other).trust>=.5&&societyRelation(g,other,team).trust>=.5)signPact(g,team,other);
}
export function recordAgreement(g:Game,a:number,b:number,kind:AgreementKind,note:string):Agreement|null{
 const d=ensureDecisions(g);if(!d||a===b)return null;
 if(d.agreements.some(x=>x.kind===kind&&x.status!=='lapsed'&&((x.a===a&&x.b===b)||(x.a===b&&x.b===a))&&kind!=='marriage'))return null;
 if(d.agreements.length>=DECISION_LIMITS.agreements){const i=d.agreements.findIndex(x=>x.status==='lapsed');if(i<0)return null;d.agreements.splice(i,1);}
 const ra=st(g).rulers?.societies[String(a)]?.dynasty.rulerId??'',rb=st(g).rulers?.societies[String(b)]?.dynasty.rulerId??'';
 const ag:Agreement={id:d.nextId++,a,b,kind,since:g.state.time,bound:boundTo(kind),signer:`${ra}|${rb}`,status:'standing',note};
 d.agreements.push(ag);remember(g,a,kind==='marriage'?'marriage':'pact',note,b);remember(g,b,kind==='marriage'?'marriage':'pact',note,a);outcome(d,a).pacts++;return ag;
}
function signPact(g:Game,a:number,b:number){
 if(!recordAgreement(g,a,b,'pact',`${g.tribe(a).name} and ${g.tribe(b).name} swore a pact`))return;
 agreeSocietyTruce(g,a,b);
}
/** Called by raid dispatch when a strike actually leaves. */
export function noteRaid(g:Game,team:number,target:number){
 const d=ensureDecisions(g);if(!d)return;outcome(d,team).raids++;remember(g,team,'raid',`sent a raiding party against ${g.tribe(target)?.name??target}`,target);remember(g,target,'raid',`was struck by ${g.tribe(team)?.name??team}`,team);
}
export function noteSettlement(g:Game,team:number,crew=0){const d=ensureDecisions(g);if(!d)return;noteDepartures(g,team,crew);outcome(d,team).settles++;remember(g,team,'settle','sent families to a new hearth');}

// ---------- breakaways ----------
export const legitimacyOf=(g:Game,team:number)=>{const me=st(g).rulers?.societies[String(team)];return me?Math.min(100,30+100*Math.max(0,...Object.values(me.civ.polity.legitimacy))):50;};
/** Unrest pressure (0..100) a society feels from autonomous or broken-away hearths. Feeds unrestOf's coalitionLoss. 0 when the layer is off. */
export function breakawayLoss(g:Game,team:number):number{
 let v=0;for(const b of breakawaysOf(g,team)){if(b.resolution==='reintegrated')continue;v+=b.resolution==='tributary'?8:b.resolution==='recognised'?12:b.stage==='breakaway'?45:b.stage==='autonomous'?20:b.stage==='restive'?6:0;}
 return Math.min(80,v+politicsLoss(g,team));
}
export function settlementsOf(g:Game,team:number):SettlementView[]{
 const recs=(g.state.communities??[]).filter(c=>c.team===team&&c.status!=='abandoned').sort((a,b)=>a.founded-b.founded||a.hall-b.hall);
 if(recs.length<2)return [];const home=g.state.buildings.find(b=>b.id===recs[0].hall);if(!home)return [];
 const out:SettlementView[]=[];
 for(const c of recs.slice(1)){
  const hall=g.state.buildings.find(b=>b.id===c.hall&&b.hp>0&&g.finished(b));if(!hall)continue;
  const residents=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.homeHall===c.hall).length;
  const sf=clamp01(residents/10)*(c.status==='thriving'?1:c.status==='struggling'?.3:.7);
  out.push({hall:c.hall,parent:team,distance:dist(hall,home),ageSeconds:Math.max(0,g.state.time-c.founded),residents,selfSufficiency:sf,localGrievance:clamp01(.5*(g.tribe(team).tension||0)+(c.status==='struggling'?.3:0)+outpostGrievance(g,c.hall))});
 }
 return out;
}
export function reviewBreakaways(g:Game,team:number,n:Needs){
 const d=ensureDecisions(g),bk='b'+team;if(!d||(d.reviewAt[bk]??0)>g.state.time)return;
 d.reviewAt[bk]=g.state.time+BREAKAWAY_RULES.reviewSeconds;
 const views=settlementsOf(g,team),unrest=n.unrest,legit=Math.max(0,Math.min(100,legitimacyOf(g,team)+civicLegitimacy(g,team))),epoch=Math.floor(g.state.time/BREAKAWAY_RULES.reviewSeconds),seed=st(g).seed;
 for(const v of views){
  if(v.residents<BREAKAWAY_RULES.minResidents&&!d.breakaways.some(b=>b.hall===v.hall))continue;
  let b=d.breakaways.find(x=>x.hall===v.hall);
  const p=pressureOf(v,unrest,legit);
  if(!b){if(d.breakaways.length>=DECISION_LIMITS.breakaways)continue;b={hall:v.hall,parent:team,since:g.state.time,stage:'loyal',pressure:p.value,distance:v.distance,reasons:p.reasons};d.breakaways.push(b);}
  if(b.resolution==='reintegrated'||b.resolution==='recognised')continue;
  const name=(g.state.communities??[]).find(c=>c.hall===v.hall)?.name??'a hearth',hall=g.state.buildings.find(x=>x.id===v.hall);
  const eff=Math.max(0,p.value-(b.relief??0));b.relief=Math.max(0,(b.relief??0)-.02);
  const before=b.stage;b.pressure=Math.round(eff*100)/100;b.distance=Math.round(v.distance);b.reasons=p.reasons;
  if(b.conflictUntil!==undefined){
   if(g.state.time<b.conflictUntil)continue;
   const parentPower=Math.max(1,n.readyFighters*(.5+n.defence)),res=coerceSucceeds(seed,v.hall,epoch,parentPower,v);
   b.conflictUntil=undefined;b.resolvedAt=g.state.time;
   if(res.ok){b.resolution='reintegrated';b.stage='loyal';remember(g,team,'reintegration',`brought ${name} back under the hall by force`);if(hall)lifeEvent(g,team,`${name} was brought back by force`,hall.x,hall.z);}
   else{b.resolution='recognised';b.stage='breakaway';remember(g,team,'breakaway',`failed to retake ${name}; it stands apart`);if(hall)lifeEvent(g,team,`${name} stands apart; the hall could not retake it`,hall.x,hall.z);const nt=foundSocietyFromBreakaway(g,v.hall);if(nt!==null)b.newTeam=nt;}
   continue;
  }
  b.stage=stageStep(b.stage,eff);
  if(b.stage!==before){
   const up=STAGES.indexOf(b.stage)>STAGES.indexOf(before);
   remember(g,team,'breakaway',`${name} grew ${up?b.stage:'calmer ('+b.stage+')'}: ${p.reasons[0]??'pressure shifted'}`);
   if(up&&hall)lifeEvent(g,team,b.stage==='restive'?`${name} grows restive`:b.stage==='autonomous'?`${name} acts on its own authority`:`${name} has broken away`,hall.x,hall.z);
  }
  if(b.stage==='autonomous'||b.stage==='breakaway'){
   const t=g.tribe(team),opts=breakawayOptions(v,eff,{food:t.food,wood:t.wood,readyFighters:n.readyFighters,defence:n.defence,weariness:n.weariness,unrest:n.unrest}),pick=pickOption(opts,seed,v.hall,epoch);
   if(pick.kind==='wait'||pick.score<20)continue;
   b.choice=pick.kind;b.choiceAt=g.state.time;
   if(pick.kind==='concede'){t.food=Math.max(0,t.food-pick.cost.food);t.wood=Math.max(0,t.wood-pick.cost.wood);b.stage='restive';b.relief=Math.min(.5,(b.relief??0)+.25);remember(g,team,'reintegration',`conceded to ${name}: gifts and a hearing`);}
   else if(pick.kind==='tribute'){b.resolution='tributary';b.stage='autonomous';remember(g,team,'reintegration',`let ${name} govern itself for tribute`);}
   else if(pick.kind==='recognise'){b.resolution='recognised';b.stage='breakaway';b.resolvedAt=g.state.time;remember(g,team,'breakaway',`recognised ${name} as its own`);if(hall)lifeEvent(g,team,`${name} is recognised as independent`,hall.x,hall.z);const nt=foundSocietyFromBreakaway(g,v.hall);if(nt!==null)b.newTeam=nt;}
   else if(pick.kind==='coerce'){b.conflictUntil=g.state.time+BREAKAWAY_RULES.conflictSeconds;t.recoveryUntil=Math.max(t.recoveryUntil||0,b.conflictUntil);
    const r=st(g).rulers;if(r){r.weary={...(r.weary??{}),[String(team)]:Math.min(100,(r.weary?.[String(team)]??0)+10)};}
    remember(g,team,'breakaway',`marched on ${name}`);}
  }
 }
}

// ---------- succession and yearly upkeep ----------
/** Yearly, from advanceRulers: detect a changed ruler in each society and carry agreements, grievances and histories to the heir. */
export function yearlySocieties(g:Game){
 const d=ensureDecisions(g),r=st(g).rulers;if(!d||!r)return;
 d.lastRuler??={};
 for(const [id,sr] of Object.entries(r.societies)){
  const team=Number(id),now=sr.dynasty.rulerId,prev=d.lastRuler[id];d.lastRuler[id]=now;
  if(prev===undefined||prev===now||!Number.isInteger(team)||team===3)continue;
  const was=sr.dynasty.people[prev],heir=sr.dynasty.people[now];if(!heir)continue;
  const rel:'child'|'sibling'|'kin'|'none'=was?(heir.parent===was.id?'child':heir.parent&&heir.parent===was.parent?'sibling':'kin'):'none';
  const kin=kinCloseness(rel),contested=!heir.legit,legit=legitimacyOf(g,team);
  let carried=0,lapsed=0,strained=0;const notes:string[]=[];
  d.agreements=d.agreements.map(ag=>{
   if((ag.a!==team&&ag.b!==team)||ag.status==='lapsed')return ag;
   const personal=ag.bound==='person'&&ag.signer.split('|').includes(prev);
   const res=inherit(personal?ag:{...ag,bound:'house'},{kin,legitimacy:legit,contested},r.seed,r.year);
   if(res.agreement.status==='lapsed'){lapsed++;notes.push(res.why);}else if(res.agreement.status==='strained'){strained++;carried++;}else carried++;
   return {...ag,status:res.agreement.status,note:res.agreement.status==='lapsed'?res.why:ag.note};
  });
  // Grievances pass to the heir, eased at most 8% by kinship, never reset.
  for(let j=0;j<g.state.tribes.length;j++){if(j===team||j===3||!g.tribe(j)||!g.tribe(team))continue;
   const gr=societyRelation(g,team,j).grievance,after=inheritGrievance(gr,kin);if(gr-after>1e-6)nudgeSocietyRelation(g,team,j,{grievance:after-gr});}
  // One hall event per change of ruler: lane C lowers the banner and shows mourning cloth until mourningUntil, lane B shows the handover card. Read-only data, no goods.
  (d.halls??=[]).push({id:d.nextId++,team,kind:was?.alive?'ruler-set-aside':'ruler-death',time:g.state.time,mourningUntil:g.state.time+RULERS_YEAR_SECONDS*MOURNING_YEARS,from:was?.name??'the late ruler',to:heir.name,relation:rel,contested,carried,strained,lapsed});
  if(d.halls.length>HALL_EVENT_CAP)d.halls.splice(0,d.halls.length-HALL_EVENT_CAP);
  remember(g,team,'succession',`${heir.name} succeeded ${was?.name??'the late ruler'} (${rel}${contested?', contested':''}); ${carried} agreements carried${strained?` (${strained} strained)`:''}${lapsed?`, ${lapsed} lapsed`:''}; grievances kept`);
 }
}
export const MOURNING_YEARS=.25;
/** Hall events (newest last) for a team, or all teams; [] for old saves or when the decision layer is off. */
export const hallEventsOf=(g:Game,team?:number):HallEvent[]=>(peek(g)?.halls??[]).filter(h=>team===undefined||h.team===team);
/** The hall event still in mourning at the current time, if any: lane C reads this for the lowered banner and mourning cloth. */
export const mourningOf=(g:Game,team:number):HallEvent|undefined=>{const l=hallEventsOf(g,team);const h=l[l.length-1];return h&&g.state.time<h.mourningUntil?h:undefined;};
/** Hook for marriages between houses: records the agreement and its signers. */
export function noteMarriage(g:Game,a:number,b:number){if(decisionsEnabled(g))recordAgreement(g,a,b,'marriage',`${g.tribe(a).name} and ${g.tribe(b).name} wed their houses`);}
