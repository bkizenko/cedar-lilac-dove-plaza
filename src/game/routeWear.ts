import type {Game} from './sim';
import type {Unit} from './types';
import {UNITS} from './constants';
import {simulationDaySeconds} from './calendarPacing';
import {hash32,makeRng} from './rulerCore';

/** Routes: ground wear that exists only where the same journey is made again and again.
 *
 * A journey is one origin-to-destination walk by a resident doing routine work (gather, haul, build, trade, envoy, herding).
 * When it ends, its real stepped path is folded into a *corridor*: a pair of coarse endpoints plus a smoothed polyline. The first
 * time a corridor is walked it is only remembered; wear starts with the second journey inside the memory window. Trips decay
 * with a half-life, so an unused route fades from beaten track to worn path to faint line to nothing.
 *
 * No random numbers are drawn at run time: the only variation (lateral meander of each strand) is a pure hash of the world seed and
 * the corridor id. State is small (<=192 corridors, <=40 points each), derived fields are rebuilt, never stored.
 * Switchable: `setRoutesEnabled(g,false)` returns to the legacy per-step trail stamps. */
export const ROUTE_RULES={
 version:1,
 /** Endpoints this close (metres) are the same place for matching; it is the coarse grid of the accumulator. */
 matchMetres:14,
 minJourneyMetres:22,
 /** A walk that wanders (path longer than this multiple of the crow-fly distance) is not a route. */
 maxSinuosity:2.6,
 sampleMetres:3,
 maxPoints:40,
 maxCorridors:192,
 halfLifeSeconds:540,
 pruneBelowTrips:.12,
 /** wear(trips)=1-exp(-(trips-1)/wearScale); a single journey (trips<=1) leaves no mark at all. */
 wearScale:6,
 faint:.1,worn:.4,beaten:.75,
 paceGain:.18,
 coarseMetres:4,
 loadedPaceFactor:.8,
 /** A day's walk is the sim's own: gatherer speed, loaded factor, and one simulation calendar day. */
 dayWalkMetres:UNITS.worker.speed*.8*simulationDaySeconds,
} as const;

export type RouteStage='none'|'faint'|'worn'|'beaten';
export type Corridor={id:number;ax:number;az:number;bx:number;bz:number;/** x,z interleaved from a to b, 0.1 m resolution */pts:number[];len:number;trips:number;count:number;last:number;byTeam:Record<string,number>};
export type RouteWearState={version:1;enabled:boolean;nextId:number;corridors:Corridor[]};
type RState={routeWear?:RouteWearState};
const st=(g:Pick<Game,'state'>)=>g.state as Game['state']&RState;
const num=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);

export const wearOf=(trips:number)=>trips<=1||!Number.isFinite(trips)?0:Math.min(1,1-Math.exp(-(trips-1)/ROUTE_RULES.wearScale));
export const stageOf=(wear:number):RouteStage=>wear>=ROUTE_RULES.beaten?'beaten':wear>=ROUTE_RULES.worn?'worn':wear>=ROUTE_RULES.faint?'faint':'none';
export const routesEnabled=(g:Pick<Game,'state'>)=>st(g).routeWear?.enabled!==false;
export function setRoutesEnabled(g:Game,on:boolean){const s=state(g);s.enabled=!!on;revision.set(g,(revision.get(g)||0)+1);}
function state(g:Pick<Game,'state'>){return st(g).routeWear??={version:1,enabled:true,nextId:1,corridors:[]};}
export const routeCorridors=(g:Pick<Game,'state'>):readonly Corridor[]=>st(g).routeWear?.corridors??[];
export const corridorWear=(c:Corridor)=>wearOf(c.trips);

/* ---------------------------------------------------------------- journeys (transient, never saved) */
type Journey={ox:number;oz:number;tx:number;tz:number;pts:number[];len:number;lx:number;lz:number;t:number;team:number};
const journeys=new WeakMap<Game,Map<number,Journey>>();
const revision=new WeakMap<Game,number>();
export const routeRevision=(g:Game)=>revision.get(g)||0;
const bump=(g:Game)=>revision.set(g,(revision.get(g)||0)+1);

/** Routine work only: wandering, exploring, fighting, fleeing and boat travel never make a route. */
export function routineTraveller(u:Unit){
 if(u.hp<=0||u.boat||u.haulage==='canoe'||u.emergency||u.scout||u.expedition)return false;
 if(u.order==='gather'||u.order==='return'||u.order==='build'||u.order==='trade')return true;
 if(u.order==='move')return !!(u.envoy||u.visit||u.trade||u.caravanRoute||(u.tradeTeam||0)>0||u.tributeJourney);
 return false;
}

