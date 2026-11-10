import * as THREE from 'three';import type{BldType}from'../game/types';
/** Upper surface deviations only; foundations and connected construction never move. */
export const CRAFTSMANSHIP_RULES={maximumRoofLeanMetres:.045,maximumBraceBendMetres:.025,maximumRoofLiftMetres:.035,foundationLockMetres:.25,fullEffectHeightMetres:3.8} as const;
const roles=new Set<BldType>(['hut','house','townhall','warehouse','workshop','lumber','quarry','market','temple','university']);
export function hasBuildingCraftsmanship(type:BldType){return roles.has(type);}
function channel(n:number){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(((n^(n>>>16))>>>0)/4294967295)*2-1;}
export function buildingCraftsmanship(seed:number,id:number,type:BldType){if(!hasBuildingCraftsmanship(type))return{x:0,z:0,brace:0,lift:0};const n=seed^Math.imul(id,2654435761);return{x:channel(n)*CRAFTSMANSHIP_RULES.maximumRoofLeanMetres,z:channel(n^0x1c69b3f7)*CRAFTSMANSHIP_RULES.maximumRoofLeanMetres,brace:channel(n^0x653b)*CRAFTSMANSHIP_RULES.maximumBraceBendMetres,lift:channel(n^0x51ed270b)*CRAFTSMANSHIP_RULES.maximumRoofLiftMetres};}
/** CPU mirror for footprint/anchoring tests and diagnostics, not a per-frame mesh edit. */
export function craftedPosition(p:{x:number;y:number;z:number},a:ReturnType<typeof buildingCraftsmanship>,roof:boolean){let t=Math.max(0,Math.min(1,(p.y-CRAFTSMANSHIP_RULES.foundationLockMetres)/(CRAFTSMANSHIP_RULES.fullEffectHeightMetres-CRAFTSMANSHIP_RULES.foundationLockMetres)));t=t*t*(3-2*t);return{x:p.x+(a.x+(roof?0:Math.sin(p.y*2.5+p.x)*a.brace))*t,y:p.y+a.lift*t,z:p.z+a.z*t};}
export function makeCraftsmanshipAttribute(geometry:THREE.BufferGeometry,capacity:number){geometry.setAttribute('buildingArt',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));}
export function bindCraftsmanship(material:THREE.Material,roof:boolean){const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey.bind(material);material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.vertexShader='attribute vec4 buildingArt;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float craftUpper=smoothstep(${CRAFTSMANSHIP_RULES.foundationLockMetres.toFixed(3)},${CRAFTSMANSHIP_RULES.fullEffectHeightMetres.toFixed(3)},position.y);
 transformed.x+=(buildingArt.x${roof?'':'+sin(position.y*2.5+position.x)*buildingArt.z'})*craftUpper;
 transformed.z+=buildingArt.y*craftUpper;
 transformed.y+=buildingArt.w*craftUpper;`);};material.customProgramCacheKey=()=>oldKey()+`/hearthwild-craft-v1/${roof?'roof':'frame'}`;material.needsUpdate=true;}
