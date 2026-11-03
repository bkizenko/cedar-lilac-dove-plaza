import {sampleTriangleHeight} from './worldgen';
import type {EcologyWorld} from './ecologicalProvinces';
import type {LocalWaterBody} from './localWater';
type River=Extract<LocalWaterBody,{kind:'river'}>;
type Point={x:number;z:number};
type District=Point&{kind:string;rx:number;rz:number;rotation:number};
export const DISTRIBUTED_RIPARIAN_RULES={version:18,surveyCellMetres:12,maximumFreshBankDistanceMetres:90,floorHalfWidthMetres:75,floorGrade:.025,maximumCrossBankGrade:.45,shoulderTransitionMetres:12,dryBankHeightMetres:1.5,maximumIncisionMetres:96,campMarginMetres:24,protectedEllipseScale:1.10,routeProtectionMarginMetres:16,coverageSafetyFactor:1.20,sideChannelLengthSafetyFactor:1.8,maximumProtectionApproachGrade:.40,minimumIncisionSlackMetres:3,maximumAddedEdgeRiseMetres:4.5,maximumOutletTrials:12,maximumTrialsPerComponent:4,outletTrialSpacingMetres:120,outletTargetLengthFraction:.90,routeProbeMetres:2,terminalJoinDistanceMetres:24,sideChannelWidthMetres:8,maximumRoutePoints:640} as const;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
type Segment={a:River['pts'][number];b:River['pts'][number];id:number;x0:number;z0:number;x1:number;z1:number};
type SegmentNode={x0:number;z0:number;x1:number;z1:number;segments?:Segment[];left?:SegmentNode;right?:SegmentNode};
function nearestCurve(pts:River['pts']){
 const segments:Segment[]=pts.slice(1).map((b,id)=>{const a=pts[id];return{a,b,id,x0:Math.min(a.x,b.x),z0:Math.min(a.z,b.z),x1:Math.max(a.x,b.x),z1:Math.max(a.z,b.z)};});
 const build=(list:Segment[]):SegmentNode=>{const node:SegmentNode={x0:Math.min(...list.map(s=>s.x0)),z0:Math.min(...list.map(s=>s.z0)),x1:Math.max(...list.map(s=>s.x1)),z1:Math.max(...list.map(s=>s.z1))};if(list.length<=8){node.segments=list;return node;}const axis=node.x1-node.x0>=node.z1-node.z0?'x':'z';list.sort((a,b)=>axis==='x'?(a.x0+a.x1)-(b.x0+b.x1):(a.z0+a.z1)-(b.z0+b.z1));const mid=Math.floor(list.length/2);node.left=build(list.slice(0,mid));node.right=build(list.slice(mid));return node;},tree=build(segments);
 return(p:Point)=>{let distance=Infinity,surface=0,bestId=Infinity;const bound=(n:SegmentNode)=>Math.hypot(Math.max(0,n.x0-p.x,p.x-n.x1),Math.max(0,n.z0-p.z,p.z-n.z1));
  const visit=(node:SegmentNode)=>{if(bound(node)>distance+1e-9)return;if(node.segments){for(const s of node.segments){const{a,b}=s,dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)),d=Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);if(d<distance||(d===distance&&s.id<bestId)){distance=d;surface=a.y+(b.y-a.y)*t;bestId=s.id;}}return;}const a=node.left!,b=node.right!;if(bound(a)<=bound(b)){visit(a);visit(b);}else{visit(b);visit(a);}};visit(tree);return{distance,surface};
 };
}

function envelope(distance:number,surface:number){const r=DISTRIBUTED_RIPARIAN_RULES,q=Math.max(0,distance-r.floorHalfWidthMetres);return surface+r.dryBankHeightMetres+distance*r.floorGrade+(r.maximumCrossBankGrade-r.floorGrade)*(q-r.shoulderTransitionMetres*(1-Math.exp(-q/r.shoulderTransitionMetres)));}
/** Measures added edge steepening, preserving existing natural cliffs. */
export function maximumAddedEdgeRise(before:Float32Array,after:Float32Array,segs:number){let maximum=0;const n=segs+1;for(let z=0;z<=segs;z++)for(let x=0;x<=segs;x++){const a=z*n+x;for(const b of[x<segs?a+1:-1,z<segs?a+n:-1])if(b>=0)maximum=Math.max(maximum,Math.abs(after[a]-after[b])-Math.abs(before[a]-before[b]));}return maximum;}
/** V18 fallback only after a measured physical wetland rejection. Keeps the
 * actual biome quota; earth and real connected water are changed, never labels.
 * Published earlier versions never call this function. */
