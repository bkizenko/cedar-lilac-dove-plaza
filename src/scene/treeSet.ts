/** Painterly tree set switch. 'botanical' is the species-true leaf-card forest (default); 'lobed' is the previous painterly set (blobby lobed crowns), kept
 * verbatim and selectable: `?trees=lobed`, or localStorage `hearthwild:tree-set` = 'lobed'. Render-only: never touches heights, collision, resources, saves or simulation. */
export type TreeSet='botanical'|'lobed';
export const TREE_SETS:readonly TreeSet[]=['botanical','lobed'];
export const TREE_SET_KEY='hearthwild:tree-set';
export const DEFAULT_TREE_SET:TreeSet='botanical';
export const isTreeSet=(v:unknown):v is TreeSet=>v==='botanical'||v==='lobed';
export function parseTreeSet(value:string|null|undefined):TreeSet|null{
 const v=(value??'').trim().toLowerCase();if(isTreeSet(v))return v;
 if(v==='old'||v==='blob'||v==='blobby'||v==='legacy'||v==='previous')return 'lobed';
 if(v==='new'||v==='leaf'||v==='cards'||v==='default'||v==='species')return 'botanical';
 return null;
}
export function resolveTreeSet(search:string,stored:string|null):TreeSet{
 let q:TreeSet|null=null;try{q=parseTreeSet(new URLSearchParams(search).get('trees'));}catch{q=null;}
 return q??(isTreeSet(stored)?stored:DEFAULT_TREE_SET);
}
export function loadTreeSet():TreeSet{
 let search='',stored:string|null=null;
 try{search=typeof location==='undefined'?'':location.search;}catch{search='';}
 try{stored=typeof localStorage==='undefined'?null:localStorage.getItem(TREE_SET_KEY);}catch{stored=null;}
 return resolveTreeSet(search,stored);
}
