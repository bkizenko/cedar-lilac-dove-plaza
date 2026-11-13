/** Terrace agriculture as a real capability (see docs/TERRACE_FARMING.md). Pure and deterministic: no random numbers, no clocks, no sim imports.
 *  A field on a hillside is laid out as narrow contour strips held by retaining walls, in four kinds that grow with the slope:
 *    bund   earth contour bunds and grass strips (5-12 deg)          everyone
 *    stone  drystone-faced strips (12-24 deg)                         stone-working, a work gang
 *    andean stone-faced, gravel-drained, with a water channel (24-38) stone-working, irrigation know-how, a bigger gang
 *    stair  tall narrow stone stairs (38-52 deg)                      Iron Age, irrigation know-how, a large gang
 *  Fields are refused only on a cliff face (mean slope above 52 deg or a step above 75 deg) or where bare rock leaves nothing to hold soil.
 *  Every number is a DESIGN VALUE tuned for play; the history that informed it, and what is unverified, is in docs/TERRACE_FARMING.md. */
import {COST_RULES,type GroundKind,type SiteGround} from './slopeTiers';
import {TERRACE_KIND_LIST,type TerraceKind,type TerraceRecord} from './terraceRecord';
export {TERRACE_KIND_LIST,type TerraceKind,type TerraceRecord};

export const TERRACE_MODEL_VERSION=1;
/** Steepest local gradient (rise/run over 2 m) a plot may show before the old 'too steep' check bites: a 75 degree wall. */
export const TERRACE_CLIFF_GRADE=Math.tan(75*Math.PI/180);
export type KindRules={from:number;to:number;/** riser between strips, m */rise:number;/** narrowest workable strip, m */minTread:number;/** facing-wall thickness at the top, m */wallThick:number;
 /** share of the soil washed away that the walls and bunds stop */protect:number;/** labour multiplier on top of the volume moved */slow:number;/** workers needed (adults) */labour:number;word:string;detail:string};
export const TERRACE_RULES={
 /** a mean slope above this, or a step above the second figure, is a cliff face */refuseMeanDeg:52,refuseStepDeg:75,
 /** retaining walls store the day's heat and give it back at night (Inca walls, see the doc): frost risk cut by this share */wallHeat:.35,
 soilCap:.6,sunMin:5,
 kinds:{
  bund:{from:5,to:12,rise:.4,minTread:3,wallThick:.3,protect:.5,slow:1,labour:0,word:'Contour bunds',detail:'earth bunds and grass strips along the contour'},
  stone:{from:12,to:24,rise:1,minTread:2.2,wallThick:.45,protect:.93,slow:1.1,labour:4,word:'Drystone terraces',detail:'strips held by drystone walls'},
  andean:{from:24,to:38,rise:1.7,minTread:1.8,wallThick:.6,protect:.97,slow:1.35,labour:10,word:'Stone-faced terraces',detail:'stone-faced strips on gravel drainage layers, with a water channel'},
  stair:{from:38,to:52,rise:2.2,minTread:1.5,wallThick:.7,protect:.93,slow:1.6,labour:16,word:'Terrace stairs',detail:'tall narrow stone stairs, drained and channelled'},
 } as Record<TerraceKind,KindRules>,
} as const;
/** Kind for a mean slope in degrees; null on flat ground (below 5) and beyond the cliff limit. */
export function terraceKindFor(meanDeg:number):TerraceKind|null{
 const K=TERRACE_RULES.kinds;
 if(meanDeg<K.bund.from)return null;if(meanDeg<K.bund.to)return'bund';if(meanDeg<K.stone.to)return'stone';if(meanDeg<K.andean.to)return'andean';if(meanDeg<=TERRACE_RULES.refuseMeanDeg)return'stair';return null;
}

