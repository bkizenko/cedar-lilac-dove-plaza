import type {Game} from '../game/sim';
import {personName} from '../game/people';
export type TamingWatch={state?:object;refusals:number;successes:number};
/** A real taming refusal or success since the last check, read from the village's paid handling history. The first check only learns. */
export function watchTaming(g:Game,w:TamingWatch):{line:string;sfx:'invalid'|'trade'}|null{
 const h=g.tribe(0)?.domestication,ref=h?.refusals||0,suc=h?.successes||0;
 if(w.state!==g.state){w.state=g.state;w.refusals=ref;w.successes=suc;return null;}
 const refused=ref>w.refusals,tamed=suc>w.successes;w.refusals=ref;w.successes=suc;
 if(!refused&&!tamed)return null;
 const last=[...(h?.recent??[])].reverse().find(r=>r.outcome===(refused?'refused':'success'));
 const who=last?g.state.units.find(u=>u.id===last.handlerId):undefined,name=who?personName(who):'Your handler',kind=last?.species||'animal';
 if(refused)return{line:`The wild ${kind} shied away from ${name}${last?.paidFood?` — ${last.paidFood} food of bait spent`:''}; it will be calmer next time`,sfx:'invalid'};
 return{line:`${name} calmed a wild ${kind} and is leading it home`,sfx:'trade'};
}
