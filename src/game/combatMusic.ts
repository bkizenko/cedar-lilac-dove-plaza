import type{Game}from'./sim';
export const COMBAT_MUSIC_RULES={homeMetres:40}as const;
/** Soundtrack follows visible weapon contact, not a planned expedition or a
 * hostile resident merely living near the village or across a channel. */
export function combatMusicMood(g:Game):'peace'|'raid'|'pillage'{
 const home=g.campOf(0);let offensive=false;
 for(const actor of g.state.units){
  const target=actor.target;
  if(actor.hp<=0||actor.shelterId||actor.huntOnly||actor.order!=='attack'||!target||target.hp<=0||!g.isFoe(actor.team,target.team)||actor.team!==0&&target.team!==0)continue;
  const foe=actor.team===0?target:actor;
  if(!g.visibleAt(foe.x,foe.z))continue;
  const reach=actor.range+(target.kind==='unit'?target.r+.35:.5);
  if(g.attackDistance(actor,target)>reach)continue;
  if(actor.team!==0||Math.hypot(actor.x-home.x,actor.z-home.z)<COMBAT_MUSIC_RULES.homeMetres)return 'raid';
  if(!actor.demobilizing&&!actor.recalled)offensive=true;
 }
 return offensive?'pillage':'peace';
}
