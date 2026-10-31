import {isRivalTeam} from './factions';
import {rivalKnows} from './rivalDevelopment';
import type {Game} from './sim';import type {Unit} from './types';
import {isDependent,reserveSeconds} from './settlement';import {craftBenchReady,craftingEffort} from './crafting';
export function beginCopperStudy(g:Game,workplace:number,team=0){
 const b=g.state.buildings.find(b=>b.id===workplace&&b.team===team&&b.type==='workshop'&&g.finished(b));
 if(!b)return false;
 const t=g.tribe(team);if(t.copperExperiment){if(team===0)g.banner('Your people already know this copper technique',4);return false;}
 const paused=g.state.units.find(u=>u.team===team&&u.hp>0&&u.copperStudy?.paused&&u.type==='worker'&&!isDependent(g,u)&&!u.militia&&!u.jobLock&&!u.buildOrder&&!u.tributeJourney&&!u.foundingJourney&&!u.plantingWork&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.tamingWork&&!u.studyCrop&&u.drill==null&&['idle','gather','hold'].includes(u.order)&&u.carry===0&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.emergency&&!u.recalled&&!!g.interactionSpot(u,b));
 if(paused){paused.copperStudy!.paused=false;paused.copperStudy!.workplace=b.id;paused.order='hold';return true;}
 if(g.state.units.some(u=>u.team===team&&u.hp>0&&u.copperStudy)){if(team===0)g.banner('The experimenter is busy. Release their current order before resuming.',4);return false;}
 if(g.popNow(team)<20){if(team===0)g.banner('Copper trials need a settled community of 20 people',4);return false;}
 if(t.copper<8||t.wood<4){if(team===0)g.banner('Bring 8 copper and 4 logs to test a prototype tool',4);return false;}
 const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.jobLock&&!u.plantingWork&&!u.tamingWork&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&!u.tributeJourney&&u.drill==null&&u.carry===0&&['idle','gather','hold'].includes(u.order)&&!!g.interactionSpot(u,b));
 if(!u){if(team===0)g.banner('Need an available adult with empty hands and a clear route to this shelter',4);return false;}
 g.interruptMission(u);t.copper-=8;t.wood-=4;u.copperStudy={workplace:b.id,progress:0};u.node=null;u.order='hold';g.workBoard.reset();return true;
}
export function copperStudyAI(g:Game,u:Unit,dt:number){
 const work=u.copperStudy;if(!work||work.paused)return false;
 const b=g.state.buildings.find(b=>b.id===work.workplace&&b.team===u.team&&b.type==='workshop'&&g.finished(b));
 if(!b){work.paused=true;u.order='idle';return false;}
 if(!g.buildingWorkReached(u,b)){const spot=g.interactionSpot(u,b);if(!spot){work.paused=true;u.order='idle';return false;}u.tx=spot.x;u.tz=spot.z;u.workReason='Taking copper to the crafting shelter';g.steer(u,dt);return true;}
 if(!craftBenchReady(g,u,b))return true;
 work.progress=Math.min(90,work.progress+craftingEffort(u,dt));u.vx=0;u.vz=0;u.stride+=dt*5;u.workReason=`Testing a copper tool · ${Math.floor(work.progress/90*100)}%`;
 if(work.progress>=90){g.tribe(u.team).copperExperiment=true;if(u.farmTool!=='ironTools')u.farmTool='copperTools';u.copperStudy=undefined;u.order='idle';g.workBoard.reset();if(u.team===0)g.banner('A workable copper tool! One prototype equips its maker.',6);}
 return true;
}

/** Rivals use known finite ore and actual workers, never a research-income bonus. */
export function developRivalCopper(g:Game,team:number){
 if(!isRivalTeam(team)||g.popNow(team)<20||reserveSeconds(g,team)<600||g.tribe(team).copperExperiment)return false;
 const b=g.state.buildings.find(b=>b.team===team&&b.type==='workshop'&&g.finished(b));if(!b)return false;
 if(beginCopperStudy(g,b.id,team))return true;
 if(g.tribe(team).copper>=8||g.state.units.some(u=>u.team===team&&u.hp>0&&(u.copperStudy||u.job==='copper'&&u.order==='gather')))return false;
 const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.jobLock&&!u.buildOrder&&!u.plantingWork&&!u.tamingWork&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&!u.tributeJourney&&u.drill==null&&u.carry===0&&['idle','gather'].includes(u.order));if(!u)return false;
 const n=g.state.copper.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<160&&rivalKnows(g,team,n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))[0];
 if(!n)return false;
 g.interruptMission(u);u.node=n;u.job='copper';u.order='gather';u.tx=n.x;u.tz=n.z;u.workReason='Collecting known copper for workshop trials';g.workBoard.reset();return true;
}
