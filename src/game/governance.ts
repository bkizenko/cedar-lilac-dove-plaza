/** Governance: government types, policies and governors. Data-driven and pure (tables + derivations); the Game wiring is at the bottom.
 * Nothing here creates goods: effects are time multipliers on existing work, damage, legitimacy and tax-burden inputs that the
 * economy, combat and unrest code already read. Government types unlock from the Bronze Age by population (the Stone Age has only the band council).
 * The tables and `governmentFor`/`governanceEffects` take plain numbers so rival civs can reuse them. State per society lives in `state.governance`. */
import type {Game} from './sim';
import type {Cost} from './types';
import {AGES} from './constants';
import {entryMastery} from './skills';
import {recordPractice,skillsEnabled,unitRecord} from './skillRuntime';

export type GovId='bandCouncil'|'chiefdom'|'theocracy'|'monarchy'|'oligarchy'|'republic';
export type PolicyId='corvee'|'harvestLevy'|'warBand'|'festivals'|'lawCode'|'granaryDole'|'masonGuild';
export const BRONZE_AGE=AGES.indexOf('Bronze'),IRON_AGE=AGES.indexOf('Iron');
export type JobMul={food:number;wood:number;stone:number};
/** Time multipliers (below 1 = faster work). legitimacy is points added to the ruling house's standing; tax is unrest tax-burden points. */
export type Effects={jobTime:JobMul;dmg:number;legitimacy:number;tax:number};
export type GovDef={id:GovId;label:string;minAge:number;minPop:number;slots:number;governors:number;cost:Cost;note:string;effects:Partial<Effects>};
export type PolicyDef={id:PolicyId;label:string;minAge:number;minPop:number;needsGov:GovId[];cost:Cost;note:string;effects:Partial<Effects>};
export const GOVERNMENTS:readonly GovDef[]=[
 {id:'bandCouncil',label:'Band council',minAge:0,minPop:0,slots:1,governors:0,cost:{},note:'Everyone has a say; nothing is delegated.',effects:{}},
 {id:'chiefdom',label:'Chiefdom',minAge:BRONZE_AGE,minPop:18,slots:2,governors:1,cost:{food:60,wood:40},note:'A chief and one trusted governor; ranked kin.',effects:{legitimacy:4}},
 {id:'theocracy',label:'Temple rule',minAge:BRONZE_AGE,minPop:30,slots:2,governors:1,cost:{food:80,stone:50},note:'Priests carry the law; steadier people, slower levies.',effects:{legitimacy:10,tax:-6,jobTime:{food:1,wood:1.03,stone:1.03}}},
 {id:'monarchy',label:'Monarchy',minAge:BRONZE_AGE,minPop:45,slots:3,governors:2,cost:{food:120,wood:80,stone:60},note:'One crown, appointed governors; strong levies and war host.',effects:{legitimacy:6,dmg:1.04}},
 {id:'oligarchy',label:'Oligarchy',minAge:IRON_AGE,minPop:60,slots:3,governors:3,cost:{food:150,wood:100,stone:100},note:'A council of wealthy houses; efficient works, resented taxes.',effects:{tax:8,jobTime:{food:1,wood:.97,stone:.97}}},
 {id:'republic',label:'Republic',minAge:IRON_AGE,minPop:90,slots:4,governors:3,cost:{food:200,wood:120,stone:120},note:'Elected officers and law; high standing, costly war.',effects:{legitimacy:12,tax:-4,dmg:.98}},
];
export const POLICIES:readonly PolicyDef[]=[
 {id:'harvestLevy',label:'Harvest levy',minAge:BRONZE_AGE,minPop:18,needsGov:[],cost:{food:20},note:'Shared harvest labour: food work 7% faster, tax burden up.',effects:{jobTime:{food:.93,wood:1,stone:1},tax:12}},
 {id:'corvee',label:'Corvee labour',minAge:BRONZE_AGE,minPop:25,needsGov:['chiefdom','monarchy','oligarchy','theocracy'],cost:{food:30},note:'Timber and stone gangs 9% faster; people resent it.',effects:{jobTime:{food:1,wood:.91,stone:.91},tax:18}},
 {id:'festivals',label:'Seasonal festivals',minAge:BRONZE_AGE,minPop:18,needsGov:[],cost:{food:40},note:'Feasts bind the people: standing up, tax burden down, work a little slower.',effects:{legitimacy:6,tax:-12,jobTime:{food:1.03,wood:1.03,stone:1.03}}},
 {id:'warBand',label:'War band',minAge:BRONZE_AGE,minPop:25,needsGov:['chiefdom','monarchy','oligarchy','theocracy'],cost:{food:30,wood:20},note:'Standing warriors: 6% more damage dealt, tax burden up.',effects:{dmg:1.06,tax:8}},
 {id:'granaryDole',label:'Granary dole',minAge:BRONZE_AGE,minPop:30,needsGov:['chiefdom','monarchy','theocracy','republic'],cost:{food:50},note:'A public ration: tax burden down, standing up.',effects:{legitimacy:4,tax:-10}},
 {id:'masonGuild',label:'Mason guild',minAge:BRONZE_AGE,minPop:40,needsGov:['monarchy','oligarchy','republic'],cost:{wood:30,stone:30},note:'Organised quarrying: stone work 10% faster.',effects:{jobTime:{food:1,wood:1,stone:.9}}},
 {id:'lawCode',label:'Law code',minAge:IRON_AGE,minPop:50,needsGov:['monarchy','oligarchy','republic'],cost:{food:60,stone:40},note:'Written rules: standing up, tax burden slightly down.',effects:{legitimacy:8,tax:-4}},
];
export const GOVERNANCE_RULES={changeCooldownSeconds:540,governorAdultYears:18,governorMaxLocalBonus:.06,governorLegitimacy:3,governorTax:-6,governorRadius:90,practiceRate:.5,baseQuality:.4} as const;
export const govDef=(id:string):GovDef|undefined=>GOVERNMENTS.find(g=>g.id===id);
export const policyDef=(id:string):PolicyDef|undefined=>POLICIES.find(p=>p.id===id);
/** Government types a society of this age and population may adopt (band council always). Pure: reusable by AI civs. */
export const governmentsAvailable=(age:number,pop:number):GovDef[]=>GOVERNMENTS.filter(g=>age>=g.minAge&&pop>=g.minPop);
/** The most developed government a society qualifies for (last in the table order by population/age rank). */
export function governmentFor(age:number,pop:number):GovDef{const a=governmentsAvailable(age,pop);return a.reduce((b,g)=>g.minPop>=b.minPop?g:b,a[0]);}
export const policiesAvailable=(gov:GovId,age:number,pop:number):PolicyDef[]=>POLICIES.filter(p=>age>=p.minAge&&pop>=p.minPop&&(!p.needsGov.length||p.needsGov.includes(gov)));
const NEUTRAL=():Effects=>({jobTime:{food:1,wood:1,stone:1},dmg:1,legitimacy:0,tax:0});
export function addEffects(a:Effects,e:Partial<Effects>):Effects{
 return {jobTime:{food:a.jobTime.food*(e.jobTime?.food??1),wood:a.jobTime.wood*(e.jobTime?.wood??1),stone:a.jobTime.stone*(e.jobTime?.stone??1)},dmg:a.dmg*(e.dmg??1),legitimacy:a.legitimacy+(e.legitimacy??0),tax:a.tax+(e.tax??0)};
}
/** Total effect of a government, its adopted policies (only those still allowed) and governor qualities (0..1 each). Pure. */
export function governanceEffects(gov:string,policies:readonly string[],governorQuality:readonly number[],age=99,pop=999):Effects{
 const d=govDef(gov)??GOVERNMENTS[0];let e=addEffects(NEUTRAL(),d.effects);
 for(const id of policies.slice(0,d.slots)){const p=policyDef(id);if(p&&policiesAvailable(d.id,age,pop).some(x=>x.id===p.id))e=addEffects(e,p.effects);}
 const q=Math.min(d.governors,governorQuality.length);for(const x of governorQuality.slice(0,q)){e.legitimacy+=GOVERNANCE_RULES.governorLegitimacy*x;e.tax+=GOVERNANCE_RULES.governorTax*x;}
 return e;
}

