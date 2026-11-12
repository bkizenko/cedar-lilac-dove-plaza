import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applyEngineReadQuery,isEngineReadQuery} from '../src/game/engineReadModels.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {enableCombatDoctrine} from '../src/game/combatDoctrine.ts';
test('combat-doctrine read model and its commands: formation pick, guard duty, matchup reasons',()=>{
 assert.ok(isEngineReadQuery({kind:'combat-doctrine'}));assert.ok(isEngineReadQuery({kind:'combat-matchup',attackerId:1,targetId:2}));assert.equal(isEngineReadQuery({kind:'combat-matchup',attackerId:1}),false);
 assert.ok(isEngineDispatchCommand({kind:'set-formation',formation:'wedge'}));assert.equal(isEngineDispatchCommand({kind:'set-formation',formation:'circle'}),false);
 const g=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();
 enableCombatDoctrine(g);
 const on=applyEngineReadQuery(g,{kind:'combat-doctrine'}).combat;assert.equal(on.enabled,true);assert.equal(on.formations.length,4);assert.equal(on.preferred,'line');
 assert.equal(applyEngineCommand(g,{kind:'set-formation',formation:'shieldWall'}).accepted,true);
 assert.equal(applyEngineReadQuery(g,{kind:'combat-doctrine'}).combat.preferred,'shieldWall');
 const m=applyEngineReadQuery(g,{kind:'combat-matchup',attackerId:999999,targetId:999998});assert.equal(m.multiplier,1);
 const w=g.state.units.find(u=>u.team===0&&u.type==='worker');
 assert.equal(applyEngineCommand(g,{kind:'guard-duty',unitId:w.id,duty:'post'}).accepted,false,'gatherers keep their work');
});
