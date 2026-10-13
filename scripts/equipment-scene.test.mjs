import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {haulageGeo, farmToolHeadGeo, unitGeo, deerGeo} from '../src/scene/meshes.ts';

// Import the scene without constructing a renderer or accessing any browser.
registerHooks({resolve(specifier, context, next) {
  if(specifier.startsWith('@/')) return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);
  return next(specifier,context);
}});
const {WorldView}=await import('../src/scene/world.ts');

function mesh(geometry,capacity=140){
  const m=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial(),capacity);
  m.count=0;return m;
}
function fixture(){
  const view=Object.create(WorldView.prototype);
  view.cargoMesh=mesh(new THREE.BoxGeometry(.65,.55,.75),420);
  view.haulageMeshes=new Map([['sled',mesh(haulageGeo('sled'))],['cart',mesh(haulageGeo('cart'))]]);
  view.farmToolMesh=mesh(farmToolHeadGeo());
  view.unitMeshes=new Map([['worker',mesh(unitGeo('worker'))]]);
  view.rings=mesh(new THREE.PlaneGeometry(),40);view.workRings=mesh(new THREE.PlaneGeometry(),40);
  view.ghost=new THREE.Group();view.ghost.visible=false;
  const person=(id,extra={})=>({id,type:'worker',team:0,hp:40,x:id*5,y:4,z:15,facing:0,carry:0,carryType:null,stride:0,vx:0,vz:0,stature:1,tint:.5,r:.4,order:'gather',militia:false,...extra});
  const game={state:{units:[],buildings:[],selBld:null,placing:null,time:20,weather:'clear',wildlife:[]},world:{biomes:[],rivers:[]},height:()=>4,visibleAt:(x)=>x<100,exploredAt:(x)=>x<150,travelHeight:()=>4};
  return {view,game,person};
}
const matrix=(mesh,index=0)=>{const m=new THREE.Matrix4();mesh.getMatrixAt(index,m);return m;};

test('shared equipment geometry is finite, grounded, compact and stays within a small triangle budget',()=>{
  for(const kind of ['sled','cart']){
    const geo=haulageGeo(kind);geo.computeBoundingBox();
    assert.ok(geo.getAttribute('position').count<1800);
    assert.equal(geo.getAttribute('normal').count,geo.getAttribute('position').count);
    for(const v of geo.getAttribute('position').array)assert.ok(Number.isFinite(v));
    assert.ok(geo.boundingBox.min.y>=0&&geo.boundingBox.max.y<1.2);
    assert.ok(geo.boundingBox.max.x-geo.boundingBox.min.x<1.7);
    assert.ok(geo.boundingBox.max.z>2,'shafts connect towards the owner');
    geo.dispose();
  }
  const head=farmToolHeadGeo();head.computeBoundingBox();
  assert.ok(head.getAttribute('position').count<100);
  assert.ok(head.boundingBox.min.x>.35&&head.boundingBox.max.x<.65);
  assert.ok(head.boundingBox.min.y>.9&&head.boundingBox.max.y<1.2);
  head.dispose();
});

test('cargo is drawn once on its actual owner’s sled or cart, and empty equipment stays visible',()=>{
  const {view,game,person}=fixture();
  const sled=person(1,{haulage:'sled',carry:14,carryType:'wood'});
  const cart=person(2,{haulage:'cart',carry:8,carryType:'stone',facing:Math.PI/2});
  const bare=person(3,{carry:4,carryType:'food'});
  const empty=person(4,{haulage:'cart'});
  game.state.units=[sled,cart,bare,empty];view.syncCargo(game);
  assert.equal(view.cargoMesh.count,3,'no duplicate load in the owner’s hands');
  assert.equal(view.haulageMeshes.get('sled').count,1);
  assert.equal(view.haulageMeshes.get('cart').count,2);
  const sledMatrix=matrix(view.haulageMeshes.get('sled')),loadMatrix=matrix(view.cargoMesh);
  assert.ok(Math.abs(sledMatrix.elements[14]-(sled.z-2.1))<1e-5);
  assert.equal(loadMatrix.elements[12],sledMatrix.elements[12]);
  assert.equal(loadMatrix.elements[14],sledMatrix.elements[14]);
  assert.ok(loadMatrix.elements[13]>sledMatrix.elements[13]+.34);
  const cartMatrix=matrix(view.haulageMeshes.get('cart'));
  assert.ok(Math.abs(cartMatrix.elements[12]-(cart.x-2.1))<1e-5);
  assert.equal(sled.carry,14);assert.equal(cart.carry,8);
});

