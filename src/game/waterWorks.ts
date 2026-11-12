import type {Game} from './sim';
import type {LocalWaterBody} from './localWater';
import {localWaterAt} from './localWater';
import {riverSections,sectionCentrelinePoint} from './waterSections';
import {weatherWaterLevel} from './hydrology';
import {EXCAVATION_RULES} from './excavation';

/** Water works: the terrain, placement and hydrology side (Grok W-World, W5).
 * Pure queries on the real world — wells, watermills, windmills, aqueducts,
 * cisterns and canals. Nothing is built here: recipes, inventories, outputs and
 * jobs stay Codex's (the hooks it would call are the exported functions).
 * Coefficients are versioned gameplay rules, not survey data. */
export const WATER_WORKS_RULES={version:1,
 fresh:{bucketMetres:32,searchMetres:240},
 well:{maxDepthMetres:12,minDepthMetres:1,aquiferRise:.35,influenceMetres:120,riverBankMetres:10,brackishSeaMetres:40,boreRadiusMetres:.6},
 watermill:{searchMetres:30,minWidthMetres:3,undershotWidthMetres:6,overshotHeadMetres:1,fallSearchMetres:30},
 windmill:{rings:[30,60,90] as readonly number[],directions:16,minExposureMetres:2.5,maxHorizonRadians:.1,maxGrade:.2},
 aqueduct:{sampleMetres:4,minGrade:.0005,maxCutMetres:2,maxArcadeMetres:12},
 cistern:{cellMetres:8,radiusMetres:160,runoffLitresPerSquareMetreSeason:60},
 canal:{sampleMetres:4,levelToleranceMetres:.1,maxDigMetres:2,lockRiseMetres:2.5,channelWidthMetres:4}} as const;
type G=Pick<Game,'world'|'state'|'height'|'waterAt'|'exploredAt'>;
type P={x:number;z:number};

// ---- fresh water index (rivers + lakes; the background sea is salt) ----
type FreshPoint={x:number;z:number;y:number;kind:'river'|'lake';id:string};
const freshCache=new WeakMap<object,{buckets:Map<number,FreshPoint[]>;width:number}>();
function freshIndex(g:G){
 const bodies=(g.world.waterBodies||[]) as LocalWaterBody[],old=freshCache.get(bodies);if(old)return old;
 const R=WATER_WORKS_RULES.fresh,width=Math.ceil(g.world.size/R.bucketMetres),buckets=new Map<number,FreshPoint[]>(),half=g.world.size/2;
 const add=(p:FreshPoint)=>{const k=Math.min(width-1,Math.max(0,Math.floor((p.z+half)/R.bucketMetres)))*width+Math.min(width-1,Math.max(0,Math.floor((p.x+half)/R.bucketMetres)));(buckets.get(k)??buckets.set(k,[]).get(k)!).push(p);};
 for(const b of bodies){if(b.kind==='lake'){const ring=b.shoreline?.length?b.shoreline:Array.from({length:32},(_,i)=>({x:b.x+Math.sin(i/32*Math.PI*2)*b.rx,z:b.z+Math.cos(i/32*Math.PI*2)*b.rz}));for(const p of ring)add({x:p.x,z:p.z,y:b.surfaceY,kind:'lake',id:b.id});}
  else for(let i=0;i<b.pts.length;i++){const a=b.pts[i],n=b.pts[i+1];add({x:a.x,z:a.z,y:a.y,kind:'river',id:b.id});if(n){const l=Math.hypot(n.x-a.x,n.z-a.z),k=Math.floor(l/8);for(let j=1;j<k;j++){const t=j/k;add({x:a.x+(n.x-a.x)*t,z:a.z+(n.z-a.z)*t,y:a.y+(n.y-a.y)*t,kind:'river',id:b.id});}}}}
 const out={buckets,width};freshCache.set(bodies,out);return out;
}
export function nearestFreshWater(g:G,x:number,z:number,within:number=WATER_WORKS_RULES.fresh.searchMetres){
 const {buckets,width}=freshIndex(g),R=WATER_WORKS_RULES.fresh,half=g.world.size/2,bx=Math.floor((x+half)/R.bucketMetres),bz=Math.floor((z+half)/R.bucketMetres),r=Math.ceil(within/R.bucketMetres);let best:FreshPoint|null=null,bd=within;
 for(let j=bz-r;j<=bz+r;j++)for(let i=bx-r;i<=bx+r;i++){if(i<0||j<0||i>=width||j>=width)continue;for(const p of buckets.get(j*width+i)||[]){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p;}}}
 return best?{...best,distanceMetres:+bd.toFixed(1)}:null;
}
const isSea=(g:G,x:number,z:number)=>g.height(x,z)<g.world.waterY-.05&&localWaterAt((g.world.waterBodies||[]) as LocalWaterBody[],x,z)===null;
function seaDistance(g:G,x:number,z:number,max:number){for(let d=0;d<=max;d+=4)for(let i=0;i<16;i++){const a=i/16*Math.PI*2;if(isSea(g,x+Math.sin(a)*d,z+Math.cos(a)*d))return d;}return Infinity;}
const wet=(g:G,x:number,z:number)=>g.height(x,z)<g.waterAt(x,z)+.02;

