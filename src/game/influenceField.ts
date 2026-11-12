import type {Game} from './sim';
import type {Building} from './types';
import {influenceRadius,influenceStrength} from './territory';
import {frontierStatus} from './frontiers';
import {FORTIFICATIONS} from './fortifications';
import {cooperativeInfluenceWater} from './influenceWater';
import {trailCell} from './trails';
import {isDependent} from './settlement';
import {terrainInfluenceActive,terrainInfluenceAt,terrainInfluenceReady,paintTerrainInfluence,terrainInfluenceDiagnostics,terrainInfluenceSample} from './terrainInfluenceRuntime';

/** Costs are equivalent metres of ordinary level walking, rather than a
 * Euclidean claim painted through cliffs or across disconnected water. */
export const INFLUENCE_RULES=Object.freeze({radiusScale:1.45,fadeMeters:36,verticalCostMetersPerMeter:3,
 waterCostPerMeter:1.35,embarkCostMeters:8,landingCostMeters:8,portReachMeters:24,
 maximumStepHeightMeters:2.45,trailPaceBonus:.12,minimumTravelCostPerMeter:1/1.12,
 sourceBinMeters:32,cacheRefreshSeconds:2,trailRefreshSeconds:10,sliceMilliseconds:2,sliceIntervalMilliseconds:16,maximumVisitedPerSource:90000,maximumPointCorrections:4096});
type Source={building:Building;radius:number;strength:number};
type Blocks={water:number;cliff:number;obstacle:number;noOperatingPort:number;waterNavigation:number;budget:number};
type SourceMetric={id:number;radiusMeters:number;fadeMeters:number;strength:number;visitedCells:number;maximumCostMeters:number};
type Port={x:number;z:number;label:number};
type Field={sourceBins:Map<number,Source[]>;binWidth:number;strength:Float32Array;cost:Float32Array;reached:Uint8Array;sources:Source[];metrics:SourceMetric[];blocked:Blocks;ports:Port[];vessels:number;visited:number;builtAt:number;builds:number;pointCorrections:Map<string,number>};
type Cache={world:Game['world'];revision:number;width:number;cell:number;count:number;signature:string;checkedAt:number;
 terrainRevision:number;unitCount:number;boatCount:number;heightFunction:Game['height'];walkHash:number;heightSource:Float32Array;teamSignatures:Map<number,string>;waterSignature:string;navigationSignature:string;trailSignature:string;trailCheckedAt:number;water:number;fields:Map<number,Field>;
 paintedTerritory?:Uint8Array;paintedStrength?:Float32Array;edgeCosts:Map<number,number>;samples:Uint8Array;heights:Float32Array;levels:Float32Array;wear:Map<number,number>;waterNav:InfluenceWater|null;jobs:Map<number,Generator<void,Field>>;waterJob?:Generator<void,InfluenceWater>;paintJob?:Generator<void>;paintTeams?:number[];builds:number};