/** Called once per actual walking step (sim.ts steer). Returns true when the route system handled the step, false to let the legacy stamp run. */
export function traceStep(g:Game,u:Unit,nx:number,nz:number,tx:number,tz:number){
 if(!routesEnabled(g))return false;
 if(!routineTraveller(u))return true;
 let all=journeys.get(g);if(!all)journeys.set(g,all=new Map());
 let j=all.get(u.id);
 const now=g.state.time;
 if(j&&(Math.hypot(j.tx-tx,j.tz-tz)>6||now-j.t>4||j.team!==u.team))j=undefined;
 if(!j){j={ox:u.x,oz:u.z,tx,tz,pts:[u.x,u.z],len:0,lx:u.x,lz:u.z,t:now,team:u.team};all.set(u.id,j);}
 const step=Math.hypot(nx-j.lx,nz-j.lz);
 j.len+=Math.hypot(nx-u.x,nz-u.z);j.t=now;
 if(step>=ROUTE_RULES.sampleMetres&&j.pts.length<ROUTE_RULES.maxPoints*8){j.pts.push(nx,nz);j.lx=nx;j.lz=nz;}
 if(Math.hypot(nx-tx,nz-tz)<3.5){j.pts.push(nx,nz);all.delete(u.id);commit(g,j,nx,nz);}
 return true;
}

function resample(pts:readonly number[],n:number){
 const out:number[]=[];if(pts.length<4){return pts.slice();}
 const cum=[0];for(let i=2;i<pts.length;i+=2)cum.push(cum.at(-1)!+Math.hypot(pts[i]-pts[i-2],pts[i+1]-pts[i-1]));
 const total=cum.at(-1)||1;let k=0;
 for(let i=0;i<n;i++){const s=total*i/(n-1);while(k<cum.length-2&&cum[k+1]<s)k++;const span=cum[k+1]-cum[k]||1,f=Math.min(1,Math.max(0,(s-cum[k])/span));
  out.push(pts[k*2]+(pts[k*2+2]-pts[k*2])*f,pts[k*2+1]+(pts[k*2+3]-pts[k*2+1])*f);}
 return out;
}
const round1=(v:number)=>Math.round(v*10)/10;

function commit(g:Game,j:Journey,ex:number,ez:number){
 const R=ROUTE_RULES,crow=Math.hypot(ex-j.ox,ez-j.oz);
 if(j.len<R.minJourneyMetres||crow<R.minJourneyMetres*.7||j.len>crow*R.maxSinuosity+8)return;
 const s=state(g);
 let best:Corridor|undefined,bestD=Infinity,swapped=false;
 for(const c of s.corridors){
  const d1=Math.max(Math.hypot(c.ax-j.ox,c.az-j.oz),Math.hypot(c.bx-ex,c.bz-ez)),d2=Math.max(Math.hypot(c.ax-ex,c.az-ez),Math.hypot(c.bx-j.ox,c.bz-j.oz));
  const d=Math.min(d1,d2);if(d<=R.matchMetres&&d<bestD){bestD=d;best=c;swapped=d2<d1;}
 }
 const n=Math.max(6,Math.min(R.maxPoints,Math.round(j.len/4)));
 let raw=resample(j.pts,n);
 if(best){
  if(swapped){const r:number[]=[];for(let i=raw.length-2;i>=0;i-=2)r.push(raw[i],raw[i+1]);raw=r;}
  const old=resample(best.pts,n),w=1/Math.min(6,best.count+1),mix:number[]=[];
  for(let i=0;i<n*2;i++)mix.push(round1(old[i]+(raw[i]-old[i])*w));
  // Endpoints drift toward where people actually start and stop, slowly.
  best.pts=mix;best.ax=mix[0];best.az=mix[1];best.bx=mix[mix.length-2];best.bz=mix[mix.length-1];
  best.len=round1(best.len+(j.len-best.len)*w);best.count=Math.min(1000,best.count+1);
  best.trips=best.trips+1;best.last=g.state.time;
  best.byTeam[j.team]=(best.byTeam[j.team]||0)+1;
 }else{
  const pts=raw.map(round1);
  s.corridors.push({id:s.nextId++,ax:pts[0],az:pts[1],bx:pts[pts.length-2],bz:pts[pts.length-1],pts,len:round1(j.len),trips:1,count:1,last:g.state.time,byTeam:{[j.team]:1}});
  if(s.corridors.length>R.maxCorridors){
   let drop=0;for(let i=1;i<s.corridors.length;i++){const a=s.corridors[i],b=s.corridors[drop];if(a.trips<b.trips||(a.trips===b.trips&&a.id<b.id))drop=i;}
   s.corridors.splice(drop,1);
  }
 }
 bump(g);
}

