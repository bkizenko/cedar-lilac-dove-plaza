import type {Engine} from '../../game/engine';
import {societyIdentity} from '../../game/societyIdentity';
import {societyRelation} from '../../game/societyRelations';
import {personName} from '../../game/people';
import {LeaderPortrait} from '../h/LeaderPortrait';
/** Portrait of whoever you are meeting. Dress follows the society's real flag colours and age; mood comes only from the
 * relation you have actually recorded with them (unknown until contact is made). Presentation only, no state is touched. */
export function EncounterPortrait({engine,strangerId}:{engine:Engine;strangerId:number}){
 const g=engine.game,u=g.state.units.find(x=>x.id===strangerId);if(!u)return null;
 const team=u.team,id=societyIdentity(g,team),rel=societyRelation(g,0,team);
 const relation=rel.known||rel.trust>0||rel.grievance>0||rel.hostile?(rel.hostile?-60:Math.max(-100,Math.min(100,Math.round((rel.trust-rel.grievance)*100)))):undefined;
 return <div className="encounter-portrait"><LeaderPortrait leaderId={u.id} worldSeed={g.state.seed} era={g.tribe(team).age??0} name={personName(u)} society={g.tribe(team).name} colors={{primary:id.primary,secondary:id.secondary}} relation={relation}/></div>;
}
