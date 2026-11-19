import{inheritedCommunityCaches,primaryCommunityHome}from'./communityCaches';
import type {Game} from './sim';
import type {Building,Unit} from './types';
import {connectedForUnit} from './waterTravel';
/** Camp identity survives loss of architecture. Stores are the society's existing
 * finite inventory, not a second stockpile or a virtual completed building. */
export const CAMP_RULES={version:1,unbuiltGeneration:10,deliveryRadiusMeters:3,peopleSupported:5} as const;
export type CampAnchor={kind:'camp';team:number;x:number;z:number;y:number;radius:number};
export type SupplyDrop=Building|CampAnchor;
export function campAnchor(g:Game,team:number):CampAnchor|null {
 const c=g.state.campSites?.find(c=>c.team===team)||g.world.camps.find(c=>c.team===team);
 if(!c||!g.tribe(team)?.alive)return null;
 return {kind:'camp',team,x:c.x,z:c.z,y:g.height(c.x,c.z),radius:CAMP_RULES.deliveryRadiusMeters};
}
export function supplyDrops(g:Game,team:number):SupplyDrop[]{
 const buildings=g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&(['townhall','warehouse','cornerstone'].includes(b.type)||team===3&&b.raiderCamp===true));
 // A functioning hall supersedes the original camp's communal cache.
 const camp=primaryCommunityHome(g,team)?.kind==='camp'?campAnchor(g,team):buildings.some(b=>b.type==='townhall')?null:campAnchor(g,team);
 const inherited=inheritedCommunityCaches(g,team).filter(p=>p.kind==='camp').map(p=>({kind:'camp' as const,team,x:p.x,y:p.y,z:p.z,radius:CAMP_RULES.deliveryRadiusMeters}));
 return camp?[...buildings,camp,...inherited]:[...buildings,...inherited];
}
export function supplyApproach(g:Game,u:Unit,drop:SupplyDrop){
 if(drop.kind!=='camp')return g.interactionSpot(u,drop);
 let best:{x:number;z:number}|null=null,dist=Infinity;
 for(const radius of [0,drop.radius])for(let i=0;i<(radius?16:1);i++){
  const a=i*Math.PI/8,x=drop.x+Math.cos(a)*radius,z=drop.z+Math.sin(a)*radius;
  if(!g.walkable(x,z)||!connectedForUnit(g,u,x,z))continue;
  if(g.state.buildings.some(b=>g.solidBuilding(b)&&Math.abs(x-b.x)<b.w*.4+u.r&&Math.abs(z-b.z)<b.d*.4+u.r))continue;
  const d=Math.hypot(x-u.x,z-u.z);if(d<dist){best={x,z};dist=d;}
 }
 return best;
}
export function supplyReached(g:Game,u:Unit,drop:SupplyDrop,spot:{x:number;z:number}){
 return drop.kind==='camp'?Math.hypot(u.x-spot.x,u.z-spot.z)<=1:g.buildingWorkReached(u,drop);
}
/** Another body standing on a building's frontage spot blocks it physically
 * (escort and captive, guards and a returning raider all aim at the same
 * nearest spot). Near such a crowd, walk to the nearest free frontage instead;
 * any frontage sample counts as reaching the building. */
const frontageTaken=(g:Game,u:Unit,p:{x:number;z:number})=>g.state.units.some(o=>o!==u&&o.hp>0&&!o.boat&&Math.hypot(o.x-p.x,o.z-p.z)<=1.2);
export function uncrowdedApproach(g:Game,u:Unit,b:Building,spot:{x:number;z:number}){
 if(Math.hypot(u.x-spot.x,u.z-spot.z)>6||!frontageTaken(g,u,spot))return spot;
 let best:{x:number;z:number}|null=null,score=Infinity;
 for(let i=0;i<16;i++){const a=i*Math.PI/8,p=g.interactionSpot({...u,x:b.x+Math.sin(a)*40,z:b.z+Math.cos(a)*40},b);if(!p||frontageTaken(g,u,p))continue;const d=Math.hypot(p.x-u.x,p.z-u.z);if(d<score){score=d;best=p;}}
 return best||spot;
}
