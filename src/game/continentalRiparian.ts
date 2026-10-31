import {waterSurfaceAt,type LocalWaterBody} from './localWater';
import {sampleHeight} from './worldgen';
import type {EcologyWorld} from './ecologicalProvinces';
export const CONTINENTAL_RIPARIAN_RULES={cellMeters:12,bankWidthMeters:90,blendMeters:24,channelWidthMeters:8,bankClearanceMeters:1.5,maximumOriginalElevationMeters:34,featureMarginMeters:102,campMarginMeters:145,coverageSafetyFactor:1.45} as const;
/** V14 only: a real lowland tributary, with connected dry wetland banks around
 * its inland spring head. Required highlands and starting sites stay protected. */
export function continentalRiparian(world:EcologyWorld,requiredArea:number,camps:{x:number;z:number}[]){
 const rules=CONTINENTAL_RIPARIAN_RULES,width=Math.ceil(world.size/rules.cellMeters),cell=world.size/width,total=width*width,segs=Math.round(Math.sqrt(world.heights.length))-1,step=world.size/segs;
 const point=(id:number)=>({x:(id%width+.5)*cell-world.size/2,z:(Math.floor(id/width)+.5)*cell-world.size/2}),height=(x:number,z:number)=>sampleHeight(world.heights,x,z,world.size);
 const protectedFeatures=(world.features||[]).filter(f=>['mountain-range','canyon','cliff','plateau','pillars','dunes','waterfall'].includes(f.kind));
 const allowed=new Uint8Array(total),parent=new Int32Array(total).fill(-1),distance=new Int32Array(total).fill(-1);
 for(let i=0;i<total;i++){const p=point(i),h=height(p.x,p.z);if(Math.max(Math.abs(p.x),Math.abs(p.z))>world.size/2-32||h<waterSurfaceAt(world,p.x,p.z)+.8||h>world.baseWaterY+rules.maximumOriginalElevationMeters)continue;
  if(camps.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<rules.campMarginMeters))continue;
  if(protectedFeatures.some(f=>Math.hypot(f.x-p.x,f.z-p.z)<f.radius*(f.kind==='mountain-range'?.8:.9)+rules.featureMarginMeters))continue;allowed[i]=1;
 }
 const courses=(world.waterBodies||[]).filter(b=>b.kind==='river'&&b.id.endsWith('lower-river')) as Extract<LocalWaterBody,{kind:'river'}>[];
 if(!courses.length)throw new Error('V14 riparian tributary needs a real downstream river');
 let start=-1,join:{x:number;z:number;y:number}|undefined,best=Infinity;
 for(let i=0;i<total;i++)if(allowed[i]){const p=point(i);for(const course of courses)for(const q of course.pts.slice(Math.floor(course.pts.length*.6))){const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<best){best=d;start=i;join=q;}}}
 if(start<0||!join)throw new Error('V14 lacks lowland space for a physical riparian tributary');
 const queue=[start];distance[start]=0;let farthest=start;
 for(let at=0;at<queue.length;at++){const i=queue[at],x=i%width,z=Math.floor(i/width);for(const n of [x?i-1:-1,x<width-1?i+1:-1,z?i-width:-1,z<width-1?i+width:-1])if(n>=0&&allowed[n]&&distance[n]<0){distance[n]=distance[i]+1;parent[n]=i;queue.push(n);if(distance[n]>distance[farthest])farthest=n;}}
 const targetLength=requiredArea/(rules.bankWidthMeters*2-rules.channelWidthMeters)*rules.coverageSafetyFactor;
 if(distance[farthest]*cell<targetLength)throw new Error(`V14 physical riparian route only ${Math.round(distance[farthest]*cell)}m; ${Math.round(targetLength)}m required`);
 let head=farthest;while(parent[head]>=0&&distance[parent[head]]*cell>=targetLength)head=parent[head];
 const route:{x:number;z:number}[]=[];for(let id=head;id>=0;id=parent[id]){if(!route.length||distance[id]%2===0)route.push(point(id));if(id===start)break;}route.push({x:join.x,z:join.z});
 // Smooth raster path corners with two bounded Chaikin passes; end points and
 // the actual downstream river connection remain fixed.
 let path=route;for(let pass=0;pass<2;pass++){const next=[path[0]];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];next.push({x:a.x*.75+b.x*.25,z:a.z*.75+b.z*.25},{x:a.x*.25+b.x*.75,z:a.z*.25+b.z*.75});}next.push(path.at(-1)!);path=next;}
 const length=path.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z):0,0),body:Extract<LocalWaterBody,{kind:'river'}>={kind:'river',id:'v14-riparian-tributary',width:rules.channelWidthMeters,pts:path.map((p,i)=>({...p,y:join!.y+.20*(1-i/(path.length-1))}))};
 world.waterBodies?.push(body);world.rivers.push({pts:body.pts,w:body.width});let changedCells=0,volume=0,maximumCutMeters=0;
 for(let iz=0;iz<=segs;iz++)for(let ix=0;ix<=segs;ix++){const x=ix*step-world.size/2,z=iz*step-world.size/2,index=iz*(segs+1)+ix,old=world.heights[index];let nearest=Infinity,surface=join.y;
  for(let j=1;j<body.pts.length;j++){const a=body.pts[j-1],b=body.pts[j],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);if(d<nearest){nearest=d;surface=a.y+(b.y-a.y)*t;}}
  if(nearest>rules.bankWidthMeters+rules.blendMeters)continue;
  if(camps.some(c=>Math.hypot(c.x-x,c.z-z)<rules.campMarginMeters-rules.bankWidthMeters))continue;
  const fade=Math.max(0,Math.min(1,(rules.bankWidthMeters+rules.blendMeters-nearest)/rules.blendMeters)),blend=fade*fade*(3-2*fade),target=surface+rules.bankClearanceMeters+nearest*.018;
  if(old>target){world.heights[index]=old+(target-old)*blend;}
  if(nearest<=body.width/2){world.heights[index]=Math.min(world.heights[index],surface-.7);if(world.waterHeights)world.waterHeights[index]=Math.max(world.waterHeights[index],surface);}
  const cut=old-world.heights[index];if(cut>1e-6){changedCells++;volume+=cut*step*step;maximumCutMeters=Math.max(maximumCutMeters,cut);}
 }
 return{version:14,changedCells,cutVolumeCubicMeters:volume,tributaryLengthMeters:length,targetLengthMeters:targetLength,connectedBankAreaTargetSquareMeters:requiredArea,sideChannelAdded:true,affectedAreaSquareMeters:changedCells*step*step,maximumCutMeters};
}
