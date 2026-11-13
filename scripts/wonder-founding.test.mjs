import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {mulberry32} from '../src/game/rng.ts';
import * as W from '../src/game/wonderFounding.ts';
import * as D from '../src/game/wonderDefs.ts';
const random=Math.random;test.beforeEach(()=>{Math.random=mulberry32(0x6161);});test.afterEach(()=>{Math.random=random;});
/** Seed 1 has wonder-worthy ground (hills, river, shore) within reach of both the player's and team 1's camp. The player's own search honours exploration, so the tests reveal the map. */
function game(){const g=new Game();g.reset(1,10,{});g.enterIsland();g.exploredAt=()=>true;return g;}
function run(g,s){const end=g.state.time+s;while(g.state.time<end){g.state.paused=false;g.step(.5);}}
const home=(g,team)=>g.state.campSites?.find(c=>c.team===team)??g.world.camps.find(c=>c.team===team);
/** A society of the great-works age: finished hall, a few idle hands, rich stock. Everything goes through the real state. */
function prepare(g,team,{age=2,rich=true,hands=true}={}){
 const h=home(g,team);if(!g.state.buildings.some(b=>b.team===team&&b.type==='townhall'))g.addStartingBuilding('townhall',h.x,h.z,team);
 const t=g.tribe(team);t.age=age;if(rich){t.wood=400;t.stone=400;t.food=800;}
 if(hands){while(g.state.units.filter(u=>u.team===team&&u.type==='worker').length<34)g.spawnUnit('worker',h.x+((g.state.units.length%7)-3)*2,h.z+4,team);}
 for(const u of g.state.units)if(u.team===team&&u.type==='worker'){u.order='idle';u.carry=0;}
 return h;
}
test('a new game switches founding on; the command schema is strict',()=>{
 const g=game();run(g,15);assert.equal(W.wonderFoundingEnabled(g),true);
 assert.ok(isEngineDispatchCommand({kind:'found-wonder',family:'harbor'}));
 assert.equal(isEngineDispatchCommand({kind:'found-wonder',family:'castle'}),false);
 assert.equal(isEngineDispatchCommand({kind:'found-wonder'}),false);
});
test('each founding condition blocks with its own reason: era, hall, hands, goods',()=>{
 const g=game();run(g,15);
 assert.match(W.wonderFoundingIssue(g,0,'observatory'),/age of great works/);
 g.tribe(0).age=2;assert.match(W.wonderFoundingIssue(g,0,'observatory'),/town hall/);
 const h=home(g,0);g.addStartingBuilding('townhall',h.x,h.z,0);
 for(const u of g.state.units.filter(u=>u.team===0&&u.type==='worker').slice(2))u.hp=0;
 assert.match(W.wonderFoundingIssue(g,0,'observatory'),/working hands/);
 const g2=game();run(g2,15);prepare(g2,0,{rich:false});g2.tribe(0).wood=10;g2.tribe(0).stone=0;g2.tribe(0).food=0;
 assert.match(W.wonderFoundingIssue(g2,0,'observatory'),/Needs \d+ (wood|stone|food)/);
 assert.match(W.wonderFoundingIssue(g2,0,'cistern'),/earthworks/);
});
test('founding spends real goods, opens a record at progress 0, and the crew pays the labour to finish it',()=>{
 const g=game();run(g,15);prepare(g,0);
 const t=g.tribe(0),before={wood:t.wood,stone:t.stone,food:t.food},c=W.wonderCost('terraceGarden'),fam=['observatory','terraceGarden','harbor','millMarket'].find(f=>W.findWonderSite(g,0,f));
 if(!fam){assert.ok(false,'no wonder family fits the generated ground near the hall; test world needs another seed');}
 const r=applyEngineCommand(g,{kind:'found-wonder',family:fam});assert.equal(r.accepted,true,r.reason);
 const rec=W.wondersOf(g)[0];assert.ok(rec&&rec.team===0&&rec.family===fam&&rec.progress===0&&rec.project);
 const cc=W.wonderCost(fam);const g0=D.stageGoods(fam,0);assert.ok(before.wood-t.wood>=g0.wood-1&&before.stone-t.stone>=g0.stone-1,'first-stage goods came out of the stock');assert.ok(Math.abs(before.stone-t.stone-g0.stone)<5);void c;
 assert.match(W.wonderFoundingIssue(g,0,fam)??'',/already rising/,'one project at a time');
 // labour: progress follows crew seconds; it never jumps
 run(g,60);const mid=W.wondersOf(g)[0];assert.ok(mid.project.crewIds.length>=1,'workers were sent');assert.ok(mid.progress>=0&&mid.progress<1);
 const p1=mid.progress;run(g,60);assert.ok(W.wondersOf(g)[0].progress>=p1);
 // cash in the rest of the labour honestly by stepping until it finishes (bounded)
 for(let k=0;k<60&&W.wondersOf(g)[0].project;k++)run(g,60);
 const done=W.wondersOf(g)[0];assert.equal(done.project,undefined);assert.equal(done.progress,1);assert.ok(done.done>done.founded);
 assert.deepEqual(g.simulationErrors,[]);
});
test('records and the switch survive a save; a save without the switch keeps legacy behaviour',()=>{
 const g=game();run(g,15);prepare(g,0);const fam=['observatory','terraceGarden','harbor','millMarket'].find(f=>W.findWonderSite(g,0,f));
 assert.equal(applyEngineCommand(g,{kind:'found-wonder',family:fam}).accepted,true);run(g,30);
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.deepEqual(JSON.parse(JSON.stringify(W.wondersOf(g2))),JSON.parse(JSON.stringify(W.wondersOf(g))));assert.equal(W.wonderFoundingEnabled(g2),true);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));delete raw.state?.wonderFounding;delete raw.state?.wonders;
 const legacy=decodeGame(raw);run(legacy,40);assert.equal(W.wonderFoundingEnabled(legacy),false);assert.equal(W.wondersOf(legacy).length,0);
 const bad=JSON.parse(JSON.stringify(encodeGame(g)));bad.state.wonders[0].progress=3;assert.throws(()=>decodeGame(bad));
});
test('a rival society that is old enough, rich enough and has hands founds its own wonder, seeded and finite',()=>{
 const g=game();run(g,15);const team=1;prepare(g,team);const t=g.tribe(team);const stone0=t.stone;
 for(let k=0;k<30&&!W.wondersOf(g).some(r=>r.team===team);k++)run(g,10);
 const rec=W.wondersOf(g).find(r=>r.team===team);assert.ok(rec,'the rival founded a wonder');assert.ok(t.stone<stone0,'it paid in stone');
 assert.ok(W.wondersOf(g).filter(r=>r.team===team).length<=1,'only one rising at a time');
 run(g,120);const later=W.wondersOf(g).find(r=>r.team===team);assert.ok(later.project?later.project.crewIds.length>0||later.waiting:later.progress===1,'its own people work on it (or it says why not)');
 // determinism: the same world founds the same wonder at the same place
 const g2=game();run(g2,15);prepare(g2,team);for(let k=0;k<30&&!W.wondersOf(g2).some(r=>r.team===team);k++)run(g2,10);
 const rec2=W.wondersOf(g2).find(r=>r.team===team);assert.ok(rec2);assert.equal(rec2.family,rec.family);assert.equal(rec2.x,rec.x);assert.equal(rec2.z,rec.z);
 // the player's team never gets one without asking
 assert.equal(W.wondersOf(g).some(r=>r.team===0),false);
});
