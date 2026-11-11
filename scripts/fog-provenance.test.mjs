import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {FOW} from '../src/game/constants.ts';
import {traceFog,attributeReveals,classifyObserver} from '../src/game/fogProvenance.ts';

const explored=v=>v.reduce((a,c)=>a+(c?1:0),0);
const fresh=()=>{const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();return g;};

test('G10: Test Lab reveal is an overlay; switching it off restores the real observed fog',()=>{
 const g=fresh();g.testMode=true;g.updateVision(0);const real=g.vision.slice();
 g.revealMap=true;g.updateVision(0);assert.equal(explored(g.vision),FOW*FOW,'reveal shows the whole map');
 assert.deepEqual(g.observedVision(),real,'observed fog is kept underneath');
 g.revealMap=false;g.updateVision(0);assert.deepEqual(g.vision,real,'no permanent exploration from the reveal');
});

test('G10: residents keep observing while the reveal is on, and only their sight persists',()=>{
 const g=fresh();g.testMode=true;g.revealMap=true;g.updateVision(0);const before=explored(g.observedVision());
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');g.selectEntity(u);g.issueMove(u.x+40,u.z);
 for(let i=0;i<150;i++)g.step(.2);
 g.revealMap=false;g.updateVision(0);const after=explored(g.vision);
 assert.ok(after>before,'walking under the overlay still explores real ground');
 assert.ok(after<before+600,`only observed ground persists (${before}→${after})`);
});

test('G10: reveal has no effect outside Test Lab and a reset drops any overlay',()=>{
 const g=fresh();g.revealMap=true;g.updateVision(0);assert.ok(explored(g.vision)<500);
 const t=fresh();t.testMode=true;t.revealMap=true;t.updateVision(0);t.revealMap=false;t.reset(0,undefined,{size:1040,layout:'continents'});t.enterIsland();t.updateVision(0);
 assert.ok(explored(t.vision)<500,'a new game never inherits the previous overlay');
});

test('G10 invariant: every cell explored in an unattended native game has a resident or building observer',()=>{
 const g=fresh();const r=traceFog(g,240);
 assert.equal(r.unattributed,0,JSON.stringify(r));
 assert.ok(!('test-reveal' in r.byKind));
 console.log(JSON.stringify({g10Trace:r}));
});

test('G10: autonomous labour is classified separately from player orders',()=>{
 const g=fresh();const [a,b,c]=g.state.units.filter(u=>u.team===0&&u.type==='worker');
 a.order='explore';a.searchJob='food';assert.equal(classifyObserver(a).kind,'search-party');
 b.order='explore';b.searchJob=undefined;b.expedition={food:5,returning:false,forage:0};assert.equal(classifyObserver(b).kind,'expedition');
 c.order='move';assert.equal(classifyObserver(c).kind,'player-order');
 const before=g.vision.slice();a.x+=60;g.updateVision(0);const tick=attributeReveals(g,before);
 assert.ok(tick.revealed>0&&tick.unattributed.length===0);assert.ok([...tick.bySource.values()].some(e=>e.source.kind==='search-party'));
});
