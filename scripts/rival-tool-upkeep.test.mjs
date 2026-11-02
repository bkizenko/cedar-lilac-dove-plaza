import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Game} from '../src/game/sim.ts';
import {beginFarmToolRepair,farmToolRepairIssue,farmToolCondition} from '../src/game/farmTools.ts';
import {reviewRivalToolUpkeep,RIVAL_TOOL_UPKEEP_RULES} from '../src/game/rivalToolUpkeep.ts';
import {rivalMaterialReserves} from '../src/game/rivalDevelopment.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(1,14,{size:1040,layout:'pangaea'});g.enterIsland();g.state.paused=false;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 const team=1,home=g.campOf(team),t=g.tribe(team);Object.assign(t,{wood:120,stone:80,food:2000,foodLots:{provisions:2000},seeds:40,cultivated:['grain'],thinkT:0});t.survival.waterLiters=200;
 for(const u of g.state.units)u.order='hold';const residents=g.state.units.filter(u=>u.team===team&&u.type==='worker').slice(0,4),u=residents[0];g.state.units=g.state.units.filter(v=>v.team!==team||residents.includes(v));u.farmTool='stoneHoe';u.farmToolCondition=.2;
 // An established native village is a declared finite starting fixture. No
 // terrain, body position, stock or completed-building writes occur after start.
 function place(type){for(let r=12;r<50;r+=4)for(let i=0;i<24;i++){const x=home.x+Math.cos(i*Math.PI/12)*r,z=home.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,team))continue;assert.equal(g.placeBuilding(type,x,z,team),true);const b=g.state.buildings.at(-1);b.build=1;b.plannedCost=undefined;return b;}throw Error('No native legal '+type);}
 const hall=place('townhall'),site=place('workshop'),field=place('farm');return {g,team,u,site,field,residents};
}
function tick(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done()){g.step(.2);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify(g.state.units.filter(u=>u.team===1).map(u=>({id:u.id,order:u.order,work:u.farmToolWork,condition:u.farmToolCondition,reason:u.workReason,buildOrder:u.buildOrder,lock:u.jobLock,carry:u.carry,drill:u.drill,rest:u.resting,water:u.waterWork,weapon:u.weaponWork,haulage:u.haulageWork,husbandry:u.husbandryWork,stock:g.tribe(1).wood,reserves:rivalMaterialReserves(g,1)}))));}

test('repair admission defaults to player, explicitly shares actual rival materials and actor ownership without player banners',()=>{
 const {g,team,u,site}=fixture(),before={wood:g.tribe(team).wood,stone:g.tribe(team).stone};
 assert.ok(farmToolRepairIssue(g,u.id,site.id));assert.equal(beginFarmToolRepair(g,u.id,site.id),false);const playerBanner=g.state.banner;
 assert.equal(beginFarmToolRepair(g,u.id,site.id,team),true);assert.equal(g.state.banner,playerBanner);assert.equal(g.tribe(team).wood,before.wood-1);assert.equal(g.tribe(team).stone,before.stone-1);assert.equal(u.farmToolWork.mode,'repair');assert.equal(beginFarmToolRepair(g,u.id,site.id,team),false);assert.equal(g.tribe(team).wood,before.wood-1);assert.ok(farmToolRepairIssue(g,u.id,site.id,2));
});

test('native upkeep preserves paid pauses, protected assignments, reserve needs and bounded review cadence',()=>{
 const {g,team,u,site,residents}=fixture();const tr=g.tribe(team),before=tr.wood;
 residents[1].scout={};residents[2].scout={};assert.equal(reviewRivalToolUpkeep(g,team),false,'two other adults must remain at home');delete residents[1].scout;delete residents[2].scout;g.state.time+=20;u.jobLock=true;assert.equal(reviewRivalToolUpkeep(g,team),false);u.jobLock=false;assert.equal(reviewRivalToolUpkeep(g,team),false,'same review has no second scan/admission');g.state.time+=RIVAL_TOOL_UPKEEP_RULES.reviewSeconds;
 u.carry=1;assert.equal(reviewRivalToolUpkeep(g,team),false);u.carry=0;g.state.time+=20;u.buildOrder=site.id;assert.equal(reviewRivalToolUpkeep(g,team),false);delete u.buildOrder;g.state.time+=20;u.productionProjectId=77;assert.equal(reviewRivalToolUpkeep(g,team),false);delete u.productionProjectId;g.state.time+=20;
 const reserve=rivalMaterialReserves(g,team);tr.stone=reserve.stone;assert.equal(reviewRivalToolUpkeep(g,team),false);tr.stone=150;g.state.time+=20;tr.food=0;assert.equal(reviewRivalToolUpkeep(g,team),false);tr.food=2000;g.state.time+=20;
 assert.equal(reviewRivalToolUpkeep(g,team),true);assert.equal(tr.wood,before-1);u.farmToolWork.paused=true;u.order='hold';g.state.time+=20;assert.equal(reviewRivalToolUpkeep(g,team),true);assert.equal(u.farmToolWork.paused,false);assert.equal(tr.wood,before-1,'paid repair resumed without charge');assert.equal(residents.filter(v=>v.farmToolWork).length,1);
});

