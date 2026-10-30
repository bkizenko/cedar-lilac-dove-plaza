import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {DIFFICULTIES} from '../src/game/difficulty.ts';
import {foodDemand} from '../src/game/settlement.ts';import {foodSpoilage} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('six difficulties scale real food needs, spoilage and incoming damage; legacy default is neutral',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();const demand=foodDemand(g),spoil=foodSpoilage(g);
 assert.equal(Object.keys(DIFFICULTIES).length,6);
 for(const [id,p] of Object.entries(DIFFICULTIES)){
 g.state.difficulty=id;assert.ok(Math.abs(foodDemand(g)-demand*p.food)<1e-8);assert.ok(Math.abs(foodSpoilage(g)-spoil*p.spoil)<1e-8);
 const b=g.makeBld('hut',0,0,0);const hp=b.hp;g.applyCombatDamage(3,b,10);assert.equal(b.hp,hp-10*p.damage);
 }
 delete g.state.difficulty;assert.equal(foodDemand(g),demand);
});
test('difficulty survives saves without replacing people or terrain; invalid presets are rejected',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();g.state.difficulty='survival';const raw=encodeGame(g),copy=decodeGame(raw);
 assert.equal(copy.state.difficulty,'survival');assert.deepEqual(copy.world.heights,g.world.heights);assert.equal(copy.state.units.length,g.state.units.length);
 raw.state.difficulty='impossible';assert.throws(()=>decodeGame(raw));raw.state.difficulty='toString';assert.throws(()=>decodeGame(raw));
});

test('difficulty changes finite raid bands and recovery intervals while retaining early scouts',async()=>{
 const {seaRaidStrength,finishSeaRaid}=await import('../src/game/raiders.ts');
 const low=seaRaidStrength(80,2,.7,5,.5,false,36,0,.5).count,high=seaRaidStrength(80,2,.7,5,.5,false,36,0,1.6).count;
 assert.ok(high>low);assert.ok(high<=36);assert.ok(seaRaidStrength(8,0,.8,1,.5,false,36,0,1.6).count<=2);
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=g.state.units.filter(u=>u.team===0);g.tribe(0).food=100000;
 const now=()=>{const adults=g.state.units.length,buildings=g.state.buildings.filter(b=>b.team===0&&g.finished(b)).length;g.state.raidT=0;g.state.raidCampaign={active:true,adults,buildings,loss:0};finishSeaRaid(g);return g.state.raidT};
 g.state.difficulty='normal';const normal=now();g.state.difficulty='apocalypse';assert.ok(now()<normal);
});
