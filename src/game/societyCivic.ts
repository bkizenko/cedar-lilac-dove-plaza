/** Civic layer for the society decision system (worldOptions.rulersVersion===2). Pure and seeded: no Math.random, no Date.now, no world writes.
 *  M2-11  community identity that survives arrivals, refugees, departures, aging, families and leadership (bounded drift, never a reset)
 *  M2-14  a bounded recorded prehistory that discloses the asymmetry the inhabited world starts with
 *  M2-16  the chapter chain: surplus -> wider access -> exposed routes -> independent society decisions
 *  CAT-117 regional logistics: distant hearths keep local stores and decisions; central requests are obeyed by loyalty, distance and need
 *  M4-07  political complexity from population/diversity/distance/power with warned negotiation and unrest stages
 *  M4-08  leader proposals (projects, agreements, commitments) with legitimacy and continuity consequences
 *  M4-09  council/ritual/learning/administrative institutions with bounded, paid-for effects (no free goods)
 * The runtime (societyCivicRuntime.ts) feeds real numbers in and applies results only through existing ledgers. */
import {clamp01,hash32,makeRng} from './rulerCore';

const r2=(x:number)=>Math.round(x*100)/100;
const num=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
const rec=(o:unknown)=>!!o&&typeof o==='object'&&!Array.isArray(o);

// ---------------------------------------------------------------- M2-11 identity
export const TRAITS=['kinship','craft','faith','hospitality','martial'] as const;
export type Trait=typeof TRAITS[number];
export type Traits=Record<Trait,number>;
export type Identity={version:1;core:Traits;traits:Traits;pride:number;native:number;adopted:number;grudges:number;continuity:number;adj?:number;shifts:number;last:string};
export const IDENTITY_RULES={maxShift:.06,assimilatePerYear:.12,inertia:.04,historyCap:12} as const;
export type IdentityEvent=
 |{kind:'arrival'|'refugees';count:number;pop:number;origin?:Traits}
 |{kind:'departure';count:number;pop:number;breakaway?:boolean}
 |{kind:'aging';years:number;births:number;deaths:number;pop:number}
 |{kind:'family';outsideMarriages:number;pop:number;origin?:Traits}
 |{kind:'leadership';legitimacy:number;contested:boolean;kin:number;leader?:Traits;trained?:boolean;ritual?:boolean};

export function seedIdentity(seed:number,team:number,pop=12):Identity{
 const r=makeRng(hash32('identity',seed,team)),core={} as Traits;
 for(const t of TRAITS)core[t]=r2(.25+.5*r());
 return {version:1,core,traits:{...core},pride:r2(.4+.3*r()),native:Math.max(1,Math.round(pop)),adopted:0,grudges:0,continuity:1,shifts:0,last:'founded'};
}
const lerpTo=(a:number,b:number,w:number)=>a+(b-a)*w;
function drift(t:Traits,to:Traits|undefined,w:number):Traits{
 const out={...t};if(!to)return out;
 for(const k of TRAITS)out[k]=r2(clamp01(lerpTo(t[k],to[k],Math.min(IDENTITY_RULES.maxShift,Math.max(0,w)))));return out;
}
/** 1 = the people still recognise themselves; falls as traits leave the founding core or as incomers outnumber the native born. */
export function continuityOf(i:Pick<Identity,'core'|'traits'|'native'|'adopted'>):number{
 let d=0;for(const k of TRAITS)d+=Math.abs(i.traits[k]-i.core[k]);d/=TRAITS.length;
 const share=i.adopted/Math.max(1,i.native+i.adopted);
 return r2(clamp01(1-1.6*d-.35*Math.max(0,share-.3)));
}
/** One event, one bounded step. A handful of incomers barely moves the people; a flood moves them at most maxShift per event; refugees weigh
 * less than invited settlers (they arrive with little and defer more); nobody's identity is ever reset by an event. */
