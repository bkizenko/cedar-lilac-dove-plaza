/** Map look switch. 'painterly' is the 2026-11 map overhaul (warm painted terrain, depth water, layered vegetation, atmosphere,
 * graded post). 'classic' is the archived Codex-era look, kept verbatim and selectable: `?map=classic`, or localStorage
 * `hearthwild:map-style` = 'classic'. Render-only: never touches heights, collision, resources, saves or simulation. */
export type MapStyle='painterly'|'classic';
export const MAP_STYLES:readonly MapStyle[]=['painterly','classic'];
export const MAP_STYLE_KEY='hearthwild:map-style';
export const DEFAULT_MAP_STYLE:MapStyle='painterly';
export const MAP_STYLE_LABELS:Record<MapStyle,string>={painterly:'Painterly landscape (2026 overhaul, default)',classic:'Classic landscape (archived)'};
export const isMapStyle=(v:unknown):v is MapStyle=>v==='painterly'||v==='classic';
/** Review-link aliases. */
export function parseMapStyle(value:string|null|undefined):MapStyle|null{
 const v=(value??'').trim().toLowerCase();if(isMapStyle(v))return v;
 if(v==='old'||v==='codex'||v==='legacy'||v==='archive')return 'classic';
 if(v==='new'||v==='paint'||v==='painted'||v==='default')return 'painterly';
 return null;
}
export function resolveMapStyle(search:string,stored:string|null):MapStyle{
 let fromQuery:MapStyle|null=null;
 try{fromQuery=parseMapStyle(new URLSearchParams(search).get('map'));}catch{fromQuery=null;}
 return fromQuery??(isMapStyle(stored)?stored:DEFAULT_MAP_STYLE);
}
export function loadMapStyle():MapStyle{
 let search='',stored:string|null=null;
 try{search=typeof location==='undefined'?'':location.search;}catch{search='';}
 try{stored=typeof localStorage==='undefined'?null:localStorage.getItem(MAP_STYLE_KEY);}catch{stored=null;}
 return resolveMapStyle(search,stored);
}
export function rememberMapStyle(style:MapStyle):void{
 if(!isMapStyle(style))return;
 try{localStorage.setItem(MAP_STYLE_KEY,style);}catch{/* private mode: the choice simply does not persist */}
}
