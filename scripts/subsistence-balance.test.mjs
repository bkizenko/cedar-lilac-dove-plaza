import test from 'node:test';import assert from 'node:assert/strict';
import {outdoorWorkConditions,subsistenceLaborMultiplier,SUBSISTENCE_RULES} from '../src/game/subsistenceBalance.ts';
import {householdAudit} from './diagnostics/subsistence-labor.mjs';
function conditions(temperature,weather='clear'){const g={state:{time:0,weather},world:{},height:()=>4,clockState:()=>({weather:`${temperature}°C`})};return{g,report:outdoorWorkConditions(g,0,0)};}
test('food/timber labor and actual cold/wet exposure are explicit, bounded and leave unrelated extraction unchanged',()=>{
 const warm=conditions(15);assert.equal(warm.report.exposureMultiplier,1);assert.equal(subsistenceLaborMultiplier(warm.g,'food',0,0),SUBSISTENCE_RULES.foodLaborMultiplier);assert.equal(subsistenceLaborMultiplier(warm.g,'wood',0,0),SUBSISTENCE_RULES.timberLaborMultiplier);assert.equal(subsistenceLaborMultiplier(warm.g,'iron',0,0),1);
 for(const[temp,weather]of[[0,'clear'],[-20,'storm'],[-40,'frost'],[45,'drought'],[4,'rain']]){const r=conditions(temp,weather).report;assert.ok(r.exposureMultiplier>1&&r.exposureMultiplier<=SUBSISTENCE_RULES.maximumExposureMultiplier);assert.ok(1/r.exposureMultiplier>=r.minimumProductivityFraction);}
 const rain=conditions(4,'rain').report,dry=conditions(4).report;assert.ok(rain.exposureMultiplier>dry.exposureMultiplier);
});
for(const seed of[42,123456])test(`real five-person manual-camp deliveries are restrained but cover Normal food needs, seed ${seed}`,()=>{
 const before=householdAudit(seed,false),after=householdAudit(seed,true),food=r=>r.delivered.find(u=>u.role==='food'),wood=r=>r.delivered.find(u=>u.role==='wood');
 console.log(JSON.stringify({seed,baseline:{foodPerMinute:food(before).deliveredFoodPerMinute,logsPerMinute:wood(before).deliveredLogsPerMinute},proposed:{foodPerMinute:food(after).deliveredFoodPerMinute,logsPerMinute:wood(after).deliveredLogsPerMinute},actualFoodDemandPerMinute:after.foodConsumed/after.seconds*60,minimumFood:after.minimumFood,final:after.final}));
 assert.equal(after.population,5);assert.equal(after.manual,true);assert.equal(after.difficulty,'normal');assert.equal(after.allResidentsAlive,true);assert.equal(after.emptySeconds,0);assert.ok(after.minimumFood>30);
 assert.ok(food(after).food>after.foodConsumed+after.foodSpoiled,'the camp is sustained by actual delivered output, not merely its opening provisions');assert.ok(after.final.food>=after.initial.food);
 assert.ok(food(after).food<food(before).food*.6);assert.ok(wood(after).wood<wood(before).wood*.6);assert.ok(wood(after).deliveredLogsPerMinute>=8,'timber still funds gradual shelter/store construction');
 assert.deepEqual(after.resourcesAfter,after.resourcesBefore,'no resource-node or animal density reductions');assert.deepEqual(after.initial,before.initial);
});
