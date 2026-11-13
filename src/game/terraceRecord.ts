/** Leaf types and validators for the terrace record stored on a field (`building.site.terrace`). No imports, so slopeTiers.ts, terraceFarming.ts and persistence.ts can all share it. */
export type TerraceKind='bund'|'stone'|'andean'|'stair';
export const TERRACE_KIND_LIST:readonly TerraceKind[]=['bund','stone','andean','stair'];
/** Snapshot taken when the field is laid out (terrain is static, so nothing here is re-surveyed). All numbers are design values. */
/** 'none' = a flat field that still carries the site's climate and soil reading. */
export type TerraceRecord={
 k:TerraceKind|'none';/** strips (one retaining wall each) */n:number;/** riser between strips, m */rise:number;/** strip width, m */tread:number;
 /** effective soil depth on the terrace, m */soil:number;/** sun slope +1 .. shade -1 */sun:number;/** frost-pocket risk 0..1 */frost:number;/** wetness 0..1 */wet:number;
 /** soil loss per year with this protection, fraction of the soil (0..1) */eros:number;/** metres above the water level */alt:number;/** mean ground slope, degrees */slope:number;
};
const num=(v:unknown,lo:number,hi:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
export function validTerraceRecord(r:unknown):r is TerraceRecord{
 const o=r as TerraceRecord|null;if(!o||typeof o!=='object'||Array.isArray(o))return false;
 const keys=['k','n','rise','tread','soil','sun','frost','wet','eros','alt','slope'];if(Object.keys(o).some(k=>!keys.includes(k)))return false;
 return (o.k==='none'||TERRACE_KIND_LIST.includes(o.k))&&Number.isInteger(o.n)&&o.n>=1&&o.n<=40&&num(o.rise,0,8)&&num(o.tread,0,40)&&num(o.soil,0,6)&&num(o.sun,-1,1)&&num(o.frost,0,1)&&num(o.wet,0,1)&&num(o.eros,0,1)&&num(o.alt,-5,400)&&num(o.slope,0,90);
}
export const NUANCE_TAG_LIST=['Natural shelf','Hollow: damp','Hollow: frost','Ridge: windy','Sun slope','Shade slope','Broken ground','Slip risk','Flood risk','Wet ground'] as const;
export function validSiteTags(t:unknown):t is string[]{return Array.isArray(t)&&t.length<=4&&t.every(x=>typeof x==='string'&&(NUANCE_TAG_LIST as readonly string[]).includes(x));}
