/** Terrain model v2 (`state.terrainModel==='v2'`): the graded slope tiers (slopeTiers.ts) plus terrain nuance (slopeNuance.ts) and terrace farming (terraceFarming.ts).
 *  Buildings: same tiers and foundations, but a natural shelf is credited, and curvature, wetness, roughness and slip risk scale the bill and name themselves in the label.
 *  Fields: no slope refusal below a cliff; the field is laid out as contour terrace strips whose kind, cost and build time rise with the slope, gated by what the settlement can do.
 *  Pure and deterministic. Saves without the switch never reach this file. */
import {assessSite,surveySite,groundKind,slopeClassOf,SLOPE_COLOURS,foundationText,type SiteAssessment,type SiteSurvey,type SiteGround,type SlopeTier} from './slopeTiers';
import {surveyNuance,findShelf,compassWord,type SiteNuance} from './slopeNuance';
import {terraceKindFor,terraceGate,terraceLayoutFor,terraceBill,terraceSoilDepth,erosionPerYear,fieldDownhill,extentAlong,geoSoilOf,mountainDiscount,TERRACE_RULES,OPEN_CAPABILITY,type TerraceCapability,type TerraceKind} from './terraceFarming';
import type {TerraceRecord} from './terraceRecord';
import {HILL_RULES,hillWorkFor,ordinaryErosion,ordinarySoilDepth,gullyRisk,handTillYield} from './hillFarming';
import type {BldType} from './types';

export type V2Options={flood?:boolean;/** 'v3' (default farming on hills is ordinary, terraces optional) or 'v2' (terraces assigned by slope, the default here so earlier saves read the same) */model?:'v2'|'v3';ground?:SiteGround;water?:(x:number,z:number)=>number;baseWork?:number;capability?:TerraceCapability;/** metres above the water level at the site */altitude?:number;waterDistance?:number;hemisphere?:1|-1;
 /** also look for a natural shelf nearby (placement preview only: costs extra height reads) */hint?:boolean};
const r1=(n:number)=>Math.round(n*10)/10,r2=(n:number)=>Math.round(n*100)/100;
const KIND_TIER:Record<TerraceKind,SlopeTier>={bund:'moderate',stone:'steep',andean:'steep',stair:'steep'};

/** Survey credit for a natural shelf: the flat part decides the slope; the scarp edge counts for part of the fall. */
export function shelfAdjust(n:SiteNuance){
 const sh=n.shelf;if(!sh)return undefined;
 return(s:SiteSurvey):SiteSurvey=>{
  const miss=1-sh.flatFraction;
  return{...s,meanSlopeDeg:sh.slope+miss*.25*Math.max(0,s.meanSlopeDeg-sh.slope),fall:sh.spread+miss*.5*Math.max(0,s.fall-sh.spread),maxStepDeg:s.maxStepDeg<=70&&sh.flatFraction>=.55?Math.min(s.maxStepDeg,50):s.maxStepDeg};
 };
}
const riskWords=(n:SiteNuance)=>{const w:string[]=[];if(n.risks.landslip>=.4)w.push(`landslip risk ${Math.round(n.risks.landslip*100)}%`);if(n.risks.flood>=.4)w.push('floods in spate');if(n.risks.frost>=.4)w.push('cold air pools here');if(n.risks.wind>=.3)w.push('exposed to wind');if(n.rough)w.push('broken ground, slower work');return w;};

function assessBuilding(height:(x:number,z:number)=>number,type:BldType|string,x:number,z:number,w:number,d:number,o:V2Options,n:SiteNuance):SiteAssessment{
 const cls=slopeClassOf(type),shelfOn=cls!=='dock'&&cls!=='exempt'?shelfAdjust(n):undefined;
 const m=n.costMult,sc=shelfOn?.6:1;
 const a=assessSite(height,type,x,z,w,d,{flood:o.flood,ground:o.ground,water:o.water,baseWork:o.baseWork,adjust:shelfOn,billScale:cls==='exempt'?undefined:{wood:m.wood*sc,stone:m.stone*sc,work:m.work*sc}});
 if(cls==='exempt')return a;
 a.tags=[...n.tags];
 const extra=[...(shelfOn?[`natural shelf, ${Math.round(n.shelf!.flatFraction*100)}% flat: foundation work cut`]:[]),...riskWords(n)];
 if(n.tags.length)a.label=a.ok&&a.tier==='level'?n.label:`${a.label}${n.label?` · ${n.label}`:''}`;
 if(extra.length)a.detail=a.detail?`${a.detail} · ${extra.join(' · ')}`:extra.join(' · ');
 if(o.hint&&(a.tier==='steep'||a.tier==='severe'||!a.ok)&&!n.shelf){
  const sh=findShelf(height,x,z,w,d);if(sh){a.shelfHint=`natural shelf ${Math.round(sh.distance)} m ${compassWord(sh.dx,sh.dz)}`;a.detail=a.detail?`${a.detail} · ${a.shelfHint}`:a.shelfHint;}
 }
 return a;
}


