import type {Game} from './sim';
import {sampleSite,type SiteFootprint} from './siteSample';
import {riverSections,sectionCentrelinePoint} from './waterSections';
import {highWaterLevel,weatherWaterLevel} from './hydrology';
import {deepWaterAt} from './deepWater';
import {EXCAVATION_RULES} from './excavation';

/** Wonder site facts, placement rules and terrain cuts (Grok W-World, answering
 * Claude Experience). Pure queries on the real terrain: nothing is edited here, and
 * a cut is never free (work seconds use the game's excavation rate).
 * Tides: the game has none yet; the only water-level range is seasonal weather
 * (drought −0.18 m … flood +0.55 m), reported as `waterLevelRangeMetres`. */
export const WONDER_SITE_RULES={version:1,riverSearchMetres:120,catchmentRingMetres:24,catchmentDropMetres:2,catchmentShare:.4,
 courtGrade:{min:.12,max:.5},openGroundMetres:30,openGroundMaxGrade:.15,observatoryProminenceMetres:6,harbourDeepMetres:2.5,
 gardenDropMetres:3,gardenWaterMetres:40,millRiverMetres:25,millMinimumWidthMetres:6,latticeMetres:1} as const;
export type WonderFamily='ringObservatory'|'crescentHarbor'|'cascadeGarden'|'canyonCistern'|'assemblyCourt'|'millMarket';
type G=Pick<Game,'world'|'state'|'height'|'waterAt'|'exploredAt'>;

export function siteWaterFacts(g:G,f:SiteFootprint){
 const R=WONDER_SITE_RULES;let best:{sectionId:string;distanceMetres:number;widthMetres:number}|null=null;
 for(const s of riverSections(g as Game)){const p=sectionCentrelinePoint(s,f),d=Math.hypot(p.x-f.x,p.z-f.z);if(d<=R.riverSearchMetres&&(!best||d<best.distanceMetres))best={sectionId:s.id,distanceMetres:+d.toFixed(1),widthMetres:+s.riverWidthMetres.toFixed(1)};}
 const base=g.world.baseWaterY,sample=sampleSite(g,f),local=g.waterAt(f.x,f.z)-g.world.waterY+base;
 return{nearestRiver:best,tides:false as const,waterLevelRangeMetres:+(weatherWaterLevel(base,'flood')-weatherWaterLevel(base,'drought')).toFixed(2),
  floodClearanceMetres:+(sample.minHeightMetres-highWaterLevel(local)).toFixed(2)};
}

const ring=(f:SiteFootprint,r:number,n=24)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return{x:f.x+Math.sin(a)*(Math.max(f.w,f.d)/2+r),z:f.z+Math.cos(a)*(Math.max(f.w,f.d)/2+r),a};});

