/** Graded slope model (replaces the single pass/fail tolerance in siteSlope.ts for saves that carry `state.slopeModel==='graded'`).
 *  Pure and deterministic: no random numbers or clocks, no imports from the sim. All numbers are DESIGN VALUES (see docs/SLOPE_MODEL.md).
 *  Four tiers by mean slope AND by fall across the footprint, tolerances per building class, a foundation that will be built,
 *  and a bill of real goods (wood, stone) plus extra worker-seconds. Nothing is teleported: the extra goods are spent like any other cost. */
import type {BldType} from './types';

export type SlopeTier='level'|'moderate'|'steep'|'severe';
export type SlopeClass='dwelling'|'shelter'|'light'|'workshop'|'storage'|'civic'|'wonder'|'tower'|'field'|'dock'|'exempt';
/** none: bare ground; pad: levelled cut-and-fill pad with a kerb; terrace: stepped terrace with a drystone retaining wall;
 *  stilts: post platform; dugout: cut into the slope; outcrop: footing keyed into bare rock; strips: terraced field strips. */
export type FoundationKind='none'|'pad'|'terrace'|'stilts'|'dugout'|'outcrop'|'strips';
export type SiteGround={rockName?:string;hardness?:number;soilDepthMeters?:number;landformTag?:string}|null|undefined;
export type SiteRecord={v:1;tier:SlopeTier;foundation:FoundationKind;slope:number;fall:number;extraWork:number;wood:number;stone:number};

export const SLOPE_MODEL_VERSION=1;
export const SLOPE_COLOURS:Record<SlopeTier,string>={level:'#4caf50',moderate:'#e0a020',steep:'#e0701c',severe:'#c0392b'};
export const SLOPE_TIERS:readonly SlopeTier[]=['level','moderate','steep','severe'];
export const SLOPE_FOUNDATIONS:readonly FoundationKind[]=['none','pad','terrace','stilts','dugout','outcrop','strips'];

/** Per class: mean-slope ceilings (degrees) of level / moderate / steep; fall scale k; largest footprint (m2) allowed on a steep
 *  tier; whether a post platform is acceptable (never for fire/kiln work); severe-tier exception. */
type Profile={level:number;moderate:number;steep:number;fallK:number;steepMaxArea:number;stilts:boolean;severe?:'light'|'dugout'|'outcrop'};
export const CLASS_PROFILES:Record<Exclude<SlopeClass,'exempt'>,Profile>={
 dwelling:{level:5,moderate:15,steep:25,fallK:1,steepMaxArea:70,stilts:true,severe:'dugout'},
 shelter:{level:5,moderate:14,steep:22,fallK:1,steepMaxArea:40,stilts:true},
 light:{level:6,moderate:16,steep:28,fallK:1.2,steepMaxArea:24,stilts:true,severe:'light'},
 workshop:{level:4,moderate:11,steep:18,fallK:.9,steepMaxArea:60,stilts:false},
 storage:{level:3,moderate:8,steep:14,fallK:.7,steepMaxArea:40,stilts:false},
 civic:{level:3,moderate:7,steep:12,fallK:.6,steepMaxArea:150,stilts:false},
 wonder:{level:2,moderate:5,steep:9,fallK:.5,steepMaxArea:400,stilts:false},
 tower:{level:5,moderate:14,steep:25,fallK:1,steepMaxArea:36,stilts:false,severe:'outcrop'},
 field:{level:5,moderate:12,steep:22,fallK:1.5,steepMaxArea:400,stilts:false},
 dock:{level:4,moderate:10,steep:18,fallK:.6,steepMaxArea:60,stilts:true},
};
/** Fall across the footprint (metres, scaled by the class k and by footprint size beyond a 5.4 m hut): level / moderate / steep ceilings. */
export const FALL_LIMITS=[.5,1.8,3.5] as const;
/** A ledge steeper than this between neighbouring samples is a cliff face: severe whatever the mean says. */
export const SEVERE_FROM_STEP_DEGREES=50;
/** Mean slope from which a post platform is offered beside the terrace (and then wins when cheaper). */
export const STILTS_FROM_DEGREES=18;

