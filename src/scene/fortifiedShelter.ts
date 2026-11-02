import * as THREE from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';import type {BldGeo} from './meshes';
function box(w:number,h:number,d:number,x:number,y:number,z:number){return new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);}
function merge(parts:THREE.BufferGeometry[]){const gs=parts.map(p=>{const g=p.toNonIndexed();p.dispose();return g;}),out=mergeGeometries(gs)!;gs.forEach(g=>g.dispose());out.computeBoundingBox();return out;}
/** Timber field shelter: thick braced walls, an actual doorway and narrow
 * openings, without stone towers or decorative equipment masquerading as stock. */
export function fortifiedShelterGeo():BldGeo{
 const wall:THREE.BufferGeometry[]=[];
 for(const z of[-3.25,3.25]){
  for(const side of[-1,1]){
   const cx=side*2.12;wall.push(box(2.75,1.4,.42,cx,0,z),box(2.75,.72,.42,cx,1.95,z));
   for(const x of[cx-1.24,cx-.48,cx+.48,cx+1.24])wall.push(box(.3,.55,.42,x,1.4,z));
  }
  if(z<0)wall.push(box(1.5,2.67,.42,0,0,z));else wall.push(box(1.5,.52,.42,0,2.15,z));
 }
 for(const x of[-3.65,3.65]){wall.push(box(.42,1.4,6.2,x,0,0),box(.42,.72,6.2,x,1.95,0));for(const z of[-2.85,-1.8,-.8,.8,1.8,2.85])wall.push(box(.42,.55,.4,x,1.4,z));}
 for(const x of[-3.78,3.78])for(const z of[-3.38,3.38])wall.push(box(.36,3.05,.36,x,0,z));
 for(const x of[-3.9,3.9])for(const z of[-2,2]){const g=box(.24,2.3,.24,x,0,z);g.rotateZ(x<0?-.08:.08);wall.push(g);}
 const roof:THREE.BufferGeometry[]=[];for(const side of[-1,1]){const g=new THREE.BoxGeometry(4.35,.24,7.55);g.rotateZ(side*.32);g.translate(side*1.98,3.12,0);roof.push(g);}roof.push(box(.22,.2,7.7,0,3.9,0));
 return{timber:merge(wall),roof:merge(roof)};
}