export function applyIdentity(id:Identity,e:IdentityEvent):Identity{
 let n={...id,traits:{...id.traits}};const R=IDENTITY_RULES;
 switch(e.kind){
  case 'arrival':case 'refugees':{
   const c=Math.max(0,Math.floor(e.count));if(!c)return id;
   const share=c/Math.max(1,e.pop+c),weight=share*(e.kind==='refugees'?.4:.7);
   n.traits=drift(n.traits,e.origin,weight);n.adopted+=c;
   if(e.kind==='refugees'){n.traits.hospitality=r2(clamp01(n.traits.hospitality+Math.min(.03,.15*share)));n.pride=r2(clamp01(n.pride+(share<.35?.01:-.03*share)));}
   n.last=e.kind==='refugees'?`took in ${c} refugees`:`welcomed ${c} newcomers`;break;}
  case 'departure':{
   const c=Math.max(0,Math.floor(e.count));if(!c)return id;
   const total=n.native+n.adopted,fromAdopted=Math.min(n.adopted,Math.round(c*n.adopted/Math.max(1,total))),fromNative=Math.min(Math.max(0,n.native-1),c-fromAdopted);
   n.adopted-=fromAdopted;n.native-=fromNative;
   n.pride=r2(clamp01(n.pride-(e.breakaway?.05:.01)*Math.min(3,c/Math.max(1,e.pop)*8)));
   if(e.breakaway)n.grudges=r2(clamp01(n.grudges+.06));
   n.last=e.breakaway?`lost ${c} people to a breakaway`:`${c} left to found a new hearth`;break;}
  case 'aging':{
   const conv=Math.min(n.adopted,Math.round(n.adopted*clamp01(R.assimilatePerYear*Math.max(0,e.years))));
   n.adopted-=conv;n.native=Math.max(1,n.native+conv+Math.max(0,Math.floor(e.births))-Math.max(0,Math.floor(e.deaths)));
   const back=R.inertia*clamp01(e.years); // cultural inertia: the core pulls slowly back
   for(const k of TRAITS)n.traits[k]=r2(clamp01(lerpTo(n.traits[k],n.core[k],back)));
   if(e.births>e.deaths)n.pride=r2(clamp01(n.pride+.005));
   n.grudges=r2(clamp01(n.grudges-.01*Math.max(0,e.years)));n.last='a generation passed';break;}
  case 'family':{
   const c=Math.max(0,Math.floor(e.outsideMarriages));if(!c)return id;
   n.traits=drift(n.traits,e.origin,Math.min(.03,.4*c/Math.max(1,e.pop)));n.last=`${c} marriages with outsiders`;break;}
  case 'leadership':{
   const w=(.02+.03*clamp01(e.legitimacy/100))*(e.contested?.5:1)*(e.ritual?.6:1);
   n.traits=drift(n.traits,e.leader,w);
   if(e.contested){n.pride=r2(clamp01(n.pride-.04*(e.trained?.5:1)));n.grudges=r2(clamp01(n.grudges+.02));}
   else n.pride=r2(clamp01(n.pride+.01*e.kin));
   n.last=e.contested?'a contested succession':'the house passed to its heir';break;}
 }
 n.shifts=id.shifts+1;n.continuity=r2(clamp01(continuityOf(n)+(n.adj??0)));return n;
}
/** Proposal consequences reach continuity through a bounded adjustment that later events keep (it fades only through good years). */
export function adjustContinuity(id:Identity,delta:number):Identity{
 const adj=Math.max(-.2,Math.min(.1,(id.adj??0)+delta));return {...id,adj:r2(adj),continuity:r2(clamp01(continuityOf(id)+adj))};
}
export function validIdentity(x:unknown):x is Identity{
 const i=x as Identity;if(!rec(i)||i.version!==1||!rec(i.core)||!rec(i.traits))return false;
 return TRAITS.every(k=>num(i.core[k])&&i.core[k]>=0&&i.core[k]<=1&&num(i.traits[k])&&i.traits[k]>=0&&i.traits[k]<=1)&&[i.pride,i.grudges,i.continuity].every(v=>num(v)&&v>=0&&v<=1)&&Number.isInteger(i.native)&&i.native>=0&&Number.isInteger(i.adopted)&&i.adopted>=0&&Number.isInteger(i.shifts)&&typeof i.last==='string'&&(i.adj===undefined||(num(i.adj)&&Math.abs(i.adj)<=.2));
}

