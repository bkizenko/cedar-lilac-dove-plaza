import type { Game } from "./sim";
import type { Unit, ResKind } from "./types";
import { knownSettlement, tradeCarrier, quoteShipment } from "./barter";

export function sendDelegation(g:Game,team:number,kind:"trade"|"peace"|"gift") {
  const hall=g.state.buildings.find(b=>b.team===team&&b.type==="townhall"&&g.finished(b));
  if(!hall||!knownSettlement(g,team)||team===0||team===3)return false;
  if(kind==="gift"&&g.tribe(0).food<30)return false;
  const u=tradeCarrier(g);if(!u){g.banner("Select an available adult with empty hands for the delegation",4);return false;}
  if(kind==="gift"){g.tribe(0).food-=30;u.carry=30;u.carryType="food";}
  u.envoy={team,kind,phase:"outbound",talk:0};u.order="move";u.stationOnArrival=false;
  u.searchJob=undefined;u.node=null;u.target=null;u.pillage=-1;u.attackDestination=null;
  u.tx=hall.x;u.tz=hall.z;u.workReason=kind==="peace"?"Carrying a peace proposal":"Traveling to learn trading terms";
  g.banner("A delegation departs. News must be carried home.",4);return true;
}
export function delegationAI(g:Game,u:Unit,dt:number) {
  const mission=u.envoy;if(!mission)return false;
  const hall=g.state.buildings.find(b=>b.team===(mission.phase==="outbound"?mission.team:0)&&b.type==="townhall"&&g.finished(b));
  if(!hall){u.envoy=undefined;u.order="idle";u.workReason="Delegation destination no longer exists";return true;}
  u.tx=hall.x;u.tz=hall.z;
  if(Math.hypot(u.x-hall.x,u.z-hall.z)>Math.max(hall.w,hall.d)*0.55+2){g.steer(u,dt);return true;}
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
      const offers=[];const goods:ResKind[]=["food","wood","stone","copper","iron"];
      for(const give of goods)for(const get of goods){if(give===get)continue;
        const quote=quoteShipment(g,mission.team,give,get,20);if(quote.deal)offers.push(quote.deal);
      }
      mission.report={time:g.state.time,offers};
    }
    mission.phase="return";u.workReason="Bringing the delegation's news home";
  } else {
    if(mission.report) {
      const reports=g.state.tradeReports??=[];
      g.state.tradeReports=reports.filter(r=>r.team!==mission.team);
      g.state.tradeReports.push({team:mission.team,...mission.report});
      g.banner("A trader returned with dated offers. Terms may change before the next visit.",5);
    } else g.banner(mission.kind==="gift"?"The gift carrier has returned":"The peace delegation has returned",4);
    u.envoy=undefined;u.order="idle";u.target=null;
  }
  return true;
}
