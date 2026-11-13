/** Runtime glue for the civic layer (societyCivic.ts), worldOptions.rulersVersion===2. One yearly call (from advanceRulers, after yearlySocieties).
 * Reads real populations, halls, ruler, stores and ledgers; writes only the civic record (rulers.decisions.civic), the history log, the paid upkeep
 * of institutions (real food/wood/stone deducted from the society's own stock) and, through the existing ledgers, legitimacy and unrest.
 * Nothing is spawned, handed out or teleported. The player's own community is observed (identity, politics) but never charged or governed here. */
import type {Game} from './sim';
import {ensureDecisions,decisionsEnabled,agreementsOf,breakawaysOf,planOf,intelOf,outcomesOf,remember,legitimacyOf,settlementsOf} from './societyRuntime';
import {livingPeople,ensureRulers,unrestOf} from './rulersRuntime';
import {societyRelation} from './societyRelations';
import {reserveSeconds,foodDemand} from './settlement';
import {lifeEvent} from './communities';
import {wealthSigns} from './societyIntel';
import {clamp01} from './rulerCore';
import {
 emptyCivic,seedIdentity,applyIdentity,adjustContinuity,runPrehistory,answerRequest,localFloor,localDecisionShare,complexityScore,politicsStep,
 INSTITUTIONS,INSTITUTION_RULES,mayEstablish,upkeepOf,canPay,effectsOf,NO_EFFECTS,propose,consentFor,settleProposal,boundLegitimacy,chapterChain,
 AUTONOMY_RULES,PROPOSAL_RULES,COMPLEXITY,NEGOTIATION_WARNING,
 type CivicState,type Identity,type Traits,type Institution,type Proposal,type LeaderView,type Effects,type Politics,type Prehistory,type ChapterInput
} from './societyCivic';

type DynLike={rulerId:string;people:Record<string,{id:string;legit:boolean;parent?:string;ruler?:{traits:Record<string,number>}}>};
const sr=(g:Game,team:number)=>(ensureRulers(g)?.societies as unknown as Record<string,{dynasty:DynLike}>|undefined)?.[String(team)];
const seedOf=(g:Game)=>(g.state as unknown as {seed:number}).seed;
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const liveTeams=(g:Game)=>g.state.tribes.map((_,i)=>i).filter(i=>i!==3&&!!g.tribe(i)?.alive);

export function ensureCivic(g:Game):CivicState|null{
 const d=ensureDecisions(g);if(!d)return null;const x=d as unknown as {civic?:CivicState};return x.civic??(x.civic=emptyCivic());
}
export const peekCivic=(g:Game):CivicState|undefined=>decisionsEnabled(g)?(g.state as unknown as {rulers?:{decisions?:{civic?:CivicState}}}).rulers?.decisions?.civic:undefined;
export const civicLegitimacy=(g:Game,team:number)=>peekCivic(g)?.legitimacy[String(team)]??0;
export const civicEffects=(g:Game,team:number):Effects=>effectsOf(peekCivic(g)?.institutions[String(team)])??NO_EFFECTS;
/** Extra pressure (0..) from a society's open negotiation stage; feeds unrest through the same coalition-loss ledger as breakaways. */
export function politicsLoss(g:Game,team:number):number{const p=peekCivic(g)?.politics[String(team)];return p?({quiet:0,murmurs:0,demands:3,talks:8,rupture:16} as const)[p.stage]:0;}
export const outpostGrievance=(g:Game,hall:number)=>peekCivic(g)?.autonomy[String(hall)]??0;

// ---- hooks
/** Called when people actually arrive at a community (walkers who joined, refugees who stayed). */
export function noteArrivals(g:Game,team:number,count:number,refugees:boolean){
 const c=ensureCivic(g);if(!c||count<=0)return;const p=(c.pending[String(team)]??={arrivals:0,refugees:0,departures:0});
 if(refugees)p.refugees+=count;else p.arrivals+=count;
}
export function noteDepartures(g:Game,team:number,count:number){
 const c=ensureCivic(g);if(!c||count<=0)return;(c.pending[String(team)]??={arrivals:0,refugees:0,departures:0}).departures+=count;
}

