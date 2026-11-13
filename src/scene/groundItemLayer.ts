/** GROUND ITEM LAYER: the real things lying on the ground, drawn as their own models.
 *
 *  BLUF: a dropped weapon bundle (state.droppedWeaponCargo) shows its spears, bows and blades as a small pile of the society's own models in the age's material;
 *  a farm tool left on the ground (state.farmToolCargo, holder 'ground') shows that tool in its real condition. Nothing is created here: a placement exists
 *  only for a record the simulation holds, the count shown is bounded (so a thousand spears is a bigger pile, not a thousand draws), and every model is one
 *  shared geometry drawn through an `ItemInstancer`, so a field of piles is a handful of draw calls. Display offsets never change where anything really is. */
import * as THREE from 'three';
import type {Game} from '../game/sim';
import {itemGeometry,meshGeometry,ItemInstancer} from './itemGeometry';
import {requestFor,groundItemMesh,itemEraForAge,conditionBucket,CONDITION_BUCKET_MID,FARM_TOOL_ERA,lodForDistance,CARGO_MODEL} from './itemRegistry';
import {hash32} from './itemMesh';
import {skinOfTeam} from '../game/skinState';
import type {LodTier} from './itemMesh';

export const GROUND_ITEM_RULES={maxPerKind:8,maxInstancers:96,viewMetres:{low:150,med:220,high:300},maxPlacements:1500} as const;
/** the tool shown for a game farm-tool kind */
export const FARM_TOOL_MODEL:Readonly<Record<string,string>>=Object.freeze({woodenArd:'ard',stoneHoe:'hoe',copperTools:'hoe',ironTools:'hoe'});
/** how many of `n` real items a pile draws: all of the first few, then one more per doubling, never more than the cap */
export const shownCount=(n:number)=>n<=0?0:n<=3?n:Math.min(GROUND_ITEM_RULES.maxPerKind,3+Math.ceil(Math.log2(n/3)));

type Slot={inst:ItemInstancer;n:number;key:string};
export class GroundItemLayer{
 private scene:THREE.Scene;private root=new THREE.Group();private slots=new Map<string,Slot>();private disposed=false;
 private m=new THREE.Matrix4();private q=new THREE.Quaternion();private p=new THREE.Vector3();private one=new THREE.Vector3(1,1,1);private up=new THREE.Vector3(0,1,0);
 stats={piles:0,placements:0,instancers:0,draws:0,triangles:0};
 constructor(scene:THREE.Scene){this.scene=scene;this.root.name='ground-items';scene.add(this.root);}
 private slot(key:string,make:()=>THREE.BufferGeometry|null,shadows:boolean):Slot|null{
  let s=this.slots.get(key);if(s){s.inst.mesh.castShadow=shadows;return s;}
  if(this.slots.size>=GROUND_ITEM_RULES.maxInstancers)for(const [k,v] of this.slots)if(v.n===0){this.root.remove(v.inst.mesh);v.inst.geometry.dispose();v.inst.dispose();this.slots.delete(k);}
  const g=make();if(!g)return null;
  s={inst:new ItemInstancer(g),n:0,key};s.inst.mesh.name='ground-item:'+key;s.inst.mesh.castShadow=shadows;s.inst.mesh.receiveShadow=true;this.root.add(s.inst.mesh);this.slots.set(key,s);return s;
 }
 private put(g:Game,kind:string,o:{era:number;skin:string|null;condition:number;x:number;z:number;count:number;seed:number;camera:THREE.Vector3;quality:'low'|'med'|'high';shadows:boolean}){
  const bucket=conditionBucket(o.condition),d=Math.hypot(o.x-o.camera.x,o.z-o.camera.z),lod:LodTier=lodForDistance(d,o.quality);
  const eq={kind,era:o.era,skin:o.skin,condition:CONDITION_BUCKET_MID[bucket]},req=requestFor(eq,lod);if(!req)return;
  const key=`${req.id}|${req.era}|${req.skin??''}|c${bucket}|l${lod}`,s=this.slot(key,()=>{const mesh=groundItemMesh(eq,lod,0);return mesh?meshGeometry(mesh):null;},o.shadows);if(!s)return;
  const n=shownCount(o.count),y0=g.travelHeight(o.x,o.z),yaw0=(hash32(o.seed,kind)%628)/100;
  for(let i=0;i<n&&this.stats.placements<GROUND_ITEM_RULES.maxPlacements;i++){
   const h=hash32(o.seed,kind,i),lat=((i%4)-1.5)*.1+((h%100)/100-.5)*.03,layer=Math.floor(i/4),yaw=yaw0+((h>>>8)%100/100-.5)*.35;
   const ox=Math.cos(yaw0+Math.PI/2)*lat,oz=-Math.sin(yaw0+Math.PI/2)*lat,x=o.x+ox,z=o.z+oz;
   this.p.set(x,y0+layer*.05,z);this.q.setFromAxisAngle(this.up,yaw);this.m.compose(this.p,this.q,this.one);s.inst.set(s.n++,this.m);this.stats.placements++;
  }
  this.stats.piles++;
 }
 /** Rebuild the placements from the simulation's records. Cheap: bounded by the number of real parcels in view. */
 sync(g:Game,camera:THREE.Vector3,quality:'low'|'med'|'high'='med',shadows=false){
  if(this.disposed)return;
  for(const s of this.slots.values())s.n=0;this.stats.piles=0;this.stats.placements=0;
  const view=GROUND_ITEM_RULES.viewMetres[quality],ageEra=itemEraForAge(g.state.age);
  for(const parcel of g.state.droppedWeaponCargo??[]){
   if(Math.hypot(parcel.x-camera.x,parcel.z-camera.z)>view||!g.visibleAt(parcel.x,parcel.z))continue;
   const skin=skinOfTeam(g.state,parcel.team)?.id??null;
   for(const kind of Object.keys(CARGO_MODEL))if(kind==='spears'||kind==='bows'||kind==='blades'){const n=parcel.stock[kind]||0;if(n>0)this.put(g,kind,{era:ageEra,skin,condition:.85,x:parcel.x,z:parcel.z,count:n,seed:parcel.id,camera,quality,shadows});}
  }
  for(const t of g.state.farmToolCargo?.tools??[]){
   if(t.holder.kind!=='ground'||Math.hypot(t.holder.x-camera.x,t.holder.z-camera.z)>view||!g.visibleAt(t.holder.x,t.holder.z))continue;
   const model=FARM_TOOL_MODEL[t.kind];if(!model)continue;
   this.put(g,model,{era:FARM_TOOL_ERA[t.kind]??ageEra,skin:skinOfTeam(g.state,t.originalOwnerTeam)?.id??null,condition:t.condition,x:t.holder.x,z:t.holder.z,count:1,seed:t.id,camera,quality,shadows});
  }
  let draws=0,tris=0;for(const s of this.slots.values()){s.inst.commit(s.n);if(s.n>0){draws++;tris+=s.n*(s.inst.geometry.attributes.position.count/3);}}
  this.stats.instancers=this.slots.size;this.stats.draws=draws;this.stats.triangles=Math.round(tris);
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const s of this.slots.values()){s.inst.geometry.dispose();s.inst.dispose();}this.slots.clear();this.scene.remove(this.root);}
}
void itemGeometry;
