/** Compare actual ocean coastlines, including coves; inland lakes do not fake a new coast.
 * Normalize translation and scale, then test rotations/reflections by raster IoU.
 * This is a bounded perceptual guard, not a proof all possible maps are unique. */
export const COAST_FINGERPRINT_RULES={version:1,resolution:48,rotationSteps:72,minimumAreaSquareMeters:18000,minimumDifference:.14} as const;
export type CoastRaster={cells:Uint8Array;resolution:number};
type Terrain={size:number;segs:number;heights:Float32Array;waterY:number;waterHeights?:Float32Array};
export function rasterDifference(a:CoastRaster,b:CoastRaster){
 const n=a.resolution;if(n!==b.resolution)throw new Error('Coast raster resolutions differ');let best=1;
 for(const mirror of[-1,1])for(let turn=0;turn<COAST_FINGERPRINT_RULES.rotationSteps;turn++){
  const angle=turn*Math.PI*2/COAST_FINGERPRINT_RULES.rotationSteps,c=Math.cos(angle),s=Math.sin(angle);let intersection=0,union=0;
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const dx=(x+.5-n/2)*mirror,dz=z+.5-n/2,bx=Math.floor(dx*c-dz*s+n/2),bz=Math.floor(dx*s+dz*c+n/2),av=a.cells[z*n+x],bv=bx>=0&&bz>=0&&bx<n&&bz<n?b.cells[bz*n+bx]:0;if(av&&bv)intersection++;if(av||bv)union++;}
  best=Math.min(best,union?1-intersection/union:0);
 }return best;
}
export function measureCoastFingerprints(w:Terrain){
 const width=w.segs+1,step=w.size/w.segs,labels=new Int32Array(w.heights.length).fill(-1),parts:{id:number;areaSquareMeters:number;raster:CoastRaster;centroid:{x:number;z:number}}[]=[];
 // Flood only sea-level water connected to the map edge. Enclosed and raised
 // freshwater stays inside the island silhouette: adding a lake cannot disguise
 // an otherwise identical coastline. Rivers/estuaries below sea level remain cuts.
 const ocean=new Uint8Array(w.heights.length),sea:number[]=[];
 const enqueue=(i:number)=>{if(!ocean[i]&&w.heights[i]<=w.waterY+.25){ocean[i]=1;sea.push(i);}};
 for(let i=0;i<width;i++){enqueue(i);enqueue(w.segs*width+i);enqueue(i*width);enqueue(i*width+w.segs);}
 for(let at=0;at<sea.length;at++){const p=sea[at],x=p%width,z=Math.floor(p/width);for(const j of[x?p-1:-1,x<w.segs?p+1:-1,z?p-width:-1,z<w.segs?p+width:-1])if(j>=0)enqueue(j);}
 const dry=(i:number)=>!ocean[i];let nextId=0;
 for(let start=0;start<labels.length;start++)if(labels[start]<0&&dry(start)){
  const id=nextId++,q=[start];labels[start]=id;let sx=0,sz=0;
  for(let at=0;at<q.length;at++){const p=q[at],x=p%width,z=Math.floor(p/width);sx+=x;sz+=z;for(const j of[x?p-1:-1,x<w.segs?p+1:-1,z?p-width:-1,z<w.segs?p+width:-1])if(j>=0&&labels[j]<0&&dry(j)){labels[j]=id;q.push(j);}}
  const area=q.length*step*step;if(area<COAST_FINGERPRINT_RULES.minimumAreaSquareMeters)continue;
  const cx=sx/q.length,cz=sz/q.length;let radius=0;for(const p of q)radius=Math.max(radius,Math.hypot(p%width-cx,Math.floor(p/width)-cz));radius+=1;
  const n=COAST_FINGERPRINT_RULES.resolution,cells=new Uint8Array(n*n);
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){const gx=Math.round(cx+(x+.5-n/2)*radius*2/n),gz=Math.round(cz+(z+.5-n/2)*radius*2/n);if(gx>=0&&gz>=0&&gx<width&&gz<width&&labels[gz*width+gx]===id)cells[z*n+x]=1;}
  parts.push({id,areaSquareMeters:area,raster:{cells,resolution:n},centroid:{x:cx*step-w.size/2,z:cz*step-w.size/2}});
 }
 const pairs:{a:number;b:number;difference:number}[]=[];for(let i=0;i<parts.length;i++)for(let j=0;j<i;j++)pairs.push({a:parts[j].id,b:parts[i].id,difference:rasterDifference(parts[j].raster,parts[i].raster)});
 return{version:1,substantialLandmassCount:parts.length,minimumDifference:pairs.length?Math.min(...pairs.map(p=>p.difference)):null,pairs,landmasses:parts.map(({raster,...p})=>p)};
}
