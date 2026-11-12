import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {nearestFreshWater} from '../src/game/waterWorks.ts';
import {planAqueductWorks,executeAqueductWorks,continueAqueductWorks,planCanalWorks} from '../src/game/waterLineWorks.ts';
import {excavationCuts} from '../src/game/excavation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function world(seed=2,layout='archipelago'){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});return g;}
const SRC={x:49.6,z:265.6},TGT={x:-71.6,z:195.6};

test('native aqueduct: the channel cut is dug by workers as ordinary digs, labour is the union volume, the intake stays clear of the source and the channel passes',()=>{
  const g=world(),s=nearestFreshWater(g,SRC.x,SRC.z,60),plan=planAqueductWorks(g,s,TGT);
  assert.deepEqual(plan.issues,[]);assert.ok(plan.stages.length>0);assert.ok(plan.heldAtIntake>0,'digs that would reach the source are held');assert.ok(plan.maxSillMetres<=.25);
  const h0=plan.stages.map(st=>g.height(st.x,st.z));
  const r=executeAqueductWorks(g,plan);assert.equal(r.ok,true,r.reason);assert.equal(excavationCuts(g).length,0,'laying out changes no ground');
  const units=g.state.units.filter(u=>u.team===0).slice(0,5);const st0=plan.stages[0];
  let spot=null;for(let d=12;d<40&&!spot;d+=2)for(let a=0;a<16&&!spot;a++){const x=st0.x+Math.sin(a/16*Math.PI*2)*d,z=st0.z+Math.cos(a/16*Math.PI*2)*d;if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+1)spot={x,z};}
  assert.ok(spot);units.forEach((u,i)=>Object.assign(u,{x:spot.x+i,z:spot.z,y:g.height(spot.x+i,spot.z),order:'idle'}));g.rebuildWalk();
  let ids=[...r.buildingIds];
  for(let t=0;t<6000;t+=.2){g.state.paused=false;g.step(.2);if(Math.abs(t%10)>=.1)continue;for(const u of units){u.hunger=0;u.thirstSeconds=0;u.coldSeconds=0;}
    ids.push(...continueAqueductWorks(g,plan));const digs=ids.map(id=>g.state.buildings.find(b=>b.id===id)).filter(Boolean);const cut=new Set(excavationCuts(g).map(c=>c.buildingId));
    if(digs.length===plan.stages.length&&digs.every(b=>cut.has(b.id)))break;
    const open=digs.find(b=>b.build<1-1e-5);if(open)for(const u of units)if(u.order!=='build'||u.buildOrder!==open.id){u.order='build';u.buildOrder=open.id;}}
  const cuts=excavationCuts(g).filter(c=>ids.includes(c.buildingId));assert.equal(cuts.length,plan.stages.length);assert.deepEqual(g.simulationErrors,[]);
  const vol=cuts.reduce((a,c)=>a+c.volumeCubicMeters,0),work=cuts.reduce((a,c)=>a+c.workSeconds,0);
  assert.ok(Math.abs(vol-plan.plannedCutCubicMetres)<=Math.max(1,plan.plannedCutCubicMetres*.05),`dug ${vol} vs ${plan.plannedCutCubicMetres}`);assert.ok(work>=vol*6*.97);
  plan.stages.forEach((st,i)=>assert.ok(Math.abs(g.height(st.x,st.z)-(h0[i]-st.depth))<.06,'each dig lowered its centre by its depth'));
  // no dig reached water: the source water is where it was
  assert.ok(Math.abs(g.waterAt(s.x,s.z)-s.y)<1e-6);
  console.log(`aqueduct: ${plan.lengthMetres} m, ${plan.stages.length} digs (${plan.heldAtIntake} held at the intake), ${vol.toFixed(1)} m³, ${work.toFixed(0)} work-s, arcade ${plan.arcadeLengthMetres} m (masonry, not dug)`);
  const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(back.height(st0.x,st0.z),g.height(st0.x,st0.z));
});

test('aqueduct preview equals commit: a tree on a bank refuses the whole commission',()=>{
  const g=world(),s=nearestFreshWater(g,SRC.x,SRC.z,60),plan=planAqueductWorks(g,s,TGT),st=plan.stages[0];
  g.state.trees.push({x:st.x+1,z:st.z,y:g.height(st.x+1,st.z),amount:40,max:40,kind:'oak'});const n=g.state.buildings.length;
  const r=executeAqueductWorks(g,plan);assert.equal(r.ok,false);assert.ok(/Clear or gather/.test(r.reason));assert.equal(g.state.buildings.length,n);
});

test('canals the game cannot fill or build are refused with the reason, never laid out',()=>{
  const g=world();
  // waters already joined by water (a spit whose boat route round is short) need no canal
  const joined=planCanalWorks(g,{x:-12,z:-180},{x:44,z:-180});assert.ok(joined.issues.length>0);
  // inland lakes stand 10 m above the sea: joining needs locks (structures), refused
  const lake=(g.world.waterBodies||[]).find(b=>b.kind==='lake');if(lake){let sea=null;for(let r=lake.rx;r<300&&!sea;r+=4)for(let a=0;a<16&&!sea;a++){const x=lake.x+Math.sin(a/16*Math.PI*2)*r,z=lake.z+Math.cos(a/16*Math.PI*2)*r;if(Math.abs(x)<500&&Math.abs(z)<500&&g.height(x,z)<g.waterAt(x,z)&&Math.abs(g.waterAt(x,z)-g.world.waterY)<.05)sea={x,z};}
    if(sea){const p=planCanalWorks(g,{x:lake.x,z:lake.z},sea,0,[{x:lake.x,z:lake.z},sea]);assert.ok(p.issues.some(i=>/lock|one dig|embankment|Explore/.test(i)),p.issues.join('; '));}}
});
