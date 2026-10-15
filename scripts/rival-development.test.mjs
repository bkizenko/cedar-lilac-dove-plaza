import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {AGE_COST} from '../src/game/constants.ts';
import {foodDemand} from '../src/game/settlement.ts';
import {rivalCanInvest,rivalDevelopmentPlan,rivalMaterialPriority,rivalKnows,rivalWorkRange,developRivalResources} from '../src/game/rivalDevelopment.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {scoutKnowledge} from '../src/game/scouting.ts';

function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);
 g.state.buildings=[g.makeBld('townhall',0,38,1)];g.state.units=[];
 g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.fish=[];g.state.wildlife=[];
 g.state.time=200;g.state.weather='clear';g.state.rivalKnowledge=[];
 Object.assign(g.tribe(1),{food:800,wood:90,stone:10,age:0,cultivated:['grain']});
 for(let i=0;i<10;i++)g.spawnUnit('worker',5+i%3,46+Math.floor(i/3),1);
 g.rebuildWalk();return g;
}
function tree(g,x,z){return {id:g.id(),kind:'tree',x,y:4,z,amount:30,maxAmt:30,regenT:0,scale:1,rich:1};}
function baseEconomy(g){for(let i=0;i<5;i++)g.state.buildings.push(g.makeBld('farm',-25+i*11,70,1));g.state.buildings.push(g.makeBld('warehouse',-20,38,1));g.rebuildWalk();}

test('successful rivals reserve advancement materials instead of endlessly adding optional fields and stores',()=>{
 const g=fixture();baseEconomy(g);const cost=AGE_COST[1];
 while(g.popNow(1)<cost.pop)g.spawnUnit('worker',5,50,1);
 while(g.state.buildings.filter(b=>b.type==='farm').length<rivalDevelopmentPlan(g,1).foodFields)g.state.buildings.push(g.makeBld('farm',50,70,1));
 g.state.buildings.push(g.makeBld('workshop',40,38,1));
 Object.assign(g.tribe(1),{wood:cost.wood+5,stone:cost.stone+5});
 assert.equal(rivalDevelopmentPlan(g,1).saving,true);
 assert.equal(rivalCanInvest(g,1,'farm'),false);
 assert.equal(rivalCanInvest(g,1,'cairn'),false);
 assert.equal(rivalCanInvest(g,1,'warehouse'),true,'second protective store remains essential');
 // Fifty residents need more stores than the old sixteen-person age fixture.
 while(g.stockCap(1)<Math.max(foodDemand(g,1,0)*900+80,cost.food+40))g.state.buildings.push(g.makeBld('warehouse',-20,55,1));
 assert.equal(rivalCanInvest(g,1,'warehouse'),false);
 g.tribe(1).wood=cost.wood+30;assert.equal(rivalCanInvest(g,1,'farm'),true,'surplus beyond the reserve can be spent');
 const before=g.tribe(1).age;g.tryAgeUp(1);
 assert.equal(g.tribe(1).age,before+1);assert.equal(g.tribe(1).wood,cost.wood+30);assert.equal(g.tribe(1).stone,cost.stone+5);
});

test('survival needs may use reserves but investment cannot exceed real stock or queue endless construction',()=>{
 const g=fixture();baseEconomy(g);g.state.buildings=g.state.buildings.filter((b,i)=>b.type!=='farm'||i<4);g.tribe(1).food=40;g.tribe(1).wood=22;
 assert.equal(rivalCanInvest(g,1,'farm'),true);
 assert.equal(rivalCanInvest(g,1,'quarry'),false);
 const site=g.makeBld('farm',30,70,1);site.build=.5;g.state.buildings.push(site);
 assert.equal(rivalCanInvest(g,1,'farm'),false);
});

test('material priorities recruit a limited share and yield to a food emergency',()=>{
 const g=fixture(),u=g.state.units[0];baseEconomy(g);g.tribe(1).wood=0;
 assert.ok(rivalMaterialPriority(g,u,'wood')>0);
 for(const v of g.state.units.slice(1,3))Object.assign(v,{order:'gather',job:'wood'});
 assert.equal(rivalMaterialPriority(g,u,'wood'),0,'ten workers assign at most two boosted wood jobs');
 g.tribe(1).food=20;assert.equal(rivalMaterialPriority(g,u,'stone'),0);
 assert.equal(rivalMaterialPriority(g,u,'food'),0);
});

