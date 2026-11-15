import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {TUTORIAL_STEPS,startTutorial,advanceTutorial,nextTutorialStep,skipTutorial,resumeTutorial,setTutorialHints,currentStep,validTutorial} from '../src/game/tutorial.ts';

const fresh=()=>{const g=new Game();g.reset(1234,20);g.enterIsland();return g;};
const ids=()=>TUTORIAL_STEPS.map(s=>s.id);
const idOf=g=>currentStep(g.state.tutorial)?.id;
const player=g=>g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker');
const addB=(g,type,build=1)=>{g.state.buildings.push({kind:'building',id:g.state.nextId++,type,team:0,x:0,y:0,z:0,w:4,d:4,build,hp:50,maxHp:50,selected:false,queue:[],rally:null,cd:0,reclaimed:false});};

test('absent tutorial is off and advance is a no-op',()=>{const g=fresh();assert.equal(g.state.tutorial,undefined);assert.equal(advanceTutorial(g.state),false);assert.equal(currentStep(undefined),null);});
test('steps progress from state changes, in order',()=>{
 const g=fresh();startTutorial(g.state);
 for(const u of g.state.units)u.selected=false;
 assert.equal(idOf(g),'select');advanceTutorial(g.state);assert.equal(idOf(g),'select');
 player(g)[0].selected=true;advanceTutorial(g.state);assert.equal(idOf(g),'gather');
 player(g)[0].order='gather';advanceTutorial(g.state);assert.equal(idOf(g),'shelter');
 addB(g,'hut',0.5);advanceTutorial(g.state);assert.equal(idOf(g),'shelter','unfinished hut does not count');
 g.state.buildings.at(-1).build=1;advanceTutorial(g.state);assert.equal(idOf(g),'storage');
 addB(g,'warehouse');advanceTutorial(g.state);assert.equal(idOf(g),'field');
 addB(g,'farm',0);advanceTutorial(g.state);assert.equal(idOf(g),'winter');
 advanceTutorial(g.state,'Autumn');assert.equal(idOf(g),'winter');advanceTutorial(g.state,'Winter');assert.equal(idOf(g),'auto','manual step waits');
 nextTutorialStep(g.state);assert.equal(idOf(g),'workload');
 nextTutorialStep(g.state);assert.equal(idOf(g),'hunting');
 player(g)[0].huntOnly=true;advanceTutorial(g.state);assert.equal(idOf(g),'defence');
 nextTutorialStep(g.state);nextTutorialStep(g.state);assert.equal(idOf(g),'neighbours');
 nextTutorialStep(g.state);assert.equal(g.state.tutorial.active,false);assert.equal(g.state.tutorial.step,ids().length);
});
test('existing buildings at start do not count; skip, hide and resume work',()=>{
 const g=fresh();addB(g,'hut');startTutorial(g.state);for(const u of g.state.units)u.selected=false;
 advanceTutorial(g.state);assert.equal(g.state.tutorial.base.shelter>=1,true);
 skipTutorial(g.state);assert.equal(currentStep(g.state.tutorial),null);
 resumeTutorial(g.state);assert.equal(g.state.tutorial.active,true);
 setTutorialHints(g.state,false);assert.equal(g.state.tutorial.hints,false);
});
test('persistence round trip keeps tutorial state',()=>{
 const g=fresh();startTutorial(g.state);g.state.tutorial.step=3;setTutorialHints(g.state,false);
 const enc=JSON.parse(JSON.stringify(encodeGame(g)));validateGameSave(enc);
 const g2=decodeGame(enc);assert.deepEqual(g2.state.tutorial,g.state.tutorial);
});
test('old saves without tutorial load; malformed tutorial is dropped not fatal',()=>{
 const g=fresh();const enc=JSON.parse(JSON.stringify(encodeGame(g)));
 delete enc.state.tutorial;assert.equal(decodeGame(enc).state.tutorial,undefined);
 enc.state.tutorial={version:1,step:'x'};const g3=decodeGame(JSON.parse(JSON.stringify(enc)));assert.equal(g3.state.tutorial,undefined);
 assert.equal(validTutorial({version:1,step:99,active:true,hints:true,startedAt:0,base:{}}),false);
});
