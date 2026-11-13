/** Browser entry for animal render sheets (bundled by animals.mjs). REAL three.js + the real AnimalRigLayer/FishSchoolLayer/stepVisual,
 * with the legacy merged meshes for before/after. Critters are fake-but-valid sim records; nothing here changes game state. */
import * as THREE from 'three';
import {AnimalRigLayer,FishSchoolLayer} from '@/scene/animalRigLayer';
import {deerGeo,boarGeo,goatGeo,horseGeo,cattleGeo,sheepGeo,birdGeo} from '@/scene/meshes';
import type {Critter,CritterKind} from '@/game/types';
import {ANIMAL_TRAITS} from '@/game/animalTraits';
type Cell={species:CritterKind;x:number;z:number;speed:number;state:string;phase?:number;facing:number;id:number;mode:'rig'|'legacy';warm?:number;fix?:boolean};
type Spec={width:number;height:number;cam:{pos:number[];target:number[];fov:number};cells:Cell[];fish?:{n:number;t:number};labels?:string[]};
const GEO:Partial<Record<CritterKind,()=>THREE.BufferGeometry>>={deer:deerGeo,boar:boarGeo,goat:goatGeo,horse:()=>horseGeo(),cattle:()=>cattleGeo(),sheep:sheepGeo,bird:birdGeo};
const COL:Partial<Record<CritterKind,string>>={deer:'#8a6a48',boar:'#4a3a32',goat:'#6b5a4a'};
(window as unknown as {renderAnimals:(s:Spec)=>Promise<unknown>}).renderAnimals=async(S:Spec)=>{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(S.width,S.height);document.body.appendChild(renderer.domElement);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#cfd8c4');
 scene.add(new THREE.HemisphereLight('#ffe6c4','#6e5a3c',1.3));const sun=new THREE.DirectionalLight('#ffcf96',3.2);sun.position.set(-6,10,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-22;sc.right=22;sc.top=22;sc.bottom=-22;sc.near=1;sc.far=60;scene.add(sun,sun.target);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#8c8a58',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 if(S.fish){ground.position.y=-1.2;const water=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#4a8f98',roughness:.2,metalness:.1,transparent:true,opacity:.78}));water.rotation.x=-Math.PI/2;scene.add(water);}
 const cam=new THREE.PerspectiveCamera(S.cam.fov,S.width/S.height,.1,400);cam.position.set(...(S.cam.pos as [number,number,number]));cam.lookAt(...(S.cam.target as [number,number,number]));
 const rig=new AnimalRigLayer(scene,Math.max(8,S.cells.length)),info:Record<string,unknown>={};
 const rigCells:Critter[]=[];
 for(const c of S.cells){
  const crit:Critter={id:c.id,species:c.species,x:c.x,y:0,z:c.z,facing:c.facing,vx:Math.sin(c.facing)*c.speed,vz:Math.cos(c.facing)*c.speed,wanderT:0,hp:3,maxHp:3,fly:0,scale:{deer:1.15,boar:1.05,goat:.95,sheep:.95,horse:1.2,cattle:1.2,wolf:1,bird:.7}[c.species]??1,
   beh:{v:1,st:c.state as never,until:1e9,gx:c.x,gz:c.z,hd:c.facing,sp:c.speed,n:1,grp:c.id,en:1,thirst:0,hunger:0,hab:0,acc:0,alarmUntil:0,ax:0,az:0,h0x:c.x,h0z:c.z,blk:0,...(c.species==='bird'?{alt:c.state==='perch'?.25:6}:{})}};
  if(c.species==='bird')crit.y=crit.beh!.alt!;
  if(c.mode==='legacy'){
   const mk=GEO[c.species]||deerGeo,mat=new THREE.MeshStandardMaterial({color:COL[c.species]||'#8a6a48',roughness:.9,vertexColors:['horse','cattle','sheep'].includes(c.species)});
   const m=new THREE.Mesh(mk(),mat);m.castShadow=true;m.position.set(c.x,0,c.z);m.rotation.y=c.facing-(c.mode==="legacy"&&c.fix?Math.PI/2:0);m.scale.setScalar(crit.scale);scene.add(m);continue;
  }
  rigCells.push(crit);
 }
 // warm the visual state: step the rig with the cell's speed until the stride settles, then pin phase when asked
 const height=()=>0;
 for(let i=0;i<90;i++){rig.update(rigCells,1/30,height);}
 for(const c of rigCells){const spec=S.cells.find(k=>k.id===c.id)!;if(spec.phase!==undefined){const v=rig.vis.get(c.id);if(v)v.phase=spec.phase;}}
 rig.update(rigCells,1e-4,height);
 let fishLayer:FishSchoolLayer|null=null;
 if(S.fish){fishLayer=new FishSchoolLayer(scene);const nodes=Array.from({length:S.fish.n},(_,i)=>({id:i+1,x:(i-(S.fish!.n-1)/2)*5,z:0,scale:1,amount:30}));fishLayer.update(nodes,S.fish.t,()=>0);}
 renderer.render(scene,cam);void ANIMAL_TRAITS;
 info.rigs=rig.drawn.length;return info;
};
