import type {Game} from '../game/sim';
import {alliesOf} from '../game/alliances';
/** A real treaty change for the player's village, with the sound that marks it. */
export type Sting={line:string;sfx:'age'|'trade'|'lose'|'horn'};
export type TreatyWatch={state?:object;foes:Map<number,boolean>;allies:Set<number>;fronts:Map<number,string>};
export const newTreatyWatch=():TreatyWatch=>({foes:new Map(),allies:new Set(),fronts:new Map()});
type Front={id:number;defenderTeam:number;attackerTeam:number;phase:string};
const frontsOf=(g:Game)=>((g.state as unknown as {capitulation?:{fronts?:Front[]}}).capitulation?.fronts??[]).filter(f=>f.defenderTeam===0||f.attackerTeam===0);
/** Compares alliances, war/peace and surrender fronts with the last check. The first check (and a new village) only learns. */
export function watchTreaties(g:Game,w:TreatyWatch):Sting[]{
 const fresh=w.state!==g.state;
 const name=(t:number)=>g.tribe(t)?.name||'a neighbour';
 const teams=g.state.tribes.map((_,i)=>i).filter(i=>i!==0&&i!==3&&!!g.tribe(i));
 const foes=new Map(teams.map(t=>[t,!!g.isFoe(0,t)])),allies=new Set(alliesOf(g,0)),fronts=new Map(frontsOf(g).map(f=>[f.id,f.phase]));
 const out:Sting[]=[];
 if(!fresh){
  for(const t of allies)if(!w.allies.has(t))out.push({line:`Alliance sworn with ${name(t)}`,sfx:'age'});
  for(const t of w.allies)if(!allies.has(t)&&g.tribe(t))out.push({line:`The alliance with ${name(t)} has ended`,sfx:'lose'});
  for(const [t,foe] of foes){const was=w.foes.get(t);if(was===undefined)continue;
   if(was&&!foe)out.push({line:`Truce with ${name(t)} — the fighting stops`,sfx:'trade'});
   else if(!was&&foe)out.push({line:`${name(t)} and your village are now at war`,sfx:'horn'});}
  for(const f of frontsOf(g)){const was=w.fronts.get(f.id);if(was===f.phase)continue;
   const other=name(f.defenderTeam===0?f.attackerTeam:f.defenderTeam),ours=f.defenderTeam===0;
   if(f.phase==='capitulated')out.push(ours?{line:`Your hall has yielded to ${other}`,sfx:'lose'}:{line:`${other} offers to capitulate`,sfx:'age'});
   else if(f.phase==='accepted'&&was)out.push(ours?{line:`${other} has taken your surrender`,sfx:'lose'}:{line:`${other} has capitulated to you`,sfx:'age'});}
 }
 w.state=g.state;w.foes=foes;w.allies=allies;w.fronts=fronts;
 return out;
}
