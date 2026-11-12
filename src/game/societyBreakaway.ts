/** A recognised breakaway becomes its own society (CAT-118 finish; worldOptions.rulersVersion===2). The daughter hearth's residents and the buildings
 * around its hall change team; the new society takes a share of the parent's stores in proportion to its people (conserved, taken from the parent,
 * never created). Knowledge and customs are inherited by copy; stocks, items and missions are not. Bounded: at most MAX_SOCIETIES tribes in all.
 * Returns the new team id, or null when it cannot be done safely (the breakaway then stays a recorded, recognised-but-attached hearth, as before). */
import type {Game} from './sim';
import type {Tribe,Unit,Building} from './types';
import {ensureRulers} from './rulersRuntime';
import {addSociety} from './rulersState';
import {remember,recordAgreement,decisionsEnabled} from './societyRuntime';
import {ensureCivic} from './societyCivicRuntime';
import {seedIdentity,applyIdentity} from './societyCivic';
import {nudgeSocietyRelation,agreeSocietyTruce,type SocietyRelation} from './societyRelations';
import {lifeEvent} from './communities';
import {hash32} from './rulerCore';

export const BREAKAWAY_SOCIETY_RULES={maxSocieties:8,minResidents:4,hallRadius:42} as const;
const COLORS=['#7a4f9c','#b8862f','#3f8f8a','#a24f6e','#5f7f2f','#4a6fa5','#9c5b3a','#6b6b3a'] as const;
const busy=(u:Unit)=>!!(u.expedition||u.scout||u.visit||u.envoy||u.foundingJourney||u.prisoner||u.trade||u.tributeJourney);
export function breakawayResidents(g:Game,parent:number,hall:number):Unit[]{
 return g.state.units.filter(u=>u.team===parent&&u.hp>0&&u.homeHall===hall&&u.type!=='leader'&&!busy(u));
}
export function foundSocietyFromBreakaway(g:Game,hall:number):number|null{
 if(!decisionsEnabled(g))return null;const s=g.state,R=BREAKAWAY_SOCIETY_RULES;
 const rec=(s.communities??[]).find(c=>c.hall===hall&&c.status!=='abandoned'),hb=s.buildings.find(b=>b.id===hall&&b.hp>0&&g.finished(b));
 if(!rec||!hb||rec.team===0||rec.team===3||s.tribes.length>=R.maxSocieties)return null;
 const parent=rec.team,pt=g.tribe(parent);if(!pt||!pt.alive)return null;
 if(s.buildings.filter(b=>b.team===parent&&b.type==='townhall'&&b.hp>0).length<2)return null; // never strip a society of its only hall
 const people=breakawayResidents(g,parent,hall);if(people.length<R.minResidents)return null;
 const total=Math.max(1,s.units.filter(u=>u.team===parent&&u.hp>0).length),share=Math.min(.45,people.length/total),id=s.tribes.length;
 const rulers=ensureRulers(g);if(!rulers)return null;
 // the daughter society: a copy of the parent's knowledge and customs, none of its goods
 const take=(have:number)=>{const n=Math.floor(have*share);return n};
 const base=structuredClone(pt) as Tribe;
 for(const k of ['items','itemFreshness','foodLots','cropTrial','copperExperiment','identity','inheritedCropTrials','survival'] as const)delete (base as Partial<Tribe>)[k];
 const food=take(pt.food),wood=take(pt.wood),stone=take(pt.stone),copper=take(pt.copper),iron=take(pt.iron);
 pt.food-=food;pt.wood-=wood;pt.stone-=stone;pt.copper-=copper;pt.iron-=iron;
 const lots=pt.foodLots,taken:Tribe['foodLots']={};
 if(lots)for(const [k,v] of Object.entries(lots) as [keyof NonNullable<Tribe['foodLots']>,number][]){const n=Math.floor((v||0)*share);if(n>0){taken[k]=n;lots[k]=(v||0)-n;}}
 const water=pt.survival?.waterLiters;let survival:Tribe['survival']|undefined;
 if(pt.survival&&typeof water==='number'){const w=water*share;pt.survival={...pt.survival,waterLiters:water-w};survival={...pt.survival,waterLiters:w};}
 const t:Tribe={...base,id,name:rec.name,short:rec.name,color:COLORS[hash32('breakaway',s.seed,id)%COLORS.length],food,wood,stone,copper,iron,
  ...(Object.keys(taken).length?{foodLots:taken}:{}),...(survival?{survival}:{}),
  alive:true,hostile:false,ally:false,trust:.5,tension:0,aggro:Math.min(.5,(pt.aggro||.3)*.8),lastRaid:s.time,recoveryUntil:0,lastSettlement:s.time,thinkT:2+id*.4,tradeCd:0,fallenT:0,
  leader:'Elder of '+rec.name,leaderTitle:'Headman',csType:'Settled',compactUntil:0};
 s.tribes.push(t);
 // people and the buildings that belong to the hall change hands
 for(const u of people){g.interruptMission(u);u.team=id;u.order='hold';u.job=null;u.node=null;u.target=null;u.escortId=undefined;}
 const near=(b:Building)=>Math.hypot(b.x-hb.x,b.z-hb.z)<=R.hallRadius;
 for(const b of s.buildings)if(b.team===parent&&b.hp>0&&(b.id===hall||(b.type!=='townhall'&&near(b))))b.team=id;
 rec.team=id;
 // the new society's rulers, identity, relations and the record of how it began
 addSociety(rulers,String(id),s.seed);
 const c=ensureCivic(g);if(c){const p=c.identity[String(parent)];const own=seedIdentity(s.seed,id,people.length);
  c.identity[String(id)]=p?applyIdentity({...own,core:{...p.core},traits:{...p.traits},pride:Math.min(.8,p.pride+.05),continuity:p.continuity},{kind:'departure',count:0,pop:people.length}):own;
  const pi=c.identity[String(parent)];if(pi)c.identity[String(parent)]=applyIdentity(pi,{kind:'departure',count:people.length,pop:total,breakaway:true});}
 const list=(s as unknown as {societyRelations?:SocietyRelation[]}).societyRelations??=[];
 for(const [from,to] of [[parent,id],[id,parent]])if(!list.some(r=>r.from===from&&r.to===to))list.push({from,to,known:true,trust:.3,grievance:.2,hostile:false,peaceUntil:0,lastContactSeconds:s.time});
 nudgeSocietyRelation(g,id,parent,{grievance:.2,trust:-.05});agreeSocietyTruce(g,parent,id);
 remember(g,parent,'breakaway',`${rec.name} became its own society with ${people.length} people`,id);remember(g,id,'breakaway',`broke away from ${pt.name} and took its own counsel`,parent);
 recordAgreement(g,parent,id,'truce',`${pt.name} let ${rec.name} go in peace`);
 lifeEvent(g,parent,`${rec.name} is now a society of its own`,hb.x,hb.z);
 return id;
}
