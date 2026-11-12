import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {beginGarmentRepair,garmentRepairIssue,pauseGarmentRepair,resumeGarmentRepair,cancelGarmentRepair,tickGarmentRepairs,GARMENT_REPAIR_RULES as R} from '../src/game/garmentRepair.ts';
import {beginProduction,productionIssue,occupiedProductionSlots,clothingWarmth,equipClothing,swapClothing} from '../src/game/production.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {applyEngineReadQuery,isEngineReadQuery} from '../src/game/engineReadModels.ts';
import {craftSiteReport} from '../src/game/craftSiteReport.ts';
import {carriedLoadUnits} from '../src/game/carriedLoad.ts';
import {localAirTemperature,SURVIVAL_RULES} from '../src/game/survivalNeeds.ts';
let opening;
const hash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
function fixture(){
 opening??=nativeDairyVillage();const g=decodeGame(opening.save),home=g.campOf(0),u=g.state.units.find(u=>u.id===opening.worker);let point;
 for(let radius=14;radius<=50&&!point;radius+=4)for(let i=0;i<24&&!point;i++){const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;if(!g.placementIssue('tailor',x,z,0)&&g.interactionSpot(u,g.makeBld('tailor',x,z,0)))point={x,z};}
 assert.ok(point);const b=g.makeBld('tailor',point.x,point.z,0);g.state.buildings.push(b);g.rebuildWalk();
 // Declared finite existing tailor, garments and patch materials on untouched
 // terrain. This is not an earned textile-production or building-unlock claim.
 Object.assign(g.tribe(0),{items:{...g.tribe(0).items,woolCloth:2,cloth:2,leather:2,driedSkin:4,bone:2,cordage:4}});u.garment={item:'woolCoat',condition:.2,wetness:.4,heatExposureSeconds:12};u.spareGarment={item:'lightClothes',condition:.7,wetness:.1};
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));return{g,u,b};
}
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended,g.state.endReason);}assert.ok(done(),JSON.stringify(g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,order:u.order,lock:u.jobLock,repair:u.garmentRepair,reason:u.workReason,x:u.x,z:u.z}))));}
test('native owner walks with the same paid garment, shares the tailoring slot, resumes after strict reload and returns no extra garment',()=>{
 let{g,u,b}=fixture();const terrain=hash(g),id=u.id,site=b.id,original=u.garment,spare=u.spareGarment,start={x:u.x,z:u.z},before=g.tribe(0).items.woolCloth;
 assert.equal(garmentRepairIssue(g,id,'worn',site),null);const result=applyEngineCommand(g,{kind:'garment-repair',unitId:id,slot:'worn',workplaceId:site});assert.equal(result.accepted,true,result.reason);assert.equal(u.garmentRepair.garment,original);assert.equal(u.garment,undefined);assert.equal(u.spareGarment,spare);assert.equal(clothingWarmth(u),0);assert.equal(occupiedProductionSlots(g,b),1);assert.match(productionIssue(g,'sewSkinClothes',site),/slots|paid work/i);assert.equal(g.tribe(0).items.woolCloth,before-1);assert.equal(g.tribe(0).items.cordage,3);assert.equal(equipClothing(g,id,'woolCoat'),false);assert.equal(swapClothing(g,id),false);assert.ok(carriedLoadUnits(u)>0);
 drive(g,90,()=>!!u.garmentRepair&&u.garmentRepair.progress>5);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>1,'actual original owner must walk to the native tailor');assert.equal(craftSiteReport(g,b).jobs.find(j=>j.kind==='garment-repair').actorId,id);
 const progress=u.garmentRepair.progress;assert.equal(pauseGarmentRepair(g,u),true);assert.equal(occupiedProductionSlots(g,b),0);g=decodeGame(encodeGame(g));u=g.state.units.find(u=>u.id===id);b=g.state.buildings.find(b=>b.id===site);assert.equal(u.garmentRepair.progress,progress);assert.equal(resumeGarmentRepair(g,id),true);assert.equal(g.tribe(0).items.woolCloth,before-1,'resuming never buys patches again');drive(g,90,()=>!u.garmentRepair);
 assert.ok(u.garment.condition<=R.targetCondition&&u.garment.condition>R.targetCondition-.002);assert.equal(u.garment.item,original.item);assert.equal(u.garment.heatExposureSeconds,12);assert.equal(u.spareGarment.item,spare.item);assert.equal(g.tribe(0).items.woolCoat||0,0);assert.equal(g.state.garmentMaintenance.metrics.completed,1);assert.ok(Math.abs(g.state.garmentMaintenance.metrics.conditionRestored-.7)<1e-9);assert.equal(occupiedProductionSlots(g,b),0);assert.equal(hash(g),terrain);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 if(process.env.GARMENT_NATIVE_SAVE){g.state.paused=true;writeFileSync(process.env.GARMENT_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
});
test('paused repair frees real tailoring capacity; production wins the slot until finished, cancellation returns the original worn state without refund',()=>{
 const{g,u,b}=fixture(),original=u.garment;assert.equal(beginGarmentRepair(g,u.id,'worn',b.id),true);pauseGarmentRepair(g,u);
 assert.equal(beginProduction(g,'sewSkinClothes',b.id,u.id),true,productionIssue(g,'sewSkinClothes',b.id,u.id));const productionId=u.productionProjectId;assert.equal(resumeGarmentRepair(g,u.id),false);assert.equal(occupiedProductionSlots(g,b),1);const lock=u.jobLock;assert.equal(pauseGarmentRepair(g,u),true);assert.equal(u.jobLock,lock,'repeating pause must not alter a newer paid job');assert.equal(cancelGarmentRepair(g,u.id),true);assert.equal(u.garment,original);assert.equal(u.productionProjectId,productionId,'cancelling a paused repair must preserve its owners newer paid job');assert.equal(u.garment.condition,.2);assert.equal(u.garment.wetness,.4);assert.equal(g.tribe(0).items.woolCloth,1);assert.equal(g.state.garmentMaintenance.metrics.completed,0);assert.equal(g.state.garmentMaintenance.metrics.cancelled,1);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('death loses escrow once; ownership change returns the existing garment without a free repair or patch refund',()=>{
 const dead=fixture();assert.equal(beginGarmentRepair(dead.g,dead.u.id,'spare',dead.b.id),true);dead.u.hp=0;tickGarmentRepairs(dead.g);tickGarmentRepairs(dead.g);assert.equal(dead.u.garmentRepair,undefined);assert.equal(dead.u.spareGarment,undefined);assert.equal(dead.g.state.garmentMaintenance.metrics.lost,1);assert.equal(dead.g.tribe(0).items.cloth,1);
 const captured=fixture(),original=captured.u.garment;assert.equal(beginGarmentRepair(captured.g,captured.u.id,'worn',captured.b.id),true);captured.u.team=1;tickGarmentRepairs(captured.g);assert.equal(captured.u.garmentRepair,undefined);assert.equal(captured.u.garment,original);assert.equal(captured.u.garment.condition,.2);assert.equal(captured.g.tribe(0).items.woolCloth,1);assert.equal(captured.g.state.garmentMaintenance.metrics.completed,0);assert.equal(captured.u.jobLock,false,'transferred uncommitted owner must not stay stranded in the old repair job');assert.doesNotThrow(()=>decodeGame(encodeGame(captured.g)));
});
test('admission and owner read models are conservative; strict saves reject duplicate or fabricated repaired garments and wetness',()=>{
 const{g,u,b}=fixture(),before=JSON.stringify(encodeGame(g));assert.equal(isEngineReadQuery({kind:'garment-repair-issues',unitId:u.id}),true);assert.equal(isEngineDispatchCommand({kind:'garment-repair',unitId:u.id,slot:'worn',workplaceId:b.id}),true);assert.equal(isEngineDispatchCommand({kind:'garment-repair',unitId:u.id,slot:'other'}),false);assert.equal(applyEngineReadQuery(g,{kind:'garment-repair-issues',unitId:u.id}).worn,null);assert.equal(JSON.stringify(encodeGame(g)),before);
 const patches=g.tribe(0).items.woolCloth;g.tribe(0).items.cordage=0;assert.equal(beginGarmentRepair(g,u.id,'worn',b.id),false);assert.equal(g.tribe(0).items.woolCloth,patches);assert.ok(u.garment);g.tribe(0).items.cordage=2;assert.equal(beginGarmentRepair(g,u.id,'worn',b.id),true);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 for(const mutate of [q=>q.garmentRepair.garment.condition=.9,q=>q.garmentRepair.garment.wetness=2,q=>q.garmentRepair.paid.woolCloth=0,q=>q.garmentRepair.progress=41,q=>q.garmentRepair.progress=5,q=>q.garment=structuredClone(q.garmentRepair.garment)]){const save=structuredClone(encodeGame(g));mutate(save.state.units.find(q=>q.id===u.id));assert.throws(()=>decodeGame(save));}
});

test('actual native winter cold is greater in a soaked garment; no fuel means no invented drying fire',()=>{
 const f=fixture(),g=f.g;g.tribe(0).wood=0;g.state.weather='frost';g.state.weatherT=10000;let chosen;
 for(const at of[1350,1400,1450,1500,1550,1600,1650,1700]){g.state.time=at;const temp=localAirTemperature(g,f.u.x,f.u.z);for(const condition of[.2,.4,.6,.8,1]){f.u.garment={item:'woolCoat',condition};const dry=clothingWarmth(f.u);f.u.garment.wetness=1;const wet=clothingWarmth(f.u),exposure=w=>Math.max(0,Math.min(2,(SURVIVAL_RULES.coldThresholdCelsius-temp-w)/6));if(exposure(wet)>exposure(dry)+.05){chosen={at,condition};break;}}if(chosen)break;}
 assert.ok(chosen,'native winter opening needs a nonsaturated wet-vs-dry cold comparison');g.state.time=chosen.at;f.u.garment={item:'woolCoat',condition:chosen.condition};f.u.coldSeconds=0;const dry=decodeGame(encodeGame(g)),wet=decodeGame(encodeGame(g));wet.state.units.find(u=>u.id===f.u.id).garment.wetness=1;
 for(let i=0;i<25;i++){dry.state.paused=wet.state.paused=false;dry.step(.2);wet.step(.2);}
 const a=dry.state.units.find(u=>u.id===f.u.id),b=wet.state.units.find(u=>u.id===f.u.id);assert.ok(b.coldSeconds>a.coldSeconds+.1,JSON.stringify({chosen,dry:a.coldSeconds,wet:b.coldSeconds}));assert.equal(dry.tribe(0).wood,0);assert.equal(wet.tribe(0).wood,0);assert.deepEqual(dry.simulationErrors,[]);assert.deepEqual(wet.simulationErrors,[]);assert.equal(hash(dry),hash(wet));assert.doesNotThrow(()=>decodeGame(encodeGame(wet)));
});
