import {prepareFiniteRaid} from './finite-raid-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {emergencyResponse} from '../src/game/settlement.ts';
import {WEAPONS,beginWeaponWork} from '../src/game/warfare.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

// Match the fixed stream used by the successful before/after regression control.
// Keep it local to each scenario, including the async dynamic-import case.
function seededScenario(fn){return async(...args)=>{
 const previous=Math.random;let state=123456;
 Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 try{return await fn(...args);}finally{Math.random=previous;}
};}

function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];
 for(const key of ['trees','forage','stones','copper','iron','fish','wildlife'])g.state[key]=[];
 g.state.encounter=undefined;g.state.contacts=[];g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.paused=false;g.vision.fill(2);
 g.dayPhase=()=>.5;g.rebuildWalk();
 Object.assign(g.tribe(0),{food:150,wood:0,stone:20,spears:5,bows:0});
 const node=(kind,x)=>({id:g.id(),kind,x,z:48,y:4,amount:500,maxAmt:500,regenT:0,rich:1,scale:1});
 g.state.trees=[node('tree',15),node('tree',22)];g.state.forage=[node('forage',-15),node('forage',-22)];
 return g;
}
function worker(g,x=10){return g.spawnUnit('worker',x,48,0);}
function run(g,seconds){for(let i=0;i<seconds*10;i++)g.step(.1);}

test('priority switches release all old reservations before reassigning and work continues unselected',seededScenario(()=>{
 const g=fixture(),people=[worker(g),worker(g,11),worker(g,12),worker(g,13)];
 for(const [i,u] of people.entries())Object.assign(u,{order:'gather',node:g.state.trees[i%2],job:'wood',jobLock:true,workCheckAt:9999,stuckT:10,blockedTask:g.state.forage[0].id,retryWorkAt:9999});
 g.setLaborPriority('food');assert.ok(people.every(u=>u.job==='food'&&u.order==='gather'));
 assert.ok(people.every(u=>!u.jobLock&&u.stuckT===0&&!u.selected));
 g.setLaborPriority('wood');assert.ok(people.every(u=>u.job==='wood'&&u.order==='gather'));
 assert.equal(people.filter(u=>u.node===g.state.trees[0]).length,2);
 assert.equal(people.filter(u=>u.node===g.state.trees[1]).length,2);
 // Logging now takes four times the former labor; allow a full load and its real return trip.
 run(g,180);assert.ok(g.tribe(0).wood>0,'one priority change produces delivered timber');
 g.setLaborPriority('food');const before=g.state.forage.reduce((n,p)=>n+p.amount,0);run(g,90);
 assert.ok(g.state.forage.reduce((n,p)=>n+p.amount,0)<before,'workers deliver old cargo then gather the new resource');
}));

test('paused crafting and recalled residents rejoin priorities without losing paid work or cargo',seededScenario(()=>{
 const g=fixture(),u=worker(g),v=worker(g,12);
 u.weaponWork={kind:'spear',progress:9,duration:72,workplace:g.state.buildings[0].id,paused:true};u.order='hold';
 Object.assign(v,{recalled:true,stationOnArrival:true,order:'move',carry:5,carryType:'wood'});
 g.setLaborPriority('food');assert.equal(u.job,'food');assert.equal(u.weaponWork.progress,9);assert.equal(u.weaponWork.paused,true);assert.equal(v.stationOnArrival,false);
 run(g,40);assert.equal(v.recalled,undefined);assert.notEqual(v.order,'hold');assert.equal(g.tribe(0).wood,5);assert.equal(u.weaponWork.progress,9);
 const restored=decodeGame(encodeGame(g));assert.equal(restored.state.units.find(p=>p.id===u.id).weaponWork.progress,9);
}));

test('idle armed civilians answer visible sea attacks on nearby buildings and actually fight',seededScenario(()=>{
 const g=fixture(),u=worker(g,10);u.selected=true;assert.equal(g.callToArms(),1);g.clearSelect();
 const hut=g.makeBld('hut',30,48,0);g.state.buildings.push(hut);g.rebuildWalk();
 const enemy=g.spawnUnit('spearman',36,48,3);enemy.hp=20;enemy.order='hold';
 const stock=g.tribe(0).spears;assert.equal(u.order,'hold');
 assert.equal(emergencyResponse(g,u,.1),true);assert.equal(u.target,enemy);
 run(g,35);assert.ok(enemy.hp<=0,JSON.stringify({enemyHP:enemy.hp,unitHP:u.hp,order:u.order,x:u.x,z:u.z,enemyX:enemy.x,enemyZ:enemy.z,reason:u.workReason,emergency:u.emergency,paused:g.state.paused,ended:g.state.ended}));assert.ok(u.hp>0);
 assert.equal(u.militia,false,'the defender automatically resumes civilian work after the raid');assert.equal(g.tribe(0).spears,stock+1,'the real weapon returns to storage once');
}));

