import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {cargoGeo, canoePaddleGeo, haulageGeo, farmToolHeadGeo, unitGeo, deerGeo} from '../src/scene/meshes.ts';

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
  view.cargoMeshes=new Map(["food","wood","stone","copper","iron"].map(k=>[k,mesh(cargoGeo(k),420)]));
  view.haulageMeshes=new Map(['sled','cart','canoe','pack'].map(k=>[k,mesh(haulageGeo(k))]));
  view.canoePaddles=mesh(canoePaddleGeo());
  view.farmToolMesh=mesh(farmToolHeadGeo());
  view.unitMeshes=new Map([['worker',mesh(unitGeo('worker'))]]);
  view.rings=mesh(new THREE.PlaneGeometry(),40);view.workRings=mesh(new THREE.PlaneGeometry(),40);
  view.resourceRing=new THREE.Mesh(new THREE.RingGeometry(1,1.2),new THREE.MeshBasicMaterial());
  view.ghost=new THREE.Group();view.ghost.visible=false;
  const person=(id,extra={})=>({id,type:'worker',team:0,hp:40,x:id*5,y:4,z:15,facing:0,carry:0,carryType:null,stride:0,vx:0,vz:0,stature:1,tint:.5,r:.4,order:'gather',militia:false,...extra});
  const game={state:{units:[],buildings:[],selBld:null,placing:null,time:20,weather:'clear',wildlife:[]},world:{biomes:[],rivers:[],waterY:0},height:()=>4,visibleAt:(x)=>x<100,exploredAt:(x)=>x<150,travelHeight:()=>4};
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
  assert.equal([...view.cargoMeshes.values()].reduce((n,m)=>n+m.count,0),3,'no duplicate load in the owner’s hands');
  assert.equal(view.cargoMeshes.get('wood').count,1);assert.equal(view.cargoMeshes.get('stone').count,1);assert.equal(view.cargoMeshes.get('food').count,1);
  assert.equal(view.haulageMeshes.get('sled').count,1);
  assert.equal(view.haulageMeshes.get('cart').count,2);
  const sledMatrix=matrix(view.haulageMeshes.get('sled')),loadMatrix=matrix(view.cargoMeshes.get("wood"));
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
    assert.equal([...view.cargoMeshes.values()].reduce((n,m)=>n+m.count,0),0);assert.equal(view.haulageMeshes.get('cart').count,0);
  }
  game.state.units=[{...owner,militia:true}];view.syncCargo(game);
  assert.equal(view.haulageMeshes.get('cart').count,0);
  assert.equal([...view.cargoMeshes.values()].reduce((n,m)=>n+m.count,0),1,'armed carriers use their ordinary carried load');
});

