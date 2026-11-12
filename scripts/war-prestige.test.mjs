import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {settledWarPrestige,WAR_PRESTIGE_RULES} from '../src/game/warPrestige.ts';
import {tickCapitulation,acceptCapitulation,refuseCapitulation,CAPITULATION_RULES} from '../src/game/capitulation.ts';
import {releaseDomination} from '../src/game/domination.ts';
import {collectOwnPrestige,gamePrestigeView} from '../src/game/prestigeGame.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const hash=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
const pureFront=(extra={})=>({id:1,hallId:10,attackerTeam:0,defenderTeam:1,phase:'accepted',outcome:'occupy',openedAt:10,resolvedAt:20,...extra});
const pureState=fronts=>({time:100,buildings:[{id:10,team:1,hp:100}],capitulation:{version:1,fronts}});

test('only uniquely identified settled aims score once; pending/refusal/stalemate/kills and impossible dates are not victories',()=>{
 const s=pureState([pureFront(),pureFront(),...['pressed','capitulated','refused','expired'].map((phase,i)=>pureFront({id:i+2,phase})),pureFront({id:20,resolvedAt:101}),pureFront({id:21,resolvedAt:5}),pureFront({id:22,resolvedAt:undefined}),pureFront({id:23,outcome:undefined})]);
 const before=JSON.stringify(s),random=Math.random;let draws=0;Math.random=()=>{draws++;return .5;};let report;
 try{report=settledWarPrestige(s);}finally{Math.random=random;}
 assert.deepEqual(report,{value:1,achieved:1,held:0,frontIds:[1]});assert.equal(JSON.stringify(s),before);assert.equal(draws,0);
 assert.equal(settledWarPrestige({...s,capitulation:undefined}).value,0);assert.equal(settledWarPrestige({...s,capitulation:{version:1,fronts:[]},conflictJournal:{kills:10000}}).value,0);
 for(const outcome of ['occupy','annex','raze','loot','captives'])assert.equal(settledWarPrestige(pureState([pureFront({outcome})])).value,WAR_PRESTIGE_RULES.weights[outcome]);
});

test('relief requires a living still-owned hall; domination credit requires the exact unique currently active accepted arrangement',()=>{
 const held=pureState([pureFront({phase:'relieved',outcome:undefined})]);assert.equal(settledWarPrestige(held,1).held,1);assert.equal(settledWarPrestige(held,0).value,0);
 for(const buildings of [[],[{id:10,team:1,hp:0}],[{id:10,team:2,hp:100}]])assert.equal(settledWarPrestige({...held,buildings},1).value,0);
 for(const outcome of ['tribute','puppet','autonomy']){
  const s=pureState([pureFront({outcome})]),d={id:30,hallId:10,overlord:0,subject:1,origin:'capitulation',terms:outcome,createdAt:20,phase:'active'};s.dominations={version:1,list:[d]};assert.equal(settledWarPrestige(s).value,WAR_PRESTIGE_RULES.weights[outcome]);
  for(const change of [{phase:'released'},{phase:'lapsed'},{phase:'rebelled'},{createdAt:21},{createdAt:101},{origin:'occupation'},{overlord:2},{subject:2},{hallId:11},{terms:'other'}])assert.equal(settledWarPrestige({...s,dominations:{version:1,list:[{...d,...change}]}}).value,0,JSON.stringify(change));
  assert.equal(settledWarPrestige({...s,dominations:{version:1,list:[d,{...d,id:31}]}}).value,0);assert.equal(settledWarPrestige({...s,dominations:undefined}).value,0);
 }
});

function controlledSurrender(){
 // Controlled finite opening tests the actual measured front and acceptance
 // executors. Declared casualty changes are not a full combat/campaign proof.
 const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.waterBodies=[];g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,30,0),g.makeBld('townhall',80,30,1),g.makeBld('hut',95,30,1)];g.state.campSites=[{team:0,x:0,z:30}];g.state.time=100;g.state.weather='clear';
 for(const team of [0,1])Object.assign(g.tribe(team),{alive:true,food:300,foodLots:{provisions:300},wood:100,stone:50});
 const hall=g.state.buildings[1],residents=Array.from({length:6},(_,i)=>g.spawnUnit('worker',84+i,42,1)),defenders=[g.spawnUnit('spearman',82,38,1),g.spawnUnit('spearman',83,38,1)],party=Array.from({length:6},(_,i)=>g.spawnUnit('spearman',76+i*.5,40,0));
 for(const u of [...residents,...defenders,...party]){u.order='hold';if(u.team===1)u.homeHall=hall.id;}
 g.vision.fill(2);g.rebuildWalk();g.makeHostile(1);tickCapitulation(g);const front=g.state.capitulation.fronts.find(f=>f.hallId===hall.id&&f.attackerTeam===0);assert.ok(front);
 g.state.time+=170;tickCapitulation(g);assert.equal(front.phase,'pressed');for(const u of [...defenders,...residents.slice(0,2)])u.hp=0;
 // Losses alone need not cross every personality threshold. A finite exhausted
 // food reserve is additional measured pressure, not a forced phase or score.
 g.tribe(1).food=0;g.tribe(1).foodLots={};for(let i=0;i<125&&front.phase==='pressed';i++){g.state.time+=1;tickCapitulation(g);}assert.equal(front.phase,'capitulated',front.reason);
 return {g,hall,front};
}