test('loaded civilians defend before delivery then return cargo and emergency equipment exactly once',seededScenario(()=>{
 const g=fixture(),u=worker(g);Object.assign(u,{order:'return',carry:5,carryType:'wood'});
 const enemy=g.spawnUnit('spearman',13,48,3);enemy.hp=1;enemy.order='hold';
 const stock=g.tribe(0).spears;run(g,1);assert.ok(enemy.hp<=0);assert.equal(u.carry,5);
 run(g,40);assert.equal(u.emergency,undefined);assert.equal(u.type,'worker');assert.ok(g.tribe(0).wood>=5,'original cargo delivered before taking another load');assert.equal(g.tribe(0).spears,stock);assert.ok(g.tribe(0).wood>=5);
}));

test('alarm does not reveal unseen invaders or recall a distant armed expedition',seededScenario(()=>{
 const g=fixture(),u=worker(g);u.selected=true;g.callToArms();const foe=g.spawnUnit('spearman',30,48,3);g.vision.fill(0);
 assert.equal(emergencyResponse(g,u,.1),false);assert.equal(u.emergency,undefined);
 g.vision.fill(2);u.x=150;assert.equal(emergencyResponse(g,u,.1),false);
 u.x=10;u.order='attackmove';u.tx=100;assert.equal(emergencyResponse(g,u,.1),false,'explicit attack orders retain control');
}));

test('raiders remain combat targets even when a legacy faction hostile flag is false',seededScenario(()=>{
 const g=fixture(),u=g.spawnUnit('spearman',10,48,0),foe=g.spawnUnit('spearman',12,48,3);g.tribe(3).hostile=false;u.order='idle';
 g.combatAI(u,.1);assert.equal(u.target,foe);assert.equal(u.order,'attack');
}));

test('new villages have five spears and two bows; cheaper recipes still spend real materials',seededScenario(()=>{
 const fresh=new Game();fresh.reset(123456,2);fresh.enterIsland();assert.equal(fresh.tribe(0).spears,5);assert.equal(fresh.tribe(0).bows,2);
 const g=fixture();worker(g);Object.assign(g.tribe(0),{wood:2,stone:1});const stock=g.tribe(0).spears;
 assert.equal(beginWeaponWork(g,'spear'),true);assert.equal(g.tribe(0).wood,0);assert.equal(g.tribe(0).stone,0);assert.equal(g.tribe(0).spears,stock);assert.equal(WEAPONS.bow.wood,3);
}));

test('first sight of hostile raiders warns without pausing combat or opening a trade greeting',seededScenario(async()=>{
 const {tickEncounters}=await import('../src/game/encounters.ts');const g=fixture(),u=worker(g);g.spawnUnit('spearman',u.x+5,u.z,3);
 tickEncounters(g);assert.equal(g.state.paused,false);assert.equal(g.state.encounter,undefined);assert.ok(g.state.contacts.includes(3));
}));

test('new village civilians defeat a finite camp raider in the real simulation on two landscapes',seededScenario(()=>{
 for(const seed of [123456,98765]){
  const g=new Game();g.reset(seed,2);g.enterIsland();g.state.conflict='quiet';g.state.paused=false;
  g.state.units=g.state.units.filter(u=>u.team===0);const people=g.state.units.map(u=>u.id);
  prepareFiniteRaid(g);const random=Math.random;try{Math.random=()=>.2;g.spawnRaid();}finally{Math.random=random;}
  const raiders=g.state.units.filter(u=>u.team===3&&u.seaRaid);assert.equal(raiders.length,1);
  for(let i=0;i<4000&&raiders.some(u=>u.hp>0)&&!g.state.paused;i++)g.step(.2);
  assert.equal(g.state.paused,false,`seed ${seed}: no greeting freezes a raid`);
  assert.ok(raiders.every(u=>u.hp<=0),`seed ${seed}: landed raider reaches and is defeated by defenders; `+JSON.stringify(raiders.map(u=>({x:u.x,z:u.z,hp:u.hp,order:u.order,stuck:u.stuckT}))));
  assert.ok(g.state.units.some(u=>people.includes(u.id)&&u.hp>0),'village survives the scout');
 }
}));

test('timber focus reaches known distant forests without crowding or revealing hidden trees',seededScenario(()=>{
 const g=fixture();g.state.trees.forEach((n,i)=>n.x=150+i*12);
 const people=[worker(g),worker(g,11),worker(g,12),worker(g,13)];
 g.setLaborPriority('wood');
 assert.ok(people.every(u=>u.order==='gather'&&u.node?.kind==='tree'));
 assert.equal(people.filter(u=>u.node===g.state.trees[0]).length,2);
 assert.equal(people.filter(u=>u.node===g.state.trees[1]).length,2);
 run(g,180);assert.ok(g.tribe(0).wood>0,'distant timber is physically delivered, not merely assigned');
 const unseen=fixture();unseen.state.trees.forEach(n=>n.x=160);unseen.vision.fill(0);const u=worker(unseen);
 unseen.setLaborPriority('wood');assert.notEqual(u.order,'gather');
}));


test('a distant finite camp dispatch sends no banner or horn',seededScenario(()=>{
 const g=new Game();g.reset(123456,2);g.enterIsland();
 prepareFiniteRaid(g);const banners=[],sounds=[];
 g.banner=message=>banners.push(message);
 g.onSfx=sound=>sounds.push(sound);
 g.spawnRaid();
 assert.ok(g.state.units.some(u=>u.team===3&&u.seaRaid));
 assert.deepEqual(banners,[]);
 assert.ok(!sounds.includes('horn'));
}));
