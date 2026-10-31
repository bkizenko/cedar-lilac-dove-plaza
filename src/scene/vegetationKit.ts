import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const TREE_FORMS=['broadleaf','conifer','willow','acacia','palm','stunted','scrub'] as const;
export type TreeForm=typeof TREE_FORMS[number];
export type DressingForm='grass'|'flowers'|'reeds'|'scrub'|'pebbles';
/** World metres. Seven genuinely different silhouettes, shared across instances. */
export const VEGETATION_KIT_RULES={treeHeightMetres:{broadleaf:6.7,conifer:7.6,willow:5.8,acacia:5.6,palm:7.2,stunted:3.6,scrub:2.8},maxTreeVerticesPerPart:2600,maxNonblockingPebbleHeightMetres:.55} as const;
function merge(parts:THREE.BufferGeometry[]){
 const list=parts.map(g=>{if(!g.index)return g;const flat=g.toNonIndexed();g.dispose();return flat;});
 // All primitives provide positions/normals/UVs. Extra vertex attributes are
 // deliberately added only after the combined kit has a consistent layout.
 const result=mergeGeometries(list,false);for(const part of list)part.dispose();
 if(!result)throw new Error('Vegetation kit attributes are incompatible');result.computeBoundingBox();result.computeBoundingSphere();return result;
}
function branch(a:[number,number,number],b:[number,number,number],radius:number){
 const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
 const g=new THREE.CylinderGeometry(radius*.62,radius,delta.length(),6,1);
 g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...from.add(to).multiplyScalar(.5).toArray() as [number,number,number]);
 const positions=g.attributes.position;for(let i=0;i<positions.count;i++)if(positions.getY(i)<0)positions.setY(i,0);g.computeVertexNormals();return g;
}
function crown(x:number,y:number,z:number,rx:number,ry:number,rz:number){const g=new THREE.IcosahedronGeometry(1,1);g.scale(rx,ry,rz);g.translate(x,y,z);return g;}
function needle(x:number,y:number,z:number,radius:number,height:number){const g=new THREE.ConeGeometry(radius,height,8,1);g.translate(x,y+height*.5,z);return g;}
function tintCrown(g:THREE.BufferGeometry){
 const pos=g.attributes.position,colors=new Float32Array(pos.count*3);g.computeBoundingBox();const box=g.boundingBox!,height=box.max.y-box.min.y;
 for(let i=0;i<pos.count;i++){const light=.73+.23*(pos.getY(i)-box.min.y)/Math.max(.1,height);colors.set([light,light,light],i*3);}
 g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;
}
export function treeKit(form:TreeForm){
 let trunk:THREE.BufferGeometry[],leaf:THREE.BufferGeometry[];
 switch(form){
 case 'broadleaf':
  trunk=[branch([0,0,0],[.12,4.8,0],.24),branch([.05,2.3,0],[-1.4,4.6,.3],.13),branch([.08,2.9,0],[1.3,5.0,-.5],.12),branch([0,3.3,0],[.1,5.3,1.15],.1)];
  leaf=[crown(-1.2,4.8,.2,1.6,1.4,1.4),crown(1,5,-.5,1.7,1.45,1.35),crown(.2,5.5,.6,1.6,1.2,1.5)];break;
 case 'conifer':
  trunk=[branch([0,0,0],[0,6.8,0],.19),branch([0,1.9,0],[1.15,2.3,.3],.07),branch([0,2.8,0],[-1.1,3.1,-.3],.065)];
  leaf=[needle(0,1.4,0,1.75,3.4),needle(.05,3.1,0,1.45,2.9),needle(0,4.7,0,1,2.9)];break;
 case 'willow':
  trunk=[branch([0,0,0],[-.2,3.2,0],.28),branch([-.1,2,0],[-1.5,4.7,.4],.14),branch([-.1,2.5,0],[1.6,4.5,.1],.14),branch([0,2.4,0],[0,4.8,-1.2],.12)];
  leaf=[crown(0,4.5,0,2.4,1.3,1.9)];
  for(let i=0;i<6;i++){const a=i*Math.PI/3;leaf.push(crown(Math.cos(a)*1.8,3.1,Math.sin(a)*1.5,.55,1.9,.55));}break;
 case 'acacia':
  trunk=[branch([0,0,0],[.45,3.5,.15],.22),branch([.25,2.1,0],[-1.5,4.5,.2],.13),branch([.35,2.9,.1],[2,4.7,-.3],.12)];
  leaf=[crown(-1.4,4.7,.15,1.9,.7,1.5),crown(1.5,4.9,-.1,2,.7,1.55),crown(.15,5.1,0,1.7,.55,1.6)];break;
 case 'palm':
  trunk=[branch([0,0,0],[.2,3.3,0],.21),branch([.2,3.3,0],[.8,6.2,.2],.18)];leaf=[];
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7,dx=Math.cos(a),dz=Math.sin(a),g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute([.8,6.25,.2,.8+dx*1.2-dz*.3,6.75,.2+dz*1.2+dx*.3,.8+dx*3,5.65,.2+dz*3,.8+dx*1.2+dz*.3,6.75,.2+dz*1.2-dx*.3],3));
   g.setAttribute('uv',new THREE.Float32BufferAttribute([.5,0,0,.4,.5,1,1,.4],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();leaf.push(g);
  }break;
 case 'stunted':
  trunk=[branch([0,0,0],[.6,2.5,0],.2),branch([.15,.9,0],[1.2,2.1,.3],.12),branch([.3,1.4,0],[-.8,2.2,-.2],.09)];
  leaf=[needle(.4,1.5,0,.9,2.1),needle(1,1.35,.2,.75,1.35),needle(-.55,1.5,-.1,.8,1.2)];break;
 case 'scrub':
  trunk=[branch([0,0,0],[-.5,1.8,.2],.11),branch([0,0,0],[.65,1.7,-.2],.1),branch([0,.4,0],[0,2.25,.3],.09)];
  leaf=[crown(-.5,1.8,.2,.9,.7,.8),crown(.6,1.7,-.1,.9,.7,.7),crown(0,2.2,.3,.8,.6,.7)];break;
 }
 return {trunk:merge(trunk),canopy:tintCrown(merge(leaf))};
}
export function dressingKit(form:DressingForm){
 const parts:THREE.BufferGeometry[]=[];
 if(form==='grass'||form==='flowers'){
  for(let i=0;i<5;i++){const a=i*2.399,g=new THREE.BufferGeometry(),x=Math.cos(a)*.17,z=Math.sin(a)*.17,h=.23+(i%3)*.13;
   g.setAttribute('position',new THREE.Float32BufferAttribute([x-.025,0,z,x+.025,0,z,x+Math.cos(a)*.1,h,z+Math.sin(a)*.1],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));g.computeVertexNormals();parts.push(g);
   if(form==='flowers'&&i%2===0){const flower=new THREE.IcosahedronGeometry(.065,0);flower.scale(1,.45,1);flower.translate(x,h,z);parts.push(flower);}
  }
 }else if(form==='reeds'){
  for(let i=0;i<5;i++){const x=Math.cos(i*2.1)*.3,z=Math.sin(i*2.1)*.3,h=1+(i%3)*.26;parts.push(branch([x,0,z],[x+.1,h,z],.023));const top=new THREE.CylinderGeometry(.05,.05,.24,5);top.translate(x+.1,h-.07,z);parts.push(top);}
 }else if(form==='scrub'){
  parts.push(branch([0,0,0],[-.2,.5,0],.035),branch([0,0,0],[.25,.4,.1],.035),crown(-.18,.45,0,.25,.16,.2),crown(.2,.4,.1,.24,.15,.2));
 }else{
  for(let i=0;i<3;i++){const g=new THREE.DodecahedronGeometry(.18+i*.04,0);g.scale(1.2,.65,1);g.translate((i-1)*.25,.13+i*.025,Math.sin(i)*.15);parts.push(g);}
 }
 return merge(parts);
}
