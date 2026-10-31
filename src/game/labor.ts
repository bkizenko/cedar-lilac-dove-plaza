import type {Game} from './sim';
import {pauseQueuedCrafting} from './crafting';
import type {GameState,Unit} from './types';
import {isDependent} from './settlement';

/** Release old reservations as a group before anyone claims the new work. */
export function applyLaborPriority(g:Game,policy:NonNullable<GameState['laborPolicy']>){
  g.state.laborPolicy=policy;
  pauseQueuedCrafting(g);
  if(policy==='trade')for(const route of g.state.routes)if(!route.paused)route.t=Math.min(route.t,1);
  const available:Unit[]=[];
  for(const u of g.state.units){
    if(u.team!==0||u.hp<=0||isDependent(g,u))continue;
    if(u.emergency){u.emergency.job=null;u.emergency.jobLock=false;u.emergency.resume=undefined;continue;}
    if(u.type!=='worker'||u.boat)continue;
    // Paid active projects and dispatched shipments keep their commitments.
    // Paused projects are stored progress, not a reason to exclude a worker.
    if(u.envoy||u.order==='trade'||u.visit||u.foundingJourney||u.studyCrop||u.drill!=null||
      (u.order==='hold'&&(u.copperStudy&&!u.copperStudy.paused||u.tamingWork&&!u.tamingWork.paused||u.weaponWork&&!u.weaponWork.paused||u.haulageWork&&!u.haulageWork.paused||u.farmToolWork&&!u.farmToolWork.paused)))continue;
    u.job=null;u.jobLock=false;u.huntOnly=false;u.searchJob=undefined;u.workCheckAt=0;
    u.blockedTask=undefined;u.retryWorkAt=undefined;u.node=null;u.target=null;u.attackDestination=null;u.pillage=-1;
    if(u.recalled){u.stationOnArrival=false;continue;}
    if(u.expedition){
      if(policy==='explore'&&u.order==='explore'&&!u.expedition.returning)continue;
      u.scout=undefined;u.expedition.returning=true;u.order='move';const home=g.campOf(0);u.tx=home.x;u.tz=home.z;
      u.workReason='Returning from exploration to join the new village focus';continue;
    }
    g.interruptMission(u);
    u.stationOnArrival=undefined;u.gatherT=0;
    u.order=u.carry>0?'return':'idle';
    if(u.order==='idle')available.push(u);
  }
  g.workBoard.reset();
  for(const u of available)g.workBoard.assign(g,u);
}
