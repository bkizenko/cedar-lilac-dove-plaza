import type {Game} from './sim';

/** Measured scenic beauty (GW-15, Grok W-World, W7). Pure query, no save state.
 * A terrain viewshed from eye height (1.7 m) on `rays` bearings out to `rangeMetres`
 * (terrain and water surface; vegetation is not an occluder here). Components:
 * - rise: mean over bearings of the highest visible ground above the eye (mountain walls),
 * - peak: the highest visible rise anywhere (a summit in view),
 * - water: share of bearings that see water (lakes, rivers, sea),
 * - layers: mean count of separate visible ridges per bearing (receding planes),
 * - overlook: mean depth of the lowest visible ground below the eye (a vista over a valley),
 * - openness: share of bearings not hemmed in within 60 m.
 * The score is map-relative: each component is ranked against the map's own dry
 * land, and the beauty percentile is the rank of the weighted mean. */
export const SCENIC_RULES={version:1,eyeMetres:1.7,rays:24,rangeMetres:360,stepMetres:6,surveyMetres:24,hemMetres:60,hemTan:.12,
 weights:{rise:.22,peak:.13,water:.25,layers:.15,overlook:.15,openness:.1},startSearchMetres:160} as const;
type G=Pick<Game,'world'|'height'|'waterAt'>;
export type Vista={rise:number;peak:number;water:number;layers:number;overlook:number;openness:number};
const surface=(g:G,x:number,z:number)=>Math.max(g.height(x,z),g.waterAt(x,z));
export function vistaAt(g:G,x:number,z:number):Vista{
 const R=SCENIC_RULES,eye=g.height(x,z)+R.eyeMetres,half=(g.world.size??1040)/2;let rise=0,peak=0,water=0,layers=0,overlook=0,open=0;
 for(let i=0;i<R.rays;i++){const a=i/R.rays*Math.PI*2,dx=Math.sin(a),dz=Math.cos(a);let maxTan=-Infinity,hi=-Infinity,lo=Infinity,sawWater=false,wasVisible=true,ridges=0,hem=false;
  for(let r=R.stepMetres;r<=R.rangeMetres;r+=R.stepMetres){const px=x+dx*r,pz=z+dz*r;if(Math.abs(px)>half||Math.abs(pz)>half)break;const y=surface(g,px,pz),tan=(y-eye)/r;
   const visible=tan>=maxTan;if(visible){maxTan=tan;hi=Math.max(hi,y-eye);lo=Math.min(lo,y-eye);if(g.height(px,pz)<g.waterAt(px,pz))sawWater=true;if(!wasVisible)ridges++;}
   wasVisible=visible;if(r<=R.hemMetres&&tan>R.hemTan)hem=true;}
  rise+=Math.max(0,hi);peak=Math.max(peak,hi);water+=sawWater?1:0;layers+=ridges;overlook+=Math.max(0,-lo);open+=hem?0:1;}
 const n=R.rays;return{rise:rise/n,peak:Math.max(0,peak),water:water/n,layers:layers/n,overlook:overlook/n,openness:open/n};
}
export type ScenicSurvey={points:{x:number;z:number;v:Vista;score:number}[];percentileOf:(v:Vista)=>number};
/** The map's own dry land on a grid, scored; `percentileOf` ranks any vista against it. */
export function scenicSurvey(g:G,step:number=SCENIC_RULES.surveyMetres):ScenicSurvey{
 const R=SCENIC_RULES,half=(g.world.size??1040)/2-step,pts:{x:number;z:number;v:Vista}[]=[];
 for(let z=-half;z<=half;z+=step)for(let x=-half;x<=half;x+=step)if(g.height(x,z)>g.waterAt(x,z)+.5)pts.push({x,z,v:vistaAt(g,x,z)});
 const keys=Object.keys(R.weights) as (keyof Vista)[],sorted=Object.fromEntries(keys.map(k=>[k,pts.map(p=>p.v[k]).sort((a,b)=>a-b)])) as Record<keyof Vista,number[]>;
 const rankIn=(arr:number[],v:number)=>{let lo=0,hi=arr.length;while(lo<hi){const m=(lo+hi)>>1;if(arr[m]<v)lo=m+1;else hi=m;}let up=lo;while(up<arr.length&&arr[up]===v)up++;return arr.length?((lo+up)/2)/arr.length:0;};
 const raw=(v:Vista)=>keys.reduce((a,k)=>a+R.weights[k]*rankIn(sorted[k],v[k]),0);
 const scored=pts.map(p=>({...p,score:raw(p.v)})),scores=scored.map(p=>p.score).sort((a,b)=>a-b);
 return{points:scored,percentileOf:(v:Vista)=>+(100*rankIn(scores,raw(v))).toFixed(1)};
}
/** Where the player starts on the beauty scale, and the best valid site nearby
 * (dry foundation for a town hall, gentle ground) — for Codex's opening-site pick. */
export function scenicStartReport(g:Game,survey:ScenicSurvey=scenicSurvey(g)){
 const R=SCENIC_RULES,us=g.state.units.filter(u=>u.team===0);if(!us.length)return null;
 const sx=us.reduce((a,u)=>a+u.x,0)/us.length,sz=us.reduce((a,u)=>a+u.z,0)/us.length,start=vistaAt(g,sx,sz),startPct=survey.percentileOf(start);
 let best:{x:number;z:number;percentile:number;distanceMetres:number}|null=null;
 for(const p of survey.points){const d=Math.hypot(p.x-sx,p.z-sz);if(d>R.startSearchMetres)continue;
  const gentle=Math.abs(g.height(p.x+6,p.z)-g.height(p.x-6,p.z))<2&&Math.abs(g.height(p.x,p.z+6)-g.height(p.x,p.z-6))<2;if(!gentle||!g.dryFoundation('townhall',p.x,p.z))continue;
  const pct=survey.percentileOf(p.v);if(!best||pct>best.percentile)best={x:p.x,z:p.z,percentile:pct,distanceMetres:+d.toFixed(0)};}
 return{start:{x:+sx.toFixed(1),z:+sz.toFixed(1),percentile:startPct,vista:start},bestNearby:best,surveyPoints:survey.points.length};
}