/** Terrain model v3: a field on a slope is ordinary farmland. No walls, no strips: furrows along the contour and a bank at the lower edge. Soil, aspect and frost still count; erosion is real but cheaper to keep in check. */
function ordinaryField(base:SiteAssessment,o:V2Options,n:SiteNuance,mean:number,work:'plough'|'hoe'|'terrace-only',kind:TerraceKind|null,cap:TerraceCapability,geoSoil:number):SiteAssessment{
 const hand=work==='hoe',eros=ordinaryErosion(mean,o.ground?.rockName),soil=r2(ordinarySoilDepth(mean,geoSoil));
 const rec:TerraceRecord={k:'none',n:1,rise:0,tread:r2(Math.sqrt(base.area)),soil,sun:n.sun,frost:n.risks.frost,wet:n.wetness,eros,alt:Math.max(-5,Math.min(400,r1(o.altitude??0))),slope:r1(Math.min(90,mean))};
 base.terrace=rec;base.foundation='strips';
 const slopeWord=mean<HILL_RULES.minHillDeg?'Level field':hand?'Hillside plot (hand-tilled)':mean<8?'Gentle slope field':'Hillside field';
 if(mean<HILL_RULES.minHillDeg){base.detail=`${base.meanSlopeDeg.toFixed(0)}° slope · soil ${soil.toFixed(1)} m`;if(n.tags.length)base.label=`Level field · ${n.label}`;return base;}
 base.tier=hand?'steep':mean>=8?'moderate':'level';base.colour=SLOPE_COLOURS[base.tier];
 const loss=Math.round(eros*1000)/10,words:string[]=[];
 words.push(`${base.meanSlopeDeg.toFixed(0)}° slope`,hand?'hoed and dug along the contour, small plot':'furrows ploughed along the contour',`earth bank at the lower edge`,`soil ${soil.toFixed(1)} m`);
 if(hand)words.push(`about ${Math.round((1-handTillYield(mean))*100)}% lower harvest`);
 if(loss>=.5)words.push(`loses about ${loss}% of its soil a year${gullyRisk(eros)?' — gullies will cut this slope':''}`);
 if(kind&&mean>=HILL_RULES.hintDeg){const g=terraceGate(kind,cap);words.push(g?`terraces later: ${g.replace(/^.* need /,'needs ')}`:`Terraces available: ${TERRACE_RULES.kinds[kind].word.toLowerCase()} can be added from the field card`);}
 else if(kind&&mean>=TERRACE_RULES.kinds.bund.from+3)words.push('earth bunds can be added from the field card');
 base.label=n.tags.length?`${slopeWord} · ${n.label}`:slopeWord;
 base.detail=words.concat(riskWords(n)).join(' · ');
 return base;
}

