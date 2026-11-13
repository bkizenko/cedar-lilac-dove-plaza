import type {Game} from './sim';
import type {Unit} from './types';
import {validWonderRecord,WONDER_FAMILIES,type WonderRecord} from './wonderRecords';
import type {WonderFunction} from '../scene/wonderKit';
import {wonderSiteRules,type WonderFamily as SiteFamily} from './wonderSites';
import {hash32} from './rulerCore';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {connectedForUnit} from './waterTravel';
import {lifeEvent} from './communities';
import {ensureRulers} from './rulersRuntime';
import {onGameEvent} from './kinshipBridge';
import {stationsOf} from './waystations';

/** Founding wonders: a society that is old enough, big enough and rich enough raises one great work.
 *
 * Nothing is free and nothing appears. A wonder needs
 *  - era: the society has reached `minAge` (Iron) and holds a finished town hall,
 *  - labour: at least `minPeople` living working-age residents and `minCrew` idle workers to walk out and build,
 *  - goods: real wood, stone and food come out of the society's own stock when work starts, and it keeps a reserve afterwards,
 *  - ground: the family's own placement rules (wonderSiteRules: river, shore, prominence, slope...) pass on dry, unbuilt, explored land.
 * The crew then walks to the site and adds real seconds of labour (`need`); the rising record's `progress` follows the labour paid, and the
 * layer draws it growing. Rivals found theirs by themselves (seeded, no random numbers); the player's own wonders start only by command.
 * Cistern and assembly court need earthworks (wonderEarthworks.ts digs) and are not founded here yet.
 * Switch: `state.wonderFounding.enabled`. It is created on the first tick of a new game; saves without it keep the legacy behaviour (no wonders). */
export const WONDER_RULES={
 version:1,minAge:2,minPeople:30,minCrew:3,maxCrew:4,
 /** keep this much after paying */
 reserve:{wood:40,stone:20,food:150},
 base:{wood:70,stone:110,food:120,labour:1500},
 /** per-family additions to the base (a harbour wants timber; an observatory dressed stone; a garden a feast of food) */
 extra:{observatory:{stone:30},terraceGarden:{food:40},harbor:{wood:40},millMarket:{wood:30}} as Record<string,Partial<Record<'wood'|'stone'|'food'|'labour',number>>>,
 footprint:{w:32,d:32},
 /** founded families (cistern and assembly court wait for the earthworks hook) */
 families:['observatory','terraceGarden','harbor','millMarket'] as readonly WonderFunction[],
 maxPerTeam:3,maxTotal:12,cooldownSeconds:540,
 planEvery:10,workEvery:2,
 ringsMetres:[45,70,95,130,170,210,260,300],anglesPerRing:16,retrySeconds:600,spacingFromWonder:90,spacingFromStation:40,clearOfBuildings:10,
 workRadius:7,
} as const;
const SITE_FAMILY:Record<WonderFunction,SiteFamily>={observatory:'ringObservatory',terraceGarden:'cascadeGarden',harbor:'crescentHarbor',millMarket:'millMarket',cistern:'canyonCistern',assembly:'assemblyCourt'};
export type WonderFoundingState={version:1;enabled:boolean;nextId:number;lastStart:Record<string,number>};
type WState={wonders?:WonderRecord[];wonderFounding?:WonderFoundingState};
const st=(g:Pick<Game,'state'>)=>g.state as Game['state']&WState;
export const wondersOf=(g:Pick<Game,'state'>):readonly WonderRecord[]=>st(g).wonders??[];
export const wonderFoundingEnabled=(g:Pick<Game,'state'>)=>st(g).wonderFounding?.enabled===true;
export function setWonderFoundingEnabled(g:Game,on:boolean){const s=st(g);const w=s.wonderFounding??(s.wonderFounding={version:1,enabled:false,nextId:1+Math.max(0,...(s.wonders??[]).map(r=>r.id)),lastStart:{}});w.enabled=!!on;}
export const wonderLabel=(f:WonderFunction)=>({observatory:'ring observatory',terraceGarden:'terrace garden',harbor:'great harbour',millMarket:'mill market',cistern:'cistern',assembly:'assembly court'}[f]);

