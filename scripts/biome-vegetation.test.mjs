import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {treeKit,dressingKit,TREE_FORMS,VEGETATION_KIT_RULES} from '../src/scene/vegetationKit.ts';
import {BiomeVegetation,BiomeDressing,resourceTreeForm,VEGETATION_BIOMES,BIOME_VEGETATION_RULES} from '../src/scene/biomeVegetation.ts';
const context={quality:'med',camera:{x:0,z:0},known:()=>true,winter:0,autumn:0,snow:0};
const tree=(id,x=0,z=0)=>({id,x,y:4,z,amount:50,scale:1,regenT:0});
test('seven tree forms have different physical silhouettes, finite rooted geometry and bounded kit sizes',()=>{
 const shapes=new Set();
 for(const form of TREE_FORMS){const kit=treeKit(form);const box=new THREE.Box3();
  for(const part of [kit.trunk,kit.canopy]){part.computeBoundingBox();box.union(part.boundingBox);assert.ok(part.attributes.position.count<=VEGETATION_KIT_RULES.maxTreeVerticesPerPart);for(const v of part.attributes.position.array)assert.ok(Number.isFinite(v));}
  assert.ok(box.min.y>=-1e-5);assert.ok(box.max.y>2&&box.max.y<9);shapes.add([box.max.x-box.min.x,box.max.y,box.max.z-box.min.z].map(v=>v.toFixed(2)).join('/'));
  kit.trunk.dispose();kit.canopy.dispose();
 }
 assert.equal(shapes.size,7,'silhouettes differ in geometry, not merely color');
});
test('biome tree selection is stable by resource ID and respects ecological form weights',()=>{
 assert.equal(resourceTreeForm(5,{kind:'wetland',treeForms:{willow:1}},42),'willow');
 assert.equal(resourceTreeForm(5,{kind:'warm-coast',treeForms:{palm:1}},42),'palm');
 const before=VEGETATION_BIOMES.map(kind=>resourceTreeForm(500,{kind},42));
 assert.deepEqual(before,VEGETATION_BIOMES.map(kind=>resourceTreeForm(500,{kind},42)));assert.ok(new Set(before).size>=5);
});
test('instance growth retains exact resource transforms/IDs, depletion and planting never create wood',()=>{
 const scene=new THREE.Scene(),view=new BiomeVegetation(scene,42,()=>({kind:'mixed-woodland',treeForms:{broadleaf:1}}),1);
 const nodes=[tree(1,1),tree(2,5),tree(3,9),tree(4,13)],original=structuredClone(nodes);
 const report=view.sync(nodes,context);assert.equal(report.nearTrees,4);assert.equal(report.nearCanopies,4);
 const mesh=scene.getObjectByName('resource-broadleaf-trunk'),matrix=new THREE.Matrix4(),pos=new THREE.Vector3();
 for(let i=0;i<4;i++){mesh.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);assert.equal(view.resourceId('broadleaf','trunk',i),nodes[i].id);assert.equal(pos.x,nodes[i].x);assert.equal(pos.y,nodes[i].y);}
 assert.deepEqual(nodes,original,'rendering does not change amounts or positions');
 nodes[0].amount=0;view.sync(nodes,context);assert.equal(scene.getObjectByName('resource-broadleaf-canopy').count,3);assert.equal(mesh.count,4);
 nodes[0].planted=true;nodes[0].regenT=90;view.sync(nodes,context);assert.equal(scene.getObjectByName('resource-broadleaf-canopy').count,4);
 view.dispose();assert.equal(scene.children.length,0);
});
test('known/LOD limits use one far silhouette per living resource and never reveal hidden/depleted trees',()=>{
 const scene=new THREE.Scene(),view=new BiomeVegetation(scene,42,()=>({kind:'conifer-forest'}));
 const nodes=[tree(1,10),tree(2,160),tree(3,250),tree(4,750),{...tree(5,170),amount:0}];
 const report=view.sync(nodes,{...context,known:x=>x!==250});assert.equal(report.nearTrees,1);assert.equal(report.farCanopies,1);assert.equal(view.farResourceId(1,0),2);
 view.dispose();
});
test('ground dressing has actual different forms, global quality caps, dry-ground checks and no resource state',()=>{
 for(const form of ['grass','flowers','reeds','scrub','pebbles']){const geo=dressingKit(form);assert.ok(geo.attributes.position.count>0);geo.dispose();}
 const scene=new THREE.Scene(),view=new BiomeDressing(scene),points=Array.from({length:1300},(_,i)=>({x:i%25,y:4,z:Math.floor(i/25)%25,kind:i%2?'reeds':'grass'})),before=structuredClone(points);
 assert.equal(view.sync(points,context,()=>true),BIOME_VEGETATION_RULES.dressingMaxInstances.med);
 assert.equal(view.sync(points,{...context,quality:'low'},()=>true),0);assert.equal(view.sync(points,context,()=>false),0);
 assert.deepEqual(points,before);assert.ok(scene.children.every(mesh=>mesh.name.startsWith('nonblocking-')));view.dispose();assert.equal(scene.children.length,0);
});

test('resource picking maps compacted and far instance slots to original IDs, including marked trees',()=>{
 const scene=new THREE.Scene(),view=new BiomeVegetation(scene,42,()=>({kind:'mixed-woodland',treeForms:{broadleaf:1}}));
 const nodes=[tree(42,0),tree(99,10),tree(501,160)];view.sync(nodes,{...context,known:x=>x!==0,marked:id=>id===99});
 const sources=view.pickingSources(),near=sources.find(s=>s.mesh.name==='resource-broadleaf-canopy'),far=sources.find(s=>s.mesh.name==='resource-far-crown');
 assert.deepEqual([...near.resourceIds],[99]);assert.deepEqual([...far.resourceIds],[501]);
 const color=new THREE.Color();near.mesh.getColorAt(0,color);assert.ok(color.r>color.g,'a real marked tree remains visibly marked');
 view.dispose();
});
