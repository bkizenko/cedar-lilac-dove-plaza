/** Terrain nuance beyond one angle: curvature (ridge vs hollow), aspect (sun slope), local roughness, bench/shoulder detection (natural shelf),
 *  drainage/wetness, and the risks that follow (landslip, flood, frost pocket, wind). Pure and deterministic: no random numbers, no clocks, no sim imports.
 *  All thresholds and multipliers are DESIGN VALUES (see docs/SLOPE_MODEL.md and docs/TERRACE_FARMING.md); none is a surveyed engineering figure.
 *  Used only when `state.terrainModel==='v2'`; earlier saves keep the plain graded tiers unchanged. */
import type {SiteGround} from './slopeTiers';

export type Landform='flat'|'slope'|'ridge'|'hollow'|'shelf';
export type NuanceTag='Natural shelf'|'Hollow: damp'|'Hollow: frost'|'Ridge: windy'|'Sun slope'|'Shade slope'|'Broken ground'|'Slip risk'|'Flood risk'|'Wet ground';
export type Risks={landslip:number;flood:number;frost:number;wind:number};
export type ShelfInfo={flatFraction:number;spread:number;slope:number;scarp:number;/** the surrounding hillside, mean slope in degrees */hill:number};
export type SiteNuance={
 curvature:number;landform:Landform;/** compass degrees the ground faces (downhill); 0 = north (-z), 90 = east */aspectDeg:number;/** +1 faces the midday sun, -1 turned away (hemisphere aware) */sun:number;
 roughness:number;rough:boolean;shelf:ShelfInfo|null;wetness:number;permeability:number;waterDistance:number;risks:Risks;
 costMult:{wood:number;stone:number;work:number};tags:NuanceTag[];label:string;
};
export type NuanceOptions={ground?:SiteGround;water?:(x:number,z:number)=>number;/** metres to open fresh water, when the caller already knows it */waterDistance?:number;/** +1 north, -1 south hemisphere (default north) */hemisphere?:1|-1};

export const NUANCE_RULES={
 /** ring radii (m) for curvature; mean of the two readings */ringMetres:[6,12] as readonly number[],
 /** centre minus ring mean beyond this (m) is a ridge / hollow */curvatureMetres:.7,
 /** fine survey grid spacing for roughness and shelf cells */cellMetres:1.25,maxCells:9,
 /** a cell flatter than this (degrees) counts as shelf */shelfCellDeg:8,shelfMinFraction:.55,shelfMaxSpreadMetres:.75,shelfHillDeg:10,
 roughRmsMetres:.2,wetTagFrom:.6,riskTagFrom:.4,sunTagFrom:.45,
 searchRadiusMetres:10,
} as const;
const deg=(rise:number)=>Math.atan(rise)*180/Math.PI;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const r2=(n:number)=>Math.round(n*100)/100;

/** How well the ground drains (0 clay, 1 gravel). Design values by rock name; unknown geology is middling. */
export function permeabilityOf(g:SiteGround):number{
 switch(g?.rockName){case'sandstone':return .8;case'limestone':return .9;case'volcanic':return .7;case'sediment':return .6;case'basalt':return .25;case'granite':return .2;case'shale':return .15;default:return .5;}
}
/** Open-water distance by marching 8 rays on the supplied water surface; Infinity when none within 36 m. */
export function waterDistanceBy(height:(x:number,z:number)=>number,water:(x:number,z:number)=>number,x:number,z:number,max=36){
 let best=Infinity;
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2,ux=Math.cos(a),uz=Math.sin(a);for(let r=3;r<=max;r+=3){const px=x+ux*r,pz=z+uz*r;if(height(px,pz)<water(px,pz)+.05){best=Math.min(best,r);break;}}}
 return best;
}

