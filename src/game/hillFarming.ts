/** Ordinary hillside farming (terrain model v3, see docs/TERRACE_FARMING.md). Pure and deterministic: no random numbers, no clocks, no sim imports.
 *  The DEFAULT way to farm a slope is what most farmers did: the field is just laid on the hill, ploughed or hoed ALONG the contour (so every furrow
 *  is a small dam), with a small earth bank or grass/hedge strip at the lower edge. No stone walls, no terraces.
 *    up to 18 deg   plough or ard field, any size
 *    18 to 30 deg   hoe and digging-stick plots, small plots only (a hand-tilled hillside patch), thinner soil, a lower harvest
 *    beyond 30 deg  only terraced ground can be farmed (an explicit choice, never automatic), up to the cliff limit in terraceFarming.ts
 *  Terraces are an OPTIONAL investment made on an existing field (`planTerraceUpgrade`): earth bunds first, stone facing only with stone-working.
 *  Peoples differ in how readily they choose it (`terracePreference`), but the choice is never forced.
 *  Every number is a DESIGN VALUE tuned for play. */
import type {SiteGround} from './slopeTiers';
import {surveySite,groundKind} from './slopeTiers';
import type {TerraceKind,TerraceRecord} from './terraceRecord';
import {naturalSoilDepth,erosionPerYear,terraceKindFor,terraceGate,HAND_TILL,terraceLayoutFor,terraceBill,terraceSoilDepth,fieldDownhill,extentAlong,chordAt,geoSoilOf,TERRACE_RULES,type TerraceCapability,type Plot} from './terraceFarming';

export const HILL_RULES={
 /** steepest mean slope a plough or ard field is worked on, degrees */ardDeg:18,
 /** steepest mean slope a hoe or digging-stick plot is worked on, degrees */hoeDeg:30,
 /** largest hand-tilled hillside plot, m2 (a default field is about 67) */hoeMaxArea:90,
 /** below this a slope needs no furrow care */minHillDeg:3,
 /** share of the soil loss stopped by furrows ploughed along the contour */furrowProtect:.3,
 /** share stopped by the small bank, grass strip or hedge at the lower edge */bankProtect:.2,
 /** erosion factor for a field rested under grass (v3) and for bare, unsown ground */grassFallow:.6,bareFallow:1.25,
 /** yearly soil loss (share) above which the warning says gullies will cut the slope */gullyRate:.05,
 /** slope from which the placement preview names the terraces on offer */hintDeg:12,
} as const;
export type HillWork='plough'|'hoe'|'terrace-only';
/** How a field of this size is worked at this slope. */
export function hillWorkFor(meanDeg:number,area:number):HillWork{
 if(meanDeg<=HILL_RULES.ardDeg)return'plough';
 if(meanDeg<=HILL_RULES.hoeDeg&&area<=HILL_RULES.hoeMaxArea)return'hoe';
 return'terrace-only';
}
/** Share of the washed soil that the free, ordinary habits stop (contour furrows and a lower-edge bank); none on level ground. */
export const ordinaryProtect=(meanDeg:number)=>meanDeg<HILL_RULES.minHillDeg?0:1-(1-HILL_RULES.furrowProtect)*(1-HILL_RULES.bankProtect);
/** Yearly soil loss of an ordinary hillside field (fraction of the soil). */
export function ordinaryErosion(meanDeg:number,rockName?:string){
 return Math.round(erosionPerYear(meanDeg,null,rockName,true)*(1-ordinaryProtect(meanDeg))*10000)/10000;
}
/** Soil depth of an ordinary hillside field: what the slope holds on its own, a little mixed by the plough. */
export const ordinarySoilDepth=(meanDeg:number,geoSoil=1)=>naturalSoilDepth(meanDeg,geoSoil)+(meanDeg<HILL_RULES.minHillDeg?0:.08);
/** Harvest multiplier for hand-tilled ground steeper than the plough limit (1 below it). */
export const handTillYield=(meanDeg:number)=>1-HAND_TILL.perDeg*Math.max(0,Math.min(HAND_TILL.toDeg,meanDeg)-HAND_TILL.fromDeg);
/** Erosion factor of the year's cover: sown 1, rested under grass, or left bare. */
export const coverFactor=(planted:boolean,resting:boolean)=>planted?1:resting?HILL_RULES.grassFallow:HILL_RULES.bareFallow;
export const gullyRisk=(erosPerYear:number)=>erosPerYear>=HILL_RULES.gullyRate;

