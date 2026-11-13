import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {DrawBands,DrawDistance} from '../game/drawDistance';
import {seaSurfaceY} from '../game/localWater';
import {buildHorizon,type HorizonGeometry} from './horizonField';
/** The land, sea and forest beyond the playable square (see horizonField.ts for the rules). One ground mesh (Lambert, vertex colours, painter fog, sea
 * Fresnel/sun glitter injected into the same material) and one InstancedMesh of canopy blobs: two draw calls, never pickable, no collider. */
export class HorizonRing{
 readonly group=new THREE.Group();
 private ground:THREE.Mesh|null=null;private canopy:THREE.InstancedMesh|null=null;
 private groundMat:THREE.MeshLambertMaterial;private canopyMat:THREE.MeshLambertMaterial;
 private uniforms={uSkyHorizon:{value:new THREE.Color('#d8e4e8')},uSkyZenith:{value:new THREE.Color('#3f78b8')},uSunDir:{value:new THREE.Vector3(.4,.6,.3).normalize()},uSunColor:{value:new THREE.Color('#fff0cf')},uSeaLight:{value:1}};
 private game:Game|null=null;private level:DrawDistance='medium';private far=1400;private builtKey='';
 /** last build, for the budget report */
 stats:HorizonGeometry['stats']|null=null;
 private scene:THREE.Scene;
 constructor(scene:THREE.Scene){
  this.scene=scene;this.group.name='horizon-ring';
  this.groundMat=new THREE.MeshLambertMaterial({vertexColors:true});
  const u=this.uniforms;
  this.groundMat.customProgramCacheKey=()=>'horizon-ring-v1';
  this.groundMat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,u);
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aSea;varying float vSea;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSea=aSea;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying float vSea;uniform vec3 uSkyHorizon;uniform vec3 uSkyZenith;uniform vec3 uSunDir;uniform vec3 uSunColor;uniform float uSeaLight;`)
    .replace('#include <opaque_fragment>',`
    if(vSea>.01){
     // open sea: Fresnel sky reflection (horizon haze at grazing angles, zenith blue overhead) and a sun glitter path
     vec3 Vv=normalize(vViewPosition);vec3 up=normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz);
     float ndv=clamp(dot(up,Vv),0.,1.);
     float fres=.03+.97*pow(1.-ndv,3.5);
     vec3 Rv=reflect(-Vv,up);
     vec3 sky=mix(uSkyHorizon,uSkyZenith,clamp(dot(Rv,up)*1.6,0.,1.));
     vec3 sea=outgoingLight*mix(.7,1.,uSeaLight);
     sea=mix(sea,sky,clamp(fres*.9+.05,0.,.95));
     vec3 sunV=normalize((viewMatrix*vec4(uSunDir,0.)).xyz);
     float sd=max(dot(Rv,sunV),0.);
     sea+=uSunColor*(pow(sd,90.)*.55+pow(sd,14.)*.08)*uSeaLight*fres;
     outgoingLight=mix(outgoingLight,sea,vSea);
    }
    #include <opaque_fragment>`);
  };
  this.canopyMat=new THREE.MeshLambertMaterial({color:'#ffffff'});
  this.canopyMat.flatShading=true;
  scene.add(this.group);
 }
 /** (Re)build for this world and draw-distance bands. Cheap enough to redo when the level changes (tens of ms). */
 build(game:Game,level:DrawDistance,bands:DrawBands){
  this.game=game;this.level=level;this.far=bands.cameraFar;
  const w=game.world,half=w.size/2,width=w.landContinuation?.width??0,seaY=seaSurfaceY(w);
  const key=`${game.state.seed}/${w.size}/${level}/${Math.round(this.far)}/${width}/${seaY.toFixed(2)}`;
  if(key===this.builtKey&&this.ground)return;this.builtKey=key;
  this.clear();
  const inner=width>0?continuationLookup(w.landContinuation!,half,(x,z)=>game.height(x,z)):(x:number,z:number)=>game.height(x,z);
  const geo=buildHorizon({seed:game.state.seed|0,half,width,seaY,extent:Math.max(400,this.far*1.02),tier:level,inner});
  this.stats=geo.stats;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(geo.positions,3));g.setAttribute('color',new THREE.BufferAttribute(geo.colors,3));g.setAttribute('aSea',new THREE.BufferAttribute(geo.sea,1));
  g.setIndex(new THREE.BufferAttribute(geo.indices,1));g.computeVertexNormals();g.computeBoundingSphere();
  this.ground=new THREE.Mesh(g,this.groundMat);this.ground.name='horizon-ring-ground';this.ground.raycast=()=>{};this.ground.frustumCulled=false;this.ground.renderOrder=0;this.group.add(this.ground);
  if(geo.canopies.length){
   const cone=new THREE.ConeGeometry(1,1,6,1,true);cone.translate(0,.5,0);
   const m=new THREE.InstancedMesh(cone,this.canopyMat,geo.canopies.length),mat=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3(),c=new THREE.Color();
   geo.canopies.forEach((k,i)=>{
    p.set(k.x,k.y,k.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),k.tone*6.28);s.set(k.r,k.h*1.15,k.r);mat.compose(p,q,s);m.setMatrixAt(i,mat);
    const hi=Math.max(0,Math.min(1,(k.y-seaY-30)/130)),r=.13+k.tone*.06-hi*.02,gr=.27+k.tone*.1-hi*.06,b=.14+k.tone*.04;
    c.setRGB(r,gr,b);m.setColorAt(i,c);
   });
   m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.name='horizon-ring-canopy';m.raycast=()=>{};m.computeBoundingSphere();m.frustumCulled=false;this.canopy=m;this.group.add(m);
  }
 }
 /** Per frame: sky colours for the sea reflection, sun for the glitter, a global tint for the season. */
 sync(sky:{horizon:THREE.ColorRepresentation;zenith:THREE.ColorRepresentation},sunDir:THREE.Vector3,sunColor:THREE.ColorRepresentation,light:number,tint:THREE.Color){
  this.uniforms.uSkyHorizon.value.set(sky.horizon);this.uniforms.uSkyZenith.value.set(sky.zenith);this.uniforms.uSunDir.value.copy(sunDir);this.uniforms.uSunColor.value.set(sunColor);this.uniforms.uSeaLight.value=light;
  this.groundMat.color.copy(tint);this.canopyMat.color.copy(tint);
 }
 /** Scene-graph counts for the report. */
 counts(){return {triangles:(this.stats?.triangles??0)+(this.canopy?this.canopy.count*6:0),instances:this.canopy?.count??0,drawCalls:(this.ground?1:0)+(this.canopy?1:0)};}
 private clear(){
  for(const m of [this.ground,this.canopy]){if(!m)continue;this.group.remove(m);m.geometry.dispose();if((m as THREE.InstancedMesh).isInstancedMesh)(m as THREE.InstancedMesh).dispose();}
  this.ground=null;this.canopy=null;this.stats=null;
 }
 dispose(){this.clear();this.scene.remove(this.group);this.groundMat.dispose();this.canopyMat.dispose();this.builtKey='';}
}
/** Heights of the continuation band (the decorative terrain drawn up to `width` metres beyond the square) by inverse-distance weighting over its vertices;
 * inside the square it is the real world height. */
export function continuationLookup(c:{width:number;positions:Float32Array},half:number,worldHeight:(x:number,z:number)=>number){
 const cell=14,grid=new Map<number,number[]>(),P=c.positions,key=(ix:number,iz:number)=>ix*100003+iz;
 for(let i=0;i<P.length;i+=3){const k=key(Math.floor(P[i]/cell),Math.floor(P[i+2]/cell));let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(i);}
 const outer=half+c.width;
 return (x:number,z:number)=>{
  if(Math.abs(x)<=half&&Math.abs(z)<=half)return worldHeight(x,z);
  const cx=Math.max(-outer,Math.min(outer,x)),cz=Math.max(-outer,Math.min(outer,z)),ix=Math.floor(cx/cell),iz=Math.floor(cz/cell);
  let sw=0,sh=0;
  for(let r=1;r<=3&&sw===0;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
   const a=grid.get(key(ix+dx,iz+dz));if(!a)continue;
   for(const i of a){const d2=(P[i]-cx)**2+(P[i+2]-cz)**2,w=1/(d2+1);sw+=w;sh+=w*P[i+1];}
  }
  return sw>0?sh/sw:worldHeight(cx,cz);
 };
}
