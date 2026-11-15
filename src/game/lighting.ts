import type {Game} from './sim';
import {dutyOf} from './guardDuty';
/** Night torches at gates and guard posts. Off until the player lights them; burns real stock: logs in the Stone Age, charcoal from Bronze,
 * olive oil from the Classical age when the village has it. When fuel runs out the torches go dark. Lit ground counts as lit for night work
 * and lets guards see their full reach at night; unlit guards see 40% less. */
export type LightFuel='wood'|'charcoal'|'oil';
export type LightingState={version:1;on:boolean;fuel:LightFuel|null;burn:{wood:number;charcoal:number;oil:number};sites:number;used:{wood:number;charcoal:number;oil:number}};
export const LIGHT_RULES={version:1,radiusMeters:12,burnSeconds:{wood:60,charcoal:180,oil:360},woodReserve:6,unlitSightFactor:.6,charcoalAge:1,oilAge:3,maximumSites:64,reviewSeconds:1} as const;
type S=Game['state']&{lighting?:LightingState};
const st=(g:Game)=>g.state as S;
const sitesCache=new WeakMap<Game,{at:number;sites:{x:number;z:number}[]}>();
export const lightingOf=(g:Game)=>st(g).lighting;
export function setTorches(g:Game,on:boolean){
 const s=st(g);if(!s.lighting)s.lighting={version:1,on:false,fuel:null,burn:{wood:0,charcoal:0,oil:0},sites:0,used:{wood:0,charcoal:0,oil:0}};
 s.lighting.on=on;if(!on)s.lighting.fuel=null;sitesCache.delete(g);
 g.banner(on?'Torches will be lit at night on posts and gates, burning logs, charcoal or oil from your stores':'Night torches put out',4);return true;
}
/** Where torches stand: finished gates, and armed people holding a post or tower. */
export function torchSites(g:Game,team=0){
 const c=sitesCache.get(g);if(c&&c.at===g.state.time)return c.sites;
 const sites:{x:number;z:number}[]=[];
 for(const b of g.state.buildings)if(b.team===team&&b.type==='gate'&&b.hp>0&&g.finished(b))sites.push({x:b.x,z:b.z});
 for(const u of g.state.units){if(u.team!==team||u.hp<=0)continue;const d=dutyOf(g,u);if(d&&(d.kind==='post'||d.kind==='tower'))sites.push({x:u.x,z:u.z});if(sites.length>=LIGHT_RULES.maximumSites)break;}
 sitesCache.set(g,{at:g.state.time,sites});return sites;
}
export function chooseFuel(g:Game,team=0):LightFuel|null{
 const t=g.tribe(team);if(!t)return null;const age=t.age||0,items=(t.items||{}) as Record<string,number>;
 if(age>=LIGHT_RULES.oilAge&&(items.oliveOil||0)>=1)return 'oil';
 if(age>=LIGHT_RULES.charcoalAge&&(items.charcoal||0)>=1)return 'charcoal';
 if((t.wood||0)>LIGHT_RULES.woodReserve)return 'wood';
 return null;
}
export function tickLighting(g:Game,dt:number){
 const l=st(g).lighting;if(!l?.on)return;
 if(!g.isNight()){l.fuel=null;l.sites=0;return;}
 const sites=torchSites(g,0);l.sites=sites.length;
 if(!sites.length){l.fuel=null;return;}
 const fuel=chooseFuel(g,0);l.fuel=fuel;if(!fuel)return;
 const t=g.tribe(0);l.burn[fuel]+=sites.length*dt/LIGHT_RULES.burnSeconds[fuel];
 while(l.burn[fuel]>=1){
  if(fuel==='wood'){if((t.wood||0)<1)break;t.wood-=1;}
  else{const items=t.items as Record<string,number>,key=fuel==='oil'?'oliveOil':'charcoal';if((items?.[key]||0)<1)break;items[key]-=1;}
  l.burn[fuel]-=1;l.used[fuel]+=1;
 }
}
/** True when this spot is within a lit torch's reach right now. */
export function isLit(g:Game,x:number,z:number,team=0){
 const l=st(g).lighting;if(!l?.on||!l.fuel||!g.isNight())return false;
 const r=LIGHT_RULES.radiusMeters;for(const s of torchSites(g,team))if(Math.hypot(s.x-x,s.z-z)<=r)return true;return false;
}
export function lightingStatus(g:Game){
 const l=st(g).lighting;if(!l?.on)return 'Torches are out';
 if(!g.isNight())return 'Torches wait for dusk';
 return l.fuel?`${l.sites} torches burning ${l.fuel==='oil'?'oil':l.fuel==='charcoal'?'charcoal':'logs'}`:l.sites?'Torches are dark: no fuel in stores':'No posts or gates to light';
}
export function validLighting(s:any){
 const l=s.lighting;if(l===undefined)return true;
 const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9;
 return !!l&&l.version===1&&typeof l.on==='boolean'&&(l.fuel===null||['wood','charcoal','oil'].includes(l.fuel))&&!!l.burn&&n(l.burn.wood)&&n(l.burn.charcoal)&&n(l.burn.oil)&&n(l.sites)&&!!l.used&&n(l.used.wood)&&n(l.used.charcoal)&&n(l.used.oil);
}
