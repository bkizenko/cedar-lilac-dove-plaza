import {inBounds} from './worldgen';
import type {Game} from './sim';
import type {Building} from './types';
import {climateAt} from './ecology';
import {seaSurfaceY} from './localWater';
import {penPastureState} from './penPasture';
import {penFeedCapacity} from './penGeometry';
/** Salt and hay: real, finite places in the world that wild-craft jobs draw from.
 * Coastal evaporation pans fill slowly in warm weather; salt licks and mines are finite; hay meadows regrow only in the warm months.
 * Every unit an actor carries home was first removed from a site, and hay forked to a herd is debited from the store and credited
 * to that pen's feed, with the remainder returned. Sites are found by deterministic scanning (seed and terrain, no random numbers),
 * created once per wild-craft world and stay absent on saves without it. */
export type SiteKind='pan'|'lick'|'mine'|'meadow';
export type WildSite={id:number;kind:SiteKind;x:number;z:number;left:number;cap:number};
export const SITE_RULES={maxSites:8,scanFrom:22,scanTo:190,ring:14,angles:24,reach:4,
 /** Units a single trip takes. */
 draw:{salt:2,hay:4},fork:8,
 cap:{pan:16,lick:10,mine:36,meadow:24},
 /** Per second at a warm 20C; pans need heat and meadows need growth, nothing renews in the cold. */
 refill:{pan:.004,lick:0,mine:0,meadow:.003},warm:{pan:14,meadow:8}} as const;
export const SITE_ICON:Record<SiteKind,string>={pan:'🧂',lick:'🪨',mine:'⛏',meadow:'🌾'};
export const SITE_NAME:Record<SiteKind,string>={pan:'Salt pan on the shore',lick:'Salt lick',mine:'Salt seam',meadow:'Hay meadow'};
export const siteGood=(k:SiteKind)=>k==='meadow'?'hay':'salt';
const hash=(a:number,b:number)=>{let n=Math.imul(a^0x9e3779b9,0x85ebca6b)^Math.imul(b+0x7f4a7c15,0xc2b2ae35);n=Math.imul(n^(n>>>15),0x2c1b3c6d);n^=n>>>12;return(n>>>0)/4294967296;};

