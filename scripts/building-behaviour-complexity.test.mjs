import test from 'node:test';import assert from 'node:assert/strict';
import {BUILD_TIME,BUILDINGS} from '../src/game/constants.ts';
import {BUILDING_COMPLEXITY,COMPLEXITY_BANDS} from '../src/game/buildingComplexity.ts';
const EXEMPT=new Set(['townhall','house']);// the hall starts built; the timber home is priced by housingRules
test('every building with a build time has a complexity tier, and nothing in the table is unknown',()=>{
 for(const t of Object.keys(BUILD_TIME)){if(EXEMPT.has(t))continue;assert.ok(BUILDING_COMPLEXITY[t],`${t} needs a complexity tier`);}
 for(const t of Object.keys(BUILDING_COMPLEXITY))assert.ok(BUILDINGS[t],`${t} is not a building`);
});
// A snare is a set wild trap (3 s, 3 wood, 8d5e394f), deliberately quicker than any built workplace band.
const TRAPS=new Set(['snare']);
test('each build time sits inside its tier band',()=>{
 for(const [t,tier] of Object.entries(BUILDING_COMPLEXITY)){if(TRAPS.has(t)){assert.ok(BUILD_TIME[t]<COMPLEXITY_BANDS[1][0],`${t} stays quicker than any workplace`);continue;}const [lo,hi]=COMPLEXITY_BANDS[tier],s=BUILD_TIME[t];assert.ok(s>=lo&&s<=hi,`${t}: ${s}s outside tier ${tier} band ${lo}-${hi}`);}
});
test('bands are ordered and never overlap, so a higher tier always takes longer',()=>{
 const b=Object.values(COMPLEXITY_BANDS);for(let i=1;i<b.length;i++)assert.ok(b[i][0]>b[i-1][1]);
 assert.ok(BUILD_TIME.hut<BUILD_TIME.workshop&&BUILD_TIME.workshop<BUILD_TIME.kiln&&BUILD_TIME.kiln<BUILD_TIME.temple&&BUILD_TIME.temple<BUILD_TIME.aqueduct);
});
