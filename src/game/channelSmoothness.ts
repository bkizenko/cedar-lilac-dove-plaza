import type {Game} from './sim';
import type {LocalWaterBody} from './localWater';

/** GW-12 smooth river display (Grok W-World, W7). Pure query, no save state,
 * no terrain edits, no change to wet/dry or pathing. Historic worlds stay
 * byte-identical. Claude opts in by drawing these polylines in place of the
 * raw centreline / a stairstep bank mesh.
 *
 * Banks are traced on the real waterline (height vs waterAt), then lightly
 * smoothed. Each smoothed bank point is clamped so it cannot wander more than
 * `maxDisplayDeviationMetres` from the physical edge: the visible water stays
 * consistent with the wet surface. */
export const CHANNEL_SMOOTH_RULES={version:1,sampleMetres:3,bankStepMetres:.25,bankSearchPadMetres:4,wetDepthMetres:.05,maxDisplayDeviationMetres:.75,chaikinPasses:2,axisRadians:.0873,widthJumpMetres:2} as const;
type G=Pick<Game,'world'|'height'|'waterAt'>;
type River=Extract<LocalWaterBody,{kind:'river'}>;
export type BankSample={x:number;z:number;s:number;width:number;left:{x:number;z:number};right:{x:number;z:number};wet:boolean};
export type ChannelMetrics={samples:number;wetSamples:number;meanWidthMetres:number;widthCv:number;widthJumps:number;staircaseFraction:number;meanBankJitterMetres:number;maxBankJitterMetres:number};
type Pt={x:number;z:number};

const rivers=(g:G)=>(g.world.waterBodies||[]).filter((b):b is River=>b.kind==='river');
const wet=(g:G,x:number,z:number)=>g.height(x,z)<g.waterAt(x,z)+CHANNEL_SMOOTH_RULES.wetDepthMetres;
function resample(path:readonly Pt[],step:number){const d=[0];for(let i=1;i<path.length;i++)d.push(d[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));const L=d.at(-1)!,n=Math.max(2,Math.ceil(L/step)),out:Pt[]=[];let j=1;
 for(let i=0;i<=n;i++){const t=L*i/n;while(j<path.length-1&&d[j]<t)j++;const u=(t-d[j-1])/Math.max(1e-9,d[j]-d[j-1]),a=path[j-1],b=path[j];out.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});}return{points:out,length:L};}
function chaikin(pts:readonly Pt[],passes:number){let cur=pts.slice();for(let p=0;p<passes;p++){if(cur.length<3)break;const next=[cur[0]];for(let i=0;i<cur.length-1;i++){const a=cur[i],b=cur[i+1];next.push({x:a.x*.75+b.x*.25,z:a.z*.75+b.z*.25},{x:a.x*.25+b.x*.75,z:a.z*.25+b.z*.75});}next.push(cur.at(-1)!);cur=next;}return cur;}
function heading(a:Pt,b:Pt){return Math.atan2(b.z-a.z,b.x-a.x);}
function axisAligned(h:number){const t=CHANNEL_SMOOTH_RULES.axisRadians,wrap=(a:number)=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));return Math.min(wrap(h),wrap(h-Math.PI/2),wrap(h-Math.PI),wrap(h+Math.PI/2))<=t;}
function nearestDist(p:Pt,path:readonly Pt[]){let best=Infinity;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len2));best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));}return best;}
function clampPath(smooth:readonly Pt[],raw:readonly Pt[],maxDev:number){if(raw.length<2)return smooth.slice();return smooth.map(p=>{const d=nearestDist(p,raw);if(d<=maxDev||d<1e-9)return p;let best=raw[0],bd=Infinity;for(const q of raw){const k=Math.hypot(p.x-q.x,p.z-q.z);if(k<bd){bd=k;best=q;}}const t=maxDev/d;return{x:best.x+(p.x-best.x)*t,z:best.z+(p.z-best.z)*t};});}
function designedWidth(river:River,s:number){let acc=0;for(let k=1;k<river.pts.length;k++){const a=river.pts[k-1],b=river.pts[k],seg=Math.hypot(b.x-a.x,b.z-a.z);if(acc+seg>=s||k===river.pts.length-1){const u=seg?Math.max(0,Math.min(1,(s-acc)/seg)):0;return(a.w??river.width)+((b.w??river.width)-(a.w??river.width))*u;}acc+=seg;}return river.width;}
function edge(g:G,x:number,z:number,nx:number,nz:number,limit:number){const step=CHANNEL_SMOOTH_RULES.bankStepMetres;let last=0;for(let o=0;o<=limit+1e-9;o+=step){if(!wet(g,x+nx*o,z+nz*o))return last;last=o;}return last;}

