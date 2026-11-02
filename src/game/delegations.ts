import {COMPACT_RULES,recordDiplomaticVisit} from './diplomaticKnowledge';
import {receiveFood} from './pantry';
import type { Game } from "./sim";
import type { Unit, PeaceTerm } from "./types";
import { knownSettlement, knownSettlementSite, localSettlementHall, beginSettlementJourney, settlementJourneySite, tradeCarrier, recordTradeMeeting } from "./barter";

export function sendDelegation(g:Game,team:number,kind:"trade"|"peace"|"gift"|"compact",carrier?:Unit,term:PeaceTerm="whitePeace") {
  const hall=knownSettlementSite(g,team);
  if(!hall||!knownSettlement(g,team)||team===0||team===3)return false;
  if((kind==="gift"||kind==="compact")&&g.tribe(0).food<(kind==="compact"?COMPACT_RULES.food:30))return false;
  if(kind==="compact"&&g.state.units.some(u=>u.hp>0&&u.envoy?.kind===kind&&u.envoy.team===team))return false;
  if(kind==="trade"&&g.state.units.some(u=>u.hp>0&&u.envoy?.kind==='trade'&&u.envoy.team===team)){g.banner('A trade envoy is already travelling to this settlement',4);return false;}
  if(kind==="peace"&&g.state.units.some(u=>u.envoy?.kind==='peace'&&u.envoy.team===team)){g.banner('A peace delegation is already travelling to this tribe.',4);return false;}
  const u=carrier||tradeCarrier(g);if(!u){g.banner("Select an available adult with empty hands for the delegation",4);return false;}
  if(!g.interactionSpot(u,hall)){g.banner("The meeting place needs a reachable land route or crossing",4);return false;}
  if(kind==="gift"||kind==="compact"){const amount=kind==="compact"?COMPACT_RULES.food:30;g.spend(0,{food:amount});u.carry=amount;u.carryType="food";u.carryFood="provisions";}
  beginSettlementJourney(g,u,hall);
  u.envoy={team,kind,term:kind==="peace"?term:undefined,phase:"outbound",talk:0};u.order="move";u.stationOnArrival=false;
  u.searchJob=undefined;u.node=null;u.target=null;u.pillage=-1;u.attackDestination=null;
  u.tx=hall.x;u.tz=hall.z;u.workReason=kind==="peace"?"Carrying a peace proposal":kind==="compact"?"Carrying a grazing compact proposal":"Traveling to learn trading terms";
  g.banner("A delegation departs. Trading terms become visible at the meeting.",4);return true;
}
export function delegationAI(g:Game,u:Unit,dt:number) {
  const mission=u.envoy;if(!mission)return false;
  const local=mission.phase==="outbound"?localSettlementHall(g,u,mission.team):undefined;
  const hall=mission.phase==="outbound"?(local||settlementJourneySite(g,u,mission.team)):g.state.buildings.find(b=>b.team===0&&b.type==="townhall"&&g.finished(b));
  if(!hall){if(mission.phase==="outbound"){mission.phase="return";u.workReason="The last known meeting site is absent — returning home";}else{u.envoy=undefined;u.order=u.carry>0?"return":"idle";}return true;}
  const entrance=g.interactionSpot(u,hall);
  if(!entrance){
    if(mission.phase==="outbound"){mission.phase="return";u.workReason="Meeting place unreachable — returning home";}
    else{u.envoy=undefined;u.order=u.carry>0?"return":"idle";u.workReason="Home route needs a crossing or clear entrance";}
    return true;
  }
  u.tx=entrance.x;u.tz=entrance.z;
  if(!g.buildingWorkReached(u,hall)){g.steer(u,dt);return true;}
  if(mission.phase==="outbound") {
    if(!local){mission.phase="return";u.workReason="The last known meeting site is empty — bringing the offer home";return true;}
    mission.talk+=dt;u.workReason="Meeting the other community";
    if(mission.talk<20)return true;
    if(mission.kind==="peace") {
      const rival=g.tribe(mission.team);
      const raiding=g.state.units.some(p=>p.team===0&&p.pillage===mission.team&&p.hp>0&&Math.hypot(p.x-hall.x,p.z-hall.z)<60);
      if(!raiding || (mission.term && mission.term!=='whitePeace'))g.resolvePeaceTerm(mission.team,mission.term||"whitePeace");
      else {rival.tension=Math.min(1,rival.tension+0.1);g.banner("Peace proposal refused while your raiders remain nearby",4);}
    } else if(mission.kind==="compact") {
      const rival=g.tribe(mission.team);
      if(!rival.hostile&&(rival.trust||0)>=COMPACT_RULES.trustMinimum&&(rival.compactUntil||0)<=g.state.time&&u.carryType==='food'&&u.carry===COMPACT_RULES.food){
       receiveFood(g,mission.team,u.carry,u.carryFood);u.carry=0;u.carryType=null;u.carryFood=undefined;
       rival.compactUntil=g.state.time+COMPACT_RULES.seconds;rival.trust=Math.min(1,(rival.trust||0)+COMPACT_RULES.trustGain);rival.tension=Math.max(0,rival.tension-COMPACT_RULES.tensionRecovery);rival.intent='trade';g.banner(rival.name+' accepts the grazing compact at the meeting',5);
      }else g.banner(rival.name+' declines the compact; your carrier brings the offer home',5);
    } else if(mission.kind==="gift") {
      const rival=g.tribe(mission.team);
      if(u.carryType==="food"&&u.carry>0) {
        receiveFood(g,mission.team,u.carry,u.carryFood);u.carry=0;u.carryType=null;
        rival.trust=Math.min(1,(rival.trust||0)+0.2);rival.tension=Math.max(0,rival.tension-0.2);
      }
    } else {
      mission.report=recordTradeMeeting(g,mission.team,u);
      g.banner("Your trader has arrived with dated offers. Terms may change before the next visit.",5);
    }
    recordDiplomaticVisit(g,u,mission.team);
    mission.phase="return";u.workReason="Bringing the delegation's news home";
  } else {
    if(!mission.report) g.banner(mission.kind==="gift"?"The gift carrier has returned":"The peace delegation has returned",4);
    if(u.carryType&&u.carry>0){if(u.carryType==="food")receiveFood(g,0,u.carry,u.carryFood);else g.tribe(0)[u.carryType]+=u.carry;u.carry=0;u.carryType=null;u.carryFood=undefined;}
    u.envoy=undefined;u.order="idle";u.target=null;
  }
  return true;
}
