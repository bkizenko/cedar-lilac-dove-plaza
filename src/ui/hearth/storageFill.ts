/** How full a resource's storage is: fill fraction, colour band and a Full flag for the top-bar chip meter. Pure. */
export const STORAGE_FILL_RULES={amberFrom:.6,redFrom:.9} as const;
export type StorageTone='green'|'amber'|'red';
export type StorageFill={fill:number;tone:StorageTone;full:boolean;percent:number}|null;
/** Null when capacity is unknown, unlimited or zero-or-less (no meaningful meter); a stock with zero capacity is not "full" of anything. */
export function storageFill(stored:number,capacity:number|null|undefined):StorageFill{
 if(capacity===null||capacity===undefined||!Number.isFinite(capacity)||capacity<=0)return null;
 const s=Number.isFinite(stored)?Math.max(0,stored):0,fill=Math.min(1,s/capacity),full=s>=capacity;
 const tone:StorageTone=fill>=STORAGE_FILL_RULES.redFrom?'red':fill>=STORAGE_FILL_RULES.amberFrom?'amber':'green';
 return{fill,tone,full,percent:Math.round(fill*100)};
}
/** Summed capacity of every store that accepts the resource; null when there are none or any is unlimited. */
export function totalCapacity(caps:readonly number[]):number|null{
 let t=0;for(const c of caps){if(!Number.isFinite(c))return null;if(c>0)t+=c;}
 return t>0?t:null;
}
