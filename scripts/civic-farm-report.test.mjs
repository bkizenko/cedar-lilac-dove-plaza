import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {civicPrestige} from '../src/game/civicPrestige.ts';
import {fieldProductionReport} from '../src/game/productionReport.ts';

test('landmarks earn condition-weighted prestige with diminishing repeats',()=>{
 const g=new Game();
 g.reset(42,10);g.enterIsland();
 const landmark=type=>g.makeBld(type,12,35,0);
 const temple=landmark('temple'),damaged=landmark('temple'),planned=landmark('cairn');
 damaged.hp=damaged.maxHp/2;
 planned.build=0;
 g.state.buildings=[landmark('hut'),temple,damaged,planned];
 const score=civicPrestige(g);
 assert.equal(score.total,57);
 assert.equal(score.landmarks[0].count,2);
 assert.ok(score.landmarks[0].points<45+22.5);
 temple.hp=0;
 assert.equal(civicPrestige(g).total,23);
});

test('field forecast scales work and harvest by actual footprint',()=>{
 const g=new Game();
 g.reset(42,10);g.enterIsland();
 const field=g.makeBld('farm',24,32,0);
 const small=fieldProductionReport(g,field);
 assert.equal(small.areaSquareMetres,field.w*field.d);
 assert.equal(small.sowSeconds,45);
 assert.equal(small.tendSeconds,55);
 const big=fieldProductionReport(g,{...field,w:field.w*2});
 assert.equal(big.areaSquareMetres,small.areaSquareMetres*2);
 assert.equal(big.sowSeconds,small.sowSeconds*2);
 assert.equal(big.tendSeconds,small.tendSeconds*2);
 assert.ok(big.harvestUnitsPerSquareMetre>0);
});