test('actual accepted occupation scores exactly once through strict reload; refused terms alone and foreign private war totals remain hidden',()=>{
 const {g,front}=controlledSurrender();assert.equal(settledWarPrestige(g.state).value,0);const accepted=acceptCapitulation(g,front.id,'occupy');assert.equal(accepted.accepted,true,accepted.reason);assert.equal(front.phase,'accepted');
 assert.equal(settledWarPrestige(g.state).value,1);assert.equal(collectOwnPrestige(g).defendedWarAims,1);assert.equal(acceptCapitulation(g,front.id,'loot').accepted,false);
 const saved=decodeGame(encodeGame(g));assert.deepEqual(settledWarPrestige(saved.state),settledWarPrestige(g.state));assert.equal(gamePrestigeView(saved,0,1).components.find(r=>r.component==='defendedWarAims').points,null);
 const other=controlledSurrender();assert.equal(refuseCapitulation(other.g,other.front.id),true);assert.equal(other.front.phase,'pressed');assert.equal(settledWarPrestige(other.g.state).value,0);
 const old=encodeGame(saved);delete old.state.capitulation;const legacy=decodeGame(old);assert.equal(collectOwnPrestige(legacy).defendedWarAims,0);
});

test('actual accepted tribute is weighted only while its linked obligation remains active, including strict reload and actual release',()=>{
 let {g,front}=controlledSurrender();const result=acceptCapitulation(g,front.id,'tribute');assert.equal(result.accepted,true,result.reason);assert.equal(settledWarPrestige(g.state).value,.8);
 g=decodeGame(encodeGame(g));assert.equal(settledWarPrestige(g.state).value,.8);assert.equal(releaseDomination(g,result.dominationId),true);assert.equal(settledWarPrestige(g.state).value,0);assert.equal(settledWarPrestige(decodeGame(encodeGame(g)).state).value,0);
});

test('native unchanged terrain opens a real pressure front and resolves relief only after the attacker physically walks away',()=>{
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();const terrain=hash(g);g.state.weather='clear';
 let hall=g.state.buildings.find(b=>b.team===1&&b.type==='townhall'&&g.finished(b));
 // This nomadic seed has no initial NPC architecture. Declare one finite legal
 // opening hall at the native rival camp, before pressure/time advancement.
 if(!hall){const camp=g.campOf(1),site=g.findDryFoundation('townhall',camp.x,camp.z,80,(x,z)=>g.placementIssue('townhall',x,z,1)===null);assert.ok(site,'an actual dry clear native opening site is required');hall=g.makeBld('townhall',site.x,site.z,1);g.state.buildings.push(hall);g.rebuildWalk();}
 const probe=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(probe);
 const standable=p=>g.walkable(p.x,p.z)&&g.canStep({...probe,x:p.x,z:p.z,y:g.height(p.x,p.z)},p.x,p.z);
 let route;for(let i=0;i<32&&!route;i++){const angle=i*Math.PI/16,point=r=>({x:hall.x+Math.sin(angle)*r,z:hall.z+Math.cos(angle)*r}),from=point(35),to=point(90);if(standable(from)&&standable(to)&&g.workBoard.connected(g,from.x,from.z,to.x,to.z))route={from,to};}
 assert.ok(route,'native connected departure route required; no terrain edits permitted');
 // One finite authored opening attacker; no later spawning, teleportation,
 // terrain flattening, collision change or casualty manipulation occurs.
 const attacker=g.spawnUnit('spearman',route.from.x,route.from.z,0);attacker.order='hold';g.makeHostile(1);g.vision.fill(2);tickCapitulation(g);
 const front=g.state.capitulation.fronts.find(f=>f.hallId===hall.id&&f.attackerTeam===0);assert.ok(front);assert.equal(front.phase,'pressed');assert.equal(settledWarPrestige(g.state,1).value,0);
 const initial={x:attacker.x,z:attacker.z};g.clearSelect();g.selectEntity(attacker);g.issueMove(route.to.x,route.to.z);
 for(let i=0;i<1400&&front.phase==='pressed';i++){g.state.time+=.2;g.navBudget=40;if(Math.hypot(attacker.x-route.to.x,attacker.z-route.to.z)>1){attacker.tx=route.to.x;attacker.tz=route.to.z;g.steer(attacker,.2);}tickCapitulation(g);}
 assert.ok(Math.hypot(attacker.x-initial.x,attacker.z-initial.z)>20,'the real body must leave local pressure range');assert.equal(front.phase,'relieved',JSON.stringify({phase:front.phase,reason:front.reason,absent:front.absentSeconds,x:attacker.x,z:attacker.z}));assert.ok(front.absentSeconds>=CAPITULATION_RULES.relievedAfterAbsentSeconds);assert.equal(hall.team,1);assert.equal(settledWarPrestige(g.state,1).held,1);assert.equal(settledWarPrestige(g.state,0).value,0);assert.equal(hash(g),terrain);
 const saved=decodeGame(encodeGame(g));assert.equal(hash(saved),terrain);assert.equal(settledWarPrestige(saved.state,1).held,1);
});
