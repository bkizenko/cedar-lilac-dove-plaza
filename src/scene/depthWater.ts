import {riverSurfaceData,type RiverCaps} from '../game/riverSurface';
import * as THREE from 'three';
import {lakeContains,type LocalWaterBody} from '../game/localWater';
import type {TerrainSurface} from './terrainSurface';
import {painterWaterFragment,painterWaterUniforms,type PainterWaterKind} from './painterWater';
export const WATER_ART_RULES={shallowMetres:.35,deepMetres:5,foamMetres:.85,waveNormalStrength:.10,glintPower:96,fallSegments:10} as const;
export type RenderWaterBody=LocalWaterBody;
export type RenderWaterfall={x:number;z:number;upperY:number;lowerY:number;width:number;dx:number;dz:number};
/** style 'painterly' is the 2026 map look (painterWater.ts); 'classic' is the archived shader below, unchanged. */
export function makeDepthWater(surface:TerrainSurface,time:{value:number},falling=false,style:'classic'|'painterly'='classic',kind:PainterWaterKind='sea'){
 const uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{
  uTime:time,uLight:{value:1},uSunDirection:{value:new THREE.Vector3(.5,1,.3).normalize()},uColor:{value:new THREE.Color('#53b5b8')},uDeep:{value:new THREE.Color('#123d61')},
  uHeights:{value:surface.heights},uTerrainSize:{value:surface.size},uSegments:{value:surface.segments},uFalling:{value:falling?1:0},
 }]);
 // Keep the scene's single clock reference (UniformsUtils normally clones it).
 uniforms.uTime=time;uniforms.uHeights={value:surface.heights};
 if(style==='painterly')Object.assign(uniforms,painterWaterUniforms());
 if(surface.banks)Object.assign(uniforms,surface.banks.uniforms);if(surface.bankCuts)Object.assign(uniforms,surface.bankCuts.uniforms);
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,side:THREE.DoubleSide,uniforms,
 vertexShader:`varying vec3 vWPos;varying vec2 vWaterUv;
  #include <fog_pars_vertex>
  void main(){vec4 w=modelMatrix*vec4(position,1.);vWPos=w.xyz;vWaterUv=uv;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
  }`,
 fragmentShader:style==='painterly'?painterWaterFragment(surface,falling,falling?'fall':kind):`uniform float uTime;uniform float uLight;uniform vec3 uSunDirection;uniform vec3 uColor;uniform vec3 uDeep;uniform sampler2D uHeights;
  uniform float uTerrainSize;uniform float uSegments;uniform float uFalling;
  varying vec3 vWPos;varying vec2 vWaterUv;
  ${surface.banks?.glsl??''}
  ${surface.bankCuts?.glsl??''}
  #include <fog_pars_fragment>
  float flowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float flowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(flowHash(i),flowHash(i+vec2(1.,0.)),f.x),mix(flowHash(i+vec2(0.,1.)),flowHash(i+vec2(1.)),f.x),f.y);}
  float bedHeight(vec2 worldXZ){
   vec2 grid=clamp((worldXZ/uTerrainSize+.5)*uSegments,vec2(0.),vec2(uSegments));
   vec2 cell=min(floor(grid),vec2(uSegments-1.)),f=grid-cell;float texel=1./(uSegments+1.);
   vec2 uv=(cell+.5)*texel;
   float a=texture2D(uHeights,uv).r,b=texture2D(uHeights,uv+vec2(texel,0.)).r;
   float c=texture2D(uHeights,uv+vec2(0.,texel)).r,d=texture2D(uHeights,uv+vec2(texel)).r;
   float base=f.x+f.y<=1.?a+(b-a)*f.x+(c-a)*f.y:d+(c-d)*(1.-f.x)+(b-d)*(1.-f.y);
   return ${surface.banks?'refinedExcavationHeight(worldXZ,refinedBankHeight(worldXZ,base))':'base'};
  }
  void main(){
   float depth=max(0.,vWPos.y-bedHeight(vWPos.xz));
   if(uFalling<.5&&depth<.015)discard;
   float phaseX=vWPos.x*.52+vWPos.z*.13+uTime*1.3,phaseZ=vWPos.z*.43-vWPos.x*.17+uTime*.9;
   vec3 n=normalize(vec3(cos(phaseX)*${WATER_ART_RULES.waveNormalStrength.toFixed(3)},1.,sin(phaseZ)*${WATER_ART_RULES.waveNormalStrength.toFixed(3)}));
   vec3 viewDir=normalize(cameraPosition-vWPos);
   float fres=pow(1.-clamp(dot(n,viewDir),0.,1.),3.);
   float shelf=1.-smoothstep(${WATER_ART_RULES.shallowMetres.toFixed(2)},${WATER_ART_RULES.deepMetres.toFixed(2)},depth);
   vec3 col=mix(uDeep,uColor,shelf*.88);
   col+=vec3(.12,.20,.24)*fres;
   float glint=pow(max(0.,dot(reflect(-uSunDirection,n),viewDir)),${WATER_ART_RULES.glintPower.toFixed(1)});
   col+=vec3(1.,.91,.69)*glint*.85;
   float shore=1.-smoothstep(.06,${WATER_ART_RULES.foamMetres.toFixed(2)},depth);
   float wash=.55+.45*sin(depth*12.-uTime*1.6+sin(vWPos.x*.8+vWPos.z*.6));
   float foam=shore*smoothstep(.35,.9,wash)*.28;
   float fallAlpha=1.;
   if(uFalling>.5){
    vec2 flow=vec2(vWaterUv.x*7.,vWaterUv.y*9.+uTime*1.7);
    float turbulence=flowNoise(flow*.65),strand=flowNoise(vec2(flow.x+turbulence*.9,flow.y*.6));
    float smallFlow=flowNoise(flow*vec2(2.1,1.4)+vec2(11.,-uTime*.8));
    float edgeWobble=(flowNoise(flow*vec2(.6,.4))-.5)*.12;
    float edge=smoothstep(.01,.09,vWaterUv.x+edgeWobble)*(1.-smoothstep(.91,.99,vWaterUv.x+edgeWobble));
    fallAlpha=edge*(.48+strand*.35)*( .7+.3*smallFlow);
    col=mix(vec3(.18,.39,.43),vec3(.74,.87,.87),.25+strand*.6);
    foam=smoothstep(.65,1.,1.-vWaterUv.y)*(.2+smallFlow*.45);
   }
   col=mix(col,vec3(.88,.94,.89),foam);
   float alpha=uFalling>.5?fallAlpha:mix(.77,.96,smoothstep(0.,5.,depth))+fres*.025;
   gl_FragColor=vec4(col*uLight,clamp(alpha,0.,.98));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
  }`});
}
/** One continuous grid shares every bend row. Variable-width mitered banks
 * avoid the wedge-shaped dry gaps produced by independent segment quads. */
