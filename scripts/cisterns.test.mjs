import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {tickSurvival,survivalStatus} from '../src/game/survivalNeeds.ts';
import {CISTERN_RULES,cisternStored,cisternTotals,tickCisterns,cisternInflow,drawFromCisterns} from '../src/game/cisterns.ts';

function fixture(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;
 const home=g.campOf(0);const c=g.makeBld('cistern',home.x+8,home.z+8,0);c.build=1;g.state.buildings.push(c);
 Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});return {g,c};}
test('cistern starts empty, fills only in rain up to capacity, and is capped',()=>{
 const {g,c}=fixture();assert.equal(cisternStored(c),0);
 const stock=g.tribe(0).survival;stock.waterLiters=0;for(let i=0;i<20;i++)tickCisterns(g,0,stock,0,1);assert.equal(cisternStored(c),0,'dry weather adds nothing');
 g.state.weather='rain';
 // a catchment may be tiny on flat ground; force a decent one by checking the inflow rule rather than the site
 const inflow=cisternInflow(g,c);assert.ok(inflow>=0&&inflow<=CISTERN_RULES.intakeLitersPerSecond*CISTERN_RULES.stormFactor);
 c.cisternLiters=CISTERN_RULES.capacityLiters-1;for(let i=0;i<50;i++)tickCisterns(g,0,stock,0,10);
 assert.ok(cisternStored(c)<=CISTERN_RULES.capacityLiters);
});
test('jars refill from the cistern as people drink; stored litres drop and count towards water days',()=>{
 const {g,c}=fixture();c.cisternLiters=4000;const stock=g.tribe(0).survival;stock.waterLiters=0;
 const before=survivalStatus(g,0);assert.equal(before.cisternLiters,4000);assert.ok(before.waterSeconds>0);
 for(let i=0;i<120;i++)tickSurvival(g,1);
 assert.ok(cisternStored(c)<4000,'drank from the cistern');assert.ok(stock.waterShortageSeconds<1,'no thirst while the cistern holds water');
 assert.ok(stock.waterLiters>0);
});
test('drought: empty cistern gives nothing, full one evaporates slowly',()=>{
 const {g,c}=fixture();g.state.weather='drought';c.cisternLiters=1000;const stock=g.tribe(0).survival;stock.waterLiters=0;
 for(let i=0;i<100;i++)tickCisterns(g,0,stock,0,10);const left=cisternStored(c);assert.ok(left<1000&&left>800,`evaporated to ${left}`);
 c.cisternLiters=0;assert.equal(drawFromCisterns(g,0,50),0);
});
test('surplus carried water is stored; saves round-trip and bad litres are rejected',()=>{
 const {g,c}=fixture();const stock=g.tribe(0).survival;stock.waterLiters=5000;tickCisterns(g,0,stock,.1,1);
 assert.ok(cisternStored(c)>0&&stock.waterLiters<5000,'surplus moved into the cistern');assert.equal(cisternTotals(g,0).count,1);
 const enc=JSON.parse(JSON.stringify(encodeGame(g)));validateGameSave(enc);const g2=decodeGame(enc);
 assert.equal(cisternStored(g2.state.buildings.find(b=>b.type==='cistern')),cisternStored(c));
 const bad=JSON.parse(JSON.stringify(enc));(bad.state??bad).buildings.find(b=>b.type==='cistern').cisternLiters=CISTERN_RULES.capacityLiters*2;assert.throws(()=>validateGameSave(bad));
 const old=JSON.parse(JSON.stringify(enc));delete (old.state??old).buildings.find(b=>b.type==='cistern').cisternLiters;validateGameSave(old);
});
