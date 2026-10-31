import * as THREE from 'three';
import {EXCAVATION_RULES,type ExcavationTerrain} from '../game/excavation';
/** One sparse height atlas shared by fields, crops and their depth shadows. */
export class ExcavationSurface {
 readonly uniforms={cutTileMap:{value:new THREE.DataTexture(new Float32Array(1),1,1,THREE.RedFormat,THREE.FloatType)},cutAtlas:{value:new THREE.DataTexture(new Float32Array(1),1,1,THREE.RedFormat,THREE.FloatType)},cutInfo:{value:new THREE.Vector4(1,1,1,0)},cutAtlasSize:{value:new THREE.Vector2(1,1)}};
 readonly size:number;
 constructor(size:number){this.size=size;for(const u of [this.uniforms.cutTileMap,this.uniforms.cutAtlas]){u.value.minFilter=u.value.magFilter=THREE.NearestFilter;u.value.generateMipmaps=false;u.value.needsUpdate=true;}}
 update(terrain:ExcavationTerrain){
  const n=EXCAVATION_RULES.subdivisions+1,columns=16,rows=Math.max(1,Math.ceil(terrain.tiles.size/columns)),map=new Float32Array(terrain.width**2),atlas=new Float32Array(columns*n*rows*n);let index=0;
  for(const tile of terrain.tiles.values()){map[tile.key]=index+1;const tx=index%columns*n,tz=Math.floor(index/columns)*n;for(let z=0;z<n;z++)for(let x=0;x<n;x++)atlas[(tz+z)*columns*n+tx+x]=tile.heights[z*n+x];index++;}
  const replace=(uniform:{value:THREE.DataTexture},data:Float32Array,w:number,h:number)=>{uniform.value.dispose();uniform.value=new THREE.DataTexture(data,w,h,THREE.RedFormat,THREE.FloatType);uniform.value.minFilter=uniform.value.magFilter=THREE.NearestFilter;uniform.value.generateMipmaps=false;uniform.value.needsUpdate=true;};
  replace(this.uniforms.cutTileMap,map,terrain.width,terrain.width);replace(this.uniforms.cutAtlas,atlas,columns*n,rows*n);this.uniforms.cutInfo.value.set(terrain.tileSize,terrain.width,columns,index);this.uniforms.cutAtlasSize.value.set(columns*n,rows*n);
 }
 bind(shader:THREE.WebGLProgramParametersWithUniforms){Object.assign(shader.uniforms,this.uniforms);}
 get glsl(){const n=EXCAVATION_RULES.subdivisions;return`
 uniform sampler2D cutTileMap;uniform sampler2D cutAtlas;uniform vec4 cutInfo;uniform vec2 cutAtlasSize;
 float refinedExcavationHeight(vec2 worldXZ,float fallbackHeight){
  if(cutInfo.w<.5)return fallbackHeight;
  vec2 grid=(worldXZ/${this.size.toFixed(1)}+.5)*cutInfo.y;
  vec2 tile=floor(grid);if(min(tile.x,tile.y)<0.||max(tile.x,tile.y)>=cutInfo.y)return fallbackHeight;
  float id=texture2D(cutTileMap,(tile+.5)/cutInfo.y).r-1.;if(id<-.5)return fallbackHeight;
  vec2 fine=fract(grid)*${n.toFixed(1)},cell=min(floor(fine),vec2(${(n-1).toFixed(1)})),f=fine-cell;
  vec2 atlasTile=vec2(mod(id,cutInfo.z),floor(id/cutInfo.z))*${(n+1).toFixed(1)};
  vec2 uv=(atlasTile+cell+.5)/cutAtlasSize,delta=1./cutAtlasSize;
  float a=texture2D(cutAtlas,uv).r,b=texture2D(cutAtlas,uv+vec2(delta.x,0.)).r,c=texture2D(cutAtlas,uv+vec2(0.,delta.y)).r,d=texture2D(cutAtlas,uv+delta).r;
  return f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
 }
 `;}
 dispose(){this.uniforms.cutTileMap.value.dispose();this.uniforms.cutAtlas.value.dispose();}
}
