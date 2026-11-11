import test from 'node:test';
import assert from 'node:assert/strict';
import {workerActivity} from '../src/game/workerActivity.ts';
function fixture(recovering){const resident={id:1,team:0,order:'hold',carry:0,itemCargo:{},stuckT:0,tx:12,tz:14,productionProjectId:9};const batch={id:9,team:0,actorId:1,recipe:'fermentMilk',workplace:2,phase:'returning',resumePhase:'returning',progress:30,started:20,blockedReason:'',dairy:{version:1,fermentSeconds:90,elapsedSeconds:90,hotSeconds:0,temperatureCelsius:20,...(recovering?{recovery:{version:1,failedAt:120,reason:'Milk lost',queued:false,waterPaid:true,waterCollected:true,waterDelivered:true,waterCache:{x:0,z:0},cleanedSeconds:20}}:{})}};return {resident,state:{time:150,production:{projects:[batch]},buildings:[{id:2,type:'hearth',x:10,z:11}]}};}
test('vessel-only recovery return reports its actual pottery without ghost fermented food, while normal dairy still reports delivered food',()=>{
 const recovery=fixture(true),before=JSON.stringify(recovery);assert.deepEqual(workerActivity(recovery.state,recovery.resident).batchCargo,['1 fired pottery vessels']);assert.equal(JSON.stringify(recovery),before,'activity reporting is read-only');
 const normal=fixture(false),normalBefore=JSON.stringify(normal);assert.deepEqual(workerActivity(normal.state,normal.resident).batchCargo,['1 fired pottery vessels','3 fermentedMilk']);assert.equal(JSON.stringify(normal),normalBefore);
});
