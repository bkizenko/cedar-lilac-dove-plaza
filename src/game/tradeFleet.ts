import type {Game} from './sim';
import {waterNavigation} from './waterNavigation';
import {dockOf,portTier} from './navalPorts';
import {PORT_TIERS} from './navalClasses';
import {FOOD_PER_PERSON_SECOND} from './settlement';

/** Trade fleet rules (pure queries; the only state is `tradeCapacity`, a regenerating per-partner volume).
 * Ships are abstract trade parties, but they only ever travel along connected navigable water, their class
 * follows the society's age and harbour, and their cargo, crew and speed come from that class. */
type P={x:number;z:number};
export type ShipClass={id:string;name:string;minAge:number;minTier:0|1|2|3;cargo:number;crew:number;speed:number;parts:readonly ('hull'|'sail'|'oars'|'deck'|'mast2')[]};
export const SHIP_CLASSES:readonly ShipClass[]=Object.freeze([
 {id:'raft',name:'Log raft',minAge:0,minTier:0,cargo:16,crew:2,speed:.55,parts:['hull','oars']},
 {id:'dugout',name:'Dugout canoe',minAge:0,minTier:1,cargo:30,crew:3,speed:.7,parts:['hull','oars']},
 {id:'sailboat',name:'Sailing boat',minAge:1,minTier:1,cargo:60,crew:4,speed:1,parts:['hull','sail','oars']},
 {id:'trader',name:'Trading ship',minAge:2,minTier:2,cargo:120,crew:6,speed:1.25,parts:['hull','sail','deck','oars']},
 {id:'merchantman',name:'Merchant ship',minAge:3,minTier:2,cargo:220,crew:9,speed:1.5,parts:['hull','sail','deck','mast2']},
 {id:'cog',name:'Cog',minAge:4,minTier:2,cargo:340,crew:12,speed:1.6,parts:['hull','sail','deck','mast2']},
 {id:'galleon',name:'Galleon',minAge:5,minTier:3,cargo:520,crew:18,speed:1.85,parts:['hull','sail','deck','mast2']},
]);
export const shipClassById=(id?:string)=>SHIP_CLASSES.find(c=>c.id===id);
/** Raft up to merchant ship by age and the best harbour the society has. */
export function bestShipClass(g:Game,team:number):ShipClass{
 const age=g.tribe(team)?.age??0,tier=bestDockTier(g,team);let best=SHIP_CLASSES[0];
 for(const c of SHIP_CLASSES)if(c.minAge<=age&&c.minTier<=tier)best=c;return best;
}
/** Foreign traders' hulls follow only their society's age. */
export const shipClassForAge=(age:number)=>[...SHIP_CLASSES].reverse().find(c=>c.minAge<=age&&c.id!=='dugout'||c.id==='raft'&&age<=0)??SHIP_CLASSES[0];
const docks=(g:Game,team:number)=>g.state.buildings.filter(b=>b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b));
export function bestDockTier(g:Game,team:number){let t=0;for(const d of docks(g,team))t=Math.max(t,portTier(g,d));return t;}
/** Boat slots: the moorage of every finished harbour. Landings hold 2, harbours 5, shipyards 7, naval bases 10. */
export function harbourSlots(g:Game,team:number){return docks(g,team).reduce((n,d)=>n+PORT_TIERS[portTier(g,d)].moorage,0);}
/** More slots mean more traders call and better terms, capped so a huge harbour is not a money machine. */
export const harbourFrequencyBonus=(slots:number)=>Math.min(.2,.02*slots);
export const harbourDealBonus=(slots:number)=>Math.min(.12,.012*slots);
export const provisionsFor=(crew:number,seconds:number)=>Math.max(1,Math.ceil(crew*seconds*FOOD_PER_PERSON_SECOND));
void dockOf;

