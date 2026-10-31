import type {Game} from './sim';
import type {Unit,FoodKind,GameState} from './types';
import {FOOD_KINDS,foodInventory} from './pantry';
import {FOOD_PER_PERSON_SECOND,isDependent} from './settlement';
import {predisposition} from './people';
import {difficulty} from './difficulty';
import {SURVIVAL_RULES} from './survivalNeeds';
import {hasTaskCommitment} from './workCommitments';
import {connectedForUnit} from './waterTravel';
import {supplyApproach,supplyReached,type CampAnchor} from './campAnchor';

/** Every entry is an existing physical store, food lot, sample or carried pack.
 * The destination cache is unavailable to ordinary settlement spending. */
export const CAMP_MOVE_RULES={version:1,minimumDistanceMeters:12,arrivalMeters:4,cargoCapacity:16,travelReserveSeconds:90,loadedSpeedFactor:.85,exposedFoodSpoilagePerSecond:.00012,maximumPeople:2000} as const;
const materials=['wood','stone','copper','iron','spears','bows','blades','seeds'] as const;
const samples=['grain','pulses','tubers'] as const;
const keys=[...materials,'water',...FOOD_KINDS.map(k=>'food:'+k),...samples.map(k=>'sample:'+k)] as string[];
export type CampGoods=Record<string,number>;
export type CampMoveActor={id:number;cargo:CampGoods;food:number;water:number;phase:'collect'|'deliver'|'arrived';lost?:boolean};
export type CampMove={version:1;id:number;team:number;source:{x:number;z:number};destination:{x:number;z:number};phase:'moving'|'paused'|'cancelling'|'complete'|'cancelled';resumePhase:'moving'|'cancelling';actors:CampMoveActor[];cache:CampGoods;started:number;finished?:number;blockedReason:string;metrics:{distanceMeters:number;loadsDelivered:number;foodConsumed:number;waterConsumed:number;foodSpoiled:number;lost:CampGoods}};
const total=(bag:CampGoods)=>Object.values(bag).reduce((s,n)=>s+n,0);
const add=(bag:CampGoods,key:string,n:number)=>{if(n>0)bag[key]=(bag[key]||0)+n;};
const active=(m:CampMove)=>!['complete','cancelled'].includes(m.phase);
function move(g:Game){const m=g.state.campMove;return m&&active(m)?m:null;}
function read(g:Game):CampGoods{const t=g.tribe(0),bag:CampGoods={water:t.survival?.waterLiters||0},lots=foodInventory(t);for(const k of materials)bag[k]=t[k]||0;for(const k of FOOD_KINDS)bag['food:'+k]=lots[k];for(const k of samples)bag['sample:'+k]=t.cropSamples?.[k]||0;return bag;}
function change(g:Game,key:string,n:number){const t=g.tribe(0);if(key==='water'){if(t.survival)t.survival.waterLiters=Math.max(0,t.survival.waterLiters+n);return;}if(key.startsWith('food:')){const lots=foodInventory(t);lots[key.slice(5) as FoodKind]=Math.max(0,lots[key.slice(5) as FoodKind]+n);t.food=Math.max(0,t.food+n);t.foodLots=lots;return;}if(key.startsWith('sample:')){const k=key.slice(7) as typeof samples[number];t.cropSamples??={};t.cropSamples[k]=Math.max(0,(t.cropSamples[k]||0)+n);return;}const k=key as typeof materials[number];t[k]=Math.max(0,(t[k]||0)+n);}
function anchor(g:Game,p:{x:number;z:number}):CampAnchor{return {kind:'camp',team:0,x:p.x,z:p.z,y:g.height(p.x,p.z),radius:3};}
function at(g:Game,u:Unit,p:{x:number;z:number}){const a=anchor(g,p),spot=supplyApproach(g,u,a);return !!spot&&supplyReached(g,u,a,spot);}
function available(g:Game,u:Unit,existing=false){return u.team===0&&u.hp>0&&!u.prisoner&&!u.militia&&u.type==='worker'&&u.escortId===undefined&&!['occupy','capture'].includes(u.conflictIntent||'')&&!u.expedition&&!u.visit&&!u.trade&&!u.recalled&&!u.tributeJourney&&!u.foundingJourney&&!u.emergency&&(!hasTaskCommitment(u,'campMoveId')||isDependent(g,u))&&(existing||['idle','hold','gather','explore','move','return'].includes(u.order));}
export function campRelocationIssue(g:Game,x:number,z:number){
 if(move(g))return 'Finish or cancel the current camp move first';
 if(g.state.buildings.some(b=>b.team===0&&b.hp>0))return 'Only a camp without buildings can move as a nomadic household';
 if(!Number.isFinite(x)||!Number.isFinite(z)||!g.exploredAt(x,z))return 'Explore the new campsite first';
 if(!g.walkable(x,z)||g.height(x,z)<=g.waterAt(x,z)+.3)return 'Choose dry, walkable ground for the cache';
 const home=g.campOf(0);if(Math.hypot(x-home.x,z-home.z)<CAMP_MOVE_RULES.minimumDistanceMeters)return 'Choose a campsite at least 12 metres away';
 const people=g.state.units.filter(u=>u.team===0&&u.hp>0);
 if(people.length>CAMP_MOVE_RULES.maximumPeople)return 'This household exceeds the relocation party limit';
 if(!people.length||!people.some(u=>!isDependent(g,u)&&available(g,u)))return 'An available adult must carry the camp supplies';
 if(people.some(u=>!available(g,u)))return 'Bring everyone home from combat, custody, boats and paid journeys before moving camp';
 if(people.some(u=>u.carry>0||u.seedSamples&&Object.values(u.seedSamples).some(n=>(n||0)>0)))return 'Deliver carried gathering supplies before moving the communal cache';
 if(people.some(u=>!connectedForUnit(g,u,x,z)))return 'Every household member needs a walkable route to the new camp';
 if(!people.every(u=>supplyApproach(g,u,anchor(g,home))&&supplyApproach(g,u,anchor(g,{x,z}))))return 'Both camps need reachable loading ground';
 return null;
}
export function beginCampRelocation(g:Game,x:number,z:number){const issue=campRelocationIssue(g,x,z);if(issue){g.banner(issue,4);return false;}const source=g.campOf(0),people=g.state.units.filter(u=>u.team===0&&u.hp>0);for(const u of people)g.interruptMission(u);const m:CampMove={version:1,id:g.state.nextId++,team:0,source:{x:source.x,z:source.z},destination:{x,z},phase:'moving',resumePhase:'moving',actors:people.map(u=>({id:u.id,cargo:{},food:0,water:0,phase:isDependent(g,u)?'deliver':'collect'})),cache:{},started:g.state.time,blockedReason:'',metrics:{distanceMeters:0,loadsDelivered:0,foodConsumed:0,waterConsumed:0,foodSpoiled:0,lost:{}}};g.state.campMove=m;for(const u of people){u.campMoveId=m.id;u.order='hold';u.jobLock=true;u.target=null;u.node=null;g.invalidateRoute(u);}g.banner('Moving camp: people will carry the existing cache to the new site',4);return true;}
export function pauseCampRelocation(g:Game,reason='Camp move paused; supplies remain with their actual carriers and caches'){const m=move(g);if(!m)return false;if(m.phase!=='paused')m.resumePhase=m.phase as 'moving'|'cancelling';m.phase='paused';m.blockedReason=reason;return true;}
export function interruptCampRelocation(g:Game,u:Unit){if(u.campMoveId)pauseCampRelocation(g,'A direct order paused the camp move; resume when the household is ready');}
export function resumeCampRelocation(g:Game){const m=move(g);if(!m)return false;const people=m.actors.map(a=>g.state.units.find(u=>u.id===a.id&&u.hp>0)).filter((u):u is Unit=>!!u);if(people.some(u=>!available(g,u,true))){m.blockedReason='A household member is occupied by combat, custody, travel or paid work';return false;}if(!people.some(u=>!isDependent(g,u))){m.blockedReason='No living adult remains to carry the cache';return false;}m.phase=m.resumePhase;m.blockedReason='';for(const u of people){u.order='hold';u.target=null;u.node=null;g.invalidateRoute(u);}return true;}
export function cancelCampRelocation(g:Game){const m=move(g);if(!m)return false;m.resumePhase='cancelling';m.phase='paused';for(const a of m.actors)a.phase='deliver';m.blockedReason='Cancellation requires carrying the destination cache back to the original camp';return resumeCampRelocation(g);}
function take(g:Game,m:CampMove,bag:CampGoods|null,key:string,want:number){const amount=Math.min(want,Math.max(0,(bag||read(g))[key]||0));if(bag)bag[key]=Math.max(0,(bag[key]||0)-amount);else change(g,key,-amount);return amount;}
function provision(g:Game,m:CampMove,a:CampMoveActor,bag:CampGoods|null){for(const k of FOOD_KINDS){const want=FOOD_PER_PERSON_SECOND*CAMP_MOVE_RULES.travelReserveSeconds-a.food;if(want<=0)break;a.food+=take(g,m,bag,'food:'+k,want);}a.water+=take(g,m,bag,'water',Math.max(0,SURVIVAL_RULES.waterLitersPerPersonSecond*CAMP_MOVE_RULES.travelReserveSeconds-a.water));}
function deposit(g:Game,m:CampMove,a:CampMoveActor,toOld:boolean){if(total(a.cargo)>.000001)m.metrics.loadsDelivered++;for(const [key,n]of Object.entries(a.cargo)){if(toOld)change(g,key,n);else add(m.cache,key,n);}a.cargo={};}
export function campMoveIndependentNeeds(g:Game,u:Unit){return !!(u.campMoveId&&move(g)?.id===u.campMoveId);}
/** Meals/water are debited from the cache only at physical contact, then carried.
 * Pausing or overriding movement never refunds a paid pack. */
