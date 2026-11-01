import {hasTaskCommitment} from './workCommitments';
import {isRivalTeam} from './factions';
import {rivalKnows} from './rivalDevelopment';
import type {Game} from './sim';import type {Unit} from './types';
import {isDependent,reserveSeconds} from './settlement';import {craftBenchReady,craftingEffort} from './crafting';
export const COPPER_STUDY_RULES={version:1,copperUnits:8,woodLogs:4,workSeconds:90} as const;
function experimenterFree(g:Game,u:Unit,team:number){return u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.jobLock&&!u.buildOrder&&!u.tributeJourney&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&u.drill==null&&u.carry===0&&!hasTaskCommitment(u,'copperStudy')&&!(u as Unit&{prisoner?:unknown}).prisoner&&['idle','gather','hold'].includes(u.order);}
function copperStudyProposal(g:Game,workplace:number,team=0){
 const b=g.state.buildings.find(b=>b.id===workplace&&b.team===team&&b.type==='workshop'&&g.finished(b));
 if(!b)return {reason:'Finish a crafting shelter for physical copper trials'};
 const t=g.tribe(team);if(t.copperExperiment)return {reason:'A workable copper prototype is already established'};
 const paused=g.state.units.find(u=>u.copperStudy?.paused&&experimenterFree(g,u,team)&&!!g.interactionSpot(u,b));
 if(paused)return {b,u:paused,resuming:true,reason:null};
 if(g.state.units.some(u=>u.team===team&&u.hp>0&&u.copperStudy))return {reason:'The existing experimenter is busy; finish or release their current order before resuming'};
 if(t.copper<COPPER_STUDY_RULES.copperUnits||t.wood<COPPER_STUDY_RULES.woodLogs)return {reason:`Bring ${COPPER_STUDY_RULES.copperUnits} copper and ${COPPER_STUDY_RULES.woodLogs} logs home for one prototype`};
 const u=g.state.units.find(u=>experimenterFree(g,u,team)&&!!g.interactionSpot(u,b));
 if(!u)return {reason:'Need an available adult with empty hands and a clear route to this shelter'};
 return {b,u,resuming:false,reason:null};
}
/** The same feasibility check powers the visible action and the real executor. */
export function copperStudyIssue(g:Game,workplace:number,team=0){return copperStudyProposal(g,workplace,team).reason;}
export function beginCopperStudy(g:Game,workplace:number,team=0){
 const proposal=copperStudyProposal(g,workplace,team);
 if(proposal.reason||!proposal.u||!proposal.b){if(team===0)g.banner(proposal.reason||'No feasible copper experiment',4);return false;}
 const {u,b}=proposal;
 if(proposal.resuming){u.copperStudy!.paused=false;u.copperStudy!.workplace=b.id;u.order='hold';u.workReason='Resuming the paid copper prototype trial';g.workBoard.reset();return true;}
 const t=g.tribe(team);g.interruptMission(u);t.copper-=COPPER_STUDY_RULES.copperUnits;t.wood-=COPPER_STUDY_RULES.woodLogs;
 u.copperStudy={workplace:b.id,progress:0};u.node=null;u.target=null;u.order='hold';u.workReason='Taking prototype materials to the crafting shelter';g.workBoard.reset();return true;
}

export function copperStudyAI(g:Game,u:Unit,dt:number){
 const work=u.copperStudy;if(!work||work.paused)return false;
 const b=g.state.buildings.find(b=>b.id===work.workplace&&b.team===u.team&&b.type==='workshop'&&g.finished(b));
 if(!b){work.paused=true;u.order='idle';return false;}
 if(!g.buildingWorkReached(u,b)){const spot=g.interactionSpot(u,b);if(!spot){work.paused=true;u.order='idle';return false;}u.tx=spot.x;u.tz=spot.z;u.workReason='Taking copper to the crafting shelter';g.steer(u,dt);return true;}
 if(!craftBenchReady(g,u,b))return true;
 work.progress=Math.min(COPPER_STUDY_RULES.workSeconds,work.progress+craftingEffort(u,dt,b));u.vx=0;u.vz=0;u.stride+=dt*5;u.workReason=`Testing a copper tool · ${Math.floor(work.progress/COPPER_STUDY_RULES.workSeconds*100)}%`;
 if(work.progress>=COPPER_STUDY_RULES.workSeconds){g.tribe(u.team).copperExperiment=true;if(u.farmTool!=='ironTools')u.farmTool='copperTools';u.copperStudy=undefined;u.order='idle';g.workBoard.reset();if(u.team===0)g.banner('A workable copper tool! One prototype equips its maker.',6);}
 return true;
}

/** Rivals use known finite ore and actual workers, never a research-income bonus. */
export function developRivalCopper(g:Game,team:number){
 if(!isRivalTeam(team)||reserveSeconds(g,team)<600||g.tribe(team).copperExperiment)return false;
 const b=g.state.buildings.find(b=>b.team===team&&b.type==='workshop'&&g.finished(b));if(!b)return false;
 if(beginCopperStudy(g,b.id,team))return true;
 if(g.tribe(team).copper>=8||g.state.units.some(u=>u.team===team&&u.hp>0&&(u.copperStudy||u.job==='copper'&&u.order==='gather')))return false;
 const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.jobLock&&!u.buildOrder&&!u.plantingWork&&!u.tamingWork&&!u.husbandryWork&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&!u.tributeJourney&&!hasTaskCommitment(u)&&!(u as Unit&{prisoner?:unknown}).prisoner&&u.drill==null&&u.carry===0&&['idle','gather'].includes(u.order));if(!u)return false;
 const n=g.state.copper.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<160&&rivalKnows(g,team,n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))[0];
 if(!n)return false;
 g.interruptMission(u);u.node=n;u.job='copper';u.order='gather';u.tx=n.x;u.tz=n.z;u.workReason='Collecting known copper for workshop trials';g.workBoard.reset();return true;
}
