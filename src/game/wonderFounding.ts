import type {Game} from './sim';
import {validWonderRecord,validLook,WONDER_FAMILIES,type WonderRecord,type WonderLook} from './wonderRecords';
import {hash32} from './rulerCore';
import {lifeEvent} from './communities';
import {ensureRulers} from './rulersRuntime';
import {onGameEvent} from './kinshipBridge';
import {knownSettlement} from './barter';
import {perceive,nextNotice,VAGUE,TIER_ORDER,type Pulse,type Tier} from './fame';
import {wonderDef,stageGoods,stageOfLabour,stageEnds,STAGE_COUNT,WONDER_STAGES,wonderLabel,type WonderId} from './wonderDefs';
import {WONDER_RULES,st,wondersOf,liveWonders,activeWonder,townHall,tribeOk,eligibleCrew,goodsShort,wonderFoundingIssue,wonderCost,wonderSeedFor,wonderFoundingEnabled,setWonderFoundingEnabled,goodsMissing,type WonderFoundingState} from './wonderRules';
import {probeWonderSites,findWonderSite,siteIssuesAt} from './wonderSiteSearch';
import {rivalChoice} from './wonderSuggest';
import {fellWonder,tickRuins} from './ruinsWorld';
import {wonderEffectRows} from './wonderEffects';

export {WONDER_RULES,wondersOf,wonderFoundingEnabled,setWonderFoundingEnabled,wonderCost,wonderFoundingIssue,goodsMissing,findWonderSite,wonderLabel,type WonderFoundingState};

/** Found a wonder: checks everything, finds ground (or takes the player's chosen site if it passes), spends the first stage's goods and opens the
 * record at progress 0. Later stages are delivered as the crews reach them (see work). */
export function foundWonder(g:Game,team:number,family:WonderId,opts:{site?:{x:number;z:number};look?:WonderLook}={}):{ok:true;id:number}|{ok:false;reason:string}{
 const issue=wonderFoundingIssue(g,team,family);if(issue)return {ok:false,reason:issue};
 const def=wonderDef(family)!;
 let site:{x:number;z:number}|null=null;
 if(opts.site){const why=siteIssuesAt(g,team,family,opts.site.x,opts.site.z);if(why.length)return {ok:false,reason:`That ground does not suit a ${def.label}: ${why[0]}`};site={x:Math.round(opts.site.x*10)/10,z:Math.round(opts.site.z*10)/10};}
 else site=findWonderSite(g,team,family);
 if(!site)return {ok:false,reason:`No ground near your hall suits a ${def.label}`};
 if(opts.look&&!validLook(opts.look))return {ok:false,reason:'That style is not valid'};
 const s=st(g),F=s.wonderFounding!,c=wonderCost(family),first=stageGoods(family,0),t=g.tribe(team),R=WONDER_RULES;
 g.spend(team,first);
 const id=F.nextId++,list=s.wonders??(s.wonders=[]);
 const rec:WonderRecord={id,team,family,x:site.x,z:site.z,w:R.footprint.w,d:R.footprint.d,yaw:(hash32('wonder-yaw',g.state.seed,id)%4)*Math.PI/2,seed:wonderSeedFor(g,id),progress:0,
  era:Math.min(5,t.age),wealth:Math.round(Math.min(1,.4+.1*t.age)*100)/100,founded:g.state.time,project:{labour:0,need:c.labour,crewIds:[],started:g.state.time,paid:{wood:first.wood,stone:first.stone,food:first.food,...(first.copper?{copper:first.copper}:{}),...(first.iron?{iron:first.iron}:{})},delivered:1}};
 if(opts.look&&Object.keys(opts.look).length)rec.look={...opts.look};
 list.push(rec);
 F.lastStart[String(team)]=g.state.time;
 if(team===0)g.banner(`Your people begin a ${def.label}.`,5);
 else{lifeEvent(g,team,`${t.name} begin a ${def.label}`,site.x,site.z);famePulse(g,rec,'raise');}
 return {ok:true,id};
}

/* ------------------------------------------------------------------ fame: unknown societies' wonders reach the player as vague rumour */
/** A society the player has not met cannot be seen, so its great works arrive as rumour through real carriers (fame.ts): distance and the
 * number of societies the player already knows set how far and how reliably it travels. Small works never spread (MIN_SPREAD). */
