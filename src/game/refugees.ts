/** Hunger refugees (AUD-SOC-HUNGER-REFUGEES). A starving, known, peaceful neighbour sends a small family of its OWN people on foot to the player's hall.
 * Nothing is spawned: the party is real units of that society (an adult plus the children listed as theirs), marked with u.refugee and steered
 * by the existing founding-journey slot (so every "is this person free?" check already skips them). They wait at the hall until the player takes them
 * in (units change team, like the existing sea migrants: their own kin and skills come with them) or turns them away (they walk home).
 * Behind rulersVersion; old saves have no u.refugee so nothing happens. */
import type {Game} from './sim';
import type {Unit} from './types';
import {rulersEnabled,expansionInputs,livingPeople,ERA_REACH} from './rulersRuntime';
import {societyRelation} from './societyRelations';
import {isDependent} from './settlement';
import {noteArrivals,noteDepartures} from './societyCivicRuntime';
import {lifeEvent} from './communities';

export const REFUGEE_RULES={hunger:.85,minHome:6,maxPending:2,patienceYears:3,hallReach:14};
const busy=(u:Unit)=>!!(u.foundingJourney||u.envoy||u.scout||u.visit||u.expedition||u.trade||u.tributeJourney||u.recalled||u.emergency||u.prisoner||u.buildOrder||u.escortId!==undefined||u.societyMissionId||u.refugee);
/** Where a society gathers: its finished hall, else its camp (nomads, or a hall not yet raised). */
const hallOf=(g:Game,team:number)=>{const c=g.campOf(team);return c?{x:c.x,z:c.z,id:g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0&&g.finished(b))?.id}:null;};

/** People of a starving society who would leave: one free adult and the children recorded as theirs, capped by the era's party size. */
function pickFamily(g:Game,team:number):Unit[]{
 const tier=(g.state as unknown as {rulers?:{societies:Record<string,{civ:{polity:{tier:'band'|'chiefdom'|'state'}}}>}}).rulers?.societies[String(team)]?.civ.polity.tier??'band';
 const cap=ERA_REACH[tier].crew;
 const adult=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!busy(u)&&u.carry===0&&['idle','gather','hold'].includes(u.order));
 if(!adult)return [];
 const kids=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.parents?.includes(adult.id)&&isDependent(g,u)&&!busy(u));
 return [adult,...kids].slice(0,cap);
}

export function pendingRefugees(g:Game,from?:number):Unit[]{return g.state.units.filter(u=>u.hp>0&&u.refugee&&(from===undefined||u.refugee.home===from));}

/** Once per dynastic year. Returns the sending societies (for tests/log). */
export function sendRefugees(g:Game):number[]{
 if(!rulersEnabled(g))return [];
 const hall=hallOf(g,0);if(!hall)return [];
 if(new Set(pendingRefugees(g).map(u=>u.refugee!.home)).size>=REFUGEE_RULES.maxPending)return [];
 const out:number[]=[];
 for(let t=1;t<g.state.tribes.length;t++){
  if(t===3||!g.tribe(t)||pendingRefugees(g,t).length)continue;
  const rel=societyRelation(g,t,0),back=societyRelation(g,0,t);
  if(rel.hostile||back.hostile||!(rel.known||back.known)||g.isFoe(0,t))continue;
  const inp=expansionInputs(g,t);if(!inp||inp.hunger<REFUGEE_RULES.hunger||livingPeople(g,t)<REFUGEE_RULES.minHome)continue;
  const fam=pickFamily(g,t);if(!fam.length)continue;
  const dest={x:hall.x+(fam[0].x<hall.x?-1:1)*6,z:hall.z+(fam[0].z<hall.z?-1:1)*6};
  const year=(g.state as unknown as {rulers:{year:number}}).rulers.year;
  for(const u of fam){u.refugee={home:t,phase:'walking',year};u.foundingJourney={x:dest.x,z:dest.z,leader:u===fam[0]};u.order='move';u.tx=dest.x;u.tz=dest.z;u.stuckT=0;u.workReason='Walking to another hearth, hungry';}
  lifeEvent(g,0,`${g.tribe(t).name} is starving: ${fam.length} of their people walk toward your hall, asking to be taken in`,fam[0].x,fam[0].z);
  out.push(t);if(out.length+1>REFUGEE_RULES.maxPending)break;
 }
 return out;
}

/** Per-unit step, called from foundingJourneyAI. Walks to the hall, waits, or walks home. Returns true when it handled the unit. */
export function refugeeAI(g:Game,u:Unit,dt:number):boolean{
 const r=u.refugee;if(!r)return false;
 if(u.team===0){u.refugee=undefined;u.foundingJourney=undefined;return true;} // taken in elsewhere: ordinary resident again
 const home=hallOf(g,r.home);
 if(r.phase==='walking'||r.phase==='waiting'){
  const m=u.foundingJourney!,hall=hallOf(g,0);
  if(!hall||u.stuckT>16){r.phase='home';}
  else if(Math.hypot(u.x-m.x,u.z-m.z)>REFUGEE_RULES.hallReach){u.tx=m.x;u.tz=m.z;u.workReason='Walking to another hearth, hungry';g.steer(u,dt);return true;}
  else{r.phase='waiting';u.order='hold';u.workReason='Waiting at the hall to be taken in';
   const year=(g.state as unknown as {rulers?:{year:number}}).rulers?.year??0;
   if(year-r.year>=REFUGEE_RULES.patienceYears)r.phase='home';
   return true;}
 }
 if(r.phase==='home'){
  if(!home){u.refugee=undefined;u.foundingJourney=undefined;u.order='idle';return true;}
  if(Math.hypot(u.x-home.x,u.z-home.z)>10){u.tx=home.x;u.tz=home.z;u.workReason='Walking home';g.steer(u,dt);return true;}
  u.refugee=undefined;u.foundingJourney=undefined;u.order='idle';u.workReason='Back home';return true;
 }
 return false;
}

/** Player answers the party standing at the hall (command 'take-in-refugees' / 'turn-away-refugees'). */
export function answerRefugees(g:Game,team:number,accept:boolean):{ok:boolean;reason:string}{
 const here=pendingRefugees(g,team).filter(u=>u.refugee!.phase==='waiting');
 if(!here.length)return {ok:false,reason:'No one from that society is waiting at your hall'};
 const hall=hallOf(g,0);if(!hall)return {ok:false,reason:'You have no hall to receive them'};
 if(!accept){for(const u of here)u.refugee!.phase='home';lifeEvent(g,0,`You turn ${g.tribe(team).name}'s hungry families away; they walk home`,hall.x,hall.z);return {ok:true,reason:'They are turned away and start the long walk home'};}
 const room=g.popCap(0)-g.popNow(0);
 if(room<here.length)return {ok:false,reason:'Your village has no room for them yet'};
 for(const u of here){g.interruptMission(u);u.refugee=undefined;u.foundingJourney=undefined;u.team=0;u.order='move';u.job=null;u.node=null;u.target=null;u.tx=hall.x+4;u.tz=hall.z+4;if(hall.id!==undefined)u.homeHall=hall.id;u.workReason='Newly taken in';}
 noteArrivals(g,0,here.length,true);noteDepartures(g,team,here.length);
 lifeEvent(g,0,`${here.length} hungry people from ${g.tribe(team).name} are taken in, with their own kin and skills`,hall.x,hall.z);
 return {ok:true,reason:`${here.length} people are taken in`};
}
