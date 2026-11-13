/** Browser entry for the field-boundary sheet (bundled by boundaries.mjs). Lays every boundary kind, variant and the low-poly version out in rows of
 * butted pieces of unequal length on flat ground, stone in four real rocks, so the shapes can be judged without the whole world. */
import * as THREE from 'three';
import {boundaryGeometry,BOUNDARY_LEN,BOUNDARY_COLOURS,type BoundaryMeshKind} from '@/scene/fieldBoundaries';
type Spec={width:number;height:number;yaw?:number;pitch?:number;dist?:number;rows:{kind:BoundaryMeshKind;detail:number|'lo';rock?:string}[];lens?:number[];lookY?:number;fov?:number};
const w=window as unknown as {renderSheet:(s:Spec)=>Promise<unknown>};
let renderer:THREE.WebGLRenderer|null=null;
w.renderSheet=async(S:Spec)=>{
 let canvas=document.getElementById('c') as HTMLCanvasElement|null;if(!canvas){canvas=document.createElement('canvas');canvas.id='c';document.body.appendChild(canvas);}
 canvas.style.cssText=`width:${S.width}px;height:${S.height}px;display:block`;
 if(!renderer){renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;}
 renderer.setPixelRatio(1);renderer.setSize(S.width,S.height,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#bcd2dc');
 scene.add(new THREE.HemisphereLight('#cfe0ff','#6b6a3a',1.1));const sun=new THREE.DirectionalLight('#ffe6bd',2.6);sun.position.set(-8,12,9);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#6d7f3c',roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
 const lens=S.lens??[1.5,1.15,1.8,1.3],rocks:Record<string,string>={granite:'#a89692',sandstone:'#ce8c58',limestone:'#d6d0b8',basalt:'#464852',default:'#85807a'};let tris=0;
 S.rows.forEach((r,ri)=>{
  const geo=boundaryGeometry(r.kind,r.detail),mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,side:r.kind==='bank'||r.kind==='hedge'?THREE.DoubleSide:THREE.FrontSide});
  tris+=(geo.index?geo.index.count:geo.attributes.position.count)/3;
  const c=new THREE.Color();if(r.kind==='stone'){c.setRGB(...(new THREE.Color(rocks[r.rock??'default']).toArray().slice(0,3) as [number,number,number]));const h={h:0,s:0,l:0};c.getHSL(h);c.setHSL(h.h,Math.min(.4,h.s*.55),Math.max(.3,Math.min(.68,h.l)));}else c.set(BOUNDARY_COLOURS[r.kind][0]);
  let x=-lens.reduce((a,b)=>a+b,0)/2;
  for(const L of lens){const m=new THREE.Mesh(geo,mat);m.scale.set(L/BOUNDARY_LEN,1,1);m.position.set(x+L/2,0,-ri*1.8);m.userData.c=c;(m.material as THREE.MeshStandardMaterial);
   const inst=new THREE.InstancedMesh(geo,mat,1);inst.setMatrixAt(0,new THREE.Matrix4().compose(m.position,new THREE.Quaternion(),m.scale));inst.setColorAt(0,c);inst.frustumCulled=false;scene.add(inst);x+=L;}
 });
 const n=S.rows.length,cz=-(n-1)*.9,cam=new THREE.PerspectiveCamera(S.fov??30,S.width/S.height,.1,300),d=S.dist??14,yaw=S.yaw??.35,pitch=S.pitch??.35;
 cam.position.set(Math.sin(yaw)*Math.cos(pitch)*d,Math.sin(pitch)*d+.4,Math.cos(yaw)*Math.cos(pitch)*d+cz);cam.lookAt(0,S.lookY??.4,cz);
 renderer.render(scene,cam);return{tris};
};