// ---- wells (GW-05) ----
/** Groundwater is modelled as the nearest fresh surface level rising under higher
 * ground at `aquiferRise` of the relief; the dig is to the dry-season table. */
export function wellSite(g:G,x:number,z:number,team=0){
 const R=WATER_WORKS_RULES.well,issues:string[]=[],h=g.height(x,z),near=nearestFreshWater(g,x,z);
 if(team===0&&!g.exploredAt(x,z))issues.push('Explore the site first');
 if(wet(g,x,z))issues.push('A well needs dry ground');
 // the fresh level's pull on the table fades with distance toward sea level, and the
 // table never stands above the ground it is dug in (no free wells)
 const sea=seaDistance(g,x,z,R.brackishSeaMetres),seaLevel=g.world.baseWaterY,pull=near?Math.exp(-near.distanceMetres/R.influenceMetres):0,base=Math.min(h,seaLevel+((near?.y??seaLevel)-seaLevel)*pull);
 const table=base+Math.max(0,h-base)*R.aquiferRise,drought=weatherWaterLevel(0,'drought'),depth=Math.max(R.minDepthMetres,h-table-drought);
 const brackish=!near&&sea<=R.brackishSeaMetres||(near!==null&&sea<near.distanceMetres&&sea<=R.brackishSeaMetres);
 if(brackish)issues.push('Too near the sea — the water would be brackish');
 if(depth>R.maxDepthMetres)issues.push(`Water lies ${depth.toFixed(1)} m down — deeper than a hand-dug well (${R.maxDepthMetres} m)`);
 const volume=Math.PI*R.boreRadiusMetres**2*depth;
 return{issues,depthMetres:+depth.toFixed(2),tableMetres:+table.toFixed(2),fresh:!brackish,nearestFresh:near?{kind:near.kind,id:near.id,distanceMetres:near.distanceMetres}:null,
  besideWater:!!near&&near.distanceMetres<=R.riverBankMetres,digCubicMetres:+volume.toFixed(2),digWorkSeconds:Math.round(Math.max(EXCAVATION_RULES.minimumWorkSeconds,volume*EXCAVATION_RULES.workSecondsPerCubicMeter))};
}

// ---- watermills (GW-06) ----
/** Wheel in the river beside dry footing. Head comes from the real water surface
 * along the river section (or a waterfall nearby); wide slow rivers drive undershot wheels. */
export function watermillSite(g:G,x:number,z:number,team=0){
 const R=WATER_WORKS_RULES.watermill,issues:string[]=[];let best:{s:ReturnType<typeof riverSections>[number];p:P;d:number}|null=null;
 for(const s of riverSections(g as Game)){const p=sectionCentrelinePoint(s,{x,z}),d=Math.hypot(p.x-x,p.z-z);if(d<=R.searchMetres&&(!best||d<best.d))best={s,p,d};}
 if(team===0&&!g.exploredAt(x,z))issues.push('Explore the site first');
 if(!best)return{issues:[...issues,'A watermill must stand on a river'],wheel:null,headMetres:0,widthMetres:0,wheelType:null,powerIndex:0};
 if(wet(g,x,z))issues.push('The mill house needs dry footing on the bank');
 const a=best.s.pts[0],b=best.s.pts[best.s.pts.length-1];let head=Math.abs(g.waterAt(a.x,a.z)-g.waterAt(b.x,b.z));
 for(const f of g.world.waterfalls||[])if(Math.hypot(f.x-best.p.x,f.z-best.p.z)<=R.fallSearchMetres)head=Math.max(head,f.upperY-f.lowerY);
 const width=best.s.riverWidthMetres;if(width<R.minWidthMetres&&head<R.overshotHeadMetres)issues.push('The stream is too small to turn a wheel');
 const type=head>=R.overshotHeadMetres?'overshot':width>=R.undershotWidthMetres?'undershot':'breastshot';
 return{issues,wheel:{x:+best.p.x.toFixed(1),z:+best.p.z.toFixed(1),sectionId:best.s.id,distanceMetres:+best.d.toFixed(1)},headMetres:+head.toFixed(2),widthMetres:+width.toFixed(1),wheelType:type,
  powerIndex:+(width*Math.max(head,.3)*(type==='overshot'?1.6:type==='breastshot'?1.2:1)).toFixed(2)};
}

