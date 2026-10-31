import type {Game} from '../game/sim';
import {provinceAt} from '../game/ecologicalProvinces';
export const MINIMAP_RULES=Object.freeze({pixels:160,terrainRefreshMilliseconds:500,rayStepMeters:2,maximumRaySteps:384,rayBisections:12,maximumFootprintQueries:12000,horizonBisections:8});
export type MapPoint={x:number;z:number};
export type SurfacePoint=MapPoint&{y:number};
export type RGB=readonly[number,number,number];
export function worldToMinimap(x:number,z:number,worldSize:number,pixels:number=MINIMAP_RULES.pixels){return{x:(x/worldSize+.5)*pixels,y:(z/worldSize+.5)*pixels};}
export function minimapToWorld(x:number,y:number,worldSize:number,pixels:number=MINIMAP_RULES.pixels):MapPoint{
 const clamp=(n:number)=>Math.max(0,Math.min(1,n/pixels));return{x:(clamp(x)-.5)*worldSize,z:(clamp(y)-.5)*worldSize};
}
/** Quiet north-up view marker. This is an approximate zoom indicator, not a
 * terrain raycast or the exact rotated camera footprint. No terrain is revealed. */
export function minimapViewRectangle(look:MapPoint,worldSize:number,distance:number,fovDegrees:number,aspect=1,pixels:number=MINIMAP_RULES.pixels){
 const center=worldToMinimap(look.x,look.z,worldSize,pixels),span=2*Math.max(0,distance)*Math.tan(fovDegrees*Math.PI/360)*Math.max(1,aspect);
 const side=Math.max(6,Math.min(pixels*.4,span/worldSize*pixels)),half=side/2;
 const left=Math.max(0,Math.min(pixels,center.x-half)),top=Math.max(0,Math.min(pixels,center.y-half));
 const right=Math.max(left,Math.min(pixels,center.x+half)),bottom=Math.max(top,Math.min(pixels,center.y+half));
 return{x:left,y:top,width:right-left,height:bottom-top};
}
const BIOMES:Record<string,RGB>={meadow:[108,139,82],'mixed-woodland':[76,111,67],'conifer-forest':[66,104,91],alpine:[143,149,137],wetland:[92,124,101],'dry-scrub':[147,140,94],arid:[183,158,108],'warm-coast':[119,147,92],plains:[108,139,82],forest:[76,111,67],hills:[129,133,106]};
function writeTerrainColor(target:{[index:number]:number},offset:number,height:number,water:number,biome:string,relief=0){
 const above=height-water;
 if(above<0){const depth=Math.min(1,-above/12);target[offset]=57-depth*21;target[offset+1]=113-depth*31;target[offset+2]=137-depth*29;return;}
 const base=BIOMES[biome]??BIOMES.plains,shore=Math.max(0,1-above/1.8),rock=Math.max(0,Math.min(.75,(height-35)/100));
 const light=Math.max(.72,Math.min(1.23,1+relief));
 for(let i=0;i<3;i++){const rockColor=i===0?173:i===1?170:151,shoreColor=i===0?163:i===1?153:113;target[offset+i]=((base[i]*(1-rock)+rockColor*rock)*(1-shore)+shoreColor*shore)*light;}
}
export function minimapTerrainColor(height:number,water:number,biome:string,relief=0):RGB{const color:[number,number,number]=[0,0,0];writeTerrainColor(color,0,height,water,biome,relief);return color;}
export function fogMinimapColor(color:RGB,explored:boolean,visible:boolean):RGB{return!explored?[25,32,35]:visible?color:color.map(v=>v*.65) as unknown as RGB;}
type TerrainSource=Pick<Game,'world'|'height'|'waterAt'|'navigationRevision'>;
export type MinimapTerrain={size:number;resolution:number;heights:Float32Array;water:Float32Array;colors:Uint8ClampedArray;sampledAtMilliseconds:number};
type TerrainCache={world:Game['world'];revision:number;heightSource:Game['world']['heights'];waterY:number;data:MinimapTerrain};
const terrainCaches=new WeakMap<object,TerrainCache>();
/** Height functions include physical earthworks. Even without a public earthwork
 * revision, the 2 Hz upper age bound prevents a permanently stale terrain map. */
