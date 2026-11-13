import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {boundaryGeometry,BOUNDARY_LEN,BOUNDARY_SCENE_BUDGET} from '../src/scene/fieldBoundaries.ts';
import {painterCropGeometry,painterWeedGeometry,PAINTER_CROP_SEGMENT} from '../src/scene/painterCrops.ts';
import {ContourFields,contourPlantSpacing} from '../src/scene/contourFields.ts';
import {FieldSurface} from '../src/scene/fieldSurface.ts';
import {BOUNDARY_RULES} from '../src/game/fieldLook.ts';
const tris=g=>(g.index?g.index.count:g.attributes.position.count)/3;
test('every boundary kind builds distinct, bounded, coloured geometry; low-poly is much cheaper',()=>{
 const seen=new Set();
 for(const [kind,top] of [['stone',1.1],['wattle',1.3],['hedge',1.3],['bank',.8],['gate',1.3]]){
  const n=kind==='gate'?1:BOUNDARY_RULES.variants[kind];
  for(let v=0;v<n;v++){const g=boundaryGeometry(kind,v);g.computeBoundingBox();const b=g.boundingBox;
   assert.ok(g.attributes.color&&g.attributes.position.count>40,`${kind}${v} has vertex colour`);assert.ok(b.min.y>=-.05&&b.max.y<top&&b.max.y>.25,`${kind}${v} height ${b.max.y}`);
   assert.ok(b.max.x-b.min.x>BOUNDARY_LEN*.9&&b.max.x-b.min.x<BOUNDARY_LEN*1.45,`${kind}${v} runs about one piece long`);assert.ok(b.max.z-b.min.z<1.3);assert.ok(tris(g)<1100,`${kind}${v} tris ${tris(g)}`);seen.add(`${kind}${v}:${g.attributes.position.count}`);}
  if(kind!=='gate'){const lo=boundaryGeometry(kind,'lo');assert.ok(tris(lo)<tris(boundaryGeometry(kind,0))*.8,`${kind} low-poly is cheaper`);}
 }
 assert.ok(seen.size>=9,'variants differ');
});
test('stone wall is a coursed wall of many rough stones, not a few smooth blobs',()=>{
 const g=boundaryGeometry('stone',0);assert.ok(tris(g)>200);assert.equal(g.index===null||g.index.count>0,true);
});
test('crop and weed instances are fine and cheap: many stalks per furrow but bounded triangles',()=>{
 for(const k of ['grain','pulses','tubers']){const g=painterCropGeometry(k);g.computeBoundingBox();assert.ok(tris(g)<420,`${k} tris ${tris(g)}`);assert.ok(g.boundingBox.max.x-g.boundingBox.min.x>PAINTER_CROP_SEGMENT[k]*.8);}
 assert.ok(tris(painterCropGeometry('grain'))>100);const w=painterWeedGeometry();assert.ok(tris(w)>20&&tris(w)<120);
 const sp=contourPlantSpacing({w:24.6,d:16.4},'grain');assert.ok(sp.row>=.95&&sp.plant>=.82);assert.ok(contourPlantSpacing({w:80,d:60},'grain').plant>sp.plant);
});
const field=(id,x,stage)=>({id,type:'farm',x,z:0,w:16,d:12,hp:100,team:0,build:1,cropType:'grain',crop:{kind:'grain',planted:stage==='bare'?0:1,tended:1,ripened:stage==='ripe',remaining:100}});
function rig(fields,time=3825){
 const scene=new THREE.Scene(),surface=new FieldSurface(new Float32Array([0,1,2,3]),400),view=new ContourFields(scene,surface,'painterly');
 const g={world:{heights:new Float32Array([1,2,3,4]),size:400},state:{time,buildings:fields,trails:[]},height:(x,z)=>5+x*.01+z*.005,waterAt:()=>0,exploredAt:()=>true,navigationRevision:()=>1};
 return{scene,view,g};
}
test('painterly field layer draws boundary, crops and weeds near, thins in the mid tier and draws nothing far',()=>{
 const {scene,view,g}=rig([field(1,0,'ripe'),field(2,17,'growing'),field(3,34,'bare')]);
 const near=view.sync(g,{x:0,z:0,y:30},()=>({era:3,variant:1}),{quality:'med'});
 assert.ok(near.plants>200);const drawn=()=>scene.children.filter(m=>m.isInstancedMesh&&m.count>0);
 assert.ok(drawn().some(m=>m.name.startsWith('field-boundary-stone')),'drystone drawn');assert.ok(drawn().some(m=>m.name==='field-weeds'),'weeds drawn');
 let bn=0;for(const m of drawn())if(m.name.startsWith('field-boundary'))bn+=m.count;assert.ok(bn>20&&bn<=BOUNDARY_SCENE_BUDGET);
 const mid=view.sync(g,{x:0,z:0,y:150},()=>({era:3,variant:1}),{quality:'med'});
 assert.ok(mid.plants>0&&mid.plants<near.plants,'mid tier thins crops');assert.ok(!drawn().some(m=>m.name==='field-weeds'),'no weeds beyond the near tier');
 assert.ok(drawn().some(m=>m.name==='field-boundary-stone-lo'),'low-poly boundary in the mid tier');
 const far=view.sync(g,{x:0,z:0,y:400},()=>({era:3,variant:1}),{quality:'med'});assert.equal(far.plants,0);assert.equal(drawn().length,0,'texture only when far');
 view.dispose();assert.equal(scene.children.length,0);
});
test('boundary kind follows era and variant, and the sync is cached (no rebuild when nothing changed)',()=>{
 const {scene,view,g}=rig([field(1,0,'ripe')]);
 for(const [era,variant,name]of [[0,0,'field-boundary-bank'],[1,0,'field-boundary-wattle'],[2,0,'field-boundary-hedge'],[3,1,'field-boundary-stone']]){
  view.sync(g,{x:0,z:0,y:20},()=>({era,variant}),{quality:'med'});assert.ok(scene.children.some(m=>m.isInstancedMesh&&m.count>0&&m.name.startsWith(name)),name);}
 const m=scene.children.find(m=>m.name.startsWith('field-boundary-stone')&&m.count>0),v=m.instanceMatrix.version;view.sync(g,{x:0,z:0,y:20},()=>({era:3,variant:1}),{quality:'med'});assert.equal(m.instanceMatrix.version,v,'unchanged sync uploads nothing');
 view.dispose();
});