/** Real placement rules per family; empty `issues` means the site qualifies. */
export function wonderSiteRules(g:G,family:WonderFamily,f:SiteFootprint,team=0){
 const R=WONDER_SITE_RULES,s=sampleSite(g,f),water=siteWaterFacts(g,f),issues:string[]=[],facts:Record<string,number|boolean|string|null>={};
 const corners=[[-1,-1],[1,-1],[-1,1],[1,1],[0,0]].map(([u,v])=>({x:f.x+u*f.w/2,z:f.z+v*f.d/2}));
 if(team===0&&corners.some(p=>!g.exploredAt(p.x,p.z)))issues.push('Explore the whole site first');
 // harbours stand in the water and mills straddle the bank (wheel in the race); everything else is dry
 const straddles=family==='crescentHarbor'||family==='millMarket';
 if(!straddles&&s.wetFraction>0)issues.push('The base touches water');
 if(!straddles&&water.floodClearanceMetres<0)issues.push('Below the flood line');
 if(family==='millMarket'&&s.wetFraction>.4)issues.push('Most of a mill market must stand on dry bank');
 if(family==='canyonCistern'){
  // catchment: enough of the surrounding ring stands above the rim and drains toward the pit
  const pts=ring(f,R.catchmentRingMetres),up=pts.filter(p=>g.height(p.x,p.z)>=s.meanHeightMetres+R.catchmentDropMetres).length/pts.length;
  facts.catchmentShare=+up.toFixed(2);if(up<R.catchmentShare)issues.push('A cistern needs a catchment slope draining toward it');}
 if(family==='assemblyCourt'){
  facts.meanGrade=+s.meanGrade.toFixed(3);if(s.meanGrade<R.courtGrade.min)issues.push('An assembly court needs a hillside for its raked tiers');if(s.meanGrade>R.courtGrade.max)issues.push('Too steep for seating');
  // the hillside must face open ground: the downhill apron is gentle, dry and unbuilt
  const dx=Math.sin(s.downhillRadians),dz=Math.cos(s.downhillRadians),reach=Math.max(f.w,f.d)/2;let open=true,steep=0;
  for(let k=2;k<=R.openGroundMetres;k+=4)for(const side of [-.3,0,.3]){const x=f.x+dx*(reach+k)-dz*side*f.w,z=f.z+dz*(reach+k)+dx*side*f.w,h0=g.height(x,z),grade=Math.abs(g.height(x+dx*2,z+dz*2)-h0)/2;
   if(h0<g.waterAt(x,z)+.3)open=false;if(grade>R.openGroundMaxGrade)steep++;if(g.state.buildings.some(b=>b.hp>0&&Math.abs(b.x-x)<b.w/2&&Math.abs(b.z-z)<b.d/2))open=false;}
  facts.facingRadians=+s.downhillRadians.toFixed(3);facts.openGroundAhead=open&&steep<=3;if(!facts.openGroundAhead)issues.push('The hillside must face open ground');}
 if(family==='ringObservatory'){const around=ring(f,30).map(p=>g.height(p.x,p.z)).sort((a,b)=>a-b),prom=s.meanHeightMetres-around[around.length>>1];facts.prominenceMetres=+prom.toFixed(2);if(prom<R.observatoryProminenceMetres)issues.push('An observatory needs a high point with open sky');if(s.meanGrade>.35)issues.push('Too steep for the ring');}
 if(family==='crescentHarbor'){const face=ring(f,6,16).map(p=>deepWaterAt(g as Game,p.x,p.z)),deep=face.filter(q=>q.deep).length;facts.deepFaceShare=+(deep/face.length).toFixed(2);facts.dryShare=+(1-s.wetFraction).toFixed(2);
  if(deep===0)issues.push(`A harbour needs water at least ${R.harbourDeepMetres} m deep at its face`);if(s.wetFraction>.7)issues.push('A harbour needs a shore, not open water');if(s.wetFraction===0&&deep===0)issues.push('Not on a shore');}
 if(family==='cascadeGarden'){facts.dropMetres=+s.heightRangeMetres.toFixed(2);if(s.heightRangeMetres<R.gardenDropMetres)issues.push('A cascade garden needs a slope with a real drop');if(!water.nearestRiver||water.nearestRiver.distanceMetres>R.gardenWaterMetres)issues.push('A cascade garden needs running water nearby');}
 if(family==='millMarket'){if(!water.nearestRiver||water.nearestRiver.distanceMetres>R.millRiverMetres)issues.push('A mill market must stand on a river');else if(water.nearestRiver.widthMetres<R.millMinimumWidthMetres)issues.push('The river is too small to drive a mill');}
 return{family,issues,facts,sample:{meanGrade:s.meanGrade,maxGrade:s.maxGrade,downhillRadians:s.downhillRadians,heightRangeMetres:s.heightRangeMetres,wetFraction:s.wetFraction},water};
}

/** Cut/fill for the cistern pit (floor `depthMetres` below the rim, rim = mean ground)
 * or the cavea (tiers raked uphill from the bema at `rake` m per m). */
export function wonderTerrainCut(g:G,family:'canyonCistern'|'assemblyCourt',f:SiteFootprint,options:{depthMetres?:number;rake?:number;wallMetres?:number}={}){
 const R=WONDER_SITE_RULES,s=sampleSite(g,f),step=R.latticeMetres,cell=step*step;let cut=0,fill=0,cells=0,maxCut=0;
 const up={x:-Math.sin(s.downhillRadians),z:-Math.cos(s.downhillRadians)},rim=s.meanHeightMetres,depth=options.depthMetres??3,wall=options.wallMetres??1.2,rake=options.rake??.45;
 const bema=g.height(f.x,f.z),rot=f.rotation??0,c=Math.cos(rot),sn=Math.sin(rot);
 for(let v=-f.d/2+step/2;v<f.d/2;v+=step)for(let u=-f.w/2+step/2;u<f.w/2;u+=step){
  if(family==='canyonCistern'&&(Math.abs(u)>f.w/2-wall||Math.abs(v)>f.d/2-wall))continue;
  const x=f.x+u*c+v*sn,z=f.z-u*sn+v*c,h=g.height(x,z);
  const design=family==='canyonCistern'?rim-depth:bema+Math.max(0,(x-f.x)*up.x+(z-f.z)*up.z)*rake;
  const d=h-design;if(d>0){cut+=d*cell;maxCut=Math.max(maxCut,d);}else fill+=-d*cell;cells++;}
 const floor=family==='canyonCistern'?rim-depth:bema,local=g.waterAt(f.x,f.z);
 return{family,cutCubicMetres:+cut.toFixed(1),fillCubicMetres:+fill.toFixed(1),maximumCutMetres:+maxCut.toFixed(2),cells,
  workSeconds:Math.round((cut+fill)*EXCAVATION_RULES.workSecondsPerCubicMeter),floorMetres:+floor.toFixed(2),floorBelowWaterMetres:+Math.max(0,local-floor).toFixed(2)};
}
