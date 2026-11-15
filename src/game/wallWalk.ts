import type {Game} from './sim';
import type {Building,Unit} from './types';
import {assignGuardDuty,assignTowerGuard,dutyOf,GUARD_DUTY_RULES} from './guardDuty';
import {doctrineOf} from './combatDoctrine';
/** Wall-walk: finished walls, gates and towers give posts and a patrol loop. Posts stand just inside the wall line.
 * Nothing is built here; the layout is derived from what exists, so it follows the player's walls. */
export const WALL_TYPES=['palisade','stonewall','gate'] as const;
export const WALL_WALK_RULES={version:1,insetMeters:2.5,loopSpacingMeters:14,maximumLoopPoints:GUARD_DUTY_RULES.maximumRoute,minimumWalls:3} as const;
export type WallPost={kind:'gate'|'tower';x:number;z:number;buildingId:number};
export type WallLayout={centre:{x:number;z:number};posts:WallPost[];loop:{x:number;z:number}[];walls:number};
export function wallLayout(g:Game,team=0):WallLayout|null{
 const own=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&g.finished(b)&&!b.plannedCost);
 const walls=own.filter(b=>(WALL_TYPES as readonly string[]).includes(b.type)),towers=own.filter(b=>b.type==='watchtower');
 if(walls.length<WALL_WALK_RULES.minimumWalls)return null;
 const camp=g.campOf(team),pieces=[...walls,...towers],cx=pieces.reduce((n,b)=>n+b.x,0)/pieces.length,cz=pieces.reduce((n,b)=>n+b.z,0)/pieces.length;
 const inset=(b:Building)=>{const d=Math.hypot(cx-b.x,cz-b.z)||1,k=Math.min(WALL_WALK_RULES.insetMeters,d)/d;const p={x:b.x+(cx-b.x)*k,z:b.z+(cz-b.z)*k};return p;};
 const posts:WallPost[]=[...walls.filter(b=>b.type==='gate').map(b=>({kind:'gate' as const,buildingId:b.id,...inset(b)})),...towers.map(b=>({kind:'tower' as const,buildingId:b.id,...inset(b)}))];
 // Loop: walls ordered by angle around the centre, thinned to roughly one point per loopSpacingMeters of ring.
 const ring=[...walls].sort((a,b)=>Math.atan2(a.z-cz,a.x-cx)-Math.atan2(b.z-cz,b.x-cx));
 const loop:{x:number;z:number}[]=[];let last:{x:number;z:number}|null=null;
 for(const b of ring){const p=inset(b);if(!last||Math.hypot(p.x-last.x,p.z-last.z)>=WALL_WALK_RULES.loopSpacingMeters){loop.push({x:p.x,z:p.z});last=p;}}
 if(loop.length>WALL_WALK_RULES.maximumLoopPoints){const step=loop.length/WALL_WALK_RULES.maximumLoopPoints;const thin:typeof loop=[];for(let i=0;i<WALL_WALK_RULES.maximumLoopPoints;i++)thin.push(loop[Math.floor(i*step)]);loop.splice(0,loop.length,...thin);}
 return {centre:{x:cx||camp.x,z:cz||camp.z},posts,loop:loop.length>=2?loop:[],walls:walls.length};
}
/** Put free armed adults on the walls: towers and gates get one guard each, everyone else walks the loop spread around it. */
export function manWalls(g:Game,unitIds:readonly number[],team=0){
 if(!doctrineOf(g)?.guardDuty)return {accepted:false,reason:'Guard duty rules are not enabled for this save',posts:0,patrols:0};
 const lay=wallLayout(g,team);if(!lay)return {accepted:false,reason:`Finish at least ${WALL_WALK_RULES.minimumWalls} wall sections first`,posts:0,patrols:0};
 const units=unitIds.map(id=>g.state.units.find(u=>u.id===id)).filter((u):u is Unit=>!!u&&u.team===team&&u.hp>0&&u.militia&&!u.prisoner);
 if(!units.length)return {accepted:false,reason:'No armed adults selected',posts:0,patrols:0};
 let posts=0,patrols=0,i=0;const queue=[...units];
 for(const p of lay.posts){const u=queue.shift();if(!u)break;const r=p.kind==='tower'?assignTowerGuard(g,u.id,p.buildingId):assignGuardDuty(g,u.id,'post',p.x,p.z);if(r.accepted)posts++;else queue.unshift(u);}
 if(lay.loop.length>=2){
  const n=lay.loop.length,step=Math.max(1,Math.floor(n/Math.max(1,queue.length)));
  for(const u of queue){const r=assignGuardDuty(g,u.id,'patrol',lay.loop[0].x,lay.loop[0].z);if(!r.accepted)continue;const d=dutyOf(g,u);if(d){d.route=lay.loop.map(p=>({...p}));d.leg=(i*step)%n;}i++;patrols++;}
 }
 return {accepted:posts+patrols>0,reason:posts+patrols?`${posts} on posts, ${patrols} walking the wall`:'Nobody could take a wall duty',posts,patrols};
}
