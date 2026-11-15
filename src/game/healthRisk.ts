/** Illness risk, Vitruvian site health, and visible pregnancy. Pure reads plus two small ticks.
 *  Game tuning, not medicine: risk rises with crowding (people, penned animals), thin drinking water, unhoused
 *  residents and a marshy low site; a dry, slightly raised site near (not in) water lowers it. */
import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {survivalStatus} from './survivalNeeds';
import {livestockCrowding,livestockIllnessMultiplier} from './livestockCrowding';
export const HEALTH_RULES={crowdStart:.85,crowdFull:1.3,waterLowSeconds:300,
 weights:{crowding:.7,animals:.3,water:.5,housing:.4},siteWeight:.3,checkSeconds:60,baseIllnessPerCheck:.02,illnessSeconds:120,illnessDamage:.2,
 pregnancySeconds:240,pregnantSpeed:.85,lateTermSeconds:90,lateTermSpeed:.75,lateTermLoadFactor:.7,lateTermWorkRate:.8,garmentLifeSeconds:7200} as const;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n)),ramp=(v:number,a:number,b:number)=>clamp((v-a)/(b-a));
export type SiteHealth={score:number;marsh:number;water:'none'|'near'|'adjacent';raised:number;notes:string[]};
/** Vitruvius: avoid marshy ground, prefer a dry rise with fresh water close but not underfoot. Sampled around the camp. */
export function siteHealth(g:Game,x:number,z:number):SiteHealth{
 let wet=0,n=0,hSum=0,nearWater=false,adjacent=false;const h0=g.height(x,z);
 for(const r of [15,30,60])for(let i=0;i<8;i++){const a=i*Math.PI/4,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;if(!g.withinWorld(px,pz,1))continue;const h=g.height(px,pz),w=g.waterAt(px,pz);n++;hSum+=h;
  if(h<w+.05){if(r<=15)adjacent=true;else nearWater=true;}else if(h<w+.6&&r<=30)wet++;}
 const marsh=n?clamp(wet/Math.max(1,n/2)):0,raised=n?clamp((h0-hSum/n)/3,-1,1):0,water=adjacent?'adjacent':nearWater?'near':'none';
 const notes:string[]=[];if(marsh>.3)notes.push('Marshy ground nearby');if(raised<-.2)notes.push('Low site, poor drainage');if(raised>.2)notes.push('Dry rise');
 if(water==='near')notes.push('Fresh water within reach');if(water==='adjacent')notes.push('Water at the doorstep (damp)');
 const score=clamp(-marsh*1+raised*.5+(water==='near'?.3:water==='adjacent'?-.2:0),-1,1);
 return{score,marsh,water,raised,notes};
}
export type HealthRisk={multiplier:number;crowding:number;animals:number;water:number;housing:number;site:SiteHealth;people:number;capacity:number;factors:string[]};
export function healthRisk(g:Game,team=0):HealthRisk{
 const R=HEALTH_RULES,people=g.state.units.filter(u=>u.team===team&&u.hp>0&&!u.prisoner&&u.type!=='leader').length,capacity=Math.max(1,g.popCap(team));
 const crowding=ramp(people/capacity,R.crowdStart,R.crowdFull);
 const animalCrowd=(livestockIllnessMultiplier(livestockCrowding(g,team))-1)/.5;// 0 below 80% full of pasture, 1 at 130%
 let water=0;try{const s=survivalStatus(g,team);if(s.enabled)water=1-ramp(s.waterSeconds,0,R.waterLowSeconds);}catch{}
 const hall=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0),camp=hall||g.campOf(team);
 const housed=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!u.prisoner&&u.homeHall!==undefined).length;
 const housing=people>0?clamp(1-capacity/Math.max(1,people)):0;void housed;
 const site=siteHealth(g,camp.x,camp.z);
 const multiplier=1+R.weights.crowding*crowding+R.weights.animals*animalCrowd+R.weights.water*water+R.weights.housing*housing-R.siteWeight*site.score;
 const factors:string[]=[];if(crowding>.15)factors.push('Crowded homes');if(animalCrowd>.15)factors.push('Crowded animals');if(water>.15)factors.push('Poor drinking water');if(housing>.1)factors.push('Not enough housing');factors.push(...site.notes.filter(n=>/Marsh|Low site/.test(n)));
 return{multiplier:Math.max(.5,multiplier),crowding,animals:animalCrowd,water,housing,site,people,capacity,factors};
}
const hash=(a:number,b:number)=>{let h=(a*374761393+b*668265263)>>>0;h=((h^(h>>>13))*1274126177)>>>0;return((h^(h>>>16))>>>0)/4294967296;};
/** Once a minute each society rolls for one new illness, scaled by the risk multiplier. Deterministic in time and team. */
export function tickIllness(g:Game,dt:number){
 pregnancyNow=g.state.time;
 const R=HEALTH_RULES,s=g.state as any;s.illnessCheckAt??=R.checkSeconds;if(g.state.time<s.illnessCheckAt)return;s.illnessCheckAt=g.state.time+R.checkSeconds;
 for(const tr of g.state.tribes){if(!tr.alive||tr.id===3)continue;
  const risk=healthRisk(g,tr.id),p=R.baseIllnessPerCheck*risk.multiplier*(risk.multiplier>1.3?2:1);if(hash(Math.floor(g.state.time),tr.id)>=p)continue;
  const pool=g.state.units.filter(u=>u.team===tr.id&&u.hp>0&&u.type!=='leader'&&!u.prisoner&&!u.sickUntil);if(!pool.length)continue;
  const u=pool[Math.floor(hash(Math.floor(g.state.time)+7,tr.id)*pool.length)];
  u.hp=Math.max(1,u.hp-u.maxHp*R.illnessDamage);u.sickUntil=g.state.time+R.illnessSeconds;
  if(tr.id===0)g.banner(`A resident falls ill${risk.factors.length?' — '+risk.factors[0].toLowerCase():''}`,4);}
}
/** Clothing wears with active use. Returns the condition lost. */
export function wearGarment(u:Unit,dt:number){
 const w=u.garment;if(!w||w.condition<=0||u.hp<=0||!(dt>0))return 0;const active=u.resting?.25:['idle','hold'].includes(u.order)?.5:1,loss=Math.min(w.condition,dt*active/HEALTH_RULES.garmentLifeSeconds);w.condition-=loss;return loss;
}
export const isPregnant=(g:Game,u:Unit)=>(u.pregnantUntil??0)>g.state.time;
/** Last stretch before birth: slower on foot, much slower when hauling a load, and slower at the bench. */
export const isLateTerm=(g:Game,u:Unit)=>isPregnant(g,u)&&(u.pregnantUntil??0)-g.state.time<=HEALTH_RULES.lateTermSeconds;
export function pregnancySpeed(g:Game,u:Unit){if(!isPregnant(g,u))return 1;if(!isLateTerm(g,u))return HEALTH_RULES.pregnantSpeed;const loaded=(u.carry||0)>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0);return HEALTH_RULES.lateTermSpeed*(loaded?HEALTH_RULES.lateTermLoadFactor:1);}
let pregnancyNow=0;
/** Sim clock for craftingEffort, which has no Game handle; refreshed every tick by tickIllness. */
export function pregnancyWorkRate(u:Pick<Unit,'pregnantUntil'>){const left=(u.pregnantUntil??0)-pregnancyNow;return left>0&&left<=HEALTH_RULES.lateTermSeconds?HEALTH_RULES.lateTermWorkRate:1;}
export function pregnancyNote(g:Game,u:Unit){if(!isPregnant(g,u))return'';return isLateTerm(g,u)?'late term: slower, avoids heavy hauling and works the bench at reduced pace':'moves slower';}
/** Pick the next mother (first adult worker, stable order) and mark her; birth later uses her as parent. Player society only. */
export function beginPregnancy(g:Game,team:number,secondsToBirth:number){
 if(team!==0)return;
 const mother=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!u.prisoner&&!isDependent(g,u)&&!u.sickUntil&&!isPregnant(g,u)&&u.maturesAt===undefined);
 if(mother)mother.pregnantUntil=g.state.time+Math.max(30,Math.min(HEALTH_RULES.pregnancySeconds,secondsToBirth));
}
export function takeMother(g:Game,team:number){const m=g.state.units.find(u=>u.team===team&&u.hp>0&&u.pregnantUntil!==undefined);if(m)m.pregnantUntil=undefined;return m;}
