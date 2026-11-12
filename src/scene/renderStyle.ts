/** Render-style resolution consumes the stable graphics.ts preference contract:
 * approved 'village' default, explicit legacy 'current' and opt-in 'optionH',
 * stored under hearthwild:render-style-v2. Query aliases are temporary review
 * overrides and never rewrite the viewer's saved preference. */
import {GRAPHICS_RULES,isRenderStyle,loadRenderStyle as loadStoredRenderStyle,type RenderStyle} from '../game/graphics';
export type {RenderStyle};
export const DEFAULT_RENDER_STYLE:RenderStyle=GRAPHICS_RULES.defaultRenderStyle;

/** Query aliases accepted for review links. */
export function parseRenderStyle(value:string|null|undefined):RenderStyle|null{
 const v=(value??'').trim();if(isRenderStyle(v))return v;
 const l=v.toLowerCase();
 if(l==='village'||l==='new'||l==='default')return 'village';
 if(l==='h'||l==='carved'||l==='option-h'||l==='optionh'||l==='honey')return 'optionH';
 if(l==='current'||l==='classic'||l==='original'||l==='legacy')return 'current';
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
export const isCarvedStyle=(s:RenderStyle)=>s!=='current';