export function repairDistributedRiparian(world:EcologyWorld,requiredArea:number,camps:Point[],districts:readonly District[],waterAt:(x:number,z:number)=>number,forceSideChannel=false){
 const curves=new Map<River['pts'],ReturnType<typeof nearestCurve>>(),nearest=(p:Point,pts:River['pts'])=>{let query=curves.get(pts);if(!query){query=nearestCurve(pts);curves.set(pts,query);}return query(p);};
 const r=DISTRIBUTED_RIPARIAN_RULES,width=Math.ceil(world.size/r.surveyCellMetres),cell=world.size/width,count=width*width,area=cell*cell,half=world.size/2,segs=Math.round(Math.sqrt(world.heights.length))-1,step=world.size/segs;
 const height=(x:number,z:number)=>sampleTriangleHeight(world.heights,x,z,world.size),point=(id:number)=>({x:(id%width+.5)*cell-half,z:(Math.floor(id/width)+.5)*cell-half});
 const protectedAreas=districts.filter(d=>['alpine','stratified','pillars','dunes','lake-basin'].includes(d.kind));
 const clearance=(x:number,z:number)=>{let distance=Math.min(half-Math.abs(x),half-Math.abs(z));for(const d of protectedAreas){const c=Math.cos(d.rotation),s=Math.sin(d.rotation),dx=x-d.x,dz=z-d.z,q=Math.hypot((dx*c+dz*s)/d.rx,(-dx*s+dz*c)/d.rz);distance=Math.min(distance,(q-r.protectedEllipseScale)*Math.min(d.rx,d.rz));}for(const c of camps)distance=Math.min(distance,Math.hypot(c.x-x,c.z-z)-r.campMarginMetres);return distance;};
 const protectedAt=(x:number,z:number,margin=0)=>clearance(x,z)<margin,availableCut=(x:number,z:number)=>Math.max(0,Math.min(r.maximumIncisionMetres,clearance(x,z)*r.maximumProtectionApproachGrade));
 const allowed=new Uint8Array(count),points=Array.from({length:count},(_,id)=>point(id));
 for(let id=0;id<count;id++){const p=points[id],h=height(p.x,p.z);allowed[id]=Number(Math.max(Math.abs(p.x),Math.abs(p.z))<half-20&&h>waterAt(p.x,p.z)+.55&&h<world.baseWaterY+r.maximumIncisionMetres&& !protectedAt(p.x,p.z,r.routeProtectionMarginMetres));}
 const routeAllowed=allowed.slice();for(let id=0;id<count;id++)if(routeAllowed[id]){const p=points[id];if(height(p.x,p.z)+1-world.baseWaterY>availableCut(p.x,p.z)-r.minimumIncisionSlackMetres)routeAllowed[id]=0;}
 const neighbors=(id:number)=>[id%width?id-1:-1,id%width<width-1?id+1:-1,id>=width?id-width:-1,id<count-width?id+width:-1];
 const largest=(mask:Uint8Array)=>{const seen=new Uint8Array(count);let best=0;for(let id=0;id<count;id++)if(mask[id]&&!seen[id]){const q=[id];seen[id]=1;for(let at=0;at<q.length;at++)for(const n of neighbors(q[at]))if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;q.push(n);}best=Math.max(best,q.length);}return best*area;};
 const rivers=(world.waterBodies||[]).filter((b):b is River=>b.kind==='river');
 const candidates=rivers.filter(b=>b.id.startsWith('ordinary-')||b.id.includes('riparian'));
 let selected:River|undefined,potential=0;
 for(const b of candidates){const mask=new Uint8Array(count);for(let id=0;id<count;id++)if(allowed[id]){const p=points[id],n=nearest(p,b.pts);const old=height(p.x,p.z),after=Math.max(old-availableCut(p.x,p.z),Math.min(old,envelope(n.distance,n.surface)));if(n.distance<=r.maximumFreshBankDistanceMetres&&after<=n.surface+8.5)mask[id]=1;}const value=largest(mask);if(value>potential){potential=value;selected=b;}}
 let outletTrials=0,curveRejections=0;
 let sideChannelAdded=false,routeLengthMetres=0,outletKind:'existing-course'|'river'|'ocean'='existing-course';
 if(forceSideChannel||!selected||potential<requiredArea*r.coverageSafetyFactor){
  // Search physically dry non-rare land, not just <=34m legacy lowlands.
  // A carved tributary supplies its own banks; route grade is assigned from
  // its real downstream join and original mountain amplitudes are preserved.
  const joins: {x:number;z:number;y:number;kind:'river'|'ocean'}[]=[];
  for(const b of rivers)for(const p of b.pts)if(p.y<world.baseWaterY+5&&!protectedAt(p.x,p.z,8))joins.push({...p,kind:'river'});
  const seeds:{id:number;join:typeof joins[number];distance:number}[]=[];
  for(let id=0;id<count;id++)if(routeAllowed[id]){const p=points[id];let best=Infinity,join:typeof joins[number]|undefined;for(const q of joins){const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<best){best=d;join=q;}}if(join&&best<cell*2.5)seeds.push({id,join,distance:best});}
  // A separate ordinary watershed may discharge to actual open ocean. Use
  // only wet ocean cells connected to a map edge, not inland depressions.
  const wetOcean=new Uint8Array(count),openOcean=new Uint8Array(count),oceanQueue:number[]=[];
  for(let id=0;id<count;id++){const p=points[id];if(height(p.x,p.z)<world.baseWaterY-.10&&waterAt(p.x,p.z)<=world.baseWaterY+.02){wetOcean[id]=1;if(id%width===0||id%width===width-1||id<width||id>=count-width){openOcean[id]=1;oceanQueue.push(id);}}}
  for(let at=0;at<oceanQueue.length;at++)for(const n of neighbors(oceanQueue[at]))if(n>=0&&wetOcean[n]&&!openOcean[n]){openOcean[n]=1;oceanQueue.push(n);}
  for(let id=0;id<count;id++)if(routeAllowed[id])for(const n of neighbors(id))if(n>=0&&openOcean[n]){const p=points[n];seeds.push({id,join:{...p,y:world.baseWaterY,kind:'ocean'},distance:cell});}
  if(!seeds.length)throw new Error('V18 riparian has no non-rare dry join to actual downstream water');
  const safePoint=(p:Point,surface=world.baseWaterY)=>{const h=height(p.x,p.z);if(h<surface-.08)return true;return h-(surface-1)<=availableCut(p.x,p.z)-r.minimumIncisionSlackMetres;};
  type Join=typeof joins[number];
  const makeCurve=(route:number[],join:Join)=>{const original:Point[]=route.map(id=>points[id]);original.push(join);for(const passes of[2,1]){let path=original;for(let pass=0;pass<passes;pass++){const next=[path[0]];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];next.push({x:a.x*.75+b.x*.25,z:a.z*.75+b.z*.25},{x:a.x*.25+b.x*.75,z:a.z*.25+b.z*.75});}next.push(path.at(-1)!);path=next;}if(path.length>r.maximumRoutePoints)continue;let valid=true;const distances=[0];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(length/r.routeProbeMetres));distances.push(distances[i-1]+length);for(let j=0;j<=steps;j++){const t=j/steps,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(!safePoint(p,join.y)||(Math.hypot(p.x-join.x,p.z-join.z)>r.terminalJoinDistanceMetres&&height(p.x,p.z)<=waterAt(p.x,p.z)+.55)){valid=false;break;}}if(!valid)break;}if(valid)return{path,distances,length:distances.at(-1)!,passes};}return null;};
  seeds.sort((a,b)=>a.distance-b.distance||a.id-b.id);
  let bestJoin:Join|undefined,bestCurve:ReturnType<typeof makeCurve>=null,bestLength=0,componentCount=0;
  const componentAt=new Int32Array(count).fill(-1),attempted=new Map<number,Point[]>(),shortComponents=new Set<number>(),parent=new Int32Array(count),distance=new Int32Array(count),seen=new Uint32Array(count);let searchStamp=0;
  for(const seed of seeds){if(outletTrials>=r.maximumOutletTrials)break;let component=componentAt[seed.id];if(component>=0&&shortComponents.has(component))continue;const prior=component>=0?attempted.get(component)||[]:[];if(prior.length>=r.maximumTrialsPerComponent||prior.some(p=>Math.hypot(p.x-seed.join.x,p.z-seed.join.z)<r.outletTrialSpacingMetres))continue;
   const q=[seed.id];searchStamp++;seen[seed.id]=searchStamp;parent[seed.id]=-1;distance[seed.id]=0;let farthest=seed.id;outletTrials++;
   for(let at=0;at<q.length;at++)for(const n of neighbors(q[at]))if(n>=0&&routeAllowed[n]&&seen[n]!==searchStamp){seen[n]=searchStamp;distance[n]=distance[q[at]]+1;parent[n]=q[at];q.push(n);if(distance[n]>distance[farthest])farthest=n;}
   if(component<0)component=componentCount++;for(const id of q)componentAt[id]=component;const tried=attempted.get(component)||[];tried.push(seed.join);attempted.set(component,tried);
   const length=distance[farthest]*cell,target=requiredArea/(r.maximumFreshBankDistanceMetres*2-r.sideChannelWidthMetres)*r.sideChannelLengthSafetyFactor;if(length<Math.min(target,120)){shortComponents.add(component);outletTrials--;continue;}
   let head=farthest;while(parent[head]>=0&&distance[parent[head]]*cell>=target)head=parent[head];const route:number[]=[];for(let id=head;id>=0;id=parent[id]){route.push(id);if(id===seed.id)break;}
   const curve=makeCurve(route,seed.join);if(!curve){curveRejections++;continue;}if(curve.length>bestLength){bestCurve=curve;bestJoin=seed.join;bestLength=curve.length;}if(curve.length>=target*r.outletTargetLengthFraction)break;
  }
  if(!bestCurve||!bestJoin)throw new Error('V18 riparian lacks a feasible smooth sidechannel after bounded outlet trials');
  const{path,distances}=bestCurve;routeLengthMetres=bestCurve.length;
  selected={kind:'river',id:`v18-riparian-sidechannel-${rivers.length}`,width:r.sideChannelWidthMetres,pts:path.map((p,i)=>({...p,y:bestJoin!.y+.4*(1-distances[i]/Math.max(1,routeLengthMetres))})),surfaceVersion:2,startCap:'round',endCap:'butt'};
  for(const p of selected.pts){const old=height(p.x,p.z);if(old>=p.y-.08&&old-(p.y-1)>availableCut(p.x,p.z)-r.minimumIncisionSlackMetres)throw new Error('V18 riparian curve lacks a continuous protected-terrain approach');}
  world.waterBodies?.push(selected);world.rivers.push({pts:selected.pts,w:selected.width});sideChannelAdded=true;outletKind=bestJoin.kind;
 }
 if(!selected)throw new Error('V18 riparian found no physical course');
 const before=world.heights.slice();
 let changedCells=0,volume=0,maximumCutMeters=0,affectedAreaSquareMeters=0;
 for(let iz=0;iz<=segs;iz++)for(let ix=0;ix<=segs;ix++){const x=ix*step-half,z=iz*step-half;if(protectedAt(x,z))continue;const at=iz*(segs+1)+ix,old=world.heights[at],n=nearest({x,z},selected.pts);let target=envelope(n.distance,n.surface);if(n.distance<selected.width*.5)target=Math.min(target,n.surface-1.0);target=Math.max(old-availableCut(x,z),target);if(target>=old)continue;world.heights[at]=target;const cut=old-target;changedCells++;volume+=cut*step*step;maximumCutMeters=Math.max(maximumCutMeters,cut);affectedAreaSquareMeters+=step*step;}
 const addedEdgeRise=maximumAddedEdgeRise(before,world.heights,segs);if(addedEdgeRise>r.maximumAddedEdgeRiseMetres)throw new Error(`V18 riparian repair introduced a hard terrain edge: ${addedEdgeRise}`);
 let wetSamples=0,drySamples=0;for(let i=1;i<selected.pts.length;i++){const a=selected.pts[i-1],b=selected.pts[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)));for(let j=0;j<=n;j++){const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(Math.max(Math.abs(x),Math.abs(z))>half)continue;wetSamples++;if(height(x,z)>=a.y+(b.y-a.y)*t-.04)drySamples++;}}if(drySamples/Math.max(1,wetSamples)>.02)throw new Error('V18 riparian smooth protection leaves a dry course');
 return{version:18,kind:'connected-riparian-valley' as const,courseId:selected.id,sideChannelAdded,outletKind,outletTrials,curveRejections,maximumAddedEdgeRiseMetres:addedEdgeRise,wetCourseProbes:wetSamples,dryCourseProbes:drySamples,changedCells,cutVolumeCubicMeters:volume,maximumCutMeters,affectedAreaSquareMeters,connectedBankAreaTargetSquareMeters:requiredArea,predictedConnectedBankAreaSquareMeters:potential,tributaryLengthMeters:routeLengthMetres,rules:r};
}