/* ---------- persisted state ---------- */
export type TeamGovernance={gov:GovId;since:number;changed:number;policies:PolicyId[];/** town hall building id -> governor unit id */governors:Record<string,number>};
export type GovernanceState=Record<string,TeamGovernance>;
type S={governance?:GovernanceState;age:number;time:number;units:{id:number;team:number;hp:number;type:string;ageT:number;parents?:unknown[];x:number;z:number}[];buildings:{id:number;type:string;team:number;x:number;z:number;hp:number}[]};
const st=(g:Game)=>g.state as unknown as S;
export const defaultTeamGovernance=():TeamGovernance=>({gov:'bandCouncil',since:0,changed:-1e9,policies:[],governors:{}});
/** Validate saved governance; unknown ids are dropped, never fatal (old saves simply have none). */
export function sanitizeGovernance(v:unknown):GovernanceState|undefined{
 if(!v||typeof v!=='object'||Array.isArray(v))return undefined;const out:GovernanceState={};
 for(const [k,raw] of Object.entries(v as Record<string,unknown>)){
  if(!/^\d{1,3}$/.test(k)||!raw||typeof raw!=='object')continue;const r=raw as Partial<TeamGovernance>,def=govDef(String(r.gov))?.id??'bandCouncil';
  const pol=Array.isArray(r.policies)?[...new Set(r.policies.filter(p=>typeof p==='string'&&!!policyDef(p)))].slice(0,6) as PolicyId[]:[];
  const gv:Record<string,number>={};if(r.governors&&typeof r.governors==='object')for(const [h,u] of Object.entries(r.governors))if(/^\d+$/.test(h)&&Number.isSafeInteger(u))gv[h]=u as number;
  out[k]={gov:def,since:Number.isFinite(r.since)?r.since as number:0,changed:Number.isFinite(r.changed)?r.changed as number:-1e9,policies:pol,governors:gv};
 }
 return out;
}
export const governanceOf=(g:Game,team:number):TeamGovernance=>st(g).governance?.[String(team)]??defaultTeamGovernance();
function ensure(g:Game,team:number):TeamGovernance{const s=st(g);s.governance??={};return s.governance[String(team)]??=defaultTeamGovernance();}
const popOf=(g:Game,team:number)=>g.popNow(team);
const unitAdult=(u:{ageT:number;parents?:unknown[]})=>u.ageT/1800+(u.parents?14:0)>=GOVERNANCE_RULES.governorAdultYears;
/** Governor quality 0..1 from 'leading' mastery when the skill model is on, else a modest baseline. */
export function governorQuality(g:Game,unitId:number):number{
 const u=g.state.units.find(x=>x.id===unitId);if(!u||u.hp<=0)return 0;
 if(!skillsEnabled(g))return GOVERNANCE_RULES.baseQuality;const r=unitRecord(u);
 return Math.min(1,GOVERNANCE_RULES.baseQuality*.6+(r?entryMastery(r,'leading'):0)*.7);
}
/** Governors still alive, adult and attached to one of the team's finished town halls. */
export function activeGovernors(g:Game,team:number):{hall:number;unit:number;quality:number}[]{
 const gv=governanceOf(g,team),d=govDef(gv.gov),s=st(g),out:{hall:number;unit:number;quality:number}[]=[];
 for(const [h,uid] of Object.entries(gv.governors)){
  const hall=s.buildings.find(b=>b.id===Number(h)&&b.type==='townhall'&&b.team===team&&b.hp>0),u=s.units.find(x=>x.id===uid&&x.team===team&&x.hp>0);
  if(hall&&u&&unitAdult(u)&&out.length<(d?.governors??0))out.push({hall:hall.id,unit:uid,quality:governorQuality(g,uid)});
 }
 return out;
}
export function teamEffects(g:Game,team:number):Effects{const gv=governanceOf(g,team);return governanceEffects(gv.gov,gv.policies,activeGovernors(g,team).map(x=>x.quality),g.state.age,popOf(g,team));}
/** Time multiplier for one unit's gathering job from government, policies and a nearby governor. 1 for societies with no governance state. */
export function governanceJobMul(g:Game,u:{team:number;x:number;z:number},job:string):number{
 if(!st(g).governance?.[String(u.team)])return 1;
 const e=teamEffects(g,u.team);let m=job==='food'?e.jobTime.food:job==='wood'?e.jobTime.wood:job==='stone'?e.jobTime.stone:1;
 for(const gov of activeGovernors(g,u.team)){const h=st(g).buildings.find(b=>b.id===gov.hall);if(h&&Math.hypot(h.x-u.x,h.z-u.z)<=GOVERNANCE_RULES.governorRadius){m*=1-GOVERNANCE_RULES.governorMaxLocalBonus*gov.quality;break;}}
 return m;
}
export const governanceDmgMul=(g:Game,team:number):number=>st(g).governance?.[String(team)]?teamEffects(g,team).dmg:1;
/** Unrest inputs from governance: legitimacy points and tax burden (0 when no state). */
export const governanceUnrest=(g:Game,team:number):{legitimacy:number;tax:number}=>{if(!st(g).governance?.[String(team)])return{legitimacy:0,tax:0};const e=teamEffects(g,team);return{legitimacy:e.legitimacy,tax:e.tax};};

