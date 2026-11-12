import {Game} from './sim';
import type {GameState,HudSnapshot,Unit} from './types';
import type {WorldData} from './worldgen';
import type {SimulationClock,SimulationPoseFrame} from './simulationWorkerProtocol';

/** Owned structured-clone view, not a save and never a second simulation. Terrain is sent once. */
export type SimulationPresentation={
 world?:WorldData;state:GameState;vision:Game['vision'];territory:Game['territory'];territoryStrength:Game['territoryStrength'];
 navigationRevision:number;started:boolean;awaitingStart:boolean;testMode:boolean;revealMap:boolean;
 chopMarks:number[];looted:number[];worldWaterY:number;worldCamps:WorldData['camps'];hud:HudSnapshot;
};
/** Called only by authoritative runtime; postMessage clones without detaching Game arrays. */
export function captureSimulationPresentation(g:Game,includeWorld:boolean):SimulationPresentation{
 if(g.state.units.length>20000||g.state.buildings.length>20000)throw new Error('Presentation membership exceeds the explicit transport bound');
 // snapshot may update native dialog-focus/selection caches: intentionally owner-side only.
 const hud=g.snapshot();
 return{...(includeWorld?{world:g.world}:{}),state:g.state,vision:g.vision,territory:g.territory,territoryStrength:g.territoryStrength,navigationRevision:g.navigationRevision(),started:g.started,awaitingStart:g.awaitingStart,testMode:g.testMode,revealMap:g.revealMap,chopMarks:[...g.chopMarks],looted:[...g.looted],worldWaterY:g.world.waterY,worldCamps:g.world.camps,hud};
}
/** Reviewed presentation queries only. Unknown methods fail rather than execute a gameplay method. */
export const RENDER_QUERY_ALLOWLIST=[
 'height','waterAt','travelHeight','campOf','finished','tribe','popNow','popCap','queued',
 'dayPhase','daylight','isNight','seasonMix','clockState','solidBuilding','terrainRevision','navigationRevision',
 'visibleAt','exploredAt','regionAt','selectedUnits','isFoe','isAlly','musicMood',
] as const;
const queries=new Set<string>(RENDER_QUERY_ALLOWLIST);
const deniedArrayMethods=new Set(['copyWithin','fill','pop','push','reverse','shift','sort','splice','unshift','set']);
function readOnlyGraph(){
 const cache=new WeakMap<object,object>();
 const wrap=<T>(value:T):T=>{
  if(!value||typeof value!=='object')return value;
  const old=cache.get(value as object);if(old)return old as T;
  const proxy=new Proxy(value as object,{
   set(){throw new Error('Worker projection is read-only; dispatch an authoritative command');},
   deleteProperty(){throw new Error('Worker projection is read-only');},defineProperty(){throw new Error('Worker projection is read-only');},setPrototypeOf(){throw new Error('Worker projection is read-only');},
   get(target,key,receiver){
    if(target instanceof Set||target instanceof Map){
     if(['add','set','clear','delete'].includes(String(key)))return()=>{throw new Error('Worker projection collections are read-only');};
     if(key==='size')return target.size;
     if(key===Symbol.iterator||key==='values'||key==='entries'||key==='keys')return function*(){const iterator=Reflect.apply(Reflect.get(target,key,target),target,[]) as Iterable<unknown>;for(const item of iterator)yield wrap(item);};
     const item=Reflect.get(target,key,target);return typeof item==='function'?(...args:unknown[])=>wrap(Reflect.apply(item,target,args)):wrap(item);
    }
    if(ArrayBuffer.isView(target)){
     if(key===Symbol.iterator||key==='values'||key==='entries'||key==='keys')return function*(){const iterator=Reflect.apply(Reflect.get(target,key,target),target,[]) as Iterable<unknown>;for(const item of iterator)yield wrap(item);};
     if(key==='buffer')return (target.buffer as ArrayBuffer).slice(0);
     const item=Reflect.get(target,key,target);
     if(typeof item==='function'){if(deniedArrayMethods.has(String(key)))return()=>{throw new Error('Worker projection buffers are read-only');};return(...args:unknown[])=>{const safe=args.map(arg=>typeof arg==='function'?(...items:unknown[])=>Reflect.apply(arg,undefined,items.map(wrap)):arg);return wrap(Reflect.apply(item,target,safe));};}
     return wrap(item);
    }
    const item=Reflect.get(target,key,receiver);return wrap(item);
   },
  });cache.set(value as object,proxy);return proxy as T;
 };return wrap;
}
/** No Game constructor/reset/decode/step on main: only its reviewed read methods are reused. */
export class SimulationRenderProjection{
 readonly game:Game;
 private raw=Object.create(Game.prototype) as Game;
 private wrap=readOnlyGraph();private packet:SimulationPresentation|null=null;
 private revision=-1;private units=new Map<number,Unit>();
 private selection=new Set<number>();private selectedBuilding:number|undefined;private selectedBoat:number|undefined;
 constructor(){
  this.game=new Proxy(this.raw,{
   get:(target,key)=>{
    if(key==='selectedBoat')return this.selectedBoat??null;
    if(key==='selectedUnits')return()=>this.wrap([...this.units.values()].filter(u=>this.selection.has(u.id)&&u.hp>0&&u.team===0));
    if(key==='navigationRevision')return()=>this.packet?.navigationRevision??0;
    const value=Reflect.get(target,key,target);
    if(typeof value==='function'){
     if(!queries.has(String(key)))return()=>{throw new Error(`Game.${String(key)} is unavailable on the worker read-only projection`);};
     return(...args:unknown[])=>this.wrap(Reflect.apply(value,this.game,args));
    }
    return this.wrap(value);
   },
   set(){throw new Error('Worker projection is read-only; dispatch an authoritative command');},
   deleteProperty(){throw new Error('Worker projection is read-only');},defineProperty(){throw new Error('Worker projection is read-only');},setPrototypeOf(){throw new Error('Worker projection is read-only');},
  });
 }
 setDisplaySettings(quality:Game['quality'],fps:number){this.raw.quality=quality;this.raw.fps=fps;}
 get hud(){if(!this.packet)throw new Error('Presentation is not ready');return this.wrap(this.packet.hud);}
 apply(packet:SimulationPresentation,clock:SimulationClock){
  if(clock.stateRevision<this.revision)return;
  if(!this.packet&&!packet.world)throw new Error('First presentation requires owned terrain');
  if(packet.world)this.raw.world=packet.world;
  this.packet=packet;this.revision=clock.stateRevision;this.raw.state=packet.state;
  this.raw.world.waterY=packet.worldWaterY;this.raw.world.camps=packet.worldCamps;
  this.raw.vision=packet.vision;this.raw.territory=packet.territory;this.raw.territoryStrength=packet.territoryStrength;
  this.raw.started=packet.started;this.raw.awaitingStart=packet.awaitingStart;this.raw.testMode=packet.testMode;this.raw.revealMap=packet.revealMap;
  this.raw.chopMarks=new Set(packet.chopMarks);this.raw.looted=new Set(packet.looted);
  // travelHeight's private bridge list is a read cache, reconstructed from actual membership.
  Object.assign(this.raw,{bridges:packet.state.buildings.filter(b=>!!b.bridge)});
  this.units=new Map(packet.state.units.map(u=>[u.id,u]));this.applySelection();
 }
 select(unitIds:readonly number[],buildingId?:number,boatId?:number){this.selection=new Set(unitIds);this.selectedBuilding=buildingId;this.selectedBoat=boatId;this.applySelection();}
 private applySelection(){if(!this.packet)return;for(const u of this.raw.state.units)u.selected=this.selection.has(u.id);for(const b of this.raw.state.buildings)b.selected=b.id===this.selectedBuilding;this.raw.state.selBld=this.raw.state.buildings.find(b=>b.id===this.selectedBuilding)??null;}
 applyPose(frame:SimulationPoseFrame){
  if(!this.packet||frame.stateRevision<this.revision)return;
  for(let i=0;i<frame.count;i++){const u=this.units.get(frame.ids[i]);if(!u)continue;const k=i*frame.stride,p=frame.poses;u.x=p[k];u.y=p[k+1];u.z=p[k+2];u.facing=p[k+3];u.stride=p[k+4];u.hp=p[k+5];u.maxHp=p[k+6];u.vx=p[k+7];u.vz=p[k+8];}
  this.raw.state.time=frame.time;this.revision=frame.stateRevision;
 }
}