/** What the settlement can do. Built from the sim by terraceRuntime.ts; the default (tests, previews) is everything open. */
export type TerraceCapability={age:number;/** a finished quarry, or a metal age */stonework:boolean;/** adults who can be put to work */labour:number;irrigationKnown:boolean;/** a mountain people (identity symbol): lower gang size, cheaper walls */mountain:boolean};
export const OPEN_CAPABILITY:TerraceCapability=Object.freeze({age:9,stonework:true,labour:99,irrigationKnown:true,mountain:false});
export const mountainDiscount=.85;
export function labourNeeded(kind:TerraceKind,cap:Pick<TerraceCapability,'mountain'>){const n=TERRACE_RULES.kinds[kind].labour;return cap.mountain?Math.ceil(n*.7):n;}
/** Why a settlement cannot build this kind yet, or null. */
export function terraceGate(kind:TerraceKind,cap:TerraceCapability):string|null{
 if(kind==='bund')return null;
 const need=labourNeeded(kind,cap),parts:string[]=[];
 if(!cap.stonework)parts.push('stone-working (a quarry, or the Bronze Age)');
 if(kind==='stair'&&cap.age<2)parts.push('the Iron Age');
 if((kind==='andean'||kind==='stair')&&!cap.irrigationKnown&&!cap.mountain)parts.push('irrigation know-how (a dug ditch, or the Iron Age)');
 if(cap.labour<need)parts.push(`${need} able workers (you have ${cap.labour})`);
 return parts.length?`${TERRACE_RULES.kinds[kind].word} need ${parts.join(', ')}`:null;
}

export type TerraceLayout={n:number;rise:number;tread:number;wallHeight:number;wallLength:number;extent:number;across:number};
/** Strips for a plot: `extent` is the plot's length along the downhill line, `across` along the contour, `fall` the drop over the extent. */
export function terraceLayoutFor(kind:TerraceKind,extent:number,across:number,fall:number):TerraceLayout{
 const K=TERRACE_RULES.kinds[kind];let n=Math.max(1,Math.round(fall/K.rise));n=Math.min(n,Math.max(1,Math.floor(extent/K.minTread)));
 const rise=fall/n;return{n,rise,tread:extent/n,wallHeight:rise+.25,wallLength:across*n,extent,across};
}
export type TerraceBill={wood:number;stone:number;work:number};
const ceilInt=(v:number)=>Math.max(0,Math.ceil(v-1e-9));
/** Goods and worker-seconds for a layout. Quarried on the spot where rock is hard; loose ground wants deeper footings; thin soil means hauling fill. */
export function terraceBill(kind:TerraceKind,L:TerraceLayout,ground:GroundKind='plain',geoSoil=1,mountain=false):TerraceBill{
 const K=TERRACE_RULES.kinds[kind],R=COST_RULES,rockStone=ground==='rock'?.6:1,earth=ground==='rock'?1.25:1,slip=ground==='unstable'?1.25:1,fall=L.rise*L.n,disc=mountain?mountainDiscount:1;
 const T=K.wallThick+.08*L.wallHeight,earthWall=kind==='bund',Vw=L.wallLength*L.wallHeight*T*(earthWall?.5:1);
 const gravel=kind==='andean'||kind==='stair'?L.across*L.extent*.1:0;
 const stone=earthWall?0:(Vw+gravel)*R.stoneUnitsPerM3*rockStone*slip*disc;
 const wood=ceilInt((kind==='bund'?L.wallLength/6:L.wallLength/3.5)*disc);
 const haul=1+.25*Math.max(0,1-geoSoil/.3);
 const Vearth=L.across*L.extent*fall/4,channel=kind==='andean'||kind==='stair'?L.n*L.across*.15:0;
 const work=(Vearth*R.earthSecondsPerM3*earth*slip*haul+Vw*R.wallSecondsPerM3*slip+gravel*R.earthSecondsPerM3+channel)*K.slow*disc;
 return{wood,stone:ceilInt(stone),work:Math.round(work*10)/10};
}

