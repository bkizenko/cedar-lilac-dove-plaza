/** Runtime glue for the rulers lane. One call from Game.step. Off unless worldOptions.rulersVersion===1 (set for new games).
 * Old saves have no `rulers` field and no option: nothing happens. Pure state in/out lives in rulersState.ts. */
import type {Game} from './sim';
import {initRulers,stepRulersYear,rulersOf,type RulersState,type Ward} from './rulersState';
import {familyStage,familyFeatures,kinshipEffectScale} from './familyScale';
import {marry} from './dynasty';
import {assess,type Drivers,type DriverInputs} from './expansionDrivers';
import {expansionPressure} from './polityModel';
import {drive as personalDrive} from './rulerGenome';
import {reserveSeconds} from './settlement';
import {effects,apply,noTies,type Ties,type Effect} from './ties';
import {nudgeSocietyRelation,societyRelation} from './societyRelations';
import {liveClaims,cbLegitimacyCost,unrest,stageOf,type Claim,type CasusBelli,type Stage as UnrestStage} from './unrest';

/** Compressed clock: one dynastic year per this many sim seconds (an 80-year life is about two hours of play). */
export const RULERS_YEAR_SECONDS=90;
type S={rulers?:RulersState;worldOptions?:{rulersVersion?:1};time:number;seed:number;tribes:unknown[];units:{team:number;hp:number}[]};
const st=(g:Game)=>g.state as unknown as S;
export const rulersEnabled=(g:Game)=>st(g).worldOptions?.rulersVersion===1;
export function livingPeople(g:Game,team:number){let n=0;for(const u of st(g).units)if(u.team===team&&u.hp>0)n++;return n;}
export function ensureRulers(g:Game):RulersState|null{
 if(!rulersEnabled(g))return null;const s=st(g);
 if(!s.rulers)s.rulers=initRulers(s.seed,s.tribes.map((_,i)=>String(i)));
 return s.rulers;
}
/** Bad weather accumulates into a slow climate-stress memory (0..1): droughts and floods wear a land down, good seasons restore it. */
function sampleClimate(g:Game,r:RulersState){
 const s=st(g),w=(s as unknown as {weather?:string}).weather,bad=w==='drought'||w==='frost'||w==='flood'||w==='storm';
 const dt=Math.max(0,Math.min(60,s.time-(r.climateT??s.time)));
 const c=r.climate??0;r.climate=Math.max(0,Math.min(1,c+(bad?dt/420:-dt/1400)));r.climateT=s.time;
}
/** Advance whole dynastic years that have elapsed. Cheap: one comparison per call. */
export function advanceRulers(g:Game){
 const r=ensureRulers(g);if(!r)return;const s=st(g),target=Math.floor(s.time/RULERS_YEAR_SECONDS);
 sampleClimate(g,r);
 let guard=0;
 while(s.rulers!.year<target&&guard++<4){s.rulers=stepRulersYear(s.rulers!,()=>.3,id=>livingPeople(g,Number(id)));settleWards(g);npcMarriages(g);expireClaims(g);}
 if(s.rulers&&s.rulers.year<target)s.rulers={...s.rulers,year:target};
}
/** Read-only view for UI: ruling house of a society with its stage (household..dynasty). */
export function rulerOf(g:Game,team:number){
 const r=rulersOf(st(g));if(!r)return null;const sr=r.societies[String(team)];if(!sr)return null;
 const person=sr.dynasty.people[sr.dynasty.rulerId];
 return person?{name:person.name,age:person.age,ruler:person.ruler,house:sr.dynasty.house,stage:familyStage(livingPeople(g,team)),generation:sr.dynasty.generation,civ:sr.civ,ledger:sr.ledger}:null;
}

const tieKey=(a:number,b:number)=>a<b?`${a}|${b}`:`${b}|${a}`;
export const tiesBetween=(g:Game,a:number,b:number):Ties=>rulersOf(st(g))?.ties?.[tieKey(a,b)]??noTies();
const freeAdult=(d:import('./dynasty').Dynasty)=>Object.values(d.people).filter(p=>p.alive&&!p.spouse&&p.age>=16).sort((x,y)=>(y.id===d.rulerId?1:0)-(x.id===d.rulerId?1:0)||y.claimStrength-x.claimStrength)[0];
/** Marriage between two societies' ruling houses. Both must be able to exchange spouses at their scale. Applies the signed
 * effects (scaled by the smaller society) to the tie ledger and the directed trust/grievance. Returns the cause chain, or null. */
