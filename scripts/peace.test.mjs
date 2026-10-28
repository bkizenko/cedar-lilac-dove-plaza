import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {settlePeace,tickPeace,tributeJourneyAI,rejectPeace,releasePuppet,freePeople} from '../src/game/peace.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.vision.fill(2);g.tribe(1).hostile=true;g.state.contacts=[1,2];for(let i=0;i<60;i++)g.spawnUnit('spearman',g.campOf(0).x,g.campOf(0).z,0);return g;}
test('weaker tribes offer peace, rejection has cooldown, offers persist and expire',()=>{const g=fixture();tickPeace(g);assert.ok(g.tribe(1).peaceOffer);const r=decodeGame(encodeGame(g));assert.deepEqual(r.tribe(1).peaceOffer,g.tribe(1).peaceOffer);rejectPeace(g,1);tickPeace(g);assert.equal(g.tribe(1).peaceOffer,undefined);g.state.time+=301;tickPeace(g);assert.ok(g.tribe(1).peaceOffer);g.state.time+=181;tickPeace(g);assert.equal(g.tribe(1).peaceOffer,undefined);});

function deliveryFixture(){
 const g=fixture();g.world.heights.fill(4);
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',60,38,1)];
 g.state.units=g.state.units.filter(u=>u.team===0);g.spawnUnit('worker',65,50,1);g.rebuildWalk();return g;
}
function journey(g){for(let i=0;i<4000&&g.state.units.some(u=>u.tributeJourney);i++){g.navBudget=10;for(const u of g.state.units)if(u.tributeJourney)tributeJourneyAI(g,u,.1);}}
test('tribute moves in finite cargo, retains arrears, saves mid-journey and ends after six deliveries',()=>{
 let g=deliveryFixture();assert.equal(settlePeace(g,1,'tribute'),true);g.tribe(1).wood=5;
 const before=g.tribe(0).wood;tickPeace(g);assert.equal(g.tribe(0).wood,before);assert.equal(g.tribe(1).tribute.owed,20);
 const u=g.state.units.find(u=>u.tributeJourney);
 for(let i=0;i<1000&&u.tributeJourney.phase==='pickup';i++){g.navBudget=10;tributeJourneyAI(g,u,.1);}
 assert.equal(u.carry,5);assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(0).wood,before);
 g=decodeGame(encodeGame(g));g.world.heights.fill(4);g.rebuildWalk();journey(g);
 assert.equal(g.tribe(0).wood,before+5);assert.equal(g.tribe(1).tribute.owed,15);
 g.tribe(1).wood=115;tickPeace(g);journey(g);
 for(let i=0;i<5;i++){g.state.time+=120;tickPeace(g);journey(g);}
 tickPeace(g);assert.equal(g.tribe(0).wood,before+120);assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(1).tribute,undefined);
});
test('puppet independence cancels a loaded payment without magically refunding cargo',()=>{
 const g=deliveryFixture();assert.equal(settlePeace(g,1,'puppet'),true);g.tribe(1).wood=30;tickPeace(g);
 const u=g.state.units.find(u=>u.tributeJourney),before=g.tribe(0).wood;
 for(let i=0;i<1000&&u.tributeJourney.phase==='pickup';i++){g.navBudget=10;tributeJourneyAI(g,u,.1);}
 assert.equal(g.tribe(1).wood,20);assert.equal(u.carry,10);releasePuppet(g,1);tributeJourneyAI(g,u,.1);
 assert.equal(u.tributeJourney,undefined);assert.equal(u.order,'return');assert.equal(u.carry,10);assert.equal(g.tribe(0).wood,before);
});
test('an intercepted tribute shipment never counts as delivered',()=>{
 const g=deliveryFixture();settlePeace(g,1,'tribute');g.tribe(1).wood=40;tickPeace(g);
 const u=g.state.units.find(u=>u.tributeJourney),before=g.tribe(0).wood;
 for(let i=0;i<1000&&u.tributeJourney.phase==='pickup';i++){g.navBudget=10;tributeJourneyAI(g,u,.1);}
 u.hp=0;tickPeace(g);assert.equal(g.tribe(0).wood,before);assert.equal(g.tribe(1).tribute.owed,20);assert.equal(g.tribe(1).tribute.paid,0);
});
test('annexation transfers existing assets and population without destroying or duplicating them',()=>{const g=fixture(),ids=g.state.units.filter(u=>u.team===1).map(u=>u.id),total=g.state.units.length,wood=g.tribe(0).wood+g.tribe(1).wood;assert.equal(settlePeace(g,1,'annexation'),true);assert.equal(g.state.units.length,total);assert.ok(ids.every(id=>g.state.units.find(u=>u.id===id).team===0));assert.equal(g.state.buildings.some(b=>b.team===1),false);assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(1).alive,false);assert.equal(decodeGame(encodeGame(g)).tribe(1).peaceTerm,'annexation');});
test('slavery terms transfer two adults in place, preserve identity, and allow emancipation',()=>{const g=fixture();for(let i=0;i<20;i++)g.state.buildings.push(g.makeBld('hut',10+i*10,20,0));for(let i=0;i<3;i++)g.spawnUnit('worker',g.campOf(1).x,g.campOf(1).z,1);g.interactionSpot=()=>({x:0,z:0});const total=g.state.units.length;assert.equal(settlePeace(g,1,'forcedLabor'),true);const adults=g.state.units.filter(u=>u.enslavedFrom===1);assert.equal(adults.length,2);assert.equal(g.state.units.length,total);assert.ok(adults.every(u=>u.team===0&&u.order==='return'));const r=decodeGame(encodeGame(g));assert.equal(r.state.units.filter(u=>u.enslavedFrom===1).length,2);freePeople(g,1);assert.equal(g.state.units.some(u=>u.enslavedFrom===1),false);});
test('unearned annexation and malformed treaty saves are rejected',()=>{const g=fixture();g.state.units=g.state.units.filter(u=>u.team!==0);assert.equal(settlePeace(g,1,'annexation'),false);assert.equal(g.tribe(1).hostile,true);const raw=encodeGame(g);raw.state.tribes[1].tribute={amount:-1,remaining:-2,next:0,owed:-1,paid:0};assert.throws(()=>decodeGame(raw));});


test('no route means no departure or phantom resource transfer',()=>{
 const g=deliveryFixture();settlePeace(g,1,'tribute');const before=g.tribe(1).wood;
 g.interactionSpot=()=>null;tickPeace(g);
 assert.equal(g.tribe(1).wood,before);assert.equal(g.state.units.some(u=>u.tributeJourney),false);assert.equal(g.tribe(1).tribute.owed,20);
});
test('direct orders cancel a courier mission and preserve carried resources and debt',()=>{
 const g=deliveryFixture();settlePeace(g,1,'tribute');tickPeace(g);const u=g.state.units.find(u=>u.tributeJourney);
 for(let i=0;i<1000&&u.tributeJourney.phase==='pickup';i++){g.navBudget=10;g.workerAI(u,.1);}
 const carried=u.carry;assert.ok(carried>0);g.interruptMission(u);
 assert.equal(u.tributeJourney,undefined);assert.equal(u.carry,carried);assert.equal(g.tribe(1).tribute.owed,20);
});
test('a forged tribute mission cannot claim more cargo than its carrier holds',()=>{
 const g=deliveryFixture(),raw=encodeGame(g),u=raw.state.units.find(u=>u.team===1);
 u.tributeJourney={phase:'deliver',amount:20};u.carry=1;u.carryType='wood';assert.throws(()=>decodeGame(raw));
});