/** Everything the single mean angle hides. `w`/`d` is the footprint; the surroundings are read out to the larger ring. */
export function surveyNuance(height:(x:number,z:number)=>number,x:number,z:number,w:number,d:number,opts:NuanceOptions={}):SiteNuance{
 const R=NUANCE_RULES,hemi=opts.hemisphere??1,ground=opts.ground,c0=height(x,z);
 // curvature: centre minus the mean of 8 points on each ring. A plane gives 0 however steep it is.
 let curv=0;for(const rad of R.ringMetres){let s=0;for(let k=0;k<8;k++){const a=k/8*Math.PI*2;s+=height(x+Math.cos(a)*rad,z+Math.sin(a)*rad);}curv+=c0-s/8;}curv/=R.ringMetres.length;
 // fine grid over the footprint: cell slopes, plane-fit residual (roughness), shelf cells
 const nx=Math.max(2,Math.min(R.maxCells,Math.ceil(w/R.cellMetres))),nz=Math.max(2,Math.min(R.maxCells,Math.ceil(d/R.cellMetres))),sx=w/nx,sz=d/nz,h:number[][]=[];
 for(let iz=0;iz<=nz;iz++){const row:number[]=[];for(let ix=0;ix<=nx;ix++)row.push(height(x-w/2+sx*ix,z-d/2+sz*iz));h.push(row);}
 // least-squares plane over the vertices (regular grid, so the two gradients separate)
 let mx=0,mz=0,mh=0,n=0;for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){mx+=ix*sx;mz+=iz*sz;mh+=h[iz][ix];n++;}mx/=n;mz/=n;mh/=n;
 let sxx=0,szz=0,sxh=0,szh=0;for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const dx=ix*sx-mx,dz=iz*sz-mz,dh=h[iz][ix]-mh;sxx+=dx*dx;szz+=dz*dz;sxh+=dx*dh;szh+=dz*dh;}
 const gx=sxx>0?sxh/sxx:0,gz=szz>0?szh/szz:0;let ss=0;
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const fit=mh+gx*(ix*sx-mx)+gz*(iz*sz-mz),e=h[iz][ix]-fit;ss+=e*e;}
 const roughness=Math.sqrt(ss/n),rough=roughness>=R.roughRmsMetres;
 const flatH:number[]=[],cellDeg:number[]=[];let scarp=0;
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  const a=h[iz][ix],b=h[iz][ix+1],c=h[iz+1][ix],e=h[iz+1][ix+1],cx=((b+e)-(a+c))/(2*sx),cz=((c+e)-(a+b))/(2*sz),s=deg(Math.hypot(cx,cz));cellDeg.push(s);scarp=Math.max(scarp,s);
  if(s<R.shelfCellDeg)flatH.push((a+b+c+e)/4);
 }
 const flatFraction=flatH.length/Math.max(1,cellDeg.length);flatH.sort((p,q)=>p-q);
 const spread=flatH.length?flatH[Math.min(flatH.length-1,Math.floor(flatH.length*.9))]-flatH[Math.floor(flatH.length*.1)]:0;
 // the hillside around the footprint: mean slope on the 12 m ring (centre to ring points)
 let hill=0;for(let k=0;k<8;k++){const a=k/8*Math.PI*2,rad=R.ringMetres[R.ringMetres.length-1];hill+=deg(Math.abs(height(x+Math.cos(a)*rad,z+Math.sin(a)*rad)-c0)/rad);}hill/=8;
 hill=Math.max(hill,deg(Math.hypot(gx,gz)));
 const flatSlope=flatH.length?cellDeg.filter(s=>s<R.shelfCellDeg).reduce((p,q)=>p+q,0)/flatH.length:0;
 const isShelf=flatFraction>=R.shelfMinFraction&&spread<=R.shelfMaxSpreadMetres&&hill>=R.shelfHillDeg;
 const shelf:ShelfInfo|null=isShelf?{flatFraction:r2(flatFraction),spread:r2(spread),slope:r2(flatSlope),scarp:r2(scarp),hill:r2(hill)}:null;
 const gl=Math.hypot(gx,gz),down=gl>1e-9?{x:-gx/gl,z:-gz/gl}:{x:0,z:1};
 // aspect: 0 = north (-z), clockwise. The sun is south (+z) in the north hemisphere, north (-z) in the south.
 const aspectDeg=((Math.atan2(down.x,-down.z)*180/Math.PI)+360)%360,slopeDeg=deg(gl),facing=down.z*hemi;
 const sun=Math.max(-1,Math.min(1,facing*clamp01(slopeDeg/8)));
 // drainage and wetness
 const perm=permeabilityOf(ground),wd=opts.waterDistance??(opts.water?waterDistanceBy(height,opts.water,x,z):Infinity);
 const concave=clamp01(-curv/(R.curvatureMetres*2.5)),convex=clamp01(curv/(R.curvatureMetres*2.5));
 const wetness=clamp01(.3*concave+.3*(Number.isFinite(wd)?clamp01(1-wd/30):0)+.22*clamp01(1-slopeDeg/7)+.28*(1-perm)-.12*convex);
 const loose=ground?.rockName==='shale'||ground?.rockName==='sediment'||ground?.rockName==='volcanic';
 const hollow=curv<=-R.curvatureMetres,ridge=curv>=R.curvatureMetres;
 const landslip=clamp01((Math.max(slopeDeg,hill*.8)-14)/30*(hollow?1.3:1)*(.55+.7*wetness)*(loose?1.35:1));
 let flood=0;if(opts.water&&Number.isFinite(wd)){const above=c0-opts.water(x,z);flood=clamp01((2.2-above)/2.2)*clamp01(1-wd/40)*(hollow?1.3:1);}
 const frost=hollow?clamp01(-curv/(R.curvatureMetres*3))*(slopeDeg<12?1:.6):0,wind=ridge?clamp01(curv/(R.curvatureMetres*3)):0;
 const risks:Risks={landslip:r2(landslip),flood:r2(clamp01(flood)),frost:r2(frost),wind:r2(wind)};
 const landform:Landform=shelf?'shelf':hollow?'hollow':ridge?'ridge':slopeDeg<4?'flat':'slope';
 const tags:NuanceTag[]=[];
 if(risks.landslip>=R.riskTagFrom)tags.push('Slip risk');
 if(risks.flood>=R.riskTagFrom)tags.push('Flood risk');
 if(shelf)tags.push('Natural shelf');
 if(hollow&&wetness>=R.wetTagFrom)tags.push('Hollow: damp');else if(hollow&&risks.frost>=R.riskTagFrom)tags.push('Hollow: frost');else if(wetness>=.75)tags.push('Wet ground');
 if(ridge&&risks.wind>=.3)tags.push('Ridge: windy');
 if(rough)tags.push('Broken ground');
 if(slopeDeg>=5&&sun>=R.sunTagFrom)tags.push('Sun slope');else if(slopeDeg>=5&&sun<=-R.sunTagFrom)tags.push('Shade slope');
 // cost multipliers (building foundations); a shelf is half-built by nature
 const wet=wetness>=R.wetTagFrom&&(hollow||wetness>=.75)?1:0;
 const cm={wood:1+.1*wet,stone:(1+.1*wet+(rough?.1:0))*(1+.5*risks.landslip),work:(1+Math.min(.35,Math.max(0,roughness-.08)*1.2)+.15*wet)*(1+.4*risks.landslip)};
 return{curvature:r2(curv),landform,aspectDeg:Math.round(aspectDeg),sun:r2(sun),roughness:r2(roughness),rough,shelf,wetness:r2(wetness),permeability:perm,waterDistance:Number.isFinite(wd)?wd:-1,risks,
  costMult:{wood:r2(cm.wood),stone:r2(cm.stone),work:r2(cm.work)},tags,label:tags.slice(0,2).join(' · ')};
}

