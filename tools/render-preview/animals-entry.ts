/** Browser entry for the animal render sheets (bundled by animals.mjs with esbuild; REAL three.js, SwiftShader in the sandbox).
 * Everything drawn is generator output: AnimalRigLayer + the real pose solver, and the legacy merged meshes for before/after. */
import * as THREE from 'three';
import {AnimalRigLayer,tierForDistance} from '@/scene/animalRigLayer';
import {entryFor} from '@/scene/animalCatalog';
import {lookFor} from '@/scene/animalLife';
import {deerGeo,boarGeo,goatGeo,sheepGeo,horseGeo,cattleGeo,birdGeo,fishGeo} from '@/scene/meshes';
import '@/scene/animalFlyers';

type A={species:string;sex?:'m'|'f';age?:number;x:number;z:number;facing:number;gait?:string;phase?:number;t?:number;season?:number;within?:number;tier?:0|1|2;id?:number;seed?:number;label?:string;y?:number;size?:number};
type Spec={width:number;height:number;cam:{pos:number[];target:number[];fov:number};bg?:string;mode:'new'|'legacy';animals:A[];water?:boolean;ground?:string};
const LEG:Record<string,()=>THREE.BufferGeometry>={redDeer:deerGeo,fallowDeer:deerGeo,roeDeer:deerGeo,boar:boarGeo,goat:goatGeo,ibex:goatGeo,sheep:sheepGeo,mouflon:sheepGeo,horse:horseGeo,wildHorse:horseGeo,donkey:horseGeo,cattle:cattleGeo,aurochs:cattleGeo,duck:birdGeo,goose:birdGeo,raptor:birdGeo,trout:fishGeo,carp:fishGeo,pike:fishGeo,eel:fishGeo};
const LEGSCALE:Record<string,number>={redDeer:1.15,fallowDeer:1.0,roeDeer:.85,boar:1.05,goat:.95,ibex:.95,sheep:1,mouflon:1,horse:1.175,wildHorse:1.1,donkey:1,cattle:1.275,aurochs:1.4,duck:.7,goose:.8,raptor:.7,trout:.9,carp:.9,pike:.9,eel:.9};
const SPECIES_TO_CRITTER:Record<string,string>={redDeer:'deer',fallowDeer:'deer',roeDeer:'deer',boar:'boar',goat:'goat',ibex:'goat',sheep:'sheep',mouflon:'sheep',horse:'horse',wildHorse:'horse',cattle:'cattle',aurochs:'cattle',duck:'bird',goose:'bird',raptor:'bird'};
(window as unknown as {renderAnimals:(s:Spec)=>Promise<unknown>}).renderAnimals=async(S:Spec)=>{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(S.width,S.height);document.body.appendChild(renderer.domElement);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(S.bg||'#cfd8c4');
 scene.add(new THREE.HemisphereLight('#fff0d8','#b09a74',1.7));
 const sun=new THREE.DirectionalLight('#ffd9a8',3.2);sun.position.set(-6,10,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-22;sc.right=22;sc.top=22;sc.bottom=-22;sc.near=1;sc.far=60;scene.add(sun,sun.target);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:S.ground||'#8c8a58',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 if(S.water){const w=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#4f7f86',roughness:.25,transparent:true,opacity:.72}));w.rotation.x=-Math.PI/2;w.position.y=0;scene.add(w);ground.position.y=-1.2;}
 const cam=new THREE.PerspectiveCamera(S.cam.fov,S.width/S.height,.1,600);cam.position.set(S.cam.pos[0],S.cam.pos[1],S.cam.pos[2]);cam.lookAt(S.cam.target[0],S.cam.target[1],S.cam.target[2]);cam.updateMatrixWorld();
 const info:Record<string,unknown>={};
 if(S.mode==='legacy'){
  const mats=new Map<string,THREE.Material>();
  for(const a of S.animals){const g=LEG[a.species];if(!g)continue;let m=mats.get(a.species);if(!m){m=new THREE.MeshLambertMaterial({color:'#8a6a48'});mats.set(a.species,m);}
   const mesh=new THREE.Mesh(g(),m);mesh.position.set(a.x,a.y??0,a.z);mesh.rotation.y=a.facing;mesh.scale.setScalar(LEGSCALE[a.species]||1);mesh.castShadow=true;scene.add(mesh);}
  renderer.render(scene,cam);return info;
 }
 const layer=new AnimalRigLayer(scene);layer.beginFrame();
 for(const a of S.animals){
  const id=a.id??100,crit=SPECIES_TO_CRITTER[a.species]??a.species;
  const look=lookFor({id,species:crit,scale:1.15,...(a.age!==undefined&&a.age<1?{adultScale:1.15}:{})},false,a.season??1,a.within??.5);
  const sp=a.species as never;const sex=a.sex??look?.sex??'f',seed=a.seed??look?.seed??1,e=entryFor(sp),rig=e.rig(sex,seed);
  const age=a.age??1;
  const dist=Math.hypot(a.x-cam.position.x,a.z-cam.position.z),tier=a.tier??tierForDistance(dist);
  const gait=(a.gait||'idle') as never;
  const posed=e.pose(sex,seed,{gait,phase:a.phase??0,t:a.t??1.3,seed:id,age,speed:1});
  const q=lookFor({id,species:crit,scale:1.15},false,a.season??1,a.within??.5);
  const winter=q?q.coat.winter:0,spots=age<.55?(sp==='boar'?-.9:.95):(sp==='fallowDeer'&&(a.season??1)!==3?.85:0);
  layer.add({model:rig,x:a.x,y:a.y??0,z:a.z,facing:a.facing,size:a.size??(q?q.size/Math.max(.6,1)*(age<1?.55+.45*age:1):1),mats:posed.mats,lift:posed.lift,tier,
   coat:{spots,winter:(a.season??1)===3?(winter||0.6):(a.season??1)===2?winter*.5:0,seed:(id%97)/97,tint:[1,1,1],scale:.8/1.0}});
 }
 layer.endFrame();Object.assign(info,layer.stats);renderer.render(scene,cam);return info;
};