// ---------------------------------------------------------------- M2-14 prehistory
export type PrehistoryEvent={yearsAgo:number;kind:'founding'|'good-years'|'famine'|'feud'|'migration'|'plague'|'alliance'|'schism';text:string};
export type PrehistorySociety={team:number;size:number;ageYears:number;pride:number;events:PrehistoryEvent[]};
export type PrehistoryTie={a:number;b:number;tie:'kin'|'rivals'|'trade-partners'|'strangers';trust:number;grievance:number};
export type Prehistory={version:1;steps:number;societies:PrehistorySociety[];ties:PrehistoryTie[];disclosure:string[]};
export const PREHISTORY_RULES={steps:6,yearsPerStep:5,maxEventsPerSociety:5,maxTies:24} as const;
const EVENT_TEXT:Record<PrehistoryEvent['kind'],string>={founding:'was founded by one extended family',migration:'took in a migrating band','good-years':'enjoyed a run of good harvests',famine:'lost people to a hungry winter',feud:'carried a feud with a neighbour',plague:'was thinned by a sickness',alliance:'swore friendship with a neighbour',schism:'split over a quarrel and lost a faction'};
/** Bounded recorded prehistory. `sizes` are the societies' REAL starting populations (never altered here); the run only adds the histories, ties and
 * pride that explain why they differ. Fixed step count, seeded; summarised in at most 5 short lines the UI can show. */
export function runPrehistory(seed:number,societies:{team:number;size:number;name:string}[]):Prehistory{
 const R=PREHISTORY_RULES,out:PrehistorySociety[]=[];
 for(const s of societies){
  const r=makeRng(hash32('prehistory',seed,s.team)),events:PrehistoryEvent[]=[];let pride=.5;
  const ageYears=R.steps*R.yearsPerStep-Math.floor(r()*R.yearsPerStep*3);
  events.push({yearsAgo:ageYears,kind:'founding',text:EVENT_TEXT.founding});
  for(let step=0;step<R.steps&&events.length<R.maxEventsPerSociety;step++){
   const roll=r(),yearsAgo=Math.max(1,ageYears-(step+1)*R.yearsPerStep+Math.floor(r()*R.yearsPerStep));
   const kind:PrehistoryEvent['kind']|null=roll<.12?'good-years':roll<.22?'famine':roll<.3?'feud':roll<.38?'migration':roll<.43?'plague':roll<.5?'alliance':roll<.54?'schism':null;
   if(!kind)continue;events.push({yearsAgo,kind,text:EVENT_TEXT[kind]});
   pride+=({'good-years':.08,famine:-.06,feud:.02,migration:.04,plague:-.05,alliance:.05,schism:-.07,founding:0} as const)[kind];
  }
  out.push({team:s.team,size:Math.max(1,Math.round(s.size)),ageYears,pride:r2(clamp01(pride)),events:events.sort((a,b)=>b.yearsAgo-a.yearsAgo)});
 }
 const ties:PrehistoryTie[]=[];
 for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length&&ties.length<R.maxTies;j++){
  const r=makeRng(hash32('prehistory-tie',seed,out[i].team,out[j].team)),roll=r(),
   tie:PrehistoryTie['tie']=roll<.15?'kin':roll<.4?'rivals':roll<.65?'trade-partners':'strangers';
  const has=(t:number,k:PrehistoryEvent['kind'])=>out.find(s=>s.team===t)!.events.some(e=>e.kind===k);
  let trust=({kin:.6,rivals:.15,'trade-partners':.45,strangers:.3} as const)[tie],grievance=({kin:.02,rivals:.35,'trade-partners':.05,strangers:0} as const)[tie];
  if(has(out[i].team,'feud')||has(out[j].team,'feud'))grievance+=.1;if(has(out[i].team,'alliance')&&has(out[j].team,'alliance'))trust+=.1;
  ties.push({a:out[i].team,b:out[j].team,tie,trust:r2(clamp01(trust)),grievance:r2(clamp01(grievance))});
 }
 return {version:1,steps:R.steps,societies:out,ties,disclosure:disclose(out,ties,societies)};
}
export function disclose(s:PrehistorySociety[],ties:PrehistoryTie[],names:{team:number;name:string}[]=[]):string[]{
 if(!s.length)return [];const nm=(t:number)=>names.find(n=>n.team===t)?.name??`society ${t}`,by=[...s].sort((a,b)=>b.size-a.size||a.team-b.team),big=by[0],small=by[by.length-1],lines:string[]=[];
 lines.push(`The world did not start even: ${nm(big.team)} begins with ${big.size} people, ${nm(small.team)} with ${small.size}.`);
 const oldest=[...s].sort((a,b)=>b.ageYears-a.ageYears||a.team-b.team)[0];lines.push(`${nm(oldest.team)} is the oldest settlement, about ${oldest.ageYears} years.`);
 const bad=ties.filter(t=>t.tie==='rivals').length,good=ties.filter(t=>t.tie==='kin'||t.tie==='trade-partners').length;
 lines.push(`${good} pairs start friendly (kin or trading) and ${bad} start as rivals; the rest are strangers.`);
 const hard=s.filter(x=>x.events.some(e=>e.kind==='famine'||e.kind==='plague')).length;if(hard)lines.push(`${hard} societies carry the memory of famine or sickness.`);
 lines.push('These are recorded starting conditions, not bonuses: no society is handed goods because of them.');return lines.slice(0,5);
}
export function validPrehistory(x:unknown):x is Prehistory{
 const p=x as Prehistory;return rec(p)&&p.version===1&&Number.isInteger(p.steps)&&Array.isArray(p.societies)&&p.societies.length<=16&&p.societies.every(s=>rec(s)&&Number.isInteger(s.team)&&num(s.size)&&num(s.ageYears)&&num(s.pride)&&Array.isArray(s.events)&&s.events.length<=PREHISTORY_RULES.maxEventsPerSociety+1)&&Array.isArray(p.ties)&&p.ties.length<=PREHISTORY_RULES.maxTies&&p.ties.every(t=>rec(t)&&Number.isInteger(t.a)&&Number.isInteger(t.b)&&['kin','rivals','trade-partners','strangers'].includes(t.tie)&&num(t.trust)&&num(t.grievance))&&Array.isArray(p.disclosure)&&p.disclosure.length<=6;
}

