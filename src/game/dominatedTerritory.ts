import type {Game} from './sim';
import {geographicInfluenceAt} from './influenceField';
import {LAND_VALUE_RULES,landValueField} from './landValue';

/** Territory and influence while a community is dominated (Grok W-World hook for
 * Claude Societies' tribute/puppet/autonomy). Reads `state.dominations` structurally,
 * so it works whether or not Societies' module is merged yet.
 *  - Ownership never transfers: Societies keeps buildings and residents with the
 *    subject, so painted territory stays the subject's.
 *  - An ACTIVE domination gives the overlord a sphere over the subject's own painted
 *    territory within the terms' radius (community 40 m, autonomy 120 m around the
 *    subject hall), with strength = terms weight × clamped leverage. Lapsed, released
 *    or rebelled arrangements have no sphere.
 *  - Third parties contesting the subject's land are reported: that is the overlord's
 *    protection obligation (Societies' unanswered-threat input).
 * Pure query; no shared-file wiring is needed. Sim-side truth: UI must clip to explored. */
export const DOMINATED_TERRITORY_RULES={version:1,radiusMetres:{tribute:40,puppet:40,autonomy:120},weight:{tribute:.5,puppet:.8,autonomy:.3}} as const;
type Terms=keyof typeof DOMINATED_TERRITORY_RULES.weight;
type DominationLike={id:number;overlord:number;subject:number;hallId:number;terms:Terms;phase:string;leverage:number};
export function activeDominations(g:Game):DominationLike[]{const list=(g.state as unknown as {dominations?:{list?:DominationLike[]}}).dominations?.list??[];return list.filter(d=>d&&d.phase==='active'&&d.terms in DOMINATED_TERRITORY_RULES.weight);}

export type DominationSphere={dominationId:number;overlord:number;subject:number;terms:Terms;strength:number;cells:number;areaSquareMetres:number;value:number;contestedCells:number;thirdParties:number[]};
export function dominationSpheres(g:Game):DominationSphere[]{
 const R=DOMINATED_TERRITORY_RULES,n=Math.round(Math.sqrt(g.territory.length)),cell=g.world.size/n,territory=g.territory.slice(),{value}=landValueField(g),out:DominationSphere[]=[];
 const teams=g.state.tribes.map((_,i)=>i).filter(t=>t!==3);
 for(const d of activeDominations(g)){const hall=g.state.buildings.find(b=>b.id===d.hallId&&b.hp>0);if(!hall||hall.team!==d.subject)continue;
  const r=R.radiusMetres[d.terms],strength=+(R.weight[d.terms]*Math.max(0,Math.min(1,d.leverage))).toFixed(3),s:DominationSphere={dominationId:d.id,overlord:d.overlord,subject:d.subject,terms:d.terms,strength,cells:0,areaSquareMetres:0,value:0,contestedCells:0,thirdParties:[]};
  const third=new Set<number>(),i0=Math.max(0,Math.floor((hall.x-r+g.world.size/2)/cell)),i1=Math.min(n-1,Math.floor((hall.x+r+g.world.size/2)/cell)),j0=Math.max(0,Math.floor((hall.z-r+g.world.size/2)/cell)),j1=Math.min(n-1,Math.floor((hall.z+r+g.world.size/2)/cell));
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=-g.world.size/2+(i+.5)*cell,z=-g.world.size/2+(j+.5)*cell;if(Math.hypot(x-hall.x,z-hall.z)>r)continue;const k=j*n+i,o=territory[k];
   if(o===d.subject){s.cells++;s.value+=value[k];continue;}
   if(o!==LAND_VALUE_RULES.contested)continue;
   if(!((geographicInfluenceAt(g,x,z,d.subject)||0)>.0001))continue;
   s.contestedCells++;for(const t of teams)if(t!==d.subject&&t!==d.overlord&&(geographicInfluenceAt(g,x,z,t)||0)>.0001)third.add(t);}
  s.areaSquareMetres=s.cells*cell*cell;s.value=+s.value.toFixed(2);s.thirdParties=[...third].sort((a,b)=>a-b);if(strength>0)out.push(s);}
 return out;
}
/** Overlord sphere at a point (strongest active domination), or null. */
export function sphereAt(g:Game,x:number,z:number){
 const R=DOMINATED_TERRITORY_RULES,n=Math.round(Math.sqrt(g.territory.length)),cell=g.world.size/n,i=Math.floor((x+g.world.size/2)/cell),j=Math.floor((z+g.world.size/2)/cell);if(i<0||j<0||i>=n||j>=n)return null;
 let best:{overlord:number;subject:number;terms:Terms;strength:number;dominationId:number}|null=null;
 for(const d of activeDominations(g)){const hall=g.state.buildings.find(b=>b.id===d.hallId&&b.hp>0);if(!hall||hall.team!==d.subject||g.territory[j*n+i]!==d.subject||Math.hypot(x-hall.x,z-hall.z)>R.radiusMetres[d.terms])continue;
  const strength=R.weight[d.terms]*Math.max(0,Math.min(1,d.leverage));if(strength>0&&(!best||strength>best.strength))best={overlord:d.overlord,subject:d.subject,terms:d.terms,strength:+strength.toFixed(3),dominationId:d.id};}
 return best;
}
