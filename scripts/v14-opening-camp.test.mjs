import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {openingCampSurvey,OPENING_RESIDENT_OFFSETS} from '../src/game/openingWater.ts';
import {waterCollectionIssue} from '../src/game/survivalNeeds.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
const hash=w=>createHash('sha256').update(JSON.stringify(w,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)).digest('hex');
const survey=height=>openingCampSurvey({height,water:()=>0},{x:0,z:0});
test('opening survey accepts gentle neutral/convex ground and rejects real depressions, steep slopes and submerged ground',()=>{
 assert.equal(survey((x,z)=>10+.1*x).valid,true);
 assert.equal(survey((x,z)=>10-.001*(x*x+z*z)).valid,true);
 const pit=survey((x,z)=>10-.5*Math.exp(-(x*x+z*z)/2));assert.equal(pit.valid,false);assert.ok(pit.maximumClosedDepressionMetres>.45);
 const valley=survey((x,z)=>10+.03*z*z);assert.equal(valley.valid,false);assert.ok(valley.maximumMeanRiseAt4Metres>.22);
 assert.equal(survey((x,z)=>10+.3*x).valid,false);
 assert.equal(survey(()=>-.5).valid,false);
 // The resident at (5,-3) is independently surveyed, not just the camp anchor.
 const residentPit=survey((x,z)=>10-.5*Math.exp(-((x-5)**2+(z+3)**2)/2));assert.equal(residentPit.valid,false);assert.ok(residentPit.maximumClosedDepressionMetres>.45);
});
for(const [seed,size,layout]of [[42,1040,'continents'],[42,1040,'pangaea'],[42,1040,'archipelago'],[1,1040,'archipelago'],[42,1560,'random']])test(`actual V14 opening is gentle, neutral/convex, dry and known-water connected: ${seed}/${size}/${layout}`,()=>{
 const g=new Game();g.reset(seed,14,{size,layout});const home=g.campOf(0),before=new Float32Array(g.world.heights);
 const report=openingCampSurvey({height:(x,z)=>g.height(x,z),water:(x,z)=>g.waterAt(x,z)},home);assert.equal(report.valid,true,JSON.stringify(report));assert.equal(g.state.worldOptions.openingSiteVersion,2);
 assert.equal(g.state.excavations?.length??0,0);assert.equal(g.state.buildings.filter(b=>b.team===0).length,0);assert.equal(g.world.scenery.playerAboveAverage,true);assert.ok(g.world.openingWater.bankDistanceMetres<=22);
 const people=g.state.units.filter(u=>u.team===0&&u.hp>0);assert.equal(people.length,5);
 for(let i=0;i<people.length;i++){const p=people[i],offset=OPENING_RESIDENT_OFFSETS[i];assert.ok(Math.abs(p.x-home.x-offset.x)<1e-9);assert.ok(Math.abs(p.z-home.z-offset.z)<1e-9);assert.ok(g.walkable(p.x,p.z));assert.ok(g.workBoard.connected(g,p.x,p.z,home.x,home.z));assert.equal(p.y,g.height(p.x,p.z));}
 assert.equal(g.dryFoundation('townhall',home.x,home.z,1),true,'real hall and approach apron fit on untouched dry ground');assert.equal(waterCollectionIssue(g,0),null,'collector must find initially known physically accessible water');
 const bank=g.world.openingWater;assert.ok(g.workBoard.connected(g,home.x,home.z,bank.bankX,bank.bankZ));assert.deepEqual(g.world.heights,before,'survey never modifies ground');validateGameSave(encodeGame(g));
 console.log(JSON.stringify({seed,size,layout,home,report,beauty:g.world.scenery.player.score,bankDistance:bank.bankDistanceMetres,exactAnchorPlacementIssue:g.placementIssue('townhall',home.x,home.z)}));
});
const legacyCases=[{seed:42,size:1040,layout:'continents',hash:'48e047f018ee445ffb5b23c07547f9158d498ff7693897b7cf38d9eded6820db'},{seed:42,size:1560,layout:'random',hash:'124b3f176f0aaa7958db51049156c2a44315e1bef3b37c4c4e91a3954da98f39'}];
// Full derived-world hashes captured from 0993b0c before the new survey existed.
for(const c of legacyCases)test(`existing V14 opening remains byte-identical through restore: ${c.seed}/${c.size}/${c.layout}`,()=>{
 const g=new Game();g.reset(c.seed,14,{size:c.size,layout:c.layout,openingSiteVersion:1});assert.equal(hash(g.world),c.hash);const raw=encodeGame(g);assert.equal(raw.state.worldOptions.openingSiteVersion,undefined);const restored=decodeGame(raw);assert.equal(hash(restored.world),c.hash);assert.equal(restored.state.worldOptions.openingSiteVersion,undefined);assert.deepEqual(restored.state.campSites,g.state.campSites);
 if(c.layout==='random'){delete raw.state.worldOptions.randomLayout;const recovered=decodeGame(raw);assert.equal(hash(recovered.world),c.hash);assert.equal(recovered.state.worldOptions.openingSiteVersion,undefined);assert.equal(hash(decodeGame(encodeGame(recovered)).world),c.hash);}
});
test('opening hint is persisted only as version2 and only on V14 saves',()=>{const g=new Game();g.reset(42,14,{size:1040,layout:'continents'});const raw=encodeGame(g);for(const invalid of[1,3,false,'2',null]){const bad=structuredClone(raw);bad.state.worldOptions.openingSiteVersion=invalid;assert.throws(()=>validateGameSave(bad));}const old=structuredClone(raw);old.state.worldgenVersion=13;assert.throws(()=>validateGameSave(old));const restored=decodeGame(raw);assert.equal(hash(restored.world),hash(g.world));assert.equal(restored.state.worldOptions.openingSiteVersion,2);});
