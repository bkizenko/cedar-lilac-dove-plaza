/** Browser entry for the whole-map render harness (bundled by map.mjs with esbuild; REAL three.js, SwiftShader headless).
 * Builds the real Game world and the real WorldView, so every pixel is game output: terrain, water, vegetation, fields, sky, light, post. */
import * as THREE from 'three';
import {Game} from '@/game/sim';
import {WorldView} from '@/scene/world';
import {wearTrail} from '@/game/trails';
import {traceStep,tickRouteWear,setRoutesEnabled} from '@/game/routeWear';
import {findPath} from '@/game/navigation';
import {galleryScene,galleryPose} from '@/scene/mapGallery';
import {enableIrrigation,digDitch,ditchesOf} from '@/game/irrigation';
type Spec={gallery?:string;seed:number;version?:number;preset?:string;size?:number;time?:number;weather?:string;width:number;height:number;look?:[number,number];yaw:number;pitch:number;dist:number;style?:string;quality?:'low'|'med'|'high';settle?:number;
 prep?:{age?:number;buildings?:{type:string;x:number;z:number}[];irrigation?:{ditchFields:number[];waterMode?:boolean};fieldBlock?:{w:number;d:number;cols:number;rows:number;stages:string[];kind?:string;minGrade?:number}[];farms?:{x:number;z:number;rel?:boolean;kind?:'grain'|'pulses'|'tubers';stage?:'bare'|'sprout'|'young'|'mature'|'ripe'|'stubble';w?:number;d?:number}[];trails?:{from:[number,number];to:[number,number];wear?:number}[]};
 probe?:[number,number][];
 routes?:{from:[number,number];to:[number,number];trips:number;team?:number;jitter?:number}[];routesFresh?:boolean;routesIdle?:number;routesLegacy?:boolean;stations?:{x:number;z:number;stage:0|1|2|3;form?:string;team?:number;hp?:number}[];
 fov?:number;drawDistance?:'low'|'medium'|'high'|'ultra';measure?:boolean;lookY?:number;mapStyle?:string;treeSet?:string;passes?:number;keep?:number[];bloom?:number;hour?:number;season?:'spring'|'summer'|'autumn'|'winter'};
const w=window as unknown as {renderMap:(s:Spec)=>Promise<unknown>;__game?:Game;__view?:WorldView};
{const g=HTMLCanvasElement.prototype.getContext as (this:HTMLCanvasElement,k:string,o?:object)=>unknown;
 (HTMLCanvasElement.prototype as unknown as {getContext:unknown}).getContext=function(this:HTMLCanvasElement,k:string,o?:object){return g.call(this,k,k.startsWith('webgl')?{...(o||{}),preserveDrawingBuffer:true}:o);};}

