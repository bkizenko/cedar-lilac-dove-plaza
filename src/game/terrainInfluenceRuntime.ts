import type {Game} from './sim';
import type {Building} from './types';
import {influenceRadius} from './territory';
import {frontierStatus} from './frontiers';
import {FORTIFICATIONS} from './fortifications';
import {trailCell} from './trails';
import {isDependent} from './settlement';
import {PROVINCE_KINDS} from './ecologicalProvinces';
import {computeTerrainInfluence,detectPasses,sampleStrength,TERRAIN_INFLUENCE_RULES,emptyLayers,type InfluenceSource,type TerrainInfluenceField,type TerrainLayers} from './terrainInfluence';
import {influenceGradientModel,type InfluenceGradientModel} from './terrainInfluenceView';
import {portInfluenceReachMeters} from './navalPorts';

/**
 * Adapter between the live Game and the pure terrain-influence function.
 *
 * Switch: `state.terrainInfluence={version:1}`. Absent means the legacy field in influenceField.ts, so old saves are
 * untouched. New games turn it on through `enableTerrainInfluence`. Read-only consumers (landValue, dominated
 * territory, prestige/territory readers, antagonism) keep calling `geographicInfluenceAt`; that function now
 * delegates here when the switch is on, so none of them changed.
 */
export type TerrainInfluenceState={version:1};
type Switched={terrainInfluence?:TerrainInfluenceState};
export const TERRAIN_INFLUENCE_RUNTIME=Object.freeze({version:1,refreshSeconds:2,treeRefreshSeconds:8,treesForDense:6,radiusScale:1.45,matureBuildings:40,roadWearForFullRoad:.8,roadWearFloor:.25,fordRadiusMeters:8});
const RT=TERRAIN_INFLUENCE_RUNTIME;
export const terrainInfluenceActive=(g:Game)=>(g.state as Switched).terrainInfluence?.version===1;
export function enableTerrainInfluence(g:Game){(g.state as Switched).terrainInfluence={version:1};}
export function validTerrainInfluence(s:any){const v=s.terrainInfluence;return v===undefined||!!v&&typeof v==='object'&&v.version===1&&Object.keys(v).length===1;}

type StaticLayers={world:Game['world'];heightFunction:Game['height'];waterLevel:number;terrainRevision:number;width:number;height:Float32Array;water:Uint8Array;riverWidth:Float32Array;ford:Uint8Array;wetland:Float32Array;pass:Uint8Array};
type Cache={buildingsRef:Game['state']['buildings'];buildingCount:number;navRevision:number;statics:StaticLayers;fields:Map<number,TerrainInfluenceField>;signature:string;checkedAt:number;treeCheckedAt:number;treeBucket:number;forest:Float32Array;builds:number;layers:TerrainLayers;sources:Map<number,InfluenceSource[]>;paintedTerritory?:Uint8Array;paintedStrength?:Float32Array;visited:number};
const caches=new WeakMap<Game,Cache>();
const gridWidth=(g:Game)=>Math.round(Math.sqrt(g.territory.length));
const cellPoint=(size:number,W:number,i:number)=>({x:-size/2+(i%W+.5)*(size/W),z:-size/2+(Math.floor(i/W)+.5)*(size/W)});

