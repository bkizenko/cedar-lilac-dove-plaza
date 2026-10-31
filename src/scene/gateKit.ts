import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
function beam(w:number,h:number,d:number,x:number,y:number,z:number,rz=0){const g=new THREE.BoxGeometry(w,h,d);if(rz)g.rotateZ(rz);return g.translate(x,y+h/2,z);}
/** Local front is north (-Z). The front brace/latch makes all four saved
 * facings visible; opening removes the whole leaf assembly, never the frame. */
export function timberGateKit(){
 const join=(parts:THREE.BufferGeometry[])=>{const g=mergeGeometries(parts,false)!;for(const part of parts)part.dispose();return g;};
 return{timber:join([beam(.5,3.5,3.8,-1.75,0,0),beam(.5,3.5,3.8,1.75,0,0),beam(4,.4,3.8,0,3.1,0)]),roof:join([beam(3,2.8,.25,0,0,0),beam(2.8,.13,.12,0,.55,-.19),beam(2.8,.13,.12,0,2.1,-.19),beam(.13,2.6,.12,0,.1,-.19,-.72),beam(.38,.12,.15,.95,1.28,-.29)])};
}