function assessField(height:(x:number,z:number)=>number,x:number,z:number,w:number,d:number,o:V2Options,n:SiteNuance):SiteAssessment{
 const plot={x,z,w,d},s0=surveySite(height,x,z,w,d),adj=shelfAdjust(n),s=adj?adj(s0):s0,gk=groundKind(o.ground),geoSoil=geoSoilOf(o.ground),cap=o.capability??OPEN_CAPABILITY;
 const mean=s.meanSlopeDeg,kind=terraceKindFor(mean),dir=fieldDownhill(height,plot);
 const base:SiteAssessment={model:'graded',type:'farm',slopeClass:'field',tier:'level',foundation:'none',ok:true,issue:null,label:'Level field',detail:'',colour:SLOPE_COLOURS.level,meanSlopeDeg:r1(mean),maxStepDeg:r1(s.maxStepDeg),fall:r2(s.fall),area:w*d,extraWood:0,extraStone:0,extraWork:0,workPct:0,ground:gk,downhill:dir,tags:[...n.tags]};
 const refuse=(why:string):SiteAssessment=>({...base,ok:false,issue:why,label:'Too steep to farm',tier:'severe',colour:SLOPE_COLOURS.severe,detail:why});
 if(mean>TERRACE_RULES.refuseMeanDeg||s.maxStepDeg>TERRACE_RULES.refuseStepDeg)return refuse(`Too steep to farm: a cliff face (${mean.toFixed(0)}° mean slope, ${s.maxStepDeg.toFixed(0)}° step)`);
 if(kind==='stair'&&gk==='rock'&&(o.ground?.soilDepthMeters??1)<=.3)return refuse('Bare rock face: nothing here to hold soil');
 if(o.model==='v3'){
  const work=hillWorkFor(mean,w*d);
  if(work!=='terrace-only'||!kind)return ordinaryField(base,o,n,mean,work,kind,cap,geoSoil);
  // beyond the hoe limit: only terraced ground can be farmed here, and only a people who can build that
  const need=kind?terraceGate(kind,cap):null;
  if(mean<=HILL_RULES.hoeDeg)return{...refuse(`Too steep to plough (${mean.toFixed(0)}°): hand-tilled plots stay under ${HILL_RULES.hoeMaxArea} m² — shrink the plot`),label:'Too steep to plough'};
  if(need)return{...refuse(`Too steep to farm without terraces (${mean.toFixed(0)}°): ${need}`),label:'Needs terraces',detail:`${mean.toFixed(0)}° slope · ${need}`};
 }
 const gate=kind?terraceGate(kind,cap):null;
 if(gate)return{...refuse(gate),label:kind?TERRACE_RULES.kinds[kind].word:'Terraces',detail:`${mean.toFixed(0)}° slope · ${gate}`};
 const alt=o.altitude??0,rec:TerraceRecord={k:kind??'none',n:1,rise:0,tread:r2(extentAlong(plot,dir)),soil:r2(terraceSoilDepth(kind,mean,geoSoil)),sun:n.sun,frost:n.risks.frost,wet:n.wetness,eros:erosionPerYear(mean,kind,o.ground?.rockName,true),alt:Math.max(-5,Math.min(400,r1(alt))),slope:r1(Math.min(90,mean))};
 base.terrace=rec;base.foundation='strips';
 if(!kind){
  base.detail=`${base.meanSlopeDeg.toFixed(0)}° slope · soil ${rec.soil.toFixed(1)} m · no terracing needed`;
  if(n.tags.length)base.label=`Level field · ${n.label}`;
  return base;
 }
 const K=TERRACE_RULES.kinds[kind],extent=extentAlong(plot,dir),L=terraceLayoutFor(kind,extent,w*d/extent,s.fall);
 const m=n.costMult,sc=n.shelf?.6:1,b=terraceBill(kind,L,gk,geoSoil,cap.mountain);
 const wood=Math.max(0,Math.ceil(b.wood*m.wood*sc-1e-9)),stone=Math.max(0,Math.ceil(b.stone*m.stone*sc-1e-9)),work=r1(b.work*m.work*sc);
 rec.n=L.n;rec.rise=r2(L.rise);rec.tread=r2(L.tread);
 base.tier=KIND_TIER[kind];base.colour=SLOPE_COLOURS[base.tier];base.extraWood=wood;base.extraStone=stone;base.extraWork=work;base.workPct=Math.round(work/Math.max(1,o.baseWork??80)*100);
 const goods=[wood?`+${wood} wood`:'',stone?`+${stone} stone`:'',`+${base.workPct}% labour time`].filter(Boolean).join(' · ');
 base.label=n.tags.length?`${K.word} · ${n.label}`:K.word;
 const extras=[...(n.shelf?['natural shelf: less wall to build']:[]),...riskWords(n)];
 base.detail=`${base.meanSlopeDeg.toFixed(0)}° slope · ${L.n} strip${L.n>1?'s':''} ${L.tread.toFixed(1)} m wide, ${L.rise.toFixed(1)} m risers · ${K.detail} · ${goods} · soil ${rec.soil.toFixed(1)} m${cap.mountain?' · mountain builders':''}`+(extras.length?` · ${extras.join(' · ')}`:'');
 if(o.model==='v3')base.detail=`Beyond ${HILL_RULES.hoeDeg}°: only terraced fields can be farmed here · ${base.detail}`;
 void mountainDiscount;void foundationText;
 return base;
}

/** Assess a site under terrain model v2. Same shape as assessSite (plus `tags`, `terrace`, `shelfHint`). */
export function assessSiteV2(height:(x:number,z:number)=>number,type:BldType|string,x:number,z:number,w:number,d:number,o:V2Options={}):SiteAssessment{
 const cls=slopeClassOf(type);
 if(cls==='exempt')return assessSite(height,type,x,z,w,d,{ground:o.ground,water:o.water,baseWork:o.baseWork});
 const n=surveyNuance(height,x,z,w,d,{ground:o.ground,water:o.water,waterDistance:o.waterDistance,hemisphere:o.hemisphere});
 return cls==='field'?assessField(height,x,z,w,d,o,n):assessBuilding(height,type,x,z,w,d,o,n);
}
