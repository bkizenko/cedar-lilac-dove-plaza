import type {GameState} from '../game/types';
import {idleWhy} from './idleWhy';
/** Deep winter or drought with many hands genuinely out of work: one line suggesting purposeful work or a faster
 * clock. Pure; counts residents whose idle reason (idleWhy) is that no job is open. Null when the village is busy. */
export function quietSeasonCue(state:GameState,season:string){
 const lean=/winter/i.test(season)?'winter':state.weather==='drought'?'drought':null;
 if(!lean||state.paused||(state.speed??1)>=4)return null;
 const adults=state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.prisoner);
 const idle=adults.filter(u=>idleWhy(state,u)?.startsWith('No job open')).length;
 if(idle<2||idle*2<adults.length)return null;
 return {lean,idle,line:`Quiet ${lean}: ${idle} ${idle===1?'person has':'people have'} no work. Mend tools, top up stores or teach a craft — or speed up time.`};
}
