import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginEraUpgrade} from '../src/game/housing.ts';
import {ERA_UPGRADE_RULES,validFabricState} from '../src/game/buildingFabric.ts';
import {supplyDrops,supplyApproach,supplyReached} from '../src/game/campAnchor.ts';
import {predisposition} from '../src/game/people.ts';
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).update(JSON.stringify({rivers:g.world.rivers,features:g.world.features,banks:g.world.bankTerrain,bodies:g.world.waterBodies,falls:g.world.waterfalls,cuts:g.state.excavations})).digest('hex');
const fuel=g=>(g.tribe(0).survival?.fuelBurnedWood||0)+(g.state.production?.metrics.logsUsed||0);
const materialTotal=(p,k)=>p.uncollected[k]+p.packet[k]+p.delivered[k];
const reachedCache=(g,u)=>supplyDrops(g,0).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});

test('native paid era rebuild physically carries cached inputs, reloads carrying, works and records durability without healing',{timeout:30000},()=>{
 const wall=performance.now(),f=nativeDairyVillage();let g=decodeGame(f.save);
 const buildingId=f.hearth,workerId=f.worker,standing=g.state.buildings.find(b=>b.id===buildingId),worker=g.state.units.find(u=>u.id===workerId);
 // Existing helper authors a finite native opening and a legally sited standing
 // hearth. No terrain, generated actor position or body radius is changed here.
 const terrainBefore=terrain(g),radii=g.state.units.map(u=>[u.id,u.r]),initialHp=standing.hp,initialMax=standing.maxHp,originalRect={x:standing.x,z:standing.z,w:standing.w,d:standing.d};
 assert.ok(reachedCache(g,worker),'the actual builder starts at a real delivered-material cache');assert.equal(standing.fabric.upgrades.length,0);assert.equal(standing.fabric.built.era,0);
 // Declared newer techniques for an existing older structure; not earned era
 // advancement evidence. No material, health or completed work is granted.
 g.tribe(0).age=1;g.clearSelect();g.selectEntity(worker);
 const wood=g.tribe(0).wood,stone=g.tribe(0).stone,fuelBefore=fuel(g),quote={wood:ERA_UPGRADE_RULES.rebuild.wood,stone:ERA_UPGRADE_RULES.rebuild.stone,plantFibre:ERA_UPGRADE_RULES.rebuild.plantFibre};
 const admitted=beginEraUpgrade(g,buildingId,'rebuild');assert.equal(admitted.accepted,true,admitted.reason);assert.equal(standing.renovation.paid,false);assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).stone,stone);
 validateGameSave(encodeGame(g));let carried=false,worked=false,reloaded=false,paid=false,travelled=0,completed=false,frames=0;
 for(;frames<2400;frames++){
  const bodyBefore=g.state.units.find(u=>u.id===workerId),bBefore=g.state.buildings.find(b=>b.id===buildingId),pBefore=bBefore.renovation;
  const pose={...bodyBefore},time=g.state.time,progress=pBefore?.progress||0,hadCargo=!!bodyBefore.housingCargo,wasPaid=!!pBefore?.paid,speed=g.travelSpeed(bodyBefore);
  g.state.paused=false;g.step(.1);assert.deepEqual(g.simulationErrors,[]);assert.equal(g.state.ended,null);assert.ok(g.state.time>time,'actual simulation advances each frame');assert.ok(performance.now()-wall<29000,'one bounded native run');
  let body=g.state.units.find(u=>u.id===workerId),b=g.state.buildings.find(b=>b.id===buildingId),p=b.renovation;assert.ok(body&&body.hp>0,'same original living builder');
  const elapsed=g.state.time-time,distance=Math.hypot(body.x-pose.x,body.z-pose.z);travelled+=distance;assert.ok(distance<=Math.max(speed,g.travelSpeed(body))*elapsed+1e-6,'ordinary bounded walking, no packet teleport');
  const samples=Math.max(1,Math.ceil(distance/.35));let probe=pose;for(let i=1;i<=samples;i++){const x=pose.x+(body.x-pose.x)*i/samples,z=pose.z+(body.z-pose.z)*i/samples;assert.ok(g.canStep(probe,x,z),'actual body radius/solids/ground remain passable');probe={...probe,x,z,y:g.travelHeight(x,z)};}
  assert.equal(b.hp,initialHp,'rebuild grants no free current health');assert.deepEqual({x:b.x,z:b.z,w:b.w,d:b.d},originalRect,'rebuild does not move the original foundation');
  if(p){
   assert.equal(b.maxHp,initialMax,'durability waits for completed actual work');assert.deepEqual(p.quote,quote);
   if(p.paid){paid=true;for(const k of ['wood','stone','plantFibre'])assert.ok(Math.abs(materialTotal(p,k)-quote[k])<1e-7,'each paid material is at source, on carrier or at site exactly once');if(!wasPaid)assert.ok(reachedCache(g,pose),'payment is collected at the actual cache');}
   if(body.housingCargo){carried=true;assert.equal(body.housingCargo.buildingId,buildingId);assert.deepEqual(body.housingCargo.materials,p.packet);if(!hadCargo)assert.ok(reachedCache(g,pose),'a fresh finite packet is picked up at its real source');}
   if(p.progress>progress){worked=true;assert.ok(g.buildingWorkReached(body,b),'labor occurs at actual building frontage');assert.deepEqual(p.delivered,quote);assert.ok(p.progress-progress<=elapsed*predisposition(body).strength+1e-7);}
   if(!reloaded&&body.housingCargo&&travelled>1){const saved=encodeGame(g);validateGameSave(saved);const packet=structuredClone(body.housingCargo),project=JSON.parse(JSON.stringify(p));g=decodeGame(saved);body=g.state.units.find(u=>u.id===workerId);b=g.state.buildings.find(b=>b.id===buildingId);assert.deepEqual(body.housingCargo,packet);assert.deepEqual(b.renovation,project);assert.equal(terrain(g),terrainBefore);reloaded=true;}
  }else{completed=true;break;}
  assert.ok(Math.abs(g.tribe(0).wood+fuel(g)-fuelBefore+(paid?quote.wood:0)-wood)<1e-6,'logs are only in the paid upgrade or existing recorded fire/production fuel');assert.equal(g.tribe(0).stone+(paid?quote.stone:0),stone);
 }
 const b=g.state.buildings.find(b=>b.id===buildingId),body=g.state.units.find(u=>u.id===workerId);
 assert.ok(completed,'native rebuild must actually finish');assert.ok(paid&&carried&&worked&&reloaded);assert.ok(travelled>1);assert.equal(body.housingCargo,undefined);assert.equal(b.fabric.upgrades.length,1);assert.equal(b.maxHp,initialMax*(1+ERA_UPGRADE_RULES.durabilityFraction));assert.equal(b.hp,initialHp);
 const receipt=b.fabric.upgrades[0];assert.equal(receipt.mode,'rebuild');assert.equal(receipt.paidBy,0);assert.equal(receipt.makerId,workerId);assert.equal(receipt.targetEra,1);assert.equal(receipt.workSeconds,ERA_UPGRADE_RULES.rebuild.workSeconds);assert.deepEqual(receipt.materials,quote);assert.deepEqual(receipt.original,originalRect);assert.deepEqual(receipt.target,originalRect);assert.ok(receipt.completedAt<=g.state.time);
 assert.ok(Math.abs(g.tribe(0).wood+fuel(g)-fuelBefore+quote.wood-wood)<1e-6);assert.equal(g.tribe(0).stone+quote.stone,stone);assert.equal(terrain(g),terrainBefore);assert.deepEqual(g.state.units.map(u=>[u.id,u.r]),radii);assert.equal(validFabricState(g.state),true);
 const final=encodeGame(g);validateGameSave(final);const copy=decodeGame(final),restored=copy.state.buildings.find(x=>x.id===buildingId);assert.deepEqual(restored.fabric,b.fabric);assert.equal(restored.hp,initialHp);assert.equal(restored.maxHp,b.maxHp);assert.equal(terrain(copy),terrainBefore);
 console.log('native T5 paid rebuild',JSON.stringify({frames:frames+1,time:g.state.time,ended:g.state.ended,travelled,paid,carried,worked,reloaded,receipts:b.fabric.upgrades.length,materials:receipt.materials,hp:b.hp,maxHp:b.maxHp,wallMs:performance.now()-wall}));
});
