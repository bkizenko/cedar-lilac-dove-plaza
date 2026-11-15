import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {setFocusMode,tickFocusMode,focusModeOf,validFocusMode} from '../src/game/focusModes.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function world(){const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('barracks',14,0,0)];for(const b of g.state.buildings){b.done=true;b.progress=1;}
 g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();Object.assign(g.tribe(0),{wood:50,stone:20,food:500,spears:0,bows:0,blades:0,age:1});return g;}
const adult=(g,x)=>{const u=g.spawnUnit('worker',x,6,0);u.y=4;u.order='idle';return u;};
test('default is off and nothing changes; old saves load',()=>{
 const g=world();adult(g,2);assert.equal(focusModeOf(g),'none');tickFocusMode(g);assert.ok(!g.state.units.some(u=>u.weaponWork||u.drill!=null));assert.ok(validFocusMode(g.state));assert.ok(decodeGame(encodeGame(g)));
});
test('war footing makes weapons and drills free adults but never touches locked or selected ones',()=>{
 const g=world(),free=[adult(g,2),adult(g,3),adult(g,4),adult(g,5)],locked=adult(g,6),sel=adult(g,7);locked.jobLock=true;locked.job='wood';sel.selected=true;
 setFocusMode(g,'war');g.state.time=10;tickFocusMode(g);
 assert.ok(free.some(u=>u.weaponWork),'a free adult is making a weapon');assert.ok(!locked.weaponWork&&locked.drill==null&&!sel.weaponWork&&sel.drill==null);
 g.state.time=20;tickFocusMode(g);assert.ok(g.state.units.some(u=>u.drill!=null&&u!==locked&&u!==sel),'someone drills');
 assert.equal(locked.job,'wood');assert.equal(decodeGame(encodeGame(g)).state.focusMode,'war');
});
test('crafting focus makes weapons but does not drill; thin food reserve stops it',()=>{
 const g=world();for(const x of [2,3,4,5])adult(g,x);setFocusMode(g,'craft');g.state.time=10;tickFocusMode(g);g.state.time=20;tickFocusMode(g);
 assert.ok(g.state.units.some(u=>u.weaponWork));assert.ok(!g.state.units.some(u=>u.drill!=null));
 const h=world();for(const x of [2,3,4,5])adult(h,x);h.tribe(0).food=0;setFocusMode(h,'war');h.state.time=10;tickFocusMode(h);assert.ok(!h.state.units.some(u=>u.weaponWork||u.drill!=null));
});
