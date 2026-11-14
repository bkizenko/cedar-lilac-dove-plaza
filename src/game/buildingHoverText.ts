/** One-line hover summary for a building, shown before any click: name, era built, condition and repair state.
 * Pure presentation over fields the engine already keeps (fabric, maintenance, repair); invents no data. */
type HoverBuilding={hp:number;maxHp:number;build:number;team:number;type:string;
 fabric?:{built:{era:number;legacy?:true};upgrades:{length:number}};
 maintenance?:{condition:number;wearEnabled:boolean};
 repair?:{phase:string;progress:number;duration:number;blockedReason:string};
 expansion?:{progress:number};renovation?:unknown};
const AGES=['Stone','Bronze','Iron','Classical','Medieval','Renaissance'];
const cap=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
export function buildingHoverText(b:HoverBuilding,name?:string):string{
 const parts=[name||cap(b.type)];
 if(b.build<1){parts.push(`under construction ${Math.round(Math.max(0,b.build)*100)}%`);return parts.join(' · ');}
 if(b.team!==0)return parts.join(' · ');
 const f=b.fabric;
 if(f&&!f.built.legacy)parts.push(`built in the ${AGES[Math.max(0,Math.min(AGES.length-1,f.built.era))]} Age${f.upgrades.length?` (+${f.upgrades.length} extension${f.upgrades.length>1?'s':''})`:''}`);
 const frac=b.maxHp>0?b.hp/b.maxHp:1,cond=b.maintenance?.wearEnabled?Math.min(frac,b.maintenance.condition):frac;
 parts.push(cond>=.9?'sound':cond>=.6?'worn':cond>=.3?'needs repair':'failing');
 const r=b.repair;
 if(r)parts.push(r.phase==='paused'||r.blockedReason?`repair stalled${r.blockedReason?`: ${r.blockedReason}`:''}`:r.phase==='working'?`repair ${Math.round(r.duration>0?100*r.progress/r.duration:0)}% done`:'repair queued');
 return parts.join(' · ');
}