type InfluenceWater={revision:number;grid:Uint8Array;labels:Int32Array;width:number};
const caches=new WeakMap<Game,Cache>();
const slices=new WeakMap<Game,{last:number;maximumMilliseconds:number;lastMilliseconds:number;count:number}>();
const NEIGHBORS=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]] as const;
class Heap{
 a:{state:number;cost:number}[]=[];
 push(state:number,cost:number){const a=this.a;let i=a.length;a.push({state,cost});while(i){const p=(i-1)>>1;if(a[p].cost<=cost)break;a[i]=a[p];i=p;}a[i]={state,cost};}
 pop(){const a=this.a,first=a[0],last=a.pop()!;if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
function sourceList(g:Game,team:number):Source[]{return g.state.buildings.filter(b=>b.team===team&&team!==3&&g.finished(b)&&!FORTIFICATIONS.includes(b.type)).map(building=>{
 const f=building.type==='cornerstone'?frontierStatus(g,building):null;
 return{building,radius:(f?.radius??influenceRadius(building.type))*INFLUENCE_RULES.radiusScale,strength:f?.strength??1};
});}
function signature(g:Game,nav:InfluenceWater|null=null,team?:number){
 const basin=(x:number,z:number)=>{if(!nav)return 0;const ix=Math.floor((x/g.world.size+.5)*nav.width),iz=Math.floor((z/g.world.size+.5)*nav.width);return nav.labels[iz*nav.width+ix]??0;};
 const b=g.state.buildings.filter(b=>g.finished(b)&&!FORTIFICATIONS.includes(b.type)&&(team===undefined||b.team===team)).map(b=>`${b.id}:${b.team}:${g.finished(b)?1:0}:${b.gateOpen?1:0}:${b.x}:${b.z}`).join('|');
 const boats=(g.state.boats??[]).filter(b=>team===undefined||b.team===team).map(b=>`${b.id}:${b.team}:${b.hp>0?1:0}:${b.captain??0}:${basin(b.x,b.z)}:${g.state.buildings.filter(d=>d.team===b.team&&d.type==='dock'&&g.finished(d)&&Math.hypot(b.x-d.x,b.z-d.z)<=INFLUENCE_RULES.portReachMeters).map(d=>d.id).join(',')}`).join('|');
 const people=g.state.units.filter(u=>(team===undefined||u.team===team)&&u.hp>0&&(u.haulage==='canoe'||u.boat)).map(u=>`${u.id}:${u.team}:${u.haulage??''}:${u.boat?.id??0}:${u.boat?.phase??''}:${u.prisoner?1:0}:${u.emergency?1:0}:${isDependent(g,u)?1:0}:${u.expedition||u.scout||u.visit||u.envoy||u.haulageWork?1:0}:${basin(u.x,u.z)}:${g.state.buildings.filter(d=>d.team===u.team&&d.type==='dock'&&g.finished(d)&&Math.hypot(u.x-d.x,u.z-d.z)<=INFLUENCE_RULES.portReachMeters).map(d=>d.id).join(',')}`).join('|');
 const frontiers=g.state.buildings.filter(b=>b.type==='cornerstone'&&g.finished(b)&&(team===undefined||b.team===team)).map(b=>{const f=frontierStatus(g,b);return`${b.id}:${f.strength}:${f.radius}`;}).join('|');
 return`${b}/${boats}/${people}/${frontiers}/${g.state.weather}/${Math.round(g.world.waterY*100)}`;
}
function navigationSignature(g:Game){return g.state.buildings.filter(b=>b.hp>0&&!b.plannedCost&&(g.solidBuilding(b)||!!b.bridge)).map(b=>`${b.id}:${b.type}:${b.x}:${b.z}:${b.w}:${b.d}:${b.gateOpen?1:0}:${b.bridge?JSON.stringify(b.bridge)+g.finished(b):''}`).join('|');}
function nearbyNavigation(g:Game,team:number){
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const s of sourceList(g,team)){const r=(s.radius+INFLUENCE_RULES.fadeMeters)/INFLUENCE_RULES.minimumTravelCostPerMeter;left=Math.min(left,s.building.x-r);right=Math.max(right,s.building.x+r);top=Math.min(top,s.building.z-r);bottom=Math.max(bottom,s.building.z+r);}
 return g.state.buildings.filter(b=>b.hp>0&&!b.plannedCost&&(g.solidBuilding(b)||!!b.bridge)&&b.x+b.w>=left&&b.x-b.w<=right&&b.z+b.d>=top&&b.z-b.d<=bottom).map(b=>`${b.id}:${b.type}:${b.x}:${b.z}:${b.w}:${b.d}:${b.gateOpen?1:0}:${b.bridge?JSON.stringify(b.bridge)+g.finished(b):''}`).join('|');
}
function walkHash(g:Game){let hash=2166136261;for(let i=0;i<g.walk.length;i++)hash=Math.imul(hash^g.walk[i],16777619);return hash>>>0;}
function cacheFor(g:Game){
 let c=caches.get(g);const revision=g.navigationRevision(),terrainRevision=(g as Game&{terrainRevision?:()=>number}).terrainRevision?.()??0,width=Math.sqrt(g.walk.length),water=g.world.waterY;
 let hard=!c||c.world!==g.world||c.terrainRevision!==terrainRevision||c.heightSource!==g.world.heights||c.heightFunction!==g.height||c.water!==water||g.state.time<c.checkedAt;
 const navChanged=hard||c!.revision!==revision,nav=navChanged?navigationSignature(g):c!.navigationSignature,hash=navChanged?walkHash(g):c!.walkHash;
 if(c&&navChanged&&nav===c.navigationSignature&&hash!==c.walkHash)hard=true;
 if(hard){c={world:g.world,terrainRevision,unitCount:g.state.units.length,boatCount:g.state.boats?.length??0,heightSource:g.world.heights,heightFunction:g.height,walkHash:hash,revision,width,cell:g.world.size/width,count:g.walk.length,signature:'',checkedAt:-Infinity,navigationSignature:nav,waterSignature:'',teamSignatures:new Map(),trailSignature:'',trailCheckedAt:-Infinity,water,
  fields:new Map(),jobs:new Map(),edgeCosts:new Map(),samples:new Uint8Array(g.walk.length),heights:new Float32Array(g.walk.length),levels:new Float32Array(g.walk.length),wear:new Map((g.state.trails??[]).map(t=>[t.cell,t.wear])),waterNav:null,builds:(c?.builds??0)+1};caches.set(g,c);}
 const current=c!,physical=nav!==current.navigationSignature;
 if(physical){current.samples.fill(0);current.edgeCosts.clear();current.navigationSignature=nav;}
 const due=hard||physical||current.unitCount!==g.state.units.length||current.boatCount!==(g.state.boats?.length??0)||g.state.time-current.checkedAt>=INFLUENCE_RULES.cacheRefreshSeconds;
 if(due){
  const wetSolids=g.state.buildings.filter(b=>b.hp>0&&!b.plannedCost&&g.solidBuilding(b)&&g.height(b.x,b.z)<g.waterAt(b.x,b.z)+.3).map(b=>`${b.id}:${b.x}:${b.z}:${b.w}:${b.d}:${b.gateOpen}`).join('|');
  if(wetSolids!==current.waterSignature){current.waterNav=null;current.waterJob=undefined;current.waterSignature=wetSolids;}
  const trailDue=g.state.time-current.trailCheckedAt>=INFLUENCE_RULES.trailRefreshSeconds,refreshTrails=trailDue;
  const trails=refreshTrails?(g.state.trails??[]).map(t=>`${t.cell}:${Math.round(t.wear*4)}`).join('|'):current.trailSignature,roadsChanged=refreshTrails&&trails!==current.trailSignature;
  if(refreshTrails){current.trailCheckedAt=g.state.time;current.trailSignature=trails;if(roadsChanged){current.wear=new Map((g.state.trails??[]).map(t=>[t.cell,t.wear]));current.edgeCosts=new Map();}}
  const teams=new Set([...activeTeams(g),...current.fields.keys(),...current.jobs.keys()]);let invalidated=false;
  for(const team of teams){const next=signature(g,current.waterNav,team)+'/'+nearbyNavigation(g,team),old=current.teamSignatures.get(team);
   if(next!==old){current.teamSignatures.set(team,next);current.fields.delete(team);current.jobs.delete(team);invalidated=true;}else if(roadsChanged&&!current.jobs.has(team)){current.jobs.set(team,startField(g,current,team));}
  }
  if(invalidated||roadsChanged){current.paintedTerritory=undefined;current.paintedStrength=undefined;current.paintJob=undefined;if(!hard)current.builds++;}
  current.checkedAt=g.state.time;
 }
 current.revision=revision;current.walkHash=hash;current.unitCount=g.state.units.length;current.boatCount=g.state.boats?.length??0;return current;
}
function point(c:Cache,i:number){return{x:-c.world.size/2+(i%c.width+.5)*c.cell,z:-c.world.size/2+(Math.floor(i/c.width)+.5)*c.cell};}
function index(c:Cache,x:number,z:number){const ix=Math.floor((x+c.world.size/2)/c.cell),iz=Math.floor((z+c.world.size/2)/c.cell);return ix<0||iz<0||ix>=c.width||iz>=c.width?-1:iz*c.width+ix;}
function sample(g:Game,c:Cache,i:number){if(c.samples[i])return c.samples[i];const p=point(c,i),h=g.travelHeight(p.x,p.z),level=g.waterAt(p.x,p.z);c.heights[i]=h;c.levels[i]=level;
 c.samples[i]=1|(g.walkable(p.x,p.z)?2:0)|(g.height(p.x,p.z)<level+.3?4:0);return c.samples[i];}
function pace(c:Cache,i:number){const p=point(c,i);return 1+INFLUENCE_RULES.trailPaceBonus*Math.max(0,c.wear.get(trailCell(p.x,p.z,c.world.size))??0);}
function portsFor(g:Game,c:Cache,team:number){
 const docks=g.state.buildings.filter(b=>b.team===team&&b.type==='dock'&&g.finished(b));if(!docks.length)return{ports:[] as Port[],vessels:0};
 const boats=(g.state.boats??[]).filter(b=>b.team===team&&b.hp>0&&g.state.units.some(u=>u.id===b.captain&&u.team===team&&u.hp>0&&!isDependent(g,u)&&!u.prisoner&&!u.emergency&&u.boat?.id===b.id&&u.boat.phase==='aboard'));
 const canoes=g.state.units.filter(u=>u.team===team&&u.hp>0&&!isDependent(g,u)&&!u.prisoner&&!u.emergency&&u.haulage==='canoe'&&!u.boat&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.haulageWork);
 if(!boats.length&&!canoes.length)return{ports:[] as Port[],vessels:0};
 const nav=c.waterNav;if(!nav)return{ports:[] as Port[],vessels:0};const ports:Port[]=[];let vessels=0;
 for(const d of docks){
  let dockLabel=0,dockDistance=Infinity;
  for(let dz=-18;dz<=18;dz+=c.cell)for(let dx=-18;dx<=18;dx+=c.cell){const at=index(c,d.x+dx,d.z+dz),distance=Math.hypot(dx,dz);if(at>=0&&nav.labels[at]&&distance<dockDistance){dockDistance=distance;dockLabel=nav.labels[at];}}
  if(!dockLabel)continue;
  const nearby=[...boats,...canoes].filter(v=>Math.hypot(v.x-d.x,v.z-d.z)<=INFLUENCE_RULES.portReachMeters);
  const labels=new Set<number>();
  for(const v of nearby){const at=index(c,v.x,v.z);let label=at>=0?nav.labels[at]:0;
   // A personal canoe's owner can stand on the bank at the completed port.
   if(!label&&!('capacity' in v))for(let dz=-2;dz<=2&&!label;dz++)for(let dx=-2;dx<=2&&!label;dx++){const p=index(c,v.x+dx*c.cell,v.z+dz*c.cell);if(p>=0)label=nav.labels[p];}
   if(label&&label===dockLabel){labels.add(label);vessels++;}
  }
  for(const label of labels)ports.push({x:d.x,z:d.z,label});
 }
 return{ports,vessels};
}
/** Direct physical route used only to remove grid stair-step error at the old
 * core boundary. It cannot tunnel through a barrier or grant free water travel. */
function directCost(g:Game,c:Cache,s:Source,x:number,z:number){
 const b=s.building,d=Math.hypot(x-b.x,z-b.z),steps=Math.max(1,Math.ceil(d/(c.cell*.5)));let cost=0,previous=g.travelHeight(b.x,b.z);
 for(let k=1;k<=steps;k++){const t=k/steps,px=b.x+(x-b.x)*t,pz=b.z+(z-b.z)*t,h=g.travelHeight(px,pz),i=index(c,px,pz);
  if(i<0)return Infinity;
  const inside=Math.abs(px-b.x)<=b.w*.4+.8&&Math.abs(pz-b.z)<=b.d*.4+.8;
  if(h<g.waterAt(px,pz)+.12||!inside&&!g.walkable(px,pz)||Math.abs(h-previous)>INFLUENCE_RULES.maximumStepHeightMeters)return Infinity;
  cost+=d/steps/pace(c,i)+Math.abs(h-previous)*INFLUENCE_RULES.verticalCostMetersPerMeter;previous=h;
 }
 return cost;
}
function* buildField(g:Game,c:Cache,team:number):Generator<void,Field>{
 let operations=0;
 const transport=portsFor(g,c,team),f:Field={sourceBins:new Map(),binWidth:Math.ceil(g.world.size/INFLUENCE_RULES.sourceBinMeters),strength:new Float32Array(c.count),cost:new Float32Array(c.count).fill(Infinity),reached:new Uint8Array(c.count),sources:sourceList(g,team),metrics:[],blocked:{water:0,cliff:0,obstacle:0,noOperatingPort:0,waterNavigation:0,budget:0},...transport,visited:0,builtAt:g.state.time,builds:c.builds,pointCorrections:new Map()};
 for(const source of f.sources){yield;const step=INFLUENCE_RULES.sourceBinMeters,half=g.world.size/2,b=source.building;
  for(let z=Math.max(0,Math.floor((b.z-source.radius+half)/step));z<=Math.min(f.binWidth-1,Math.floor((b.z+source.radius+half)/step));z++)for(let x=Math.max(0,Math.floor((b.x-source.radius+half)/step));x<=Math.min(f.binWidth-1,Math.floor((b.x+source.radius+half)/step));x++){const key=z*f.binWidth+x,list=f.sourceBins.get(key);if(list)list.push(source);else f.sourceBins.set(key,[source]);}
 }
 const groups=new Map<number,Source[]>();for(const source of f.sources){const list=groups.get(source.strength);if(list)list.push(source);else groups.set(source.strength,[source]);}
 for(const group of groups.values()){
  // Equal-strength sources share one maximum-remaining-reach wave. This is the
  // same additive travel metric, without retraversing a village for every hut.
  const dist=new Map<number,number>(),origins=new Map<number,Source>(),heap=new Heap(),metrics=new Map<number,SourceMetric>();
  const insert=(state:number,score:number,origin:Source)=>{if(score>INFLUENCE_RULES.fadeMeters||score>=(dist.get(state)??Infinity))return;dist.set(state,score);origins.set(state,origin);heap.push(state,score);};
  for(const s of group){const b=s.building,r=Math.hypot(b.w,b.d)*.5+c.cell*2;
   metrics.set(b.id,{id:b.id,radiusMeters:s.radius,fadeMeters:INFLUENCE_RULES.fadeMeters,strength:s.strength,visitedCells:0,maximumCostMeters:0});let dockSeed=-1,dockSeedCost=Infinity;
   for(let dz=-r;dz<=r;dz+=c.cell)for(let dx=-r;dx<=r;dx+=c.cell){
    if(Math.abs(dx)>b.w*.4+c.cell*2||Math.abs(dz)>b.d*.4+c.cell*2)continue;
    if(++operations%16===0)yield;const i=index(c,b.x+dx,b.z+dz);if(i<0||!(sample(g,c,i)&2))continue;const p=point(c,i),distance=Math.hypot(p.x-b.x,p.z-b.z);
    if(b.type==='dock'){if(distance<dockSeedCost){dockSeed=i;dockSeedCost=distance;}}
    else{const initial=directCost(g,c,s,p.x,p.z);if(Number.isFinite(initial))insert(i,initial-s.radius,s);}
   }
   if(dockSeed>=0)insert(dockSeed,dockSeedCost-s.radius,s);
  }
  while(heap.a.length){
   if(++operations%16===0)yield;
   const next=heap.pop();if(next.cost!==(dist.get(next.state)??Infinity))continue;
   const s=origins.get(next.state)!,b=s.building,metric=metrics.get(b.id)!,budget=s.radius+INFLUENCE_RULES.fadeMeters,maxDistance=budget/INFLUENCE_RULES.minimumTravelCostPerMeter;
   if(metric.visitedCells>=INFLUENCE_RULES.maximumVisitedPerSource){f.blocked.budget++;continue;}
   const wet=next.state>=c.count,i=next.state%c.count,p=point(c,i);let cost=next.cost+s.radius;
   if(Math.hypot(p.x-b.x,p.z-b.z)>maxDistance)continue;
   if(!wet&&cost>s.radius&&Math.hypot(p.x-b.x,p.z-b.z)<=s.radius){const exact=directCost(g,c,s,p.x,p.z);if(exact<cost){cost=exact;dist.set(next.state,cost-s.radius);}}
   metric.visitedCells++;metric.maximumCostMeters=Math.max(metric.maximumCostMeters,cost);
   const strength=influenceStrength(cost,s.radius,s.strength,INFLUENCE_RULES.fadeMeters);
   f.reached[i]|=wet?2:1;
   if(strength>f.strength[i]){f.strength[i]=strength;f.cost[i]=cost;}
   const ix=i%c.width,iz=Math.floor(i/c.width);
   for(let direction=0;direction<NEIGHBORS.length;direction++){const [dx,dz]=NEIGHBORS[direction];const nx=ix+dx,nz=iz+dz;if(nx<0||nz<0||nx>=c.width||nz>=c.width)continue;
    const ni=nz*c.width+nx,flags=sample(g,c,ni),length=Math.hypot(dx,dz)*c.cell;
    const land=!!(flags&2),water=!!(flags&4);let nextWet=wet,extra=0;
    if(wet){
     if(land){nextWet=false;extra=INFLUENCE_RULES.landingCostMeters;}
     else if(!water){f.blocked.obstacle++;continue;}
     else if(!c.waterNav?.grid[ni]){f.blocked.waterNavigation++;continue;}
    }else if(!land){
     if(!water){f.blocked.obstacle++;continue;}
     if(!f.ports.length){f.blocked.water++;f.blocked.noOperatingPort++;continue;}
     const label=c.waterNav?.labels[ni];if(!label||!f.ports.some(port=>port.label===label&&Math.hypot(p.x-port.x,p.z-port.z)<=INFLUENCE_RULES.portReachMeters)){f.blocked.water++;continue;}
     nextWet=true;extra=INFLUENCE_RULES.embarkCostMeters;
    }
    if(dx&&dz){
     const sideA=iz*c.width+nx,sideB=nz*c.width+ix;
     const clear=(q:number)=>nextWet?!!c.waterNav?.grid[q]:!!(sample(g,c,q)&2);
     if(!clear(sideA)||!clear(sideB)){f.blocked.obstacle++;continue;}
    }
    const h=wet?c.levels[i]:c.heights[i],nh=nextWet?c.levels[ni]:c.heights[ni],rise=Math.abs(nh-h);
    if(rise>INFLUENCE_RULES.maximumStepHeightMeters){f.blocked.cliff++;continue;}
    let movement:number;
    if(!wet&&!nextWet){const edgeKey=i*8+direction,cached=c.edgeCosts.get(edgeKey);
     if(cached!==undefined){if(cached<0){if(cached===-1)f.blocked.obstacle++;else f.blocked.cliff++;continue;}movement=cached;}
     else{const q=point(c,ni),mx=(p.x+q.x)*.5,mz=(p.z+q.z)*.5,mh=g.travelHeight(mx,mz);
      if(!g.walkable(mx,mz)){c.edgeCosts.set(edgeKey,-1);f.blocked.obstacle++;continue;}
      if(Math.abs(mh-h)>INFLUENCE_RULES.maximumStepHeightMeters||Math.abs(nh-mh)>INFLUENCE_RULES.maximumStepHeightMeters){c.edgeCosts.set(edgeKey,-2);f.blocked.cliff++;continue;}
      movement=length/((pace(c,i)+pace(c,ni))*.5)+rise*INFLUENCE_RULES.verticalCostMetersPerMeter;c.edgeCosts.set(edgeKey,movement);
     }
    }else movement=length*(nextWet?INFLUENCE_RULES.waterCostPerMeter:1/((pace(c,i)+pace(c,ni))*.5))+rise*INFLUENCE_RULES.verticalCostMetersPerMeter+extra;
    insert(ni+(nextWet?c.count:0),cost+movement-s.radius,s);
   }
  }
  for(const metric of metrics.values()){f.visited+=metric.visitedCells;f.metrics.push(metric);}
  for(const s of group){const ci=index(c,s.building.x,s.building.z);if(ci>=0){f.strength[ci]=Math.max(f.strength[ci],s.strength);f.cost[ci]=0;f.reached[ci]|=1;}}
 }

 c.fields.set(team,f);return f;
}
function* startField(g:Game,c:Cache,team:number):Generator<void,Field>{return yield*buildField(g,{...c},team);}
function field(g:Game,c:Cache,team:number){const ready=c.fields.get(team);if(!ready&&!c.jobs.has(team))c.jobs.set(team,startField(g,c,team));return ready;}
function valueAt(c:Cache,f:Field,x:number,z:number){
 const gx=(x+c.world.size/2)/c.cell-.5,gz=(z+c.world.size/2)/c.cell-.5,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
 if(ix<0||iz<0||ix+1>=c.width||iz+1>=c.width)return 0;
 const a=iz*c.width+ix,b=a+c.width;
 return(f.strength[a]*(1-fx)+f.strength[a+1]*fx)*(1-fz)+(f.strength[b]*(1-fx)+f.strength[b+1]*fx)*fz;
}
function strengthAt(g:Game,c:Cache,f:Field,x:number,z:number):number{
 let strength=valueAt(c,f,x,z);
 const binX=Math.floor((x+c.world.size/2)/INFLUENCE_RULES.sourceBinMeters),binZ=Math.floor((z+c.world.size/2)/INFLUENCE_RULES.sourceBinMeters);
 for(const s of f.sourceBins.get(binZ*f.binWidth+binX)??[])if(s.strength>strength+1e-6&&Math.hypot(x-s.building.x,z-s.building.z)<=s.radius+1e-6){
  const key=`${s.building.id}:${x}:${z}`;let direct=f.pointCorrections.get(key);
  if(direct===undefined){direct=directCost(g,c,s,x,z);if(f.pointCorrections.size>=INFLUENCE_RULES.maximumPointCorrections)f.pointCorrections.clear();f.pointCorrections.set(key,direct);}
  strength=Math.max(strength,influenceStrength(direct,s.radius,s.strength,INFLUENCE_RULES.fadeMeters));
 }
 // Interpolation may soften a reachable boundary, but cannot spread a claim
 // onto the other bank or into water that no authorized route ever reached.
 if(strength>0){const i=index(c,x,z);if(i<0)return 0;const wet=g.travelHeight(x,z)<g.waterAt(x,z)+.12;
  if(!(f.reached[i]&(wet?2:1))||wet&&!f.ports.length)return 0;
 }
 return Math.max(0,Math.min(1,strength));
}
function activeTeams(g:Game){return [...new Set(g.state.buildings.filter(b=>b.team!==3&&g.finished(b)&&!FORTIFICATIONS.includes(b.type)).map(b=>b.team))];}
export function geographicInfluenceReady(g:Game,team?:number){if(terrainInfluenceActive(g))return terrainInfluenceReady(g,team);const c=cacheFor(g),teams=team===undefined?activeTeams(g):[team];for(const team of teams)field(g,c,team);return teams.every(team=>c.fields.has(team));}
export function geographicInfluenceAt(g:Game,x:number,z:number,team:number):number{
 if(terrainInfluenceActive(g))return terrainInfluenceAt(g,x,z,team);if(!Number.isFinite(x)||!Number.isFinite(z)||team===3)return 0;const c=cacheFor(g),f=field(g,c,team);return f?strengthAt(g,c,f,x,z):0;
}
/** Run pending geographic-influence jobs to completion. For tests and rare
 * sync readers — not the per-frame vision paint (that stays time-sliced). */
export function flushGeographicInfluence(g:Game){
 if(terrainInfluenceActive(g)){paintTerrainInfluence(g);return;}
 let guard=0;
 while(guard++<250000){
  const c=cacheFor(g);
  for(const team of activeTeams(g))field(g,c,team);
  const pending=!!c.waterJob||c.jobs.size>0||!!c.paintJob||!!c.paintTeams;
  if(!pending&&(activeTeams(g).every(team=>c.fields.has(team)))&&(c.paintedTerritory===g.territory||!c.paintTeams&&!c.paintJob)){
   if(c.paintedTerritory!==g.territory&&c.fields.size){c.paintTeams=activeTeams(g);continue;}
   if(c.paintedTerritory===g.territory)return;
  }
  slices.delete(g);
  advanceGeographicInfluence(g, performance.now()+guard*1000);
 }
}

function* paintField(g:Game,c:Cache,teams:number[]):Generator<void>{
 const n=Math.sqrt(g.territory.length),cell=g.world.size/n,territory=new Uint8Array(g.territory.length).fill(255),strength=new Float32Array(g.territoryStrength.length);
 for(let iz=0;iz<n;iz++){yield;for(let ix=0;ix<n;ix++){if(ix%16===0)yield;
  const x=-g.world.size/2+(ix+.5)*cell,z=-g.world.size/2+(iz+.5)*cell,i=iz*n+ix;
  // A source can be invalidated while a cooperative paint is pending. Missing authority paints nothing.
  for(const team of teams){const f=c.fields.get(team);if(!f)continue;const v=strengthAt(g,c,f,x,z);if(v<=.0001)continue;strength[i]=Math.max(strength[i],v);territory[i]=territory[i]===255?team:territory[i]===team?team:254;}
 }}
 g.territory.set(territory);g.territoryStrength.set(strength);c.paintedTerritory=g.territory;c.paintedStrength=g.territoryStrength;
}
export function paintGeographicTerritory(g:Game){
 if(terrainInfluenceActive(g)){paintTerrainInfluence(g);return;}
 const c=cacheFor(g);if(c.paintedTerritory===g.territory&&c.paintedStrength===g.territoryStrength)return;
 const teams=activeTeams(g);for(const team of teams)field(g,c,team);c.paintTeams=teams;
}
/** One shared wall-time budget across simulation substeps, including paused steps. */
export function advanceGeographicInfluence(g:Game,now=performance.now()){
 if(terrainInfluenceActive(g)){paintTerrainInfluence(g);return;}
 const prior=slices.get(g);if(prior&&now>=prior.last&&now-prior.last<INFLUENCE_RULES.sliceIntervalMilliseconds)return;
 const start=performance.now(),slice=prior??{last:now,maximumMilliseconds:0,lastMilliseconds:0,count:0};slice.last=now;slices.set(g,slice);
 const c=cacheFor(g);for(const team of activeTeams(g))field(g,c,team);
 const transport=g.state.buildings.some(b=>b.type==='dock'&&g.finished(b))&&g.state.units.some(u=>u.hp>0&&(u.haulage==='canoe'||u.boat));
 if(transport&&!c.waterNav&&!c.waterJob)c.waterJob=cooperativeInfluenceWater(g);
 do{
  if(c.waterJob){const r=c.waterJob.next();if(r.done){c.waterNav=r.value;c.waterJob=undefined;for(const team of c.teamSignatures.keys())c.teamSignatures.set(team,signature(g,c.waterNav,team)+'/'+nearbyNavigation(g,team));}continue;}
  const job=c.jobs.entries().next().value;
  if(job){const r=job[1].next();if(r.done){c.jobs.delete(job[0]);c.paintedTerritory=undefined;c.paintedStrength=undefined;c.paintJob=undefined;c.paintTeams=activeTeams(g);}continue;}
  if(c.paintTeams&&!c.paintJob)c.paintJob=paintField(g,c,c.paintTeams);
  if(c.paintJob){const r=c.paintJob.next();if(r.done){c.paintJob=undefined;c.paintTeams=undefined;}}else break;
 }while(performance.now()-start<INFLUENCE_RULES.sliceMilliseconds);
 const elapsed=performance.now()-start;slice.lastMilliseconds=elapsed;slice.maximumMilliseconds=Math.max(slice.maximumMilliseconds,elapsed);slice.count++;
}
export function geographicInfluenceDiagnostics(g:Game,team=0){if(terrainInfluenceActive(g))return terrainInfluenceDiagnostics(g,team);const c=cacheFor(g),f=field(g,c,team);return{ready:!!f,pendingJobs:c.jobs.size,paintReady:c.paintedTerritory===g.territory&&c.paintedStrength===g.territoryStrength,slices:slices.get(g),units:'equivalent metres of level walking',builtAtSeconds:f?.builtAt??null,cacheBuild:c.builds,navigationRevision:c.revision,terrainRevision:c.terrainRevision,gridCellMeters:c.cell,visitedCells:f?.visited??0,eligiblePorts:f?.ports.length??0,availableVessels:f?.vessels??0,blocked:{...f?.blocked},sources:(f?.metrics??[]).map(s=>({...s})),rules:INFLUENCE_RULES};}
/** Route cost belongs to the reported navigation-cell centre; strength is the
 * smoothly sampled point value. Infinity is represented as null for JSON/UI. */
export function geographicInfluenceSample(g:Game,x:number,z:number,team=0){
 if(terrainInfluenceActive(g))return terrainInfluenceSample(g,x,z,team);
 const c=cacheFor(g),f=field(g,c,team);if(!f)return{strength:null,routeCostMeters:null,sampledAt:null,blockedReason:'field-recalculating'};const i=index(c,x,z),cost=i>=0?f.cost[i]:Infinity,strength=geographicInfluenceAt(g,x,z,team);
 const blockedReason=strength>0?null:!f.sources.length?'no-established-source':i<0?'outside-world':
  g.height(x,z)<g.waterAt(x,z)+.12&&!f.ports.length?'water-without-operating-port':
  !g.walkable(x,z)&&g.height(x,z)>=g.waterAt(x,z)+.12?'unwalkable-terrain-or-structure':'no-affordable-connected-route';
 return{strength,routeCostMeters:Number.isFinite(cost)?cost:null,sampledAt:i>=0?point(c,i):null,blockedReason};
}
