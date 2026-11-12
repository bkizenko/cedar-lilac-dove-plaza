import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {penCareDemand,PEN_RULES} from '../src/game/penGeometry.ts';
import {penPastureReport} from '../src/game/penPasture.ts';
import {tickHusbandry} from '../src/game/husbandry.ts';
import {drinkPenWater,herdWaterDemand,penWaterReport,herdWaterAccounting,validPenWaterState,PEN_WATER_RULES} from '../src/game/penWater.ts';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
function animal(species,id,pen){return{id,species,team:0,pen:pen.id,sex:'male',x:pen.x,y:4,z:pen.z,facing:0,vx:0,vz:0,wanderT:100,hp:40,maxHp:40,fly:0,scale:1,born:-1000,tamedAt:0,hunger:5,milk:0,pregnancy:0};}

test('horses use three care, keeper and finite winter feed shares while goat and sheep stay at one',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.wildlife=[];g.state.survivalVersion=undefined;g.world.heights.fill(4);g.state.time=1350;g.state.weather='clear';
 const pen=g.makeBld('pen',22,0,0);pen.w=20;pen.d=10;g.state.buildings=[pen];pen.pasture={condition:1,feed:10,care:1};
 g.state.livestock=['horse','horse','horse','goat','sheep'].map((species,i)=>animal(species,g.id(),pen));
 const report=penPastureReport(g,pen);assert.equal(report.animals,5);assert.equal(report.careDemand,11);assert.equal(report.keepersNeeded,2);assert.equal(report.eligibleCapacity,16);close(report.demandPerSecond,11*PEN_RULES.feedPerAnimalSecond);
 tickHusbandry(g,10);close(pen.pasture.feedConsumed,11*PEN_RULES.feedPerAnimalSecond*10);close(pen.pasture.feed,10-pen.pasture.feedConsumed);close(pen.pasture.grazedFood,0);close(pen.pasture.care,1-11*PEN_RULES.careDecayPerAnimalSecond*10);close(pen.pasture.initialFeed+pen.pasture.feedDelivered-pen.pasture.feedConsumed-pen.pasture.feed,0);
 assert.equal(penCareDemand([{species:'goat'},{species:'sheep'}]),2);
});

test('horse water demand consumes only its actual delivered stock and cannot drink remotely',()=>{
 const pen={id:1,type:'pen',team:0,x:0,z:0,w:10,d:10,hp:100,penWater:{ownerTeam:0,initialLiters:0,liters:.24,deliveredLiters:.24,consumedLiters:0,lostLiters:0}},horse=animal('horse',2,pen),goat=animal('goat',3,pen),stock={waterHerdWithdrawnLiters:.24},tribe={id:0,survival:stock};
 const g={state:{survivalVersion:1,livestock:[horse,goat],buildings:[pen],units:[],tribes:[tribe]},finished:()=>true,tribe:()=>tribe};
 close(herdWaterDemand(g,0),4*PEN_WATER_RULES.litersPerAnimalSecond);close(penWaterReport(g,pen).demand,herdWaterDemand(g,0));
 assert.equal(drinkPenWater(g,pen,horse,10),true);close(pen.penWater.consumedLiters,.18);assert.equal(drinkPenWater(g,pen,goat,10),true);close(pen.penWater.liters,0);close(stock.waterHerdConsumedLiters,.24);close(herdWaterAccounting(g).balanceErrorLiters,0);assert.equal(validPenWaterState(g.state),true);
 assert.equal(drinkPenWater(g,pen,horse,10),false);close(horse.thirstSeconds,10);close(stock.waterHerdConsumedLiters,.24);
 // Declared finite remaining stock is outside this animal's reach, never free water.
 const other={...pen,id:4,penWater:{ownerTeam:0,initialLiters:0,liters:.18,deliveredLiters:.18,consumedLiters:0,lostLiters:0}};horse.x=100;assert.equal(drinkPenWater(g,other,horse,10),false);close(other.penWater.liters,.18);horse.x=0;horse.ledBy=9;assert.equal(drinkPenWater(g,other,horse,10),false);close(other.penWater.liters,.18);
});