/** Goods and labour a family costs. */
export function wonderCost(f:WonderFunction){const R=WONDER_RULES,e=R.extra[f]??{};return{wood:R.base.wood+(e.wood??0),stone:R.base.stone+(e.stone??0),food:R.base.food+(e.food??0),labour:R.base.labour+(e.labour??0)};}

const tribeOk=(g:Game,team:number)=>team>=0&&team!==3&&!!g.tribe(team)&&g.tribe(team).alive!==false;
const livingWorkers=(g:Game,team:number)=>g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u));
function eligibleCrew(g:Game,u:Unit,team:number,x:number,z:number){
 return u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.boat&&!hasTaskCommitment(u)&&!u.envoy&&!u.visit&&!u.trade&&!u.scout&&!u.expedition&&!u.emergency&&
  (u.order==='idle'||u.order==='hold'||u.order==='gather')&&(u.carry||0)===0&&Math.hypot(u.x-x,u.z-z)<600&&connectedForUnit(g,u,x,z);
}
const active=(g:Game,team:number)=>wondersOf(g).find(r=>r.team===team&&r.project);
const hall=(g:Game,team:number)=>g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0&&g.finished(b));

/** Why this society cannot found a wonder now (null = it can start). Shared by the rival planner and the player's command. */
export function wonderFoundingIssue(g:Game,team:number,family?:WonderFunction):string|null{
 const R=WONDER_RULES;
 if(!wonderFoundingEnabled(g))return 'Wonders are not enabled for this save';
 if(!tribeOk(g,team))return 'No society to build it';
 const t=g.tribe(team),mine=wondersOf(g).filter(r=>r.team===team);
 if(t.age<R.minAge)return 'The society has not reached the age of great works';
 if(!hall(g,team))return 'A wonder needs a finished town hall';
 if(active(g,team))return 'A wonder is already rising';
 if(mine.length>=R.maxPerTeam||wondersOf(g).length>=R.maxTotal)return 'No more wonders can stand here';
 if(family&&mine.some(r=>r.family===family))return `You already hold a ${wonderLabel(family)}`;
 if(family&&!R.families.includes(family))return `A ${wonderLabel(family)} needs earthworks that are not yet commissioned`;
 const last=st(g).wonderFounding?.lastStart[String(team)];if(last!==undefined&&g.state.time-last<R.cooldownSeconds)return 'The people need time to recover from the last great work';
 if(livingWorkers(g,team).length<R.minPeople)return `A wonder needs at least ${R.minPeople} working hands`;
 if(g.state.units.filter(u=>eligibleCrew(g,u,team,hall(g,team)!.x,hall(g,team)!.z)).length<R.minCrew)return `A wonder needs ${R.minCrew} free hands to raise it`;
 if(family){const miss=goodsMissing(t,wonderCost(family));if(miss)return miss;}
 return null;
}
function goodsMissing(t:{wood:number;stone:number;food:number},c:{wood:number;stone:number;food:number}){
 const r=WONDER_RULES.reserve;
 if(t.wood<c.wood+r.wood)return `Needs ${c.wood} wood (and ${r.wood} kept in reserve)`;
 if(t.stone<c.stone+r.stone)return `Needs ${c.stone} stone (and ${r.stone} kept in reserve)`;
 if(t.food<c.food+r.food)return `Needs ${c.food} food (and ${r.food} kept in reserve)`;
 return null;
}

/** Deterministic ground search: rings around the hall at hashed angles; the first site whose family rules pass and that is clear of work. */
const noGround=new WeakMap<Game,Map<string,number>>();
export function findWonderSite(g:Game,team:number,family:WonderFunction):{x:number;z:number}|null{
 const R=WONDER_RULES,h=hall(g,team);if(!h)return null;
 // a scan that found nothing is not repeated every planning tick: the land does not change that fast
 let misses=noGround.get(g);if(!misses)noGround.set(g,misses=new Map());const mk=`${team}:${family}`,missed=misses.get(mk);
 if(missed!==undefined&&g.state.time-missed<R.retrySeconds)return null;
 const start=hash32('wonder-angle',g.state.seed,team,family.length)%R.anglesPerRing;
 for(const ring of R.ringsMetres)for(let k=0;k<R.anglesPerRing;k++){
  const a=((k+start)%R.anglesPerRing)/R.anglesPerRing*Math.PI*2,x=Math.round((h.x+Math.cos(a)*ring)*10)/10,z=Math.round((h.z+Math.sin(a)*ring)*10)/10;
  if(g.state.buildings.some(b=>b.hp>0&&Math.hypot(b.x-x,b.z-z)<R.footprint.w/2+Math.max(b.w,b.d)/2+R.clearOfBuildings))continue;
  if(wondersOf(g).some(r=>Math.hypot(r.x-x,r.z-z)<R.spacingFromWonder))continue;
  if(stationsOf(g).some(s=>Math.hypot(s.x-x,s.z-z)<R.spacingFromStation))continue;
  const f={x,z,w:R.footprint.w,d:R.footprint.d,rotation:0};
  if(wonderSiteRules(g,SITE_FAMILY[family],f,team).issues.length===0){misses.delete(mk);return {x,z};}
 }
 misses.set(mk,g.state.time);return null;
}

