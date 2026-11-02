import type {Game} from './sim';
import type {Unit} from './types';
import {supplyDrops} from './campAnchor';
/** Same physical arrival threshold as existing visitor and report homecoming. */
export function tradeIntelHomeReached(g:Game,u:Unit){
 if(u.boat||u.hp<=0||(u.prisoner&&u.prisoner.phase!=='released')||g.height(u.x,u.z)<g.waterAt(u.x,u.z)+.05)return false;
 return supplyDrops(g,u.team).some(d=>d.kind==='camp'?Math.hypot(u.x-d.x,u.z-d.z)<=d.radius+1:d.type==='townhall'?Math.hypot(u.x-d.x,u.z-d.z)<=Math.max(d.w,d.d)*.55+3:Math.hypot(Math.max(0,Math.abs(u.x-d.x)-d.w*.4),Math.max(0,Math.abs(u.z-d.z)-d.d*.4))<=u.r+1.8);
}