test('ordinary native Game.step review walks, pays once, saves paused repair, resumes and returns to finite ordinary labor',()=>{
 let {g,team,u,site,field}=fixture();Object.assign(g.tribe(team),{wood:600,stone:150,food:300,foodLots:{provisions:300},thinkT:30});const id=u.id,terrain=Buffer.from(g.world.heights.buffer).toString('base64'),initial={wood:g.tribe(team).wood,stone:g.tribe(team).stone},start={x:u.x,z:u.z},construction=[];function instrument(){const spend=g.spend.bind(g);g.spend=(which,cost)=>{const t=g.tribe(team),before={wood:t.wood,stone:t.stone};spend(which,cost);if(which===team)construction.push({cost:structuredClone(cost),wood:before.wood-t.wood,stone:before.stone-t.stone});};}instrument();function expected(kind){const delivered=g.state.simulationEvents?.totals?.[`cargo_delivered:${team}:${kind}`]||0;return initial[kind]-1-construction.reduce((n,c)=>n+c[kind],0)+delivered-(kind==='wood'?g.tribe(team).survival.fuelBurnedWood:0);}
 // Actual field labor crosses the policy threshold; the public loop then
 // selects and admits repair without an explicit repair/planner command.
 u.farmToolCondition=.5005;u.order='gather';u.job='food';u.node=field;
 tick(g,240,()=>!!u.farmToolWork);assert.ok(field.crop.planted>0);assert.ok(u.farmToolCondition<.5005);const worn=u.farmToolCondition;assert.equal(u.farmToolWork.mode,'repair');assert.equal(g.tribe(team).wood,expected('wood'));assert.equal(g.tribe(team).stone,expected('stone'));assert.equal(u.farmToolWork.progress,0,'walking is not repair labor');
 tick(g,90,()=>u.farmToolWork.progress>=2);const progress=u.farmToolWork.progress;assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>2);const paid={wood:g.tribe(team).wood,stone:g.tribe(team).stone};
 g.interruptMission(u);assert.equal(u.farmToolWork.paused,true);const raw=encodeGame(g);g=decodeGame(raw);instrument();g.state.paused=false;u=g.state.units.find(v=>v.id===id);assert.equal(u.farmToolWork.progress,progress);assert.equal(u.farmToolCondition,worn);
 tick(g,180,()=>!u.farmToolWork);assert.equal(farmToolCondition(u),1);assert.equal(u.farmTool,'stoneHoe');assert.equal(g.tribe(team).wood,expected('wood'));assert.equal(g.tribe(team).stone,expected('stone'));
 tick(g,90,()=>['gather','build'].includes(u.order)&&!!u.node);const resumedTarget=u.node,resumedBefore={build:resumedTarget.build,amount:resumedTarget.amount,planted:resumedTarget.crop?.planted,gatherT:u.gatherT,carry:u.carry};tick(g,90,()=>resumedTarget.build>resumedBefore.build||resumedTarget.amount<resumedBefore.amount||resumedTarget.crop?.planted>resumedBefore.planted||u.gatherT>resumedBefore.gatherT||u.carry>resumedBefore.carry);assert.equal(u.farmToolWork,undefined);assert.equal(Buffer.from(g.world.heights.buffer).toString('base64'),terrain);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 assert.equal(g.tribe(team).wood,expected('wood'));assert.equal(g.tribe(team).stone,expected('stone'));
 const report={base:'1a90ade',scenario:'controlled established native village, no midrun material/body/terrain correction',actor:id,team,workplace:site.id,field:field.id,initial,construction,actualFieldWear:{initial:.5005,atRepair:worn,sown:field.crop.planted},resumedOrdinaryWork:{target:resumedTarget.id,before:resumedBefore,after:{build:resumedTarget.build,amount:resumedTarget.amount,planted:resumedTarget.crop?.planted,gatherT:u.gatherT,carry:u.carry}},paidRepair:{wood:1,stone:1},progressBeforeInterruption:progress,final:{condition:farmToolCondition(u),order:u.order,job:u.job,nodeId:u.node?.id,time:g.state.time},simulationErrors:g.simulationErrors};if(process.env.HEARTHWILD_RIVAL_TOOL_REPORT)writeFileSync(process.env.HEARTHWILD_RIVAL_TOOL_REPORT,JSON.stringify(report,null,2)+'\n');
});
