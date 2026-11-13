// Tree detail ladder: the real BiomeSceneLayer on a seeded woodland (same world as scripts/diagnostics/tree-tier-cost.mjs) over a plain ground plane,
// drawn once per tree-detail step from the same two cameras. Light on memory (no full Game). Output: one sheet canvas + renderer counters per tile.
import * as THREE from 'three';
import {BiomeSceneLayer} from '@/scene/biomeSceneLayer';
import {PROVINCE_KINDS} from '@/game/ecologicalProvinces';
import {drawBands} from '@/game/drawDistance';
import {TREE_DETAIL,TREE_STEPS} from '@/game/graphicsSettings';
const SIZE=1040;
function world(){
 const width=16,idx=PROVINCE_KINDS.indexOf('mixed-woodland');
 const ecology:any={version:1,size:SIZE,width,cellMeters:SIZE/width,kinds:new Uint8Array(width*width).fill(idx),freshwaterDistanceMeters:new Float32Array(width*width).fill(80),temperatureOffsetCelsius:new Float32Array(width*width),moisture:new Float32Array(width*width).fill(.5),soil:new Float32Array(width*width).fill(.7),metrics:{regions:[]}};
 let s=12345;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 const trees:any[]=[];for(let i=0;i<2200;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*300;trees.push({id:i+1,kind:'tree',x:Math.cos(a)*d,y:2,z:Math.sin(a)*d,amount:20,maxAmt:20,regenT:0,scale:.8+r()*.5,rich:1});}
 const game:any={world:{size:SIZE,camps:[{x:0,z:0}],mapgen:{wind:{x:1,z:0}}},state:{seed:9,trees,buildings:[]},height:(_x:number,_z:number)=>2,waterAt:()=>0,exploredAt:()=>true,seasonMix:()=>({winter:0,autumn:0,snow:0})};
 return {ecology,game};
}
(window as any).renderTile=async(o:{w:number;h:number;step:1|2|3|4|5;view:'close'|'mid'})=>{
 const {w,h,step}=o,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setSize(w,h,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const views:any={close:{eye:[-30,3.2,-8],look:[10,5,2]},mid:{eye:[-170,48,-60],look:[40,4,10]}};
 const {ecology,game}=world(),scene=new THREE.Scene();
 scene.background=new THREE.Color('#bcd2dc');scene.fog=new THREE.FogExp2('#c4d6d8',.0015*.82);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:'#6d7d45'}));ground.position.y=2;scene.add(ground);
 scene.add(new THREE.HemisphereLight('#dfeaf5','#6b6a45',1.35));const sun=new THREE.DirectionalLight('#fff0d2',2.6);sun.position.set(-.5,.8,.3);scene.add(sun);
 const layer=new BiomeSceneLayer(scene,game,ecology,'painterly','botanical');
 const v=views[o.view],cam=new THREE.PerspectiveCamera(55,w/h,.5,1400);cam.position.set(v.eye[0],v.eye[1],v.eye[2]);cam.lookAt(v.look[0],v.look[1],v.look[2]);cam.updateMatrixWorld();
 const frus=new THREE.Frustum(),vp=new THREE.Matrix4(),widen=cam.clone();widen.aspect*=1.35;widen.updateProjectionMatrix();widen.updateMatrixWorld();vp.multiplyMatrices(widen.projectionMatrix,widen.matrixWorldInverse);frus.setFromProjectionMatrix(vp);
 const sph=new THREE.Sphere(),inView=(x:number,z:number,r:number)=>{sph.center.set(x,cam.position.y,z);sph.radius=r+60;return frus.intersectsSphere(sph);};
 const bands=drawBands('medium',SIZE),view:any={bands,prime:true,key:'k',detail:TREE_DETAIL[step],inView},at={x:cam.position.x,z:cam.position.z};
 for(let i=0;i<4;i++)layer.sync(game,at,'med',1,{...view,key:'k'+i});let g=0;while((layer as any).lastFiller?.deferred>0&&g++<600)layer.sync(game,at,'med',1,{...view,key:'g'+g});
 renderer.render(scene,cam);
 const ri=renderer.info.render;
 return {png:canvas.toDataURL('image/png'),calls:ri.calls,triangles:ri.triangles,label:TREE_DETAIL[step].label};
};
(window as any).ladderReady=true;