// ---- helpers
const leaderTraits=(d:DynLike|undefined):Traits|undefined=>{
 const t=d?.people[d.rulerId]?.ruler?.traits;if(!t)return undefined;const f=(k:string)=>clamp01((t[k]??50)/100);
 return {kinship:f('tradition'),craft:f('innovation'),faith:f('piety'),hospitality:f('generosity'),martial:f('boldness')};
};
const leaderView=(g:Game,team:number):LeaderView|null=>{
 const d=sr(g,team)?.dynasty;if(!d)return null;const t=d.people[d.rulerId]?.ruler?.traits;
 const f=(k:string)=>clamp01((t?.[k]??50)/100);
 return {rulerId:d.rulerId,legitimacy:Math.max(0,Math.min(100,legitimacyOf(g,team)+(peekCivic(g)?.legitimacy[String(team)]??0))),ambition:f('ambition'),caution:f('prudence'),warm:clamp01((f('generosity')+f('mercy'))/2)};
};
function othersAvg(c:CivicState,team:number):Traits|undefined{
 const o=Object.entries(c.identity).filter(([k])=>k!==String(team)).map(([,v])=>v.traits);if(!o.length)return undefined;
 const out={} as Traits;for(const k of Object.keys(o[0]) as (keyof Traits)[])out[k]=Math.round(o.reduce((s,t)=>s+t[k],0)/o.length*100)/100;return out;
}
function buildingCounts(g:Game,team:number){const m:Record<string,number>={};for(const b of g.state.buildings)if(b.team===team&&b.hp>0&&g.finished(b))m[b.type]=(m[b.type]??0)+1;return m;}
const halls=(g:Game,team:number)=>g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&b.hp>0&&g.finished(b));

function startPrehistory(g:Game,c:CivicState){
 if(c.prehistory)return;
 const teams=liveTeams(g).map(t=>({team:t,size:livingPeople(g,t),name:g.tribe(t).name}));
 const p=runPrehistory(seedOf(g),teams);c.prehistory=p;
 for(const s of p.societies){
  const own=c.identity[String(s.team)];if(own)c.identity[String(s.team)]={...own,pride:s.pride};
  const first=s.events[0],last=s.events[s.events.length-1];
  if(first&&s.events.length>1)remember(g,s.team,'war',`before the game: ${last.text} (${last.yearsAgo}y ago)`);
 }
}

