/** Pure model for the "this village was saved before…" note. Lists which newer systems begin empty in an older save so the player
 * knows why history is thin. Reads only worldOptions (never rewrites the save); per-viewer dismissal in localStorage. */
export type OldSaveOptions={rulersVersion?:number;tideVersion?:number;flowFieldVersion?:number}|undefined;
export type OldSaveNote={title:string;items:string[]};
/** null for villages that already carry the current systems. */
export function oldSaveNote(opts:OldSaveOptions):OldSaveNote|null{
 const items:string[]=[];
 const rv=opts?.rulersVersion;
 if(rv!==1&&rv!==2)items.push('Rulers, houses and succession are not active: no leaders, marriages, wards or oaths will appear.');
 else if(rv===1)items.push('Neighbouring societies do not plan or weigh decisions yet; they keep their older behaviour.');
 if(!items.length)return null;
 return {title:'This village was saved with an older version',items:[...items,'Your buildings, people and stores are unchanged. Nothing is rewritten until the next normal autosave.']};
}
const PREFIX='hearthwild.ui.oldSaveNote:';
export const oldSaveNoteDismissed=(key:string):boolean=>{try{return globalThis.localStorage?.getItem(PREFIX+key)==='1';}catch{return false;}};
export const dismissOldSaveNote=(key:string)=>{try{globalThis.localStorage?.setItem(PREFIX+key,'1');}catch{/* convenience only */}};
