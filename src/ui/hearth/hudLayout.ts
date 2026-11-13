/** Which HUD panels are minimised. Pure, no React: a tiny external store (subscribe + version) plus the storage rules.
 *  Every read and write of localStorage is guarded: a private window, blocked or full storage keeps the in-memory layout working for the session.
 *  The minimap keeps its own long-standing key (MINIMAP_KEY) so an old "map hidden" choice survives; every other panel lives in one JSON object. */
import {MINIMAP_KEY,readMinimapCollapsed,writeMinimapCollapsed} from './minimapPrefs';

export type PanelId='resources'|'time'|'audio'|'rail'|'dock'|'selection'|'alerts'|'notes'|'tips'|'map'|'testlab'|'wonders'|'skills';
export type PanelDef={id:PanelId;label:string;/** where the handle sits, read by CSS (`at-<id>`) */where:string;key?:string};
/** One row per panel. `label` is the visible 16px word on the handle and the minimise button. */
export const PANELS:readonly PanelDef[]=[
 {id:'resources',label:'Stores',where:'top left'},
 {id:'time',label:'Clock',where:'top right'},
 {id:'audio',label:'Sound',where:'in the clock bar',key:'O'},
 {id:'rail',label:'Tools',where:'left edge'},
 {id:'dock',label:'Actions',where:'bottom centre'},
 {id:'selection',label:'Selected',where:'bottom left'},
 {id:'alerts',label:'Alerts',where:'right edge'},
 {id:'notes',label:'News',where:'right edge'},
 {id:'tips',label:'Tips',where:'bottom centre'},
 {id:'map',label:'Map',where:'bottom right',key:'Shift+M'},
 {id:'testlab',label:'Test lab',where:'right edge'},
 {id:'wonders',label:'Wonders',where:'right edge'},
 {id:'skills',label:'Skills',where:'left edge'},
];
export const PANEL_IDS=PANELS.map(p=>p.id) as readonly PanelId[];
export const panelLabel=(id:PanelId)=>PANELS.find(p=>p.id===id)?.label??id;
export const LAYOUT_KEY='hearthwild.ui.hudLayout.v1';
/** Size floors every handle and minimise button must keep (docs/UIUX_PROPOSAL.md legibility floor, raised to 52 px taps for handles). */
export const HANDLE_FLOOR={tap:52,text:16,icon:24} as const;
export const FOLD_MS=200;

type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type Collapsed=Partial<Record<PanelId,boolean>>;
/** Parse a stored layout; anything malformed or unknown is ignored rather than trusted. */
export function parseLayout(raw:unknown):Collapsed{
 try{const o=typeof raw==='string'?JSON.parse(raw):raw;if(!o||typeof o!=='object'||Array.isArray(o))return {};
  const out:Collapsed={};for(const id of PANEL_IDS)if(id!=='map'&&(o as Record<string,unknown>)[id]===true)out[id]=true;return out;}catch{return {};}
}
export function createLayoutStore(getStorage:()=>Store|null|undefined=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}){
 let state:Collapsed|null=null,version=0;const listeners=new Set<()=>void>();
 const storage=()=>{try{return getStorage()??null;}catch{return null;}};
 const load=():Collapsed=>{
  if(state)return state;let s:Collapsed={};
  try{const raw=storage()?.getItem(LAYOUT_KEY);if(raw)s=parseLayout(raw);}catch{/* blocked storage: start expanded */}
  if(readMinimapCollapsed(storage()))s.map=true;
  return state=s;
 };
 const save=()=>{
  const s=load(),out:Record<string,boolean>={};for(const id of PANEL_IDS)if(id!=='map'&&s[id])out[id]=true;
  try{storage()?.setItem(LAYOUT_KEY,JSON.stringify(out));}catch{/* a remembered convenience only */}
  writeMinimapCollapsed(!!s.map,storage());
 };
 const emit=()=>{version++;listeners.forEach(f=>f());};
 return {
  isCollapsed:(id:PanelId)=>!!load()[id],
  collapsedIds:()=>PANEL_IDS.filter(id=>!!load()[id]),
  set(id:PanelId,collapsed:boolean){const s=load();if(!!s[id]===collapsed)return;state={...s,[id]:collapsed};if(!collapsed)delete state[id];save();emit();},
  toggle(id:PanelId){this.set(id,!load()[id]);},
  /** "Show all" (false) and "Minimise all" (true). */
  setAll(collapsed:boolean,ids:readonly PanelId[]=PANEL_IDS){const next:Collapsed={...load()};for(const id of ids){if(collapsed)next[id]=true;else delete next[id];}state=next;save();emit();},
  /** "Reset layout": every panel back to its default (open) and the saved layout forgotten. */
  reset(){state={};try{storage()?.removeItem(LAYOUT_KEY);}catch{/* ignore */}writeMinimapCollapsed(false,storage());emit();},
  subscribe(f:()=>void){listeners.add(f);return()=>{listeners.delete(f);};},
  version:()=>version,
  /** Test hook: forget the in-memory copy so the next read goes back to storage. */
  reload(){state=null;emit();},
 };
}
export const layout=createLayoutStore();
export {MINIMAP_KEY};
/** Keys the HUD adds. Plain M (mute) and Shift+M (minimap) are the existing ones; nothing here reuses a key the game binds. */
export const HUD_KEYS=[
 {keys:['M'],does:'Mute or unmute all sound (existing)'},
 {keys:['O'],does:'Sound effects on or off'},
 {keys:['Shift+M'],does:'Show or hide the minimap'},
 {keys:['U'],does:'Hide or show the whole interface'},
 {keys:['Shift+U'],does:'Minimise every panel, or show them all again'},
] as const;
type KeyLike={code:string;shiftKey:boolean;ctrlKey:boolean;metaKey:boolean;altKey:boolean;repeat?:boolean;target?:unknown};
export type HudKeyAction='sfx'|'hide'|'allPanels';
/** Maps a keydown to a HUD action. Ignores typing in fields, modified keys and held-down repeats. Shift+M and plain M are not handled here. */
export function hudKeyAction(e:KeyLike):HudKeyAction|null{
 if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return null;
 const t=e.target as {closest?:(s:string)=>unknown}|null|undefined;if(t?.closest?.('input,textarea,select,[contenteditable=true]'))return null;
 if(e.code==='KeyO'&&!e.shiftKey)return 'sfx';
 if(e.code==='KeyU')return e.shiftKey?'allPanels':'hide';
 return null;
}
