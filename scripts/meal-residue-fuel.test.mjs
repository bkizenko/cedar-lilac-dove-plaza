import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {beginProduction,pauseProductionProject,resumeProduction} from '../src/game/production.ts';
import {productionFuelAvailable,productionFuelLabel} from '../src/game/mealFuel.ts';
import {reviewAutomaticFoodProcessing} from '../src/game/cerealProcessing.ts';
let opening;
function fixture(){opening??=nativeDairyVillage();const g=decodeGame(structuredClone(opening.save));return {g,hearth:opening.hearth,u:g.state.units.find(u=>u.id===opening.worker)};}
function finish(g,id){const end=g.state.time+180;while(g.state.time<end&&!g.state.production.projects.some(p=>p.id===id&&p.phase==='complete')){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.equal(g.state.production.projects.find(p=>p.id===id).phase,'complete');}
test('native cook pays real chaff once, keeps paid progress across pause/reload, and physically delivers a meal',()=>{
 let {g,hearth,u}=fixture();const t=g.tribe(0);t.wood=0;Object.assign(t.items,{rawMeat:4,chaff:8});
 if(process.env.MEAL_RESIDUE_NATIVE_SAVE){g.state.paused=true;writeFileSync(process.env.MEAL_RESIDUE_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
 assert.equal(beginProduction(g,'cookMeat',hearth,u.id),true);const id=u.productionProjectId;
 assert.equal(t.items.chaff,0);assert.equal(t.items.rawMeat,0);assert.equal(t.wood,0);assert.equal(g.state.production.metrics.logsUsed,0);assert.equal(g.state.production.metrics.consumed.chaff,8);assert.equal(t.survival.residueFuel.woodEquivalentDelivered,1);
 assert.equal(pauseProductionProject(g,id),true);g=decodeGame(structuredClone(encodeGame(g)));assert.equal(resumeProduction(g,id),true);finish(g,id);
 assert.equal(g.state.production.metrics.consumed.chaff,8);assert.equal(g.state.production.metrics.edibleFoodProduced,4);assert.equal(g.tribe(0).wood,0);assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(g))));
});
test('native automatic grain meals use residue fuel even with Auto work off and no delivered logs',()=>{
 const {g}=fixture(),t=g.tribe(0);t.wood=0;t.food=16;t.foodLots={grain:16};Object.assign(t.items,{chaff:32});
 assert.equal(g.state.autoWorkEnabled,false);assert.equal(reviewAutomaticFoodProcessing(g,0),true);
 const jobs=g.state.production.projects;assert.ok(jobs.length>0);assert.ok(jobs.every(p=>p.recipe==='cookPorridge'));assert.equal(g.state.production.metrics.logsUsed,0);assert.equal(g.state.production.metrics.consumed.chaff,jobs.length*8);const id=jobs[0].id;
 finish(g,id);assert.ok(g.state.production.metrics.foodOutputsProduced.porridge>=4);assert.equal(g.state.autoWorkEnabled,false);
});
test('residue eligibility protects industrial feedstock, smoking fuel and the existing animal reserve, with mixed fuel paid accurately',()=>{
 const {g,hearth,u}=fixture(),t=g.tribe(0);t.wood=.25;Object.assign(t.items,{chaff:2,straw:6,rawMeat:4});g.state.livestock=[{id:g.state.nextId++,team:0,hp:1}];
 assert.equal(productionFuelAvailable(g,0,'cookMeat',1),true);for(const recipe of ['makeCharcoal','smokeFish','smokeMeat','brewBeer','fireClay'])assert.equal(productionFuelAvailable(g,0,recipe,1),false,recipe);
 assert.match(productionFuelLabel('cookMeat',1,true),/8 chaff/);assert.match(productionFuelLabel('makeCharcoal',8),/^8 logs$/);
 assert.equal(beginProduction(g,'cookMeat',hearth,u.id),true);assert.equal(t.items.chaff,0);assert.equal(t.items.straw,4);assert.equal(t.wood,0);assert.equal(g.state.production.metrics.logsUsed,.25);assert.equal(g.state.production.metrics.consumed.chaff,2);assert.equal(g.state.production.metrics.consumed.straw,2);
});
