import type {Game} from './sim';
import {soilQuality,riverDistance} from './ecology';
import {geographicInfluenceAt} from './influenceField';

/** GW-09 land value and claims (Grok W-World). A physical value per territory cell
 * (the same 192² grid as `g.territory`) so that valuable land — soil, fresh water,
 * finite resources still standing, worn routes and crossings — counts for more than
 * empty ground. Codex owns how (or whether) this enters score/prestige; this module
 * only measures. Simulation-side truth: any player-facing display must be limited
 * to what that player has explored. */
export const LAND_VALUE_RULES={version:1,soil:1,freshwaterMetres:40,freshwater:.6,
 resource:{trees:.15,stones:.35,forage:.25,fish:.2,copper:1,iron:1.2} as Record<string,number>,resourceCap:3,
 trailWear:.4,crossing:1.5,contested:254,unclaimed:255} as const;
const staticCache=new WeakMap<object,{key:string;value:Float32Array}>();

/** Soil + fresh water per cell; cached per world and excavation count. */
function staticValue(g:Game,n:number){
 const key=`${n}|${g.state.excavations?.length??0}`,old=staticCache.get(g.world);if(old?.key===key)return old.value;
 const R=LAND_VALUE_RULES,cell=g.world.size/n,v=new Float32Array(n*n);
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const x=-g.world.size/2+(ix+.5)*cell,z=-g.world.size/2+(iz+.5)*cell;
  if(g.height(x,z)<g.waterAt(x,z)+.1){v[iz*n+ix]=0;continue;}
  v[iz*n+ix]=R.soil*soilQuality(g,x,z)+R.freshwater*Math.max(0,1-riverDistance(g,x,z)/R.freshwaterMetres);}
 staticCache.set(g.world,{key,value:v});return v;
}

export function landValueField(g:Game){
 const R=LAND_VALUE_RULES,n=Math.round(Math.sqrt(g.territory.length)),cell=g.world.size/n,base=staticValue(g,n),value=base.slice();
 const at=(x:number,z:number)=>{const ix=Math.floor((x+g.world.size/2)/cell),iz=Math.floor((z+g.world.size/2)/cell);return ix<0||iz<0||ix>=n||iz>=n?-1:iz*n+ix;};
 const res=new Float32Array(n*n);
 for(const kind of Object.keys(R.resource)){const nodes=(g.state as unknown as Record<string,{x:number;z:number;amount:number;maxAmt?:number}[]|undefined>)[kind];if(!nodes)continue;
  for(const node of nodes){if(!(node.amount>0))continue;const i=at(node.x,node.z);if(i<0)continue;res[i]+=R.resource[kind]*Math.min(1,node.amount/Math.max(1,node.maxAmt??node.amount));}}
 for(let i=0;i<res.length;i++)value[i]+=Math.min(R.resourceCap,res[i]);
 for(const t of g.state.trails??[]){if(t.x===undefined||t.z===undefined)continue;const i=at(t.x,t.z);if(i>=0)value[i]+=R.trailWear*Math.min(1,t.wear);}
 for(const b of g.state.buildings)if((b.type==='bridge'||b.type==='dock')&&b.hp>0&&g.finished(b)){const i=at(b.x,b.z);if(i>=0)value[i]+=R.crossing;}
 return{n,cellMetres:cell,value};
}

export type ClaimSummary={team:number;cells:number;areaSquareMetres:number;value:number;contestedCells:number;contestedValue:number;contestedWith:Record<number,number>};
/** Per-team owned and contested land value from the painted territory. Contested
 * cells (254) are attributed to every team whose influence reaches them. */
export function claimSummary(g:Game){
 const R=LAND_VALUE_RULES,{n,cellMetres,value}=landValueField(g),out=new Map<number,ClaimSummary>();
 const get=(team:number)=>{let s=out.get(team);if(!s){s={team,cells:0,areaSquareMetres:0,value:0,contestedCells:0,contestedValue:0,contestedWith:{}};out.set(team,s);}return s;};
 // Snapshot: influence queries may repaint g.territory while we iterate.
 const territory=g.territory.slice(),teams=g.state.tribes.map((_,i)=>i).filter(t=>t!==3);
 for(let i=0;i<territory.length;i++){const o=territory[i];if(o===R.unclaimed)continue;
  if(o!==R.contested){const s=get(o);s.cells++;s.value+=value[i];continue;}
  const x=-g.world.size/2+((i%n)+.5)*cellMetres,z=-g.world.size/2+(Math.floor(i/n)+.5)*cellMetres;
  const present=teams.filter(t=>(geographicInfluenceAt(g,x,z,t)||0)>.0001);
  for(const t of present){const s=get(t);s.contestedCells++;s.contestedValue+=value[i];for(const o2 of present)if(o2!==t)s.contestedWith[o2]=(s.contestedWith[o2]??0)+1;}}
 for(const s of out.values()){s.areaSquareMetres=s.cells*cellMetres*cellMetres;s.value=+s.value.toFixed(2);s.contestedValue=+s.contestedValue.toFixed(2);}
 return[...out.values()].sort((a,b)=>a.team-b.team);
}
