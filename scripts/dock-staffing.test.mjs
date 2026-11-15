import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {fishingGrounds,tickDockStaffing,dockCatch,dockFisherLimit,catchDockFish} from '../src/game/fishing.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.fish=[];g.vision.fill(2);g.state.time=0;
 g.height=(x,z)=>x>=2&&x<=8&&z>=-16&&z<=16?0:4;
 const dock=g.makeBld('dock',0,0,0);dock.build=1;g.state.buildings=[dock];return {g,dock};
}
test('idle adults take up a finished dock by themselves, up to the dock limit, with no banner spam',()=>{
 const {g,dock}=fixture();assert.ok(fishingGrounds(g,dock).length);
 const us=[0,1,2,3].map(i=>g.spawnUnit('worker',-1,i,0));for(const u of us)u.order='idle';
 let banners=0;g.banner=()=>{banners++;};
 tickDockStaffing(g);const on=us.filter(u=>u.node===dock&&u.order==='gather').length;
 assert.equal(on,dockFisherLimit(g,dock));assert.equal(on,2);assert.equal(banners,0);
 g.state.time+=20;tickDockStaffing(g);assert.equal(us.filter(u=>u.node===dock).length,2,'no over-assignment on later passes');
});
test('workers already doing other work are not pulled to the dock automatically',()=>{
 const {g,dock}=fixture();const u=g.spawnUnit('worker',-1,0,0);u.order='gather';u.node=null;
 tickDockStaffing(g);assert.notEqual(u.node,dock);
});
test('a dock catch yields more than one fish and stays conserved',()=>{
 const {g,dock}=fixture(),n=fishingGrounds(g,dock)[0],u=g.spawnUnit('worker',0,0,0);u.carry=0;const before=n.amount;
 catchDockFish(g,u,dock);assert.equal(u.carry,dockCatch(g,dock));assert.ok(u.carry>=2);assert.equal(before-n.amount,u.carry);
});