export function famePulse(g:Game,r:WonderRecord,kind:'raise'|'done'):string|null{
 if(r.team===0||knownSettlement(g,r.team)||g.exploredAt(r.x,r.z))return null;
 const def=wonderDef(r.family),F=st(g).wonderFounding;if(!def||!F)return null;
 const home=g.campOf(0),hops=1+Math.floor(Math.hypot(home.x-r.x,home.z-r.z)/350),met=g.state.tribes.filter(t=>t.id!==0&&t.id!==3&&t.alive&&knownSettlement(g,t.id)).length;
 const pulse:Pulse={id:`wonder:${r.id}:${kind}`,society:String(r.team),kind:'wonder',magnitude:def.fame+(kind==='done'?10:-10)+3*(r.era??0),tick:g.state.time};
 const tier=perceive(pulse,{society:pulse.society,hops,reliability:Math.min(.9,.3+.12*met)},g.state.time);
 const seen=(F.notices??(F.notices={})) as Record<string,Tier>,n=nextNotice(seen,{...pulse,society:`${r.team}:${r.id}`},tier);
 if(!n)return null;seen[n.key]=n.tier;
 const text=VAGUE[n.tier]('wonder');g.banner(text,7);return text;
}

/* ------------------------------------------------------------------ planning (rivals) and work (everyone) */
function plan(g:Game){
 const tick=Math.floor(g.state.time/WONDER_RULES.planEvery);
 for(let team=1;team<g.state.tribes.length;team++){
  if(team===3||!tribeOk(g,team)||wonderFoundingIssue(g,team))continue;
  // stagger: a ready society starts on a hashed tick so rivals do not all found at once
  if(hash32('wonder-when',g.state.seed,team,tick)%6!==0)continue;
  // the wonder this society's own needs, cast and ground favour, from the same registry the player sees (no random numbers)
  const pick=rivalChoice(g,team);if(!pick)continue;
  foundWonder(g,team,pick.id,pick.site?{site:pick.site}:{});
 }
 // a society that is gone leaves its great works to the ruins
 for(const r of wondersOf(g))if(r.fallen===undefined&&!tribeOk(g,r.team)&&g.tribe(r.team)?.alive===false){r.project=undefined;r.waiting=undefined;fellWonder(g,r);}
}
function release(g:Game,r:WonderRecord){
 for(const id of r.project?.crewIds??[]){const u=g.state.units.find(p=>p.id===id);if(u&&u.hp>0&&u.workReason?.startsWith('Raising')){u.order='idle';u.stationOnArrival=false;u.workReason='Finished the great work';}}
 if(r.project)r.project.crewIds=[];
}
/** Labour a project may reach with the goods delivered so far. */
const labourCap=(delivered:number,need:number)=>delivered>=STAGE_COUNT?need:stageEnds[delivered-1]*need;
function work(g:Game,dt:number){
 const R=WONDER_RULES;
 for(const r of liveWonders(g)){
  const p=r.project;if(!p)continue;
  if(!tribeOk(g,r.team)){r.waiting='No society to build it';continue;}
  const def=wonderDef(r.family);if(!def){r.waiting='Unknown wonder';continue;}
  p.crewIds=p.crewIds.filter(id=>{const u=g.state.units.find(x=>x.id===id);return !!u&&u.hp>0&&u.team===r.team&&u.type==='worker';});
  // fill the crew from idle hands, nearest first
  if(p.crewIds.length<def.crew.max){
   const free=g.state.units.filter(u=>!p.crewIds.includes(u.id)&&eligibleCrew(g,u,r.team,r.x,r.z)).sort((a,b)=>Math.hypot(a.x-r.x,a.z-r.z)-Math.hypot(b.x-r.x,b.z-r.z)||a.id-b.id);
   for(const u of free){if(p.crewIds.length>=def.crew.max)break;p.crewIds.push(u.id);}
  }
  if(!p.crewIds.length){r.waiting='No spare hands to build it';continue;}
  r.waiting=undefined;
  const label=`Raising a ${def.label}`,delivered=p.delivered??STAGE_COUNT,cap=labourCap(delivered,p.need);
  let present=0;
  for(const id of p.crewIds){
   const u=g.state.units.find(x=>x.id===id)!;
   if(Math.hypot(u.x-r.x,u.z-r.z)<R.workRadius){u.order='hold';u.vx=0;u.vz=0;u.workReason=label;present++;}
   else if(!(u.order==='move'&&u.stationOnArrival&&Math.hypot(u.tx-r.x,u.tz-r.z)<3)){
    if(u.order==='idle'||u.order==='hold'||u.order==='move'){u.order='move';u.tx=r.x;u.tz=r.z;u.stationOnArrival=true;u.workReason=label;}
    else p.crewIds=p.crewIds.filter(x=>x!==id);
   }
  }
  // goods for the next stage are brought in when someone stands at the site and the stock holds them; until then the crew works what is delivered
  if(present>0&&delivered<STAGE_COUNT&&p.labour>=p.need*(stageEnds[delivered-1]-.5*WONDER_STAGES[delivered-1].labour)){
   const goods=stageGoods(r.family,delivered),t=g.tribe(r.team),short=goodsShort(t as never,goods);
   if(!short){g.spend(r.team,goods);const paid=p.paid;paid.wood+=goods.wood;paid.stone+=goods.stone;paid.food+=goods.food;if(goods.copper)paid.copper=(paid.copper??0)+goods.copper;if(goods.iron)paid.iron=(paid.iron??0)+goods.iron;p.delivered=delivered+1;
    if(r.team===0)g.banner(`Stone, timber and food for the ${WONDER_STAGES[delivered].label.toLowerCase()} reach the ${def.label}.`,4);}
   else r.waiting=`Waiting for goods: ${short}`;
  }
  const cap2=labourCap(p.delivered??STAGE_COUNT,p.need);
  if(present>0&&p.labour<cap2)p.labour=Math.min(cap2,p.labour+dt*present);
  else if(present>0&&!r.waiting)r.waiting='Waiting for goods';
  void cap;
  r.progress=Math.max(0,Math.min(1,p.labour/p.need));
  if(p.labour>=p.need&&(p.delivered??STAGE_COUNT)>=STAGE_COUNT){
   release(g,r);r.progress=1;r.project=undefined;r.done=g.state.time;r.waiting=undefined;
   const t=g.tribe(r.team);
   if(r.team===0)g.banner(`A ${def.label} now stands: a work for the ages.`,6);
   else{lifeEvent(g,r.team,`${t.name} have raised a ${def.label}`,r.x,r.z);famePulse(g,r,'done');}
   const sr=ensureRulers(g)?.societies?.[String(r.team)];if(sr)sr.ledger=onGameEvent(sr.ledger,'wonder.complete');
  }
 }
}
const clock=new WeakMap<Game,{plan:number;work:number}>();
export function tickWonders(g:Game,dt:number){
 const s=st(g);
 // a brand-new game switches founding on; saves made before it carry no switch and keep the legacy behaviour
 if(!s.wonderFounding&&g.state.time<WONDER_RULES.planEvery)s.wonderFounding={version:1,enabled:true,nextId:1,lastStart:{}};
 tickRuins(g,dt);
 if(!wonderFoundingEnabled(g)&&!(s.wonders?.some(r=>r.project)))return;
 const c=clock.get(g)??{plan:0,work:0};c.plan+=dt;c.work+=dt;clock.set(g,c);
 if(wonderFoundingEnabled(g)&&c.plan>=WONDER_RULES.planEvery){c.plan=0;plan(g);}
 if(c.work>=WONDER_RULES.workEvery){const d=c.work;c.work=0;work(g,d);}
}

