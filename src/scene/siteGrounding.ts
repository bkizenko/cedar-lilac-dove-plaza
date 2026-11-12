/** Pure adapter from Grok's SiteSample (src/game/siteSample.ts on
 * agents/grok-world, contract v1) to what the carved renderer and the wonder
 * plans need: floor level, a visible foundation sized to the actual ground,
 * entrance steps, habitat and wonder site facts. It never edits terrain and
 * never moves the footprint: buildings stay exactly footprint-sized and the
 * plinth sits wholly under the footprint rectangle.
 *
 * SiteSampleLike mirrors the v1 field names so a real SiteSample is accepted
 * structurally (no import from the sim). If Grok bumps `version`, update here. */
import {part,type Part} from './buildingParts';
import type {Habitat} from './buildingStyleMap';
import type {WonderFamily,WonderSite} from './wonderPlans';

export type SiteSampleLike={version?:number;columns:number;rows:number;heights:ArrayLike<number>;minHeightMetres:number;maxHeightMetres:number;meanHeightMetres:number;heightRangeMetres:number;
 maxGrade:number;meanGrade:number;downhillRadians:number;wetFraction:number;minimumDryClearanceMetres:number;biome:string|null;biomeShares:Partial<Record<string,number>>;foundationDepthMetres:number};
export const GROUNDING_RULES={version:1,maxPlinthMetres:1.2,maxVisiblePlinthMetres:2.4,levelToleranceMetres:.12,stepRiseMetres:.18,stepTreadMetres:.3,steepGrade:.6,wetRefusalFraction:.02} as const;

/** Province kinds (ecologicalProvinces.ts) to generator habitats; unknown kinds fall back to plains. */
const BIOME_HABITAT:Record<string,Habitat>={meadow:'plains','mixed-woodland':'forest','conifer-forest':'forest',alpine:'hills',wetland:'wetland','dry-scrub':'plains',arid:'desert','warm-coast':'plains'};
export function habitatFromSite(s:SiteSampleLike):Habitat{
 const tally:Partial<Record<Habitat,number>>={};
 for(const [k,v] of Object.entries(s.biomeShares))if(v&&Number.isFinite(v)){const h=BIOME_HABITAT[k]??'plains';tally[h]=(tally[h]||0)+v;}
 let best:Habitat|null=null,bv=0;for(const h of Object.keys(tally).sort() as Habitat[])if(tally[h]!>bv+1e-9){best=h;bv=tally[h]!;}
 return best??(s.biome?BIOME_HABITAT[s.biome]??'plains':'plains');
}
/** Bilinear ground height at local fractions u (along X) and v (along Z), each in [-.5,.5]. */
export function siteHeightAt(s:SiteSampleLike,u:number,v:number){
 const fx=(Math.max(-.5,Math.min(.5,u))+.5)*(s.columns-1),fz=(Math.max(-.5,Math.min(.5,v))+.5)*(s.rows-1),i=Math.min(s.columns-2<0?0:s.columns-2,Math.floor(fx)),j=Math.min(s.rows-2<0?0:s.rows-2,Math.floor(fz));
 const ti=s.columns>1?fx-i:0,tj=s.rows>1?fz-j:0,at=(a:number,b:number)=>s.heights[Math.min(s.rows-1,b)*s.columns+Math.min(s.columns-1,a)];
 return (at(i,j)*(1-ti)+at(i+1,j)*ti)*(1-tj)+(at(i,j+1)*(1-ti)+at(i+1,j+1)*ti)*tj;
}
export type SiteGrounding={floorY:number;/** deepest visible foundation under the footprint */plinthDepthMetres:number;needsPlinth:boolean;
 /** ground height at the +Z entrance edge and the drop from floor to it */entranceGroundY:number;entranceDropM:number;entranceSteps:number;
 /** direction the ground falls, in the footprint's local frame (radians, atan2(x,z)); rotate by the building yaw */downhillLocalRadians:number;
 habitat:Habitat;verdict:'ok'|'steep'|'wet';reason?:string};
/** Decide the floor level and foundation. Floor = max(mean height, max - maxPlinth): the
 * downhill side gets a plinth up to 1.2 m, the uphill side is buried (what a cut would show). */