// ---- geometry shared by the renderer, the preview ghost and the sheets ------------------------------------------------------------------
export type Plot={x:number;z:number;w:number;d:number};
type Dir={x:number;z:number};
/** Downhill unit vector over a plot (end-to-end height differences; south if flat). */
export function fieldDownhill(height:(x:number,z:number)=>number,p:Plot):Dir{
 const hx=height(p.x+p.w/2,p.z)-height(p.x-p.w/2,p.z),hz=height(p.x,p.z+p.d/2)-height(p.x,p.z-p.d/2),l=Math.hypot(hx,hz);
 return l>1e-6?{x:-hx/l,z:-hz/l}:{x:0,z:1};
}
/** Length of a plot rectangle along a direction. */
export const extentAlong=(p:Plot,dir:Dir)=>Math.abs(dir.x)*p.w+Math.abs(dir.z)*p.d;
/** The part of the line {centre + dir*t + tangent*s} inside the plot, as an s interval (null if it misses). */
export function chordAt(p:Plot,dir:Dir,t:number):{s0:number;s1:number}|null{
 const tan={x:-dir.z,z:dir.x};let lo=-Infinity,hi=Infinity;
 for(const[c0,a,b,half]of[[0,dir.x,tan.x,p.w/2],[0,dir.z,tan.z,p.d/2]] as const){
  const base=a*t;if(Math.abs(b)<1e-9){if(Math.abs(base)>half)return null;continue;}
  const s0=(-half-base)/b,s1=(half-base)/b;lo=Math.max(lo,Math.min(s0,s1));hi=Math.min(hi,Math.max(s0,s1));void c0;
 }
 return hi-lo>1e-6?{s0:lo,s1:hi}:null;
}
export type TerraceStrip={i:number;/** downhill offsets of the upper and lower edge, from the plot centre */t0:number;t1:number;/** flat tread level */level:number;/** lowest ground under the strip */low:number};
export type TerraceFrame={dir:Dir;tangent:Dir;extent:number;strips:TerraceStrip[]};
/** Strip frame: tread levels are the mean ground at each strip's upper edge, so every tread is level and sits on or above the hillside it is cut into. */
export function terraceFrame(height:(x:number,z:number)=>number,p:Plot,n:number,dir:Dir=fieldDownhill(height,p)):TerraceFrame{
 const tangent={x:-dir.z,z:dir.x},extent=extentAlong(p,dir),strips:TerraceStrip[]=[];
 const at=(t:number,s:number)=>height(p.x+dir.x*t+tangent.x*s,p.z+dir.z*t+tangent.z*s);
 for(let i=0;i<n;i++){
  const t0=-extent/2+extent*i/n,t1=-extent/2+extent*(i+1)/n,tm=(t0+t1)/2,ch=chordAt(p,dir,tm)??{s0:-1,s1:1};
  let up=0,low=Infinity;
  for(let k=0;k<5;k++){const s=ch.s0+(ch.s1-ch.s0)*(k+.5)/5;up+=at(Math.max(-extent/2,t0+.05),s);for(const t of[t0,tm,t1])low=Math.min(low,at(t,s));}
  strips.push({i,t0,t1,level:up/5,low});
 }
 return{dir,tangent,extent,strips};
}
/** Flat tread height at a world point (for crops and rows), or the plain ground where the point is outside every strip. */
export function terraceHeightAt(height:(x:number,z:number)=>number,p:Plot,frame:TerraceFrame,x:number,z:number){
 const t=(x-p.x)*frame.dir.x+(z-p.z)*frame.dir.z,n=frame.strips.length;if(!n)return height(x,z);
 const i=Math.max(0,Math.min(n-1,Math.floor((t+frame.extent/2)/(frame.extent/n)))),h=height(x,z);
 return Math.max(h,frame.strips[i].level);
}

