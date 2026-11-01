import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
export const PEN_FENCE_ART={postSpacingMetres:2,gateOpeningMetres:2,heightMetres:.95,maximumPosts:8192,maximumRails:16384,distanceMetres:360,refreshSeconds:.5} as const;
type Point={x:number;z:number};
/** Stable human-sized posts: enlarging a field adds fence sections rather than
 * stretching every wooden post and rail into a giant. Front opening admits handlers. */
export function penFenceSegments(b:Pick<Building,'x'|'z'|'w'|'d'>){
 const points:Point[]=[],w=b.w/2,d=b.d/2,corners=[[-w,-d],[w,-d],[w,d],[-w,d]];
 for(let side=0;side<4;side++){
  const a=corners[side],c=corners[(side+1)%4],steps=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/PEN_FENCE_ART.postSpacingMetres);
  if(side===2){const xs=[w,1,-1,...Array.from({length:steps},(_,i)=>w-b.w*i/steps).filter(x=>Math.abs(x)>=1)];for(const x of[...new Set(xs)].sort((a,b)=>b-a))points.push({x:b.x+x,z:b.z+d});}
  else for(let i=0;i<steps;i++)points.push({x:b.x+a[0]+(c[0]-a[0])*i/steps,z:b.z+a[1]+(c[1]-a[1])*i/steps});
 }
 return points.map((a,i)=>({a,b:points[(i+1)%points.length],gate:Math.abs(a.z-b.z-d)<1e-5&&Math.abs(points[(i+1)%points.length].z-b.z-d)<1e-5&&Math.abs((a.x+points[(i+1)%points.length].x)/2-b.x)<1e-5}));
}
export class PenFenceLayer{
 readonly posts:THREE.InstancedMesh;readonly rails:THREE.InstancedMesh;
 private world:Game['world']|null=null;private state:Game['state']|null=null;private buildings:Building[]|null=null;
 private scene:THREE.Scene;private material:THREE.MeshStandardMaterial;
 private owners=new Map<THREE.InstancedMesh,Building[]>();private next=-Infinity;private signature='';private length=-1;private cameraX=Infinity;private cameraZ=Infinity;
 private matrix=new THREE.Matrix4();private position=new THREE.Vector3();private scale=new THREE.Vector3();private quaternion=new THREE.Quaternion();private direction=new THREE.Vector3();private xAxis=new THREE.Vector3(1,0,0);
 constructor(scene:THREE.Scene,material:THREE.MeshStandardMaterial){this.scene=scene;this.material=material;this.posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,PEN_FENCE_ART.heightMetres,.16),material,PEN_FENCE_ART.maximumPosts);this.rails=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.1,.1),material,PEN_FENCE_ART.maximumRails);for(const mesh of[this.posts,this.rails]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;this.owners.set(mesh,[]);scene.add(mesh);}}
 sync(g:Game,camera:THREE.Vector3,shadows=false){if(this.world!==g.world||this.state!==g.state||this.buildings!==g.state.buildings){this.world=g.world;this.state=g.state;this.buildings=g.state.buildings;this.next=-Infinity;this.signature='';}for(const mesh of[this.posts,this.rails])mesh.castShadow=shadows;if(g.state.time<this.next&&g.state.time>=this.next-PEN_FENCE_ART.refreshSeconds&&this.length===g.state.buildings.length&&Math.hypot(camera.x-this.cameraX,camera.z-this.cameraZ)<24)return;this.length=g.state.buildings.length;this.cameraX=camera.x;this.cameraZ=camera.z;this.next=g.state.time+PEN_FENCE_ART.refreshSeconds;
  const pens=g.state.buildings.filter(b=>b.type==='pen'&&b.hp>0&&(b.team===0||g.exploredAt(b.x,b.z))&&Math.hypot(b.x-camera.x,b.z-camera.z)<PEN_FENCE_ART.distanceMetres),key=g.terrainRevision()+':'+pens.map(b=>`${b.id},${b.x},${b.z},${b.w},${b.d},${Math.floor(b.build*20)},${!!b.plannedCost}`).join(';');if(key===this.signature)return;this.signature=key;this.posts.count=this.rails.count=0;for(const owners of this.owners.values())owners.length=0;
  for(const pen of pens){const height=pen.plannedCost?.08:.22+.78*Math.max(0,pen.build);for(const edge of penFenceSegments(pen)){if(this.posts.count>=PEN_FENCE_ART.maximumPosts||this.rails.count+2>PEN_FENCE_ART.maximumRails)break;const ah=g.height(edge.a.x,edge.a.z),bh=g.height(edge.b.x,edge.b.z);this.position.set(edge.a.x,ah+PEN_FENCE_ART.heightMetres*height/2,edge.a.z);this.scale.set(1,height,1);this.quaternion.identity();this.matrix.compose(this.position,this.quaternion,this.scale);this.posts.setMatrixAt(this.posts.count++,this.matrix);this.owners.get(this.posts)!.push(pen);if(edge.gate)continue;
   this.direction.set(edge.b.x-edge.a.x,bh-ah,edge.b.z-edge.a.z);const length=this.direction.length();this.quaternion.setFromUnitVectors(this.xAxis,this.direction.normalize());for(const y of[.38,.75]){this.position.set((edge.a.x+edge.b.x)/2,(ah+bh)/2+y*height,(edge.a.z+edge.b.z)/2);this.scale.set(length,height,1);this.matrix.compose(this.position,this.quaternion,this.scale);this.rails.setMatrixAt(this.rails.count++,this.matrix);this.owners.get(this.rails)!.push(pen);}}
  }for(const mesh of[this.posts,this.rails])mesh.instanceMatrix.needsUpdate=true;
 }
 pickingSources(){return this.owners;}
 dispose(){for(const mesh of[this.posts,this.rails]){this.scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();}this.material.dispose();this.owners.clear();}
}
