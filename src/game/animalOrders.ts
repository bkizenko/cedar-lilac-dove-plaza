import type{Game}from'./sim';
import{hasTaskCommitment}from'./workCommitments';import{isDependent}from'./settlement';import{orderExploration}from'./explorationOrders';import{beginHerdTaming}from'./husbandry';
/** The search reveals ordinary real ground through an actual provisioned scout;
 * it never queries hidden goats to choose a remote destination or creates one. */
export function searchForWildGoats(g:Game,penId?:number){
 const visible=g.state.wildlife.filter(c=>c.species==='goat'&&c.hp>0&&g.visibleAt(c.x,c.z));
 if(penId!==undefined&&visible.length&&beginHerdTaming(g,penId))return{accepted:true,reason:'A handler is approaching a real wild goat with the paid feed'};
 const selected=g.selectedUnits(),pool=(selected.length?selected:g.state.units.filter(u=>u.team===0)).filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!hasTaskCommitment(u)&&(!u.jobLock||selected.includes(u))&&!u.emergency&&!u.recalled&&!u.expedition&&!u.visit&&!u.envoy&&!u.scout&&!u.buildOrder&&!u.tributeJourney&&u.escortId===undefined&&!['occupy','capture'].includes(u.conflictIntent||'')&&['hold','idle','gather'].includes(u.order));
 let reason='Choose a free adult to search for wild goats';for(const u of pool){const issue=orderExploration(g,u);if(issue){reason=issue;continue;}u.workReason=u.exploreAfterDelivery?'Goat search queued — delivering existing supplies first':'Searching unknown ground for wild goats';g.banner(u.workReason,4);return{accepted:true,reason:u.workReason};}
 g.banner(reason,4);return{accepted:false,reason};
}
