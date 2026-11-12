import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {knownSettlementSite} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tradeAnswerBlocker,observedPartnerStock,validTradeNeedsState,proposeTradeOffer,answerTradeOffer,reviewTradeNeeds,tickTradeNeeds,tradeStock,tradeSpread,tradeReviewSeconds,marketCount,tradeNeedsDiagnostics,TRADE_NEEDS_RULES,TRADE_GOODS} from '../src/game/tradeNeeds.ts';

function ground(g){const size=g.world.size;for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++)g.world.heights[z*(SEGS+1)+x]=4;g.world.rivers=[];g.world.features=[];g.rebuildWalk();for(const u of g.state.units)u.y=g.height(u.x,u.z);for(const b of g.state.buildings)b.y=g.height(b.x,b.z);void size;const clock=g.clockState.bind(g);g.clockState=()=>({...clock(),period:'Day'});}
/** Flat dry world; halls 70 m apart; each rival has 10 adults and mutually observed halls. */
function fixture({stock1={},stock2={},markets=0,dist=70}={}){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.conflict='quiet';g.seaT=1e9;g.calamityT=1e9;for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];g.state.livestock=[];
 for(const t of g.state.tribes)Object.assign(t,{food:2000,foodLots:undefined,wood:0,stone:0,copper:0,iron:0,spears:0,bows:0,blades:0,aggro:0,hostile:false,ally:false,trust:.8,tension:0,thinkT:10000,age:2,items:{}});
 Object.assign(g.tribe(1),stock1);Object.assign(g.tribe(2),stock2);
 g.state.buildings.push(g.makeBld('townhall',0,0,1),g.makeBld('townhall',dist,0,2),g.makeBld('townhall',-300,-200,0));
 for(let i=0;i<10;i++){g.spawnUnit('worker',8+i*1.5,6,1).order='hold';g.spawnUnit('worker',dist+8+i*1.5,6,2).order='hold';}
 g.spawnUnit('worker',-300,-190,0).order='hold';
 for(let i=0;i<markets;i++){const m=g.makeBld('market',-20-i*12,-20,1);g.state.buildings.push(m);}
 ground(g);
 for(const [a,b] of [[1,2],[2,1]]){const hall=g.state.buildings.find(x=>x.team===b&&x.type==='townhall'),w=g.state.units.find(u=>u.team===a);const old={x:w.x,z:w.z};Object.assign(w,{x:hall.x+5,z:hall.z+5});g.state.time+=3;knownSettlementSite(g,b,a);Object.assign(w,old);}
 g.state.coastalTradeReviewAt=1e8;g.state.scoutTimer=1000;
 return g;}
function finish(g){for(const b of g.state.buildings){b.build=1;}}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
function reload(g){const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));ground(copy);copy.seaT=1e9;copy.calamityT=1e9;return copy;}
const KINDS=Object.keys(TRADE_GOODS);
/** Everything of one kind anywhere: stocks, escrow, carried lines, dropped parcels, recorded loss of non-parcelled goods. */
function total(g,k){let n=0;for(const t of g.state.tribes.map(t=>t.id))n+=tradeStock(g,t,k);for(const o of g.state.tradeNeeds?.offers||[]){if(o.reserved)for(const s of [o.give,o.get])if(s.kind===k)n+=s.amount;for(const l of o.lines)if(l.kind===k)n+=l.amount;n+=o.lostAmount&&o.give.kind===k||o.get.kind===k?o.lostAmount-o.lostToParcel:0;}
 for(const p of g.state.droppedCargo?.parcels||[])if(p.kind===k)n+=p.amount;
 // Recovery runners carrying a recovered parcel home hold goods that are in neither stock nor parcel yet.
 for(const u of g.state.units)if(u.tradeNeedsId===undefined&&u.carry>0&&u.carryType===k)n+=u.carry;return n;}
function snapshot(g){return Object.fromEntries(KINDS.filter(k=>k!=='food').map(k=>[k,total(g,k)]));}
const offer=g=>g.state.tradeNeeds.offers[0];
const reasonOf=(g,id)=>g.state.tradeNeeds.offers.find(o=>o.id===id).reason;
const people=g=>JSON.stringify(g.state.units.map(u=>[u.id,u.order,u.tradeNeedsId??null,u.carry]));

