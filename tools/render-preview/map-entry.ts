/** Browser entry for the whole-map render harness (bundled by map.mjs with esbuild; REAL three.js, SwiftShader headless).
 * Builds the real Game world and the real WorldView, so every pixel is game output: terrain, water, vegetation, fields, sky, light, post. */
import {Game} from '@/game/sim';
import {WorldView} from '@/scene/world';
type Spec={seed:number;version?:number;time?:number;weather?:string;width:number;height:number;look?:[number,number];yaw:number;pitch:number;dist:number;style?:string;quality?:'low'|'med'|'high';settle?:number;
 fov?:number;lookY?:number;mapStyle?:string;passes?:number;keep?:number[];bloom?:number;hour?:number;season?:'spring'|'summer'|'autumn'|'winter'};
const w=window as unknown as {renderMap:(s:Spec)=>Promise<unknown>;__game?:Game;__view?:WorldView};
{const g=HTMLCanvasElement.prototype.getContext as (this:HTMLCanvasElement,k:string,o?:object)=>unknown;
 (HTMLCanvasElement.prototype as unknown as {getContext:unknown}).getContext=function(this:HTMLCanvasElement,k:string,o?:object){return g.call(this,k,k.startsWith('webgl')?{...(o||{}),preserveDrawingBuffer:true}:o);};}
let cache:{key:string;game:Game;view:WorldView}|null=null;
w.renderMap=async(S:Spec)=>{
 (globalThis as {__PAINTER_DEBUG?:string}).__PAINTER_DEBUG=(S as {debug?:string}).debug;
 const key=`${S.seed}/${S.version??''}/${S.style??''}/${S.quality??''}/${S.mapStyle??''}`;
 let canvas=document.getElementById('c') as HTMLCanvasElement|null;
 if(!canvas){canvas=document.createElement('canvas');canvas.id='c';document.body.appendChild(canvas);}
 canvas.style.cssText=`width:${S.width}px;height:${S.height}px;display:block`;canvas.width=S.width;canvas.height=S.height;
 const t0=performance.now();
 if(!cache||cache.key!==key){
  try{if(S.mapStyle)localStorage.setItem('hearthwild:map-style',S.mapStyle);else localStorage.removeItem('hearthwild:map-style');}catch{/* ok */}
  const game=new Game();game.testMode=true;game.revealMap=true;
  game.reset(S.seed,S.version);game.enterIsland();game.state.paused=true;
  const view=new WorldView(canvas);
  if(S.quality)view.applyQuality(S.quality);
  view.rebuild(game);
  cache={key,game,view};w.__game=game;w.__view=view;
 }
 const {game,view}=cache;
 const t1=performance.now();
 if(S.time!==undefined)game.state.time=S.time;
 if(S.hour!==undefined||S.season){const g=game as unknown as Record<string,unknown>,hour=S.hour??15.5,season=S.season??'summer',winter=season==='winter';
  g.dayPhase=()=>hour/24;g.daylight=()=>winter?{sunrise:7.9,sunset:16.3,hours:8.4}:{sunrise:5.7,sunset:19.7,hours:14};g.isNight=()=>{const d=winter?[7.9,16.3]:[5.7,19.7];return hour<d[0]||hour>=d[1];};
  const mix={spring:{spring:1,summer:0,autumn:0,winter:0,snow:0},summer:{spring:0,summer:1,autumn:0,winter:0,snow:0},autumn:{spring:0,summer:0,autumn:1,winter:0,snow:0},winter:{spring:0,summer:0,autumn:0,winter:1,snow:.9}}[season];
  g.seasonMix=()=>({name:season,yearFrac:0,...mix});view.seasonDirty();}
 if(S.weather)game.state.weather=S.weather as never;
 if(view.fowMesh)view.fowMesh.visible=false;
 view.renderer.setSize(S.width,S.height,false);view.renderer.setPixelRatio(1);view.camera.aspect=S.width/S.height;if(S.fov)view.camera.fov=S.fov;view.camera.updateProjectionMatrix();
 view.composer?.setSize(S.width,S.height);
 const c0=game.world.camps.find(c=>c.team===0)||game.world.camps[0]||{x:0,z:0};
 const lx=S.look?S.look[0]:c0.x,lz=S.look?S.look[1]:c0.z;
(view as unknown as {cameraGround:unknown}).cameraGround=null;
 view.look.set(lx,game.height(lx,lz)+(S.lookY??.55),lz);view.yaw=S.yaw;view.pitch=S.pitch;view.dist=S.dist;
 for(let i=0;i<(S.settle??3);i++){view.updateCamera(0);view.sync(game,.5);}
 view.updateCamera(0);
 view.sync(game,5);view.sync(game,5);
 if(S.bloom!==undefined&&view.bloom)view.bloom.strength=S.bloom;
 if(S.passes!==undefined&&view.composer)view.composer.passes=view.composer.passes.slice(0,S.passes);
 if(S.keep&&view.composer)view.composer.passes=view.composer.passes.filter((_,i)=>S.keep!.includes(i));
 view.render();
 const info=view.renderer.info;
 return {build:Math.round(t1-t0),frame:Math.round(performance.now()-t1),calls:info.render.calls,tris:info.render.triangles,camp:[Math.round(c0.x),Math.round(c0.z)],size:game.world.size,waterY:game.world.waterY,
  camps:game.world.camps.map(c=>[Math.round(c.x),Math.round(c.z),c.team]),features:(game.world.features||[]).map((f:any)=>[f.kind,Math.round(f.x),Math.round(f.z)]).slice(0,40)};
};