/** Physical banks at regular stations along the designed centreline. */
export function riverBankSamples(g:G,river:River):BankSample[]{
 const R=CHANNEL_SMOOTH_RULES,{points}=resample(river.pts,R.sampleMetres),out:BankSample[]=[];let s=0;
 for(let i=0;i<points.length;i++){const p=points[i],q=points[Math.min(points.length-1,i+1)],prev=points[Math.max(0,i-1)];
  const dx=q.x-prev.x,dz=q.z-prev.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len,radius=designedWidth(river,s)*.5,limit=radius+R.bankSearchPadMetres,isWet=wet(g,p.x,p.z);
  const left=isWet?edge(g,p.x,p.z,-nx,-nz,limit):0,right=isWet?edge(g,p.x,p.z,nx,nz,limit):0;
  out.push({x:p.x,z:p.z,s,width:left+right,left:{x:p.x-nx*left,z:p.z-nz*left},right:{x:p.x+nx*right,z:p.z+nz*right},wet:isWet});
  if(i+1<points.length)s+=Math.hypot(q.x-p.x,q.z-p.z);}
 return out;
}

function jitter(path:readonly Pt[]){if(path.length<5)return{mean:0,max:0};const sm=chaikin(path,3);let sum=0,max=0,n=0;for(const p of path){const d=nearestDist(p,sm);sum+=d;max=Math.max(max,d);n++;}return{mean:n?sum/n:0,max};}
function staircase(path:readonly Pt[]){let axis=0,n=0;for(let i=1;i<path.length;i++){if(Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z)<.2)continue;n++;if(axisAligned(heading(path[i-1],path[i])))axis++;}return n?axis/n:0;}
function jumps(widths:readonly number[]){const J=CHANNEL_SMOOTH_RULES.widthJumpMetres;let n=0;for(let i=1;i<widths.length;i++)if(Math.abs(widths[i]-widths[i-1])>=J)n++;return n;}

export function channelMetrics(samples:readonly BankSample[]):ChannelMetrics{
 const wetS=samples.filter(s=>s.wet),widths=wetS.map(s=>s.width),mean=widths.length?widths.reduce((a,b)=>a+b,0)/widths.length:0;
 const varc=widths.length?widths.reduce((a,w)=>a+(w-mean)**2,0)/widths.length:0;
 const left=wetS.map(s=>s.left),right=wetS.map(s=>s.right),jl=jitter(left),jr=jitter(right);
 return{samples:samples.length,wetSamples:wetS.length,meanWidthMetres:+mean.toFixed(3),widthCv:+(mean>1e-6?Math.sqrt(varc)/mean:0).toFixed(3),widthJumps:jumps(widths),staircaseFraction:+((staircase(left)+staircase(right))/2).toFixed(3),meanBankJitterMetres:+((jl.mean+jr.mean)/2).toFixed(3),maxBankJitterMetres:+Math.max(jl.max,jr.max).toFixed(3)};
}

export type SmoothRiver={id:string;width:number;center:Pt[];left:Pt[];right:Pt[];widths:number[];raw:ChannelMetrics;smooth:ChannelMetrics;maxBankDeviationMetres:number};

/** Smoothed banks and centreline for one river, clamped to the physical waterline. */
export function smoothRiverDisplay(g:G,river:River):SmoothRiver{
 const R=CHANNEL_SMOOTH_RULES,raw=riverBankSamples(g,river),wetS=raw.filter(s=>s.wet),rawMetrics=channelMetrics(raw);
 const leftRaw=wetS.map(s=>s.left),rightRaw=wetS.map(s=>s.right);
 const left=clampPath(chaikin(leftRaw,R.chaikinPasses),leftRaw,R.maxDisplayDeviationMetres);
 const right=clampPath(chaikin(rightRaw,R.chaikinPasses),rightRaw,R.maxDisplayDeviationMetres);
 const n=Math.min(left.length,right.length),center:Pt[]=[],widths:number[]=[],leftO:Pt[]=[],rightO:Pt[]=[];
 for(let i=0;i<n;i++){const a=left[i],b=right[i];leftO.push(a);rightO.push(b);center.push({x:(a.x+b.x)/2,z:(a.z+b.z)/2});widths.push(Math.hypot(b.x-a.x,b.z-a.z));}
 let maxDev=0;for(const p of leftO)maxDev=Math.max(maxDev,nearestDist(p,leftRaw));for(const p of rightO)maxDev=Math.max(maxDev,nearestDist(p,rightRaw));
 const smoothSamples:BankSample[]=center.map((p,i)=>({x:p.x,z:p.z,s:0,width:widths[i],left:leftO[i],right:rightO[i],wet:true}));
 return{id:river.id,width:river.width,center,left:leftO,right:rightO,widths,raw:rawMetrics,smooth:channelMetrics(smoothSamples),maxBankDeviationMetres:+maxDev.toFixed(3)};
}

export function smoothRivers(g:G){return rivers(g).map(r=>smoothRiverDisplay(g,r));}
