import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {BUILDINGS} from '../src/game/constants.ts';
import {measureVillageWorkload,WORKLOAD_RULES} from '../src/game/villageWorkload.ts';
function fixture(){const g=new Game();g.reset(42,13,{size:1040,layout:'continents'});g.enterIsland();g.state.units=g.state.units.filter(u=>u.team===0&&u.type==='worker');g.state.buildings=[];g.state.autoWorkEnabled=false;g.state.haulageProjects=[];for(const u of g.state.units){u.order='hold';u.node=null;u.carry=0;u.jobLock=false;}return g;}
function add(g,type,x=0,z=0){const b=g.makeBld(type,x,z,0);g.state.buildings.push(b);return b;}
function fields(g,count=3){for(let i=0;i<count;i++){const b=add(g,'farm',i*30,0);b.w=BUILDINGS.farm.w*3;b.d=BUILDINGS.farm.d*3;b.crop={year:0,planted:0,tended:0,remaining:0,ripened:false};}}
test('more real queued field work raises workload beyond100%; adults and actual tools reduce it',()=>{
 const g=fixture(),initial=measureVillageWorkload(g);fields(g);const busy=measureVillageWorkload(g);assert.ok(busy.workloadPercent>100);assert.ok(busy.workloadPercent>initial.workloadPercent);assert.equal(busy.tasks.filter(t=>t.category==='Farming').length,3);
 for(const u of g.state.units)u.farmTool='stoneHoe';const tools=measureVillageWorkload(g);assert.ok(tools.demandPersonSeconds<busy.demandPersonSeconds);
 for(let i=0;i<5;i++)g.spawnUnit('worker',0,0,0);const more=measureVillageWorkload(g);assert.ok(more.workloadPercent<tools.workloadPercent);assert.equal(more.adultResidents,10);console.log(JSON.stringify({initialPercent:initial.workloadPercent,threeLargeFieldsPercent:busy.workloadPercent,withStoneHoesPercent:tools.workloadPercent,withTenAdultsPercent:more.workloadPercent,originalCapacityPersonSeconds:busy.capacityPersonSeconds}));
});
test('report is read-only including an untouched new-season crop and paid project state',()=>{
 const g=fixture();fields(g,1);g.state.buildings[0].crop.year=-1;const before=JSON.stringify(g.state),marks=[...g.chopMarks];const report=measureVillageWorkload(g);assert.ok(report.demandPersonSeconds>0);assert.equal(JSON.stringify(g.state),before);assert.deepEqual([...g.chopMarks],marks);
});
test('dependents and guards provide no civilian capacity; fatigue and cargo are counted without duplicating residents',()=>{
 const g=fixture(),base=measureVillageWorkload(g);g.state.units[0].militia=true;g.state.units[0].type='spearman';g.state.units[1].fatigue=.9;g.state.units[1].resting=true;g.state.units[2].carry=10;g.state.units[2].carryType='wood';g.state.units[2].order='return';
 for(let i=0;i<2;i++){const child=g.spawnUnit('worker',0,0,0);child.maturesAt=g.state.time+360;}
 const report=measureVillageWorkload(g);assert.equal(report.dependents,2);assert.equal(report.civilianAdults,4);assert.ok(report.capacityPersonSeconds<base.capacityPersonSeconds);assert.equal(report.people.length,7);assert.ok(report.assignedAdults<=report.civilianAdults);assert.equal(report.people.find(p=>p.id===g.state.units[0].id).capacitySeconds,0);assert.ok(report.people.find(p=>p.id===g.state.units[1].id).restSeconds>0);assert.equal(report.tasks.filter(t=>t.id.startsWith('delivery:')).length,1);
});
test('site construction and shared paid haulage project views are deduplicated',()=>{
 const g=fixture(),b=add(g,'hut');b.build=.25;for(const u of g.state.units.slice(0,2)){u.node=b;u.order='build';u.buildOrder=b.id;}
 const once=measureVillageWorkload(g);assert.equal(once.tasks.filter(t=>t.id===`build:${b.id}`).length,1);const shop=add(g,'workshop',30,0),u=g.state.units[2],work={kind:'sled',progress:3,duration:45,workplace:shop.id,projectId:12345};u.haulageWork={...work};u.order='hold';g.state.haulageProjects=[{id:12345,team:0,actorId:u.id,work:{...work},createdAt:0}];
 const report=measureVillageWorkload(g),jobs=report.tasks.filter(t=>t.id.startsWith('haulage:'));assert.equal(jobs.length,1);const seconds=jobs[0].personSeconds;u.haulageWork=undefined;assert.equal(measureVillageWorkload(g).tasks.find(t=>t.id==='haulage:12345').personSeconds,seconds);
});
test('bench saturation exposes actual waiting below global overload; paused projects and automatic timers are not new labor',()=>{
 const g=fixture(),shop=add(g,'workshop');for(const u of g.state.units.slice(0,4)){u.weaponWork={kind:'spear',progress:0,duration:24,workplace:shop.id};u.workReason='Crafting queued — waiting for a free bench';}
 const report=measureVillageWorkload(g);assert.ok(report.workloadPercent<100);assert.ok(report.tasks.some(t=>t.blocker?.includes('3 crafting benches')));assert.equal(report.waiting.filter(w=>w.reason.includes('bench')).length,4);
 const before=report.demandPersonSeconds;g.state.units[3].weaponWork.paused=true;const paused=measureVillageWorkload(g);assert.ok(paused.demandPersonSeconds<before);assert.ok(paused.pausedPersonSeconds>0);
 shop.queue=[{unit:'spearman',t:0,max:60}];const timed=measureVillageWorkload(g);assert.equal(timed.demandPersonSeconds,paused.demandPersonSeconds);assert.equal(timed.timedQueues.length,1);
});
test('marked trees and the same assigned resource count one backlog; water cargo shares one return trip',()=>{
 const g=fixture(),u=g.state.units[0],tree=g.state.trees.find(t=>g.exploredAt(t.x,t.z)&&t.amount>0);assert.ok(tree);u.order='gather';u.job='wood';u.jobLock=false;u.node=tree;const before=measureVillageWorkload(g);g.chopMarks.add(tree.id);const marked=measureVillageWorkload(g);assert.equal(marked.tasks.find(t=>t.id==='gather:wood').personSeconds,before.tasks.find(t=>t.id==='gather:wood').personSeconds);
 const carrier=g.state.units[1];carrier.carry=10;carrier.carryType='food';carrier.order='return';carrier.waterWork={sourceX:0,sourceZ:0,bankX:0,bankZ:0,phase:'returning',progressSeconds:12,liters:24};const report=measureVillageWorkload(g);assert.equal(report.tasks.filter(t=>t.id===`delivery:${carrier.id}`).length,1);assert.equal(report.tasks.filter(t=>t.id===`water:${carrier.id}`).length,0);assert.ok(report.workloadPercent>=0);assert.equal(report.horizonSeconds,WORKLOAD_RULES.horizonSeconds);
});