export function tickCampRelocation(g:Game,dt:number){const m=move(g);if(!m)return;
 for(const a of m.actors){const u=g.state.units.find(u=>u.id===a.id&&u.hp>0);if(!u||u.team!==0){if(!a.lost){for(const [k,n]of Object.entries(a.cargo))add(m.metrics.lost,k,n);add(m.metrics.lost,'food:provisions',a.food);add(m.metrics.lost,'water',a.water);a.cargo={};a.food=0;a.water=0;a.lost=true;const former=g.state.units.find(p=>p.id===a.id);if(former)former.campMoveId=undefined;}continue;}
  if(at(g,u,m.source))provision(g,m,a,null);else if(at(g,u,m.destination))provision(g,m,a,m.cache);
  const need=FOOD_PER_PERSON_SECOND*(isDependent(g,u)?.5:1)*predisposition(u).appetite*difficulty(g).food*dt,waterNeed=SURVIVAL_RULES.waterLitersPerPersonSecond*dt;
  // Carried food/water remain edible/drinkable even if an interrupted carrier is away from either cache.
  for(const k of FOOD_KINDS)if(a.food<need)a.food+=take(g,m,a.cargo,'food:'+k,need-a.food);
  if(a.water<waterNeed)a.water+=take(g,m,a.cargo,'water',waterNeed-a.water);
  const food=Math.min(a.food,need),water=Math.min(a.water,waterNeed);a.food-=food;a.water-=water;m.metrics.foodConsumed+=food;m.metrics.waterConsumed+=water;if(g.tribe(0).survival)g.tribe(0).survival!.waterConsumedLiters+=water;
  const before=u.hunger||0,beforeWater=u.thirstSeconds||0;u.hunger=Math.max(0,before+(food+1e-8<need?dt:-dt*3));u.thirstSeconds=Math.max(0,beforeWater+(water+1e-8<waterNeed?dt:-dt*3));u.hp=Math.max(0,u.hp-Math.max(0,Math.max(0,u.hunger-60)-Math.max(0,before-60))*u.maxHp/160-Math.max(0,Math.max(0,u.thirstSeconds-180)-Math.max(0,beforeWater-180))*u.maxHp/1800);
 }
 for(const k of FOOD_KINDS){const key='food:'+k,loss=(m.cache[key]||0)*Math.min(1,CAMP_MOVE_RULES.exposedFoodSpoilagePerSecond*dt);m.cache[key]=Math.max(0,(m.cache[key]||0)-loss);m.metrics.foodSpoiled+=loss;}
 const alive=m.actors.map(a=>({a,u:g.state.units.find(u=>u.id===a.id&&u.hp>0&&u.team===0)})).filter(p=>!!p.u);
 if(m.phase==='paused')return;
 if(!alive.some(p=>!isDependent(g,p.u!))){pauseCampRelocation(g,'No living adult remains to carry the cache');return;}
 const returning=m.phase==='cancelling',remaining=returning?total(m.cache):total(read(g)),destination=returning?m.source:m.destination;
 if(remaining<=.000001&&alive.every(({a,u})=>total(a.cargo)<=.000001&&at(g,u!,destination))){
  if(!returning){for(const [k,n]of Object.entries(m.cache))change(g,k,n);g.state.campSites=[{team:0,...m.destination}];}
  m.cache={};m.phase=returning?'cancelled':'complete';m.finished=g.state.time;m.blockedReason='';
  for(const {a,u}of alive){change(g,'food:provisions',a.food);change(g,'water',a.water);a.food=0;a.water=0;u!.campMoveId=undefined;u!.order='hold';u!.workReason=returning?'Back at the original camp':'Arrived at the new camp';}
  g.banner(returning?'Camp move cancelled; the cache is back at the original site':'The household and its supplies have reached the new camp',5);
 }
}
export function campRelocationAI(g:Game,u:Unit,dt:number){const m=move(g);if(!m||u.campMoveId!==m.id||m.phase==='paused')return false;const a=m.actors.find(a=>a.id===u.id);if(!a||a.lost)return false;const returning=m.phase==='cancelling',from=returning?m.destination:m.source,to=returning?m.source:m.destination,sourceBag=returning?m.cache:null;
 const sourceTotal=total(sourceBag||read(g));if(isDependent(g,u))a.phase='deliver';if(a.phase==='arrived'&&sourceTotal>.000001&&!isDependent(g,u))a.phase='collect';
 const target=a.phase==='collect'?from:to,drop=anchor(g,target),spot=supplyApproach(g,u,drop);if(!spot){m.blockedReason='A carrier cannot reach the cache loading ground';u.workReason=m.blockedReason;return true;}
 u.tx=spot.x;u.tz=spot.z;u.order='hold';u.workReason=a.phase==='collect'?'Walking back to collect the old cache':total(a.cargo)>0?'Carrying camp supplies':'Walking with the household';
 if(!supplyReached(g,u,drop,spot)){const x=u.x,z=u.z;const speed=u.speed;if(total(a.cargo)>0)u.speed*=CAMP_MOVE_RULES.loadedSpeedFactor;try{g.steer(u,dt);}finally{u.speed=speed;}m.metrics.distanceMeters+=Math.hypot(u.x-x,u.z-z);return true;}
 m.blockedReason='';
 if(a.phase==='collect'){
  provision(g,m,a,sourceBag);let room=CAMP_MOVE_RULES.cargoCapacity-a.food-a.water;
  for(const key of keys){if(room<=.000001)break;const n=take(g,m,sourceBag,key,room);add(a.cargo,key,n);room-=n;}
  a.phase='deliver';g.invalidateRoute(u);
 }else {deposit(g,m,a,returning);a.phase=sourceTotal>.000001&&!isDependent(g,u)?'collect':'arrived';u.workReason=a.phase==='arrived'?'Waiting at the new campsite':'Returning for another camp load';}
 return true;
}
export function campMoveStatus(g:Game){const m=g.state.campMove;if(!m)return null;return {...m,sourceGoods:read(g),carriedGoods:m.actors.reduce((bag,a)=>{for(const[k,n]of Object.entries(a.cargo))add(bag,k,n);return bag;},{} as CampGoods),peopleArrived:m.actors.filter(a=>{const u=g.state.units.find(u=>u.id===a.id&&u.hp>0&&u.team===0);return u&&at(g,u,m.phase==='cancelling'?m.source:m.destination);}).length,livingPeople:m.actors.filter(a=>g.state.units.some(u=>u.id===a.id&&u.hp>0&&u.team===0)).length};}
export function validCampMoveState(s:GameState){const half=(s.worldOptions?.size??1040)/2;const finite=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,point=(p:any)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<half&&Math.abs(p.z)<half,bag=(b:any)=>b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).length<=keys.length&&Object.entries(b).every(([k,n])=>keys.includes(k)&&finite(n));
 if(s.campSites!==undefined&&(!Array.isArray(s.campSites)||s.campSites.length>1||s.campSites.some(p=>!point(p)||p.team!==0)))return false;
 const m=s.campMove;if(!m)return !s.units.some(u=>u.campMoveId!==undefined);
 if(m.version!==1||m.team!==0||!Number.isSafeInteger(m.id)||m.id<1||m.id>=s.nextId||!point(m.source)||!point(m.destination)||!['moving','paused','cancelling','complete','cancelled'].includes(m.phase)||!['moving','cancelling'].includes(m.resumePhase)||!finite(m.started,s.time)||m.finished!==undefined&&!finite(m.finished,s.time)||typeof m.blockedReason!=='string'||m.blockedReason.length>400||!bag(m.cache)||!Array.isArray(m.actors)||!m.actors.length||m.actors.length>CAMP_MOVE_RULES.maximumPeople)return false;
 if(!m.metrics||!bag(m.metrics.lost)||!['distanceMeters','loadsDelivered','foodConsumed','waterConsumed','foodSpoiled'].every(k=>finite((m.metrics as any)[k])))return false;
 if(m.actors.some(a=>!a||!bag(a.cargo)))return false;
 if(s.units.some(u=>u.id===m.id)||s.buildings.some(b=>b.id===m.id))return false;
 if(!active(m)&&(total(m.cache)>0||m.actors.some(a=>total(a.cargo)>0||a.food>0||a.water>0)))return false;
 const ids=new Set<number>();for(const a of m.actors){if(!a||!Number.isSafeInteger(a.id)||a.id<1||a.id>=s.nextId||ids.has(a.id)||!bag(a.cargo)||total(a.cargo)+a.food+a.water>CAMP_MOVE_RULES.cargoCapacity+1e-6||!finite(a.food,10)||!finite(a.water,10)||!['collect','deliver','arrived'].includes(a.phase)||a.lost!==undefined&&typeof a.lost!=='boolean')return false;ids.add(a.id);const u=s.units.find(u=>u.id===a.id);if(active(m)&&!a.lost&&(!u||u.campMoveId!==m.id))return false;if(a.lost&&(total(a.cargo)>0||a.food>0||a.water>0))return false;}
 return s.units.every(u=>u.campMoveId===undefined||active(m)&&u.campMoveId===m.id&&ids.has(u.id));
}