/** Decay, flush finished journeys whose walker stopped near the goal, drop dead ones. Deterministic in dt. */
export function tickRouteWear(g:Game,dt:number){
 if(!routesEnabled(g))return;
 const s=st(g).routeWear;
 const all=journeys.get(g);
 if(all)for(const [id,j] of all){
  if(g.state.time-j.t<2)continue;all.delete(id);
  if(Math.hypot(j.lx-j.tx,j.lz-j.tz)<10)commit(g,j,j.lx,j.lz);
 }
 if(!s||!s.corridors.length)return;
 const k=Math.pow(.5,dt/ROUTE_RULES.halfLifeSeconds);
 let changed=false;
 for(const c of s.corridors){c.trips*=k;for(const t of Object.keys(c.byTeam))c.byTeam[t]*=k;}
 const before=s.corridors.length;
 s.corridors=s.corridors.filter(c=>c.trips>=ROUTE_RULES.pruneBelowTrips);
 if(s.corridors.length!==before)changed=true;
 // The field is rebuilt a few times a minute, not every tick.
 const stamp=Math.floor(g.state.time/3);
 if(changed||stamp!==lastStamp.get(g)){lastStamp.set(g,stamp);bump(g);}
}
const lastStamp=new WeakMap<Game,number>();

/** Owning society of a corridor: whoever made most of its journeys. */
export function corridorOwner(c:Corridor){let best=-1,v=0;for(const t of Object.keys(c.byTeam))if(c.byTeam[t]>v||(c.byTeam[t]===v&&best>=0&&Number(t)<best)){v=c.byTeam[t];best=Number(t);}return best;}

/* ---------------------------------------------------------------- geometry shared by pace, render and waystations */
/** Smoothed polyline (Chaikin) of a corridor with its seeded lateral meander, spacing <= `step` metres. */
export function corridorLine(c:Corridor,seed:number,step=1,meander=true){
 let p=c.pts.slice();
 for(let pass=0;pass<2&&p.length>=6;pass++){const q=[p[0],p[1]];for(let i=0;i<p.length-2;i+=2){q.push(.75*p[i]+.25*p[i+2],.75*p[i+1]+.25*p[i+3],.25*p[i]+.75*p[i+2],.25*p[i+1]+.75*p[i+3]);}q.push(p[p.length-2],p[p.length-1]);p=q;}
 const out:number[]=[];const r=makeRng(hash32('route-meander',seed,c.id));
 const p1=r()*6.283,p2=r()*6.283,l1=18+r()*14,l2=7+r()*5,w=corridorWear(c),amp=meander?.25+.5*w:0;
 let s=0;
 for(let i=0;i<p.length-2;i+=2){
  const x0=p[i],z0=p[i+1],x1=p[i+2],z1=p[i+3],d=Math.hypot(x1-x0,z1-z0);if(d<1e-6)continue;
  const n=Math.max(1,Math.ceil(d/step)),nx=-(z1-z0)/d,nz=(x1-x0)/d;
  for(let k=0;k<n;k++){
   const f=k/n,ss=s+d*f,x=x0+(x1-x0)*f,z=z0+(z1-z0)*f;
   // Endpoints stay put (a doorway is a doorway); the middle wanders.
   const edge=Math.min(1,Math.min(ss,Math.max(0,c.len-ss))/10),o=(Math.sin(ss/l1*6.283+p1)*.6+Math.sin(ss/l2*6.283+p2)*.4)*amp*edge;
   out.push(x+nx*o,z+nz*o);
  }
  s+=d;
 }
 out.push(p[p.length-2],p[p.length-1]);
 return out;
}

/** Coarse ground-wear grid (derived, 4 m cells) used for walking pace. Rebuilt only when routes changed. */
const coarse=new WeakMap<Game,{rev:number;size:number;n:number;data:Float32Array}>();
function coarseGrid(g:Game){
 const rev=routeRevision(g),cached=coarse.get(g);if(cached&&cached.rev===rev)return cached;
 const size=g.world.size,n=Math.ceil(size/ROUTE_RULES.coarseMetres),data=new Float32Array(n*n);
 for(const c of routeCorridors(g)){
  const w=corridorWear(c);if(w<ROUTE_RULES.faint)continue;
  const line=corridorLine(c,g.state.seed,2,false);
  for(let i=0;i<line.length;i+=2){const ix=Math.floor((line[i]+size/2)/ROUTE_RULES.coarseMetres),iz=Math.floor((line[i+1]+size/2)/ROUTE_RULES.coarseMetres);
   if(ix<0||iz<0||ix>=n||iz>=n)continue;const o=iz*n+ix;if(w>data[o])data[o]=w;}
 }
 const grid={rev,size,n,data};coarse.set(g,grid);return grid;
}
/** Walking pace multiplier on worn ground. Pure read: never creates state. */
export function routePace(g:Game,x:number,z:number){
 if(!routesEnabled(g)||!st(g).routeWear?.corridors.length)return 1;
 const grid=coarseGrid(g),ix=Math.floor((x+grid.size/2)/ROUTE_RULES.coarseMetres),iz=Math.floor((z+grid.size/2)/ROUTE_RULES.coarseMetres);
 if(ix<0||iz<0||ix>=grid.n||iz>=grid.n)return 1;
 return 1+grid.data[iz*grid.n+ix]*ROUTE_RULES.paceGain;
}

