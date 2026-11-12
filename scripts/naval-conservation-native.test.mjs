import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {beginPortWork,resumePortWork,ensureNaval,navalState,NAVAL_RULES,resupplyVessel,validNaval,vesselOf} from '../src/game/navalPorts.ts';
import {commissionVessel,resumeVesselCommission,navalIndependentFood,beginBoarding} from '../src/game/navalFleet.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {foodDemand} from '../src/game/settlement.ts';
import {declareSocietyHostility} from '../src/game/societyRelations.ts';

// Finite authored initial harbour/endowment on unmodified native terrain. This is
// focused executor qualification, not an earned campaign or initial-dock build gate.
function fixture(){
 const g=new Game();g.reset(42,14,{size:1040,layout:'pangaea'});g.enterIsland();
 let point;
 for(let z=-480;z<=480&&!point;z+=8)for(let x=-480;x<=480;x+=8){
  if(g.height(x,z)<g.waterAt(x,z)+.8||g.height(x,z)>g.waterAt(x,z)+4)continue;
  if(![[-8,0],[8,0],[0,-8],[0,8]].some(([dx,dz])=>g.height(x+dx,z+dz)<g.waterAt(x+dx,z+dz)-.2))continue;
  if(g.state.buildings.some(b=>Math.hypot(b.x-x,b.z-z)<30))continue;
  if(!g.walkable(x,z))continue;point={x,z};break;
 }
 assert.ok(point,'natural traversable shore');
 const dock=g.makeBld('dock',point.x,point.z,0);dock.build=1;g.state.buildings.push(dock);g.rebuildWalk();
 const worker=()=>{const anchor=g.state.units.find(u=>u.team===0);const p=g.nearestWalk({...anchor,x:point.x,z:point.z,y:g.height(point.x,point.z)},point.x+10,point.z+10);assert.ok(p);const u=g.spawnUnit('worker',p.x,p.z,0);u.order='hold';return u;};
 const u=worker(),replacement=worker();
 Object.assign(g.tribe(0),{wood:900,stone:600,copper:100,food:1000,foodLots:{bread:400,driedFish:600}});g.tribe(0).items={...g.tribe(0).items,cordage:200};
 g.state.autoWorkEnabled=false;g.state.raidT=10000;g.state.scoutTimer=10000;g.state.paused=false;
 return {g,dock,u,replacement,point};
}
function stepUntil(g,predicate,seconds=400){for(let t=0;t<seconds&&!predicate();t+=.25)g.step(.25);assert.deepEqual(g.simulationErrors,[]);assert.ok(predicate(),'actual executor reaches milestone');}
function restore(g){const raw=structuredClone(encodeGame(g));validateGameSave(raw);return decodeGame(raw);}
const stocks=g=>({wood:g.tribe(0).wood,stone:g.tribe(0).stone,copper:g.tribe(0).copper,cordage:g.tribe(0).items.cordage});