// ---------------------------------------------------------------- CAT-117 regional logistics and local autonomy
export type Outpost={hall:number;distance:number;residents:number;food:number;wood:number;stone:number;foodPerPerson:number;loyalty:number;localNeed:number};
export type Request={food:number;wood:number;stone:number;centralNeed:number};
export const AUTONOMY_RULES={nearM:120,farM:600,localReserveSeconds:600,walkMetersPerSecond:1.6,adminReach:.25,refusalGrievance:.12,complianceRelief:.04} as const;
/** What the outpost holds back for itself: its own people's reserve, never given away by a request. */
export const localFloor=(o:Pick<Outpost,'residents'|'foodPerPerson'>)=>Math.ceil(o.residents*o.foodPerPerson*AUTONOMY_RULES.localReserveSeconds);
export type Answer={obeyed:boolean;grant:{food:number;wood:number;stone:number};willingness:number;transitSeconds:number;grievance:number;why:string[]};
/** Central requests are obeyed by loyalty, distance and need: willingness = loyalty, cut by distance (less so with administration), lifted by the
 * centre's need and cut by the outpost's own. The grant never dips below the local floor, and it is in transit for distance/walk-speed seconds. */
export function answerRequest(o:Outpost,q:Request,seed:number,epoch:number,admin=false):Answer{
 const R=AUTONOMY_RULES,far=clamp01((o.distance-R.nearM)/(R.farM-R.nearM)),why:string[]=[];
 const w=clamp01(.15+.7*clamp01(o.loyalty)-.45*far*(admin?1-R.adminReach*2:1)+.3*clamp01(q.centralNeed)-.4*clamp01(o.localNeed));
 if(o.loyalty>=.6)why.push('loyal to the hall');if(far>.5)why.push(admin?'far, but the administration reaches it':'far from the hall');if(o.localNeed>.4)why.push('its own people come first');if(q.centralNeed>.5)why.push('the hall is in need');
 const noise=(makeRng(hash32('answer',seed,o.hall,epoch))()-.5)*.1,obeyed=w+noise>=.5;
 const spare=(have:number,ask:number,floor:number)=>Math.max(0,Math.min(Math.floor(ask*clamp01(w+.2)),Math.floor(have-floor)));
 const grant=obeyed?{food:spare(o.food,q.food,localFloor(o)),wood:spare(o.wood,q.wood,0),stone:spare(o.stone,q.stone,0)}:{food:0,wood:0,stone:0};
 const gave=grant.food+grant.wood+grant.stone>0;
 if(obeyed&&!gave&&q.food+q.wood+q.stone>0)why.unshift('willing, but nothing to spare above its own reserve');
 return {obeyed:obeyed&&(gave||q.food+q.wood+q.stone===0),grant,willingness:r2(w),transitSeconds:Math.round(o.distance/R.walkMetersPerSecond),grievance:obeyed?(gave?-R.complianceRelief:0):R.refusalGrievance*(1-.5*clamp01(o.loyalty)),why:why.slice(0,3)};
}
/** An outpost decides for itself what it cannot ask the hall about in time: the farther away, the more it acts alone. */
export const localDecisionShare=(distance:number,admin=false)=>r2(clamp01(.2+.7*clamp01((distance-AUTONOMY_RULES.nearM)/(AUTONOMY_RULES.farM-AUTONOMY_RULES.nearM))-(admin?.15:0)));

