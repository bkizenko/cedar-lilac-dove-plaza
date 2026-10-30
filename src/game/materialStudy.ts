import type {Game} from './sim';import type {Unit} from './types';
import {isDependent} from './settlement';import {craftBenchReady,craftingEffort} from './crafting';
export function beginCopperStudy(g:Game,workplace:number){
 const b=g.state.buildings.find(b=>b.id===workplace&&b.team===0&&b.type==='workshop'&&g.finished(b));
 if(!b)return false;
 const t=g.tribe(0);if(t.copperExperiment){g.banner('Your people already know this copper technique',4);return false;}
 const paused=g.state.units.find(u=>u.team===0&&u.hp>0&&u.copperStudy?.paused&&u.type==='worker'&&u.carry===0&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.emergency&&!u.recalled&&!!g.interactionSpot(u,b));
 if(paused){paused.copperStudy!.paused=false;paused.copperStudy!.workplace=b.id;paused.order='hold';return true;}
 if(g.state.units.some(u=>u.team===0&&u.hp>0&&u.copperStudy))return false;
 if(g.popNow(0)<20){g.banner('Copper trials need a settled community of 20 people',4);return false;}
 if(t.copper<8||t.wood<4){g.banner('Bring 8 copper and 4 logs to test a prototype tool',4);return false;}
 const u=g.state.units.find(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.jobLock&&!u.plantingWork&&!u.tamingWork&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.recalled&&!u.emergency&&!u.foundingJourney&&!u.tributeJourney&&u.drill==null&&u.carry===0&&['idle','gather','hold'].includes(u.order)&&!!g.interactionSpot(u,b));
 if(!u)return false;
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
