import {releaseTreeWorker} from './workAllocation';
import{copperHelperWork,beginCopperHelper,PRACTICAL_HELPER_RULES}from'./practicalHelpers';
import {hasTaskCommitment} from './workCommitments';
import {isRivalTeam} from './factions';
import {rivalKnows} from './rivalDevelopment';
import type {Game} from './sim';import type {GameState,Unit} from './types';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {workRuntime} from './workRuntime';import type {JobCoordinator} from './jobCoordinator';
import {isDependent,reserveSeconds} from './settlement';import {craftBenchReady,craftingEffort} from './crafting';
export const COPPER_STUDY_RULES={version:1,copperUnits:8,woodLogs:4,charcoalUnits:2,workSeconds:90} as const;
export type CopperFuel='logs'|'charcoal';
export type CopperStudy={workplace:number;progress:number;paused?:boolean;version?:1;team?:number;fuel?:CopperFuel;phase?:'loading'|'carrying'|'working';started?:number;paid?:{copper:number;wood:number;charcoal:number}};
export type CopperTrials={version:1;started:number;paid:number;completed:number;lost:number;workSeconds:number;copperAllocated:number;woodAllocated:number;charcoalAllocated:number;copperLost:number;woodLost:number;charcoalLost:number};
const ledger=(g:Game):CopperTrials=>g.state.copperTrials??={version:1,started:0,paid:0,completed:0,lost:0,workSeconds:0,copperAllocated:0,woodAllocated:0,charcoalAllocated:0,copperLost:0,woodLost:0,charcoalLost:0};
const tracked=new WeakMap<Game,{state:GameState;people:Set<Unit>}>();
const owners=(g:Game)=>{let c=tracked.get(g);if(!c||c.state!==g.state){c={state:g.state,people:new Set(g.state.units.filter(u=>!!u.copperStudy))};tracked.set(g,c);}return c.people;};
const jobId=(u:Unit)=>`craft:copper-study:${u.id}`;
function claimCopperStudy(g:Game,u:Unit,jobs=workRuntime(g)){const w=u.copperStudy;if(!w||w.paused||u.hp<=0)return false;const id=jobId(u);owners(g).add(u);if(jobs.activeJob(u.id)?.id===id)return true;if(!jobs.job(id))jobs.propose({id,kind:'craft:copper-study',owner:u.team,actors:[u.id],target:w.workplace});const ok=jobs.job(id)?.phase==='suspended'?jobs.resume(id,[u.id]):jobs.reserve(id);if(ok)jobs.retarget(id,w.workplace);return !!ok;}
function releaseCopperStudy(g:Game,u:Unit,complete=false){const jobs=workRuntime(g);if(complete){jobs.finish(jobId(u));jobs.forget(jobId(u));owners(g).delete(u);}else jobs.suspend(jobId(u),'Paid prototype paused; its material remains with its maker');}
export function rebuildCopperStudyOwnership(g:Game,jobs:JobCoordinator){for(const u of g.state.units)if(u.copperStudy){owners(g).add(u);if(!u.copperStudy.paused&&u.hp>0)claimCopperStudy(g,u,jobs);}}
export function pauseCopperStudy(g:Game,u:Unit){if(!u.copperStudy)return false;u.copperStudy.paused=true;releaseCopperStudy(g,u);return true;}
export function copperStudyHeld(u:Unit){const w=u.copperStudy;if(w?.version!==1||!w.paid)return{copper:0,wood:0,charcoal:0};const remaining=Math.max(0,1-w.progress/COPPER_STUDY_RULES.workSeconds);return{copper:w.paid.copper,wood:w.paid.wood*remaining,charcoal:w.paid.charcoal*remaining};}
export function tickCopperStudies(g:Game){const set=owners(g);if(!set.size)return;for(const u of set){const w=u.copperStudy;if(!w){releaseCopperStudy(g,u,true);continue;}if(u.hp<=0||!g.state.units.includes(u)){if(w.version===1){const m=ledger(g),held=copperStudyHeld(u);m.lost++;m.copperLost+=held.copper;m.woodLost+=held.wood;m.charcoalLost+=held.charcoal;}releaseCopperStudy(g,u,true);delete u.copperStudy;continue;}if(w.paused||w.version===1&&(u.team!==w.team||u.prisoner||u.enslavedFrom!==undefined)){w.paused=true;releaseCopperStudy(g,u);}}}
const cacheFor=(g:Game,u:Unit)=>supplyDrops(g,u.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).filter(p=>p.spot).sort((a,b)=>Math.hypot(u.x-a.spot!.x,u.z-a.spot!.z)-Math.hypot(u.x-b.spot!.x,u.z-b.spot!.z))[0];
function experimenterFree(g:Game,u:Unit,team:number,resuming=false){return u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&(resuming||!u.copperStudy)&&(resuming||!u.jobLock)&&!u.buildOrder&&!u.tributeJourney&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&!u.boat&&!u.resting&&!u.shelterId&&u.drill==null&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!hasTaskCommitment(u,'copperStudy')&&!u.prisoner&&u.enslavedFrom===undefined&&(resuming||!u.farmTool&&u.farmToolCargoId===undefined)&&['idle','gather','hold'].includes(u.order);}
const enough=(g:Game,team:number,fuel:CopperFuel)=>{const t=g.tribe(team);return t.copper>=COPPER_STUDY_RULES.copperUnits&&(fuel==='charcoal'?(t.items?.charcoal||0)>=COPPER_STUDY_RULES.charcoalUnits:t.wood>=COPPER_STUDY_RULES.woodLogs);};
function copperStudyProposal(g:Game,workplace:number,team=0,fuel:CopperFuel='logs'){
 const b=g.state.buildings.find(b=>b.id===workplace&&b.team===team&&b.type==='workshop'&&g.finished(b));if(!b)return{reason:'Finish a crafting shelter for physical copper trials'};
 const t=g.tribe(team);if(t.copperExperiment)return{reason:'A workable copper prototype is already established'};
 const paused=g.state.units.find(u=>u.copperStudy?.paused&&(u.copperStudy.version!==1||u.copperStudy.team===team)&&experimenterFree(g,u,team,true)&&!!g.interactionSpot(u,b));if(paused)return{b,u:paused,resuming:true,reason:null};
 if(g.state.units.some(u=>u.team===team&&u.hp>0&&u.copperStudy&&(u.copperStudy.version!==1||u.copperStudy.team===team)))return{reason:'The existing experimenter is busy; resume their original trial'};
 if(!['logs','charcoal'].includes(fuel)||!enough(g,team,fuel))return{reason:`Bring ${COPPER_STUDY_RULES.copperUnits} copper and ${fuel==='charcoal'?COPPER_STUDY_RULES.charcoalUnits+' charcoal':COPPER_STUDY_RULES.woodLogs+' logs'} home for one prototype`};
 const u=g.state.units.filter(u=>experimenterFree(g,u,team)).sort((a,c)=>Number(c.selected)-Number(a.selected)||Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z)).find(u=>!!g.interactionSpot(u,b)&&!!cacheFor(g,u));if(!u)return{reason:'Need an available adult without tools, empty cargo and routes to storage and shelter'};return{b,u,resuming:false,reason:null};
}
/** The same physical proposal powers the authoritative action and executor. */
export function copperStudyIssue(g:Game,workplace:number,team=0,fuel:CopperFuel='logs'){return copperStudyProposal(g,workplace,team,fuel).reason;}
function loadCopperStudy(g:Game,u:Unit){const w=u.copperStudy;if(w?.version!==1||w.phase!=='loading'||w.paid)return false;const cache=cacheFor(g,u);if(!cache?.spot||!supplyReached(g,u,cache.drop,cache.spot)||!enough(g,u.team,w.fuel!))return false;
 const t=g.tribe(u.team),paid={copper:COPPER_STUDY_RULES.copperUnits,wood:w.fuel==='logs'?COPPER_STUDY_RULES.woodLogs:0,charcoal:w.fuel==='charcoal'?COPPER_STUDY_RULES.charcoalUnits:0};t.copper-=paid.copper;t.wood-=paid.wood;if(paid.charcoal)t.items!.charcoal!-=paid.charcoal;w.paid=paid;w.phase='carrying';const m=ledger(g);m.paid++;m.copperAllocated+=paid.copper;m.woodAllocated+=paid.wood;m.charcoalAllocated+=paid.charcoal;return true;
}
export function beginCopperStudy(g:Game,workplace:number,team=0,fuel:CopperFuel='logs'){
 const p=copperStudyProposal(g,workplace,team,fuel);if(p.reason||!p.u||!p.b){if(team===0)g.banner(p.reason||'No feasible copper experiment',4);return false;}const{u,b}=p;
 if(p.resuming){const w=u.copperStudy!;releaseTreeWorker(g,u);g.interruptMission(u);w.paused=false;w.workplace=b.id;if(!claimCopperStudy(g,u)){w.paused=true;return false;}u.order='hold';u.node=null;u.target=null;u.workReason='Resuming the original copper trial; no materials charged again';g.workBoard.reset();return true;}
 releaseTreeWorker(g,u);g.interruptMission(u);u.copperStudy={workplace:b.id,progress:0,version:1,team,fuel,phase:'loading',started:g.state.time};if(!claimCopperStudy(g,u)){delete u.copperStudy;return false;}ledger(g).started++;u.node=null;u.target=null;u.order='hold';u.workReason='Walking to load copper prototype materials at storage';loadCopperStudy(g,u);g.workBoard.reset();return true;
}
export function copperStudyAI(g:Game,u:Unit,dt:number){
 const w=u.copperStudy;if(!w||w.paused)return false;
 if(u.hp<=0||u.type!=='worker'||u.militia||u.prisoner||u.enslavedFrom!==undefined||w.version===1&&u.team!==w.team){pauseCopperStudy(g,u);return false;}
 if(!claimCopperStudy(g,u)){u.workReason='Copper trial waits for its original worker reservation';return true;}
 const b=g.state.buildings.find(b=>b.id===w.workplace&&b.team===u.team&&b.type==='workshop'&&g.finished(b));if(!b){pauseCopperStudy(g,u);u.order='idle';return false;}
 if(w.version===1&&w.phase==='loading'){const cache=cacheFor(g,u);if(!cache?.spot){u.workReason='Copper trial waits for a reachable cache; no materials withdrawn';return true;}workRuntime(g).transition(jobId(u),'traveling',w.progress);u.tx=cache.spot.x;u.tz=cache.spot.z;u.order='return';if(supplyReached(g,u,cache.drop,cache.spot)){if(!loadCopperStudy(g,u))u.workReason='Copper trial waits for its finite inputs at storage';else u.order='hold';}else g.steer(u,dt);return true;}
 u.order='hold';if(!g.buildingWorkReached(u,b)){const spot=g.interactionSpot(u,b);if(!spot){pauseCopperStudy(g,u);u.order='idle';return false;}workRuntime(g).transition(jobId(u),'traveling',w.progress);u.tx=spot.x;u.tz=spot.z;u.workReason='Carrying the original copper and fuel to the crafting shelter';g.steer(u,dt);return true;}
 if(u.farmTool||u.farmToolCargoId!==undefined){u.workReason='Put away the existing tool before equipping this paid prototype';pauseCopperStudy(g,u);return false;}
 if(!craftBenchReady(g,u,b))return true;if(w.version===1)w.phase='working';
 const remaining=COPPER_STUDY_RULES.workSeconds-w.progress,own=Math.min(remaining,craftingEffort(u,dt,b)),help=copperHelperWork(g,u,b,dt,remaining-own),work=own+help;w.progress+=work;workRuntime(g).transition(jobId(u),'working',w.progress);if(w.version===1)ledger(g).workSeconds+=work;u.vx=u.vz=0;u.stride+=dt*5;u.workReason=`Testing a copper tool · ${Math.floor(w.progress/COPPER_STUDY_RULES.workSeconds*100)}%`;
 if(w.progress>=COPPER_STUDY_RULES.workSeconds){g.tribe(u.team).copperExperiment=true;u.farmTool='copperTools';u.farmToolCondition=1;if(w.version===1)ledger(g).completed++;releaseCopperStudy(g,u,true);delete u.copperStudy;u.order='idle';g.workBoard.reset();if(u.team===0)g.banner('A workable copper tool equips its maker',5);}return true;
}
export function validCopperStudies(s:GameState){const n=(v:unknown,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;let newTrials=0,paid=0;for(const u of s.units){const w=u.copperStudy;if(!w)continue;if(w.version===undefined){if(['team','fuel','phase','started','paid'].some(k=>w[k as keyof CopperStudy]!==undefined))return false;continue;}newTrials++;if(w.version!==1||!Number.isSafeInteger(w.team)||!s.tribes.some(t=>t.id===w.team)||!['logs','charcoal'].includes(w.fuel!)||!['loading','carrying','working'].includes(w.phase!)||!n(w.started,s.time)||!n(w.progress,COPPER_STUDY_RULES.workSeconds)||w.phase!=='working'&&w.progress!==0||!w.paused&&u.team!==w.team)return false;
 if(w.phase==='loading'){if(w.paid!==undefined)return false;}else{const p=w.paid;if(!p||p.copper!==COPPER_STUDY_RULES.copperUnits||p.wood!==(w.fuel==='logs'?COPPER_STUDY_RULES.woodLogs:0)||p.charcoal!==(w.fuel==='charcoal'?COPPER_STUDY_RULES.charcoalUnits:0))return false;paid++;}if(!w.paused&&hasTaskCommitment(u,'copperStudy'))return false;}
 const m=s.copperTrials;if(m===undefined)return newTrials===0;if(!m||m.version!==1||['started','paid','completed','lost','workSeconds','copperAllocated','woodAllocated','charcoalAllocated','copperLost','woodLost','charcoalLost'].some(k=>!n(m[k as keyof CopperTrials])))return false;for(const k of ['started','paid','completed','lost']as const)if(!Number.isSafeInteger(m[k]))return false;return m.started===newTrials+m.completed+m.lost&&m.paid>=paid+m.completed&&m.paid<=m.started&&m.completed+m.lost<=m.started&&m.woodAllocated/COPPER_STUDY_RULES.woodLogs+m.charcoalAllocated/COPPER_STUDY_RULES.charcoalUnits===m.paid&&Number.isSafeInteger(m.woodAllocated/COPPER_STUDY_RULES.woodLogs)&&Number.isSafeInteger(m.charcoalAllocated/COPPER_STUDY_RULES.charcoalUnits)&&m.copperAllocated===m.paid*COPPER_STUDY_RULES.copperUnits&&m.copperLost<=m.copperAllocated&&m.woodLost<=m.woodAllocated&&m.charcoalLost<=m.charcoalAllocated;
}

/** Rivals use known finite ore and actual workers, never a research-income bonus. */
export function developRivalCopper(g:Game,team:number){
 if(!isRivalTeam(team)||reserveSeconds(g,team)<600||g.tribe(team).copperExperiment)return false;
 const b=g.state.buildings.find(b=>b.team===team&&b.type==='workshop'&&g.finished(b));if(!b)return false;
 const trial=g.state.units.find(u=>u.team===team&&u.hp>0&&u.copperStudy&&!u.copperStudy.paused);
 if(trial){const pop=g.popNow(team),limit=pop>=PRACTICAL_HELPER_RULES.nativeTwoHelperPopulation?2:pop>=PRACTICAL_HELPER_RULES.nativeOneHelperPopulation?1:0,assigned=g.state.units.filter(u=>u.hp>0&&u.practicalHelper?.leaderId===trial.id&&u.practicalHelper.phase!=='paused').length;return assigned<limit&&beginCopperHelper(g,trial.id,true).accepted;}
 if(beginCopperStudy(g,b.id,team))return true;
 if(g.tribe(team).copper>=8||g.state.units.some(u=>u.team===team&&u.hp>0&&(u.copperStudy||u.job==='copper'&&u.order==='gather')))return false;
 const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.jobLock&&!u.buildOrder&&!u.plantingWork&&!u.tamingWork&&!u.husbandryWork&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&!u.tributeJourney&&!hasTaskCommitment(u)&&!(u as Unit&{prisoner?:unknown}).prisoner&&u.drill==null&&u.carry===0&&['idle','gather'].includes(u.order));if(!u)return false;
 const n=g.state.copper.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<160&&rivalKnows(g,team,n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))[0];
 if(!n)return false;
 g.interruptMission(u);u.node=n;u.job='copper';u.order='gather';u.tx=n.x;u.tz=n.z;u.workReason='Collecting known copper for workshop trials';g.workBoard.reset();return true;
}