// ---------------------------------------------------------------- M4-07 political complexity
export const COMPLEXITY=['household','band council','chiefly court','assembly','administered state'] as const;
export type Complexity=typeof COMPLEXITY[number];
export const NEGOTIATION=['quiet','murmurs','demands','talks','rupture'] as const;
export type Negotiation=typeof NEGOTIATION[number];
export type PoliticsInput={pop:number;diversity:number;distance:number;power:number;unrest:number;legitimacy:number};
export type Politics={version:1;level:Complexity;score:number;stage:Negotiation;pressure:number;factions:number;since:number;why:string[]};
export const POLITICS_RULES={popScale:160,farMeters:600,levels:[.24,.4,.56,.76],up:[.3,.5,.7,.85],downMargin:.08,reviewSeconds:120} as const;
export const NEGOTIATION_WARNING:Record<Negotiation,string>={quiet:'nothing is asked',murmurs:'people grumble; a visit or a gift settles it',demands:'a hearth or faction states terms; hear them or grant a seat',talks:'formal negotiation; concede something or the break comes',rupture:'terms have failed; the faction acts on its own'};
/** Complexity grows with how many people, how different, how far apart and how much power there is to fight over; it only asks for institutions. */
export function complexityScore(i:PoliticsInput):{score:number;level:Complexity;why:string[]}{
 const R=POLITICS_RULES,p=clamp01(Math.log(1+Math.max(0,i.pop))/Math.log(1+R.popScale)),d=clamp01(i.diversity),f=clamp01(i.distance/R.farMeters),w=clamp01(i.power);
 const score=r2(clamp01(.46*p+.2*d+.18*f+.16*w)),level=COMPLEXITY[R.levels.filter(t=>score>=t).length];
 const why:string[]=[];if(p>.5)why.push('many people to govern');if(d>.35)why.push('different customs under one house');if(f>.4)why.push('hearths far apart');if(w>.5)why.push('real power to fight over');
 return {score,level,why:why.slice(0,3)};
}
/** One warned negotiation stage per review, with hysteresis. Pressure is complexity left unanswered: unrest minus what legitimacy and institutions absorb. */
export function politicsStep(prev:Politics|undefined,i:PoliticsInput,time:number,absorb=0):Politics{
 const c=complexityScore(i),R=POLITICS_RULES,pressure=r2(clamp01(c.score*(.35+.65*clamp01(i.unrest/100))*(1.15-.5*clamp01(i.legitimacy/100))-absorb));
 let k=prev?NEGOTIATION.indexOf(prev.stage):0;const t=[.2,.36,.52,.7];
 if(k<NEGOTIATION.length-1&&pressure>=t[k])k++;else if(k>0&&pressure<t[k-1]-R.downMargin)k--;
 const why=[...c.why];if(i.unrest>=40)why.push('unrest is high');if(absorb>0)why.push('institutions absorb some of it');
 return {version:1,level:c.level,score:c.score,stage:NEGOTIATION[k],pressure,factions:Math.max(1,Math.min(5,1+Math.floor(c.score*5))),since:prev&&prev.stage===NEGOTIATION[k]?prev.since:time,why:why.slice(0,4)};
}
export function validPolitics(x:unknown):x is Politics{
 const p=x as Politics;return rec(p)&&p.version===1&&(COMPLEXITY as readonly string[]).includes(p.level)&&(NEGOTIATION as readonly string[]).includes(p.stage)&&num(p.score)&&num(p.pressure)&&Number.isInteger(p.factions)&&num(p.since)&&Array.isArray(p.why);
}