export function riverWaterGeometry(points:{x:number;y:number;z:number;w?:number}[],width:number,caps?:RiverCaps){
 if(caps){const d=riverSurfaceData(points,width,caps),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(d.positions,3));g.setAttribute('uv',new THREE.BufferAttribute(d.uvs,2));g.setIndex(new THREE.BufferAttribute(d.indices,1));g.computeVertexNormals();g.computeBoundingSphere();return g;}
 const centers:{x:number;y:number;z:number;w:number;distance:number}[]=[];let along=0;
 for(let segment=1;segment<points.length;segment++){
  const a=points[segment-1],b=points[segment],len=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(len/2));
  for(let row=0;row<steps;row++){const t=row/steps;centers.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,w:(a.w??width)+((b.w??width)-(a.w??width))*t,distance:along+len*t});}
  along+=len;
 }
 if(points.length){const p=points[points.length-1];centers.push({...p,w:p.w??width,distance:along});}
 const maximumWidth=Math.max(width,...centers.map(p=>p.w)),columns=Math.max(2,Math.ceil(maximumWidth/2)),stride=columns+1;
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let row=0;row<centers.length;row++){
  const p=centers[row],before=centers[Math.max(0,row-1)],after=centers[Math.min(centers.length-1,row+1)];
  const inLen=Math.hypot(p.x-before.x,p.z-before.z)||1,outLen=Math.hypot(after.x-p.x,after.z-p.z)||1;
  let nx=-(p.z-before.z)/inLen-(after.z-p.z)/outLen,nz=(p.x-before.x)/inLen+(after.x-p.x)/outLen;
  const normalLen=Math.hypot(nx,nz)||1;nx/=normalLen;nz/=normalLen;
  const segmentNx=row===centers.length-1?-(p.z-before.z)/inLen:-(after.z-p.z)/outLen;
  const segmentNz=row===centers.length-1?(p.x-before.x)/inLen:(after.x-p.x)/outLen;
  const miter=Math.min(1.6,1/Math.max(.625,nx*segmentNx+nz*segmentNz));
  for(let col=0;col<=columns;col++){const lateral=(col/columns-.5)*p.w*miter;positions.push(p.x+nx*lateral,p.y,p.z+nz*lateral);uvs.push(col/columns,p.distance/Math.max(1,width));}
  if(row)for(let col=0;col<columns;col++){const a=(row-1)*stride+col,b=a+1,c=row*stride+col,d=c+1;indices.push(a,b,c,b,d,c);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
/** Small river triangles are clipped against the exact physical lake footprint,
 * eliminating the doubled transparent rectangle where a river enters its lake. */
export function clippedRiverGeometry(points:{x:number;y:number;z:number;w?:number}[],width:number,lakes:Extract<LocalWaterBody,{kind:'lake'}>[],caps?:RiverCaps){
 if(!lakes.length)return riverWaterGeometry(points,width,caps);
 type Vertex={x:number;y:number;z:number;u:number;v:number};
 const out:number[]=[],uvs:number[]=[],inside=(p:Vertex)=>lakes.some(l=>lakeContains(l,p.x,p.z));
 const interpolate=(a:Vertex,b:Vertex,t:number):Vertex=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});
 const intersection=(a:Vertex,b:Vertex)=>{let lo=0,hi=1;const first=inside(a);for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(inside(interpolate(a,b,mid))===first)lo=mid;else hi=mid;}return interpolate(a,b,(lo+hi)/2);};
 const triangle=(verts:Vertex[],level=0)=>{
  const clipped:Vertex[]=[];
  for(let i=0;i<3;i++){const a=verts[i],b=verts[(i+1)%3],aIn=inside(a),bIn=inside(b);if(!aIn)clipped.push(a);if(aIn!==bIn)clipped.push(intersection(a,b));}
  for(let i=1;i<clipped.length-1;i++){
   const a=clipped[0],b=clipped[i],c=clipped[i+1],center=interpolate(interpolate(a,b,.5),c,1/3);
   // A shoreline corner may enter a small triangle even when its vertices
   // lie outside. Refine that boundary rather than painting over the lake.
   if(inside(center)){
    if(level<4){const ab=interpolate(a,b,.5),bc=interpolate(b,c,.5),ca=interpolate(c,a,.5);for(const child of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])triangle(child,level+1);}
    continue;
   }
   for(const p of [a,b,c]){out.push(p.x,p.y,p.z);uvs.push(p.u,p.v);}
  }
 };
 const stitched=riverWaterGeometry(points,width,caps),position=stitched.attributes.position,uv=stitched.attributes.uv,index=stitched.index!;
 const at=(i:number):Vertex=>({x:position.getX(i),y:position.getY(i),z:position.getZ(i),u:uv.getX(i),v:uv.getY(i)});
 for(let i=0;i<index.count;i+=3)triangle([at(index.getX(i)),at(index.getX(i+1)),at(index.getX(i+2))]);
 stitched.dispose();
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}
export function addLocalWaters(group:THREE.Group,bodies:RenderWaterBody[],falls:RenderWaterfall[],waterMaterial:THREE.Material,fallMaterial:THREE.Material,riverMaterial:THREE.Material=waterMaterial){
 const lakes=bodies.filter((body):body is Extract<LocalWaterBody,{kind:'lake'}>=>body.kind==='lake');
 for(const body of bodies){
  let mesh:THREE.Mesh;
  if(body.kind==='lake'){
   let geo:THREE.BufferGeometry;
   if(body.shoreline?.length){const shape=new THREE.Shape();body.shoreline.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);mesh=new THREE.Mesh(geo,waterMaterial);mesh.position.y=body.surfaceY;}
   else {geo=new THREE.CircleGeometry(body.rx,64);geo.rotateX(-Math.PI/2);geo.scale(1,1,body.rz/body.rx);mesh=new THREE.Mesh(geo,waterMaterial);mesh.position.set(body.x,body.surfaceY,body.z);}
  }else{if(body.pts.length<2)continue;mesh=new THREE.Mesh(clippedRiverGeometry(body.pts,body.width,lakes,body.surfaceVersion===2?body:undefined),riverMaterial);}
  mesh.name=`water-${body.kind}-${body.id}`;mesh.renderOrder=1;mesh.raycast=()=>{};group.add(mesh);
 }
 for(const [index,fall] of falls.entries()){
  const pts=Array.from({length:WATER_ART_RULES.fallSegments+1},(_,i)=>{const t=i/WATER_ART_RULES.fallSegments;return {x:fall.x+fall.dx*t,z:fall.z+fall.dz*t,y:fall.upperY+(fall.lowerY-fall.upperY)*t};});
  // The strip's lateral direction follows the lip, while descending along flow.
  const geo=riverWaterGeometry(pts,fall.width);
  const fallUv=geo.attributes.uv;let maximumV=.0001;for(let i=0;i<fallUv.count;i++)maximumV=Math.max(maximumV,fallUv.getY(i));
  for(let i=0;i<fallUv.count;i++)fallUv.setY(i,1-fallUv.getY(i)/maximumV);
  const mesh=new THREE.Mesh(geo,fallMaterial);mesh.name=`waterfall-${index}`;mesh.renderOrder=2;mesh.raycast=()=>{};group.add(mesh);
 }
}
