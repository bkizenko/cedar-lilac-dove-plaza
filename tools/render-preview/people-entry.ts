/** Browser entry for the people render sheets (bundled by people.mjs with esbuild; REAL three.js, SwiftShader in CI/sandbox).
 * Everything drawn is generator output: CharacterRigLayer driven by the real animator from fake-but-realistic UnitLike state,
 * and the archived legacy people (meshes.ts unitGeo + wornGarments + wornArmor) for before/after. */
import * as THREE from 'three';
import {CharacterRigLayer,type PeopleWorld} from '@/scene/characterRigLayer';
import {unitGeo} from '@/scene/meshes';
import {wornGarmentGeometry} from '@/scene/wornGarments';
import {wornArmorGeometry} from '@/scene/wornArmor';
import {cultureForCiv} from '@/scene/civPeople';
import {CIVS,CIV_IDS,type CivId} from '@/scene/civStyles';
import type {UnitLike} from '@/scene/characterAnim';
import {rigOutfit,bodyClassFor,TOOL_FOR_CLIP,type RigGear} from '@/scene/characterRig';
import {LOOKS,roleOf,type Role} from '@/scene/peopleLook';
import {CLIPS,samplePose,stancePose,type ClipId} from '@/scene/animationClips';
import {weaponOf} from '@/scene/characterAnim';
import {TEAM_STYLE} from '@/game/constants';