export function marryHouses(g:Game,a:number,b:number):{why:string[];bond:number}|null{
 const r=ensureRulers(g);if(!r||a===b)return null;
 const sa=r.societies[String(a)],sb=r.societies[String(b)];if(!sa||!sb)return null;
 const pa=livingPeople(g,a),pb=livingPeople(g,b);
 if(!familyFeatures(sa.civ.polity.tier,pa).marriageExchange||!familyFeatures(sb.civ.polity.tier,pb).marriageExchange)return null;
 const x=freeAdult(sa.dynasty),y=freeAdult(sb.dynasty);if(!x||!y)return null;
 const wed=marry(sa.dynasty,x.id,sb.dynasty,y.id);if(!wed)return null;
 const atWar=societyRelation(g,a,b).hostile;
 const es:Effect[]=effects('marriage',{rankGap:Math.sign(pa-pb)*Math.min(1,Math.abs(pa-pb)/Math.max(pa,pb,1)),sameFaith:sa.civ.faith.id===sb.civ.faith.id,culturalGap:sa.civ.silhouette===sb.civ.silhouette?0:.5,aRulerHonor:sa.civ.ruler.traits.honor,bRulerHonor:sb.civ.ruler.traits.honor,atWar});
 const k=Math.min(kinshipEffectScale(pa),kinshipEffectScale(pb)),scaled=es.map(e=>({...e,delta:e.delta*k}));
 const key=tieKey(a,b),next=apply(r.ties?.[key]??noTies(),scaled);
 st(g).rulers={...r,societies:{...r.societies,[String(a)]:{...sa,dynasty:wed[0]},[String(b)]:{...sb,dynasty:wed[1]}},ties:{...(r.ties??{}),[key]:next}};
 const sum=(l:keyof Ties)=>scaled.filter(e=>e.ledger===l).reduce((t,e)=>t+e.delta,0)/100;
 for(const [f,t] of [[a,b],[b,a]]){nudgeSocietyRelation(g,f,t,{trust:sum('trust'),grievance:sum('grievance')});}
 return {why:es.map(e=>e.why),bond:next.bond};
}

const c01=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
/** Measure the drivers of expansion from the live game for one society. */
export function expansionInputs(g:Game,team:number):DriverInputs|null{
 const r=ensureRulers(g);const me=r?.societies[String(team)];if(!r||!me)return null;
 const s=g.state,pop=Math.max(1,livingPeople(g,team)),cap=Math.max(1,g.popCap(team));
 const hall=s.buildings.find(b=>b.team===team&&b.hp>0);
 const near=hall?s.buildings.filter(b=>Math.hypot(b.x-hall.x,b.z-hall.z)<50).length:0;
 const others=s.tribes.map((_,i)=>i).filter(i=>i!==team&&i!==3&&!!g.tribe(i));
 const known=others.filter(i=>societyRelation(g,team,i).known);
 const myPop=pop,myFortune=g.tribeFortune(team);
 let weak=0,rich=0,fort=0;
 for(const i of known){weak=Math.max(weak,c01((myPop-livingPeople(g,i))/myPop));rich=Math.max(rich,c01((g.tribeFortune(i)-myFortune)/3));
  fort=Math.max(fort,c01(s.buildings.filter(b=>b.team===i&&b.hp>0&&(b.type==='barracks'||b.type==='watchtower')).length*.3));}
 const boats=g.tribe(team).boatPractice,built=boats?Object.values(boats.built).reduce((t:number,n)=>t+(n||0),0):0;
 const d=me.dynasty,cadets=Object.values(d.people).filter(p=>p.alive&&!p.spouse&&p.age>=16&&p.id!==d.rulerId).length;
 return {
  crowding:c01((pop/cap-.6)/.4),hunger:c01(1-reserveSeconds(g,team)/600),climate:r.climate??0,cadets:c01(cadets/(1+pop/8)),
  grievance:c01(g.tribe(team).tension||0),openLand:c01(1-near/30),richNeighbour:rich,weakNeighbour:weak,tradePull:c01(known.length/3),
  zeal:c01(me.civ.faith.proselytism/100),seafaring:c01(built/3),mobility:.5,rulerDrive:personalDrive(me.civ.ruler.traits),
  polityPressure:expansionPressure(me.civ.polity),cohesion:c01(.25+.5*me.civ.polity.institutionalization/100),fortified:fort,
  unknown:others.length?c01(1-known.length/others.length):0,
 };
}
const driveCache=new WeakMap<Game,Map<number,{t:number;d:Drivers}>>();
/** Cached (30s) assessment. Used by NPC expansion and by the UI. Returns null when rulers are off. */
export function expansionOf(g:Game,team:number):Drivers|null{
 if(!rulersEnabled(g))return null;
 let m=driveCache.get(g);if(!m)driveCache.set(g,m=new Map());
 const t=st(g).time,hit=m.get(team);if(hit&&t-hit.t<30&&t>=hit.t)return hit.d;
 const i=expansionInputs(g,team);if(!i)return null;const d=assess(i);m.set(team,{t,d});return d;
}
/** Multiplier for the rival expansion roll. 1 when rulers are off, so old saves behave exactly as before. */
export const expansionDrive=(g:Game,team:number)=>expansionOf(g,team)?.drive??1;

