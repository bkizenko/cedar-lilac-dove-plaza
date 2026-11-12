/** Render style resolution for the Option H adapter. Consumes Codex's
 * persisted preference contract in src/game/graphics.ts ('current' default,
 * 'optionH' opt-in; key hearthwild:render-style) rather than defining a
 * second one. Adds only a non-persisted review override `?render=h` /
 * `?render=current` for side-by-side review. Nothing here switches a running
 * renderer; the scene reads the result when it builds. */
import {GRAPHICS_RULES,isRenderStyle,loadRenderStyle as loadStoredRenderStyle,type RenderStyle} from '../game/graphics';
export type {RenderStyle};
export const DEFAULT_RENDER_STYLE:RenderStyle=GRAPHICS_RULES.defaultRenderStyle;

/** Query aliases accepted for review links. */
export function parseRenderStyle(value:string|null|undefined):RenderStyle|null{
 const v=(value??'').trim();if(isRenderStyle(v))return v;
 const l=v.toLowerCase();
 if(l==='h'||l==='carved'||l==='option-h'||l==='optionh')return 'optionH';
 if(l==='current'||l==='classic'||l==='default')return 'current';
 return null;
}
/** Query override wins over the stored preference; otherwise the default. */
export function resolveRenderStyle(search:string,stored:string|null):RenderStyle{
 let fromQuery:RenderStyle|null=null;
 try{fromQuery=parseRenderStyle(new URLSearchParams(search).get('render'));}catch{fromQuery=null;}
 return fromQuery??(isRenderStyle(stored)?stored:DEFAULT_RENDER_STYLE);
}
export function currentRenderStyle():RenderStyle{
 let search='';try{search=typeof location==='undefined'?'':location.search;}catch{search='';}
 const q=parseRenderStyle((()=>{try{return new URLSearchParams(search).get('render');}catch{return null;}})());
 return q??loadStoredRenderStyle();
}
export const isCarvedStyle=(s:RenderStyle)=>s==='optionH';
