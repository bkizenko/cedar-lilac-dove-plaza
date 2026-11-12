import * as THREE from 'three';
/** Painterly vegetation materials: the same MeshStandardMaterial lighting as the classic kit (shadows, fog, tone mapping), plus
 * GPU wind sway rooted at the instance origin (trunk, crown and undergrowth share one phase so a tree moves as one body) and a soft
 * back-light on leaves. Render-only; instance matrices, picking and collision never see the sway. */
export type PainterSway={uTime:{value:number};uWind:{value:number}};
let shared:PainterSway|null=null;
export const painterSway=():PainterSway=>shared??(shared={uTime:{value:0},uWind:{value:.8}});
export const PAINTER_WIND_RULES={treeSway:.0068,grassSway:.34,flutter:.012} as const;
function patch(material:THREE.MeshStandardMaterial,sway:PainterSway,mode:'tree'|'leaf'|'grass',key:string){
 material.customProgramCacheKey=()=>`painter-veg-${key}-v1`;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uTime=sway.uTime;shader.uniforms.uWind=sway.uWind;
  const amp=mode==='grass'?PAINTER_WIND_RULES.grassSway:PAINTER_WIND_RULES.treeSway,flutter=mode==='leaf'?PAINTER_WIND_RULES.flutter:0;
  shader.vertexShader=`uniform float uTime;uniform float uWind;\n`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   {
    #ifdef USE_INSTANCING
     vec3 iPos=instanceMatrix[3].xyz;
    #else
     vec3 iPos=vec3(0.);
    #endif
    float hgt=max(position.y,0.);
    float ph=dot(iPos.xz,vec2(.173,.131));
    float gust=.5+.5*sin(uTime*.55+iPos.x*.021+iPos.z*.017);
    vec2 w=vec2(sin(uTime*1.25+ph),cos(uTime*.93+ph*1.31))*uWind*(.3+.7*gust);
    float k=${mode==='grass'?'hgt*hgt':'hgt*hgt'}*${amp.toFixed(5)};
    transformed.xz+=w*k;
    ${flutter>0?`transformed+=vec3(sin(uTime*3.1+position.x*2.3+ph),sin(uTime*2.7+position.y*2.1+ph*1.7),cos(uTime*3.4+position.z*2.5+ph))*${flutter.toFixed(4)}*uWind*smoothstep(.5,3.,hgt);`:''}
   }`);
  if(mode==='leaf')shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
   // soft translucency: crowns keep a little of their own colour on the shaded side, like light scattered through leaves
   reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.10,.115,.05);`);
 };
}
export function makePainterFoliage(sway:PainterSway,far=false){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,vertexColors:true,side:THREE.DoubleSide});
 if(far)m.customProgramCacheKey=()=>'painter-veg-far-v1';else patch(m,sway,'leaf','leaf');
 if(far)m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
  reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(.10,.115,.05);`);};
 return m;
}
export function makePainterBark(sway:PainterSway){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95,metalness:0,vertexColors:true});patch(m,sway,'tree','bark');return m;
}
export function makePainterGrass(sway:PainterSway,sway_=true){
 const m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,vertexColors:true,side:THREE.DoubleSide});
 if(sway_)patch(m,sway,'grass','grass');return m;
}
export function makePainterProp(){return new THREE.MeshStandardMaterial({color:0xffffff,roughness:.97,metalness:0,vertexColors:true,flatShading:false});}

/** Adds the same wind sway to a material that already has its own onBeforeCompile (e.g. terrain-conforming crops). Sway is applied after the
 * existing vertex transform ('project_vertex'), so plants keep sitting on the ground and only the free tips move. */
export function addPainterSway(material:THREE.Material,sway:PainterSway,key:string,amp=.2){
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 material.customProgramCacheKey=()=>`${previousKey?previousKey.call(material):''}|painter-sway-${key}`;
 material.onBeforeCompile=(shader,renderer)=>{
  previous?.call(material,shader,renderer);
  shader.uniforms.uTime=sway.uTime;shader.uniforms.uWind=sway.uWind;
  shader.vertexShader=`uniform float uTime;uniform float uWind;\n`+shader.vertexShader.replace('#include <project_vertex>',`
   {
    #ifdef USE_INSTANCING
     vec3 swI=instanceMatrix[3].xyz;
    #else
     vec3 swI=vec3(0.);
    #endif
    float swH=max(position.y,0.);
    float swP=dot(swI.xz,vec2(.173,.131));
    float swG=.5+.5*sin(uTime*.55+swI.x*.021+swI.z*.017);
    vec2 swW=vec2(sin(uTime*1.25+swP),cos(uTime*.93+swP*1.31))*uWind*(.3+.7*swG);
    transformed.xz+=swW*swH*swH*${amp.toFixed(3)};
   }
   #include <project_vertex>`);
 };
}
