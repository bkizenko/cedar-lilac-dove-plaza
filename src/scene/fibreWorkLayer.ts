import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import {PRODUCTION_RECIPES,productionWorkSeconds} from '../game/production';
import type {ProductionProject,ProductionRecipeSpec} from '../game/production';
import {TEAM_STYLE} from '../game/constants';
import {foundationProfile} from './foundations';
export const FIBRE_WORK_ART={capacity:256,refreshSeconds:.25,maximumDistanceMetres:280} as const;
/** Inputs were paid earlier, but do not appear here until they actually reach
 * their workplace. Paused work keeps its physical workpiece and progress. */
export function paidFibreWork(p:ProductionProject){const r=PRODUCTION_RECIPES[p.recipe] as ProductionRecipeSpec|undefined;if(!r||!(r.inputs.plantFibre||r.inputs.cordage)||!(p.phase==='working'||p.phase==='paused'&&p.resumePhase==='working'))return null;return{weaving:!!r.outputs.basket,growth:Math.max(.05,Math.min(1,p.progress/Math.max(.1,productionWorkSeconds(p.recipe))))};}
function merge(parts:THREE.BufferGeometry[]){const plain=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;});const out=mergeGeometries(plain)!;plain.forEach(g=>g.dispose());return out;}
function bundleGeometry(){const parts:THREE.BufferGeometry[]=[];for(let i=0;i<9;i++){const a=i*Math.PI*2/9,g=new THREE.CylinderGeometry(.012,.02,.72,4);g.rotateZ(.05*Math.sin(a));g.rotateX(Math.PI/2+.04*Math.cos(a));g.translate(Math.cos(a)*.05,Math.sin(a)*.035,0);parts.push(g);}for(const z of[-.22,.20]){const ring=new THREE.TorusGeometry(.065,.008,3,8);ring.translate(0,0,z);parts.push(ring);}return merge(parts);}
function warpGeometry(){const parts:THREE.BufferGeometry[]=[];for(let i=0;i<10;i++){const line=new THREE.CylinderGeometry(.007,.009,1.05,3);line.translate(-.65+i*.145,.525,0);parts.push(line);}for(let i=0;i<12;i++){const row=new THREE.BoxGeometry(1.4,.009,.016);row.translate(0,.06+i*.083,.008*(i%2?1:-1));parts.push(row);}return merge(parts);}
export class FibreWorkLayer{
 readonly bundles:THREE.InstancedMesh;readonly weaving:THREE.InstancedMesh;private scene:THREE.Scene;private material:THREE.MeshStandardMaterial;private world:Game['world']|null=null;private state:Game['state']|null=null;private next=-Infinity;private disposed=false;private axis=new THREE.Vector3(0,1,0);private matrix=new THREE.Matrix4();private base=new THREE.Matrix4();private local=new THREE.Matrix4();private position=new THREE.Vector3();private quaternion=new THREE.Quaternion();private scale=new THREE.Vector3();
 constructor(scene:THREE.Scene){this.scene=scene;this.material=new THREE.MeshStandardMaterial({color:0xcdb17b,roughness:.96,metalness:0});this.bundles=new THREE.InstancedMesh(bundleGeometry(),this.material,FIBRE_WORK_ART.capacity);this.weaving=new THREE.InstancedMesh(warpGeometry(),this.material,FIBRE_WORK_ART.capacity);for(const [mesh,name]of[[this.bundles,'actual-paid-fibre-batches'],[this.weaving,'actual-paid-weaving-progress']] as const){mesh.name=name;mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.raycast=()=>undefined;scene.add(mesh);}}
 sync(g:Game,camera:THREE.Vector3,shadows=false){if(this.disposed)return;if(this.world!==g.world||this.state!==g.state){this.world=g.world;this.state=g.state;this.next=-Infinity;}for(const m of[this.bundles,this.weaving])m.castShadow=shadows;if(g.state.time<this.next&&g.state.time>=this.next-FIBRE_WORK_ART.refreshSeconds)return;this.next=g.state.time+FIBRE_WORK_ART.refreshSeconds;this.bundles.count=this.weaving.count=0;
 if(!g.state.production?.projects.length){this.bundles.visible=this.weaving.visible=false;return;}
 const sites=new Map<number,Building>();for(const b of g.state.buildings)if(b.hp>0&&g.finished(b)&&Math.hypot(b.x-camera.x,b.z-camera.z)<FIBRE_WORK_ART.maximumDistanceMetres&&(b.team===0||g.visibleAt(b.x,b.z)))sites.set(b.id,b);
 for(const p of g.state.production?.projects||[]){const work=paidFibreWork(p),b=sites.get(p.workplace);if(!work||!b||this.bundles.count>=FIBRE_WORK_ART.capacity)continue;const st=TEAM_STYLE[b.team]||TEAM_STYLE[0];this.position.set(b.x,foundationProfile(g,b).level,b.z);this.quaternion.setFromAxisAngle(this.axis,st.yaw);this.scale.set(st.sx,st.sy,st.sz);this.base.compose(this.position,this.quaternion,this.scale);
 this.position.set(b.type==='fibreWorkshop'?1:0,b.type==='fibreWorkshop'?.94:.3,0);this.quaternion.identity();this.scale.set(1,1,1);this.local.compose(this.position,this.quaternion,this.scale);this.matrix.multiplyMatrices(this.base,this.local);this.bundles.setMatrixAt(this.bundles.count++,this.matrix);
 if(work.weaving&&b.type==='fibreWorkshop'&&this.weaving.count<FIBRE_WORK_ART.capacity){this.position.set(-.67,.55,.65);this.scale.set(1,work.growth,1);this.local.compose(this.position,this.quaternion,this.scale);this.matrix.multiplyMatrices(this.base,this.local);this.weaving.setMatrixAt(this.weaving.count++,this.matrix);}
 }for(const m of[this.bundles,this.weaving]){m.visible=m.count>0;m.instanceMatrix.needsUpdate=true;}
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const m of[this.bundles,this.weaving]){this.scene.remove(m);m.dispose();m.geometry.dispose();}this.material.dispose();}
}
