export type GraphicsQuality='low'|'med'|'high';
/** 'village' (default): detailed village grammar + natural palette. 'optionH': legacy carved honey-wood look. 'current': the original block-built renderer. */
export type RenderStyle='village'|'optionH'|'current';
export const GRAPHICS_RULES={defaultQuality:'med' as GraphicsQuality,defaultRenderStyle:'village' as RenderStyle,defaultShadows:false,defaultUnitRings:true,profiles:{low:{maximumPixels:800000,pixelRatio:1,groundCover:false,bloom:false},med:{maximumPixels:2100000,pixelRatio:1.25,groundCover:true,bloom:true},high:{maximumPixels:3200000,pixelRatio:1.5,groundCover:true,bloom:true}}} as const;
export const GRAPHICS_PREFERENCE_KEY='hearthwild:graphics-quality';
export function loadGraphicsQuality():GraphicsQuality {try{const q=localStorage.getItem(GRAPHICS_PREFERENCE_KEY);return q==='low'||q==='med'||q==='high'?q:GRAPHICS_RULES.defaultQuality;}catch{return GRAPHICS_RULES.defaultQuality;}}
export function rememberGraphicsQuality(q:GraphicsQuality):void {try{localStorage.setItem(GRAPHICS_PREFERENCE_KEY,q);}catch{/* Rendering remains available when local storage is full or disabled. */}}


/** Independent browser preference; never stored in or migrated through village saves.
 * The scene consumes this when it builds. Persisting a choice does not switch a
 * running renderer or imply the optional style's adapter is available. */
/** v2: the 'village' look became the default, so earlier saved style choices (made when only 'current' or the honey look existed) are not carried over. */
export const RENDER_STYLE_PREFERENCE_KEY='hearthwild:render-style-v2';
export function isRenderStyle(value:unknown):value is RenderStyle{return value==='current'||value==='optionH'||value==='village';}
export function loadRenderStyle():RenderStyle {
 try{const style=localStorage.getItem(RENDER_STYLE_PREFERENCE_KEY);return isRenderStyle(style)?style:GRAPHICS_RULES.defaultRenderStyle;}
 catch{return GRAPHICS_RULES.defaultRenderStyle;}
}
export function rememberRenderStyle(style:RenderStyle):void {
 if(!isRenderStyle(style))return;
 try{localStorage.setItem(RENDER_STYLE_PREFERENCE_KEY,style);}catch{/* Keep current rendering usable when browser storage is unavailable. */}
}

export function graphicsPixelRatio(quality:GraphicsQuality,width:number,height:number,deviceRatio=1){
 const profile=GRAPHICS_RULES.profiles[quality];
 const area=Math.max(1,width)*Math.max(1,height);
 return Math.min(Math.max(.1,deviceRatio),profile.pixelRatio,Math.sqrt(profile.maximumPixels/area));
}
