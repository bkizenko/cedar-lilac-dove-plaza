/** Browser entry for taste.mjs: one contact-sheet cell per civ (house + civic + four people + flag), REAL generators, REAL three.js (SwiftShader in the sandbox).
 *  A cell is built from {gameSeed,slot,mode,envelope}: mode 'generated' = the taste-enveloped source; 'free'/'remix' = the legacy generators (envelope true = repair switch on). */
import * as THREE from 'three';
import {CharacterRigLayer,type PeopleWorld} from '@/scene/characterRigLayer';
import {cultureForSkin} from '@/scene/civPeople';
import {skinFromCiv,lookOf,emblemById,type CivSkin} from '@/scene/civSkin';
import {lookForSkin,roleOf} from '@/scene/peopleLook';
import {generateCivBuilding} from '@/scene/civBuildings';
import {buildCarvedMesh} from '@/scene/carvedMesh';
import {generateCiv,type Mode} from '@/game/civGenerator';
import {setTasteEnvelope,genomeForCivId,eraView,toHsl} from '@/scene/tasteEnvelope';
import {TEAM_STYLE} from '@/game/constants';
import type {UnitLike} from '@/scene/characterAnim';
import type {CivMaterials,Swatch} from '@/scene/civStyles';

type Spec={mode:Mode;gameSeed:number;slot:number;envelope?:boolean;width:number;height:number;era?:number;/** render only a house at these eras with the genome's era palette */eraStrip?:number[]};
const W=window as unknown as {renderTaste:(s:Spec)=>Promise<{png:string;flag:string;info:Record<string,unknown>}>};
let renderer:THREE.WebGLRenderer|null=null;
function lights(scene:THREE.Scene){
 scene.add(new THREE.HemisphereLight('#fff1dc','#7a6a4c',1.2));
 const sun=new THREE.DirectionalLight('#ffe0b0',3.2);sun.position.set(-14,22,16);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 const c=sun.shadow.camera;c.left=-30;c.right=30;c.top=30;c.bottom=-30;c.near=1;c.far=90;scene.add(sun,sun.target);
}
function meshOf(spec:ReturnType<typeof generateCivBuilding>){
 const d=buildCarvedMesh(spec,0),g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(d.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(d.normals,3));g.setAttribute('color',new THREE.BufferAttribute(d.colors,3));
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92}));m.castShadow=true;m.receiveShadow=true;return m;
}
/** Banner cloth in the civ's cloth colour with its emblem in the ink colour, cut by the civ's banner style. */
function flagPng(skin:CivSkin){
 const c=document.createElement('canvas');c.width=180;c.height=130;const x=c.getContext('2d')!,pal=skin.palette!,em=emblemById(skin.banner.emblem),ink=pal[em.ink].hex;
 x.fillStyle='#e9e1cf';x.fillRect(0,0,180,130);x.fillStyle='#5a4630';x.fillRect(10,6,6,122);
 const cloth=pal.cloth.hex;x.fillStyle=cloth;x.beginPath();
 const st=skin.banner.style,L=16,T=12,Wd=st==='pennant'?150:st==='hanging'?70:130,Hh=st==='hanging'?100:st==='streamers'?44:76;
 if(st==='swallow'){x.moveTo(L,T);x.lineTo(L+Wd,T);x.lineTo(L+Wd-26,T+Hh/2);x.lineTo(L+Wd,T+Hh);x.lineTo(L,T+Hh);}
 else if(st==='pennant'){x.moveTo(L,T);x.lineTo(L+Wd,T+Hh/2);x.lineTo(L,T+Hh);}
 else if(st==='twin'){x.rect(L,T,Wd/2-4,Hh);x.rect(L+Wd/2+4,T,Wd/2-4,Hh);}
 else if(st==='streamers'){x.rect(L,T,Wd,Hh*.3);x.rect(L,T+Hh*.42,Wd*.85,Hh*.3);}
 else x.rect(L,T,Wd,Hh);
 x.fill();
 const bx=L+4,by=T+4,bw=Math.min(Wd,Hh)*.8,bh=Math.min(Wd,Hh)*.8;
 x.fillStyle=ink;x.strokeStyle=ink;
 for(const p of em.prims){
  if(p.k==='poly'){x.beginPath();p.pts.forEach(([u,v],i)=>i?x.lineTo(bx+u*bw,by+v*bh):x.moveTo(bx+u*bw,by+v*bh));x.closePath();x.fill();}
  else if(p.k==='circle'){x.beginPath();x.arc(bx+p.c[0]*bw,by+p.c[1]*bh,p.r*bw,0,Math.PI*2);x.fill();}
  else{x.lineWidth=p.w*bw;x.beginPath();p.pts.forEach(([u,v],i)=>i?x.lineTo(bx+u*bw,by+v*bh):x.moveTo(bx+u*bw,by+v*bh));x.stroke();}
 }
 return c.toDataURL('image/png');
}
function withPalette(skin:CivSkin,pal:Record<string,string>):CivSkin{
 const p={...skin.palette!} as CivMaterials;for(const k of Object.keys(pal) as (keyof CivMaterials)[])p[k]={...(p[k] as Swatch),hex:pal[k]};
 return {...skin,palette:p};
}
W.renderTaste=async(S)=>{
 setTasteEnvelope(!!S.envelope);
 const civ=generateCiv(S.gameSeed,S.slot,S.mode),skin=skinFromCiv(civ);setTasteEnvelope(false);
 if(!renderer){renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);}
 renderer.setSize(S.width,S.height);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d9dccd');lights(scene);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:skin.palette?.ground.hex??'#8c8a58',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const g=skin.grammar!,look=lookOf(skin);
 const ctx=(role:string,era:number,pal?:Record<string,string>)=>({seed:11+S.slot,era,wealth:.6,wear:.1,footprint:role==='house'?{w:8,d:7}:{w:14,d:12},look:lookOf(pal?withPalette(skin,pal):skin)});
 let people=true;
 if(S.eraStrip){
  people=false;const gen=genomeForCivId(civ.id);
  S.eraStrip.forEach((e,i)=>{const v=eraView(gen,e),m=meshOf(generateCivBuilding(g,'house',ctx('house',e,{wall:v.palette.wall,wall2:v.palette.wall2,roof:v.palette.roof,trim:v.palette.trim,accent:v.palette.accent,cloth:v.palette.cloth})));m.position.set((i-(S.eraStrip!.length-1)/2)*11,0,0);m.rotation.y=-.45;scene.add(m);});
  const cam=new THREE.PerspectiveCamera(30,S.width/S.height,.5,500);cam.position.set(0,12,38);cam.lookAt(0,2.4,0);renderer.render(scene,cam);
  return {png:renderer.domElement.toDataURL('image/png'),flag:flagPng(skin),info:{id:skin.id}};
 }
 const house=meshOf(generateCivBuilding(g,'house',ctx('house',S.era??3))),civic=meshOf(generateCivBuilding(g,'civic',ctx('civic',S.era??3)));
 house.position.set(-7.5,0,1);house.rotation.y=-.5;civic.position.set(7,0,-4);civic.rotation.y=-.5;scene.add(house,civic);
 const cam=new THREE.PerspectiveCamera(31,S.width/S.height,.5,500);cam.position.set(0,8.5,27);cam.lookAt(0,2.6,0);cam.updateMatrixWorld();
 // people: worker, farmer, soldier, ruler, the real rig with the civ's own look
 const layer=new CharacterRigLayer(scene),alive=new Set<number>(),culture=cultureForSkin(skin,3),plook=lookForSkin(skin);
 const rows=[['worker',{}],['worker',{role:'farmer'}],['spearman',{}],['leader',{cls:'leader'}]] as [string,{role?:string;cls?:string}][];
 const units=rows.map(([t,o],i)=>({u:{id:100+i*13,type:t,team:0,x:(i-1.5)*2.4,y:0,z:11.5,vx:0,vz:0,facing:.45,hp:10,order:'idle',carry:0,target:null,range:1.8,cd:0,rof:1.1,maturesAt:undefined,ageT:undefined} as unknown as UnitLike,o}));
 units.forEach(x=>alive.add(x.u.id));
 const world:PeopleWorld={time:0,season:'summer' as never,era:3,identity:()=>({culture,teamColor:TEAM_STYLE[0].unit,affiliation:TEAM_STYLE[0].unit,look:plook}),
  gearOf:u=>u.type==='spearman'?{armor:{kind:'paddedTorso',condition:.9}}:{garment:{item:'lightClothes',condition:.95}} as never,projectFor:()=>undefined,farmFor:()=>null,fireLitNear:()=>true,loadOf:()=>0,aliveIds:()=>alive,visible:()=>true,
  roleOf:u=>{const x=units.find(q=>q.u.id===u.id)!;return (x.o.role as never)??roleOf({type:u.type,bodyClass:(x.o.cls as never)??'adult'});}};
 for(let f=0;f<=12;f++){world.time=f*.05;layer.beginFrame(world,cam.position,'high',true);for(const x of units){const t=x.u.type,st=TEAM_STYLE[0],body=t==='leader'?1.95:1.65;layer.write(x.u,[body*st.sx,(t==='leader'?1.18:1)*1.65*st.sy,body*st.sz],0,1,.5);}layer.endFrame();}
 renderer.render(scene,cam);
 const gen=civ.mode==='generated'?genomeForCivId(civ.id):null;
 return {png:renderer.domElement.toDataURL('image/png'),flag:flagPng(skin),info:{id:skin.id,name:skin.name,mode:skin.mode,grammar:g,roof:skin.roof,banner:skin.banner,cut:skin.garb.cut,head:skin.garb.headwear,climate:skin.garb.climate,palette:Object.fromEntries(Object.entries(skin.palette!).map(([k,v])=>[k,v.hex])),
  sat:Object.values(skin.palette!).map(v=>+toHsl(v.hex)[1].toFixed(2)),genome:gen?{ornament:gen.ornament.family,motif:gen.ornament.motifs[0],materials:gen.materials}:null,look:look?1:0}};
};
