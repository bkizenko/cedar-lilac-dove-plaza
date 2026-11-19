/** One chronicle per village: the village life history (births, arrivals, works, trade) and the ruling house's
 * dynasty log (successions, deaths, wars, treaties) merged newest first. Pure; reads both existing feeds and
 * never writes or invents a line. Dynasty lines carry their rulers year ("N: text"). */
export const RULERS_YEAR_SECONDS_VIEW=90; // mirrors RULERS_YEAR_SECONDS in game/rulersRuntime (checked by test)
export type ChronicleLine={time:number;text:string;source:'village'|'house'};
export function villageChronicle(history:readonly {team:number;text:string;time:number}[]|undefined,houseLog:readonly string[]|undefined,team=0):ChronicleLine[]{
 const out:ChronicleLine[]=[];
 (history??[]).forEach(e=>{if(e.team===team)out.push({time:e.time,text:e.text.replace(/^\[Contact \d+\] /,''),source:'village'});});
 for(const l of houseLog??[]){const m=/^(\d+):\s*(.+)$/.exec(l);if(m)out.push({time:Number(m[1])*RULERS_YEAR_SECONDS_VIEW,text:m[2],source:'house'});}
 return out.map((l,i)=>({l,i})).sort((a,b)=>b.l.time-a.l.time||b.i-a.i).map(x=>x.l);
}
