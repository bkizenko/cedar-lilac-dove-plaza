import type { Game } from "./sim";
import type { Unit } from "./types";
import { knownSettlement, tradeCarrier, recordTradeMeeting } from "./barter";

export function sendDelegation(g:Game,team:number,kind:"trade"|"peace"|"gift",carrier?:Unit) {
  const hall=g.state.buildings.find(b=>b.team===team&&b.type==="townhall"&&g.finished(b));
  if(!hall||!knownSettlement(g,team)||team===0||team===3)return false;
  if(kind==="gift"&&g.tribe(0).food<30)return false;
  const u=carrier||tradeCarrier(g);if(!u){g.banner("Select an available adult with empty hands for the delegation",4);return false;}
  if(!g.interactionSpot(u,hall)){g.banner("The meeting place needs a reachable land route or crossing",4);return false;}
  if(kind==="gift"){g.tribe(0).food-=30;u.carry=30;u.carryType="food";}
  u.envoy={team,kind,phase:"outbound",talk:0};u.order="move";u.stationOnArrival=false;
  u.searchJob=undefined;u.node=null;u.target=null;u.pillage=-1;u.attackDestination=null;
  u.tx=hall.x;u.tz=hall.z;u.workReason=kind==="peace"?"Carrying a peace proposal":"Traveling to learn trading terms";
  g.banner("A delegation departs. Trading terms become visible at the meeting.",4);return true;
}
export function delegationAI(g:Game,u:Unit,dt:number) {
  const mission=u.envoy;if(!mission)return false;
  const hall=g.state.buildings.find(b=>b.team===(mission.phase==="outbound"?mission.team:0)&&b.type==="townhall"&&g.finished(b));
  if(!hall){u.envoy=undefined;u.order="idle";u.workReason="Delegation destination no longer exists";return true;}
  const entrance=g.interactionSpot(u,hall);
  if(!entrance){
    if(mission.phase==="outbound"){mission.phase="return";u.workReason="Meeting place unreachable — returning home";}
    else{u.envoy=undefined;u.order=u.carry>0?"return":"idle";u.workReason="Home route needs a crossing or clear entrance";}
    return true;
  }
  u.tx=entrance.x;u.tz=entrance.z;
  if(!g.buildingWorkReached(u,hall)){g.steer(u,dt);return true;}
  if(mission.phase==="outbound") {
    mission.talk+=dt;u.workReason="Meeting the other community";
    if(mission.talk<20)return true;
    if(mission.kind==="peace") {
      const rival=g.tribe(mission.team);
      const raiding=g.state.units.some(p=>p.team===0&&p.pillage===mission.team&&p.hp>0&&Math.hypot(p.x-hall.x,p.z-hall.z)<60);
      if(!raiding)g.agreeTruce(mission.team);
      else {rival.tension=Math.min(1,rival.tension+0.1);g.banner("Peace proposal refused while your raiders remain nearby",4);}
    } else if(mission.kind==="gift") {
      const rival=g.tribe(mission.team);
      if(u.carryType==="food"&&u.carry>0) {
        rival.food+=u.carry;u.carry=0;u.carryType=null;
        rival.trust=Math.min(1,(rival.trust||0)+0.2);rival.tension=Math.max(0,rival.tension-0.2);
      }
    } else {
      mission.report=recordTradeMeeting(g,mission.team,u);
      g.banner("Your trader has arrived with dated offers. Terms may change before the next visit.",5);
    }
    mission.phase="return";u.workReason="Bringing the delegation's news home";
  } else {
    if(!mission.report) g.banner(mission.kind==="gift"?"The gift carrier has returned":"The peace delegation has returned",4);
    u.envoy=undefined;u.order="idle";u.target=null;
  }
  return true;
}