// ---- Water routes ------------------------------------------------------------------------------------------
const wet=(g:Game,x:number,z:number)=>g.height(x,z)<g.waterAt(x,z)+.3;
export type SeaRoute={points:P[];length:number};
/** A smoothed path over connected navigable water, or null when the two places share no water. Pure and exact. */
const routeCache=new WeakMap<object,Map<string,SeaRoute|null>>();
export function waterRoute(g:Game,from:P,to:P):SeaRoute|null{
 const nav=waterNavigation(g,true);let cache=routeCache.get(nav);if(!cache)routeCache.set(nav,cache=new Map());
 const key=`${Math.round(from.x)},${Math.round(from.z)},${Math.round(to.x)},${Math.round(to.z)}`;if(cache.has(key))return cache.get(key)!;
 const r=computeRoute(g,nav,from,to);if(cache.size>64)cache.clear();cache.set(key,r);return r;
}
function computeRoute(g:Game,nav:ReturnType<typeof waterNavigation>,from:P,to:P):SeaRoute|null{
 const w=nav.width,size=g.world.size,cell=size/w,half=size/2;
 const idx=(x:number,z:number)=>Math.floor((z+half)/cell)*w+Math.floor((x+half)/cell);
 const ok=(i:number)=>i>=0&&i<nav.labels.length&&nav.labels[i]>0;
 const near=(p:P,radiusMetres:number,label?:number)=>{let best=-1,score=Infinity;const r=Math.ceil(radiusMetres/cell);
  for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const x=p.x+dx*cell,z=p.z+dz*cell;if(Math.abs(x)>=half||Math.abs(z)>=half)continue;const i=idx(x,z);if(!ok(i)||label!==undefined&&nav.labels[i]!==label||!wet(g,x,z))continue;const d=dx*dx+dz*dz;if(d<score){score=d;best=i;}}
  return best;};
 const s=near(from,60);if(s<0)return null;const label=nav.labels[s],t=near(to,60,label);if(t<0)return null;
 const n=nav.labels.length,prev=new Int32Array(n).fill(-1),seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;queue[tail++]=s;seen[s]=1;
 while(head<tail&&!seen[t]){const i=queue[head++],ix=i%w,iz=(i/w)|0;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const jx=ix+dx,jz=iz+dz;if(jx<0||jz<0||jx>=w||jz>=w)continue;const j=jz*w+jx;if(seen[j]||nav.labels[j]!==label)continue;
   if(dx&&dz&&(nav.labels[iz*w+jx]!==label||nav.labels[jz*w+ix]!==label))continue;seen[j]=1;prev[j]=i;queue[tail++]=j;}}
 if(!seen[t])return null;
 const at=(i:number):P=>({x:-half+(i%w+.5)*cell,z:-half+(((i/w)|0)+.5)*cell}),cells:P[]=[];for(let i=t;i>=0;i=prev[i])cells.push(at(i));cells.reverse();
 // String-pulling: keep a corner only where the straight line would leave the water.
 const clear=(a:P,b:P)=>{const len=Math.hypot(b.x-a.x,b.z-a.z),k=Math.max(1,Math.ceil(len/(cell*.5)));for(let q=1;q<k;q++){const x=a.x+(b.x-a.x)*q/k,z=a.z+(b.z-a.z)*q/k;if(nav.labels[idx(x,z)]!==label||!wet(g,x,z))return false;}return true;};
 const pts:P[]=[{x:from.x,z:from.z},cells[0]];let anchor=0;
 for(let i=2;i<cells.length;i++)if(!clear(cells[anchor],cells[i])){pts.push(cells[i-1]);anchor=i-1;}
 pts.push(cells[cells.length-1],{x:to.x,z:to.z});
 const out=pts.length>60?pts.filter((_,i)=>i%Math.ceil(pts.length/59)===0||i===pts.length-1):pts;
 return{points:out,length:out.slice(1).reduce((a,p,i)=>a+Math.hypot(p.x-out[i].x,p.z-out[i].z),0)};
}
/** Point and heading a fraction `f` (0..1) along a polyline. */
export function alongRoute(points:readonly P[],f:number){
 const lens=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z)),total=lens.reduce((a,b)=>a+b,0)||1;let left=Math.max(0,Math.min(1,f))*total;
 for(let i=0;i<lens.length;i++){if(left<=lens[i]||i===lens.length-1){const k=lens[i]?Math.min(1,left/lens[i]):1,a=points[i],b=points[i+1];return{x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,dx:b.x-a.x,dz:b.z-a.z};}left-=lens[i];}
 const a=points[0];return{x:a.x,z:a.z,dx:0,dz:0};
}

// ---- Partner trade capacity --------------------------------------------------------------------------------
export const TRADE_CAPACITY_RULES={base:30,perResident:2,residentCap:50,perMarket:10,regenSeconds:1200,minimumVisitorOffer:4} as const;
/** Largest volume of goods a partner can trade in one stretch: a small village is soon exhausted. */
export function tradeCapacityMax(g:Game,team:number){
 const pop=g.state.units.filter(u=>u.team===team&&u.hp>0).length,markets=g.state.buildings.filter(b=>b.team===team&&b.type==='market'&&b.hp>0&&g.finished(b)).length;
 return TRADE_CAPACITY_RULES.base+TRADE_CAPACITY_RULES.perResident*Math.min(TRADE_CAPACITY_RULES.residentCap,pop)+TRADE_CAPACITY_RULES.perMarket*markets;
}
/** Remaining volume; regenerates slowly from the last time it was spent. */
export function tradeCapacityLeft(g:Game,team:number){
 const max=tradeCapacityMax(g,team),row=g.state.tradeCapacity?.[team];if(!row)return max;
 return Math.min(max,row.left+Math.max(0,g.state.time-row.at)*max/TRADE_CAPACITY_RULES.regenSeconds);
}
export function spendTradeCapacity(g:Game,team:number,amount:number){
 const left=Math.max(0,tradeCapacityLeft(g,team)-Math.max(0,amount));(g.state.tradeCapacity??={})[team]={left,at:g.state.time};return left;
}
export const tradeCapacityRefillSeconds=(g:Game,team:number)=>{const max=tradeCapacityMax(g,team),left=tradeCapacityLeft(g,team);return Math.ceil((max-left)*TRADE_CAPACITY_RULES.regenSeconds/max);};

/** Land cargo: a few carriers by hand, plus beasts of burden (tamed goats) and carts the society actually owns. */
export function landCargoLimit(g:Game){
 const goats=(g.state.livestock||[]).filter(a=>a.team===0&&a.hp>0&&a.species==='goat'&&a.sex!==undefined).length,carts=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.draftCart).length+(g.state.looseDraftCarts||[]).filter(c=>c.team===0).length;
 return 20+12*Math.min(4,goats)+30*Math.min(2,carts);
}
