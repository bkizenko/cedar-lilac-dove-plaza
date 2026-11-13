import type{Game}from'./sim';
import type{Unit}from'./types';
import{isRivalTeam}from'./factions';
import{isDependent,reserveSeconds}from'./settlement';
import{hasTaskCommitment}from'./workCommitments';
import{rivalKnows}from'./rivalDevelopment';
import{methodRecords,methodRecordSources,type MethodSource}from'./methodRecords';
import{METHOD_RECORD_RULES}from'./methodRecordRules';
import{beginProduction,productionIssue,resumeProduction}from'./production';
import{surveyClayForTeam,beginClayGatherForTeam,clayIssueForTeam}from'./pottery';
import{supplyDrops,supplyApproach}from'./campAnchor';

/** Bounded source production, not a new writing/technology unlock or treasury. */
export const RIVAL_METHOD_RECORD_RULES={reviewSeconds:30,readyFoodSeconds:600,recordsPerOrigin:2,npcOriginRecords:16,bankReachMeters:120}as const;
type Review={next:number;reason:string};
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,Review>}>();
const live=(phase:string)=>phase!=='complete'&&phase!=='lost';
function free(g:Game,u:Unit,team:number){return u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia&&!u.prisoner&&u.enslavedFrom===undefined&&!u.jobLock&&!u.emergency&&!u.recalled&&!u.boat&&!u.expedition&&!u.visit&&!u.trade&&!u.envoy&&!u.scout&&!u.foundingJourney&&!u.tributeJourney&&!u.resting&&!u.shelterId&&u.drill==null&&!u.foodRole&&!u.huntOnly&&!hasTaskCommitment(u)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!['capture','occupy'].includes(u.conflictIntent||'')&&(['idle','hold'].includes(u.order)||u.order==='gather'&&['wood','stone'].includes(u.job||''));}
/** Pure diagnostic: no initialization, inspection of foreign rosters or grants. */
export function rivalMethodRecordStatus(g:Game,team:number){const c=reviews.get(g);return c?.state===g.state?c.teams.get(team)?.reason??'Not reviewed':'Not reviewed';}
export function reviewRivalMethodRecords(g:Game,team:number):boolean{
 if(!isRivalTeam(team)||!g.tribe(team)?.alive)return false;
 let c=reviews.get(g);if(!c||c.state!==g.state){c={state:g.state,teams:new Map()};reviews.set(g,c);}const old=c.teams.get(team);if(old&&g.state.time<old.next)return false;const entry={next:g.state.time+RIVAL_METHOD_RECORD_RULES.reviewSeconds,reason:''};c.teams.set(team,entry);const no=(reason:string)=>{entry.reason=reason;return false;};
 if(reserveSeconds(g,team)<RIVAL_METHOD_RECORD_RULES.readyFoodSeconds)return no('Ready food reserves are below the existing safe-work target');
 // Retained paid work owns its original materials and maker/carrier. New-record
 // quotas must never strand it, and manual pauses remain an explicit choice.
 const paid=g.state.production?.projects.find(p=>p.team===team&&live(p.phase)&&p.methodRecordWork?.kind==='author');
 if(paid){
  if(!['paused','stored'].includes(paid.phase))return no('An actual paid record is already being written or returned');
  if(paid.pauseCause==='manual')return no('The actual paid record is manually paused');
  if(!resumeProduction(g,paid.id))return no('The same paid record is waiting for its original maker or physical carrier');
  entry.reason='The same paid record resumed with its original maker or physical carrier';return true;
 }
 const records=methodRecords(g),pending=(g.state.production?.projects||[]).filter(p=>live(p.phase)&&p.methodRecordWork?.kind==='author'&&p.methodRecordAssetId===undefined),sources=[...records.map(r=>r.source),...pending.flatMap(p=>p.methodRecordWork?.kind==='author'?[p.methodRecordWork.source]:[])];
 if(records.length+pending.length>=METHOD_RECORD_RULES.maximumRecords)return no('Physical method-record capacity is full');
 if(sources.filter(s=>isRivalTeam(s.team)).length>=RIVAL_METHOD_RECORD_RULES.npcOriginRecords)return no('NPC-origin method-record capacity is full');
 if(sources.filter(s=>s.team===team).length>=RIVAL_METHOD_RECORD_RULES.recordsPerOrigin)return no('This community already supplied its bounded records');
 const kilns=g.state.buildings.filter(b=>b.team===team&&b.type==='kiln'&&g.finished(b)&&!b.plannedCost);if(!kilns.length)return no('No actual finished kiln for a fired record');
 if(!g.state.buildings.some(b=>b.team===team&&b.type==='hearth'&&g.finished(b)&&!b.plannedCost))return no('No actual finished household hearth');
 const people=g.state.units.filter(u=>free(g,u,team)).sort((a,b)=>a.id-b.id),choices:{person:Unit;source:MethodSource}[]=[];
 for(const person of people)for(const source of methodRecordSources(g,person))if(!sources.some(s=>s.team===team&&s.recipe===source.recipe))choices.push({person,source});
 if(!choices.length)return no('No free artisan with three actual successful deliveries of an unrecorded method');
 const t=g.tribe(team);if(t.wood<METHOD_RECORD_RULES.wood)return no('No delivered wood for firing the record');
 if((t.items?.clay||0)<METHOD_RECORD_RULES.clay){
  if(g.state.units.some(u=>u.team===team&&u.hp>0&&u.clayWork))return no('The same finite clay load is still being dug or carried');
  for(const u of people){
   if(!supplyDrops(g,team).some(d=>!!supplyApproach(g,u,d)))continue;
   surveyClayForTeam(g,team,u.id,p=>rivalKnows(g,team,p.x,p.z));
   const deposits=(g.state.clay?.deposits||[]).filter(d=>d.surveyedBy.includes(team)&&kilns.some(k=>Math.hypot(k.x-d.x,k.z-d.z)<=RIVAL_METHOD_RECORD_RULES.bankReachMeters)&&!clayIssueForTeam(g,team,u.id,d.id)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
   for(const d of deposits)if(beginClayGatherForTeam(g,team,u.id,d.id)){entry.reason='A real worker is digging and returning finite local clay';return true;}
  }
  return no('No nearby known reachable freshwater clay bank with a free digger');
 }
 for(const choice of choices)for(const kiln of kilns){const work={kind:'author' as const,source:choice.source};if(productionIssue(g,'authorCordageRecord',kiln.id,choice.person.id,false,work))continue;if(beginProduction(g,'authorCordageRecord',kiln.id,choice.person.id,false,work)){entry.reason='Qualified artisan is physically writing and returning a paid method record';return true;}}
 return no('Actual kiln slot, original artisan, material cache or route is unavailable');
}