const CLASS_OF:Partial<Record<BldType,SlopeClass>>={
 hut:'dwelling',house:'dwelling',
 dryrack:'light',
 fibreWorkshop:'shelter',potter:'shelter',tailor:'shelter',tanner:'shelter',butcher:'shelter',grindingStone:'shelter',hearth:'shelter',smokehouse:'shelter',
 kiln:'workshop',oven:'workshop',forge:'workshop',workshop:'workshop',barracks:'workshop',stables:'workshop',windmill:'workshop',
 warehouse:'storage',threshingFloor:'storage',well:'storage',cistern:'storage',
 townhall:'civic',temple:'civic',market:'civic',university:'civic',keep:'civic',
 watchtower:'tower',farm:'field',dock:'dock',
};
export function slopeClassOf(type:BldType|string):SlopeClass{return /^wonder/.test(type)?'wonder':CLASS_OF[type as BldType]??'exempt';}
/** Fire and kiln work never goes on a post platform. */
const FIRE=new Set<string>(['kiln','oven','forge','smokehouse','hearth','potter']);

export type SiteSurvey={meanSlopeDeg:number;maxStepDeg:number;fall:number;min:number;max:number;samples:number;area:number;extent:number;downhill:{x:number;z:number}};
export const SURVEY_RULES={sampleStepMetres:1.5,minGrid:2,maxGrid:8} as const;
const deg=(rise:number)=>Math.atan(rise)*180/Math.PI;
/** Survey a footprint on a bounded grid. `water` (optional) clamps submerged bank to the water surface so docks only count the dry slope. */
export function surveySite(height:(x:number,z:number)=>number,x:number,z:number,w:number,d:number,water?:(x:number,z:number)=>number):SiteSurvey{
 const R=SURVEY_RULES,nx=Math.max(R.minGrid,Math.min(R.maxGrid,Math.ceil(w/R.sampleStepMetres))),nz=Math.max(R.minGrid,Math.min(R.maxGrid,Math.ceil(d/R.sampleStepMetres))),sx=w/nx,sz=d/nz;
 const h:number[][]=[];let lo=Infinity,hi=-Infinity;
 for(let iz=0;iz<=nz;iz++){const row:number[]=[];for(let ix=0;ix<=nx;ix++){const px=x-w/2+sx*ix,pz=z-d/2+sz*iz;let v=height(px,pz);if(water)v=Math.max(v,water(px,pz));row.push(v);lo=Math.min(lo,v);hi=Math.max(hi,v);}h.push(row);}
 let step=0,sum=0,gxs=0,gzs=0;
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){if(ix<nx)step=Math.max(step,Math.abs(h[iz][ix+1]-h[iz][ix])/sx);if(iz<nz)step=Math.max(step,Math.abs(h[iz+1][ix]-h[iz][ix])/sz);}
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const gx=((h[iz][ix+1]+h[iz+1][ix+1])-(h[iz][ix]+h[iz+1][ix]))/(2*sx),gz=((h[iz+1][ix]+h[iz+1][ix+1])-(h[iz][ix]+h[iz][ix+1]))/(2*sz);sum+=deg(Math.hypot(gx,gz));gxs+=gx;gzs+=gz;}
 const cells=nx*nz,gl=Math.hypot(gxs,gzs);
 return{meanSlopeDeg:sum/cells,maxStepDeg:deg(step),fall:hi-lo,min:lo,max:hi,samples:(nx+1)*(nz+1),area:w*d,extent:Math.max(w,d),downhill:gl>1e-9?{x:-gxs/gl,z:-gzs/gl}:{x:0,z:1}};
}

