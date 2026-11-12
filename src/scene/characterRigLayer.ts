/** three.js adapter for the shared character rig (ASTRA-13/ASTRA-12). Every bone variant is ONE shared geometry drawn as an
 * InstancedMesh, so cost scales with draws per distinct outfit, not people: near and mid tier pose seven bones plus the held items
 * per person on the CPU (instance matrices, no skinning); far tier is one merged static silhouette per outfit. The old merged
 * unit meshes are untouched and remain the archived LEGACY people set; `PeopleLayer` is only a drawing replacement and the
 * world keeps the legacy meshes as invisible picking proxies, so selection and hover behave exactly as before. */
import * as THREE from 'three';
import {ensureInstanceCapacity} from './instanceCapacity';
import {RIG_BONES,RIG_PIVOTS,bodyClassFor,boneMatrices,farParts,itemParts,mul,newBoneMatrices,composeEuler,rigMeshData,rigOutfit,tierForDistance,type BodyClass,type ItemId,type RigGear,type RigOutfit,type RigPart,type RigSlot,type RigBone} from './characterRig';
import {DeathTracker,newAnimState,stepAnimator,CORPSE_RULES,type AnimContext,type AnimState,type UnitLike} from './characterAnim';
import {lifePose} from './peopleLife';
import {NEUTRAL_POSE,poseAtTier,type Pose} from './animationClips';
import {hashSeed} from './buildingParts';
import {SEASONS,type Culture,type Season} from './cultureGrammar';
import type {LodTier} from './buildingParts';
import {individualFor,roleOf,type Individual,type PeopleLook,type Role} from './peopleLook';

export type PeopleSet='rig'|'legacy';
export const PEOPLE_RULES={maxVariants:900,startCapacity:16,maxBodies:900,/** meshes unused for this many frames are kept; geometry is tiny */shadowTier:1,/** set true to switch off the people-v2 procedural life layer (breathing, sway, gestures) */noLife:false as boolean} as const;
/** Who a team's people are: the culture that dresses them. The simulation has no civ per tribe yet, so the world adapter supplies this. */
export type PeopleIdentity={culture:Culture;teamColor:string;affiliation?:string;/** people v2: the society's PeopleLook; absent = the first rig's look */look?:PeopleLook};
/** Everything the layer reads from the game, so the layer is testable without the simulation. */
export type PeopleWorld={time:number;season:Season;era:number;identity(team:number):PeopleIdentity;
 /** real gear: garment, armor asset, optional helmet/shield */gearOf(u:UnitLike):RigGear;
 projectFor(u:UnitLike):AnimContext['project'];farmFor(u:UnitLike):AnimContext['farm'];fireLitNear(u:UnitLike):boolean;loadOf(u:UnitLike):number;
 aliveIds():ReadonlySet<number>;visible(x:number,z:number):boolean;/** role from real unit state (peopleLook.roleOf); absent = derived from type and age class */roleOf?(u:UnitLike):Role};
