/** Browser entry for the PEOPLE v2 contact sheets (bundled by people2.mjs with esbuild; REAL three.js, SwiftShader in the sandbox).
 * Everything drawn is generator output: the real CharacterRigLayer + real animator + real peopleLook/peopleKit/peopleGear, for any registered skin. */
import * as THREE from 'three';
import {NEAR_PEOPLE} from '@/scene/peopleDetail';
import {CharacterRigLayer,type PeopleWorld} from '@/scene/characterRigLayer';
import {cultureForSkin} from '@/scene/civPeople';
import {skinById,listSkins} from '@/scene/civSkin';
import {lookForSkin,roleOf,type Role} from '@/scene/peopleLook';
import type {UnitLike} from '@/scene/characterAnim';
import type {RigGear} from '@/scene/characterRig';
import {TEAM_STYLE} from '@/game/constants';

type Row={skin:string;type:string;role?:Role;cls?:'child'|'elder'|'leader';gear?:RigGear;order?:string;node?:unknown;moving?:boolean;carry?:number;target?:boolean;recipe?:string;farm?:{ripened?:boolean;planted?:number;tended?:number};id?:number;haulage?:string;legacyLook?:boolean};
type Spec={width:number;height:number;season:string;era:number;seconds:number;cam:{pos:number[];target:number[];fov:number};people:{row:Row;x:number;z:number;facing:number}[];bg?:string;shadows?:boolean;ground?:string;rig1?:boolean;sil?:boolean;nearOff?:boolean};
const cultures=new Map<string,ReturnType<typeof cultureForSkin>>();
const cul=(id:string)=>{let c=cultures.get(id);if(!c){c=cultureForSkin(skinById(id)!,3);cultures.set(id,c);}return c;};
function lights(scene:THREE.Scene,shadows:boolean){
 scene.add(new THREE.HemisphereLight('#ffe6c4','#6e5a3c',1.25));
 const sun=new THREE.DirectionalLight('#ffcf96',3.4);sun.position.set(-8,12,9);sun.target.position.set(0,0,0);sun.castShadow=shadows;sun.shadow.mapSize.set(2048,2048);
 const c=sun.shadow.camera;c.left=-30;c.right=30;c.top=30;c.bottom=-30;c.near=1;c.far=80;scene.add(sun,sun.target);
}
const W=window as unknown as {renderPeople2:(s:Spec)=>Promise<unknown>;skinIds:()=>string[]};
W.skinIds=()=>listSkins().filter(s=>s.id!=='neutral').map(s=>s.id);
W.renderPeople2=async(S:Spec)=>{
 NEAR_PEOPLE.enabled=!S.nearOff;
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(S.width,S.height);document.body.appendChild(renderer.domElement);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=S.shadows!==false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(S.bg||'#cfd8c4');scene.fog=new THREE.Fog('#d9ccb0',120,420);lights(scene,S.shadows!==false);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:S.ground||'#8c8a58',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const cam=new THREE.PerspectiveCamera(S.cam.fov,S.width/S.height,.2,600);cam.position.set(S.cam.pos[0],S.cam.pos[1],S.cam.pos[2]);cam.lookAt(S.cam.target[0],S.cam.target[1],S.cam.target[2]);cam.updateMatrixWorld();
 const layer=new CharacterRigLayer(scene),alive=new Set<number>(),units:{u:UnitLike;p:Spec['people'][number]}[]=[];let nid=100;
 const idOfSkin=new Map<string,number>();
 for(const p of S.people){const r=p.row;if(!idOfSkin.has(r.skin))idOfSkin.set(r.skin,idOfSkin.size);
  const u:UnitLike&{cd:number;rof:number;ageT?:number}={id:r.id??nid++,type:r.type,team:idOfSkin.get(r.skin)!,x:p.x,y:0,z:p.z,vx:r.moving?Math.sin(p.facing)*2.4:0,vz:r.moving?Math.cos(p.facing)*2.4:0,facing:p.facing,hp:10,order:r.order||'idle',carry:r.carry||0,node:r.node,haulage:r.haulage,
   target:r.target?{x:p.x+Math.sin(p.facing)*1.4,z:p.z+Math.cos(p.facing)*1.4,r:.4}:null,range:1.8,cd:0,rof:1.1,maturesAt:r.cls==='child'?1e9:undefined,ageT:r.cls==='elder'?1e9:undefined};
  units.push({u,p});alive.add(u.id);}
 const skinOfTeam=(t:number)=>[...idOfSkin.entries()].find(e=>e[1]===t)![0];
 const rowOf=(id:number)=>units.find(x=>x.u.id===id)!.p.row;
 const world:PeopleWorld={time:0,season:S.season as never,era:S.era,identity:t=>{const id=skinOfTeam(t);return {culture:cul(id),teamColor:TEAM_STYLE[t%TEAM_STYLE.length].unit,affiliation:TEAM_STYLE[t%TEAM_STYLE.length].unit,...(S.rig1?{}:{look:lookForSkin(skinById(id))})};},
  gearOf:u=>rowOf(u.id).gear||{},projectFor:u=>{const r=rowOf(u.id);return r.recipe?{phase:'working',recipe:r.recipe,progress:world.time}:undefined;},farmFor:u=>rowOf(u.id).farm||null,fireLitNear:()=>true,loadOf:u=>Math.min(1,(u.carry||0)/10),aliveIds:()=>alive,visible:()=>true,
  roleOf:u=>{const r=rowOf(u.id);return r.role??roleOf({type:u.type,bodyClass:r.cls==='child'?'child':r.cls==='elder'?'elder':r.cls==='leader'?'leader':'adult',recipe:r.recipe});}};
 const dt=.05,frames=Math.round(S.seconds/dt);const t0=performance.now();let msFrames=0;
 for(let f=0;f<=frames;f++){
  world.time=f*dt;for(const x of units)if(x.p.row.moving){x.u.x+=x.u.vx*dt;x.u.z+=x.u.vz*dt;}
  for(const x of units)if(x.p.row.target){(x.u as {cd:number}).cd=Math.max(0,x.u.cd!-dt);if((x.u as {cd:number}).cd<=0)(x.u as {cd:number}).cd=1.1;}
  const a=performance.now();layer.beginFrame(world,cam.position,'high',S.shadows!==false);
  for(const x of units){const t=x.u.type,st=TEAM_STYLE[x.u.team%TEAM_STYLE.length],body=(t==='leader'?1.95:1.65);const r=x.p.row,k=r.cls==='child'?.66:1;layer.write(x.u,[body*k*st.sx,(t==='leader'?1.18:1)*1.65*k*st.sy,body*k*st.sz],0,1,.5);}
  layer.endFrame();msFrames+=performance.now()-a;
 }
 if(S.sil){const dark=new THREE.MeshBasicMaterial({color:0x151515});scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh&&m!==ground)m.material=dark;});ground.material=new THREE.MeshBasicMaterial({color:0xf4f1ea});scene.background=new THREE.Color(0xf4f1ea);scene.fog=null;}
 renderer.render(scene,cam);
 return {...layer.stats,cpuMsPerFrame:+(msFrames/(frames+1)).toFixed(3),wallMs:Math.round(performance.now()-t0)};
};
