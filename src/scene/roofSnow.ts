import * as THREE from 'three';
/** Shared 0..1 snow cover. Upward faces of every material bound with bindSnowCap whiten with it; season state only, no goods. */
export const carvedSnowUniform={value:0};
export const SNOW_CAP_RULES={colour:[.94,.96,.99],coverage:.92,flatFrom:.5,flatTo:.82} as const;
/** Patch a compiled shader so faces pointing up take snow (roofs, ledges, caps); walls stay bare. Works with and without instancing. */
export function patchSnowShader(shader:{uniforms:Record<string,{value:unknown}>;vertexShader:string;fragmentShader:string}){
 const R=SNOW_CAP_RULES;
 shader.uniforms.uSnow=carvedSnowUniform;
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vUpFace;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec3 sn=normal;\n#ifdef USE_INSTANCING\n sn=mat3(instanceMatrix)*sn;\n#endif\n vUpFace=normalize(mat3(modelMatrix)*sn).y;}');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vUpFace;\nuniform float uSnow;').replace('#include <color_fragment>',`#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(${R.colour.join(',')}),smoothstep(${R.flatFrom},${R.flatTo},vUpFace)*uSnow*${R.coverage});`);
}
/** Chain the snow cap onto a material's existing onBeforeCompile (craftsmanship, field surface) without replacing it. */
export function bindSnowCap(material:THREE.Material){
 const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);patchSnowShader(shader as never);};
 material.customProgramCacheKey=()=>oldKey()+'/hearthwild-snowcap-v1';material.needsUpdate=true;
}