const WARD_ID=(w:Ward)=>w.from+':'+w.person;
/** Kin currently held by another house (fosterlings, hostages). They stay in their own dynasty record; the ward list says where they live. */
export const wardsOf=(g:Game,team?:number):Ward[]=>(rulersOf(st(g))?.wards??[]).filter(w=>team===undefined||Number(w.from)===team||Number(w.to)===team);
function tieChange(g:Game,a:number,b:number,action:import('./ties').TieAction,pa:number,pb:number){
 const r=ensureRulers(g)!,sa=r.societies[String(a)],sb=r.societies[String(b)];
 const es=effects(action,{rankGap:0,sameFaith:sa.civ.faith.id===sb.civ.faith.id,culturalGap:sa.civ.silhouette===sb.civ.silhouette?0:.5,aRulerHonor:sa.civ.ruler.traits.honor,bRulerHonor:sb.civ.ruler.traits.honor,atWar:societyRelation(g,a,b).hostile});
 const k=Math.min(kinshipEffectScale(pa),kinshipEffectScale(pb)),scaled=es.map(e=>({...e,delta:e.delta*k})),key=tieKey(a,b);
 st(g).rulers={...r,ties:{...(r.ties??{}),[key]:apply(r.ties?.[key]??noTies(),scaled)}};
 const sum=(l:keyof Ties)=>scaled.filter(e=>e.ledger===l).reduce((t,e)=>t+e.delta,0)/100;
 for(const [f,t] of [[a,b],[b,a]])nudgeSocietyRelation(g,f,t,{trust:sum('trust'),grievance:sum('grievance')});
 return es.map(e=>e.why);
}
const held=(r:RulersState,id:string,from:string)=>(r.wards??[]).some(w=>w.from===from&&w.person===id);
/** Fosterage: a child of the player's house is raised in another society's hall, and one of theirs in ours. Needs both to be at kingroup scale
 * with the fosterage feature. Children stay in their own dynasty record (no teleporting people); the ward list records where they live and
 * they go home at 16. Returns the cause chain or null. */
