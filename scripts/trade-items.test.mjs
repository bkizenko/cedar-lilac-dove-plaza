import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {knownSettlementSite} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tradeAnswerBlocker,validTradeNeedsState,TRADE_SELECTABLE_KINDS,proposeTradeOffer,answerTradeOffer,reviewTradeNeeds,tickTradeNeeds,tradeStock,tradeSpread,tradeReviewSeconds,marketCount,tradeNeedsDiagnostics,TRADE_NEEDS_RULES,TRADE_GOODS} from '../src/game/tradeNeeds.ts';

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
import {droppedParcels} from '../src/game/stolenCargo.ts';
import {tickCoastalTrade} from '../src/game/coastalTrade.ts';
const itemTotal=(g,k)=>total(g,k)+g.state.units.reduce((n,u)=>n+(u.tradeNeedsId===undefined&&u.hp>0?(u.itemCargo?.[k]||0):0),0);
test('bulk goods travel in the carrier\'s own itemCargo, are paid physically and conserved through save/reload',()=>{
 let g=fixture({stock1:{wood:0,items:{pottery:24}},stock2:{wood:320,items:{}}});finish(g);const pot=itemTotal(g,'pottery'),wood=itemTotal(g,'wood');
 const r=proposeTradeOffer(g,1,2,'pottery','wood');assert.equal(r.ok,true,JSON.stringify(r));const id=r.offer.id;g.state.time=r.offer.answerAt+1;tickTradeNeeds(g,.1);
 let o=g.state.tradeNeeds.offers.find(o=>o.id===id);assert.equal(o.phase,'loading',o.reason);
 drive(g,400,()=>g.state.tradeNeeds.offers.find(o=>o.id===id).phase==='outbound');o=g.state.tradeNeeds.offers.find(o=>o.id===id);assert.equal(o.phase,'outbound',o.reason);
 const c=g.state.units.find(u=>u.id===o.lines[0].unitId);assert.equal(c.itemCargo.pottery,o.lines.filter(l=>l.unitId===c.id).reduce((n,l)=>n+l.amount,0),'goods are on the body');
 assert.equal(itemTotal(g,'pottery'),pot);assert.equal(validTradeNeedsState(JSON.parse(JSON.stringify(encodeGame(g))).state),true);
 g=reload(g);o=g.state.tradeNeeds.offers.find(o=>o.id===id);
 drive(g,900,()=>['complete','failed'].includes(g.state.tradeNeeds.offers.find(o=>o.id===id).phase));o=g.state.tradeNeeds.offers.find(o=>o.id===id);
 assert.equal(o.phase,'complete',o.reason);assert.equal(itemTotal(g,'pottery'),pot);assert.equal(itemTotal(g,'wood'),wood);assert.ok((g.tribe(2).items.pottery||0)>0);assert.ok(g.tribe(1).wood>0);
 for(const u of g.state.units)assert.ok(!(u.itemCargo?.pottery>0),'no pottery left in hands');
});
test('a carrier killed on the road leaves an item parcel owned by its society; nothing vanishes',()=>{
 const g=fixture({stock1:{wood:0,items:{cloth:16}},stock2:{wood:320,items:{}}});finish(g);const cloth=itemTotal(g,'cloth');
 const o=proposeTradeOffer(g,1,2,'cloth','wood').offer;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);drive(g,400,()=>o.phase==='outbound');assert.equal(o.phase,'outbound',o.reason);
 const c=g.state.units.find(u=>u.id===o.lines[0].unitId),held=c.itemCargo.cloth;c.x+=30;c.hp=0;tickCoastalTrade(g,0);// the same reconciliation call Game.step makes right after combat deaths
 const p=droppedParcels(g).find(p=>p.kind==='cloth');assert.ok(p,'item parcel dropped');assert.equal(p.originalOwnerTeam,1);assert.ok(p.amount>=held);
 assert.equal(itemTotal(g,'cloth'),cloth,'cloth conserved as parcel');drive(g,60);assert.equal(itemTotal(g,'cloth'),cloth,'still conserved while owners recover it');assert.equal(validTradeNeedsState(JSON.parse(JSON.stringify(encodeGame(g))).state),true);
});
test('goods without a holder adapter stay refused; detached offers and future observations are rejected',()=>{
 const g=fixture({stock1:{spears:9,stone:220,wood:0,items:{pottery:10}},stock2:{wood:320}});
 for(const k of ['spears','paddedArmor','goat'])assert.equal(proposeTradeOffer(g,1,2,k,'wood').reason,'no-physical-holder',k);
 assert.ok(TRADE_SELECTABLE_KINDS.includes('pottery')&&TRADE_SELECTABLE_KINDS.includes('hideCoat')&&!TRADE_SELECTABLE_KINDS.includes('spears'));
 const o=proposeTradeOffer(g,1,2,'stone','wood').offer;assert.equal(tradeAnswerBlocker(g,{...o,id:999999}),'not-open','detached caller object is never evaluated');
 g.state.tradeNeeds.observations=[{viewer:1,partner:2,observedAt:g.state.time+50,observerId:g.state.units[0].id,stock:{wood:1}}];assert.equal(validTradeNeedsState(JSON.parse(JSON.stringify(encodeGame(g))).state),false);
});
