import test from 'node:test';import assert from 'node:assert/strict';import {Game}from'../src/game/sim.ts';
import{configureExcavation,commitExcavation}from'../src/game/excavation.ts';
import{advanceGeographicInfluence,geographicInfluenceReady,geographicInfluenceAt,geographicInfluenceSample,geographicInfluenceDiagnostics}from'../src/game/influenceField.ts';
let wall=100000;
function settle(g){for(let i=0;i<10000;i++){advanceGeographicInfluence(g,wall+=17);if(geographicInfluenceReady(g)&&geographicInfluenceDiagnostics(g).pendingJobs===0)return;}throw Error('Influence wave did not finish');}
test('a completed shallow cut changes route cost and revokes pending authority even when every walk bit stays the same',()=>{
 const g=new Game();g.reset(42,1);delete g.state.terrainInfluence;g.enterIsland();g.world.heights.fill(8);g.world.waterHeights=undefined;g.world.waterY=0;g.world.baseWaterY=0;g.state.buildings=[];g.state.units=[];g.state.boats=[];g.state.trails=[];g.state.excavations=[];
 for(const k of['trees','stones','forage','copper','iron'])g.state[k]=[];
 const hall=g.makeBld('townhall',-30,0,0),cut=g.makeBld('trench',0,0,0);cut.excavationDepth=.5;cut.build=.99;g.state.buildings.push(hall,cut);configureExcavation(g,cut);g.rebuildWalk();
 settle(g);const before=geographicInfluenceSample(g,25,0),mask=g.walk.slice(),heightFunction=g.height,baseHeights=g.world.heights,revision=geographicInfluenceDiagnostics(g).cacheBuild;assert.equal(g.terrainRevision(),0);assert.ok(before.routeCostMeters>0);
 cut.build=1;assert.equal(commitExcavation(g,cut),true);g.rebuildWalk();assert.deepEqual(g.walk,mask,'the gentle banks remain equally walkable');assert.equal(g.height,heightFunction);assert.equal(g.world.heights,baseHeights);assert.equal(g.terrainRevision(),1);assert.ok(g.height(0,0)<7.6,'real authoritative ground is lower');
 assert.equal(geographicInfluenceReady(g,0),false,'old route costs cannot supply authority after the terrain edit');assert.equal(geographicInfluenceAt(g,25,0,0),0);const pending=geographicInfluenceDiagnostics(g);assert.equal(pending.ready,false);assert.equal(pending.terrainRevision,1);assert.ok(pending.cacheBuild>revision);
 settle(g);const after=geographicInfluenceSample(g,25,0);assert.ok(after.routeCostMeters>before.routeCostMeters+.1,`${after.routeCostMeters} should exceed ${before.routeCostMeters}`);assert.ok(after.strength<before.strength,'the real descent/ascent or detour spends influence reach');assert.ok(Number.isFinite(after.strength));
});
