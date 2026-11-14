import test from'node:test';import assert from'node:assert/strict';
import{Game}from'../src/game/sim.ts';import{PRODUCTION_RECIPES}from'../src/game/production.ts';
import{clothingNeed,clothingSeasonAt,clothingMaterialFor}from'../src/game/clothingNeed.ts';
test('season and era pick the cloth, and every step of the chain is an existing recipe',()=>{
 assert.equal(clothingSeasonAt(-5),'cold');assert.equal(clothingSeasonAt(15),'mild');assert.equal(clothingSeasonAt(30),'hot');
 assert.equal(clothingMaterialFor('cold',0),'hide');assert.equal(clothingMaterialFor('cold',1),'wool');assert.equal(clothingMaterialFor('hot',0),'linen');
 const g=new Game();g.reset(7,10);g.enterIsland();
 for(const[t,age]of[[-5,0],[-5,2],[30,0]]){g.tribe(0).age=age;const n=clothingNeed(g,0,t);for(const r of n.chain)assert.ok(PRODUCTION_RECIPES[r],r);}
});
test('residents without a serviceable garment are counted and shrink as they are clothed',()=>{
 const g=new Game();g.reset(7,10);g.enterIsland();g.tribe(0).age=1;const people=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker');assert.ok(people.length>1);
 const a=clothingNeed(g,0,-5);assert.equal(a.without,people.length);assert.equal(a.material,'wool');assert.match(a.summary,/need wool clothing/);
 people[0].garment={item:'woolCoat',condition:1};assert.equal(clothingNeed(g,0,-5).without,people.length-1);
 people[0].garment.condition=0;assert.equal(clothingNeed(g,0,-5).without,people.length,'a worn-out garment does not count');
 for(const u of people)u.garment={item:'woolCoat',condition:1};assert.equal(clothingNeed(g,0,-5).summary,'Everyone is clothed');
});
