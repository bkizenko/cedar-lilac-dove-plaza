/** Browser entry for the carry / gait render sheets (bundled by carry.mjs with esbuild; REAL three.js, SwiftShader in the sandbox).
 * Everything drawn is generator output: CharacterRigLayer + the real clips (samplePose with a carry style) + the real load geometry. */
import * as THREE from 'three';
import {CharacterRigLayer,type PeopleWorld} from '@/scene/characterRigLayer';
import {cultureForCiv} from '@/scene/civPeople';
import {CIV_IDS,type CivId} from '@/scene/civStyles';
import {rigOutfit,type RigGear} from '@/scene/characterRig';
import {LOOKS,roleOf} from '@/scene/peopleLook';
import {CLIPS,samplePose,gaitBlend,blendPoses,type ClipId} from '@/scene/animationClips';
import {carryStyleFor,piecesFor,type CarryStyleId,type CarryChoice,type CarryKind} from '@/scene/carryStyles';
import {TEAM_STYLE} from '@/game/constants';

type Item={civ:CivId;type?:string;clip:ClipId;phase:number;x:number;z?:number;facing:number;gear?:RigGear;cls?:'child'|'elder'|'leader';carry?:{style:CarryStyleId;kind:CarryKind;load:number;seed?:number};speed?:number};
type Spec={width:number;height:number;mode:'v2'|'rig1';season:string;era:number;cam:{pos:number[];target:number[];fov:number};items:Item[];bg?:string};
function lights(scene:THREE.Scene){
 scene.add(new THREE.HemisphereLight('#ffe6c4','#6e5a3c',1.25));
 const sun=new THREE.DirectionalLight('#ffcf96',3.4);sun.position.set(-8,12,9);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 const c=sun.shadow.camera;c.left=-30;c.right=30;c.top=30;c.bottom=-30;c.near=1;c.far=80;scene.add(sun,sun.target);
}
const cultures=new Map<string,ReturnType<typeof cultureForCiv>>();
const cul=(civ:CivId)=>{let c=cultures.get(civ);if(!c){c=cultureForCiv(civ,3);cultures.set(civ,c);}return c;};
(window as unknown as {renderCarry:(s:Spec)=>Promise<unknown>}).renderCarry=async(S:Spec)=>{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(S.width,S.height);document.body.appendChild(renderer.domElement);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(S.bg||'#cfd8c4');scene.fog=new THREE.Fog('#d9ccb0',120,420);lights(scene);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:'#8c8a58',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const cam=new THREE.PerspectiveCamera(S.cam.fov,S.width/S.height,.2,600);cam.position.set(S.cam.pos[0],S.cam.pos[1],S.cam.pos[2]);cam.lookAt(S.cam.target[0],S.cam.target[1],S.cam.target[2]);cam.updateMatrixWorld();
 const layer=new CharacterRigLayer(scene),world:PeopleWorld={time:0,season:S.season as never,era:S.era,identity:()=>({culture:cul('sandrill'),teamColor:'#e0c078'}),gearOf:()=>({}),projectFor:()=>undefined,farmFor:()=>null,fireLitNear:()=>false,loadOf:()=>0,aliveIds:()=>new Set(),visible:()=>true};
 layer.beginFrame(world,cam.position,'high',true);
 let uid=1;
 for(const it of S.items){
  const t=TEAM_STYLE[CIV_IDS.indexOf(it.civ)%TEAM_STYLE.length],type=it.type||'worker',cls=it.cls||'adult';
  const outfit=rigOutfit({type:type as never,bodyClass:cls,seed:3,gear:it.gear||{garment:{item:'lightClothes',condition:.95}},culture:cul(it.civ),season:S.season as never,era:S.era,teamColor:t.unit,affiliation:t.unit,...(S.mode==='v2'?{look:LOOKS[it.civ],role:roleOf({type,bodyClass:cls})}:{})});
  let carry:CarryChoice|null=null,style;
  if(it.carry){const base=carryStyleFor({society:it.civ,kind:it.carry.kind,load:it.carry.load,seed:it.carry.seed??uid});carry={...base,style:it.carry.style,pieces:piecesFor(it.carry.style,it.carry.load)};style={id:carry.style,mass:carry.mass};}
  let pose;
  if(it.clip==='walk'&&it.speed!==undefined){const b=gaitBlend(it.speed);pose=blendPoses(samplePose(CLIPS.walk,it.phase,{phaseOffset:0,speed:1,amplitude:1},0),samplePose(CLIPS.run,it.phase,{phaseOffset:0,speed:1,amplitude:1},0),b);}
  else pose=samplePose(CLIPS[it.clip],it.phase,{phaseOffset:0,speed:1,amplitude:1},carry?carry.load:0,style);
  layer.write({id:uid++,type,team:0,x:it.x,y:0,z:it.z??0,vx:0,vz:0,facing:it.facing,hp:1,order:'idle'},[1.65,1.65,1.65],0,1,.5,{pose,sink:0,outfit,cls,carry:carry??undefined});
 }
 layer.endFrame();renderer.render(scene,cam);return layer.stats;
};