// ---- windmills (GW-06) ----
/** Exposure above the surrounding ground and an open horizon all round (the
 * sailing wind changes direction, so a mill needs every quarter open). */
export function windmillSite(g:G,x:number,z:number,team=0){
 const R=WATER_WORKS_RULES.windmill,issues:string[]=[],h=g.height(x,z);let worst=-Infinity,ring=0,n=0;
 for(let i=0;i<R.directions;i++){const a=i/R.directions*Math.PI*2;for(const r of R.rings){const y=g.height(x+Math.sin(a)*r,z+Math.cos(a)*r);ring+=y;n++;worst=Math.max(worst,Math.atan2(y-h,r));}}
 const exposure=h-ring/n,grade=Math.hypot(g.height(x+2,z)-g.height(x-2,z),g.height(x,z+2)-g.height(x,z-2))/4;
 if(team===0&&!g.exploredAt(x,z))issues.push('Explore the site first');
 if(wet(g,x,z))issues.push('A windmill needs dry ground');
 if(exposure<R.minExposureMetres)issues.push('A windmill needs a rise above the surrounding land');
 if(worst>R.maxHorizonRadians)issues.push('Higher ground shelters the sails');
 if(grade>R.maxGrade)issues.push('Too steep for the mill base');
 for(const t of g.state.trees)if(t.amount>0&&Math.hypot(t.x-x,t.z-z)<12){issues.push('Clear trees around the sails');break;}
 return{issues,exposureMetres:+exposure.toFixed(2),horizonRadians:+worst.toFixed(3),powerIndex:+Math.max(0,exposure*(1-Math.max(0,worst)/R.maxHorizonRadians)).toFixed(2)};
}

// ---- aqueducts (GW-06) ----
/** A gravity channel from a fresh source to a target on a straight line at a
 * constant fall: where ground stands above the channel it is cut (≤ one dig,
 * deeper needs a tunnel); where ground falls away it is carried on an arcade. */
export function aqueductRoute(g:G,source:P,target:P,team=0){
 const R=WATER_WORKS_RULES.aqueduct,issues:string[]=[],src=nearestFreshWater(g,source.x,source.z,24);
 if(!src)return{issues:['An aqueduct must start at fresh water (a river or lake)'],feasible:false} as const;
 const len=Math.hypot(target.x-src.x,target.z-src.z),start=src.y,end=g.height(target.x,target.z),fall=start-end;
 if(fall<len*R.minGrade)issues.push(`The source is not high enough — needs ${(len*R.minGrade).toFixed(1)} m fall, has ${fall.toFixed(1)} m`);
 const grade=Math.max(R.minGrade,fall/Math.max(1,len));let cut=0,arcade=0,cutLen=0,arcadeLen=0,maxCut=0,maxArcade=0,unseen=0;
 const steps=Math.max(1,Math.ceil(len/R.sampleMetres)),ds=len/steps;
 for(let i=0;i<=steps;i++){const t=i/steps,x=src.x+(target.x-src.x)*t,z=src.z+(target.z-src.z)*t,channel=start-grade*len*t,y=g.height(x,z);
  if(team===0&&!g.exploredAt(x,z))unseen++;
  if(y>channel){cut+=(y-channel)*ds;cutLen+=ds;maxCut=Math.max(maxCut,y-channel);}else{arcade+=(channel-y)*ds;arcadeLen+=ds;maxArcade=Math.max(maxArcade,channel-y);}}
 if(unseen)issues.push('Explore the whole route first');
 if(maxCut>R.maxCutMetres)issues.push(`The channel would need a ${maxCut.toFixed(1)} m cut — deeper than one dig (tunnel needed)`);
 if(maxArcade>R.maxArcadeMetres)issues.push(`The arcade would stand ${maxArcade.toFixed(1)} m high — taller than ${R.maxArcadeMetres} m`);
 return{issues,feasible:issues.length===0,source:{kind:src.kind,id:src.id,x:src.x,z:src.z,surfaceMetres:+start.toFixed(2)},lengthMetres:+len.toFixed(1),fallMetres:+fall.toFixed(2),grade:+grade.toFixed(4),
  cutLengthMetres:+cutLen.toFixed(1),arcadeLengthMetres:+arcadeLen.toFixed(1),maxCutMetres:+maxCut.toFixed(2),maxArcadeMetres:+maxArcade.toFixed(2),
  cutWorkSeconds:Math.round(cut*1*EXCAVATION_RULES.workSecondsPerCubicMeter),arcadeAreaSquareMetres:+arcade.toFixed(1)};
}