export function groundSite(s:SiteSampleLike,opts:{/** building yaw so downhill can be given locally */yaw?:number}={}):SiteGrounding{
 const R=GROUNDING_RULES,floorY=Math.max(s.meanHeightMetres,s.maxHeightMetres-R.maxPlinthMetres);
 let low=Infinity;for(let k=0;k<s.heights.length;k++)low=Math.min(low,s.heights[k]);if(!Number.isFinite(low))low=s.minHeightMetres;
 const depth=Math.max(0,floorY-low);
 let e=0;for(let i=0;i<s.columns;i++)e+=s.heights[(s.rows-1)*s.columns+i];e/=Math.max(1,s.columns);
 const drop=Math.max(0,floorY-e),steps=drop>R.levelToleranceMetres+.06?Math.ceil(drop/R.stepRiseMetres):0;
 const verdict:SiteGrounding['verdict']=s.wetFraction>R.wetRefusalFraction?'wet':s.maxGrade>R.steepGrade||depth>R.maxVisiblePlinthMetres?'steep':'ok';
 const reason=verdict==='wet'?`${Math.round(s.wetFraction*100)}% of the footprint is under water`:verdict==='steep'?`Ground is too steep (grade ${s.maxGrade.toFixed(2)}, foundation ${depth.toFixed(1)} m)`:undefined;
 return {floorY,plinthDepthMetres:depth,needsPlinth:depth>R.levelToleranceMetres,entranceGroundY:e,entranceDropM:drop,entranceSteps:steps,downhillLocalRadians:s.downhillRadians-(opts.yaw??0),habitat:habitatFromSite(s),verdict,...(reason?{reason}:{})};
}
export type PlinthSpec={footprint:{w:number;d:number};/** parts in the building frame; y=0 is the floor, bases are at or below 0 */parts:Part[];triangles:number;
 /** entrance steps lie OUTSIDE the footprint on +Z; each step is {rise,run} from the floor down to ground */steps:{count:number;riseM:number;treadM:number;widthM:number;extentBeyondFootprintM:number}};
/** Stone foundation that follows the real ground: one box per run of lattice cells whose depth differs by under 10 cm, all inside the footprint. */
export function plinthSpec(s:SiteSampleLike,footprint:{w:number;d:number},g:SiteGrounding=groundSite(s)):PlinthSpec{
 const parts:Part[]=[],cw=footprint.w/Math.max(1,s.columns-1),cd=footprint.d/Math.max(1,s.rows-1);
 if(g.needsPlinth)for(let j=0;j<s.rows-1;j++){let i=0;
  const depthAt=(a:number)=>{const h=(s.heights[j*s.columns+a]+s.heights[j*s.columns+a+1]+s.heights[(j+1)*s.columns+a]+s.heights[(j+1)*s.columns+a+1])/4;return Math.max(0,g.floorY-h);};
  while(i<s.columns-1){const d0=depthAt(i);if(d0<.05){i++;continue;}let k=i+1,mx=d0;while(k<s.columns-1&&Math.abs(depthAt(k)-d0)<.1){mx=Math.max(mx,depthAt(k));k++;}
   const len=(k-i)*cw;parts.push(part('box','stoneDark',[len,mx,cd],[-footprint.w/2+(i+k)/2*cw,-mx,-footprint.d/2+(j+.5)*cd],2));
   // Dressed stone cap line at floor level, readable at mid distance.
   parts.push(part('box','stone',[len,.06,cd],[-footprint.w/2+(i+k)/2*cw,-.06,-footprint.d/2+(j+.5)*cd],1));i=k;}}
 const steps=g.entranceSteps>0?{count:g.entranceSteps,riseM:g.entranceDropM/g.entranceSteps,treadM:GROUNDING_RULES.stepTreadMetres,widthM:Math.min(1.6,footprint.w*.4),extentBeyondFootprintM:g.entranceSteps*GROUNDING_RULES.stepTreadMetres}:{count:0,riseM:0,treadM:0,widthM:0,extentBeyondFootprintM:0};
 return {footprint:{...footprint},parts,triangles:parts.length*12,steps};
}

/** Can this wonder stand here, and with which site facts? (Water mapping is limited to what SiteSample carries.) */
export function wonderSiteIssues(family:WonderFamily,s:SiteSampleLike):string[]{
 const out:string[]=[],g=s.maxGrade,w=s.wetFraction;
 if(family==='crescentHarbor'){if(w<.3)out.push(`Harbour needs open water over at least 30% of the site (${Math.round(w*100)}% wet)`);if(g>.5)out.push('Quay ground is too steep');}
 else if(family==='millMarket'){if(w<.08||w>.55)out.push(`Mill market needs a stream crossing 8-55% of the site (${Math.round(w*100)}% wet)`);if(g>.5)out.push('Court ground is too steep');}
 else{if(w>.02)out.push('Part of the site is under water');if(family==='cascadeGarden'?g>.55:family==='assemblyCourt'?g>.4:g>.3)out.push(`Ground is too steep for this wonder (grade ${g.toFixed(2)})`);}
 return out;
}
/** Wonder site facts derivable from a SiteSample: flow runs downhill (X sign), faster on steeper ground;
 * bank height from relief; open coast from the warm-coast province. Tide and river width are NOT in SiteSample (Grok to supply). */
export function wonderSiteFromSample(s:SiteSampleLike):WonderSite{
 const share=s.biomeShares['warm-coast']??0,flowSpeedMps=Math.round(Math.max(.3,Math.min(3,Math.sqrt(Math.max(0,s.meanGrade))*3))*100)/100;
 return {flowDir:Math.sin(s.downhillRadians)>=0?1:-1,flowSpeedMps,bankHeightM:Math.round(Math.max(.6,Math.min(1.6,s.heightRangeMetres*.5))*100)/100,exposed:share>=.3||s.biome==='warm-coast',flow:s.meanGrade>.02?'river':'still',grade:Math.round(s.meanGrade*1000)/1000};
}
