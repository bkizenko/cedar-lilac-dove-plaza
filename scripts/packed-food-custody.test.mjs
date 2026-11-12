import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKED_FOOD_RULES,planPackedFood,packedFoodUnits,packedFoodNourishment,consumePackedFood,withdrawPackedFood,transferPackedFood,resetPackedFoodUsage,validPackedFoodCustody} from '../src/game/packedFoodCustody.ts';
// Kernel policy, including the pending curd adapter's actual2/1 factors. Live
// integration must inject the merged FoodKind/FOOD_NOURISHMENT catalogue.
const catalogue={kinds:['provisions','bread','freshCurd','whey','fish','grain'],nourishment:{bread:1.2,freshCurd:2,whey:1},edible:k=>k!=='fish'&&k!=='grain'};
const origin={team:1,anchorKind:'building',buildingId:7,x:4,z:9,loadedAt:20};
const bounds={time:100,worldHalf:520,teamCount:4,nextId:500};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const pack=()=>{const foodCustody=planPackedFood({bread:2,freshCurd:2,whey:2},4.2,origin,catalogue);return{food:foodCustody.lots.reduce((n,l)=>n+l.units,0),foodUsed:0,foodCustody};};
const byKind=lots=>Object.fromEntries(catalogue.kinds.map(k=>[k,lots.filter(l=>l.kind===k).reduce((n,l)=>n+l.units,0)]));