// ---- cisterns (catchment) ----
/** Upslope catchment draining to the site by steepest descent on an 8 m grid. */
export function cisternCatchment(g:G,x:number,z:number){
 const R=WATER_WORKS_RULES.cistern,c=R.cellMetres,n=Math.round(R.radiusMetres/c),w=2*n+1,hs=new Float32Array(w*w),drains=new Uint8Array(w*w);
 for(let j=0;j<w;j++)for(let i=0;i<w;i++){const px=x+(i-n)*c,pz=z+(j-n)*c;hs[j*w+i]=wet(g,px,pz)?-Infinity:g.height(px,pz);}
 const down=(k:number)=>{const i=k%w,j=(k/w)|0;let b=-1;const bh=hs[k];for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=w||jj>=w)continue;const kk=jj*w+ii,dh=(hs[kk]-hs[k])/Math.hypot(di,dj);if(hs[kk]<bh&&(b<0||dh<(hs[b]-hs[k])/Math.hypot(b%w-i,((b/w)|0)-j)))b=kk;}return b;};
 const centre=n*w+n;drains[centre]=1;
 // a cell drains to the site if its steepest-descent path reaches the centre (or a cell next to it)
 for(let k=0;k<w*w;k++){if(!Number.isFinite(hs[k]))continue;let cur=k,steps=0;const path:number[]=[];while(cur>=0&&steps<4*w){if(drains[cur]===1||Math.abs(cur%w-n)<=1&&Math.abs(((cur/w)|0)-n)<=1){for(const p of path)drains[p]=1;drains[k]=1;break;}if(drains[cur]===2)break;path.push(cur);cur=down(cur);steps++;}if(drains[k]!==1){drains[k]=2;}}
 let cells=0;for(let k=0;k<w*w;k++)if(drains[k]===1)cells++;
 const area=cells*c*c;return{catchmentSquareMetres:area,seasonalLitres:Math.round(area*R.runoffLitresPerSquareMetreSeason),cells};
}

// ---- canals (GW-06) ----
/** A channel between two water bodies along the straight line. The channel bed
 * steps down in locks of at most `lockRiseMetres`; each reach is level, so land
 * above a reach is dug (in 2 m digs, deeper is reported as unreachable). */
export function canalRoute(g:G,a:P,b:P,team=0){
 const R=WATER_WORKS_RULES.canal,issues:string[]=[];
 if(!wet(g,a.x,a.z)||!wet(g,b.x,b.z))return{issues:['A canal joins two waters — start and end in water'],feasible:false} as const;
 const wa=g.waterAt(a.x,a.z),wb=g.waterAt(b.x,b.z),len=Math.hypot(b.x-a.x,b.z-a.z),locks=Math.ceil(Math.max(0,Math.abs(wa-wb)-R.levelToleranceMetres)/R.lockRiseMetres),steps=Math.max(1,Math.ceil(len/R.sampleMetres)),ds=len/steps;
 let volume=0,maxDig=0,unseen=0,land=0,above=0;
 for(let i=0;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(team===0&&!g.exploredAt(x,z))unseen++;if(wet(g,x,z))continue;land+=ds;
  const reach=locks?Math.min(locks,Math.floor(t*(locks+1))):0,level=wa+(wb-wa)*(locks?reach/locks:0),dig=g.height(x,z)-level+.5;if(dig>0){volume+=dig*R.channelWidthMetres*ds;maxDig=Math.max(maxDig,dig);}if(level>g.height(x,z)+.3)above=Math.max(above,level-g.height(x,z));}
 if(unseen)issues.push('Explore the whole route first');if(maxDig>R.maxDigMetres)issues.push(`The channel would need a ${maxDig.toFixed(1)} m cut — deeper than one dig`);
 if(above>0)issues.push(`The water would stand ${above.toFixed(1)} m above the ground — embankments needed (fill is not dug)`);
 return{issues,feasible:issues.length===0,lengthMetres:+len.toFixed(1),landMetres:+land.toFixed(1),levelDifferenceMetres:+Math.abs(wa-wb).toFixed(2),locks,maxDigMetres:+maxDig.toFixed(2),
  digCubicMetres:+volume.toFixed(1),digWorkSeconds:Math.round(volume*EXCAVATION_RULES.workSecondsPerCubicMeter)};
}
