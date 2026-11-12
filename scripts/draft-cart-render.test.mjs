import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {DraftCartLayer,DRAFT_CART_RENDER}=await import('../src/scene/draftCartLayer.ts');
const {haulageGeo}=await import('../src/scene/meshes.ts');
const {WorldView}=await import('../src/scene/world.ts');
const {Engine}=await import('../src/game/engine.ts');
const identity=id=>({version:1,id,identifiedAt:0,originalHolderId:1,originalTeam:0});
const person=(id=1)=>({id,kind:'unit',type:'worker',team:0,hp:50,maxHp:50,x:0,y:0,z:0,facing:0,r:.5,order:'hold',carry:0,carryType:null,stride:0,vx:0,vz:0,haulage:'pack',packAnimal:{species:'horse',hp:0,maxHp:100,welfare:0},draftCart:identity(id+100)});
function fixture(){const u=person(),loose={cart:identity(200),team:0,x:10,z:0,droppedAt:0};const g={state:{time:0,units:[u],buildings:[],looseDraftCarts:[loose]},travelHeight:(x,z)=>x*.03+z*.02,height:(x,z)=>x*.03+z*.02,waterAt:()=>-2,visibleAt:()=>true};const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),layer=new DraftCartLayer(scene,material);return{g,u,loose,scene,material,layer};}
const position=(mesh,index=0)=>{const m=new THREE.Matrix4();mesh.getMatrixAt(index,m);return new THREE.Vector3().setFromMatrixPosition(m);};

test('actual attached carts reuse the existing geometry and remain visible with a low-welfare or dead animal until the core removes the asset',()=>{
 const {g,u,layer,scene,material}=fixture(),before=JSON.stringify(g.state),original=haulageGeo('cart');layer.sync(g,'med',true);const [mesh,owners]=[...layer.sources()][0];
 assert.equal(mesh.count,1);assert.equal(owners[0],u);assert.equal(mesh.castShadow,true);assert.equal(mesh.material,material);assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),Array.from(original.attributes.position.array));
 const at=position(mesh);assert.ok(Math.abs(at.z+DRAFT_CART_RENDER.behindHandlerMetres)<1e-6);assert.ok(Math.abs(at.y-(g.travelHeight(at.x,at.z)+DRAFT_CART_RENDER.groundOffset))<1e-6);assert.equal(JSON.stringify(g.state),before,'drawing never mutates real goods, bodies or ownership');
 u.packAnimal.hp=100;u.packAnimal.welfare=0;layer.sync(g,'low',true);assert.equal([...layer.sources()][0][0].count,1);assert.equal([...layer.sources()][0][0].castShadow,false);
 delete u.draftCart;layer.sync(g);assert.equal([...layer.sources()][0][0].count,0,'only authoritative removal hides the attached asset');original.dispose();layer.dispose();material.dispose();assert.equal(scene.children.length,0);
});

test('visible loose cart geometry ray-picks its exact saved record, follows fog, and rebuilds same-time load identity without stale hits',()=>{
 const {g,loose,layer,material}=fixture();g.state.units=[];g.visibleAt=x=>x<15;g.state.looseDraftCarts.push({cart:identity(201),team:1,x:20,z:0,droppedAt:0});layer.sync(g);const [mesh,records]=[...layer.looseSources()][0];assert.equal(mesh.count,1);assert.equal(records[0],loose);
 const ray=new THREE.Raycaster(new THREE.Vector3(10,20,0),new THREE.Vector3(0,-1,0));assert.equal(layer.pickLoose(ray,g),loose);
 const replacement={...loose,x:12,cart:{...loose.cart}};g.state={...g.state,looseDraftCarts:[replacement]};assert.equal(layer.pickLoose(ray,g),null,'a stale rendered record cannot select a different imported state');layer.sync(g);assert.equal([...layer.looseSources()][0][1][0],replacement);
 const currentRay=new THREE.Raycaster(new THREE.Vector3(12,20,0),new THREE.Vector3(0,-1,0));assert.equal(layer.pickLoose(currentRay,g),replacement);g.visibleAt=()=>false;layer.sync(g);assert.equal([...layer.looseSources()][0][0].count,0);assert.equal(layer.pickLoose(currentRay,g),null);layer.dispose();material.dispose();
});

test('native WorldView cargo sync places the same resource cargo on the attached cart deck rather than a dead animal or the resident back',()=>{
 const {g,u,layer,scene,material}=fixture();g.state.looseDraftCarts=[];u.carry=8;u.carryType='wood';const cargo=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,1);scene.add(cargo);
 const view={scene,quality:'low',shadowsEnabled:false,draftCarts:layer,cargoMeshes:new Map([['wood',cargo]]),haulageMeshes:new Map(),packHorses:null,packCattle:null,woodenArds:null,canoePaddles:null};const before=JSON.stringify(g.state);
 WorldView.prototype.syncCargo.call(view,g);assert.equal(cargo.count,1);assert.equal([...layer.sources()][0][0].count,1);const at=position(cargo);assert.ok(at.z<-5,'actual cargo is behind the same animal at the cart');assert.ok(at.y>g.travelHeight(at.x,at.z)+DRAFT_CART_RENDER.deckHeight);assert.equal(JSON.stringify(g.state),before);
 layer.dispose();scene.remove(cargo);cargo.dispose();cargo.geometry.dispose();material.dispose();
});

test('actual cart counts grow without changing geometry or borrowed materials; reset/dispose clears sources exactly once',()=>{
 const {g,layer,scene,material}=fixture();g.state.units=Array.from({length:40},(_,i)=>person(i+1));g.state.looseDraftCarts=[];let disposedMaterial=0;material.addEventListener('dispose',()=>disposedMaterial++);layer.sync(g,'high',true);const [mesh,owners]=[...layer.sources()][0];assert.equal(mesh.count,40);assert.ok(mesh.instanceMatrix.count>=40);assert.equal(owners.length,40);let disposedGeometry=0;mesh.geometry.addEventListener('dispose',()=>disposedGeometry++);
 g.state={time:0,units:[],buildings:[],looseDraftCarts:[]};layer.sync(g);assert.equal([...layer.sources()][0][0].count,0);assert.equal(layer.matrixFor(owners[0]),undefined);layer.dispose();layer.dispose();assert.equal(disposedGeometry,1);assert.equal(disposedMaterial,0);assert.equal(scene.children.length,0);material.dispose();
});

test('Engine right-click on a real loose cart sends the existing owner recovery command and preserves its concrete result',async()=>{
 const {g,loose,layer,material}=fixture();g.state.units[0].haulage=undefined;delete g.state.units[0].draftCart;const actor=g.state.units[0];g.selectedUnits=()=>[actor];g.selectedBoat=null;g.workBoard={connected:()=>true};g.state.placing=null;
 const commands=[],messages=[],engine={game:g,view:{groundAt:()=>({x:10,z:0}),pickDraftCart:()=>loose,pickEntity:()=>assert.fail('cart recovery must not fall through to generic movement')},dispatch:async command=>{commands.push(command);return{accepted:true,reason:'Walking to recover the same dropped cart'};},presentationNotice:reason=>messages.push(reason)};
 Engine.prototype.rightClick.call(engine,10,10);await Promise.resolve();assert.deepEqual(commands,[{kind:'recover-draft-cart',unitId:actor.id,cartId:loose.cart.id}]);assert.deepEqual(messages,['Walking to recover the same dropped cart']);assert.equal(loose.cart.id,200);assert.equal(actor.draftCart,undefined);layer.dispose();material.dispose();
});