/** Look for a natural bench within `radius` of a point: 8 directions x 3 distances, flattest wins. For the placement hint only (not read by rules). */
export function findShelf(height:(x:number,z:number)=>number,x:number,z:number,w:number,d:number,radius:number=NUANCE_RULES.searchRadiusMetres):{dx:number;dz:number;distance:number;flatFraction:number}|null{
 let best:{dx:number;dz:number;distance:number;flatFraction:number}|null=null;
 for(const r of[radius*.4,radius*.7,radius])for(let k=0;k<8;k++){
  const a=k/8*Math.PI*2,dx=Math.cos(a)*r,dz=Math.sin(a)*r,n=surveyNuance(height,x+dx,z+dz,w,d);
  if(n.shelf&&(!best||n.shelf.flatFraction>best.flatFraction+1e-9||(Math.abs(n.shelf.flatFraction-best.flatFraction)<1e-9&&r<best.distance)))best={dx:r2(dx),dz:r2(dz),distance:r2(r),flatFraction:n.shelf.flatFraction};
 }
 return best;
}
/** Short compass word for a direction (the preview hint says "shelf 6 m uphill / north-west"). */
export function compassWord(dx:number,dz:number){
 const a=((Math.atan2(dx,-dz)*180/Math.PI)+360)%360;return['north','north-east','east','south-east','south','south-west','west','north-west'][Math.round(a/45)%8];
}