/** Found a wonder: checks everything, finds ground, spends the goods and opens the record at progress 0. */
export function foundWonder(g:Game,team:number,family:WonderFunction):{ok:true;id:number}|{ok:false;reason:string}{
 const issue=wonderFoundingIssue(g,team,family);if(issue)return {ok:false,reason:issue};
 const site=findWonderSite(g,team,family);if(!site)return {ok:false,reason:`No ground near your hall suits a ${wonderLabel(family)}`};
 const s=st(g),F=s.wonderFounding!,c=wonderCost(family),t=g.tribe(team),R=WONDER_RULES;
 g.spend(team,{wood:c.wood,stone:c.stone,food:c.food});
 const id=F.nextId++,list=s.wonders??(s.wonders=[]);
 list.push({id,team,family,x:site.x,z:site.z,w:R.footprint.w,d:R.footprint.d,yaw:(hash32('wonder-yaw',g.state.seed,id)%4)*Math.PI/2,seed:hash32('wonder-seed',g.state.seed,id)>>>0,progress:0,
  era:Math.min(5,t.age),wealth:Math.round(Math.min(1,.4+.1*t.age)*100)/100,founded:g.state.time,project:{labour:0,need:c.labour,crewIds:[],started:g.state.time,paid:{wood:c.wood,stone:c.stone,food:c.food}}});
 F.lastStart[String(team)]=g.state.time;
 if(team===0)g.banner(`Your people begin a ${wonderLabel(family)}.`,5);
 else lifeEvent(g,team,`${t.name} begin a ${wonderLabel(family)}`,site.x,site.z);
 return {ok:true,id};
}