test('transport follows ground slopes and its load shares the vehicle pose',()=>{
  const {view,game,person}=fixture();
  game.travelHeight=(x,z)=>4+x*.1+z*.2;
  game.state.units=[person(1,{haulage:'sled',carry:10,carryType:'wood'})];
  view.syncCargo(game);
  const transport=matrix(view.haulageMeshes.get('sled')),cargo=matrix(view.cargoMeshes.get("wood"));
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
  assert.equal(view.haulageMeshes.get('cart').count,0);assert.equal([...view.cargoMeshes.values()].reduce((n,m)=>n+m.count,0),0);
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

test('newly exposed ore grows its render capacity without losing fog or depletion visibility',()=>{
 const {view,game}=fixture();view.scene=new THREE.Scene();view.treesTrunk=mesh(new THREE.BoxGeometry(),1);view.treesLeaf=mesh(new THREE.BoxGeometry(),1);
 view.copper=mesh(new THREE.BoxGeometry(),1);view.iron=mesh(new THREE.BoxGeometry(),1);view.scene.add(view.copper,view.iron);
 game.state.trees=[];game.state.stones=[];game.state.copper=[{x:0,y:4,z:0,amount:20,scale:1},{x:10,y:4,z:10,amount:40,scale:1},{x:200,y:4,z:10,amount:40,scale:1}];game.state.iron=[];
 const old=view.copper,geometry=old.geometry;let disposed=false;old.addEventListener('dispose',()=>disposed=true);view.syncNature(game);
 assert.equal(view.copper.count,3);assert.equal(view.copper.geometry,geometry);assert.equal(disposed,true);assert.equal(view.scene.children.includes(old),false);
 const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();matrix(view.copper,1).decompose(p,q,s);assert.equal(p.x,10);assert.ok(s.x>.9);
 matrix(view.copper,2).decompose(p,q,s);assert.ok(s.x<.01,'unexplored new veins remain hidden');game.state.copper[1].amount=0;view.syncNature(game);matrix(view.copper,1).decompose(p,q,s);assert.ok(s.x<.01,'exhausted veins disappear');
});


test('distinct cargo silhouettes remain finite and small without per-carrier meshes',()=>{
 const shapes=[];
 for(const kind of ['food','wood','stone','copper','iron']){
  const geo=cargoGeo(kind);geo.computeBoundingBox();
  assert.ok(geo.getAttribute('position').count<=180);
  assert.ok([...geo.getAttribute('position').array].every(Number.isFinite));
  shapes.push([...geo.getAttribute('position').array].join(','));geo.dispose();
 }
 assert.equal(new Set(shapes.slice(0,3)).size,3,'food, logs and rocks must have distinct shapes');
});


test('canoes float with their carrier, portage on land, and pack animals carry cargo without duplicates',()=>{
 const {view,game,person}=fixture();const sailor=person(1,{haulage:'canoe',carry:12,carryType:'wood',y:.16}),handler=person(2,{haulage:'pack',carry:8,carryType:'stone'});
 game.height=(x)=>x===sailor.x?-2:4;game.state.units=[sailor,handler];view.syncCargo(game);
 assert.equal(view.haulageMeshes.get('canoe').count,1);assert.equal(view.haulageMeshes.get('pack').count,1);
 assert.ok(Math.abs(matrix(view.haulageMeshes.get('canoe')).elements[13]+.12)<.001);assert.equal(matrix(view.haulageMeshes.get('canoe')).elements[12],sailor.x);
 assert.equal([...view.cargoMeshes.values()].reduce((n,m)=>n+m.count,0),2);
 game.height=()=>4;sailor.y=4;view.syncCargo(game);assert.ok(matrix(view.haulageMeshes.get('canoe')).elements[13]>5);
 sailor.hp=0;handler.shelterId=1;view.syncCargo(game);assert.equal(view.haulageMeshes.get('canoe').count,0);assert.equal(view.haulageMeshes.get('pack').count,0);
 for(const kind of ['canoe','pack']){const geo=haulageGeo(kind);assert.ok(geo.getAttribute('position').count<600);assert.ok([...geo.getAttribute('position').array].every(Number.isFinite));geo.dispose();}
});

test('ruin cargo reuses bounded shared batches and reveals only currently visible remaining supplies',()=>{
 const {view,game,person}=fixture();game.state.units=[person(1,{carry:8,carryType:'wood'})];
 game.state.buildings=[{id:4,hp:0,x:20,z:20,raidLoot:{food:24,wood:40,stone:0}},{id:5,hp:0,x:120,z:20,raidLoot:{food:50}},{id:6,hp:20,x:30,z:20,raidLoot:{food:20}}];
 view.syncCargo(game);assert.equal(view.cargoMeshes.get('food').count,1);assert.equal(view.cargoMeshes.get('wood').count,2);assert.equal(view.cargoMeshes.get('stone').count,0);
 const m=matrix(view.cargoMeshes.get('food'));assert.ok(m.elements.every(Number.isFinite));assert.ok(m.elements[13]>4);
 game.state.buildings[0].raidLoot.food=0;view.syncCargo(game);assert.equal(view.cargoMeshes.get('food').count,0);
 game.state.buildings=Array.from({length:500},(_,id)=>({id,hp:0,x:20,z:20,raidLoot:{wood:10}}));view.syncCargo(game);assert.equal(view.cargoMeshes.get('wood').count,420);
 assert.equal(matrix(view.cargoMeshes.get('wood'),0).elements[12],5,'resident cargo keeps priority over ruin decoration');
});

test('armed traders keep visible pack animals and loads in the existing shared batches',()=>{
 const {view,game,person}=fixture();
 game.state.units=[person(1,{type:'spearman',militia:true,caravanArmed:true,haulage:'pack',carry:12,carryType:'wood'})];
 view.syncCargo(game);
 assert.equal(view.haulageMeshes.get('pack').count,1);
 assert.equal(view.cargoMeshes.get('wood').count,1);
 game.state.units[0].hp=0;view.syncCargo(game);
 assert.equal(view.haulageMeshes.get('pack').count,0);
 assert.equal(view.cargoMeshes.get('wood').count,0);
});


test('shared canoe paddles animate only on moving visible boats and disappear with their owners',()=>{
 const {view,game,person}=fixture();game.height=()=>-1;
 const u=person(1,{haulage:'canoe',vx:1});game.state.units=[u];
 view.syncCargo(game);assert.equal(view.canoePaddles.count,1);const first=matrix(view.canoePaddles).toArray();
 game.state.time+=.4;view.syncCargo(game);assert.notDeepEqual(matrix(view.canoePaddles).toArray(),first);
 u.vx=0;view.syncCargo(game);const still=matrix(view.canoePaddles).toArray();game.state.time+=1;view.syncCargo(game);assert.deepEqual(matrix(view.canoePaddles).toArray(),still);
 u.hp=0;view.syncCargo(game);assert.equal(view.canoePaddles.count,0);
 const geometry=canoePaddleGeo();assert.ok(geometry.getAttribute('position').count<150);geometry.dispose();
});


test('pack animal gait carries its load with it and stops when the handler stops',()=>{
 const {view,game,person}=fixture();const u=person(1,{haulage:'pack',carry:10,carryType:'wood',vx:1});game.state.units=[u];
 view.syncCargo(game);const first=matrix(view.haulageMeshes.get('pack')).toArray(),load=matrix(view.cargoMeshes.get('wood')).toArray();
 u.stride+=.4;view.syncCargo(game);
 assert.notDeepEqual(matrix(view.haulageMeshes.get('pack')).toArray(),first);
 assert.notDeepEqual(matrix(view.cargoMeshes.get('wood')).toArray(),load);
 u.vx=0;view.syncCargo(game);const still=matrix(view.haulageMeshes.get('pack')).toArray();
 u.stride+=1;view.syncCargo(game);assert.deepEqual(matrix(view.haulageMeshes.get('pack')).toArray(),still);
 assert.equal(view.haulageMeshes.get('pack').count,1);
});