// ---------------------------------------------------------------- M4-09 institutions
export const INSTITUTIONS=['council','ritual','learning','administration'] as const;
export type InstitutionKind=typeof INSTITUTIONS[number];
export type Institution={kind:InstitutionKind;since:number;paidUntil:number;level:1|2|3;lapsed:boolean};
export const INSTITUTION_RULES:Record<InstitutionKind,{needs:string[];minPop:number;minLevel:number;yearly:{food:number;wood:number;stone:number};note:string}>={
 council:{needs:['townhall'],minPop:10,minLevel:1,yearly:{food:0,wood:2,stone:0},note:'speaks for the hearths: raises consent to proposals and soaks up unrest, at the price of slower decisions'},
 ritual:{needs:['temple','grove','cairn'],minPop:8,minLevel:0,yearly:{food:6,wood:0,stone:0},note:'feasts and rites: protects identity from drift and eases grudges; the feast eats real food'},
 learning:{needs:['university','workshop'],minPop:14,minLevel:2,yearly:{food:2,wood:2,stone:0},note:'trains heirs and officers: softens the cost of a contested succession'},
 administration:{needs:['warehouse'],minPop:18,minLevel:2,yearly:{food:0,wood:3,stone:2},note:'delegation: distant hearths are reached and may decide within bounds'}};
export type CivicCtx={pop:number;complexityLevel:number;buildings:Record<string,number>};
export function mayEstablish(k:InstitutionKind,c:CivicCtx):{ok:boolean;why:string}{
 const r=INSTITUTION_RULES[k];
 if(c.pop<r.minPop)return {ok:false,why:`needs at least ${r.minPop} people`};if(c.complexityLevel<r.minLevel)return {ok:false,why:'the society is not yet complex enough to need it'};
 if(!r.needs.some(b=>(c.buildings[b]??0)>0))return {ok:false,why:`needs a ${r.needs.join(' or ')}`};return {ok:true,why:r.note};
}
export type Paid={food:number;wood:number;stone:number};
/** Yearly upkeep scaled by level. Unpaid institutions lapse (kept in the record, effects off) and come back only when paid again. */
export const upkeepOf=(i:Institution):Paid=>{const y=INSTITUTION_RULES[i.kind].yearly;return {food:y.food*i.level,wood:y.wood*i.level,stone:y.stone*i.level};};
export const canPay=(have:Paid,cost:Paid)=>have.food>=cost.food&&have.wood>=cost.wood&&have.stone>=cost.stone;
export type Effects={consent:number;unrestAbsorb:number;identityShield:number;griefEase:number;successionSoftening:number;adminReach:boolean;decisionDelay:number};
export const NO_EFFECTS:Effects={consent:0,unrestAbsorb:0,identityShield:0,griefEase:0,successionSoftening:0,adminReach:false,decisionDelay:1};
/** Effects of the institutions that are standing and paid. Every effect is bounded and each has a cost somewhere (upkeep, slower decisions). */
export function effectsOf(list:Institution[]|undefined):Effects{
 const e={...NO_EFFECTS};
 for(const i of list??[]){if(i.lapsed)continue;const l=i.level;
  if(i.kind==='council'){e.consent+=.08*l;e.unrestAbsorb+=.04*l;e.decisionDelay+=.1*l;}
  if(i.kind==='ritual'){e.identityShield+=.15*l;e.griefEase+=.01*l;}
  if(i.kind==='learning'){e.successionSoftening+=.2*l;}
  if(i.kind==='administration'){e.adminReach=true;e.unrestAbsorb+=.02*l;}}
 return {consent:r2(Math.min(.24,e.consent)),unrestAbsorb:r2(Math.min(.12,e.unrestAbsorb)),identityShield:r2(Math.min(.45,e.identityShield)),griefEase:r2(Math.min(.03,e.griefEase)),successionSoftening:r2(Math.min(.6,e.successionSoftening)),adminReach:e.adminReach,decisionDelay:r2(Math.min(1.3,e.decisionDelay))};
}
export function validInstitution(x:unknown):x is Institution{
 const i=x as Institution;return rec(i)&&(INSTITUTIONS as readonly string[]).includes(i.kind)&&num(i.since)&&num(i.paidUntil)&&[1,2,3].includes(i.level)&&typeof i.lapsed==='boolean';
}

