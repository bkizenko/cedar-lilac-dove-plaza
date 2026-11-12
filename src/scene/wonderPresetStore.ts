/** Optional local authoring library, separate from village saves and renderer styles.
 * The caller supplies storage; merely importing this module never touches a browser.
 * Existing libraries are never evicted, reset or overwritten after a failed read. */
import {serializePreset,deserializePreset,type WonderPreset} from './wonderKit';
export const WONDER_PRESET_STORAGE_KEY='hearthwild:wonder-kit-presets:v1';
export const WONDER_PRESET_STORE_RULES={version:1,maximumEntries:24,maximumBytes:131072,maximumPresetCharacters:4096,maximumLabelCharacters:64} as const;
export type WonderPresetStorage=Pick<Storage,'getItem'|'setItem'>;
export type StoredWonderPreset={id:string;label:string;preset:WonderPreset};
export type WonderPresetStoreResult={ok:true;entries:StoredWonderPreset[]}|{ok:false;reason:string};
type StoredEntry={id:string;label:string;preset:string};
const fail=(reason:string):WonderPresetStoreResult=>({ok:false,reason});
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id);
const validLabel=(label:unknown):label is string=>typeof label==='string'&&label.trim().length>0&&label.length<=WONDER_PRESET_STORE_RULES.maximumLabelCharacters;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function decode(text:string){
 if(text.length>WONDER_PRESET_STORE_RULES.maximumPresetCharacters)return null;
 try{const result=deserializePreset(text);return result.ok&&Number.isSafeInteger(result.preset.seed)?result.preset:null;}catch{return null;}
}
export function readWonderPresets(storage:WonderPresetStorage):WonderPresetStoreResult{
 let text:string|null;try{text=storage.getItem(WONDER_PRESET_STORAGE_KEY);}catch{return fail('Preset storage is unavailable');}
 if(text===null)return {ok:true,entries:[]};
 if(text.length*2>WONDER_PRESET_STORE_RULES.maximumBytes)return fail('Preset library exceeds the storage limit');
 let data:unknown;try{data=JSON.parse(text);}catch{return fail('Preset library is not valid JSON');}
 if(!record(data)||Object.keys(data).some(k=>k!=='v'&&k!=='entries')||data.v!==1||!Array.isArray(data.entries)||data.entries.length>WONDER_PRESET_STORE_RULES.maximumEntries)return fail('Unsupported or invalid preset library');
 const ids=new Set<string>(),entries:StoredWonderPreset[]=[];
 for(const entry of data.entries){
  if(!record(entry)||Object.keys(entry).some(k=>!['id','label','preset'].includes(k))||!validId(entry.id)||!validLabel(entry.label)||typeof entry.preset!=='string'||ids.has(entry.id))return fail('Invalid or duplicate preset entry');
  const preset=decode(entry.preset);if(!preset)return fail('Invalid wonder preset');
  ids.add(entry.id);entries.push({id:entry.id,label:entry.label,preset});
 }
 return {ok:true,entries};
}
function write(storage:WonderPresetStorage,entries:StoredWonderPreset[]):WonderPresetStoreResult{
 let text:string;try{text=JSON.stringify({v:1,entries:entries.map(e=>({id:e.id,label:e.label,preset:serializePreset(e.preset)} satisfies StoredEntry))});}catch{return fail('Wonder preset cannot be serialized');}
 if(text.length*2>WONDER_PRESET_STORE_RULES.maximumBytes)return fail('Preset library exceeds the storage limit');
 try{storage.setItem(WONDER_PRESET_STORAGE_KEY,text);}catch{return fail('Preset storage is full or unavailable');}
 return {ok:true,entries};
}
/** Explicit same-id replacement only; a full library never silently evicts another preset. */
export function saveWonderPreset(storage:WonderPresetStorage,entry:StoredWonderPreset):WonderPresetStoreResult{
 if(!validId(entry?.id)||!validLabel(entry?.label))return fail('Choose a valid preset id and label');
 let preset:WonderPreset|null;try{preset=decode(serializePreset(entry.preset));}catch{return fail('Invalid wonder preset');}
 if(!preset)return fail('Invalid wonder preset');
 const current=readWonderPresets(storage);if(!current.ok)return current;
 const index=current.entries.findIndex(e=>e.id===entry.id),next={id:entry.id,label:entry.label,preset};
 if(index<0){if(current.entries.length>=WONDER_PRESET_STORE_RULES.maximumEntries)return fail('Preset library is full');current.entries.push(next);}else current.entries[index]=next;
 return write(storage,current.entries);
}
/** Only the requested library entry is removed; village/style storage is untouched. */
export function removeWonderPreset(storage:WonderPresetStorage,id:string):WonderPresetStoreResult{
 if(!validId(id))return fail('Invalid preset id');const current=readWonderPresets(storage);if(!current.ok)return current;
 if(!current.entries.some(e=>e.id===id))return current;
 return write(storage,current.entries.filter(e=>e.id!==id));
}