export type GroundKind='rock'|'soft-rock'|'unstable'|'plain';
/** Geology/soil reading used for cost and stability only (all fields optional; no geology means 'plain'). */
export function groundKind(g:SiteGround):GroundKind{
 if(!g)return'plain';const hard=g.hardness??0,soil=g.soilDepthMeters??1,tag=g.landformTag??'';
 if(g.rockName==='shale'||g.rockName==='sediment')return'unstable';
 const exposed=soil<=.8||/^(cliff|escarpment|crag|exposed|basalt)/.test(tag);
 if(hard>=.8&&exposed)return'rock';
 if(hard>=.25&&exposed)return'soft-rock';
 return'plain';
}
/** Rock our people can cut with antler, stone and fire: sandstone, limestone, tuff. Granite and basalt are too hard to dig out. */
export const isDiggableRock=(g:SiteGround)=>groundKind(g)==='soft-rock';
/** Hard bedrock outcrop: cheaper drystone (quarried on the spot), a footing for a tower. */
export const isHardRock=(g:SiteGround)=>groundKind(g)==='rock';
/** Any exposed bedrock a tower can be footed on. */
export const isOutcrop=(g:SiteGround)=>{const k=groundKind(g);return k==='rock'||k==='soft-rock';};

export const COST_RULES={stoneUnitsPerM3:4,woodUnitsPerMetreOfPost:.6,earthSecondsPerM3:.5,wallSecondsPerM3:1.5,steepSlowdown:1.25} as const;
type Bill={wood:number;stone:number;work:number};
const bill=(wood:number,stone:number,work:number):Bill=>({wood:Math.max(0,Math.ceil(wood-1e-9)),stone:Math.max(0,Math.ceil(stone-1e-9)),work:Math.round(work*10)/10});
/** Cost of one foundation kind for a footprint w x d with fall F (metres). Geology scales stone and labour. */
export function foundationBill(kind:FoundationKind,w:number,d:number,fall:number,ground:GroundKind='plain',hardness=0):Bill{
 const R=COST_RULES,A=w*d,L=(w+d)/2,rockStone=ground==='rock'?.6:1,earth=ground==='rock'?1.25:1,slip=ground==='unstable'?1.25:1;
 if(kind==='none')return bill(0,0,0);
 if(kind==='pad'){const V=A*fall/4,kerbH=fall/2+.15,Vk=L*kerbH*.3;return bill(L/2.5,Vk*R.stoneUnitsPerM3*rockStone*slip,V*R.earthSecondsPerM3*earth*slip+Vk*R.wallSecondsPerM3);}
 if(kind==='terrace'){const V=A*fall/3,Lw=L*1.15,H=fall*.6+.35,T=.45+.12*H,Vw=Lw*H*T;return bill(Lw/3,Vw*R.stoneUnitsPerM3*rockStone*slip,V*R.earthSecondsPerM3*earth*slip+Vw*R.wallSecondsPerM3*slip);}
 if(kind==='stilts'){const n=(Math.ceil(w/2.7)+1)*(Math.ceil(d/2.7)+1),len=fall/2+.9,brace=1+.35*fall;return bill(n*len*R.woodUnitsPerMetreOfPost*1.3*brace*slip,n*.25,n*(1.5+len*.5)*brace*slip*.5);}
 if(kind==='dugout'){const V=A*Math.min(fall+.8,2.4)/2;return bill(6+w/2,w*1.2,V*(.3+1*hardness));}
 if(kind==='outcrop')return bill(2,A*.1*rockStone,A*.5*(1+hardness));
 const n=Math.max(1,Math.ceil(fall/.7)),Vs=n*L*.5*.4,walled=fall>1.8;
 return bill(0,walled?Vs*R.stoneUnitsPerM3*rockStone*slip:0,A*fall/4*R.earthSecondsPerM3*.8*earth+(walled?Vs*R.wallSecondsPerM3:0));
}