// ---------------------------------------------------------------- M4-08 leader proposals
export type ProposalKind='project'|'agreement'|'commitment';
export type ProposalStatus='open'|'accepted'|'declined'|'kept'|'broken';
export type Proposal={base?:number;id:number;kind:ProposalKind;title:string;proposer:string;at:number;until:number;status:ProposalStatus;target?:number;planKind?:string;inherited?:boolean;/** Awaiting the player's own answer (team 0 only); absent on old saves, which keep the council's automatic answer. */ask?:boolean;legitimacyDelta:number;continuityDelta:number};
export const PROPOSAL_RULES={maxOpen:1,maxHistory:12,openSeconds:360,keptLegitimacy:4,brokenLegitimacy:-7,declinedLegitimacy:-1,brokenContinuity:-.03,keptContinuity:.01,legitimacyBound:15} as const;
export type LeaderView={rulerId:string;legitimacy:number;ambition:number;caution:number;warm:number};
export type CouncilView={consent:number;stage:Negotiation};
/** Whether the council takes a proposal. Cautious leaders ask less; legitimacy and consent carry it; talks and rupture make every ask harder. */
export function consentFor(p:Pick<Proposal,'kind'>,l:LeaderView,c:CouncilView,seed:number,id:number):{accepted:boolean;odds:number;why:string[]}{
 const stagePenalty=({quiet:0,murmurs:.05,demands:.12,talks:.22,rupture:.5} as const)[c.stage],kindCost=p.kind==='commitment'?.08:p.kind==='project'?.04:0;
 const odds=r2(clamp01(.35+.4*clamp01(l.legitimacy/100)+c.consent-stagePenalty-kindCost));
 const why:string[]=[`legitimacy ${Math.round(l.legitimacy)}`];if(c.consent>0)why.push('the council speaks for the hearths');if(stagePenalty>=.12)why.push(`${c.stage} make it harder`);
 return {accepted:makeRng(hash32('consent',seed,id,l.rulerId))()<odds,odds,why:why.slice(0,3)};
}
export type ProposalContext={foodSeconds:number;housing:number;threat:number;openAgreementTarget?:number;planKind?:string;time:number;nextId:number;stage:Negotiation;outpostsRestive:number};
/** The ruler proposes at most one thing at a time, shaped by character and by what the society actually lacks. No free goods: a project is the
 * society's own plan (it reserves and spends through the existing plan), an agreement needs a warm neighbour, a commitment is a promise to keep. */
export function propose(l:LeaderView,c:ProposalContext,open:Proposal[],seed:number):Proposal|null{
 if(open.filter(p=>p.status==='open').length>=PROPOSAL_RULES.maxOpen)return null;
 const r=makeRng(hash32('propose',seed,c.nextId,l.rulerId)),base=.25+.35*l.ambition-.2*l.caution;if(r()>base)return null;
 const mk=(kind:ProposalKind,title:string,extra:Partial<Proposal>={}):Proposal=>({id:c.nextId,kind,title,proposer:l.rulerId,at:c.time,until:c.time+PROPOSAL_RULES.openSeconds,status:'open',legitimacyDelta:0,continuityDelta:0,...extra});
 if(c.outpostsRestive>0&&c.stage!=='quiet')return mk('commitment','keep the far hearths fed and heard',{planKind:'stockpile'});
 if(c.openAgreementTarget!==undefined&&l.warm>.4)return mk('agreement','swear a pact with a warm neighbour',{target:c.openAgreementTarget,planKind:'ally'});
 if(c.foodSeconds<600)return mk('commitment','hold a food reserve through the lean season',{planKind:'stockpile'});
 if(c.housing>.85)return mk('project','raise more homes for the growing hearth',{planKind:'grow'});
 if(c.threat>.4)return mk('project','strengthen the watch',{planKind:'fortify'});
 return null;
}
/** Settle a proposal against the society's real progress. Consequences are small, bounded numbers the runtime adds to its legitimacy and
 * continuity ledgers; a broken commitment is remembered and handed to the heir with its strain. */
export function settleProposal(p:Proposal,fulfilled:boolean,time:number):Proposal{
 const R=PROPOSAL_RULES;
 if(p.status==='open'&&time>=p.until)return {...p,status:'declined',legitimacyDelta:R.declinedLegitimacy,continuityDelta:0};
 if(p.status!=='accepted')return p;
 if(fulfilled)return {...p,status:'kept',legitimacyDelta:R.keptLegitimacy,continuityDelta:R.keptContinuity};
 if(time>=p.until)return {...p,status:'broken',legitimacyDelta:R.brokenLegitimacy*(p.kind==='commitment'?1.4:1),continuityDelta:R.brokenContinuity};
 return p;
}
export const boundLegitimacy=(x:number)=>Math.max(-PROPOSAL_RULES.legitimacyBound,Math.min(PROPOSAL_RULES.legitimacyBound,x));
export function validProposal(x:unknown):x is Proposal{
 const p=x as Proposal;return rec(p)&&Number.isInteger(p.id)&&['project','agreement','commitment'].includes(p.kind)&&typeof p.title==='string'&&typeof p.proposer==='string'&&num(p.at)&&num(p.until)&&['open','accepted','declined','kept','broken'].includes(p.status)&&num(p.legitimacyDelta)&&num(p.continuityDelta)&&(p.target===undefined||Number.isInteger(p.target))&&(p.ask===undefined||typeof p.ask==='boolean');
}

