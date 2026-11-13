/** Browser entry for the tree species sheet (bundled by trees.mjs; real three.js, SwiftShader). Lays out botanical trees (species x variant x LOD) on a flat
 * ground so trunk, branching and leaf cards can be judged without the whole game world. */
import * as THREE from 'three';
import {botanicalTree} from '@/scene/treeBotany';
import {SPECIES_BY_ID} from '@/scene/botanicalSpecies';
import {makeBotanicalMaterial} from '@/scene/botanicalMaterial';
import {painterSway} from '@/scene/painterVegetationMaterial';
type Spec={species:string[];variants?:number[];lod?:0|1|2;leaf?:number;snow?:number;autumn?:number;width:number;height:number;yaw?:number;pitch?:number;dist?:number;spacing?:number;rows?:number;hue?:number;scale?:number;time?:number;lookY?:number;fov?:number};
const w=window as unknown as {renderSheet:(s:Spec)=>Promise<unknown>};
let renderer:THREE.WebGLRenderer|null=null;
w.renderSheet=async(S:Spec)=>{
 let canvas=document.getElementById('c') as HTMLCanvasElement|null;if(!canvas){canvas=document.createElement('canvas');canvas.id='c';document.body.appendChild(canvas);}
 canvas.style.cssText=`width:${S.width}px;height:${S.height}px;display:block`;
 if(!renderer){renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;}
 renderer.setPixelRatio(1);renderer.setSize(S.width,S.height,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#bcd2dc');scene.fog=new THREE.Fog('#bcd2dc',60,260);
 scene.add(new THREE.HemisphereLight('#cfe0ff','#6b6a3a',1.1));const sun=new THREE.DirectionalLight('#ffe6bd',2.6);sun.position.set(-30,45,25);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:S.snow?'#e8eef0':'#6d7f3c',roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
 const sway=painterSway();sway.uTime.value=S.time??0;const mat=makeBotanicalMaterial(sway);
 const items:{sp:string;v:number}[]=[];for(const sp of S.species)for(const v of S.variants??[0])items.push({sp,v});
 const spacing=S.spacing??9,rows=S.rows??1,cols=Math.ceil(items.length/rows);let tris=0;
 items.forEach((it,i)=>{
  const t=botanicalTree(it.sp,it.v,S.lod??0),geo=t.geometry.clone(),mesh=new THREE.InstancedMesh(geo,mat,1),sp=SPECIES_BY_ID[it.sp];tris+=t.triangles;
  geo.setAttribute('iState',new THREE.InstancedBufferAttribute(new Float32Array([S.leaf??1,S.snow??0]),2));
  const m=new THREE.Matrix4(),col=i%cols,row=Math.floor(i/cols),sc=S.scale??1;m.compose(new THREE.Vector3((col-(cols-1)/2)*spacing,0,-row*spacing),new THREE.Quaternion(),new THREE.Vector3(sc,sc,sc));mesh.setMatrixAt(0,m);
  const c=new THREE.Color(sp.leaf);if(S.autumn){c.lerp(new THREE.Color(sp.autumn[0]??sp.leaf),S.autumn);}
  if(S.hue){const h={h:0,s:0,l:0};c.getHSL(h);c.setHSL(h.h+S.hue,h.s,h.l);}mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array([c.r,c.g,c.b]),3);mesh.frustumCulled=false;scene.add(mesh);
 });
 const cz=-spacing*((rows-1)/2),cam=new THREE.PerspectiveCamera(S.fov??32,S.width/S.height,.5,600),d=S.dist??30,yaw=S.yaw??0,pitch=S.pitch??.18;
 cam.position.set(Math.sin(yaw)*Math.cos(pitch)*d,Math.sin(pitch)*d+4,Math.cos(yaw)*Math.cos(pitch)*d+cz);cam.lookAt(0,S.lookY??4.5,cz);
 renderer.render(scene,cam);const info=renderer.info;return {tris:info.render.triangles,calls:info.render.calls,geometryTris:tris};
};
