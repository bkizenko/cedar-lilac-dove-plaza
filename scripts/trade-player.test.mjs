import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {SEGS} from '../src/game/constants.ts';
import {knownSettlementSite} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {proposePlayerTrade,proposeTradeOffer,answerTradeOffer,reviewTradeNeeds,tickTradeNeeds,tradeNeedsAI,tradeStock,tradeSpread,tradeReviewSeconds,marketCount,tradeNeedsDiagnostics,TRADE_NEEDS_RULES,TRADE_GOODS} from '../src/game/tradeNeeds.ts';

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
function playerSetup(g){const hall=g.state.buildings.find(b=>b.team===0);hall.x=-90;hall.z=0;hall.y=g.height(hall.x,hall.z);
 for(const u of g.state.units.filter(u=>u.team===0))u.hp=0;g.state.units=g.state.units.filter(u=>u.hp>0);
 for(let i=0;i<6;i++){const u=g.spawnUnit('worker',-84+i*1.5,6,0);u.order='hold';}
 g.rebuildWalk();const w=g.state.units.find(u=>u.team===0),old={x:w.x,z:w.z},site=g.state.buildings.find(b=>b.team===1&&b.type==='townhall');Object.assign(w,{x:site.x+5,z:site.z+5});g.state.time+=3;knownSettlementSite(g,1,0);Object.assign(w,old);return hall;}
test('the player offers a chosen amount of what it holds to a located village; partner answers from its own need; goods move physically and are conserved',()=>{
 const g=fixture({stock1:{wood:320,stone:0}});g.tribe(0).stone=60;g.tribe(0).wood=0;playerSetup(g);finish(g);const before=snapshot(g);
 const r=proposePlayerTrade(g,1,'stone','wood',30);assert.equal(r.ok,true,JSON.stringify(r));const o=r.offer;assert.equal(o.from,0);assert.equal(o.give.amount,30);assert.ok(o.get.amount>0);
 assert.deepEqual(snapshot(g),before,'a proposal moves nothing');assert.equal(g.tribe(0).stone,60);
 g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);assert.equal(o.phase,'loading',o.reason);assert.deepEqual(snapshot(g),before,'escrow conserves');
 drive(g,900,()=>!['loading','outbound','returning','aborting'].includes(o.phase));
 assert.equal(o.phase,'complete',o.reason);assert.deepEqual(snapshot(g),before,'conserved end to end');assert.equal(g.tribe(0).stone,30);assert.equal(g.tribe(0).wood,o.getDelivered);assert.ok(g.tribe(1).stone>=30);
});
test('player proposals are refused for goods not held, unknown villages, or a partner that does not need the offer',()=>{
 const g=fixture({stock1:{wood:320,stone:500}});g.tribe(0).stone=10;playerSetup(g);
 assert.equal(proposePlayerTrade(g,1,'stone','wood',40).ok,false,'cannot offer more than held');
 assert.equal(proposePlayerTrade(g,2,'stone','wood',5).ok,false,'village never located');
 const r=proposePlayerTrade(g,1,'stone','wood',10);assert.equal(r.ok,true,JSON.stringify(r));g.state.time=r.offer.answerAt+1;tickTradeNeeds(g,.1);
 assert.equal(r.offer.phase,'declined');assert.equal(r.offer.reason,'no-need','partner already has plenty of stone');
 assert.equal(proposeTradeOffer(g,0,1,'stone','wood').ok,false,'the NPC path still cannot originate as the player');
});

