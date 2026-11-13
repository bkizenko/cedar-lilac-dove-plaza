// Browser entry for materials.mjs: the REAL CarvedBuildingLayer (real material + per-material texture set) on a plain ground, so the preview shows exactly the in-game shader.
import * as THREE from 'three';
import {CarvedBuildingLayer} from '@/scene/carvedBuildingLayer';
import {presetSkin} from '@/scene/civSkin';
import {villageHeraldry} from '@/scene/villageIdentity';
import {BUILDINGS} from '@/game/constants';
import {setDetailLevel} from '@/game/detailLevel';
import {setBuildingTextureMode,setBuildingWeather,textureMemory,textureSizeFor} from '@/scene/buildingTextures';
import {setHutVariety} from '@/scene/hutVariety';
import {carvedSnowUniform} from '@/scene/roofSnow';
const w=window as any;
type Cell={type:string;civ?:string|null;era:number;id:number;x:number;z:number;yaw?:number;label?:string;prosperity?:number;settlement?:number};
type Opts={width:number;height:number;mode:'set'|'legacy';detail:'standard'|'high'|'ultra';weather?:{wet?:number;sun?:number;moss?:number};tier:0|1|2;cells:Cell[];cols:number;spacing:number;title?:string;dist?:number;pitch?:number;yaw?:number;fov?:number;bg?:string;ground?:string;snow?:number;hutVariety?:boolean};
w.hwMat=async(o:Opts)=>{
  setHutVariety(o.hutVariety!==false);setBuildingTextureMode(o.mode);setDetailLevel(o.detail);setBuildingWeather(o.weather||{});carvedSnowUniform.value=o.snow||0;
  const canvas=document.getElementById('c') as HTMLCanvasElement;canvas.width=o.width;canvas.height=o.height;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setSize(o.width,o.height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color(o.bg||'#b9c0b6');
  scene.add(new THREE.HemisphereLight('#f2f0ea','#7b6a4c',1.05));
  const sun=new THREE.DirectionalLight('#fff1da',2.5);sun.position.set(-60,90,70);scene.add(sun);
  const bounce=new THREE.DirectionalLight('#c9d3dc',.35);bounce.position.set(50,30,-60);scene.add(bounce);
  const rows=Math.ceil(o.cells.length/o.cols),W=o.cols*o.spacing,D=rows*o.spacing;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(W+30,D+30),new THREE.MeshStandardMaterial({color:o.ground||'#8d8a72',roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
  const layer=new CarvedBuildingLayer(scene);layer.setBump(o.detail!=='standard');
  const inst=o.cells.map((c,i)=>{const fp=(BUILDINGS as any)[c.type]||{w:6,d:6};const skin=c.civ?presetSkin(c.civ as any):undefined;
    return {worldSeed:7,type:c.type,id:c.id,era:c.era,footprint:{w:fp.w,d:fp.d},settlementSeed:c.settlement??(Math.floor(i/o.cols)+1),...(skin?{skin,heraldry:villageHeraldry(7,(c.settlement??(Math.floor(i/o.cols)+1)))}:{}),prosperity:c.prosperity,x:c.x,y:0,z:c.z,yaw:c.yaw??0};});
  const eye=new THREE.Vector3();const pitch=o.pitch??.62,yaw=o.yaw??.35,dist=o.dist??Math.max(W,D)*1.25;
  const cam=new THREE.PerspectiveCamera(o.fov??28,o.width/o.height,1,2000);
  cam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);cam.lookAt(0,1.5,0);cam.updateMatrixWorld();
  layer.sync(inst as any,cam.position,()=>o.tier);
  renderer.render(scene,cam);renderer.render(scene,cam);
  const out=document.createElement('canvas');out.width=o.width;out.height=o.height;const g=out.getContext('2d')!;g.drawImage(canvas,0,0);
  g.font='600 13px DejaVu Sans, sans-serif';g.textBaseline='middle';
  for(const [i,c] of o.cells.entries()){if(!c.label)continue;const v=new THREE.Vector3(c.x-o.spacing*.45,0.2,c.z+o.spacing*.42).project(cam),x=(v.x*.5+.5)*o.width,y=(1-(v.y*.5+.5))*o.height,t=c.label,tw=g.measureText(t).width+8;g.fillStyle='rgba(30,24,16,.72)';g.fillRect(x-4,y-9,tw,18);g.fillStyle='#f4ead6';g.fillText(t,x,y);}
  if(o.title){g.font='700 15px DejaVu Sans, sans-serif';const tw=g.measureText(o.title).width+12;g.fillStyle='rgba(30,24,16,.8)';g.fillRect(8,8,tw,26);g.fillStyle='#f4ead6';g.fillText(o.title,14,21);}
  const st=layer.stats();const url=out.toDataURL('image/png');layer.dispose();renderer.dispose();
  return {url,stats:st,mem:textureMemory(textureSizeFor(o.detail)),gl:renderer.info.render};
};
w.hwReady=true;