test('remote resources remain unknown until a resident observes them',()=>{
 const g=fixture();for(let i=0;i<6;i++)g.state.trees.push(tree(g,112+i%3*3,38+Math.floor(i/3)*4));
 assert.equal(rivalKnows(g,1,115,40),false);
 const before=g.tribe(1).wood;assert.equal(developRivalResources(g,1),false);assert.equal(g.tribe(1).wood,before);
 const scout=g.state.units[0];scout.x=105;scout.z=38;scoutKnowledge(g,scout);scout.x=5;scout.z=46;
 g.state.time+=26;assert.equal(rivalKnows(g,1,115,40),true);
 assert.equal(developRivalResources(g,1),true);
 const camp=g.state.buildings.find(b=>b.type==='lumber');assert.ok(camp);
 assert.equal(g.tribe(1).wood,before-16);assert.equal(camp.build,0,'paid plans require construction');
 assert.equal(rivalWorkRange(g,1,115,40,'wood'),true,'known woods allow hand cutting before the optional camp is complete');
 const builder=g.state.units.find(u=>u.node===camp);assert.ok(builder);
 for(let i=0;i<1000&&camp.build<1;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(builder,.1);}
 assert.equal(camp.build,1,'a real resident walks to and builds the camp');
 assert.equal(rivalWorkRange(g,1,115,40,'wood'),true);
 assert.equal(rivalWorkRange(g,1,115,40,'food'),false);
 const saved=decodeGame(encodeGame(g));assert.equal(saved.state.buildings.find(b=>b.id===camp.id).build,1);
});

test('an established distant lumber camp permits ordinary harvesting with physical cargo',()=>{
 const g=fixture(),u=g.state.units[0];
 const n=tree(g,121,38);g.state.trees=[n];const camp=g.makeBld('lumber',112,38,1);g.state.buildings.push(camp);g.rebuildWalk();
 u.order='idle';u.job='wood';u.jobLock=true;g.workBoard.reset();g.workBoard.assign(g,u);
 assert.equal(u.node,n,'a completed remote workplace overcomes the old hall-radius restriction');
 const before=g.tribe(1).wood;
 for(let i=0;i<1500&&u.carry===0;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);}
 assert.ok(u.carry>0);assert.equal(g.tribe(1).wood,before,'goods remain with the carrier until returned');
});

test('both rivals can pay for a reachable quarry instead of depending on a faction-specific build preference',()=>{
 const g=fixture();g.state.stones=[{...tree(g,45,38),kind:'stone',amount:150,maxAmt:150}];
 g.state.trees=Array.from({length:12},(_,i)=>tree(g,-30+i*3,38));
 const before=g.tribe(1).wood;assert.equal(developRivalResources(g,1),true);
 const q=g.state.buildings.find(b=>b.type==='quarry');assert.ok(q);assert.equal(q.build,0);
 assert.equal(g.tribe(1).wood,before-36);
 g.state.buildings[0].team=2;g.state.buildings=g.state.buildings.filter(b=>b!==q);
 for(const u of g.state.units){u.team=2;u.node=null;u.order='idle';}
 Object.assign(g.tribe(2),{food:800,wood:90,stone:0});g.rebuildWalk();
 assert.equal(developRivalResources(g,2),true);assert.ok(g.state.buildings.some(b=>b.type==='quarry'&&b.team===2));
});


test('an impoverished rival can physically harvest discovered timber without purchasing a camp',()=>{
 const g=fixture(),u=g.state.units[0];g.tribe(1).wood=0;
 const n=tree(g,122,38);g.state.trees=[n];
 g.workBoard.reset();u.order='idle';u.job='wood';u.jobLock=true;g.workBoard.assign(g,u);
 assert.notEqual(u.node,n,'unknown woods cannot be targeted');
 const scout=g.state.units[1];scout.x=118;scout.z=38;scoutKnowledge(g,scout);scout.x=6;scout.z=46;
 g.state.time+=2;g.workBoard.reset();g.workBoard.assign(g,u);assert.equal(u.node,n);
 for(let i=0;i<1800&&u.carry===0;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);}
 assert.ok(u.carry>0);assert.equal(g.tribe(1).wood,0,'harvest must still be carried home');
 assert.ok(!g.state.buildings.some(b=>b.type==='lumber'));
});