type Row={civ:CivId;type:string;role?:Role;cls?:'child'|'elder'|'leader';gear?:RigGear;order?:string;node?:unknown;moving?:boolean;haulage?:string;carry?:number;target?:boolean;recipe?:string;farm?:{ripened?:boolean;planted?:number;tended?:number};id?:number;dieAt?:number;fish?:boolean};
type Strip={civ:CivId;type:string;clip:string;phase:number;x:number;z:number;facing:number;gear?:RigGear;cls?:'child'|'elder'|'leader'};
type Spec={strips?:Strip[];width:number;height:number;mode:'rig'|'rig1'|'legacy';season:string;era:number;seconds:number;cam:{pos:number[];target:number[];fov:number};people:{row:Row;x:number;z:number;facing:number}[];bg?:string;label?:string};
const GARMENT:Record<string,string>={worker:'lightClothes'};
function lights(scene:THREE.Scene){
 scene.add(new THREE.HemisphereLight('#ffe6c4','#6e5a3c',1.25));
 const sun=new THREE.DirectionalLight('#ffcf96',3.4);sun.position.set(-8,12,9);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 const c=sun.shadow.camera;c.left=-30;c.right=30;c.top=30;c.bottom=-30;c.near=1;c.far=80;scene.add(sun,sun.target);
}
const cultures=new Map<string,ReturnType<typeof cultureForCiv>>();
const cul=(civ:CivId)=>{let c=cultures.get(civ);if(!c){c=cultureForCiv(civ,3);cultures.set(civ,c);}return c;};
(window as unknown as {renderPeople:(s:Spec)=>Promise<unknown>}).renderPeople=async(S:Spec)=>{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(S.width,S.height);document.body.appendChild(renderer.domElement);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(S.bg||'#cfd8c4');scene.fog=new THREE.Fog('#d9ccb0',120,420);lights(scene);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:'#8c8a58',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const cam=new THREE.PerspectiveCamera(S.cam.fov,S.width/S.height,.2,600);cam.position.set(S.cam.pos[0],S.cam.pos[1],S.cam.pos[2]);cam.lookAt(S.cam.target[0],S.cam.target[1],S.cam.target[2]);cam.updateMatrixWorld();
 const info:Record<string,unknown>={};
 if(S.mode==='legacy'){
  const geos=new Map<string,THREE.BufferGeometry>(),mat=new THREE.MeshStandardMaterial({roughness:.9,vertexColors:false}),gm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide});
  for(const p of S.people){
   const t=p.row.type,st=TEAM_STYLE[p.row.id!==undefined?p.row.id%4:0];void st;const team=CIV_IDS.indexOf(p.row.civ)%TEAM_STYLE.length,style=TEAM_STYLE[team];
   let g=geos.get(t);if(!g){g=unitGeo(t as never);geos.set(t,g);}
   const body=(t==='leader'?1.95:1.65)*(p.row.cls==='child'?.64:1),m=new THREE.Mesh(g,mat.clone());(m.material as THREE.MeshStandardMaterial).color.set(style.unit);m.castShadow=true;
   m.position.set(p.x,0,p.z);m.rotation.y=p.facing;m.scale.set(body*style.sx,1.65*(t==='leader'?1.18:1)*style.sy*(p.row.cls==='child'?.64:1),body*style.sz);scene.add(m);
   const gk=p.row.gear?.garment?.item||(t==='worker'?GARMENT.worker:null);
   if(p.row.gear?.garment){const gg=wornGarmentGeometry(p.row.gear.garment.item as never),gmesh=new THREE.Mesh(gg,gm);gmesh.position.copy(m.position);gmesh.rotation.copy(m.rotation);gmesh.scale.copy(m.scale);gmesh.castShadow=true;scene.add(gmesh);}
   if(p.row.gear?.armor){const ag=wornArmorGeometry(),am=new THREE.Mesh(ag,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}));am.position.copy(m.position);am.rotation.copy(m.rotation);am.scale.copy(m.scale);scene.add(am);}
   void gk;
  }
 }else{
  const layer=new CharacterRigLayer(scene);
  if(S.strips){
   const layer=new CharacterRigLayer(scene),world:PeopleWorld={time:0,season:S.season as never,era:S.era,identity:()=>({culture:cul('sandrill'),teamColor:'#e0c078'}),gearOf:()=>({}),projectFor:()=>undefined,farmFor:()=>null,fireLitNear:()=>false,loadOf:()=>0,aliveIds:()=>new Set(),visible:()=>true};
   layer.beginFrame(world,cam.position,'high',true);
   for(const st of S.strips){
    const t=TEAM_STYLE[CIV_IDS.indexOf(st.civ)%TEAM_STYLE.length],cls=st.cls||(st.type==='leader'?'leader':st.type==='spearman'||st.type==='swordsman'?'soldier':'adult');
    const outfit=rigOutfit({type:st.type as never,bodyClass:cls,seed:3,gear:st.gear||{},culture:cul(st.civ),season:S.season as never,era:S.era,teamColor:t.unit,affiliation:t.unit,...(S.mode==='rig'?{look:LOOKS[st.civ],role:roleOf({type:st.type,bodyClass:cls})}:{})}),clip=CLIPS[st.clip as ClipId];
    const pose=stancePose(samplePose(clip,st.phase,{phaseOffset:0,speed:1,amplitude:1},st.clip==='carry'?.8:0),st.clip as ClipId,weaponOf(st.type));
    const tool=TOOL_FOR_CLIP[st.clip];
    layer.write({id:1,type:st.type,team:0,x:st.x,y:0,z:st.z,vx:0,vz:0,facing:st.facing,hp:1,order:'idle'},[1.65,st.type==='leader'?1.95:1.65,1.65],0,1,.5,{pose,sink:0,outfit,cls,items:{itemR:outfit.itemR||tool,itemL:outfit.itemL}});
   }
   layer.endFrame();Object.assign(info,layer.stats);renderer.render(scene,cam);return info;
  }
  const alive=new Set<number>(),units:{u:UnitLike;p:Spec['people'][number];last:{x:number;z:number}}[]=[];let id=100;
  for(const p of S.people){const r=p.row;const u:UnitLike&{cd:number;rof:number;ageT?:number}={id:r.id??id++,type:r.type,team:CIV_IDS.indexOf(r.civ),x:p.x,y:0,z:p.z,vx:r.moving?Math.sin(p.facing)*2.4:0,vz:r.moving?Math.cos(p.facing)*2.4:0,facing:p.facing,hp:10,order:r.order||'idle',carry:r.carry||0,
   node:r.node,haulage:r.haulage,target:r.target?{x:p.x+Math.sin(p.facing)*1.4,z:p.z+Math.cos(p.facing)*1.4,r:.4}:null,range:1.8,cd:0,rof:1.1,maturesAt:r.cls==='child'?1e9:undefined,ageT:r.cls==='elder'?1e9:undefined};
   units.push({u,p,last:{x:p.x,z:p.z}});alive.add(u.id);}
  const world:PeopleWorld={time:0,season:S.season as never,era:S.era,identity:t=>({culture:cul(CIV_IDS[t%CIV_IDS.length]),teamColor:TEAM_STYLE[t%TEAM_STYLE.length].unit,affiliation:TEAM_STYLE[t%TEAM_STYLE.length].unit,...(S.mode==='rig'?{look:LOOKS[CIV_IDS[t%CIV_IDS.length]]}:{})}),
   roleOf:u=>{const r=units.find(x=>x.u.id===u.id)!.p.row;return r.role??roleOf({type:u.type,bodyClass:bodyClassFor(u,world.time)});},
   gearOf:u=>units.find(x=>x.u.id===u.id)!.p.row.gear||{},projectFor:u=>{const r=units.find(x=>x.u.id===u.id)!.p.row;return r.recipe?{phase:'working',recipe:r.recipe,progress:world.time}:undefined;},farmFor:u=>units.find(x=>x.u.id===u.id)!.p.row.farm||null,fireLitNear:()=>true,loadOf:u=>Math.min(1,(u.carry||0)/10),aliveIds:()=>alive,visible:()=>true};
  const dt=.05,frames=Math.round(S.seconds/dt);let dead=0;
  for(let f=0;f<=frames;f++){
   world.time=f*dt;
   for(const x of units){if(x.p.row.dieAt!==undefined&&world.time>=x.p.row.dieAt&&alive.has(x.u.id)){alive.delete(x.u.id);dead++;}
    if(x.p.row.moving){x.u.x+=x.u.vx*dt;x.u.z+=x.u.vz*dt;}
    if(x.p.row.target){(x.u as {cd:number}).cd=Math.max(0,x.u.cd!-dt);if((x.u as {cd:number}).cd<=0)(x.u as {cd:number}).cd=1.1;}}
   layer.beginFrame(world,cam.position,'high',true);
   for(const x of units){if(!alive.has(x.u.id))continue;const t=x.u.type,body=(t==='leader'?1.95:1.65)*(x.p.row.cls==='child'?1:1),st=TEAM_STYLE[x.u.team%TEAM_STYLE.length];
    layer.write(x.u,[body*st.sx,(t==='leader'?1.18:1)*1.65*st.sy,body*st.sz],0,1,.5);}
   layer.writeCorpses(()=>0,()=>true);layer.endFrame();
  }
  Object.assign(info,layer.stats,{dead});
 }
 renderer.render(scene,cam);
 return info;
};
void CIVS;
