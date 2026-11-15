import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableCombatDoctrine} from '../src/game/combatDoctrine.ts';
import {formSquads,disbandSquads,setSquadOrder,tickSquads,squadsOf,squadOfUnit,validSquads,squadViews,SQUAD_RULES} from '../src/game/squads.ts';
import {dutyOf} from '../src/game/guardDuty.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function world(n=12){
 const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.buildings=[g.makeBld('townhall',0,0,0)];g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();enableCombatDoctrine(g);
 const us=[];for(let i=0;i<n;i++){const u=g.spawnUnit('spearman',10+i,10,0);u.militia=true;u.y=4;u.combatXP=i;us.push(u);}
 return {g,us};
}
test('armed adults split into squads of the chosen size, best fighter leads, nobody is in two squads',()=>{
 const {g,us}=world(12);const r=formSquads(g,5);assert.equal(r.formed,3);
 const list=squadsOf(g);assert.deepEqual(list.map(q=>q.memberIds.length),[5,5,2]);
 assert.equal(list[0].leaderId,us[11].id,'highest combat XP leads the first squad');
 assert.equal(new Set(list.flatMap(q=>q.memberIds)).size,12);
 assert.equal(formSquads(g,10).accepted,false,'everyone already belongs to a squad');
 assert.equal(formSquads(g,7).accepted,false);assert.ok(validSquads(g.state));
 for (const n of [5,10,25,50,100]) assert.ok(formSquads(world(1).g,n).accepted);
});
test('squad post or patrol puts every member on duty; release and disband clear it',()=>{
 const {g,us}=world(10);formSquads(g,10);const q=squadsOf(g)[0];
 assert.equal(setSquadOrder(g,q.id,'patrol',30,30).accepted,true);assert.ok(us.every(u=>dutyOf(g,u)?.kind==='patrol'));
 assert.equal(setSquadOrder(g,q.id,'none',0,0).accepted,true);assert.ok(us.every(u=>!dutyOf(g,u)));
 setSquadOrder(g,q.id,'post',30,30);assert.equal(disbandSquads(g),1);assert.ok(us.every(u=>!dutyOf(g,u)&&u.militia));assert.equal(squadsOf(g).length,0);
});
test('rotating squads alternate watch and rest; dead members leave and the leader is replaced',()=>{
 const {g,us}=world(10);formSquads(g,5);const [a,b]=squadsOf(g);
 setSquadOrder(g,a.id,'post',30,30,true);setSquadOrder(g,b.id,'patrol',-30,30,true);
 g.state.time=SQUAD_RULES.watchSeconds+1;tickSquads(g);
 assert.equal(a.shift,'rest');assert.ok(a.memberIds.every(id=>!dutyOf(g,us.find(u=>u.id===id))),'resting squad is off duty');assert.ok(a.memberIds.every(id=>us.find(u=>u.id===id).workReason));
 g.state.time+=SQUAD_RULES.restSeconds+2;tickSquads(g);assert.equal(a.shift,'watch');assert.ok(a.memberIds.every(id=>dutyOf(g,us.find(u=>u.id===id))?.kind==='post'));
 const lead=us.find(u=>u.id===a.leaderId);lead.hp=0;g.state.time+=2;tickSquads(g);assert.notEqual(a.leaderId,lead.id);assert.equal(a.memberIds.length,4);
 assert.equal(squadViews(g)[0].members,4);assert.ok(!squadOfUnit(g,lead.id));
});
test('squads survive save/load; old saves have none; commands validate',()=>{
 const {g}=world(6);assert.ok(decodeGame(encodeGame(g)));formSquads(g,5);
 const r=decodeGame(encodeGame(g));assert.deepEqual(squadsOf(r).map(q=>q.memberIds.length),[5,1]);
 assert.ok(isEngineDispatchCommand({kind:'form-squads',size:25}));assert.ok(!isEngineDispatchCommand({kind:'form-squads',size:7}));
 assert.ok(isEngineDispatchCommand({kind:'squad-order',squadId:3,order:'patrol',x:1,z:2}));assert.ok(!isEngineDispatchCommand({kind:'squad-order',squadId:3,order:'dance',x:1,z:2}));
});
