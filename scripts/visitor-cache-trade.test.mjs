import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {visitorPrice,visitorTradeIssue,acceptVisitorTrade,visitorAI} from '../src/game/visitors.ts';
import {contactTradeOptions,performContactAction} from '../src/game/encounters.ts';
import {supplyApproach} from '../src/game/campAnchor.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(kind='wood',amount=24){
 const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.waterBodies=[];g.world.waterHeights=undefined;g.world.ecology=undefined;
 g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.campSites=[{team:0,x:0,z:38}];g.state.buildings.push(g.makeBld('townhall',0,38,0),g.makeBld('warehouse',100,38,0),g.makeBld('townhall',200,38,1));
 for(const t of g.state.tribes)Object.assign(t,{hostile:false,food:200,foodLots:{provisions:200},wood:100,stone:80,copper:80,iron:80,age:2});
 g.vision.fill(2);g.rebuildWalk();const stranger=g.spawnUnit('worker',110,38,1),own=g.spawnUnit('worker',109,38,0);const at=supplyApproach(g,stranger,g.state.buildings[1]);
 g.spend(1,{[kind]:amount});Object.assign(stranger,{x:at.x,z:at.z,carry:amount,carryType:kind,carryFood:kind==='food'?'provisions':undefined,visit:{phase:'waiting',wait:0},order:'hold'});Object.assign(own,{x:at.x+1,z:at.z,order:'hold',selected:true});
 return {g,stranger,own,store:g.state.buildings[1]};
}
const stock=g=>g.state.tribes.map(t=>[t.food,t.wood,t.stone,t.copper,t.iron]);
test('an offered remote-cache purchase credits communal stores once, records exact destination and physically returns payment',()=>{
 const {g,stranger,own}=fixture(),id=stranger.id,price=visitorPrice(g,stranger,'food'),food=g.tribe(0).food,wood=g.tribe(0).wood,sellerFood=g.tribe(1).food;
 assert.ok(Math.hypot(stranger.x-g.campOf(0).x,stranger.z-g.campOf(0).z)>100);assert.ok(contactTradeOptions(g,id,own.id).options.some(o=>o.id==='visitor:food'));
 const result=performContactAction(g,'trade',id,own.id,'visitor:food');assert.equal(result.accepted,true);assert.match(result.reason,new RegExp(`Paid ${price} food; received 24 logs in village stores`));
 assert.equal(g.tribe(0).food,food-price);assert.equal(g.tribe(0).wood,wood+24);assert.equal(own.carry,0,'cache purchase does not pretend the speaker carries it');assert.equal(stranger.carry,price);assert.equal(stranger.carryType,'food');assert.equal(g.tribe(1).food,sellerFood,'seller payment is still carried, not credited twice');
 assert.match(g.state.lifeHistory.at(-1).text,/Trade: Paid .*received 24 logs in village stores/);const after=stock(g);assert.equal(acceptVisitorTrade(g,id,'food').accepted,false);assert.deepEqual(stock(g),after);
 const restored=decodeGame(encodeGame(g));assert.match(restored.state.lifeHistory.at(-1).text,/24 logs in village stores/);assert.equal(restored.state.units.find(u=>u.id===id).carry,price);
 for(let i=0;i<2500&&stranger.visit;i++){g.state.time+=.1;g.navBudget=10;visitorAI(g,stranger,.1);}
 assert.equal(stranger.visit,undefined);assert.equal(stranger.id,id);assert.equal(stranger.carry,0);assert.equal(g.tribe(1).food,sellerFood+price);assert.equal(g.tribe(0).wood,wood+24);
});
test('offer and acceptance reject a non-cache meeting even inside the obsolete camp circle, without moving any goods',()=>{
 const {g,stranger,own}=fixture();stranger.x=25;stranger.z=38;own.x=26;own.z=38;const before=stock(g),cargo=stranger.carry;
 assert.match(visitorTradeIssue(g,stranger,'food'),/at a village cache/);const result=acceptVisitorTrade(g,stranger.id,'food');assert.equal(result.accepted,false);assert.match(result.reason,/at a village cache/);assert.deepEqual(stock(g),before);assert.equal(stranger.carry,cargo);assert.equal(stranger.visit.phase,'waiting');assert.ok(!contactTradeOptions(g,stranger.id,own.id).options.some(o=>o.kind==='visitor'));
});
test('changed funds and destroyed cache revalidate with a precise refusal rather than a fake completed trade',()=>{
 const {g,stranger,own,store}=fixture(),price=visitorPrice(g,stranger,'food');g.tribe(0).food=price-1;g.tribe(0).foodLots={provisions:price-1};const before=stock(g);
 let result=performContactAction(g,'trade',stranger.id,own.id,'visitor:food');assert.equal(result.accepted,false);assert.match(result.reason,/Need 1 more food/);assert.deepEqual(stock(g),before);
 g.tribe(0).food=200;g.tribe(0).foodLots={provisions:200};store.hp=0;g.rebuildWalk();const next=stock(g);result=acceptVisitorTrade(g,stranger.id,'food');assert.equal(result.accepted,false);assert.match(result.reason,/at a village cache/);assert.deepEqual(stock(g),next);assert.equal(stranger.carry,24);
});
test('mineral receipts preserve the exact raw resource and age gate, without inventing tool inventory',()=>{
 const {g,stranger}=fixture('copper',8),copper=g.tribe(0).copper,stone=g.tribe(0).stone,price=visitorPrice(g,stranger,'stone');
 g.tribe(0).age=0;const before=stock(g);const forbidden=acceptVisitorTrade(g,stranger.id,'iron');assert.equal(forbidden.accepted,false);assert.match(forbidden.reason,/not adopted this metal/);assert.deepEqual(stock(g),before);g.tribe(0).age=2;
 const result=acceptVisitorTrade(g,stranger.id,'stone');assert.equal(result.accepted,true);assert.match(result.reason,/received 8 copper in village stores/);assert.equal(g.tribe(0).copper,copper+8);assert.equal(g.tribe(0).stone,stone-price);assert.equal(stranger.carry,price);assert.equal(stranger.carryType,'stone');
});
test('a field bundle exchange reports carried purchases and leaves communal inventory unchanged until actual return',()=>{
 const {g,stranger,own}=fixture('wood',3);stranger.visit=undefined;stranger.x=60;own.x=58;stranger.z=own.z=55;own.carry=4;own.carryType='food';own.carryFood='provisions';g.spend(0,{food:4});const before=stock(g);
 const result=performContactAction(g,'trade',stranger.id,own.id,'bundle');assert.equal(result.accepted,true);assert.match(result.reason,/now carries the purchase home; village stores update on delivery/);assert.equal(own.carry,3);assert.equal(own.carryType,'wood');assert.equal(stranger.carry,4);assert.equal(stranger.carryType,'food');assert.deepEqual(stock(g),before);assert.match(g.state.lifeHistory.at(-1).text,/Trade: Exchanged 4 food for 3 logs/);
});
