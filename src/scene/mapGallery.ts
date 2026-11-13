/** Map gallery (AUTOPILOT M5-04). Ten named review scenes for the painterly map: close / middle / wide same-landscape, overcast,
 * water, fall, cliff, dune, route and contour-farm. Pure data plus a deterministic terrain search, so the same scenes drive the in-game
 * "Map gallery" camera jumps (view only: never touches heights, collision, resources, saves or the sim) and the render harness
 * (`node tools/render-preview/map.mjs --gallery`, which expands these scenes into shots). Scenes that need a season or weather
 * (overcast, fall) carry it as harness environment; in the live game they only move the camera and say what to wait for. */
export type GalleryId='close'|'middle'|'wide'|'overcast'|'water'|'fall'|'cliff'|'dune'|'route'|'contour-farm';
export type GalleryKind='camp'|'shore'|'cliff'|'dune'|'route'|'slope';
export interface GalleryScene{id:GalleryId;label:string;kind:GalleryKind;dist:number;pitch:number;yaw:number;fov?:number;
 weather?:string;season?:'spring'|'summer'|'autumn'|'winter';hour?:number;farm?:boolean;check:string;}
export const MAP_GALLERY:readonly GalleryScene[]=[
 {id:'close',label:'Close',kind:'camp',dist:14,pitch:.42,yaw:1.12,hour:15.5,check:'Ground texture, grass tufts, roof and wall readable at village scale.'},
 {id:'middle',label:'Middle',kind:'camp',dist:38,pitch:.5,yaw:1.12,hour:15.5,check:'Same landscape as close: no palette jump, soft contact shadows, fields and trees layered.'},
 {id:'wide',label:'Wide',kind:'camp',dist:110,pitch:.62,yaw:1.12,hour:15.5,check:'Same landscape again: haze, strata and water read at distance, no tiling.'},
 {id:'overcast',label:'Overcast',kind:'camp',dist:38,pitch:.5,yaw:1.12,weather:'rain',hour:13,check:'Grey but not flat: saturation drops, shadows soften, water stays darker than land.'},
 {id:'water',label:'Water',kind:'shore',dist:22,pitch:.38,yaw:.4,hour:16.5,check:'Depth gradient, shore foam and bank blend with no hard seam.'},
 {id:'fall',label:'Fall',kind:'camp',dist:38,pitch:.5,yaw:1.12,season:'autumn',hour:16.5,check:'Warm canopy and meadow shift, not a flat orange wash.'},
 {id:'cliff',label:'Cliff',kind:'cliff',dist:30,pitch:.3,yaw:2.2,hour:15.5,check:'Strata and scree on the face, flush plinth, no plywood marbling on smooth domes.'},
 {id:'dune',label:'Dune',kind:'dune',dist:34,pitch:.36,yaw:.9,hour:17,check:'Soft wind-ripple crests and sand/soil transition.'},
 {id:'route',label:'Route',kind:'route',dist:26,pitch:.45,yaw:1.6,hour:15.5,check:'Worn route is a soft path, not a drawn line, and follows the ground.'},
 {id:'contour-farm',label:'Contour farm',kind:'slope',dist:24,pitch:.55,yaw:1.12,farm:true,hour:15.5,check:'Crop rows follow the contour on a slope, with stage colours and edge softening.'},
];
export interface GalleryTerrain{size:number;height:(x:number,z:number)=>number;waterAt:(x:number,z:number)=>number;camp:{x:number;z:number};}
export interface GalleryPose{id:GalleryId;x:number;z:number;lookY:number;yaw:number;pitch:number;dist:number;found:boolean;}
const WATER_NONE=-1e8;
const slope=(t:GalleryTerrain,x:number,z:number,e=1.5)=>Math.hypot((t.height(x+e,z)-t.height(x-e,z))/(2*e),(t.height(x,z+e)-t.height(x,z-e))/(2*e));
const wet=(t:GalleryTerrain,x:number,z:number)=>{const w=t.waterAt(x,z);return Number.isFinite(w)&&w>WATER_NONE&&w>t.height(x,z)+.05;};
/** Deterministic spiral search around the camp: best-scoring dry cell for the scene kind, within `reach` of the camp. */
export function findGalleryAnchor(t:GalleryTerrain,kind:GalleryKind,reach=Math.min(220,t.size*.4)):{x:number;z:number;found:boolean}{
 if(kind==='camp'||kind==='route')return {...t.camp,found:true};
 const lim=t.size/2-6;let best:{x:number;z:number;s:number}|null=null;
 const step=Math.max(4,reach/36);
 for(let dz=-reach;dz<=reach;dz+=step)for(let dx=-reach;dx<=reach;dx+=step){
  const x=t.camp.x+dx,z=t.camp.z+dz;if(Math.abs(x)>lim||Math.abs(z)>lim)continue;
  if(wet(t,x,z))continue;const h=t.height(x,z),sl=slope(t,x,z),d=Math.hypot(dx,dz);let s=-Infinity;
  if(kind==='shore'){const near=[[5,0],[-5,0],[0,5],[0,-5]].some(([a,b])=>wet(t,x+a,z+b));if(near)s=-d*.01+(sl<.25?1:0);}
  else if(kind==='cliff'){if(sl>.55)s=sl*10-d*.02;}
  else if(kind==='slope'){if(sl>.12&&sl<.3&&h>t.waterAt(x,z)+.8)s=3-Math.abs(sl-.2)*10-d*.02;}
  else if(kind==='dune'){const r=Math.abs(t.height(x+8,z)-2*h+t.height(x-8,z))+Math.abs(t.height(x,z+8)-2*h+t.height(x,z-8));if(sl<.35&&r>.5&&r<4)s=r-d*.02;}
  if(s>-Infinity&&(!best||s>best.s))best={x,z,s};
 }
 return best?{x:best.x,z:best.z,found:true}:{...t.camp,found:false};
}
export function galleryPose(t:GalleryTerrain,scene:GalleryScene):GalleryPose{
 const a=findGalleryAnchor(t,scene.kind);
 return {id:scene.id,x:a.x,z:a.z,lookY:t.height(a.x,a.z)+.9,yaw:scene.yaw,pitch:scene.pitch,dist:scene.dist,found:a.found};
}
export const galleryScene=(id:string):GalleryScene|undefined=>MAP_GALLERY.find(s=>s.id===id);
/** Next scene in review order (wraps). */
export const nextGalleryScene=(id:string|null|undefined,dir:1|-1=1):GalleryScene=>{const i=MAP_GALLERY.findIndex(s=>s.id===id);return MAP_GALLERY[(i<0?(dir>0?0:MAP_GALLERY.length-1):(i+dir+MAP_GALLERY.length)%MAP_GALLERY.length)];};
/** Render-harness shots (tools/render-preview/map.mjs spec shape) for one seed. Poses are resolved in the page, so shots carry `gallery`. */
export function galleryShots(seed=1,extra:Record<string,unknown>={}):Record<string,Record<string,unknown>>{
 const out:Record<string,Record<string,unknown>>={};
 for(const [i,s] of MAP_GALLERY.entries())out[`${String(i+1).padStart(2,'0')}-${s.id}`]={seed,gallery:s.id,yaw:s.yaw,pitch:s.pitch,dist:s.dist,hour:s.hour??15.5,season:s.season??'summer',...(s.weather?{weather:s.weather}:{}),...extra};
 return out;
}