export function fosterHouses(g:Game,a:number,b:number):{why:string[];wards:Ward[]}|null{return exchangeKin(g,a,b,'fosterage');}
/** Hostage exchange: each house sends a non-heir kinsman to the other as a living pledge. Held until the term ends; breaks if war comes. */
export function exchangeHostages(g:Game,a:number,b:number):{why:string[];wards:Ward[]}|null{return exchangeKin(g,a,b,'hostageExchange');}
function exchangeKin(g:Game,a:number,b:number,action:'fosterage'|'hostageExchange'){
 const r=ensureRulers(g);if(!r||a===b)return null;
 const sa=r.societies[String(a)],sb=r.societies[String(b)];if(!sa||!sb)return null;
 const pa=livingPeople(g,a),pb=livingPeople(g,b),fa=familyFeatures(sa.civ.polity.tier,pa),fb=familyFeatures(sb.civ.polity.tier,pb);
 if(!(action==='fosterage'?fa.fosterage&&fb.fosterage:fa.envoyHeirs&&fb.envoyHeirs))return null;
 if(societyRelation(g,a,b).hostile)return null;
 const pick=(s:typeof sa,from:string)=>Object.values(s.dynasty.people).filter(p=>p.alive&&!p.spouse&&p.id!==s.dynasty.rulerId&&!held(r,p.id,from)&&(action==='fosterage'?p.age>=3&&p.age<16:p.age>=10))
  .sort((x,y)=>x.claimStrength-y.claimStrength)[0];
 const x=pick(sa,String(a)),y=pick(sb,String(b));if(!x||!y)return null;
 const wards:Ward[]=[{kind:action==='fosterage'?'foster':'hostage',person:x.id,from:String(a),to:String(b),since:r.year},{kind:action==='fosterage'?'foster':'hostage',person:y.id,from:String(b),to:String(a),since:r.year}];
 st(g).rulers={...st(g).rulers!,wards:[...(r.wards??[]),...wards]};
 return {why:tieChange(g,a,b,action,pa,pb),wards};
}
/** Yearly: fosterlings go home at 16 (bond rises), hostages after a 8-year term; the dead are removed; war breaks the pledge with a grievance. */
export function settleWards(g:Game){
 const r=ensureRulers(g);if(!r?.wards?.length)return;
 const keep:Ward[]=[],done:Ward[]=[];
 for(const w of r.wards){
  const p=r.societies[w.from]?.dynasty.people[w.person];
  if(!p||!p.alive){done.push(w);continue;}
  const term=w.kind==='foster'?p.age>=16:r.year-w.since>=8,war=societyRelation(g,Number(w.from),Number(w.to)).hostile;
  if(term||war){done.push(w);if(war)tieChange(g,Number(w.from),Number(w.to),'breakPact',livingPeople(g,Number(w.from)),livingPeople(g,Number(w.to)));}
  else keep.push(w);
 }
 if(done.length)st(g).rulers={...st(g).rulers!,wards:keep};
}

/** Rival societies wed each other: every 4th dynastic year each non-player society tries the nearest-numbered peaceful, mutually known neighbour
 * (marryHouses enforces scale gates, free adults, and applies real ties). Never touches the player's house. Returns the pairs wed (for tests/log). */
export function npcMarriages(g:Game):[number,number][]{
 const r=ensureRulers(g);if(!r||r.year%4!==0)return [];
 const ids=g.state.tribes.map((_,i)=>i).filter(i=>i!==0&&i!==3&&!!g.tribe(i)),out:[number,number][]=[];
 for(const a of ids){const b=ids.find(x=>x>a&&!societyRelation(g,a,x).hostile&&societyRelation(g,a,x).known&&societyRelation(g,x,a).known);
  if(b!==undefined&&marryHouses(g,a,b))out.push([a,b]);}
 return out;
}

/** Expansion party plan for a rival society's next founding journey. The real crew (units) and timber (deducted from the tribe) are
 * handled by communities.ts; this only decides WHETHER and HOW BIG from the stated drivers. Null when rulers are off (old behaviour).
 * Only settle/migrate modes send families to a new hearth; stay/conquer/trade/explore/mission do not (those have their own parties). */
export type PartyPlan={allow:boolean;mode:string;crew:number;cooldown:number;minReserve:number;why:string[]};
export function expansionParty(g:Game,team:number):PartyPlan|null{
 const d=expansionOf(g,team);if(!d)return null;
 const sends=d.mode==='settle'||d.mode==='migrate';
 return {allow:sends,mode:d.mode,crew:Math.max(2,Math.min(4,2+Math.round((d.drive-.8)*2))),cooldown:Math.round(Math.max(900,Math.min(3600,1800/Math.max(.5,d.drive)))),
  minReserve:d.mode==='migrate'?300:600,why:sends?d.why:['the society stays at home',...d.why]};
}

