import type {Game} from './sim';
/** Contact requires people actually meeting in sight; remembered maps are insufficient. */
export function tickEncounters(g:Game){
 if(!g.started||g.awaitingStart||g.state.encounter)return;
 const contacts=(g.state.contacts??=[]);
 for(const stranger of g.state.units){
  if(stranger.hp<=0||stranger.team===0||contacts.includes(stranger.team)||!g.visibleAt(stranger.x,stranger.z))continue;
  const person=g.state.units.find(u=>u.team===0&&u.hp>0&&Math.hypot(u.x-stranger.x,u.z-stranger.z)<=12);
  if(!person)continue;
  contacts.push(stranger.team);
  g.state.encounter={team:stranger.team,person:person.id,stranger:stranger.id,resume:!g.state.paused};
  g.state.paused=true;g.banner(`Your people encounter ${g.tribe(stranger.team).name}`,5);return;
 }
}
export function answerEncounter(g:Game,reaction:'greet'|'withdraw'|'observe'){
 const encounter=g.state.encounter;if(!encounter)return;
 const t=g.tribe(encounter.team),u=g.state.units.find(u=>u.id===encounter.person&&u.hp>0);
 if(reaction==='greet'&&!g.isFoe(0,t.id)){t.trust=Math.min(1,(t.trust||0)+.05);t.tension=Math.max(0,t.tension-.03);g.banner('Greetings exchanged. A trader must carry offers and bring back their report.',5);}
 if(reaction==='withdraw'&&u){g.interruptMission(u);u.recalled=true;u.order='move';u.node=null;u.target=null;u.pillage=-1;u.attackDestination=null;u.jobLock=false;u.huntOnly=false;}
 g.state.encounter=undefined;g.state.paused=!encounter.resume;
}