type Variant={mesh:THREE.InstancedMesh;count:number};
const linear=(c:Float32Array)=>{const o=new Float32Array(c.length),k=new THREE.Color();for(let i=0;i<c.length;i+=3){k.setRGB(c[i],c[i+1],c[i+2],THREE.SRGBColorSpace);o[i]=k.r;o[i+1]=k.g;o[i+2]=k.b;}return o;};
function toGeometry(parts:readonly RigPart[],pivot:readonly number[],colors:Record<RigSlot,string>,tier:LodTier){
 const d=rigMeshData(parts,pivot,colors,tier),g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(d.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(d.normals,3));g.setAttribute('color',new THREE.BufferAttribute(linear(d.colors),3));
 g.computeBoundingSphere();if(g.boundingSphere)g.boundingSphere.radius=Math.max(g.boundingSphere.radius,1.5);return g;
}
const hash=(s:string)=>(hashSeed(s)>>>0).toString(36);
/** A stable signature of one bone's parts and the colours they use, so identical bones of different outfits share one draw. */
const SIGS=new WeakMap<RigOutfit,Map<string,string>>();
function boneSignature(parts:readonly RigPart[],colors:Record<RigSlot,string>,tier:LodTier){
 const live=parts.filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier);return hash(live.map(p=>[p.shape,p.size.join(','),p.pos.join(','),(p.rot??[]).join(','),p.sides??'',p.slot,p.col??colors[p.slot]].join(':')).join('|'));
}
type Pending={bone:RigBone|'far'|ItemId;tier:LodTier;key:string;build:()=>THREE.BufferGeometry};
const _u=new Array(16).fill(0),_w=new Array(16).fill(0),_wn=new Array(16).fill(0);
export class CharacterRigLayer{
 private scene:THREE.Scene;private root=new THREE.Group();private material:THREE.MeshStandardMaterial;private variants=new Map<string,Variant>();private outfits=new Map<string,RigOutfit>();
 private states=new Map<number,AnimState>();private matrices=newBoneMatrices();private tint=new THREE.Color();private disposed=false;readonly deaths=new DeathTracker();
 private shadows=false;private camera=new THREE.Vector3();private world:PeopleWorld|null=null;private frame=0;
 stats={people:0,corpses:0,variants:0,draws:0,triangles:0,tiers:[0,0,0] as number[],fallbacks:0};
 constructor(scene:THREE.Scene){
  this.scene=scene;this.root.name='people-rig';scene.add(this.root);
  this.material=new THREE.MeshStandardMaterial({vertexColors:true,color:0xffffff,roughness:.9,metalness:0,side:THREE.FrontSide});
 }
 beginFrame(world:PeopleWorld,camera:THREE.Vector3,quality:'low'|'med'|'high',shadows:boolean){
  this.world=world;this.camera.copy(camera);this.shadows=shadows&&quality!=='low';this.frame++;
  for(const v of this.variants.values()){v.count=0;}
  this.stats={people:0,corpses:0,variants:0,draws:0,triangles:0,tiers:[0,0,0],fallbacks:0};
  const alive=world.aliveIds();const died=this.deaths.sweep(alive,world.time);void died;
  if(this.states.size>PEOPLE_RULES.maxBodies*2){for(const [id,s] of this.states)if(world.time-s.seen>30)this.states.delete(id);}
 }
 private inds=new Map<number,{key:string;ind:Individual}>();
 /** This person's Individual (pure function of society key, unit id and class; cached per unit). */
 private individual(u:UnitLike,cls:BodyClass,look:PeopleLook,ckey:string):Individual{
  const key=ckey+'|'+cls;let e=this.inds.get(u.id);if(!e||e.key!==key){e={key,ind:individualFor(look,ckey,u.id,cls)};this.inds.set(u.id,e);if(this.inds.size>PEOPLE_RULES.maxBodies*3){for(const k of this.inds.keys()){if(!this.states.has(k))this.inds.delete(k);if(this.inds.size<=PEOPLE_RULES.maxBodies*2)break;}}}
  return e.ind;
 }
 private canon=new Map<string,Individual>();
 /** One shared individual per society, class and role for mid and far tiers: same geometry and one draw per outfit, however many people stand there. */
 private canonical(look:PeopleLook,cls:BodyClass,ind:Individual):Individual{
  const k=look.id+'|'+cls;let c=this.canon.get(k);if(!c){c={...ind,skinTone:1,hairColour:0,hair:look.hair.styles[0],beard:'none',jewel:[],mark:null,patches:0,variant:0,hand:1,dirt:0,age:cls==='elder'?.9:.3};this.canon.set(k,c);}
  return c;
 }
 private outfitFor(u:UnitLike,cls:BodyClass,w:PeopleWorld,tier:LodTier=0):RigOutfit{
  const gear=w.gearOf(u),id=w.identity(u.team),g=gear.garment,variant=hashSeed(u.id,'v')%4,look=id.look;
  let role:Role|undefined,ind:Individual|undefined,use:Individual|undefined;
  if(look){role=w.roleOf?w.roleOf(u):roleOf({type:u.type,bodyClass:cls});ind=this.individual(u,cls,look,id.culture.key);use=tier===0?ind:this.canonical(look,cls,ind);}
  const gq=g&&g.condition>0?g.item+Math.round(Math.min(1,g.condition)*4):'-';
  const key=[u.type,cls,u.team,gq,gear.armor&&gear.armor.condition>0?gear.armor.kind:'-',gear.helmet?.kind??'-',gear.shield?.kind??'-',w.season,w.era,id.culture.key,look?role+'|'+look.id+'|'+(tier===0?'n':'c'):variant,use?[use.skinTone,use.hairColour,use.hair,use.beard,use.jewel.join('+'),use.mark?.pattern??'-',use.patches,use.variant,use.hand].join(','):'-',id.teamColor,id.affiliation??'-'].join('|');
  let o=this.outfits.get(key);if(!o){
   o=rigOutfit({type:u.type as never,bodyClass:cls,seed:u.id%4,gear,culture:id.culture,season:w.season,era:w.era,teamColor:id.teamColor,affiliation:id.affiliation,...(look?{look,individual:use,role,unitId:u.id}:{})});
   if(this.outfits.size>1500)this.outfits.clear();this.outfits.set(key,o);
  }
  return o;
 }
 /** Bone signatures are pure per outfit and tier: computed once, not every frame. */
 private sigOf(o:RigOutfit,tier:LodTier,b:RigBone,parts:readonly RigPart[]){let m=SIGS.get(o);if(!m){m=new Map();SIGS.set(o,m);}const k=tier+b;let s=m.get(k);if(s===undefined){s=boneSignature(parts,o.colors,tier);m.set(k,s);}return s;}
 private variant(key:string,make:()=>THREE.BufferGeometry):Variant|null{
  let v=this.variants.get(key);if(v)return v;if(this.variants.size>=PEOPLE_RULES.maxVariants){this.stats.fallbacks++;return null;}
  const mesh=new THREE.InstancedMesh(make(),this.material,PEOPLE_RULES.startCapacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(PEOPLE_RULES.startCapacity*3),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);mesh.name='people:'+key;mesh.receiveShadow=true;
  this.root.add(mesh);v={mesh,count:0};this.variants.set(key,v);return v;
 }
 private push(v:Variant,m:ArrayLike<number>,c:THREE.Color){
  if(v.count>=v.mesh.instanceMatrix.count){v.mesh=ensureInstanceCapacity(this.scene,v.mesh,v.count+1);this.root.add(v.mesh);}
  v.mesh.instanceMatrix.array.set(m as number[],v.count*16);const ic=v.mesh.instanceColor!.array as Float32Array;ic[v.count*3]=c.r;ic[v.count*3+1]=c.g;ic[v.count*3+2]=c.b;v.count++;
 }
 /** Draw one person (or a corpse when `pose` is given). `scale` is the legacy body scale so the rig matches the old size. Returns false if not drawn. */
 write(u:UnitLike,scale:readonly [number,number,number],bob:number,brightness:number,tintHue:number,override?:{pose:Pose;sink:number;outfit?:RigOutfit;cls?:BodyClass;/** held items to show with a review pose (render sheets) */items?:{itemR?:ItemId;itemL?:ItemId}}){
  const w=this.world;if(this.disposed||!w)return false;
  const cls=override?.cls??bodyClassFor(u,w.time);
  const dx=u.x-this.camera.x,dz=u.z-this.camera.z,dy=u.y-this.camera.y,raw=tierForDistance(Math.hypot(dx,dy,dz)),tier=(override&&raw>1?1:raw) as LodTier;
  const outfit=override?.outfit??this.outfitFor(u,cls,w,tier);
  if(!override)this.stats.tiers[tier]++;
  let pose:Pose,itemR=outfit.itemR,itemL=outfit.itemL;
  if(override){pose=override.pose;if(override.items){itemR=override.items.itemR;itemL=override.items.itemL;}}
  else{
   this.deaths.see(u,w.time,scale[0],outfit.key,cls,{outfit,scale:[scale[0],scale[1],scale[2]]});
   if(tier<2){
    let st=this.states.get(u.id);if(!st){st=newAnimState(u,w.time);this.states.set(u.id,st);}
    const f=stepAnimator(st,u,{time:w.time,project:w.projectFor(u),fireLit:w.fireLitNear(u),load:w.loadOf(u),farm:w.farmFor(u)});
    pose=f.pose;if(!itemR&&f.itemR)itemR=f.itemR;if(!itemR&&f.clip==='craft'&&outfit.role==='smith')itemR='hammer';
    if(tier===1)pose=poseAtTier(pose,1);else if(outfit.look&&f.clip!=='row'&&!PEOPLE_RULES.noLife)pose=lifePose(pose,f.clip,w.time,u.id,this.inds.get(u.id)?.ind.age);
   }else pose=NEUTRAL_POSE;
  }
  const y=u.y+bob-(override?.sink??0);
  // people v2: the society's mean frame and this person's own height, build and wear (instance level: no new geometry)
  let fh=1,fb=1,dirt=0;
  if(outfit.look){const ind=override?.outfit?outfit.ind:this.inds.get(u.id)?.ind,hk=outfit.look.body.height;fh=hk*(ind?.height??1);fb=(ind?.build??1)*hk**.35;dirt=ind?.dirt??0;}
  composeEuler(_u,[u.x,y,u.z],[0,u.facing,0],[scale[0]*fb,scale[1]*fh,scale[2]*fb]);
  this.tint.setScalar(brightness*(1-dirt)).offsetHSL((tintHue-.5)*.02,0,0);
  boneMatrices(pose,cls,this.matrices);
  const col=this.tint;
  if(tier===2){
   // merged silhouette: neutral pose, drawn through the hips matrix of the neutral rig
   const key=`far|${outfit.key}`,v=this.variant(key,()=>toGeometry(farParts(outfit,w.identity(u.team).culture),[0,0,0],outfit.colors,2));
   if(!v)return false;this.push(v,_u,col);this.stats.people++;return true;
  }
  for(const b of RIG_BONES){
   const parts=outfit.bones[b],sig=this.sigOf(outfit,tier,b,parts),pivot=RIG_PIVOTS[b];
   const v=this.variant(`t${tier}|${b}|${sig}`,()=>toGeometry(parts,pivot,outfit.colors,tier));if(!v)continue;
   mul(_w,_u,this.matrices[b]);this.push(v,_w,col);
  }
  for(const [sock,item] of [['itemR',itemR],['itemL',itemL]] as const){
   if(!item)continue;const id=w.identity(u.team);
   const v=this.variant(`t${tier}|${item}|${item==='standard'||item==='shield'?hash(outfit.colors.flag+outfit.colors.flag2+outfit.colors.charge+(outfit.look?.shield??'')+(outfit.rendered.shield??'')+id.culture.flag.division):item==='staff'?hash((outfit.look?.id??'')+outfit.colors.trim):''}`,()=>toGeometry(itemParts(item,id.culture,outfit.look,{shield:outfit.rendered.shield as never}),[0,0,0],outfit.colors,tier));
   if(!v)continue;mul(_wn,_u,this.matrices[sock]);this.push(v,_wn,col);
  }
  if(!override)this.stats.people++;return true;
 }
 /** Corpses of units that really died, still on the ground. */
 writeCorpses(heightAt:(x:number,z:number)=>number,visible:(x:number,z:number)=>boolean){
  const w=this.world;if(!w)return;
  for(const c of this.deaths.corpses){
   const snap=c.snap as {outfit:RigOutfit;scale:[number,number,number]}|null;if(!snap||!visible(c.x,c.z))continue;const o=snap.outfit;
   const p=this.deaths.pose(c,w.time),u:UnitLike={id:c.id,type:c.type,team:c.team,x:c.x,y:heightAt(c.x,c.z),z:c.z,vx:0,vz:0,facing:c.facing,hp:0,order:'idle'};
   if(this.write(u,snap.scale,0,.9,.5,{pose:p.pose,sink:p.sink,outfit:o,cls:o.bodyClass}))this.stats.corpses++;
  }
 }
 endFrame(){
  let draws=0,tris=0;
  for(const [key,v] of this.variants){
   const m=v.mesh;m.count=v.count;m.visible=v.count>0;m.castShadow=this.shadows&&!key.startsWith('far');
   if(v.count){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;draws++;tris+=v.count*((m.geometry.attributes.position?.count??0)/3);}
  }
  this.stats.variants=this.variants.size;this.stats.draws=draws;this.stats.triangles=tris;
 }
 get object(){return this.root;}
 dispose(){
  if(this.disposed)return;this.disposed=true;for(const v of this.variants.values()){this.root.remove(v.mesh);v.mesh.geometry.dispose();v.mesh.dispose();}this.variants.clear();this.scene.remove(this.root);this.material.dispose();
 }
}
void SEASONS;void CORPSE_RULES;
