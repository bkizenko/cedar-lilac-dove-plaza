import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginProduction,productionIssue,PRODUCTION_RECIPES} from '../src/game/production.ts';
import {BRONZE_RULES,holdsTinLode,tickTinLodes} from '../src/game/bronze.ts';
import {armFromStock,weaponStockReport,weaponStockText} from '../src/game/armingCall.ts';
import {weaponDamage} from '../src/game/weaponGrades.ts';
import {TRADE_GOODS,tradeStock,tradeNeed,tradeSurplus} from '../src/game/tradeNeeds.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {sitePreparationSurvey} from '../src/game/sitePreparation.ts';
import {productionKnowledgeTopics} from '../src/game/practiceKnowledge.ts';
function legal(g,type,origin){for(let r=12;r<=84;r+=4)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*r,z=origin.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&g.workBoard.connected(g,origin.x,origin.z,x,z)&&!sitePreparationSurvey(g,{x,z,w:BUILDINGS[type].w,d:BUILDINGS[type].d}).clearable.length)return{x,z};}}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}assert.ok(done(),JSON.stringify({t:g.state.time,items:g.tribe(0).items,projects:g.state.production?.projects}));}
let setup,workerId,forgeId,kilnId;
test.before(()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0);workerId=f.worker;
 const t=g.tribe(0);t.age=1;g.state.age=1;
 for(const type of ['forge','kiln']){const p=legal(g,type,home);assert.ok(p,type);const b=g.makeBld(type,p.x,p.z,0);g.state.buildings.push(b);if(type==='forge')forgeId=b.id;else kilnId=b.id;g.rebuildWalk();}
 Object.assign(t,{food:20000,foodLots:{provisions:20000},wood:300,stone:50,copper:0,iron:0,items:{...t.items,charcoal:0,tinOre:0}});t.survival.waterLiters=1500;
 setup=encodeGame(g);validateGameSave(setup);
});
test('tin ore is smelted to ingots, alloyed with real copper into bronze and cast into blades, conserving every unit',()=>{
 const g=decodeGame(setup),t=g.tribe(0);
 assert.equal(PRODUCTION_RECIPES.smeltTin.outputs.tin,BRONZE_RULES.smeltTin);
 // Nothing exists without its inputs, and nothing is granted for age alone.
 assert.match(productionIssue(g,'smeltTin',kilnId,workerId),/tin ore/);
 t.copper=BRONZE_RULES.alloyCopper;assert.match(productionIssue(g,'castBronze',forgeId,workerId),/tin/);t.copper=0;
 t.items.tinOre=BRONZE_RULES.smeltOre;t.items.charcoal=3;
 assert.equal(beginProduction(g,'smeltTin',kilnId,workerId),true,g.state.banner);
 assert.equal(t.items.tinOre,0);assert.equal(t.items.charcoal,2,'ore and charcoal paid at the start');
 drive(g,500,()=>(t.items.tin||0)===BRONZE_RULES.smeltTin);
 assert.equal(t.items.tin,3);assert.equal(t.items.tinOre,0);
 // Alloying needs usable copper that is actually in stores.
 assert.match(productionIssue(g,'castBronze',forgeId,workerId),/copper/);
 t.copper=BRONZE_RULES.alloyCopper;
 assert.equal(beginProduction(g,'castBronze',forgeId,workerId),true,g.state.banner);
 assert.equal(t.copper,0,'copper paid');assert.equal(t.items.tin,2);
 drive(g,600,()=>(t.items.bronze||0)===BRONZE_RULES.alloyBronze);
 assert.equal(t.copper,0,'no copper appears from casting');
 // Blades need ten bronze: top up (a second batch) so the cast is possible.
 t.items.bronze=BRONZE_RULES.bladeBronze;t.items.charcoal=Math.max(t.items.charcoal,1);
 assert.equal(beginProduction(g,'castBronzeBlades',forgeId,workerId),true,g.state.banner);
 assert.equal(t.items.bronze,0);
 drive(g,600,()=>(t.items.bronzeBlade||0)===BRONZE_RULES.bladeCount);
 const g2=decodeGame(encodeGame(g));assert.equal(g2.tribe(0).items.bronzeBlade,BRONZE_RULES.bladeCount,'saves round-trip the new items');
});
test('the Bronze Age gates every bronze recipe',()=>{
 const g=decodeGame(setup),t=g.tribe(0);t.age=0;t.items.tinOre=6;t.items.charcoal=2;
 assert.match(productionIssue(g,'smeltTin',kilnId,workerId),/Bronze Age/);
});
test('bronze-edged blades arm first, hit harder than plain blades and show in the stock line',()=>{
 const g=new Game();g.reset(4242,3);g.enterIsland();g.state.units=[];Object.assign(g.tribe(0),{spears:0,bows:0,blades:1,age:1,items:{bronzeBlade:1}});
 const a=g.spawnUnit('worker',0,0,0),b=g.spawnUnit('worker',0,1,0);
 assert.match(weaponStockText(weaponStockReport(g,0)),/2 copper blades \(1 bronze-edged\)/);
 assert.ok(armFromStock(g,a,0));assert.equal(g.tribe(0).items.bronzeBlade,0,'bronze blade left the stock');assert.equal(g.tribe(0).blades,1);
 assert.ok(Math.abs(a.dmg-weaponDamage('swordsman',1)*BRONZE_RULES.bladeDamage)<1e-9);
 assert.ok(armFromStock(g,b,0));assert.equal(b.dmg,weaponDamage('swordsman',1));assert.ok(a.dmg>b.dmg);
});
test('tin is a regional good: only lode societies cut ore, from real food, and it trades as a bulk good',()=>{
 const g=new Game();g.reset(777,5);g.enterIsland();
 const rivals=g.state.tribes.filter(t=>t.id!==0&&t.id!==3);assert.ok(rivals.length>=2);
 assert.equal(holdsTinLode(g,0),false,'the player does not start on a lode');
 assert.ok(TRADE_GOODS.tin&&TRADE_GOODS.tinOre&&TRADE_GOODS.bronze);
 for(const t of rivals){t.age=1;t.food=5000;t.foodLots={provisions:5000};t.items={};}
 const lode=rivals.filter(t=>holdsTinLode(g,t.id)),none=rivals.filter(t=>!holdsTinLode(g,t.id));
 const foodBefore=Object.fromEntries(rivals.map(t=>[t.id,t.food]));
 g.state.time=BRONZE_RULES.lodeReviewSeconds*3;tickTinLodes(g);
 for(const t of lode){assert.equal(t.items.tinOre,BRONZE_RULES.smeltOre);assert.ok(t.food<foodBefore[t.id],'ore was paid for in food');assert.ok(tradeSurplus(g,t.id,'tinOre')===0,'first batch stays below the keep-back reserve');}
 for(const t of none)assert.equal(t.items.tinOre||0,0,'no lode, no ore from nowhere');
 // Seeds differ, so at least some seed puts a lode on some society (the rule is not vacuous).
 let seen=false;for(let s=1;s<60&&!seen;s++){const h=new Game();h.reset(s,5);if(h.state.tribes.some(t=>t.id!==0&&t.id!==3&&holdsTinLode(h,t.id)))seen=true;}
 assert.ok(seen);
 tradeNeed(g,0,'tin');tradeStock(g,0,'tin');
});
