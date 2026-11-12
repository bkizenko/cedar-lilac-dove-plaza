import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {knownSettlementSite} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {pauseTradeNeeds,validTradeNeedsState,TRADE_SELECTABLE_KINDS,proposeTradeOffer,answerTradeOffer,reviewTradeNeeds,tickTradeNeeds,tradeStock,tradeSpread,tradeReviewSeconds,marketCount,tradeNeedsDiagnostics,TRADE_NEEDS_RULES,TRADE_GOODS} from '../src/game/tradeNeeds.ts';

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
import {markStolenLoad,stolenMarkRoom,tickStolenCargo,cancelCargoTrip,STOLEN_CARGO_RULES} from '../src/game/stolenCargo.ts';
function launch(stock1={stone:220,wood:0},stock2={wood:320,stone:0}){const g=fixture({stock1,stock2});finish(g);const o=proposeTradeOffer(g,1,2,'stone','wood').offer;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);return{g,o};}
test('a direct order releases a trade carrier without being overwritten; carried goods stay on the body; escrow reconciles and everything is conserved',()=>{
 const {g,o}=launch();const before=snapshot(g);drive(g,400,()=>o.phase==='outbound');assert.equal(o.phase,'outbound',o.reason);
 const c=g.state.units.find(u=>u.id===o.carriers[0]),load=c.carry,kind=c.carryType;assert.ok(load>0);
 g.interruptMission(c);c.order='move';c.tx=c.x+20;c.tz=c.z;
 assert.equal(c.tradeNeedsId,undefined);assert.equal(c.order,'move','new command kept');assert.equal(c.carry,load);assert.equal(c.carryType,kind);
 tickTradeNeeds(g,.1);if(!o.carriers.length)assert.equal(o.phase,'failed');
 assert.deepEqual(snapshot(g),before,'goods on the body still count; partner escrow refunded, nothing lost');
 assert.equal(pauseTradeNeeds(g,c),false,'already released');
});
test('loading hands goods over only to carriers standing at a cache at that moment',()=>{
 const {g,o}=launch();drive(g,300,()=>o.carriers.every(id=>o.ready.includes(id)));
 if(o.phase==='loading'){for(const id of o.carriers){const u=g.state.units.find(u=>u.id===id);u.x+=60;}tickTradeNeeds(g,.1);assert.equal(o.phase,'loading','displaced carriers do not load remotely');assert.equal(o.lines.length,0);}
});
test('stricter save validation: reserved proposals, out-of-world halls, duplicate members and carry mismatches are rejected',()=>{
 const {g,o}=launch();drive(g,400,()=>o.phase==='outbound');const raw=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validTradeNeedsState(raw.state),true);
 const off=s=>s.tradeNeeds.offers.find(x=>x.id===o.id);
 let bad=structuredClone(raw.state);off(bad).hall.x=99999;assert.equal(validTradeNeedsState(bad),false);
 bad=structuredClone(raw.state);off(bad).escorts.push(off(bad).carriers[0]);assert.equal(validTradeNeedsState(bad),false);
 bad=structuredClone(raw.state);bad.units.find(u=>u.id===off(bad).carriers[0]).carry+=5;assert.equal(validTradeNeedsState(bad),false);
 bad=structuredClone(raw.state);const p=off(bad);p.phase='proposed';p.carriers=[];p.escorts=[];p.lines=[];p.ready=[];for(const u of bad.units)if(u.tradeNeedsId===o.id)delete u.tradeNeedsId;assert.equal(validTradeNeedsState(bad),false,'proposed offers hold no escrow');
});
test('stolen cargo caps: a full parcel table leaves goods on the body; a full mark table refuses the theft instead of losing the owner',()=>{
 const g=fixture();const raider=g.spawnUnit('spearman',0,-40,3);raider.carry=10;raider.carryType='wood';markStolenLoad(g,raider,1);
 const s=g.state.droppedCargo;for(let i=0;i<STOLEN_CARGO_RULES.maximumParcels;i++)s.parcels.push({id:g.id(),kind:'stone',amount:1,x:200+i,z:200,originalOwnerTeam:2,fromTeam:3,droppedAt:0});
 raider.hp=0;tickStolenCargo(g,.1);assert.equal(s.parcels.length,STOLEN_CARGO_RULES.maximumParcels,'no 65th parcel');assert.equal(raider.carry,10,'goods stay on the body, not teleported');
 assert.equal(s.parcels.every(p=>p.kind==='stone'&&p.amount===1),true);
 const h=fixture();const ids=[];for(let i=0;i<STOLEN_CARGO_RULES.maximumMarks;i++){const u=h.spawnUnit('spearman',-50+i,-40,3);u.carry=2;u.carryType='wood';assert.equal(markStolenLoad(h,u,1),true);ids.push(u.id);}
 const extra=h.spawnUnit('spearman',30,-40,3);assert.equal(stolenMarkRoom(h,extra),false);extra.carry=2;extra.carryType='wood';assert.equal(markStolenLoad(h,extra,2),false);
 assert.equal(h.state.droppedCargo.marks.length,STOLEN_CARGO_RULES.maximumMarks,'no live owner mark evicted');
});
test('cancelling a recovery trip keeps the successor order',()=>{const g=fixture();const u=g.state.units.find(u=>u.team===1);assert.equal(cancelCargoTrip(g,u),false);});
