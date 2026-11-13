import type {Game} from './sim';
import type {Building,Cost} from './types';
import {fieldTerrain} from './fieldTerrain';
import {calendar} from './settlement';
/** First small irrigation model (opt-in). See docs/IRRIGATION_RESEARCH.md.
 * Old saves have no `state.irrigation`, so every function here returns the legacy value for them.
 * Nothing in this file uses Math.random or Date.now; all numbers are design values, not historical figures. */
export type LiftKind='none'|'shaduf'|'wheel';
export interface Ditch{id:number;team:number;x0:number;z0:number;x1:number;z1:number;level:number;length:number;done:number;lift:LiftKind;fieldId?:number}
export interface IrrigationState{version:1;nextId:number;ditches:Ditch[]}
type Switched={irrigation?:IrrigationState};
const st=(g:Game)=>g.state as Game['state']&Switched;
/** Public controls stay off until physical reserved digging, observed freshwater and strict geometry are qualified. Existing experimental save data is retained. */
export const IRRIGATION_PLAYER_RELEASE_READY:boolean=false;
export const IRRIGATION_RULES=Object.freeze({
 version:1,maximumDitches:48,maximumLengthMetres:90,intakeSearchMetres:80,
 /** Ground may sit this far above the intake water level and still be fed by a dug (gravity) channel. */
 gravityHeadMetres:.6,liftHeadMetres:{none:.6,shaduf:2.6,wheel:5.1} as Record<LiftKind,number>,
 /** Shaduf range in the source is 1-6 m; the game uses a conservative 2 m of extra head. */
 liftCost:{none:{},shaduf:{wood:8},wheel:{wood:24,stone:4}} as Record<LiftKind,Cost>,wheelMinimumAge:2,
 foodPerMetre:.5,metresPerWorkerSecond:.04,maximumWorkerEquivalents:3,workersPerEquivalent:4,
 touchMetres:3,riversideMetres:6,
 /** Yield multipliers when enabled. Drought resistance is separate (effectiveDroughtWater). */
 yield:{dry:1,riverside:1.05,ditch:1.12},
 droughtWater:{riverside:.9,ditch:.95}
});
export const irrigationEnabled=(g:Game)=>st(g).irrigation?.version===1;
/** Opt-in switch. Idempotent; never touches buildings, terrain or other state. */
export function enableIrrigation(g:Game){return st(g).irrigation??={version:1,nextId:1,ditches:[]};}
export const ditchesOf=(g:Game)=>st(g).irrigation?.ditches??[];
export const ditchComplete=(d:Ditch)=>d.done>=d.length-1e-6;
type Pt={x:number;z:number};
const dry=(g:Game,x:number,z:number)=>g.height(x,z)>=g.waterAt(x,z)+.05;
/** Nearest point on an axis-aligned plot rectangle (rect centre/size) to a point. */
export function nearestOnRect(r:{x:number;z:number;w:number;d:number},p:Pt):Pt{return{x:Math.max(r.x-r.w/2,Math.min(r.x+r.w/2,p.x)),z:Math.max(r.z-r.d/2,Math.min(r.z+r.d/2,p.z))};}
const rectDistance=(r:{x:number;z:number;w:number;d:number},p:Pt)=>{const n=nearestOnRect(r,p);return Math.hypot(n.x-p.x,n.z-p.z);};
/** Nearest bank (dry point beside open water) by marching 32 compass rays. Deterministic. */
export function findIntake(g:Game,from:Pt,radius=IRRIGATION_RULES.intakeSearchMetres){
 let best:{bank:Pt;level:number;distance:number}|null=null;
 for(let k=0;k<32;k++){
  const a=k/32*Math.PI*2,ux=Math.cos(a),uz=Math.sin(a);let prev=from;
  for(let r=2;r<=radius;r+=2){
   const x=from.x+ux*r,z=from.z+uz*r;
   if(!dry(g,x,z)){if(!best||r<best.distance)best={bank:{x:prev.x,z:prev.z},level:g.waterAt(x,z),distance:r};break;}
   prev={x,z};
  }
 }
 return best;
}
export interface DitchPlan{ok:boolean;issue:string|null;from:Pt;to:Pt;level:number;length:number;rise:number;lift:LiftKind;cost:Cost;diggingSeconds:number}
/** Pure read: what would a ditch from the nearest water to this field need? */
export function planDitch(g:Game,team:number,field:Pick<Building,'x'|'z'|'w'|'d'>):DitchPlan{
 const R=IRRIGATION_RULES,empty={from:{x:0,z:0},to:{x:0,z:0},level:0,length:0,rise:0,lift:'none' as LiftKind,cost:{} as Cost,diggingSeconds:0};
 const fail=(issue:string,extra:Partial<DitchPlan>={})=>({ok:false,issue,...empty,...extra});
 if(!irrigationEnabled(g))return fail('Irrigation rules are off for this settlement');
 if(ditchesOf(g).length>=R.maximumDitches)return fail('Too many ditches already');
 const centre={x:field.x,z:field.z},intake=findIntake(g,centre);
 if(!intake)return fail('No river or lake within reach of this field');
 const to=nearestOnRect(field,intake.bank),from=intake.bank,length=Math.hypot(to.x-from.x,to.z-from.z);
 if(length>R.maximumLengthMetres)return fail('Water is too far for a ditch here',{from,to,length,level:intake.level});
 if(length<R.riversideMetres)return fail('This field already borders water',{from,to,length,level:intake.level});
 let top=-Infinity;const n=Math.max(2,Math.ceil(length/2));
 for(let i=0;i<=n;i++){const x=from.x+(to.x-from.x)*i/n,z=from.z+(to.z-from.z)*i/n;top=Math.max(top,g.height(x,z));}
 const rise=Math.max(0,top-intake.level),tribe=g.tribe(team);
 const lift:LiftKind|null=rise<=R.liftHeadMetres.none?'none':rise<=R.liftHeadMetres.shaduf?'shaduf':rise<=R.liftHeadMetres.wheel?'wheel':null;
 const base={from,to,level:intake.level,length,rise};
 if(!lift)return fail('The ground is too high above the water for any lift',base);
 if(lift==='wheel'&&(tribe?.age??0)<R.wheelMinimumAge)return fail('Needs a water wheel — a later age',{...base,lift});
 const l=R.liftCost[lift],cost:Cost={food:Math.ceil(length*R.foodPerMetre),...l};
 const diggingSeconds=Math.round(length/R.metresPerWorkerSecond);
 if(!g.canAfford(team,cost))return fail('Not enough stores for this ditch',{...base,lift,cost,diggingSeconds});
 return{ok:true,issue:null,...base,lift,cost,diggingSeconds};
}
/** Commission the ditch: pays food (diggers' rations) and any lift materials up front. Digging then takes real game time. */
export function digDitch(g:Game,team:number,fieldId:number){
 const f=g.state.buildings.find(b=>b.id===fieldId&&b.team===team&&b.type==='farm'&&b.hp>0);
 if(!f)return{ok:false as const,reason:'Choose one of your fields'};
 const plan=planDitch(g,team,f);if(!plan.ok)return{ok:false as const,reason:plan.issue||'Cannot dig here'};
 const s=st(g).irrigation!;
 if(s.ditches.some(d=>d.fieldId===fieldId&&d.team===team))return{ok:false as const,reason:'This field already has a ditch'};
 g.spend(team,plan.cost);
 const d:Ditch={id:s.nextId++,team,x0:plan.from.x,z0:plan.from.z,x1:plan.to.x,z1:plan.to.z,level:plan.level,length:plan.length,done:0,lift:plan.lift,fieldId};
 s.ditches.push(d);invalidate(g);return{ok:true as const,ditch:d};
}
/** Person-seconds of ditch work per second: real healthy workers, capped. Paused in the harvest quarter, when everyone is cutting. */
export function diggingRate(g:Game,team:number){
 const R=IRRIGATION_RULES,people=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker').length;
 if(calendar(g).phase===2||people<=0)return 0;
 return Math.min(R.maximumWorkerEquivalents,Math.max(1,Math.floor(people/R.workersPerEquivalent)))*R.metresPerWorkerSecond;
}
export function tickIrrigation(g:Game,dt:number){
 const s=st(g).irrigation;if(!s||!s.ditches.length)return;
 let changed=false;
 for(const d of s.ditches)if(!ditchComplete(d)){const r=diggingRate(g,d.team);if(r>0){d.done=Math.min(d.length,d.done+r*dt);changed=ditchComplete(d)||changed;}}
 if(changed){invalidate(g);const done=s.ditches.find(d=>ditchComplete(d)&&d.team===0&&!(announced.get(g)?.has(d.id)));if(done){(announced.get(g)??announced.set(g,new Set()).get(g)!).add(done.id);g.banner('A ditch is dug — water reaches the field',4);}}
}
const announced=new WeakMap<Game,Set<number>>();
export type FieldWaterKind='dry'|'riverside'|'ditch';
export interface FieldWater{kind:FieldWaterKind;ditchId?:number;lift?:LiftKind;digging?:number;label:string}
const cache=new WeakMap<Game,{state:unknown;stamp:number;map:Map<number,FieldWater>}>();
function invalidate(g:Game){cache.delete(g);}
/** Does open water lie within a few metres of the plot edge? */
export function riverside(g:Game,f:Pick<Building,'x'|'z'|'w'|'d'>){
 const m=IRRIGATION_RULES.riversideMetres,hw=f.w/2+m,hd=f.d/2+m,n=Math.max(2,Math.ceil(Math.max(f.w,f.d)/3));
 for(let i=0;i<=n;i++){const t=i/n-.5;
  for(const [x,z] of [[f.x+t*(f.w+2*m),f.z-hd],[f.x+t*(f.w+2*m),f.z+hd],[f.x-hw,f.z+t*(f.d+2*m)],[f.x+hw,f.z+t*(f.d+2*m)]])if(!dry(g,x,z))return true;}
 return false;
}
export function fieldWater(g:Game,b:Building):FieldWater{
 if(!irrigationEnabled(g))return{kind:'dry',label:'Rain-fed (irrigation rules off)'};
 let c=cache.get(g);const stamp=Math.floor(g.state.time/5);
 if(!c||c.state!==g.state||c.stamp!==stamp){c={state:g.state,stamp,map:new Map()};cache.set(g,c);}
 const hit=c.map.get(b.id);if(hit)return hit;
 let r:FieldWater;
 const rect={x:b.x,z:b.z,w:b.w,d:b.d},mine=ditchesOf(g).filter(d=>d.team===b.team&&rectDistance(rect,{x:d.x1,z:d.z1})<=IRRIGATION_RULES.touchMetres);
 const done=mine.find(ditchComplete),working=mine.find(d=>!ditchComplete(d));
 if(done)r={kind:'ditch',ditchId:done.id,lift:done.lift,label:done.lift==='none'?'Ditch-fed':done.lift==='shaduf'?'Ditch-fed, shaduf lift':'Ditch-fed, water wheel'};
 else if(riverside(g,b))r={kind:'riverside',label:'Riverside — natural moisture'};
 else r={kind:'dry',digging:working?working.done/working.length:undefined,label:working?`Rain-fed — ditch ${Math.round(working.done/working.length*100)}% dug`:'Rain-fed'};
 c.map.set(b.id,r);return r;
}
/** Multiplier on a harvest estimate. Exactly 1 for old saves and for rain-fed fields. */
export function irrigationYield(g:Game,b:Building){return irrigationEnabled(g)?IRRIGATION_RULES.yield[fieldWater(g,b).kind]:1;}
/** Drought water potential of a field: legacy value unless irrigated. Drought resistance, not immunity. */
export function effectiveDroughtWater(g:Game,b:Building){
 const base=fieldTerrain(g,b).droughtWater;if(!irrigationEnabled(g))return base;
 const k=fieldWater(g,b).kind;return k==='dry'?base:Math.max(base,IRRIGATION_RULES.droughtWater[k]);
}
export function irrigationSummary(g:Game,team=0){
 const farms=g.state.buildings.filter(b=>b.type==='farm'&&b.team===team&&b.hp>0),k={dry:0,riverside:0,ditch:0};
 for(const b of farms)k[fieldWater(g,b).kind]++;
 return{fields:farms.length,...k,wet:k.riverside+k.ditch};
}
/** Optional save fields. Absent is valid (legacy). */
export function validIrrigation(state:any,size:number){
 const v=state.irrigation;if(v===undefined)return true;
 if(!v||typeof v!=='object'||v.version!==1||!Number.isInteger(v.nextId)||v.nextId<1||!Array.isArray(v.ditches)||v.ditches.length>IRRIGATION_RULES.maximumDitches)return false;
 const num=(n:any,lim:number)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=lim,ids=new Set<number>();
 return v.ditches.every((d:any)=>{
  if(!d||typeof d!=='object'||!Number.isInteger(d.id)||d.id<1||d.id>=v.nextId||ids.has(d.id))return false;ids.add(d.id);
  return Number.isInteger(d.team)&&Array.isArray(state.tribes)&&state.tribes.some((t:any)=>t.id===d.team)&&num(d.x0,size/2)&&num(d.z0,size/2)&&num(d.x1,size/2)&&num(d.z1,size/2)&&num(d.level,512)
   &&num(d.length,IRRIGATION_RULES.maximumLengthMetres+.01)&&d.length>=0&&num(d.done,d.length+1e-6)&&d.done>=0&&['none','shaduf','wheel'].includes(d.lift)&&(d.fieldId===undefined||Number.isInteger(d.fieldId));
 });
}
