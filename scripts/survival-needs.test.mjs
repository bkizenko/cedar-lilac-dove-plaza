import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {SURVIVAL_RULES as R,initializeSurvival,tickSurvival,survivalStatus,beginWaterCollection,waterCollectionAI,pauseWaterCollection,deliverWaterCargo,validSurvivalState} from '../src/game/survivalNeeds.ts';
import {supplyApproach} from '../src/game/campAnchor.ts';
function fixture(){const g=new Game();g.reset(42,10,{size:1040,layout:'pangaea'});g.enterIsland();initializeSurvival(g);g.clockState=()=>({weather:'Clear · 12°C'});for(const u of g.state.units){u.order='hold';u.jobLock=true;}return g;}
test('finite drinking water is consumed once; legacy rules stay untouched',()=>{
 const g=fixture(),tr=g.tribe(0),before=tr.survival.waterLiters,pop=g.state.units.filter(u=>u.team===0&&u.hp>0).length;
 tickSurvival(g,10);assert.ok(Math.abs(before-tr.survival.waterLiters-pop*R.waterLitersPerPersonSecond*10)<1e-9);
 assert.equal(tr.survival.waterConsumedLiters,pop*R.waterLitersPerPersonSecond*10);
 delete g.state.survivalVersion;const old=structuredClone(tr.survival);tickSurvival(g,100);assert.deepEqual(tr.survival,old);
});
test('water collection validates a reachable bank and delivers physical cargo once, including interruption',()=>{
 const g=fixture();g.exploredAt=()=>true;
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');u.selected=true;u.jobLock=false;u.order='idle';
 const result=beginWaterCollection(g);assert.equal(result.accepted,true,result.reason);assert.equal(result.actorId,u.id);
 const stock=g.tribe(0).survival,before=stock.waterLiters;assert.equal(u.waterWork.liters,0);
 u.x=u.waterWork.bankX;u.z=u.waterWork.bankZ;
 waterCollectionAI(g,u,R.collectSeconds);assert.equal(u.waterWork.phase,'returning');assert.equal(u.waterWork.liters,R.waterTripLiters);assert.equal(stock.waterLiters,before);assert.equal(deliverWaterCargo(g,u),0,'remote cargo cannot enter stocks');
 pauseWaterCollection(u);assert.equal(waterCollectionAI(g,u,100),false);assert.equal(u.waterWork.liters,R.waterTripLiters);u.order='idle';
 assert.equal(beginWaterCollection(g).accepted,true);assert.equal(u.waterWork.liters,R.waterTripLiters);
 const drop=g.nearestDrop(u.x,u.z,u.team),spot=supplyApproach(g,u,drop);assert.ok(spot);u.x=spot.x;u.z=spot.z;
 waterCollectionAI(g,u,1);assert.equal(stock.waterLiters,before+R.waterTripLiters);assert.equal(stock.waterDeliveredLiters,R.waterTripLiters);assert.equal(u.waterWork,undefined);
 waterCollectionAI(g,u,1);assert.equal(stock.waterLiters,before+R.waterTripLiters);
});
test('fire consumes actual timber; shelter and fuel reduce measured cold; warnings precede harm',()=>{
 const g=fixture(),tr=g.tribe(0),u=g.state.units.find(u=>u.team===0);g.clockState=()=>({weather:'Hard frost · -8°C'});
 tr.wood=10;const wood=tr.wood,pop=g.state.units.filter(p=>p.team===0&&p.hp>0).length;tickSurvival(g,10);
 assert.ok(Math.abs(wood-tr.wood-pop*R.woodPerPersonColdSecond*10)<1e-9);assert.ok(tr.survival.fuelBurnedWood>0);
 const fireExposure=u.coldSeconds;u.coldSeconds=0;tr.wood=0;tickSurvival(g,10);assert.ok(u.coldSeconds>fireExposure);
 const before=u.hp;assert.ok(survivalStatus(g).warnings.some(w=>w.includes('firewood')));assert.equal(u.hp,before,'grace period prevents immediate cold damage');
 const hut=g.makeBld('hut',u.x,u.z,0);g.state.buildings.push(hut);u.shelterId=hut.id;u.coldSeconds=0;tr.wood=10;tickSurvival(g,10);assert.equal(u.coldSeconds,0);
});
test('neglect causes gradual explained exposure and strict saves reject malformed needs',()=>{
 const g=fixture(),tr=g.tribe(0),u=g.state.units.find(u=>u.team===0);tr.survival.waterLiters=0;
 const hp=u.hp;tickSurvival(g,R.thirstGraceSeconds);assert.equal(u.hp,hp);tickSurvival(g,60);assert.ok(u.hp<hp&&u.hp>0);
 assert.ok(tr.survival.waterShortageSeconds>0);assert.ok(survivalStatus(g).warnings[0].includes('water empty'));
 assert.equal(validSurvivalState(g.state),true);tr.survival.waterLiters=NaN;assert.equal(validSurvivalState(g.state),false);
});
test('dead carriers account for lost water exactly once; invalid cargo coordinates and progress are rejected',()=>{
 const g=fixture(),u=g.state.units.find(u=>u.team===0),stock=g.tribe(0).survival;
 u.waterWork={sourceX:0,sourceZ:0,bankX:0,bankZ:0,phase:'returning',progressSeconds:R.collectSeconds,liters:24};u.hp=0;
 tickSurvival(g,1);assert.equal(stock.waterLostLiters,24);tickSurvival(g,1);assert.equal(stock.waterLostLiters,24);
 u.hp=100;u.waterWork={sourceX:1e5,sourceZ:0,bankX:0,bankZ:0,phase:'outbound',progressSeconds:0,liters:0};assert.equal(validSurvivalState(g.state),false);
 u.waterWork.sourceX=0;u.waterWork.progressSeconds=R.collectSeconds+1;assert.equal(validSurvivalState(g.state),false);
});
test('needs death reconciles loaded water in the same tick before cleanup',()=>{
 const g=fixture(),u=g.state.units.find(u=>u.team===0),s=g.tribe(0).survival;s.waterLiters=0;u.hp=.001;u.thirstSeconds=R.thirstGraceSeconds;
 u.waterWork={sourceX:0,sourceZ:0,bankX:0,bankZ:0,phase:'returning',progressSeconds:R.collectSeconds,liters:24};
 tickSurvival(g,1);assert.ok(u.hp<=0);assert.equal(s.waterLostLiters,24);assert.equal(u.waterWork,undefined);
});
