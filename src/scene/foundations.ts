import {expandedGrainWorkplace} from '../game/plots';
import{buildingGroundContacts,groundEntryFor,type GroundContact}from'./groundContacts';
import{foundationLevel,FOUNDATION_RULES}from'../game/siteFoundation';
import type {Game} from '../game/sim';
import type {Building,BldType} from '../game/types';
import type {GroundPlan} from './groundPlan';
/** The ground plan of a carved building in its drawn orientation (yaw). Supplied by the world view, which knows how a building is really drawn; null for anything drawn from the classic kit. */
export type DrawnGroundPlan=GroundPlan&{yaw:number};
let planProvider:((g:Game,b:Building)=>DrawnGroundPlan|null)|null=null;
export function setGroundPlanProvider(fn:((g:Game,b:Building)=>DrawnGroundPlan|null)|null){planProvider=fn;}
export function groundPlanFor(g:Game,b:Building):DrawnGroundPlan|null{return planProvider?planProvider(g,b):null;}
/** Ground-laid work areas follow the actual earth instead of becoming raised rooms. */
export function terrainLaidWorkplace(type:BldType){return type==='hearth'||type==='threshingFloor';}
import {TEAM_STYLE} from '../game/constants';
const groundWork=new Set(['farm','pen','dock','bridge','lumber','quarry','grove','cairn','cornerstone','palisade','gate','stonewall','trench','moat']);
const cache=new WeakMap<Building,{plan:DrawnGroundPlan|null;world:Game['world'];banks:Game['world']['bankTerrain'];height:Game['height'];contacts:readonly GroundContact[]|undefined;terrainRevision:number;team:number;heights:Float32Array;w:number;d:number;x:number;z:number;axisAligned:boolean;foundation?:string;profile:{level:number;bottom:number}}>();
/** Rigid walls sit above their highest footprint corner; a footing fills below. */
export function foundationProfile(g:Game,b:Building){
 if(terrainLaidWorkplace(b.type)){const level=g.height(b.x,b.z);return {level,bottom:level};}
 if(groundWork.has(b.type))return {level:b.y,bottom:b.y};
 const plan=groundPlanFor(g,b);
 const axisAligned=b.type==='warehouse'||expandedGrainWorkplace(b)||b.type==='watchtower'&&!!b.towerPlatform;
 const terrainRevision=g.terrainRevision?.()??g.state?.excavations?.length??0;
 const contacts=plan||b.type==='watchtower'&&b.towerPlatform?undefined:buildingGroundContacts(b);
 const old=cache.get(b);if(old&&old.plan===plan&&old.contacts===contacts&&old.world===g.world&&old.banks===g.world.bankTerrain&&old.height===g.height&&old.terrainRevision===terrainRevision&&old.team===b.team&&old.heights===g.world.heights&&old.w===b.w&&old.d===b.d&&old.x===b.x&&old.z===b.z&&old.axisAligned===axisAligned&&old.foundation===b.site?.foundation)return old.profile;
 const st=TEAM_STYLE[b.team]||TEAM_STYLE[0],yaw=plan?plan.yaw:axisAligned?0:st.yaw,co=Math.cos(yaw),si=Math.sin(yaw);
 const sx=plan||axisAligned?1:st.sx,sz=plan||axisAligned?1:st.sz;
 let top=-Infinity,bottom=Infinity,sum=0,count=0;
 const take=(x:number,z:number)=>{const h=g.height(b.x+co*x*sx+si*z*sz,b.z-si*x*sx+co*z*sz);top=Math.max(top,h);bottom=Math.min(bottom,h);sum+=h;count++;};
 if(plan&&(plan.polys.length||plan.piers.length)){
  // the real outline of the drawn model: a 5 x 5 lattice over each wall mass (and every leg)
  for(const poly of plan.polys){let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const q of poly){x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);z0=Math.min(z0,q.z);z1=Math.max(z1,q.z);}
   for(let iz=0;iz<=4;iz++)for(let ix=0;ix<=4;ix++)take(x0+(x1-x0)*ix/4,z0+(z1-z0)*iz/4);}
  for(const pr of plan.piers)take(pr.x,pr.z);
 }
 else if(contacts?.length){for(const line of contacts){const n=Math.max(1,Math.ceil(Math.hypot(line.bx-line.ax,line.bz-line.az)/.25));for(let i=0;i<=n;i++)take(line.ax+(line.bx-line.ax)*i/n,line.az+(line.bz-line.az)*i/n);}}
 else for(let iz=-2;iz<=2;iz++)for(let ix=-2;ix<=2;ix++)take(ix*b.w*.25,iz*b.d*.25);
 const entry=plan?.entry??(b.site?.foundation==='dugout'?groundEntryFor(b.type):undefined),wantDoor=!!plan||b.site?.foundation==='dugout';
 // the ground just outside the door (half a metre out), so an uphill door is not buried and a downhill one gets steps
 const door=wantDoor&&entry?g.height(b.x+co*entry.x*sx+si*(entry.z+(plan?.5:0))*sz,b.z-si*entry.x*sx+co*(entry.z+(plan?.5:0))*sz):undefined;
 const mean=plan&&count?sum/count:undefined;
 const profile={level:foundationLevel(b.site?.foundation,top,bottom,door,mean,b.site?.foundation==='stilts'&&b.site.slope<FOUNDATION_RULES.pileBelowDegrees?FOUNDATION_RULES.pileLiftMetres:0),bottom:bottom-.03};
 const value={plan,contacts,world:g.world,banks:g.world.bankTerrain,height:g.height,terrainRevision,team:b.team,heights:g.world.heights,w:b.w,d:b.d,x:b.x,z:b.z,axisAligned,foundation:b.site?.foundation,profile};cache.set(b,value);return profile;
}
