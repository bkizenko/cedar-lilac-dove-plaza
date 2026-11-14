/** Runtime glue for the rulers lane. One call from Game.step. Off unless worldOptions.rulersVersion===1 (set for new games).
 * Old saves have no `rulers` field and no option: nothing happens. Pure state in/out lives in rulersState.ts. */
import type {Game} from './sim';
import {initRulers,stepRulersYear,rulersOf,type RulersState,type Ward,type WardReturn,type Gathering} from './rulersState';
import {familyStage,familyFeatures,kinshipEffectScale} from './familyScale';
import {marry,heir,regencyOf,REGENCY_LEGIT_PENALTY} from './dynasty';
import {hash32,makeRng} from './rulerCore';
import {assess,type Drivers,type DriverInputs} from './expansionDrivers';
import {expansionPressure} from './polityModel';
import {drive as personalDrive} from './rulerGenome';
import {reserveSeconds} from './settlement';
import {effects,apply,noTies,type Ties,type Effect} from './ties';
import {nudgeSocietyRelation,societyRelation} from './societyRelations';
import {yearlyCivic,beginCivic} from './societyCivicRuntime';
import {settleGate,raidGate,growthBias,tradeCadenceBias,breakawayLoss,noteRaid,noteMarriage,noteSettlement,yearlySocieties,decisionsEnabled} from './societyRuntime';
import {liveClaims,cbLegitimacyCost,unrest,stageOf,type Claim,type CasusBelli,type Stage as UnrestStage} from './unrest';
import {wonderEffect} from './wonderEffects';
import {sendRefugees} from './refugees';
import {orphanCare,orphanLine} from './orphans';

/** Compressed clock: one dynastic year per this many sim seconds (an 80-year life is about two hours of play). */
export const RULERS_YEAR_SECONDS=90;
type S={rulers?:RulersState;worldOptions?:{rulersVersion?:1|2};time:number;seed:number;tribes:unknown[];units:{team:number;hp:number}[]};
const st=(g:Game)=>g.state as unknown as S;
export const rulersEnabled=(g:Game)=>{const v=st(g).worldOptions?.rulersVersion;return v===1||v===2;};
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
 if(decisionsEnabled(g))beginCivic(g); // M2-14: prehistory recorded once at the start (cheap no-op afterwards)
 let guard=0;
 while(s.rulers!.year<target&&guard++<4){const genBefore:Record<string,number>={};for(const [k,v] of Object.entries(s.rulers!.societies))genBefore[k]=v.dynasty.generation;s.rulers=stepRulersYear(s.rulers!,()=>.3,id=>livingPeople(g,Number(id)));settleWards(g);settleOrphans(g);fadeGrudges(g,genBefore);npcMarriages(g);expireClaims(g);harvestGathering(g);sendRefugees(g);eventClaims(g);tireOfWar(g);fadeCbDebt(g);domesticPressure(g);if(decisionsEnabled(g)){yearlySocieties(g);yearlyCivic(g);}}
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
/** Player kin deals (marriage, fosterage, hostages) need real contact: envoys cannot reach a society the player has never met. Null = allowed. */
export function kinDealRefusal(g:Game,team:number):string|null{if(g.isFoe(0,team))return 'The houses are at war; no envoy can cross the lines to carry the offer';return societyRelation(g,0,team).known||societyRelation(g,team,0).known?null:'You have not met that society; no envoy can carry the offer yet';}
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
 noteMarriage(g,a,b); // society decision layer: records the agreement and its signers (no-op when off)
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
export const expansionDrive=(g:Game,team:number)=>(expansionOf(g,team)?.drive??1)*(rulersEnabled(g)?growthBias(g,team):1);

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
 const keep:Ward[]=[],done:Ward[]=[],back:WardReturn[]=[],diedInCustody:Ward[]=[];
 for(const w of r.wards){
  const p=r.societies[w.from]?.dynasty.people[w.person];
  if(!p||!p.alive){done.push(w);if(p){back.push({kind:w.kind,name:p.name,from:w.from,to:w.to,year:r.year,how:'died',age:p.age});diedInCustody.push(w);}continue;}
  const term=w.kind==='foster'?p.age>=16:r.year-w.since>=8,war=societyRelation(g,Number(w.from),Number(w.to)).hostile;
  if(term||war){done.push(w);back.push({kind:w.kind,name:p.name,from:w.from,to:w.to,year:r.year,how:war?'war':w.kind==='foster'?'grown':'term',age:p.age});if(war)tieChange(g,Number(w.from),Number(w.to),'breakPact',livingPeople(g,Number(w.from)),livingPeople(g,Number(w.to)));}
  else keep.push(w);
 }
 if(done.length)st(g).rulers={...st(g).rulers!,wards:keep,wardReturns:[...(r.wardReturns??[]),...back].slice(-24)};
 // Death in the other house's custody: trust drops (breakPact tie change) and the home house holds a 'defence' claim on the host (no legitimacy cost;
 // grantClaim still gates by era/feature/known and refuses duplicates).
 for(const w of diedInCustody){const a=Number(w.from),b=Number(w.to);tieChange(g,a,b,'breakPact',livingPeople(g,a),livingPeople(g,b));grantClaim(g,a,b,'defence',40,12);addGrudge(g,a,b,.6,'custody');}
}