test('typed planning preserves bread/curd/whey identity, physical volume and source; never mutates stock',()=>{
 const stock={bread:2,freshCurd:2,whey:2},before=JSON.stringify(stock),foodCustody=planPackedFood(stock,4.2,origin,catalogue),p={food:foodCustody.lots.reduce((n,l)=>n+l.units,0),foodUsed:0,foodCustody};
 near(packedFoodUnits(p),3);near(packedFoodNourishment(p,catalogue),4.2);
 for(const l of p.foodCustody.lots){near(l.units,1);assert.deepEqual(l.origin,origin);assert.notEqual(l.origin,origin);}
 assert.equal(JSON.stringify(stock),before);assert.equal(validPackedFoodCustody(p.foodCustody,p.food,catalogue,bounds),true);
});
test('actual consumed units plus original-kind return equal paid units and nourishment, without generic retyping',()=>{
 const p=pack(),paid=structuredClone(p.foodCustody.lots),eaten=consumePackedFood(p,1.4,catalogue);
 near(eaten.units,1);near(eaten.nourishment,1.4);near(p.foodUsed,1);near(p.food,2);near(packedFoodNourishment(p,catalogue),2.8);
 const returned=withdrawPackedFood(p,p.food,catalogue);near(returned.units,2);near(returned.nourishment,2.8);near(p.food,0);
 const before=byKind(paid),used=byKind(eaten.lots),back=byKind(returned.lots);
 for(const k of catalogue.kinds)near(before[k],used[k]+back[k]);
 near(eaten.nourishment+returned.nourishment,4.2);assert.equal(returned.legacyUnits,0);assert.equal(returned.lots.some(l=>l.kind==='provisions'),false);
 assert.equal(withdrawPackedFood(p,0,catalogue).units,0,'second return holds nothing');
});
test('legacy scalar saves remain explicit unknown custody through consumption and return',()=>{
 const p=JSON.parse('{"food":4,"foodUsed":1}'),eaten=consumePackedFood(p,1,catalogue);
 assert.equal(p.foodCustody,undefined);assert.equal(eaten.legacyUnits,1);assert.deepEqual(eaten.lots,[]);
 const back=withdrawPackedFood(p,p.food,catalogue);assert.equal(back.legacyUnits,3);assert.deepEqual(back.lots,[]);assert.equal(p.foodUsed,2);
});
test('mixed legacy and typed transfers preserve unknown bucket without assigning an invented kind',()=>{
 const from=pack(),to={food:4,foodUsed:1},before=packedFoodNourishment(from,catalogue)+packedFoodNourishment(to,catalogue);
 const moved=transferPackedFood(from,to,1,catalogue);assert.equal(moved.accepted,true);near(to.foodCustody.legacyUnits,4);near(to.food,5);near(from.food,2);
 near(packedFoodNourishment(from,catalogue)+packedFoodNourishment(to,catalogue),before);assert.equal(to.foodUsed,1);
 const legacy={food:2,foodUsed:0};transferPackedFood(legacy,from,1,catalogue);near(from.foodCustody.legacyUnits,1);assert.equal(legacy.foodCustody,undefined);
});
test('real source origins remain separate across crew transfers; only identical kind and origin merge',()=>{
 const from=pack(),to=pack();for(const lot of from.foodCustody.lots)lot.origin={...origin,buildingId:8,x:20};
 assert.equal(transferPackedFood(from,to,1,catalogue).accepted,true);assert.equal(to.foodCustody.lots.length,6);
 const again=pack();for(const lot of again.foodCustody.lots)lot.origin={...origin,buildingId:8,x:20};transferPackedFood(again,to,1,catalogue);assert.equal(to.foodCustody.lots.length,6);
 assert.equal(validPackedFoodCustody(to.foodCustody,to.food,catalogue,bounds),true);
});
test('physical capacity and lot-count overflow reject atomically, never trim identity or move a source parcel',()=>{
 const source=pack(),full={food:99,foodUsed:0},before=JSON.stringify([source,full]);assert.equal(transferPackedFood(source,full,2,catalogue).accepted,false);assert.equal(JSON.stringify([source,full]),before);
 const crowded={food:6.4,foodUsed:0,foodCustody:{version:1,legacyUnits:0,lots:Array.from({length:PACKED_FOOD_RULES.maximumLots},(_,i)=>({kind:'bread',units:.1,origin:{...origin,loadedAt:i}}))}};
 const other={food:1,foodUsed:0,foodCustody:{version:1,legacyUnits:0,lots:[{kind:'bread',units:1,origin:{...origin,buildingId:12,loadedAt:90}}]}};
 const frozen=JSON.stringify([other,crowded]);assert.equal(transferPackedFood(other,crowded,1,catalogue).accepted,false);assert.equal(JSON.stringify([other,crowded]),frozen);
 assert.equal(planPackedFood({whey:20},10,origin,catalogue,5),null,'capacity refusal does not replace identity with a generic calorie cap');
});
test('strict custody validation rejects mismatched physical quantities, forged kinds and origin identity/time/bounds',()=>{
 const p=pack();for(const change of [v=>v.lots[0].units=-1,v=>v.lots[0].kind='inventedFood',v=>v.lots[0].origin.loadedAt=101,v=>v.lots[0].origin.buildingId=500,v=>v.lots[0].origin.team=4,v=>v.lots[0].origin.x=521,v=>v.lots.push(structuredClone(v.lots[0])),v=>v.legacyUnits=1,v=>v.extra=1]){
  const v=structuredClone(p.foodCustody);change(v);assert.equal(validPackedFoodCustody(v,p.food,catalogue,bounds),false);
 }
 assert.equal(validPackedFoodCustody(JSON.parse(JSON.stringify(p.foodCustody)),p.food,catalogue,bounds),true);
});
test('mission usage handoff resets physical counter without rewriting held food or source provenance',()=>{
 const p=pack();consumePackedFood(p,1.4,catalogue);const custody=JSON.stringify(p.foodCustody),remaining=p.food;near(resetPackedFoodUsage(p),1);assert.equal(p.foodUsed,0);assert.equal(JSON.stringify(p.foodCustody),custody);near(p.food,remaining);
});
test('ready-ration policy excludes raw emergency grains/fish without losing their original stock',()=>{
 const stock={grain:100,fish:100,bread:2},original=JSON.stringify(stock),v=planPackedFood(stock,1.2,origin,catalogue);
 assert.deepEqual(v.lots.map(l=>l.kind),['bread']);near(v.lots[0].units,1);assert.equal(JSON.stringify(stock),original);
 assert.equal(planPackedFood({grain:100,fish:100},1,origin,catalogue),null);
});
