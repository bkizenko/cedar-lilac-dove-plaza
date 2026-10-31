import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {Building} from '../game/types';
import {TEAM_STYLE} from '../game/constants';
import {TOWER_PLATFORM_RULES,type TowerPlatform} from '../game/towerPlatforms';
import type {MatKit} from './meshes';
import {foundationProfile} from './foundations';
import {towerPlatformGeos,towerPlatformGeometryKey} from './towerPlatformKit';
export const TOWER_PLATFORM_LAYER_RULES=Object.freeze({instancesPerConfiguration:2048,maximumConfigurations:Object.values(TOWER_PLATFORM_RULES).reduce((n,r)=>n+r.maxHeightMeters-r.minHeightMeters+1,0)});
type Part={mesh:THREE.InstancedMesh;stone:boolean};
type Bucket={parts:Part[];owners:Building[]};
/** One lazy timber/stone instance bucket per paid design. No stretched cultural
 * transform: deck metres and arrow release must agree with the actual geometry. */
export class TowerPlatformLayer{
 private buckets=new Map<string,Bucket>();
 private picking=new Map<THREE.InstancedMesh,Building[]>();
 private matrix=new THREE.Matrix4();
 private position=new THREE.Vector3();
 private rotation=new THREE.Quaternion();
 private scale=new THREE.Vector3(1,1,1);
 private color=new THREE.Color();
 private scene:THREE.Scene;
 private mats:MatKit;
 constructor(scene:THREE.Scene,mats:MatKit){this.scene=scene;this.mats=mats;}
 private bucket(config:TowerPlatform){
  const key=towerPlatformGeometryKey(config),old=this.buckets.get(key);if(old)return old;
  if(this.buckets.size>=TOWER_PLATFORM_LAYER_RULES.maximumConfigurations)return null;
  const geo=towerPlatformGeos(config),owners:Building[]=[],parts:Part[]=[];
  for(const[geometry,stone]of[[geo.timber,false],[geo.extra,true]] as const){
   if(!geometry)continue;const material=(stone?this.mats.stone:this.mats.timber).clone();material.color.set('#ffffff');
   const mesh=new THREE.InstancedMesh(geometry,material,TOWER_PLATFORM_LAYER_RULES.instancesPerConfiguration);mesh.name=`tower-platform-${key}-${stone?'stone':'timber'}`;mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(TOWER_PLATFORM_LAYER_RULES.instancesPerConfiguration*3),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);this.picking.set(mesh,owners);parts.push({mesh,stone});
  }
  const next={parts,owners};this.buckets.set(key,next);return next;
 }
 sync(game:Game){
  for(const b of this.buckets.values())b.owners.length=0;
  for(const b of game.state.buildings){
   if(b.type!=='watchtower'||!b.towerPlatform||b.hp<=0||b.team!==0&&!game.exploredAt(b.x,b.z))continue;
   const bucket=this.bucket(b.towerPlatform);if(!bucket||bucket.owners.length>=TOWER_PLATFORM_LAYER_RULES.instancesPerConfiguration)continue;
   const i=bucket.owners.length,progress=b.plannedCost?.08:b.build>=1?1:.22+.78*Math.max(0,b.build);
   this.position.set(b.x,foundationProfile(game,b).level,b.z);this.scale.set(1,progress,1);this.matrix.compose(this.position,this.rotation,this.scale);
   for(const part of bucket.parts){part.mesh.setMatrixAt(i,this.matrix);this.color.set(b.plannedCost?'#87b7cb':part.stone?'#aaa494':(TEAM_STYLE[b.team]||TEAM_STYLE[0]).timber);part.mesh.setColorAt(i,this.color);}
   bucket.owners.push(b);
  }
  for(const bucket of this.buckets.values())for(const {mesh}of bucket.parts){mesh.count=bucket.owners.length;mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 sources(){return this.picking;}
 dispose(){for(const bucket of this.buckets.values())for(const {mesh}of bucket.parts){mesh.parent?.remove(mesh);mesh.dispose();(mesh.material as THREE.Material).dispose();}this.buckets.clear();this.picking.clear();}
}
