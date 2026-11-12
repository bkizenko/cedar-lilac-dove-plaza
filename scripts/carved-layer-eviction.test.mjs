import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDINGS} from '../src/game/constants.ts';
import {CARVED_TYPES} from '../src/scene/buildingStyleMap.ts';
import {CarvedBuildingLayer,CARVED_LAYER_RULES} from '../src/scene/carvedBuildingLayer.ts';

// C13 / WQ-12: after a long session has visited many variants, a building that comes near must get a
// real mesh bucket (the least-recently-used untouched bucket is evicted), not stay a card impostor.
const HABITATS=['plains','forest','hills','desert','tundra','wetland'];
function many(n,x0=0){const out=[];let id=1;
 for(const era of[0,1,2,3,5])for(const habitat of HABITATS)for(const type of CARVED_TYPES){
  if(out.length>=n)return out;
  out.push({worldSeed:5,type,id:id++,era,habitat,footprint:{w:BUILDINGS[type].w,d:BUILDINGS[type].d},x:x0+out.length,y:0,z:0,yaw:0});}
 return out;}
test('near building takes a bucket by evicting a stale one once the bucket cap is reached',()=>{
 const scene=new THREE.Scene(),layer=new CarvedBuildingLayer(scene),cam=new THREE.Vector3(0,0,0),near=()=>0;
 layer.sync(many(CARVED_LAYER_RULES.maximumBuckets*3),cam,near);
 const filled=layer.stats().buckets;
 assert.ok(filled<=CARVED_LAYER_RULES.maximumBuckets,'bucket count never exceeds the cap');
 assert.equal(filled,CARVED_LAYER_RULES.maximumBuckets,'session visited enough variants to hit the cap');
 // next frame: one building of a variant that has no bucket yet (the tail of the first list)
 const all=many(CARVED_LAYER_RULES.maximumBuckets*3),tail=all[all.length-1];
 layer.sync([tail],cam,near);
 const s=layer.stats();
 assert.ok(s.buckets<=CARVED_LAYER_RULES.maximumBuckets);
 const solid=[...layer.sources()].filter(([m,o])=>m.name!=='carved-h-impostors'&&o.length>0);
 assert.equal(solid.length,1,'near building drew from a real bucket');
 assert.equal(solid[0][1][0],tail);
 layer.dispose();
});
test('buckets used in the current sync are never evicted',()=>{
 const scene=new THREE.Scene(),layer=new CarvedBuildingLayer(scene),cam=new THREE.Vector3(),near=()=>0;
 const list=many(CARVED_LAYER_RULES.maximumBuckets*2);
 layer.sync(list,cam,near);
 const owned=[...layer.sources()].filter(([m,o])=>m.name!=='carved-h-impostors').reduce((n,[,o])=>n+o.length,0);
 const card=layer.sources().get([...layer.sources().keys()].find(m=>m.name==='carved-h-impostors')).length;
 assert.equal(owned+card,list.length,'every instance is drawn exactly once (solid or card), none dropped');
 assert.ok(owned>0&&layer.stats().buckets<=CARVED_LAYER_RULES.maximumBuckets);
 layer.dispose();
});
