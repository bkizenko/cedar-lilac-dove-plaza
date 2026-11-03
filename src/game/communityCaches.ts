import type{Game}from'./sim';import type{HandoverAnchor}from'./communityHandoverTypes';import{currentCommunityOwner}from'./communityHandoverValidation';
export const COMMUNITY_CACHE_SLOTS=100;
const key=(p:HandoverAnchor)=>p.kind==='building'?`building:${p.id}`:`camp:${p.x}:${p.z}`;
/** Preserve the recipient's real home; an inherited first array entry is not
 * an instruction to relocate. A newly founded own hall or explicit camp move
 * can still replace a formerly unbuilt camp. */
export function primaryCommunityHome(g:Game,team:number):HandoverAnchor|undefined{const rows=g.state.communityHandovers,original=rows?.find(r=>r.toTeam===team&&r.recipientCacheAnchor)?.recipientCacheAnchor;if(!original)return;const point=(b:{id:number;x:number;y:number;z:number}):HandoverAnchor=>({kind:'building',id:b.id,x:b.x,y:b.y,z:b.z});if(original.kind==='building'){const b=g.state.buildings.find(b=>b.id===original.id&&b.team===team&&g.finished(b));return b?point(b):undefined;}const joined=new Set(rows!.flatMap(r=>r.siteIds)),founded=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&g.finished(b)&&!joined.has(b.id));if(founded)return point(founded);const moved=g.state.campSites?.find(c=>c.team===team);return moved?{kind:'camp',x:moved.x,y:g.height(moved.x,moved.z),z:moved.z}:original;}
/** A base cache already exists at each actual joined community; warehouse
 * capacity is counted separately. Repeated custody events add no extra place. */
export function inheritedCommunityCaches(g:Game,team:number){
 const rows=g.state.communityHandovers;if(!rows?.length)return[];const home=g.campOf(team),nativeHall=g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&g.finished(b)).sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z)||a.id-b.id)[0];const original=primaryCommunityHome(g,team);const primary=original?key(original):nativeHall?`building:${nativeHall.id}`:`camp:${home.x}:${home.z}`;const seen=new Set([primary]),out:HandoverAnchor[]=[];
 for(const r of rows){const p=r.cacheAnchor;if(r.scope!=='society'||!p||!g.tribe(team)?.alive||seen.has(key(p)))continue;
  if(p.kind==='building'){const b=g.state.buildings.find(b=>b.id===p.id&&b.team===team&&g.finished(b)&&['townhall','warehouse','cornerstone'].includes(b.type));if(!b)continue;}
  else if(currentCommunityOwner(g.state,r.toTeam,r.timeSeconds)!==team||![[0,0],[3,0],[-3,0],[0,3],[0,-3]].some(([x,z])=>g.walkable(p.x+x,p.z+z)))continue;
  seen.add(key(p));out.push(p);
 }return out;
}
export function inheritedCacheCapacity(g:Game,team:number){return inheritedCommunityCaches(g,team).length*COMMUNITY_CACHE_SLOTS;}