/* ------------------------------------------------------------------ read model and validation */
export type WonderView={id:number;team:number;family:WonderId;label:string;x:number;z:number;progress:number;rising:boolean;crew:number;waiting?:string;/** stages completed 0..4 */level:number;stage:string;fallen?:boolean;effects:string[]};
export function wonderViews(g:Game,team=0):WonderView[]{
 return wondersOf(g).filter(r=>r.team===team||g.exploredAt(r.x,r.z)).map(r=>({id:r.id,team:r.team,family:r.family,label:wonderLabel(r.family),x:r.x,z:r.z,progress:r.progress,rising:!!r.project,crew:r.project?.crewIds.length??0,waiting:r.waiting,
  level:r.project?stageOfLabour(r.project.labour,r.project.need):STAGE_COUNT,stage:r.project?WONDER_STAGES[Math.min(STAGE_COUNT-1,stageOfLabour(r.project.labour,r.project.need))].label:'Standing',fallen:r.fallen!==undefined||undefined,
  effects:r.done!==undefined&&r.fallen===undefined?(wonderEffectRows(g.state,r.team).find(e=>e.id===r.family)?.words??[]):[]}));
}
export function validWonders(s:any):boolean{
 const list=s?.wonders,f=s?.wonderFounding;
 if(f!==undefined){
  if(!f||f.version!==1||typeof f.enabled!=='boolean'||!Number.isSafeInteger(f.nextId)||f.nextId<1||!f.lastStart||typeof f.lastStart!=='object'||!Object.values(f.lastStart).every(v=>typeof v==='number'&&Number.isFinite(v)))return false;
  if(f.notices!==undefined&&(!f.notices||typeof f.notices!=='object'||Array.isArray(f.notices)||Object.keys(f.notices).length>200||!Object.values(f.notices).every(v=>(TIER_ORDER as string[]).includes(v as string))))return false;
 }
 if(list===undefined)return true;
 if(!Array.isArray(list)||list.length>WONDER_RULES.maxTotal*2)return false;
 const ids=new Set<number>();
 for(const r of list){if(!validWonderRecord(r)||ids.has(r.id)||r.id<1)return false;ids.add(r.id);if(f&&r.id>=f.nextId)return false;}
 return true;
}
export const WONDER_FOUNDED_FAMILIES=WONDER_FAMILIES;
export {activeWonder,townHall};