test('a known mountainside supports a paid distant quarry, then prevents duplicate seams',()=>{
 const g=fixture();g.world.heights.fill(12);g.rebuildWalk();
 const scout=g.state.units[0];scout.x=100;scout.z=38;scoutKnowledge(g,scout);scout.x=5;scout.z=46;
 g.state.trees=Array.from({length:12},(_,i)=>tree(g,-30+i*3,38));
 assert.equal(developRivalResources(g,1),true);
 const q=g.state.buildings.find(b=>b.type==='quarry');assert.ok(q);q.build=1;q.excavation=undefined;
 g.state.time+=26;const count=g.state.buildings.length;
 assert.equal(developRivalResources(g,1),false);assert.equal(g.state.buildings.length,count);
});

test('small settlements preserve a resource-access budget before optional projects',()=>{
 const g=fixture();g.state.units=g.state.units.slice(0,5);g.tribe(1).wood=60;
 assert.equal(rivalCanInvest(g,1,'barracks'),false);
 assert.equal(rivalCanInvest(g,1,'farm'),true,'first food fields can use timber');
 assert.equal(rivalCanInvest(g,1,'quarry'),true,'material access is a real paid investment');
});

test('Bronze rivals count working militia and do not pay to arm the same adults repeatedly',()=>{
 const g=fixture();baseEconomy(g);g.tribe(1).age=1;
 const bar=g.makeBld('barracks',25,38,1);g.state.buildings.push(bar,g.makeBld('hut',25,60,1));g.rebuildWalk();
 for(const u of g.state.units.slice(0,5))u.militia=true;
 Object.assign(g.tribe(1),{food:1200,wood:155,stone:65,thinkT:0});
 g.placeBuilding=()=>null;
 const oldRandom=Math.random;Math.random=()=>.99;
 try {g.rivalTick(1,1);}finally{Math.random=oldRandom;}
 assert.equal(bar.queue.length,0,'five armed working adults already fill the Bronze military target');
 const armed=g.state.units[0],next=g.state.units[5];
 armed.hp=20;armed.order='idle';next.order='idle';
 bar.queue=[{unit:'spearman',t:5,max:5}];g.updateTraining(.1);
 assert.equal(armed.hp,20,'training cannot rearm/heal an existing militia adult');
 assert.equal(next.militia,true,'the next eligible unarmed adult completes training');
 assert.equal(next.type,'worker','early militia remain working residents');
 for(const u of g.state.units)u.militia=true;
 const before={food:g.tribe(1).food,wood:g.tribe(1).wood};
 bar.queue=[{unit:'spearman',t:5,max:5}];g.updateTraining(.1);
 assert.equal(g.tribe(1).food,before.food+28);assert.equal(g.tribe(1).wood,before.wood+6,'obsolete paid orders refund when no eligible adult remains');
 g.tribe(1).age=3;bar.queue=[{unit:'spearman',t:5,max:5}];g.updateTraining(.1);
 assert.equal(armed.type,'spearman','later professional training may promote an existing militia adult');
 assert.equal(armed.militia,false);
});

test('food infrastructure scales with population while housing stops at a useful capacity',()=>{
 const g=fixture();baseEconomy(g);
 for(let i=0;i<10;i++)g.spawnUnit('worker',i%4,55+Math.floor(i/4),1);
 Object.assign(g.tribe(1),{food:1400,wood:155,stone:65});
 assert.ok(rivalDevelopmentPlan(g,1).foodFields>5);
 assert.equal(rivalCanInvest(g,1,'farm'),true,'families need fields before an age reserve');
 assert.equal(rivalCanInvest(g,1,'warehouse'),true);
 for(let i=0;i<4;i++)g.state.buildings.push(g.makeBld('hut',35+i*7,65,1));
 assert.equal(rivalCanInvest(g,1,'hut'),false,'do not fill all open land with unoccupied huts');
});