function buildStatics(g:Game):StaticLayers{
 const W=gridWidth(g),size=g.world.size,cell=size/W,n=W*W,height=new Float32Array(n),water=new Uint8Array(n),riverWidth=new Float32Array(n),ford=new Uint8Array(n),wetland=new Float32Array(n);
 const wetK=PROVINCE_KINDS.indexOf('wetland');
 for(let i=0;i<n;i++){
  const p=cellPoint(size,W,i);height[i]=g.travelHeight(p.x,p.z);water[i]=g.height(p.x,p.z)<g.waterAt(p.x,p.z)+.12?1:0;
  const eco=g.world.ecology;if(eco&&water[i]===0){const gx=Math.max(0,Math.min(eco.width-1,Math.floor((p.x/eco.size+.5)*eco.width))),gz=Math.max(0,Math.min(eco.width-1,Math.floor((p.z/eco.size+.5)*eco.width)));if(eco.kinds[gz*eco.width+gx]===wetK)wetland[i]=1;}
 }
 const index=(x:number,z:number)=>{const ix=Math.floor((x+size/2)/cell),iz=Math.floor((z+size/2)/cell);return ix<0||iz<0||ix>=W||iz>=W?-1:iz*W+ix;};
 const stamp=(x:number,z:number,radius:number,fn:(i:number)=>void)=>{for(let dz=-radius;dz<=radius;dz+=cell/2)for(let dx=-radius;dx<=radius;dx+=cell/2){if(Math.hypot(dx,dz)>radius)continue;const i=index(x+dx,z+dz);if(i>=0)fn(i);}};
 for(const river of g.world.rivers||[])for(let k=1;k<river.pts.length;k++){
  const a=river.pts[k-1],b=river.pts[k],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/(cell/2)));
  for(let s=0;s<=steps;s++){const t=s/steps;stamp(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,Math.max(cell*.5,river.w/2),i=>{riverWidth[i]=Math.max(riverWidth[i],river.w);});}
 }
 for(const f of g.world.mapgen?.fords||[])stamp(f.x,f.z,RT.fordRadiusMeters,i=>{if(riverWidth[i]>0)ford[i]=1;});
 const waterLevel=g.world.waterY,pass=detectPasses({size,width:W,height,water},{waterLevel});
 return {world:g.world,heightFunction:g.height,waterLevel,terrainRevision:g.terrainRevision(),width:W,height,water,riverWidth,ford,wetland,pass};
}
function forestDensity(g:Game,W:number,out:Float32Array){
 out.fill(0);const size=g.world.size,cell=size/W,counts=new Uint16Array(W*W);
 for(const t of g.state.trees){if(!(t.amount>0))continue;const ix=Math.floor((t.x+size/2)/cell),iz=Math.floor((t.z+size/2)/cell);if(ix>=0&&iz>=0&&ix<W&&iz<W)counts[iz*W+ix]++;}
 for(let z=0;z<W;z++)for(let x=0;x<W;x++){let c=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<W&&nz<W)c+=counts[nz*W+nx];}out[z*W+x]=Math.min(1,c/RT.treesForDense);}
}
const finishedSources=(g:Game,team:number)=>g.state.buildings.filter(b=>b.team===team&&team!==3&&g.finished(b)&&!FORTIFICATIONS.includes(b.type));
function activeTeams(g:Game){return [...new Set(g.state.buildings.filter(b=>b.team!==3&&g.finished(b)&&!FORTIFICATIONS.includes(b.type)).map(b=>b.team))].sort((a,b)=>a-b);}

