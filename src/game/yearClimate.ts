/** Per-year climate variation: some winters are colder and some summers hotter than the mean year.
 * Deterministic from the world seed and the calendar year (no stored state, so saves need nothing new). */
export const YEAR_CLIMATE_RULES={yearSeconds:1800,/** the seasonal swing (15 C) is scaled by 1+amplitude, amplitude in [-.22,.3] */amplitudeMin:-.22,amplitudeMax:.3,/** plus a whole-year offset in C */offsetMax:1.6} as const;
function hash(seed:number,year:number,salt:number){let h=(seed^0x9e3779b9)+Math.imul(year+1,0x85ebca6b)+Math.imul(salt,0xc2b2ae35);h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;h=Math.imul(h,0x297a2d39);h^=h>>>15;return (h>>>0)/4294967296;}
export function yearClimate(seed:number|undefined,year:number){
 const R=YEAR_CLIMATE_RULES,s=Number.isFinite(seed)?Math.floor(seed as number):0,y=Math.max(0,Math.floor(year));
 if(y===0)return{amplitude:0,offset:0};// the first year is the plain baseline
 return{amplitude:R.amplitudeMin+(R.amplitudeMax-R.amplitudeMin)*hash(s,y,1),offset:(hash(s,y,2)*2-1)*R.offsetMax};
}
/** Temperature (C) of the seasonal curve for this time, with the year's variation applied. */
export function seasonalTemperature(seed:number|undefined,time:number){
 const R=YEAR_CLIMATE_RULES,year=Math.floor(time/R.yearSeconds),phase=(time%R.yearSeconds)/R.yearSeconds,v=yearClimate(seed,year);
 return 11+v.offset+15*(1+v.amplitude)*Math.sin((phase-.07)*Math.PI*2);
}