test('remote mine jobs remain available from home and a timber surplus stops needless camps',()=>{
 const g=fixture(),u=g.state.units[0];g.world.heights.fill(12);g.rebuildWalk();
 const q=g.makeBld('quarry',130,38,1);g.state.buildings.push(q);g.rebuildWalk();
 u.order='idle';u.job='stone';u.jobLock=true;g.workBoard.reset();g.workBoard.assign(g,u);
 assert.equal(u.node,q,'home workers can physically travel to an established remote mine');
 const scout=g.state.units[1];scout.x=110;scout.z=38;scoutKnowledge(g,scout);scout.x=5;scout.z=46;
 g.state.trees=Array.from({length:7},(_,i)=>tree(g,115+i%3*3,38+Math.floor(i/3)*4));
 Object.assign(g.tribe(1),{wood:AGE_COST[1].wood+100,stone:AGE_COST[1].stone+10});
 assert.equal(developRivalResources(g,1),false,'existing supplies cover the age reserve and construction margin');
});

test('trained working militia physically defend with their own spear, then resume civilian jobs',async()=>{
 const {emergencyResponse}=await import('../src/game/settlement.ts');
 const g=fixture();g.tribe(1).age=1;g.tribe(1).hostile=true;g.tribe(1).spears=0;g.tribe(1).bows=0;
 g.state.buildings.push(g.makeBld('hut',25,65,1));
 const bar=g.makeBld('barracks',25,38,1);g.state.buildings.push(bar);
 bar.queue=[{unit:'spearman',t:5,max:5}];g.updateTraining(.1);
 const u=g.state.units.find(u=>u.militia);assert.ok(u);u.hp=40;u.job='wood';u.jobLock=true;u.order='gather';
 const foe=g.spawnUnit('worker',u.x+1.7,u.z,0);foe.hp=100;foe.maxHp=100;
 const previous={hp:u.hp,dmg:u.dmg,range:u.range,food:g.tribe(1).food,wood:g.tribe(1).wood};
 assert.equal(emergencyResponse(g,u,.1),true);assert.ok(foe.hp<100,'spear actually damages the nearby invader');
 assert.equal(u.emergency.autoArmed,false,'existing equipment was not borrowed again');
 assert.equal(u.hp,previous.hp);assert.equal(g.tribe(1).spears,0);assert.equal(g.tribe(1).food,previous.food);assert.equal(g.tribe(1).wood,previous.wood);
 foe.hp=0;g.state.time+=11;assert.equal(emergencyResponse(g,u,.1),false);
 assert.equal(u.type,'worker');assert.equal(u.militia,true);assert.equal(u.dmg,previous.dmg);assert.equal(u.range,previous.range);
 assert.equal(g.tribe(1).spears,0,'permanent equipment is not duplicated into the armory');assert.equal(u.job,'wood');assert.equal(u.jobLock,true);
 g.state.trees=[tree(g,u.x+4,u.z)];g.workBoard.reset();g.workBoard.assign(g,u);
 assert.equal(u.order,'gather');assert.equal(u.node,g.state.trees[0]);
});

test('hostile rivals dispatch trained working militia and their actual raid orders move toward the target',async()=>{
 const {emergencyResponse,neighborIntent}=await import('../src/game/settlement.ts');
 const g=fixture();baseEconomy(g);g.state.time=800;g.tribe(0).food=100;
 Object.assign(g.tribe(1),{age:1,food:1200,wood:155,stone:65,hostile:true,ally:false,trust:0,tension:1,lastRaid:0,thinkT:0,recoveryUntil:0,compactUntil:0});
 for(const u of g.state.units.slice(0,5)){u.militia=true;u.dmg=12;u.range=2.6;}
 const target=g.makeBld('hut',100,38,0);g.state.buildings.push(target,g.makeBld('barracks',25,38,1));g.rebuildWalk();g.placeBuilding=()=>null;
 assert.equal(neighborIntent(g,1),'raid');
 const oldRandom=Math.random;Math.random=()=>0;try{g.rivalTick(1,.1);}finally{Math.random=oldRandom;}
 const raider=g.state.units.find(u=>u.pillage===0&&u.order==='attackmove');assert.ok(raider);assert.equal(raider.type,'worker');assert.equal(raider.target,target);
 const distance=Math.hypot(raider.x-target.x,raider.z-target.z);
 for(let i=0;i<120;i++){g.state.time+=.1;g.navBudget=4;assert.equal(emergencyResponse(g,raider,.1),false);g.workerAI(raider,.1);}
 assert.ok(Math.hypot(raider.x-target.x,raider.z-target.z)<distance-10,'the real worker/combat pipeline advances the raider');
});