/** Year-end review of one society. */
function reviewTeam(g:Game,c:CivicState,team:number){
 const key=String(team),time=g.state.time,pop=livingPeople(g,team),seed=seedOf(g),dyn=sr(g,team)?.dynasty,t=g.tribe(team);
 const hs=halls(g,team),snap=c.snapshot[key],pend=c.pending[key]??{arrivals:0,refugees:0,departures:0};
 let id=c.identity[key]??seedIdentity(seed,team,Math.max(1,pop)),fx=effectsOf(c.institutions[key]);
 const marriages=agreementsOf(g,team).filter(a=>a.kind==='marriage').length;
 const ruler=dyn?.rulerId??'';
 if(snap){
  // arrivals, refugees and departures first, then the generation turning over
  const orig=othersAvg(c,team);
  if(pend.arrivals)id=applyIdentity(id,{kind:'arrival',count:pend.arrivals,pop,origin:orig});
  if(pend.refugees)id=applyIdentity(id,{kind:'refugees',count:pend.refugees,pop,origin:orig});
  if(pend.departures)id=applyIdentity(id,{kind:'departure',count:pend.departures,pop});
  const net=pop-snap.pop-pend.arrivals-pend.refugees+pend.departures;
  id=applyIdentity(id,{kind:'aging',years:1,births:Math.max(0,net),deaths:Math.max(0,-net),pop});
  id={...id,grudges:Math.max(0,Math.round((id.grudges-fx.griefEase)*100)/100)};
  if(marriages>snap.marriages)id=applyIdentity(id,{kind:'family',outsideMarriages:marriages-snap.marriages,pop,origin:orig});
  if(snap.ruler&&ruler&&snap.ruler!==ruler){
   const heir=dyn!.people[ruler],was=dyn!.people[snap.ruler],kin=heir&&was?(heir.parent===was.id?.9:.4):.1,contested=!!heir&&!heir.legit;
   id=applyIdentity(id,{kind:'leadership',legitimacy:legitimacyOf(g,team),contested,kin,leader:leaderTraits(dyn),trained:fx.successionSoftening>0,ritual:fx.identityShield>0});
   if(contested&&fx.successionSoftening>0)id=adjustContinuity(id,.02*fx.successionSoftening*3);
   for(const p of c.proposals[key]??[])if(p.status==='accepted'||p.status==='open'){
    p.inherited=true;if(contested)p.until=time+Math.max(0,(p.until-time)*.4);
   }
   remember(g,team,'succession',`identity kept through the succession (${Math.round(id.continuity*100)}% continuity)`);
  }
  if(fx.identityShield>0){ /* ritual: the core pulls the people back a little harder */ const t2={...id.traits};for(const k of Object.keys(t2) as (keyof Traits)[])t2[k]=Math.round((t2[k]+(id.core[k]-t2[k])*.04*fx.identityShield*3)*100)/100;id={...id,traits:t2};}
 }
 c.identity[key]=id;c.pending[key]={arrivals:0,refugees:0,departures:0};

 // ---- politics
 const comms=(g.state.communities??[]).filter(x=>x.team===team&&x.status!=='abandoned'),home=hs[0]??g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0);
 let far=0;if(home)for(const x of comms){const h=g.state.buildings.find(b=>b.id===x.hall&&b.hp>0);if(h)far=Math.max(far,dist(h,home));}
 const share=id.adopted/Math.max(1,id.native+id.adopted),diversity=clamp01(1.5*share+.12*Math.max(0,hs.length-1)+.3*(1-id.continuity));
 const unrestVal=unrestOf(g,team)?.value??0,legit=legitimacyOf(g,team)+(c.legitimacy[key]??0);
 const power=clamp01(g.tribeFortune(team)/4);
 const prev=c.politics[key],pol=politicsStep(prev,{pop,diversity,distance:far,power,unrest:unrestVal,legitimacy:Math.max(0,Math.min(100,legit))},time,fx.unrestAbsorb);
 c.politics[key]=pol;
 if(prev&&prev.level!==pol.level)remember(g,team,'plan',`government grew more complex: ${pol.level}`);
 if(prev&&prev.stage!==pol.stage){
  const up=['quiet','murmurs','demands','talks','rupture'].indexOf(pol.stage)>['quiet','murmurs','demands','talks','rupture'].indexOf(prev.stage);
  remember(g,team,'plan',`${up?'rising':'easing'} politics (${pol.stage}): ${NEGOTIATION_WARNING[pol.stage]}`);
  if(up&&home&&pol.stage!=='murmurs')lifeEvent(g,team,`${t.name}: ${NEGOTIATION_WARNING[pol.stage]}`,home.x,home.z);
 }

 if(team===0){c.snapshot[key]={pop,ruler,halls:hs.length,marriages};return;}

 // ---- institutions: real upkeep out of the society's own stock
 const list=c.institutions[key]??(c.institutions[key]=[]),cx={pop,complexityLevel:COMPLEXITY.indexOf(pol.level),buildings:buildingCounts(g,team)};
 for(const kind of INSTITUTIONS){
  const have=list.find(i=>i.kind===kind),level=Math.max(1,Math.min(3,cx.complexityLevel-INSTITUTION_RULES[kind].minLevel+1)) as 1|2|3;
  if(!have){
   if(!mayEstablish(kind,cx).ok)continue;
   const inst:Institution={kind,since:time,paidUntil:time,level,lapsed:true},cost=upkeepOf(inst);
   if(canPay({food:t.food,wood:t.wood,stone:t.stone},cost)){t.food-=cost.food;t.wood-=cost.wood;t.stone-=cost.stone;list.push({...inst,lapsed:false,paidUntil:time+90});remember(g,team,'plan',`established a ${kind}: ${INSTITUTION_RULES[kind].note}`);}
   continue;
  }
  const standing=mayEstablish(kind,cx).ok;
  have.level=standing?level:have.level;const cost=upkeepOf(have);
  if(standing&&canPay({food:t.food,wood:t.wood,stone:t.stone},cost)){t.food-=cost.food;t.wood-=cost.wood;t.stone-=cost.stone;if(have.lapsed)remember(g,team,'plan',`the ${kind} resumed`);have.lapsed=false;have.paidUntil=time+90;}
  else if(!have.lapsed){have.lapsed=true;remember(g,team,'plan',`the ${kind} lapsed: ${standing?'it could not be paid for':'its house or numbers are gone'}`);}
 }
 fx=effectsOf(list);

 // ---- proposals and their consequences
 const open=c.proposals[key]??(c.proposals[key]=[]),lv=leaderView(g,team),o=outcomesOf(g,team);
 const reserve=reserveSeconds(g,team);
 for(let i=0;i<open.length;i++){
  let p=open[i];
  if(p.status==='open'){
   if(lv){const r=consentFor(p,lv,{consent:fx.consent,stage:pol.stage},seed,p.id);
    if(r.accepted){p={...p,status:'accepted',until:time+PROPOSAL_RULES.openSeconds*2,base:o?.completed??0};remember(g,team,'plan',`the council accepted: ${p.title}`);}
    else if(time>=p.until)p=settleProposal(p,false,time);
    else p={...p};}
   if(p.status==='declined')remember(g,team,'plan',`the proposal to ${p.title} lapsed unanswered`);
  }else if(p.status==='accepted'){
   const fulfilled=p.kind==='agreement'?agreementsOf(g,team).some(a=>a.kind==='pact'&&a.status!=='lapsed'&&(a.a===p.target||a.b===p.target)):p.kind==='project'?(o?.completed??0)>(p.base??0):reserve>=600&&!breakawaysOf(g,team).some(b=>b.stage==='breakaway'&&!b.resolution);
   const q=settleProposal(p,fulfilled,time);
   if(q.status!==p.status){
    p=q;c.legitimacy[key]=boundLegitimacy((c.legitimacy[key]??0)+p.legitimacyDelta);
    const cur=c.identity[key];if(cur&&p.continuityDelta)c.identity[key]=adjustContinuity(cur,p.continuityDelta);
    remember(g,team,'plan',`${p.status==='kept'?'kept':'broke'} its word${p.inherited?' (inherited from the last ruler)':''}: ${p.title}`);
   }
  }
  open[i]=p;
 }
 if(open.length>CIVIC_CAP)open.splice(0,open.length-CIVIC_CAP);
 if(lv){
  const n=g.state.time,pop2=Math.max(1,pop),cap=Math.max(1,g.popCap(team)),
   warm=g.state.tribes.map((_,j)=>j).find(j=>j!==team&&j!==3&&!!g.tribe(j)?.alive&&(()=>{const r=societyRelation(g,team,j);return r.known&&!r.hostile&&r.trust>=.5;})()&&!agreementsOf(g,team).some(a=>a.kind==='pact'&&a.status!=='lapsed'&&(a.a===j||a.b===j)));
  const prop=propose(lv,{foodSeconds:reserve,housing:pop2/cap,threat:clamp01(t.tension||0),openAgreementTarget:warm,time:n,nextId:c.nextId,stage:pol.stage,outpostsRestive:breakawaysOf(g,team).filter(b=>b.stage!=='loyal'&&!b.resolution).length},open,seed);
  if(prop){c.nextId++;open.push(prop);remember(g,team,'plan',`the ruler proposes to ${prop.title}`);}
 }

 // ---- regional logistics: central requests to distant hearths
 for(const k of Object.keys(c.autonomy)){const v=c.autonomy[k];if(v>0)c.autonomy[k]=Math.max(0,Math.round((v-.02)*100)/100);}
 const views=settlementsOf(g,team);
 if(views.length){
  const need=clamp01(1-reserve/600);
  for(const v of views){
   const share=v.residents/Math.max(1,pop),b=breakawaysOf(g,team).find(x=>x.hall===v.hall),
    out={hall:v.hall,distance:v.distance,residents:v.residents,food:t.food*share,wood:t.wood*share,stone:t.stone*share,foodPerPerson:foodDemand(g,team)/Math.max(1,pop),loyalty:1-(b?.pressure??0),localNeed:clamp01(1-v.selfSufficiency)};
   if(need<=0.2)continue; // the hall asks only when it is in need
   const ans=answerRequest(out,{food:Math.ceil(need*pop*.5),wood:0,stone:0,centralNeed:need},seed,Math.floor(time/90),fx.adminReach),hk=String(v.hall);
   c.answers[hk]={at:time,obeyed:ans.obeyed,willingness:ans.willingness};
   c.autonomy[hk]=Math.max(0,Math.min(1,Math.round(((c.autonomy[hk]??0)+ans.grievance)*100)/100));
   remember(g,team,'plan',`${ans.obeyed?'a far hearth answered the hall\'s request':'a far hearth refused the hall\'s request'} (${ans.why[0]??'its own reasons'})`);
  }
 }
 c.snapshot[key]={pop,ruler,halls:hs.length,marriages};
}
const CIVIC_CAP=PROPOSAL_RULES.maxHistory;

