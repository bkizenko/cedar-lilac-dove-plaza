import type { Game } from './sim';
import type { Unit, ResKind } from './types';
import { isDependent, foodDemand, reserveSeconds } from './settlement';
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
export function tickVisitors(g:Game,dt:number) {
  g.state.visitorTimer=(g.state.visitorTimer??300)-dt;
  if(g.state.visitorTimer>0)return;
  g.state.visitorTimer=90;
  if(g.state.units.some(u=>u.visit&&u.hp>0))return;
  const home=g.state.buildings.find(b=>b.team===0&&b.type==='townhall'&&g.finished(b));if(!home)return;
  const rivals=g.state.tribes.filter(t=>[1,2].includes(t.id)&&t.alive&&!t.hostile);
  for(const t of rivals) {
    if(reserveSeconds(g,t.id)<450||g.popNow(t.id)<5)continue;
    const u=g.state.units.find(u=>u.team===t.id&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&!u.emergency&&u.carry===0&&!u.visit&&!u.scout&&!u.expedition&&!u.foundingJourney);
    if(!u)continue;
    const good:ResKind=t.spec||'wood';
    if((good==='copper'&&t.age<1)||(good==='iron'&&t.age<2))continue;
    const reserve=good==='food'?foodDemand(g,t.id)*450:30;
    const amount=Math.min(24,Math.floor(t[good]-reserve));if(amount<8)continue;
    t[good]-=amount;u.carry=amount;u.carryType=good;
    u.visit={phase:'outbound',wait:0};u.order='move';u.node=null;u.target=null;u.tx=home.x;u.tz=home.z;
    u.stuckT=0;u.workReason='Carrying goods to meet another community';g.state.visitorTimer=360;break;
  }
}
export function visitorAI(g:Game,u:Unit,dt:number) {
  const m=u.visit;if(!m)return false;
  const home=g.state.buildings.find(b=>b.team===(m.phase==='return'?u.team:0)&&b.type==='townhall'&&g.finished(b));
  if(!home||g.tribe(u.team).hostile){u.visit=undefined;u.order=u.carry>0?'return':'idle';return true;}
  if(u.stuckT>8){u.visit=undefined;u.order=u.carry>0?'return':'idle';u.node=null;return true;}
  if(m.phase==='waiting') {
    m.wait+=dt;u.vx=0;u.vz=0;
    if(m.wait>=120){m.phase='return';u.workReason='Returning after the trading visit';}return true;
  }
  u.tx=home.x;u.tz=home.z;
  if(Math.hypot(u.x-home.x,u.z-home.z)>Math.max(home.w,home.d)*0.55+3){g.steer(u,dt);return true;}
  if(m.phase==='outbound') {m.phase='waiting';u.order='hold';u.workReason='Visiting trader — awaiting your offer';g.banner(g.tribe(u.team).name+' has sent a trader to your village',5);}
  else {
    if(u.carryType&&u.carry>0)g.tribe(u.team)[u.carryType]+=u.carry;
    u.carry=0;u.carryType=null;u.visit=undefined;u.order='idle';u.node=null;
  }
  return true;
}
export function visitorPrice(g:Game,u:Unit,give:ResKind) {
  if(!u.visit||u.visit.phase!=='waiting'||!u.carryType||u.carryType===give)return null;
  const t=g.tribe(u.team),need=give==='food'?Math.max(30,foodDemand(g,u.team)*450):40;
  const scarcity=Math.max(0.7,Math.min(1.5,need/Math.max(10,t[give])));
  return Math.max(1,Math.ceil(u.carry*worth[u.carryType]/worth[give]/scarcity*(1.1-(t.trust||0)*0.15)));
}
export function tradeWithVisitor(g:Game,id:number,give:ResKind) {
  const u=g.state.units.find(u=>u.id===id&&u.hp>0);if(!u||!['food','wood','stone','copper','iron'].includes(give))return false;
  const price=visitorPrice(g,u,give),home=g.campOf(0);
  if(!price||!u.carryType||!g.visibleAt(u.x,u.z)||Math.hypot(u.x-home.x,u.z-home.z)>35||g.tribe(0)[give]<price)return false;
  if((give==='copper'&&g.tribe(0).age<1)||(give==='iron'&&g.tribe(0).age<2))return false;
  g.tribe(0)[give]-=price;g.tribe(0)[u.carryType]+=u.carry;u.carry=price;u.carryType=give;
  u.visit!.phase='return';u.order='move';g.tribe(u.team).trust=Math.min(1,(g.tribe(u.team).trust||0)+0.1);
  g.banner('Goods exchanged locally; the trader carries payment home',4);return true;
}