test('equipment and cargo follow fog, shelter, death and militia visibility rules without leaking stale instances',()=>{
  const {view,game,person}=fixture();
  const owner=person(1,{haulage:'cart',carry:5,carryType:'food'});
  game.state.units=[owner];view.syncCargo(game);
  assert.equal(view.haulageMeshes.get('cart').count,1);
  for(const condition of [{shelterId:1},{hp:0},{team:1,x:200}]){
    game.state.units=[{...owner,...condition}];view.syncCargo(game);
    assert.equal(view.cargoMesh.count,0);assert.equal(view.haulageMeshes.get('cart').count,0);
  }
  game.state.units=[{...owner,militia:true}];view.syncCargo(game);
  assert.equal(view.haulageMeshes.get('cart').count,0);
  assert.equal(view.cargoMesh.count,1,'armed carriers use their ordinary carried load');
});

test('transport follows ground slopes and its load shares the vehicle pose',()=>{
  const {view,game,person}=fixture();
  game.travelHeight=(x,z)=>4+x*.1+z*.2;
  game.state.units=[person(1,{haulage:'sled',carry:10,carryType:'wood'})];
  view.syncCargo(game);
  const transport=matrix(view.haulageMeshes.get('sled')),cargo=matrix(view.cargoMesh);
  assert.ok(Math.abs(transport.elements[6])>.01,'pitch follows the longitudinal slope');
  assert.ok(Math.abs(transport.elements[1])>.01,'roll follows the cross slope');
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  const cq=new THREE.Quaternion();transport.decompose(p,q,s);cargo.decompose(p,cq,s);
  assert.ok(q.angleTo(cq)<.001);
  for(const value of [...transport.elements,...cargo.elements])assert.ok(Number.isFinite(value));
});

test('farm-tool heads use their owner’s body transform and distinct materials, and disappear with the owner',()=>{
  const {view,game,person}=fixture();
  game.state.units=[person(1,{farmTool:'stoneHoe'}),person(2,{farmTool:'copperTools',facing:1}),person(3,{farmTool:'ironTools',vx:1,stride:2})];
  view.syncUnits(game);
  assert.equal(view.farmToolMesh.count,3);
  for(let i=0;i<3;i++)assert.deepEqual(matrix(view.farmToolMesh,i).elements,matrix(view.unitMeshes.get('worker'),i).elements);
  const a=new THREE.Color(),b=new THREE.Color();view.farmToolMesh.getColorAt(0,a);view.farmToolMesh.getColorAt(1,b);
  assert.notDeepEqual(a,b);
  for(const p of game.state.units)p.shelterId=1;
  view.syncUnits(game);assert.equal(view.farmToolMesh.count,0);
});

test('equipment never outlives the renderer’s visible-owner capacity',()=>{
  const {view,game,person}=fixture();
  game.state.units=Array.from({length:140},(_,i)=>person(i));
  game.state.units.push(person(999,{haulage:'cart',carry:20,carryType:'wood'}));
  view.syncCargo(game);
  assert.equal(view.haulageMeshes.get('cart').count,0);assert.equal(view.cargoMesh.count,0);
});

test('finite fresh carcasses lie on their side and exhausted, spoiled or unseen carcasses disappear',()=>{
  const {view,game}=fixture();view.deer=mesh(deerGeo());view.boars=null;view.wildGoats=null;view.birds=null;
  const fresh={id:1,species:'deer',x:0,y:4,z:0,facing:0,scale:1,hp:0,carcass:{meat:24,diedAt:0}};
  game.state.wildlife=[fresh];view.syncWildlife(game);
  let body=matrix(view.deer);
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();body.decompose(p,q,s);
  assert.ok(s.x>.9);assert.ok(Math.abs(body.elements[6])>.9,'animal lies on its side');
  assert.ok(p.y>4,'rotated body is kept above the ground');
  game.state.wildlife=[{...fresh,x:120}];view.syncWildlife(game);matrix(view.deer).decompose(p,q,s);
  assert.ok(s.x>.9,'known carcasses remain visible as gathering sites after the hunter leaves');
  for(const changes of [{carcass:{meat:0,diedAt:0}},{carcass:undefined},{x:200}]){
    game.state.wildlife=[{...fresh,...changes}];view.syncWildlife(game);body=matrix(view.deer);body.decompose(p,q,s);
    assert.ok(s.x<.01);
  }
  game.state.time=1e6;game.state.wildlife=[fresh];view.syncWildlife(game);matrix(view.deer).decompose(p,q,s);
  assert.ok(s.x<.01);
});
