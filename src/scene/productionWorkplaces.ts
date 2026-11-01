import {fibreWorkshopGeo} from './fibreWorkshop';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {BldGeo} from './meshes';
export type ProductionWorkplaceId='fibreWorkshop'|'potter'|'kiln'|'smokehouse'|'grindingStone'|'oven'|'hearth'|'butcher'|'dryrack'|'tanner'|'tailor';
function box(w:number,h:number,d:number,x=0,y=0,z=0,rz=0){const g=new THREE.BoxGeometry(w,h,d);if(rz)g.rotateZ(rz);g.translate(x,y+h/2,z);return g;}
function tub(x:number,z:number){const g=new THREE.CylinderGeometry(.76,.64,.65,12,1,true);g.translate(x,.4,z);return g;}
function combine(gs:THREE.BufferGeometry[]){const plain=gs.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;});const result=mergeGeometries(plain)!;plain.forEach(g=>g.dispose());result.computeBoundingBox();return result;}
function frame(width=3.4){return [-width/2,width/2].map(x=>box(.15,2.2,.15,x,0,0)).concat([box(width+.25,.15,.15,0,2.1,0)]);}
/** Distinct permanent work surfaces, not free ingredients, finished clothes or a decorative everlasting flame. */
export function productionWorkplaceGeos():Record<ProductionWorkplaceId,BldGeo>{
 const stones=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return box(.4,.28,.35,Math.cos(a)*1.1,.02,Math.sin(a)*1.1,a);});
 const legs=[-1.25,1.25].flatMap(x=>[-.5,.5].map(z=>box(.16,.95,.16,x,0,z)));
 return{
 fibreWorkshop:fibreWorkshopGeo(),
 potter:{timber:combine([...legs,box(2.9,.15,1.2,0,.95,.6),...frame(3.2).map(g=>g.translate(0,0,-1)),...[-.6,.15,.9].map(y=>box(2.8,.1,.8,0,y,-1))]),roof:combine([box(3.8,.14,3.5,0,2.4,0)]),extra:combine([box(.75,.12,.65,-.7,1.1,.6),box(.75,.1,.65,.7,1.1,.6)]),extraMat:'stone'},
 kiln:{timber:combine([box(.12,1.2,.12,-1.75,0,-1.5),box(.12,1.2,.12,1.75,0,-1.5),box(3.6,.12,.12,0,1.2,-1.5)]),roof:combine([box(.6,.18,.65,0,1.65,-.25)]),extra:combine([new THREE.CylinderGeometry(1.15,1.4,1.4,14,1,true,.45,Math.PI*2-.9).translate(0,.8,0),new THREE.CylinderGeometry(1.4,1.5,.18,14).translate(0,.09,0),box(.35,.9,.45,-.5,.1,1.12),box(.35,.9,.45,.5,.1,1.12),box(1.35,.3,.45,0,1,1.12)]),extraMat:'stone'},
 smokehouse:{timber:combine([...frame(3.2),...frame(3.2).map(g=>g.translate(0,0,-2)),box(3.5,.2,2.4,0,.15,-1),box(.12,.12,2.2,-.7,1.4,-1),box(.12,.12,2.2,.7,1.4,-1)]),roof:combine([box(3.8,.18,3,0,2.5,-1)]),extra:combine([box(1.2,.6,1,0,.2,-1),box(.5,.9,.5,1.25,2,-1)]),extraMat:'stone'},
 grindingStone:{timber:combine([box(.9,.12,.5,0,.65,0)]),roof:combine([box(.42,.16,.3,.08,.8,0)]),extra:combine([box(1.8,.7,1.2,0,0,0),box(1.5,.12,1,0,.7,0)]),extraMat:'stone'},
 oven:{timber:combine([box(1.7,.75,1.3,0,0,0),box(.15,1.5,.15,-1.7,0,1.2),box(.15,1.5,.15,1.7,0,1.2)]),roof:combine([box(3.5,.12,2.8,0,2.2,0)]),extra:combine([box(2.1,1.3,.4,0,.75,-.75),box(.4,1.3,1.4,-.85,.75,0),box(.4,1.3,1.4,.85,.75,0),box(1.5,.35,1.6,0,1.7,0)]),extraMat:'stone'},
 hearth:{timber:combine([box(.8,.12,.12,-.2,.06,0,.4),box(.8,.12,.12,.2,.08,0,-.4),...frame(2.8)]),roof:combine([box(.12,.12,.7,0,1.65,0)]),extra:combine(stones),extraMat:'stone'},
 butcher:{timber:combine([...legs,box(3,.24,1.4,0,.95,0),box(.18,1.7,.18,-1.8,0,-.9),box(.18,1.7,.18,1.8,0,-.9),box(3.8,.16,.16,0,1.65,-.9)]),roof:combine([box(4.3,.14,2.8,0,2.05,-.25)]),extra:combine([box(.6,.05,.5,-.6,1.21,0)]),extraMat:'stone'},
 dryrack:{timber:combine([...frame(3.5),...frame(3.5).map(g=>g.translate(0,0,-1.5)),...[-1.1,0,1.1].map(x=>box(.1,.12,1.7,x,1.4,-.75))]),roof:combine([box(4,.12,2.5,0,2.3,-.75)]),extra:combine([box(3.1,.08,1.3,0,.75,-.75)]),extraMat:'dark'},
 tanner:{timber:combine([...frame(2.2).map(g=>g.translate(-1.4,0,-.8)),tub(.9,.4),tub(.9,-1.3),box(1,.15,.6,-1.4,.8,.5)]),roof:combine([box(3.1,.1,2.8,-1.3,2.4,-.3)]),extra:combine([box(.5,.06,.8,-1.4,.96,.5)]),extraMat:'stone'},
 tailor:{timber:combine([...legs,box(3,.17,1.5,0,.95,0),box(.8,.6,.65,-1.6,0,1),...frame(3.5).map(g=>g.translate(0,0,-1))]),roof:combine([box(4.2,.14,3.3,0,2.35,-.1)]),extra:combine([box(.65,.06,.4,.8,1.12,-.2)]),extraMat:'dark'}
 };
}