/* ---------------------------------------------------------------- render field (pure, no Game) */
export type RouteField={res:number;texel:number;wear:Float32Array;core:Float32Array;hash:Float32Array;amp:Float32Array};
const scratch=new Map<number,Float32Array>();
/** Rasterise corridors into soft-edged strips: wear (strip profile x traffic), core (trodden centre of beaten tracks), hash (per-strand tone).
 * Strands combine as 1-(1-a)(1-b), so merging routes read as one wider, darker track and near-parallel ones braid through each other. */
export function paintRouteField(corridors:readonly Corridor[],seed:number,size:number,texel:number,out?:RouteField):RouteField{
 const res=Math.max(8,Math.min(1536,Math.ceil(size/texel))),tx=size/res,N=res*res;
 const f=out&&out.res===res?out:{res,texel:tx,wear:new Float32Array(N),core:new Float32Array(N),hash:new Float32Array(N),amp:new Float32Array(N)};
 f.texel=tx;f.wear.fill(0);f.core.fill(0);f.hash.fill(.5);f.amp.fill(0);
 let dist=scratch.get(N);if(!dist){dist=new Float32Array(N).fill(1e9);scratch.set(N,dist);}
 for(const c of corridors){
  const w=corridorWear(c);if(w<.04)continue;
  const line=corridorLine(c,seed,Math.max(.6,tx*.8)),hw=.2+.5*w,feather=.6+1.5*w,reach=hw+feather+tx,s=Math.pow(w,.8),h=(hash32('route-tone',seed,c.id)%1000)/1000;
  const touched:number[]=[];
  for(let i=0;i<line.length;i+=2){
   const px=line[i]+size/2,pz=line[i+1]+size/2;
   const i0=Math.max(0,Math.floor((px-reach)/tx)),i1=Math.min(res-1,Math.floor((px+reach)/tx)),j0=Math.max(0,Math.floor((pz-reach)/tx)),j1=Math.min(res-1,Math.floor((pz+reach)/tx));
   for(let j=j0;j<=j1;j++){const dz=(j+.5)*tx-pz;for(let ii=i0;ii<=i1;ii++){const dx=(ii+.5)*tx-px,d=Math.hypot(dx,dz),o=j*res+ii;if(d<dist[o]){if(dist[o]>=1e8)touched.push(o);dist[o]=d;}}}
  }
  for(const o of touched){
   const d=dist[o];dist[o]=1e9;
   const t=Math.min(1,Math.max(0,(d-hw*.3)/(hw+feather-hw*.3))),prof=Math.pow(1-t,1.7);
   const v=s*prof;if(v<=.002)continue;
   const prev=f.wear[o];if(v>prev){f.hash[o]=h;f.amp[o]=s;}
   f.wear[o]=1-(1-prev)*(1-v);
   const core=w>=ROUTE_RULES.worn?Math.pow((w-ROUTE_RULES.worn)/(1-ROUTE_RULES.worn),.7)*(1-Math.min(1,Math.max(0,d/(hw*.7)))):0;
   if(core>f.core[o])f.core[o]=core;
  }
 }
 return f;
}

/* ---------------------------------------------------------------- persistence */
export function validRouteWear(s:any):boolean{
 const r=s?.routeWear;if(r===undefined)return true;
 if(!r||typeof r!=='object'||r.version!==1||typeof r.enabled!=='boolean'||!Number.isSafeInteger(r.nextId)||r.nextId<1||!Array.isArray(r.corridors)||r.corridors.length>ROUTE_RULES.maxCorridors)return false;
 const ids=new Set();
 for(const c of r.corridors){
  if(!c||typeof c!=='object'||!Number.isSafeInteger(c.id)||c.id<1||c.id>=r.nextId+1||ids.has(c.id))return false;ids.add(c.id);
  if(!num(c.ax)||!num(c.az)||!num(c.bx)||!num(c.bz)||!num(c.len)||c.len<0||!num(c.trips)||c.trips<0||c.trips>5000||!Number.isSafeInteger(c.count)||c.count<1||!num(c.last))return false;
  if(!Array.isArray(c.pts)||c.pts.length<4||c.pts.length>ROUTE_RULES.maxPoints*2||c.pts.length%2||c.pts.some((v:unknown)=>!num(v)||Math.abs(v)>8000))return false;
  if(!c.byTeam||typeof c.byTeam!=='object'||Object.values(c.byTeam).some(v=>!num(v)||v<0))return false;
 }
 return true;
}