/** Deterministic scan around the camp. Only ground a person can stand on; pans need real sea within a few metres. */
export function generateSites(g:Game):WildSite[]{
 const camp=g.campOf(0),sea=seaSurfaceY(g.world),out:WildSite[]=[],spin=hash(g.state.seed|0,7)*Math.PI*2;let next=1;
 const stand=(x:number,z:number)=>g.walkable(x,z)&&inBounds(x,z,6,g.world.size);
 const nearSea=(x:number,z:number)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const px=x+dx*SITE_RULES.reach*1.5,pz=z+dz*SITE_RULES.reach*1.5;return g.height(px,pz)<sea-.05&&Math.abs(g.waterAt(px,pz)-sea)<.2;})&&g.height(x,z)>sea+.25;
 const pans:WildSite[]=[],high:{x:number;z:number;h:number}[]=[],meadows:WildSite[]=[];
 for(let r=SITE_RULES.scanFrom;r<=SITE_RULES.scanTo;r+=SITE_RULES.ring)for(let i=0;i<SITE_RULES.angles;i++){
  const a=spin+(i+hash(r,i)*.6)*Math.PI*2/SITE_RULES.angles,x=camp.x+Math.cos(a)*r,z=camp.z+Math.sin(a)*r;if(!stand(x,z))continue;
  if(pans.length<2&&nearSea(x,z)&&pans.every(p=>Math.hypot(p.x-x,p.z-z)>40))pans.push({id:0,kind:'pan',x,z,left:SITE_RULES.cap.pan/2,cap:SITE_RULES.cap.pan});
  else if(r<=80&&meadows.length<2&&g.height(x,z)>sea+.8&&!nearSea(x,z)&&Math.abs(g.height(x+3,z)-g.height(x-3,z))<.5&&meadows.every(m=>Math.hypot(m.x-x,m.z-z)>30))meadows.push({id:0,kind:'meadow',x,z,left:SITE_RULES.cap.meadow,cap:SITE_RULES.cap.meadow});
  else if(r>=50)high.push({x,z,h:g.height(x,z)});
 }
 high.sort((a,b)=>b.h-a.h||a.x-b.x||a.z-b.z);
 const lick=high[0],mine=high.find(h=>lick&&Math.hypot(h.x-lick.x,h.z-lick.z)>60);
 const list:WildSite[]=[...pans,...(lick?[{id:0,kind:'lick' as const,x:lick.x,z:lick.z,left:SITE_RULES.cap.lick,cap:SITE_RULES.cap.lick}]:[]),...(mine?[{id:0,kind:'mine' as const,x:mine.x,z:mine.z,left:SITE_RULES.cap.mine,cap:SITE_RULES.cap.mine}]:[]),...meadows];
 for(const s of list.slice(0,SITE_RULES.maxSites)){s.id=next++;out.push(s);}
 return out;
}
export function siteNear(sites:readonly WildSite[]|undefined,kind:'salt'|'hay',x:number,z:number){return sites?.find(s=>siteGood(s.kind)===kind&&Math.hypot(s.x-x,s.z-z)<=SITE_RULES.reach);}
/** Remove up to `want` units from a site. Returns what was actually taken. */
export function drawFromSite(s:WildSite,want:number){const take=Math.max(0,Math.min(want,Math.floor(s.left)));s.left-=take;return take;}
/** Pans and meadows renew only while it is warm enough. Caps never exceed; licks and mines never refill. */
export function renewSites(g:Game,sites:WildSite[],dt:number){
 for(const s of sites){const rate=SITE_RULES.refill[s.kind];if(rate<=0||s.left>=s.cap)continue;
  const warm=SITE_RULES.warm[s.kind as 'pan'|'meadow'],t=climateAt(g,s.x,s.z).temperature;if(t<warm)continue;
  s.left=Math.min(s.cap,s.left+rate*dt*Math.min(2,(t-warm+6)/12));}
}
export function penAt(g:Game,x:number,z:number):Building|undefined{return g.state.buildings.find(b=>b.type==='pen'&&b.team===0&&b.hp>0&&g.finished(b)&&Math.abs(b.x-x)<=Math.max(2,b.w/2)&&Math.abs(b.z-z)<=Math.max(2,b.d/2));}
/** Credit forked hay to a pen's own feed store up to its capacity. Returns the units the pen took; the rest stays with the carrier. */
export function feedPen(pen:Building,hay:number){const p=penPastureState(pen),room=Math.max(0,penFeedCapacity(pen)-p.feed),take=Math.min(hay,room);p.feed+=take;p.feedDelivered!+=take;return take;}

/** Strict shape and bounds for saved sites; absent is legacy. */
export function validSites(v:unknown,worldSize:number):boolean{
 if(v===undefined)return true;if(!Array.isArray(v)||v.length>SITE_RULES.maxSites)return false;const ids=new Set<number>();
 return v.every(s=>{if(!s||typeof s!=='object'||Object.keys(s).sort().join()!=='cap,id,kind,left,x,z')return false;
  const n=(k:number)=>typeof k==='number'&&Number.isFinite(k);
  return Number.isSafeInteger(s.id)&&s.id>0&&!ids.has(s.id)&&ids.add(s.id)&&Object.hasOwn(SITE_RULES.cap,s.kind)&&n(s.x)&&n(s.z)&&Math.abs(s.x)<=worldSize/2&&Math.abs(s.z)<=worldSize/2&&n(s.cap)&&s.cap===SITE_RULES.cap[s.kind as SiteKind]&&n(s.left)&&s.left>=0&&s.left<=s.cap+1e-9;});
}