// ---- soil, climate and yield -------------------------------------------------------------------------------------------------------------
/** Soil depth the hillside holds on its own: thins with slope (design curve), limited by geology. */
export function naturalSoilDepth(slopeDeg:number,geoSoil=1){return Math.min(Math.max(0,geoSoil),1.4)*Math.pow(Math.max(.06,1-slopeDeg/58),1.6);}
/** Effective soil depth once the field is laid out: terraces bring fill (more on a gravel-drained andén), thin geology still limits it. */
export function terraceSoilDepth(kind:TerraceKind|null,slopeDeg:number,geoSoil=1){
 const g=Math.min(1,Math.max(0,geoSoil)/.8),nat=naturalSoilDepth(slopeDeg,geoSoil);
 switch(kind){case'bund':return nat+.15;case'stone':return .45+.25*g;case'andean':return .7+.3*g;case'stair':return .55+.25*g;default:return nat;}
}
export const ALTITUDE_RULES={upland:20,highland:70} as const;
export type AltitudeBand='lowland'|'upland'|'highland';
/** Cooler air with height above the water level (design bands; heights run to about 144 m). */
export const altitudeBand=(metres:number):AltitudeBand=>metres>=ALTITUDE_RULES.highland?'highland':metres>=ALTITUDE_RULES.upland?'upland':'lowland';
/** Crop response by band. Only grain, pulses and tubers exist today; tubers stand in for the potato end of the highland farm.
 *  HOOK: when maize, quinoa and potato are added as crop kinds, give each a row here (and a `HIGHLAND_CROPS` entry) and nothing else changes. */
export const ALTITUDE_CROP:Record<AltitudeBand,Record<'grain'|'pulses'|'tubers',number>>={lowland:{grain:1.03,pulses:1,tubers:.96},upland:{grain:1,pulses:1,tubers:1},highland:{grain:.88,pulses:.96,tubers:1.12}};
export const HIGHLAND_CROPS:readonly {id:string;band:AltitudeBand;implemented:false}[]=[{id:'potato',band:'highland',implemented:false},{id:'maize',band:'upland',implemented:false},{id:'quinoa',band:'highland',implemented:false}];
export type CropLike='grain'|'pulses'|'tubers';
/** Yield multiplier from the terrace record: soil depth, sun slope, frost pocket (less behind a heat-storing wall), waterlogging, altitude and crop. 1 for no record. */
export function terraceYield(rec:TerraceRecord|undefined,crop:CropLike='grain',frostWeather=false):number{
 if(!rec)return 1;const kind=rec.k==='none'?null:rec.k;
 const depth=.55+.5*Math.min(1,rec.soil/.8),cool=Math.min(1,Math.max(0,rec.alt)/80),sun=1+rec.sun*(.04+.06*cool);
 const heat=kind===null||kind==='bund'?0:TERRACE_RULES.wallHeat,frost=1-rec.frost*(frostWeather?.3:.1)*(1-heat);
 const wet=rec.wet>.75?.9+.1*(1-rec.wet)/.25:1,alt=ALTITUDE_CROP[altitudeBand(rec.alt)][crop];
 return Math.max(.35,Math.min(1.25,depth*sun*frost*wet*alt));
}
/** Washing-away of soil each year, as a fraction of the soil. Design curve: rises with the tangent of the slope, softer rock goes faster, a sown crop holds it a little, walls and bunds stop most of it. */
const ERODIBILITY:Record<string,number>={granite:.3,basalt:.34,sandstone:.6,limestone:.55,shale:1.9,volcanic:1.4,sediment:2.3};
export function erosionPerYear(slopeDeg:number,kind:TerraceKind|null,rockName?:string,planted=true){
 const base=Math.max(0,Math.tan(slopeDeg*Math.PI/180)-.06)*.32,e=Math.max(.5,Math.min(1.6,.55+(ERODIBILITY[rockName||'']??1)*.55)),protect=kind?TERRACE_RULES.kinds[kind].protect:0;
 return Math.round(base*e*(1-protect)*(planted?.8:1)*10000)/10000;
}
/** Soil lost so far lowers the harvest by that share. */
export const soilLossFactor=(loss:number|undefined)=>1-Math.max(0,Math.min(TERRACE_RULES.soilCap,loss??0));
export const soilLossAfter=(loss:number|undefined,perYear:number)=>Math.min(TERRACE_RULES.soilCap,Math.max(0,(loss??0)+Math.max(0,perYear)));
export const geoSoilOf=(g:SiteGround)=>g?.soilDepthMeters??1;