/* ---------- commands ---------- */
export type GovResult={ok:boolean;reason:string};
const no=(reason:string):GovResult=>({ok:false,reason}),yes=(reason:string):GovResult=>({ok:true,reason});
const costText=(c:Cost)=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`${v} ${k}`).join(', ')||'free';
export function adoptGovernment(g:Game,team:number,id:string):GovResult{
 const d=govDef(id);if(!d)return no('Unknown government');const gv=ensure(g,team);if(gv.gov===d.id)return no('Already your government');
 const age=st(g).age,pop=popOf(g,team);
 if(age<d.minAge)return no(`${d.label} needs the ${AGES[d.minAge]} Age`);if(pop<d.minPop)return no(`${d.label} needs ${d.minPop} people (you have ${pop})`);
 if(st(g).time-gv.changed<GOVERNANCE_RULES.changeCooldownSeconds&&gv.changed>-1e8)return no('The people need time to settle after the last change');
 if(!g.canAfford(team,d.cost))return no(`${d.label} costs ${costText(d.cost)}`);
 g.spend(team,d.cost);gv.gov=d.id;gv.changed=st(g).time;gv.since=st(g).time;
 gv.policies=gv.policies.filter(p=>policiesAvailable(d.id,age,pop).some(x=>x.id===p)).slice(0,d.slots);
 const keep=Object.entries(gv.governors).slice(0,d.governors);gv.governors=Object.fromEntries(keep);
 return yes(`The people now live under ${d.label.toLowerCase()}`);
}
export function setPolicy(g:Game,team:number,id:string,on:boolean):GovResult{
 const p=policyDef(id);if(!p)return no('Unknown policy');const gv=ensure(g,team),d=govDef(gv.gov)!,has=gv.policies.includes(p.id);
 if(!on){if(!has)return no('Not in force');gv.policies=gv.policies.filter(x=>x!==p.id);return yes(`${p.label} ended`);}
 if(has)return no('Already in force');if(gv.policies.length>=d.slots)return no(`${d.label} can hold ${d.slots} polic${d.slots===1?'y':'ies'}`);
 if(!policiesAvailable(d.id,st(g).age,popOf(g,team)).some(x=>x.id===p.id))return no(`${p.label} is not open to a ${d.label.toLowerCase()} of this size and age`);
 if(!g.canAfford(team,p.cost))return no(`${p.label} costs ${costText(p.cost)}`);g.spend(team,p.cost);gv.policies.push(p.id);return yes(`${p.label} proclaimed`);
}
export function appointGovernor(g:Game,team:number,hallId:number,unitId:number):GovResult{
 const gv=ensure(g,team),d=govDef(gv.gov)!;if(!d.governors)return no(`A ${d.label.toLowerCase()} appoints no governors`);
 const hall=st(g).buildings.find(b=>b.id===hallId&&b.type==='townhall'&&b.team===team&&b.hp>0&&g.finished(b as never));if(!hall)return no('That is not one of your town halls');
 const u=st(g).units.find(x=>x.id===unitId&&x.team===team&&x.hp>0&&x.type!=='leader');if(!u)return no('That person cannot govern');if(!unitAdult(u))return no('A governor must be an adult');
 const others=Object.entries(gv.governors).filter(([h,id])=>h!==String(hallId)&&id!==unitId);
 if(Object.values(gv.governors).includes(unitId)&&gv.governors[String(hallId)]!==unitId)return no('Already governing another settlement');
 if(!(String(hallId) in gv.governors)&&others.length>=d.governors)return no(`A ${d.label.toLowerCase()} has ${d.governors} governor${d.governors===1?'':'s'}`);
 gv.governors[String(hallId)]=unitId;return yes('Governor appointed');
}
export function dismissGovernor(g:Game,team:number,hallId:number):GovResult{const gv=ensure(g,team);if(!(String(hallId) in gv.governors))return no('No governor there');delete gv.governors[String(hallId)];return yes('Governor released');}
/** Governors practise leading while they hold office (skill gain, no goods). One cheap call from Game.step. */
export function advanceGovernance(g:Game,dt:number){
 const gov=st(g).governance?.['0'];if(!gov||!Object.keys(gov.governors).length||!skillsEnabled(g))return;
 for(const a of activeGovernors(g,0)){const u=g.state.units.find(x=>x.id===a.unit);if(u)recordPractice(g,u,'leading',dt*GOVERNANCE_RULES.practiceRate);}
}
/** Read model for the UI. */
export function governanceModel(g:Game,team=0){
 const gv=governanceOf(g,team),age=st(g).age,pop=popOf(g,team),d=govDef(gv.gov)!,cooling=Math.max(0,GOVERNANCE_RULES.changeCooldownSeconds-(st(g).time-gv.changed));
 const halls=st(g).buildings.filter(b=>b.type==='townhall'&&b.team===team&&b.hp>0&&g.finished(b as never)).map(b=>b.id),act=activeGovernors(g,team);
 const adults=st(g).units.filter(u=>u.team===team&&u.hp>0&&u.type!=='leader'&&unitAdult(u)).slice(0,60).map(u=>({id:u.id,quality:Math.round(governorQuality(g,u.id)*100)}));
 return {gov:d.id,label:d.label,note:d.note,pop,age:AGES[age],slots:d.slots,maxGovernors:d.governors,cooldown:Math.ceil(cooling),effects:teamEffects(g,team),
  governments:GOVERNMENTS.map(x=>({id:x.id,label:x.label,note:x.note,cost:costText(x.cost),minPop:x.minPop,minAge:AGES[x.minAge],open:age>=x.minAge&&pop>=x.minPop,current:x.id===gv.gov})),
  policies:POLICIES.map(p=>({id:p.id,label:p.label,note:p.note,cost:costText(p.cost),open:policiesAvailable(d.id,age,pop).some(x=>x.id===p.id),on:gv.policies.includes(p.id)})),
  halls:halls.map(h=>({hall:h,governor:act.find(a=>a.hall===h)?.unit??null,quality:Math.round((act.find(a=>a.hall===h)?.quality??0)*100)})),candidates:adults};
}
export type GovernanceModel=ReturnType<typeof governanceModel>;