/** Real journeys for the route renders: A* over the real walk grid (terrain cost), people never step in exactly the same place. */
function walkRoute(game:Game,a:[number,number],b:[number,number],trips:number,team:number,jitter:number){
 const size=game.world.size,N=520,cell=size/N,idx=(x:number,z:number)=>Math.max(0,Math.min(N-1,Math.floor((z+size/2)/cell)))*N+Math.max(0,Math.min(N-1,Math.floor((x+size/2)/cell)));
 const grid=(game as unknown as {walk:Uint8Array}).walk;
 const snap=(p:[number,number])=>{const c=idx(p[0],p[1]);if(grid[c])return c;let best=-1,bd=1e9;for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++){const x=(c%N)+dx,z=Math.floor(c/N)+dz;if(x<0||z<0||x>=N||z>=N)continue;const n=z*N+x;if(grid[n]&&dx*dx+dz*dz<bd){bd=dx*dx+dz*dz;best=n;}}return best;};
 const sa=snap(a),sb=snap(b);const path=sa>=0&&sb>=0?findPath(grid,N,sa,sb,96000):null;if(!path){console.warn('no route',a,b,sa,sb);return;}
 const pts=[{x:a[0],z:a[1]},...path.map(n=>({x:-size/2+((n%N)+.5)*cell,z:-size/2+(Math.floor(n/N)+.5)*cell})),{x:b[0],z:b[1]}];
 for(let k=0;k<trips;k++){
  const fwd=k%2===0,line=fwd?pts:pts.slice().reverse(),end=line[line.length-1],u={id:9000+k,team,hp:10,order:'gather',x:line[0].x,z:line[0].z} as never as {id:number;team:number;hp:number;order:string;x:number;z:number};
  const off=(i:number,m:number)=>Math.sin(i*.21+k*2.3+m)*jitter*.7+Math.sin(i*.07+k*5.1)*jitter*.5;
  let acc=0,i=0;
  for(let q=1;q<line.length;q++){const p0=line[q-1],p1=line[q],d=Math.hypot(p1.x-p0.x,p1.z-p0.z),n=Math.max(1,Math.ceil(d/1.8)),nx=-(p1.z-p0.z)/(d||1),nz=(p1.x-p0.x)/(d||1);
   for(let j=1;j<=n;j++){const f=j/n,o=off(++i,0),x=p0.x+(p1.x-p0.x)*f+nx*o,z=p0.z+(p1.z-p0.z)*f+nz*o;game.state.time+=.4;traceStep(game,u as never,x,z,end.x,end.z);u.x=x;u.z=z;acc+=1;}}
  game.state.time+=2;
 }
}
let cache:{key:string;game:Game;view:WorldView}|null=null;
w.renderMap=async(S:Spec)=>{
 (globalThis as {__PAINTER_DEBUG?:string}).__PAINTER_DEBUG=(S as {debug?:string}).debug;
 const key=`${S.seed}/${S.version??''}/${S.preset??''}/${S.size??''}/${S.style??''}/${S.quality??''}/${S.mapStyle??''}/${S.treeSet??''}/${JSON.stringify(S.prep??null)}`;
 let canvas=document.getElementById('c') as HTMLCanvasElement|null;
 if(!canvas){canvas=document.createElement('canvas');canvas.id='c';document.body.appendChild(canvas);}
 canvas.style.cssText=`width:${S.width}px;height:${S.height}px;display:block`;canvas.width=S.width;canvas.height=S.height;
 const t0=performance.now();
 if(!cache||cache.key!==key){
  try{if(S.mapStyle)localStorage.setItem('hearthwild:map-style',S.mapStyle);else localStorage.removeItem('hearthwild:map-style');}catch{/* ok */}
  try{if(S.treeSet)localStorage.setItem('hearthwild:tree-set',S.treeSet);else localStorage.removeItem('hearthwild:tree-set');}catch{/* ok */}
  const game=new Game();game.testMode=true;game.revealMap=true;
  game.reset(S.seed,S.version,{...(S.preset?{preset:S.preset as never}:{}),...(S.size?{size:S.size as never}:{})});game.enterIsland();game.state.paused=true;
  const view=new WorldView(canvas);
  if(S.quality)view.applyQuality(S.quality);
  if(S.prep){
   const t=game.tribe(0);Object.assign(t,{food:900,wood:300,stone:100,seeds:400,cultivated:['grain','pulses','tubers']});game.vision.fill(2);
   for(const pb of S.prep.buildings??[]){
    const before=game.state.buildings.length;
    const ok=game.placeBuilding(pb.type as never,pb.x,pb.z);
    const b=game.state.buildings.slice(before)[0] as unknown as {build:number;hp:number;plannedCost?:unknown}|undefined;
    if(!ok||!b){console.warn('building placement failed',pb.type,pb.x,pb.z,game.state.banner);continue;}
    b.build=1;delete b.plannedCost;
   }
   // fieldBlock: find the nearest site where a cols x rows block of edge-to-edge plots is all placeable, then lay them down (edge-to-edge, as the snapped drag does).
   for(const blk of S.prep.fieldBlock??[]){
    const c0b=game.campOf(0);let found:{x:number;z:number}|null=null,bestD=1e9;
    for(let r=16;r<=200&&!found;r+=4)for(let a=0;a<48;a++){const ang=a/48*Math.PI*2,ox=c0b.x+Math.cos(ang)*r,oz=c0b.z+Math.sin(ang)*r;let ok=true;
     for(let j=0;j<blk.rows&&ok;j++)for(let i=0;i<blk.cols&&ok;i++){const x=ox+i*blk.w,z=oz+j*blk.d;if(game.placementIssue('farm',x,z,0,{w:blk.w,d:blk.d}))ok=false;}
     if(ok){const grade=Math.abs(game.height(ox+blk.w*blk.cols,oz)-game.height(ox,oz))/(blk.w*blk.cols);if(grade>=(blk.minGrade??0)){const d=r;if(d<bestD){bestD=d;found={x:ox,z:oz};}}}}
    if(!found){console.warn('no field block site');continue;}
    (w as unknown as {__blk?:[number,number]}).__blk=[found.x+blk.w*blk.cols/2,found.z+blk.d*blk.rows/2];
    let k=0;for(let j=0;j<blk.rows;j++)for(let i=0;i<blk.cols;i++,k++)(S.prep.farms??=[]).push({x:found.x+i*blk.w,z:found.z+j*blk.d,w:blk.w,d:blk.d,kind:blk.kind as never,stage:(blk.stages[k%blk.stages.length]) as never});
   }
   for(const f of S.prep.farms??[]){
    const before=game.state.buildings.length;
    const cc=game.campOf(0),fx=f.rel?cc.x+f.x:f.x,fz=f.rel?cc.z+f.z:f.z;
    const ok=game.placeBuilding('farm',fx,fz,0,f.w&&f.d?{w:f.w,d:f.d}:undefined);
    const b=game.state.buildings.slice(before).find(q=>q.type==='farm')??game.state.buildings.filter(q=>q.type==='farm').at(-1);
    if(!ok||!b){console.warn('farm placement failed',fx,fz,game.state.banner);continue;}
    const st=f.stage??'mature',bb=b as unknown as {build:number;hp:number;plannedCost?:unknown;crop?:Record<string,unknown>;cropType?:string;w:number;d:number;fallowYear?:number};
    bb.build=1;delete bb.plannedCost;if(f.w)bb.w=f.w;if(f.d)bb.d=f.d;bb.cropType=f.kind??'grain';
    const stages:Record<string,[number,number,boolean,number]>={fallow:[0,0,false,1],bare:[0,0,false,1],sprout2:[.6,.1,false,1],growing:[1,.8,false,1],sprout:[.12,0,false,1],young:[.45,.2,false,1],mature:[1,.7,false,1],ripe:[1,1,true,1],stubble:[1,1,true,0]};
    const [planted,tended,ripened,remaining]=stages[st];bb.crop={kind:f.kind??'grain',planted,tended,ripened,remaining};if(st==='fallow')bb.fallowYear=Math.floor((S.time??0)/1800);
   }
   if(S.prep.irrigation){enableIrrigation(game);const fs=game.state.buildings.filter(q=>q.type==='farm');
    for(const i of S.prep.irrigation.ditchFields){const f=fs[i];if(!f)continue;const r=digDitch(game,0,f.id);if(!r.ok)console.warn('ditch refused',r.reason);else r.ditch.done=r.ditch.length;}
    console.warn('ditches',JSON.stringify(ditchesOf(game).map(d=>[d.lift,Math.round(d.length)])));}
   for(const tr of S.prep.trails??[]){const [ax,az]=tr.from,[bx,bz]=tr.to,len=Math.hypot(bx-ax,bz-az),n=Math.ceil(len/1.5);
    for(let rep=0;rep<Math.ceil((tr.wear??.7)*2.7);rep++)for(let i=0;i<=n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n;wearTrail(game,x,z,(bx-ax)/len*1.5,(bz-az)/len*1.5);}}
  }
  if(S.prep?.age!==undefined)(game.tribe(0) as unknown as {age:number}).age=S.prep.age; // village age -> era -> boundary kind (bank, wattle, hedge, drystone)
  view.rebuild(game);view.setFieldWaterMode(!!S.prep?.irrigation?.waterMode);
  cache={key,game,view};w.__game=game;w.__view=view;
 }
 const {game,view}=cache;
 if(S.routes||S.routesFresh||S.stations||S.routesLegacy!==undefined){
  const gs=game.state as unknown as Record<string,unknown>;
  if(S.routesFresh){delete gs.routeWear;delete gs.waystations;}
  setRoutesEnabled(game,!S.routesLegacy);
  for(const r of S.routes??[])walkRoute(game,r.from,r.to,r.trips,r.team??0,r.jitter??1.1);
  if(S.routesIdle)for(let t=0;t<S.routesIdle;t+=3){game.state.time+=3;tickRouteWear(game,3);}
  if(S.stations){const ws=(gs.waystations??={version:1,enabled:true,nextId:1,stations:[],sustain:{},clock:{plan:0,work:0,use:0}}) as {stations:unknown[];nextId:number};ws.stations=S.stations.map((st,i)=>({id:i+1,team:st.team??0,corridor:0,x:st.x,z:st.z,stage:st.stage,form:st.form??'timber',hp:st.hp??1,built:0,store:{food:8,wood:4},water:true,visits:12,nights:3,sheltered:0,income:0,raided:0,lastRaidAt:-1e9}));ws.nextId=S.stations.length+1;}
  (globalThis as {__LEGACY_TRAILS?:boolean}).__LEGACY_TRAILS=!!S.routesLegacy;
  view.routeFieldNow();
 }
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
 if(S.gallery){const sc=galleryScene(S.gallery);if(sc){const gc=game.campOf(0),p=galleryPose({size:game.world.size,height:(x,z)=>game.height(x,z),waterAt:(x,z)=>game.waterAt(x,z),camp:{x:gc.x,z:gc.z}},sc);
  if(sc.farm&&!(game.state.buildings as {type:string}[]).some(b=>b.type==='farm')){const t=game.tribe(0);Object.assign(t,{food:900,wood:300,stone:100,seeds:40,cultivated:['grain','pulses','tubers']});game.vision.fill(2);
   const n=game.state.buildings.length;if(game.placeBuilding('farm',p.x,p.z)){const b=game.state.buildings[n] as unknown as {build:number;plannedCost?:unknown;cropType?:string;crop?:unknown};b.build=1;delete b.plannedCost;b.cropType='grain';b.crop={kind:'grain',planted:.45,tended:.2,ripened:false,remaining:1};view.rebuild(game);}}
  S.look=[p.x,p.z];S.lookY=p.lookY-game.height(p.x,p.z);}}
 const blk=(w as unknown as {__blk?:[number,number]}).__blk,lx=S.look?S.look[0]:blk?blk[0]:c0.x,lz=S.look?S.look[1]:blk?blk[1]:c0.z;
(view as unknown as {cameraGround:unknown}).cameraGround=null;
 view.look.set(lx,game.height(lx,lz)+(S.lookY??.55),lz);view.yaw=S.yaw;view.pitch=S.pitch;view.dist=S.dist;
 for(let i=0;i<(S.settle??3);i++){view.updateCamera(0);view.sync(game,.5);}
 // The harness has no camera-vs-terrain collision (it must be deterministic): lift the pitch until the eye clears the ground, like the in-game orbit camera does.
 for(let k=0;k<30;k++){view.updateCamera(0);const cp=view.camera.position;if(cp.y>game.height(cp.x,cp.z)+4||view.pitch>=1.3)break;view.pitch+=.05;}
 view.updateCamera(0);
 if(S.drawDistance)view.setDrawDistance(S.drawDistance);
 view.sync(game,5);view.sync(game,5);
 // filler chunks are generated under a per-frame time budget in play; here let them all finish so the picture is the settled one
 for(let k=0;k<600;k++){const bs=(view as unknown as {biomeScene?:{lastFiller:{deferred:number}|null}}).biomeScene;if(!bs?.lastFiller||bs.lastFiller.deferred===0)break;view.sync(game,5);}
 if((S as {hide?:string[]}).hide)view.scene.traverse(o=>{if((S as {hide?:string[]}).hide!.some(h=>(h[0]==='='?o.name===h.slice(1):o.name.includes(h))))o.visible=false;});
 if(S.bloom!==undefined&&view.bloom)view.bloom.strength=S.bloom;
 if(S.passes!==undefined&&view.composer)view.composer.passes=view.composer.passes.slice(0,S.passes);
 if(S.keep&&view.composer)view.composer.passes=view.composer.passes.filter((_,i)=>S.keep!.includes(i));
 view.render();
 const info=view.renderer.info;
 const extra=S.measure?measure(view,game,S):undefined;
 const near=(a:{x:number;z:number}[])=>a.map(n=>({x:Math.round(n.x),z:Math.round(n.z),d:Math.hypot(n.x-c0.x,n.z-c0.z)})).sort((p,q)=>p.d-q.d).slice(0,3).map(n=>[n.x,n.z]);
 const probes=(S.probe??[]).map(([px,pz])=>{const geo=(view as unknown as {terrain:{geometry:{attributes:Record<string,{count:number;getX:(i:number)=>number;getY:(i:number)=>number;getZ:(i:number)=>number;array:Float32Array}>}}}).terrain.geometry,pos=geo.attributes.position;let best=0,bd=1e9;for(let i=0;i<pos.count;i++){const d=Math.hypot(pos.getX(i)-px,pos.getZ(i)-pz);if(d<bd){bd=d;best=i;}}
  const c=geo.attributes.color.array,r=geo.attributes.surfaceRock?.array,sd=geo.attributes.surfaceSand?.array;return {at:[px,pz],h:+pos.getY(best).toFixed(2),color:[c[best*3],c[best*3+1],c[best*3+2]].map(v=>+v.toFixed(3)),rock:r?+r[best].toFixed(2):null,sand:sd?+sd[best].toFixed(2):null};});
 return {probes,nodes:{stone:near(game.state.stones),copper:near(game.state.copper),iron:near(game.state.iron)},build:Math.round(t1-t0),frame:Math.round(performance.now()-t1),calls:info.render.calls,tris:info.render.triangles,camp:[Math.round(c0.x),Math.round(c0.z)],size:game.world.size,waterY:game.world.waterY,
  dd:S.drawDistance,extra,camps:game.world.camps.map(c=>[Math.round(c.x),Math.round(c.z),c.team]),features:(game.world.features||[]).map((f:any)=>[f.kind,Math.round(f.x),Math.round(f.z)]).slice(0,40)};
};
/** Per-band cost for the distance-quality report: triangles by object class from the scene graph (what was submitted this frame), renderer counters, JS heap, and the median of 3 renders in ms (SwiftShader: relative only). */
function measure(view:WorldView,game:Game,S:Spec){
 const groups:Record<string,{objects:number;instances:number;tris:number}>={};
 const add=(k:string,n:number,i:number,t:number)=>{const g=groups[k]??(groups[k]={objects:0,instances:0,tris:0});g.objects+=n;g.instances+=i;g.tris+=t;};
 view.scene.traverse(o=>{const m=o as unknown as {isMesh?:boolean;isInstancedMesh?:boolean;visible:boolean;count?:number;geometry?:{index?:{count:number}|null;attributes:{position?:{count:number}}}};
  if(!m.isMesh&&!m.isInstancedMesh)return;let v:THREE.Object3D|null=o;while(v){if(!v.visible)return;v=v.parent;}
  const g=m.geometry;if(!g)return;const per=((g.index?g.index.count:g.attributes.position?.count)||0)/3,n=m.isInstancedMesh?(m.count??0):1;if(n<=0)return;
  const name=o.name||'';const k=name==='terrain'?'terrain':name.startsWith('filler-horizon')?'filler horizon crowns':name.startsWith('filler-far')?'filler far crowns+trunks':/^resource-(far|.*-t[01]|stumps|contact)/.test(name)||name.startsWith('resource-')?(name.startsWith('resource-far')?'sim far crowns+trunks':'sim trees near/mid'):name.startsWith('people')?'people':name.startsWith('nonblocking')?'ground dressing':/water|river|sea/.test(name)?'water':'buildings, props, other';
  add(k,1,n,per*n);});
 const times:number[]=[];const gl=view.renderer.getContext();for(let i=0;i<3;i++){const t=performance.now();view.render();gl.finish();times.push(performance.now()-t);}times.sort((a,b)=>a-b);
 // CPU cost of the scene sync (tree refresh included) as the camera pans, ms per sync: the real, device-independent half of the frame cost
 const syncMs:number[]=[];{const lx=view.look.x,lz=view.look.z;for(let k=0;k<7;k++){view.look.x=lx+k*7;view.look.z=lz-k*5;view.updateCamera(0);const t=performance.now();view.sync(game,.12);syncMs.push(performance.now()-t);}view.look.x=lx;view.look.z=lz;view.updateCamera(0);view.sync(game,.12);}syncMs.sort((a,b)=>a-b);
 const mem=(performance as unknown as {memory?:{usedJSHeapSize:number}}).memory,i=view.renderer.info;
 const bs=(view as unknown as {biomeScene?:{lastFiller:unknown}}).biomeScene;
 return {groups,ms:Math.round(times[1]),syncMs:+syncMs[3].toFixed(2),msAll:times.map(Math.round),heapMB:mem?Math.round(mem.usedJSHeapSize/1048576):null,geometries:i.memory.geometries,textures:i.memory.textures,programs:i.programs?.length,filler:bs?.lastFiller,far:view.camera.far,fog:(view.scene.fog as THREE.FogExp2).density,bands:view.getDrawBands()};
}
