import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {Game} from '../src/game/sim.ts';
import {SEGS,MAP,HALF} from '../src/game/constants.ts';
import {launchRiverboat,boardRiverboat,riverboatAI,syncRiverboats} from '../src/game/boats.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {WorldView}=await import('../src/scene/world.ts');
const {Engine}=await import('../src/game/engine.ts');
const {riverboatGeo}=await import('../src/scene/meshes.ts');
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++)g.world.heights[z*(SEGS+1)+x]=Math.abs(z/SEGS*MAP-HALF)<8?g.world.waterY-1:4;
 const dock=g.makeBld('dock',0,-10,0);g.state.buildings=[dock];g.vision.fill(2);g.rebuildWalk();
 for(let i=0;i<3;i++)g.spawnUnit('worker',8+i,-14,0);
 launchRiverboat(g,dock);return {g,b:g.state.boats[0]};
}
test('empty hull selection has its own HUD identity, toggles, and never selects or orders land workers',()=>{
 const {g,b}=fixture();g.state.units[0].selected=true;
 assert.equal(g.selectBoat(b.id),true);assert.equal(g.selectedUnits().length,0);
 assert.equal(g.snapshot().selection.kind,'boat');assert.match(g.snapshot().selection.info,/0\/5/);
 const order=g.state.units[0].order;g.issueMove(0,4);assert.equal(g.state.units[0].order,order);assert.match(g.state.banner,/Board residents/);
 assert.equal(g.selectBoat(b.id),true);assert.equal(g.selectedBoat,null);
 g.selectBoat(b.id);g.selectEntity(g.state.units[0],true);assert.equal(g.selectedBoat,null);
 b.team=1;assert.equal(g.selectBoat(b.id),false);
});
test('a selected hull commands its real captain across water without selecting the passengers',()=>{
 const {g,b}=fixture();boardRiverboat(g,b.id,g.state.units);
 for(let i=0;i<600;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units)riverboatAI(g,u,.1);syncRiverboats(g);}
 g.selectBoat(b.id);assert.equal(g.selectedUnits().length,0);g.issueMove(0,6);
 const captain=g.state.units.find(u=>u.id===b.captain);assert.equal(captain.order,'move');assert.ok(captain.tz>0);
 for(let i=0;i<500;i++){g.state.time+=.1;g.navBudget=30;for(const u of g.state.units)riverboatAI(g,u,.1);syncRiverboats(g);}
 assert.ok(b.z>3);g.clearSelect();assert.equal(g.selectedBoat,null);assert.equal(g.snapshot().selection.kind,'none');
});
test('world hull picking follows the rendered instance order and hides unknown foreign hulls',()=>{
 const v=Object.create(WorldView.prototype);v.renderer={domElement:{clientWidth:800,clientHeight:600}};
 v.camera=new THREE.PerspectiveCamera(50,800/600,.1,100);v.camera.position.set(0,15,0);v.camera.lookAt(0,0,0);v.camera.updateMatrixWorld();
 v.riverboats=new THREE.InstancedMesh(riverboatGeo(),new THREE.MeshStandardMaterial(),3);
 const own={id:3,team:0,x:0,z:0,hp:300,facing:0};
 const g={state:{boats:[{...own,id:1,hp:0},{...own,id:2,team:1,x:20},own]},world:{waterY:.42},exploredAt:()=>false,visibleAt:()=>false};
 v.syncRiverboatMeshes(g);assert.equal(v.riverboats.count,1);assert.equal(v.pickBoat(400,300,g),own);
 const p=v.waterAt(400,300,4);assert.ok(Math.abs(p.y-4)<.001);
 v.terrain=new THREE.Mesh(new THREE.PlaneGeometry(50,50).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial());v.terrain.position.y=3;v.terrain.updateMatrixWorld();
 assert.equal(v.pickBoat(400,300,g),null,'a hill in front of the hull blocks selection');
 v.riverboats.geometry.dispose();v.riverboats.material.dispose();v.terrain.geometry.dispose();v.terrain.material.dispose();
});
test('left click selects and deselects the hull; sailing clicks use the water surface, not the seabed',()=>{
 const {g,b}=fixture();const e=Object.create(Engine.prototype);e.game=g;e.pushHud=()=>{};
 let picked=b,waterCalls=0,move;
 e.view={groundAt:()=>({x:999,z:999}),waterAt:()=>{waterCalls++;return {x:2,z:4};},pickBoat:()=>picked,pickEntity:()=>null,pickResource:()=>null};
 e.leftClick(1,1,false);assert.equal(g.selectedBoat,b.id);e.leftClick(1,1,false);assert.equal(g.selectedBoat,null);
 g.selectBoat(b.id);picked=null;g.issueMove=(x,z)=>{move={x,z};};e.leftClick(1,1,false);assert.deepEqual(move,{x:2,z:4});
 e.rightClick(1,1);assert.deepEqual(move,{x:2,z:4});assert.ok(waterCalls>=3);
});
