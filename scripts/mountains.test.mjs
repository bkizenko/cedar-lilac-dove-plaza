import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {findPath} from '../src/game/navigation.ts';
import {mountainSurvey,MOUNTAIN_RULES} from '../src/game/mountains.ts';

function fixture(reveal){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.rebuildWalk();if(reveal){g.testMode=true;g.revealMap=true;}g.updateVision(0);return g;}
const W=520,cellOf=(g,x,z)=>Math.floor((z+g.world.size/2)/(g.world.size/W))*W+Math.floor((x+g.world.size/2)/(g.world.size/W));

test('massifs are relative upland; hikeable summits are reachable on the real walk grid from the approach',()=>{
  const g=fixture(true),s=mountainSurvey(g,0);assert.ok(s.massifs.length>0);
  assert.ok(Math.abs(s.uplandThresholdMetres-(s.medianLandMetres+MOUNTAIN_RULES.uplandMetres))<.02);
  const home=s.massifs.filter(m=>m.connectedToHome);assert.ok(home.length>0);
  for(const m of home){assert.ok(m.summit.y>=s.uplandThresholdMetres-.01);assert.ok(m.approach);
    if(!m.summitHikeable)continue;let reached=false;
    for(let dz=-8;dz<=8&&!reached;dz+=2)for(let dx=-8;dx<=8;dx+=2){const goal=cellOf(g,m.summit.x+dx,m.summit.z+dz);if(!g.walk[goal])continue;if(findPath(g.walk,W,cellOf(g,m.approach.x,m.approach.z),goal,400000)){reached=true;break;}}
    assert.ok(reached,`massif ${m.id}`);}
  assert.ok(home.filter(m=>m.summitHikeable).length/home.length>=.8,'most home-landmass summits are hikeable');
});

test('prospect targets are walkable, spaced, highest first and capped',()=>{
  const g=fixture(true);for(const m of mountainSurvey(g,0).massifs){assert.ok(m.prospects.length<=MOUNTAIN_RULES.maximumProspects);
    for(let i=0;i<m.prospects.length;i++){const p=m.prospects[i];assert.ok(g.walk[cellOf(g,p.x,p.z)]);if(i)assert.ok(p.y<=m.prospects[i-1].y+1e-9);
      for(let j=0;j<i;j++)assert.ok(Math.hypot(p.x-m.prospects[j].x,p.z-m.prospects[j].z)>=MOUNTAIN_RULES.prospectSpacingMetres-1e-6);}
    if(!m.connectedToHome)assert.equal(m.prospects.length,0);}
});

test('the player survey never reports unexplored terrain',()=>{
  const top=mountainSurvey(fixture(true),0).massifs[0],g=fixture(false),FOW=Math.round(Math.sqrt(g.vision.length));
  // explore only a 60 m disk around one summit
  for(let iz=0;iz<FOW;iz++)for(let ix=0;ix<FOW;ix++){const x=(ix+.5)/FOW*g.world.size-g.world.size/2,z=(iz+.5)/FOW*g.world.size-g.world.size/2;if(Math.hypot(x-top.summit.x,z-top.summit.z)<=60)g.vision[iz*FOW+ix]=Math.max(1,g.vision[iz*FOW+ix]);}
  const s=mountainSurvey(g,0);assert.ok(s.massifs.length>0,'the explored summit is reported');
  for(const m of s.massifs){assert.ok(g.exploredAt(m.summit.x,m.summit.z));if(m.approach)assert.ok(g.exploredAt(m.approach.x,m.approach.z));for(const p of m.prospects)assert.ok(g.exploredAt(p.x,p.z));}
  const full=mountainSurvey(fixture(true),0);assert.ok(full.massifs.reduce((a,m)=>a+m.cells,0)>=s.massifs.reduce((a,m)=>a+m.cells,0));
});