export function sampleMinimapTerrain(g:TerrainSource,nowMilliseconds:number,resolution:number=MINIMAP_RULES.pixels):MinimapTerrain{
 const old=terrainCaches.get(g),revision=g.navigationRevision();
 if(old&&old.world===g.world&&old.heightSource===g.world.heights&&old.revision===revision&&old.waterY===g.world.waterY&&old.data.resolution===resolution&&nowMilliseconds>=old.data.sampledAtMilliseconds&&nowMilliseconds-old.data.sampledAtMilliseconds<MINIMAP_RULES.terrainRefreshMilliseconds)return old.data;
 const size=g.world.size,heights=new Float32Array(resolution*resolution),water=new Float32Array(heights.length),colors=new Uint8ClampedArray(heights.length*3);
 for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){const wx=((x+.5)/resolution-.5)*size,wz=((z+.5)/resolution-.5)*size,i=z*resolution+x;heights[i]=g.height(wx,wz);water[i]=g.waterAt(wx,wz);}
 for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
  const wx=((x+.5)/resolution-.5)*size,wz=((z+.5)/resolution-.5)*size,i=z*resolution+x;
  let biome='plains';if(g.world.ecology)biome=provinceAt(g.world.ecology,wx,wz).kind;
  else{let nearest=Infinity;for(const b of g.world.biomes){const d=(b.x-wx)**2+(b.z-wz)**2;if(d<nearest){nearest=d;biome=b.kind;}}}
  const left=heights[z*resolution+Math.max(0,x-1)],right=heights[z*resolution+Math.min(resolution-1,x+1)],up=heights[Math.max(0,z-1)*resolution+x],down=heights[Math.min(resolution-1,z+1)*resolution+x];
  writeTerrainColor(colors,i*3,heights[i],water[i],biome,((left-right)*.5+(down-up)*.35)/(size/resolution)*.18);
 }
 const data={size,resolution,heights,water,colors,sampledAtMilliseconds:nowMilliseconds};terrainCaches.set(g,{world:g.world,revision,heightSource:g.world.heights,waterY:g.world.waterY,data});return data;
}
/** Fill a reused canvas buffer without making coordinate/color arrays per pixel. */
export function paintMinimapFog(g:Pick<Game,'exploredAt'|'visibleAt'>,terrain:MinimapTerrain,pixels:Uint8ClampedArray){
 const resolution=terrain.resolution,map=terrain.size;
 for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
  const wx=((x+.5)/resolution-.5)*map,wz=((z+.5)/resolution-.5)*map,n=z*resolution+x,seen=g.exploredAt(wx,wz),visible=seen&&g.visibleAt(wx,wz),i=n*4,shade=visible?1:.65;
  pixels[i]=seen?terrain.colors[n*3]*shade:25;pixels[i+1]=seen?terrain.colors[n*3+1]*shade:32;pixels[i+2]=seen?terrain.colors[n*3+2]*shade:35;pixels[i+3]=255;
 }
}
export type CameraProjection={matrixWorld:{elements:ArrayLike<number>};projectionMatrixInverse:{elements:ArrayLike<number>}};
function transform(m:ArrayLike<number>,x:number,y:number,z:number){const w=m[3]*x+m[7]*y+m[11]*z+m[15];return{x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,z:(m[2]*x+m[6]*y+m[10]*z+m[14])/w};}
/** First actual terrain/water intersection inside the world and camera far plane.
 * No mesh raycast, visibility mutation, or assumed y=0 ocean plane is involved. */
export function cameraSurfaceRay(camera:CameraProjection,ndcX:number,ndcY:number,worldSize:number,surfaceAt:(x:number,z:number)=>number):SurfacePoint|null{
 const m=camera.matrixWorld.elements,origin={x:m[12],y:m[13],z:m[14]},clip=transform(camera.projectionMatrixInverse.elements,ndcX,ndcY,1),far=transform(m,clip.x,clip.y,clip.z);
 const length=Math.hypot(far.x-origin.x,far.y-origin.y,far.z-origin.z);if(!Number.isFinite(length)||length<=0)return null;
 const direction={x:(far.x-origin.x)/length,y:(far.y-origin.y)/length,z:(far.z-origin.z)/length};let enter=0,exit=length;
 for(const key of['x','z'] as const){const d=direction[key],p=origin[key],half=worldSize/2;if(Math.abs(d)<1e-10){if(Math.abs(p)>half)return null;continue;}const a=(-half-p)/d,b=(half-p)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}
 if(exit<enter)return null;
 const at=(t:number)=>({x:origin.x+direction.x*t,y:origin.y+direction.y*t,z:origin.z+direction.z*t});
 const gap=(t:number)=>{const p=at(t);return p.y-surfaceAt(p.x,p.z);};
 let before=enter,previous=gap(enter);if(!Number.isFinite(previous))return null;if(previous<=0){const p=at(enter);return{...p,y:surfaceAt(p.x,p.z)};}
 const steps=Math.min(MINIMAP_RULES.maximumRaySteps,Math.max(1,Math.ceil((exit-enter)/MINIMAP_RULES.rayStepMeters)));
 for(let i=1;i<=steps;i++){const t=enter+(exit-enter)*i/steps,current=gap(t);if(!Number.isFinite(current))return null;
  if(current<=0){let lo=before,hi=t;for(let k=0;k<MINIMAP_RULES.rayBisections;k++){const mid=(lo+hi)*.5;if(gap(mid)>0)lo=mid;else hi=mid;}const p=at((lo+hi)*.5);return{...p,y:surfaceAt(p.x,p.z)};}
  before=t;
 }
 return null;
}
export function cameraSurfaceFootprint(camera:CameraProjection,worldSize:number,surfaceAt:(x:number,z:number)=>number){
 let queries=0,truncated=false;const sample=(x:number,z:number)=>{if(queries>=MINIMAP_RULES.maximumFootprintQueries){truncated=true;return NaN;}queries++;return surfaceAt(x,z);};
 const rays=new Map<string,SurfacePoint|null>(),horizons=new Map<number,{y:number;point:SurfacePoint}>(),points:SurfacePoint[]=[];
 const cast=(x:number,y:number)=>{const key=`${x}:${y}`;if(rays.has(key))return rays.get(key)!;const point=cameraSurfaceRay(camera,x,y,worldSize,sample);rays.set(key,point);return point;};
 for(const [x,y]of[[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1]]){
  let hit=cast(x,y);
  // Sky corners share one horizon per screen column. Reusing the bottom ray
  // and the horizon avoids repeatedly marching the same empty sky to far clip.
  if(!hit&&y>-1&&!truncated){const known=horizons.get(x);
   if(known&&y>=known.y)hit=known.point;
   else{const bottom=cast(x,-1);if(bottom){let lo=-1,hi=y;hit=bottom;
    for(let b=0;b<MINIMAP_RULES.horizonBisections&&!truncated;b++){const mid=(lo+hi)*.5,next=cast(x,mid);if(next){lo=mid;hit=next;}else hi=mid;}
    horizons.set(x,{y:lo,point:hit});
   }}
  }
  if(hit&&!points.some(p=>Math.hypot(p.x-hit!.x,p.z-hit!.z)<.1))points.push(hit);
 }
 return{points,queries,truncated};
}
