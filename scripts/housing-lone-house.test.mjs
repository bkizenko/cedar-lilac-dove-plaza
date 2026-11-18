import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';import {isDependent} from '../src/game/settlement.ts';
// BUG-BORIS-LONE-HOUSE: a home placed while its only trained builder was busy waited forever.
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.vision.fill(2);const t=g.tribe(0);t.wood+=200;t.stone+=200;
 const teacher=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!isDependent(g,u));teacher.housingSkill={demonstratedAt:0};
 const home=g.campOf(0);let spot=null;for(let r=30;r<120&&!spot;r+=6)for(let i=0;i<16&&!spot;i++){const x=home.x+Math.cos(i/16*6.28)*r,z=home.z+Math.sin(i/16*6.28)*r;if(g.placementValid('house',x,z,0))spot={x,z};}
 assert.ok(spot);return{g,teacher,spot};}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);}assert.deepEqual(g.simulationErrors,[]);}
test('a home placed while the only trained builder is busy says why, then is built once that builder is free',()=>{const{g,teacher,spot}=fixture();
 teacher.carry=5;teacher.carryType='wood';teacher.order='return';
 assert.equal(g.placeBuilding('house',spot.x,spot.z,0),true);let b=g.state.buildings.find(b=>b.type==='house'&&b.team===0);
 assert.equal(b.renovation.phase,'planned');assert.match(b.renovation.blockedReason,/Waiting for a resident who learned the home method/);

 drive(g,240,()=>!b.renovation);assert.equal(b.renovation,undefined,'the home project completed');assert.ok(g.finished(b),'the lone house stands built');});
test('with no living trained resident the waiting home names the missing method instead of silently idling',()=>{const{g,teacher,spot}=fixture();
 teacher.carry=5;teacher.carryType='wood';teacher.order='return';assert.equal(g.placeBuilding('house',spot.x,spot.z,0),true);const b=g.state.buildings.find(b=>b.type==='house'&&b.team===0);
 teacher.housingSkill=undefined;drive(g,30,()=>false);assert.match(b.renovation.blockedReason,/No living resident knows the home method/);assert.equal(b.renovation.actorId,null);});