/** Claims and casus belli (years are dynastic years). Claims are standing grievances a house may cite; they cost nothing to hold, cost legitimacy
 * when used (cbLegitimacyCost), and press on unrest at both ends. Era gating: any claim needs the 'claims' family feature; war-grade causes
 * (tribute, holy, raid, reconquest, liberation) need a state-tier polity. No claim on a society you do not know, or on yourself. */
export const claimsOf=(g:Game,team?:number):Claim[]=>liveClaims(rulersOf(st(g))?.claims??[],rulersOf(st(g))?.year??0).filter(c=>team===undefined||Number(c.holder)===team||Number(c.target)===team);
export function grantClaim(g:Game,holder:number,target:number,kind:CasusBelli,strength=50,years=20):Claim|null{
 const r=ensureRulers(g);if(!r||holder===target)return null;
 const sh=r.societies[String(holder)];if(!sh||!r.societies[String(target)])return null;
 if(!familyFeatures(sh.civ.polity.tier,livingPeople(g,holder)).claims)return null;
 if(kind!=='claim'&&kind!=='succession'&&kind!=='defence'&&sh.civ.polity.tier!=='state')return null;
 if(!societyRelation(g,holder,target).known)return null;
 const live=claimsOf(g);if(live.some(c=>c.holder===String(holder)&&c.target===String(target)&&c.kind===kind))return null;
 const c:Claim={holder:String(holder),target:String(target),kind,strength:Math.max(1,Math.min(100,strength)),expiresTick:r.year+years};
 st(g).rulers={...r,claims:[...liveClaims(r.claims??[],r.year),c]};
 return c;
}
/** Yearly: drop expired claims; a standing claim slowly sours relations from the holder toward the target (it is a grievance in waiting). */
export function expireClaims(g:Game){
 const r=ensureRulers(g);if(!r?.claims?.length)return;
 const live=liveClaims(r.claims,r.year);
 for(const c of live)nudgeSocietyRelation(g,Number(c.holder),Number(c.target),{trust:0,grievance:.002*c.strength/50});
 if(live.length!==r.claims.length)st(g).rulers={...st(g).rulers!,claims:live};
}
/** Using a claim as casus belli: spends it and the legitimacy cost is returned for the caller to charge to the holder's glory/unrest. */
export function citeClaim(g:Game,holder:number,target:number,kind:CasusBelli):{cost:number}|null{
 const r=ensureRulers(g);if(!r?.claims)return null;
 const i=r.claims.findIndex(c=>c.holder===String(holder)&&c.target===String(target)&&c.kind===kind&&c.expiresTick>r.year);if(i<0)return null;
 st(g).rulers={...r,claims:r.claims.filter((_,j)=>j!==i)};
 return {cost:cbLegitimacyCost(kind)};
}
/** Measured unrest 0..100 with its stage for one society. Inputs come from the live game: war with neighbours, claims pressing on it,
 * hunger, and the ruling house's legitimacy. Null when rulers are off. */
export function unrestOf(g:Game,team:number):{value:number;stage:UnrestStage;why:string[]}|null{
 const r=ensureRulers(g);const me=r?.societies[String(team)];if(!r||!me)return null;
 const others=g.state.tribes.map((_,i)=>i).filter(i=>i!==team&&i!==3&&!!g.tribe(i));
 const wars=others.filter(i=>societyRelation(g,team,i).hostile).length;
 const against=claimsOf(g,team).filter(c=>Number(c.target)===team).reduce((t,c)=>t+c.strength,0);
 const hunger=c01(1-reserveSeconds(g,team)/600),lg=Object.values(me.civ.polity.legitimacy),legit=Math.min(100,30+100*Math.max(0,...lg)); // source weights sum to ~1; the strongest pillar carries the house
 const v=unrest({legitimacy:legit,warWeariness:Math.min(100,wars*35+Math.min(30,against/3)),foodShortage:hunger*100,taxBurden:20,faithDivergence:0,coalitionLoss:0,rulerPopularity:60},me.civ.polity);
 const why:string[]=[];if(wars)why.push('at war');if(against>0)why.push('claims press on the house');if(hunger>.5)why.push('food is short');
 return {value:v,stage:stageOf(v),why};
}