/** M2-14: an inhabited-world start records its bounded prehistory once, on the first rulers tick of a new game, over the REAL start sizes,
 * so the asymmetry disclosure is visible from the opening instead of after the first year. Writes only the civic record and history; no goods. */
export function beginCivic(g:Game){
 if(!decisionsEnabled(g)||peekCivic(g)?.prehistory)return;
 const teams=liveTeams(g);if(!teams.includes(0)||!teams.some(t=>livingPeople(g,t)>0))return;
 const c=ensureCivic(g);if(!c||c.prehistory)return;
 for(const t of teams)if(!c.identity[String(t)])c.identity[String(t)]=seedIdentity(seedOf(g),t,Math.max(1,livingPeople(g,t)));
 startPrehistory(g,c);
}
/** Yearly entry point, called once from advanceRulers after yearlySocieties. */
export function yearlyCivic(g:Game){
 const c=ensureCivic(g);if(!c)return;
 for(const team of liveTeams(g)){
  if(c.reviewAt[String(team)]===Math.floor(g.state.time/90))continue;c.reviewAt[String(team)]=Math.floor(g.state.time/90);
  if(!c.identity[String(team)])c.identity[String(team)]=seedIdentity(seedOf(g),team,Math.max(1,livingPeople(g,team)));
  if(!c.prehistory)startPrehistory(g,c);
  reviewTeam(g,c,team);
 }
}

