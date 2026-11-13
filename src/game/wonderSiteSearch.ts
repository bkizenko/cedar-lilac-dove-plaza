import type {Game} from './sim';
import {hash32} from './rulerCore';
import {stationsOf} from './waystations';
import {wonderSiteRules,siteIssues} from './wonderSites';
import {wonderDef,type WonderId} from './wonderDefs';
import {WONDER_RULES,liveWonders,townHall} from './wonderRules';

/** Deterministic ground search for the registry: rings around the hall at hashed angles. A site must be clear of buildings, other wonders and
 * waystations and pass the wonder's own requirement. Results are cached for a short game time (the land does not change that fast), so the
 * panel, suggest mode and the rival planner can all ask without rescanning. */
export type SiteChoice={x:number;z:number;distance:number;facts:Record<string,number|boolean|string|null>};
export type SiteProbe={sites:SiteChoice[];/** when none passed: the issues of the candidate that came closest */nearest:string[]};
const cache=new WeakMap<Game,Map<string,{t:number;v:SiteProbe}>>();
function issuesAt(g:Game,team:number,id:WonderId,x:number,z:number):{issues:string[];facts:Record<string,number|boolean|string|null>}|null{
 const R=WONDER_RULES,def=wonderDef(id),h=townHall(g,team);if(!def||!h)return null;
 if(g.state.buildings.some(b=>b.hp>0&&Math.hypot(b.x-x,b.z-z)<R.footprint.w/2+Math.max(b.w,b.d)/2+R.clearOfBuildings))return{issues:['Buildings are in the way'],facts:{}};
 if(liveWonders(g).some(r=>Math.hypot(r.x-x,r.z-z)<R.spacingFromWonder))return{issues:['Too close to another wonder'],facts:{}};
 if(stationsOf(g).some(s=>Math.hypot(s.x-x,s.z-z)<R.spacingFromStation))return{issues:['Too close to a waystation'],facts:{}};
 const f={x,z,w:R.footprint.w,d:R.footprint.d,rotation:0};
 if(def.legacySite){const r=wonderSiteRules(g,def.legacySite,f,team);return{issues:r.issues,facts:r.facts};}
 const r=siteIssues(g,def.site,f,team,h);return{issues:r.issues,facts:r.facts};
}
/** Do these exact coordinates suit this wonder for this society? (player's chosen site) */
export function siteIssuesAt(g:Game,team:number,id:WonderId,x:number,z:number):string[]{return issuesAt(g,team,id,x,z)?.issues??['No town hall'];}
/** Up to `limit` sites that pass, at least `separation` m apart, nearest rings first. Deterministic. */
export function probeWonderSites(g:Game,team:number,id:WonderId,limit=4,separation=45):SiteProbe{
 const key=`${team}:${id}:${limit}`,m=cache.get(g)??(cache.set(g,new Map()),cache.get(g)!),hit=m.get(key);
 if(hit&&g.state.time-hit.t<WONDER_RULES.suggestTtlSeconds&&hit.t<=g.state.time)return hit.v;
 const R=WONDER_RULES,h=townHall(g,team),out:SiteChoice[]=[];let nearest:string[]=[];
 if(h){
  const start=hash32('wonder-angle',g.state.seed,team,id.length)%R.anglesPerRing;
  outer:for(const ring of R.ringsMetres)for(let k=0;k<R.anglesPerRing;k++){
   const a=((k+start)%R.anglesPerRing)/R.anglesPerRing*Math.PI*2,x=Math.round((h.x+Math.cos(a)*ring)*10)/10,z=Math.round((h.z+Math.sin(a)*ring)*10)/10;
   if(out.some(s=>Math.hypot(s.x-x,s.z-z)<separation))continue;
   const r=issuesAt(g,team,id,x,z);if(!r)continue;
   if(r.issues.length===0){out.push({x,z,distance:Math.round(Math.hypot(x-h.x,z-h.z)),facts:r.facts});if(out.length>=limit)break outer;}
   else if(!nearest.length||r.issues.length<nearest.length)nearest=r.issues;
  }
 }
 const v:SiteProbe={sites:out,nearest:out.length?[]:nearest};m.set(key,{t:g.state.time,v});return v;
}
/** First passing site (the old single-site search, same ring order). */
export function findWonderSite(g:Game,team:number,family:WonderId):{x:number;z:number}|null{
 const p=probeWonderSites(g,team,family,1);return p.sites[0]?{x:p.sites[0].x,z:p.sites[0].z}:null;
}
export const clearSiteCache=(g:Game)=>{cache.delete(g);};