/** Yearly: record who is in orphan care (derived from each dynasty; refreshed so a guardian's death moves the child on, grown or dead children drop off).
 * Keeps each orphan's first year. Nothing is spawned and no goods move; the child eats at the guardian's table, the same household stores. */
export function settleOrphans(g:Game){
 const r=ensureRulers(g);if(!r)return;
 const prev=r.orphanCare??[],next:import('./rulersState').OrphanRecord[]=[];
 for(const [id,sr] of Object.entries(r.societies))for(const o of orphanCare(sr.dynasty)){const was=prev.find(x=>x.society===id&&x.child===o.child);next.push({society:id,child:o.child,guardian:o.guardian,kind:o.kind,since:was?.since??r.year});}
 const capped=next.slice(-24);
 if(JSON.stringify(capped)!==JSON.stringify(prev))st(g).rulers={...st(g).rulers!,orphanCare:capped};
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

/** Neighbour harvest gathering (AUD-SOC-HARVEST-GATHERING). Each dynastic year one host (rotating) with real stores (low hunger) invites every
 * known, mutually peaceful, non-player society that is not itself starving. Envoys ride out and back on the existing 'envoy' tie effect;
 * the gathering also surfaces marriage/fosterage offers (never executed here: npcMarriages and the player commands do the real exchange).
 * Skipped when any pair is at war. No goods, units or terrain are created or moved: the feast comes out of the host's own abstract stores. */
export function harvestGathering(g:Game):Gathering|null{
 const r=ensureRulers(g);if(!r)return null;
 const ids=g.state.tribes.map((_,i)=>i).filter(i=>i!==0&&i!==3&&!!g.tribe(i));if(ids.length<2)return null;
 const host=ids[r.year%ids.length],hin=expansionInputs(g,host);if(!hin||hin.hunger>=.5)return null;
 const guests=ids.filter(i=>i!==host&&societyRelation(g,host,i).known&&societyRelation(g,i,host).known&&!societyRelation(g,host,i).hostile&&(expansionInputs(g,i)?.hunger??1)<.8);
 if(!guests.length||guests.some(a=>guests.some(b=>a<b&&societyRelation(g,a,b).hostile)))return null;
 const offers:Gathering['offers']=[];
 const sh=r.societies[String(host)];
 if(sh&&familyFeatures(sh.civ.polity.tier,livingPeople(g,host)).marriageExchange&&guests.some(i=>r.societies[String(i)]&&familyFeatures(r.societies[String(i)].civ.polity.tier,livingPeople(g,i)).marriageExchange))offers.push('marriage');
 if(sh&&familyFeatures(sh.civ.polity.tier,livingPeople(g,host)).fosterage)offers.push('fosterage');
 for(const i of guests)tieChange(g,host,i,'envoy',livingPeople(g,host),livingPeople(g,i));
 const gat:Gathering={year:r.year,host:String(host),guests:guests.slice(0,8).map(String),offers};
 st(g).rulers={...st(g).rulers!,gatherings:[...(st(g).rulers!.gatherings??[]),gat].slice(-12)};
 return gat;
}

/** Expansion party plan for a rival society's next founding journey. The real crew (units) and timber (deducted from the tribe) are
 * handled by communities.ts; this only decides WHETHER and HOW BIG from the stated drivers. Null when rulers are off (old behaviour).
 * Only settle/migrate modes send families to a new hearth; stay/conquer/trade/explore/mission do not (those have their own parties). */
/** Per-era machinery gating: how organised a polity's journeys can be. Bands send small parties slowly and have no standing provisioning,
 * chiefdoms medium ones, states full crews. Only caps and pace move; no goods, units or terrain are created. */
export const ERA_REACH:Record<'band'|'chiefdom'|'state',{crew:number;slow:number;organised:boolean;note:string}>={
 band:{crew:2,slow:1.5,organised:false,note:'a band can only spare a small party, and slowly'},
 chiefdom:{crew:3,slow:1.15,organised:true,note:'a chiefdom can spare a modest party'},
 state:{crew:4,slow:1,organised:true,note:''},
};
export type PartyPlan={allow:boolean;mode:string;crew:number;cooldown:number;minReserve:number;rations:number;why:string[]};
export function expansionParty(g:Game,team:number,raw=false):PartyPlan|null{
 const d=expansionOf(g,team);if(!d)return null;
 const sends=d.mode==='settle'||d.mode==='migrate',tier=st(g).rulers?.societies[String(team)]?.civ.polity.tier??'band',gate=ERA_REACH[tier];
 const crew=Math.max(2,Math.min(gate.crew,2+Math.round((d.drive-.8)*2))),cooldown=Math.round(Math.max(900,Math.min(3600,gate.slow*1800/Math.max(.5,d.drive))));
 const council=raw?null:settleGate(g,team); // society decision layer: a founding party leaves only under a settle plan
 const allow=sends&&(council?council.allow:true);
 // Standing provisioning exists only where the polity is organised: the leader carries 3 provisions per head, taken from the home pantry, never conjured.
 return {allow,mode:d.mode,crew,cooldown,rations:gate.organised?crew*3:0,
  minReserve:d.mode==='migrate'?300:600,why:allow?[...d.why,...(gate.crew<4?[gate.note]:[])]:sends&&council?[council.why,...d.why]:['the society stays at home',...d.why]};
}

/** Ambush risk on a founding journey (CAT-97): hostile people near the road from the home hall to the site. Pure read. Escorts are real
 * militia drawn from the society, only organised polities send them, and a risky road without escort makes the party wait; nothing is
 * created and nothing teleports. Null when rulers are off (old behaviour). */
export type PartyRisk={risk:number;foes:number;escort:number;why:string};
export function partyRisk(g:Game,team:number,from:{x:number;z:number},to:{x:number;z:number}):PartyRisk|null{
 if(!rulersEnabled(g))return null;
 const dx=to.x-from.x,dz=to.z-from.z,L2=dx*dx+dz*dz||1;let foes=0;
 for(const u of g.state.units){if(u.hp<=0||u.team===team||!g.isFoe(team,u.team))continue;
  const t=Math.max(0,Math.min(1,((u.x-from.x)*dx+(u.z-from.z)*dz)/L2)),px=from.x+dx*t-u.x,pz=from.z+dz*t-u.z;
  if(px*px+pz*pz<=22*22)foes++;}
 const risk=Math.min(1,foes*.2),escort=risk>=.6?3:risk>=.4?2:risk>=.2?1:0;
 return {risk,foes,escort,why:foes?`${foes} hostile ${foes===1?'person':'people'} near the road`:'the road looks quiet'};
}
/** Read model of NPC parties on the road: the real units, where they are, what they carry. Pure read; nothing is created or moved here.
 * kind: settle (founding families), explore (a provisioned scout), trade (a caravan unit carrying real goods to a known hall), raid (fighters
 * on an attack-move toward a known site). Each is a real unit with its own order; status says why one is struggling, low on stores or turning home. */
export type PartyKind='settle'|'explore'|'trade'|'raid';
export type PartyLine={team:number;name:string;crew:number;x:number;z:number;destX:number;destZ:number;distance:number;carrying:string;status:string;kind:PartyKind};
type PartyUnit={team:number;hp:number;x:number;z:number;tx?:number;tz?:number;order?:string;carry:number;carryType?:string;stuckT:number;prisoner?:unknown;
 foundingJourney?:{x:number;z:number;leader:boolean;timber?:number;rations?:number};scout?:{legs:number;returning:boolean;preparing?:true};scoutProvisions?:{food:number;water:number};
 visit?:{phase:string;team?:number;wanted?:string};pillage?:number;attackDestination?:{x:number;z:number}};
export function expansionParties(g:Game,team?:number):PartyLine[]{
 if(!rulersEnabled(g))return [];
 const out=new Map<string,PartyLine>();
 const units=g.state.units as unknown as PartyUnit[];
 const add=(u:PartyUnit,kind:PartyKind,key:string,dx:number,dz:number,leader:boolean,carrying:()=>string)=>{
  const cur=out.get(key),d=Math.round(Math.hypot(u.x-dx,u.z-dz));
  const line=cur??{team:u.team,name:g.tribe(u.team).name,crew:0,x:u.x,z:u.z,destX:dx,destZ:dz,distance:d,carrying:'',status:'on the road',kind};
  line.crew++;if(leader||!cur){line.x=u.x;line.z=u.z;line.distance=d;line.carrying=carrying();}
  if(u.stuckT>8)line.status='struggling to find a way through';
  out.set(key,line);return line;};
 for(const u of units){if(u.hp<=0||u.prisoner||(team!==undefined&&u.team!==team))continue;
  const j=u.foundingJourney;
  if(j){add(u,'settle',u.team+':'+j.x+':'+j.z,j.x,j.z,j.leader,()=>{const goods=u.carry>0?`${Math.round(u.carry)} ${u.carryType??'goods'}`:'nothing',ra=j.rations?`${Math.round(j.rations)} provisions`:'';return ra?(u.carry>0?goods+' and '+ra:ra):goods;});continue;}
  if(u.scout&&!u.scout.preparing){const m=u.scout,p=u.scoutProvisions,home=g.campOf(u.team),
   line=add(u,'explore','x'+u.team+':'+Math.round(u.x)+':'+Math.round(u.z)+':'+units.indexOf(u),m.returning?home.x:(u.tx??u.x),m.returning?home.z:(u.tz??u.z),true,()=>p?`${Math.round(p.food)} food, ${Math.round(p.water)} water`:'no stores');
   if(m.returning&&u.stuckT<=8)line.status='turning home';
   if(p&&!m.returning&&p.food<4&&u.stuckT<=8)line.status='stores running low';
   continue;}
  if(u.visit&&u.visit.team!==undefined&&u.visit.phase!=='waiting'&&u.carry>0){const h=g.campOf(u.visit.team);
   const line=add(u,'trade','t'+u.team+':'+units.indexOf(u),u.tx??h.x,u.tz??h.z,true,()=>`${Math.round(u.carry)} ${u.carryType??'goods'}${u.visit?.wanted?' for '+u.visit.wanted:''}`);
   if(u.visit.phase==='return'&&u.stuckT<=8)line.status='carrying goods home';
   continue;}
  if(u.pillage!==undefined&&u.order==='attackmove'&&u.attackDestination)add(u,'raid','r'+u.team+':'+u.pillage+':'+Math.round(u.attackDestination.x)+':'+Math.round(u.attackDestination.z),u.attackDestination.x,u.attackDestination.z,true,()=>'weapons');
 }
 return [...out.values()];
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
/** Goodwill (0..1) a house holds toward another from remembered acts: agreements between the two (marriage, pact, truce) and fosterage, each fading with a
 * ten-year half-life (same curve as neighbourMemory in rulersView). Derived only from existing records; old saves give 0. Hostages are not goodwill. */
export function memoryGoodwill(g:Game,a:number,b:number):number{
 const r=rulersOf(st(g));if(!r)return 0;const fade=(y:number)=>Math.pow(0.5,Math.max(0,r.year-y)/10);let sum=0;
 const ags=(r.decisions as unknown as {agreements?:{a:number;b:number;since:number}[]}|undefined)?.agreements??[];
 for(const ag of ags)if((ag.a===a&&ag.b===b)||(ag.a===b&&ag.b===a))sum+=fade(Math.floor(ag.since/RULERS_YEAR_SECONDS));
 for(const w of r.wards??[])if(w.kind==='foster'&&((Number(w.from)===a&&Number(w.to)===b)||(Number(w.from)===b&&Number(w.to)===a)))sum+=fade(w.since);
 return Math.min(1,sum);
}
/** Contested hunting ground: living huntable game (deer, boar, goat) that stands within HUNT_GROUND_REACH of a building of BOTH houses, i.e. a herd two
 * settlements both live beside. Derived only from real wildlife and building positions: no new state, nothing is taken or moved, old saves count 0. */
export const HUNT_GROUND_REACH=80;
export function sharedGame(g:Game,a:number,b:number):number{
 if(a===b||!rulersEnabled(g))return 0;const s=g.state as unknown as {wildlife?:{species:string;hp:number;x:number;z:number}[];buildings?:{team:number;hp:number;x:number;z:number}[]};
 const wl=s.wildlife??[],bs=s.buildings??[];if(!wl.length||!bs.length)return 0;
 const near=(team:number,x:number,z:number)=>bs.some(bd=>bd.team===team&&bd.hp>0&&Math.hypot(bd.x-x,bd.z-z)<=HUNT_GROUND_REACH);
 let n=0;for(const c of wl){if(c.hp<=0||(c.species!=='deer'&&c.species!=='boar'&&c.species!=='goat'))continue;if(near(a,c.x,c.z)&&near(b,c.x,c.z))n++;}
 return n;
}
/** Yearly: claims born of real events, never invented. A raided house holds a 'defence' claim (no legitimacy cost) on its raider; a house bound by
 * marriage to a line that has run out of heirs (no heir, no regent) holds a 'succession' claim on it. grantClaim still applies every gate. */
export function eventClaims(g:Game):Claim[]{
 const r=ensureRulers(g);if(!r)return [];const out:Claim[]=[];
 for(const [key,t] of Object.entries(r.ties??{})){
  if(!(t.bond>0))continue;const [x,y]=key.split('|').map(Number);if(!Number.isInteger(x)||!Number.isInteger(y))continue;
  for(const [h,o] of [[x,y],[y,x]]){const d=r.societies[String(o)]?.dynasty,sp=r.societies[String(o)]?.civ.polity.succession;if(!d||!sp)continue;
   if(!heir(d,sp,makeRng(hash32('claim-preview',d.generation,d.rulerId)))&&!d.regent){const c=grantClaim(g,h,o,'succession',45,15);if(c)out.push(c);}}}
 // Hunting-ground and harvest disputes: a known house with a deep unsettled grievance (not yet open war) holds a grounds claim on the other.
 // Strength follows the real recorded grievance; grantClaim still gates by tier/feature/known and refuses duplicates.
 for(const key of Object.keys(r.societies)){const h=Number(key);if(!Number.isInteger(h))continue;
  for(const okey of Object.keys(r.societies)){const o=Number(okey);if(h===o||!Number.isInteger(o))continue;
   const rel=societyRelation(g,h,o),good=memoryGoodwill(g,h,o); // remembered marriage/pact/fosterage makes a house slower to press a grounds claim, and softer when it does
   const shared=sharedGame(g,h,o); // a herd both houses live beside lowers the grievance bar a little (never below .3) and adds a little strength
   const gr=grudgeOf(g,h,o); // a remembered wrong lowers the bar (never below .25) and adds strength
   if(!rel.known||rel.hostile||!(rel.grievance>=Math.max(.25,.5-Math.min(.2,shared*.04)-.2*gr)+.25*good))continue;
   const c=grantClaim(g,h,o,'claim',Math.max(10,Math.round(30+30*Math.min(1,rel.grievance)-18*good+Math.min(10,shared*2)+Math.round(10*gr))),10);if(c)out.push(c);}}
 return out;
}
/** Using a claim as casus belli: spends it and the legitimacy cost is returned for the caller to charge to the holder's glory/unrest. */
export function citeClaim(g:Game,holder:number,target:number,kind:CasusBelli):{cost:number}|null{
 const r=ensureRulers(g);if(!r?.claims)return null;
 const hd=r.societies[String(holder)]?.dynasty;if(hd&&regencyOf(hd))return null; // a regent has no standing to open a cause for a minor
 const i=r.claims.findIndex(c=>c.holder===String(holder)&&c.target===String(target)&&c.kind===kind&&c.expiresTick>r.year);if(i<0)return null;
 st(g).rulers={...r,claims:r.claims.filter((_,j)=>j!==i)};
 if(kind==='claim'||kind==='succession')addGrudge(g,target,holder,.25,'claim'); // being pressed is remembered by the target house
 const cost=cbLegitimacyCost(kind),cur=st(g).rulers!,debt={...(cur.cbDebt??{})};
 if(cost>0)debt[String(holder)]=Math.min(100,(debt[String(holder)]??0)+cost*2); // using a cause spends the house's standing: it feels the strain as unrest until it fades
 st(g).rulers={...cur,cbDebt:debt};
 return {cost};
}
export const cbDebtOf=(g:Game,team:number):number=>rulersOf(st(g))?.cbDebt?.[String(team)]??0;
/** House grudges: a wrong done to a house (a kinsman dead in custody, a claim pressed against it) is remembered by the house, not the ruler. It fades 7% a year
 * and weakens to 60% at each succession on either side, so an heir inherits a quieter version unless the wrong is renewed. Read by eventClaims; no goods or units move. */
export const GRUDGE_FADE=0.93,GRUDGE_HEIR=0.6;
export function addGrudge(g:Game,holder:number,target:number,w:number,cause:'custody'|'claim'){
 const r=ensureRulers(g);if(!r||holder===target)return;const h=String(holder),t=String(target),list=[...(r.grudges??[])],i=list.findIndex(x=>x.holder===h&&x.target===t);
 if(i>=0)list[i]={...list[i],w:Math.min(1,list[i].w+w),since:r.year,cause};else list.push({holder:h,target:t,w:Math.min(1,w),since:r.year,cause});
 st(g).rulers={...st(g).rulers!,grudges:list.slice(-24)};
}
/** A paid blood-price lays the matching grudge down entirely. */
export function clearGrudge(g:Game,holder:number,target:number){const r=rulersOf(st(g));if(!r?.grudges)return;st(g).rulers={...r,grudges:r.grudges.filter(x=>!(x.holder===String(holder)&&x.target===String(target)))};}
export const grudgeOf=(g:Game,holder:number,target:number):number=>rulersOf(st(g))?.grudges?.find(x=>x.holder===String(holder)&&x.target===String(target))?.w??0;
/** Yearly: fade, and weaken where a house changed ruler since `genBefore` (generation per society id before the year stepped). */
export function fadeGrudges(g:Game,genBefore:Record<string,number>){
 const r=rulersOf(st(g));if(!r?.grudges?.length)return;
 const next=r.grudges.map(x=>{const turned=[x.holder,x.target].some(id=>(r.societies[id]?.dynasty.generation??0)>(genBefore[id]??0));return {...x,w:Math.round(x.w*GRUDGE_FADE*(turned?GRUDGE_HEIR:1)*1000)/1000};}).filter(x=>x.w>=.05);
 st(g).rulers={...r,grudges:next};
}
/** Yearly: casus-belli strain fades (-4 a year, never below 0). */
export function fadeCbDebt(g:Game){
 const r=rulersOf(st(g));if(!r?.cbDebt)return;
 const next:Record<string,number>={};for(const [k,v] of Object.entries(r.cbDebt)){const n=Math.max(0,v-4);if(n>0)next[k]=n;}
 st(g).rulers={...r,cbDebt:next};
}
/** War-weariness: a society that stays at war grows tired (+9 a dynastic year per hostile neighbour) and recovers at peace (-6 a year).
 * Stored per society in rulers.weary (0..100, optional so old saves load). It feeds unrestOf and, through warPeaceBonus, the pace at which
 * a tired rival sues for peace; a long unwinnable war therefore ends or topples the house, never runs forever. */
export function tireOfWar(g:Game){
 const r=rulersOf(st(g));if(!r)return;const weary={...(r.weary??{})};
 for(const id of Object.keys(r.societies)){
  const t=Number(id);if(!Number.isInteger(t)||t===3||!g.tribe(t))continue;
  const wars=g.state.tribes.filter((_,i)=>i!==t&&i!==3&&!!g.tribe(i)&&societyRelation(g,t,i).hostile).length;
  const w=weary[id]??0;weary[id]=Math.max(0,Math.min(100,w+(wars?9*wars:-6)));
 }
 st(g).rulers={...r,weary};
}
export const wearinessOf=(g:Game,team:number):number=>rulersOf(st(g))?.weary?.[String(team)]??0;
/** Extra pressure (0..1.5) added to peacePressure: nothing under 40 weariness, full at 100. 0 when rulers are off. */
export const warPeaceBonus=(g:Game,team:number):number=>Math.max(0,wearinessOf(g,team)-40)/60*1.5;
/** Measured unrest 0..100 with its stage for one society. Inputs come from the live game: war with neighbours, claims pressing on it,
 * hunger, and the ruling house's legitimacy. Null when rulers are off. */
export function unrestOf(g:Game,team:number):{value:number;stage:UnrestStage;why:string[]}|null{
 const r=ensureRulers(g);const me=r?.societies[String(team)];if(!r||!me)return null;
 const others=g.state.tribes.map((_,i)=>i).filter(i=>i!==team&&i!==3&&!!g.tribe(i));
 const wars=others.filter(i=>societyRelation(g,team,i).hostile).length;
 const against=claimsOf(g,team).filter(c=>Number(c.target)===team).reduce((t,c)=>t+c.strength,0);
 const hunger=c01(1-reserveSeconds(g,team)/600),lg=Object.values(me.civ.polity.legitimacy),legit=Math.max(0,Math.min(100,30+100*Math.max(0,...lg)+wonderEffect(g.state,team,'concord')-cbDebtOf(g,team)-(regencyOf(me.dynasty)?REGENCY_LEGIT_PENALTY:0))); // source weights sum to ~1; the strongest pillar carries the house
 const v=unrest({legitimacy:legit,warWeariness:Math.min(100,Math.max(wars*35,wearinessOf(g,team))+Math.min(30,against/3)),foodShortage:hunger*100,taxBurden:20,faithDivergence:0,coalitionLoss:breakawayLoss(g,team),rulerPopularity:60},me.civ.polity);
 const why:string[]=[];if(wars)why.push('at war');if(wearinessOf(g,team)>=50)why.push('the war has worn the people down');if(against>0)why.push('claims press on the house');if(cbDebtOf(g,team)>0)why.push('the house spent its standing on a cause');if(hunger>.5)why.push('food is short');
 return {value:v,stage:stageOf(v),why};
}

/** Permit for the other three journeys the drivers steer. These reuse the real parties that already exist (scouts with provisions, barter
 * caravans with their cargo, raid forces); the drivers only decide WHETHER and how eagerly, so nothing is spawned, teleported or handed out.
 *  explore: the 'explore' mode lowers the food reserve a scout needs (450->300 s); a society that is pressed to leave or fight keeps it at 450.
 *  trade:   the 'trade' mode reviews barter twice as often (60 s, not 120 s); 'stay' keeps the old pace.
 *  raid:    bands and below raid as before. A state-tier polity needs cause to strike a peaceful, known neighbour: it must be in 'conquer'
 *           mode AND hold a 'raid' claim. With no claim the first review grants one (a visible grievance, 12 years) and the strike waits a
 *           review; the strike cites the claim, spending it. Already-hostile targets need no cause. Null (old behaviour) when rulers are off. */
export type JourneyPermit={allow:boolean;reserve?:number;cadence?:number;why:string[]};
export function journeyPermit(g:Game,team:number,kind:'explore'|'trade'|'raid',target?:number):JourneyPermit|null{
 const d=expansionOf(g,team);if(!d)return null;
 const org=ERA_REACH[st(g).rulers?.societies[String(team)]?.civ.polity.tier??'band'].organised; // bands have no standing provisioning or market habit to speed up
 if(kind==='explore')return {allow:true,reserve:d.mode==='explore'&&org?300:450,why:d.mode==='explore'&&org?d.why:[]};
 if(kind==='trade')return {allow:true,cadence:Math.round((d.mode==='trade'&&org?60:120)*tradeCadenceBias(g,team)),why:d.mode==='trade'&&org?d.why:[]};
 const council=raidGate(g,team); // society decision layer: a strike leaves only under a raid plan, against the planned target
 if(council&&(!council.allow||(target!==undefined&&council.target!==target)))return {allow:false,why:[council.allow?'the council named another target':council.why]};
 const r=ensureRulers(g),me=r?.societies[String(team)];if(!r||!me||target===undefined||g.isFoe(team,target))return {allow:true,why:['already at war']};
 if(me.civ.polity.tier!=='state')return {allow:true,why:[]};
 if(d.mode!=='conquer')return {allow:false,why:['a state needs cause and appetite to strike a peaceful neighbour']};
 if(!societyRelation(g,team,target).known)return {allow:false,why:['the target is not known']};
 const has=claimsOf(g,team).some(c=>Number(c.holder)===team&&Number(c.target)===target&&c.kind==='raid');
 if(has)return {allow:true,why:['a standing claim justifies the strike',...d.why]};
 grantClaim(g,team,target,'raid',55,12);
 return {allow:false,why:['the house presses a claim before it strikes']};
}
/** Called when a permitted raid actually leaves: a state's strike spends its claim and pays the legitimacy cost as grievance at home. */
export function spendRaidClaim(g:Game,team:number,target:number){
 noteRaid(g,team,target);
 grantClaim(g,target,team,'defence',60,10); // the raided house may answer in kind, at no legitimacy cost
 const c=citeClaim(g,team,target,'raid');if(c)nudgeSocietyRelation(g,target,team,{trust:0,grievance:.01*c.cost});return c;
}

/** Domestic-pressure executor. Unrest has teeth: a house that sits at 'uprising' or 'civilWar' for UPRISING_YEARS dynastic years in a row is
 * overthrown. The ruler is set aside through the same heir() law succession uses (never killed, never teleported: they stay in the house as
 * kin), the new ruler is flagged illegitimate and the log says why. 'plots' and below only warn (log once on entry). The counter resets
 * after a fall or when pressure drops below 'uprising'. Stored in rulers.unrestYears (optional, so old saves load). Off when rulers are off. */
export const UPRISING_YEARS=3;
export function domesticPressure(g:Game):string[]{
 const r=rulersOf(st(g));if(!r)return [];
 const years={...(r.unrestYears??{})},societies={...r.societies},falls:string[]=[];
 for(const id of Object.keys(societies)){
  const t=Number(id);if(!Number.isInteger(t)||t===3||!g.tribe(t))continue;
  const u=unrestOf(g,t);if(!u)continue;
  const hot=u.stage==='uprising'||u.stage==='civilWar';
  const n=hot?(years[id]??0)+1:0;years[id]=n;
  if(n<UPRISING_YEARS)continue;
  const sr=societies[id],d=sr.dynasty,old=d.people[d.rulerId];
  const next=old&&heir(d,sr.civ.polity.succession,makeRng(hash32('overthrow',r.seed,r.year,id)));
  if(!old||!next)continue; // no one to raise: the house limps on and the pressure stays
  const note=`${r.year}: ${old.name} is overthrown after ${n} years of ${u.stage==='civilWar'?'civil war':'uprising'} (${u.why.join(', ')||'unrest'}); ${next.name} takes the seat`;
  societies[id]={...sr,dynasty:{...d,rulerId:next.id,regent:undefined,generation:d.generation+1,log:[...d.log,note].slice(-40),
   people:{...d.people,[next.id]:{...next,legit:false,claimStrength:Math.min(next.claimStrength,40)}}}};
  years[id]=0;falls.push(note);
 }
 st(g).rulers={...r,societies,unrestYears:years};
 return falls;
}

/** Feed lines for the player: agreements between societies (marriages, pacts, truces, fosterage) and hostage/foster wards that the player can
 * legitimately know of: the player is a party. Meeting both parties does not reveal their private pact. Future third-party reports require an actual information receipt. Read-only; invents nothing, and old saves (no decision
 * state or rulers) give []. Newest first. `sinceTime` filters by sim time of the agreement. */
export type NeighbourNews={time:number;kind:string;a:number;b:number;text:string};
export function neighbourNews(g:Game,sinceTime=0,limit=8):NeighbourNews[]{
 const d=(st(g).rulers as unknown as {decisions?:{agreements?:{kind:string;a:number;b:number;since:number;note:string}[];history?:Record<string,{year:number;kind:string;text:string}[]>}}|undefined)?.decisions;
 const out:NeighbourNews[]=[];
 // A change of ruler is public at a court the player has met (the same fact the rival court card shows). Only the public part of the
 // chronicle line is reported: who succeeded whom and whether the claim was contested, never the private agreement and grievance tallies.
 if(rulersEnabled(g))for(const [id,list] of Object.entries(d?.history??{})){
  const t=Number(id);if(!Number.isInteger(t)||t===0||t===3||!g.tribe(t)||!societyRelation(g,0,t).known)continue;
  for(const h of list){
   // Decision-feed: a known court's breakaway or reintegration is public (a community splits or is retaken); its private plans, postures and reasons are not.
   if(h.kind==='breakaway'||h.kind==='reintegration'){const bt=h.year*RULERS_YEAR_SECONDS;if(bt>=sinceTime)out.push({time:bt,kind:h.kind,a:t,b:t,text:`${g.tribe(t).name} ${h.text}`});continue;}
   if(h.kind!=='succession')continue;const time=h.year*RULERS_YEAR_SECONDS;if(time<sinceTime)continue;
   const m=/^(.+?) succeeded (.+?) \((child|sibling|kin|none)(, contested)?\)/.exec(h.text);if(!m)continue;
   out.push({time,kind:'succession',a:t,b:t,text:`${g.tribe(t).name}: ${m[1]} succeeded ${m[2]}${m[4]?', and the claim is disputed':''}`});
  }
 }
 // Fosterlings and hostages coming home are told only where the player's house is on one side (the same walk-home, no remote receipts).
 for(const w of (rulersOf(st(g))?.wardReturns??[])){const a=Number(w.from),b=Number(w.to);if(a!==0&&b!==0)continue;const time=w.year*RULERS_YEAR_SECONDS;if(time<sinceTime)continue;
  const home=g.tribe(a)?.name??`Society ${a}`,host=g.tribe(b)?.name??`Society ${b}`,what=w.kind==='foster'?'fosterling':'hostage';
  const text=w.how==='died'?`${w.name}, ${what} of ${home} at ${host}, died in the other house`:w.how==='war'?`${w.name}, ${what} of ${home}, was sent home from ${host} as war broke the pledge`:w.how==='grown'?`${w.name} of ${home} came home from ${host} grown (age ${Math.floor(w.age)}), bound by the kin ties of the fosterage`:`${w.name}, ${what} of ${home}, was released by ${host} after the term`;
  out.push({time,kind:'ward-return',a,b,text});}
 if(rulersEnabled(g)){const rr=rulersOf(st(g)),d0=rr?.societies['0']?.dynasty;if(rr&&d0)for(const o of rr.orphanCare??[]){if(o.society!=='0')continue;const time=o.since*RULERS_YEAR_SECONDS;if(time<sinceTime)continue;const line=orphanLine(d0,o);if(line)out.push({time,kind:'orphan-care',a:0,b:0,text:line});}}
 const sees=(a:number,b:number)=>a===0||b===0;
 for(const ag of d?.agreements??[]){if(ag.since>=sinceTime&&sees(ag.a,ag.b))out.push({time:ag.since,kind:ag.kind,a:ag.a,b:ag.b,text:ag.note});}
 const roster=(st(g) as unknown as {commanders?:{roster:{id:number;unitId:number;team:number;name:string;status:string;fellAt?:number;capturedAt?:number;capturedBy?:number;replacedBy?:number;replaces?:number;seenByPlayer?:boolean;appointedAt:number}[]}}).commanders?.roster??[];
 for(const c of roster){
  if(c.team===0)continue;
  const who=(t:number)=>(st(g).tribes as {name?:string}[])[t]?.name??`Society ${t}`,house=who(c.team);
  if(c.seenByPlayer&&c.status==='fallen'&&c.fellAt!==undefined&&c.fellAt>=sinceTime)out.push({time:c.fellAt,kind:'commander-fell',a:c.team,b:c.team,text:`${c.name}, commander of ${house}, fell`});
  if(c.seenByPlayer&&c.capturedAt!==undefined&&c.capturedAt>=sinceTime&&c.capturedBy===0)out.push({time:c.capturedAt,kind:'commander-captured',a:c.team,b:0,text:`${c.name}, commander of ${house}, was taken captive`});
  if(c.replaces!==undefined&&c.appointedAt>=sinceTime){
   const old=roster.find(o=>o.id===c.replaces&&o.team===c.team&&o.replacedBy===c.id&&o.seenByPlayer&&(o.fellAt!==undefined||o.capturedAt!==undefined));
   const body=g.state.units.find(u=>u.id===c.unitId&&u.team===c.team&&u.hp>0);
   // A known predecessor's loss is not a remote receipt for a private appointment.
   // Fresh successors have no loss-witness flag: real current sight is sufficient.
   if(old&&(c.seenByPlayer||body&&g.visibleAt(body.x,body.z)))out.push({time:c.appointedAt,kind:'commander-replaced',a:c.team,b:c.team,text:`${house} named ${c.name} to replace ${old.name}`});
  }
 }
 return out.sort((x,y)=>y.time-x.time).slice(0,Math.max(0,limit));
}
