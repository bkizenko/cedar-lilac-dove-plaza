/** Minimap collapse state: remembered per browser, never required (storage can throw). */
export const MINIMAP_KEY='hearthwild.minimap.collapsed';
export function readMinimapCollapsed(storage?:Pick<Storage,'getItem'>|null):boolean{
 try{const s=storage===undefined?(typeof localStorage==='undefined'?null:localStorage):storage;return s?.getItem(MINIMAP_KEY)==='1';}catch{return false;}
}
export function writeMinimapCollapsed(value:boolean,storage?:Pick<Storage,'setItem'>|null){
 try{const s=storage===undefined?(typeof localStorage==='undefined'?null:localStorage):storage;s?.setItem(MINIMAP_KEY,value?'1':'0');}catch{/* private window or blocked storage: keep working */}
}
/** Shift+M. Plain M stays mute. */
export function isMinimapShortcut(e:{code:string;shiftKey:boolean;ctrlKey:boolean;metaKey:boolean;altKey:boolean;target?:unknown}){
 if(e.code!=='KeyM'||!e.shiftKey||e.ctrlKey||e.metaKey||e.altKey)return false;
 const t=e.target as {closest?:(s:string)=>unknown}|null|undefined;
 return !t?.closest?.('input,textarea,select,[contenteditable=true]');
}
