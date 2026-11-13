import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {BoundaryKind} from '../game/fieldLook';
/** Low, quiet field boundaries: grassy bank, wattle hurdle, hedge, drystone wall. Each is ~1 m long along local +x. Vertex colour carries a
 * base-to-top light gradient; the instance colour carries the muted material hue. */
function shade(g:THREE.BufferGeometry,low:number,high:number){
 g.computeBoundingBox();const b=g.boundingBox!,h=Math.max(.01,b.max.y-b.min.y),pos=g.attributes.position,c=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){const t=Math.max(0,Math.min(1,(pos.getY(i)-b.min.y)/h)),v=low+(high-low)*t,n=.96+.08*((Math.sin(pos.getX(i)*91.7+pos.getZ(i)*53.1)+1)/2);c[i*3]=v*n;c[i*3+1]=v*n;c[i*3+2]=v*n;}
 g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;
}
const finish=(parts:THREE.BufferGeometry[])=>{const flat=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();n.deleteAttribute('uv');return n;});const m=mergeGeometries(flat,false)!;for(const g of flat)g.dispose();m.computeBoundingBox();m.computeBoundingSphere();return m;};
export function boundaryGeometry(kind:BoundaryKind):THREE.BufferGeometry{
 const parts:THREE.BufferGeometry[]=[];
 if(kind==='hedge'){
  for(const [x,s,r] of [[-.42,.52,.4],[0,.62,1.1],[.42,.5,2.2]] as const){const g=new THREE.IcosahedronGeometry(.5,1);g.scale(.62,s,.55);g.rotateY(r);g.translate(x,.3+s*.35,0);parts.push(shade(g,.62,1.08));}
 }else if(kind==='stone'){
  for(const [x,y,s,r] of [[-.4,.09,.3,.4],[-.05,.13,.34,1.3],[.38,.1,.3,2.4],[-.2,.27,.24,.8],[.2,.26,.22,2.0]] as const){const g=new THREE.DodecahedronGeometry(s,0);g.scale(1.35,.5,.72);g.rotateY(r);g.translate(x,y,0);parts.push(shade(g,.7,1.1));}
 }else if(kind==='wattle'){
  for(let i=0;i<5;i++){const g=new THREE.CylinderGeometry(.03,.04,.78,4);g.translate(-.44+i*.22,.39,0);parts.push(shade(g,.7,1));}
  for(const y of [.22,.44,.64]){const g=new THREE.BoxGeometry(1.08,.09,.07);g.translate(0,y,.0);parts.push(shade(g,.9,1.1));}
 }else{
  const g=new THREE.SphereGeometry(.5,8,4,0,Math.PI*2,0,Math.PI/2);g.scale(2.3,.34,.8);parts.push(shade(g,.8,1.1));
 }
 return finish(parts);
}
/** Muted material hue per kind (sRGB hex) and a stable tint 0-1 from the site. */
export const BOUNDARY_COLOURS:Record<BoundaryKind,[string,string]>={bank:['#756f48','#8a8456'],hedge:['#43603a','#587046'],stone:['#85807a','#a09a8c'],wattle:['#8f7a58','#a8946e']};
export const BOUNDARY_CAPACITY:Record<BoundaryKind,number>={bank:3000,hedge:6000,stone:6000,wattle:4000};
