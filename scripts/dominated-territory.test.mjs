import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {dominationSpheres,sphereAt,DOMINATED_TERRITORY_RULES} from '../src/game/dominatedTerritory.ts';
import {geographicInfluenceReady,geographicInfluenceAt,advanceGeographicInfluence} from '../src/game/influenceField.ts';

function fixture(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();
  const c=g.campOf(1),subject=g.makeBld('townhall',c.x,c.z,1);g.state.buildings.push(subject);
  const rival=g.makeBld('townhall',c.x+70,c.z,2);g.state.buildings.push(rival);g.rebuildWalk();g.state.time=1;
  for(let i=0;i<8000&&!(geographicInfluenceReady(g,1)&&geographicInfluenceReady(g,2));i++)advanceGeographicInfluence(g,performance.now()+i*50);
  const n=Math.round(Math.sqrt(g.territory.length)),cell=g.world.size/n;g.territory.fill(255);
  // paint the subject's land as a disk, with the side facing the rival contested where both reach
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-g.world.size/2+(i+.5)*cell,z=-g.world.size/2+(j+.5)*cell,d=Math.hypot(x-subject.x,z-subject.z);if(d>130)continue;
    const both=(geographicInfluenceAt(g,x,z,1)||0)>.0001&&(geographicInfluenceAt(g,x,z,2)||0)>.0001&&x>subject.x+25;g.territory[j*n+i]=both?254:1;}
  return{g,subject};}
const dom=(g,subject,o)=>{g.state.dominations={version:1,list:[{id:9,overlord:0,subject:1,hallId:subject.id,terms:'puppet',phase:'active',leverage:1,...o}]};};

test('an active puppet gives the overlord a sphere over the subject land; ownership is unchanged',()=>{
  const {g,subject}=fixture();dom(g,subject);const before=g.territory.slice();
  const [s]=dominationSpheres(g);assert.ok(s);assert.equal(s.overlord,0);assert.equal(s.subject,1);assert.equal(s.strength,.8);assert.ok(s.cells>0);
  assert.deepEqual(g.territory,before,'territory never transfers');
  const at=sphereAt(g,subject.x+10,subject.z);assert.ok(at&&at.overlord===0&&at.strength===.8);
  assert.equal(sphereAt(g,subject.x+DOMINATED_TERRITORY_RULES.radiusMetres.puppet+15,subject.z+5),null,'outside the community radius');
});

test('strength follows leverage and terms; lapsed or rebelled arrangements have no sphere',()=>{
  const {g,subject}=fixture();dom(g,subject,{leverage:.5});assert.equal(dominationSpheres(g)[0].strength,.4);
  dom(g,subject,{terms:'autonomy'});const auto=dominationSpheres(g)[0];dom(g,subject,{terms:'tribute'});const trib=dominationSpheres(g)[0];
  assert.ok(auto.cells>trib.cells,'autonomy reaches 120 m');assert.equal(trib.strength,.5);
  for(const phase of ['lapsed','released','rebelled']){dom(g,subject,{phase});assert.equal(dominationSpheres(g).length,0);}
  dom(g,subject,{leverage:0});assert.equal(dominationSpheres(g).length,0);
});

test('third parties contesting the subject land are reported for the protection duty',()=>{
  const {g,subject}=fixture();dom(g,subject,{terms:'autonomy'});const [s]=dominationSpheres(g);
  assert.ok(s.contestedCells>0,'native influence overlap exists');assert.deepEqual(s.thirdParties,[2]);
});
