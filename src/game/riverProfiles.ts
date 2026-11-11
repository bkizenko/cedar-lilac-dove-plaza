import {lakeContains,type LocalWaterBody} from './localWater';

/** GW-12 river profile v2 (Grok W-World). Opt-in per world via
 * `WorldOptions.riverProfileVersion===2`, which is saved with the world, so
 * existing saves (absent flag) regenerate byte-identically.
 *
 * A river whose mouth lies inside a lake must arrive at or above that lake's
 * surface: otherwise its last reach sits below the lake it feeds and the water
 * visibly steps up into the lake (measured 0.07–0.15 m on the composed
 * tributary in 9/24 v18 worlds). Raising every point to at least the lake
 * surface keeps a non-increasing profile non-increasing. */
export const RIVER_PROFILE_RULES={version:2,entrySampleMetres:2} as const;
/** Returns a new array; settled rivers are copies, so a cached geography is never mutated.
 * Rule: upstream of the first point where a river's course enters a lake it does not
 * rise from, the river surface is at least that lake's surface; a point is inserted at
 * the entry so the interpolated surface cannot dip below the lake there. Rivers that
 * leave a lake afterwards may descend again (the lake's outflow). */
export function settleRiverInflows(bodies:readonly LocalWaterBody[]){
 const lakes=bodies.filter((b):b is Extract<LocalWaterBody,{kind:'lake'}>=>b.kind==='lake');let raised=0;
 const out=bodies.map(river=>{if(river.kind!=='river'||river.pts.length<2)return river;const P=river.pts;
  const fed=lakes.filter(l=>!lakeContains(l,P[0].x,P[0].z));if(!fed.length)return river;
  // last sampled position of the course inside a fed lake (its final exit or its mouth)
  let last:{i:number;t:number;S:number}|null=null;
  for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/RIVER_PROFILE_RULES.entrySampleMetres));
   for(let k=1;k<=steps;k++){const t=k/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,lake=fed.find(l=>lakeContains(l,x,z));if(lake)last={i,t,S:Math.max(lake.surfaceY,last&&last.i===i&&last.t===t?last.S:-Infinity)};}}
  if(!last)return river;const {i,t,S}=last,a=P[i],b=P[i+1],before=raised;
  const lift=(p:typeof a)=>{if(p.y>=S)return p;raised++;return{...p,y:S};};
  const head=P.slice(0,i+1).map(lift);let tail=P.slice(i+1);
  if(t>=1)tail=[lift(tail[0]),...tail.slice(1)];
  else{const y=a.y+(b.y-a.y)*t;if(y<S){raised++;tail=[{...a,x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:S,...(a.w!==undefined&&b.w!==undefined?{w:a.w+(b.w-a.w)*t}:{})},...tail];}}
  return raised>before?{...river,pts:[...head,...tail]}:river;});
 return{bodies:out,raised};
}
