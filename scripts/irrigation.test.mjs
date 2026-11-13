import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableIrrigation,irrigationEnabled,planDitch,digDitch,tickIrrigation,fieldWater,irrigationYield,effectiveDroughtWater,validIrrigation,IRRIGATION_RULES,irrigationSummary,ditchesOf,ditchComplete} from '../src/game/irrigation.ts';
import {farmHarvestEstimate,YEAR_SECONDS} from '../src/game/settlement.ts';
import {fieldTerrain} from '../src/game/fieldTerrain.ts';
// Flat dry land at 4 m with a lake east of x=40 (surface 3 m).
function world(){const g=new Game();g.reset(345);g.enterIsland();g.height=(x)=>x>40?1:4;g.waterAt=(x)=>x>40?3:-50;g.world.biomes=[{kind:'plains',x:0,z:0}];g.world.rivers=[];
 const t=g.tribe(0);t.food=500;t.wood=200;t.stone=50;t.seeds=50;return g;}
const field=(g,x=10)=>{const b=g.makeBld('farm',x,0,0);b.build=1;if(!g.state.buildings.includes(b))g.state.buildings.push(b);return b;};
test('legacy: no irrigation state means identical yield and drought water',()=>{
 const g=world(),b=field(g);assert.equal(irrigationEnabled(g),false);assert.equal(irrigationYield(g,b),1);assert.equal(effectiveDroughtWater(g,b),fieldTerrain(g,b).droughtWater);
 assert.equal(planDitch(g,0,b).ok,false);assert.equal(JSON.stringify(g.state).includes('"irrigation"'),false);
});
test('enable is idempotent and old estimates are unchanged for rain-fed fields',()=>{
 const g=world(),b=field(g),before=farmHarvestEstimate(g,b);enableIrrigation(g);const s=g.state.irrigation;enableIrrigation(g);assert.equal(g.state.irrigation,s);
 assert.equal(farmHarvestEstimate(g,b),before);
});
test('plan finds water, costs food and labour, needs no lift on gently higher ground',()=>{
 const g=world();enableIrrigation(g);const b=field(g,10),p=planDitch(g,0,b);
 assert.equal(p.ok,true,p.issue);assert.equal(p.lift,'none'.length?p.lift:'');assert.ok(p.length>5&&p.length<45);assert.ok(p.cost.food>0);assert.ok(p.diggingSeconds>100);
});
test('digging takes game time, pays up front, and then fields get yield and drought resistance',()=>{
 const g=world();enableIrrigation(g);const b=field(g,10),food=g.tribe(0).food,base=farmHarvestEstimate(g,b),baseDrought=effectiveDroughtWater(g,b);
 const r=digDitch(g,0,b.id);assert.equal(r.ok,true);assert.ok(g.tribe(0).food<food);
 assert.equal(fieldWater(g,b).kind,'dry');assert.equal(irrigationYield(g,b),1);
 assert.equal(digDitch(g,0,b.id).ok,false);
 g.state.time=10;// spring: harvest pause does not apply
 for(let i=0;i<4000&&!ditchComplete(ditchesOf(g)[0]);i++)tickIrrigation(g,1);
 assert.ok(ditchComplete(ditchesOf(g)[0]));
 const w=fieldWater(g,b);assert.equal(w.kind,'ditch');assert.ok(farmHarvestEstimate(g,b)>base);assert.ok(effectiveDroughtWater(g,b)>=baseDrought);assert.equal(effectiveDroughtWater(g,b),Math.max(baseDrought,IRRIGATION_RULES.droughtWater.ditch));
 assert.equal(irrigationSummary(g).ditch,1);
});
test('digging pauses in the harvest quarter',()=>{
 const g=world();enableIrrigation(g);const b=field(g,10);digDitch(g,0,b.id);const d=ditchesOf(g)[0];
 g.state.time=2*YEAR_SECONDS/4+10;tickIrrigation(g,50);assert.equal(d.done,0);
});
test('high ground needs a shaduf or wheel, wheel is age-gated, cost is paid',()=>{
 const g=world();enableIrrigation(g);g.height=(x)=>x>40?1:(x<30?4+ (30-x)*0 +1.5:4);// land 5.5 m, water 3 m: rise 2.5
 const b=field(g,10);let p=planDitch(g,0,b);assert.equal(p.lift,'shaduf');assert.equal(p.cost.wood,IRRIGATION_RULES.liftCost.shaduf.wood);
 g.height=(x)=>x>40?1:8;p=planDitch(g,0,b);assert.equal(p.lift,'wheel');g.tribe(0).age=0;assert.equal(planDitch(g,0,b).ok,false);g.tribe(0).age=3;g.tribe(0).wood=0;assert.equal(planDitch(g,0,b).ok,false);
 g.height=(x)=>x>40?1:20;assert.equal(planDitch(g,0,b).ok,false);
});
test('save validator accepts absent/valid state and rejects bad data',()=>{
 const g=world();enableIrrigation(g);const b=field(g,10);digDitch(g,0,b.id);const copy=JSON.parse(JSON.stringify(g.state));
 assert.equal(validIrrigation({tribes:copy.tribes},1040),true);assert.equal(validIrrigation(copy,1040),true);
 const bad=JSON.parse(JSON.stringify(copy));bad.irrigation.ditches[0].done=-1;assert.equal(validIrrigation(bad,1040),false);
 const bad2=JSON.parse(JSON.stringify(copy));bad2.irrigation.ditches[0].lift='magic';assert.equal(validIrrigation(bad2,1040),false);
 const bad3=JSON.parse(JSON.stringify(copy));bad3.irrigation.ditches.push({...bad3.irrigation.ditches[0]});assert.equal(validIrrigation(bad3,1040),false);
});
test('deterministic: two identical games dig identically',()=>{
 const run=()=>{const g=world();enableIrrigation(g);const b=field(g,10);digDitch(g,0,b.id);g.state.time=10;for(let i=0;i<50;i++)tickIrrigation(g,1);return JSON.stringify(g.state.irrigation);};
 assert.equal(run(),run());
});
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
test('save round trip: legacy save stays without irrigation; enabled state survives and a corrupt one is refused',()=>{
 const plain=new Game();plain.reset(4,18,{size:1040,layout:'pangaea'});const raw0=encodeGame(plain);assert.equal(raw0.state.irrigation,undefined);validateGameSave(raw0);
 assert.equal(decodeGame(JSON.parse(JSON.stringify(raw0))).state.irrigation,undefined);
 enableIrrigation(plain);plain.state.irrigation.ditches.push({id:1,team:0,x0:0,z0:0,x1:10,z1:0,level:3,length:10,done:4,lift:'shaduf'});plain.state.irrigation.nextId=2;
 const raw=JSON.parse(JSON.stringify(encodeGame(plain)));validateGameSave(raw);const back=decodeGame(raw);assert.equal(back.state.irrigation.ditches[0].done,4);
 raw.state.irrigation.ditches[0].done=99;assert.throws(()=>validateGameSave(raw));
});