test('native paid port and hull work interrupt, reload and resume with real replacement without a second payment',()=>{
 let {g,dock,u,replacement}=fixture();const dockId=dock.id,uid=u.id,rid=replacement.id;
 const begun=beginPortWork(g,dockId,'breakwater',uid);assert.equal(begun.accepted,true,begun.reason);
 stepUntil(g,()=>navalState(g).projects[0]?.progress>=3);
 const p=navalState(g).projects[0],paid=structuredClone(p.paid),progress=p.progress,position={x:u.x,z:u.z};
 u.selected=true;g.issueMove(position.x+6,position.z);assert.equal(p.phase,'paused');assert.equal(u.portWorkId,undefined);
 for(let i=0;i<12;i++)g.step(.25);assert.equal(p.progress,progress,'direct move cannot also advance port work');
 g=restore(g);g.state.paused=false;u=g.state.units.find(x=>x.id===uid);replacement=g.state.units.find(x=>x.id===rid);
 const before=stocks(g);assert.equal(resumePortWork(g,p.id,rid,1).accepted,false,'foreign caller cannot resume player work');
 assert.equal(resumePortWork(g,p.id,rid).accepted,true);assert.deepEqual(stocks(g),before);assert.deepEqual(navalState(g).projects[0].paid,paid);
 stepUntil(g,()=>!!navalState(g).ports.find(x=>x.dockId===dockId)?.works.breakwater,300);
 const hull=commissionVessel(g,dockId,'riverPatrol',rid);assert.equal(hull.accepted,true,hull.reason);
 stepUntil(g,()=>navalState(g).commissions[0]?.progress>=3);
 const c=navalState(g).commissions[0],work=c.progress;replacement.hp=0;g.step(.25);assert.equal(c.phase,'paused');assert.equal(replacement.portWorkId,undefined);
 g=restore(g);g.state.paused=false;const beforeHull=stocks(g);assert.equal(isEngineDispatchCommand({kind:'naval-order',action:'resume-commission',projectId:c.id,builderId:uid}),true);
 assert.equal(applyEngineCommand(g,{kind:'naval-order',action:'resume-commission',projectId:c.id,builderId:uid}).accepted,true);assert.deepEqual(stocks(g),beforeHull);assert.equal(navalState(g).commissions[0].progress,work);
 stepUntil(g,()=>navalState(g).vessels.length===1,240);assert.equal(navalState(g).commissions.length,0);assert.equal(g.state.boats.filter(b=>b.id===navalState(g).vessels[0].boatId).length,1);assert.equal(validNaval(g.state),true);
 const restored=restore(g);assert.deepEqual(restored.state.naval,g.state.naval);
});

test('capacity rejection is atomic; typed harbour food leaves pantry once and survives strict reload on the actual hull',()=>{
 let {g,dock,u}=fixture();const s=ensureNaval(g);
 for(let i=0;i<NAVAL_RULES.maximumPorts;i++)s.ports.push({dockId:g.id(),team:0,works:{}});
 const before=stocks(g),nextId=g.state.nextId;assert.equal(beginPortWork(g,dock.id,'breakwater',u.id).accepted,false);assert.deepEqual(stocks(g),before);assert.equal(g.state.nextId,nextId);assert.equal(s.projects.length,0);
 s.ports=[];
 const foreignDock=g.makeBld('dock',dock.x+60,dock.z,1);foreignDock.build=1;g.state.buildings.push(foreignDock);
 const foreign=g.spawnUnit('worker',dock.x+64,dock.z,1);Object.assign(g.tribe(1),{wood:200,stone:100});
 const foreignWork=beginPortWork(g,foreignDock.id,'breakwater',foreign.id,1);assert.equal(foreignWork.accepted,true);g.interruptMission(foreign);
 const unchanged=structuredClone(navalState(g).projects.find(p=>p.id===foreignWork.id));
 assert.equal(applyEngineCommand(g,{kind:'naval-order',action:'resume-port-work',projectId:foreignWork.id,builderId:foreign.id}).accepted,false,'owner gateway cannot resume another society work even with its own builder');
 assert.deepEqual(navalState(g).projects.find(p=>p.id===foreignWork.id),unchanged);
 // Finite initial owned civil hull with a commissioned record; no loaded food is granted.
 const b={id:g.id(),team:0,dock:dock.id,x:dock.x,z:dock.z,y:g.waterAt(dock.x,dock.z)+.16,hp:300,facing:0,capacity:5};(g.state.boats??=[]).push(b);
 s.vessels.push({boatId:b.id,team:0,design:'riverPatrol',commissionedAt:g.state.time,stores:{food:0,missiles:0},atSeaSeconds:0,captures:0,rams:0});
 const beforeLots=foodInventory(g.tribe(0)),food=g.tribe(0).food;
 assert.equal(resupplyVessel(g,b.id,{food:12,missileLoads:1}).accepted,true);
 const after=foodInventory(g.tribe(0)),v=vesselOf(g,b.id);assert.equal(g.tribe(0).food,food-12);assert.equal(Object.values(v.stores.foodLots).reduce((n,x)=>n+x,0),12);
 for(const k of Object.keys(beforeLots))assert.ok(Math.abs(beforeLots[k]-after[k]-(v.stores.foodLots[k]??0))<1e-8);
 g=restore(g);assert.deepEqual(vesselOf(g,b.id).stores,v.stores);
 const bad=structuredClone(encodeGame(g));bad.state.naval.vessels[0].stores.foodLots.bread=999;assert.throws(()=>validateGameSave(bad));
});

