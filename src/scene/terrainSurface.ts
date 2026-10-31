import * as THREE from 'three';
/** Original seamless packed surface texture. Channels encode mineral grain,
 * fracture edges, fine ground cover and roughness; never changes collision. */
export const SURFACE_RULES={textureSize:128,detailMetres:9,provinceMetres:42,normalStrength:.055,rockNormalStrength:.15,fadeStartMetres:70,fadeEndMetres:240} as const;
const fract=(v:number)=>v-Math.floor(v);
function hash(x:number,z:number,seed:number){return fract(Math.sin(x*127.1+z*311.7+seed*.017)*43758.5453);}
function periodicNoise(x:number,z:number,cells:number,seed:number){
 const px=x*cells,pz=z*cells,ix=Math.floor(px),iz=Math.floor(pz),fx=fract(px),fz=fract(pz),u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
 const at=(dx:number,dz:number)=>hash((ix+dx)%cells,(iz+dz)%cells,seed);
 return (at(0,0)*(1-u)+at(1,0)*u)*(1-v)+(at(0,1)*(1-u)+at(1,1)*u)*v;
}
export function surfacePixels(seed:number,size=SURFACE_RULES.textureSize){
 const data=new Uint8Array(size*size*4);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const u=x/size,v=z/size,broad=periodicNoise(u,v,8,seed),grain=periodicNoise(u,v,48,seed+19),fine=hash(x,z,seed+41);
  const fracture=1-Math.min(1,Math.abs(periodicNoise(u,v,12,seed+73)-.5)*15);
  const i=(z*size+x)*4;data[i]=Math.round((broad*.6+grain*.4)*255);data[i+1]=Math.round(fracture*255);data[i+2]=Math.round((grain*.9+fine*.1)*255);data[i+3]=Math.round((.65+grain*.25+fine*.1)*255);
 }
 return data;
}
export function duneSandWeight(features:{kind:string;x:number;z:number;shape?:{rx:number;rz:number;rotation:number}}[],x:number,z:number){
 let weight=0;
 for(const feature of features){if(feature.kind!=='dunes'||!feature.shape)continue;
  const {rx,rz,rotation}=feature.shape,dx=x-feature.x,dz=z-feature.z,c=Math.cos(rotation),sn=Math.sin(rotation);
  const edge=Math.hypot((dx*c+dz*sn)/rx,(-dx*sn+dz*c)/rz);
  weight=Math.max(weight,Math.max(0,Math.min(1,(1-edge)/.15)));
 }
 return weight;
}
export class TerrainSurface {
 readonly detail:THREE.DataTexture;
 readonly heights:THREE.DataTexture;
 readonly size:number;readonly segments:number;
 readonly snow={value:0};
 constructor(heights:Float32Array,size:number,seed:number){
  this.size=size;this.segments=Math.round(Math.sqrt(heights.length))-1;
  this.detail=new THREE.DataTexture(surfacePixels(seed),SURFACE_RULES.textureSize,SURFACE_RULES.textureSize,THREE.RGBAFormat);
  this.detail.wrapS=this.detail.wrapT=THREE.RepeatWrapping;this.detail.magFilter=THREE.LinearFilter;this.detail.minFilter=THREE.LinearMipmapLinearFilter;this.detail.generateMipmaps=true;this.detail.anisotropy=4;this.detail.needsUpdate=true;
  this.heights=new THREE.DataTexture(heights,this.segments+1,this.segments+1,THREE.RedFormat,THREE.FloatType);
  this.heights.magFilter=this.heights.minFilter=THREE.NearestFilter;this.heights.generateMipmaps=false;this.heights.needsUpdate=true;
 }
 bind(material:THREE.MeshStandardMaterial,biomes=false){
  material.flatShading=false;
  material.customProgramCacheKey=()=>`hearth-terrain-surface-v3-${biomes?'ecology':'legacy'}`;
  material.onBeforeCompile=shader=>{
   shader.uniforms.surfaceDetail={value:this.detail};shader.uniforms.surfaceSnow=this.snow;
   shader.vertexShader=(biomes?'attribute vec4 biomeCover;attribute vec4 biomeMaterial;attribute vec3 biomeTint;varying vec4 vBiomeCover;varying vec4 vBiomeMaterial;varying vec3 vBiomeTint;\n':'')+'attribute float surfaceRock;attribute float surfaceSand; varying vec3 vSurfaceWorld; varying vec3 vSurfaceNormal; varying float vSurfaceRock;varying float vSurfaceSand;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     vSurfaceWorld=(modelMatrix*vec4(position,1.)).xyz;
     vSurfaceNormal=normalize(mat3(modelMatrix)*normal);vSurfaceRock=surfaceRock;vSurfaceSand=surfaceSand;
     ${biomes?'vBiomeCover=biomeCover;vBiomeMaterial=biomeMaterial;vBiomeTint=biomeTint;':''}`);
   shader.fragmentShader=`${biomes?'varying vec4 vBiomeCover;varying vec4 vBiomeMaterial;varying vec3 vBiomeTint;':''}
    uniform sampler2D surfaceDetail;uniform float surfaceSnow;
    varying vec3 vSurfaceWorld;varying vec3 vSurfaceNormal;varying float vSurfaceRock;varying float vSurfaceSand;
    vec3 surfacePerturb(vec3 eyePosition,vec3 normalIn,float height){
     vec3 sigmaX=dFdx(eyePosition),sigmaY=dFdy(eyePosition);
     vec3 r1=cross(sigmaY,normalIn),r2=cross(normalIn,sigmaX);float determinant=dot(sigmaX,r1);
     return normalize(abs(determinant)*normalIn-sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2));
    }
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 weights=pow(abs(normalize(vSurfaceNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
    vec3 p=vSurfaceWorld/${SURFACE_RULES.detailMetres.toFixed(1)};
    ${biomes?'p=vSurfaceWorld/max(2.0,vBiomeMaterial.z);':''}
    vec4 textureX=texture2D(surfaceDetail,p.yz),textureY=texture2D(surfaceDetail,p.xz),textureZ=texture2D(surfaceDetail,p.xy);
    vec4 surface=textureX*weights.x+textureY*weights.y+textureZ*weights.z;
    vec4 meso=texture2D(surfaceDetail,vSurfaceWorld.xz/18.0+vec2(.137,.291));
    float province=texture2D(surfaceDetail,vSurfaceWorld.xz/${SURFACE_RULES.provinceMetres.toFixed(1)}).r;
    float sand=clamp(vSurfaceSand,0.,1.)*(1.-surfaceSnow*.9);
    float rock=clamp(vSurfaceRock,0.,1.)*(1.-sand);
    float cracks=surface.g*rock;
    float strata=sin(vSurfaceWorld.y*2.2+surface.r*2.5)*.5+.5;
    float grain=mix(surface.b,surface.r,rock);
    float microFade=1.-smoothstep(${SURFACE_RULES.fadeStartMetres.toFixed(1)},${SURFACE_RULES.fadeEndMetres.toFixed(1)},length(vViewPosition));
    float variation=mix(1.,.92+grain*.16,microFade);
    vec3 mineral=mix(vec3(.81,.76,.65),vec3(1.12,1.10,1.04),province);
    diffuseColor.rgb*=mix(vec3(1.),mineral,rock*.65);
    diffuseColor.rgb*=variation*(1.-cracks*.12*microFade)*(1.-rock*strata*.075);
    float mesoFade=1.-smoothstep(120.0,400.0,length(vViewPosition));
    diffuseColor.rgb*=mix(1.,.89+meso.r*.24,mesoFade);
    float soilPatch=smoothstep(.59,.77,meso.r)*(1.-rock)*(1.-sand)*mesoFade;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.27,.23,.16)*(.9+province*.2),soilPatch*.22);
    float groundLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(groundLuma),.20*(1.-rock)*(1.-sand));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.48,.28)*(.94+grain*.12),sand);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(.90+surface.b*.16),clamp(surfaceSnow,0.,1.));
    float surfaceHeight=(surface.r*.35+surface.b*.2-cracks*.55+rock*strata*.12+sin(p.x*8.+sin(p.z*2.))*.025*sand)*microFade+(meso.r-.5)*.12*mesoFade;
    ${biomes?`vec3 biomeGround=vBiomeTint*(.88+meso.r*.25);
    biomeGround=mix(biomeGround,vec3(.23,.18,.12)*(.82+province*.3),vBiomeCover.y*.28);
    biomeGround*=1.-vBiomeCover.w*.12;
    biomeGround=mix(biomeGround,diffuseColor.rgb,rock*.85);
    diffuseColor.rgb=mix(diffuseColor.rgb,biomeGround,.78*(1.-surfaceSnow*.98)*(1.-sand*.85));
    surfaceHeight+=((meso.g-.5)*vBiomeCover.y*.09+(surface.b-.5)*vBiomeCover.z*.07)*mesoFade;`:''}
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=clamp(mix(.95,.72,rock)+surface.a*.12,.55,1.);
     ${biomes?'roughnessFactor=mix(roughnessFactor,clamp(vBiomeMaterial.x+(surface.a-.8)*.05-vBiomeCover.w*.08,.52,1.),.9*(1.-rock));':''}`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     normal=surfacePerturb(-vViewPosition,normal,surfaceHeight*mix(${SURFACE_RULES.normalStrength.toFixed(3)},${SURFACE_RULES.rockNormalStrength.toFixed(3)},rock)*(1.-surfaceSnow*.65)*${biomes?'mix(clamp(vBiomeMaterial.y/0.055,.2,2.5),1.,rock)':'1.'});`);
  };
  material.needsUpdate=true;
 }
 dispose(){this.detail.dispose();this.heights.dispose();}
}
