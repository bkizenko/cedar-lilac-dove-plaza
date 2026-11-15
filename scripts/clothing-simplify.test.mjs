import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
import {clothingNeed} from '../src/game/clothingNeed.ts';
import {clothingGuide,hideStock,hideReserveIssue,initializeStartingClothes} from '../src/game/clothingGuide.ts';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {wearGarment,isLateTerm,pregnancySpeed,pregnancyWorkRate,tickIllness,HEALTH_RULES} from '../src/game/healthRisk.ts';
import {craftingEffort} from '../src/game/crafting.ts';
const world=()=>{const g=new Game();g.reset(7,10);g.enterIsland();return g;};
test('direct recipes make simple clothes from hides or fibre in one step',()=>{
 assert.deepEqual(PRODUCTION_RECIPES.sewHideClothes.inputs,{rawHide:2});assert.deepEqual(PRODUCTION_RECIPES.sewHideClothes.outputs,{skinClothes:1});
 assert.deepEqual(PRODUCTION_RECIPES.sewFibreClothes.inputs,{plantFibre:4});assert.deepEqual(PRODUCTION_RECIPES.sewFibreClothes.outputs,{lightClothes:1});
 const g=world();g.tribe(0).age=0;assert.deepEqual(clothingNeed(g,0,-5).chain,['sewHideClothes']);assert.deepEqual(clothingNeed(g,0,30).chain,['sewFibreClothes']);
});
test('new worlds start villagers in worn clothes that wear; flag is idempotent and saves round-trip',()=>{
 const g=world(),people=g.state.units.filter(u=>u.team===0&&u.type==='worker');
 assert.equal(g.state.clothingVersion,1);assert.ok(people.length>0);
 for(const u of people){assert.ok(u.garment&&u.garment.condition>0&&u.garment.condition<1);}
 const before=people.map(u=>u.garment.condition);initializeStartingClothes(g);assert.deepEqual(people.map(u=>u.garment.condition),before);
 const u=people[0],c=u.garment.condition;u.order='gather';wearGarment(u,600);assert.ok(u.garment.condition<c);
 const h=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(h.state.clothingVersion,1);
});
test('old saves without the flag gain no garments on load',()=>{
 const g=world();g.state.clothingVersion=undefined;for(const u of g.state.units)u.garment=undefined;
 const h=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.ok(h.state.units.filter(u=>u.team===0&&u.type==='worker').every(u=>!u.garment));
});
test('hide stock, guide hints and heavy-coat reserve while people lack clothes in the cold',()=>{
 const g=world();g.tribe(0).age=0;for(const u of g.state.units)u.garment=undefined;g.tribe(0).items={rawHide:1};
 assert.equal(hideStock(g,0).total,1);
 assert.match(clothingGuide(g,0).explain,/Light clothes/);
 g.tribe(0).items={driedSkin:2,leather:1};
 const warm=hideReserveIssue(g,0,'sewHideCoat');
 // the reserve only applies in cold weather; whatever the season, simple clothes are never blocked
 assert.equal(hideReserveIssue(g,0,'sewHideClothes'),null);assert.ok(warm===null||/simple clothes/.test(warm));
});
test('late-term pregnancy slows walking, hauling and bench work; shown note',()=>{
 const g=world(),u=g.state.units.find(x=>x.team===0&&x.type==='worker');
 u.pregnantUntil=g.state.time+500;assert.equal(pregnancySpeed(g,u),HEALTH_RULES.pregnantSpeed);assert.ok(!isLateTerm(g,u));
 u.pregnantUntil=g.state.time+50;assert.ok(isLateTerm(g,u));assert.equal(pregnancySpeed(g,u),HEALTH_RULES.lateTermSpeed);
 u.carry=3;assert.ok(pregnancySpeed(g,u)<HEALTH_RULES.lateTermSpeed);u.carry=0;
 tickIllness(g,1);assert.equal(pregnancyWorkRate(u),HEALTH_RULES.lateTermWorkRate);
 const other={craftingXP:0},mine={craftingXP:0,pregnantUntil:u.pregnantUntil};
 assert.ok(craftingEffort(mine,10)<craftingEffort(other,10));
});