/** Ships that can really sail from this dock: hulls moored within port reach with a healthy adult captain aboard, plus canoes whose owner stands at it. */
function shipsAtDock(g:Game,d:Building){
 const reach=24;let n=0;
 for(const b of g.state.boats??[])if(b.team===d.team&&b.hp>0&&Math.hypot(b.x-d.x,b.z-d.z)<=reach&&g.state.units.some(u=>u.id===b.captain&&u.team===d.team&&u.hp>0&&!isDependent(g,u)&&!u.prisoner&&!u.emergency&&u.boat?.id===b.id&&u.boat.phase==='aboard'))n++;
 for(const u of g.state.units)if(u.team===d.team&&u.hp>0&&!isDependent(g,u)&&!u.prisoner&&!u.emergency&&u.haulage==='canoe'&&!u.boat&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.haulageWork&&Math.hypot(u.x-d.x,u.z-d.z)<=reach)n++;
 return n;
}
function sourcesFor(g:Game,team:number):InfluenceSource[]{
 const own=finishedSources(g,team),growth=Math.min(1,own.length/RT.matureBuildings);
 return own.map(b=>{
  const f=b.type==='cornerstone'?frontierStatus(g,b):null,ships=b.type==='dock'?shipsAtDock(g,b):0;
  return {id:b.id,team,x:b.x,z:b.z,radius:(f?.radius??influenceRadius(b.type))*RT.radiusScale,strength:f?.strength??1,growth,ships,...(ships?{shipReachMeters:portInfluenceReachMeters(g,b,ships)}:{})};
 });
}
function dynamicLayers(g:Game,c:Cache,statics:StaticLayers):TerrainLayers{
 const W=statics.width,size=g.world.size,n=W*W,layers=emptyLayers(size,W);
 layers.height=statics.height;layers.water=statics.water;layers.riverWidth=statics.riverWidth;layers.ford=statics.ford;layers.pass=statics.pass;
 layers.wetland=statics.wetland;layers.forest=c.forest;
 const rough=new Uint8Array(n);
 for(let i=0;i<n;i++)if(!statics.water[i]){const p=cellPoint(size,W,i);if(!g.walkable(p.x,p.z))rough[i]=1;}
 layers.rough=rough;
 if(g.state.trails?.length){
  const wear=new Map<number,number>(g.state.trails.map(t=>[t.cell,t.wear])),road=new Float32Array(n);
  for(let i=0;i<n;i++){const p=cellPoint(size,W,i),w=wear.get(trailCell(p.x,p.z,size));if(w!==undefined&&w>RT.roadWearFloor)road[i]=Math.min(1,(w-RT.roadWearFloor)/(RT.roadWearForFullRoad-RT.roadWearFloor));}
  layers.road=road;
 }
 const bridge=new Uint8Array(n);let any=false;
 for(const b of g.state.buildings)if(b.type==='bridge'&&b.bridge&&b.hp>0&&g.finished(b)){
  any=true;const {ax,az,bx,bz}=b.bridge,length=Math.hypot(bx-ax,bz-az),cell=size/W,steps=Math.max(1,Math.ceil(length/(cell/2))),half=Math.max(cell*.75,(b.w||4)/2);
  for(let s=0;s<=steps;s++){const t=s/steps,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
   for(let dz=-half;dz<=half;dz+=cell/2)for(let dx=-half;dx<=half;dx+=cell/2){const ix=Math.floor((x+dx+size/2)/cell),iz=Math.floor((z+dz+size/2)/cell);if(ix>=0&&iz>=0&&ix<W&&iz<W)bridge[iz*W+ix]=1;}}
 }
 if(any)layers.bridge=bridge;
 return layers;
}
function signatureOf(g:Game){
 const b=g.state.buildings.filter(b=>g.finished(b)&&!FORTIFICATIONS.includes(b.type)&&b.team!==3).map(b=>`${b.id}:${b.team}:${b.x|0}:${b.z|0}:${b.type==='bridge'?1:0}:${b.type==='dock'?shipsAtDock(g,b):0}`).join('|');
 const trails=g.state.trails?.length?`${g.state.trails.length}:${Math.round(g.state.trails.reduce((s,t)=>s+t.wear,0)*2)}`:'0';
 return `${b}/${trails}/${g.navigationRevision()}/${Math.round(g.world.waterY*100)}/${g.terrainRevision()}`;
}
function cacheFor(g:Game):Cache{
 let c=caches.get(g);const rev=g.terrainRevision();
 const stale=!c||c.statics.world!==g.world||c.statics.heightFunction!==g.height||c.statics.waterLevel!==g.world.waterY||c.statics.terrainRevision!==rev||g.state.time<c.checkedAt;
 if(stale){
  const statics=buildStatics(g),forest=new Float32Array(statics.width*statics.width);forestDensity(g,statics.width,forest);
  c={buildingsRef:g.state.buildings,buildingCount:-1,navRevision:-1,statics,fields:new Map(),signature:'',checkedAt:-Infinity,treeCheckedAt:g.state.time,treeBucket:g.state.trees.length,forest,builds:(c?.builds??0)+1,layers:emptyLayers(g.world.size,statics.width),sources:new Map(),visited:0};caches.set(g,c);
 }
 const cache=c!;
 const structural=cache.buildingsRef!==g.state.buildings||cache.buildingCount!==g.state.buildings.length||cache.navRevision!==g.navigationRevision();
 if(!structural&&g.state.time-cache.checkedAt<RT.refreshSeconds&&cache.fields.size)return cache;
 cache.buildingsRef=g.state.buildings;cache.buildingCount=g.state.buildings.length;cache.navRevision=g.navigationRevision();
 let dirty=false;
 if(g.state.time-cache.treeCheckedAt>=RT.treeRefreshSeconds){
  cache.treeCheckedAt=g.state.time;const alive=g.state.trees.reduce((s,t)=>s+(t.amount>0?1:0),0);
  if(Math.abs(alive-cache.treeBucket)>Math.max(8,cache.treeBucket*.03)){cache.treeBucket=alive;forestDensity(g,cache.statics.width,cache.forest);dirty=true;}
 }
 const signature=signatureOf(g);cache.checkedAt=g.state.time;
 if(dirty||signature!==cache.signature||!cache.fields.size){
  cache.signature=signature;cache.layers=dynamicLayers(g,cache,cache.statics);cache.fields.clear();cache.sources.clear();cache.visited=0;cache.builds++;
  const seed=g.state.seed|0;
  for(const team of activeTeams(g)){const sources=sourcesFor(g,team),f=computeTerrainInfluence(cache.layers,sources,{seed});cache.sources.set(team,sources);cache.fields.set(team,f);cache.visited+=f.visited;}
  cache.paintedTerritory=undefined;cache.paintedStrength=undefined;
 }
 return cache;
}
export function terrainInfluenceAt(g:Game,x:number,z:number,team:number){
 if(!Number.isFinite(x)||!Number.isFinite(z)||team===3)return 0;
 const f=cacheFor(g).fields.get(team);return f?Math.max(0,Math.min(1,sampleStrength(f,x,z))):0;
}
/** Fields are computed synchronously, so a team with sources is ready as soon as it is asked about. */
export function terrainInfluenceReady(g:Game,team?:number){const c=cacheFor(g);return team===undefined||c.fields.has(team)||!finishedSources(g,team).length;}
export function paintTerrainInfluence(g:Game){
 const c=cacheFor(g);if(c.paintedTerritory===g.territory&&c.paintedStrength===g.territoryStrength)return;
 const n=g.territory.length,territory=new Uint8Array(n).fill(255),strength=new Float32Array(n),teams=[...c.fields.keys()].sort((a,b)=>a-b);
 for(const team of teams){const f=c.fields.get(team)!;if(f.strength.length!==n)continue;
  for(let i=0;i<n;i++){const v=f.strength[i];if(v<=.0001)continue;strength[i]=Math.max(strength[i],v);territory[i]=territory[i]===255?team:territory[i]===team?team:254;}}
 g.territory.set(territory);g.territoryStrength.set(strength);c.paintedTerritory=g.territory;c.paintedStrength=g.territoryStrength;
}
export function terrainInfluenceDiagnostics(g:Game,team=0){
 const c=cacheFor(g),f=c.fields.get(team);
 return {ready:true,pendingJobs:0,paintReady:c.paintedTerritory===g.territory&&c.paintedStrength===g.territoryStrength,terrainAware:true,units:'equivalent metres of level walking',cacheBuild:c.builds,gridCellMeters:g.world.size/c.statics.width,visitedCells:f?.visited??0,eligiblePorts:c.sources.get(team)?.filter(s=>(s.ships??0)>0).length??0,availableVessels:c.sources.get(team)?.reduce((s,x)=>s+(x.ships??0),0)??0,blocked:{...f?.blocked},rules:TERRAIN_INFLUENCE_RULES};
}
export function terrainInfluenceSample(g:Game,x:number,z:number,team=0){
 const c=cacheFor(g),f=c.fields.get(team);if(!f)return {strength:0,routeCostMeters:null,sampledAt:null,blockedReason:'no-established-source'};
 const W=c.statics.width,cell=g.world.size/W,ix=Math.floor((x+g.world.size/2)/cell),iz=Math.floor((z+g.world.size/2)/cell),i=iz*W+ix,inside=ix>=0&&iz>=0&&ix<W&&iz<W,strength=terrainInfluenceAt(g,x,z,team),cost=inside?f.cost[i]:Infinity;
 return {strength,routeCostMeters:Number.isFinite(cost)?cost:null,sampledAt:inside?cellPoint(g.world.size,W,i):null,blockedReason:strength>0?null:!c.sources.get(team)?.length?'no-established-source':!inside?'outside-world':'terrain-blocked-or-too-costly'};
}
/** Read model for the map: soft per-cell gradient over every society the viewer may see. Callers clip to explored ground. */
export function terrainInfluenceModel(g:Game,visibleTeams?:readonly number[]):InfluenceGradientModel{
 const c=cacheFor(g);
 return influenceGradientModel([...c.fields.entries()].filter(([team])=>!visibleTeams||visibleTeams.includes(team)).map(([team,field])=>({team,field})));
}
