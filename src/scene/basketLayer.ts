import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
export const BASKET_ART={capacity:1024,roughness:.96,distancesMetres:{low:170,med:240,high:320},minimumCondition:0} as const;
function colored(g:THREE.BufferGeometry,color:number){const c=new THREE.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
export function basketStyleColor(style:string,condition:number,target=new THREE.Color()){let hash=2166136261;for(let i=0;i<style.length;i++)hash=Math.imul(hash^style.charCodeAt(i),16777619);return target.setHSL(.085+(hash>>>0)%35/1000,.32+(hash>>>8)%17/100,.48+(hash>>>16)%13/100-Math.max(0,1-condition)*.1);}
/** Open, empty wicker basket. Its rim, alternating weft bands, ribs and shoulder
 * straps are geometry; no painted food or cargo pretends to be real inventory. */
export function basketGeometry(){
 const parts:THREE.BufferGeometry[]=[];
 const body=new THREE.LatheGeometry([new THREE.Vector2(.10,0),new THREE.Vector2(.13,.035),new THREE.Vector2(.18,.18),new THREE.Vector2(.205,.30),new THREE.Vector2(.19,.30)],12);parts.push(colored(body,0xd1b27d));
 for(let i=0;i<6;i++){const y=.04+i*.049,r=.13+(y-.035)/.265*.075,g=new THREE.TorusGeometry(r,.008,3,12);g.rotateX(Math.PI/2);g.translate(0,y,0);parts.push(colored(g,i%2?0x7d623e:0xe9c999));}
 const rim=new THREE.TorusGeometry(.20,.015,4,12);rim.rotateX(Math.PI/2);rim.translate(0,.305,0);parts.push(colored(rim,0xe6c58e));
 for(let i=0;i<8;i++){const a=i*Math.PI/4,b=new THREE.Vector3(Math.cos(a)*.11,.025,Math.sin(a)*.11),t=new THREE.Vector3(Math.cos(a)*.20,.30,Math.sin(a)*.20),d=t.clone().sub(b),g=new THREE.CylinderGeometry(.006,.006,d.length(),3);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate((b.x+t.x)/2,(b.y+t.y)/2,(b.z+t.z)/2);parts.push(colored(g,0x9e8054));}
 const bottom=new THREE.CylinderGeometry(.105,.10,.018,12);bottom.translate(0,.009,0);parts.push(colored(bottom,0xad8e61));
 for(const x of[-.13,.13]){const strap=new THREE.BoxGeometry(.022,.45,.025);strap.rotateX(-.3);strap.translate(x,.39,.14);parts.push(colored(strap,0x675335));}
 const plain=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();n.translate(.08,.34,-.31);return n;});const out=mergeGeometries(plain)!;plain.forEach(g=>g.dispose());out.computeBoundingBox();out.computeBoundingSphere();return out;
}
export class BasketLayer{
 readonly mesh:THREE.InstancedMesh;readonly owners:Unit[]=[];private count=0;private scene:THREE.Scene;private color=new THREE.Color();private disposed=false;private camera:THREE.Vector3|null=null;private distance=240;private source=new Map<THREE.InstancedMesh,Unit[]>();
 constructor(scene:THREE.Scene){this.scene=scene;this.mesh=new THREE.InstancedMesh(basketGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:BASKET_ART.roughness,metalness:0,side:THREE.DoubleSide}),BASKET_ART.capacity);this.mesh.name='actual-owned-wicker-baskets';this.mesh.count=0;this.mesh.visible=false;this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(BASKET_ART.capacity*3),3);this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);this.source.set(this.mesh,this.owners);scene.add(this.mesh);}
 beginFrame(quality:'low'|'med'|'high',shadows=false,camera?:THREE.Vector3){this.count=0;this.owners.length=0;this.camera=camera||null;this.distance=BASKET_ART.distancesMetres[quality];this.mesh.castShadow=shadows&&quality!=='low';}
 write(g:Pick<Game,'visibleAt'>,u:Unit,body:THREE.Matrix4){if(this.disposed||u.hp<=0||u.shelterId||!u.basket||u.basket.condition<=BASKET_ART.minimumCondition||u.team!==0&&!g.visibleAt(u.x,u.z)||this.camera&&Math.hypot(u.x-this.camera.x,u.z-this.camera.z)>this.distance||this.count>=BASKET_ART.capacity)return false;this.mesh.setMatrixAt(this.count,body);this.mesh.setColorAt(this.count,basketStyleColor(u.basket.origin?.style??`local-fibre-${u.team}`,u.basket.condition,this.color));this.owners.push(u);this.count++;return true;}
 endFrame(){this.mesh.count=this.count;this.mesh.visible=this.count>0;if(this.count){this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor!.needsUpdate=true;}}
 sources(){return this.source;}
 dispose(){if(this.disposed)return;this.disposed=true;this.scene.remove(this.mesh);this.mesh.dispose();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.owners.length=0;this.source.clear();}
}
