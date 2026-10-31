import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {SEGS,MAP,HALF} from '../src/game/constants.ts';
import {beginRiverboat,launchRiverboat,boardRiverboat,riverboatAI,syncRiverboats,commandRiverboat,landRiverboat} from '../src/game/boats.ts';
import {haulageWorkAI} from '../src/game/haulage.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(const kind of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[kind]=[];
 for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++){const p=z/SEGS*MAP-HALF;g.world.heights[z*(SEGS+1)+x]=Math.abs(p)<8?g.world.waterY-1:4;}
 const dock=g.makeBld('dock',0,-10,0);g.state.buildings=[dock];g.vision.fill(2);g.state.weather='clear';
 Object.assign(g.tribe(0),{food:1000,wood:100,stone:30});
 for(let i=0;i<3;i++)g.spawnUnit('worker',8+i,-14,0);g.rebuildWalk();return {g,dock};
}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units)riverboatAI(g,u,.1);syncRiverboats(g);}}
test('a dock boat consumes finite materials and actual bench labor and exists apart from its builder',()=>{
 const {g,dock}=fixture();assert.equal(beginRiverboat(g,dock.id),true);
 const u=g.state.units.find(u=>u.haulageWork);assert.equal(g.tribe(0).wood,60);assert.equal(g.tribe(0).stone,26);assert.equal(g.state.boats,undefined);
 for(let i=0;i<5000&&u.haulageWork;i++){g.state.time+=.1;g.navBudget=30;haulageWorkAI(g,u,.1);}
 assert.equal(u.haulageWork,undefined);assert.equal(u.haulage,undefined);assert.equal(g.state.boats.length,1);assert.equal(g.state.boats[0].capacity,5);
 const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.state.boats,g.state.boats);
});
test('several residents board, physically cross water, disembark, and leave the same reusable boat',()=>{
 const {g,dock}=fixture();assert.equal(launchRiverboat(g,dock),true);const b=g.state.boats[0];
 assert.equal(boardRiverboat(g,b.id,g.state.units),3);drive(g,60);
 assert.ok(g.state.units.every(u=>u.boat?.phase==='aboard'));assert.ok(b.captain);
 const captain=g.state.units.find(u=>u.id===b.captain);captain.selected=true;g.issueMove(0,6);drive(g,50);
 assert.ok(b.z>3,JSON.stringify({b,captain:{x:captain.x,z:captain.z,order:captain.order,tx:captain.tx,tz:captain.tz}}));
 assert.ok(g.state.units.every(u=>Math.hypot(u.x-b.x,u.z-b.z)<3));
 assert.equal(landRiverboat(g,b.id),true);drive(g,60);
 assert.ok(g.state.units.every(u=>!u.boat&&!u.haulage&&g.walkable(u.x,u.z)),JSON.stringify(g.state.units.map(u=>({id:u.id,x:u.x,z:u.z,y:u.y,boat:u.boat,tx:u.tx,tz:u.tz,stuck:u.stuckT,walk:g.walkable(u.x,u.z)}))));
 assert.equal(g.state.boats[0].id,b.id);assert.equal(b.captain,undefined);
 assert.equal(boardRiverboat(g,b.id,g.state.units),3);drive(g,60);assert.ok(b.captain);
});
test('boat, paid construction and crew save together; invalid crew and capacity are rejected',()=>{
 const {g,dock}=fixture();launchRiverboat(g,dock);const b=g.state.boats[0];boardRiverboat(g,b.id,g.state.units);drive(g,60);
 const raw=encodeGame(g),copy=decodeGame(raw);assert.equal(copy.state.boats[0].captain,b.captain);assert.equal(copy.state.units.filter(u=>u.boat).length,3);
 raw.state.boats[0].capacity=99;assert.throws(()=>decodeGame(raw));
 const raw2=encodeGame(g);raw2.state.units[0].boat.id=999999;assert.throws(()=>decodeGame(raw2));
});
test('boats cannot sail across dry land; a surviving passenger can take a lost captain’s helm',()=>{
 const {g,dock}=fixture();launchRiverboat(g,dock);const b=g.state.boats[0];boardRiverboat(g,b.id,g.state.units);drive(g,60);
 const old=b.captain;g.state.units.find(u=>u.id===old).hp=0;syncRiverboats(g);assert.ok(b.captain&&b.captain!==old);
 const u=g.state.units.find(u=>u.id===b.captain);assert.equal(g.canStep(u,0,40),false);
 assert.equal(commandRiverboat(g,b.id,0,300),false);assert.equal(landRiverboat(g,b.id),true);
});

test('ferry preview changes only an explicit test copy and exposes a real dock boat',async()=>{
 const {testAction}=await import('../src/game/testing.ts');const g=new Game();g.reset(123456,6);g.enterIsland();
 const before=g.state.buildings.length;assert.equal(testAction(g,'ferry'),false);assert.equal(g.state.buildings.length,before);assert.equal(g.state.boats,undefined);
 g.testMode=true;assert.equal(testAction(g,'ferry'),true);assert.equal(g.state.boats.length,1);assert.equal(g.state.selBld.type,'dock');
 assert.ok(g.state.units.filter(u=>u.team===0&&Math.hypot(u.x-g.state.boats[0].x,u.z-g.state.boats[0].z)<24).length>=3);
});

test('paid hull construction resumes at its original duration and captain death saves without a broken owner reference',async()=>{
 const {resumeHaulageWork}=await import('../src/game/haulage.ts');
 const {g,dock}=fixture();beginRiverboat(g,dock.id);const maker=g.state.units.find(u=>u.haulageWork);maker.haulageWork.progress=70;g.interruptMission(maker);
 const wood=g.tribe(0).wood;assert.equal(resumeHaulageWork(g,maker,dock.id),true);assert.equal(maker.haulageWork.duration,150);assert.equal(maker.haulageWork.progress,70);assert.equal(g.tribe(0).wood,wood);
 maker.haulageWork=undefined;maker.order='idle';launchRiverboat(g,dock);const b=g.state.boats[0];boardRiverboat(g,b.id,g.state.units);drive(g,60);
 g.state.units.find(u=>u.id===b.captain).hp=0;
 const copy=decodeGame(encodeGame(g));assert.ok(copy.state.boats[0].captain);assert.ok(copy.state.units.some(u=>u.id===copy.state.boats[0].captain&&u.hp>0));
});
