import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {beginProduction,pauseProductionProject,resumeProduction,tickProduction} from '../src/game/production.ts';
import {PRESERVATION_RULES} from '../src/game/foodPreservation.ts';
import {foodInventory} from '../src/game/pantry.ts';

let opening;
function fixture(recipe='cookFish'){
  opening??=nativeDairyVillage();
  const g=decodeGame(opening.save),t=g.tribe(0);
  t.food=304;t.foodLots={provisions:300,fish:4};
  if(recipe==='twistCordageHand')t.items.plantFibre=4;
  assert.equal(beginProduction(g,recipe,opening.hearth),true);
  const p=g.state.production.projects.at(-1);
  const end=g.state.time+120;
  while(p.phase!=='returning'&&g.state.time<end){g.state.paused=false;g.step(.2);}
  assert.equal(p.phase,'returning','paid fish must physically reach the hearth and finish cooking');
  assert.deepEqual(g.simulationErrors,[]);
  if(recipe==='cookFish'){
    assert.equal(g.state.production.metrics.foodInputsUsed.fish,4);
    assert.equal(g.state.production.metrics.logsUsed,1);
  }else assert.equal(g.state.production.metrics.consumed.plantFibre,4);
  assert.equal(foodInventory(t).cookedFish,0,'food still carried by its actual maker is not yet pantry stock');
  assert.equal(pauseProductionProject(g,p.id),true);
  return {g,p};
}
const lifetime=PRESERVATION_RULES.finishedBatchLifetimeSeconds;
test('a paid cooked meal expires once while its physical return is paused, without stock or learning credit',()=>{
  const {g,p}=fixture();
  const stockBefore=g.tribe(0).food;
  g.state.time=(p.outputReadyAt??g.state.time)+lifetime+1;
  tickProduction(g,0);
  assert.equal(p.phase,'lost','pausing the carrier cannot preserve prepared meals forever');
  const m=g.state.production.metrics;
  assert.equal(m.edibleFoodLost,4);
  assert.equal(m.foodOutputsLost.cookedFish,4);
  assert.equal(m.foodOutputsProduced?.cookedFish||0,0);
  assert.equal(m.foodInputsLost?.fish||0,0,'the lost lot is cooked output, not a second raw input loss');
  assert.equal(m.completed,0);
  assert.equal(g.tribe(0).food,stockBefore);
  assert.equal(g.tribe(0).productionPractice?.cookFish,undefined);
  assert.equal(g.state.units.some(u=>u.productionProjectId===p.id),false);
  assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
  tickProduction(g,0);
  assert.equal(m.edibleFoodLost,4);
  assert.equal(m.foodOutputsLost.cookedFish,4,'subsequent ticks cannot count the same food twice');
});

test('held nonfood cordage does not inherit the prepared-meal spoilage clock',()=>{
  const {g,p}=fixture('twistCordageHand');
  assert.equal(p.outputReadyAt,undefined);
  g.state.time+=lifetime*2;
  tickProduction(g,0);
  assert.equal(p.phase,'paused');
  assert.equal(p.outputReadyAt,undefined);
  assert.equal(g.state.production.metrics.lost.cordage||0,0);
  assert.equal(g.tribe(0).items.cordage||0,0,'paid finished cordage stays on its actual carrier until delivered');
  assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('fresh carried food preserves its completion time across reload and is physically delivered once',()=>{
  let {g,p}=fixture();
  const id=p.id,readyAt=p.outputReadyAt;
  g.state.time+=20;
  g=decodeGame(encodeGame(g));p=g.state.production.projects.find(q=>q.id===id);
  assert.equal(p.outputReadyAt,readyAt);
  assert.equal(resumeProduction(g,id),true);
  const end=g.state.time+120;
  while(p.phase!=='complete'&&g.state.time<end){g.state.paused=false;g.step(.2);}
  assert.deepEqual(g.simulationErrors,[]);
  assert.equal(p.phase,'complete');
  assert.equal(g.state.production.metrics.foodOutputsProduced.cookedFish,4);
  assert.equal(g.state.production.metrics.foodOutputsLost?.cookedFish||0,0);
  assert.equal(g.state.production.metrics.completed,1);
  assert.ok(foodInventory(g.tribe(0)).cookedFish>3.9);
  assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('legacy paused meal saves receive one full grace interval without resetting the clock on later ticks or reload',()=>{
  let {g,p}=fixture();
  const id=p.id;
  delete p.outputReadyAt;
  g.state.time+=lifetime*2;
  g=decodeGame(encodeGame(g));p=g.state.production.projects.find(q=>q.id===id);
  tickProduction(g,0);
  assert.equal(p.phase,'paused','old saves must not immediately destroy held meals lacking the new clock');
  const readyAt=g.state.time;
  assert.equal(p.outputReadyAt,readyAt);
  g.state.time+=lifetime-1;
  tickProduction(g,0);
  assert.equal(p.phase,'paused');
  g=decodeGame(encodeGame(g));p=g.state.production.projects.find(q=>q.id===id);
  assert.equal(p.outputReadyAt,readyAt);
  g.state.time+=2;
  tickProduction(g,0);
  assert.equal(p.phase,'lost');
  assert.equal(g.state.production.metrics.foodOutputsLost.cookedFish,4);
});