// ---- furrow and bank geometry (the ghost, the sheets and the tests) ------------------------------------------------------------------------
export type HillLine={x:number;z:number;length:number;yaw:number;kind:'furrow'|'bank'};
/** Furrows run ALONG the contour: each line is perpendicular to the downhill direction (so a furrow holds water and soil instead of draining it).
 *  Short pieces follow the ground; the last line at the lower edge is the earth bank. `yaw` follows the convention of siteFoundation.ts (local x along the line). */
export function hillFieldLines(height:(x:number,z:number)=>number,plot:Plot,dir=fieldDownhill(height,plot),spacing=1.3,seg=1.6):HillLine[]{
 const tn={x:-dir.z,z:dir.x},extent=extentAlong(plot,dir),yaw=Math.atan2(-tn.z,tn.x),out:HillLine[]=[];
 const run=(t:number,kind:HillLine['kind'],inset:number)=>{
  const ch=chordAt(plot,dir,t);if(!ch)return;const s0=ch.s0+inset,s1=ch.s1-inset,len=s1-s0;if(len<.5)return;
  const k=Math.max(1,Math.round(len/seg)),piece=len/k;
  for(let i=0;i<k;i++){const s=s0+piece*(i+.5);out.push({x:plot.x+dir.x*t+tn.x*s,z:plot.z+dir.z*t+tn.z*s,length:piece,yaw,kind});}
 };
 // the bank sits at the lowest line that still has a worthwhile run (a plot turned 45 degrees ends in a corner)
 let bankT=extent/2-.35;const wide=Math.max(...[-.5,0,.5].map(f=>{const c=chordAt(plot,dir,f*extent);return c?c.s1-c.s0:0;}));
 for(let i=0;i<40;i++){const c=chordAt(plot,dir,bankT);if(c&&c.s1-c.s0-.4>=Math.min(3,.5*wide))break;bankT-=.25;}
 for(let t=-extent/2+.6;t<bankT-.6;t+=spacing)run(t,'furrow',.45);
 run(bankT,'bank',.2);
 void height;
 return out;
}
/** Direction of a furrow on a plot: the contour, 90 degrees from the downhill line. */
export function furrowDirection(dir:{x:number;z:number}){return{x:-dir.z,z:dir.x};}

