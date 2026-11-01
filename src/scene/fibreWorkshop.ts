import {foundationProfile} from './foundations';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {BldGeo} from './meshes';
export const FIBRE_WORKSHOP_ART={widthMetres:4,depthMetres:4,heightMetres:2.45,frameWidthMetres:1.65,benchHeightMetres:.78} as const;
function beam(a:THREE.Vector3,b:THREE.Vector3,width=.11,depth=width){const d=b.clone().sub(a),g=new THREE.BoxGeometry(width,d.length(),depth);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);return g;}
function box(w:number,h:number,d:number,x:number,y:number,z:number){return new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);}
function merge(parts:THREE.BufferGeometry[]){const plain=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;});const out=mergeGeometries(plain)!;plain.forEach(g=>g.dispose());out.computeBoundingBox();out.computeBoundingSphere();return out;}
/** Permanent paid timber frame/bench/pegs and stone weights. Empty shelves and
 * frames deliberately contain no free fibre, cordage or finished baskets. */
export function fibreWorkshopGeo():BldGeo{
 const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z),timber:THREE.BufferGeometry[]=[];
 // A low, open work yard: canted weaving uprights are readable through the shade.
 for(const x of[-1.5,.15]){timber.push(beam(v(x,0,.9),v(x,2.1,.38),.14),beam(v(x,0,-.5),v(x,1.65,.48),.11));}
 timber.push(beam(v(-1.57,1.95,.44),v(.23,1.95,.44),.16),beam(v(-1.57,.45,.8),v(.23,.45,.8),.12));
 for(let i=0;i<8;i++)timber.push(box(.055,.13,.055,-1.4+i*.2,1.98,.44));
 // Separate twisting bench, paired winding pegs and an empty tool ledge.
 for(const x of[.55,1.45])for(const z of[-.65,.5])timber.push(beam(v(x,0,z),v(x,FIBRE_WORKSHOP_ART.benchHeightMetres,z),.12));
 timber.push(box(1.1,.12,1.45,1,.78,-.05),box(.085,.25,.085,.72,.9,-.42),box(.085,.25,.085,1.25,.9,.35),box(2.8,.1,.35,0,.28,-1.28));
 for(const x of[-1.65,1.65])timber.push(beam(v(x,0,-1.48),v(x,2.35,-1.48),.13));
 timber.push(beam(v(-1.72,2.26,-1.48),v(1.72,2.26,-1.48),.13));
 const shade:THREE.BufferGeometry[]=[];for(let i=0;i<9;i++){const x=-1.6+i*.4;shade.push(beam(v(x,2.4,-1.65),v(x,2.12,-.7),.16,.065));}
 const stones=[new THREE.IcosahedronGeometry(.19,0).scale(1,.6,.8).translate(-.95,.12,.85),new THREE.IcosahedronGeometry(.17,0).scale(1,.65,.85).translate(-.5,.11,.85)];
 return{timber:merge(timber),roof:merge(shade),extra:merge(stones),extraMat:'stone'};
}

/** Placement is a read-only footprint survey; the preview and finished station
 * use the exact same foundation calculation without flattening any terrain. */
export function fibreWorkshopPlacementLevel(g:Game,x:number,z:number,team=0){return foundationProfile(g,{type:'fibreWorkshop',x,z,w:FIBRE_WORKSHOP_ART.widthMetres,d:FIBRE_WORKSHOP_ART.depthMetres,team} as Building).level;}