test('native boarding preserves the actual prize rations and missiles; at-sea crew eat finite hull food instead of home food',()=>{
 let {g,dock}=fixture();let sea;
 // Author initial vessels on genuine navigable water, away from the home feeding radius.
 for(let z=-480;z<=480&&!sea;z+=8)for(let x=-480;x<=480;x+=8){
  if(Math.hypot(x-dock.x,z-dock.z)<80)continue;
  if([-3,0,3].every(dx=>g.height(x+dx,z)<g.waterAt(x+dx,z)-.5)&&[-3,0,3].every(dz=>g.height(x,z+dz)<g.waterAt(x,z+dz)-.5)){sea={x,z};break;}
 }
 assert.ok(sea);const state=ensureNaval(g),baseDemand=foodDemand(g,0),boats=[];
 for(const [team,dx,food,missiles] of [[0,0,3,6],[2,3,7,12]]){
  const b={id:g.id(),team,dock:dock.id,x:sea.x+dx,z:sea.z,y:g.waterAt(sea.x+dx,sea.z)+.16,hp:300,facing:0,capacity:5};(g.state.boats??=[]).push(b);boats.push(b);
  state.vessels.push({boatId:b.id,team,design:'riverPatrol',commissionedAt:g.state.time,stores:{food,missiles,foodLots:{driedFish:food}},atSeaSeconds:0,captures:0,rams:0});
 }
 const crew=[];for(let i=0;i<2;i++){const u=g.spawnUnit('spearman',sea.x,sea.z,0);u.boat={id:boats[0].id,phase:'aboard'};u.order='hold';u.jobLock=true;crew.push(u);}
 boats[0].captain=crew[0].id;assert.equal(navalIndependentFood(g,crew[0]),true);assert.equal(foodDemand(g,0),baseDemand,'actual sea rations replace the home meal obligation');
 declareSocietyHostility(g,0,2);const prizeId=boats[1].id,owner=boats[0].id;
 g=restore(g);g.state.paused=false;const beforeFood=vesselOf(g,prizeId).stores.food;
 const boarded=beginBoarding(g,owner,prizeId,0);assert.equal(boarded.accepted,true,boarded.reason);
 stepUntil(g,()=>g.state.boats.find(b=>b.id===prizeId).team===0,3);
 const prize=g.state.boats.find(b=>b.id===prizeId),stored=vesselOf(g,prizeId).stores;
 assert.ok(stored.food>0&&stored.food<=beforeFood,'captured food remains aboard, with only real crew consumption');assert.equal(stored.missiles,12);
 assert.ok(Math.abs(Object.values(stored.foodLots).reduce((n,x)=>n+x,0)-stored.food)<1e-8);
 assert.equal(g.state.units.find(u=>u.id===prize.captain).boat.id,prizeId);assert.equal(g.state.naval.vessels.length,2);assert.equal(g.state.boats.length,2);
 const food=stored.food;for(let i=0;i<4;i++)g.step(.25);assert.ok(stored.food<food,'real at-sea crew consumes the conserved prize ration');
 const restored=restore(g);assert.deepEqual(vesselOf(restored,prizeId).stores,stored);assert.equal(restored.state.boats.find(b=>b.id===prizeId).captain,prize.captain);
});