// ---- who terraces, and how often -------------------------------------------------------------------------------------------------------
/** Tendency of a people to terrace (0..0.85): mountain peoples most, then high-altitude settlements, then peoples who already water their crops (rice-style paddies need level strips). Never 1. */
export function terracePreference(p:{mountain:boolean;altitude:number;irrigationKnown:boolean;paddy?:boolean}):number{
 const alt=p.altitude>=70?.25:p.altitude>=20?.1:0;
 return Math.min(.85,.08+(p.mountain?.4:0)+alt+(p.irrigationKnown?.07:0)+(p.paddy?.2:0));
}
/** How hard the hillside presses for terracing, 0..1: soil washing away, and steepness beyond the plough limit. */
export function terracePressure(erosPerYear:number,meanDeg:number){
 return Math.max(0,Math.min(1,erosPerYear/.08*.7+Math.max(0,meanDeg-HILL_RULES.ardDeg)/12*.3));
}
/** Chance that a people with this preference chooses to terrace a field under this pressure: zero without pressure, never above 0.92 (so it is never forced). */
export const terraceInclination=(preference:number,pressure:number)=>Math.min(.92,Math.max(0,pressure)*(.2+.9*Math.max(0,Math.min(1,preference))));
/** Deterministic yes/no for one field (`seed` is a stable number such as its id): the people lean toward it, the player still decides. */
export function leansToTerrace(preference:number,pressure:number,seed:number){
 let h=Math.imul((Math.floor(seed)^0x9e3779b9)>>>0,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;
 return((h>>>0)%100000)/100000<terraceInclination(preference,pressure);
}

// ---- the optional upgrade ----------------------------------------------------------------------------------------------------------------
export type TerraceUpgradePlan={ok:boolean;from:TerraceKind|'none';to:TerraceKind|null;issue:string|null;wood:number;stone:number;work:number;label:string;detail:string;record?:TerraceRecord};
/** What 'Terrace this field' would do to an existing field: none -> earth bunds (everyone), then bunds -> the stone-faced kind for the slope (stone-working, a work gang).
 *  The cost is the new bill less what the earlier stage already built. */
export function planTerraceUpgrade(height:(x:number,z:number)=>number,plot:Plot,rec:TerraceRecord,cap:TerraceCapability,o:{ground?:SiteGround;costMult?:{wood:number;stone:number;work:number}}={}):TerraceUpgradePlan{
 const from=rec.k,none=(issue:string):TerraceUpgradePlan=>({ok:false,from,to:null,issue,wood:0,stone:0,work:0,label:'Terrace this field',detail:issue});
 const s=surveySite(height,plot.x,plot.z,plot.w,plot.d),slopeKind=terraceKindFor(s.meanSlopeDeg);
 if(!slopeKind)return none(s.meanSlopeDeg<TERRACE_RULES.kinds.bund.from?'Too level to need terraces':'Too steep to terrace');
 let to:TerraceKind;
 if(from==='none')to='bund';else if(from==='bund'){if(slopeKind==='bund')return none('Bunds are all this slope needs');to=slopeKind;}else return none('Already terraced');
 const dir=fieldDownhill(height,plot),extent=extentAlong(plot,dir),across=plot.w*plot.d/extent,gk=groundKind(o.ground),geoSoil=geoSoilOf(o.ground as SiteGround);
 const bill=(k:TerraceKind)=>terraceBill(k,terraceLayoutFor(k,extent,across,s.fall),gk,geoSoil,cap.mountain);
 const b=bill(to),prev=from==='bund'?bill('bund'):{wood:0,stone:0,work:0},m=o.costMult??{wood:1,stone:1,work:1};
 const wood=Math.max(0,Math.ceil((b.wood-prev.wood)*m.wood-1e-9)),stone=Math.max(0,Math.ceil((b.stone-prev.stone)*m.stone-1e-9)),work=Math.round(Math.max(0,b.work-prev.work)*m.work*10)/10;
 const K=TERRACE_RULES.kinds[to],gate=terraceGate(to,cap),L=terraceLayoutFor(to,extent,across,s.fall);
 const goods=[wood?`${wood} wood`:'',stone?`${stone} stone`:''].filter(Boolean).join(' + ')||'no goods';
 const record:TerraceRecord={...rec,k:to,n:L.n,rise:Math.round(L.rise*100)/100,tread:Math.round(L.tread*100)/100,soil:Math.round(terraceSoilDepth(to,s.meanSlopeDeg,geoSoil)*100)/100,eros:erosionPerYear(s.meanSlopeDeg,to,o.ground?.rockName,true)};
 const label=from==='none'?'Add earth bunds':`Face with stone (${K.word.toLowerCase()})`;
 return{ok:!gate,from,to,issue:gate,wood,stone,work,label,detail:`${K.word}: ${L.n} strip${L.n>1?'s':''}, ${goods}${gate?` · needs: ${gate.replace(/^.* need /,'')}`:''}`,record};
}