// ---- read models
export type CivicLine={team:number;name:string;identity:{traits:Traits;pride:number;continuity:number;native:number;adopted:number;last:string};politics:Politics;
 institutions:{kind:string;level:number;lapsed:boolean;note:string}[];proposals:{title:string;kind:string;status:string;inherited:boolean}[];
 outposts:{hall:number;distance:number;localDecisionShare:number;localFloorFood:number;grievance:number;lastRequest?:{obeyed:boolean;willingness:number}}[]};
export type CivicModel={enabled:boolean;prehistory:{lines:string[];societies:{team:number;name:string;size:number;ageYears:number}[]}|null;own:CivicLine|null;societies:CivicLine[];chapter:ReturnType<typeof chapterChain>|null;warnings:string[]};
function lineOf(g:Game,c:CivicState,team:number):CivicLine|null{
 const key=String(team),id=c.identity[key],pol=c.politics[key];if(!id||!pol)return null;
 const views=settlementsOf(g,team);
 return {team,name:g.tribe(team).name,identity:{traits:id.traits,pride:id.pride,continuity:id.continuity,native:id.native,adopted:id.adopted,last:id.last},politics:pol,
  institutions:(c.institutions[key]??[]).map(i=>({kind:i.kind,level:i.level,lapsed:i.lapsed,note:INSTITUTION_RULES[i.kind].note})),
  proposals:(c.proposals[key]??[]).slice(-4).map(p=>({title:p.title,kind:p.kind,status:p.status,inherited:!!p.inherited})),
  outposts:views.map(v=>({hall:v.hall,distance:Math.round(v.distance),localDecisionShare:localDecisionShare(v.distance,effectsOf(c.institutions[key]).adminReach),localFloorFood:localFloor({residents:v.residents,foodPerPerson:foodDemand(g,team)/Math.max(1,livingPeople(g,team))}),grievance:c.autonomy[String(v.hall)]??0,...(c.answers[String(v.hall)]?{lastRequest:{obeyed:c.answers[String(v.hall)].obeyed,willingness:c.answers[String(v.hall)].willingness}}:{})}))};
}
export function chapterInput(g:Game):ChapterInput{
 const teams=liveTeams(g),rivals=teams.filter(t=>t!==0);
 let known=0,routes=0;for(const t of rivals){if(societyRelation(g,0,t).known)known++;}
 for(const r of intelOf(g,0))if(r.via==='route')routes++;
 let exp=0;for(const t of rivals)for(const r of intelOf(g,t).filter(r=>r.subject===0))exp=Math.max(exp,wealthSigns(r));
 const plans=rivals.map(t=>planOf(g,t)).filter(Boolean) as {kind:string}[];
 return {foodSeconds:reserveSeconds(g,0),halls:halls(g,0).length,knownSocieties:known,routes,exposure:exp,independentPlans:plans.length,societies:rivals.length,distinctPlanKinds:new Set(plans.map(p=>p.kind)).size};
}
export function civicModel(g:Game):CivicModel{
 const c=peekCivic(g);if(!c)return {enabled:false,prehistory:null,own:null,societies:[],chapter:null,warnings:[]};
 const names=new Map(liveTeams(g).map(t=>[t,g.tribe(t).name]));
 const pre:Prehistory|undefined=c.prehistory,own=lineOf(g,c,0);
 const societies=liveTeams(g).filter(t=>t!==0&&societyRelation(g,0,t).known).map(t=>lineOf(g,c,t)).filter(Boolean) as CivicLine[];
 const warnings:string[]=[];if(own&&own.politics.stage!=='quiet')warnings.push(NEGOTIATION_WARNING[own.politics.stage]);
 return {enabled:true,prehistory:pre?{lines:pre.disclosure,societies:pre.societies.map(s=>({team:s.team,name:names.get(s.team)??`society ${s.team}`,size:s.size,ageYears:s.ageYears}))}:null,own,societies,chapter:chapterChain(chapterInput(g)),warnings};
}
