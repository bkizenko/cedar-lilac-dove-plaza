/** Opt-in render style selector. 'classic' (the current live graphics) is the
 * default and remains the fallback whenever anything is missing or invalid.
 * Option H is chosen only by an explicit `?render=h` query or a remembered
 * preference. Pure resolution plus tiny storage wrappers; Codex owns wiring
 * the selected style into the renderer (interface request in the handoff),
 * so nothing here changes live graphics on its own. */
export type RenderStyle='classic'|'carvedH';
export const RENDER_STYLE_KEY='hearthwild:render-style';
export const DEFAULT_RENDER_STYLE:RenderStyle='classic';

export function parseRenderStyle(value:string|null|undefined):RenderStyle|null{
 const v=(value??'').trim().toLowerCase();
 if(v==='h'||v==='carved'||v==='carvedh'||v==='option-h')return 'carvedH';
 if(v==='classic'||v==='current'||v==='default')return 'classic';
 return null;
}
/** URL query wins over the remembered preference; otherwise classic. */
export function resolveRenderStyle(search:string,stored:string|null):RenderStyle{
 let fromQuery:RenderStyle|null=null;
 try{fromQuery=parseRenderStyle(new URLSearchParams(search).get('render'));}catch{fromQuery=null;}
 return fromQuery??parseRenderStyle(stored)??DEFAULT_RENDER_STYLE;
}
export function loadRenderStyle():RenderStyle{
 let stored:string|null=null,search='';
 try{stored=localStorage.getItem(RENDER_STYLE_KEY);}catch{stored=null;}
 try{search=typeof location==='undefined'?'':location.search;}catch{search='';}
 return resolveRenderStyle(search,stored);
}
export function rememberRenderStyle(style:RenderStyle):void{try{localStorage.setItem(RENDER_STYLE_KEY,style);}catch{/* Classic rendering remains when storage is unavailable. */}}
