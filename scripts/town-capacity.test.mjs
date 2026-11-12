import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {testAction} from '../src/game/testing.ts';
import {townCapacity,territorySpacingMetres,TOWN_CAPACITY_RULES} from '../src/game/townCapacity.ts';

function fixture(reveal=true){const g=new Game();g.reset(2,18,{size:1040,layout:'archipelago'});g.enterIsland();g.testMode=true;testAction(g,'supplies');if(reveal)g.revealMap=true;g.updateVision(0);
  const c=g.campOf(0),h=g.makeBld('townhall',c.x,c.z,0);g.state.buildings.push(h);g.rebuildWalk();return g;}

test('every proposed site passes the real town-hall placement rule and keeps its spacing',()=>{
  const g=fixture(),r=townCapacity(g,0),wide=territorySpacingMetres(),all=r.landmasses.flatMap(m=>m.sites),roomy=r.landmasses.flatMap(m=>m.territorySites);
  assert.ok(all.length>0&&roomy.length>0);
  for(const s of [...all,...roomy])assert.equal(g.placementIssue('townhall',s.x,s.z,0),null);
  const halls=g.state.buildings.filter(b=>b.team===0&&b.type==='townhall');
  for(let i=0;i<roomy.length;i++){for(const h of halls)assert.ok(Math.hypot(roomy[i].x-h.x,roomy[i].z-h.z)>=wide);for(let j=0;j<i;j++)assert.ok(Math.hypot(roomy[i].x-roomy[j].x,roomy[i].z-roomy[j].z)>=wide);}
  for(let i=0;i<all.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(all[i].x-all[j].x,all[i].z-all[j].z)>=TOWN_CAPACITY_RULES.spacingMetres);
  assert.equal(r.halls,1);assert.equal(r.hallsBeforeCap,TOWN_CAPACITY_RULES.administrativeCap-1);
});

test('several landmasses can each hold towns, and the largest can hold more than one',()=>{
  const r=townCapacity(fixture(),0);assert.ok(r.landmasses.filter(m=>m.territoryCapacity>0).length>=2);
  assert.ok(r.landmasses[0].territoryCapacity>=2,JSON.stringify(r.landmasses[0]));
  for(let i=1;i<r.landmasses.length;i++)assert.ok(r.landmasses[i].areaSquareMetres<=r.landmasses[i-1].areaSquareMetres);
});

test('committing a proposed site founds a real town and the survey updates',()=>{
  const g=fixture(),before=townCapacity(g,0),site=before.landmasses[0].territorySites[0];assert.ok(site);
  assert.notEqual(g.placeBuilding('townhall',site.x,site.z,0),false);
  const after=townCapacity(g,0);assert.equal(after.halls,2);
  assert.ok(after.landmasses.flatMap(m=>m.territorySites).every(s=>Math.hypot(s.x-site.x,s.z-site.z)>=territorySpacingMetres()));
});

test('the player only gets sites on explored ground',()=>{
  const g=fixture(false),r=townCapacity(g,0);for(const s of r.landmasses.flatMap(m=>[...m.sites,...m.territorySites]))assert.ok(g.exploredAt(s.x,s.z));
});
