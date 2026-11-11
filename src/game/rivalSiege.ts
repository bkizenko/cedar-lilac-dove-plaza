import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isRivalTeam} from './factions';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {beginSiegeRam,deploySiegeRam,SIEGE_RAM_RULES,type SiegeRamState} from './siegeRam';
import {recordConflict} from './conflictMetrics';
import type {CapitulationState} from './capitulation';

/**
 * NPC siege: a society pressing a walled community (it has an open capitulation front there) commissions a
 * real paid beam ram at its own workshop from its own timber and cordage, then crews it against the
 * fortification nearest its present attackers. It uses the existing siegeRam lifecycle unchanged (payment,
 * carrying, assembly, crewed movement, impacts). No free engines, no remote damage.
 */
export const RIVAL_SIEGE_RULES={version:1,reviewSeconds:20,fortificationScopeMeters:40,crewSize:3} as const;
const R=RIVAL_SIEGE_RULES;
const FORTS=['palisade','stonewall','gate'];
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const rams=(g:Game)=>(g.state as Game['state']&{siegeRams?:SiegeRamState}).siegeRams?.assets||[];
const fronts=(g:Game)=>(g.state as Game['state']&{capitulation?:CapitulationState}).capitulation?.fronts||[];
const free=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>=u.maxHp*.5&&!isDependent(g,u)&&!u.prisoner&&!u.boat&&!u.emergency&&!u.recalled&&!hasTaskCommitment(u)&&!u.jobLock&&!u.carry&&!u.buildOrder&&['idle','hold','gather'].includes(u.order);
/** Fortifications of the pressed community, from the attacker's present view (they stand there). */
export function besiegedFortifications(g:Game,hall:Building){return g.state.buildings.filter(b=>b.team===hall.team&&FORTS.includes(b.type)&&b.hp>0&&g.finished(b)&&dist(b,hall)<=R.fortificationScopeMeters);}
const nextReview=new WeakMap<object,number>();
export function tickRivalSiege(g:Game){
 const due=nextReview.get(g.state)??0;if(g.state.time<due)return;nextReview.set(g.state,g.state.time+R.reviewSeconds);
 for(const f of fronts(g)){
  if(f.phase!=='pressed'||!isRivalTeam(f.attackerTeam))continue;
  const hall=g.state.buildings.find(b=>b.id===f.hallId&&b.hp>0);if(!hall)continue;
  const forts=besiegedFortifications(g,hall);if(!forts.length)continue;
  const team=f.attackerTeam,mine=rams(g).filter(a=>a.team===team&&a.phase!=='broken'&&a.hp>0);
  const ready=mine.find(a=>a.phase==='ready');
  if(ready){
   const attackers=g.state.units.filter(u=>u.team===team&&u.hp>0&&dist(u,hall)<=55);
   const target=forts.sort((a,b)=>Math.min(...attackers.map(u=>dist(u,a)),1e9)-Math.min(...attackers.map(u=>dist(u,b)),1e9)||a.id-b.id)[0];
   const crew=g.state.units.filter(u=>free(g,u,team)&&u.type==='worker').sort((a,b)=>dist(a,ready)-dist(b,ready)||a.id-b.id).slice(0,R.crewSize);
   if(crew.length>=SIEGE_RAM_RULES.minimumCrew){const r=deploySiegeRam(g,ready.id,target.id,crew.map(u=>u.id));if(r.accepted)recordConflict(g,'siege_engaged',team,1,{targetId:target.id});}
   continue;
  }
  if(mine.length)continue;// one engine at a time, already paid and under construction
  const shop=g.state.buildings.filter(b=>b.team===team&&b.type==='workshop'&&b.hp>0&&g.finished(b)).sort((a,b)=>dist(a,hall)-dist(b,hall))[0];if(!shop)continue;
  const t=g.tribe(team);if(t.wood<SIEGE_RAM_RULES.wood||(t.items?.cordage||0)<SIEGE_RAM_RULES.cordage)continue;
  const maker=g.state.units.filter(u=>free(g,u,team)&&u.type==='worker').sort((a,b)=>dist(a,shop)-dist(b,shop)||a.id-b.id)[0];if(!maker)continue;
  beginSiegeRam(g,shop.id,maker.id);
 }
}
/** True while an attacker's ram is moving to or striking a fortification of this community. */
export function siegeUnderWay(g:Game,hall:Building,attacker:number){
 const forts=new Set(besiegedFortifications(g,hall).map(b=>b.id));
 return rams(g).some(a=>a.team===attacker&&a.hp>0&&(a.phase==='moving'||a.phase==='striking')&&a.targetId!==undefined&&forts.has(a.targetId));
}