test('dry-run blocker equals the accept path verdict and moves nothing',()=>{
 for(const mutate of [()=>{}, g=>{g.tribe(2).wood=0;}, g=>{for(const u of g.state.units)if(u.team===1)u.order='move';}, g=>{for(const u of g.state.units.filter(u=>u.team===1).slice(2))u.hp=0;}]){
  const g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});const o=proposeTradeOffer(g,1,2,'stone','wood').offer;mutate(g);
  const before=snapshot(g),crew=people(g),blocker=tradeAnswerBlocker(g,o);
  assert.equal(tradeAnswerBlocker(g,o.id),blocker,'id and object forms agree');
  assert.deepEqual(snapshot(g),before,'dry run reserves nothing');assert.equal(people(g),crew,'dry run commits nobody');assert.equal(o.phase,'proposed');
  g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);
  if(blocker===''){assert.equal(o.phase,'loading',o.reason);}else{assert.equal(o.phase,'declined');assert.equal(reasonOf(g,o.id),blocker);}
  assert.equal(tradeAnswerBlocker(g,o),'not-open','answered offers cannot be re-answered');
 }
});
test('player-facing dialog: blocker for an offer to the player matches answerTradeOffer acceptance',()=>{
 const g=fixture({stock1:{stone:220,wood:0},stock2:{wood:0}});g.tribe(0).wood=0;
 const hall=g.state.buildings.find(b=>b.team===0),w=g.state.units.find(u=>u.team===1);const old={x:w.x,z:w.z};Object.assign(w,{x:hall.x+5,z:hall.z+5});g.state.time+=3;knownSettlementSite(g,0,1);Object.assign(w,old);
 const r=proposeTradeOffer(g,1,0,'stone','wood');assert.equal(r.ok,true,JSON.stringify(r));const o=r.offer;
 assert.equal(tradeAnswerBlocker(g,o),'no-surplus','player lacks the requested wood');
 answerTradeOffer(g,o.id,true);assert.equal(o.phase,'declined');assert.equal(o.reason,'no-surplus');
});
test('observed partner stock is last-observed knowledge from carriers at the hall, never live state; persists and validates',()=>{
 let g=fixture({stock1:{stone:220,wood:0},stock2:{wood:320,stone:0}});finish(g);
 assert.equal(observedPartnerStock(g,1,2),null,'nothing known before anyone visits');
 const o=proposeTradeOffer(g,1,2,'stone','wood').offer;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);
 drive(g,600,()=>o.phase==='returning'||g.state.tradeNeeds.offers.find(x=>x.id===o.id).phase==='returning');
 const seen=observedPartnerStock(g,1,2);assert.ok(seen,'carriers at the partner hall observed it');assert.equal(observedPartnerStock(g,2,1),null,'the visited side learned nothing about the visitor');
 const wood=seen.stock.wood;assert.equal(typeof wood,'number');
 g.tribe(2).wood+=500;g.state.time+=50;const later=observedPartnerStock(g,1,2);assert.equal(later.stock.wood,wood,'remote changes are not leaked');assert.ok(later.ageSeconds>=49.9);
 later.stock.wood=-1;assert.equal(observedPartnerStock(g,1,2).stock.wood,wood,'callers get a copy');
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validTradeNeedsState(raw.state),true);
 const copy=reload(g);assert.equal(observedPartnerStock(copy,1,2).stock.wood,wood);
 const bad=structuredClone(raw.state);bad.tradeNeeds.observations[0].stock.wood=-5;assert.equal(validTradeNeedsState(bad),false);
 const dup=structuredClone(raw.state);dup.tradeNeeds.observations.push({...dup.tradeNeeds.observations[0]});assert.equal(validTradeNeedsState(dup),false);
 const old=structuredClone(raw.state);delete old.tradeNeeds.observations;assert.equal(validTradeNeedsState(old),true,'old saves without observations load');
});
