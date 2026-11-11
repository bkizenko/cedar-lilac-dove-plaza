import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {InstanceCameraCull} from '../src/scene/instanceCameraCull.ts';
const BANDS={near:30,mid:70};
const output=()=>({mainCameraVisible:false,distanceSquared:-1,lodTier:2});
function camera(){const c=new T.PerspectiveCamera(60,1,.1,1000);return c;}
function mesh(){const m=new T.InstancedMesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial(),1);m.geometry.computeBoundingSphere();return m;}
function dispose(m){m.geometry.dispose();m.material.dispose();m.dispose();}

test('query reuses caller output, respects exact near/mid boundaries and preserves instance buffers',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4(),version=m.instanceMatrix.version,before={...BANDS};
 try{f.begin(c);for(const [distance,tier] of [[0,0],[29.999,0],[30,1],[69.999,1],[70,2],[100,2]]){matrix.makeTranslation(0,0,-distance);assert.equal(f.query(m,matrix,BANDS,out,0),out);assert.equal(out.lodTier,tier);assert.equal(out.distanceSquared,distance*distance);assert.equal(out.mainCameraVisible,true);}assert.deepEqual(f.metrics,{tested:6,skipped:0});assert.equal(m.instanceMatrix.version,version);assert.equal(m.count,1);assert.deepEqual(BANDS,before);}finally{dispose(m);}
});
test('distance uses camera and mesh parent world transforms plus geometry centre and instance transform',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),cameraParent=new T.Group(),meshParent=new T.Group(),out=output();
 try{cameraParent.position.set(10,2,3);cameraParent.add(c);c.position.set(1,0,0);meshParent.position.set(20,2,3);meshParent.add(m);m.position.set(1,0,0);m.scale.set(2,3,4);m.geometry.boundingSphere.center.set(1,0,0);
  f.begin(c);f.query(m,new T.Matrix4().makeTranslation(0,0,-5),{near:10,mid:30},out,0);
  // Camera(11,2,3); bound centre(23,2,-17): delta(12,0,-20).
  assert.equal(out.distanceSquared,544);assert.equal(out.lodTier,1);
  cameraParent.position.x=22;f.begin(c);f.query(m,new T.Matrix4().makeTranslation(0,0,-5),{near:10,mid:30},out,0);assert.equal(out.distanceSquared,400);
 }finally{dispose(m);}
});
test('scaled actual bounds control frustum admission while padding never changes LOD distance',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4().makeTranslation(9,0,-10);
 try{m.geometry.boundingSphere.radius=.5;f.begin(c);f.query(m,matrix,BANDS,out,0);assert.equal(out.mainCameraVisible,false);const distance=out.distanceSquared;f.query(m,matrix,BANDS,out,8);assert.equal(out.mainCameraVisible,true);assert.equal(out.distanceSquared,distance);assert.equal(out.lodTier,0);
  // Large nonuniform scale expands the sphere even though the centre stays outside.
  matrix.makeScale(1,20,1);matrix.setPosition(9,0,-10);f.query(m,matrix,BANDS,out,0);assert.equal(out.mainCameraVisible,true);assert.equal(out.distanceSquared,distance);
 }finally{dispose(m);}
});
test('rotated camera updates frustum independently from the LOD distance',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4().makeTranslation(0,0,50);
 try{f.begin(c);f.query(m,matrix,BANDS,out,0);assert.equal(out.mainCameraVisible,false);assert.equal(out.lodTier,1);c.rotation.y=Math.PI;f.begin(c);f.query(m,matrix,BANDS,out,0);assert.equal(out.mainCameraVisible,true);assert.equal(out.distanceSquared,2500);assert.equal(out.lodTier,1);}finally{dispose(m);}
});
test('missing bounds retain near detail without lazy allocations; visible keeps its existing lazy behavior',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4();let computes=0;const compute=m.geometry.computeBoundingSphere.bind(m.geometry);
 try{m.geometry.boundingSphere=null;m.geometry.computeBoundingSphere=()=>{computes++;compute();};f.begin(c);f.query(m,matrix,BANDS,out);assert.deepEqual(out,{mainCameraVisible:true,distanceSquared:Infinity,lodTier:0});assert.equal(computes,0);assert.equal(m.geometry.boundingSphere,null);assert.equal(f.visible(m,matrix),true);assert.equal(computes,1);}finally{dispose(m);}
});
test('invalid bounds, transforms and unknown camera retain conservative visibility and near detail',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4();
 try{f.query(m,matrix,BANDS,out);assert.equal(out.distanceSquared,Infinity,'begin required for distance');f.begin(c);
  for(const invalid of [NaN,Infinity,-1]){m.geometry.boundingSphere.radius=invalid;f.query(m,matrix,BANDS,out);assert.deepEqual(out,{mainCameraVisible:true,distanceSquared:Infinity,lodTier:0});}
  m.geometry.boundingSphere.radius=1;m.geometry.boundingSphere.center.x=NaN;f.query(m,matrix,BANDS,out);assert.equal(out.distanceSquared,Infinity);m.geometry.boundingSphere.center.x=0;matrix.elements[12]=Infinity;f.query(m,matrix,BANDS,out);assert.equal(out.distanceSquared,Infinity);assert.equal(out.mainCameraVisible,true);
  matrix.identity();c.position.x=NaN;f.begin(c);f.query(m,matrix,BANDS,out);assert.equal(out.distanceSquared,Infinity);assert.equal(out.lodTier,0);
 }finally{dispose(m);}
});
test('quality distance bands are caller-selected and invalid band configuration is rejected before counting',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4().makeTranslation(0,0,-40);
 try{f.begin(c);f.query(m,matrix,{near:20,mid:35},out);assert.equal(out.lodTier,2);f.query(m,matrix,{near:50,mid:100},out);assert.equal(out.lodTier,0);
  for(const bands of [{near:NaN,mid:70},{near:30,mid:Infinity},{near:-1,mid:70},{near:70,mid:30},{near:30,mid:30}])assert.throws(()=>f.query(m,matrix,bands,out),RangeError);
  assert.equal(f.metrics.tested,2);
 }finally{dispose(m);}
});
test('query reports main-camera admission only and leaves a shadow caster untouched',()=>{
 const f=new InstanceCameraCull(),m=mesh(),c=camera(),out=output(),matrix=new T.Matrix4().makeTranslation(1000,0,-10);m.castShadow=true;const visible=m.visible;
 try{f.begin(c);f.query(m,matrix,BANDS,out,0);assert.equal(out.mainCameraVisible,false);assert.equal(out.lodTier,2);assert.equal(m.castShadow,true);assert.equal(m.visible,visible);assert.equal(m.count,1);
  f.query(m,matrix,BANDS,out,Infinity);assert.equal(out.mainCameraVisible,true,'unknown padding conservatively retains');assert.equal(out.lodTier,2);
 }finally{dispose(m);}
});
