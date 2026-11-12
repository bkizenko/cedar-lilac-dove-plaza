import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS,WEAPON_IDS,weaponMatchup,weaponDamage,crewEfficiency,fire,wearAfter,canAfford,weaponCatalogView,weaponsOf,weaponSpec,WEAPON_RULES} from '../src/game/weaponFamilies.ts';
import {EQUIPMENT_LOAD_RULES} from '../src/game/equipmentLoadRules.ts';
import {WEAPON_CARGO_KINDS} from '../src/game/weaponCargo.ts';
const allTargets=[{},{armoured:true},{mounted:true},{shieldWall:true},{loose:true},{behindMantlet:true},{formed:true},{armoured:true,mounted:true,shieldWall:true},{structure:'gate'},{structure:'stonewall'},{structure:'palisade'},{structure:'tower'},{structure:'hut'}];
test('catalog is deterministic, finite and JSON round-trips',()=>{
 const a=JSON.stringify(weaponCatalogView(4)),b=JSON.stringify(weaponCatalogView(4));
 assert.equal(a,b);assert.deepEqual(JSON.parse(a),weaponCatalogView(4));
 for(const w of Object.values(WEAPONS)){
  for(const n of [w.damage,w.range,w.rof,w.pierce,w.vsMounted,w.loadUnits,w.durability,w.crew.minimum,w.crew.full])assert.ok(Number.isFinite(n),w.id);
  assert.ok(w.crew.full>=w.crew.minimum&&w.crew.minimum>=1);
  for(const v of Object.values(w.cost))assert.ok(v>=0&&Number.isFinite(v));
  assert.ok(Object.values(w.cost).some(v=>v>0),`${w.id} must cost finite material`);
 }
 assert.deepEqual(JSON.parse(JSON.stringify(WEAPONS)),JSON.parse(JSON.stringify(WEAPONS)));
});
test('wq14 equipment primitives untouched and mapped',()=>{
 assert.deepEqual([...WEAPON_CARGO_KINDS],['spears','bows','blades']);
 for(const w of Object.values(WEAPONS).filter(x=>x.cargoKind))assert.equal(w.loadUnits,EQUIPMENT_LOAD_RULES.weapons[w.cargoKind]);
 assert.deepEqual(Object.values(WEAPONS).filter(w=>w.cargoKind).map(w=>w.cargoKind).sort(),['blades','bows','spears']);
});
test('matchups bounded and never NaN',()=>{
 for(const id of WEAPON_IDS)for(const t of allTargets){
  const m=weaponMatchup(WEAPONS[id],t).multiplier;assert.ok(Number.isFinite(m));
  if(t.structure)assert.ok(m>=WEAPON_RULES.structureFloor&&m<=WEAPON_RULES.structureCeiling);else assert.ok(m>=WEAPON_RULES.floor&&m<=WEAPON_RULES.ceiling,`${id} ${m}`);
 }
});
test('counters: reach vs riders, pierce vs armour, shield wall vs missiles, blunt vs gates',()=>{
 assert.ok(weaponMatchup(WEAPONS.spear,{mounted:true}).multiplier>weaponMatchup(WEAPONS.bladeSword,{mounted:true}).multiplier);
 assert.ok(weaponMatchup(WEAPONS.pike,{mounted:true,formed:true}).multiplier>weaponMatchup(WEAPONS.spear,{mounted:true}).multiplier);
 assert.ok(weaponMatchup(WEAPONS.warPick,{armoured:true}).multiplier>weaponMatchup(WEAPONS.club,{armoured:true}).multiplier);
 assert.ok(weaponMatchup(WEAPONS.bow,{shieldWall:true}).multiplier<weaponMatchup(WEAPONS.bow,{loose:true}).multiplier);
 assert.ok(weaponMatchup(WEAPONS.bow,{behindMantlet:true}).multiplier<1);
 assert.ok(weaponMatchup(WEAPONS.battering_ram,{structure:'gate'}).multiplier>weaponMatchup(WEAPONS.battering_ram,{structure:'stonewall'}).multiplier);
 assert.ok(weaponMatchup(WEAPONS.sapperTools,{structure:'stonewall'}).multiplier>weaponMatchup(WEAPONS.battering_ram,{structure:'stonewall'}).multiplier);
 assert.ok(weaponMatchup(WEAPONS.bow,{structure:'gate'}).multiplier<.1);
 assert.ok(weaponMatchup(WEAPONS.battering_ram,{}).multiplier<1);
 assert.ok(weaponMatchup(WEAPONS.pike,{}).multiplier<1);
});
test('crew must be present; extra hands add nothing',()=>{
 const c=WEAPONS.catapult;
 assert.equal(crewEfficiency(c,c.crew.minimum-1),0);assert.equal(crewEfficiency(c,NaN),0);
 assert.ok(crewEfficiency(c,c.crew.minimum)>0&&crewEfficiency(c,c.crew.minimum)<1);
 assert.equal(crewEfficiency(c,c.crew.full),1);assert.equal(crewEfficiency(c,99),1);
 assert.equal(weaponDamage(c,{structure:'tower'},1),0);
 assert.ok(weaponDamage(c,{structure:'tower'},5)>weaponDamage(c,{structure:'tower'},3));
});
test('ammunition is finite and only consumed',()=>{
 const c=WEAPONS.catapult,stock={stones:7};
 const r=fire(c,stock,5,5);
 assert.equal(r.fired,2);assert.equal(r.stock.stones,1);assert.equal(r.limited,'ammo');assert.equal(stock.stones,7,'input stock not mutated');
 const r2=fire(c,r.stock,5,5);assert.equal(r2.fired,0);assert.equal(r2.stock.stones,1);
 assert.equal(fire(WEAPONS.bow,{arrows:10},3,1).stock.arrows,7);
 assert.equal(fire(WEAPONS.bow,{},3,1).fired,0);
 assert.equal(fire(c,{stones:99},3,1).limited,'crew');
 assert.equal(fire(WEAPONS.spear,{},4).fired,4);
 for(const w of Object.values(WEAPONS)){const out=fire(w,{stones:5,arrows:5,bolts:5,javelins:5},NaN,w.crew.full);assert.equal(out.fired,0);}
});
test('wear is bounded and costs are affordability-checked',()=>{
 const w=WEAPONS.spear;
 assert.ok(wearAfter(w,1,10)<1);assert.equal(wearAfter(w,.01,1000),0);assert.equal(wearAfter(w,1,-5),1);
 assert.ok(wearAfter(w,1,10,true)<wearAfter(w,1,10,false));
 assert.ok(weaponDamage(w,{},1,1)>weaponDamage(w,{},1,.2));assert.equal(weaponDamage(w,{},1,0),0);
 assert.equal(canAfford(WEAPONS.ballista,{wood:40,cordage:14,copper:7}),false);
 assert.equal(canAfford(WEAPONS.ballista,{wood:40,cordage:14,copper:8}),true);
});
test('families and age gating',()=>{
 assert.ok(weaponsOf('melee').length>=4&&weaponsOf('ranged').length>=4&&weaponsOf('siege').length>=5);
 assert.ok(weaponCatalogView(0).every(w=>w.age===0)&&weaponCatalogView(0).length>=2);
 assert.ok(weaponCatalogView(4).length===WEAPON_IDS.length);
 assert.equal(weaponSpec('toString'),undefined);assert.equal(weaponSpec('__proto__'),undefined);
 assert.equal(WEAPONS.battering_ram.crew.minimum,2);
});
