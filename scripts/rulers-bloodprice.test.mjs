import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {ensureRulers,addGrudge,grudgeOf} from '../src/game/rulersRuntime.ts';
import {payBloodPrice,bloodPriceFor} from '../src/game/bloodPrice.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {rulersOf} from '../src/game/rulersState.ts';
const sum=t=>Object.values(foodInventory(t)).reduce((a,b)=>a+b,0);
test('blood-price: real food walks to the grieved house, clears only its grudge, refusal keeps it; nothing minted',()=>{
 const g=new Game();g.reset(123456,10);g.enterIsland();g.state.worldOptions={...(g.state.worldOptions||{}),rulersVersion:1};ensureRulers(g);
 for(let i=0;i<200;i++)g.step(.25);
 assert.equal(payBloodPrice(g,1).ok,false,'no grudge, no price');
 addGrudge(g,1,0,.5,'custody');addGrudge(g,2,0,.3,'claim');
 const price=bloodPriceFor(g,1);assert.ok(price>=4);
 g.tribe(0).food=0;g.tribe(0).foodLots=undefined;assert.equal(payBloodPrice(g,1).ok,false,'cannot pay from empty stores');
 const t=g.tribe(0);t.foodLots={...foodInventory(t),grain:200};t.food=200;
 const before0=sum(g.tribe(0)),before1=sum(g.tribe(1)),units=g.state.units.length;
 const r=payBloodPrice(g,1);assert.ok(r.ok,r.reason);
 const bearer=g.state.units.find(u=>u.bloodPrice);assert.ok(bearer);assert.equal(g.state.units.length,units,'nobody spawned');
 assert.ok(Math.abs(sum(g.tribe(0))-(before0-price))<1e-6,'goods left our pantry');assert.ok(Math.abs(sum(g.tribe(1))-before1)<1,'not delivered yet: no teleport');
 assert.equal(payBloodPrice(g,1).ok,false,'one bearer at a time');
 assert.ok(rulersOf(JSON.parse(JSON.stringify({rulers:g.state.rulers}))),'rulers state valid');
 // the road is cut (bearer cannot reach the hall): the goods come home, nothing lost, grudge kept
 const b=g.state.units.find(u=>u.bloodPrice);b.stuckT=20;for(let i=0;i<400&&g.state.units.some(u=>u.bloodPrice);i++)g.step(.25);
 assert.ok(sum(g.tribe(0))>before0-3&&sum(g.tribe(0))<=before0,'unreached: goods returned to our pantry (only daily eating differs)');assert.ok(Math.abs(sum(g.tribe(1))-before1)<3);assert.ok(grudgeOf(g,1,0)>0);
 // second try: bearer reaches their hall; goods enter their pantry and the grudge is cleared
 const p0=sum(g.tribe(0));assert.ok(payBloodPrice(g,1).ok);const b2=g.state.units.find(u=>u.bloodPrice);
 const h=g.campOf(1);b2.x=h.x;b2.z=h.z;for(let i=0;i<40&&b2.bloodPrice?.phase!=='home'&&g.state.units.some(u=>u.bloodPrice);i++)g.step(.25);
 assert.ok(sum(g.tribe(0))<p0-price+3,'price did not come back to us');
 assert.ok(Math.abs(sum(g.tribe(1))-(before1+price))<3,'goods arrived in their pantry');
 assert.equal(grudgeOf(g,1,0),0,'accepted price clears that grudge');assert.ok(grudgeOf(g,2,0)>0,'another house still remembers');
});
test('blood-price carrier mid-road survives a save round trip (strict validator), old saves without the field load',async()=>{
 const {validateSave}=await import('../src/game/persistence.ts').catch(()=>({}));
 const g=new Game();g.reset(123456,10);g.enterIsland();g.state.worldOptions={...(g.state.worldOptions||{}),rulersVersion:1};ensureRulers(g);
 for(let i=0;i<200;i++)g.step(.25);addGrudge(g,1,0,.4,'claim');const t=g.tribe(0);t.foodLots={...foodInventory(t),grain:100};t.food=100;
 assert.ok(payBloodPrice(g,1).ok);const copy=JSON.parse(JSON.stringify(g.state.units.find(u=>u.bloodPrice)));
 assert.equal(copy.bloodPrice.to,1);assert.equal(copy.bloodPrice.phase,'going');assert.ok(Object.values(copy.bloodPrice.lots).reduce((a,b)=>a+b,0)>=4);
 const old=JSON.parse(JSON.stringify(g.state.units.find(u=>!u.bloodPrice)));assert.equal(old.bloodPrice,undefined);
});
