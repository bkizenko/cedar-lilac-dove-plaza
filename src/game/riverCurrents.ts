import type {Game} from './sim';
import {lakeContains,type LocalWaterBody,type LakeBody} from './localWater';

/** River currents (GW-06, Grok W-World, W7). Pure query, no save state.
 * Direction: downstream along the river polyline (points run source → mouth).
 * Speed: Manning's formula on the real water surface the game reports,
 *   v = R^(2/3) · S^(1/2) / n,
 * with S = the surface fall per metre measured over ±`slopeMetres` along the
 * channel (rises count as 0: a pool), R ≈ depth (water surface − bed at the point,
 * 0.2–3 m) and n = 0.045 (natural channel with a rough, stony bed). Slack water at the banks: the speed
 * falls off across the channel. Lakes and the sea have no current here.
 * Hooks: `currentPowerKw` for undershot wheels (½ρAv³η), `driftAt` for boats. */
export const RIVER_CURRENT_RULES={version:1,manningN:.045,slopeMetres:15,minDepthMetres:.2,maxDepthMetres:3,minSpeed:.05,maxSpeed:4,bankFalloff:.5,waterDensity:1000,wheelEfficiency:.3,wheelWidthMetres:2,wheelImmersionMetres:.6} as const;
type River=Extract<LocalWaterBody,{kind:'river'}>;
type G=Pick<Game,'world'|'height'|'waterAt'>;
export type Current={riverId:string;vx:number;vz:number;speed:number;slope:number;depthMetres:number;along:number;offsetMetres:number;halfWidth:number};
const rivers=(g:G)=>(g.world.waterBodies||[]).filter(b=>b.kind==='river') as River[];
/** Nearest point on a river channel (inside its width), with the chainage along it. */
function locate(r:River,x:number,z:number){let best:{d:number;s:number;k:number;t:number;w:number}|null=null,acc=0;
 for(let k=1;k<r.pts.length;k++){const a=r.pts[k-1],b=r.pts[k],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz,len=Math.sqrt(len2);if(len<1e-3){continue;}
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len2)),d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz),w=(a.w??r.width)+((b.w??r.width)-(a.w??r.width))*t;
  if(d<=w*.5&&(!best||d<best.d))best={d,s:acc+t*len,k,t,w};acc+=len;}
 return best;}
function pointAt(r:River,s:number){let acc=0;for(let k=1;k<r.pts.length;k++){const a=r.pts[k-1],b=r.pts[k],len=Math.hypot(b.x-a.x,b.z-a.z);if(acc+len>=s||k===r.pts.length-1){const t=len?Math.max(0,Math.min(1,(s-acc)/len)):0;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}acc+=len;}return{x:r.pts[0].x,z:r.pts[0].z};}
const lengthOf=(r:River)=>r.pts.slice(1).reduce((a,p,i)=>a+Math.hypot(p.x-r.pts[i].x,p.z-r.pts[i].z),0);
export function currentAt(g:G,x:number,z:number):Current|null{
 const C=RIVER_CURRENT_RULES;let hit:{r:River;l:NonNullable<ReturnType<typeof locate>>}|null=null;
 for(const r of rivers(g)){const l=locate(r,x,z);if(l&&(!hit||l.d<hit.l.d))hit={r,l};}
 if(!hit||g.height(x,z)>=g.waterAt(x,z))return null;
 if((g.world.waterBodies||[]).some(b=>b.kind==='lake'&&lakeContains(b as LakeBody,x,z)))return null; // still water
 const {r,l}=hit,a=r.pts[l.k-1],b=r.pts[l.k],len=Math.hypot(b.x-a.x,b.z-a.z),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len,L=lengthOf(r);
 const s0=Math.max(0,l.s-C.slopeMetres),s1=Math.min(L,l.s+C.slopeMetres),p0=pointAt(r,s0),p1=pointAt(r,s1);
 // a waterfall inside the window is a drop, not a slope: take its height out
 let drop=0;for(const f of g.world.waterfalls||[]){const at=locate(r,f.x,f.z)??(()=>{let best=Infinity,sb=0,acc=0;for(let k=1;k<r.pts.length;k++){const A=r.pts[k-1],B=r.pts[k],dx=B.x-A.x,dz=B.z-A.z,l2=dx*dx+dz*dz,ln=Math.sqrt(l2);if(ln<1e-3)continue;const t=Math.max(0,Math.min(1,((f.x-A.x)*dx+(f.z-A.z)*dz)/l2)),d=Math.hypot(f.x-A.x-t*dx,f.z-A.z-t*dz);if(d<best){best=d;sb=acc+t*ln;}acc+=ln;}return best<r.width?{s:sb}:null;})();
  if(at&&at.s>=s0&&at.s<=s1)drop+=Math.max(0,f.upperY-f.lowerY);}
 const fall=g.waterAt(p0.x,p0.z)-g.waterAt(p1.x,p1.z)-drop,slope=Math.max(0,fall/Math.max(1,s1-s0));
 const depth=Math.min(C.maxDepthMetres,Math.max(C.minDepthMetres,g.waterAt(x,z)-g.height(x,z)));
 const centre=Math.pow(Math.max(0,1-(l.d/(l.w*.5))**2),C.bankFalloff),v=Math.min(C.maxSpeed,Math.max(C.minSpeed,Math.pow(depth,2/3)*Math.sqrt(slope)/C.manningN*centre));
 return{riverId:r.id,vx:ux*v,vz:uz*v,speed:+v.toFixed(3),slope:+slope.toFixed(5),depthMetres:+depth.toFixed(2),along:+l.s.toFixed(1),offsetMetres:+l.d.toFixed(2),halfWidth:l.w*.5};
}
/** Undershot wheel power from the current alone (kW): ½·ρ·A·v³·η, A = wheel width × immersion. */
export function currentPowerKw(g:G,x:number,z:number){const C=RIVER_CURRENT_RULES,c=currentAt(g,x,z);if(!c)return 0;const A=C.wheelWidthMetres*Math.min(C.wheelImmersionMetres,c.depthMetres);return +(.5*C.waterDensity*A*c.speed**3*C.wheelEfficiency/1000).toFixed(3);}
/** Boat drift (m/s): the current vector, zero off rivers. */
export function driftAt(g:G,x:number,z:number){const c=currentAt(g,x,z);return c?{x:c.vx,z:c.vz}:{x:0,z:0};}
/** Samples along every river's centreline (for maps, Experience arrows and checks). */
export function riverCurrentProfile(g:G,stepMetres=10){const out:(Current&{x:number;z:number})[]=[];for(const r of rivers(g)){const L=lengthOf(r);for(let s=0;s<=L;s+=stepMetres){const p=pointAt(r,s),c=currentAt(g,p.x,p.z);if(c&&c.riverId===r.id)out.push({...c,x:p.x,z:p.z});}}return out;}
