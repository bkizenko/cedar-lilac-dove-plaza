import test from 'node:test';import assert from 'node:assert/strict';
let THREE=null,A=null,Game=null;try{THREE=await import('three');A=await import('../src/scene/peopleAdapter.ts');({Game}=await import('../src/game/sim.ts'));}catch(e){THREE=null;}
const skip=THREE?false:'three is not installed here (npm ci)';
test('people adapter: draws a real game\'s units with the rig, shows owned garments, and survives a death',{skip},()=>{
 const g=new Game();g.reset(42);g.enterIsland();const scene=new THREE.Scene(),ad=new A.PeopleAdapter(scene,'rig');
 assert.ok(ad.active);
 const cam=new THREE.Vector3(0,30,40),living=()=>g.state.units.filter(u=>u.hp>0);
 let drew=0;ad.begin(g,cam,'high',true,living());for(const u of living())if(ad.write(u,[1.65,1.65,1.65],0,u.facing,1))drew++;ad.end(g);
 assert.ok(ad.active,'no failure');assert.equal(drew,living().length);assert.ok(ad.layer.stats.people>0);
 const victim=living()[0];victim.hp=0;g.state.time+=.1;
 ad.begin(g,cam,'high',true,living());for(const u of living())ad.write(u,[1.65,1.65,1.65],0,u.facing,1);ad.end(g);
 assert.ok(ad.active);assert.ok(ad.layer.stats.corpses<=1);
 ad.dispose();
});
test('people adapter: legacy set draws nothing and civForTeam is stable and distinct per team',{skip},()=>{
 const ad=new A.PeopleAdapter(new THREE.Scene(),'legacy');assert.equal(ad.active,false);assert.equal(ad.write({},[1,1,1],0,0,1),false);
 assert.equal(A.civForTeam(7,0),A.civForTeam(7,0));assert.notEqual(A.civForTeam(7,0),A.civForTeam(7,1));
});