export type SiteAssessment={
 model:'graded';type:string;slopeClass:SlopeClass;tier:SlopeTier;foundation:FoundationKind;ok:boolean;issue:string|null;
 label:string;detail:string;colour:string;meanSlopeDeg:number;maxStepDeg:number;fall:number;area:number;
 extraWood:number;extraStone:number;extraWork:number;workPct:number;ground:GroundKind;downhill:{x:number;z:number};
};
export type AssessOptions={ground?:SiteGround;water?:(x:number,z:number)=>number;baseWork?:number};
const r1=(n:number)=>Math.round(n*10)/10;
/** Tier of a survey for a class: slope and fall, the worse wins; a ledge steeper than 50 degrees is severe. Loose ground lowers the ceilings 15%. */
export function tierFor(cls:Exclude<SlopeClass,'exempt'>,s:SiteSurvey,kind:GroundKind='plain'):SlopeTier{
 const p=CLASS_PROFILES[cls],soften=kind==='unstable'?.85:1,slope=Math.round(s.meanSlopeDeg*100)/100,k=p.fallK*Math.max(1,s.extent/5.4);
 const bySlope=slope<p.level*soften?0:slope<p.moderate*soften?1:slope<p.steep*soften?2:3;
 const byFall=s.fall<FALL_LIMITS[0]*k?0:s.fall<FALL_LIMITS[1]*k?1:s.fall<FALL_LIMITS[2]*k?2:3;
 return SLOPE_TIERS[Math.max(bySlope,byFall,s.maxStepDeg>SEVERE_FROM_STEP_DEGREES?3:0)];
}
const TIER_WORD:Record<SlopeTier,string>={level:'Level site',moderate:'Needs levelling',steep:'Terrace and wall',severe:'Too steep'};
const KIND_WORD:Record<FoundationKind,string>={none:'Level site',pad:'Needs levelling',terrace:'Terrace and wall',stilts:'Posts on steep ground',dugout:'Cut into the slope',outcrop:'Footing on the outcrop',strips:'Terraced strips'};
const FOUNDATION_TEXT:Record<FoundationKind,string>={none:'bare ground',pad:'levelled pad with a kerb',terrace:'stepped terrace and drystone retaining wall',stilts:'post platform',dugout:'dugout cut into the slope',outcrop:'footing keyed into the rock',strips:'terraced field strips'};
export const foundationText=(k:FoundationKind)=>FOUNDATION_TEXT[k];
function candidates(cls:Exclude<SlopeClass,'exempt'>,tier:SlopeTier,type:string,s:SiteSurvey,g:SiteGround):FoundationKind[]{
 const p=CLASS_PROFILES[cls];
 if(tier==='level')return['none'];
 if(cls==='field')return tier==='severe'?[]:['strips'];
 if(cls==='dock')return['stilts'];
 if(tier==='moderate')return['pad'];
 if(tier==='steep'){
  if(cls==='light')return['stilts'];
  const out:FoundationKind[]=['terrace'];
  // timber pole platforms are for small, light buildings on really steep ground; below 18 degrees a terrace is the sounder job
  if(p.stilts&&!FIRE.has(type)&&s.meanSlopeDeg>=STILTS_FROM_DEGREES)out.push('stilts');
  if(cls==='dwelling'&&isDiggableRock(g)&&s.meanSlopeDeg>=10)out.push('dugout');
  if(cls==='tower'&&isOutcrop(g))out.push('outcrop');
  return out;
 }
 // severe: only the three exceptions
 if(p.severe==='light')return s.meanSlopeDeg<=35&&s.maxStepDeg<=60?['stilts']:[];
 if(p.severe==='dugout')return isDiggableRock(g)&&s.meanSlopeDeg<=50?['dugout']:[];
 if(p.severe==='outcrop')return isOutcrop(g)&&s.meanSlopeDeg<=55?['outcrop']:[];
 return[];
}
const score=(b:Bill)=>b.wood+b.stone+b.work/4;
/** Assess a site: tier, foundation, goods and labour. Class 'exempt' types (walls, bridges, camps...) are returned level and free. */
export function assessSite(height:(x:number,z:number)=>number,type:BldType|string,x:number,z:number,w:number,d:number,opts:AssessOptions={}):SiteAssessment{
 const cls=slopeClassOf(type),s=surveySite(height,x,z,w,d,cls==='dock'?opts.water:undefined),gk=groundKind(opts.ground),hardness=opts.ground?.hardness??0;
 const base:SiteAssessment={model:'graded',type,slopeClass:cls,tier:'level',foundation:'none',ok:true,issue:null,label:TIER_WORD.level,detail:'',colour:SLOPE_COLOURS.level,meanSlopeDeg:r1(s.meanSlopeDeg),maxStepDeg:r1(s.maxStepDeg),fall:Math.round(s.fall*100)/100,area:w*d,extraWood:0,extraStone:0,extraWork:0,workPct:0,ground:gk,downhill:s.downhill};
 if(cls==='exempt')return base;
 const p=CLASS_PROFILES[cls],tier=tierFor(cls,s,gk);
 base.tier=tier;base.colour=SLOPE_COLOURS[tier];
 const label=`${base.meanSlopeDeg.toFixed(0)}° mean slope, ${base.fall.toFixed(1)} m fall`;
 const refuse=(why:string):SiteAssessment=>({...base,ok:false,issue:`Too steep for ${why}`,label:TIER_WORD.severe,tier:'severe',colour:SLOPE_COLOURS.severe,detail:why});
 if(tier==='level'){base.detail=`${label} · no extra work`;return base;}
 if((tier==='steep'||tier==='severe')&&base.area>p.steepMaxArea&&cls!=='field')return refuse(`a building this large (${label}) — choose a smaller footprint or gentler ground`);
 const options=candidates(cls,tier,type,s,opts.ground);
 if(!options.length)return refuse(`this building (${label}) — pick a gentler slope${cls==='dwelling'&&tier==='severe'?' or soft rock to dig into':''}`);
 let best=options[0],bestBill=foundationBill(best,w,d,s.fall,gk,hardness);
 for(const k of options.slice(1)){const b=foundationBill(k,w,d,s.fall,gk,hardness);if(score(b)<score(bestBill)){best=k;bestBill=b;}}
 const slow=tier==='steep'||tier==='severe'?COST_RULES.steepSlowdown:1,work=r1(bestBill.work*slow);
 base.foundation=best;base.extraWood=bestBill.wood;base.extraStone=bestBill.stone;base.extraWork=work;base.workPct=Math.round(work/Math.max(1,opts.baseWork??16)*100);
 const extras=[bestBill.wood?`+${bestBill.wood} wood`:'',bestBill.stone?`+${bestBill.stone} stone`:'',`+${base.workPct}% labour time`].filter(Boolean).join(' · ');
 base.label=tier==='moderate'?(cls==='field'?KIND_WORD.strips:TIER_WORD.moderate):KIND_WORD[best];
 base.detail=`${label} · ${FOUNDATION_TEXT[best]} · ${extras}${gk==='rock'?' · quarried on site':gk==='unstable'?' · loose ground, deeper footings':''}`;
 return base;
}
/** Compact record stored on a building (optional save field). Level sites store nothing. */
export function siteRecord(a:SiteAssessment):SiteRecord|undefined{return a.ok&&a.tier!=='level'?{v:1,tier:a.tier,foundation:a.foundation,slope:a.meanSlopeDeg,fall:a.fall,extraWork:a.extraWork,wood:a.extraWood,stone:a.extraStone}:undefined;}
export function validSiteRecord(r:unknown):r is SiteRecord{
 const o=r as SiteRecord|null;if(!o||typeof o!=='object'||o.v!==1)return false;
 const n=(v:unknown,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 return SLOPE_TIERS.includes(o.tier)&&o.tier!=='level'&&SLOPE_FOUNDATIONS.includes(o.foundation)&&o.foundation!=='none'&&n(o.slope,90)&&n(o.fall,200)&&n(o.extraWork,1e6)&&n(o.wood,1e5)&&n(o.stone,1e5);
}
