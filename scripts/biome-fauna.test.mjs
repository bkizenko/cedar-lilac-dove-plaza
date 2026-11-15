import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeBiomeFauna,BIOME_FAUNA_RULES} from '../src/game/biomeFauna.ts';
function world(h){let id=100;return {state:{seed:7,time:0,wildlife:[]},world:{size:500,camps:[{team:0,x:0,z:0}],biomes:[]},height:(x,z)=>typeof h==='function'?h(x,z):h,waterAt:()=>0,walkable:()=>true,id:()=>id++};}
test('mountain terrain gets goat herds, valleys get deer/cattle/horse/boar, once and deterministically',()=>{
 const hi=world(12);hi.world.ecology=undefined;initializeBiomeFauna(hi);
 assert.equal(hi.state.faunaVersion,1);
 assert.ok(hi.state.wildlife.length>0&&hi.state.wildlife.every(a=>(a.species==='goat'||a.species==='donkey')&&a.y>=BIOME_FAUNA_RULES.mountain.minHeight&&a.hp===a.maxHp));
 const snap=structuredClone(hi.state.wildlife);initializeBiomeFauna(hi);assert.deepEqual(hi.state.wildlife,snap);
 const lo=world(2);initializeBiomeFauna(lo);const kinds=new Set(lo.state.wildlife.map(a=>a.species));
 for(const k of ['deer','cattle','horse','boar'])assert.ok(kinds.has(k),k);
 const again=world(2);initializeBiomeFauna(again);assert.deepEqual(lo.state.wildlife,again.state.wildlife);
});