test('real weapon burden changing an accepted carrier capacity refunds every reserved good instead of dropping the unallocated remainder',async()=>{
 const{equipCaravan}=await import('../src/game/caravans.ts');const{carryingCapacity}=await import('../src/game/haulage.ts');
 const g=fixture({stock1:{wood:0,stone:320}});playerSetup(g);finish(g);g.tribe(0).wood=28;g.tribe(0).spears=1;
 const r=proposePlayerTrade(g,1,'wood','stone',28);assert.equal(r.ok,true,JSON.stringify(r));const o=r.offer;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);assert.equal(o.phase,'loading',o.reason);assert.equal(o.carriers.length,1);
 const u=g.state.units.find(u=>u.id===o.carriers[0]),partnerBefore=g.tribe(1).stone+o.get.amount;assert.equal(equipCaravan(g,u),true);assert.ok(carryingCapacity(u,'wood')<28);assert.equal(g.tribe(0).spears,0);
 for(let i=0;i<2000&&o.phase==='loading';i++){g.state.time+=.1;tradeNeedsAI(g,u,.1);tickTradeNeeds(g,.1);}
 assert.equal(o.phase,'failed');assert.equal(o.reason,'loading-capacity-changed');assert.equal(g.tribe(0).wood,28);assert.equal(g.tribe(1).stone,partnerBefore);assert.equal(u.carry,0);assert.equal(u.militia,true);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('owned typed proposal and pure read model expose known terms without paying remotely or disclosing partner stores',async()=>{
 const{applyEngineCommand,isEngineDispatchCommand}=await import('../src/game/engineDispatch.ts');const{applyEngineReadQuery,isEngineReadQuery}=await import('../src/game/engineReadModels.ts');
 const g=fixture({stock1:{wood:320,stone:0,food:123456.789}});playerSetup(g);finish(g);g.tribe(0).stone=60;g.tribe(0).wood=0;
 if(process.env.PLAYER_TRADE_BUILT_FIXTURES){const{writeFileSync,mkdirSync}=await import('node:fs');mkdirSync(process.env.PLAYER_TRADE_BUILT_FIXTURES,{recursive:true});const save=structuredClone(encodeGame(g));save.state.paused=true;save.vision=Array.from(save.vision,()=>2);writeFileSync(process.env.PLAYER_TRADE_BUILT_FIXTURES+'/outgoing.json',JSON.stringify({save,team:1,scope:'Controlled finite legacy geometry and initial known sites/vision; no campaign or genuine acquisition claim'}));}
 const q={kind:'needs-trade',team:1};assert.equal(isEngineReadQuery(q),true);assert.equal(isEngineReadQuery({...q,viewer:1}),false);const before=JSON.stringify(encodeGame(g)),model=applyEngineReadQuery(g,q);assert.equal(model.partnerKnown,true);assert.equal(JSON.stringify(encodeGame(g)),before);assert.ok(!JSON.stringify(model).includes('123456.789'));assert.equal(model.offers.length,0);model.goods[0].held=9e8;assert.notEqual(applyEngineReadQuery(g,q).goods[0].held,9e8);
 const c={kind:'propose-needs-trade',team:1,give:'stone',get:'wood',amount:30};assert.equal(isEngineDispatchCommand(c),true);for(const bad of [{...c,from:1},{...c,amount:-1},{...c,give:'goat'},{...c,amount:37}]){assert.equal(isEngineDispatchCommand(bad),false);assert.equal(applyEngineCommand(g,bad).accepted,false);assert.equal(JSON.stringify(encodeGame(g)),before);}
 assert.equal(applyEngineCommand(g,{...c,team:2}).accepted,false);assert.equal(JSON.stringify(encodeGame(g)),before);const sent=applyEngineCommand(g,c);assert.equal(sent.accepted,true,sent.reason);assert.equal(g.tribe(0).stone,60);assert.equal(g.tribe(1).wood,320);assert.equal(applyEngineCommand(g,c).accepted,false);const o=g.state.tradeNeeds.offers.find(o=>o.id===sent.projectId),qty=o.quoted.getAmount;g.state.time=o.answerAt+1;tickTradeNeeds(g,.1);assert.equal(o.phase,'loading',o.reason);const view=applyEngineReadQuery(g,q).offers[0];assert.equal(view.give.amount,30);assert.equal(view.get.amount,qty);assert.equal(view.canAnswer,false);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('arrived incoming offers can be answered only by the recipient and reveal neither unseen proposals nor private caravan failure',async()=>{
 const{applyEngineCommand}=await import('../src/game/engineDispatch.ts');const{applyEngineReadQuery}=await import('../src/game/engineReadModels.ts');const{endowSettlementSites}=await import('./helpers/endowed-settlement-sites.mjs');
 const g=fixture({stock1:{stone:220,wood:0}});playerSetup(g);finish(g);Object.assign(g.tribe(0),{wood:340,stone:0});endowSettlementSites(g,1,0);
 const r=proposeTradeOffer(g,1,0,'stone','wood',16);assert.equal(r.ok,true,JSON.stringify(r));const o=r.offer;const early=JSON.stringify(encodeGame(g));assert.equal(applyEngineReadQuery(g,{kind:'needs-trade'}).offers.length,0);assert.equal(applyEngineCommand(g,{kind:'answer-needs-trade',offerId:o.id,accept:true}).accepted,false);assert.equal(JSON.stringify(encodeGame(g)),early);
 if(process.env.PLAYER_TRADE_BUILT_FIXTURES){const{writeFileSync,mkdirSync}=await import('node:fs');mkdirSync(process.env.PLAYER_TRADE_BUILT_FIXTURES,{recursive:true});const save=structuredClone(encodeGame(g));save.state.paused=true;save.vision=Array.from(save.vision,()=>2);writeFileSync(process.env.PLAYER_TRADE_BUILT_FIXTURES+'/incoming.json',JSON.stringify({save,offerId:o.id,answerAt:o.answerAt,scope:'Controlled finite legacy geometry and initial known sites/vision; no campaign or genuine acquisition claim'}));}
 const privateOffer=proposeTradeOffer(g,2,1,'food','stone',8);assert.equal(privateOffer.ok,true,JSON.stringify(privateOffer));g.state.time=Math.max(o.answerAt,privateOffer.offer.answerAt)+.1;const before=JSON.stringify(encodeGame(g)),v=applyEngineReadQuery(g,{kind:'needs-trade'});assert.equal(v.offers.length,1);assert.equal(v.offers[0].id,o.id);assert.equal(v.offers[0].ownCarriers,null);assert.equal('hall' in v.offers[0],false);assert.equal(JSON.stringify(encodeGame(g)),before);assert.equal(applyEngineCommand(g,{kind:'answer-needs-trade',offerId:privateOffer.offer.id,accept:false}).accepted,false);assert.equal(JSON.stringify(encodeGame(g)),before);
 const accepted=applyEngineCommand(g,{kind:'answer-needs-trade',offerId:o.id,accept:true});assert.equal(accepted.accepted,true,accepted.reason);assert.equal(o.phase,'loading');assert.equal(applyEngineCommand(g,{kind:'answer-needs-trade',offerId:o.id,accept:true}).accepted,false);g.interruptMission(g.state.units.find(u=>u.id===o.carriers[0]));assert.equal(o.phase,'failed');const hidden=applyEngineReadQuery(g,{kind:'needs-trade'}).offers.find(v=>v.id===o.id);assert.equal(hidden.status,'Awaiting caravan');assert.equal(hidden.phase,'loading');assert.equal(hidden.ownCarriers,null);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('expired incoming offers and corrupted quote metadata never create goods or a fake accepted caravan',async()=>{
 const{applyEngineCommand}=await import('../src/game/engineDispatch.ts');const{applyEngineReadQuery}=await import('../src/game/engineReadModels.ts');const{endowSettlementSites}=await import('./helpers/endowed-settlement-sites.mjs');
 const g=fixture({stock1:{stone:220,wood:0}});playerSetup(g);finish(g);g.tribe(0).wood=340;endowSettlementSites(g,1,0);const r=proposeTradeOffer(g,1,0,'stone','wood',16);assert.equal(r.ok,true,JSON.stringify(r));const o=r.offer;g.state.time=o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds;const before=JSON.stringify(encodeGame(g));assert.equal(applyEngineCommand(g,{kind:'answer-needs-trade',offerId:o.id,accept:true}).accepted,false);assert.equal(applyEngineReadQuery(g,{kind:'needs-trade'}).offers[0].status,'Offer expired');assert.equal(JSON.stringify(encodeGame(g)),before);
 for(const quoted of [{giveAmount:0,getAmount:1},{giveAmount:1,getAmount:999},{giveAmount:1,getAmount:1,extra:4}]){const bad=structuredClone(encodeGame(g));bad.state.tradeNeeds.offers.find(v=>v.id===o.id).quoted=quoted;assert.throws(()=>decodeGame(bad));}
 const legacy=structuredClone(encodeGame(g));delete legacy.state.tradeNeeds.offers.find(v=>v.id===o.id).quoted;assert.doesNotThrow(()=>decodeGame(legacy));
});
