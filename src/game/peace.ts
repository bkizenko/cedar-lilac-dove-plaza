import type {Game} from './sim';
import type {PeaceTerm, Unit} from './types';
import {knownSettlement} from './barter';
import {isDependent} from './settlement';

export const PEACE_TERMS: Record<PeaceTerm,string> = {whitePeace:'White peace',tribute:'Tribute',forcedLabor:'Slavery',puppet:'Puppet state',annexation:'Annexation'};
export const peaceTerms=Object.keys(PEACE_TERMS) as PeaceTerm[];
export const peaceDescription:Record<PeaceTerm,string>={whitePeace:'Both armies withdraw. Ten minutes of protected peace.',tribute:'The defeated tribe owes 20 logs every two minutes, six payments total. Residents carry payments to your hall; missing or intercepted deliveries remain owed.',forcedLabor:'Two existing adults are enslaved and walk to your settlement. They require food, housing and nearby stationed guards. Forced work and hunger raise resistance; unguarded people may escape. You can free them.',puppet:'The tribe keeps its people and buildings, becomes your ally, and sends 10 logs every two minutes until released. Payments arrive by carrier.',annexation:'All surviving people, buildings, stores and claimed regions join your tribe. Requires overwhelming military pressure.'};
export function peacePressure(g:Game,team:number){
 const strength=(t:number)=>g.state.units.filter(u=>u.team===t&&u.hp>0&&!isDependent(g,u)).reduce((s,u)=>s+(u.type==='worker'&&!u.militia?0.25:1)*u.hp/Math.max(1,u.maxHp),0);
 return strength(0)/Math.max(.5,strength(team));
}
function candidates(g:Game,team:number){return g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.tributeJourney&&!u.buildOrder&&u.drill==null&&!u.studyCrop&&!u.recalled&&!u.jobLock&&["idle","gather"].includes(u.order)&&!u.envoy&&!u.trade&&!u.visit&&!u.scout&&!u.expedition&&!u.foundingJourney&&!u.emergency&&!u.militia&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&u.carry===0);}
export function peaceIssue(g:Game,team:number,term:PeaceTerm):string|null{
 const t=g.tribe(team);
 if(!peaceTerms.includes(term)||!t||team===0||team===3||!t.alive||!t.hostile||!knownSettlement(g,team))return 'Peace negotiations require a known tribe at war.';
 const required={whitePeace:0,tribute:1.25,forcedLabor:1.75,puppet:2.5,annexation:4}[term];
 if(peacePressure(g,team)<required)return 'They refuse these terms: insufficient military pressure.';
 if(term==='forcedLabor'){
  if(candidates(g,team).length<2)return 'Two available adults are required; children and travelling people cannot be surrendered.';
  if(g.popCap(0)-g.popNow(0)<2)return 'Your village needs housing for two more people.';
  const home=g.state.buildings.find(b=>b.team===0&&b.type==='townhall'&&g.finished(b));
  if(!home||candidates(g,team).slice(0,2).some(u=>!g.interactionSpot(u,home)))return 'A reachable route to your settlement is required.';
 }
 return null;
}
function transferPerson(g:Game,u:Unit,team:number){
 g.interruptMission(u);u.expedition=undefined;u.team=team;u.selected=false;u.target=null;u.node=null;u.pillage=-1;u.attackDestination=null;u.emergency=undefined;u.drill=undefined;u.jobLock=false;u.order='return';
}
export function settlePeace(g:Game,team:number,term:PeaceTerm){
 const issue=peaceIssue(g,team,term);if(issue){g.banner(issue,5);return false;}
 const t=g.tribe(team),people=term==='forcedLabor'?candidates(g,team).slice(0,2):[];
 g.agreeTruce(team);t.peaceOffer=undefined;t.peaceTerm=term;
 if(term==='tribute'||term==='puppet'){
  t.tribute={amount:term==='puppet'?10:20,remaining:term==='puppet'?-1:6,next:g.state.time,owed:0,paid:0};
  if(term==='puppet')t.ally=true;
 }
 if(term==='forcedLabor')for(const u of people){transferPerson(g,u,0);u.enslavedFrom=team;u.captivityUnrest=25;}
 if(term==='annexation'){
  // Cancel contracts before ownership changes so escrow and equipment are settled once.
  for(const u of g.state.units)if(u.team===team||u.tradeTeam===team||u.envoy?.team===team)g.interruptMission(u);
  for(const u of g.state.units)if(u.team===team)transferPerson(g,u,0);
  for(const b of g.state.buildings)if(b.team===team){b.team=0;b.selected=false;}
  for(const r of g.state.regions)if(r.owner===team)r.owner=0;
  for(const key of ['food','wood','stone','copper','iron','spears','bows','blades'] as const){g.tribe(0)[key]+=t[key];t[key]=0;}
  t.foodLots={};g.state.routes=g.state.routes.filter(r=>r.team!==team);t.alive=false;t.ally=false;t.fallenT=g.state.time;
  if(!g.state.tribes.some(r=>r.id>0&&r.id!==3&&r.alive))g.state.conquestAt=g.state.time;
  g.rebuildWalk();
 }
 g.workBoard.reset();g.banner(`${PEACE_TERMS[term]} agreed with ${t.name}. Open Village → Neighbor relations for treaty details.`,7);return true;
}
export function rejectPeace(g:Game,team:number){const t=g.tribe(team);if(t){t.peaceOffer=undefined;t.nextPeaceOffer=g.state.time+300;}}
export function releasePuppet(g:Game,team:number){const t=g.tribe(team);if(t?.peaceTerm!=='puppet')return;t.peaceTerm='whitePeace';t.tribute=undefined;t.recoveryUntil=g.state.time+600;g.banner(`${t.name} is independent again; the alliance remains.`,5);}
export function freePeople(g:Game,team:number){for(const u of g.state.units)if(u.team===0&&u.enslavedFrom===team){u.enslavedFrom=undefined;u.captivityUnrest=undefined;}g.banner('The enslaved adults are now free members of your tribe.',5);}
export function tickPeace(g:Game){
 for(const t of g.state.tribes){
  if(t.id===0||t.id===3||!t.alive)continue;
  if(t.hostile){
   t.tribute=undefined;
   if(t.peaceTerm==='puppet')t.peaceTerm=undefined;
   if(t.peaceOffer&&t.peaceOffer.expires<=g.state.time)t.peaceOffer=undefined;
   if(!t.peaceOffer&&(t.nextPeaceOffer||0)<=g.state.time&&knownSettlement(g,t.id)&&peacePressure(g,t.id)>=1.25){
    const term:PeaceTerm=peacePressure(g,t.id)>=2?'tribute':'whitePeace';
    t.peaceOffer={from:t.id,term,expires:g.state.time+180};t.nextPeaceOffer=g.state.time+480;
    g.banner(`${t.name} sues for peace. Review their ${PEACE_TERMS[term].toLowerCase()} offer in Village → Neighbor relations.`,8);
   }
  }else if(t.tribute){
   const c=t.tribute;
   if(g.state.time>=c.next&&c.remaining!==0){c.owed+=c.amount;if(c.remaining>0)c.remaining--;c.next=g.state.time+120;}
   // A single real resident carries the installment. Owed includes cargo in transit,
   // so an intercepted shipment never counts as payment or creates replacement goods.
   if(c.owed>0&&t.wood>0&&!g.state.units.some(u=>u.team===t.id&&u.hp>0&&u.tributeJourney)){
    const u=candidates(g,t.id).find(u=>tributeHome(g,u,t.id)&&tributeHome(g,u,0));
    if(u){u.tributeJourney={phase:'pickup',amount:0};u.node=null;u.order='move';u.job=null;u.stuckT=0;}
   }
   if(c.remaining===0&&c.owed===0)t.tribute=undefined;
  }
 }
}