// ---------------------------------------------------------------- M2-16 chapter chain
export type ChapterInput={foodSeconds:number;surplusThreshold?:number;halls:number;knownSocieties:number;routes:number;exposure:number;independentPlans:number;societies:number;distinctPlanKinds:number;planWithoutSurplus?:number};
export type ChapterLink={id:'surplus'|'access'|'exposure'|'decisions';met:boolean;evidence:string};
/** The M2 chapter in one chain: a surplus lets a society spare people, which widens access (more hearths, known neighbours, routes), which exposes
 * those routes to others' sight and raids, which meets other societies deciding independently of the player and of one another. */
export function chapterChain(c:ChapterInput):{links:ChapterLink[];complete:boolean;broken?:ChapterLink['id']}{
 const th=c.surplusThreshold??900;
 const links:ChapterLink[]=[
  {id:'surplus',met:c.foodSeconds>=th,evidence:`food reserve ${Math.round(c.foodSeconds)} s (needs ${th})`},
  {id:'access',met:c.halls>1||c.knownSocieties>0||c.routes>0,evidence:`${c.halls} hearths, ${c.knownSocieties} known societies, ${c.routes} routes`},
  {id:'exposure',met:c.routes>0?c.exposure>0:c.exposure>.05,evidence:`exposure ${r2(c.exposure)} along ${c.routes} routes`},
  {id:'decisions',met:c.independentPlans>=2&&c.distinctPlanKinds>=2,evidence:`${c.independentPlans}/${c.societies} societies hold their own plans in ${c.distinctPlanKinds} kinds`}];
 const broken=links.find(l=>!l.met);return {links,complete:!broken,broken:broken?.id};
}

// ---------------------------------------------------------------- state
export type CivicState={version:1;identity:Record<string,Identity>;politics:Record<string,Politics>;institutions:Record<string,Institution[]>;proposals:Record<string,Proposal[]>;legitimacy:Record<string,number>;autonomy:Record<string,number>;answers:Record<string,{at:number;obeyed:boolean;willingness:number}>;prehistory?:Prehistory;snapshot:Record<string,{pop:number;ruler:string;halls:number;marriages:number}>;pending:Record<string,{arrivals:number;refugees:number;departures:number}>;reviewAt:Record<string,number>;nextId:number};
export const CIVIC_LIMITS={teams:16,proposals:12,halls:32} as const;
export const emptyCivic=():CivicState=>({version:1,identity:{},politics:{},institutions:{},proposals:{},legitimacy:{},autonomy:{},answers:{},snapshot:{},pending:{},reviewAt:{},nextId:1});
export function validCivic(x:unknown):x is CivicState{
 const s=x as CivicState;if(!rec(s)||s.version!==1||!Number.isInteger(s.nextId)||s.nextId<1)return false;
 for(const k of ['identity','politics','institutions','proposals','legitimacy','autonomy','answers','snapshot','pending','reviewAt'] as const)if(!rec(s[k])||Object.keys(s[k]).length>CIVIC_LIMITS.teams*(k==='autonomy'||k==='answers'?CIVIC_LIMITS.halls:1))return false;
 if(!Object.values(s.identity).every(validIdentity)||!Object.values(s.politics).every(validPolitics))return false;
 if(!Object.values(s.institutions).every(l=>Array.isArray(l)&&l.length<=INSTITUTIONS.length&&l.every(validInstitution)))return false;
 if(!Object.values(s.proposals).every(l=>Array.isArray(l)&&l.length<=CIVIC_LIMITS.proposals&&l.every(validProposal)))return false;
 if(!Object.values(s.legitimacy).every(v=>num(v)&&Math.abs(v)<=PROPOSAL_RULES.legitimacyBound)||!Object.values(s.autonomy).every(v=>num(v)&&v>=0&&v<=1))return false;
 return s.prehistory===undefined||validPrehistory(s.prehistory);
}
