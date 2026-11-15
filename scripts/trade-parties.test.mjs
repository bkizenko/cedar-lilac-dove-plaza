import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {dispatchTradeExpedition,tickTradeParties,tradeParties,tradePartyPosition,reviewForeignArrivals,TRADE_PARTY_RULES} from '../src/game/tradeParties.ts';
import {seasonSummaryLine} from '../src/game/seasonReports.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(const [team,z] of [[0,-60],[1,60]]){g.state.buildings.push(g.makeBld('townhall',0,z,team));g.spawnUnit('worker',4,z,team);}
 for(let i=0;i<8;i++)g.spawnUnit('worker',6+i,-58,0);
 g.state.buildings.push(g.makeBld('dock',10,-50,0));for(const b of g.state.buildings)b.build=1;
 Object.assign(g.tribe(0),{wood:100,food:100});Object.assign(g.tribe(1),{food:300,stone:80,trust:.5,hostile:false});
 endowSettlementSites(g,0,1);return g;}
test('expedition: goods leave at dispatch, payment returns only after the round trip',()=>{
 const g=fixture(),wood=g.tribe(0).wood;let r=dispatchTradeExpedition(g,1,'land','wood',20,'stone');
 if(!r.accepted)return assert.fail(r.reason);
 assert.equal(g.tribe(0).wood,wood-20);const p=tradeParties(g)[0],stone=g.tribe(0).stone;
 assert.ok(p.travel>10,'travel time proportional to distance');
 for(let t=0;t<p.travel-2;t++)tickTradeParties(g,1);assert.equal(g.tribe(0).stone,stone);assert.equal(p.phase,'outbound');
 let moved=tradePartyPosition(p);assert.ok(moved.z>-60&&moved.z<60);
 for(let t=0;t<p.travel*2+TRADE_PARTY_RULES.tradeSeconds+5&&tradeParties(g).length;t++)tickTradeParties(g,1);
 assert.equal(tradeParties(g).length,0,'removed only after returning');assert.ok(g.tribe(0).stone>stone);
});
test('sea dispatch needs a dock and is faster per distance than land',()=>{
 const g=fixture();g.state.buildings=g.state.buildings.filter(b=>b.type!=='dock');assert.equal(dispatchTradeExpedition(g,1,'sea','wood',5).accepted,false);
 g.state.buildings.push(Object.assign(g.makeBld('dock',10,-50,0),{build:1}));
 const land=dispatchTradeExpedition(g,1,'land','wood',5),sea=dispatchTradeExpedition(g,1,'sea','wood',5);assert.ok(land.accepted&&sea.accepted);
 const [a,b]=tradeParties(g);assert.ok(b.travel<a.travel);
});
test('foreign arrivals are deterministic, walk back to origin before removal, survive save',()=>{
 const run=()=>{const g=fixture();const seen=[];for(let i=0;i<40;i++){g.state.time=i*TRADE_PARTY_RULES.arrivalReviewSeconds;const p=reviewForeignArrivals(g);if(p){seen.push([p.mode,p.team,p.travel]);p.phase='done';g.state.tradeParties=[];}}return seen;};
 const a=run(),b=run();assert.deepEqual(a,b);assert.ok(a.length>0);assert.ok(a.some(x=>x[0]==='sea'));
 const g=fixture();g.state.time=0;let p;for(let i=0;i<60&&!p;i++){g.state.time=i*TRADE_PARTY_RULES.arrivalReviewSeconds;p=reviewForeignArrivals(g);}assert.ok(p);
 g.state.tradeArrivalSlot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds);for(let t=0;t<p.travel+5;t++)tickTradeParties(g,1);assert.equal(p.phase,'trading');
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(g2.state.tradeParties.length,1);
 for(let t=0;t<TRADE_PARTY_RULES.offerSeconds+p.travel/2;t++)tickTradeParties(g,1);assert.equal(p.phase,'returning');assert.equal(tradeParties(g).length,1,'still on the road');
 for(let t=0;t<p.travel+5;t++)tickTradeParties(g,1);assert.equal(tradeParties(g).length,0);
});
test('season summary is one short line of notable changes',()=>{
 const mk=(season,wood,spoiled)=>({season,partial:false,totals:{food:50,wood,stone:0,copper:0,iron:0,weapons:0},stock:{},foodFlow:{eaten:0,spoiled,partial:false}});
 assert.equal(seasonSummaryLine(mk(1,52,0),mk(0,50,0)),'Summer ended: no notable changes.');
 const line=seasonSummaryLine(mk(2,90,14),mk(1,50,0));assert.match(line,/^Autumn ended: logs hauled up to 90, 14 food spoiled\.$/);
});
import {SHIP_CLASSES,bestShipClass,harbourSlots,waterRoute,tradeCapacityLeft,tradeCapacityMax,alongRoute,landCargoLimit} from '../src/game/tradeFleet.ts';
import {planExpedition,tradePartyHeading,validTradePartyState,acceptTradeOffer,openTradeOffers} from '../src/game/tradeParties.ts';
test('ships need a real water route and follow it; no route means no ship',()=>{
 const g=fixture(),plan=planExpedition(g,1,'sea','wood',5);assert.equal(plan.issue,null,plan.issue);assert.ok(plan.route.length>2,'route has water waypoints');
 const r=dispatchTradeExpedition(g,1,'sea','wood',5);assert.ok(r.accepted,r.reason);const p=tradeParties(g)[0];assert.ok(p.route.length>2);
 p.progress=p.travel/2;const mid=tradePartyPosition(p);const straight={x:(p.x0+p.x1)/2,z:(p.z0+p.z1)/2};
 assert.ok(Math.hypot(mid.x-straight.x,mid.z-straight.z)>3||p.route.length<=2,'follows the water, not the straight line');
 const h=tradePartyHeading(p);assert.ok(Number.isFinite(h.dx)&&Number.isFinite(h.dz));
 assert.ok(validTradePartyState(g.state));
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(g2.state.tradeParties[0].route.length,p.route.length);
 // landlocked dock: far from any water
 const g3=fixture();let spot;for(let x=-400;x<=400&&!spot;x+=40)for(let z=-400;z<=400&&!spot;z+=40){if(g3.height(x,z)<=g3.waterAt(x,z)+2)continue;let far=true;for(let a=0;a<32&&far;a++)for(const r of [20,40,60,80])if(g3.height(x+Math.cos(a/5)*r,z+Math.sin(a/5)*r)<g3.waterAt(x,z)+.3)far=false;if(far)spot={x,z};}
 assert.ok(spot,'found an inland point');for(const b of g3.state.buildings)if(b.type==='dock'){b.x=spot.x;b.z=spot.z;}
 assert.match(planExpedition(g3,1,'sea','wood',5).issue,/No water route/);assert.equal(dispatchTradeExpedition(g3,1,'sea','wood',5).accepted,false);
 assert.equal(dispatchTradeExpedition(g3,1,'land','wood',5).accepted,true,'land still works');
});
test('ship class follows age and harbour; cargo is capped by the hull',()=>{
 const g=fixture();assert.equal(bestShipClass(g,0).id,'raft');
 assert.match(planExpedition(g,1,'sea','wood',40).issue,/carries at most 16/);
 g.tribe(0).age=1;assert.ok(['raft','dugout','sailboat'].includes(bestShipClass(g,0).id));
 g.tribe(0).age=3;assert.ok(SHIP_CLASSES.findIndex(c=>c.id===bestShipClass(g,0).id)<=SHIP_CLASSES.findIndex(c=>c.id==='dugout'),'tier-0 landing cannot launch big ships');
 for(const c of SHIP_CLASSES)assert.ok(c.cargo>0&&c.crew>0&&c.speed>0);
 assert.ok(SHIP_CLASSES.every((c,i)=>!i||c.cargo>SHIP_CLASSES[i-1].cargo));
});
test('boat slots come from harbour size and cap simultaneous ships',()=>{
 const g=fixture();assert.equal(harbourSlots(g,0),2);
 g.tribe(0).wood=500;for(let i=0;i<2;i++)assert.ok(dispatchTradeExpedition(g,1,'sea','wood',5).accepted);
 assert.match(planExpedition(g,1,'sea','wood',5).issue,/boat slot/);
});
test('partner trade capacity is finite, shown, and refills slowly',()=>{
 const g=fixture(),max=tradeCapacityMax(g,1);assert.equal(tradeCapacityLeft(g,1),max);
 g.tribe(0).wood=500;g.tribe(0).food=500;g.state.units.length&&0;
 let n=0;while(n<4&&dispatchTradeExpedition(g,1,'land','wood',Math.min(16,Math.floor(tradeCapacityLeft(g,1)))||1).accepted){n++;for(const p of g.state.tradeParties)p.phase='done';g.state.tradeParties=[];}
 assert.ok(tradeCapacityLeft(g,1)<max);
 for(let i=0;i<40;i++){const left=Math.floor(tradeCapacityLeft(g,1));if(left<1)break;g.state.tradeParties=[];dispatchTradeExpedition(g,1,'land','wood',Math.min(left,20));}
 g.state.tradeParties=[];assert.match(planExpedition(g,1,'land','wood',1).issue,/no trade capacity left/);
 const empty=tradeCapacityLeft(g,1);g.state.time+=300;assert.ok(tradeCapacityLeft(g,1)>empty,'regenerates');assert.ok(tradeCapacityLeft(g,1)<max);
 g.state.time+=5000;assert.equal(tradeCapacityLeft(g,1),max);
});
test('land parties carry more with pack goats; crews are provisioned and armed from stores',()=>{
 const g=fixture();const base=landCargoLimit(g);
 g.state.livestock=[1,2].map(i=>({id:900+i,team:0,hp:10,species:'goat',sex:'f'}));assert.equal(landCargoLimit(g),base+24);
 Object.assign(g.tribe(0),{food:200,spears:5,bows:0,blades:0,wood:100});const food=g.tribe(0).food;
 const r=dispatchTradeExpedition(g,1,'land','wood',10);assert.ok(r.accepted,r.reason);const p=tradeParties(g)[0];
 assert.ok(p.provisions>0&&g.tribe(0).food<=food-p.provisions);assert.ok(p.guards>0&&g.tribe(0).spears===5-p.guards);assert.ok(p.crew>=2);
 for(let t=0;t<p.travel*2+TRADE_PARTY_RULES.tradeSeconds+5&&tradeParties(g).length;t++)tickTradeParties(g,1);assert.equal(g.tribe(0).spears,5,'weapons come home');
});
test('bigger harbour tiers add boat slots, trade frequency and better deals',async()=>{
 const {harbourFrequencyBonus,harbourDealBonus}=await import('../src/game/tradeFleet.ts');
 const {arrivalChance}=await import('../src/game/tradeParties.ts');const {ensureNaval}=await import('../src/game/navalPorts.ts');
 const g=fixture();for(const k of ['wood','stone','copper','food'])g.tribe(1)[k]=0;const dock=g.state.buildings.find(b=>b.type==='dock'),base=harbourSlots(g,0),chance0=arrivalChance(g,[1]);
 const n=ensureNaval(g);let rec=n.ports.find(p=>p.dockId===dock.id);if(!rec){rec={dockId:dock.id,team:0,works:{}};n.ports.push(rec);}
 rec.works.breakwater={builtAt:0};const harbour=harbourSlots(g,0);assert.ok(harbour>base,'breakwater adds slots');
 rec.works.slipway={builtAt:0};assert.ok(harbourSlots(g,0)>harbour,'slipway adds more');const yard=harbourSlots(g,0);
 rec.works.drydock={builtAt:0};assert.ok(harbourSlots(g,0)>yard,'drydock adds more');
 assert.ok(arrivalChance(g,[1])>chance0,'more slots, more frequent traders');assert.ok(harbourDealBonus(10)>harbourDealBonus(2));assert.ok(harbourFrequencyBonus(10)>harbourFrequencyBonus(2));
 const plan=planExpedition(g,1,'sea','wood',1);assert.equal(plan.slots,harbourSlots(g,0));assert.equal(plan.slotsFree,harbourSlots(g,0));
});