/* ------------------------------------------------------------------ planning (rivals) and work (everyone) */
function plan(g:Game){
 const tick=Math.floor(g.state.time/WONDER_RULES.planEvery);
 for(let team=1;team<g.state.tribes.length;team++){
  if(team===3||!tribeOk(g,team)||wonderFoundingIssue(g,team))continue;
  // the next family this society is drawn to, in a seeded order; a society that cannot afford it waits
  const fams=WONDER_RULES.families.filter(f=>!wondersOf(g).some(r=>r.team===team&&r.family===f));if(!fams.length)continue;
  const pick=fams[hash32('wonder-family',g.state.seed,team,wondersOf(g).filter(r=>r.team===team).length)%fams.length];
  if(goodsMissing(g.tribe(team),wonderCost(pick)))continue;
  // stagger: a ready society starts on a hashed tick so rivals do not all found at once
  if(hash32('wonder-when',g.state.seed,team,tick)%6!==0)continue;
  foundWonder(g,team,pick);
 }
}
function release(g:Game,r:WonderRecord){
 for(const id of r.project?.crewIds??[]){const u=g.state.units.find(p=>p.id===id);if(u&&u.hp>0&&u.workReason?.startsWith('Raising')){u.order='idle';u.stationOnArrival=false;u.workReason='Finished the great work';}}
 if(r.project)r.project.crewIds=[];
}
function work(g:Game,dt:number){
 const R=WONDER_RULES;
 for(const r of wondersOf(g)){
  const p=r.project;if(!p)continue;
  if(!tribeOk(g,r.team)){r.waiting='No society to build it';continue;}
  p.crewIds=p.crewIds.filter(id=>{const u=g.state.units.find(x=>x.id===id);return !!u&&u.hp>0&&u.team===r.team&&u.type==='worker';});
  // fill the crew from idle hands, nearest first
  if(p.crewIds.length<R.maxCrew){
   const free=g.state.units.filter(u=>!p.crewIds.includes(u.id)&&eligibleCrew(g,u,r.team,r.x,r.z)).sort((a,b)=>Math.hypot(a.x-r.x,a.z-r.z)-Math.hypot(b.x-r.x,b.z-r.z)||a.id-b.id);
   for(const u of free){if(p.crewIds.length>=R.maxCrew)break;p.crewIds.push(u.id);}
  }
  if(!p.crewIds.length){r.waiting='No spare hands to build it';continue;}
  r.waiting=undefined;
  const label=`Raising a ${wonderLabel(r.family)}`;
  for(const id of p.crewIds){
   const u=g.state.units.find(x=>x.id===id)!;
   if(Math.hypot(u.x-r.x,u.z-r.z)<R.workRadius){u.order='hold';u.vx=0;u.vz=0;u.workReason=label;p.labour+=dt;}
   else if(!(u.order==='move'&&u.stationOnArrival&&Math.hypot(u.tx-r.x,u.tz-r.z)<3)){
    if(u.order==='idle'||u.order==='hold'||u.order==='move'){u.order='move';u.tx=r.x;u.tz=r.z;u.stationOnArrival=true;u.workReason=label;}
    else p.crewIds=p.crewIds.filter(x=>x!==id);
   }
  }
  r.progress=Math.max(0,Math.min(1,p.labour/p.need));
  if(p.labour>=p.need){
   release(g,r);r.progress=1;r.project=undefined;r.done=g.state.time;
   const t=g.tribe(r.team);
   if(r.team===0)g.banner(`A ${wonderLabel(r.family)} now stands: a work for the ages.`,6);
   else lifeEvent(g,r.team,`${t.name} have raised a ${wonderLabel(r.family)}`,r.x,r.z);
   const sr=ensureRulers(g)?.societies?.[String(r.team)];if(sr)sr.ledger=onGameEvent(sr.ledger,'wonder.complete');
  }
 }
}
const clock=new WeakMap<Game,{plan:number;work:number}>();
export function tickWonders(g:Game,dt:number){
 const s=st(g);
 // a brand-new game switches founding on; saves made before it carry no switch and keep the legacy behaviour
 if(!s.wonderFounding&&g.state.time<WONDER_RULES.planEvery)s.wonderFounding={version:1,enabled:true,nextId:1,lastStart:{}};
 if(!wonderFoundingEnabled(g)&&!(s.wonders?.some(r=>r.project)))return;
 const c=clock.get(g)??{plan:0,work:0};c.plan+=dt;c.work+=dt;clock.set(g,c);
 if(wonderFoundingEnabled(g)&&c.plan>=WONDER_RULES.planEvery){c.plan=0;plan(g);}
 if(c.work>=WONDER_RULES.workEvery){const d=c.work;c.work=0;work(g,d);}
}

/* ------------------------------------------------------------------ read model and validation */
export type WonderView={id:number;team:number;family:WonderFunction;label:string;x:number;z:number;progress:number;rising:boolean;crew:number;waiting?:string};
export function wonderViews(g:Game,team=0):WonderView[]{
 return wondersOf(g).filter(r=>r.team===team||g.exploredAt(r.x,r.z)).map(r=>({id:r.id,team:r.team,family:r.family,label:wonderLabel(r.family),x:r.x,z:r.z,progress:r.progress,rising:!!r.project,crew:r.project?.crewIds.length??0,waiting:r.waiting}));
}
export function validWonders(s:any):boolean{
 const list=s?.wonders,f=s?.wonderFounding;
 if(f!==undefined){
  if(!f||f.version!==1||typeof f.enabled!=='boolean'||!Number.isSafeInteger(f.nextId)||f.nextId<1||!f.lastStart||typeof f.lastStart!=='object'||!Object.values(f.lastStart).every(v=>typeof v==='number'&&Number.isFinite(v)))return false;
 }
 if(list===undefined)return true;
 if(!Array.isArray(list)||list.length>WONDER_RULES.maxTotal*2)return false;
 const ids=new Set<number>();
 for(const r of list){if(!validWonderRecord(r)||ids.has(r.id)||r.id<1)return false;ids.add(r.id);if(f&&r.id>=f.nextId)return false;}
 return true;
}
export const WONDER_FOUNDED_FAMILIES=WONDER_FAMILIES;
