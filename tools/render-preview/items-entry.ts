/** Browser entry for the ITEM catalogue sheets (bundled by items.mjs with esbuild; REAL three.js, SwiftShader in the sandbox).
 *  Everything drawn is generator output from src/scene/itemModels.ts, shown per tile with a fitted three-quarter camera. */
import * as THREE from 'three';
import {itemGeometry,itemMaterial} from '@/scene/itemGeometry';
import {itemDef,ITEM_IDS} from '@/scene/itemModels';
import {buildItem} from '@/scene/itemModels';
import {listSkins} from '@/scene/civSkin';
import type {ItemReq} from '@/scene/itemKit';

type Tile={req:ItemReq;tiltDeg?:number;az?:number;el?:number;ground?:boolean;zoom?:number;bg?:string;focus?:[number,number,number];fr?:number};
type Spec={width:number;height:number;cols:number;tiles:Tile[];bg?:string};
const W=window as unknown as {renderItems:(s:Spec)=>Promise<unknown>;itemIds:()=>string[]};
W.itemIds=()=>[...ITEM_IDS];
(W as unknown as {dbgProg:(r:ItemReq)=>unknown}).dbgProg=(r)=>{const rd=new THREE.WebGLRenderer(),sc=new THREE.Scene(),g=itemGeometry(r)!,cam=new THREE.PerspectiveCamera(30,1,.1,10);sc.add(new THREE.Mesh(g,itemMaterial()));sc.add(new THREE.AmbientLight());cam.position.set(0,0,3);rd.render(sc,cam);
 const out:unknown[]=[],gl=rd.getContext();for(const p of rd.info.programs??[]){const pr=(p as unknown as {program:WebGLProgram}).program,n=gl.getProgramParameter(pr,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const a=gl.getActiveAttrib(pr,i)!;out.push([a.name,a.type,gl.getAttribLocation(pr,a.name)]);}}
 return out;};
(W as unknown as {dbgGeo:(r:ItemReq)=>unknown}).dbgGeo=(r)=>{const g=itemGeometry(r)!,a=g.getAttribute('aDec'),m=buildItem(r)!;return {n:a.count,first:[...(a.array as Float32Array).slice(0,8)],meshFirst:[...(m.decals as Float32Array).slice(0,8)],attrs:Object.keys(g.attributes)};};
(W as unknown as {itemDefs:()=>unknown}).itemDefs=()=>ITEM_IDS.map(id=>{const d=itemDef(id)!;return {id,name:d.name,category:d.category,frame:d.frame};});
(W as unknown as {skinIds:()=>string[]}).skinIds=()=>listSkins().filter(x=>x.id!=='neutral').map(x=>x.id);
W.renderItems=async(S:Spec)=>{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(S.width,S.height);document.body.appendChild(renderer.domElement);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.05;renderer.setScissorTest(true);
 const rows=Math.ceil(S.tiles.length/S.cols),tw=Math.floor(S.width/S.cols),th=Math.floor(S.height/rows),stats:unknown[]=[];
 const mat=itemMaterial();
 for(let i=0;i<S.tiles.length;i++){
  const T=S.tiles[i],col=i%S.cols,row=Math.floor(i/S.cols),x=col*tw,y=S.height-(row+1)*th;
  const scene=new THREE.Scene();scene.background=new THREE.Color(T.bg||S.bg||'#c7ccb8');
  scene.add(new THREE.HemisphereLight('#f2eee4','#77735f',1.3));
  const sun=new THREE.DirectionalLight('#fff0d8',2.7);sun.position.set(-4,6,5);scene.add(sun);
  const fill=new THREE.DirectionalLight('#a9c0d8',.7);fill.position.set(5,2,-3);scene.add(fill);
  const t0=performance.now(),g=itemGeometry(T.req),ms=performance.now()-t0;
  const info=buildItem(T.req);
  if(!g||!info){stats.push({id:T.req.id,missing:true});continue;}
  const mesh=new THREE.Mesh(g,mat),holder=new THREE.Group();holder.add(mesh);holder.rotation.z=((T.tiltDeg??0)*Math.PI)/180;scene.add(holder);
  holder.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(holder),c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3()),R=T.fr??Math.max(.05,sz.length()/2);
  if(T.focus){c.copy(holder.localToWorld(new THREE.Vector3(...T.focus)));}
  if(T.ground){const gm=new THREE.Mesh(new THREE.CircleGeometry(Math.max(sz.x,sz.z)*.85+.3,40),new THREE.MeshStandardMaterial({color:'#8d8e62',roughness:1}));gm.rotation.x=-Math.PI/2;gm.position.y=box.min.y-.002;scene.add(gm);}
  const cam=new THREE.PerspectiveCamera(26,tw/th,.05,100),az=((T.az??38)*Math.PI)/180,el=((T.el??18)*Math.PI)/180,fit=Math.max(R/Math.sin((cam.fov/2)*Math.PI/180),R/Math.sin(Math.atan(Math.tan((cam.fov/2)*Math.PI/180)*cam.aspect)))*1.06/(T.zoom??1);
  cam.position.set(c.x+Math.sin(az)*Math.cos(el)*fit,c.y+Math.sin(el)*fit,c.z+Math.cos(az)*Math.cos(el)*fit);cam.lookAt(c);cam.updateMatrixWorld();
  renderer.setViewport(x,y,tw,th);renderer.setScissor(x,y,tw,th);renderer.render(scene,cam);
  stats.push({id:T.req.id,era:T.req.era,tris:info.triangles,buildMs:+ms.toFixed(2),size:sz.toArray().map(v=>+v.toFixed(2)),def:itemDef(T.req.id)?.name});
  scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh&&m.geometry!==g)m.geometry.dispose();});
 }
 return {stats};
};