function tributeHome(g:Game,u:Unit,team:number){
 return g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&g.finished(b))
  .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))
  .find(b=>!!g.interactionSpot(u,b));
}

/** No teleporting payments: pickup, delivery and the carrier's return are physical. */
export function tributeJourneyAI(g:Game,u:Unit,dt:number){
 const m=u.tributeJourney;if(!m)return false;
 const t=g.tribe(u.team),c=t?.tribute;
 if(m.phase!=='return'&&(!c||t.hostile||u.emergency||u.recalled)){
  u.tributeJourney=undefined;u.order='return';u.workReason='Tribute cancelled — bringing cargo home';return false;
 }
 const home=tributeHome(g,u,m.phase==='deliver'?0:u.team);
 if(!home){u.tributeJourney=undefined;u.order='return';u.workReason='Tribute route blocked — returning with cargo';return false;}
 const spot=g.interactionSpot(u,home)!;
 u.tx=spot.x;u.tz=spot.z;
 u.workReason=m.phase==='pickup'?'Collecting tribute at the hearth':m.phase==='deliver'?`Delivering ${m.amount} tribute logs`:'Tribute delivered — returning home';
 if(!g.buildingWorkReached(u,home)){g.steer(u,dt);return true;}
 if(m.phase==='pickup'){
  const amount=Math.min(20,c!.owed,Math.max(0,t.wood));
  if(amount<=0){u.tributeJourney=undefined;u.order='idle';return true;}
  t.wood-=amount;u.carry=amount;u.carryType='wood';m.amount=amount;m.phase='deliver';
 }else if(m.phase==='deliver'){
  const amount=Math.min(m.amount,u.carry,c!.owed);
  if(u.carryType==='wood'&&amount>0){g.tribe(0).wood+=amount;c!.owed-=amount;c!.paid+=amount;u.carry-=amount;
   g.banner(`${t.name}: ${amount} tribute logs delivered`,4);}
  if(u.carry===0)u.carryType=null;
  m.phase='return';m.amount=0;
 }else{
  // Undelivered cargo remains real and is restored only at the sender's home.
  if(u.carryType==='wood'){t.wood+=u.carry;u.carry=0;u.carryType=null;}
  u.tributeJourney=undefined;u.order='idle';g.workBoard.reset();
 }
 u.stuckT=0;return true;
}
